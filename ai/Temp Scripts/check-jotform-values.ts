/**
 * Check actual UGA class values from Jotform
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkJotformValues() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING JOTFORM UGA CLASS VALUES');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Check raw_mn_training_signup
  console.log('📊 Checking raw_mn_training_signup...\n');

  const { data: trainingSignups } = await supabase
    .from('raw_mn_training_signup')
    .select('uga_class')
    .not('uga_class', 'is', null);

  const trainingClassCounts = trainingSignups?.reduce((acc, t) => {
    acc[t.uga_class] = (acc[t.uga_class] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📈 UGA Class values in raw_mn_training_signup:');
  Object.entries(trainingClassCounts || {}).forEach(([ugaClass, count]) => {
    console.log(`   "${ugaClass}": ${count}`);
  });

  // Check raw_mn_signups
  console.log('\n📊 Checking raw_mn_signups...\n');

  const { data: signups } = await supabase
    .from('raw_mn_signups')
    .select('uga_class')
    .not('uga_class', 'is', null);

  const signupClassCounts = signups?.reduce((acc, s) => {
    acc[s.uga_class] = (acc[s.uga_class] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📈 UGA Class values in raw_mn_signups:');
  Object.entries(signupClassCounts || {}).forEach(([ugaClass, count]) => {
    console.log(`   "${ugaClass}": ${count}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Expected Givebutter values:');
  console.log('  - "Freshman"');
  console.log('  - "Sophomore"');
  console.log('  - "Junior"');
  console.log('  - "Senior"');
  console.log('  - "Grad Student"');
  console.log('='.repeat(80) + '\n');
}

checkJotformValues();
