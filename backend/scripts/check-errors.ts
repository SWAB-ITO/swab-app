/**
 * Check mn_errors table contents
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkErrors() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n📊 Checking mn_errors table...\n');

  const { data: errors, error } = await supabase
    .from('mn_errors')
    .select('error_type, error_message, severity, mn_id')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by error type
  const grouped = errors?.reduce((acc: Record<string, any>, err) => {
    acc[err.error_type] = acc[err.error_type] || { count: 0, examples: [] };
    acc[err.error_type].count++;
    if (acc[err.error_type].examples.length < 3) {
      acc[err.error_type].examples.push({
        mn_id: err.mn_id,
        message: err.error_message,
        severity: err.severity
      });
    }
    return acc;
  }, {});

  console.log(`Total errors found: ${errors?.length || 0}\n`);

  Object.entries(grouped || {}).forEach(([type, data]: [string, any]) => {
    console.log(`${type}: ${data.count} errors`);
    data.examples.forEach((ex: any, idx: number) => {
      console.log(`  Example ${idx + 1} (${ex.mn_id}): ${ex.message.substring(0, 100)}...`);
    });
    console.log();
  });
}

checkErrors();
