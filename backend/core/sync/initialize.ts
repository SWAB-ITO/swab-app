/**
 * TIER 1: INITIALIZATION WIZARD
 *
 * Guides user through first-time setup:
 * 1. Configure API keys
 * 2. Run initial API sync (Jotform + Givebutter)
 * 3. Run ETL → creates mentors (no contact_ids yet)
 * 4. Prompt for CSV upload
 * 5. Match contacts → capture contact_ids
 * 6. Mark system as initialized
 *
 * Usage: npm run sync:init
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import readline from 'readline';
import { SyncOrchestrator } from './orchestrator';
import { execSync } from 'child_process';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function initializeSystem() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 SYSTEM INITIALIZATION WIZARD');
  console.log('='.repeat(80) + '\n');

  console.log('This wizard will guide you through the first-time setup of the');
  console.log('mentor database sync system.\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Check if already initialized
  const { data: existingConfig } = await supabase
    .from('sync_config')
    .select('system_initialized')
    .eq('id', 1)
    .single();

  if (existingConfig?.system_initialized) {
    console.log('⚠️  System is already initialized.');
    const override = await prompt('   Re-run initialization? (yes/no): ');
    if (override.toLowerCase() !== 'yes') {
      console.log('\n   Exiting...\n');
      rl.close();
      return;
    }
    console.log();
  }

  // ============================================================================
  // STEP 1: Configure API Keys
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('STEP 1: Configure API Keys');
  console.log('─'.repeat(80) + '\n');

  console.log('Please provide your API credentials:\n');

  const jotformApiKey = await prompt('  Jotform API Key: ');
  const jotformSignupFormId = await prompt('  Jotform Signup Form ID: ');
  const jotformSetupFormId = await prompt('  Jotform Setup Form ID: ');
  const givebutterApiKey = await prompt('  Givebutter API Key: ');
  const givebutterCampaignCode = await prompt('  Givebutter Campaign Code: ');

  console.log('\n  Saving configuration...');

  const { error: configError } = await supabase
    .from('sync_config')
    .upsert({
      id: 1,
      jotform_api_key: jotformApiKey,
      jotform_signup_form_id: jotformSignupFormId,
      jotform_setup_form_id: jotformSetupFormId,
      givebutter_api_key: givebutterApiKey,
      givebutter_campaign_code: givebutterCampaignCode,
      configured_by: 'system',
      configured_at: new Date().toISOString(),
    });

  if (configError) {
    console.error('\n  ❌ Error saving configuration:', configError);
    rl.close();
    process.exit(1);
  }

  console.log('  ✅ Configuration saved\n');

  // ============================================================================
  // STEP 2: Run Initial API Sync
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('STEP 2: Initial API Sync');
  console.log('─'.repeat(80) + '\n');

  console.log('Now running initial sync from Jotform and Givebutter APIs...\n');

  const proceed = await prompt('  Continue? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes') {
    console.log('\n  Initialization cancelled.\n');
    rl.close();
    return;
  }

  console.log();

  try {
    execSync('npm run sync:jotform-signups', { stdio: 'inherit' });
    execSync('npm run sync:jotform-setup', { stdio: 'inherit' });
    execSync('npm run sync:givebutter-members', { stdio: 'inherit' });
  } catch (error) {
    console.error('\n  ❌ API sync failed. Check your API keys and try again.\n');
    rl.close();
    process.exit(1);
  }

  console.log('\n  ✅ API sync complete\n');

  // ============================================================================
  // STEP 3: Run ETL
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('STEP 3: ETL Process');
  console.log('─'.repeat(80) + '\n');

  console.log('Running ETL to create mentor records...\n');

  try {
    execSync('npm run etl', { stdio: 'inherit' });
  } catch (error) {
    console.error('\n  ❌ ETL failed.\n');
    rl.close();
    process.exit(1);
  }

  console.log('\n  ✅ ETL complete\n');

  // ============================================================================
  // STEP 4: CSV Upload Instructions
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('STEP 4: Givebutter CSV Upload (REQUIRED)');
  console.log('─'.repeat(80) + '\n');

  console.log('⚠️  IMPORTANT: The system needs Givebutter contact IDs to function.\n');
  console.log('To capture contact IDs:\n');
  console.log('1. Download full contact export from Givebutter:');
  console.log('   → https://givebutter.com/contacts');
  console.log('   → Click "Export" → "Export All Contacts"');
  console.log('   → Save the CSV file\n');
  console.log('2. Upload the CSV to this system:\n');
  console.log('   Run: npm run sync:upload-csv /path/to/givebutter-export.csv\n');
  console.log('3. This will:');
  console.log('   - Store all 40k+ contacts in raw_gb_full_contacts');
  console.log('   - Match contacts to mentors by phone/email');
  console.log('   - Capture contact_ids for bidirectional sync');
  console.log('   - Detect duplicates\n');

  console.log('After uploading the CSV, you\'ll need to:');
  console.log('1. Generate export CSV from mn_gb_import');
  console.log('2. Upload to Givebutter (creates new contacts)');
  console.log('3. Download fresh Givebutter export');
  console.log('4. Upload again to capture new contact IDs\n');

  console.log('This completes the "CSV feedback loop" described in the architecture.\n');

  const uploaded = await prompt('Have you uploaded the CSV? (yes/skip): ');

  if (uploaded.toLowerCase() === 'yes') {
    console.log('\n  ✅ CSV uploaded\n');
  } else {
    console.log('\n  ⚠️  Skipping CSV upload. You can run it later with:');
    console.log('     npm run sync:upload-csv /path/to/csv\n');
  }

  // ============================================================================
  // STEP 5: Mark as Initialized
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('STEP 5: Finalization');
  console.log('─'.repeat(80) + '\n');

  await supabase
    .from('sync_config')
    .update({
      system_initialized: true,
      last_sync_at: new Date().toISOString(),
    })
    .eq('id', 1);

  console.log('✅ System initialization complete!\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('🎉 INITIALIZATION COMPLETE');
  console.log('='.repeat(80) + '\n');

  console.log('Your system is now ready. Here\'s what you can do next:\n');

  console.log('📋 Regular Operations:');
  console.log('   npm run sync                 - Run periodic sync (API-only)');
  console.log('   npm run etl                  - Regenerate mentor data');
  console.log('   npm run sync:api-contacts    - Sync contacts via API\n');

  console.log('📤 CSV Operations:');
  console.log('   npm run sync:upload-csv <path>  - Upload Givebutter CSV');
  console.log('   npm run text:export             - Generate filtered export\n');

  console.log('🔍 Monitoring:');
  console.log('   - Review mn_errors table for conflicts');
  console.log('   - Check sync_log for sync history');
  console.log('   - Check csv_import_log for CSV uploads\n');

  console.log('📖 Documentation:');
  console.log('   See SYNC_ARCHITECTURE.md for full details\n');

  rl.close();
}

initializeSystem();
