import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkCounts() {
  // Get total count
  const { count: total, error: totalError } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  // Get dropped count
  const { count: dropped, error: droppedError } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .eq('dropped', true);

  console.log('\n📊 MENTOR COUNTS:');
  console.log('─'.repeat(40));
  console.log(`Total mentors in DB:     ${total}`);
  console.log(`Dropped (dropped=true):  ${dropped}`);
  console.log(`Active:                  ${(total || 0) - (dropped || 0)}`);
  console.log('─'.repeat(40));
  console.log(`\nGivebutter shows:        955`);
  console.log(`Expected:                ${total} total OR ${(total || 0) - (dropped || 0)} active`);

  if (total === 955) {
    console.log('\n✅ MATCH: 955 = Total mentors (including dropped)');
    console.log('This means Givebutter has ALL mentors including the dropped ones.');
  } else if ((total || 0) - (dropped || 0) === 955) {
    console.log('\n✅ MATCH: 955 = Active mentors only');
    console.log('This means Givebutter is only showing active mentors.');
  } else {
    console.log('\n⚠️  MISMATCH: 955 does not match expected values');
    console.log(`Difference: ${Math.abs(955 - (total || 0))} mentors`);
  }
}

checkCounts();
