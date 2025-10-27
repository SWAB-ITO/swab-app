/**
 * DEBUG CSV UPLOAD FAILURES
 *
 * Analyzes the 29 failed contacts from Givebutter upload to identify root cause.
 * Checks for:
 * - Duplicate External IDs (MN IDs)
 * - Stale/deleted Contact IDs
 * - Missing Contact IDs
 * - Data inconsistencies
 *
 * Usage: npx tsx backend/scripts/debug-csv-failures.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

// Read failed contacts from CSV
function getFailedMnIds(): string[] {
  try {
    const csvPath = resolve(
      __dirname,
      '../features/comms/gb_imports/training_reminder-10.27/contacts-2025-10-27-1141688063-failed.csv'
    );
    const csvContent = readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { columns: true });

    return records.map((record: any) => record.external_id).filter(Boolean);
  } catch (error) {
    console.error('❌ Error reading failed CSV:', error);
    return [];
  }
}

async function debugFailures() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUGGING CSV UPLOAD FAILURES');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get failed MN IDs
  const failedMnIds = getFailedMnIds();
  console.log(`📋 Analyzing ${failedMnIds.length} failed contacts...\n`);

  if (failedMnIds.length === 0) {
    console.log('⚠️  No failed contacts found in CSV\n');
    return;
  }

  // Check 1: Duplicate MN IDs in our database
  console.log('=' + '='.repeat(79));
  console.log('CHECK 1: Duplicate MN IDs in Database');
  console.log('=' + '='.repeat(79) + '\n');

  const { data: allMentors, error: allError } = await supabase
    .from('mentors')
    .select('mn_id');

  if (allError) {
    console.error('❌ Error fetching mentors:', allError);
    return;
  }

  const mnIdCounts = allMentors.reduce((acc: any, m: any) => {
    acc[m.mn_id] = (acc[m.mn_id] || 0) + 1;
    return acc;
  }, {});

  const duplicateMnIds = Object.entries(mnIdCounts)
    .filter(([_, count]) => (count as number) > 1)
    .map(([mnId, count]) => ({ mnId, count }));

  if (duplicateMnIds.length > 0) {
    console.log(`❌ Found ${duplicateMnIds.length} duplicate MN IDs in database:`);
    duplicateMnIds.forEach(({ mnId, count }) => {
      console.log(`   ${mnId}: ${count} occurrences`);
    });
  } else {
    console.log('✅ No duplicate MN IDs found in database\n');
  }

  // Check 2: Analyze each failed contact
  console.log('=' + '='.repeat(79));
  console.log('CHECK 2: Individual Failed Contact Analysis');
  console.log('=' + '='.repeat(79) + '\n');

  for (const mnId of failedMnIds) {
    console.log(`\n📌 Analyzing ${mnId}...`);

    // Get mentor data
    const { data: mentor, error: mentorError } = await supabase
      .from('mentors')
      .select('mn_id, gb_contact_id, first_name, last_name, phone, personal_email, uga_email')
      .eq('mn_id', mnId)
      .single();

    if (mentorError) {
      console.log(`   ❌ Error: ${mentorError.message}`);
      continue;
    }

    // Get mn_gb_import data
    const { data: gbImport, error: gbImportError } = await supabase
      .from('mn_gb_import')
      .select('"Givebutter Contact ID", "Contact External ID", updated_at')
      .eq('mn_id', mnId)
      .single();

    if (gbImportError) {
      console.log(`   ⚠️  Not found in mn_gb_import`);
    }

    // Get GB contact data (if contact ID exists)
    let gbContactData = null;
    if (mentor.gb_contact_id) {
      const { data: gbContact, error: gbContactError } = await supabase
        .from('raw_gb_full_contacts')
        .select('contact_id, external_id, primary_email, primary_phone, updated_at')
        .eq('contact_id', mentor.gb_contact_id)
        .single();

      if (!gbContactError) {
        gbContactData = gbContact;
      }
    }

    console.log(`   Mentor Table:`);
    console.log(`     - Name: ${mentor.first_name} ${mentor.last_name}`);
    console.log(`     - GB Contact ID: ${mentor.gb_contact_id || 'NULL'}`);
    console.log(`     - Phone: ${mentor.phone}`);
    console.log(`     - Email: ${mentor.personal_email || mentor.uga_email}`);

    if (gbImport) {
      console.log(`   mn_gb_import Table:`);
      console.log(`     - GB Contact ID: ${gbImport['Givebutter Contact ID'] || 'NULL'}`);
      console.log(`     - External ID: ${gbImport['Contact External ID']}`);
      console.log(`     - Last Updated: ${gbImport.updated_at}`);
    }

    if (gbContactData) {
      console.log(`   raw_gb_full_contacts Table:`);
      console.log(`     - Contact ID: ${gbContactData.contact_id}`);
      console.log(`     - External ID: ${gbContactData.external_id}`);
      console.log(`     - Email: ${gbContactData.primary_email}`);
      console.log(`     - Phone: ${gbContactData.primary_phone}`);
      console.log(`     - Last Synced: ${gbContactData.updated_at}`);

      // Check if external ID matches
      if (gbContactData.external_id !== mnId) {
        console.log(`   ⚠️  MISMATCH: GB External ID (${gbContactData.external_id}) != MN ID (${mnId})`);
      }
    } else {
      console.log(`   ⚠️  Contact ID ${mentor.gb_contact_id} NOT found in raw_gb_full_contacts`);
      console.log(`   💡 This contact ID may be stale/deleted in Givebutter`);
    }

    // Check age of sync data
    if (gbContactData) {
      const lastSync = new Date(gbContactData.updated_at);
      const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceSync > 7) {
        console.log(`   ⚠️  Contact data is ${Math.round(daysSinceSync)} days old - recommend re-sync`);
      }
    }
  }

  // Check 3: Summary and Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  // Check how old our GB contact data is overall
  const { data: syncLog } = await supabase
    .from('sync_log')
    .select('sync_type, completed_at')
    .eq('sync_type', 'givebutter_contacts')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (syncLog) {
    const lastSync = new Date(syncLog.completed_at);
    const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);

    console.log(`📅 Last Givebutter Contact Sync: ${syncLog.completed_at}`);
    console.log(`   (${Math.round(daysSinceSync)} days ago)\n`);

    if (daysSinceSync > 1) {
      console.log('⚠️  RECOMMENDATION: Re-sync Givebutter contacts');
      console.log('   Run: npm run sync:api-contacts');
      console.log('   Then: npm run etl');
      console.log('   Then: Re-export CSV\n');
    }
  }

  // Check for contacts without GB IDs
  const { count: withoutGbId } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .is('gb_contact_id', null);

  if (withoutGbId && withoutGbId > 0) {
    console.log(`⚠️  ${withoutGbId} mentors have NULL Givebutter Contact ID`);
    console.log('   These will be created as NEW contacts in Givebutter\n');
  }

  console.log('💡 Common Causes of "External ID already exists" error:');
  console.log('   1. Contact ID in our DB is stale/deleted in Givebutter');
  console.log('   2. External ID was manually changed in Givebutter');
  console.log('   3. Contact was deleted and recreated in Givebutter');
  console.log('   4. Multiple contacts in GB have the same External ID');
  console.log();
  console.log('🔧 Fix:');
  console.log('   1. Re-sync contacts from Givebutter: npm run sync:api-contacts');
  console.log('   2. Re-run ETL: npm run etl');
  console.log('   3. Re-export CSV: npm run comms:export');
  console.log('   4. Upload to Givebutter');
  console.log();

  console.log('='.repeat(80) + '\n');
}

debugFailures().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
