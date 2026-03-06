/**
 * Action Types
 * Defines the structure for automation actions read from files
 */

export enum ActionType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  SELECT = 'select',
  WAIT = 'wait',
  WAIT_FOR_SELECTOR = 'waitForSelector',
  WAIT_FOR_NAVIGATION = 'waitForNavigation',
  SCREENSHOT = 'screenshot',
  SCROLL = 'scroll',
  HOVER = 'hover',
  PRESS_KEY = 'pressKey',
  CLEAR = 'clear',
  ASSERT_TEXT = 'assertText',
  ASSERT_VISIBLE = 'assertVisible',
  ASSERT_URL = 'assertUrl',
  EXECUTE_SCRIPT = 'executeScript',
  UPLOAD_FILE = 'uploadFile',
  DOWNLOAD_FILE = 'downloadFile',
  SWITCH_FRAME = 'switchFrame',
  SWITCH_TAB = 'switchTab',
  CLOSE_TAB = 'closeTab',
  ACCEPT_DIALOG = 'acceptDialog',
  DISMISS_DIALOG = 'dismissDialog',
  SET_COOKIE = 'setCookie',
  CLEAR_COOKIES = 'clearCookies',
  LOG_TEXT = 'logText',
  SELECT_DATE = 'selectDate',
  CHECK_VISIBLE_OR_LOG = 'checkVisibleOrLog',
  RESET_CANDIDATE_BY_STATUS = 'resetCandidateByStatus',
  CUSTOM = 'custom'
}

export interface BaseAction {
  id: string;
  type: ActionType;
  description: string;
  timeout?: number;
  retryCount?: number;
  continueOnFailure?: boolean;
  screenshotBefore?: boolean;
  screenshotAfter?: boolean;
}

export interface NavigateAction extends BaseAction {
  type: ActionType.NAVIGATE;
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface ClickAction extends BaseAction {
  type: ActionType.CLICK;
  selector: string;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  force?: boolean; // Bypass the actionability checks (e.g., overlay interception)
}

export interface TypeAction extends BaseAction {
  type: ActionType.TYPE;
  selector: string;
  text: string;
  credentialKey?: string; // Reference to credential for sensitive data
  delay?: number;
  clearFirst?: boolean;
}

export interface SelectAction extends BaseAction {
  type: ActionType.SELECT;
  selector: string;
  value?: string;
  label?: string;
  index?: number;
}

export interface WaitAction extends BaseAction {
  type: ActionType.WAIT;
  duration: number;
}

export interface WaitForSelectorAction extends BaseAction {
  type: ActionType.WAIT_FOR_SELECTOR;
  selector: string;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

export interface WaitForNavigationAction extends BaseAction {
  type: ActionType.WAIT_FOR_NAVIGATION;
  url?: string | RegExp;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface ScreenshotAction extends BaseAction {
  type: ActionType.SCREENSHOT;
  name: string;
  fullPage?: boolean;
  selector?: string;
}

export interface ScrollAction extends BaseAction {
  type: ActionType.SCROLL;
  selector?: string;
  x?: number;
  y?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface HoverAction extends BaseAction {
  type: ActionType.HOVER;
  selector: string;
}

export interface PressKeyAction extends BaseAction {
  type: ActionType.PRESS_KEY;
  key: string;
  modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[];
}

export interface AssertTextAction extends BaseAction {
  type: ActionType.ASSERT_TEXT;
  selector: string;
  expectedText: string;
  matchType?: 'exact' | 'contains' | 'regex';
}

export interface AssertVisibleAction extends BaseAction {
  type: ActionType.ASSERT_VISIBLE;
  selector: string;
  visible: boolean;
}

export interface AssertUrlAction extends BaseAction {
  type: ActionType.ASSERT_URL;
  expectedUrl: string;
  matchType?: 'exact' | 'contains' | 'regex';
}

export interface ExecuteScriptAction extends BaseAction {
  type: ActionType.EXECUTE_SCRIPT;
  script: string;
  args?: unknown[];
}

export interface UploadFileAction extends BaseAction {
  type: ActionType.UPLOAD_FILE;
  selector: string;
  filePath: string;
}

export interface SwitchFrameAction extends BaseAction {
  type: ActionType.SWITCH_FRAME;
  frameSelector?: string;
  frameIndex?: number;
  frameName?: string;
}

export interface CustomAction extends BaseAction {
  type: ActionType.CUSTOM;
  handler: string;
  params?: Record<string, unknown>;
}

export interface LogTextAction extends BaseAction {
  type: ActionType.LOG_TEXT;
  selector: string;
  label?: string; // Label to display with the text (e.g., "Match Score", "Status")
}

export interface SelectDateAction extends BaseAction {
  type: ActionType.SELECT_DATE;
  date: string; // Date in DD-MMM-YYYY format (e.g., "13-Mar-2026")
  pickerSelector?: string; // Optional custom date picker selector
}

export interface CheckVisibleOrLogAction extends BaseAction {
  type: ActionType.CHECK_VISIBLE_OR_LOG;
  selector: string; // Selector to check visibility
  fallbackMessage: string; // Message to log if selector is not visible
  clickIfVisible?: boolean; // If true, click on the selector if visible
  clickSelector?: string; // Optional: different selector to click (if different from check selector)
  stopTestIfNotVisible?: boolean; // If true, stop test execution (gracefully) if not visible
}

export interface ResetCandidateByStatusAction extends BaseAction {
  type: ActionType.RESET_CANDIDATE_BY_STATUS;
  status: string; // Status to look for: "Interrupted", "In Progress", "Interview Expired"
  menuOption?: string; // Menu option to click (default: "Regenerate Interview")
}

export type Action =
  | NavigateAction
  | ClickAction
  | TypeAction
  | SelectAction
  | WaitAction
  | WaitForSelectorAction
  | WaitForNavigationAction
  | ScreenshotAction
  | ScrollAction
  | HoverAction
  | PressKeyAction
  | AssertTextAction
  | AssertVisibleAction
  | AssertUrlAction
  | ExecuteScriptAction
  | UploadFileAction
  | SwitchFrameAction
  | LogTextAction
  | SelectDateAction
  | CheckVisibleOrLogAction
  | ResetCandidateByStatusAction
  | CustomAction;

export interface ActionResult {
  actionId: string;
  actionType: ActionType;
  status: 'success' | 'failure' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  screenshotPath?: string;
  metadata?: Record<string, unknown>;
}
