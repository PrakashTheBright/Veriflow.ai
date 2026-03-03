/**
 * Action Parser
 * Parses and validates action files (YAML/JSON)
 */

import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import { z } from 'zod';
import {
  Action,
  ActionType,
  TestCase,
  TestCaseStatus,
  TestCasePriority
} from '../types';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Zod schemas for validation
const BaseActionSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(ActionType),
  description: z.string(),
  timeout: z.number().optional(),
  retryCount: z.number().optional(),
  continueOnFailure: z.boolean().optional(),
  screenshotBefore: z.boolean().optional(),
  screenshotAfter: z.boolean().optional()
});

const NavigateActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.NAVIGATE),
  url: z.string().url(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional()
});

const ClickActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.CLICK),
  selector: z.string(),
  button: z.enum(['left', 'right', 'middle']).optional(),
  clickCount: z.number().optional(),
  delay: z.number().optional()
});

const TypeActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.TYPE),
  selector: z.string(),
  text: z.string().optional(),
  credentialKey: z.string().optional(),
  delay: z.number().optional(),
  clearFirst: z.boolean().optional()
});

const SelectActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.SELECT),
  selector: z.string(),
  value: z.string().optional(),
  label: z.string().optional(),
  index: z.number().optional()
});

const WaitActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.WAIT),
  duration: z.number()
});

const WaitForSelectorActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.WAIT_FOR_SELECTOR),
  selector: z.string(),
  state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional()
});

const AssertTextActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.ASSERT_TEXT),
  selector: z.string(),
  expectedText: z.string(),
  matchType: z.enum(['exact', 'contains', 'regex']).optional()
});

const AssertVisibleActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.ASSERT_VISIBLE),
  selector: z.string(),
  visible: z.boolean()
});

const AssertUrlActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.ASSERT_URL),
  expectedUrl: z.string(),
  matchType: z.enum(['exact', 'contains', 'regex']).optional()
});

const ScreenshotActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.SCREENSHOT),
  name: z.string(),
  fullPage: z.boolean().optional(),
  selector: z.string().optional()
});

const LogTextActionSchema = BaseActionSchema.extend({
  type: z.literal(ActionType.LOG_TEXT),
  selector: z.string(),
  label: z.string().optional()
});

const ActionSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  ClickActionSchema,
  TypeActionSchema,
  SelectActionSchema,
  WaitActionSchema,
  WaitForSelectorActionSchema,
  AssertTextActionSchema,
  AssertVisibleActionSchema,
  AssertUrlActionSchema,
  ScreenshotActionSchema,
  LogTextActionSchema
]);

const TestCaseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.nativeEnum(TestCasePriority).optional(),
  preconditions: z.array(z.string()).optional(),
  actions: z.array(z.any()), // Validated separately
  expectedOutcome: z.string(),
  timeout: z.number().optional(),
  retryOnFailure: z.boolean().optional(),
  maxRetries: z.number().optional(),
  metadata: z.record(z.unknown()).optional()
});

export class ActionParser {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Replace environment variable placeholders with actual values
   * Supports ${VAR_NAME} syntax and dynamic date expressions:
   * - ${DATE} - today's date in DD-MMM-YYYY format
   * - ${DATE+N} - today + N days (e.g., ${DATE+30} for 30 days from now)
   * - ${DATE-N} - today - N days (e.g., ${DATE-7} for 7 days ago)
   */
  private replaceEnvVariables(text: string): string {
    // First, handle dynamic date expressions: ${DATE}, ${DATE+N}, ${DATE-N}
    text = text.replace(/\$\{DATE([+-]\d+)?\}/gi, (match, offset) => {
      const today = new Date();
      if (offset) {
        const days = parseInt(offset, 10);
        today.setDate(today.getDate() + days);
      }
      // Format as DD-MMM-YYYY (e.g., 13-Mar-2026)
      const day = String(today.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[today.getMonth()];
      const year = today.getFullYear();
      return `${day}-${month}-${year}`;
    });

    // Then handle regular environment variables
    return text.replace(/\$\{(\w+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value !== undefined) {
        return value;
      }
      this.logger.warn(`Environment variable ${varName} not found, keeping placeholder`);
      return match;
    });
  }

  /**
   * Parse a test case file (YAML, JSON, or Markdown)
   */
  async parseTestCase(filePath: string): Promise<TestCase> {
    this.logger.info(`Parsing test case file: ${filePath}`);

    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    let data: unknown;

    if (ext === '.yaml' || ext === '.yml') {
      data = YAML.parse(content);
    } else if (ext === '.json') {
      data = JSON.parse(content);
    } else if (ext === '.md') {
      // Parse markdown file with numbered steps
      data = this.parseMarkdownToTestCase(content, filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    // Validate test case structure
    const parsed = TestCaseSchema.parse(data);

    // Generate IDs if not provided
    const testCase: TestCase = {
      id: parsed.id || uuidv4(),
      name: parsed.name,
      description: parsed.description,
      version: parsed.version || '1.0.0',
      author: parsed.author || 'Unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: parsed.tags || [],
      priority: parsed.priority || TestCasePriority.MEDIUM,
      status: TestCaseStatus.PENDING,
      preconditions: parsed.preconditions,
      actions: this.parseActions(parsed.actions),
      expectedOutcome: parsed.expectedOutcome,
      timeout: parsed.timeout,
      retryOnFailure: parsed.retryOnFailure,
      maxRetries: parsed.maxRetries,
      metadata: parsed.metadata
    };

    this.logger.info(`Parsed test case: ${testCase.name}`, {
      id: testCase.id,
      actionCount: testCase.actions.length
    });

    return testCase;
  }

  /**
   * Parse and assign IDs to actions
   */
  private parseActions(rawActions: unknown[]): Action[] {
    return rawActions.map((rawAction, index) => {
      const action = rawAction as Record<string, unknown>;
      
      return {
        ...action,
        id: (action.id as string) || `action_${index + 1}_${uuidv4().slice(0, 8)}`
      } as Action;
    });
  }

  /**
   * Parse markdown file with numbered steps into a test case
   * Supports natural language instructions like:
   * 1. Open browser
   * 2. Navigate to http://example.com
   * 3. Click on the login button
   * 4. Put username as user@email.com and password as secret123
   */
  private parseMarkdownToTestCase(content: string, filePath: string): unknown {
    const fileName = path.basename(filePath, '.md');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const actions: unknown[] = [];
    
    for (const line of lines) {
      // Match numbered steps: "1. ", "2. ", etc. or "- " bullet points
      const stepMatch = line.match(/^(\d+\.|-)\s+(.+)$/i);
      if (!stepMatch) continue;
      
      // Replace environment variables in the instruction
      const rawInstruction = this.replaceEnvVariables(stepMatch[2]);
      const instruction = rawInstruction.toLowerCase();
      const originalInstruction = rawInstruction;
      
      // Parse the instruction into action(s)
      const result = this.parseInstructionToAction(instruction, originalInstruction);
      if (result) {
        // Handle array of actions (e.g., username + password in one step)
        if (Array.isArray(result)) {
          actions.push(...result);
        } else {
          actions.push(result);
        }
      }
    }
    
    return {
      id: `tc-${fileName}-${uuidv4().slice(0, 8)}`,
      name: this.formatTestName(fileName),
      description: `Test case generated from ${path.basename(filePath)}`,
      actions,
      expectedOutcome: 'All steps should complete successfully'
    };
  }

  /**
   * Parse a natural language instruction into an action object
   */
  private parseInstructionToAction(instruction: string, original: string): unknown | null {
    // Skip comments and headers
    if (instruction.startsWith('#') || instruction.startsWith('//')) {
      return null;
    }

    // Open browser - skip, browser opens automatically
    if (instruction.match(/^open\s+browser$/i)) {
      return null;
    }

    // Navigate patterns - check for URL in the instruction
    const urlMatch = instruction.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      return {
        type: 'navigate',
        description: original,
        url: urlMatch[1],
        waitUntil: 'load',
        timeout: 60000
      };
    }

    // Switch/toggle patterns
    if (instruction.match(/switch|toggle/i)) {
      return {
        type: 'click',
        description: original,
        selector: '.ant-switch'
      };
    }

    // Separate password entry: "enter password <value>"
    const separatePasswordMatch = instruction.match(/^enter\s+password\s+(\S+)/i);
    if (separatePasswordMatch) {
      return {
        type: 'type',
        description: original,
        selector: '#login_form_password',
        text: separatePasswordMatch[1],
        clearFirst: true
      };
    }

    // Separate username/email entry: "enter username/email <value>"
    const separateEmailMatch = instruction.match(/^enter\s+(?:username|email|user)(?:\/email|\/username)?\s+(\S+)/i);
    if (separateEmailMatch) {
      return [
        {
          type: 'waitForSelector',
          description: 'Wait for email input',
          selector: '#login_form_email',
          state: 'visible',
          timeout: 30000
        },
        {
          type: 'type',
          description: 'Enter email/username',
          selector: '#login_form_email',
          text: separateEmailMatch[1],
          clearFirst: true
        }
      ];
    }

    // Put/Enter username and password pattern (both in one line)
    if (instruction.match(/put|enter|type|fill/i) && 
        instruction.match(/username|email|user/i) && instruction.match(/password/i)) {
      
      const emailMatch = instruction.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const passwordMatch = instruction.match(/password\s+(?:as|is|:)?\s*(\S+)/i);
      
      const actions = [];
      
      // Wait for form first
      actions.push({
        type: 'waitForSelector',
        description: 'Wait for email input',
        selector: '#login_form_email',
        state: 'visible',
        timeout: 30000
      });
      
      if (emailMatch) {
        actions.push({
          type: 'type',
          description: 'Enter email/username',
          selector: '#login_form_email',
          text: emailMatch[1],
          clearFirst: true
        });
      }
      
      if (passwordMatch) {
        actions.push({
          type: 'type',
          description: 'Enter password',
          selector: '#login_form_password',
          text: passwordMatch[1],
          clearFirst: true
        });
      }
      
      return actions.length > 0 ? actions : null;
    }

    // Click patterns
    if (instruction.match(/click/i)) {
      // HIGHEST PRIORITY: Handle "force click on selector <SELECTOR>" pattern
      // This bypasses Playwright's actionability checks (useful for overlays)
      const forceClickOnSelectorMatch = original.match(/force\s+click\s+(?:on\s+)?selector\s+(.+)/i);
      if (forceClickOnSelectorMatch) {
        const selector = forceClickOnSelectorMatch[1].trim();
        return {
          type: 'click',
          description: original,
          selector: selector,
          force: true
        };
      }

      // Handle "click on selector <SELECTOR>" pattern
      // This allows passing any valid Playwright selector directly
      const clickOnSelectorMatch = original.match(/click\s+(?:on\s+)?selector\s+(.+)/i);
      if (clickOnSelectorMatch) {
        const selector = clickOnSelectorMatch[1].trim();
        return {
          type: 'click',
          description: original,
          selector: selector
        };
      }
      
      // Handle complex Playwright selectors with >> chaining
      // Examples: .ant-card >> nth=0 >> .anticon-ellipsis, text=Foo >> visible=true
      const clickChainedSelectorMatch = original.match(/click\s+(?:on\s+)?([.#\[][\S]+(?:\s+>>\s+[\S]+)+)/i);
      if (clickChainedSelectorMatch) {
        const selector = clickChainedSelectorMatch[1].trim();
        return {
          type: 'click',
          description: original,
          selector: selector
        };
      }

      // First check for CSS selector patterns - these take priority over quoted text
      // Click on CSS selector: click on .classname, click on [attribute], click on #id
      // Pattern matches: .selector[attr="value with spaces"], [attr="value"], #id, etc.
      // Use original instruction to preserve case in attribute values
      const clickAttrSelectorMatchOriginal = original.match(/click\s+(?:on\s+)?([.#][\w-]+(?:\[[^\]]+\])+)/i);
      if (clickAttrSelectorMatchOriginal) {
        const selector = clickAttrSelectorMatchOriginal[1].trim();
        return {
          type: 'click',
          description: original,
          selector: selector
        };
      }
      
      // Simple CSS selector without complex attributes: click on .class, click on #id
      // Use original instruction to preserve case
      const clickSimpleSelectorMatchOriginal = original.match(/click\s+(?:on\s+)?([.#][\w-]+)$/i);
      if (clickSimpleSelectorMatchOriginal) {
        const selector = clickSimpleSelectorMatchOriginal[1].trim();
        return {
          type: 'click',
          description: original,
          selector: selector
        };
      }
      
      // Extract quoted text for button/element text (only if not a CSS selector)
      // Use 'original' to preserve the case of the button text in the selector
      const quotedMatch = original.match(/click\s+(?:on\s+)?["']([^"']+)["']/i);
      if (quotedMatch) {
        const buttonText = quotedMatch[1].toLowerCase();
        
        // Special handling for sign in button
        if (buttonText === 'sign in' || buttonText === 'signin' || buttonText === 'login') {
          return {
            type: 'click',
            description: original,
            selector: 'button.ant-btn-primary'
          };
        }
        
        // Special handling for create assessment button
        if (buttonText === 'create assessment') {
          return {
            type: 'click',
            description: original,
            selector: 'button:has-text("Create Assessment"), a:has-text("Create Assessment")'
          };
        }
        
        // Special handling for analyze button
        if (buttonText === 'analyze') {
          return {
            type: 'click',
            description: original,
            selector: 'button:has-text("Analyze")'
          };
        }
        
        // Special handling for next button - use exact text if it contains more than just "next"
        if (buttonText === 'next') {
          return {
            type: 'click',
            description: original,
            selector: 'button:has-text("Next")'
          };
        }
        
        // For buttons containing "next" but with more text (e.g., "Next, Invite Candidates")
        // use the full text to match the exact button - try multiple element types
        if (buttonText.includes('next')) {
          return {
            type: 'click',
            description: original,
            selector: `button:has-text("${quotedMatch[1]}"), .ant-btn:has-text("${quotedMatch[1]}"), a:has-text("${quotedMatch[1]}"), :text("${quotedMatch[1]}")`
          };
        }
        
        // Use case-insensitive text matching for other buttons
        return {
          type: 'click',
          description: original,
          selector: `text="${quotedMatch[1]}" >> visible=true`
        };
      }
      
      // Sign in / Login button
      if (instruction.match(/sign\s*in|login|submit/i)) {
        return {
          type: 'click',
          description: original,
          selector: 'button.ant-btn-primary'
        };
      }
      
      // Create assessment - use button with text match
      if (instruction.match(/create\s+assessment/i)) {
        return {
          type: 'click',
          description: original,
          selector: 'button:has-text("Create Assessment"), a:has-text("Create Assessment"), :text("Create Assessment")'
        };
      }

      // Analyze button
      if (instruction.match(/analyze/i)) {
        return {
          type: 'click',
          description: original,
          selector: 'text="Analyze"'
        };
      }

      // Next button
      if (instruction.match(/next/i)) {
        return {
          type: 'click',
          description: original,
          selector: 'button:has-text("Next")'
        };
      }
      
      // Generic click on element - click the toggle switch (common action before login)
      if (instruction.match(/click\s+on\s+element$/i)) {
        return {
          type: 'click',
          description: original,
          selector: '.ant-switch'
        };
      }
      
      // Generic click - try to extract selector hint
      return {
        type: 'click',
        description: original,
        selector: 'button.ant-btn-primary'
      };
    }

    // Type with selector pattern: type "value" in selector
    const typeWithSelectorMatch = instruction.match(/type\s+["']([^"']+)["']\s+in\s+(.+)/i);
    if (typeWithSelectorMatch) {
      const value = typeWithSelectorMatch[1];
      let selector = typeWithSelectorMatch[2].trim();
      
      // Skip "on" values which are checkbox artifacts
      if (value === 'on') {
        return null;
      }
      
      // Skip file input values (fakepath)
      if (value.includes('fakepath')) {
        return null;
      }
      
      // Handle attribute selectors [name="..."]
      if (selector.startsWith('[')) {
        // Keep as is - attribute selector
      } else if (selector.startsWith('.')) {
        // Class selector - keep as is
      } else if (selector.startsWith('#')) {
        // ID selector - keep as is
      } else if (/^[a-z]+[.#\[]/.test(selector)) {
        // Tag-based selector like textarea.class, input#id, div[attr] - keep as is
      } else if (/^[a-z]+$/.test(selector)) {
        // Simple HTML tag selector like textarea, input, button - keep as is
      } else {
        // Try to make it a valid class selector
        selector = `.${selector}`;
      }
      
      return {
        type: 'type',
        description: original,
        selector: selector,
        text: value,
        clearFirst: true
      };
    }

    // Wait for selector pattern: "wait for selector <selector> [to be hidden|visible|attached|detached]"
    const waitForSelectorMatch = instruction.match(/^wait\s+for\s+selector\s+(.+?)(?:\s+to\s+be\s+(hidden|visible|attached|detached))?$/i);
    if (waitForSelectorMatch) {
      const selector = waitForSelectorMatch[1].trim();
      const stateMatch = waitForSelectorMatch[2];
      const state = stateMatch ? stateMatch.toLowerCase() as 'hidden' | 'visible' | 'attached' | 'detached' : 'visible';
      return {
        type: 'waitForSelector',
        description: original,
        selector: selector,
        state: state,
        timeout: 60000
      };
    }

    // Wait patterns
    if (instruction.match(/^wait/i)) {
      const durationMatch = instruction.match(/(\d+)\s*(second|sec|s|ms|millisecond)/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) * (durationMatch[2].startsWith('ms') ? 1 : 1000) : 2000;
      
      return {
        type: 'wait',
        description: original,
        duration
      };
    }

    // Press key patterns: "press Ctrl+A", "press Enter", "press Tab"
    const pressKeyMatch = instruction.match(/^press\s+(.+)/i);
    if (pressKeyMatch) {
      const keyCombo = pressKeyMatch[1].trim();
      // Parse modifiers and key from combinations like "Ctrl+A", "Shift+Tab", "Control+a"
      const parts = keyCombo.split('+');
      let key = parts[parts.length - 1];
      const modifiers = parts.slice(0, -1).map(m => {
        // Normalize modifier names
        const mod = m.toLowerCase();
        if (mod === 'ctrl' || mod === 'control') return 'Control';
        if (mod === 'shift') return 'Shift';
        if (mod === 'alt') return 'Alt';
        if (mod === 'meta' || mod === 'cmd' || mod === 'command') return 'Meta';
        return m;
      });
      
      return {
        type: 'pressKey',
        description: original,
        key: key,
        modifiers: modifiers.length > 0 ? modifiers : undefined
      };
    }

    // Screenshot patterns
    if (instruction.match(/screenshot|capture|snap/i)) {
      return {
        type: 'screenshot',
        description: original,
        name: `screenshot-${Date.now()}`,
        fullPage: false
      };
    }

    // Upload file pattern: "upload file <filepath>" or "upload <filepath>"
    const uploadFileMatch = instruction.match(/upload\s+(?:file\s+)?["']([^"']+)["']/i);
    if (uploadFileMatch) {
      return {
        type: 'uploadFile',
        description: original,
        selector: 'input[type="file"]',
        filePath: uploadFileMatch[1]
      };
    }

    // Log text / Print text pattern: "log text from selector .class" or "print text of selector .class label 'Match Score'"
    // Pattern: log text from selector <selector> [label "<label>"]
    const logTextMatch = original.match(/(?:log|print|get|read)\s+(?:text|value)\s+(?:from|of)?\s*selector\s+(.+?)(?:\s+(?:as|label)\s+["']([^"']+)["'])?$/i);
    if (logTextMatch) {
      return {
        type: 'logText',
        description: original,
        selector: logTextMatch[1].trim(),
        label: logTextMatch[2] || undefined
      };
    }

    // Select date pattern: "select date 13-Mar-2026" or "select date ${DATE+30}"
    // Pattern: select date <date>
    const selectDateMatch = instruction.match(/select\s+date\s+(.+)/i);
    if (selectDateMatch) {
      // The date value will be resolved by replaceEnvVariables if it contains ${DATE+N}
      const dateValue = selectDateMatch[1].trim();
      return {
        type: 'selectDate',
        description: original,
        date: dateValue
      };
    }

    this.logger.warn(`Could not parse instruction: ${original}`);
    return null;
  }

  /**
   * Format filename to test name
   */
  private formatTestName(fileName: string): string {
    return fileName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Validate actions against schema
   */
  async validateActions(actions: Action[]): Promise<string[]> {
    const errors: string[] = [];

    for (const action of actions) {
      try {
        // Basic type validation
        if (!Object.values(ActionType).includes(action.type)) {
          errors.push(`Invalid action type: ${action.type} (action: ${action.id})`);
          continue;
        }

        // Validate required fields based on action type
        const validationResult = this.validateActionFields(action);
        if (validationResult) {
          errors.push(validationResult);
        }
      } catch (error) {
        errors.push(`Validation error for action ${action.id}: ${error}`);
      }
    }

    return errors;
  }

  /**
   * Validate required fields for specific action types
   */
  private validateActionFields(action: Action): string | null {
    switch (action.type) {
      case ActionType.NAVIGATE:
        if (!('url' in action) || !action.url) {
          return `Navigate action ${action.id} missing 'url' field`;
        }
        break;

      case ActionType.CLICK:
      case ActionType.HOVER:
        if (!('selector' in action) || !action.selector) {
          return `${action.type} action ${action.id} missing 'selector' field`;
        }
        break;

      case ActionType.TYPE: {
        const typeAction = action as { id: string; selector?: string; text?: string; credentialKey?: string };
        if (!typeAction.selector) {
          return `Type action ${action.id} missing 'selector' field`;
        }
        if (!typeAction.text && !typeAction.credentialKey) {
          return `Type action ${action.id} missing 'text' or 'credentialKey' field`;
        }
        break;
      }

      case ActionType.WAIT:
        if (!('duration' in action) || typeof action.duration !== 'number') {
          return `Wait action ${action.id} missing 'duration' field`;
        }
        break;

      case ActionType.ASSERT_TEXT: {
        const assertAction = action as { id: string; selector?: string; expectedText?: string };
        if (!assertAction.selector) {
          return `AssertText action ${action.id} missing 'selector' field`;
        }
        if (!assertAction.expectedText) {
          return `AssertText action ${action.id} missing 'expectedText' field`;
        }
        break;
      }
    }

    return null;
  }

  /**
   * List all test case files in a directory
   */
  async listTestCases(directory: string): Promise<string[]> {
    const files = await fs.readdir(directory);
    
    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.yaml', '.yml', '.json', '.md'].includes(ext);
      })
      .map(file => path.join(directory, file));
  }
}
