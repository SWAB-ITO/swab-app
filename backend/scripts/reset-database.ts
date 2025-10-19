/**
 * RESET DATABASE
 *
 * Clears all processed data to start fresh sync
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function resetDatabase() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 RESETTING DATABASE');
  console.log('='.repeat(80) + '\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Clear processed tables
  const tablesToClear = [
    'mentors',
    'mn_gb_import',
    'raw_gb_full_contacts',
    'raw_gb_campaign_members',
  ];

  for (const table of tablesToClear) {
    console.log(`🗑️  Clearing ${table}...`);
    const { error } = await supabase.from(table).delete().neq('created_at', '1900-01-01');

    if (error) {
      console.error(`❌ Error clearing ${table}:`, error);
    } else {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`   ✅ Cleared ${table} (${count || 0} rows remaining)\n`);
    }
  }

  console.log('='.repeat(80));
  console.log('✅ DATABASE RESET COMPLETE');
  console.log('='.repeat(80) + '\n');
}

resetDatabase().catch(error => {
  console.error('❌ Reset failed:', error);
  process.exit(1);
});
