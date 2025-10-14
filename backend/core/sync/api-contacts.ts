/**
 * TAG-BASED CONTACT SYNC
 *
 * Syncs all contacts with "Mentors 2025" tag from Givebutter API to raw_gb_full_contacts
 *
 * Flow:
 * 1. Read tag filter from sync_config ("Mentors 2025")
 * 2. Query Givebutter API: GET /contacts?tags=Mentors+2025
 * 3. Upsert all results to raw_gb_full_contacts
 * 4. This keeps our contact list current without needing CSV uploads
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

async function syncGivebutterContactsByTag() {
  const logger = new Logger('TagContactSync');
  logger.info('Starting tag-based Givebutter contact sync');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

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

  const tagFilter = syncConfig.current_tag_filter || 'Mentors 2025';
  logger.info(`Tag filter: ${tagFilter}`);

  // Initialize Givebutter client
  const gbClient = new GivebutterClient({
    apiKey: syncConfig.givebutter_api_key,
    logger,
  });

  // ============================================================================
  // STEP 2: Fetch all contacts with tag from Givebutter
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('🔄 TAG-BASED CONTACT SYNC');
  console.log('='.repeat(80) + '\n');
  console.log(`🏷️  Tag filter: "${tagFilter}"\n`);

  logger.info('Fetching contacts from Givebutter API');

  let allContacts: any[] = [];
  let page = 1;
  let hasMore = true;

  try {
    // Fetch all pages of contacts with the tag
    while (hasMore) {
      // Use the client's list method with tag filter
      // Note: GivebutterClient needs a listContacts method that accepts tag filter
      // For now, using a simplified approach - this may need adjustment based on GB API
      const response = await gbClient.request('GET', '/contacts', {
        tags: tagFilter,
        page,
        per_page: 100, // Max per page
      });

      const contacts = response.data || [];
      allContacts = allContacts.concat(contacts);

      logger.info(`Fetched page ${page}: ${contacts.length} contacts`);

      // Check if there are more pages
      hasMore = contacts.length === 100; // If we got a full page, there might be more
      page++;
    }

    logger.info(`Total contacts fetched: ${allContacts.length}`);
    console.log(`✅ Fetched ${allContacts.length} contacts with tag "${tagFilter}"\n`);

  } catch (error: any) {
    logger.error('Failed to fetch contacts from Givebutter', error);
    console.log(`❌ Error fetching contacts: ${error.message}\n`);
    process.exit(1);
  }

  if (allContacts.length === 0) {
    logger.warn('No contacts found with this tag');
    console.log(`⚠️  No contacts found with tag "${tagFilter}"\n`);
    console.log('💡 Make sure contacts in Givebutter have the correct tag.');
    process.exit(0);
  }

  // ============================================================================
  // STEP 3: Upsert to raw_gb_full_contacts
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
      source: 'api_tag_sync',
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
  // STEP 4: Update sync timestamp
  // ============================================================================
  await supabase
    .from('sync_config')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', 1);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('✅ TAG-BASED SYNC COMPLETE');
  console.log('='.repeat(80));
  console.log('📊 Results:');
  console.log(`   Contacts fetched: ${allContacts.length}`);
  console.log(`   Successfully upserted: ${inserted}`);
  console.log(`   Errors: ${errors}\n`);

  if (errors > 0) {
    logger.warn('Some contacts failed to sync');
    console.log('⚠️  Some contacts failed to sync. Check logs for details.\n');
  }

  console.log('💡 Next Steps:');
  console.log('   1. Contacts are now in raw_gb_full_contacts');
  console.log('   2. Run ETL to match contacts to mentors');
  console.log('   3. Contact IDs will be automatically linked during ETL\n');

  logger.info('Tag-based contact sync complete');
}

syncGivebutterContactsByTag();
