/**
 * Action Executor
 * Executes actions with retry logic, screenshots, and error handling
 */

import { Page } from 'playwright';
import { 
  Action, 
  ActionResult, 
  ActionType, 
  AgentConfig, 
  ScreenshotInfo,
  TypeAction 
} from '../../types';
import { BrowserActions } from '../../browser/actions/browser-actions';
import { CredentialLoader } from '../../credentials/credential-loader';
import { Logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';

export class ActionExecutor {
  private page: Page;
  private browserActions: BrowserActions;
  private credentialLoader: CredentialLoader;
  private config: AgentConfig;
  private logger: Logger;
  private screenshots: ScreenshotInfo[] = [];
  private currentStepIndex: number = 0;
  private totalSteps: number = 0;
  private storedVariables: Map<string, string> = new Map(); // Store logged values by label

  constructor(
    page: Page,
    credentialLoader: CredentialLoader,
    config: AgentConfig,
    logger: Logger
  ) {
    this.page = page;
    this.browserActions = new BrowserActions(page);
    this.credentialLoader = credentialLoader;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Set total steps for progress tracking
   */
  setTotalSteps(total: number): void {
    this.totalSteps = total;
    this.currentStepIndex = 0;
  }

  /**
   * Get stored variables map (for variable resolution)
   */
  getStoredVariables(): Map<string, string> {
    return this.storedVariables;
  }

  /**
   * Resolve stored variable references in action properties
   * Supports: ${STORED:label} for direct value, ${STORED:label+N} for date with offset
   */
  resolveStoredVariables(action: Action): Action {
    const resolveValue = (value: string): string => {
      // Pattern: ${STORED:label} or ${STORED:label+N} or ${STORED:label-N}
      return value.replace(/\$\{STORED:([^}]+?)([+-]\d+)?\}/gi, (match, label, offset) => {
        // Case-insensitive label lookup
        const labelLower = label.trim().toLowerCase();
        let storedValue: string | undefined;
        for (const [key, val] of this.storedVariables.entries()) {
          if (key.toLowerCase() === labelLower) {
            storedValue = val;
            break;
          }
        }
        
        if (!storedValue) {
          this.logger.warn(`Stored variable "${label}" not found`);
          return match;
        }
        
        // If offset is provided, treat as date and add/subtract days
        if (offset) {
          const days = parseInt(offset, 10);
          // Parse date in DD-MMM-YYYY format
          const dateMatch = storedValue.match(/(\d{1,2})-(\w{3})-(\d{4})/);
          if (dateMatch) {
            const [, dayStr, monthName, yearStr] = dateMatch;
            const monthMap: Record<string, number> = {
              'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
              'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };
            const month = monthMap[monthName.toLowerCase()];
            if (month !== undefined) {
              const date = new Date(parseInt(yearStr), month, parseInt(dayStr));
              date.setDate(date.getDate() + days);
              
              const newDay = String(date.getDate()).padStart(2, '0');
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const newMonth = months[date.getMonth()];
              const newYear = date.getFullYear();
              const result = `${newDay}-${newMonth}-${newYear}`;
              console.log(`  📅 Resolved ${match} -> ${result} (${storedValue} + ${days} days)`);
              return result;
            }
          }
          this.logger.warn(`Could not parse date from stored value: ${storedValue}`);
          return match;
        }
        
        return storedValue;
      });
    };
    
    // Deep clone the action and resolve variables in string properties
    const resolved = JSON.parse(JSON.stringify(action)) as Action;
    
    // Resolve in description
    if (resolved.description) {
      resolved.description = resolveValue(resolved.description);
    }
    
    // Resolve in type-specific properties
    if ('date' in resolved && typeof (resolved as { date: string }).date === 'string') {
      (resolved as { date: string }).date = resolveValue((resolved as { date: string }).date);
    }
    if ('value' in resolved && typeof (resolved as { value: string }).value === 'string') {
      (resolved as { value: string }).value = resolveValue((resolved as { value: string }).value);
    }
    if ('selector' in resolved && typeof (resolved as { selector: string }).selector === 'string') {
      (resolved as { selector: string }).selector = resolveValue((resolved as { selector: string }).selector);
    }
    
    return resolved;
  }

  /**
   * Print step progress to console
   */
  private printStepProgress(action: Action, status: 'running' | 'success' | 'failed', duration?: number): void {
    this.currentStepIndex++;
    const stepNum = `[${this.currentStepIndex}/${this.totalSteps}]`;
    const actionType = action.type.toUpperCase();
    const desc = action.description || '';

    if (status === 'running') {
      console.log(chalk.cyan(`\n▶ ${stepNum} ${chalk.bold(actionType)}: ${desc}`));
      console.log(chalk.gray(`   Starting...`));
    } else if (status === 'success') {
      const durationStr = duration ? ` (${duration}ms)` : '';
      console.log(chalk.green(`   ✓ Completed${durationStr}`));
    } else if (status === 'failed') {
      console.log(chalk.red(`   ✗ Failed`));
    }
  }

  /**
   * Execute a single action with retry logic
   */
  async execute(action: Action): Promise<ActionResult> {
    const startTime = new Date();
    const maxRetries = action.retryCount ?? this.config.execution.maxRetries;
    let lastError: Error | null = null;

    // Resolve stored variable references before execution
    const resolvedAction = this.resolveStoredVariables(action);

    // Print step starting
    this.printStepProgress(resolvedAction, 'running');

    this.logger.info(`Executing action: ${resolvedAction.type}`, {
      actionId: resolvedAction.id,
      description: resolvedAction.description
    });

    // Take screenshot before if configured
    if (resolvedAction.screenshotBefore) {
      await this.takeScreenshot(resolvedAction.id, 'before');
    }

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const actionResult = await this.executeAction(resolvedAction);
        
        // Take screenshot after if configured
        if (resolvedAction.screenshotAfter || this.config.execution.screenshotOnSuccess) {
          await this.takeScreenshot(resolvedAction.id, 'after');
        }

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        
        // Print success to console
        this.printStepSuccess(duration);
        
        this.logger.info(`Action completed successfully`, {
          actionId: resolvedAction.id,
          attempt,
          duration
        });

        // Build metadata including logged data if present
        const metadata: Record<string, unknown> = {};
        if (actionResult?.loggedData) {
          metadata.loggedData = actionResult.loggedData;
          // Store the logged values for later reference with ${STORED:label} syntax
          // Handle both single item and array of items
          if (Array.isArray(actionResult.loggedData)) {
            for (const item of actionResult.loggedData) {
              // Skip section header markers — they carry no meaningful stored value
              if (item.label.startsWith('═══')) continue;
              this.storedVariables.set(item.label, item.value);
              this.logger.debug(`Stored variable "${item.label}" = "${item.value}"`);
            }
          } else {
            const { label, value } = actionResult.loggedData;
            // Skip section header markers
            if (!label.startsWith('═══')) {
              this.storedVariables.set(label, value);
              this.logger.debug(`Stored variable "${label}" = "${value}"`);
            }
          }
        }
        
        // Handle stopTest flag for graceful test termination
        if (actionResult?.stopTest) {
          metadata.stopTest = true;
          metadata.wasVisible = actionResult.wasVisible ?? false;
        }

        return {
          actionId: resolvedAction.id,
          actionType: resolvedAction.type,
          status: actionResult?.stopTest ? 'skipped' : 'success',
          startTime,
          endTime,
          duration,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const willRetry = this.shouldRetry(lastError, attempt, maxRetries);
        
        this.logger.warn(`Action attempt ${attempt} failed`, {
          actionId: resolvedAction.id,
          error: lastError.message,
          willRetry
        });

        if (willRetry) {
          await this.delay(this.config.execution.retryDelay);
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    if (this.config.execution.screenshotOnFailure) {
      await this.takeScreenshot(resolvedAction.id, 'failure');
    }

    const endTime = new Date();

    // Print failure to console
    this.printStepFailed(lastError?.message);

    this.logger.error(`Action failed after ${maxRetries + 1} attempts`, {
      actionId: resolvedAction.id,
      error: lastError?.message
    });

    return {
      actionId: resolvedAction.id,
      actionType: resolvedAction.type,
      status: 'failure',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      error: lastError ? {
        message: lastError.message,
        stack: lastError.stack
      } : undefined
    };
  }

  /**
   * Print success status for current step
   */
  private printStepSuccess(duration: number): void {
    console.log(chalk.green(`   ✓ Completed (${duration}ms)`));
  }

  /**
   * Print failed status for current step
   */
  private printStepFailed(errorMessage?: string): void {
    console.log(chalk.red(`   ✗ Failed: ${errorMessage || 'Unknown error'}`));
  }

  /**
   * Determine whether to retry a failed action.
   * Timeout/assertion failures are typically deterministic and expensive to repeat.
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt > maxRetries) return false;

    const message = (error.message || '').toLowerCase();
    const nonRetryablePatterns = [
      'timeout',
      'timed out',
      'assertion failed',
      'url assertion failed',
      'visibility assertion failed',
      'credential not found'
    ];

    return !nonRetryablePatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Execute the actual action (may involve credential resolution)
   * Returns action result data if available (e.g., logged text, stopTest flag)
   */
  private async executeAction(action: Action): Promise<{
    loggedData?: { label: string; value: string } | { label: string; value: string }[];
    stopTest?: boolean;
    wasVisible?: boolean;
  } | void> {
    // Handle credential resolution for type actions
    if (action.type === ActionType.TYPE) {
      const typeAction = action as TypeAction;
      if (typeAction.credentialKey) {
        const resolvedValue = await this.credentialLoader.get(typeAction.credentialKey);
        if (!resolvedValue) {
          throw new Error(`Credential not found: ${typeAction.credentialKey}`);
        }
        await this.browserActions.type(typeAction, resolvedValue);
        return;
      }
    }

    return await this.browserActions.execute(action);
  }

  /**
   * Take and save a screenshot
   */
  private async takeScreenshot(actionId: string, type: 'before' | 'after' | 'failure'): Promise<void> {
    try {
      const screenshotId = uuidv4();
      const filename = `${actionId}_${type}_${screenshotId}.png`;
      const screenshotPath = path.join(this.config.paths.screenshots, filename);

      // Ensure directory exists
      await fs.mkdir(this.config.paths.screenshots, { recursive: true });

      await this.page.screenshot({ path: screenshotPath, fullPage: false });

      this.screenshots.push({
        id: screenshotId,
        actionId,
        name: filename,
        path: screenshotPath,
        timestamp: new Date(),
        type
      });

      this.logger.debug(`Screenshot saved: ${filename}`);
    } catch (error) {
      this.logger.warn(`Failed to take screenshot`, { actionId, type, error });
    }
  }

  /**
   * Get all screenshots taken during execution
   */
  getScreenshots(): ScreenshotInfo[] {
    return [...this.screenshots];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
