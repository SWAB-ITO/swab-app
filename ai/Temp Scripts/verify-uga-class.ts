/**
 * Verify UGA class data in mentors and mn_gb_import tables
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyUgaClass() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFYING UGA CLASS DATA');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Check mentors table
  console.log('📊 Checking mentors table...\n');

  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('mn_id, uga_class, training_signup_done')
    .limit(10);

  if (mentorsError) {
    console.error('❌ Error querying mentors:', mentorsError);
  } else {
    console.log(`✅ Sample mentors (first 10):`);
    mentors?.forEach(m => {
      console.log(`   ${m.mn_id}: ${m.uga_class || 'NULL'} (training signup: ${m.training_signup_done ? 'Yes' : 'No'})`);
    });
  }

  // Get UGA class distribution in mentors
  const { data: mentorStats } = await supabase
    .from('mentors')
    .select('uga_class')
    .not('uga_class', 'is', null);

  const mentorClassCounts = mentorStats?.reduce((acc, m) => {
    acc[m.uga_class] = (acc[m.uga_class] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📈 UGA Class Distribution in mentors:');
  Object.entries(mentorClassCounts || {}).forEach(([ugaClass, count]) => {
    console.log(`   ${ugaClass}: ${count}`);
  });

  const { count: nullCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true })
    .is('uga_class', null);

  console.log(`   NULL: ${nullCount}`);

  // Check mn_gb_import table
  console.log('\n📊 Checking mn_gb_import table...\n');

  const { data: gbImport, error: gbImportError } = await supabase
    .from('mn_gb_import')
    .select('mn_id, "🎓 UGA Class"')
    .limit(10);

  if (gbImportError) {
    console.error('❌ Error querying mn_gb_import:', gbImportError);
  } else {
    console.log(`✅ Sample mn_gb_import (first 10):`);
    gbImport?.forEach(m => {
      console.log(`   ${m.mn_id}: ${m['🎓 UGA Class'] || 'NULL'}`);
    });
  }

  // Get UGA class distribution in mn_gb_import
  const { data: gbImportStats } = await supabase
    .from('mn_gb_import')
    .select('"🎓 UGA Class"')
    .not('🎓 UGA Class', 'is', null);

  const gbImportClassCounts = gbImportStats?.reduce((acc: any, m: any) => {
    const ugaClass = m['🎓 UGA Class'];
    acc[ugaClass] = (acc[ugaClass] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📈 UGA Class Distribution in mn_gb_import:');
  Object.entries(gbImportClassCounts || {}).forEach(([ugaClass, count]) => {
    console.log(`   ${ugaClass}: ${count}`);
  });

  const { count: gbNullCount } = await supabase
    .from('mn_gb_import')
    .select('*', { count: 'exact', head: true })
    .is('🎓 UGA Class', null);

  console.log(`   NULL: ${gbNullCount}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

verifyUgaClass();
