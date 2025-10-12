/**
 * API-BASED CONTACT SYNC
 *
 * Syncs mentor contacts from Givebutter API to raw_mn_gb_contacts table
 * Implements conflict detection and field ownership rules
 *
 * This is Tier 2 of the sync architecture (periodic sync)
 *
 * Flow:
 * 1. Load all mentors with gb_contact_id
 * 2. For each mentor, GET /contacts/{id} from Givebutter
 * 3. Upsert to raw_mn_gb_contacts
 * 4. Detect conflicts using field ownership rules
 * 5. Sync back allowed fields (preferred_name, etc.)
 * 6. Log conflicts to mn_errors
 *
 * Usage: npm run sync:api-contacts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { ConflictDetector } from '../../lib/services/conflict-detection';
import type { Mentor } from '../../lib/services/contact-matching';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface GivebutterContactResponse {
  id: number;
  external_id?: string;
  prefix?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  date_of_birth?: string;
  gender?: string;
  employer?: string;
  title?: string;
  primary_email?: string;
  additional_emails?: string[];
  primary_phone?: string;
  additional_phones?: string[];
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  tags?: string[];
  notes?: string;
  household_id?: string;
  household?: string;
  household_primary_contact?: boolean;
  custom_fields?: Record<string, any>;
  updated_at?: string;
  created_at?: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncGivebutterContactsAPI() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 SYNC: Givebutter Contacts (API) → raw_mn_gb_contacts');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get API key from sync_config
  const { data: syncConfig, error: configError } = await supabase
    .from('sync_config')
    .select('givebutter_api_key')
    .eq('id', 1)
    .single();

  if (configError || !syncConfig?.givebutter_api_key) {
    console.error('❌ Error: Givebutter API key not configured');
    console.log('   Run sync:init to configure API keys\n');
    process.exit(1);
  }

  const GIVEBUTTER_API_KEY = syncConfig.givebutter_api_key;

  // ============================================================================
  // STEP 1: Load all mentors with contact_ids
  // ============================================================================
  console.log('📋 Step 1: Loading mentors with contact IDs...\n');

  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('*')
    .not('gb_contact_id', 'is', null);

  if (mentorsError || !mentors) {
    console.error('❌ Error loading mentors:', mentorsError);
    process.exit(1);
  }

  console.log(`   Found ${mentors.length} mentors with contact IDs\n`);

  if (mentors.length === 0) {
    console.log('   No mentors to sync. Upload a CSV first to capture contact IDs.\n');
    process.exit(0);
  }

  // ============================================================================
  // STEP 2: Sync contacts via API with rate limiting
  // ============================================================================
  console.log('🔄 Step 2: Syncing contacts from Givebutter API...\n');

  let synced = 0;
  let conflicts = 0;
  let errors = 0;
  let deleted = 0;

  const conflictDetector = new ConflictDetector(supabase);

  // Rate limiting: 10 requests per second (conservative)
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000;

  for (let i = 0; i < mentors.length; i += BATCH_SIZE) {
    const batch = mentors.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    await Promise.all(batch.map(async (mentor: Mentor) => {
      try {
        // Fetch contact from Givebutter API
        const response = await fetch(
          `https://api.givebutter.com/v1/contacts/${mentor.gb_contact_id}`,
          {
            headers: {
              'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Contact deleted in Givebutter
            console.log(`   ⚠️  Contact ${mentor.gb_contact_id} no longer exists (mentor ${mentor.mn_id})`);

            await supabase.from('mn_errors').insert({
              mn_id: mentor.mn_id,
              error_type: 'contact_deleted',
              severity: 'error',
              error_message: `Contact ${mentor.gb_contact_id} no longer exists in Givebutter`,
              source_table: 'raw_mn_gb_contacts',
            });

            // Update sync status to stale
            await supabase
              .from('raw_mn_gb_contacts')
              .update({ sync_status: 'stale' })
              .eq('contact_id', mentor.gb_contact_id!);

            deleted++;
            return;
          }

          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const gbContact: GivebutterContactResponse = await response.json();

        // Upsert to raw_mn_gb_contacts
        const { error: upsertError } = await supabase
          .from('raw_mn_gb_contacts')
          .upsert({
            contact_id: gbContact.id,
            mn_id: mentor.mn_id,
            external_id: gbContact.external_id,
            prefix: gbContact.prefix,
            first_name: gbContact.first_name,
            middle_name: gbContact.middle_name,
            last_name: gbContact.last_name,
            suffix: gbContact.suffix,
            date_of_birth: gbContact.date_of_birth,
            gender: gbContact.gender,
            employer: gbContact.employer,
            title: gbContact.title,
            primary_email: gbContact.primary_email,
            additional_emails: gbContact.additional_emails?.join(','),
            primary_phone: gbContact.primary_phone,
            additional_phones: gbContact.additional_phones?.join(','),
            address_line_1: gbContact.address_line_1,
            address_line_2: gbContact.address_line_2,
            city: gbContact.city,
            state: gbContact.state,
            postal_code: gbContact.postal_code,
            country: gbContact.country,
            website: gbContact.website,
            twitter: gbContact.twitter,
            linkedin: gbContact.linkedin,
            facebook: gbContact.facebook,
            tags: gbContact.tags,
            notes: gbContact.notes,
            household_id: gbContact.household_id,
            household: gbContact.household,
            household_primary_contact: gbContact.household_primary_contact,
            date_created_utc: gbContact.created_at,
            last_modified_utc: gbContact.updated_at,
            custom_fields: gbContact.custom_fields,
            source: 'api_sync',
            gb_updated_at: gbContact.updated_at,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          }, { onConflict: 'contact_id' });

        if (upsertError) {
          console.error(`   ❌ Error upserting contact for ${mentor.mn_id}:`, upsertError);
          errors++;
          return;
        }

        // Detect conflicts
        const conflictResult = await conflictDetector.detectConflicts(mentor, gbContact);

        if (conflictResult.hasConflicts) {
          conflicts++;
          await conflictDetector.logConflicts(mentor.mn_id, conflictResult.conflicts, gbContact);

          // Update sync status
          await supabase
            .from('raw_mn_gb_contacts')
            .update({ sync_status: 'conflict' })
            .eq('contact_id', gbContact.id);
        }

        // Sync back allowed fields
        if (Object.keys(conflictResult.syncBackUpdates).length > 0) {
          await conflictDetector.applySyncBackUpdates(mentor.mn_id, conflictResult.syncBackUpdates);
        }

        synced++;

      } catch (error) {
        console.error(`   ❌ Error syncing contact for ${mentor.mn_id}:`, error instanceof Error ? error.message : error);
        errors++;
      }
    }));

    // Progress
    console.log(`   Synced ${Math.min(i + BATCH_SIZE, mentors.length)}/${mentors.length} contacts...`);

    // Rate limit delay (except for last batch)
    if (i + BATCH_SIZE < mentors.length) {
      await sleep(DELAY_MS);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('✅ CONTACT SYNC COMPLETE');
  console.log('='.repeat(80));
  console.log('📊 Results:');
  console.log(`   Total mentors: ${mentors.length}`);
  console.log(`   Synced successfully: ${synced}`);
  console.log(`   Conflicts detected: ${conflicts}`);
  console.log(`   Deleted in GB: ${deleted}`);
  console.log(`   Errors: ${errors}\n`);

  if (conflicts > 0) {
    console.log('⚠️  Conflicts Found:');
    console.log('   Review mn_errors table for details');
    console.log('   Consider resolving conflicts before next export\n');
  }

  if (deleted > 0) {
    console.log('⚠️  Deleted Contacts:');
    console.log('   Some contacts no longer exist in Givebutter');
    console.log('   Review mn_errors and consider re-creating via export\n');
  }
}

syncGivebutterContactsAPI();
