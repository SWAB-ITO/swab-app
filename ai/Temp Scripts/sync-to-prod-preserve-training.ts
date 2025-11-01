/**
 * Sync fresh data to production while preserving training_at and training_done columns
 *
 * This script:
 * 1. Runs local sync + ETL to get fresh data
 * 2. Fetches training data from production
 * 3. Merges fresh data with production training columns
 * 4. Updates production with merged data
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';

const PROD_SUPABASE_URL = process.env.PROD_SUPABASE_URL || 'https://tetcwuekhunihcvpfbwh.supabase.co';
const PROD_SUPABASE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!;

const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Run a command and wait for it to complete
 */
function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${command}`);
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function syncToProdPreserveTraining() {
  console.log('================================================================================');
  console.log('🔄 SYNC TO PRODUCTION (PRESERVE TRAINING DATA)');
  console.log('================================================================================\n');

  console.log('🔗 Production URL:', PROD_SUPABASE_URL);
  console.log('🔗 Local URL:', LOCAL_SUPABASE_URL);
  console.log('');

  const prodSupabase = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_KEY);
  const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);

  // Step 1: Fetch training data from production
  console.log('📊 Step 1: Fetching training data from production...');
  const { data: prodMentors, error: prodError } = await prodSupabase
    .from('mentors')
    .select('mn_id, training_at, training_done')
    .order('mn_id');

  if (prodError) {
    console.error('❌ Error fetching from production:', prodError);
    process.exit(1);
  }

  // Create a map of training data by mn_id
  const trainingMap = new Map<string, { training_at: string | null; training_done: boolean | null }>();
  prodMentors?.forEach(m => {
    trainingMap.set(m.mn_id, {
      training_at: m.training_at,
      training_done: m.training_done,
    });
  });

  const trainedCount = prodMentors?.filter(m => m.training_at).length || 0;
  console.log(`✅ Found ${prodMentors?.length || 0} mentors in production`);
  console.log(`   ${trainedCount} have training check-in data\n`);

  // Step 2: Run local sync (skip training signup sync)
  console.log('📊 Step 2: Running local sync (excluding training signup)...');
  try {
    await runCommand('npm run sync:jotform-signups');
    await runCommand('npm run sync:jotform-setup');
    await runCommand('npm run sync:partner-preference');
    await runCommand('npm run sync:givebutter-members');
    console.log('✅ Local sync complete\n');
  } catch (error) {
    console.error('❌ Local sync failed:', error);
    process.exit(1);
  }

  // Step 3: Run ETL locally
  console.log('📊 Step 3: Running local ETL...');
  try {
    await runCommand('npm run etl');
    console.log('✅ Local ETL complete\n');
  } catch (error) {
    console.error('❌ Local ETL failed:', error);
    process.exit(1);
  }

  // Step 4: Fetch fresh local data
  console.log('📊 Step 4: Fetching fresh local data...');
  const { data: localMentors, error: localError } = await localSupabase
    .from('mentors')
    .select('*')
    .order('mn_id');

  if (localError) {
    console.error('❌ Error fetching local data:', localError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${localMentors?.length || 0} mentors from local\n`);

  // Step 5: Merge training data with fresh local data
  console.log('📊 Step 5: Merging training data with fresh data...');
  const mergedMentors = localMentors?.map(mentor => {
    const trainingData = trainingMap.get(mentor.mn_id);
    return {
      ...mentor,
      training_at: trainingData?.training_at || mentor.training_at,
      training_done: trainingData?.training_done || mentor.training_done,
    };
  });

  console.log(`✅ Merged training data for ${mergedMentors?.length || 0} mentors\n`);

  // Step 6: Update production with merged data
  console.log('📊 Step 6: Updating production with merged data...');
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil((mergedMentors?.length || 0) / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min((i + 1) * BATCH_SIZE, mergedMentors?.length || 0);
    const batch = mergedMentors?.slice(start, end) || [];

    console.log(`   Batch ${i + 1}/${totalBatches}: Upserting ${batch.length} mentors...`);

    const { error: batchError } = await prodSupabase
      .from('mentors')
      .upsert(batch, {
        onConflict: 'mn_id',
      });

    if (batchError) {
      console.error(`❌ Error upserting batch ${i + 1}:`, batchError);
      process.exit(1);
    }
  }

  console.log(`✅ Updated ${mergedMentors?.length || 0} mentors in production\n`);

  // Step 7: Verify update
  console.log('📊 Step 7: Verifying update...');
  const { count: prodCount } = await prodSupabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  const { count: prodTrainedCount } = await prodSupabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .not('training_at', 'is', null);

  console.log('================================================================================');
  console.log('✅ SYNC TO PRODUCTION COMPLETE');
  console.log('================================================================================');
  console.log(`📊 Total mentors in production: ${prodCount}`);
  console.log(`✅ Expected: ${mergedMentors?.length || 0}`);
  console.log(`${prodCount === mergedMentors?.length ? '✅' : '⚠️'} Counts match: ${prodCount === mergedMentors?.length}`);
  console.log(`📋 Mentors with training check-in: ${prodTrainedCount}`);
  console.log(`   (Expected: ${trainedCount}, Actual: ${prodTrainedCount})\n`);

  console.log('💡 Summary:');
  console.log(`   - Fresh data synced from Jotform & Givebutter`);
  console.log(`   - Training data preserved from production`);
  console.log(`   - All other columns updated with latest info\n`);
}

syncToProdPreserveTraining().catch(console.error);
