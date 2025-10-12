/**
 * Audit why matching is only getting 33% success rate
 * Check if members who should have contacts are being matched correctly
 */
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { normalizePhone, normalizeEmail } from '../lib/services/contact-matching';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function auditMatching() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('🔍 AUDIT: Why is matching only 33% successful?');
  console.log('='.repeat(80) + '\n');

  // Get mentors with and without contact_id
  const { data: allMentors } = await supabase
    .from('mentors')
    .select('mn_id, phone, personal_email, uga_email, gb_contact_id, gb_member_id');

  // Get all contacts (need to get ALL, not just first 1000)
  const { count: totalContacts } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Data Summary:`);
  console.log(`   Total mentors: ${allMentors?.length}`);
  console.log(`   Total contacts in DB: ${totalContacts?.toLocaleString()}`);
  console.log(`   Mentors with contact_id: ${allMentors?.filter(m => m.gb_contact_id).length}`);
  console.log(`   Mentors who are members: ${allMentors?.filter(m => m.gb_member_id).length}`);
  console.log();

  // Focus on members who should definitely have contacts
  const membersWithoutContact = allMentors?.filter(m => m.gb_member_id && !m.gb_contact_id) || [];

  console.log(`⚠️  CRITICAL ISSUE:`);
  console.log(`   ${membersWithoutContact.length} mentors have member_id but NO contact_id`);
  console.log(`   This should be impossible - members MUST be contacts!`);
  console.log();

  if (membersWithoutContact.length > 0) {
    console.log('🔍 Checking why these members aren\'t matching to contacts...\n');

    // Sample 5 members without contacts
    const sample = membersWithoutContact.slice(0, 5);

    for (const mentor of sample) {
      console.log(`   Mentor: ${mentor.mn_id}`);
      console.log(`     Phone: ${mentor.phone}`);
      console.log(`     Personal Email: ${mentor.personal_email || 'N/A'}`);
      console.log(`     UGA Email: ${mentor.uga_email || 'N/A'}`);
      console.log(`     Member ID: ${mentor.gb_member_id}`);

      // Try to find matching contacts manually
      const normPhone = normalizePhone(mentor.phone);
      const normPersonal = normalizeEmail(mentor.personal_email);
      const normUga = normalizeEmail(mentor.uga_email);

      // Search by phone
      let matches = 0;
      if (normPhone) {
        const { count } = await supabase
          .from('raw_gb_full_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('primary_phone', normPhone);

        if (count && count > 0) {
          console.log(`     ✅ FOUND ${count} contact(s) by phone: ${normPhone}`);
          matches += count;
        }
      }

      // Search by personal email
      if (normPersonal) {
        const { count } = await supabase
          .from('raw_gb_full_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('primary_email', normPersonal);

        if (count && count > 0) {
          console.log(`     ✅ FOUND ${count} contact(s) by personal email: ${normPersonal}`);
          matches += count;
        }
      }

      // Search by UGA email
      if (normUga) {
        const { count } = await supabase
          .from('raw_gb_full_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('primary_email', normUga);

        if (count && count > 0) {
          console.log(`     ✅ FOUND ${count} contact(s) by UGA email: ${normUga}`);
          matches += count;
        }
      }

      if (matches === 0) {
        console.log(`     ❌ NO MATCHES FOUND - Why is this member not a contact?`);
      }
      console.log();
    }
  }

  // Check non-members without contacts
  const nonMembersWithoutContact = allMentors?.filter(m => !m.gb_member_id && !m.gb_contact_id) || [];

  console.log(`📋 Non-members without contacts: ${nonMembersWithoutContact.length}`);
  console.log(`   This is expected - not all mentors have started fundraising yet`);
  console.log();

  console.log('='.repeat(80) + '\n');
}

auditMatching();
