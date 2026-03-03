/**
 * Browser Manager
 * Manages Playwright browser lifecycle
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BrowserConfig, ExecutionEnvironment } from '../../types';
import { Logger } from '../../utils/logger';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private logger: Logger;
  private config: BrowserConfig | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Launch browser and return a page
   */
  async launch(config: BrowserConfig): Promise<Page> {
    this.config = config;
    
    this.logger.info('Launching browser', {
      headless: config.headless,
      viewport: config.viewport
    });

    this.browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo,
      args: ['--start-maximized']
    });

    this.context = await this.browser.newContext({
      viewport: null, // null viewport allows natural window size
      userAgent: config.userAgent
    });

    this.page = await this.context.newPage();

    // Set default timeout
    this.page.setDefaultTimeout(config.timeout);

    this.logger.info('Browser launched successfully');
    return this.page;
  }

  /**
   * Get the current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the browser context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Create a new page in the same context
   */
  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    if (this.config) {
      page.setDefaultTimeout(this.config.timeout);
    }
    return page;
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string, options?: { fullPage?: boolean; selector?: string }): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    if (options?.selector) {
      const element = await this.page.$(options.selector);
      if (element) {
        await element.screenshot({ path });
      } else {
        throw new Error(`Element not found: ${options.selector}`);
      }
    } else {
      await this.page.screenshot({ 
        path, 
        fullPage: options?.fullPage ?? false 
      });
    }

    this.logger.debug('Screenshot saved', { path });
    return path;
  }

  /**
   * Get environment information
   */
  async getEnvironmentInfo(): Promise<ExecutionEnvironment> {
    const userAgent = this.page 
      ? await this.page.evaluate(() => navigator.userAgent)
      : 'N/A';

    return {
      browser: 'chromium',
      browserVersion: this.browser?.version() || 'unknown',
      platform: process.platform,
      viewport: this.config?.viewport || { width: 1920, height: 1080 },
      userAgent
    };
  }

  /**
   * Close all browser resources
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.logger.info('Browser closed successfully');
    } catch (error) {
      this.logger.error('Error closing browser', { error });
      throw error;
    }
  }

  /**
   * Check if browser is running
   */
  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}
