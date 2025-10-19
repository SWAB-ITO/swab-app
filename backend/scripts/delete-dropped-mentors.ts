/**
 * Delete dropped mentors from database and re-run ETL to test exclusion
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function deleteDroppedMentors() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  const droppedIds = ['MN0064', 'MN0017'];

  console.log('\n🗑️  Deleting dropped mentors from mentors table...\n');

  for (const mnId of droppedIds) {
    const { error } = await supabase
      .from('mentors')
      .delete()
      .eq('mn_id', mnId);

    if (error) {
      console.log(`❌ Error deleting ${mnId}:`, error.message);
    } else {
      console.log(`✅ Deleted ${mnId}`);
    }
  }

  console.log('\n✅ Deletion complete. Now run: npm run etl\n');
}

deleteDroppedMentors();
