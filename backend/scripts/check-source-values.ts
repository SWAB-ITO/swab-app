/**
 * Check what source values exist in raw_gb_full_contacts
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkSourceValues() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n🔍 Checking source values in raw_gb_full_contacts...\n');

  // Get distinct source values
  const { data, error } = await supabase
    .from('raw_gb_full_contacts')
    .select('source')
    .limit(1000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Count occurrences
  const sourceCounts: Record<string, number> = {};
  data?.forEach(row => {
    const source = row.source || 'null';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  console.log('Source values found:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} records`);
  });
}

checkSourceValues();
