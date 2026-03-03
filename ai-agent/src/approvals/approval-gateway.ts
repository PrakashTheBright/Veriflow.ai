/**
 * Approval Gateway
 * Handles test case approval workflow with interactive prompts
 */

import inquirer from 'inquirer';
import { TestCase, TestCaseApproval, TestCasePriority } from '../types';
import { Logger } from '../utils/logger';
import chalk from 'chalk';

export interface ApprovalGatewayOptions {
  interactive: boolean;
  timeout?: number;
}

export class ApprovalGateway {
  private logger: Logger;
  private options: ApprovalGatewayOptions;
  private approvalHistory: TestCaseApproval[] = [];

  constructor(logger: Logger, options: ApprovalGatewayOptions = { interactive: true }) {
    this.logger = logger;
    this.options = options;
  }

  /**
   * Request approval for a test case
   */
  async requestApproval(testCase: TestCase): Promise<TestCaseApproval> {
    this.logger.info('Requesting approval for test case', {
      id: testCase.id,
      name: testCase.name
    });

    if (!this.options.interactive) {
      return this.createPendingApproval(testCase.id);
    }

    // Display test case details
    this.displayTestCase(testCase);

    // Prompt for approval
    const { decision } = await inquirer.prompt([
      {
        type: 'list',
        name: 'decision',
        message: 'Do you approve this test case for execution?',
        choices: [
          { name: '✅ Approve', value: 'approve' },
          { name: '❌ Reject', value: 'reject' },
          { name: '📋 View Actions', value: 'view' }
        ]
      }
    ]);

    if (decision === 'view') {
      this.displayActions(testCase);
      return this.requestApproval(testCase); // Re-prompt after viewing
    }

    if (decision === 'approve') {
      const approval = await this.approveTestCase(testCase.id);
      this.approvalHistory.push(approval);
      return approval;
    } else {
      const approval = await this.rejectTestCase(testCase.id);
      this.approvalHistory.push(approval);
      return approval;
    }
  }

  /**
   * Display test case summary
   */
  private displayTestCase(testCase: TestCase): void {
    console.log('\n' + chalk.bold.blue('═══════════════════════════════════════════════════════════'));
    console.log(chalk.bold.blue('                    TEST CASE APPROVAL                       '));
    console.log(chalk.bold.blue('═══════════════════════════════════════════════════════════') + '\n');

    console.log(chalk.bold('ID:          ') + testCase.id);
    console.log(chalk.bold('Name:        ') + testCase.name);
    console.log(chalk.bold('Description: ') + testCase.description);
    console.log(chalk.bold('Priority:    ') + this.getPriorityBadge(testCase.priority));
    console.log(chalk.bold('Author:      ') + testCase.author);
    console.log(chalk.bold('Actions:     ') + testCase.actions.length);
    console.log(chalk.bold('Tags:        ') + (testCase.tags.length > 0 ? testCase.tags.join(', ') : 'None'));

    if (testCase.preconditions && testCase.preconditions.length > 0) {
      console.log(chalk.bold('\nPreconditions:'));
      testCase.preconditions.forEach((pre, i) => {
        console.log(`  ${i + 1}. ${pre}`);
      });
    }

    console.log(chalk.bold('\nExpected Outcome: ') + testCase.expectedOutcome);
    console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
  }

  /**
   * Display action details
   */
  private displayActions(testCase: TestCase): void {
    console.log('\n' + chalk.bold.yellow('Actions to be executed:') + '\n');

    testCase.actions.forEach((action, index) => {
      const stepNum = chalk.cyan(`[${(index + 1).toString().padStart(2, '0')}]`);
      const actionType = chalk.magenta(action.type.toUpperCase().padEnd(20));
      console.log(`${stepNum} ${actionType} ${action.description}`);

      // Show additional details for certain action types
      if ('selector' in action) {
        console.log(chalk.gray(`     Selector: ${action.selector}`));
      }
      if ('url' in action) {
        console.log(chalk.gray(`     URL: ${action.url}`));
      }
      if ('credentialKey' in action && action.credentialKey) {
        console.log(chalk.yellow(`     ⚠ Uses credential: ${action.credentialKey}`));
      }
    });

    console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
  }

  /**
   * Get colored priority badge
   */
  private getPriorityBadge(priority: TestCasePriority): string {
    switch (priority) {
      case TestCasePriority.CRITICAL:
        return chalk.bgRed.white(' CRITICAL ');
      case TestCasePriority.HIGH:
        return chalk.bgYellow.black(' HIGH ');
      case TestCasePriority.MEDIUM:
        return chalk.bgBlue.white(' MEDIUM ');
      case TestCasePriority.LOW:
        return chalk.bgGreen.white(' LOW ');
      default:
        return priority;
    }
  }

  /**
   * Approve a test case
   */
  private async approveTestCase(testCaseId: string): Promise<TestCaseApproval> {
    const { comments } = await inquirer.prompt([
      {
        type: 'input',
        name: 'comments',
        message: 'Add any comments (optional):',
        default: ''
      }
    ]);

    this.logger.info('Test case approved', { testCaseId });

    console.log(chalk.green('\n✅ Test case APPROVED\n'));

    return {
      testCaseId,
      approvedBy: process.env.USER || 'user',
      approvedAt: new Date(),
      status: 'approved',
      comments: comments || undefined
    };
  }

  /**
   * Reject a test case
   */
  private async rejectTestCase(testCaseId: string): Promise<TestCaseApproval> {
    const { reason } = await inquirer.prompt([
      {
        type: 'input',
        name: 'reason',
        message: 'Reason for rejection:',
        validate: (input: string) => input.trim() ? true : 'Please provide a reason'
      }
    ]);

    this.logger.info('Test case rejected', { testCaseId, reason });

    console.log(chalk.red('\n❌ Test case REJECTED\n'));

    return {
      testCaseId,
      rejectedBy: process.env.USER || 'user',
      rejectedAt: new Date(),
      rejectionReason: reason,
      status: 'rejected'
    };
  }

  /**
   * Create a pending approval (for non-interactive mode)
   */
  private createPendingApproval(testCaseId: string): TestCaseApproval {
    return {
      testCaseId,
      status: 'pending'
    };
  }

  /**
   * Get approval history
   */
  getApprovalHistory(): TestCaseApproval[] {
    return [...this.approvalHistory];
  }

  /**
   * Check if a test case was approved
   */
  isApproved(testCaseId: string): boolean {
    const approval = this.approvalHistory.find(a => a.testCaseId === testCaseId);
    return approval?.status === 'approved';
  }
}
