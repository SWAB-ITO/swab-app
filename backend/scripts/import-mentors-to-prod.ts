/**
 * Import mentors data to production Supabase
 *
 * PREREQUISITES:
 * 1. Production Supabase project created
 * 2. Phase 1 migrations applied to production
 * 3. .env.production file created with production credentials
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read production credentials from .env.production
const PROD_SUPABASE_URL = process.env.PROD_SUPABASE_URL;
const PROD_SUPABASE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!PROD_SUPABASE_URL || !PROD_SUPABASE_KEY) {
  console.error('❌ Missing production credentials!');
  console.error('Set PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

async function importMentorsData() {
  console.log('================================================================================');
  console.log('📥 IMPORTING MENTORS DATA TO PRODUCTION');
  console.log('================================================================================\n');

  console.log('🔗 Production URL:', PROD_SUPABASE_URL);
  console.log('');

  // Find the most recent export file
  const args = process.argv.slice(2);
  let exportFile = args[0];

  if (!exportFile) {
    // Default to today's export
    const today = new Date().toISOString().split('T')[0];
    exportFile = join(process.cwd(), 'backend', 'scripts', `mentors-export-${today}.json`);
  }

  console.log(`📁 Import file: ${exportFile}\n`);

  // Read export file
  let exportData;
  try {
    const fileContent = readFileSync(exportFile, 'utf-8');
    exportData = JSON.parse(fileContent);
  } catch (error: any) {
    console.error('❌ Error reading export file:', error.message);
    process.exit(1);
  }

  console.log('📊 Export stats:');
  console.log(`   Exported at: ${exportData.exported_at}`);
  console.log(`   Total mentors: ${exportData.stats.total_mentors}`);
  console.log(`   Active mentors: ${exportData.stats.active_mentors}\n`);

  const supabase = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_KEY);

  // Test connection
  console.log('🔍 Testing production connection...');
  const { data: testData, error: testError } = await supabase
    .from('mentors')
    .select('count')
    .limit(1);

  if (testError) {
    console.error('❌ Cannot connect to production Supabase:', testError.message);
    console.error('\nMake sure:');
    console.error('1. Production Supabase project exists');
    console.error('2. Phase 1 migrations have been applied');
    console.error('3. Service role key is correct');
    process.exit(1);
  }

  console.log('✅ Connection successful\n');

  // Check if mentors table has data
  const { count: existingCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  if (existingCount && existingCount > 0) {
    console.log(`⚠️  Warning: Production already has ${existingCount} mentors`);
    console.log('This will DELETE existing data and import fresh data.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 1. Clear existing mentors data
  console.log('🗑️  Clearing existing mentors...');
  const { error: deleteError } = await supabase
    .from('mentors')
    .delete()
    .neq('mn_id', ''); // Delete all

  if (deleteError) {
    console.error('❌ Error clearing mentors:', deleteError);
    process.exit(1);
  }
  console.log('✅ Cleared existing data\n');

  // 2. Import sync_configs
  console.log('📊 Importing sync_configs...');
  if (exportData.data.sync_configs.length > 0) {
    const { error: configsError } = await supabase
      .from('sync_configs')
      .upsert(exportData.data.sync_configs, { onConflict: 'year,config_key' });

    if (configsError) {
      console.error('❌ Error importing configs:', configsError);
      process.exit(1);
    }
    console.log(`✅ Imported ${exportData.data.sync_configs.length} config entries\n`);
  }

  // 3. Import mentors in batches (Supabase has limits)
  console.log('📊 Importing mentors...');
  const mentors = exportData.data.mentors;
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil(mentors.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min((i + 1) * BATCH_SIZE, mentors.length);
    const batch = mentors.slice(start, end);

    console.log(`   Batch ${i + 1}/${totalBatches}: Importing ${batch.length} mentors...`);

    const { error: batchError } = await supabase
      .from('mentors')
      .insert(batch);

    if (batchError) {
      console.error(`❌ Error importing batch ${i + 1}:`, batchError);
      process.exit(1);
    }
  }

  console.log(`✅ Imported ${mentors.length} mentors\n`);

  // 4. Verify import
  console.log('🔍 Verifying import...');
  const { count: finalCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  console.log('================================================================================');
  console.log('✅ IMPORT COMPLETE');
  console.log('================================================================================');
  console.log(`📊 Mentors in production: ${finalCount}`);
  console.log(`✅ Expected: ${mentors.length}`);
  console.log(`${finalCount === mentors.length ? '✅' : '❌'} Counts match: ${finalCount === mentors.length}\n`);

  console.log('📋 NEXT STEPS:');
  console.log('1. Update .env.local to use production Supabase URL and keys');
  console.log('2. Restart Next.js dev server');
  console.log('3. Test mentor check-in functionality');
  console.log('4. Test dashboard to view mentors\n');
}

importMentorsData().catch(console.error);
