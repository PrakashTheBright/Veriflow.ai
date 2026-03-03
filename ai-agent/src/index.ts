/**
 * AI Web Automation Agent
 * Main entry point
 */

import { loadConfig } from './config';
import { AgentOrchestrator, OrchestratorDependencies } from './agent';
import { BrowserManager } from './browser';
import { ApprovalGateway } from './approvals';
import { ActionParser } from './actions';
import { CredentialLoader } from './credentials';
import { ReportService } from './reports';
import { createLogger } from './utils';
import path from 'path';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testCaseFile = args.find(arg => !arg.startsWith('--')) || '';

  // Load config fresh
  const config = loadConfig();

  // Apply command line overrides BEFORE anything else
  if (args.includes('--auto-approve')) {
    config.execution.autoApprove = true;
  }
  if (args.includes('--headless')) {
    config.browser.headless = true;
  }

  if (!testCaseFile) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AI Web Automation Agent v1.0.0                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    npm run agent:run <test-case-file>                        ║
║                                                              ║
║  Options:                                                    ║
║    --auto-approve    Skip manual approval (not recommended)  ║
║    --headless        Run browser in headless mode            ║
║                                                              ║
║  Examples:                                                   ║
║    npm run agent:run test-cases/approved/login.yaml          ║
║    npm run agent:run test-cases/approved/checkout.json       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  // Initialize logger
  const logger = createLogger({
    level: config.logging.level,
    format: config.logging.format,
    logDir: config.paths.logs,
    includeTimestamp: config.logging.includeTimestamp
  });

  logger.info('Starting AI Web Automation Agent', {
    testCaseFile,
    config: {
      headless: config.browser.headless,
      autoApprove: config.execution.autoApprove
    }
  });

  // Initialize dependencies
  const browserManager = new BrowserManager(logger);
  const approvalGateway = new ApprovalGateway(logger, { interactive: true });
  const actionParser = new ActionParser(logger);
  const credentialLoader = new CredentialLoader(logger, config.paths.credentials);
  const reportService = new ReportService(logger, config.paths.reportsOutput);

  // Create orchestrator
  const deps: OrchestratorDependencies = {
    config,
    logger,
    browserManager,
    approvalGateway,
    actionParser,
    credentialLoader,
    reportService
  };

  const orchestrator = new AgentOrchestrator(deps);

  try {
    // Resolve test case file path
    const resolvedPath = path.isAbsolute(testCaseFile)
      ? testCaseFile
      : path.resolve(process.cwd(), testCaseFile);

    // Run the agent
    const execution = await orchestrator.run(resolvedPath);

    // Print summary
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    EXECUTION COMPLETE                      ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Status: ${execution.status.toUpperCase()}`);
    console.log(`Duration: ${execution.duration}ms`);
    console.log(`Actions: ${execution.actionResults.length}`);
    console.log(`Passed: ${execution.actionResults.filter(a => a.status === 'success').length}`);
    console.log(`Failed: ${execution.actionResults.filter(a => a.status === 'failure').length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // If keepBrowserOpen is enabled, wait indefinitely for user to close
    if (config.execution.keepBrowserOpen) {
      console.log('Press Ctrl+C to exit...');
      await new Promise(() => {}); // Wait indefinitely
    } else {
      // Otherwise, exit immediately with appropriate code
      logger.info('Exiting agent', { status: execution.status });
      process.exit(execution.status === 'passed' ? 0 : 1);
    }
  } catch (error) {
    logger.error('Agent execution failed', { error });
    console.error('Agent execution failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
