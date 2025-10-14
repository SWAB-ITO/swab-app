/**
 * CSV UPLOAD ORCHESTRATOR: Givebutter Full Contact Export
 *
 * This implements the CSV feedback loop from SYNC_ARCHITECTURE.md
 *
 * Flow:
 * 1. Parse Givebutter CSV (all 40k+ contacts)
 * 2. Store in raw_gb_full_contacts table
 * 3. Match contacts to mentors (phone → email → external_id)
 * 4. Update mentors.gb_contact_id
 * 5. Detect and log duplicates
 * 6. Log to csv_import_log
 *
 * Usage: npm run sync:upload-csv /path/to/givebutter-export.csv
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { parseGivebutterCSV } from '../services/csv-parser';
import { ContactMatcher } from '../services/contact-matching';
import { BatchUpserter } from '../../lib/infrastructure/operators/batch-upserter';
import { Logger } from '../../lib/utils/logger';
import { ErrorHandler } from '../../lib/utils/error-handler';
import { stat } from 'fs/promises';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function uploadGivebutterCSV() {
  const logger = new Logger('CsvUpload');
  logger.start('Givebutter CSV Upload');

  console.log('\n' + '='.repeat(80));
  console.log('📤 GIVEBUTTER CSV UPLOAD → DATABASE (FULL SYNC)');
  console.log('='.repeat(80) + '\n');

  // Get CSV path from command line args
  const csvPath = process.argv[2];
  if (!csvPath) {
    logger.error('CSV path required');
    console.log('\nUsage: npm run sync:upload-csv /path/to/givebutter-export.csv\n');
    process.exit(1);
  }

  const resolvedPath = resolve(csvPath);
  logger.info(`CSV Path: ${resolvedPath}`);

  // Check if file exists and get file size
  let fileSize = 0;
  try {
    const stats = await stat(resolvedPath);
    fileSize = stats.size;
    logger.info(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    logger.error('File not found', { path: resolvedPath });
    process.exit(1);
  }

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);
  const errorHandler = new ErrorHandler({ supabase, logger });
  const batchUpserter = new BatchUpserter({ supabase, logger, errorHandler });

  const startTime = Date.now();

  // ============================================================================
  // STEP 1: Parse CSV
  // ============================================================================
  console.log('📄 Step 1: Parsing CSV...\n');

  const { contacts, totalRows, parseErrors } = await parseGivebutterCSV(resolvedPath);

  if (parseErrors.length > 10) {
    console.log(`   ⚠️  ${parseErrors.length - 10} more parse errors (not shown)\n`);
  }

  // ============================================================================
  // STEP 2: Clear and repopulate raw_gb_full_contacts
  // ============================================================================
  logger.info('Storing contacts in database');

  // Delete existing contacts
  const { error: deleteError } = await supabase
    .from('raw_gb_full_contacts')
    .delete()
    .gte('contact_id', 0);

  if (deleteError) {
    logger.error('Error clearing raw_gb_full_contacts', deleteError);
    process.exit(1);
  }

  logger.info('Cleared existing contacts');

  // Insert using BatchUpserter
  const enrichedContacts = contacts.map(c => ({
    ...c,
    csv_uploaded_at: new Date().toISOString(),
    csv_filename: csvPath.split('/').pop(),
  }));

  const insertResult = await batchUpserter.insert('raw_gb_full_contacts', enrichedContacts);
  const inserted = insertResult.successful.length;
  const failed = insertResult.failed.length;

  console.log(`\n   ✅ Inserted ${inserted.toLocaleString()} contacts`);
  if (failed > 0) {
    console.log(`   ⚠️  Failed: ${failed}\n`);
  } else {
    console.log();
  }

  // ============================================================================
  // STEP 3: Match contacts to mentors
  // ============================================================================
  console.log('🔍 Step 3: Matching contacts to mentors...\n');

  const matcher = new ContactMatcher(supabase);
  const matchResult = await matcher.matchContactsToMentors(contacts);

  // ============================================================================
  // STEP 4: Log to csv_import_log
  // ============================================================================
  console.log('📝 Step 4: Logging CSV import...\n');

  const processingTime = Date.now() - startTime;

  const { error: logError } = await supabase
    .from('csv_import_log')
    .insert({
      filename: csvPath.split('/').pop(),
      total_contacts: contacts.length,
      mentors_matched: matchResult.matched,
      new_contact_ids_captured: matchResult.newContactIds,
      duplicates_detected: matchResult.duplicates.length,
      file_size_bytes: fileSize,
      processing_time_ms: processingTime,
      uploaded_by: 'system', // TODO: Add user auth
    });

  if (logError) {
    console.error('   ⚠️  Error logging import:', logError);
  } else {
    console.log('   ✅ Import logged\n');
  }

  // Update sync_config.last_csv_upload_at
  await supabase
    .from('sync_config')
    .update({ last_csv_upload_at: new Date().toISOString() })
    .eq('id', 1);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('✅ CSV UPLOAD COMPLETE');
  console.log('='.repeat(80));
  console.log('📊 Summary:');
  console.log(`   File: ${csvPath.split('/').pop()}`);
  console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total contacts in CSV: ${totalRows.toLocaleString()}`);
  console.log(`   Valid contacts: ${contacts.length.toLocaleString()}`);
  console.log(`   Stored in raw_gb_full_contacts: ${inserted.toLocaleString()}`);
  console.log(`   Parse errors: ${parseErrors.length}`);
  console.log();
  console.log('🔗 Matching Results:');
  console.log(`   Mentors matched: ${matchResult.matched}`);
  console.log(`   New contact IDs captured: ${matchResult.newContactIds}`);
  console.log(`   Duplicate groups detected: ${matchResult.duplicates.length}`);
  console.log();
  console.log('⏱️  Performance:');
  console.log(`   Processing time: ${(processingTime / 1000).toFixed(2)}s`);
  console.log(`   Speed: ${Math.round(totalRows / (processingTime / 1000)).toLocaleString()} rows/sec`);
  console.log();

  if (matchResult.duplicates.length > 0) {
    console.log('⚠️  Duplicates Found:');
    console.log('   Review mn_errors table for details on duplicate contacts');
    console.log('   Consider consolidating duplicates in Givebutter\n');
  }

  console.log('💡 Next Steps:');
  console.log('   1. Review mn_errors for conflicts and duplicates');
  console.log('   2. Run ETL to regenerate mn_gb_import: npm run etl');
  console.log('   3. Export CSV for Givebutter import (to create new contacts)');
  console.log('   4. Upload exported CSV to Givebutter');
  console.log('   5. Download fresh Givebutter export and re-upload here');
  console.log('   6. CSV feedback loop complete! ✅\n');
}

uploadGivebutterCSV();
