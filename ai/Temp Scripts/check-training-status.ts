import { createClient } from '@supabase/supabase-js';

async function checkTrainingStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Count training_done statuses
  const { data: allMentors, error } = await supabase
    .from('mentors')
    .select('mn_id, training_done, training_at');

  if (error) {
    console.error('Error fetching mentors:', error);
    return;
  }

  const trainingDoneTrue = allMentors?.filter(m => m.training_done === true).length || 0;
  const trainingDoneFalse = allMentors?.filter(m => m.training_done === false).length || 0;
  const withTimestamp = allMentors?.filter(m => m.training_at !== null).length || 0;

  console.log('=== Current Database State ===');
  console.log(`Total mentors: ${allMentors?.length || 0}`);
  console.log(`Training done = true: ${trainingDoneTrue}`);
  console.log(`Training done = false: ${trainingDoneFalse}`);
  console.log(`With training_at timestamp: ${withTimestamp}`);

  // Show some examples
  console.log('\n=== Sample Records ===');
  const samples = allMentors?.slice(0, 5) || [];
  samples.forEach(m => {
    console.log(`${m.mn_id}: training_done=${m.training_done}, training_at=${m.training_at}`);
  });
}

checkTrainingStatus()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
