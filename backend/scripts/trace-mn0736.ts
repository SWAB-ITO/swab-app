/**
 * Trace MN0736 through entire pipeline
 * Check raw_mn_signups → mentors → mn_gb_import → CSV
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const MN_ID = 'MN0736';
const CSV_PATH = resolve(__dirname, '../features/gb-import/data/givebutter-import-2025-10-17.csv');

async function trace() {
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 TRACING ${MN_ID} THROUGH PIPELINE`);
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Step 1: Check raw_mn_signups
  console.log('1️⃣  RAW_MN_SIGNUPS (Source from Jotform)');
  console.log('─'.repeat(80));

  const { data: signup } = await supabase
    .from('raw_mn_signups')
    .select('*')
    .eq('mn_id', MN_ID)
    .single();

  if (signup) {
    console.log(`   submission_id: ${signup.submission_id}`);
    console.log(`   first_name: "${signup.first_name}"`);
    console.log(`   preferred_name: "${signup.preferred_name}"`);
    console.log(`   last_name: "${signup.last_name}"`);
    console.log(`   uga_email: ${signup.uga_email}`);
    console.log(`   phone: ${signup.phone}`);
  } else {
    console.log('   ❌ Not found in raw_mn_signups');
  }

  // Step 2: Check mentors table
  console.log('\n2️⃣  MENTORS (After ETL processing)');
  console.log('─'.repeat(80));

  const { data: mentor } = await supabase
    .from('mentors')
    .select('*')
    .eq('mn_id', MN_ID)
    .single();

  if (mentor) {
    console.log(`   id: ${mentor.id}`);
    console.log(`   first_name: "${mentor.first_name}"`);
    console.log(`   preferred_name: "${mentor.preferred_name}"`);
    console.log(`   last_name: "${mentor.last_name}"`);
    console.log(`   primary_email: ${mentor.primary_email}`);
    console.log(`   primary_phone: ${mentor.primary_phone}`);
    console.log(`   gb_contact_id: ${mentor.gb_contact_id}`);
    console.log(`   source: ${mentor.source}`);
    console.log(`   status: ${mentor.status}`);
  } else {
    console.log('   ❌ Not found in mentors');
  }

  // Step 3: Check mn_gb_import
  console.log('\n3️⃣  MN_GB_IMPORT (Ready for export)');
  console.log('─'.repeat(80));

  const { data: gbImport } = await supabase
    .from('mn_gb_import')
    .select('*')
    .eq('Contact External ID', MN_ID)
    .single();

  if (gbImport) {
    console.log(`   Givebutter Contact ID: ${gbImport['Givebutter Contact ID']}`);
    console.log(`   Contact External ID: ${gbImport['Contact External ID']}`);
    console.log(`   Prefix: "${gbImport['Prefix']}"`);
    console.log(`   First Name: "${gbImport['First Name']}"`);
    console.log(`   Last Name: "${gbImport['Last Name']}"`);
    console.log(`   Email: ${gbImport['Email']}`);
    console.log(`   Phone: ${gbImport['Phone']}`);
  } else {
    console.log('   ❌ Not found in mn_gb_import');
  }

  // Step 4: Check CSV
  console.log('\n4️⃣  CSV EXPORT (Final output)');
  console.log('─'.repeat(80));

  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const csvRow = records.find((r: any) => r['Contact External ID'] === MN_ID);

  if (csvRow) {
    console.log(`   Givebutter Contact ID: ${csvRow['Givebutter Contact ID']}`);
    console.log(`   Contact External ID: ${csvRow['Contact External ID']}`);
    console.log(`   Prefix: "${csvRow['Prefix']}"`);
    console.log(`   First Name: "${csvRow['First Name']}"`);
    console.log(`   Last Name: "${csvRow['Last Name']}"`);
    console.log(`   Email: ${csvRow['Email']}`);
    console.log(`   Phone: ${csvRow['Phone']}`);
  } else {
    console.log('   ❌ Not found in CSV');
  }

  // Analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSIS');
  console.log('='.repeat(80));

  if (signup && mentor && gbImport && csvRow) {
    // Check if preferred name changed at any stage
    if (signup.preferred_name !== signup.first_name) {
      console.log(`✅ Raw data has DIFFERENT preferred name: "${signup.preferred_name}" vs "${signup.first_name}"`);
    } else {
      console.log(`⚠️  Raw data shows SAME name: preferred="${signup.preferred_name}", first="${signup.first_name}"`);
    }

    if (mentor.preferred_name !== mentor.first_name) {
      console.log(`✅ Mentors table preserved difference: "${mentor.preferred_name}" vs "${mentor.first_name}"`);
    } else {
      console.log(`❌ Mentors table lost distinction: both are "${mentor.first_name}"`);
    }

    if (gbImport['Prefix'] !== gbImport['First Name']) {
      console.log(`✅ GB Import preserved difference: Prefix="${gbImport['Prefix']}" vs First="${gbImport['First Name']}"`);
    } else {
      console.log(`❌ GB Import lost distinction: both are "${gbImport['First Name']}"`);
    }

    // Check for data quality issues
    console.log('\n🔍 DATA QUALITY CHECKS:');

    if (mentor.preferred_name && mentor.preferred_name.includes(mentor.last_name)) {
      console.log(`⚠️  ISSUE: Preferred name contains last name: "${mentor.preferred_name}"`);
      console.log('   This might be a full name entered incorrectly');
    }

    if (mentor.first_name && mentor.first_name.includes(mentor.last_name)) {
      console.log(`⚠️  ISSUE: First name contains last name: "${mentor.first_name}"`);
      console.log('   This might be a full name entered incorrectly');
    }

    if (mentor.first_name && mentor.first_name.includes(' ')) {
      console.log(`⚠️  ISSUE: First name contains spaces: "${mentor.first_name}"`);
      console.log('   User may have entered full name in first name field');
    }

    if (mentor.preferred_name && mentor.preferred_name.includes(' ')) {
      console.log(`⚠️  ISSUE: Preferred name contains spaces: "${mentor.preferred_name}"`);
      console.log('   User may have entered full name in preferred name field');
    }

    // Check if it's a generic name issue
    const genericFirstNames = ['Student', 'Mentor', 'Test', 'N/A', 'None', 'Unknown'];
    if (genericFirstNames.some(g => mentor.first_name?.toLowerCase().includes(g.toLowerCase()))) {
      console.log(`⚠️  ISSUE: Generic first name detected: "${mentor.first_name}"`);
      console.log('   This is likely incomplete form data');
    }
  }

  console.log();
}

trace();
