/**
 * Pull mentor data FROM production TO local
 *
 * Use this after mentor training to get check-in data back to local dev
 */

import { createClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = process.env.PROD_SUPABASE_URL || 'https://tetcwuekhunihcvpfbwh.supabase.co';
const PROD_SUPABASE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!;

const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function pullFromProdToLocal() {
  console.log('================================================================================');
  console.log('📥 PULLING DATA FROM PRODUCTION → LOCAL');
  console.log('================================================================================\n');

  console.log('🔗 Production URL:', PROD_SUPABASE_URL);
  console.log('🔗 Local URL:', LOCAL_SUPABASE_URL);
  console.log('');

  const prodSupabase = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_KEY);
  const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);

  // 1. Fetch mentors from production
  console.log('📊 Fetching mentors from production...');
  const { data: prodMentors, error: prodError } = await prodSupabase
    .from('mentors')
    .select('*')
    .order('mn_id');

  if (prodError) {
    console.error('❌ Error fetching from production:', prodError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${prodMentors?.length || 0} mentors from production\n`);

  // Count how many have training_at set
  const trainedCount = prodMentors?.filter(m => m.training_at).length || 0;
  console.log(`📋 Mentors with training check-in: ${trainedCount}\n`);

  // 2. Clear local mentors
  console.log('🗑️  Clearing local mentors table...');
  const { error: deleteError } = await localSupabase
    .from('mentors')
    .delete()
    .neq('mn_id', ''); // Delete all

  if (deleteError) {
    console.error('❌ Error clearing local mentors:', deleteError);
    process.exit(1);
  }
  console.log('✅ Cleared local data\n');

  // 3. Import to local in batches
  console.log('📊 Importing mentors to local...');
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil((prodMentors?.length || 0) / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min((i + 1) * BATCH_SIZE, prodMentors?.length || 0);
    const batch = prodMentors?.slice(start, end) || [];

    console.log(`   Batch ${i + 1}/${totalBatches}: Importing ${batch.length} mentors...`);

    const { error: batchError } = await localSupabase
      .from('mentors')
      .insert(batch);

    if (batchError) {
      console.error(`❌ Error importing batch ${i + 1}:`, batchError);
      process.exit(1);
    }
  }

  console.log(`✅ Imported ${prodMentors?.length || 0} mentors to local\n`);

  // 4. Verify import
  console.log('🔍 Verifying import...');
  const { count: localCount } = await localSupabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  const { count: localTrainedCount } = await localSupabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .not('training_at', 'is', null);

  console.log('================================================================================');
  console.log('✅ PULL COMPLETE');
  console.log('================================================================================');
  console.log(`📊 Total mentors in local: ${localCount}`);
  console.log(`✅ Expected: ${prodMentors?.length || 0}`);
  console.log(`${localCount === prodMentors?.length ? '✅' : '❌'} Counts match: ${localCount === prodMentors?.length}`);
  console.log(`📋 Mentors with training check-in: ${localTrainedCount}\n`);

  console.log('📋 NEXT STEPS:');
  console.log('1. Run ETL to process training updates: npm run etl');
  console.log('2. Export CSV for Givebutter: npm run comms:export');
  console.log('3. Upload CSV to Givebutter\n');
}

pullFromProdToLocal().catch(console.error);
