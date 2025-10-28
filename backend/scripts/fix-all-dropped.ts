import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fixAll() {
  // Get ALL GB contacts with Dropped 25
  const { data: contacts } = await supabase
    .from('raw_gb_full_contacts')
    .select('contact_id, external_id')
    .contains('tags', ['Dropped 25'])
    .not('external_id', 'is', null);

  console.log('Found', contacts?.length, 'GB contacts with Dropped 25 tag');
  console.log('Updating all corresponding mentors...\n');

  let updated = 0;
  let alreadyDropped = 0;
  let notFound = 0;

  for (const contact of (contacts || [])) {
    const { data: mentor } = await supabase
      .from('mentors')
      .select('mn_id, status_category')
      .eq('mn_id', contact.external_id)
      .single();

    if (!mentor) {
      console.log('  ✗ No mentor found for', contact.external_id);
      notFound++;
      continue;
    }

    if (mentor.status_category === 'dropped') {
      alreadyDropped++;
      continue;
    }

    const { error } = await supabase
      .from('mentors')
      .update({
        status_category: 'dropped',
        gb_contact_id: contact.contact_id
      })
      .eq('mn_id', contact.external_id);

    if (error) {
      console.log('  ✗ Error updating', contact.external_id, ':', error.message);
    } else {
      console.log('  ✓ Updated', contact.external_id, 'to dropped');
      updated++;
    }
  }

  console.log('\nSummary:');
  console.log('  Updated:', updated);
  console.log('  Already dropped:', alreadyDropped);
  console.log('  Not found:', notFound);

  // Final verification
  const { count: finalCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .eq('status_category', 'dropped');

  console.log('\nFinal count of dropped mentors:', finalCount);
}

fixAll();
