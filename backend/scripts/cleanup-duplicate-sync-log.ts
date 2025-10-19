/**
 * Clean up duplicate api contact sync entry with 0/0 stats
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function cleanupDuplicates() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n🧹 Cleaning up duplicate sync_log entries...\n');

  // Delete old api_contact_sync entry with 0/0 stats
  const { data: deleted, error } = await supabase
    .from('sync_log')
    .delete()
    .eq('sync_type', 'api_contact_sync')
    .eq('records_processed', 0)
    .eq('records_inserted', 0)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Deleted ${deleted?.length || 0} duplicate entries\n`);
}

cleanupDuplicates();
