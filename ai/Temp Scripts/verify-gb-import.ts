import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verify() {
  // Check total counts
  const { count: mentorCount } = await supabase.from('mentors').select('*', { count: 'exact', head: true });
  const { count: droppedCount } = await supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('status_category', 'dropped');
  const { count: activeCount } = await supabase.from('mentors').select('*', { count: 'exact', head: true }).neq('status_category', 'dropped');
  const { count: importCount } = await supabase.from('mn_gb_import').select('*', { count: 'exact', head: true });

  console.log('📊 Counts:');
  console.log('  Total mentors:', mentorCount);
  console.log('  Dropped mentors:', droppedCount);
  console.log('  Active mentors:', activeCount);
  console.log('  GB import rows:', importCount);
  console.log('  Math check:', mentorCount, '-', droppedCount, '=', (mentorCount! - droppedCount!), '(should equal', importCount + ')');

  // Check if any dropped mentors are in GB import
  const { data: importIds } = await supabase.from('mn_gb_import').select('mn_id');
  const importSet = new Set(importIds?.map(r => r.mn_id));

  const { data: droppedMentors } = await supabase.from('mentors').select('mn_id').eq('status_category', 'dropped');

  const droppedInImport = droppedMentors?.filter(m => importSet.has(m.mn_id));

  console.log('\n❌ Dropped mentors in GB import:', droppedInImport?.length || 0);
  if (droppedInImport && droppedInImport.length > 0) {
    console.log('  ERROR: These should NOT be in GB import!');
    droppedInImport.forEach(m => console.log('    -', m.mn_id));
  }

  // Check if new signups are in GB import
  const newSignups = ['MN1001', 'MN1002', 'MN1003', 'MN1004'];
  console.log('\n✅ New signups in GB import:');
  for (const mnId of newSignups) {
    const inImport = importSet.has(mnId);
    console.log('  ' + mnId + ':', inImport ? '✓ YES' : '✗ NO');
  }

  // Check if all active mentors are in GB import
  const { data: activeMentors } = await supabase.from('mentors').select('mn_id').neq('status_category', 'dropped');
  const missingFromImport = activeMentors?.filter(m => !importSet.has(m.mn_id));

  console.log('\n⚠️  Active mentors missing from GB import:', missingFromImport?.length || 0);
  if (missingFromImport && missingFromImport.length > 0) {
    console.log('  First 10:');
    missingFromImport.slice(0, 10).forEach(m => console.log('    -', m.mn_id));
  }

  console.log('\n' + '='.repeat(60));
  if (droppedInImport?.length === 0 && missingFromImport?.length === 0 && importCount === activeCount) {
    console.log('✅ GB IMPORT TABLE IS FULLY CORRECT!');
  } else {
    console.log('❌ GB IMPORT TABLE HAS ISSUES - SEE ABOVE');
  }
  console.log('='.repeat(60));
}

verify();
