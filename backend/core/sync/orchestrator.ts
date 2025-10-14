/**
 * SYNC ORCHESTRATOR
 *
 * Coordinates syncing data from external sources (Jotform, Givebutter)
 * into the simplified database schema.
 *
 * Flow:
 * 1. Fetch Jotform signups → raw_mn_signups
 * 2. Fetch Jotform setup → raw_mn_funds_setup
 * 3. Fetch GB campaign members → raw_gb_campaign_members
 * 4. Run ETL → mentors (single source of truth)
 * 5. Sync GB contacts via API (tag-based: "Mentors 2025")
 *
 * Usage:
 *   npm run sync                   (periodic sync)
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { spawn } from 'child_process';
import { Database } from '../../lib/supabase/database.types';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

export type SyncType = 'initialization' | 'automated' | 'manual' | 'feature_csv_upload';
export type SyncStatus = 'running' | 'completed' | 'failed';

export interface SyncLogEntry {
  sync_type: SyncType;
  status: SyncStatus;
  triggered_by: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  error_details?: any;
  records_processed?: number;
  records_inserted?: number;
  records_updated?: number;
  records_failed?: number;
  metadata?: any;
}

export class SyncOrchestrator {
  private supabase: ReturnType<typeof createClient<Database>>;
  private syncLogId?: string;

  constructor() {
    const config = getSupabaseConfig();
    this.supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);
  }

  /**
   * Start a sync log entry
   */
  async startSyncLog(syncType: SyncType, triggeredBy: string = 'manual'): Promise<string> {
    const { data, error } = await this.supabase
      .from('sync_log')
      .insert({
        sync_type: syncType,
        status: 'running',
        triggered_by: triggeredBy,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create sync log: ${error?.message}`);
    }

    this.syncLogId = data.id;
    return data.id;
  }

  /**
   * Complete a sync log entry
   */
  async completeSyncLog(
    logId: string,
    status: SyncStatus,
    stats?: Partial<SyncLogEntry>
  ) {
    const startTime = await this.getSyncStartTime(logId);
    const duration = startTime ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000) : undefined;

    await this.supabase
      .from('sync_log')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        ...stats,
      })
      .eq('id', logId);
  }

  /**
   * Get sync start time
   */
  async getSyncStartTime(logId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('sync_log')
      .select('started_at')
      .eq('id', logId)
      .single();

    return data?.started_at || null;
  }

  /**
   * Run a script asynchronously with real-time output streaming
   */
  async runScript(command: string): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      // Parse command (e.g., "npm run sync:jotform-signups")
      const [cmd, ...args] = command.split(' ');

      // Spawn the process
      const child = spawn(cmd, args, {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'], // inherit stdin, pipe stdout/stderr
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      // Capture and stream stdout
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text); // Stream to console in real-time
      });

      // Capture and stream stderr
      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text); // Stream to console in real-time
      });

      // Handle process completion
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({
            success: false,
            error: `Process exited with code ${code}`,
            output: stderr || stdout,
          });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          output: stderr,
        });
      });
    });
  }

  /**
   * Periodic Sync (No CSV required)
   *
   * Flow:
   * 1. Fetch Jotform signups → raw tables
   * 2. Fetch Jotform setup → raw tables
   * 3. Fetch Givebutter members → raw tables
   * 4. Run ETL → mentors, mn_errors, mn_gb_import
   * 5. Sync Givebutter contacts via API (tag-based: "Mentors 2025")
   */
  async runPeriodicSync(triggeredBy: string = 'manual'): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 PERIODIC SYNC');
    console.log('='.repeat(80) + '\n');

    const logId = await this.startSyncLog('automated', triggeredBy);
    const startTime = Date.now();

    let recordsProcessed = 0;
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    const steps = [
      { name: '1. Jotform Signups', command: 'npm run sync:jotform-signups' },
      { name: '2. Jotform Setup', command: 'npm run sync:jotform-setup' },
      { name: '3. Givebutter Members', command: 'npm run sync:givebutter-members' },
      { name: '4. ETL Process', command: 'npm run etl' },
      { name: '5. API Contact Sync', command: 'npm run sync:api-contacts' },
    ];

    let failed = false;
    let errorMessage = '';

    for (const step of steps) {
      console.log(`\n▶️  ${step.name}...`);
      console.log('─'.repeat(80) + '\n');

      const result = await this.runScript(step.command);

      if (!result.success) {
        failed = true;
        errorMessage = `${step.name} failed: ${result.error}`;
        console.error(`\n❌ ${step.name} failed\n`);
        console.error(result.error);
        break;
      } else {
        console.log(`\n✅ ${step.name} completed\n`);
      }
    }

    // Complete sync log
    await this.completeSyncLog(logId, failed ? 'failed' : 'completed', {
      records_processed: recordsProcessed,
      records_inserted: recordsInserted,
      records_updated: recordsUpdated,
      records_failed: recordsFailed,
      error_message: failed ? errorMessage : undefined,
    });

    // Update sync_config
    if (!failed) {
      await this.supabase
        .from('sync_config')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', 1);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log(failed ? '❌ PERIODIC SYNC FAILED' : '✅ PERIODIC SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log(`⏱️  Duration: ${duration}s\n`);

    if (failed) {
      console.log('💡 Troubleshooting:');
      console.log('   - Check API keys in sync_config');
      console.log('   - Review error logs above');
      console.log('   - Check mn_errors table for details\n');
      process.exit(1);
    }

    console.log('💡 Next Steps:');
    console.log('   - Review mn_errors for any issues');
    console.log('   - Generate export CSV if needed: See mn_gb_import table');
    console.log('   - Upload to Givebutter to sync changes\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const orchestrator = new SyncOrchestrator();

  // Determine sync type from command line args
  const syncType = process.argv[2] || 'periodic';

  if (syncType === 'periodic' || syncType === 'automated') {
    await orchestrator.runPeriodicSync('manual');
  } else {
    console.log('❌ Unknown sync type. Use: periodic | automated\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
