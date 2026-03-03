/**
 * Agent State Machine Types
 * Defines all possible states and transitions for the automation agent
 */

export enum AgentState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  LOADING_INPUTS = 'LOADING_INPUTS',
  VALIDATING = 'VALIDATING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  EXECUTING = 'EXECUTING',
  PAUSED = 'PAUSED',
  REPORTING = 'REPORTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  ABORTED = 'ABORTED'
}

export interface StateTransition {
  from: AgentState;
  to: AgentState;
  trigger: string;
  timestamp: Date;
}

export interface AgentContext {
  sessionId: string;
  currentState: AgentState;
  stateHistory: StateTransition[];
  startTime: Date;
  endTime?: Date;
  testCaseId?: string;
  error?: AgentError;
}

export interface AgentError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface AgentConfig {
  browser: BrowserConfig;
  execution: ExecutionConfig;
  paths: PathConfig;
  logging: LoggingConfig;
}

export interface BrowserConfig {
  headless: boolean;
  slowMo: number;
  timeout: number;
  viewport: { width: number; height: number };
  userAgent?: string;
}

export interface ExecutionConfig {
  autoApprove: boolean;
  maxRetries: number;
  retryDelay: number;
  screenshotOnFailure: boolean;
  screenshotOnSuccess: boolean;
  continueOnFailure: boolean;
  keepBrowserOpen: boolean;
}

export interface PathConfig {
  credentials: string;
  actions: string;
  reportsOutput: string;
  logs: string;
  screenshots: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  includeTimestamp: boolean;
}
