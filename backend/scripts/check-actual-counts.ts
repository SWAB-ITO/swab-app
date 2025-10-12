/**
 * Check Actual Row Counts (not limited by Supabase default 1000 limit)
 */
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkCounts() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('🔢 ACTUAL DATABASE ROW COUNTS');
  console.log('='.repeat(80) + '\n');

  // Use count() to get actual counts without fetching all rows
  const { count: mentorsCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  const { count: mentorsWithContactCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .not('gb_contact_id', 'is', null);

  const { count: gbContactsCount } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true });

  const { count: matchedContactsCount } = await supabase
    .from('raw_mn_gb_contacts')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Actual Row Counts:');
  console.log(`   mentors: ${mentorsCount?.toLocaleString() || 0}`);
  console.log(`   mentors with gb_contact_id: ${mentorsWithContactCount?.toLocaleString() || 0}`);
  console.log(`   raw_gb_full_contacts: ${gbContactsCount?.toLocaleString() || 0}`);
  console.log(`   raw_mn_gb_contacts: ${matchedContactsCount?.toLocaleString() || 0}`);
  console.log();

  const matchPercentage = mentorsCount && mentorsWithContactCount
    ? ((mentorsWithContactCount / mentorsCount) * 100).toFixed(2)
    : '0.00';

  console.log(`📈 Match Rate: ${matchPercentage}%`);
  console.log();

  // Check if there's a mismatch between CSV import log and actual data
  const { data: latestImport } = await supabase
    .from('csv_import_log')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (latestImport) {
    console.log('📥 Latest CSV Import:');
    console.log(`   Filename: ${latestImport.filename}`);
    console.log(`   Total contacts reported: ${latestImport.total_contacts.toLocaleString()}`);
    console.log(`   Actual in database: ${gbContactsCount?.toLocaleString() || 0}`);
    console.log(`   Mentors matched reported: ${latestImport.mentors_matched}`);
    console.log(`   Actual matched: ${matchedContactsCount?.toLocaleString() || 0}`);
    console.log();

    if (latestImport.total_contacts !== gbContactsCount) {
      console.log('⚠️  MISMATCH DETECTED!');
      console.log(`   ${latestImport.total_contacts - (gbContactsCount || 0)} contacts are missing from raw_gb_full_contacts`);
      console.log();
    }

    if (matchedContactsCount === 0 && mentorsWithContactCount && mentorsWithContactCount > 0) {
      console.log('⚠️  MATCHING ISSUE DETECTED!');
      console.log(`   ${mentorsWithContactCount} mentors have gb_contact_id set`);
      console.log(`   But raw_mn_gb_contacts table is empty!`);
      console.log(`   This suggests the contact matching didn't populate raw_mn_gb_contacts`);
      console.log();
    }
  }

  console.log('='.repeat(80) + '\n');
}

checkCounts();
