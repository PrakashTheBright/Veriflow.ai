/**
 * Logger Utility
 * Structured logging with Winston
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

export interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  logDir?: string;
  includeTimestamp?: boolean;
}

export class Logger {
  private logger: winston.Logger;
  private sessionId: string;

  constructor(options: LoggerOptions, sessionId: string = 'default') {
    this.sessionId = sessionId;

    // Ensure log directory exists
    if (options.logDir) {
      if (!fs.existsSync(options.logDir)) {
        fs.mkdirSync(options.logDir, { recursive: true });
      }
    }

    const formats: winston.Logform.Format[] = [];

    if (options.includeTimestamp !== false) {
      formats.push(winston.format.timestamp());
    }

    formats.push(winston.format.errors({ stack: true }));

    if (options.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      );
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: options.level
      })
    ];

    // Add file transport if log directory is specified
    if (options.logDir) {
      transports.push(
        new winston.transports.File({
          filename: path.join(options.logDir, 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join(options.logDir, 'combined.log'),
          level: options.level
        })
      );
    }

    this.logger = winston.createLogger({
      level: options.level,
      format: winston.format.combine(...formats),
      transports,
      defaultMeta: { sessionId: this.sessionId }
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    this.logger.defaultMeta = { ...this.logger.defaultMeta, sessionId };
  }

  child(meta: Record<string, unknown>): Logger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(meta);
    return childLogger;
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(options?: Partial<LoggerOptions>): Logger {
  const defaultOptions: LoggerOptions = {
    level: 'info',
    format: 'text',
    includeTimestamp: true,
    ...options
  };

  return new Logger(defaultOptions);
}
