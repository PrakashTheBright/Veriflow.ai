/**
 * Agent Orchestrator
 * Central coordinator for the automation agent
 */

import { AgentState, AgentConfig, TestCase, TestCaseExecution, ActionResult, ExecutionStatus } from '../../types';
import { StateMachine } from './state-machine';
import { Logger } from '../../utils/logger';
import { ActionExecutor } from '../executor/action-executor';
import { BrowserManager } from '../../browser/drivers/browser-manager';
import { ApprovalGateway } from '../../approvals/approval-gateway';
import { ActionParser } from '../../actions/action-parser';
import { CredentialLoader } from '../../credentials/credential-loader';
import { ReportService } from '../../reports/generators/report-service';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

export interface OrchestratorDependencies {
  config: AgentConfig;
  logger: Logger;
  browserManager: BrowserManager;
  approvalGateway: ApprovalGateway;
  actionParser: ActionParser;
  credentialLoader: CredentialLoader;
  reportService: ReportService;
}

export class AgentOrchestrator {
  private stateMachine: StateMachine;
  private config: AgentConfig;
  private logger: Logger;
  private browserManager: BrowserManager;
  private approvalGateway: ApprovalGateway;
  private actionParser: ActionParser;
  private credentialLoader: CredentialLoader;
  private reportService: ReportService;
  private actionExecutor: ActionExecutor | null = null;
  private currentTestCase: TestCase | null = null;
  private executionResults: TestCaseExecution[] = [];

  constructor(deps: OrchestratorDependencies) {
    this.config = deps.config;
    this.logger = deps.logger;
    this.browserManager = deps.browserManager;
    this.approvalGateway = deps.approvalGateway;
    this.actionParser = deps.actionParser;
    this.credentialLoader = deps.credentialLoader;
    this.reportService = deps.reportService;
    this.stateMachine = new StateMachine(this.logger);
  }

  /**
   * Main entry point - run the agent with a test case file
   */
  async run(testCaseFile: string): Promise<TestCaseExecution> {
    const executionId = uuidv4();
    this.logger.info(`Starting agent execution`, { executionId, testCaseFile });

    try {
      // Step 1: Initialize
      await this.initialize();

      // Step 2: Load inputs
      const testCase = await this.loadInputs(testCaseFile);
      this.currentTestCase = testCase;
      this.stateMachine.setTestCaseId(testCase.id);

      // Step 3: Validate
      await this.validate(testCase);

      // Step 4: Await approval
      const approved = await this.awaitApproval(testCase);
      if (!approved) {
        return this.createAbortedExecution(executionId, testCase, 'User rejected test case');
      }

      // Step 5: Execute
      const execution = await this.execute(executionId, testCase);

      // Step 6: Generate report
      await this.generateReport(execution);

      // Step 7: Cleanup
      await this.cleanup();

      return execution;
    } catch (error) {
      this.logger.error('Agent execution failed', { error });
      this.stateMachine.setError({
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        recoverable: false
      });
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Run multiple test cases
   */
  async runBatch(testCaseFiles: string[]): Promise<TestCaseExecution[]> {
    const results: TestCaseExecution[] = [];

    for (const file of testCaseFiles) {
      try {
        const result = await this.run(file);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to run test case: ${file}`, { error });
      }
      // Reset state machine for next test case
      this.stateMachine.reset();
    }

    return results;
  }

  private async initialize(): Promise<void> {
    this.stateMachine.transitionTo(AgentState.INITIALIZING, 'Agent start');
    
    // Load credentials
    await this.credentialLoader.load();
    
    this.logger.info('Agent initialized successfully');
  }

  private async loadInputs(testCaseFile: string): Promise<TestCase> {
    this.stateMachine.transitionTo(AgentState.LOADING_INPUTS, 'Loading test case');
    
    const testCase = await this.actionParser.parseTestCase(testCaseFile);
    
    this.logger.info(`Loaded test case: ${testCase.name}`, {
      id: testCase.id,
      actionCount: testCase.actions.length
    });

    return testCase;
  }

  private async validate(testCase: TestCase): Promise<void> {
    this.stateMachine.transitionTo(AgentState.VALIDATING, 'Validating test case');
    
    // Validate action schema
    const validationErrors = await this.actionParser.validateActions(testCase.actions);
    
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Validate credential references
    for (const action of testCase.actions) {
      if ('credentialKey' in action && action.credentialKey) {
        const hasCredential = await this.credentialLoader.has(action.credentialKey);
        if (!hasCredential) {
          throw new Error(`Missing credential: ${action.credentialKey}`);
        }
      }
    }

    this.logger.info('Test case validation passed');
  }

  private async awaitApproval(testCase: TestCase): Promise<boolean> {
    this.stateMachine.transitionTo(AgentState.AWAITING_APPROVAL, 'Waiting for approval');

    if (this.config.execution.autoApprove) {
      this.logger.warn('Auto-approve is enabled - skipping manual approval');
      return true;
    }

    const approval = await this.approvalGateway.requestApproval(testCase);
    
    if (approval.status === 'approved') {
      this.logger.info('Test case approved', { approvedBy: approval.approvedBy });
      return true;
    } else {
      this.logger.info('Test case rejected', { 
        rejectedBy: approval.rejectedBy,
        reason: approval.rejectionReason 
      });
      return false;
    }
  }

  private async execute(executionId: string, testCase: TestCase): Promise<TestCaseExecution> {
    this.stateMachine.transitionTo(AgentState.EXECUTING, 'Starting execution');
    
    const startTime = new Date();
    const actionResults: ActionResult[] = [];

    // Launch browser
    const page = await this.browserManager.launch(this.config.browser);
    
    // Create action executor
    this.actionExecutor = new ActionExecutor(
      page,
      this.credentialLoader,
      this.config,
      this.logger
    );

    // Set total steps for progress tracking
    this.actionExecutor.setTotalSteps(testCase.actions.length);

    console.log(chalk.yellow(`\n${'═'.repeat(60)}`));
    console.log(chalk.yellow.bold(`  EXECUTING: ${testCase.name}`));
    console.log(chalk.yellow(`  Total Steps: ${testCase.actions.length}`));
    console.log(chalk.yellow(`${'═'.repeat(60)}`));

    // Execute each action
    for (const action of testCase.actions) {
      try {
        const result = await this.actionExecutor.execute(action);
        actionResults.push(result);

        if (result.status === 'failure' && !this.config.execution.continueOnFailure) {
          break;
        }
      } catch (error) {
        this.logger.error(`Action failed: ${action.id}`, { error });
        if (!this.config.execution.continueOnFailure) {
          break;
        }
      }
    }

    const endTime = new Date();
    const hasFailures = actionResults.some(r => r.status === 'failure');

    const execution: TestCaseExecution = {
      executionId,
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      status: hasFailures ? 'failed' : 'passed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      actionResults,
      environment: await this.browserManager.getEnvironmentInfo(),
      screenshots: this.actionExecutor.getScreenshots(),
      logs: []
    };

    this.executionResults.push(execution);
    return execution;
  }

  private async generateReport(execution: TestCaseExecution): Promise<void> {
    this.stateMachine.transitionTo(AgentState.REPORTING, 'Generating report');
    
    const reportPaths = await this.reportService.generate([execution]);
    
    // Output report path for veriflow-ui to capture
    if (reportPaths && reportPaths.length > 0) {
      const htmlReport = reportPaths.find(path => path.endsWith('.html'));
      if (htmlReport) {
        console.log(`Report generated: ${htmlReport}`);
      }
    }
    
    this.logger.info('Report generated successfully');
  }

  private async cleanup(): Promise<void> {
    try {
      if (!this.config.execution.keepBrowserOpen) {
        try {
          await this.browserManager.close();
        } catch (closeError) {
          console.warn('Warning: Browser close failed, but continuing cleanup:', closeError);
        }
      } else {
        console.log(chalk.yellow('\n⚠ Browser kept open (AGENT_KEEP_BROWSER_OPEN=true)'));
        console.log(chalk.gray('  Close the browser manually or press Ctrl+C to exit.\n'));
      }
      this.actionExecutor = null;
      this.currentTestCase = null;
      this.stateMachine.transitionTo(AgentState.COMPLETED, 'Cleanup complete');
    } catch (error) {
      this.logger.error('Cleanup failed', { error });
    }
  }

  private createAbortedExecution(
    executionId: string, 
    testCase: TestCase, 
    reason: string
  ): TestCaseExecution {
    this.stateMachine.transitionTo(AgentState.ABORTED, reason);
    
    return {
      executionId,
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      status: 'skipped',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      actionResults: [],
      environment: {
        browser: 'N/A',
        browserVersion: 'N/A',
        platform: process.platform,
        viewport: { width: 0, height: 0 },
        userAgent: 'N/A'
      },
      screenshots: [],
      logs: [],
      error: { message: reason }
    };
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return this.stateMachine.getCurrentState();
  }

  /**
   * Get execution results
   */
  getResults(): TestCaseExecution[] {
    return [...this.executionResults];
  }
}
