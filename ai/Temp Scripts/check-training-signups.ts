/**
 * CHECK TRAINING SIGNUPS
 *
 * Queries the database to find how many mentors have not completed their training signup.
 *
 * Usage: npx tsx backend/scripts/check-training-signups.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function checkTrainingSignups() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 CHECKING MENTOR TRAINING SIGNUPS');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get total number of mentors
  const { count: totalMentors, error: totalError } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error fetching total mentors:', totalError);
    process.exit(1);
  }

  console.log(`📊 Total Mentors: ${totalMentors}\n`);

  // Get mentors who have completed training signup
  const { count: completedCount, error: completedError } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .eq('training_signup_done', true);

  if (completedError) {
    console.error('❌ Error fetching completed signups:', completedError);
    process.exit(1);
  }

  console.log(`✅ Training Signup Complete: ${completedCount}`);

  // Get mentors who have NOT completed training signup
  const { count: notCompletedCount, error: notCompletedError } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .or('training_signup_done.eq.false,training_signup_done.is.null');

  if (notCompletedError) {
    console.error('❌ Error fetching incomplete signups:', notCompletedError);
    process.exit(1);
  }

  console.log(`❌ Training Signup NOT Complete: ${notCompletedCount}`);

  // Calculate percentage
  const percentageComplete = totalMentors ? ((completedCount || 0) / totalMentors * 100).toFixed(1) : 0;
  const percentageIncomplete = totalMentors ? ((notCompletedCount || 0) / totalMentors * 100).toFixed(1) : 0;

  console.log('\n' + '-'.repeat(80));
  console.log(`📈 Completion Rate: ${percentageComplete}% (${completedCount}/${totalMentors})`);
  console.log(`📉 Incomplete Rate: ${percentageIncomplete}% (${notCompletedCount}/${totalMentors})`);
  console.log('-'.repeat(80) + '\n');

  // Get some sample data of mentors who haven't completed
  const { data: incompleteMentors, error: sampleError } = await supabase
    .from('mentors')
    .select('mn_id, first_name, last_name, personal_email, uga_email, training_signup_done')
    .or('training_signup_done.eq.false,training_signup_done.is.null')
    .limit(10);

  if (sampleError) {
    console.error('❌ Error fetching sample data:', sampleError);
  } else if (incompleteMentors && incompleteMentors.length > 0) {
    console.log('📋 Sample of mentors who have NOT completed training signup (first 10):\n');
    incompleteMentors.forEach((mentor, index) => {
      console.log(`${index + 1}. ${mentor.first_name} ${mentor.last_name}`);
      console.log(`   MN ID: ${mentor.mn_id}`);
      console.log(`   Email: ${mentor.personal_email || mentor.uga_email || 'N/A'}`);
      console.log(`   Training Signup Done: ${mentor.training_signup_done ?? 'null'}`);
      console.log('');
    });
  }

  console.log('='.repeat(80) + '\n');
}

checkTrainingSignups().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
