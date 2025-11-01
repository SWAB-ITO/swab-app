import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifyTables() {
  console.log('\n🔍 VERIFYING PHASE 1 DATABASE TABLES\n');
  console.log('═'.repeat(60));

  const tablesToCheck = [
    'sync_configs',
    'sync_conflicts',
    'sync_warnings',
    'mn_changes',
    'sync_errors'
  ];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table.padEnd(20)} ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${table.padEnd(20)} Exists (${count || 0} rows)`);
      }
    } catch (err: any) {
      console.log(`❌ ${table.padEnd(20)} ERROR: ${err.message}`);
    }
  }

  console.log('═'.repeat(60));

  // Check sync_configs specifically for 2025 data
  const { data: configs, error: configError } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('year', 2025);

  if (!configError && configs && configs.length > 0) {
    console.log('\n📋 2025 Configuration Loaded:');
    console.log('─'.repeat(60));
    configs.forEach(config => {
      console.log(`  ${config.config_key.padEnd(30)} = ${config.config_value}`);
    });
  }

  console.log('\n');
}

verifyTables();
