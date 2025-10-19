/**
 * Givebutter Import Export Script
 *
 * Exports mn_gb_import table to CSV format compatible with Givebutter's contact import.
 *
 * IMPORTANT: This script does NOT populate mn_gb_import - that's done by the ETL process.
 * This script ONLY reads from mn_gb_import and generates the CSV file.
 *
 * Usage: npm run gb:export
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(__dirname, '../data');
const OUTPUT_FILENAME = `givebutter-import-${new Date().toISOString().split('T')[0]}.csv`;
const OUTPUT_PATH = resolve(OUTPUT_DIR, OUTPUT_FILENAME);

async function exportGivebutterImport() {
  console.log('\n' + '='.repeat(80));
  console.log('📤 EXPORTING GIVEBUTTER IMPORT CSV');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log(`🔗 Connected to Supabase: ${config.url}\n`);

  try {
    // Read from mn_gb_import table (populated by ETL)
    console.log('📋 Reading from mn_gb_import table...\n');

    const { data: imports, error } = await supabase
      .from('mn_gb_import')
      .select('*')
      .order('mn_id', { ascending: true });

    if (error) {
      throw error;
    }

    if (!imports || imports.length === 0) {
      console.log('⚠️  No records found in mn_gb_import table');
      console.log('   Run the ETL process first: npm run etl');
      return;
    }

    console.log(`✅ Found ${imports.length} records in mn_gb_import\n`);

    // Log sample of Prefix field values to verify preferred names
    console.log('📊 Sample of Prefix field values (first 5 records):');
    imports.slice(0, 5).forEach(record => {
      console.log(`   ${record.mn_id}: Prefix="${record['Prefix']}", First="${record['First Name']}"`);
    });
    console.log();

    // Check how many have non-null Prefix values
    const withPrefix = imports.filter(r => r['Prefix']).length;
    console.log(`✓ Records with Prefix: ${withPrefix}/${imports.length}\n`);

    if (withPrefix === 0) {
      console.log('⚠️  WARNING: No records have Prefix field populated!');
      console.log('   The ETL process may not be correctly mapping preferred_name → Prefix');
      console.log('   Check backend/core/etl/process.ts → buildGbImportRow() function\n');
    }

    console.log(`📁 Writing to: ${OUTPUT_PATH}\n`);

    // Create CSV writer with Givebutter's expected columns
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
        '📧 Custom Email Message 1️⃣',
        '📱Custom Text Message 1️⃣'
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

      // Build CSV row - direct passthrough from mn_gb_import
      const row = {
        'Givebutter Contact ID': record['Givebutter Contact ID'] || '',
        'Contact External ID': record['Contact External ID'] || record.mn_id,
        'Prefix': record['Prefix'] || '',  // This should contain preferred_name from ETL
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
        '📧 Custom Email Message 1️⃣': record['📧 Custom Email Message 1️⃣'] || '',
        '📱Custom Text Message 1️⃣': record['📱Custom Text Message 1️⃣'] || ''
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
    console.log(`   Records read from mn_gb_import: ${imports.length}`);
    console.log(`   Records exported to CSV: ${exported}`);
    console.log(`   Skipped (no email): ${skipped}`);
    console.log(`\n📁 Output file: ${OUTPUT_PATH}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Download the CSV file from: ${OUTPUT_PATH}`);
    console.log(`   2. Log into Givebutter admin panel`);
    console.log(`   3. Navigate to Contacts → Import`);
    console.log(`   4. Upload this CSV file`);
    console.log(`   5. Verify field mappings (especially custom emoji fields)`);
    console.log(`   6. Complete the import to update Givebutter with latest data`);
    console.log();

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportGivebutterImport();