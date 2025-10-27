/**
 * EXPORT CONTACTS TO GIVEBUTTER CSV
 *
 * Generates a Givebutter-compatible CSV for contact import.
 * Maps mentor data and custom fields to Givebutter's exact column structure.
 *
 * Usage:
 *   npm run comms:export                              # Export all mentors to backend/data
 *   npm run comms:export -- changed                   # Export only mentors needing sync
 *   npm run comms:export -- --output="path/to/dir"    # Export to custom directory
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Load custom fields configuration
function loadCustomFieldsConfig() {
  try {
    const configPath = resolve(__dirname, '../../../core/config/custom-fields.json');
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('⚠️  Error loading custom-fields.json:', error);
    console.log('   Using fallback configuration');
    return { fields: [] };
  }
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

async function exportContacts(changedOnly: boolean = false, outputDir?: string) {
  console.log('\n' + '='.repeat(80));
  console.log('📤 EXPORTING CONTACTS → GIVEBUTTER CSV');
  console.log('='.repeat(80) + '\n');

  // Load custom fields configuration
  const customFieldsConfig = loadCustomFieldsConfig();
  console.log(`⚙️  Loaded ${customFieldsConfig.fields?.length || 0} custom fields from config (Year: ${customFieldsConfig.year})\n`);

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Query mn_gb_import (already has all data prepared)
  console.log('📋 Fetching from mn_gb_import...\n');

  let query = supabase.from('mn_gb_import').select('*');

  // Filter to only changed if requested
  if (changedOnly) {
    query = query.eq('needs_sync', true);
  }

  const { data: gbImportData, error } = await query;

  if (error) {
    console.error('❌ Error fetching mn_gb_import:', error);
    process.exit(1);
  }

  if (!gbImportData || gbImportData.length === 0) {
    console.log('⚠️  No contacts found to export\n');
    process.exit(0);
  }

  console.log(`✅ Found ${gbImportData.length} contacts to export\n`);

  // Breakdown by status
  const breakdown = {
    with_contact: gbImportData.filter((row: any) => row['Givebutter Contact ID']).length,
    without_contact: gbImportData.filter((row: any) => !row['Givebutter Contact ID']).length,
  };

  console.log('📊 Breakdown:');
  console.log(`   With Givebutter contact ID: ${breakdown.with_contact}`);
  console.log(`   Without contact ID (will create): ${breakdown.without_contact}\n`);

  // Generate CSV
  console.log('🔨 Generating CSV...\n');

  // Build headers: standard Givebutter fields + custom fields from config
  const standardHeaders = [
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
  ];

  // Add custom field headers from config
  const customFieldHeaders = (customFieldsConfig.fields || []).map((field: any) => field.name);
  const headers = [...standardHeaders, ...customFieldHeaders];

  const csvLines: string[] = [];
  csvLines.push(headers.join(','));

  // Map mn_gb_import data to CSV (most fields already match)
  gbImportData.forEach((row: any) => {
    const csvRow = [
      // Basic Info (from mn_gb_import)
      formatCSVValue(row['Givebutter Contact ID'] || ''),
      formatCSVValue(row['Contact External ID'] || ''),
      formatCSVValue(row['Prefix'] || ''),
      formatCSVValue(row['First Name']),
      formatCSVValue(row['Middle Name'] || ''),
      formatCSVValue(row['Last Name']),
      formatCSVValue(''),                              // Suffix (not in mn_gb_import)
      formatCSVValue(row['Date of Birth'] || ''),
      formatCSVValue(row['Gender'] || ''),
      formatCSVValue(row['Employer'] || ''),
      formatCSVValue(row['Title'] || ''),

      // Contact Info
      formatCSVValue(row['Primary Email'] || ''),
      formatCSVValue(row['Email Addresses'] || ''),    // Additional Emails
      formatCSVValue(row['Primary Phone Number'] || ''),
      formatCSVValue(row['Phone Numbers'] || ''),      // Additional Phones

      // Address (empty - not tracking)
      formatCSVValue(''), formatCSVValue(''), formatCSVValue(''),
      formatCSVValue(''), formatCSVValue(''), formatCSVValue(''),
      formatCSVValue(''),

      // Social (empty - not tracking)
      formatCSVValue(''), formatCSVValue(''), formatCSVValue(''),
      formatCSVValue(''),

      // Contributions (read-only, empty)
      formatCSVValue(''), formatCSVValue(''), formatCSVValue(''),

      // Subscriptions
      formatCSVValue(row['Email Subscription Status'] || ''),
      formatCSVValue(row['Phone Subscription Status'] || ''),
      formatCSVValue(row['Address Subscription Status'] || ''),

      // Metadata
      formatCSVValue(row['Tags'] || ''),
      formatCSVValue(row['Notes'] || ''),

      // Household
      formatCSVValue(row['Household Name'] || ''),
      formatCSVValue(row['Household Envelope Name'] || ''),
      formatCSVValue(row['Is Household Primary Contact'] || ''),

      // Timestamps (read-only, empty)
      formatCSVValue(''), formatCSVValue(''),
    ];

    // Add custom fields from config dynamically
    (customFieldsConfig.fields || []).forEach((field: any) => {
      const value = row[field.name];
      // Apply default values for yes_no fields if empty
      if (field.type === 'yes_no' && !value) {
        csvRow.push(formatCSVValue('No'));
      } else {
        csvRow.push(formatCSVValue(value || ''));
      }
    });

    csvLines.push(csvRow.join(','));
  });

  // Write to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `givebutter-import-${timestamp}.csv`;
  const directory = outputDir || 'backend/features/comms/gb_imports/mentor_trainings-10.22';
  const filepath = resolve(process.cwd(), directory, filename);

  writeFileSync(filepath, csvLines.join('\n'), 'utf-8');

  console.log('='.repeat(80));
  console.log('✅ EXPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`📁 File: ${filepath}`);
  console.log(`📊 Contacts: ${gbImportData.length}`);
  console.log(`💾 Size: ${(csvLines.join('\n').length / 1024).toFixed(2)} KB`);
  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Review CSV for accuracy: head backend/data/' + filename);
  console.log('   2. Validate: npm run comms:validate');
  console.log('   3. Import to Givebutter: Contacts → Import → Upload CSV');
  console.log('   4. Re-sync: npm run sync:api-contacts');
  console.log();
}

// Parse args
const changedOnly = process.argv.includes('changed');
const outputDirArg = process.argv.find(arg => arg.startsWith('--output='));
const outputDir = outputDirArg ? outputDirArg.split('=')[1] : undefined;

if (changedOnly) {
  console.log('🔍 Mode: Export only mentors flagged as needs_sync = true\n');
} else {
  console.log('📦 Mode: Export ALL mentors\n');
}

if (outputDir) {
  console.log(`📁 Output directory: ${outputDir}\n`);
}

exportContacts(changedOnly, outputDir);
