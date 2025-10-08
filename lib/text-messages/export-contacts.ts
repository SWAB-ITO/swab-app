/**
 * EXPORT CONTACTS TO GIVEBUTTER CSV
 *
 * Generates a Givebutter-compatible CSV for contact import.
 * Maps mentor data and custom fields to Givebutter's exact column structure.
 *
 * Usage:
 *   npm run text:export              # Export all mentors
 *   npm run text:export -- changed   # Export only mentors needing sync
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../admin/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface MentorExportRow {
  mentor_id: string;
  givebutter_contact_id: number | null;
  display_name: string;
  full_name: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  phone: string;
  uga_email: string | null;
  personal_email: string | null;
  gender: string | null;
  custom_field_status: string;
  custom_field_instructions: string;
  custom_field_mentor_id: string | null;
  needs_sync: boolean;
}

function formatCSVValue(value: any): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportContacts(changedOnly: boolean = false) {
  console.log('\n' + '='.repeat(80));
  console.log('📤 EXPORTING CONTACTS → GIVEBUTTER CSV');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Query mentors with custom fields
  console.log('📋 Fetching mentor data...\n');

  let query = supabase
    .from('mentors')
    .select(`
      mentor_id,
      givebutter_contact_id,
      display_name,
      full_name,
      first_name,
      last_name,
      middle_name,
      phone,
      uga_email,
      personal_email,
      gender,
      mentor_texts!inner(
        custom_field_status,
        custom_field_instructions,
        custom_field_mentor_id,
        needs_sync
      )
    `);

  if (changedOnly) {
    query = query.eq('mentor_texts.needs_sync', true);
  }

  const { data: mentors, error } = await query;

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  if (!mentors || mentors.length === 0) {
    console.log('⚠️  No mentors found to export\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} mentors to export\n`);

  // Breakdown by status
  const breakdown = {
    with_contact: mentors.filter(m => m.givebutter_contact_id).length,
    without_contact: mentors.filter(m => !m.givebutter_contact_id).length,
    needs_sync: mentors.filter((m: any) => m.mentor_texts.needs_sync).length,
  };

  console.log('📊 Breakdown:');
  console.log(`   With Givebutter contact ID: ${breakdown.with_contact}`);
  console.log(`   Without contact ID (will create): ${breakdown.without_contact}`);
  console.log(`   Flagged as needing sync: ${breakdown.needs_sync}\n`);

  // Generate CSV
  console.log('🔨 Generating CSV...\n');

  // Givebutter CSV columns (exact structure from their export)
  const headers = [
    'Givebutter Contact ID',
    'Contact External ID',
    'Prefix',
    'First Name',
    'Middle Name',
    'Last Name',
    'Suffix',
    'Date of Birth',
    'Gender',
    'Employer',
    'Title',
    'Primary Email',
    'Additional Emails',
    'Primary Phone',
    'Additional Phones',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'Postal Code',
    'Country',
    'Additional Addresses',
    'Website',
    'Twitter',
    'LinkedIn',
    'Facebook',
    'Recurring Contributions',
    'Total Contributions',
    'Total Soft Credits',
    'Engage Email Subscribed',
    'Engage SMS Subscribed',
    'Engage Mail Subscribed',
    'Tags',
    'Notes',
    'Household ID',
    'Household',
    'Household Primary Contact',
    'Date Created (UTC)',
    'Last Modified (UTC)',
    'N/A',
    // Custom fields (these will be updated)
    'Pre-Fill URL',
    'BGC Link',
    'Sign Up Link',
    'BGC Complete?',
    'Sign Up Complete?',
    'Mighty Cause?',
    '$ Raised',
    'Text Instructions',
    '$ Status',
    'Shift'
  ];

  const csvLines: string[] = [];
  csvLines.push(headers.join(','));

  mentors.forEach((mentor: any) => {
    const texts = mentor.mentor_texts;

    // Format phone for Givebutter (they expect E.164 format: +1XXXXXXXXXX)
    const formattedPhone = mentor.phone.startsWith('+') ? mentor.phone : `+1${mentor.phone}`;

    const row = [
      // Basic Info
      formatCSVValue(mentor.givebutter_contact_id || ''),  // Will be blank for new contacts
      formatCSVValue(''),                                   // Contact External ID
      formatCSVValue(''),                                   // Prefix
      formatCSVValue(mentor.first_name),
      formatCSVValue(mentor.middle_name),
      formatCSVValue(mentor.last_name),
      formatCSVValue(''),                                   // Suffix
      formatCSVValue(''),                                   // Date of Birth
      formatCSVValue(mentor.gender),
      formatCSVValue(''),                                   // Employer
      formatCSVValue(''),                                   // Title

      // Contact Info
      formatCSVValue(mentor.uga_email),
      formatCSVValue(mentor.personal_email || ''),         // Additional Emails
      formatCSVValue(formattedPhone),
      formatCSVValue(''),                                   // Additional Phones

      // Address
      formatCSVValue(''),                                   // Address Line 1
      formatCSVValue(''),                                   // Address Line 2
      formatCSVValue(''),                                   // City
      formatCSVValue(''),                                   // State
      formatCSVValue(''),                                   // Postal Code
      formatCSVValue(''),                                   // Country
      formatCSVValue(''),                                   // Additional Addresses

      // Social
      formatCSVValue(''),                                   // Website
      formatCSVValue(''),                                   // Twitter
      formatCSVValue(''),                                   // LinkedIn
      formatCSVValue(''),                                   // Facebook

      // Contributions (read-only, leave blank)
      formatCSVValue(''),                                   // Recurring Contributions
      formatCSVValue(''),                                   // Total Contributions
      formatCSVValue(''),                                   // Total Soft Credits

      // Subscriptions (leave as FALSE to not change existing)
      formatCSVValue('FALSE'),                              // Engage Email Subscribed
      formatCSVValue('FALSE'),                              // Engage SMS Subscribed
      formatCSVValue('FALSE'),                              // Engage Mail Subscribed

      // Tags
      formatCSVValue('Mentors 2025'),                       // Tags
      formatCSVValue(''),                                   // Notes

      // Household
      formatCSVValue(''),                                   // Household ID
      formatCSVValue(''),                                   // Household
      formatCSVValue('FALSE'),                              // Household Primary Contact

      // Timestamps (read-only, leave blank)
      formatCSVValue(''),                                   // Date Created (UTC)
      formatCSVValue(''),                                   // Last Modified (UTC)
      formatCSVValue(''),                                   // N/A

      // Custom Fields
      formatCSVValue(''),                                   // Pre-Fill URL
      formatCSVValue(''),                                   // BGC Link
      formatCSVValue(''),                                   // Sign Up Link
      formatCSVValue(''),                                   // BGC Complete?
      formatCSVValue(''),                                   // Sign Up Complete?
      formatCSVValue(''),                                   // Mighty Cause?
      formatCSVValue(''),                                   // $ Raised
      formatCSVValue(texts.custom_field_instructions),      // Text Instructions ✅
      formatCSVValue(texts.custom_field_status),            // $ Status ✅
      formatCSVValue(''),                                   // Shift
    ];

    csvLines.push(row.join(','));
  });

  // Write to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `givebutter-import-${timestamp}.csv`;
  const filepath = resolve(process.cwd(), 'data', filename);

  writeFileSync(filepath, csvLines.join('\n'), 'utf-8');

  console.log('='.repeat(80));
  console.log('✅ EXPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`📁 File: ${filepath}`);
  console.log(`📊 Contacts: ${mentors.length}`);
  console.log(`💾 Size: ${(csvLines.join('\n').length / 1024).toFixed(2)} KB`);
  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Review CSV for accuracy: head data/' + filename);
  console.log('   2. Validate: npm run text:validate');
  console.log('   3. Import to Givebutter: Contacts → Import → Upload CSV');
  console.log('   4. Re-sync: npm run sync:givebutter-contacts');
  console.log();
}

// Parse args
const changedOnly = process.argv.includes('changed');

if (changedOnly) {
  console.log('🔍 Mode: Export only mentors flagged as needs_sync = true\n');
} else {
  console.log('📦 Mode: Export ALL mentors\n');
}

exportContacts(changedOnly);
