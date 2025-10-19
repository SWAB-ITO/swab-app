/**
 * Verify that dropped mentors are excluded from mentors table
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyExclusion() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  const droppedIds = ['MN0064', 'MN0017'];

  console.log('\n🔍 Verifying dropped mentors are excluded from mentors table...\n');

  for (const mnId of droppedIds) {
    const { data: mentor, error } = await supabase
      .from('mentors')
      .select('mn_id, full_name, gb_contact_id')
      .eq('mn_id', mnId)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log(`✅ ${mnId}: Correctly excluded (not found in mentors table)`);
    } else if (mentor) {
      console.log(`❌ ${mnId}: FOUND in mentors table - exclusion failed!`);
      console.log(`   Name: ${mentor.full_name}`);
      console.log(`   GB Contact ID: ${mentor.gb_contact_id}`);
    } else {
      console.log(`⚠️  ${mnId}: Unexpected error:`, error);
    }
  }

  console.log('\n📊 Total mentors in table:');
  const { count } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  console.log(`   ${count} mentors (should be 655 if 2 were excluded from 657 unique signups)`);
}

verifyExclusion();
