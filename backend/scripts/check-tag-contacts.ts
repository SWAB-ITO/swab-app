/**
 * Check what contacts have the "Mentors 2025" tag in Givebutter
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { GivebutterClient } from '../lib/infrastructure/clients/givebutter-client';
import { Logger } from '../lib/utils/logger';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function checkTaggedContacts() {
  const logger = new Logger('CheckTaggedContacts');
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get API key
  const { data: syncConfig } = await supabase
    .from('sync_config')
    .select('givebutter_api_key, current_tag_filter')
    .eq('id', 1)
    .single();

  if (!syncConfig?.givebutter_api_key) {
    console.log('❌ No API key configured');
    process.exit(1);
  }

  const gbClient = new GivebutterClient({
    apiKey: syncConfig.givebutter_api_key,
    logger,
  });

  const tagFilter = syncConfig.current_tag_filter || 'Mentors 2025';
  
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 ANALYZING CONTACTS WITH TAG: "${tagFilter}"`);
  console.log('='.repeat(80) + '\n');

  // Fetch first 100 contacts with tag
  const url = `/contacts?tags=${encodeURIComponent(tagFilter)}&page=1&per_page=100`;
  const response = await gbClient.get<{ data: any[]; meta: any }>(url);

  console.log(`📊 Total contacts with this tag: ${response.meta?.total || 'Unknown'}\n`);
  console.log(`📋 Sample of first 20 contacts:\n`);

  const sample = response.data.slice(0, 20);
  
  sample.forEach((contact, i) => {
    const tags = contact.tags?.join(', ') || 'No tags';
    const customFields = contact.custom_fields || {};
    const signupComplete = customFields['📝 Sign Up Complete'] || 'Not set';
    
    console.log(`${i + 1}. ID: ${contact.id} | ${contact.first_name} ${contact.last_name}`);
    console.log(`   Email: ${contact.primary_email || contact.email}`);
    console.log(`   Tags: ${tags}`);
    console.log(`   Sign Up Complete: ${signupComplete}`);
    console.log(`   Created: ${contact.created_at}`);
    console.log('');
  });

  console.log('💡 Analysis:');
  console.log(`   - Expected mentors: ~670`);
  console.log(`   - Contacts with tag: ${response.meta?.total || 'Unknown'}`);
  console.log(`   - Difference: ${(response.meta?.total || 0) - 670}`);
  console.log('\n🤔 Possible reasons for extra contacts:');
  console.log('   1. Historical mentors from previous years');
  console.log('   2. Duplicate contacts');
  console.log('   3. Tag applied to non-mentors (donors, volunteers, etc.)');
  console.log('   4. Contacts from test imports\n');
}

checkTaggedContacts();
