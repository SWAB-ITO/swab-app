/**
 * Structured Logger Utility
 *
 * Provides consistent logging with formatting, context, and severity levels.
 * Replaces scattered console.log statements with structured, searchable logging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  operation?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LoggerConfig {
  level: LogLevel;
  pretty: boolean; // Pretty console vs JSON
  timestamp: boolean;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private context: string;
  private config: LoggerConfig;
  private startTime: number;

  constructor(
    context: string,
    config: Partial<LoggerConfig> = {}
  ) {
    this.context = context;
    this.config = {
      level: config.level || 'info',
      pretty: config.pretty !== undefined ? config.pretty : true,
      timestamp: config.timestamp !== undefined ? config.timestamp : false,
      context: config.context,
    };
    this.startTime = Date.now();
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, errorData);
  }

  /**
   * Log progress (convenience method)
   */
  progress(current: number, total: number, label: string, interval: number = 50): void {
    if (current % interval === 0 || current === total) {
      this.info(`Progress: ${current}/${total} ${label}`);
    }
  }

  /**
   * Log operation start
   */
  start(operation: string): void {
    this.startTime = Date.now();
    this.info(`Started: ${operation}`);
  }

  /**
   * Log operation end with duration
   */
  end(operation: string): void {
    const duration = Date.now() - this.startTime;
    this.info(`Completed: ${operation}`, { duration: `${duration}ms` });
  }

  /**
   * Create child logger with additional context
   */
  child(childContext: string, additionalContext?: LogContext): Logger {
    return new Logger(
      `${this.context}:${childContext}`,
      {
        ...this.config,
        context: { ...this.config.context, ...additionalContext },
      }
    );
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Check if this level should be logged
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    if (this.config.pretty) {
      this.logPretty(level, message, data);
    } else {
      this.logJson(level, message, data);
    }
  }

  /**
   * Pretty console output (current style)
   */
  private logPretty(level: LogLevel, message: string, data?: any): void {
    const timestamp = this.config.timestamp ? `[${new Date().toISOString()}] ` : '';
    const prefix = this.getLevelPrefix(level);
    const contextStr = `[${this.context}]`;
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';

    const logMessage = `${timestamp}${prefix} ${contextStr} ${message}${dataStr}`;

    switch (level) {
      case 'debug':
      case 'info':
        console.log(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  /**
   * JSON output (for production/parsing)
   */
  private logJson(level: LogLevel, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
      ...this.config.context,
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * Get emoji/symbol prefix for log level
   */
  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '🔍';
      case 'info':
        return '✅';
      case 'warn':
        return '⚠️ ';
      case 'error':
        return '❌';
      default:
        return '';
    }
  }
}
