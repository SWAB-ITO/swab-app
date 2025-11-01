/**
 * Check what gb_contact_id values are currently in mentors table
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const conflictedMnIds = ['MN0022', 'MN0151', 'MN0185', 'MN0202', 'MN0217', 'MN0221', 'MN0473', 'MN0640'];

async function checkMentors() {
  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);

  console.log('🔍 Checking mentors table for conflicted MN IDs...\n');

  const { data: mentors } = await supabase
    .from('mentors')
    .select('mn_id, first_name, last_name, gb_contact_id')
    .in('mn_id', conflictedMnIds)
    .order('mn_id');

  console.log('Current mentors table:');
  console.table(mentors);

  console.log('\n🔍 Checking what these gb_contact_ids have in raw_gb_full_contacts...\n');

  for (const mentor of mentors || []) {
    console.log(`${mentor.mn_id} (${mentor.first_name} ${mentor.last_name}):`);
    console.log(`   mentors.gb_contact_id = ${mentor.gb_contact_id}`);

    if (mentor.gb_contact_id) {
      const { data: contact } = await supabase
        .from('raw_gb_full_contacts')
        .select('contact_id, external_id, first_name, last_name')
        .eq('contact_id', mentor.gb_contact_id)
        .single();

      if (contact) {
        console.log(`   Contact in raw_gb_full_contacts:`);
        console.log(`      Name: ${contact.first_name} ${contact.last_name}`);
        console.log(`      External ID: "${contact.external_id || '(none)'}"`);

        if (!contact.external_id) {
          console.log(`   ⚠️  This contact has NO External ID (junk contact)`);
        } else if (contact.external_id === mentor.mn_id) {
          console.log(`   ✅ External ID matches (correct)`);
        } else {
          console.log(`   ❌ External ID MISMATCH: has "${contact.external_id}", expected "${mentor.mn_id}"`);
        }
      } else {
        console.log(`   ❌ Contact ${mentor.gb_contact_id} NOT FOUND in raw_gb_full_contacts`);
      }
    } else {
      console.log(`   ℹ️  No gb_contact_id set`);
    }

    // Also check if the CORRECT contact exists
    const { data: correctContact } = await supabase
      .from('raw_gb_full_contacts')
      .select('contact_id, first_name, last_name')
      .eq('external_id', mentor.mn_id)
      .single();

    if (correctContact) {
      console.log(`   ✅ CORRECT contact exists: ${correctContact.contact_id} (${correctContact.first_name} ${correctContact.last_name})`);
      if (mentor.gb_contact_id !== correctContact.contact_id) {
        console.log(`   ⚠️  MISMATCH! Should be ${correctContact.contact_id}, but mentors table has ${mentor.gb_contact_id}`);
      }
    }

    console.log('');
  }
}

checkMentors().catch(console.error);
