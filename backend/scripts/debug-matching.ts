/**
 * Debug Why Contact Matching Is Failing
 */
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { normalizePhone, normalizeEmail } from '../core/services/contact-matching';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function debugMatching() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUG: Why Contact Matching Failed');
  console.log('='.repeat(80) + '\n');

  // Get sample mentors
  const { data: mentors } = await supabase
    .from('mentors')
    .select('mn_id, phone, personal_email, uga_email, first_name, last_name')
    .limit(10);

  // Get sample contacts
  const { data: contacts } = await supabase
    .from('raw_gb_full_contacts')
    .select('contact_id, external_id, primary_phone, primary_email, first_name, last_name')
    .limit(100);

  console.log('📋 Sample Data Retrieved:');
  console.log(`   Mentors: ${mentors?.length || 0}`);
  console.log(`   Contacts: ${contacts?.length || 0}`);
  console.log();

  if (!mentors || mentors.length === 0) {
    console.log('❌ No mentors found in database!');
    console.log('   Run sync scripts first to populate mentors table');
    return;
  }

  if (!contacts || contacts.length === 0) {
    console.log('❌ No contacts found in raw_gb_full_contacts!');
    return;
  }

  // Test matching logic
  console.log('🧪 Testing Matching Logic:\n');

  let testMatches = 0;
  const sampleMentor = mentors[0];

  console.log(`Testing mentor: ${sampleMentor.mn_id} - ${sampleMentor.first_name} ${sampleMentor.last_name}`);
  console.log(`   Phone: ${sampleMentor.phone}`);
  console.log(`   Normalized: ${normalizePhone(sampleMentor.phone)}`);
  console.log(`   Personal Email: ${sampleMentor.personal_email || 'N/A'}`);
  console.log(`   UGA Email: ${sampleMentor.uga_email || 'N/A'}`);
  console.log();

  // Test external_id matching
  const externalIdMatch = contacts.find(c => c.external_id === sampleMentor.mn_id);
  if (externalIdMatch) {
    console.log(`✅ MATCH BY EXTERNAL_ID: Contact ${externalIdMatch.contact_id}`);
    testMatches++;
  } else {
    console.log(`❌ No external_id match for ${sampleMentor.mn_id}`);
  }

  // Test phone matching
  const mentorNormPhone = normalizePhone(sampleMentor.phone);
  const phoneMatch = contacts.find(c => {
    const contactNormPhone = normalizePhone(c.primary_phone);
    return contactNormPhone && contactNormPhone === mentorNormPhone;
  });

  if (phoneMatch) {
    console.log(`✅ MATCH BY PHONE: Contact ${phoneMatch.contact_id}`);
    console.log(`   Contact phone: ${phoneMatch.primary_phone} → ${normalizePhone(phoneMatch.primary_phone)}`);
    testMatches++;
  } else {
    console.log(`❌ No phone match for ${mentorNormPhone}`);
    console.log(`   Sample contact phones:`);
    contacts.slice(0, 5).forEach(c => {
      if (c.primary_phone) {
        console.log(`      ${c.contact_id}: ${c.primary_phone} → ${normalizePhone(c.primary_phone)}`);
      }
    });
  }

  // Test email matching
  const mentorEmails = [
    normalizeEmail(sampleMentor.personal_email),
    normalizeEmail(sampleMentor.uga_email)
  ].filter(e => e);

  const emailMatch = contacts.find(c => {
    const contactEmail = normalizeEmail(c.primary_email);
    return contactEmail && mentorEmails.includes(contactEmail);
  });

  if (emailMatch) {
    console.log(`✅ MATCH BY EMAIL: Contact ${emailMatch.contact_id}`);
    console.log(`   Contact email: ${emailMatch.primary_email}`);
    testMatches++;
  } else {
    console.log(`❌ No email match for ${mentorEmails.join(', ')}`);
    console.log(`   Sample contact emails:`);
    contacts.slice(0, 5).forEach(c => {
      if (c.primary_email) {
        console.log(`      ${c.contact_id}: ${c.primary_email}`);
      }
    });
  }

  console.log();
  console.log(`🎯 Test Result: ${testMatches} potential match(es) for sample mentor`);
  console.log();

  // Count contacts with data
  const contactsWithPhone = contacts.filter(c => c.primary_phone).length;
  const contactsWithEmail = contacts.filter(c => c.primary_email).length;
  const contactsWithExternal = contacts.filter(c => c.external_id).length;

  console.log('📊 Contact Data Availability (from sample):');
  console.log(`   With phone: ${contactsWithPhone}/${contacts.length}`);
  console.log(`   With email: ${contactsWithEmail}/${contacts.length}`);
  console.log(`   With external_id: ${contactsWithExternal}/${contacts.length}`);
  console.log();

  // Check if mentors have been populated recently
  const { data: recentSync } = await supabase
    .from('sync_log')
    .select('sync_type, started_at, status')
    .order('started_at', { ascending: false })
    .limit(5);

  if (recentSync && recentSync.length > 0) {
    console.log('📅 Recent Sync Operations:');
    recentSync.forEach(log => {
      console.log(`   ${log.sync_type}: ${log.status} at ${new Date(log.started_at).toLocaleString()}`);
    });
    console.log();
  }

  console.log('='.repeat(80) + '\n');
}

debugMatching();
