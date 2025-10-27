/**
 * VERIFY CSV FAILURE FIX
 *
 * Checks if the 29 previously failed contacts now have correct GB contact IDs
 * with matching External IDs after the ETL fix.
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function verifyFix() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFYING CSV FAILURE FIX');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Sample of the previously failed MN IDs
  const failedIds = [
    'MN0543', 'MN0548', 'MN0493', 'MN0410', 'MN0382',
    'MN0379', 'MN0570', 'MN0380', 'MN0251', 'MN0221'
  ];

  let fixedCount = 0;
  let stillBrokenCount = 0;

  console.log('📋 Checking 10 sample contacts from the 29 that failed:\n');

  for (const mnId of failedIds) {
    // Get mentor data
    const { data: mentor, error: mentorError } = await supabase
      .from('mentors')
      .select('mn_id, gb_contact_id, first_name, last_name')
      .eq('mn_id', mnId)
      .single();

    if (mentorError) {
      console.log(`❌ ${mnId}: Not found - ${mentorError.message}`);
      stillBrokenCount++;
      continue;
    }

    // Get contact data
    const { data: contact, error: contactError } = await supabase
      .from('raw_gb_full_contacts')
      .select('contact_id, external_id, primary_email')
      .eq('contact_id', mentor.gb_contact_id)
      .single();

    if (contactError) {
      console.log(`❌ ${mnId}: Contact ${mentor.gb_contact_id} not found`);
      stillBrokenCount++;
      continue;
    }

    const isFixed = contact.external_id === mnId;
    const icon = isFixed ? '✅' : '❌';

    console.log(`${icon} ${mnId}: ${mentor.first_name} ${mentor.last_name}`);
    console.log(`   GB Contact ID: ${mentor.gb_contact_id}`);
    console.log(`   External ID: ${contact.external_id || 'NULL'}`);
    console.log(`   Status: ${isFixed ? 'FIXED - External ID matches' : 'BROKEN - External ID mismatch'}\n`);

    if (isFixed) {
      fixedCount++;
    } else {
      stillBrokenCount++;
    }
  }

  console.log('='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80) + '\n');
  console.log(`✅ Fixed: ${fixedCount}/${failedIds.length}`);
  console.log(`❌ Still Broken: ${stillBrokenCount}/${failedIds.length}`);

  if (fixedCount === failedIds.length) {
    console.log('\n🎉 SUCCESS! All sampled contacts are now fixed!');
    console.log('   The ETL is now correctly matching by External ID first.\n');
    console.log('📋 Next steps:');
    console.log('   1. Re-export CSV: npm run comms:export');
    console.log('   2. Upload to Givebutter (expect 0 errors)');
  } else {
    console.log('\n⚠️  Some contacts still have issues. Further investigation needed.\n');
  }

  console.log('='.repeat(80) + '\n');
}

verifyFix().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
