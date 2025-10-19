/**
 * Check sync_log table contents
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkSyncLog() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n🔍 Checking sync_log table...\n');

  const { data: logs, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${logs?.length || 0} recent entries:\n`);

  logs?.forEach(log => {
    console.log(`Type: ${log.sync_type}`);
    console.log(`Status: ${log.status}`);
    console.log(`Started: ${log.started_at}`);
    console.log(`Duration: ${log.duration_seconds}s`);
    console.log(`Processed: ${log.records_processed || 0}`);
    console.log(`Inserted: ${log.records_inserted || 0}`);
    console.log('---');
  });
}

checkSyncLog();
