/**
 * Find Givebutter Campaign ID by Code
 * Helps locate the numeric campaign ID for config
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.GIVEBUTTER_API_KEY;
const BASE_URL = 'https://api.givebutter.com/v1';
const CAMPAIGN_CODE = 'SWABUGA2025'; // Or whatever your code is

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

async function findCampaignId() {
  console.log('\n🔍 Finding Givebutter Campaign ID...\n');

  if (!API_KEY) {
    console.error('❌ Error: GIVEBUTTER_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    console.log('📡 Fetching campaigns from Givebutter API...');
    const data = await fetchGivebutter('/campaigns');

    console.log(`\n✅ Found ${data.data.length} campaigns\n`);
    console.log('📋 Available Campaigns:\n');
    console.log('─'.repeat(80));

    data.data.forEach((campaign: any) => {
      const isCurrent = campaign.code === CAMPAIGN_CODE;
      const marker = isCurrent ? '👉 ' : '   ';
      console.log(`${marker}ID: ${String(campaign.id).padEnd(12)} Code: ${(campaign.code || 'N/A').padEnd(20)} Title: ${campaign.title}`);
    });

    console.log('─'.repeat(80));

    // Find the specific campaign
    const campaign = data.data.find((c: any) => c.code === CAMPAIGN_CODE);

    if (campaign) {
      console.log(`\n✅ Found campaign: ${campaign.title}`);
      console.log('─'.repeat(80));
      console.log(`Campaign ID:   ${campaign.id}`);
      console.log(`Campaign Code: ${campaign.code}`);
      console.log(`Title:         ${campaign.title}`);
      console.log(`URL:           ${campaign.url || 'N/A'}`);
      console.log('─'.repeat(80));

      console.log('\n📝 SQL to add to config:\n');
      console.log(`INSERT INTO sync_configs (year, config_key, config_value, description)`);
      console.log(`VALUES (2025, 'givebutter_campaign_id', '${campaign.id}', 'Numeric campaign ID for API calls')`);
      console.log(`ON CONFLICT (year, config_key) DO UPDATE SET config_value = '${campaign.id}';\n`);
    } else {
      console.log(`\n⚠️  Campaign with code "${CAMPAIGN_CODE}" not found`);
      console.log(`\nAvailable codes: ${data.data.map((c: any) => c.code).filter(Boolean).join(', ')}\n`);
    }

  } catch (error) {
    console.error('\n❌ Failed to fetch campaigns:', error);
    process.exit(1);
  }
}

findCampaignId();
