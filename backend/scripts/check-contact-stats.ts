/**
 * Check Contact ID Capture Statistics
 */
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkStats() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('📊 CONTACT ID CAPTURE STATISTICS');
  console.log('='.repeat(80) + '\n');

  // Get mentor statistics
  const { data: allMentors } = await supabase.from('mentors').select('mn_id, gb_contact_id, phone, personal_email, uga_email, first_name, last_name');
  const { data: mentorsWithContact } = await supabase.from('mentors').select('mn_id').not('gb_contact_id', 'is', null);
  const { data: mentorsWithoutContact } = await supabase.from('mentors').select('mn_id, phone, personal_email, uga_email, first_name, last_name').is('gb_contact_id', null);

  // Get contact statistics
  const { data: gbContacts } = await supabase.from('raw_gb_full_contacts').select('contact_id, primary_phone, primary_email, first_name, last_name');
  const { data: matchedContacts } = await supabase.from('raw_mn_gb_contacts').select('contact_id, mn_id');

  // Get import logs
  const { data: importLogs } = await supabase.from('csv_import_log').select('*').order('uploaded_at', { ascending: false }).limit(5);

  // Get errors
  const { data: errors } = await supabase.from('mn_errors').select('error_type, severity').eq('resolved', false);

  const totalMentors = allMentors?.length || 0;
  const withContact = mentorsWithContact?.length || 0;
  const withoutContact = mentorsWithoutContact?.length || 0;
  const matchPercentage = totalMentors > 0 ? ((withContact / totalMentors) * 100).toFixed(2) : '0.00';

  console.log('📋 Mentor Statistics:');
  console.log(`   Total mentors: ${totalMentors}`);
  console.log(`   With contact_id: ${withContact} (${matchPercentage}%)`);
  console.log(`   Without contact_id: ${withoutContact}`);
  console.log();

  console.log('📇 Givebutter Contact Statistics:');
  console.log(`   Total contacts in raw_gb_full_contacts: ${gbContacts?.length || 0}`);
  console.log(`   Matched to mentors (raw_mn_gb_contacts): ${matchedContacts?.length || 0}`);
  console.log();

  if (importLogs && importLogs.length > 0) {
    console.log('📥 Recent CSV Imports:');
    importLogs.forEach(log => {
      console.log(`   ${log.filename}`);
      console.log(`     Total contacts: ${log.total_contacts}`);
      console.log(`     Mentors matched: ${log.mentors_matched}`);
      console.log(`     New contact IDs: ${log.new_contact_ids_captured}`);
      console.log(`     Duplicates: ${log.duplicates_detected}`);
      console.log(`     Uploaded: ${new Date(log.uploaded_at).toLocaleString()}`);
      console.log();
    });
  } else {
    console.log('📥 CSV Imports: None yet\n');
  }

  if (errors && errors.length > 0) {
    console.log('⚠️  Active Errors:');
    const errorCounts = errors.reduce((acc: any, err) => {
      const key = `${err.error_type} (${err.severity})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    Object.entries(errorCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log();
  }

  // Analyze unmatched mentors
  if (withoutContact > 0 && mentorsWithoutContact) {
    console.log('🔍 Sample Unmatched Mentors (first 10):');
    console.log('   (Checking why they didn\'t match...)\n');

    const sample = mentorsWithoutContact.slice(0, 10);

    for (const mentor of sample) {
      console.log(`   ${mentor.mn_id} - ${mentor.first_name} ${mentor.last_name}`);
      console.log(`     Phone: ${mentor.phone}`);
      console.log(`     Personal Email: ${mentor.personal_email || 'N/A'}`);
      console.log(`     UGA Email: ${mentor.uga_email || 'N/A'}`);

      // Check if contact exists with matching phone
      if (gbContacts) {
        const phoneMatch = gbContacts.find(c => {
          if (!c.primary_phone || !mentor.phone) return false;
          const normContactPhone = c.primary_phone.replace(/\D/g, '').slice(-10);
          const normMentorPhone = mentor.phone.replace(/\D/g, '').slice(-10);
          return normContactPhone === normMentorPhone;
        });

        if (phoneMatch) {
          console.log(`     ⚠️  FOUND PHONE MATCH: Contact ${phoneMatch.contact_id} - ${phoneMatch.first_name} ${phoneMatch.last_name}`);
          console.log(`        Contact phone: ${phoneMatch.primary_phone}`);
        }

        // Check email matches
        const emailMatch = gbContacts.find(c => {
          if (!c.primary_email) return false;
          const normEmail = c.primary_email.toLowerCase().trim();
          return normEmail === mentor.personal_email?.toLowerCase().trim() ||
                 normEmail === mentor.uga_email?.toLowerCase().trim();
        });

        if (emailMatch) {
          console.log(`     ⚠️  FOUND EMAIL MATCH: Contact ${emailMatch.contact_id} - ${emailMatch.first_name} ${emailMatch.last_name}`);
          console.log(`        Contact email: ${emailMatch.primary_email}`);
        }

        if (!phoneMatch && !emailMatch) {
          console.log(`     ❌ No matching contact found in Givebutter`);
        }
      }
      console.log();
    }
  }

  console.log('='.repeat(80));
  console.log('✅ Analysis Complete');
  console.log('='.repeat(80) + '\n');
}

checkStats();
