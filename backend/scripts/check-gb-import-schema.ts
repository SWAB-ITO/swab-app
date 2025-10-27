/**
 * CHECK MN_GB_IMPORT SCHEMA
 *
 * Queries the actual schema and sample data from mn_gb_import table
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function checkSchema() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 CHECKING MN_GB_IMPORT SCHEMA');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get a sample record to see all columns
  const { data: sampleData, error } = await supabase
    .from('mn_gb_import')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error fetching sample data:', error);
    process.exit(1);
  }

  if (!sampleData || sampleData.length === 0) {
    console.log('⚠️  No data in mn_gb_import table');
    process.exit(0);
  }

  const sample = sampleData[0];
  const columns = Object.keys(sample);

  console.log('📊 Total Columns:', columns.length);
  console.log('\n📝 Column Names:\n');

  // Organize columns by category
  const basicFields: string[] = [];
  const customFields: string[] = [];
  const metaFields: string[] = [];

  columns.forEach(col => {
    if (col.includes('📝') || col.includes('💸') || col.includes('📆') ||
        col.includes('👯') || col.includes('🚂') || col.includes('📈') ||
        col.includes('📧') || col.includes('📱') || col.includes('💰') ||
        col.includes('✅')) {
      customFields.push(col);
    } else if (col === 'needs_sync' || col === 'last_synced_at' ||
               col === 'created_at' || col === 'updated_at' || col === 'mn_id') {
      metaFields.push(col);
    } else {
      basicFields.push(col);
    }
  });

  console.log('🔹 Basic Givebutter Fields:');
  basicFields.forEach(col => console.log(`   - ${col}`));

  console.log('\n🔸 Custom Fields (Emoji):');
  customFields.forEach(col => {
    const value = sample[col];
    console.log(`   - ${col}: ${JSON.stringify(value)}`);
  });

  console.log('\n🔹 Metadata Fields:');
  metaFields.forEach(col => console.log(`   - ${col}`));

  console.log('\n' + '='.repeat(80) + '\n');
}

checkSchema().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
