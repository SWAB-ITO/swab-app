/**
 * TEXT CAMPAIGN TEMPLATE
 *
 * Template for creating composable text message campaigns.
 * Messages are built from multiple sections that can be customized per campaign.
 *
 * Structure:
 *   [OPENING - same for all]
 *   [MIDDLE - varies by status/criteria]
 *   [CLOSING - same for all]
 *
 * ⚠️  CRITICAL: READ BEFORE USING THIS TEMPLATE
 * ============================================
 *
 * 1. VERIFY DATA SOURCES FIRST:
 *    Run: npx tsx backend/scripts/verify-campaign-data-sources.ts
 *    This shows what fields exist in each table.
 *
 * 2. READ CRITICAL_WARNINGS.md:
 *    Location: backend/features/comms/CRITICAL_WARNINGS.md
 *    Contains common errors and how to avoid them.
 *
 * 3. SIMPLIFIED SCHEMA:
 *    ✅ All data is now in the mentors table (amount_raised, status, etc.)
 *    ✅ No need to join or merge from other tables!
 *
 * 4. TEST BEFORE SENDING:
 *    Always run with --test flag first to verify data accuracy
 *
 * Usage with Claude Code:
 *   1. Describe your campaign to Claude
 *   2. Claude modifies this template with your message sections
 *   3. Run script with --test flag to verify data
 *   4. Run script without --test to update mn_gb_import
 *   5. Export: npm run comms:export
 *   6. Upload CSV to Givebutter
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================================
// CAMPAIGN CONFIGURATION - Customize this for each campaign
// ============================================================================

const CAMPAIGN = {
  name: 'Sample Campaign',
  description: 'Template for composable text messages',

  // Message sections - customize these
  messages: {
    // Opening section (same for everyone)
    opening: "Hi {{name}}! Hope you're excited for SWAB 2025.",

    // Middle sections (varies by status_category)
    middle: {
      needs_setup: "Please complete your setup form - check your email for the link!",
      needs_page: "Great job on setup! Now create your fundraising page using the link we sent.",
      needs_fundraising: "You've raised ${{amount_raised}} so far - just ${{amount_remaining}} to hit $75!",
      complete: "Amazing work! You've raised ${{amount_raised}} and you're all set for the event.",
    },

    // Closing section (same for everyone)
    closing: "Questions? Reply to this text or email us at swab@uga.edu.",
  },

  // Filter criteria (optional - leave null to include all mentors)
  filters: {
    has_gb_contact_id: null, // null = all mentors (recommended), true = only with ID, false = only without ID
    // status_category: 'needs_fundraising', // Uncomment to filter by status
  },
};

// ============================================================================
// MESSAGE COMPOSITION LOGIC
// ============================================================================

interface Mentor {
  mn_id: string;
  first_name: string;
  preferred_name: string;
  status_category: string;
  amount_raised?: number;
  [key: string]: any;
}

function composeMessage(mentor: Mentor): string {
  const sections: string[] = [];

  // Replace variables in opening
  let opening = CAMPAIGN.messages.opening;
  opening = opening.replace('{{name}}', mentor.preferred_name || mentor.first_name);
  sections.push(opening);

  // Get status-specific middle section
  const statusKey = mentor.status_category as keyof typeof CAMPAIGN.messages.middle;
  let middle = CAMPAIGN.messages.middle[statusKey] || '';

  if (middle) {
    // Replace variables in middle
    middle = middle.replace('{{amount_raised}}', String(mentor.amount_raised || 0));
    const remaining = Math.max(0, 75 - (mentor.amount_raised || 0));
    middle = middle.replace('{{amount_remaining}}', String(remaining));
    sections.push(middle);
  }

  // Add closing
  sections.push(CAMPAIGN.messages.closing);

  // Join with newlines (or adjust spacing as needed)
  return sections.join(' ');
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function runCampaign() {
  // Check if running in test mode
  const isTestMode = process.argv.includes('--test');

  console.log('\n' + '='.repeat(80));
  console.log(`📱 TEXT CAMPAIGN: ${CAMPAIGN.name}`);
  if (isTestMode) {
    console.log('🧪 TEST MODE - No database updates will be made');
  }
  console.log('='.repeat(80) + '\n');
  console.log(`📝 ${CAMPAIGN.description}\n`);

  // Connect to database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Fetch mentors (note: GB contact ID not required for generating messages)
  console.log('🔍 Fetching mentors...\n');

  let query = supabase.from('mentors').select('*');

  // Apply filters (IMPORTANT: Don't filter by gb_contact_id unless you specifically
  // want to exclude mentors without IDs. The CSV import will create new contacts for those without IDs.)
  if (CAMPAIGN.filters.has_gb_contact_id === true) {
    console.log('⚠️  Filtering to ONLY mentors with GB contact IDs\n');
    query = query.not('gb_contact_id', 'is', null);
  } else if (CAMPAIGN.filters.has_gb_contact_id === false) {
    console.log('⚠️  Filtering to ONLY mentors WITHOUT GB contact IDs\n');
    query = query.is('gb_contact_id', null);
  }

  const { data: mentors, error } = await query;

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  if (!mentors || mentors.length === 0) {
    console.log('⚠️  No mentors found matching criteria\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} mentors\n`);

  // Generate messages and prepare updates
  console.log('💬 Generating personalized messages...\n');

  const updates = mentors.map(mentor => {
    const message = composeMessage(mentor);
    return {
      mn_id: mentor.mn_id,
      message,
      length: message.length,
      mentor: mentor, // Keep reference for validation
    };
  });

  // ⚠️  CRITICAL VALIDATION CHECKS
  console.log('🔍 Running validation checks...\n');

  let hasErrors = false;

  // Check for undefined/null in messages
  const invalidMessages = updates.filter(u =>
    u.message.includes('undefined') ||
    u.message.includes('null') ||
    u.message.includes('NaN') ||
    u.message.includes('{{') ||
    u.message.includes('}}')
  );

  if (invalidMessages.length > 0) {
    console.error('❌ VALIDATION FAILED - Invalid messages detected:');
    invalidMessages.slice(0, 5).forEach(u => {
      console.error(`   ${u.mn_id}: ${u.message.substring(0, 100)}...`);
    });
    console.error(`\n   Total invalid messages: ${invalidMessages.length}`);
    hasErrors = true;
  }

  // Check for suspiciously short messages
  const tooShort = updates.filter(u => u.length < 50);
  if (tooShort.length > 0) {
    console.warn(`⚠️  Warning: ${tooShort.length} messages are very short (<50 chars)`);
  }

  if (hasErrors) {
    console.error('\n❌ ERRORS FOUND - Fix validation errors before proceeding\n');
    process.exit(1);
  }

  console.log('✅ Validation passed\n');

  // Check message lengths
  const avgLength = Math.round(updates.reduce((sum, u) => sum + u.length, 0) / updates.length);
  const tooLong = updates.filter(u => u.length > 160);

  console.log(`📏 Average message length: ${avgLength} characters`);
  if (tooLong.length > 0) {
    console.log(`⚠️  ${tooLong.length} messages exceed 160 chars (will be split into multiple SMS)\n`);
  } else {
    console.log(`✅ All messages under 160 characters\n`);
  }

  // Show preview of first 3
  console.log('📋 Preview (first 3 mentors):\n');
  updates.slice(0, 3).forEach(u => {
    const mentor = mentors.find(m => m.mn_id === u.mn_id);
    console.log(`   ${mentor?.preferred_name || mentor?.first_name} (${mentor?.status_category}):`);
    console.log(`   "${u.message}"`);
    console.log(`   [${u.length} chars]\n`);
  });

  // If test mode, stop here
  if (isTestMode) {
    console.log('🧪 TEST MODE - Stopping before database update');
    console.log('\nTo update database, run without --test flag\n');
    return;
  }

  // Update mn_gb_import table
  console.log('💾 Updating mn_gb_import table...\n');

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('mn_gb_import')
      .update({
        '📱Custom Text Message 1️⃣': update.message,
        needs_sync: true,
        updated_at: new Date().toISOString(),
      })
      .eq('mn_id', update.mn_id);

    if (updateError) {
      console.error(`❌ Error updating ${update.mn_id}:`, updateError);
    }
  }

  console.log('✅ Updated mn_gb_import with text messages\n');

  // Summary
  console.log('='.repeat(80));
  console.log('✅ CAMPAIGN READY');
  console.log('='.repeat(80));
  console.log(`👥 Recipients: ${updates.length}`);
  console.log(`📏 Avg length: ${avgLength} chars`);
  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Export CSV: npm run comms:export');
  console.log('   2. Upload to Givebutter: Contacts → Import');
  console.log('   3. Send texts: Engage → Texts → Filter recipients');
  console.log();
}

// Run the campaign
runCampaign().catch(error => {
  console.error('❌ Campaign failed:', error);
  process.exit(1);
});
