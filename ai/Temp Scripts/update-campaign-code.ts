/**
 * Update Givebutter campaign code from slug to actual code
 * The slug is "SWABUGA2025" but the API uses the code "CQVG3W"
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function updateCampaignCode() {
  console.log('🔄 Updating campaign code...\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Update the campaign code
  const { error: updateError } = await supabase
    .from('sync_configs')
    .update({ config_value: 'CQVG3W' })
    .eq('year', 2025)
    .eq('config_key', 'givebutter_campaign_code');

  if (updateError) {
    console.error('❌ Error updating campaign code:', updateError);
    process.exit(1);
  }

  console.log('✅ Updated givebutter_campaign_code from "SWABUGA2025" to "CQVG3W"\n');

  // Verify the update
  const { data, error: selectError } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('config_key', 'givebutter_campaign_code');

  if (selectError) {
    console.error('❌ Error verifying update:', selectError);
    process.exit(1);
  }

  console.log('📋 Current config:\n');
  console.table(data);
}

updateCampaignCode();
