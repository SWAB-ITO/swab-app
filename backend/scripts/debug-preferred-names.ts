/**
 * Debug script to check preferred_name data through the pipeline
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function debugPreferredNames() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUGGING PREFERRED NAMES THROUGH PIPELINE');
  console.log('='.repeat(80) + '\n');

  // Check raw_mn_signups
  console.log('1️⃣  Checking raw_mn_signups table...\n');

  const { data: rawSignups, error: signupsError } = await supabase
    .from('raw_mn_signups')
    .select('submission_id, first_name, preferred_name')
    .limit(50);

  if (signupsError) {
    console.error('Error fetching raw_mn_signups:', signupsError);
    return;
  }

  const rawWithDifferent = rawSignups?.filter(s =>
    s.preferred_name && s.preferred_name !== s.first_name
  ) || [];

  const rawWithSame = rawSignups?.filter(s =>
    s.preferred_name && s.preferred_name === s.first_name
  ) || [];

  const rawWithNull = rawSignups?.filter(s => !s.preferred_name) || [];

  console.log('Raw Signups Analysis:');
  console.log(`  Total checked: ${rawSignups?.length || 0}`);
  console.log(`  With NULL preferred_name: ${rawWithNull.length}`);
  console.log(`  With preferred_name = first_name: ${rawWithSame.length}`);
  console.log(`  With DIFFERENT preferred_name: ${rawWithDifferent.length}`);

  if (rawWithDifferent.length > 0) {
    console.log('\n  Examples with DIFFERENT preferred names:');
    rawWithDifferent.slice(0, 5).forEach(s => {
      console.log(`    ${s.submission_id}: First="${s.first_name}", Preferred="${s.preferred_name}"`);
    });
  }

  // Check mentors table
  console.log('\n2️⃣  Checking mentors table...\n');

  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('mn_id, first_name, preferred_name')
    .limit(50);

  if (mentorsError) {
    console.error('Error fetching mentors:', mentorsError);
    return;
  }

  const mentorsWithDifferent = mentors?.filter(m =>
    m.preferred_name && m.preferred_name !== m.first_name
  ) || [];

  const mentorsWithSame = mentors?.filter(m =>
    m.preferred_name && m.preferred_name === m.first_name
  ) || [];

  const mentorsWithNull = mentors?.filter(m => !m.preferred_name) || [];

  console.log('Mentors Table Analysis:');
  console.log(`  Total checked: ${mentors?.length || 0}`);
  console.log(`  With NULL preferred_name: ${mentorsWithNull.length}`);
  console.log(`  With preferred_name = first_name: ${mentorsWithSame.length}`);
  console.log(`  With DIFFERENT preferred_name: ${mentorsWithDifferent.length}`);

  if (mentorsWithDifferent.length > 0) {
    console.log('\n  Examples with DIFFERENT preferred names:');
    mentorsWithDifferent.slice(0, 5).forEach(m => {
      console.log(`    ${m.mn_id}: First="${m.first_name}", Preferred="${m.preferred_name}"`);
    });
  }

  // Check mn_gb_import table
  console.log('\n3️⃣  Checking mn_gb_import table...\n');

  const { data: imports, error: importsError } = await supabase
    .from('mn_gb_import')
    .select('mn_id, "First Name", Prefix')
    .limit(50);

  if (importsError) {
    console.error('Error fetching mn_gb_import:', importsError);
    return;
  }

  const importsWithDifferent = imports?.filter(i =>
    i.Prefix && i.Prefix !== i['First Name']
  ) || [];

  const importsWithSame = imports?.filter(i =>
    i.Prefix && i.Prefix === i['First Name']
  ) || [];

  const importsWithNull = imports?.filter(i => !i.Prefix) || [];

  console.log('Import Table Analysis:');
  console.log(`  Total checked: ${imports?.length || 0}`);
  console.log(`  With NULL Prefix: ${importsWithNull.length}`);
  console.log(`  With Prefix = First Name: ${importsWithSame.length}`);
  console.log(`  With DIFFERENT Prefix: ${importsWithDifferent.length}`);

  if (importsWithDifferent.length > 0) {
    console.log('\n  Examples with DIFFERENT Prefix:');
    importsWithDifferent.slice(0, 5).forEach(i => {
      console.log(`    ${i.mn_id}: First="${i['First Name']}", Prefix="${i.Prefix}"`);
    });
  }

  // Check full counts
  console.log('\n4️⃣  Full count analysis...\n');

  const { count: totalRaw } = await supabase
    .from('raw_mn_signups')
    .select('*', { count: 'exact', head: true });

  const { count: rawDifferentCount } = await supabase
    .from('raw_mn_signups')
    .select('*', { count: 'exact', head: true })
    .neq('preferred_name', null)
    .filter('preferred_name', 'neq', 'first_name');

  const { count: totalMentors } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  const { count: mentorsDifferentCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .neq('preferred_name', null)
    .filter('preferred_name', 'neq', 'first_name');

  console.log('FULL DATABASE COUNTS:');
  console.log(`  raw_mn_signups with different preferred_name: ${rawDifferentCount}/${totalRaw}`);
  console.log(`  mentors with different preferred_name: ${mentorsDifferentCount}/${totalMentors}`);

  console.log('\n' + '='.repeat(80));
  console.log('🎯 DIAGNOSIS:');
  console.log('='.repeat(80));

  if (rawDifferentCount === 0) {
    console.log('\n❌ ISSUE FOUND: raw_mn_signups has NO records with different preferred names');
    console.log('   This means the Jotform sync is not capturing preferred_name correctly.');
    console.log('   Possible causes:');
    console.log('   1. Jotform field name is wrong in the sync script');
    console.log('   2. Jotform form field is named differently');
    console.log('   3. Mentors are entering the same name in both fields');
  } else if (mentorsDifferentCount === 0 && rawDifferentCount > 0) {
    console.log('\n❌ ISSUE FOUND: raw_mn_signups has different names, but mentors table does not');
    console.log('   This means the ETL process is overwriting preferred_name with first_name.');
    console.log('   Check backend/core/etl/process.ts line ~501');
  } else if (mentorsDifferentCount > 0) {
    console.log('\n✅ Pipeline is working correctly!');
    console.log(`   Found ${mentorsDifferentCount} mentors with different preferred names.`);
  }

  console.log();
}

debugPreferredNames();