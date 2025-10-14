/**
 * Base Types and Interfaces for Operator Pattern
 *
 * Defines standard interfaces that all operators, processors, and clients should implement.
 * This ensures consistency and composability across the codebase.
 */

import { Logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

/**
 * Base configuration for all operators
 */
export interface OperatorConfig {
  logger?: Logger;
  errorHandler?: ErrorHandler;
  dryRun?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Operation metrics
 */
export interface OperatorMetrics {
  duration: number;
  recordsProcessed: number;
  recordsFailed: number;
  recordsSkipped: number;
}

/**
 * Base operator interface
 */
export interface Operator<TInput, TOutput> {
  process(input: TInput): Promise<TOutput>;
  validate?(input: TInput): ValidationResult;
  getMetrics?(): OperatorMetrics;
}

/**
 * Data processor interface
 */
export interface DataProcessor<TInput, TOutput> extends Operator<TInput, TOutput> {
  transform(data: TInput): TOutput | Promise<TOutput>;
  normalize(data: TOutput): TOutput | Promise<TOutput>;
}

/**
 * Sync operator result
 */
export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  recordsFailed: number;
  errors: Array<{
    record?: any;
    error: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
  }>;
}

/**
 * Sync operator interface
 */
export interface SyncOperator<TData> extends Operator<TData[], SyncResult> {
  fetch(): Promise<TData[]>;
  store(data: TData[]): Promise<SyncResult>;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  totalProcessed: number;
}

/**
 * Progress callback
 */
export type ProgressCallback = (current: number, total: number, message?: string) => void;
