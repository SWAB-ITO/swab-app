/**
 * Pull training_done and training_at from production to local
 *
 * This preserves manually-marked training attendance from production
 * without overwriting other local development data.
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

// Production credentials
const PROD_URL = process.env.PROD_SUPABASE_URL || 'https://tetcwuekhunihcvpfbwh.supabase.co';
const PROD_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Local credentials
const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function pullTrainingData() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 PULLING TRAINING DATA FROM PRODUCTION');
  console.log('='.repeat(80) + '\n');

  if (!PROD_KEY || !LOCAL_KEY) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('   PROD_SUPABASE_SERVICE_ROLE_KEY:', PROD_KEY ? 'SET' : 'MISSING');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', LOCAL_KEY ? 'SET' : 'MISSING');
    process.exit(1);
  }

  const prodClient = createClient(PROD_URL, PROD_KEY);
  const localClient = createClient(LOCAL_URL, LOCAL_KEY);

  console.log(`🔗 Production: ${PROD_URL}`);
  console.log(`🔗 Local: ${LOCAL_URL}\n`);

  // Fetch training data from production
  console.log('📥 Fetching training data from production...\n');

  const { data: prodMentors, error: prodError } = await prodClient
    .from('mentors')
    .select('mn_id, training_done, training_at')
    .not('training_done', 'is', null);

  if (prodError) {
    console.error('❌ Error fetching from production:', prodError);
    process.exit(1);
  }

  const mentorsWithTraining = prodMentors?.filter(m => m.training_done) || [];

  console.log(`✅ Found ${mentorsWithTraining.length} mentors with training marked in production\n`);

  if (mentorsWithTraining.length === 0) {
    console.log('⚠️  No training data to sync\n');
    return;
  }

  // Show sample
  console.log('📋 Sample records:');
  console.table(mentorsWithTraining.slice(0, 5).map(m => ({
    mn_id: m.mn_id,
    training_done: m.training_done,
    training_at: m.training_at,
  })));
  console.log();

  // Update local database
  console.log('💾 Updating local database...\n');

  let updated = 0;
  let errors = 0;

  for (const mentor of mentorsWithTraining) {
    const { error: updateError } = await localClient
      .from('mentors')
      .update({
        training_done: mentor.training_done,
        training_at: mentor.training_at,
      })
      .eq('mn_id', mentor.mn_id);

    if (updateError) {
      console.error(`   ❌ Error updating ${mentor.mn_id}:`, updateError.message);
      errors++;
    } else {
      updated++;
      if (updated % 50 === 0) {
        console.log(`   Updated ${updated}/${mentorsWithTraining.length} mentors...`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ SYNC COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Results:`);
  console.log(`   Mentors with training in prod: ${mentorsWithTraining.length}`);
  console.log(`   Successfully updated in local: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log();
}

pullTrainingData();
