/**
 * Quick script to check for dropped mentor errors
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkDroppedMentors() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n🔍 Checking for dropped mentor errors...\n');

  // Query for dropped mentor errors
  const { data: droppedErrors, error: droppedError } = await supabase
    .from('mn_errors')
    .select('*')
    .eq('error_type', 'dropped_mentor')
    .order('created_at', { ascending: false });

  if (droppedError) {
    console.error('❌ Error querying dropped mentors:', droppedError);
    return;
  }

  console.log(`Found ${droppedErrors?.length || 0} dropped mentor entries:\n`);

  if (droppedErrors && droppedErrors.length > 0) {
    droppedErrors.forEach(error => {
      console.log(`  MN ID: ${error.mn_id || 'N/A'}`);
      console.log(`  Phone: ${error.phone || 'N/A'}`);
      console.log(`  Email: ${error.email || 'N/A'}`);
      console.log(`  Message: ${error.error_message}`);
      console.log(`  GB Contact ID: ${error.raw_data?.gb_contact_id || 'N/A'}`);
      console.log(`  Created: ${error.created_at}\n`);
    });
  }

  // Also check all error types
  const { data: allErrors, error: allError } = await supabase
    .from('mn_errors')
    .select('error_type, count')
    .order('error_type');

  if (!allError && allErrors) {
    console.log('\n📊 Error breakdown by type:');
    const errorCounts: Record<string, number> = {};

    const { data: errorList } = await supabase
      .from('mn_errors')
      .select('error_type');

    if (errorList) {
      errorList.forEach(e => {
        errorCounts[e.error_type] = (errorCounts[e.error_type] || 0) + 1;
      });

      Object.entries(errorCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
  }
}

checkDroppedMentors();
