/**
 * Application Configuration
 * Loads and validates configuration from environment variables
 */

import dotenv from 'dotenv';
import path from 'path';
import { AgentConfig } from '../types';

// Load environment variables from the project root.
// Do NOT use override:true here — when the agent is spawned from the veriflow-ui
// server route, the server sets critical env vars (BROWSER_HEADLESS, AGENT_KEEP_BROWSER_OPEN,
// BROWSER_SLOW_MO, etc.) in the spawn environment. Those values must take precedence
// over what is written in the .env file, otherwise .env values (e.g. AGENT_KEEP_BROWSER_OPEN=true)
// would override the server's intent (e.g. 'false') and cause browsers to accumulate.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export function loadConfig(): AgentConfig {
  const baseDir = process.cwd();

  return {
    browser: {
      headless: getEnvBoolean('BROWSER_HEADLESS', false),
      slowMo: getEnvNumber('BROWSER_SLOW_MO', 50),
      timeout: getEnvNumber('BROWSER_TIMEOUT', 30000),
      viewport: {
        width: getEnvNumber('BROWSER_VIEWPORT_WIDTH', 1920),
        height: getEnvNumber('BROWSER_VIEWPORT_HEIGHT', 1080)
      },
      userAgent: process.env.BROWSER_USER_AGENT
    },
    execution: {
      autoApprove: getEnvBoolean('AGENT_AUTO_APPROVE', false),
      maxRetries: getEnvNumber('AGENT_MAX_RETRIES', 3),
      retryDelay: getEnvNumber('AGENT_RETRY_DELAY', 1000),
      screenshotOnFailure: getEnvBoolean('AGENT_SCREENSHOT_ON_FAILURE', true),
      screenshotOnSuccess: getEnvBoolean('AGENT_SCREENSHOT_ON_SUCCESS', false),
      continueOnFailure: getEnvBoolean('AGENT_CONTINUE_ON_FAILURE', false),
      keepBrowserOpen: getEnvBoolean('AGENT_KEEP_BROWSER_OPEN', false)
    },
    paths: {
      credentials: path.resolve(baseDir, getEnvString('CREDENTIALS_PATH', './credentials/credentials.json')),
      actions: path.resolve(baseDir, getEnvString('ACTIONS_PATH', './test-cases/approved')),
      reportsOutput: path.resolve(baseDir, getEnvString('REPORTS_OUTPUT_PATH', './reports/output')),
      logs: path.resolve(baseDir, getEnvString('LOGS_PATH', './logs')),
      screenshots: path.resolve(baseDir, getEnvString('SCREENSHOTS_PATH', './reports/output/screenshots'))
    },
    logging: {
      level: getEnvString('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
      format: getEnvString('LOG_FORMAT', 'json') as 'json' | 'text',
      includeTimestamp: getEnvBoolean('LOG_INCLUDE_TIMESTAMP', true)
    }
  };
}

export const config = loadConfig();
export default config;
