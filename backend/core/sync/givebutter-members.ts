/**
 * SYNC SCRIPT: Givebutter Campaign Members → Database
 *
 * Fetches all campaign members from Givebutter and syncs to database.
 * Handles pagination (20 results per page) and deduplication.
 *
 * Usage: npm run sync:givebutter-members
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.GIVEBUTTER_API_KEY;
const CAMPAIGN_ID = process.env.GIVEBUTTER_CAMPAIGN_ID || 'CQVG3W';
const BASE_URL = 'https://api.givebutter.com/v1';

interface GivebutterMember {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  picture: string;
  raised: number;
  goal: number;
  donors: number;
  items: number;
  url: string;
}

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

async function getAllMembers(campaignId: number): Promise<GivebutterMember[]> {
  const allMembers: GivebutterMember[] = [];
  let page = 1;
  let hasMore = true;
  const perPage = 100; // Maximum allowed by Givebutter API

  console.log('🔍 Fetching campaign members (paginated, 100 per page)...\n');

  while (hasMore) {
    const response = await fetchGivebutter(`/campaigns/${campaignId}/members?per_page=${perPage}&page=${page}`);
    const members = response.data;
    const meta = response.meta;

    allMembers.push(...members);

    const progress = Math.round((allMembers.length / meta.total) * 100);
    console.log(`   Page ${page}/${meta.last_page}: fetched ${members.length} members (${allMembers.length}/${meta.total} = ${progress}%)`);

    // Check if there are more pages
    hasMore = meta.current_page < meta.last_page;
    page++;

    // Small delay to be nice to the API
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Verify we got all members
  const response = await fetchGivebutter(`/campaigns/${campaignId}/members?per_page=1&page=1`);
  const expectedTotal = response.meta.total;

  if (allMembers.length !== expectedTotal) {
    console.warn(`⚠️  Warning: Expected ${expectedTotal} members but retrieved ${allMembers.length}`);
  }

  console.log();
  return allMembers;
}

async function syncMembers() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING GIVEBUTTER MEMBERS → DATABASE');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: GIVEBUTTER_API_KEY not set in environment');
    process.exit(1);
  }

  // Initialize Supabase
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log(`🔗 Connected to Supabase: ${config.url}\n`);

  try {
    // First, get campaign ID from code
    console.log(`🔍 Looking up campaign: ${CAMPAIGN_ID}...`);
    const campaignsData = await fetchGivebutter('/campaigns');
    const campaign = campaignsData.data.find((c: any) => c.code === CAMPAIGN_ID);

    if (!campaign) {
      console.error(`❌ Campaign with code ${CAMPAIGN_ID} not found`);
      process.exit(1);
    }

    console.log(`✅ Found campaign: ${campaign.title} (ID: ${campaign.id})\n`);

    // Fetch all members with pagination
    const members = await getAllMembers(campaign.id);

    console.log(`✅ Total members fetched: ${members.length}\n`);

    let inserted = 0;
    let errors = 0;

    console.log('📝 Processing members in batches...\n');

    // Process in batches of 100 for better performance
    const batchSize = 100;
    const totalBatches = Math.ceil(members.length / batchSize);

    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      const parsedBatch = batch.map(member => ({
        member_id: member.id,
        mn_id: null, // Will be linked later during ETL
        first_name: member.first_name,
        last_name: member.last_name,
        display_name: member.display_name,
        email: member.email,
        phone: member.phone,
        picture: member.picture,
        amount_raised: member.raised,
        goal: member.goal,
        donors: member.donors,
        items: member.items,
        url: member.url,
        created_at_gb: null, // Not provided in members API
        updated_at_gb: null, // Not provided in members API
      }));

      try {
        // Batch upsert for better performance
        const { error, count } = await supabase
          .from('raw_gb_campaign_members')
          .upsert(parsedBatch, {
            onConflict: 'member_id',
            count: 'exact',
          });

        if (error) {
          console.error(`❌ Error syncing batch ${batchNum}/${totalBatches}:`, error.message);
          errors += batch.length;
        } else {
          inserted += count || batch.length;
          const progress = Math.round((inserted / members.length) * 100);
          console.log(`   Batch ${batchNum}/${totalBatches}: synced ${count || batch.length} members (${inserted}/${members.length} = ${progress}%)`);
        }
      } catch (err) {
        console.error(`❌ Error processing batch ${batchNum}/${totalBatches}:`, err);
        errors += batch.length;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Results:`);
    console.log(`   Total members: ${members.length}`);
    console.log(`   Synced successfully: ${inserted}`);
    console.log(`   Errors: ${errors}`);
    console.log();

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncMembers();
