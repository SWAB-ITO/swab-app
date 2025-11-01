import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const { data: dropped } = await supabase.from('mentors').select('mn_id').eq('status_category', 'dropped');
  const { data: contacts } = await supabase.from('raw_gb_full_contacts').select('external_id').contains('tags', ['Dropped 25']).not('external_id', 'is', null);
  
  const droppedSet = new Set(dropped?.map(m => m.mn_id));
  const contactIds = contacts?.map(c => c.external_id) || [];
  
  console.log('Summary:');
  console.log('- Mentors with dropped status:', droppedSet.size);
  console.log('- GB contacts with "Dropped 25" tag:', contactIds.length);
  console.log('- Difference:', contactIds.length - droppedSet.size);
  console.log('\nMentors that should be dropped but are not:');
  contactIds.forEach(id => { if (!droppedSet.has(id)) console.log('  ' + id); });
}

check();
