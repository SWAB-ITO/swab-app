import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function debug() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('Fetching one record from mn_gb_import...\n');

  const { data, error } = await supabase
    .from('mn_gb_import')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No data found!');
    return;
  }

  const record = data[0];
  console.log('MN ID:', record.mn_id);
  console.log('\nAll keys in record:');
  Object.keys(record).sort().forEach(key => {
    const value = record[key];
    if (value && typeof value === 'string' && value.length > 50) {
      console.log(`  ${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  });
}

debug();
