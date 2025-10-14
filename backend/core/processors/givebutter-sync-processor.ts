/**
 * Givebutter Sync Processor
 *
 * Handles business logic for syncing Givebutter campaign members to database.
 */

import { BaseProcessor, ProcessorConfig } from '../../lib/infrastructure/processors/base-processor';
import { GivebutterClient, GivebutterMember } from '../../lib/infrastructure/clients/givebutter-client';
import { BatchUpserter } from '../../lib/infrastructure/operators/batch-upserter';
import { ValidationResult } from '../../lib/types/operators';

export interface GivebutterSyncConfig extends ProcessorConfig {
  client: GivebutterClient;
  campaignCode: string;
  targetTable?: 'raw_gb_campaign_members';
  batchSize?: number;
}

export interface ParsedMember {
  member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  amount_raised: number;
  profile_url: string;
  raw_data: any;
}

/**
 * Givebutter Sync Processor
 *
 * Fetches campaign members from Givebutter and syncs to database
 * with proper field extraction and validation.
 */
export class GivebutterSyncProcessor extends BaseProcessor<string, number> {
  private client: GivebutterClient;
  private campaignCode: string;
  private targetTable: 'raw_gb_campaign_members';
  private upserter: BatchUpserter;

  constructor(config: GivebutterSyncConfig) {
    super(config);

    this.client = config.client;
    this.campaignCode = config.campaignCode;
    this.targetTable = config.targetTable || 'raw_gb_campaign_members';

    this.upserter = new BatchUpserter({
      supabase: this.supabase,
      logger: this.logger,
      errorHandler: this.errorHandler,
      batchSize: config.batchSize || 100,
    });
  }

  /**
   * Main process method - fetches and syncs campaign members
   *
   * @param campaignCode - Optional override for campaign code
   * @returns Number of members synced
   */
  async process(campaignCode?: string): Promise<number> {
    const targetCampaignCode = campaignCode || this.campaignCode;

    this.startMetrics();
    this.logger.info('Starting Givebutter campaign members sync', {
      campaignCode: targetCampaignCode,
      targetTable: this.targetTable,
    });

    try {
      // Look up campaign by code
      this.logger.info(`Looking up campaign: ${targetCampaignCode}...`);
      const campaign = await this.client.getCampaignByCode(targetCampaignCode);

      if (!campaign) {
        throw new Error(`Campaign with code ${targetCampaignCode} not found`);
      }

      this.logger.info(`Found campaign: ${campaign.title} (ID: ${campaign.id})`);

      // Fetch all members
      this.logger.info('Fetching campaign members...');
      const members = await this.client.getAllCampaignMembers(campaign.id);

      this.logger.info(`Found ${members.length} members`);

      if (members.length === 0) {
        this.logger.warn('No members found');
        this.stopMetrics();
        return 0;
      }

      // Transform members
      const parsed = members.map(member => {
        try {
          return this.transform(member);
        } catch (error: any) {
          this.handleError(error, member);
          return null;
        }
      }).filter(Boolean);

      this.logger.info(`Successfully parsed ${parsed.length}/${members.length} members`);

      // Upsert to database (unless dry run)
      if (!this.dryRun) {
        const result = await this.upserter.upsert(
          this.targetTable,
          parsed as any[],
          { onConflict: 'member_id' }
        );

        this.incrementProcessed(result.successful.length);
        this.incrementFailed(result.failed.length);

        // Log failed items
        if (result.failed.length > 0) {
          this.logger.error(
            `Failed to upsert ${result.failed.length} members`,
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
   * Transform Givebutter member to database format
   */
  protected transform(member: GivebutterMember): ParsedMember {
    return {
      member_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone || null,
      amount_raised: member.raised,
      profile_url: member.url,
      raw_data: member, // Store full member object for reference
    };
  }

  /**
   * Validate member data
   */
  protected validate(data: ParsedMember): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!data.member_id) {
      errors.push('Missing member_id');
    }

    if (!data.email) {
      errors.push('Missing email');
    }

    if (!data.first_name && !data.last_name) {
      warnings.push('Missing both first and last name');
    }

    if (!data.phone) {
      warnings.push('Missing phone number');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
