/**
 * Verify CSV Export Quality
 * Checks for missing Contact IDs and validates preferred name handling
 */

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSV_PATH = resolve(__dirname, '../features/gb-import/data/givebutter-import-2025-10-17.csv');

interface CsvRow {
  'Givebutter Contact ID': string;
  'Contact External ID': string;
  'Prefix': string;
  'First Name': string;
  'Last Name': string;
}

function verifyCsv() {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFYING CSV EXPORT QUALITY');
  console.log('='.repeat(80) + '\n');

  console.log(`📄 Reading: ${CSV_PATH}\n`);

  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];

  console.log(`Total records: ${records.length}\n`);

  // Check Contact IDs
  const withContactId = records.filter(r => r['Givebutter Contact ID']?.trim());
  const missingContactId = records.filter(r => !r['Givebutter Contact ID']?.trim());

  console.log('📊 Contact ID Status:');
  console.log(`   ✅ With Givebutter Contact ID: ${withContactId.length}`);
  console.log(`   ❌ Missing Contact ID: ${missingContactId.length}`);

  if (missingContactId.length > 0) {
    console.log('\n⚠️  Mentors without Contact IDs:');
    missingContactId.forEach(r => {
      console.log(`   - ${r['Contact External ID']}: ${r['Prefix'] || r['First Name']} ${r['Last Name']}`);
    });
  }

  // Check preferred names
  console.log('\n📊 Preferred Name Status:');
  const withPrefix = records.filter(r => r['Prefix']?.trim());
  const prefixDiffersFromFirst = records.filter(r =>
    r['Prefix']?.trim() && r['Prefix'] !== r['First Name']
  );

  console.log(`   Total with Prefix populated: ${withPrefix.length}`);
  console.log(`   Prefix differs from First Name: ${prefixDiffersFromFirst.length} (${Math.round(prefixDiffersFromFirst.length / records.length * 100)}%)`);

  // Show examples
  console.log('\n📝 Sample Preferred Name Examples:');
  const examples = prefixDiffersFromFirst.slice(0, 5);
  examples.forEach(r => {
    console.log(`   ${r['Contact External ID']}: Legal="${r['First Name']}" Preferred="${r['Prefix']}"`);
  });

  // Final verdict
  console.log('\n' + '='.repeat(80));
  console.log('🎯 VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  if (missingContactId.length === 0) {
    console.log('✅ READY FOR UPLOAD - All mentors have Givebutter Contact IDs');
  } else if (missingContactId.length <= 5) {
    console.log(`⚠️  MOSTLY READY - Only ${missingContactId.length} mentor(s) missing Contact IDs`);
    console.log('   These will be skipped during import (likely new signups not yet in Givebutter)');
  } else {
    console.log(`❌ NOT READY - ${missingContactId.length} mentors missing Contact IDs`);
    console.log('   Run: npm run sync:givebutter-contacts && npm run etl');
  }

  console.log(`✅ Preferred names working - ${prefixDiffersFromFirst.length} mentors using different preferred names`);
  console.log();
}

verifyCsv();
