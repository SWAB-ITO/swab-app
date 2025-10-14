/**
 * Base Processor
 *
 * Abstract base class for all data processors (Jotform, Givebutter, CSV, etc.).
 * Provides consistent interface, logging, error handling, and metrics tracking.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import {
  OperatorConfig,
  OperatorMetrics,
  ValidationResult,
  SyncResult,
} from '../../types/operators';

export interface ProcessorConfig extends OperatorConfig {
  supabase: SupabaseClient;
  logger?: Logger;
  errorHandler?: ErrorHandler;
  dryRun?: boolean;
}

export interface ProcessorMetrics extends OperatorMetrics {
  startTime: number;
  endTime?: number;
  duration: number;
  recordsProcessed: number;
  recordsFailed: number;
  recordsSkipped: number;
}

/**
 * Abstract Base Processor
 *
 * All data processors should extend this class to ensure consistent
 * behavior, logging, error handling, and metrics.
 */
export abstract class BaseProcessor<TInput = any, TOutput = any> {
  protected supabase: SupabaseClient;
  protected logger: Logger;
  protected errorHandler: ErrorHandler;
  protected dryRun: boolean;

  protected metrics: ProcessorMetrics = {
    startTime: 0,
    endTime: undefined,
    duration: 0,
    recordsProcessed: 0,
    recordsFailed: 0,
    recordsSkipped: 0,
  };

  constructor(config: ProcessorConfig) {
    this.supabase = config.supabase;
    this.logger = config.logger || new Logger(this.constructor.name);
    this.errorHandler =
      config.errorHandler ||
      new ErrorHandler({
        supabase: config.supabase,
        logger: this.logger,
      });
    this.dryRun = config.dryRun || false;

    if (this.dryRun) {
      this.logger.warn('Running in DRY RUN mode - no data will be written');
    }
  }

  /**
   * Main processing method - must be implemented by subclasses
   */
  abstract process(input: TInput): Promise<TOutput>;

  /**
   * Transform raw data into standardized format
   * Must be implemented by subclasses
   */
  protected abstract transform(data: any): any;

  /**
   * Validate data before processing
   * Can be overridden by subclasses for custom validation
   */
  protected validate(data: any): ValidationResult {
    // Default: no validation
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Start metrics tracking
   */
  protected startMetrics(): void {
    this.metrics.startTime = Date.now();
    this.logger.start(this.constructor.name);
  }

  /**
   * Stop metrics tracking
   */
  protected stopMetrics(): void {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    this.logger.end(this.constructor.name);
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProcessorMetrics {
    return {
      ...this.metrics,
      duration: this.metrics.endTime
        ? this.metrics.endTime - this.metrics.startTime
        : Date.now() - this.metrics.startTime,
    };
  }

  /**
   * Increment processed counter
   */
  protected incrementProcessed(count: number = 1): void {
    this.metrics.recordsProcessed += count;
  }

  /**
   * Increment failed counter
   */
  protected incrementFailed(count: number = 1): void {
    this.metrics.recordsFailed += count;
  }

  /**
   * Increment skipped counter
   */
  protected incrementSkipped(count: number = 1): void {
    this.metrics.recordsSkipped += count;
  }

  /**
   * Log summary of processing results
   */
  protected logSummary(): void {
    const metrics = this.getMetrics();
    const durationSec = (metrics.duration / 1000).toFixed(2);

    this.logger.info('Processing complete', {
      duration: `${durationSec}s`,
      processed: metrics.recordsProcessed,
      failed: metrics.recordsFailed,
      skipped: metrics.recordsSkipped,
      success_rate: `${(
        ((metrics.recordsProcessed - metrics.recordsFailed) /
          metrics.recordsProcessed) *
        100
      ).toFixed(1)}%`,
    });
  }

  /**
   * Flush errors to database
   */
  protected async flushErrors(): Promise<void> {
    await this.errorHandler.flush();
  }

  /**
   * Handle processing error
   */
  protected handleError(error: Error, record?: any): void {
    this.logger.error('Processing error', error);
    this.incrementFailed();

    this.errorHandler.handleException(error, {
      operation: this.constructor.name,
      source_table: record?.submission_id || record?.member_id || undefined,
    });
  }

  /**
   * Create a SyncResult from current metrics
   */
  protected createSyncResult(
    additionalErrors: Array<{
      record?: any;
      error: string;
      severity: 'critical' | 'error' | 'warning' | 'info';
    }> = []
  ): SyncResult {
    const metrics = this.getMetrics();

    return {
      success: metrics.recordsFailed === 0,
      recordsSynced: metrics.recordsProcessed - metrics.recordsFailed,
      recordsFailed: metrics.recordsFailed,
      errors: additionalErrors,
    };
  }
}
