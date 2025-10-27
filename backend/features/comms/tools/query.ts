/**
 * MENTOR QUERY & ANALYSIS TOOL
 *
 * Use this script to explore mentor data and test campaign criteria.
 * Helps you understand:
 *   - How many mentors match certain filters
 *   - Status distribution
 *   - Contact ID coverage
 *   - Preview what messages would look like
 *
 * Modify the QUERY section to test different filters.
 *
 * Usage:
 *   npx tsx backend/features/comms/tools/query.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================================
// QUERY CONFIGURATION - Customize filters to explore
// ============================================================================

const QUERY = {
  // Add filters here - set to null to skip filter
  filters: {
    status_category: null, // e.g., 'needs_fundraising' or null for all
    has_gb_contact_id: null, // true = only with contact ID, false = without, null = all
    min_amount_raised: null, // e.g., 50 or null
    max_amount_raised: null, // e.g., 75 or null
  },

  // What to show in results
  display: {
    limit: 10, // How many mentors to show
    showMessages: false, // Preview what text messages would look like
  },
};

// ============================================================================
// QUERY EXECUTION
// ============================================================================

async function queryMentors() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 MENTOR QUERY & ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Connect to database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Build query
  let query = supabase.from('mentors').select('*');

  // Apply filters
  if (QUERY.filters.status_category) {
    query = query.eq('status_category', QUERY.filters.status_category);
  }

  if (QUERY.filters.has_gb_contact_id === true) {
    query = query.not('gb_contact_id', 'is', null);
  } else if (QUERY.filters.has_gb_contact_id === false) {
    query = query.is('gb_contact_id', null);
  }

  if (QUERY.filters.min_amount_raised !== null) {
    query = query.gte('amount_raised', QUERY.filters.min_amount_raised);
  }

  if (QUERY.filters.max_amount_raised !== null) {
    query = query.lte('amount_raised', QUERY.filters.max_amount_raised);
  }

  // Fetch results
  const { data: mentors, error } = await query;

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  if (!mentors || mentors.length === 0) {
    console.log('⚠️  No mentors found matching criteria\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} mentors matching criteria\n`);

  // Status breakdown
  console.log('📊 STATUS BREAKDOWN:\n');
  const statusCounts = mentors.reduce((acc: any, m) => {
    acc[m.status_category || 'unknown'] = (acc[m.status_category || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  Object.entries(statusCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  console.log();

  // Contact ID coverage
  const withContactId = mentors.filter(m => m.gb_contact_id).length;
  const coverage = Math.round((withContactId / mentors.length) * 100);
  console.log('📇 CONTACT ID COVERAGE:\n');
  console.log(`   With contact ID: ${withContactId} (${coverage}%)`);
  console.log(`   Without contact ID: ${mentors.length - withContactId} (${100 - coverage}%)\n`);

  // Fundraising stats
  const withAmountRaised = mentors.filter(m => m.amount_raised && m.amount_raised > 0);
  if (withAmountRaised.length > 0) {
    const totalRaised = withAmountRaised.reduce((sum, m) => sum + (m.amount_raised || 0), 0);
    const avgRaised = Math.round(totalRaised / withAmountRaised.length);

    console.log('💰 FUNDRAISING STATS:\n');
    console.log(`   Mentors fundraising: ${withAmountRaised.length}`);
    console.log(`   Total raised: $${totalRaised}`);
    console.log(`   Average per mentor: $${avgRaised}\n`);
  }

  // Show sample mentors
  console.log(`📋 SAMPLE MENTORS (showing ${Math.min(QUERY.display.limit, mentors.length)}):\n`);
  mentors.slice(0, QUERY.display.limit).forEach(mentor => {
    console.log(`   ${mentor.preferred_name || mentor.first_name} ${mentor.last_name}`);
    console.log(`     MN ID: ${mentor.mn_id}`);
    console.log(`     Status: ${mentor.status_category || 'unknown'}`);
    console.log(`     Phone: ${mentor.phone}`);
    console.log(`     GB Contact ID: ${mentor.gb_contact_id || 'none'}`);
    if (mentor.amount_raised) {
      console.log(`     Raised: $${mentor.amount_raised}`);
    }
    console.log();
  });

  // Message preview (if enabled)
  if (QUERY.display.showMessages) {
    console.log('💬 MESSAGE PREVIEW:\n');
    console.log('   (Customize composeMessage function to see actual messages)\n');
    mentors.slice(0, 3).forEach(mentor => {
      const sampleMessage = `Hi ${mentor.preferred_name || mentor.first_name}! [Your campaign message here]`;
      console.log(`   ${mentor.preferred_name || mentor.first_name}: "${sampleMessage}"\n`);
    });
  }

  console.log('='.repeat(80));
  console.log('✅ QUERY COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run the query
queryMentors().catch(error => {
  console.error('❌ Query failed:', error);
  process.exit(1);
});
