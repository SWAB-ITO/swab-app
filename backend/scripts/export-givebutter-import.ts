/**
 * Export Givebutter Import CSV
 *
 * 1. Syncs latest mentor data to mn_gb_import table (formatted for Givebutter)
 * 2. Exports the mn_gb_import table to CSV for Givebutter import
 *
 * Usage: npm run export:givebutter
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_PATH = resolve(process.cwd(), 'backend/data/givebutter-import-' + new Date().toISOString().split('T')[0] + '.csv');

async function exportGivebutterImport() {
  console.log('\n' + '='.repeat(80));
  console.log('📤 SYNCING AND EXPORTING GIVEBUTTER IMPORT CSV');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log(`🔗 Connected to Supabase: ${config.url}\n`);

  try {
    // STEP 1: Sync mentor data to mn_gb_import table
    console.log('📋 Step 1: Syncing mentor data to mn_gb_import table...\n');

    // Fetch all mentors with their latest data
    const { data: mentors, error: mentorError } = await supabase
      .from('mentors')
      .select('*')
      .order('created_at', { ascending: false });

    if (mentorError) {
      throw mentorError;
    }

    if (!mentors || mentors.length === 0) {
      console.log('⚠️ No mentors found to sync');
      return;
    }

    console.log(`✅ Found ${mentors.length} mentors to sync\n`);

    // Prepare records for mn_gb_import table
    const importRecords = [];

    for (const mentor of mentors) {
      // Skip if no email
      const primaryEmail = mentor.personal_email || mentor.uga_email;
      if (!primaryEmail) {
        continue;
      }

      // Determine fundraising status
      let fundraisingStatus = 'Not Started';
      let fullyFundraised = 'No';
      let pageSetup = 'No';

      if (mentor.fundraised_done) {
        fundraisingStatus = 'Complete';
        fullyFundraised = 'Yes';
      } else if (mentor.amount_raised > 0) {
        fundraisingStatus = `In Progress ($${mentor.amount_raised}/$75)`;
        if (mentor.amount_raised >= 75) {
          fullyFundraised = 'Yes';
        }
      }

      if (mentor.campaign_member) {
        pageSetup = 'Yes';
        if (fundraisingStatus === 'Not Started') {
          fundraisingStatus = 'Page Created';
        }
      }

      // Format phone number with +1
      const formattedPhone = mentor.phone ?
        '+1' + mentor.phone.replace(/\D/g, '') : '';

      // Use preferred_name for Prefix (fallback to first_name)
      const preferredName = mentor.preferred_name || mentor.first_name;

      // Create import record
      const importRecord = {
        mn_id: mentor.mn_id,
        'Givebutter Contact ID': mentor.gb_contact_id || null,
        'Contact External ID': mentor.mn_id,
        'Prefix': preferredName,
        'First Name': mentor.first_name,
        'Middle Name': mentor.middle_name || null,
        'Last Name': mentor.last_name,
        'Date of Birth': null,
        'Gender': mentor.gender || null,
        'Employer': null,
        'Title': null,
        'Primary Email': primaryEmail,
        'Email Addresses': mentor.uga_email && mentor.personal_email ? mentor.uga_email : null,
        'Primary Phone Number': formattedPhone,
        'Phone Numbers': null,
        'Email Subscription Status': 'yes',
        'Phone Subscription Status': mentor.phone ? 'yes' : 'no',
        'Address Subscription Status': 'yes',
        'Tags': 'Mentors 2025',
        'Notes': null,
        'Household Name': null,
        'Household Envelope Name': null,
        'Is Household Primary Contact': null,
        '📝 Sign Up Complete': 'Yes',
        '💸 Givebutter Page Setup': pageSetup,
        '📆 Shift Preference': mentor.shift_preference || null,
        '👯‍♂️ Partner Preference': mentor.partner_preference || null,
        '🚂 Mentor Training Complete': mentor.training_done ? 'Yes' : 'No',
        '📈 Fully Fundraised?': fullyFundraised,
        '📧 Custom Email Message 1️⃣': `Fundraising Status: ${fundraisingStatus}\nAmount Raised: $${mentor.amount_raised || 0}`,
        '📱Custom Text Message 1️⃣': `Hi ${preferredName}! Your fundraising status: ${fundraisingStatus}. Amount raised: $${mentor.amount_raised || 0}/75. Keep it up!`,
        needs_sync: false,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      importRecords.push(importRecord);
    }

    console.log(`   Prepared ${importRecords.length} records for upsert\n`);

    // Upsert to mn_gb_import table in batches
    const BATCH_SIZE = 100;
    let upserted = 0;

    for (let i = 0; i < importRecords.length; i += BATCH_SIZE) {
      const batch = importRecords.slice(i, i + BATCH_SIZE);

      const { error: upsertError } = await supabase
        .from('mn_gb_import')
        .upsert(batch, {
          onConflict: 'mn_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error(`❌ Upsert error for batch ${i / BATCH_SIZE + 1}:`, upsertError);
        throw upsertError;
      }

      upserted += batch.length;
      console.log(`   Upserted ${upserted}/${importRecords.length} records...`);
    }

    console.log(`\n✅ Successfully synced ${upserted} records to mn_gb_import table\n`);

    // STEP 2: Export from mn_gb_import table to CSV
    console.log('📋 Step 2: Exporting mn_gb_import table to CSV...\n');

    const { data: imports, error: exportError } = await supabase
      .from('mn_gb_import')
      .select('*')
      .order('created_at', { ascending: false });

    if (exportError) {
      throw exportError;
    }

    if (!imports || imports.length === 0) {
      console.log('⚠️ No records found in mn_gb_import table');
      return;
    }

    console.log(`📁 Writing ${imports.length} records to: ${OUTPUT_PATH}\n`);

    // Create CSV writer with the exact column names for Givebutter
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
        '📝 Sign Up Complete',
        '💸 Givebutter Page Setup',
        '📆 Shift Preference',
        '👯‍♂️ Partner Preference',
        '🚂 Mentor Training Complete',
        '📈 Fully Fundraised?',
        '📧 Custom Message',
        '📱 SMS Status'
      ]
    });

    stringifier.pipe(writeStream);

    let exported = 0;
    let skipped = 0;

    for (const record of imports) {
      // Skip if no primary email
      if (!record['Primary Email']) {
        skipped++;
        continue;
      }

      // Build CSV row with proper field mapping
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
        '📝 Sign Up Complete': record['📝 Sign Up Complete'] || '',
        '💸 Givebutter Page Setup': record['💸 Givebutter Page Setup'] || '',
        '📆 Shift Preference': record['📆 Shift Preference'] || '',
        '👯‍♂️ Partner Preference': record['👯‍♂️ Partner Preference'] || '',
        '🚂 Mentor Training Complete': record['🚂 Mentor Training Complete'] || '',
        '📈 Fully Fundraised?': record['📈 Fully Fundraised?'] || '',
        '📧 Custom Message': record['📧 Custom Email Message 1️⃣'] || '',
        '📱 SMS Status': record['📱Custom Text Message 1️⃣'] || ''
      };

      stringifier.write(row);
      exported++;

      if (exported % 100 === 0) {
        console.log(`   Exported ${exported} records...`);
      }
    }

    // End the stream
    stringifier.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ EXPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Results:`);
    console.log(`   Total mentors synced: ${upserted}`);
    console.log(`   Total records exported: ${exported}`);
    console.log(`   Skipped (no email): ${skipped}`);
    console.log(`\n📁 Output file: ${OUTPUT_PATH}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Download the CSV file from the path above');
    console.log('   2. Log into Givebutter admin panel');
    console.log('   3. Navigate to Contacts → Import');
    console.log('   4. Upload this CSV file');
    console.log('   5. Map any custom fields as needed');
    console.log('   6. Complete the import to update all mentor fundraising info');
    console.log();

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportGivebutterImport();