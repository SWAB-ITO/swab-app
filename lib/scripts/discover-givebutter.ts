/**
 * DISCOVERY SCRIPT: Givebutter API
 *
 * Run this FIRST to understand actual field names before building schema.
 * This outputs the real data structure so we can map fields correctly.
 *
 * Usage: npm run discover:givebutter
 */

import 'dotenv/config';

const API_KEY = process.env.GIVEBUTTER_API_KEY;
const CAMPAIGN_ID = process.env.GIVEBUTTER_CAMPAIGN_ID || 'CQVG3W';
const BASE_URL = 'https://api.givebutter.com/v1';

async function fetchGivebutter(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Givebutter API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function exploreCampaign(campaignId: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 EXPLORING CAMPAIGN: ${campaignId}`);
  console.log('='.repeat(80));

  // Get campaign details
  console.log('\n🔍 Fetching campaign details...');
  const campaignData = await fetchGivebutter(`/campaigns/${campaignId}`);
  const campaign = campaignData.data;

  console.log('\n📝 CAMPAIGN INFO:');
  console.log('─'.repeat(80));
  console.log(`Title: ${campaign.title}`);
  console.log(`Type: ${campaign.type}`);
  console.log(`Goal: $${campaign.goal?.toLocaleString() || 0}`);
  console.log(`Raised: $${campaign.raised?.toLocaleString() || 0}`);
  console.log(`Donors: ${campaign.donors || 0}`);

  // Get members
  console.log('\n👥 Fetching campaign members...');
  const membersData = await fetchGivebutter(`/campaigns/${campaignId}/members?per_page=20`);
  const members = membersData.data;
  const meta = membersData.meta;

  console.log(`✅ Found ${meta.total} total members (showing first ${members.length})\n`);

  if (members.length > 0) {
    const sample = members[0];

    console.log('🔬 SAMPLE MEMBER STRUCTURE:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(sample, null, 2));

    console.log('\n💡 SUGGESTED DATABASE MAPPING (Campaign Members):');
    console.log('─'.repeat(80));
    console.log('Based on this data, consider these fields:\n');

    for (const [key, value] of Object.entries(sample)) {
      let type = 'TEXT';

      if (typeof value === 'number') {
        type = value % 1 === 0 ? 'INTEGER' : 'DECIMAL';
      } else if (typeof value === 'boolean') {
        type = 'BOOLEAN';
      } else if (value === null) {
        type = 'TEXT';
      }

      console.log(`  ${key} ${type},`);
    }

    console.log('\n');
  }

  // Get teams
  console.log('🏆 Fetching campaign teams...');
  const teamsData = await fetchGivebutter(`/campaigns/${campaignId}/teams`);
  const teams = teamsData.data;

  if (teams.length > 0) {
    console.log(`✅ Found ${teams.length} teams:\n`);

    for (const team of teams) {
      console.log(`  - ${team.name} (${team.members} members, $${team.raised?.toLocaleString() || 0} raised)`);
    }
    console.log();
  }

  return { campaign, members, teams };
}

async function exploreContacts() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('👤 EXPLORING CONTACTS');
  console.log('='.repeat(80));

  console.log('\n🔍 Fetching sample contacts (first 5)...');
  console.log('⚠️  Note: Givebutter has 20/page limit, this may take a moment...\n');

  const contactsData = await fetchGivebutter('/contacts?per_page=5');
  const contacts = contactsData.data;
  const meta = contactsData.meta;

  console.log(`ℹ️  Total contacts: ${meta.total.toLocaleString()}`);
  console.log(`    Showing: ${contacts.length} samples\n`);

  if (contacts.length > 0) {
    const sample = contacts[0];

    console.log('🔬 SAMPLE CONTACT STRUCTURE:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(sample, null, 2));

    console.log('\n💡 SUGGESTED DATABASE MAPPING (Contacts):');
    console.log('─'.repeat(80));
    console.log('Key fields to store:\n');

    console.log('  id INTEGER PRIMARY KEY,');
    console.log('  first_name TEXT,');
    console.log('  last_name TEXT,');
    console.log('  primary_email TEXT,');
    console.log('  primary_phone TEXT,');
    console.log('  tags TEXT[],');
    console.log('  custom_fields JSONB, -- Store custom data here');
    console.log('  created_at TIMESTAMPTZ,');
    console.log('  updated_at TIMESTAMPTZ');

    console.log('\n📝 CUSTOM FIELDS NOTE:');
    console.log('─'.repeat(80));
    console.log('The custom_fields JSONB column can store data like:');
    console.log('  - text_instructions (for messaging)');
    console.log('  - status_category (computed from our database)');
    console.log('  - Any other mentor-specific data');
    console.log('\nYou can update these via PATCH /contacts/{id}\n');
  }

  return contacts;
}

async function main() {
  console.log('\n🔍 GIVEBUTTER API DISCOVERY');
  console.log('This script explores the actual field structure from Givebutter.');
  console.log('Use this information to build the correct database schema.\n');

  if (!API_KEY) {
    console.error('❌ Error: GIVEBUTTER_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    // Explore campaign and members
    const campaignData = await exploreCampaign(CAMPAIGN_ID);

    // Explore contacts
    const contacts = await exploreContacts();

    console.log('\n✅ DISCOVERY COMPLETE!');
    console.log('\nNext steps:');
    console.log('1. Review the field mappings above');
    console.log('2. Update supabase/migrations/00001_initial_schema.sql with correct field names');
    console.log('3. Note which custom_fields you want to sync back to Givebutter');
    console.log('4. Run: supabase db reset (to apply schema)');
    console.log('5. Build sync scripts using the field names you discovered\n');

  } catch (error) {
    console.error('\n❌ Discovery failed:', error);
    process.exit(1);
  }
}

main();
