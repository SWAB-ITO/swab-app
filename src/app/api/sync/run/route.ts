import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

/**
 * API Route: Run Sync Operations
 *
 * Executes all sync scripts with provided API keys and streams progress
 * POST /api/sync/run
 */

const SYNC_STEPS = [
  {
    name: 'Jotform Signups',
    script: 'backend/core/sync/jotform-signups.ts',
  },
  {
    name: 'Jotform Setup',
    script: 'backend/core/sync/jotform-setup.ts',
  },
  {
    name: 'Jotform Training Signup',
    script: 'backend/core/sync/jotform-training-signup.ts',
  },
  {
    name: 'Givebutter Members',
    script: 'backend/core/sync/givebutter-members.ts',
  },
  {
    name: 'ETL Process',
    script: 'backend/core/etl/process.ts',
  },
];

export async function POST(request: NextRequest) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Load configuration from database
  const { data: config, error: configError } = await supabase
    .from('sync_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (configError || !config) {
    return NextResponse.json(
      { error: 'Sync configuration not found. Please configure APIs first.' },
      { status: 400 }
    );
  }

  const {
    jotform_api_key: jotformApiKey,
    givebutter_api_key: givebutterApiKey,
    jotform_signup_form_id: jotformSignupFormId,
    jotform_setup_form_id: jotformSetupFormId,
    jotform_training_signup_form_id: jotformTrainingSignupFormId,
    givebutter_campaign_code: givebutterCampaignCode,
  } = config;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (step: string, status: string, message?: string) => {
        const data = JSON.stringify({ step, status, message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        for (const syncStep of SYNC_STEPS) {
          sendUpdate(syncStep.name, 'running');

          // Map step name to sync_type
          const syncType = syncStep.name.toLowerCase().replace(/\s+/g, '_');
          const startTime = Date.now();

          // Create log entry
          const { data: logEntry } = await supabase
            .from('sync_log')
            .insert({
              sync_type: syncType,
              status: 'running',
              triggered_by: 'manual',
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          // Run sync with retry logic (up to 3 attempts)
          const result = await runSyncScriptWithRetry(
            syncStep.script,
            {
              JOTFORM_API_KEY: jotformApiKey,
              JOTFORM_SIGNUP_FORM_ID: jotformSignupFormId,
              JOTFORM_SETUP_FORM_ID: jotformSetupFormId,
              JOTFORM_TRAINING_SIGNUP_FORM_ID: jotformTrainingSignupFormId || '252935716589069',
              GIVEBUTTER_API_KEY: givebutterApiKey,
              GIVEBUTTER_CAMPAIGN_ID: givebutterCampaignCode,
            }
          );

          const durationSeconds = Math.round((Date.now() - startTime) / 1000);

          // Update log entry with detailed results
          if (logEntry) {
            await supabase
              .from('sync_log')
              .update({
                status: result.success ? 'completed' : 'failed',
                completed_at: new Date().toISOString(),
                duration_seconds: durationSeconds,
                error_message: result.error || null,
                error_details: result.success ? null : {
                  exitCode: result.exitCode,
                  output: result.output?.substring(0, 5000), // Limit output size
                },
                records_processed: result.recordsProcessed || 0,
                records_inserted: result.recordsInserted || 0,
                records_updated: result.recordsUpdated || 0,
                records_failed: result.recordsFailed || 0,
              })
              .eq('id', logEntry.id);
          }

          if (result.success) {
            const statsMsg = result.recordsInserted
              ? `Successfully synced ${result.recordsInserted} records`
              : 'Successfully synced';
            sendUpdate(syncStep.name, 'completed', statsMsg);
          } else {
            sendUpdate(syncStep.name, 'error', result.error || 'Sync failed - check logs');
          }
        }

        controller.close();
      } catch (error) {
        console.error('Sync error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

interface SyncResult {
  success: boolean;
  output: string;
  exitCode?: number | null;
  error?: string;
  recordsProcessed?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
}

async function runSyncScriptWithRetry(
  scriptPath: string,
  env: Record<string, string>,
  maxRetries: number = 3
): Promise<SyncResult> {
  let lastResult: SyncResult | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      // Exponential backoff: 2s, 4s, 8s...
      const delayMs = Math.pow(2, attempt - 1) * 2000;
      console.log(`⏳ Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    lastResult = await runSyncScript(scriptPath, env);

    if (lastResult.success) {
      if (attempt > 1) {
        console.log(`✅ ${scriptPath} succeeded on attempt ${attempt}`);
      }
      return lastResult;
    }

    console.error(`❌ ${scriptPath} failed on attempt ${attempt}/${maxRetries}`);
  }

  return lastResult!;
}

async function runSyncScript(
  scriptPath: string,
  env: Record<string, string>
): Promise<SyncResult> {
  return new Promise((resolve) => {
    // Read existing .env.local and merge with provided values
    const envVars = {
      ...process.env,
      ...env,
    };

    const child = spawn('tsx', [scriptPath], {
      cwd: process.cwd(),
      env: envVars,
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text);
    });

    child.on('close', (code) => {
      const fullOutput = output + errorOutput;

      // Try to parse statistics from output
      const stats = parseScriptOutput(fullOutput);

      if (code === 0) {
        console.log(`✅ ${scriptPath} completed successfully`);
        resolve({
          success: true,
          output: fullOutput,
          exitCode: code,
          ...stats,
        });
      } else {
        console.error(`❌ ${scriptPath} failed with code ${code}`);
        resolve({
          success: false,
          output: fullOutput,
          exitCode: code,
          error: `Process exited with code ${code}`,
          ...stats,
        });
      }
    });

    child.on('error', (error) => {
      console.error(`❌ ${scriptPath} error:`, error);
      resolve({
        success: false,
        output: output + errorOutput,
        error: error.message,
      });
    });
  });
}

function parseScriptOutput(output: string): {
  recordsProcessed?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsFailed?: number;
} {
  const stats: any = {};

  // Look for patterns like "Total members: 123"
  const totalMatch = output.match(/Total (?:members|submissions|contacts):\s*(\d+)/i);
  if (totalMatch) {
    stats.recordsProcessed = parseInt(totalMatch[1], 10);
  }

  // Look for patterns like "Synced successfully: 120"
  const syncedMatch = output.match(/Synced successfully:\s*(\d+)/i);
  if (syncedMatch) {
    stats.recordsInserted = parseInt(syncedMatch[1], 10);
  }

  // ETL-specific patterns
  // Look for "Unique mentors: X"
  const mentorsMatch = output.match(/Unique mentors:\s*(\d+)/i);
  if (mentorsMatch) {
    stats.recordsProcessed = parseInt(mentorsMatch[1], 10);
  }

  // Look for "Mentors: X" in the Inserted section
  const insertedMatch = output.match(/Inserted:[\s\S]*?Mentors:\s*(\d+)/i);
  if (insertedMatch) {
    stats.recordsInserted = parseInt(insertedMatch[1], 10);
  }

  // API Contact Sync patterns
  // Look for "Contact IDs from mentors: X"
  const contactIdsMatch = output.match(/Contact IDs from mentors:\s*(\d+)/i);
  if (contactIdsMatch) {
    stats.recordsProcessed = parseInt(contactIdsMatch[1], 10);
  }

  // Look for "Successfully upserted: X"
  const upsertedMatch = output.match(/Successfully upserted:\s*(\d+)/i);
  if (upsertedMatch) {
    stats.recordsInserted = parseInt(upsertedMatch[1], 10);
  }

  // Look for patterns like "Errors: 3" or "Errors logged: 3"
  const errorsMatch = output.match(/Errors(?: logged)?:\s*(\d+)/i);
  if (errorsMatch) {
    stats.recordsFailed = parseInt(errorsMatch[1], 10);
  }

  return stats;
}
