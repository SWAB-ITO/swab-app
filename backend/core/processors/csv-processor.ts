/**
 * CSV Processor
 *
 * Handles CSV file processing with streaming, filtering, and batch operations.
 * Used for importing Givebutter contacts and other CSV exports.
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { BaseProcessor, ProcessorConfig } from '../../lib/infrastructure/processors/base-processor';
import { BatchUpserter } from '../../lib/infrastructure/operators/batch-upserter';
import { ValidationResult } from '../../lib/types/operators';

export interface CSVProcessorConfig extends ProcessorConfig {
  csvPath: string;
  targetTable: string;
  batchSize?: number;
  filterFn?: (row: any) => boolean;
  transformFn?: (row: any) => any;
  conflictColumn?: string;
}

export interface CSVStats {
  totalRows: number;
  filtered: number;
  processed: number;
  failed: number;
  duration: number;
}

/**
 * CSV Processor
 *
 * Streams CSV files, applies filtering/transformation, and batch upserts to database.
 */
export class CSVProcessor extends BaseProcessor<string, CSVStats> {
  private csvPath: string;
  private targetTable: string;
  private batchSize: number;
  private filterFn?: (row: any) => boolean;
  private transformFn?: (row: any) => any;
  private conflictColumn?: string;
  private upserter: BatchUpserter;

  private stats = {
    totalRows: 0,
    filtered: 0,
  };

  constructor(config: CSVProcessorConfig) {
    super(config);

    this.csvPath = config.csvPath;
    this.targetTable = config.targetTable;
    this.batchSize = config.batchSize || 100;
    this.filterFn = config.filterFn;
    this.transformFn = config.transformFn;
    this.conflictColumn = config.conflictColumn;

    this.upserter = new BatchUpserter({
      supabase: this.supabase,
      logger: this.logger,
      errorHandler: this.errorHandler,
      batchSize: this.batchSize,
    });
  }

  /**
   * Main process method - streams and processes CSV file
   *
   * @param csvPath - Optional override for CSV path
   * @returns Processing statistics
   */
  async process(csvPath?: string): Promise<CSVStats> {
    const targetPath = csvPath || this.csvPath;

    this.startMetrics();
    this.logger.info('Starting CSV processing', {
      csvPath: targetPath,
      targetTable: this.targetTable,
      batchSize: this.batchSize,
    });

    try {
      await this.processCSV(targetPath);

      this.stopMetrics();
      this.logSummary();

      return {
        totalRows: this.stats.totalRows,
        filtered: this.stats.filtered,
        processed: this.metrics.recordsProcessed,
        failed: this.metrics.recordsFailed,
        duration: this.metrics.duration,
      };
    } catch (error: any) {
      this.logger.error('CSV processing failed', error);
      this.stopMetrics();
      throw error;
    }
  }

  /**
   * Process CSV file with streaming
   */
  private async processCSV(csvPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const batch: any[] = [];

      // Create streaming CSV parser
      const parser = createReadStream(csvPath).pipe(
        parse({
          columns: true, // Use first row as headers
          skip_empty_lines: true,
          trim: true,
        })
      );

      // Process each row
      parser.on('data', async (row: any) => {
        this.stats.totalRows++;

        try {
          // Apply filter if provided
          if (this.filterFn && !this.filterFn(row)) {
            this.stats.filtered++;
            this.incrementSkipped();
            return;
          }

          // Transform row
          const transformed = this.transform(row);

          // Validate (optional)
          const validation = this.validate(transformed);
          if (!validation.valid) {
            this.logger.warn('Row validation failed', {
              row: this.stats.totalRows,
              errors: validation.errors,
            });
            this.incrementFailed();
            return;
          }

          // Add to batch
          batch.push(transformed);

          // Process batch when full
          if (batch.length >= this.batchSize) {
            // Pause stream while processing batch
            parser.pause();

            await this.processBatch(batch.splice(0, this.batchSize));

            // Resume stream
            parser.resume();
          }

          // Log progress every 500 rows
          if (this.stats.totalRows % 500 === 0) {
            this.logger.progress(
              this.stats.totalRows,
              this.stats.totalRows,
              'rows processed'
            );
          }
        } catch (error: any) {
          this.handleError(error, row);
        }
      });

      // Handle stream end
      parser.on('end', async () => {
        // Process remaining batch
        if (batch.length > 0) {
          await this.processBatch(batch);
        }

        // Flush errors
        await this.flushErrors();

        this.logger.info('CSV processing complete', {
          totalRows: this.stats.totalRows,
          filtered: this.stats.filtered,
          processed: this.metrics.recordsProcessed,
          failed: this.metrics.recordsFailed,
        });

        resolve();
      });

      // Handle errors
      parser.on('error', (error) => {
        this.logger.error('CSV parsing error', error);
        reject(error);
      });
    });
  }

  /**
   * Process a batch of rows
   */
  private async processBatch(batch: any[]): Promise<void> {
    if (batch.length === 0) return;

    try {
      if (!this.dryRun) {
        const result = await this.upserter.upsert(
          this.targetTable,
          batch,
          { onConflict: this.conflictColumn || 'id' }
        );

        this.incrementProcessed(result.successful.length);
        this.incrementFailed(result.failed.length);
      } else {
        this.logger.debug('[DRY RUN] Would have upserted batch', {
          count: batch.length,
        });
        this.incrementProcessed(batch.length);
      }
    } catch (error: any) {
      this.logger.error('Batch processing error', error);
      this.incrementFailed(batch.length);
    }
  }

  /**
   * Transform CSV row
   * Uses custom transform function if provided, otherwise returns row as-is
   */
  protected transform(row: any): any {
    if (this.transformFn) {
      return this.transformFn(row);
    }
    return row;
  }

  /**
   * Validate row data
   * Can be overridden for custom validation
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
   * Log processing summary
   */
  protected logSummary(): void {
    const metrics = this.getMetrics();
    const durationSec = (metrics.duration / 1000).toFixed(2);
    const rowsPerSec = Math.round(this.stats.totalRows / parseFloat(durationSec));

    this.logger.info('CSV processing summary', {
      duration: `${durationSec}s`,
      totalRows: this.stats.totalRows.toLocaleString(),
      filtered: this.stats.filtered.toLocaleString(),
      processed: metrics.recordsProcessed.toLocaleString(),
      failed: metrics.recordsFailed,
      speed: `${rowsPerSec.toLocaleString()} rows/sec`,
    });
  }
}
