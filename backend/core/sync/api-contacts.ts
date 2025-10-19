/**
 * ID-BASED CONTACT SYNC
 *
 * Syncs contacts from Givebutter API by fetching specific contact IDs from mentors table
 *
 * Flow:
 * 1. Query mentors table for all gb_contact_id values
 * 2. Fetch each contact by ID: GET /contacts/{id}
 * 3. Upsert results to raw_gb_full_contacts
 * 4. This syncs only the ~670 contacts we care about (not all 3,240+ tagged contacts)
 *
 * Usage: npm run sync:api-contacts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { GivebutterClient } from '../../lib/infrastructure/clients/givebutter-client';
import { Logger } from '../../lib/utils/logger';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function syncGivebutterContactsById() {
  const logger = new Logger('IDContactSync');
  logger.info('Starting ID-based Givebutter contact sync');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Note: sync_log is managed by the orchestrator (route.ts) when run from UI
  // When run directly via CLI, no sync_log entry is created (manual debugging)
  const syncLogId: number | undefined = undefined;
  const startTime = Date.now();

  // ============================================================================
  // STEP 1: Get configuration
  // ============================================================================
  const { data: syncConfig, error: configError } = await supabase
    .from('sync_config')
    .select('givebutter_api_key, current_tag_filter')
    .eq('id', 1)
    .single();

  if (configError || !syncConfig?.givebutter_api_key) {
    logger.error('Sync configuration not found');
    console.log('❌ Error: Givebutter API key not configured\n');
    process.exit(1);
  }

  // Initialize Givebutter client
  const gbClient = new GivebutterClient({
    apiKey: syncConfig.givebutter_api_key,
    logger,
  });

  // ============================================================================
  // STEP 2: Get contact IDs from mentors table
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('🔄 CONTACT SYNC BY ID');
  console.log('='.repeat(80) + '\n');

  logger.info('Fetching contact IDs from mentors table');

  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('gb_contact_id, mn_id')
    .not('gb_contact_id', 'is', null);

  if (mentorsError) {
    logger.error('Failed to fetch mentors', mentorsError);
    console.log('❌ Error fetching mentors from database\n');

    // Mark sync as failed
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          error_message: 'Failed to fetch mentors from database',
        })
        .eq('id', syncLogId);
    }

    process.exit(1);
  }

  const contactIds = mentors
    .map(m => m.gb_contact_id)
    .filter((id): id is string => id !== null && id !== undefined);

  console.log(`📋 Found ${contactIds.length} contacts to sync\n`);
  logger.info(`Contact IDs to fetch: ${contactIds.length}`);

  if (contactIds.length === 0) {
    logger.warn('No contacts to sync');
    console.log('⚠️  No contacts found in mentors table with gb_contact_id\n');
    console.log('💡 Run CSV upload first to populate mentor contact IDs.');

    // Mark sync as completed with no records
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          records_processed: 0,
          records_inserted: 0,
          records_failed: 0,
        })
        .eq('id', syncLogId);
    }

    process.exit(0);
  }

  // ============================================================================
  // STEP 3: Fetch each contact by ID from Givebutter
  // ============================================================================
  console.log('🔍 Fetching contacts from Givebutter API...\n');
  logger.info('Fetching contacts by ID from Givebutter API');

  let allContacts: any[] = [];
  let successCount = 0;
  let errorCount = 0;

  try {
    // Fetch contacts in batches with rate limiting
    const BATCH_SIZE = 10; // Reduced from 50 to avoid rate limits
    const BATCH_DELAY_MS = 2000; // 2 second delay between batches
    const totalBatches = Math.ceil(contactIds.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, contactIds.length);
      const batch = contactIds.slice(startIndex, endIndex);

      // Fetch contacts in this batch concurrently
      const promises = batch.map(async (contactId) => {
        try {
          const contact = await gbClient.getContact(Number(contactId));
          return { success: true, contact };
        } catch (error: any) {
          logger.error(`Failed to fetch contact ${contactId}`, error);
          return { success: false, contactId, error: error.message };
        }
      });

      const results = await Promise.all(promises);

      // Collect successful contacts
      results.forEach(result => {
        if (result.success && 'contact' in result) {
          allContacts.push(result.contact);
          successCount++;
        } else {
          errorCount++;
        }
      });

      console.log(`   Batch ${batchIndex + 1}/${totalBatches}: ${successCount}/${contactIds.length} contacts fetched`);
      logger.info(`Batch ${batchIndex + 1}/${totalBatches} complete: ${successCount} successful, ${errorCount} errors`);

      // Rate limiting: Wait between batches (except for the last one)
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`\n✅ Fetched ${successCount} contacts (${errorCount} errors)\n`);
    logger.info(`Total contacts fetched: ${successCount}, errors: ${errorCount}`);

  } catch (error: any) {
    logger.error('Failed to fetch contacts from Givebutter', error);
    console.log(`❌ Error fetching contacts: ${error.message}\n`);

    // Mark sync as failed
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          error_message: `Failed to fetch contacts: ${error.message}`,
          records_processed: contactIds.length,
          records_failed: contactIds.length,
        })
        .eq('id', syncLogId);
    }

    process.exit(1);
  }

  if (allContacts.length === 0) {
    logger.warn('No contacts successfully fetched');
    console.log('⚠️  No contacts could be fetched from Givebutter\n');

    // Mark sync as completed but with all failures
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
          records_processed: contactIds.length,
          records_inserted: 0,
          records_failed: contactIds.length,
        })
        .eq('id', syncLogId);
    }

    process.exit(0);
  }

  // ============================================================================
  // STEP 4: Upsert to raw_gb_full_contacts
  // ============================================================================
  console.log('💾 Upserting to raw_gb_full_contacts...\n');
  logger.info('Upserting contacts to database');

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // Process in batches of 100 to avoid hitting database limits
  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(allContacts.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, allContacts.length);
    const batch = allContacts.slice(startIndex, endIndex);

    // Transform contacts to match database schema
    const rows = batch.map(contact => ({
      contact_id: contact.id,
      external_id: contact.external_id,
      prefix: contact.prefix,
      first_name: contact.first_name,
      middle_name: contact.middle_name,
      last_name: contact.last_name,
      suffix: contact.suffix,
      date_of_birth: contact.date_of_birth,
      gender: contact.gender,
      employer: contact.employer,
      title: contact.title,
      primary_email: contact.primary_email,
      additional_emails: contact.additional_emails?.join(','),
      primary_phone: contact.primary_phone,
      additional_phones: contact.additional_phones?.join(','),
      address_line_1: contact.address?.line1,
      address_line_2: contact.address?.line2,
      city: contact.city,
      state: contact.state,
      postal_code: contact.postal_code,
      country: contact.country,
      website: contact.website,
      twitter: contact.twitter,
      linkedin: contact.linkedin,
      facebook: contact.facebook,
      tags: contact.tags,
      notes: contact.notes,
      household_id: contact.household_id,
      household: contact.household,
      household_primary_contact: contact.household_primary_contact,
      date_created_utc: contact.created_at,
      last_modified_utc: contact.updated_at,
      custom_fields: contact.custom_fields,
      source: null, // Match CSV import behavior
    }));

    // Upsert batch
    const { error: upsertError } = await supabase
      .from('raw_gb_full_contacts')
      .upsert(rows, { onConflict: 'contact_id' });

    if (upsertError) {
      logger.error(`Error upserting batch ${batchIndex + 1}`, upsertError);
      errors += batch.length;
    } else {
      // Note: We can't easily determine inserted vs updated with upsert
      // For now, count all as inserted
      inserted += batch.length;
    }

    logger.info(`Batch ${batchIndex + 1}/${totalBatches} complete`);
  }

  // ============================================================================
  // STEP 5: Update sync timestamp
  // ============================================================================
  await supabase
    .from('sync_config')
    .update({ last_gb_api_sync_at: new Date().toISOString() })
    .eq('id', 1);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('✅ API CONTACT SYNC COMPLETE');
  console.log('='.repeat(80));
  console.log('📊 Results:');
  console.log(`   Contact IDs from mentors: ${contactIds.length}`);
  console.log(`   Contacts fetched: ${successCount}`);
  console.log(`   Failed to fetch: ${errorCount}`);
  console.log(`   Successfully upserted: ${inserted}`);
  console.log(`   Upsert errors: ${errors}\n`);

  if (errors > 0 || errorCount > 0) {
    logger.warn('Some contacts failed to sync');
    console.log('⚠️  Some contacts failed to sync. Check logs for details.\n');
  }

  console.log('💡 Purpose:');
  console.log('   - Keeps contact data fresh between CSV uploads');
  console.log('   - Syncs only the ~670 mentors we care about');
  console.log('   - Updates custom fields, tags, and contact info from Givebutter\n');

  logger.info('API contact sync complete');
}

syncGivebutterContactsById();
