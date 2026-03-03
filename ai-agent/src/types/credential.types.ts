/**
 * Credential Types
 * Defines the structure for credentials management
 */

export interface Credential {
  key: string;
  value: string;
  type: CredentialType;
  environment?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export enum CredentialType {
  USERNAME = 'username',
  PASSWORD = 'password',
  API_KEY = 'apiKey',
  TOKEN = 'token',
  SECRET = 'secret',
  CERTIFICATE = 'certificate',
  OTHER = 'other'
}

export interface CredentialStore {
  version: string;
  lastUpdated: Date;
  credentials: CredentialEntry[];
}

export interface CredentialEntry {
  name: string;
  description?: string;
  credentials: Record<string, string>;
  environment?: string;
}

export interface CredentialProvider {
  load(): Promise<CredentialStore>;
  get(key: string): Promise<string | undefined>;
  getAll(): Promise<Record<string, string>>;
  validate(): Promise<boolean>;
}
