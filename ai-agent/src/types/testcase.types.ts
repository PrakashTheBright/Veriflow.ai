/**
 * Test Case Types
 * Defines the structure for test cases and their approval workflow
 */

import { Action, ActionResult } from './action.types';

export enum TestCaseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum TestCasePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  priority: TestCasePriority;
  status: TestCaseStatus;
  preconditions?: string[];
  actions: Action[];
  expectedOutcome: string;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}

export interface TestCaseApproval {
  testCaseId: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  comments?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type ExecutionStatus = 'passed' | 'failed' | 'skipped' | 'running';

export interface TestCaseExecution {
  executionId: string;
  testCaseId: string;
  testCaseName: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  actionResults: ActionResult[];
  environment: ExecutionEnvironment;
  error?: {
    message: string;
    stack?: string;
    failedActionId?: string;
  };
  screenshots: ScreenshotInfo[];
  logs: LogEntry[];
}

export interface ExecutionEnvironment {
  browser: string;
  browserVersion: string;
  platform: string;
  viewport: { width: number; height: number };
  userAgent: string;
  baseUrl?: string;
}

export interface ScreenshotInfo {
  id: string;
  actionId?: string;
  name: string;
  path: string;
  timestamp: Date;
  type: 'before' | 'after' | 'failure' | 'manual';
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  setupActions?: Action[];
  teardownActions?: Action[];
  parallelExecution: boolean;
  maxParallel?: number;
}
