/**
 * Report Types
 * Defines the structure for test execution reports
 */

import { TestCaseExecution, ExecutionEnvironment } from './testcase.types';

export enum ReportFormat {
  HTML = 'html',
  JSON = 'json',
  JUNIT = 'junit',
  MARKDOWN = 'markdown'
}

export interface Report {
  id: string;
  title: string;
  generatedAt: Date;
  format: ReportFormat;
  summary: ReportSummary;
  executions: TestCaseExecution[];
  environment: ExecutionEnvironment;
  metadata: ReportMetadata;
}

export interface ReportSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  totalDuration: number;
  averageDuration: number;
  startTime: Date;
  endTime: Date;
}

export interface ReportMetadata {
  agentVersion: string;
  nodeVersion: string;
  playwrightVersion: string;
  executedBy?: string;
  buildNumber?: string;
  gitCommit?: string;
  gitBranch?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface ReportGeneratorOptions {
  format: ReportFormat;
  outputPath: string;
  includeScreenshots: boolean;
  includeLogs: boolean;
  includeTrace: boolean;
  templatePath?: string;
  customStyles?: string;
}

export interface ReportGenerator {
  generate(executions: TestCaseExecution[], options: ReportGeneratorOptions): Promise<string>;
  getTemplatePath(): string;
  getSupportedFormats(): ReportFormat[];
}
