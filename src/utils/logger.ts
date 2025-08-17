/**
 * Production-safe logging utility
 * Removes console.log statements from production while maintaining debug capabilities
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isTest = import.meta.env.MODE === 'test';

  private formatMessage(level: LogLevel, message: string, context?: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const prefix = `${timestamp} ${level.toUpperCase()} ${contextStr}`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: string, data?: any): void {
    if (this.isDevelopment && !this.isTest) {
      console.debug(this.formatMessage('debug', message, context, data));
    }
  }

  info(message: string, context?: string, data?: any): void {
    if (this.isDevelopment || this.isTest) {
      console.info(this.formatMessage('info', message, context, data));
    }
  }

  warn(message: string, context?: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, context, data));
  }

  error(message: string, context?: string, data?: any): void {
    console.error(this.formatMessage('error', message, context, data));
  }

  // Development-only convenience methods
  auth(message: string, data?: any): void {
    this.debug(message, 'AUTH', data);
  }

  api(message: string, data?: any): void {
    this.debug(message, 'API', data);
  }

  ui(message: string, data?: any): void {
    this.debug(message, 'UI', data);
  }
}

export const logger = new Logger();