/**
 * INITIAL MESSAGE CAMPAIGN - OCTOBER 13, 2025
 *
 * First communication to all signed up mentors about SWAB Event Day (Nov 9th).
 * Generates both text messages (full message) and email custom sections (middle part only).
 *
 * Message content is defined in PLAN.md
 *
 * Usage:
 *   npx tsx backend/features/comms/messages/initial_message\ -\ 10.13/initial_message_10_13.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================================
// CAMPAIGN CONFIGURATION
// ============================================================================

const CAMPAIGN = {
  name: 'Initial Message - October 13',
  description: 'First communication to all signed up mentors with Event Day details',

  // Text messages (full message for SMS)
  textMessages: {
    complete: (name: string) =>
      `Hi ${name}!\n\nThank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...\n\nYou're all set - your fundraising page is created & we see you've fully fundraised your $75!\n\nNext steps: Mentor training (Oct 20, 21, or 28) sign up details coming soon. Partner/group info coming after signups close Friday, Oct 17. Tell your friends to sign up before the deadline!\n\nGot questions? info@swabuga.org. As always, GO SWAB!`,

    needs_fundraising: (name: string, amountRaised: number, remaining: number) =>
      `Hi ${name}!\n\nThank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...\n\nYou're almost there - your fundraising page is created & you've raised $${amountRaised}! Just $${remaining} more to hit your $75 goal.\n\nNext steps: Finish fundraising, then mentor training (Oct 20, 21, or 28) sign up details coming soon. Partner/group info coming after signups close Friday, Oct 17. Tell your friends to sign up!\n\nGot questions? info@swabuga.org. As always, GO SWAB!`,

    needs_page: (name: string, email: string) =>
      `Hi ${name}!\n\nThank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...\n\nAction needed: Create your fundraising page. Use your ${email} email, select "Mentors 2025" team, set goal to $75, after you click this link: https://givebutter.com/SWABUGA2025/join\n\nOnce your page is set up, just fundraise $75 then attend mentor training (Oct 20, 21, or 28). Partner/group info coming after signups close Friday, Oct 17. Tell your friends to sign up!\n\nQuestions? info@swabuga.org. As always, GO SWAB!`,

    needs_setup: (name: string, email: string) =>
      `Hi ${name}!\n\nThank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...\n\nAction needed: Check this email (${email}) for a "Next Steps..." message from SWAB with a fundraising setup link.\n\nOnce you complete setup & fundraise $75, you'll just attend mentor training (Oct 20, 21, or 28). Partner/group info coming after signups close Friday, Oct 17. Tell friends to sign up!\n\nQuestions? info@swabuga.org. As always, GO SWAB!`,
  },

  // Email custom sections (only the status-specific middle part)
  emailCustomSections: {
    complete: () =>
      `✅ You're all set!\n\nYour fundraising page is set up and you've fully fundraised your $75 goal. Amazing work! You're ready for the next steps.`,

    needs_fundraising: (amountRaised: number, remaining: number) =>
      `📈 Almost there!\n\nYour fundraising page is created and you've raised $${amountRaised} so far. Just $${remaining} more to hit your $75 goal!\n\nKeep sharing your page with friends and family - you're so close!`,

    needs_page: (email: string) =>
      `🎯 ACTION NEEDED: Create Your Fundraising Page\n\nWe see you completed the setup form, but couldn't find your fundraising page yet. Here's how to create it:\n\n1. Visit this link: https://givebutter.com/SWABUGA2025/join\n2. Use your email: ${email}\n3. Select "Mentors 2025" as your team\n4. Set your goal to $75\n\nOnce created, share it with friends and family to reach your goal!`,

    needs_setup: (email: string) =>
      `🎯 ACTION NEEDED: Complete Your Setup\n\nCheck your email (${email}) for a "Next Steps..." message from SWAB. It contains your unique fundraising page setup link.\n\nCan't find it? Check spam or contact us at info@swabuga.org and we'll help!\n\nOnce you complete setup, just fundraise $75 before mentor training.`,
  },
};

// ============================================================================
// STATUS DETECTION LOGIC
// ============================================================================

interface Mentor {
  mn_id: string;
  first_name: string;
  preferred_name: string;
  personal_email: string | null;
  status_category: string;
  amount_raised?: number;
  gb_contact_id?: string;
  [key: string]: any;
}

function determineMentorStatus(mentor: Mentor): 'complete' | 'needs_fundraising' | 'needs_page' | 'needs_setup' {
  // Map the status_category field from database to our message categories
  const statusMap: Record<string, 'complete' | 'needs_fundraising' | 'needs_page' | 'needs_setup'> = {
    'complete': 'complete',
    'ready': 'complete',
    'needs_fundraising': 'needs_fundraising',
    'needs_page': 'needs_page',
    'needs_setup': 'needs_setup',
    'signed_up': 'needs_setup', // Default for signed up but no other info
  };

  return statusMap[mentor.status_category] || 'needs_setup';
}

function composeMessages(mentor: Mentor): { textMessage: string; emailCustomSection: string } {
  const name = mentor.preferred_name || mentor.first_name;
  // CRITICAL: Use personal_email (NOT uga_email) - Givebutter sends setup links there
  const email = mentor.personal_email || 'your registered email';
  const status = determineMentorStatus(mentor);
  const amountRaised = mentor.amount_raised || 0;
  const remaining = Math.max(0, 75 - amountRaised);

  let textMessage: string;
  let emailCustomSection: string;

  switch (status) {
    case 'complete':
      textMessage = CAMPAIGN.textMessages.complete(name);
      emailCustomSection = CAMPAIGN.emailCustomSections.complete();
      break;

    case 'needs_fundraising':
      textMessage = CAMPAIGN.textMessages.needs_fundraising(name, amountRaised, remaining);
      emailCustomSection = CAMPAIGN.emailCustomSections.needs_fundraising(amountRaised, remaining);
      break;

    case 'needs_page':
      textMessage = CAMPAIGN.textMessages.needs_page(name, email);
      emailCustomSection = CAMPAIGN.emailCustomSections.needs_page(email);
      break;

    case 'needs_setup':
      textMessage = CAMPAIGN.textMessages.needs_setup(name, email);
      emailCustomSection = CAMPAIGN.emailCustomSections.needs_setup(email);
      break;
  }

  return { textMessage, emailCustomSection };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function runCampaign() {
  console.log('\n' + '='.repeat(80));
  console.log(`📧 COMMUNICATION CAMPAIGN: ${CAMPAIGN.name}`);
  console.log('='.repeat(80) + '\n');
  console.log(`📝 ${CAMPAIGN.description}\n`);

  // Connect to database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Fetch ALL mentors (includes amount_raised directly)
  console.log('🔍 Fetching mentors...\n');

  const { data: mentors, error } = await supabase
    .from('mentors')
    .select('*');

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  if (!mentors || mentors.length === 0) {
    console.log('⚠️  No mentors found\n');
    process.exit(0);
  }

  const withContactId = mentors.filter(m => m.gb_contact_id).length;
  const withoutContactId = mentors.length - withContactId;
  const withFundraising = mentors.filter(m => m.amount_raised && m.amount_raised > 0).length;

  console.log(`✅ Found ${mentors.length} mentors`);
  console.log(`   - ${withContactId} with existing GB contact IDs (will update)`);
  console.log(`   - ${withoutContactId} without GB contact IDs (will create new)`);
  console.log(`   - ${withFundraising} with fundraising progress > $0\n`);

  // Generate messages and prepare updates
  console.log('💬 Generating personalized messages...\n');

  const updates = mentors.map(mentor => {
    const status = determineMentorStatus(mentor);
    const { textMessage, emailCustomSection } = composeMessages(mentor);

    return {
      mn_id: mentor.mn_id,
      status,
      textMessage,
      emailCustomSection,
      textLength: textMessage.length,
      emailLength: emailCustomSection.length,
      name: mentor.preferred_name || mentor.first_name,
    };
  });

  // Status breakdown
  const statusCounts = updates.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Status Breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} mentors`);
  });
  console.log();

  // Check message lengths
  const avgTextLength = Math.round(updates.reduce((sum, u) => sum + u.textLength, 0) / updates.length);
  const avgEmailLength = Math.round(updates.reduce((sum, u) => sum + u.emailLength, 0) / updates.length);

  console.log(`📏 Average message lengths:`);
  console.log(`   Text: ${avgTextLength} characters (~${Math.ceil(avgTextLength / 160)} SMS)`);
  console.log(`   Email custom section: ${avgEmailLength} characters\n`);

  // Show preview of first 3 from each status
  console.log('📋 Message Previews:\n');

  const statusOrder: Array<'complete' | 'needs_fundraising' | 'needs_page' | 'needs_setup'> =
    ['complete', 'needs_fundraising', 'needs_page', 'needs_setup'];

  statusOrder.forEach(status => {
    const statusUpdates = updates.filter(u => u.status === status);
    if (statusUpdates.length > 0) {
      console.log(`\n📍 ${status.toUpperCase()} (${statusUpdates.length} mentors)`);
      console.log('-'.repeat(80));

      const sample = statusUpdates[0];
      console.log(`\n💬 TEXT MESSAGE (${sample.textLength} chars):`);
      console.log(sample.textMessage);
      console.log(`\n📧 EMAIL CUSTOM SECTION (${sample.emailLength} chars):`);
      console.log(sample.emailCustomSection);
      console.log();
    }
  });

  // Confirm before updating
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  READY TO UPDATE DATABASE');
  console.log('='.repeat(80));
  console.log(`This will update ${updates.length} mentor records in mn_gb_import table.`);
  console.log('Both text messages and email custom sections will be populated.\n');

  // Update mn_gb_import table
  console.log('💾 Updating mn_gb_import table...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('mn_gb_import')
      .update({
        '📱Custom Text Message 1️⃣': update.textMessage,
        '📧 Custom Email Message 1️⃣': update.emailCustomSection,
        needs_sync: true,
        updated_at: new Date().toISOString(),
      })
      .eq('mn_id', update.mn_id);

    if (updateError) {
      console.error(`❌ Error updating ${update.mn_id}:`, updateError);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`✅ Updated ${successCount} records successfully`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} records`);
  }
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('✅ CAMPAIGN COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Total mentors: ${updates.length}`);
  console.log(`   Successfully updated: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Export CSV: npm run comms:export');
  console.log('   2. Validate CSV: npm run comms:validate');
  console.log('   3. Upload to Givebutter: Contacts → Import → Upload CSV');
  console.log('   4. Send texts in Givebutter: Engage → Texts → New Text');
  console.log('   5. Send emails in Givebutter: Engage → Email → New Email');
  console.log('      (Write opening/closing, use {{📧 Custom Email Message 1️⃣}} for middle)');
  console.log();
}

// Run the campaign
runCampaign().catch(error => {
  console.error('❌ Campaign failed:', error);
  process.exit(1);
});
