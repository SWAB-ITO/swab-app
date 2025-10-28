/**
 * SYNC CORRECT MENTOR INFO TO GIVEBUTTER IMPORT - OCTOBER 27, 2025
 *
 * Syncs the current, correct mentor information from the mentors table
 * to the mn_gb_import table after all database fixes have been applied.
 *
 * This script:
 * - Fetches ALL active mentors (those with current signups)
 * - Transforms their data to the Givebutter import format
 * - Updates/inserts into mn_gb_import table with correct values
 * - Exports a clean CSV ready for upload to Givebutter
 *
 * Usage:
 *   npx tsx backend/features/comms/gb_imports/sync-correct-info-10.27/sync-mentor-info.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================================
// TYPES
// ============================================================================

interface Mentor {
  mn_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  personal_email: string | null;
  uga_email: string | null;
  phone: string | null;
  gender: string | null;
  shirt_size: string | null;
  shift_preference: string | null;
  partner_preference: string | null;
  amount_raised: number | null;
  fundraised_done: boolean | null;
  training_done: boolean | null;
  training_signup_done: boolean | null;
  gb_contact_id: string | null;
  gb_member_id: string | null;
  fundraising_page_url: string | null;
  notes: string | null;
}

interface GBImportRow {
  mn_id: string;
  'Givebutter Contact ID': string;
  'Contact External ID': string;
  'Prefix': string;
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Primary Email': string;
  'Primary Phone Number': string;
  'Email Addresses': string;
  'Phone Numbers': string;
  'Gender': string;
  'Date of Birth': string;
  'Employer': string;
  'Title': string;
  'Household Name': string;
  'Household Envelope Name': string;
  'Is Household Primary Contact': string;
  'Tags': string;
  'Notes': string;
  'Email Subscription Status': string;
  'Phone Subscription Status': string;
  'Address Subscription Status': string;
  '✅ Mentor Training Signed Up?': string;
  '💸 Givebutter Page Setup': string;
  '📆 Shift Preference': string;
  '👯‍♂️ Partner Preference': string;
  '🚂 Mentor Training Complete': string;
  '📈 Fully Fundraised': string;
  '💰 Amount Fundraised': string;
  '📱Custom Text Message 1️⃣': string;
  '📱Custom Text Message 2️⃣': string;
  '📧 Custom Email Message 1️⃣': string;
  needs_sync: boolean;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function transformMentorToGBImport(mentor: Mentor): GBImportRow {
  // Determine page setup status
  let pageSetup = 'No';
  if (mentor.gb_member_id) {
    pageSetup = 'Yes';
  }

  // Determine training status
  const trainingSignedUp = mentor.training_signup_done ? 'Yes' : 'No';
  const trainingComplete = mentor.training_done ? 'Yes' : 'No';

  // Determine fundraising status
  const fullyFundraised = mentor.fundraised_done || (mentor.amount_raised || 0) >= 75 ? 'Yes' : 'No';

  // Format amount raised
  const amountRaised = (mentor.amount_raised || 0).toString();

  // Primary email (prefer personal, fallback to UGA)
  const primaryEmail = mentor.personal_email || mentor.uga_email || '';

  // Format shift preference
  const shiftPreference = mentor.shift_preference || '';

  // Format partner preference
  const partnerPreference = mentor.partner_preference || '';

  return {
    mn_id: mentor.mn_id,
    'Givebutter Contact ID': mentor.gb_contact_id || '',
    'Contact External ID': mentor.mn_id,
    'Prefix': '',
    'First Name': mentor.first_name,
    'Middle Name': mentor.middle_name || '',
    'Last Name': mentor.last_name,
    'Primary Email': primaryEmail,
    'Primary Phone Number': mentor.phone || '',
    'Email Addresses': '',
    'Phone Numbers': '',
    'Gender': mentor.gender || '',
    'Date of Birth': '',
    'Employer': '',
    'Title': '',
    'Household Name': '',
    'Household Envelope Name': '',
    'Is Household Primary Contact': '',
    'Tags': 'Mentors 2025',
    'Notes': mentor.notes || '',
    'Email Subscription Status': 'yes',
    'Phone Subscription Status': 'yes',
    'Address Subscription Status': 'yes',
    '✅ Mentor Training Signed Up?': trainingSignedUp,
    '💸 Givebutter Page Setup': pageSetup,
    '📆 Shift Preference': shiftPreference,
    '👯‍♂️ Partner Preference': partnerPreference,
    '🚂 Mentor Training Complete': trainingComplete,
    '📈 Fully Fundraised': fullyFundraised,
    '💰 Amount Fundraised': amountRaised,
    '📱Custom Text Message 1️⃣': '',
    '📱Custom Text Message 2️⃣': '',
    '📧 Custom Email Message 1️⃣': '',
    needs_sync: true,
  };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function syncMentorInfo() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 SYNC CORRECT MENTOR INFO TO GIVEBUTTER IMPORT');
  console.log('='.repeat(80) + '\n');
  console.log('This script syncs the current, correct mentor information to mn_gb_import\n');

  // Connect to database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Fetch ACTIVE mentors (only those with current signups)
  console.log('🔍 Fetching active mentors...\n');

  // Get current signup MN IDs
  const { data: signups, error: signupsError } = await supabase
    .from('raw_mn_signups')
    .select('mn_id');

  if (signupsError) {
    console.error('❌ Error fetching signups:', signupsError);
    process.exit(1);
  }

  const activeMnIds = new Set(signups?.map(s => s.mn_id).filter(Boolean) || []);
  console.log(`📋 Found ${activeMnIds.size} active signups\n`);

  // Fetch all mentors and filter to active ones
  const { data: allMentors, error } = await supabase
    .from('mentors')
    .select('*');

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  // Filter to only active mentors
  const mentors = allMentors?.filter(m => activeMnIds.has(m.mn_id)) || [];

  if (mentors.length === 0) {
    console.log('⚠️  No active mentors found\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} active mentors (filtered from ${allMentors?.length || 0} total)\n`);

  // Transform mentors to GB import format
  console.log('🔄 Transforming mentor data...\n');

  const gbImportRows = mentors.map(transformMentorToGBImport);

  // Statistics
  const withContactId = gbImportRows.filter(r => r['Givebutter Contact ID']).length;
  const withMemberId = gbImportRows.filter(r => r['💸 Givebutter Page Setup'] === 'Yes').length;
  const withEmail = gbImportRows.filter(r => r['Primary Email']).length;
  const withPhone = gbImportRows.filter(r => r['Primary Phone Number']).length;
  const trainingSignedUp = gbImportRows.filter(r => r['✅ Mentor Training Signed Up?'] === 'Yes').length;
  const fullyFundraised = gbImportRows.filter(r => r['📈 Fully Fundraised'] === 'Yes').length;

  console.log('📊 Data Summary:');
  console.log(`   Total mentors: ${gbImportRows.length}`);
  console.log(`   With GB Contact ID: ${withContactId}`);
  console.log(`   With GB Member ID (page setup): ${withMemberId}`);
  console.log(`   With email: ${withEmail}`);
  console.log(`   With phone: ${withPhone}`);
  console.log(`   Training signed up: ${trainingSignedUp}`);
  console.log(`   Fully fundraised: ${fullyFundraised}`);
  console.log();

  // Update mn_gb_import table
  console.log('💾 Updating mn_gb_import table...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const row of gbImportRows) {
    const { mn_id, needs_sync, ...updateData } = row;

    const { error: updateError } = await supabase
      .from('mn_gb_import')
      .upsert({
        mn_id,
        ...updateData,
        needs_sync: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'mn_id'
      });

    if (updateError) {
      console.error(`❌ Error updating ${mn_id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }

    // Progress indicator every 50 records
    if (successCount % 50 === 0) {
      process.stdout.write(`   Processed ${successCount}/${gbImportRows.length}...\r`);
    }
  }

  console.log(`\n✅ Updated ${successCount} records successfully`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} records`);
  }
  console.log();

  // Export CSV
  console.log('📤 Exporting CSV...\n');

  const OUTPUT_PATH = resolve(__dirname, 'givebutter-import-sync-2025-10-27.csv');

  // Create a Set for quick lookup of active mentor IDs
  const activeMnIdsSet = new Set(gbImportRows.map(r => r.mn_id));

  // Fetch all records (avoiding URI too long error), then filter in JS
  const { data: allExportData, error: exportError } = await supabase
    .from('mn_gb_import')
    .select('*')
    .order('mn_id', { ascending: true });

  if (exportError) {
    console.error('❌ Error fetching export data:', exportError);
    process.exit(1);
  }

  // Filter to only active mentors
  const exportData = allExportData?.filter(r => activeMnIdsSet.has(r.mn_id)) || [];

  if (!exportData || exportData.length === 0) {
    console.error('❌ No data to export');
    process.exit(1);
  }

  const writeStream = createWriteStream(OUTPUT_PATH);
  const stringifier = stringify({
    header: true,
    columns: [
      'Givebutter Contact ID',
      'Contact External ID',
      'Prefix',
      'First Name',
      'Middle Name',
      'Last Name',
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
      'Tags',
      'Notes',
      'Email Subscription Status',
      'Phone Subscription Status',
      'Address Subscription Status',
      '💸 Givebutter Page Setup',
      '📆 Shift Preference',
      '👯‍♂️ Partner Preference',
      '🚂 Mentor Training Complete',
      '✅ Mentor Training Signed Up?',
      '📈 Fully Fundraised',
      '📱Custom Text Message 1️⃣',
      '📧 Custom Email Message 1️⃣',
      '💰 Amount Fundraised',
      '📱Custom Text Message 2️⃣'
    ]
  });

  stringifier.pipe(writeStream);

  for (const record of exportData) {
    if (!record['Primary Email']) continue;

    const row = {
      'Givebutter Contact ID': record['Givebutter Contact ID'] || '',
      'Contact External ID': record['Contact External ID'] || record.mn_id,
      'Prefix': record['Prefix'] || '',
      'First Name': record['First Name'] || '',
      'Middle Name': record['Middle Name'] || '',
      'Last Name': record['Last Name'] || '',
      'Date of Birth': record['Date of Birth'] || '',
      'Gender': record['Gender'] || '',
      'Employer': record['Employer'] || '',
      'Title': record['Title'] || '',
      'Primary Email': record['Primary Email'] || '',
      'Additional Emails': record['Email Addresses'] || '',
      'Primary Phone': record['Primary Phone Number'] || '',
      'Additional Phones': record['Phone Numbers'] || '',
      'Address Line 1': '',
      'Address Line 2': '',
      'City': '',
      'State': '',
      'Postal Code': '',
      'Country': '',
      'Tags': record['Tags'] || 'Mentors 2025',
      'Notes': record['Notes'] || '',
      'Email Subscription Status': record['Email Subscription Status'] || 'yes',
      'Phone Subscription Status': record['Phone Subscription Status'] || 'yes',
      'Address Subscription Status': record['Address Subscription Status'] || 'yes',
      '💸 Givebutter Page Setup': record['💸 Givebutter Page Setup'] || '',
      '📆 Shift Preference': record['📆 Shift Preference'] || '',
      '👯‍♂️ Partner Preference': record['👯‍♂️ Partner Preference'] || '',
      '🚂 Mentor Training Complete': record['🚂 Mentor Training Complete'] || '',
      '✅ Mentor Training Signed Up?': record['✅ Mentor Training Signed Up?'] || '',
      '📈 Fully Fundraised': record['📈 Fully Fundraised'] || '',
      '📱Custom Text Message 1️⃣': record['📱Custom Text Message 1️⃣'] || '',
      '📧 Custom Email Message 1️⃣': record['📧 Custom Email Message 1️⃣'] || '',
      '💰 Amount Fundraised': record['💰 Amount Fundraised'] || '',
      '📱Custom Text Message 2️⃣': record['📱Custom Text Message 2️⃣'] || ''
    };

    stringifier.write(row);
  }

  stringifier.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });

  console.log(`✅ CSV exported successfully!`);
  console.log(`📁 Location: ${OUTPUT_PATH}\n`);

  // Summary
  console.log('='.repeat(80));
  console.log('✅ SYNC COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Total mentors synced: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log(`   CSV records: ${exportData.length}`);
  console.log();

  console.log('📝 Next Steps:');
  console.log('   1. Find the CSV in: backend/features/comms/gb_imports/sync-correct-info-10.27/');
  console.log('   2. Upload to Givebutter: Contacts → Import → Upload CSV');
  console.log('   3. This will update all mentor contacts with the correct information');
  console.log();
}

// Run the sync
syncMentorInfo().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
