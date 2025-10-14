/**
 * Jotform Sync Processor
 *
 * Handles business logic for syncing Jotform submissions to database.
 * Supports both signup and setup forms with field mapping.
 */

import { BaseProcessor, ProcessorConfig } from '../../lib/infrastructure/processors/base-processor';
import { JotformClient, JotformSubmission } from '../../lib/infrastructure/clients/jotform-client';
import { BatchUpserter } from '../../lib/infrastructure/operators/batch-upserter';
import { ValidationResult } from '../../lib/types/operators';

export interface JotformSyncConfig extends ProcessorConfig {
  client: JotformClient;
  formId: string;
  targetTable: 'raw_mn_signups' | 'raw_mn_funds_setup';
  formType: 'signup' | 'setup';
  batchSize?: number;
}

export interface ParsedSignup {
  submission_id: string;
  prefix?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  uga_email?: string | null;
  personal_email?: string | null;
  phone?: string | null;
  mn_id?: string | null;
  uga_class?: string | null;
  shirt_size?: string | null;
  gender?: string | null;
  raw_data: any;
  submitted_at: string;
}

export interface ParsedSetup {
  submission_id: string;
  email?: string | null;
  phone?: string | null;
  raw_data: any;
  submitted_at: string;
}

/**
 * Jotform Sync Processor
 *
 * Fetches submissions from Jotform and syncs to database with
 * proper field extraction and validation.
 */
export class JotformSyncProcessor extends BaseProcessor<string, number> {
  private client: JotformClient;
  private formId: string;
  private targetTable: 'raw_mn_signups' | 'raw_mn_funds_setup';
  private formType: 'signup' | 'setup';
  private upserter: BatchUpserter;

  constructor(config: JotformSyncConfig) {
    super(config);

    this.client = config.client;
    this.formId = config.formId;
    this.targetTable = config.targetTable;
    this.formType = config.formType;

    this.upserter = new BatchUpserter({
      supabase: this.supabase,
      logger: this.logger,
      errorHandler: this.errorHandler,
      batchSize: config.batchSize || 100,
    });
  }

  /**
   * Main process method - fetches and syncs submissions
   *
   * @param formId - Optional override for form ID
   * @returns Number of submissions synced
   */
  async process(formId?: string): Promise<number> {
    const targetFormId = formId || this.formId;

    this.startMetrics();
    this.logger.info(`Starting Jotform ${this.formType} sync`, {
      formId: targetFormId,
      targetTable: this.targetTable,
    });

    try {
      // Fetch all submissions
      this.logger.info(`Fetching submissions from form ${targetFormId}...`);
      const submissions = await this.client.getAllFormSubmissions(targetFormId);

      this.logger.info(`Found ${submissions.length} submissions`);

      if (submissions.length === 0) {
        this.logger.warn('No submissions found');
        this.stopMetrics();
        return 0;
      }

      // Transform submissions
      const parsed = submissions.map(submission => {
        try {
          return this.transform(submission);
        } catch (error: any) {
          this.handleError(error, submission);
          return null;
        }
      }).filter(Boolean);

      this.logger.info(`Successfully parsed ${parsed.length}/${submissions.length} submissions`);

      // Upsert to database (unless dry run)
      if (!this.dryRun) {
        const result = await this.upserter.upsert(
          this.targetTable,
          parsed as any[],
          { onConflict: 'submission_id' }
        );

        this.incrementProcessed(result.successful.length);
        this.incrementFailed(result.failed.length);

        // Log failed items
        if (result.failed.length > 0) {
          this.logger.error(
            `Failed to upsert ${result.failed.length} submissions`,
            { failures: result.failed.slice(0, 5) }
          );
        }
      } else {
        this.logger.info('[DRY RUN] Would have upserted', {
          count: parsed.length,
          table: this.targetTable,
        });
        this.incrementProcessed(parsed.length);
      }

      // Flush errors
      await this.flushErrors();

      this.stopMetrics();
      this.logSummary();

      return this.metrics.recordsProcessed;
    } catch (error: any) {
      this.logger.error('Sync failed', error);
      this.stopMetrics();
      throw error;
    }
  }

  /**
   * Transform Jotform submission based on form type
   */
  protected transform(submission: JotformSubmission): ParsedSignup | ParsedSetup {
    if (this.formType === 'signup') {
      return this.parseSignupSubmission(submission);
    } else {
      return this.parseSetupSubmission(submission);
    }
  }

  /**
   * Parse signup form submission
   */
  private parseSignupSubmission(submission: JotformSubmission): ParsedSignup {
    const answers = submission.answers;

    // Extract name fields (typically in a fullName object)
    const fullNameAnswer = Object.values(answers).find(
      a => a.name === 'fullName' || a.type === 'control_fullname'
    );
    const fullName = fullNameAnswer?.answer || {};

    // Extract phone (typically in mnPhone with .full property)
    const phoneAnswer = Object.values(answers).find(a => a.name === 'mnPhone');
    const phone = phoneAnswer?.answer?.full || null;

    // Helper to get answer by name
    const getAnswerByName = (name: string) => {
      const answer = Object.values(answers).find(a => a.name === name);
      return this.extractValue(answer?.answer);
    };

    return {
      submission_id: submission.id,

      // Name fields
      prefix: fullName.prefix || null,
      first_name: fullName.first || null,
      middle_name: fullName.middle || null,
      last_name: fullName.last || null,

      // Contact
      uga_email: getAnswerByName('ugaEmail'),
      personal_email: getAnswerByName('personalEmail'),
      phone: phone,

      // Mentor-specific
      mn_id: getAnswerByName('mnid'),
      uga_class: getAnswerByName('ugaClass'),
      shirt_size: getAnswerByName('shirtSize'),
      gender: getAnswerByName('gender'),

      // Store complete submission
      raw_data: answers,

      // Metadata
      submitted_at: new Date(submission.created_at).toISOString(),
    };
  }

  /**
   * Parse setup form submission
   */
  private parseSetupSubmission(submission: JotformSubmission): ParsedSetup {
    const answers = submission.answers;

    // Extract phone (may be in different formats)
    const phoneAnswer = Object.values(answers).find(
      a => a.name?.toLowerCase().includes('phone') || a.type === 'control_phone'
    );
    const phone = phoneAnswer?.answer?.full || this.extractValue(phoneAnswer?.answer) || null;

    // Extract email (look for email field)
    const emailAnswer = Object.values(answers).find(
      a => a.name?.toLowerCase().includes('email') || a.type === 'control_email'
    );
    const email = this.extractValue(emailAnswer?.answer);

    return {
      submission_id: submission.id,

      // Contact
      email: email,
      phone: phone,

      // Store complete submission
      raw_data: answers,

      // Metadata
      submitted_at: new Date(submission.created_at).toISOString(),
    };
  }

  /**
   * Extract value from Jotform answer
   */
  private extractValue(answer: any): string | null {
    if (!answer) return null;

    // Handle different answer formats
    if (typeof answer === 'string') return answer.trim() || null;
    if (typeof answer === 'object' && answer.full) return answer.full.trim() || null;

    return null;
  }

  /**
   * Validate submission data
   */
  protected validate(data: ParsedSignup | ParsedSetup): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields based on form type
    if (this.formType === 'signup') {
      const signup = data as ParsedSignup;

      if (!signup.submission_id) {
        errors.push('Missing submission_id');
      }

      if (!signup.first_name && !signup.last_name) {
        warnings.push('Missing both first and last name');
      }

      if (!signup.phone && !signup.personal_email && !signup.uga_email) {
        warnings.push('Missing all contact methods (phone, email)');
      }
    } else {
      const setup = data as ParsedSetup;

      if (!setup.submission_id) {
        errors.push('Missing submission_id');
      }

      if (!setup.phone && !setup.email) {
        warnings.push('Missing both phone and email');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
