/**
 * Archive duplicate signups by deleting older submissions
 * Keeps the newer signup (as determined by ETL process)
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function archiveDuplicates() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Duplicate pairs: [older (to delete), newer (to keep)]
  const duplicates = [
    ['MN0377', 'MN0570'],
    ['MN0297', 'MN0530'],
    ['MN0158', 'MN0559'],
    ['MN0210', 'MN0295'],
    ['MN0177', 'MN0515'],
    ['MN0088', 'MN0271'],
    ['MN0067', 'MN0409'],
    ['MN0055', 'MN0239'],
    ['MN0023', 'MN0454'],
  ];

  console.log('\n📦 Archiving duplicate signups...\n');
  console.log(`Found ${duplicates.length} duplicate pairs to process\n`);

  let deleted = 0;
  let notFound = 0;
  let errors = 0;

  for (const [olderMnId, newerMnId] of duplicates) {
    console.log(`Processing: ${olderMnId} (delete) → ${newerMnId} (keep)`);

    // Check if older signup exists
    const { data: olderSignup, error: fetchError } = await supabase
      .from('raw_mn_signups')
      .select('submission_id, first_name, last_name, phone')
      .eq('mn_id', olderMnId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      console.log(`  ⚠️  ${olderMnId} not found in raw_mn_signups (already removed?)`);
      notFound++;
      continue;
    }

    if (fetchError) {
      console.log(`  ❌ Error fetching ${olderMnId}:`, fetchError.message);
      errors++;
      continue;
    }

    if (olderSignup) {
      console.log(`  📋 Found: ${olderSignup.first_name} ${olderSignup.last_name} (${olderSignup.phone})`);

      // Delete the older signup
      const { error: deleteError } = await supabase
        .from('raw_mn_signups')
        .delete()
        .eq('mn_id', olderMnId);

      if (deleteError) {
        console.log(`  ❌ Error deleting ${olderMnId}:`, deleteError.message);
        errors++;
      } else {
        console.log(`  ✅ Deleted ${olderMnId}`);
        deleted++;
      }
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('✅ ARCHIVING COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Results:`);
  console.log(`   Deleted: ${deleted}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total processed: ${duplicates.length}`);
  console.log();
  console.log('💡 Next steps:');
  console.log('   1. Run: npm run etl');
  console.log('   2. Verify no duplicate warnings appear');
  console.log();
}

archiveDuplicates();
