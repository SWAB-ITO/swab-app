/**
 * Sync Configuration Values
 *
 * Copies correct values from sync_config (wizard) to sync_configs (sync scripts)
 * This is a temporary fix until we unify the two config systems
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function syncConfigValues() {
  console.log('\n🔄 Syncing config values from wizard to sync scripts...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Get values from sync_config (wizard)
  const { data: wizardConfig, error: wizardError } = await supabase
    .from('sync_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (wizardError || !wizardConfig) {
    console.error('❌ Failed to load wizard config:', wizardError);
    process.exit(1);
  }

  console.log('📋 Wizard Config (sync_config):');
  console.log('─'.repeat(60));
  console.log(`Jotform Signup Form:    ${wizardConfig.jotform_signup_form_id || 'NOT SET'}`);
  console.log(`Jotform Setup Form:     ${wizardConfig.jotform_setup_form_id || 'NOT SET'}`);
  console.log(`Jotform Training Form:  ${wizardConfig.jotform_training_signup_form_id || 'NOT SET'}`);
  console.log(`Givebutter Campaign:    ${wizardConfig.givebutter_campaign_code || 'NOT SET'}`);
  console.log('─'.repeat(60));

  // 2. Update sync_configs with correct values
  const updates = [];

  if (wizardConfig.jotform_signup_form_id) {
    updates.push({
      key: 'jotform_signup_form_id',
      value: wizardConfig.jotform_signup_form_id
    });
  }

  if (wizardConfig.jotform_setup_form_id) {
    updates.push({
      key: 'jotform_setup_form_id',
      value: wizardConfig.jotform_setup_form_id
    });
  }

  if (wizardConfig.jotform_training_signup_form_id) {
    updates.push({
      key: 'jotform_training_form_id',
      value: wizardConfig.jotform_training_signup_form_id
    });
  }

  if (wizardConfig.givebutter_campaign_code) {
    updates.push({
      key: 'givebutter_campaign_code',
      value: wizardConfig.givebutter_campaign_code
    });
  }

  console.log(`\n📝 Updating ${updates.length} config values...\n`);

  for (const update of updates) {
    const { error } = await supabase
      .from('sync_configs')
      .update({ config_value: update.value })
      .eq('year', 2025)
      .eq('config_key', update.key);

    if (error) {
      console.error(`❌ Failed to update ${update.key}:`, error.message);
    } else {
      console.log(`✅ Updated ${update.key} = ${update.value}`);
    }
  }

  // 3. Verify the updates
  console.log('\n🔍 Verifying sync_configs table...\n');

  const { data: syncConfigs, error: syncError } = await supabase
    .from('sync_configs')
    .select('config_key, config_value')
    .eq('year', 2025)
    .order('config_key');

  if (syncError) {
    console.error('❌ Failed to verify:', syncError);
    process.exit(1);
  }

  console.log('📋 Sync Scripts Config (sync_configs):');
  console.log('─'.repeat(60));
  syncConfigs?.forEach(config => {
    console.log(`${config.config_key.padEnd(35)} = ${config.config_value}`);
  });
  console.log('─'.repeat(60));

  console.log('\n✅ Config sync complete!\n');
  console.log('💡 Next step: Test sync with:');
  console.log('   npm run sync:givebutter-members\n');
}

syncConfigValues().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
