/**
 * Debug External ID conflicts from Givebutter import
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const conflictedMnIds = ['MN0022', 'MN0151', 'MN0185', 'MN0202', 'MN0217', 'MN0221', 'MN0473', 'MN0640'];
const conflictedContactIds = [27712979, 27713745, 27699688, 27692241, 27717728, 27684122, 27686868, 27712248];

async function debugConflicts() {
  console.log('================================================================================');
  console.log('🔍 DEBUGGING EXTERNAL ID CONFLICTS');
  console.log('================================================================================\n');

  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);

  // 1. Check when raw_gb_full_contacts was last synced
  console.log('📅 Checking raw_gb_full_contacts freshness...');
  const { data: contactStats } = await supabase
    .from('raw_gb_full_contacts')
    .select('last_modified_utc')
    .order('last_modified_utc', { ascending: false })
    .limit(1)
    .single();

  console.log(`   Last contact update: ${contactStats?.last_modified_utc || 'Unknown'}\n`);

  // 2. Check if these External IDs exist in raw_gb_full_contacts
  console.log('🔍 Checking if conflicted External IDs exist in raw_gb_full_contacts...\n');

  for (const mnId of conflictedMnIds) {
    const { data: contacts } = await supabase
      .from('raw_gb_full_contacts')
      .select('contact_id, external_id, first_name, last_name, primary_email')
      .eq('external_id', mnId);

    console.log(`${mnId}:`);
    if (contacts && contacts.length > 0) {
      contacts.forEach(c => {
        console.log(`   ✅ EXISTS in raw_gb_full_contacts`);
        console.log(`      Contact ID: ${c.contact_id}`);
        console.log(`      Name: ${c.first_name} ${c.last_name}`);
        console.log(`      Email: ${c.primary_email}`);
      });
    } else {
      console.log(`   ❌ NOT FOUND in raw_gb_full_contacts`);
    }
    console.log('');
  }

  // 3. Check what our mentors table has for these MN IDs
  console.log('🔍 Checking what gb_contact_id our mentors table has...\n');

  const { data: mentors } = await supabase
    .from('mentors')
    .select('mn_id, first_name, last_name, gb_contact_id')
    .in('mn_id', conflictedMnIds);

  mentors?.forEach(m => {
    console.log(`${m.mn_id} (${m.first_name} ${m.last_name}):`);
    console.log(`   gb_contact_id in mentors table: ${m.gb_contact_id}`);
    const expectedContactId = conflictedContactIds[conflictedMnIds.indexOf(m.mn_id)];
    console.log(`   Contact ID in failed CSV: ${expectedContactId}`);
    console.log(`   ${m.gb_contact_id === expectedContactId ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log('');
  });

  // 4. Check if the contact IDs in the failed CSV have DIFFERENT External IDs
  console.log('🔍 Checking if CSV contact IDs have DIFFERENT External IDs...\n');

  for (let i = 0; i < conflictedMnIds.length; i++) {
    const mnId = conflictedMnIds[i];
    const contactId = conflictedContactIds[i];

    const { data: contact } = await supabase
      .from('raw_gb_full_contacts')
      .select('contact_id, external_id, first_name, last_name')
      .eq('contact_id', contactId)
      .single();

    console.log(`Contact ${contactId} (in CSV for ${mnId}):`);
    if (contact) {
      console.log(`   External ID: ${contact.external_id || '(none)'}`);
      console.log(`   Name: ${contact.first_name} ${contact.last_name}`);
      if (contact.external_id && contact.external_id !== mnId) {
        console.log(`   ⚠️  CONFLICT! This contact already has External ID: ${contact.external_id}`);
      } else if (!contact.external_id) {
        console.log(`   ✅ No External ID yet (safe to claim)`);
      } else {
        console.log(`   ✅ Correct External ID`);
      }
    } else {
      console.log(`   ❌ Contact not found in raw_gb_full_contacts`);
    }
    console.log('');
  }

  console.log('================================================================================');
  console.log('📊 DIAGNOSIS');
  console.log('================================================================================\n');

  console.log('Possible causes:');
  console.log('1. raw_gb_full_contacts is stale (need to re-sync from Givebutter)');
  console.log('2. ETL is matching to wrong contacts (ignoring existing External IDs)');
  console.log('3. Previous imports set External IDs we don\'t know about\n');

  console.log('📋 RECOMMENDED FIX:');
  console.log('1. Sync fresh contacts: npm run sync:givebutter-contacts');
  console.log('2. Re-run ETL: npm run etl');
  console.log('3. Re-export CSV: npm run comms:export\n');
}

debugConflicts().catch(console.error);
