/**
 * DETECT STALE CONTACT IDS
 *
 * This script compares contact IDs in the database vs. what Givebutter currently has,
 * and logs any mismatches to the mn_changes table.
 *
 * Common causes:
 * - CSV uploaded with old contact IDs → GB created new contacts
 * - External IDs were reassigned to different contacts in GB
 * - Database not synced after CSV upload
 *
 * Solution:
 * 1. Run this script to identify mismatches
 * 2. Run API sync to fetch current contact IDs from GB
 * 3. Run ETL to update database
 * 4. Export fresh CSV with correct contact IDs
 *
 * Usage: npx tsx backend/scripts/detect-stale-contact-ids.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

interface FailedContact {
  error: string;
  id: string;
  external_id: string;
  first_name: string;
  last_name: string;
  primary_email: string;
  primary_phone: string;
}

async function detectStaleContactIds() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DETECTING STALE CONTACT IDS');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // ============================================================================
  // STEP 1: Ask for failed contacts CSV path
  // ============================================================================
  const failedCsvPath = process.argv[2];

  if (!failedCsvPath) {
    console.error('❌ Error: Please provide path to failed contacts CSV');
    console.log('\nUsage:');
    console.log('  npx tsx backend/scripts/detect-stale-contact-ids.ts <path-to-failed-csv>\n');
    console.log('Example:');
    console.log('  npx tsx backend/scripts/detect-stale-contact-ids.ts ~/Downloads/contacts-2025-10-24-failed.csv\n');
    process.exit(1);
  }

  console.log(`📁 Reading failed contacts from: ${failedCsvPath}\n`);

  // ============================================================================
  // STEP 2: Parse failed contacts CSV
  // ============================================================================
  let failedContacts: FailedContact[];

  try {
    const csvContent = readFileSync(resolve(failedCsvPath), 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    failedContacts = records
      .filter((r: any) => r.ERRORS && r.ERRORS.includes('External ID'))
      .map((r: any) => ({
        error: r.ERRORS,
        id: r.id,
        external_id: r.external_id,
        first_name: r.first_name,
        last_name: r.last_name,
        primary_email: r.primary_email,
        primary_phone: r.primary_phone || r.phones,
      }));

    console.log(`✅ Found ${failedContacts.length} contacts with External ID conflicts\n`);

    if (failedContacts.length === 0) {
      console.log('✨ No External ID conflicts found!');
      console.log('   All contacts in the failed CSV have different error types.\n');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('❌ Error reading failed contacts CSV:', error.message);
    process.exit(1);
  }

  // ============================================================================
  // STEP 3: Compare with database
  // ============================================================================
  console.log('🔍 Comparing with database...\n');

  const externalIds = failedContacts.map(c => c.external_id);

  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('mn_id, gb_contact_id, first_name, last_name, phone, personal_email, uga_email')
    .in('mn_id', externalIds);

  if (mentorsError) {
    console.error('❌ Error querying mentors:', mentorsError);
    process.exit(1);
  }

  if (!mentors || mentors.length === 0) {
    console.log('⚠️  No mentors found in database for these external IDs');
    console.log('   The failed contacts may not be in your database yet.\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} mentors in database\n`);

  // ============================================================================
  // STEP 4: Detect mismatches and log to mn_changes
  // ============================================================================
  console.log('🔍 Detecting contact ID mismatches...\n');

  const changes: any[] = [];
  let mismatchCount = 0;
  let matchCount = 0;

  for (const failed of failedContacts) {
    const mentor = mentors.find(m => m.mn_id === failed.external_id);

    if (!mentor) {
      console.log(`⚠️  ${failed.external_id}: Not found in database (skipping)`);
      continue;
    }

    const dbContactId = mentor.gb_contact_id;
    const uploadedContactId = failed.id;

    if (dbContactId === uploadedContactId) {
      matchCount++;
      console.log(`✓ ${failed.external_id}: Contact IDs match (${dbContactId})`);
    } else {
      mismatchCount++;
      console.log(`✗ ${failed.external_id}: MISMATCH`);
      console.log(`    Database: ${dbContactId || 'null'}`);
      console.log(`    Uploaded: ${uploadedContactId}`);
      console.log(`    Error: ${failed.error}`);

      // Extract the "already exists" contact ID from error message
      // Error format: "A contact with External ID [MN0028] already exists."
      // We need to find which contact currently has this external_id in GB
      const existingContactMatch = failed.error.match(/\[([^\]]+)\]/);
      const existingExternalId = existingContactMatch ? existingContactMatch[1] : null;

      changes.push({
        mn_id: failed.external_id,
        change_type: 'import_error',
        change_category: 'givebutter',
        title: 'Stale contact ID caused upload failure',
        description: `Uploaded contact ID ${uploadedContactId} doesn't match current database value ${dbContactId}. ` +
                     `Givebutter reports that external_id ${existingExternalId} already exists on a different contact. ` +
                     `This suggests the contact IDs in the database are stale or were updated after the CSV was exported.`,
        field_name: 'gb_contact_id',
        old_value: uploadedContactId, // What was uploaded
        new_value: dbContactId, // What's currently in DB
        severity: 'error',
        source: 'givebutter_upload',
        metadata: {
          failed_contact_id: uploadedContactId,
          db_contact_id: dbContactId,
          external_id: failed.external_id,
          error_message: failed.error,
          first_name: failed.first_name,
          last_name: failed.last_name,
          email: failed.primary_email,
          phone: failed.primary_phone,
        },
        created_by: 'detect-stale-contact-ids script',
      });
    }
  }

  console.log();
  console.log(`📊 Summary:`);
  console.log(`   Matching contact IDs: ${matchCount}`);
  console.log(`   Mismatched contact IDs: ${mismatchCount}\n`);

  if (changes.length === 0) {
    console.log('✅ No mismatches to log!\n');
    process.exit(0);
  }

  // ============================================================================
  // STEP 5: Log changes to mn_changes table
  // ============================================================================
  console.log(`📝 Logging ${changes.length} issues to mn_changes table...\n`);

  const { data: insertedChanges, error: changesError } = await supabase
    .from('mn_changes')
    .insert(changes)
    .select('id');

  if (changesError) {
    console.error('❌ Error logging changes:', changesError);
    process.exit(1);
  }

  console.log(`✅ Logged ${insertedChanges?.length || 0} issues to mn_changes\n`);

  // ============================================================================
  // STEP 6: Recommendations
  // ============================================================================
  console.log('='.repeat(80));
  console.log('💡 RECOMMENDED ACTIONS');
  console.log('='.repeat(80));
  console.log('\n1. Sync latest contact data from Givebutter:');
  console.log('   npm run sync:api-contacts');
  console.log('\n2. Run ETL to update database:');
  console.log('   npm run etl');
  console.log('\n3. Export fresh CSV with correct contact IDs:');
  console.log('   npm run gb:export');
  console.log('\n4. Upload the NEW CSV to Givebutter');
  console.log('\n5. View logged issues:');
  console.log('   SELECT * FROM mn_changes WHERE change_type = \'import_error\' ORDER BY created_at DESC;');
  console.log();

  console.log('🔍 ROOT CAUSE:');
  console.log('   The CSV you uploaded contained outdated contact IDs from a previous export.');
  console.log('   Between the time of export and upload, the contact IDs in Givebutter changed');
  console.log('   (likely because contacts were re-created or external IDs were reassigned).');
  console.log();

  console.log('⚠️  IMPORTANT:');
  console.log('   Always sync with Givebutter API BEFORE exporting to ensure you have the');
  console.log('   latest contact IDs. Never upload an old CSV - always generate a fresh one.\n');

  process.exit(0);
}

detectStaleContactIds();
