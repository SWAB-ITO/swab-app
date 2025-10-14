/**
 * Batch Upserter Operator
 *
 * Handles batch database upsert operations with progress tracking.
 * Centralizes batch logic used across sync scripts and ETL.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { BatchResult, ProgressCallback } from '../../types/operators';

export interface BatchUpserterConfig {
  supabase: SupabaseClient;
  logger?: Logger;
  errorHandler?: ErrorHandler;
  batchSize?: number;
  onProgress?: ProgressCallback;
}

export class BatchUpserter {
  private supabase: SupabaseClient;
  private logger?: Logger;
  private errorHandler?: ErrorHandler;
  private batchSize: number;
  private onProgress?: ProgressCallback;

  constructor(config: BatchUpserterConfig) {
    this.supabase = config.supabase;
    this.logger = config.logger;
    this.errorHandler = config.errorHandler;
    this.batchSize = config.batchSize || 100;
    this.onProgress = config.onProgress;
  }

  /**
   * Upsert records in batches
   */
  async upsert<T extends Record<string, any>>(
    table: string,
    records: T[],
    options: {
      onConflict: string;
      unique?: keyof T;
    }
  ): Promise<BatchResult<T>> {
    const result: BatchResult<T> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
    };

    const batches = this.createBatches(records);
    this.logger?.info(`Upserting ${records.length} records to ${table} in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const { data, error } = await this.supabase
          .from(table)
          .upsert(batch, { onConflict: options.onConflict })
          .select();

        if (error) {
          this.logger?.error(`Batch ${i + 1} failed`, error);

          // Add all items in failed batch to failed array
          batch.forEach(item => {
            result.failed.push({
              item,
              error: error.message,
            });

            this.errorHandler?.add({
              error_type: 'batch_upsert_failed',
              error_message: `Failed to upsert: ${error.message}`,
              severity: 'error',
              source_table: table,
              raw_data: item,
            });
          });
        } else {
          result.successful.push(...batch);
        }

        result.totalProcessed += batch.length;

        // Report progress
        if (this.onProgress) {
          this.onProgress(
            result.totalProcessed,
            records.length,
            `${table} records upserted`
          );
        }

        this.logger?.progress(result.totalProcessed, records.length, `${table} records upserted`);

      } catch (err: any) {
        this.logger?.error(`Batch ${i + 1} error`, err);

        batch.forEach(item => {
          result.failed.push({
            item,
            error: err.message || 'Unknown error',
          });
        });
      }
    }

    this.logger?.info(
      `Upsert complete: ${result.successful.length} successful, ${result.failed.length} failed`
    );

    return result;
  }

  /**
   * Insert records in batches (no conflict handling)
   */
  async insert<T extends Record<string, any>>(
    table: string,
    records: T[]
  ): Promise<BatchResult<T>> {
    const result: BatchResult<T> = {
      successful: [],
      failed: [],
      totalProcessed: 0,
    };

    const batches = this.createBatches(records);
    this.logger?.info(`Inserting ${records.length} records to ${table} in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const { data, error } = await this.supabase
          .from(table)
          .insert(batch)
          .select();

        if (error) {
          this.logger?.error(`Batch ${i + 1} failed`, error);

          batch.forEach(item => {
            result.failed.push({
              item,
              error: error.message,
            });
          });
        } else {
          result.successful.push(...batch);
        }

        result.totalProcessed += batch.length;

        if (this.onProgress) {
          this.onProgress(
            result.totalProcessed,
            records.length,
            `${table} records inserted`
          );
        }

        this.logger?.progress(result.totalProcessed, records.length, `${table} records inserted`);

      } catch (err: any) {
        this.logger?.error(`Batch ${i + 1} error`, err);

        batch.forEach(item => {
          result.failed.push({
            item,
            error: err.message || 'Unknown error',
          });
        });
      }
    }

    this.logger?.info(
      `Insert complete: ${result.successful.length} successful, ${result.failed.length} failed`
    );

    return result;
  }

  /**
   * Delete records in batches
   */
  async deleteByIds<T = any>(
    table: string,
    idColumn: string,
    ids: (string | number)[]
  ): Promise<{ deleted: number; failed: number }> {
    const batches = this.createBatches(ids);
    let deleted = 0;
    let failed = 0;

    this.logger?.info(`Deleting ${ids.length} records from ${table} in ${batches.length} batches`);

    for (const batch of batches) {
      try {
        const { error, count } = await this.supabase
          .from(table)
          .delete()
          .in(idColumn, batch);

        if (error) {
          this.logger?.error('Delete batch failed', error);
          failed += batch.length;
        } else {
          deleted += count || batch.length;
        }
      } catch (err: any) {
        this.logger?.error('Delete batch error', err);
        failed += batch.length;
      }
    }

    this.logger?.info(`Delete complete: ${deleted} deleted, ${failed} failed`);

    return { deleted, failed };
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    return batches;
  }

  /**
   * Update batch size
   */
  setBatchSize(size: number): void {
    this.batchSize = Math.max(1, Math.min(size, 1000)); // Between 1 and 1000
  }
}
