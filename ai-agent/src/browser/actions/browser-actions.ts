/**
 * Browser Actions
 * Atomic browser operations that map to Playwright commands
 */

import { Page, ElementHandle, Frame } from 'playwright';
import {
  Action,
  ActionType,
  NavigateAction,
  ClickAction,
  TypeAction,
  SelectAction,
  WaitAction,
  WaitForSelectorAction,
  WaitForNavigationAction,
  ScreenshotAction,
  ScrollAction,
  HoverAction,
  PressKeyAction,
  AssertTextAction,
  AssertVisibleAction,
  AssertUrlAction,
  ExecuteScriptAction,
  UploadFileAction,
  SwitchFrameAction,
  LogTextAction,
  SelectDateAction,
  CheckVisibleOrLogAction,
  ResetCandidateByStatusAction
} from '../../types';
import * as path from 'path';
import * as fs from 'fs';

export class BrowserActions {
  private page: Page;
  private currentFrame: Page | Frame;

  constructor(page: Page) {
    this.page = page;
    this.currentFrame = page;
  }

  /**
   * Execute an action based on its type
   * Returns action result data (e.g., logged text values, stopTest flag)
   */
  async execute(action: Action): Promise<{ 
    loggedData?: { label: string; value: string } | { label: string; value: string }[];
    stopTest?: boolean;
    wasVisible?: boolean;
  } | void> {
    switch (action.type) {
      case ActionType.NAVIGATE:
        await this.navigate(action as NavigateAction);
        break;
      case ActionType.CLICK:
        await this.click(action as ClickAction);
        break;
      case ActionType.TYPE:
        await this.type(action as TypeAction);
        break;
      case ActionType.SELECT:
        await this.select(action as SelectAction);
        break;
      case ActionType.WAIT:
        await this.wait(action as WaitAction);
        break;
      case ActionType.WAIT_FOR_SELECTOR:
        await this.waitForSelector(action as WaitForSelectorAction);
        break;
      case ActionType.WAIT_FOR_NAVIGATION:
        await this.waitForNavigation(action as WaitForNavigationAction);
        break;
      case ActionType.SCREENSHOT:
        await this.screenshot(action as ScreenshotAction);
        break;
      case ActionType.SCROLL:
        await this.scroll(action as ScrollAction);
        break;
      case ActionType.HOVER:
        await this.hover(action as HoverAction);
        break;
      case ActionType.PRESS_KEY:
        await this.pressKey(action as PressKeyAction);
        break;
      case ActionType.ASSERT_TEXT:
        await this.assertText(action as AssertTextAction);
        break;
      case ActionType.ASSERT_VISIBLE:
        await this.assertVisible(action as AssertVisibleAction);
        break;
      case ActionType.ASSERT_URL:
        await this.assertUrl(action as AssertUrlAction);
        break;
      case ActionType.EXECUTE_SCRIPT:
        await this.executeScript(action as ExecuteScriptAction);
        break;
      case ActionType.UPLOAD_FILE:
        await this.uploadFile(action as UploadFileAction);
        break;
      case ActionType.SWITCH_FRAME:
        await this.switchFrame(action as SwitchFrameAction);
        break;
      case ActionType.LOG_TEXT:
        const loggedData = await this.logText(action as LogTextAction);
        return { loggedData };
      case ActionType.SELECT_DATE:
        await this.selectDate(action as SelectDateAction);
        break;
      case ActionType.CHECK_VISIBLE_OR_LOG:
        const checkResult = await this.checkVisibleOrLog(action as CheckVisibleOrLogAction);
        return checkResult;
      case ActionType.RESET_CANDIDATE_BY_STATUS:
        const resetResult = await this.resetCandidateByStatus(action as ResetCandidateByStatusAction);
        return resetResult;
      default:
        throw new Error(`Unsupported action type: ${(action as Action).type}`);
    }
  }

  async navigate(action: NavigateAction): Promise<void> {
    await this.page.goto(action.url, {
      waitUntil: action.waitUntil || 'load',
      timeout: action.timeout
    });
  }

  async click(action: ClickAction): Promise<void> {
    await this.currentFrame.click(action.selector, {
      button: action.button || 'left',
      clickCount: action.clickCount || 1,
      delay: action.delay,
      timeout: action.timeout,
      force: action.force || false
    });
  }

  async type(action: TypeAction, resolvedText?: string): Promise<void> {
    const text = resolvedText || action.text;

    if (action.clearFirst) {
      await this.currentFrame.fill(action.selector, '');
    }

    await this.currentFrame.type(action.selector, text, {
      delay: action.delay,
      timeout: action.timeout
    });
  }

  async select(action: SelectAction): Promise<void> {
    if (action.value) {
      await this.currentFrame.selectOption(action.selector, { value: action.value });
    } else if (action.label) {
      await this.currentFrame.selectOption(action.selector, { label: action.label });
    } else if (action.index !== undefined) {
      await this.currentFrame.selectOption(action.selector, { index: action.index });
    }
  }

  async wait(action: WaitAction): Promise<void> {
    await this.page.waitForTimeout(action.duration);
  }

  async waitForSelector(action: WaitForSelectorAction): Promise<void> {
    await this.currentFrame.waitForSelector(action.selector, {
      state: action.state || 'visible',
      timeout: action.timeout
    });
  }

  async waitForNavigation(action: WaitForNavigationAction): Promise<void> {
    await this.page.waitForNavigation({
      url: action.url,
      waitUntil: action.waitUntil || 'load',
      timeout: action.timeout
    });
  }

  async screenshot(action: ScreenshotAction): Promise<string> {
    const screenshotsDir = path.join(process.cwd(), 'reports', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${action.name}_${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);

    if (action.selector) {
      // Screenshot specific element
      const element = await this.currentFrame.waitForSelector(action.selector);
      if (element) {
        await element.screenshot({ path: filepath });
      }
    } else {
      // Full page or viewport screenshot
      await this.page.screenshot({
        path: filepath,
        fullPage: action.fullPage || false
      });
    }

    return filepath;
  }

  async scroll(action: ScrollAction): Promise<void> {
    if (action.selector) {
      await this.currentFrame.evaluate((selector) => {
        document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
      }, action.selector);
    } else if (action.x !== undefined && action.y !== undefined) {
      await this.page.evaluate(({ x, y }) => {
        window.scrollTo(x, y);
      }, { x: action.x, y: action.y });
    } else if (action.direction && action.amount) {
      const scrollAmount = action.direction === 'up' || action.direction === 'left' 
        ? -action.amount 
        : action.amount;
      
      if (action.direction === 'up' || action.direction === 'down') {
        await this.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
      } else {
        await this.page.evaluate((amount) => window.scrollBy(amount, 0), scrollAmount);
      }
    }
  }

  async hover(action: HoverAction): Promise<void> {
    await this.currentFrame.hover(action.selector, {
      timeout: action.timeout
    });
  }

  async pressKey(action: PressKeyAction): Promise<void> {
    let key = action.key;
    
    if (action.modifiers && action.modifiers.length > 0) {
      key = action.modifiers.join('+') + '+' + key;
    }

    await this.page.keyboard.press(key);
  }

  async assertText(action: AssertTextAction): Promise<void> {
    const element = await this.currentFrame.waitForSelector(action.selector, {
      timeout: action.timeout
    });

    if (!element) {
      throw new Error(`Element not found: ${action.selector}`);
    }

    const actualText = await element.textContent() || '';

    switch (action.matchType || 'contains') {
      case 'exact':
        if (actualText !== action.expectedText) {
          throw new Error(`Text assertion failed: expected "${action.expectedText}", got "${actualText}"`);
        }
        break;
      case 'contains':
        if (!actualText.includes(action.expectedText)) {
          throw new Error(`Text assertion failed: expected to contain "${action.expectedText}", got "${actualText}"`);
        }
        break;
      case 'regex':
        if (!new RegExp(action.expectedText).test(actualText)) {
          throw new Error(`Text assertion failed: expected to match "${action.expectedText}", got "${actualText}"`);
        }
        break;
    }
  }

  async assertVisible(action: AssertVisibleAction): Promise<void> {
    const element = await this.currentFrame.$(action.selector);
    const isVisible = element ? await element.isVisible() : false;

    if (isVisible !== action.visible) {
      throw new Error(
        `Visibility assertion failed: expected ${action.visible ? 'visible' : 'hidden'}, got ${isVisible ? 'visible' : 'hidden'}`
      );
    }
  }

  async assertUrl(action: AssertUrlAction): Promise<void> {
    const currentUrl = this.page.url();

    switch (action.matchType || 'contains') {
      case 'exact':
        if (currentUrl !== action.expectedUrl) {
          throw new Error(`URL assertion failed: expected "${action.expectedUrl}", got "${currentUrl}"`);
        }
        break;
      case 'contains':
        if (!currentUrl.includes(action.expectedUrl)) {
          throw new Error(`URL assertion failed: expected to contain "${action.expectedUrl}", got "${currentUrl}"`);
        }
        break;
      case 'regex':
        if (!new RegExp(action.expectedUrl).test(currentUrl)) {
          throw new Error(`URL assertion failed: expected to match "${action.expectedUrl}", got "${currentUrl}"`);
        }
        break;
    }
  }

  async executeScript(action: ExecuteScriptAction): Promise<unknown> {
    return await this.page.evaluate(action.script, action.args);
  }

  async uploadFile(action: UploadFileAction): Promise<void> {
    // File inputs are often hidden, so we use state: 'attached' instead of 'visible'
    const input = await this.currentFrame.waitForSelector(action.selector, { state: 'attached' });
    if (input) {
      await input.setInputFiles(action.filePath);
    }
  }

  async switchFrame(action: SwitchFrameAction): Promise<void> {
    if (action.frameSelector) {
      const frameElement = await this.page.$(action.frameSelector);
      if (frameElement) {
        const frame = await frameElement.contentFrame();
        if (frame) {
          this.currentFrame = frame;
          return;
        }
      }
      throw new Error(`Frame not found: ${action.frameSelector}`);
    } else if (action.frameName) {
      const frame = this.page.frame({ name: action.frameName });
      if (frame) {
        this.currentFrame = frame;
        return;
      }
      throw new Error(`Frame not found: ${action.frameName}`);
    } else if (action.frameIndex !== undefined) {
      const frames = this.page.frames();
      if (action.frameIndex < frames.length) {
        this.currentFrame = frames[action.frameIndex];
        return;
      }
      throw new Error(`Frame index out of bounds: ${action.frameIndex}`);
    }

    // Switch back to main frame
    this.currentFrame = this.page;
  }

  /**
   * Reset to main frame
   */
  resetFrame(): void {
    this.currentFrame = this.page;
  }

  /**
   * Log text content from an element
   * Prints the text content to console with optional label
   * Returns the label and value for reporting
   */
  async logText(action: LogTextAction): Promise<{ label: string; value: string }> {
    const timeout = action.timeout ?? 10000;
    let textContent = '';
    // First, try the Playwright locator (supports complex locators chaining with >>)
    try {
      const el = await this.currentFrame.waitForSelector(action.selector, { timeout });
      if (el) {
        textContent = (await el.textContent()) || '';
      }
    } catch (err) {
      // ignore - we'll try fallback DOM queries below
    }

    // Fallback: try a direct DOM query using page.evaluate if Playwright locator failed
    if (!textContent) {
      try {
        // Convert Playwright '>>' chaining into a CSS selector sequence
        const cssSelector = action.selector.split('>>').map(s => s.trim()).join(' ');
        textContent = await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? (el.textContent || '').trim() : '';
        }, cssSelector);
      } catch (err) {
        // final fallback: try to find any element that matches the last part of selector
        try {
          const parts = action.selector.split('>>').map(s => s.trim());
          const last = parts[parts.length - 1];
          textContent = await this.page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? (el.textContent || '').trim() : '';
          }, last);
        } catch (e) {
          textContent = '';
        }
      }
    }

    const label = action.label || 'Element Text';
    const value = (textContent || '').trim();

    // Print with visual formatting
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log(`║  📝 ${label.padEnd(55)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Value: ${value.padEnd(51)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    return { label, value };
  }

  /**
   * Check if a selector is visible, and if not, log a fallback message
   * Optionally click on the element if visible
   * Can stop the test gracefully if not visible (without marking as failed)
   */
  async checkVisibleOrLog(action: CheckVisibleOrLogAction): Promise<{ 
    loggedData?: { label: string; value: string }; 
    stopTest?: boolean;
    wasVisible?: boolean;
  }> {
    const timeout = action.timeout ?? 10000; // Use a shorter timeout for check
    let isVisible = false;

    try {
      // Try to find the element with a shorter timeout
      const element = await this.currentFrame.waitForSelector(action.selector, { 
        state: 'visible',
        timeout 
      });
      isVisible = element !== null;
    } catch (err) {
      // Element not found or not visible within timeout
      isVisible = false;
    }

    if (isVisible) {
      // Element is visible
      if (action.clickIfVisible) {
        // Click on the element (or a different selector if specified)
        const clickSelector = action.clickSelector || action.selector;
        await this.currentFrame.click(clickSelector, {
          force: true,
          timeout: action.timeout
        });
      }
      
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ Visibility Check Passed                                 ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  Selector: ${action.selector.substring(0, 48).padEnd(48)}║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      return { wasVisible: true };
    } else {
      // Element not visible - log the fallback message
      const label = 'Status Check';
      const value = action.fallbackMessage;

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  Visibility Check - Element Not Found                   ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║  ${value.substring(0, 58).padEnd(58)}║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      return { 
        loggedData: { label, value }, 
        stopTest: action.stopTestIfNotVisible ?? false,
        wasVisible: false
      };
    }
  }

  /**
   * Reset candidate by status - checks if a candidate with specific status exists,
   * and if found: logs candidate info, clicks action menu, clicks Regenerate Interview
   * If found and reset: returns stopTest: true to gracefully end test as passed
   * If not found: returns continue (allows next status check to run)
   * Returns two sets of logged data: Before and After regeneration
   */
  async resetCandidateByStatus(action: ResetCandidateByStatusAction): Promise<{
    loggedData?: { label: string; value: string }[];
    stopTest?: boolean;
    wasVisible?: boolean;
  }> {
    const timeout = action.timeout ?? 10000;
    const status = action.status;
    const menuOption = action.menuOption || 'Regenerate Interview';
    
    // Check if any candidate has this status
    const statusSelector = `.ant-tag:has-text("${status}")`;
    let isVisible = false;

    try {
      const element = await this.currentFrame.waitForSelector(statusSelector, {
        state: 'visible',
        timeout
      });
      isVisible = element !== null;
    } catch (err) {
      isVisible = false;
    }

    if (!isVisible) {
      // Status not found - continue to next check (don't stop test)
      console.log(`\n  ℹ️  No candidate with "${status}" status found - continuing...`);
      return { wasVisible: false, stopTest: false };
    }

    // Status found - perform the reset
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log(`║  🔄 Found Candidate with "${status}" Status                 ║`.substring(0, 65) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');

    // Collect all logged data entries - two tables: Before and After
    const loggedDataItems: { label: string; value: string }[] = [];

    try {
      // Row selector for the candidate with this status
      const rowSelector = `.ant-table-tbody tr:has(.ant-tag:has-text("${status}"))`;
      
      // Helper function to extract text from a cell by column index
      const extractCellText = async (cellIndex: number): Promise<string> => {
        const selector = `${rowSelector} >> nth=0 >> td:nth-child(${cellIndex})`;
        try {
          const el = await this.currentFrame.waitForSelector(selector, { timeout: 3000 });
          if (el) {
            // Get inner text, excluding nested tags we don't want
            let text = ((await el.textContent()) || '').trim();
            return text;
          }
        } catch (e) {
          // Cell not found
        }
        return '';
      };

      // Helper to extract only the direct text, not from nested .ant-tag
      const extractCellTextExcludingTag = async (cellIndex: number): Promise<string> => {
        const selector = `${rowSelector} >> nth=0 >> td:nth-child(${cellIndex})`;
        try {
          const el = await this.currentFrame.waitForSelector(selector, { timeout: 3000 });
          if (el) {
            // Check if this cell contains an ant-tag
            const hasTag = await el.$('.ant-tag');
            if (hasTag) {
              // Return empty - this is the status column
              return '';
            }
            return ((await el.textContent()) || '').trim();
          }
        } catch (e) {
          // Cell not found
        }
        return '';
      };

      // ========== TABLE 1: Before Regenerate Interview Data ==========
      loggedDataItems.push({ label: '═══ Before Regenerate Interview Data ═══', value: '' });

      // Column mapping based on actual table structure:
      // Col 1: Index/Checkbox, Col 2: Name, Col 3: Match Score, Col 4: Status (.ant-tag)
      // Col 5: City, Col 6: Email, Col 7: Contact, Col 8: Role, Col 9: Expiry, Col 10: Actions

      // Extract candidate name (column 2)
      const candidateName = await extractCellText(2) || 'Unknown';
      loggedDataItems.push({ label: 'Candidate Name', value: candidateName });
      console.log(`║  Candidate Name: ${candidateName.substring(0, 42).padEnd(42)}║`);

      // Extract match score (column 3)
      const matchScore = await extractCellText(3);
      if (matchScore) {
        loggedDataItems.push({ label: 'Match Score', value: matchScore });
        console.log(`║  Match Score: ${matchScore.substring(0, 45).padEnd(45)}║`);
      }

      // Extract status from .ant-tag (column 4 contains the tag)
      const statusTagSelector = `${rowSelector} >> nth=0 >> .ant-tag`;
      let currentStatus = status;
      try {
        const statusEl = await this.currentFrame.waitForSelector(statusTagSelector, { timeout: 3000 });
        if (statusEl) {
          currentStatus = ((await statusEl.textContent()) || '').trim() || status;
        }
      } catch (e) {
        // Use default status
      }
      loggedDataItems.push({ label: 'Status', value: currentStatus });
      console.log(`║  Status: ${currentStatus.padEnd(50)}║`);

      // Extract city/location (column 5) - skip column 4 as it contains status
      const cityLocation = await extractCellTextExcludingTag(5);
      loggedDataItems.push({ label: 'City/Location', value: cityLocation || '' });
      console.log(`║  City/Location: ${(cityLocation || '').substring(0, 43).padEnd(43)}║`);

      // Extract email ID (column 6)
      const emailId = await extractCellText(6);
      if (emailId) {
        loggedDataItems.push({ label: 'Email ID', value: emailId });
        console.log(`║  Email ID: ${emailId.substring(0, 48).padEnd(48)}║`);
      }

      // Extract contact number (column 7)
      const contactNo = await extractCellText(7);
      if (contactNo) {
        loggedDataItems.push({ label: 'Contact No', value: contactNo });
        console.log(`║  Contact No: ${contactNo.substring(0, 46).padEnd(46)}║`);
      }

      // Extract role (column 8)
      const role = await extractCellText(8);
      if (role) {
        loggedDataItems.push({ label: 'Role', value: role });
        console.log(`║  Role: ${role.substring(0, 52).padEnd(52)}║`);
      }

      // Extract expiry date (column 9)
      const expiry = await extractCellText(9);
      if (expiry) {
        loggedDataItems.push({ label: 'Expiry', value: expiry });
        console.log(`║  Expiry: ${expiry.substring(0, 50).padEnd(50)}║`);
      }

      console.log('╠════════════════════════════════════════════════════════════╣');

      // Click the action menu (last td in the row)
      const actionSelector = `${rowSelector} >> nth=0 >> td:last-child`;
      await this.currentFrame.click(actionSelector, { force: true, timeout: 10000 });
      console.log(`║  Action: Clicked action menu                               ║`);

      // Wait a moment for dropdown to appear
      await this.page.waitForTimeout(2000);

      // Click the menu option (Regenerate Interview)
      const menuSelector = `.ant-dropdown-menu-title-content:has-text("${menuOption}")`;
      await this.currentFrame.click(menuSelector, { timeout: 10000 });
      console.log(`║  Action: Clicked "${menuOption}"                    ║`.substring(0, 65) + '║');

      // Wait for the action to complete
      await this.page.waitForTimeout(3000);

      // Try to capture any success message (Ant Design message component)
      let successMessage = '';
      try {
        const messageSelector = '.ant-message-notice-content';
        const messageEl = await this.currentFrame.waitForSelector(messageSelector, { timeout: 5000 });
        if (messageEl) {
          successMessage = ((await messageEl.textContent()) || '').trim();
        }
      } catch (e) {
        // No message found
      }
      
      if (!successMessage) {
        successMessage = 'Interview has been regenerated successfully.';
      }

      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║  ✅ Interview Reset Successfully                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      // Wait for table to refresh
      await this.page.waitForTimeout(2000);

      // ========== TABLE 2: After Regenerate Interview Data ==========
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  📋 After Regenerate Interview Data                         ║');
      console.log('╠════════════════════════════════════════════════════════════╣');

      loggedDataItems.push({ label: '═══ After Regenerate Interview Data ═══', value: '' });

      // Re-read candidate info after regeneration (use candidate name to find the row)
      const updatedRowSelector = `.ant-table-tbody tr:has(td:has-text("${candidateName}"))`;

      // Helper for updated row
      const extractUpdatedCellText = async (cellIndex: number): Promise<string> => {
        const selector = `${updatedRowSelector} >> nth=0 >> td:nth-child(${cellIndex})`;
        try {
          const el = await this.currentFrame.waitForSelector(selector, { timeout: 3000 });
          if (el) {
            return ((await el.textContent()) || '').trim();
          }
        } catch (e) {
          // Cell not found
        }
        return '';
      };

      // Extract updated candidate name
      const updatedName = await extractUpdatedCellText(2) || candidateName;
      loggedDataItems.push({ label: 'Candidate Name', value: updatedName });
      console.log(`║  Candidate Name: ${updatedName.substring(0, 42).padEnd(42)}║`);

      // Extract updated match score
      const updatedMatchScore = await extractUpdatedCellText(3) || matchScore;
      if (updatedMatchScore) {
        loggedDataItems.push({ label: 'Match Score', value: updatedMatchScore });
        console.log(`║  Match Score: ${updatedMatchScore.substring(0, 45).padEnd(45)}║`);
      }

      // Extract updated status
      const updatedStatusSelector = `${updatedRowSelector} >> nth=0 >> .ant-tag`;
      let updatedStatus = '';
      try {
        const statusEl = await this.currentFrame.waitForSelector(updatedStatusSelector, { timeout: 3000 });
        if (statusEl) {
          updatedStatus = ((await statusEl.textContent()) || '').trim();
        }
      } catch (e) {
        updatedStatus = 'Interview Eligible';
      }
      loggedDataItems.push({ label: 'Status', value: updatedStatus || 'Interview Eligible' });
      console.log(`║  Status: ${(updatedStatus || 'Interview Eligible').padEnd(50)}║`);

      // City/Location
      const updatedCity = await extractUpdatedCellText(5) || cityLocation;
      loggedDataItems.push({ label: 'City/Location', value: updatedCity || '' });
      console.log(`║  City/Location: ${(updatedCity || '').substring(0, 43).padEnd(43)}║`);

      // Email (column 6)
      const updatedEmail = await extractUpdatedCellText(6) || emailId;
      if (updatedEmail) {
        loggedDataItems.push({ label: 'Email ID', value: updatedEmail });
        console.log(`║  Email ID: ${updatedEmail.substring(0, 48).padEnd(48)}║`);
      }

      // Contact (column 7)
      const updatedContact = await extractUpdatedCellText(7) || contactNo;
      if (updatedContact) {
        loggedDataItems.push({ label: 'Contact No', value: updatedContact });
        console.log(`║  Contact No: ${updatedContact.substring(0, 46).padEnd(46)}║`);
      }

      // Role (column 8)
      const updatedRole = await extractUpdatedCellText(8) || role;
      if (updatedRole) {
        loggedDataItems.push({ label: 'Role', value: updatedRole });
        console.log(`║  Role: ${updatedRole.substring(0, 52).padEnd(52)}║`);
      }

      // Expiry (column 9)
      const updatedExpiry = await extractUpdatedCellText(9) || expiry;
      if (updatedExpiry) {
        loggedDataItems.push({ label: 'Expiry', value: updatedExpiry });
        console.log(`║  Expiry: ${updatedExpiry.substring(0, 50).padEnd(50)}║`);
      }

      // Add the regenerate message
      loggedDataItems.push({ label: 'Regenerate Interview Message', value: successMessage });
      console.log(`║  Message: ${successMessage.substring(0, 49).padEnd(49)}║`);

      console.log('╚════════════════════════════════════════════════════════════╝\n');

      // Return with stopTest: true to end test gracefully as passed
      return {
        loggedData: loggedDataItems,
        stopTest: true,
        wasVisible: true
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`║  ❌ Error: ${errorMsg.substring(0, 48).padEnd(48)}║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      throw error;
    }
  }

  /**
   * Select a date in an Ant Design date picker
   * Handles the date picker dropdown navigation and day selection
   * @param action SelectDateAction with date in DD-MMM-YYYY format
   */
  async selectDate(action: SelectDateAction): Promise<void> {
    const { date, timeout = 30000 } = action;
    
    // Parse the date (format: DD-MMM-YYYY e.g., "13-Mar-2026")
    const dateMatch = date.match(/(\d{2})-(\w{3})-(\d{4})/);
    if (!dateMatch) {
      throw new Error(`Invalid date format: ${date}. Expected DD-MMM-YYYY (e.g., 13-Mar-2026)`);
    }
    
    const [, dayStr, monthName, yearStr] = dateMatch;
    const targetDay = parseInt(dayStr, 10);
    const targetYear = parseInt(yearStr, 10);
    
    // Map month name to month number (case-insensitive)
    const monthMapLower: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const targetMonth = monthMapLower[monthName.toLowerCase()];
    if (targetMonth === undefined) {
      throw new Error(`Invalid month name: ${monthName}`);
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    console.log(`\n📅 Selecting date: ${date} (Day: ${targetDay}, Month: ${monthNames[targetMonth]}, Year: ${targetYear})`);
    
    // First, try to open the date picker by clicking on it
    console.log('  🔍 Looking for picker input to open...');
    const pickerSelectors = [
      '.ant-modal .ant-picker',
      '.ant-modal .ant-picker-input',
      '.ant-modal .ant-picker-input input',
      '.ant-modal input[readonly]',
      '.ant-picker',
      '.ant-picker-input'
    ];
    
    let pickerOpened = false;
    for (const sel of pickerSelectors) {
      try {
        const element = this.page.locator(sel).first();
        const exists = await element.count() > 0;
        if (exists) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`  Clicking on ${sel} to open picker...`);
            await element.click({ force: true });
            await this.page.waitForTimeout(700);
            pickerOpened = true;
            break;
          }
        }
      } catch {
        // Try next
      }
    }
    
    if (!pickerOpened) {
      console.log('  ⚠ Could not find picker input to click');
    }
    
    // Wait for the date picker panel to be visible
    await this.page.waitForTimeout(500);
    
    // Debug: Get the structure of all picker dropdowns and any picker-related elements
    const debugPickerStructure = async (): Promise<void> => {
      const structure = await this.page.evaluate(() => {
        const results: string[] = [];
        
        // Check for any dropdown elements
        const dropdowns = document.querySelectorAll('.ant-picker-dropdown');
        results.push(`Found ${dropdowns.length} .ant-picker-dropdown element(s)`);
        dropdowns.forEach((dd, i) => {
          const hidden = dd.classList.contains('ant-picker-dropdown-hidden');
          const display = window.getComputedStyle(dd).display;
          const visibility = window.getComputedStyle(dd).visibility;
          const opacity = window.getComputedStyle(dd).opacity;
          const monthBtn = dd.querySelector('.ant-picker-month-btn');
          const yearBtn = dd.querySelector('.ant-picker-year-btn');
          const cells = dd.querySelectorAll('.ant-picker-cell');
          results.push(`  Dropdown ${i}: hidden=${hidden}, display=${display}, visibility=${visibility}, opacity=${opacity}, month=${monthBtn?.textContent}, year=${yearBtn?.textContent}, cells=${cells.length}`);
        });
        
        // Check for popup/panel containers
        const popups = document.querySelectorAll('.ant-picker-panel, .ant-picker-panel-container, [class*="picker-panel"]');
        if (popups.length > 0) {
          results.push(`Found ${popups.length} picker panel element(s)`);
          popups.forEach((p, i) => {
            results.push(`  Panel ${i}: class="${p.className}", visible=${window.getComputedStyle(p).display !== 'none'}`);
          });
        }
        
        // Check for any open dropdown via placement class
        const placementDropdowns = document.querySelectorAll('[class*="ant-picker-dropdown-placement"]');
        if (placementDropdowns.length > 0) {
          results.push(`Found ${placementDropdowns.length} placement dropdown(s)`);
        }
        
        // Check for date cells directly (maybe in different container)
        const dateCells = document.querySelectorAll('.ant-picker-cell, [class*="picker-cell"]');
        if (dateCells.length > 0) {
          results.push(`Found ${dateCells.length} date cell element(s) on page`);
        }
        
        // Check the modal for any picker content
        const modal = document.querySelector('.ant-modal');
        if (modal) {
          const modalPickers = modal.querySelectorAll('.ant-picker, [class*="picker"]');
          results.push(`Modal has ${modalPickers.length} picker-related element(s)`);
        }
        
        return results;
      });
      structure.forEach(s => console.log(`  🔍 ${s}`));
    };
    
    // Debug the structure
    console.log('  🔍 Debugging picker dropdowns...');
    await debugPickerStructure();
    
    // Helper function to select month from dropdown
    const selectMonthFromDropdown = async (targetMonth: number): Promise<boolean> => {
      // Look for month selector (ant-select with month options)
      const monthSelectors = [
        '.ant-modal .ant-picker-panel .ant-select:first-of-type',
        '.ant-modal .ant-select-selector:has(.ant-select-selection-item[title*="Jan"], .ant-select-selection-item[title*="Feb"], .ant-select-selection-item[title*="Mar"])',
        '.ant-modal .ant-select',
      ];
      
      // First try to find the month selector by checking current value
      const allSelects = this.page.locator('.ant-modal .ant-picker-panel .ant-select, .ant-modal .ant-select');
      const selectCount = await allSelects.count();
      console.log(`  🔍 Found ${selectCount} ant-select element(s) in modal`);
      
      for (let i = 0; i < selectCount; i++) {
        const select = allSelects.nth(i);
        const selectionItem = select.locator('.ant-select-selection-item');
        const title = await selectionItem.getAttribute('title').catch(() => '');
        const text = await selectionItem.textContent().catch(() => '');
        console.log(`  🔍   Select ${i}: title="${title}", text="${text}"`);
        
        // Check if this is the month selector
        const isMonthSelector = monthNames.some(m => 
          title?.toLowerCase().includes(m.toLowerCase()) || 
          text?.toLowerCase().includes(m.toLowerCase())
        );
        
        if (isMonthSelector) {
          console.log(`  📅 Found month selector at index ${i}, current: ${title || text}`);
          
          // Click to open the dropdown
          await select.click({ force: true });
          await this.page.waitForTimeout(300);
          
          // Find and click the target month option
          const targetMonthName = monthNames[targetMonth];
          const optionSelectors = [
            `.ant-select-dropdown .ant-select-item-option[title="${targetMonthName}"]`,
            `.ant-select-dropdown .ant-select-item:has-text("${targetMonthName}")`,
            `.ant-select-dropdown [data-value="${targetMonth}"]`,
          ];
          
          for (const optSel of optionSelectors) {
            const option = this.page.locator(optSel).first();
            if (await option.isVisible().catch(() => false)) {
              console.log(`  ✓ Clicking month option: ${targetMonthName}`);
              await option.click();
              await this.page.waitForTimeout(300);
              return true;
            }
          }
          
          // Try clicking by text content search
          const allOptions = this.page.locator('.ant-select-dropdown .ant-select-item-option');
          const optCount = await allOptions.count();
          for (let j = 0; j < optCount; j++) {
            const opt = allOptions.nth(j);
            const optText = await opt.textContent().catch(() => '');
            if (optText?.toLowerCase().includes(targetMonthName.toLowerCase())) {
              console.log(`  ✓ Clicking month option by text: ${optText}`);
              await opt.click();
              await this.page.waitForTimeout(300);
              return true;
            }
          }
          
          // Close dropdown if we couldn't find the option
          await this.page.keyboard.press('Escape');
        }
      }
      return false;
    };
    
    // Helper function to select year from dropdown
    const selectYearFromDropdown = async (targetYear: number): Promise<boolean> => {
      const allSelects = this.page.locator('.ant-modal .ant-picker-panel .ant-select, .ant-modal .ant-select');
      const selectCount = await allSelects.count();
      
      for (let i = 0; i < selectCount; i++) {
        const select = allSelects.nth(i);
        const selectionItem = select.locator('.ant-select-selection-item');
        const title = await selectionItem.getAttribute('title').catch(() => '');
        const text = await selectionItem.textContent().catch(() => '');
        
        // Check if this is the year selector (contains a 4-digit year)
        const yearMatch = (title || text || '').match(/20\d{2}/);
        const isYearSelector = yearMatch !== null;
        
        if (isYearSelector) {
          const currentYear = parseInt(yearMatch![0], 10);
          if (currentYear === targetYear) {
            console.log(`  📅 Year selector already shows ${targetYear}`);
            return true;
          }
          
          console.log(`  📅 Found year selector at index ${i}, current: ${currentYear}, target: ${targetYear}`);
          
          // Click to open the dropdown
          await select.click({ force: true });
          await this.page.waitForTimeout(300);
          
          // Find and click the target year option
          const optionSelectors = [
            `.ant-select-dropdown .ant-select-item-option[title="${targetYear}"]`,
            `.ant-select-dropdown .ant-select-item:has-text("${targetYear}")`,
          ];
          
          for (const optSel of optionSelectors) {
            const option = this.page.locator(optSel).first();
            if (await option.isVisible().catch(() => false)) {
              console.log(`  ✓ Clicking year option: ${targetYear}`);
              await option.click();
              await this.page.waitForTimeout(300);
              return true;
            }
          }
          
          // Try clicking by text content search
          const allOptions = this.page.locator('.ant-select-dropdown .ant-select-item-option');
          const optCount = await allOptions.count();
          for (let j = 0; j < optCount; j++) {
            const opt = allOptions.nth(j);
            const optText = await opt.textContent().catch(() => '');
            if (optText?.trim() === String(targetYear)) {
              console.log(`  ✓ Clicking year option by text: ${optText}`);
              await opt.click();
              await this.page.waitForTimeout(300);
              return true;
            }
          }
          
          // Close dropdown if we couldn't find the option
          await this.page.keyboard.press('Escape');
        }
      }
      return false;
    };

    // Use Playwright locator to find visible picker dropdown or inline panel
    const getPickerInfo = async (): Promise<{ currentMonth: number; currentYear: number; found: boolean }> => {
      // Try multiple strategies to find the picker - including inline panels
      const strategies = [
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)',
        '.ant-picker-dropdown',
        '.ant-picker-panel-container',
        '.ant-modal .ant-picker-panel',  // Inline picker in modal
        '.ant-picker-panel'               // Any picker panel
      ];
      
      for (const strategy of strategies) {
        const dropdowns = this.page.locator(strategy);
        const count = await dropdowns.count();
        
        if (count === 0) continue;
        
        console.log(`  Found ${count} element(s) with "${strategy}"`);
      
        for (let i = 0; i < count; i++) {
          const dropdown = dropdowns.nth(i);
          const isVisible = await dropdown.isVisible().catch(() => false);
          
          if (!isVisible) {
            console.log(`    Element ${i}: not visible, skipping`);
            continue;
          }
          
          console.log(`    Element ${i}: visible, checking for month/year...`);
        
          // Get month/year from buttons
          const monthBtn = dropdown.locator('.ant-picker-month-btn').first();
          const yearBtn = dropdown.locator('.ant-picker-year-btn').first();
          
          try {
            const monthText = await monthBtn.textContent({ timeout: 1000 });
            const yearText = await yearBtn.textContent({ timeout: 1000 });
            
            console.log(`    Element ${i}: monthText="${monthText}", yearText="${yearText}"`);
            
            if (monthText && yearText) {
              const monthLower = monthText.trim().toLowerCase();
              const year = parseInt(yearText.trim(), 10);
              
              const month = monthMapLower[monthLower];
              if (month !== undefined && year > 0) {
                return { currentMonth: month, currentYear: year, found: true };
              }
            }
          } catch (e) {
            // Try alternative: Look for header content directly
            console.log(`    Element ${i}: Could not get month/year buttons, trying header...`);
            try {
              const header = dropdown.locator('.ant-picker-header-view').first();
              const headerText = await header.textContent({ timeout: 1000 });
              console.log(`    Header text: "${headerText}"`);
              // Try to parse header like "Feb 2026" or "February 2026"
              if (headerText) {
                const parts = headerText.trim().split(/\s+/);
                if (parts.length >= 2) {
                  const monthLower = parts[0].substring(0, 3).toLowerCase();
                  const year = parseInt(parts[parts.length - 1], 10);
                  const month = monthMapLower[monthLower];
                  if (month !== undefined && year > 0) {
                    return { currentMonth: month, currentYear: year, found: true };
                  }
                }
              }
            } catch {
              // Continue
            }
          }
        }
      }
      
      console.log('  No visible picker panel found with any strategy');
      return { currentMonth: -1, currentYear: -1, found: false };
    };
    
    // Selector patterns to find the visible picker (dropdown or inline)
    const pickerContainerSelectors = [
      '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)',
      '.ant-modal .ant-picker-panel',
      '.ant-picker-panel'
    ];
    
    // Function to find the visible picker container
    const getVisiblePickerSelector = async (): Promise<string | null> => {
      for (const sel of pickerContainerSelectors) {
        const el = this.page.locator(sel).first();
        const visible = await el.isVisible().catch(() => false);
        if (visible) return sel;
      }
      return null;
    };
    
    // Function to click next month button
    const clickNextMonth = async (): Promise<boolean> => {
      // Try multiple container selectors for the next button
      const selectors = [
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) button.ant-picker-header-next-btn',
        '.ant-modal .ant-picker-panel button.ant-picker-header-next-btn',
        '.ant-picker-panel button.ant-picker-header-next-btn',
        'button.ant-picker-header-next-btn',
        '.ant-modal button.ant-picker-header-next-btn', // Modal without .ant-picker-panel
        '.ant-picker-header button:nth-child(3)', // Third button in header (often next month)
        '.ant-modal .ant-picker-header button:last-child', // Last button in header
        '[class*="ant-picker"][class*="next"]', // Any element with ant-picker and next in class
      ];
      
      for (const sel of selectors) {
        const nextBtn = this.page.locator(sel).first();
        try {
          const count = await nextBtn.count();
          const visible = count > 0 && await nextBtn.isVisible().catch(() => false);
          if (visible) {
            console.log(`  Clicking next month button: ${sel}`);
            await nextBtn.click({ force: true });
            return true;
          }
        } catch {
          // Try next selector
        }
      }
      
      // Fallback: try by icon/span
      const iconSelectors = [
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) span.ant-picker-next-icon',
        '.ant-modal .ant-picker-panel span.ant-picker-next-icon',
        '.ant-modal span.ant-picker-next-icon',
        'span.ant-picker-next-icon',
        '.ant-modal [class*="next-icon"]',
        '.ant-modal svg[class*="next"]',
      ];
      
      for (const sel of iconSelectors) {
        const nextIcon = this.page.locator(sel).first();
        try {
          const count = await nextIcon.count();
          const visible = count > 0 && await nextIcon.isVisible().catch(() => false);
          if (visible) {
            // Click the parent button
            const parentBtn = nextIcon.locator('xpath=ancestor::button').first();
            if (await parentBtn.isVisible().catch(() => false)) {
              console.log(`  Clicking next month icon parent: ${sel}`);
              await parentBtn.click({ force: true });
              return true;
            }
            // Or just click the icon itself
            console.log(`  Clicking next month icon: ${sel}`);
            await nextIcon.click({ force: true });
            return true;
          }
        } catch {
          // Continue
        }
      }
      
      // Debug: print all buttons found in modal
      console.log('  🔍 Debug: Looking for any navigation buttons in modal...');
      const allModalButtons = this.page.locator('.ant-modal button');
      const btnCount = await allModalButtons.count();
      console.log(`  🔍 Found ${btnCount} button(s) in modal`);
      for (let i = 0; i < Math.min(btnCount, 10); i++) {
        const btn = allModalButtons.nth(i);
        const className = await btn.getAttribute('class').catch(() => '');
        const visible = await btn.isVisible().catch(() => false);
        console.log(`  🔍   Button ${i}: class="${className}", visible=${visible}`);
      }
      
      // Also look for any ant-picker-header elements
      const headerEls = this.page.locator('.ant-modal .ant-picker-header, .ant-picker-header');
      const headerCount = await headerEls.count();
      console.log(`  🔍 Found ${headerCount} picker header(s)`);
      for (let i = 0; i < Math.min(headerCount, 3); i++) {
        const hdr = headerEls.nth(i);
        const html = await hdr.innerHTML().catch(() => '');
        console.log(`  🔍   Header ${i} innerHTML (first 300 chars): ${html.slice(0, 300)}`);
      }
      
      return false;
    };
    
    // Function to click prev month button
    const clickPrevMonth = async (): Promise<boolean> => {
      // Try multiple container selectors for the prev button
      const selectors = [
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) button.ant-picker-header-prev-btn',
        '.ant-modal .ant-picker-panel button.ant-picker-header-prev-btn',
        '.ant-picker-panel button.ant-picker-header-prev-btn',
        'button.ant-picker-header-prev-btn'
      ];
      
      for (const sel of selectors) {
        const prevBtn = this.page.locator(sel).first();
        try {
          const visible = await prevBtn.isVisible().catch(() => false);
          if (visible) {
            console.log(`  Clicking prev month button: ${sel}`);
            await prevBtn.click({ force: true });
            return true;
          }
        } catch {
          // Try next selector
        }
      }
      
      // Fallback: try by icon/span
      const iconSelectors = [
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) span.ant-picker-prev-icon',
        '.ant-modal .ant-picker-panel span.ant-picker-prev-icon',
        'span.ant-picker-prev-icon'
      ];
      
      for (const sel of iconSelectors) {
        const prevIcon = this.page.locator(sel).first();
        try {
          const visible = await prevIcon.isVisible().catch(() => false);
          if (visible) {
            const parentBtn = prevIcon.locator('xpath=ancestor::button').first();
            if (await parentBtn.isVisible().catch(() => false)) {
              console.log(`  Clicking prev month icon parent: ${sel}`);
              await parentBtn.click({ force: true });
              return true;
            }
            console.log(`  Clicking prev month icon: ${sel}`);
            await prevIcon.click({ force: true });
            return true;
          }
        } catch {
          // Continue
        }
      }
      
      return false;
    };
    
    // Get initial picker info
    let info = await getPickerInfo();
    
    if (!info.found) {
      // Try to open the picker by clicking on the input
      console.log('⚠ Date picker not fully visible, trying to re-open it...');
      const pickerSelectors = ['.ant-modal .ant-picker', '.ant-picker-input input', '.ant-picker'];
      for (const sel of pickerSelectors) {
        try {
          await this.page.click(sel, { force: true, timeout: 2000 });
          await this.page.waitForTimeout(700);
          console.log('  Clicked picker, waiting for dropdown...');
          await debugPickerStructure();
          info = await getPickerInfo();
          if (info.found) break;
        } catch {
          // Try next
        }
      }
    }
    
    // If we couldn't detect month/year, try an alternative approach for inline pickers
    // Based on the target date, calculate how many months to navigate forward from current position
    let blindNavigationMonths = 0;
    let useBlindNavigation = false;
    
    if (!info.found) {
      console.log('⚠ Could not determine current month/year from picker');
      
      // First, try using dropdown selectors (ant-select) for month/year
      console.log('  🔄 Trying dropdown-based month/year selection...');
      
      // Try to select the year first
      const yearSelected = await selectYearFromDropdown(targetYear);
      if (yearSelected) {
        console.log(`  ✓ Year ${targetYear} selected via dropdown`);
      }
      
      // Then try to select the month
      const monthSelected = await selectMonthFromDropdown(targetMonth);
      if (monthSelected) {
        console.log(`  ✓ Month ${monthNames[targetMonth]} selected via dropdown`);
        // If we successfully selected month, we can skip blind navigation
        useBlindNavigation = false;
      }
      
      // If dropdowns didn't work, fall back to blind navigation
      if (!yearSelected && !monthSelected) {
        // For inline pickers, try to figure out the current month from the cells themselves
        // The picker likely shows the current date's month, but for "extend expiry" scenarios,
        // it might show the current expiry date. We'll navigate forward blindly based on target.
        
        // Calculate months from today to target as a baseline
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthsDiff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
        
        if (monthsDiff > 0) {
          console.log(`  Will try blind navigation: ${monthsDiff} month(s) forward from today's date`);
          blindNavigationMonths = monthsDiff;
          useBlindNavigation = true;
        } else {
          console.log(`  Target month appears to be current or past - will try clicking day directly`);
        }
      }
    } else {
      console.log(`  Current calendar: ${monthNames[info.currentMonth]} ${info.currentYear}`);
    }
    
    // Navigate to the correct month/year
    let maxIterations = 24;
    
    if (useBlindNavigation) {
      // Blind navigation - just click next month the required number of times
      console.log(`  🔄 Attempting blind navigation...`);
      
      // First, try to focus on the picker panel
      const panelSelectors = [
        '.ant-modal .ant-picker-panel',
        '.ant-picker-panel',
        '.ant-modal .ant-picker-content',
        '.ant-picker-content'
      ];
      
      let panelFocused = false;
      for (const sel of panelSelectors) {
        try {
          const panel = this.page.locator(sel).first();
          if (await panel.isVisible().catch(() => false)) {
            await panel.focus().catch(() => {});
            panelFocused = true;
            console.log(`  Focused on panel: ${sel}`);
            break;
          }
        } catch {
          // Try next
        }
      }
      
      let blindSuccess = false;
      for (let i = 0; i < blindNavigationMonths && maxIterations > 0; i++) {
        console.log(`  → Blind navigation: clicking next month (${i + 1}/${blindNavigationMonths})...`);
        const clicked = await clickNextMonth();
        if (!clicked) {
          console.log(`  ⚠ Button click failed, trying keyboard navigation (PageDown)...`);
          // Try keyboard navigation as fallback
          try {
            await this.page.keyboard.press('PageDown');
            await this.page.waitForTimeout(300);
            console.log(`  ✓ Pressed PageDown for keyboard navigation`);
            blindSuccess = true;
          } catch (e) {
            console.log(`  ⚠ Keyboard navigation also failed on attempt ${i + 1}`);
            break;
          }
        } else {
          blindSuccess = true;
        }
        await this.page.waitForTimeout(400);
        maxIterations--;
      }
      
      if (!blindSuccess && blindNavigationMonths > 0) {
        console.log(`  ⚠ Blind navigation failed - will try clicking directly on a date cell`);
        // The picker might be showing a range or all months - try to click directly
      }
    } else if (info.found) {
      // Normal navigation with month detection
      while (maxIterations > 0) {
        // Check if we're at the target month/year
        if (info.currentYear === targetYear && info.currentMonth === targetMonth) {
          console.log(`✓ At correct month: ${monthNames[targetMonth]} ${targetYear}`);
          break;
        }
        
        // Calculate how many months to move
        const currentTotal = info.currentYear * 12 + info.currentMonth;
        const targetTotal = targetYear * 12 + targetMonth;
        const diff = targetTotal - currentTotal;
        
        if (diff > 0) {
          // Need to go forward
          console.log(`  → Navigating forward (${diff} month(s) to go)...`);
          const clicked = await clickNextMonth();
          if (!clicked) {
            console.log('⚠ Failed to click next month button');
            break;
          }
        } else if (diff < 0) {
          // Need to go backward
          console.log(`  ← Navigating backward (${-diff} month(s) to go)...`);
          const clicked = await clickPrevMonth();
          if (!clicked) {
            console.log('⚠ Failed to click prev month button');
            break;
          }
        } else {
          break; // Already at correct month
        }
        
        await this.page.waitForTimeout(300);
        info = await getPickerInfo();
        
        if (info.found) {
          console.log(`  Now at: ${monthNames[info.currentMonth]} ${info.currentYear}`);
        } else {
          console.log('⚠ Lost picker info after navigation');
          break;
        }
        
        maxIterations--;
      }
    }
    
    // Final verification
    const finalInfo = await getPickerInfo();
    if (finalInfo.found && (finalInfo.currentMonth !== targetMonth || finalInfo.currentYear !== targetYear)) {
      console.log(`⚠ Warning: Still at ${monthNames[finalInfo.currentMonth]} ${finalInfo.currentYear}, expected ${monthNames[targetMonth]} ${targetYear}`);
    }
    
    // Wait a moment for the calendar to update
    await this.page.waitForTimeout(300);
    
    // Now click on the target day using multiple selector strategies
    let dayClicked = false;
    
    // Day cell selectors - try dropdown first, then inline panel
    const dayCellSelectors = [
      `.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td.ant-picker-cell-in-view .ant-picker-cell-inner:text-is("${targetDay}")`,
      `.ant-modal .ant-picker-panel td.ant-picker-cell-in-view .ant-picker-cell-inner:text-is("${targetDay}")`,
      `.ant-picker-panel td.ant-picker-cell-in-view .ant-picker-cell-inner:text-is("${targetDay}")`,
      `td.ant-picker-cell-in-view .ant-picker-cell-inner:text-is("${targetDay}")`
    ];
    
    for (const sel of dayCellSelectors) {
      if (dayClicked) break;
      const dayCell = this.page.locator(sel).first();
      try {
        const isVisible = await dayCell.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`  Found day cell with: ${sel.substring(0, 60)}...`);
          await dayCell.click();
          dayClicked = true;
        }
      } catch {
        // Try next selector
      }
    }
    
    if (!dayClicked) {
      // Try finding cell by date attribute (format: YYYY-MM-DD)
      const fullDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
      console.log(`  Trying to find cell by date attribute: ${fullDateStr}`);
      
      const dateAttrSelectors = [
        `.ant-modal td.ant-picker-cell[title="${fullDateStr}"] .ant-picker-cell-inner`,
        `.ant-modal td[data-date="${fullDateStr}"] .ant-picker-cell-inner`,
        `td.ant-picker-cell[title="${fullDateStr}"] .ant-picker-cell-inner`,
        `td[data-date="${fullDateStr}"] .ant-picker-cell-inner`,
        `.ant-modal .ant-picker-cell[title="${fullDateStr}"]`,
        `.ant-picker-cell[title="${fullDateStr}"]`,
      ];
      
      for (const sel of dateAttrSelectors) {
        if (dayClicked) break;
        const cell = this.page.locator(sel).first();
        try {
          const count = await cell.count();
          if (count > 0 && await cell.isVisible().catch(() => false)) {
            console.log(`  Found cell by date attribute: ${sel.substring(0, 60)}...`);
            await cell.click({ force: true });
            dayClicked = true;
          }
        } catch {
          // Try next
        }
      }
    }
    
    if (!dayClicked) {
      // Fallback: try finding all cells and clicking the right one
      console.log('  Trying fallback: searching all date cells...');
      const cellContainers = [
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td.ant-picker-cell-in-view .ant-picker-cell-inner',
        '.ant-modal .ant-picker-panel td.ant-picker-cell-in-view .ant-picker-cell-inner',
        '.ant-picker-panel td.ant-picker-cell-in-view .ant-picker-cell-inner',
        'td.ant-picker-cell-in-view .ant-picker-cell-inner'
      ];
      
      for (const containerSel of cellContainers) {
        if (dayClicked) break;
        const cells = this.page.locator(containerSel);
        const count = await cells.count();
        console.log(`  Checking ${count} cells with: ${containerSel.substring(0, 50)}...`);
        
        for (let i = 0; i < count; i++) {
          const cell = cells.nth(i);
          const text = await cell.textContent();
          if (text?.trim() === String(targetDay)) {
            console.log(`  Found day ${targetDay} at cell ${i}`);
            await cell.click();
            dayClicked = true;
            break;
          }
        }
      }
    }
    
    // Last resort: try clicking on out-of-view cells or using JavaScript
    if (!dayClicked) {
      console.log('  ⚠ Could not find in-view day cell, trying out-of-view cells...');
      
      // Try clicking on out-of-view cells (cells from prev/next month)
      const allCellsSelector = '.ant-modal .ant-picker-panel td.ant-picker-cell .ant-picker-cell-inner';
      const allCells = this.page.locator(allCellsSelector);
      const allCellsCount = await allCells.count();
      console.log(`  Found ${allCellsCount} total date cells (including out-of-view)`);
      
      for (let i = 0; i < allCellsCount; i++) {
        const cell = allCells.nth(i);
        const text = await cell.textContent().catch(() => '');
        const parent = this.page.locator(`${allCellsSelector}`).nth(i).locator('..');
        const cellTitle = await parent.getAttribute('title').catch(() => '');
        
        // Check if this cell has the target date in title attribute
        const targetDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
        if (cellTitle === targetDateStr) {
          console.log(`  ✓ Found cell with title="${cellTitle}" at index ${i}`);
          await cell.click({ force: true });
          dayClicked = true;
          break;
        }
        
        // Also check by text content in case it's day 30 in March
        if (text?.trim() === String(targetDay)) {
          const cellClass = await parent.getAttribute('class').catch(() => '');
          // Skip cells from previous month (usually have different styling)
          if (!cellClass?.includes('ant-picker-cell-disabled')) {
            console.log(`  Found day ${targetDay} at cell ${i}, class: ${cellClass?.substring(0, 50)}...`);
            // Don't click yet, just note it for later
          }
        }
      }
      
      // If still not clicked, try using JavaScript to set the date directly
      if (!dayClicked) {
        console.log('  ⚠ Trying JavaScript to set date value directly...');
        
        // Try different date formats for JavaScript approach
        const dateFormats = [
          date, // Original format: DD-MMM-YYYY
          `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`, // YYYY-MM-DD
          `${String(targetDay).padStart(2, '0')}-${String(targetMonth + 1).padStart(2, '0')}-${targetYear}`, // DD-MM-YYYY
        ];
        
        for (const dateFormat of dateFormats) {
          if (dayClicked) break;
          console.log(`  Trying JS with format: ${dateFormat}`);
          
          try {
            // Use page.evaluate to set the value directly and trigger React updates
            const result = await this.page.evaluate((dateVal: string) => {
              const input = document.querySelector('.ant-modal .ant-picker-input input') as HTMLInputElement;
              if (input) {
                // Remove readonly temporarily
                const wasReadonly = input.readOnly;
                input.readOnly = false;
                
                // Set the value
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(input, dateVal);
                } else {
                  input.value = dateVal;
                }
                
                // Trigger React events
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                
                // Restore readonly
                input.readOnly = wasReadonly;
                
                return input.value;
              }
              return null;
            }, dateFormat);
            
            if (result) {
              console.log(`  ✓ Date set via JavaScript: ${result}`);
              dayClicked = true;
              await this.page.waitForTimeout(500);
              break;
            }
          } catch (e) {
            console.log(`  JS approach failed: ${e}`);
          }
        }
      }
    }
    
    if (!dayClicked) {
      throw new Error(`Could not find day ${targetDay} in the date picker`);
    }
    
    console.log(`✓ Clicked on day ${targetDay}`);
    
    // Wait for the date to be applied
    await this.page.waitForTimeout(500);
    
    console.log(`✓ Date selected: ${date}\n`);
  }
}
