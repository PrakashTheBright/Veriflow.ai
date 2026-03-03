/**
 * Credential Loader
 * Loads and manages credentials from external files
 */

import fs from 'fs/promises';
import path from 'path';
import { CredentialStore, CredentialEntry } from '../types';
import { Logger } from '../utils/logger';

export class CredentialLoader {
  private logger: Logger;
  private credentialPath: string;
  private credentials: Map<string, string> = new Map();
  private loaded: boolean = false;

  constructor(logger: Logger, credentialPath: string) {
    this.logger = logger;
    this.credentialPath = credentialPath;
  }

  /**
   * Load credentials from file
   */
  async load(): Promise<void> {
    try {
      this.logger.info('Loading credentials', { path: this.credentialPath });

      // Check if file exists
      try {
        await fs.access(this.credentialPath);
      } catch {
        this.logger.warn('Credential file not found, creating empty store');
        this.loaded = true;
        return;
      }

      const content = await fs.readFile(this.credentialPath, 'utf-8');
      const store: CredentialStore = JSON.parse(content);

      // Flatten credentials into map
      for (const entry of store.credentials) {
        for (const [key, value] of Object.entries(entry.credentials)) {
          const fullKey = entry.name ? `${entry.name}.${key}` : key;
          this.credentials.set(fullKey, value);
          this.credentials.set(key, value); // Also store without prefix for convenience
        }
      }

      this.loaded = true;
      this.logger.info('Credentials loaded successfully', {
        count: this.credentials.size / 2 // Divide by 2 because we store both formats
      });
    } catch (error) {
      this.logger.error('Failed to load credentials', { error });
      throw new Error(`Failed to load credentials: ${error}`);
    }
  }

  /**
   * Get a credential by key
   */
  async get(key: string): Promise<string | undefined> {
    if (!this.loaded) {
      await this.load();
    }

    // Check environment variables first (higher priority)
    const envKey = key.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];
    if (envValue) {
      this.logger.debug('Credential resolved from environment', { key });
      return envValue;
    }

    // Then check loaded credentials
    const value = this.credentials.get(key);
    if (value) {
      this.logger.debug('Credential resolved from file', { key });
    }

    return value;
  }

  /**
   * Check if a credential exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.loaded) {
      await this.load();
    }

    // Check environment variables first
    const envKey = key.toUpperCase().replace(/\./g, '_');
    if (process.env[envKey]) {
      return true;
    }

    return this.credentials.has(key);
  }

  /**
   * Get all credential keys (not values - for security)
   */
  getKeys(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Validate that all required credentials are present
   */
  async validateRequired(requiredKeys: string[]): Promise<string[]> {
    if (!this.loaded) {
      await this.load();
    }

    const missing: string[] = [];

    for (const key of requiredKeys) {
      if (!(await this.has(key))) {
        missing.push(key);
      }
    }

    return missing;
  }

  /**
   * Clear loaded credentials from memory
   */
  clear(): void {
    this.credentials.clear();
    this.loaded = false;
    this.logger.info('Credentials cleared from memory');
  }

  /**
   * Reload credentials from file
   */
  async reload(): Promise<void> {
    this.clear();
    await this.load();
  }
}
