/**
 * Centralized Error Handler
 *
 * Provides consistent error handling and logging to mn_errors table.
 * Replaces duplicated error handling code across sync scripts and ETL.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from './logger';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ErrorEntry {
  mn_id?: string;
  phone?: string;
  email?: string;
  error_type: string;
  error_message: string;
  severity: ErrorSeverity;
  source_table: string;
  raw_data?: any;
}

export interface ErrorHandlerConfig {
  logger: Logger;
  supabase?: SupabaseClient;
  batchSize?: number;
  autoFlush?: boolean;
}

export class ErrorHandler {
  private logger: Logger;
  private supabase?: SupabaseClient;
  private errors: ErrorEntry[] = [];
  private batchSize: number;
  private autoFlush: boolean;

  constructor(config: ErrorHandlerConfig) {
    this.logger = config.logger;
    this.supabase = config.supabase;
    this.batchSize = config.batchSize || 100;
    this.autoFlush = config.autoFlush !== undefined ? config.autoFlush : false;
  }

  /**
   * Add an error to the batch
   */
  add(error: ErrorEntry): void {
    this.errors.push(error);

    // Log to console immediately
    const logMessage = `${error.error_type}: ${error.error_message}`;
    switch (error.severity) {
      case 'critical':
      case 'error':
        this.logger.error(logMessage, {
          mn_id: error.mn_id,
          source: error.source_table,
        });
        break;
      case 'warning':
        this.logger.warn(logMessage, {
          mn_id: error.mn_id,
          source: error.source_table,
        });
        break;
      case 'info':
        this.logger.info(logMessage, {
          mn_id: error.mn_id,
          source: error.source_table,
        });
        break;
    }

    // Auto flush if batch size reached
    if (this.autoFlush && this.errors.length >= this.batchSize) {
      this.flush().catch(err => {
        this.logger.error('Failed to auto-flush errors', err);
      });
    }
  }

  /**
   * Add multiple errors at once
   */
  addBatch(errors: ErrorEntry[]): void {
    errors.forEach(error => this.add(error));
  }

  /**
   * Flush errors to database
   */
  async flush(): Promise<void> {
    if (this.errors.length === 0) {
      return;
    }

    if (!this.supabase) {
      this.logger.warn('No Supabase client provided, errors not persisted to database');
      this.errors = [];
      return;
    }

    const errorCount = this.errors.length;
    this.logger.info(`Flushing ${errorCount} errors to database`);

    try {
      const { error } = await this.supabase
        .from('mn_errors')
        .insert(this.errors);

      if (error) {
        this.logger.error('Failed to save errors to database', error);
        throw error;
      }

      this.logger.info(`Successfully saved ${errorCount} errors`);
      this.errors = [];
    } catch (err) {
      this.logger.error('Error during flush operation', err);
      throw err;
    }
  }

  /**
   * Get current error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get all errors
   */
  getAllErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  /**
   * Clear all errors without flushing
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Handle a caught error/exception
   */
  handleException(
    error: Error | any,
    context: {
      operation: string;
      mn_id?: string;
      phone?: string;
      email?: string;
      source_table?: string;
      severity?: ErrorSeverity;
    }
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.add({
      mn_id: context.mn_id,
      phone: context.phone,
      email: context.email,
      error_type: context.operation,
      error_message: errorMessage,
      severity: context.severity || 'error',
      source_table: context.source_table || 'unknown',
      raw_data: errorStack ? { stack: errorStack } : error,
    });
  }

  /**
   * Create a validation error
   */
  validationError(params: {
    mn_id?: string;
    field: string;
    value: any;
    reason: string;
    source_table: string;
    severity?: ErrorSeverity;
  }): void {
    this.add({
      mn_id: params.mn_id,
      error_type: 'validation_error',
      error_message: `${params.field}: ${params.reason}`,
      severity: params.severity || 'warning',
      source_table: params.source_table,
      raw_data: { field: params.field, value: params.value },
    });
  }

  /**
   * Create a duplicate error
   */
  duplicateError(params: {
    mn_id?: string;
    phone?: string;
    email?: string;
    duplicateCount: number;
    source_table: string;
    duplicateIds?: string[];
  }): void {
    this.add({
      mn_id: params.mn_id,
      phone: params.phone,
      email: params.email,
      error_type: 'duplicate_record',
      error_message: `Found ${params.duplicateCount} duplicate records`,
      severity: 'warning',
      source_table: params.source_table,
      raw_data: { duplicate_ids: params.duplicateIds },
    });
  }
}
