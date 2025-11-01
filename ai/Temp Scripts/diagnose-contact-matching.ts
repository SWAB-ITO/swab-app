/**
 * DIAGNOSTIC: Analyze why Givebutter contacts aren't being matched
 *
 * This script helps identify:
 * 1. How many mentors have no gb_contact_id (null)
 * 2. Why contacts aren't being matched (phone/email issues)
 * 3. Contacts in GB that don't have External IDs set
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { normalizePhone, normalizeEmail } from '../lib/utils/validators';

const config = getSupabaseConfig();
const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

async function diagnoseContactMatching() {
  console.log('================================================================================');
  console.log('🔍 DIAGNOSING CONTACT MATCHING ISSUES');
  console.log('================================================================================\n');

  // 1. Check how many mentors have no gb_contact_id
  console.log('📊 Analyzing mentor contact status...\n');

  const { count: totalMentors } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  const { count: withContact } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .not('gb_contact_id', 'is', null);

  const { count: withoutContact } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .is('gb_contact_id', null);

  console.log(`Total mentors: ${totalMentors}`);
  console.log(`  With gb_contact_id: ${withContact} (${((withContact! / totalMentors!) * 100).toFixed(1)}%)`);
  console.log(`  WITHOUT gb_contact_id: ${withoutContact} (${((withoutContact! / totalMentors!) * 100).toFixed(1)}%)`);
  console.log();

  if (withoutContact! > 0) {
    console.log(`⚠️  ${withoutContact} mentors don't have matching Givebutter contacts!`);
    console.log(`   This means they'll get NEW contacts created when you import to Givebutter.\n`);

    // Sample a few mentors without contacts
    const { data: sampleMentors } = await supabase
      .from('mentors')
      .select('mn_id, first_name, last_name, phone, personal_email, uga_email')
      .is('gb_contact_id', null)
      .limit(5);

    console.log('Sample mentors without gb_contact_id:');
    console.table(sampleMentors);
    console.log();
  }

  // 2. Check Givebutter contacts with no External ID
  console.log('📊 Analyzing Givebutter contacts...\n');

  const { count: totalContacts } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true });

  const { count: contactsWithExtId } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true })
    .not('external_id', 'is', null);

  const { count: contactsWithoutExtId } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true })
    .is('external_id', null);

  console.log(`Total GB contacts: ${totalContacts}`);
  console.log(`  With External ID: ${contactsWithExtId} (${((contactsWithExtId! / totalContacts!) * 100).toFixed(1)}%)`);
  console.log(`  WITHOUT External ID: ${contactsWithoutExtId} (${((contactsWithoutExtId! / totalContacts!) * 100).toFixed(1)}%)`);
  console.log();

  if (contactsWithoutExtId! > 0) {
    console.log(`⚠️  ${contactsWithoutExtId} GB contacts don't have External IDs!`);
    console.log(`   These can be claimed by mentors but require exact phone/email match.\n`);
  }

  // 3. Try to find WHY some mentors aren't matching
  console.log('🔍 Investigating matching failures...\n');

  // Get mentors without contacts
  const { data: unmatchedMentors } = await supabase
    .from('mentors')
    .select('mn_id, phone, personal_email, uga_email')
    .is('gb_contact_id', null)
    .limit(10);

  if (unmatchedMentors && unmatchedMentors.length > 0) {
    console.log('Checking if phone/email matches exist in GB contacts...\n');

    for (const mentor of unmatchedMentors.slice(0, 3)) {
      console.log(`\nMentor ${mentor.mn_id}:`);
      console.log(`  Phone: ${mentor.phone}`);
      console.log(`  Personal Email: ${mentor.personal_email || 'N/A'}`);
      console.log(`  UGA Email: ${mentor.uga_email || 'N/A'}`);

      // Check for phone match
      const { data: phoneMatches } = await supabase
        .from('raw_gb_full_contacts')
        .select('contact_id, external_id, first_name, last_name, primary_phone')
        .eq('primary_phone', mentor.phone);

      // Check for email match
      const { data: emailMatches } = await supabase
        .from('raw_gb_full_contacts')
        .select('contact_id, external_id, first_name, last_name, primary_email')
        .or(`primary_email.eq.${mentor.personal_email},primary_email.eq.${mentor.uga_email}`);

      if (phoneMatches && phoneMatches.length > 0) {
        console.log(`  ✅ Phone match found in GB:`);
        phoneMatches.forEach(c => {
          console.log(`     Contact ${c.contact_id}: ${c.first_name} ${c.last_name} (External ID: ${c.external_id || 'NONE'})`);
        });

        // Check if External ID conflict
        const hasConflict = phoneMatches.some(c => c.external_id && c.external_id !== mentor.mn_id);
        if (hasConflict) {
          console.log(`     ⚠️  EXTERNAL ID CONFLICT: Contact has different External ID!`);
          console.log(`     This prevents matching to avoid claiming wrong contact.`);
        }
      } else {
        console.log(`  ❌ No phone match in GB`);
      }

      if (emailMatches && emailMatches.length > 0) {
        console.log(`  ✅ Email match found in GB:`);
        emailMatches.forEach(c => {
          console.log(`     Contact ${c.contact_id}: ${c.first_name} ${c.last_name} (External ID: ${c.external_id || 'NONE'})`);
        });
      } else {
        console.log(`  ❌ No email match in GB`);
      }
    }
  }

  // 4. Check mn_errors for matching issues
  console.log('\n\n📊 Checking mn_errors for matching issues...\n');

  const { data: matchingErrors } = await supabase
    .from('mn_errors')
    .select('error_type, severity, error_message')
    .in('error_type', [
      'external_id_conflict_skipped',
      'external_id_mismatch',
      'multiple_contacts_auto_resolved',
      'contact_selection_conflict'
    ])
    .limit(10);

  if (matchingErrors && matchingErrors.length > 0) {
    console.log('Recent matching issues:');
    console.table(matchingErrors);
  } else {
    console.log('✅ No recent matching errors logged');
  }

  console.log('\n' + '='.repeat(80));
  console.log('📋 RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log();

  if (contactsWithoutExtId! > totalContacts! * 0.5) {
    console.log('1️⃣  MOST IMPORTANT: Many GB contacts lack External IDs');
    console.log('   → Solution: First import will SET External IDs on existing contacts');
    console.log('   → After first import, matching will improve dramatically');
    console.log();
  }

  if (withoutContact! > totalMentors! * 0.2) {
    console.log('2️⃣  Many mentors don\'t have gb_contact_id (will create new contacts)');
    console.log('   → This is EXPECTED on first import');
    console.log('   → Givebutter will match by phone/email and update External IDs');
    console.log('   → After syncing back from GB, run ETL again to pick up External IDs');
    console.log();
  }

  console.log('3️⃣  Workflow for fixing matching:');
  console.log('   a) Export CSV with current data (many will have null gb_contact_id)');
  console.log('   b) Import to Givebutter (GB will match by phone/email OR create new)');
  console.log('   c) Sync contacts back from Givebutter: npm run sync:givebutter-contacts');
  console.log('   d) Run ETL again: npm run etl');
  console.log('   e) Next export will have much better matching!');
  console.log();
}

diagnoseContactMatching().catch(console.error);
