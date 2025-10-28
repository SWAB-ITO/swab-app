/**
 * Export mentors data from local Supabase for production import
 *
 * This script exports the mentors table and related data needed
 * for production check-in functionality.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function exportMentorsData() {
  console.log('================================================================================');
  console.log('📦 EXPORTING MENTORS DATA FOR PRODUCTION');
  console.log('================================================================================\n');

  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);

  // 1. Export mentors table
  console.log('📊 Exporting mentors table...');
  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('*')
    .order('mn_id');

  if (mentorsError) {
    console.error('❌ Error exporting mentors:', mentorsError);
    process.exit(1);
  }

  console.log(`✅ Exported ${mentors?.length || 0} mentors\n`);

  // 2. Export sync_configs (needed for production)
  console.log('📊 Exporting sync_configs...');
  const { data: configs, error: configsError } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('active', true);

  if (configsError) {
    console.error('❌ Error exporting configs:', configsError);
    process.exit(1);
  }

  console.log(`✅ Exported ${configs?.length || 0} config entries\n`);

  // 3. Create export package
  const exportData = {
    exported_at: new Date().toISOString(),
    source: 'local_supabase',
    data: {
      mentors: mentors || [],
      sync_configs: configs || [],
    },
    stats: {
      total_mentors: mentors?.length || 0,
      mentors_with_gb_contact: mentors?.filter(m => m.gb_contact_id).length || 0,
      active_mentors: mentors?.filter(m => !m.dropped).length || 0,
      dropped_mentors: mentors?.filter(m => m.dropped).length || 0,
    }
  };

  // 4. Save to file
  const timestamp = new Date().toISOString().split('T')[0];
  const exportPath = join(process.cwd(), 'backend', 'scripts', `mentors-export-${timestamp}.json`);

  writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

  console.log('================================================================================');
  console.log('✅ EXPORT COMPLETE');
  console.log('================================================================================');
  console.log(`📁 File: ${exportPath}`);
  console.log(`📊 Total mentors: ${exportData.stats.total_mentors}`);
  console.log(`✅ Active: ${exportData.stats.active_mentors}`);
  console.log(`❌ Dropped: ${exportData.stats.dropped_mentors}`);
  console.log(`🔗 With GB contact: ${exportData.stats.mentors_with_gb_contact}`);
  console.log('================================================================================\n');

  console.log('📋 NEXT STEPS:');
  console.log('1. Run migrations on production Supabase');
  console.log('2. Import this data using import-mentors-to-prod.ts');
  console.log('3. Update .env.local to point to production');
  console.log('4. Test check-in functionality\n');
}

exportMentorsData().catch(console.error);
