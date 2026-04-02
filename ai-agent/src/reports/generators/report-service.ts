/**
 * Report Service
 * Generates test execution reports in multiple formats
 */

import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { 
  TestCaseExecution, 
  Report, 
  ReportSummary, 
  ReportFormat, 
  ReportGeneratorOptions,
  ReportMetadata 
} from '../../types';
import { Logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ReportService {
  private logger: Logger;
  private outputPath: string;

  constructor(logger: Logger, outputPath: string) {
    this.logger = logger;
    this.outputPath = outputPath;
  }

  /**
   * Generate reports for test executions
   */
  async generate(
    executions: TestCaseExecution[],
    options?: Partial<ReportGeneratorOptions>
  ): Promise<string[]> {
    const generatedPaths: string[] = [];

    const defaultOptions: ReportGeneratorOptions = {
      format: ReportFormat.HTML,
      outputPath: this.outputPath,
      includeScreenshots: true,
      includeLogs: true,
      includeTrace: false,
      ...options
    };

    // Ensure output directory exists
    await fs.mkdir(defaultOptions.outputPath, { recursive: true });

    // Generate HTML report by default
    const htmlPath = await this.generateHtmlReport(executions, defaultOptions);
    generatedPaths.push(htmlPath);

    // Also generate JSON report for programmatic access
    const jsonPath = await this.generateJsonReport(executions, defaultOptions);
    generatedPaths.push(jsonPath);

    this.logger.info('Reports generated', { paths: generatedPaths });

    return generatedPaths;
  }

  /**
   * Build the report object
   */
  private buildReport(executions: TestCaseExecution[]): Report {
    const summary = this.calculateSummary(executions);
    const environment = executions[0]?.environment || {
      browser: 'N/A',
      browserVersion: 'N/A',
      platform: process.platform,
      viewport: { width: 0, height: 0 },
      userAgent: 'N/A'
    };

    return {
      id: uuidv4(),
      title: `Automation Report - ${new Date().toISOString().split('T')[0]}`,
      generatedAt: new Date(),
      format: ReportFormat.HTML,
      summary,
      executions,
      environment,
      metadata: this.getMetadata()
    };
  }

  /**
   * Calculate summary statistics
   */
  
  private calculateSummary(executions: TestCaseExecution[]): ReportSummary {
    const passed = executions.filter(e => e.status === 'passed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const skipped = executions.filter(e => e.status === 'skipped').length;
    const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);

    const startTimes = executions.map(e => e.startTime).filter(Boolean);
    const endTimes = executions.map(e => e.endTime).filter(Boolean) as Date[];

    return {
      totalTests: executions.length,
      passed,
      failed,
      skipped,
      passRate: executions.length > 0 ? (passed / executions.length) * 100 : 0,
      totalDuration,
      averageDuration: executions.length > 0 ? totalDuration / executions.length : 0,
      startTime: startTimes.length > 0 ? new Date(Math.min(...startTimes.map(d => d.getTime()))) : new Date(),
      endTime: endTimes.length > 0 ? new Date(Math.max(...endTimes.map(d => d.getTime()))) : new Date()
    };
  }



  /**
   * Get report metadata
   */
  private getMetadata(): ReportMetadata {
    return {
      agentVersion: '1.0.0',
      nodeVersion: process.version,
      playwrightVersion: require('playwright/package.json').version,
      executedBy: process.env.USER || 'agent'
    };
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(
    executions: TestCaseExecution[],
    options: ReportGeneratorOptions
  ): Promise<string> {
    const report = this.buildReport(executions);
    const template = this.getHtmlTemplate();
    const compiled = Handlebars.compile(template);
    
    // Register helpers
    Handlebars.registerHelper('formatDuration', (ms: number) => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
      return `${(ms / 60000).toFixed(2)}m`;
    });

    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleString();
    });

    Handlebars.registerHelper('statusClass', (status: string) => {
      switch (status) {
        case 'passed': return 'status-passed';
        case 'failed': return 'status-failed';
        case 'skipped': return 'status-skipped';
        default: return '';
      }
    });

    Handlebars.registerHelper('statusIcon', (status: string) => {
      switch (status) {
        case 'passed': return '✅';
        case 'failed': return '❌';
        case 'skipped': return '⏭️';
        default: return '❓';
      }
    });

                // Helper: try to split single concatenated string into structured fields
                const parseCompositeLoggedValue = (value: string): { label: string; value: string }[] => {
                    const items: { label: string; value: string }[] = [];
                    if (!value || typeof value !== 'string') return items;

                    const emailRegex = /[\w.+-]+@[\w.-]+\.\w+/g;
                    const dateRegex = /\d{1,2}-[A-Za-z]{3}-\d{4}/g;
                    const phoneRegex = /(\+\d[\d-]{6,}\d|\d{10,})/g;
                    const matchTextRegex = /(Partial Match|Full Match|No Match)/i;
                    const statusTextRegex = /(Interview Eligible|Interview Not Eligible)/i;

                    const emailMatchArr = value.match(emailRegex);
                    const email = emailMatchArr ? emailMatchArr[0] : null;
                    const emailIndex = email ? value.indexOf(email) : -1;

                    const dateMatchArr = value.match(dateRegex);
                    const expiry = dateMatchArr ? dateMatchArr[0] : null;
                    const dateIndex = expiry ? value.indexOf(expiry) : -1;

                    const matchText = (value.match(matchTextRegex) || [null])[0];
                    const statusText = (value.match(statusTextRegex) || [null])[0];

                    // Collect phone candidates but exclude any that are inside the email substring
                    const phones: { str: string; idx: number }[] = [];
                    let m: RegExpExecArray | null;
                    while ((m = phoneRegex.exec(value)) !== null) {
                        const str = m[0];
                        const idx = m.index;
                        if (email && idx >= emailIndex && idx < emailIndex + email.length) continue;
                        if (expiry && idx >= dateIndex && idx < dateIndex + expiry.length) continue;
                        phones.push({ str, idx });
                    }
                    const phone = phones.length ? phones[0].str : null;

                    // Collect numeric tokens and pick a score that's not inside email/phone/date
                    const numbers: { num: string; idx: number }[] = [];
                    const numRegex = /\d{1,3}/g;
                    while ((m = numRegex.exec(value)) !== null) {
                        const num = m[0];
                        const idx = m.index;
                        // skip numbers inside email
                        if (email && idx >= emailIndex && idx < emailIndex + email.length) continue;
                        // skip numbers inside phone
                        let inPhone = false;
                        for (const p of phones) if (idx >= p.idx && idx < p.idx + p.str.length) inPhone = true;
                        if (inPhone) continue;
                        // skip numbers inside date
                        if (expiry && idx >= dateIndex && idx < dateIndex + expiry.length) continue;
                        numbers.push({ num, idx });
                    }

                    const score = numbers.length ? numbers[0].num : null;

                    // Name: text up to score (if found) else up to matchText/statusText
                    let name = '';
                    if (score) {
                        const idx = value.indexOf(score);
                        if (idx > 0) name = value.substring(0, idx).trim();
                    } else if (matchText) {
                        const idx = value.indexOf(matchText);
                        if (idx > 0) name = value.substring(0, idx).trim();
                    }

                    if (name) items.push({ label: 'Candidate Name', value: name });
                    if (score) items.push({ label: 'Match Score', value: score });
                    if (matchText) items.push({ label: 'Match Text', value: matchText });
                    if (statusText) items.push({ label: 'Status', value: statusText });

                    // City/Location: between status and email (if possible)
                    let city = '';
                    if (statusText && email) {
                        const start = value.indexOf(statusText) + statusText.length;
                        const end = value.indexOf(email);
                        if (end > start) city = value.substring(start, end).trim();
                    } else if (statusText) {
                        const afterStatus = value.substring(value.indexOf(statusText) + statusText.length).trim();
                        city = afterStatus.slice(0, 30).trim();
                    }
                    if (city) items.push({ label: 'City/Location', value: city });

                    if (email) items.push({ label: 'Email ID', value: email });
                    if (phone) items.push({ label: 'Contact No', value: phone });

                    // Role: content between phone and date (or after phone)
                    if (phone && expiry) {
                        const start = value.indexOf(phone) + phone.length;
                        const end = value.indexOf(expiry);
                        if (end > start) {
                            const role = value.substring(start, end).trim();
                            if (role) items.push({ label: 'Role', value: role });
                        }
                    } else if (phone) {
                        const afterPhone = value.substring(value.indexOf(phone) + phone.length).trim();
                        if (afterPhone) items.push({ label: 'Role', value: afterPhone });
                    }

                    if (expiry) items.push({ label: 'Expiry', value: expiry });

                    // Deduplicate by label keeping first occurrence
                    const seen = new Set();
                    const deduped: { label: string; value: string }[] = [];
                    for (const it of items) {
                        if (seen.has(it.label)) continue;
                        seen.add(it.label);
                        deduped.push(it);
                    }

                    return deduped;
                };

        // Extract logged data from all action results (produce structured label/value pairs)
        const loggedDataItems: { label: string; value: string }[] = [];
        for (const execution of executions) {
            for (const actionResult of execution.actionResults) {
                const ld = actionResult.metadata?.loggedData;
                if (!ld) continue;

                // support several shapes: {label,value}, string, array
                if (Array.isArray(ld)) {
                    (ld as any[]).forEach(entry => {
                        // Include entries even if value is empty string (for City/Location etc)
                        if (entry?.label && entry?.value !== undefined) loggedDataItems.push({ label: String(entry.label), value: String(entry.value) });
                        else if (typeof entry === 'string') loggedDataItems.push({ label: 'Element Text', value: entry });
                    });
                    continue;
                }

                const label = (ld as any).label;
                const value = (ld as any).value ?? (typeof ld === 'string' ? ld : undefined);

                // Only attempt composite parsing when there is no explicit label — if a label
                // is already set the value is an individually-extracted cell and does not need
                // splitting (avoids false positives when an email or date appears as a plain value).
                const looksComposite = !label && typeof value === 'string' && (/[\w.+-]+@[\w.-]+\.\w+/.test(value) || /\d{1,2}-[A-Za-z]{3}-\d{4}/.test(value));
                if (looksComposite) {
                    const parsed = parseCompositeLoggedValue(String(value));
                    if (parsed.length > 0) {
                        parsed.forEach(p => loggedDataItems.push(p));
                        continue;
                    }
                }

                if (label && value !== undefined) {
                    loggedDataItems.push({ label: String(label), value: String(value) });
                } else if (typeof value === 'string') {
                    loggedDataItems.push({ label: 'Element Text', value });
                }
            }
        }

    // Split logged data into sections based on section headers (labels starting with "═══")
    const loggedDataSections: { title: string; items: { label: string; value: string; changed?: boolean }[] }[] = [];
    let currentSection: { title: string; items: { label: string; value: string; changed?: boolean }[] } | null = null;

    for (const item of loggedDataItems) {
        // Check if this is a section header (starts with "═══" and has empty value)
        if (item.label.startsWith('═══') && (!item.value || item.value === '')) {
            // Extract section title (remove ═══ characters)
            const title = item.label.replace(/═/g, '').trim();
            currentSection = { title, items: [] };
            loggedDataSections.push(currentSection);
        } else if (currentSection) {
            // Add to current section
            currentSection.items.push({ ...item });
        } else {
            // No section yet, create a default one
            if (loggedDataSections.length === 0) {
                currentSection = { title: 'Logged Data Summary', items: [] };
                loggedDataSections.push(currentSection);
            }
            currentSection!.items.push({ ...item });
        }
    }

    // Compute diff: mark items in sections 2+ whose value differs from the matching label in section 1
    if (loggedDataSections.length >= 2) {
        const beforeMap = new Map<string, string>();
        for (const item of loggedDataSections[0].items) {
            beforeMap.set(item.label, item.value);
        }
        for (let i = 1; i < loggedDataSections.length; i++) {
            for (const item of loggedDataSections[i].items) {
                const beforeValue = beforeMap.get(item.label);
                if (beforeValue !== undefined && beforeValue !== item.value) {
                    item.changed = true;
                }
            }
        }
    }

    // Add logged data to report context
    const reportContext = {
      ...report,
      hasLoggedData: loggedDataItems.length > 0,
      loggedDataItems,
      loggedDataSections,
      hasMultipleSections: loggedDataSections.length > 1
    };

    const html = compiled(reportContext);
    
    // Generate filename using test case name and execution date
    const testCaseName = executions[0]?.testCaseName || 'report';
    // Sanitize the test case name for use in filename (remove special characters)
    const sanitizedName = testCaseName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const filename = `${sanitizedName}_${dateStr}_${timeStr}.html`;
    const filePath = path.join(options.outputPath, filename);

    await fs.writeFile(filePath, html, 'utf-8');

    return filePath;
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(
    executions: TestCaseExecution[],
    options: ReportGeneratorOptions
  ): Promise<string> {
    const report = this.buildReport(executions);
    
    // Generate filename using test case name and execution date
    const testCaseName = executions[0]?.testCaseName || 'report';
    const sanitizedName = testCaseName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `${sanitizedName}_${dateStr}_${timeStr}.json`;
    const filePath = path.join(options.outputPath, filename);

    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');

    return filePath;
  }

  /**
   * Get the HTML template
   */
  private getHtmlTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            margin-bottom: 30px;
            border-radius: 10px;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .subtitle { opacity: 0.9; }
        .summary { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card { 
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card .value { 
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .summary-card .label { color: #666; }
        .summary-card.passed .value { color: #22c55e; }
        .summary-card.failed .value { color: #ef4444; }
        .summary-card.total .value { color: #3b82f6; }
        .executions { margin-top: 30px; }
        .execution { 
            background: white;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .execution-header { 
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .execution-header h3 { font-size: 1.2em; }
        .status-badge { 
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }
        .status-passed { background: #dcfce7; color: #16a34a; }
        .status-failed { background: #fee2e2; color: #dc2626; }
        .status-skipped { background: #fef3c7; color: #d97706; }
        .actions-list { padding: 20px; }
        .action-item { 
            padding: 15px;
            border-left: 4px solid #ddd;
            margin-bottom: 10px;
            background: #fafafa;
            border-radius: 0 5px 5px 0;
        }
        .action-item.success { border-left-color: #22c55e; }
        .action-item.failure { border-left-color: #ef4444; }
        .action-item.skipped { border-left-color: #f59e0b; }
        .action-type { 
            display: inline-block;
            background: #e5e7eb;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-family: monospace;
            margin-right: 10px;
        }
        .action-duration { color: #666; font-size: 0.9em; }
        .error-box { 
            background: #fee2e2;
            border: 1px solid #fecaca;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-family: monospace;
            font-size: 0.9em;
            color: #dc2626;
        }
        .logged-data-box { 
            background: #dbeafe;
            border: 1px solid #93c5fd;
            padding: 10px 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 0.9em;
            color: #1e40af;
        }
        .logged-data-box .log-label { 
            font-weight: bold;
            color: #1e3a8a;
        }
        .logged-data-box .log-value { 
            font-family: monospace;
            background: #eff6ff;
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 8px;
        }
        .logged-data-section {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-top: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
        }
        .logged-data-section h3 { 
            margin-bottom: 20px;
            color: #1e40af;
            font-size: 1.4em;
            border-bottom: 2px solid #dbeafe;
            padding-bottom: 10px;
        }
        .logged-data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        .logged-data-table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .logged-data-table th {
            padding: 14px 20px;
            text-align: left;
            color: white;
            font-weight: 600;
            font-size: 0.95em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .logged-data-table td {
            padding: 12px 20px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .logged-data-table tbody tr:last-child td {
            border-bottom: none;
        }
        .logged-data-table tbody tr {
            transition: background-color 0.2s ease;
        }
        .logged-data-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        .logged-data-table tbody tr:hover {
            background: #f0f9ff;
        }
        .logged-data-table td:first-child {
            font-weight: 600;
            color: #374151;
            width: 30%;
        }
        .logged-data-table td:last-child {
            font-family: 'Courier New', monospace;
            color: #1e40af;
            background: #f8fafc;
            font-size: 0.95em;
        }
        .value-changed td:last-child {
            background: #fef9c3 !important;
            color: #92400e !important;
            font-weight: 700;
        }
        .value-changed td:first-child {
            color: #92400e;
        }
        .value-changed-badge {
            display: inline-block;
            font-size: 0.72em;
            background: #fde68a;
            color: #92400e;
            border: 1px solid #f59e0b;
            border-radius: 4px;
            padding: 1px 6px;
            margin-left: 8px;
            font-weight: 600;
            vertical-align: middle;
            letter-spacing: 0.3px;
        }
        .section-divider {
            border: none;
            border-top: 2px dashed #e5e7eb;
            margin: 32px 0;
        }
        .logged-data-table-wrapper:last-child {
            margin-bottom: 0;
        }
        .metadata { 
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metadata h3 { margin-bottom: 15px; }
        .metadata-grid { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .metadata-item { 
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
        }
        .metadata-item .key { font-weight: bold; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
            <div class="subtitle">Generated: {{formatDate generatedAt}}</div>
        </div>

        <div class="summary">
            <div class="summary-card total">
                <div class="value">{{summary.totalTests}}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="summary-card passed">
                <div class="value">{{summary.passed}}</div>
                <div class="label">Passed</div>
            </div>
            <div class="summary-card failed">
                <div class="value">{{summary.failed}}</div>
                <div class="label">Failed</div>
            </div>
            <div class="summary-card">
                <div class="value">{{formatDuration summary.totalDuration}}</div>
                <div class="label">Duration</div>
            </div>
        </div>

        {{#if hasLoggedData}}
        <div class="logged-data-section">
            {{#if hasMultipleSections}}
            {{#each loggedDataSections}}
            {{#if @index}}<hr class="section-divider">{{/if}}
            <div class="logged-data-table-wrapper">
                <h3>📋 {{title}}</h3>
                <table class="logged-data-table">
                    <thead>
                        <tr>
                            <th>Label</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each items}}
                        <tr{{#if changed}} class="value-changed"{{/if}}>
                            <td>{{label}}</td>
                            <td>{{value}}{{#if changed}}<span class="value-changed-badge">changed</span>{{/if}}</td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
            </div>
            {{/each}}
            {{else}}
            <h3>📋 Logged Data Summary</h3>
            <table class="logged-data-table">
                <thead>
                    <tr>
                        <th>Label</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each loggedDataItems}}
                    <tr>
                        <td>{{label}}</td>
                        <td>{{value}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            {{/if}}
        </div>
        {{/if}}

        <div class="executions">
            <h2>Test Executions</h2>
            {{#each executions}}
            <div class="execution">
                <div class="execution-header">
                    <h3>{{statusIcon status}} {{testCaseName}}</h3>
                    <span class="status-badge {{statusClass status}}">{{status}}</span>
                </div>
                <div class="actions-list">
                    {{#each actionResults}}
                    <div class="action-item {{status}}">
                        <span class="action-type">{{actionType}}</span>
                        <span class="action-duration">{{formatDuration duration}}</span>
                        {{#if error}}
                        <div class="error-box">{{error.message}}</div>
                        {{/if}}
                        {{#if metadata.loggedData}}
                        <div class="logged-data-box">
                            <span class="log-label">📝 {{metadata.loggedData.label}}:</span>
                            <span class="log-value">{{metadata.loggedData.value}}</span>
                        </div>
                        {{/if}}
                    </div>
                    {{/each}}
                </div>
            </div>
            {{/each}}
        </div>

        <div class="metadata">
            <h3>Environment</h3>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <div class="key">Browser</div>
                    <div>{{environment.browser}} {{environment.browserVersion}}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Platform</div>
                    <div>{{environment.platform}}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Viewport</div>
                    <div>{{environment.viewport.width}}x{{environment.viewport.height}}</div>
                </div>
                <div class="metadata-item">
                    <div class="key">Agent Version</div>
                    <div>{{metadata.agentVersion}}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}
