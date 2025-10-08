/**
 * CHECK GENERATED TEXT MESSAGES
 *
 * Shows what messages were generated for mentors grouped by status
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkMessages() {
  console.log('\n' + '='.repeat(80));
  console.log('📱 TEXT MESSAGE VERIFICATION');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get sample messages for each status category
  const statuses = ['needs_setup', 'needs_page', 'needs_fundraising', 'complete'];

  for (const status of statuses) {
    console.log(`\n━━━ ${status.toUpperCase()} ━━━\n`);

    const { data, error } = await supabase
      .from('mentors')
      .select('mn_id, first_name, status_category')
      .eq('status_category', status)
      .limit(1);

    if (error) {
      console.error('Error:', error);
      continue;
    }

    if (!data || data.length === 0) {
      console.log('   No mentors found with this status\n');
      continue;
    }

    // Get the corresponding mn_gb_import row
    const { data: importData, error: importError } = await supabase
      .from('mn_gb_import')
      .select('mn_id, "First Name", "📱Custom Text Message 1️⃣"')
      .eq('mn_id', data[0].mn_id)
      .single();

    if (importError) {
      console.error('Error fetching import data:', importError);
      continue;
    }

    console.log(`   Mentor: ${importData['First Name']} (${importData.mn_id})`);
    console.log(`   Message: ${importData['📱Custom Text Message 1️⃣'] || '(empty)'}`);
    console.log(`   Length: ${(importData['📱Custom Text Message 1️⃣'] || '').length} chars\n`);
  }

  // Show counts by status
  console.log('='.repeat(80));
  console.log('📊 MESSAGE COUNTS BY STATUS\n');

  const { data: counts } = await supabase
    .from('mentors')
    .select('status_category');

  if (counts) {
    const breakdown = counts.reduce((acc: any, row: any) => {
      acc[row.status_category] = (acc[row.status_category] || 0) + 1;
      return acc;
    }, {});

    Object.entries(breakdown).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} mentors`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkMessages();
