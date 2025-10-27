/**
 * UPDATED GIVEBUTTER IMPORT - OCTOBER 25, 2025
 *
 * Updates Givebutter import with fresh data and adds email custom field
 * with setup instructions for mentors who haven't created their fundraising page yet.
 *
 * Based on mentor_trainings-10.22 campaign but focuses on adding email instructions
 * for tier4 (no page) mentors.
 *
 * Usage:
 *   npx tsx backend/features/comms/gb_imports/updated_import-10.25/updated_import_10_25.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createWriteStream } from 'fs';
import { stringify } from 'csv-stringify';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================================
// CAMPAIGN CONFIGURATION
// ============================================================================

const CAMPAIGN = {
  name: 'Updated Givebutter Import - October 25',
  description: 'Fresh data export with email setup instructions for mentors without pages',

  jotformBaseUrl: 'https://form.jotform.com/SWAB_UGA/mentor-training-sign-up',

  // Text Message 1 - ONLY for those NOT signed up (blank for signed up)
  textMessage1: {
    // For those who HAVE NOT signed up for training yet
    notSignedUp: (email: string) => {
      const encodedEmail = encodeURIComponent(email);
      return `⚠️ ACTION NEEDED: SIGN UP FOR MENTOR TRAINING

Training is REQUIRED. Sessions are Oct 27, 28, 29.

SIGN UP NOW:
https://form.jotform.com/SWAB_UGA/mentor-training-sign-up?email=${encodedEmail}

This form has all the important info you need. Please make sure to fill it out!`;
    },
  },

  // Text Message 2 - Varies by tier
  textMessage2: {
    top15: (amount: number, rank: number) =>
      `💸 FUNDRAISING STATUS:

✅ You've fundraised $${amount}
🏆 YOU'RE RANKED #${rank} OUT OF 850+ MENTORS!!!

You're crushing it! We're announcing a fundraising competition at Mentor Trainings with prizes - keep going to secure your spot at the top!

Questions? Reply to this text or email info@swabuga.org!`,

    tier1_high: (amount: number) =>
      `💸 FUNDRAISING STATUS:

✅ You've fundraised $${amount}
You're one of our TOP FUNDRAISERS!!! Keep going - we're announcing an individual competition at Trainings!

Questions? Reply to this text or email info@swabuga.org!`,

    tier2_complete: (amount: number) =>
      `💸 FUNDRAISING STATUS:

✅ You've fundraised $${amount}
You're doing AWESOME! Keep going - we're announcing an individual competition at Trainings!

Questions? Reply to this text or email info@swabuga.org!`,

    tier3_partial: (amount: number) =>
      `💸 FUNDRAISING STATUS:

🔄 You've fundraised $${amount}
Not quite at $75 yet, but your page is created! Keep fundraising or turn in money at Mentor Trainings.

Questions? Reply to this text or email info@swabuga.org!`,

    tier4_no_page: (email: string) =>
      `⛔️ ACTION NEEDED: CREATE YOUR FUNDRAISING PAGE

Your page isn't set up yet. Here's exactly what to do:
1. Go to: https://givebutter.com/SWABUGA2025/join
2. Sign in or create account with: ${email}
3. Click "Join Team" and select this team: Mentors 2025
4. Set your goal: $75
5. Customize your page & share it!

You've got this!
Questions? Reply to this text or email info@swabuga.org!`,
  },

  // Email Message 1 - Tier 4 (no page) - 4-step setup instructions
  emailMessage_noPage: (email: string) =>
    `🎯 ACTION NEEDED: Create Your Fundraising Page<br><br>We don't see your fundraising page set up yet. Don't worry - it's quick and easy! Here's exactly what to do:<br><br>STEP-BY-STEP INSTRUCTIONS:<br><br>1. Sign in or create an account using this email: ${email}<br>2. Click "Join Team" and select: Mentors 2025<br>3. Set your fundraising goal to: $75<br>4. Visit this link: https://givebutter.com/SWABUGA2025/join and use the instructions above!<br><br>Customize your page with a photo and personal message before sharing your page link with friends and family!<br><br>Once your page is set up, you can start fundraising right away. Remember: You'll need to fundraise $75 (or bring cash/checks to Mentor Training) before Event Day on November 9th.`,

  // Email Message 2 - Tier 3 (has page, < $75) - fundraising tips with page URL
  emailMessage_hasPagePartial: (amountRaised: number, pageUrl: string) => {
    const remaining = Math.max(0, 75 - amountRaised);
    return `📈 Keep Going - You're Almost There!<br><br>Your fundraising page is set up and you've raised $${amountRaised} so far. Great start! Just $${remaining} more to hit your $75 goal!<br><br>Here are some quick tips to reach your goal:<br><br>💡 Quick Fundraising Tips:<br>• Text your family and close friends directly<br>• Post a personal story about why you're mentoring with SWAB<br>• Check out https://mentors.swabuga.org/setup/tips-and-tricks<br><br>Can't fundraise online? No problem! You can bring cash or checks to Mentor Training (Oct 27, 28, or 29).<br><br>Your fundraising page: ${pageUrl}`;
  },
};

// ============================================================================
// TYPES
// ============================================================================

interface Mentor {
  mn_id: string;
  first_name: string;
  preferred_name: string;
  personal_email: string | null;
  amount_raised: number | null;
  gb_contact_id: string | null;
  gb_member_id: string | null;
  fundraising_page_url: string | null;
  training_signup_done: boolean | null;
  [key: string]: any;
}

type TierType = 'top15' | 'tier1_high' | 'tier2_complete' | 'tier3_partial' | 'tier4_no_page';

interface MentorWithTier extends Mentor {
  tier: TierType;
  rank?: number; // Only for top15
}

// ============================================================================
// TIER DETECTION LOGIC
// ============================================================================

function calculateTiers(mentors: Mentor[]): MentorWithTier[] {
  // Sort by amount_raised descending for ranking
  const sorted = [...mentors].sort((a, b) => {
    const amountA = a.amount_raised || 0;
    const amountB = b.amount_raised || 0;
    return amountB - amountA;
  });

  // Identify top 15 (must be >= $165)
  const top15Ids = new Set<string>();
  const top15Rankings = new Map<string, number>();

  let rank = 1;
  for (const mentor of sorted) {
    if (rank > 15) break;
    const amount = mentor.amount_raised || 0;
    if (amount >= 165) {
      top15Ids.add(mentor.mn_id);
      top15Rankings.set(mentor.mn_id, rank);
      rank++;
    }
  }

  // Assign tiers to all mentors
  return mentors.map(mentor => {
    const amount = mentor.amount_raised || 0;
    const hasMemberId = !!mentor.gb_member_id; // Actually on Mentors 2025 team

    let tier: TierType;
    let rankValue: number | undefined;

    // Priority order
    if (top15Ids.has(mentor.mn_id)) {
      tier = 'top15';
      rankValue = top15Rankings.get(mentor.mn_id);
    } else if (amount >= 165) {
      tier = 'tier1_high';
    } else if (amount >= 75) {
      tier = 'tier2_complete';
    } else if (hasMemberId) {
      // Has a page (on Mentors 2025 team) but raised $0-$74
      tier = 'tier3_partial';
    } else {
      // No page (not on Mentors 2025 team)
      tier = 'tier4_no_page';
    }

    return {
      ...mentor,
      tier,
      rank: rankValue,
    };
  });
}

function composeMessages(mentor: MentorWithTier): {
  textMessage1: string;
  textMessage2: string;
  emailMessage1: string | null;
} {
  const email = mentor.personal_email || 'your.email@example.com';
  const amount = mentor.amount_raised || 0;
  const pageUrl = mentor.fundraising_page_url || 'https://givebutter.com/SWABUGA2025';

  // Text Message 1 - ONLY for those NOT signed up (blank for signed up)
  const hasSignedUp = mentor.training_signup_done === true;
  const textMessage1 = hasSignedUp
    ? '' // Blank for signed up
    : CAMPAIGN.textMessage1.notSignedUp(email);

  // Text Message 2 - Tier-specific
  let textMessage2: string;
  let emailMessage1: string | null = null;

  switch (mentor.tier) {
    case 'top15':
      textMessage2 = CAMPAIGN.textMessage2.top15(amount, mentor.rank!);
      break;

    case 'tier1_high':
      textMessage2 = CAMPAIGN.textMessage2.tier1_high(amount);
      break;

    case 'tier2_complete':
      textMessage2 = CAMPAIGN.textMessage2.tier2_complete(amount);
      break;

    case 'tier3_partial':
      textMessage2 = CAMPAIGN.textMessage2.tier3_partial(amount);
      // Tier 3 gets email with fundraising tips + page URL
      emailMessage1 = CAMPAIGN.emailMessage_hasPagePartial(amount, pageUrl);
      break;

    case 'tier4_no_page':
      textMessage2 = CAMPAIGN.textMessage2.tier4_no_page(email);
      // Tier 4 gets email with setup instructions
      emailMessage1 = CAMPAIGN.emailMessage_noPage(email);
      break;
  }

  return { textMessage1, textMessage2, emailMessage1 };
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

  // Fetch ACTIVE mentors (only those with current signups)
  console.log('🔍 Fetching active mentors...\n');

  // Get current signup MN IDs
  const { data: signups, error: signupsError } = await supabase
    .from('raw_mn_signups')
    .select('mn_id');

  if (signupsError) {
    console.error('❌ Error fetching signups:', signupsError);
    process.exit(1);
  }

  const activeMnIds = new Set(signups?.map(s => s.mn_id).filter(Boolean) || []);
  console.log(`📋 Found ${activeMnIds.size} active signups\n`);

  // Fetch all mentors and filter in JavaScript
  const { data: allMentors, error } = await supabase
    .from('mentors')
    .select('*');

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  // Filter to only active mentors
  const mentors = allMentors?.filter(m => activeMnIds.has(m.mn_id)) || [];

  if (mentors.length === 0) {
    console.log('⚠️  No active mentors found\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} active mentors (filtered from ${allMentors?.length || 0} total)\n`);

  // Calculate tiers
  console.log('🎯 Calculating tiers and rankings...\n');

  const mentorsWithTiers = calculateTiers(mentors);

  // Generate messages
  console.log('💬 Generating personalized messages...\n');

  const updates = mentorsWithTiers.map(mentor => {
    const { textMessage1, textMessage2, emailMessage1 } = composeMessages(mentor);

    return {
      mn_id: mentor.mn_id,
      tier: mentor.tier,
      rank: mentor.rank,
      trainingSignedUp: mentor.training_signup_done === true,
      textMessage1,
      textMessage2,
      emailMessage1,
      text1Length: textMessage1.length,
      text2Length: textMessage2.length,
      name: mentor.preferred_name || mentor.first_name,
      amount: mentor.amount_raised || 0,
    };
  });

  // Tier breakdown
  const tierCounts = updates.reduce((acc, u) => {
    acc[u.tier] = (acc[u.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Tier Breakdown:');
  console.log(`   Top 15: ${tierCounts['top15'] || 0} mentors`);
  console.log(`   Tier 1 ($165+): ${tierCounts['tier1_high'] || 0} mentors`);
  console.log(`   Tier 2 ($75-$164): ${tierCounts['tier2_complete'] || 0} mentors`);
  console.log(`   Tier 3 ($1-$74): ${tierCounts['tier3_partial'] || 0} mentors`);
  console.log(`   Tier 4 (No page): ${tierCounts['tier4_no_page'] || 0} mentors`);
  console.log();

  // Training signup breakdown
  const signedUpCount = updates.filter(u => u.trainingSignedUp).length;
  const notSignedUpCount = updates.filter(u => !u.trainingSignedUp).length;
  console.log('📋 Training Signup Status:');
  console.log(`   ✅ Signed up: ${signedUpCount} mentors`);
  console.log(`   ⚠️  NOT signed up: ${notSignedUpCount} mentors`);
  console.log();

  // Count how many will get email messages
  const withEmail = updates.filter(u => u.emailMessage1).length;
  const tier3WithEmail = updates.filter(u => u.tier === 'tier3_partial').length;
  const tier4WithEmail = updates.filter(u => u.tier === 'tier4_no_page').length;
  console.log(`📧 Email messages: ${withEmail} mentors`);
  console.log(`   Tier 3 (Tips + URL): ${tier3WithEmail} mentors`);
  console.log(`   Tier 4 (Setup): ${tier4WithEmail} mentors\n`);

  // Show sample messages
  console.log('🔍 SAMPLE MESSAGES:\n');
  console.log('='.repeat(80));

  // Sample: Training NOT signed up
  const notSignedUpSample = updates.find(u => !u.trainingSignedUp);
  if (notSignedUpSample) {
    console.log('\n📍 TRAINING NOT SIGNED UP SAMPLE');
    console.log(`Example: ${notSignedUpSample.mn_id} - ${notSignedUpSample.name}`);
    console.log('\n💬 TEXT MESSAGE 1 (Urgent):');
    console.log('-'.repeat(80));
    console.log(notSignedUpSample.textMessage1);
    console.log();
  }

  // Sample: Training signed up
  const signedUpSample = updates.find(u => u.trainingSignedUp);
  if (signedUpSample) {
    console.log('\n📍 TRAINING SIGNED UP SAMPLE');
    console.log(`Example: ${signedUpSample.mn_id} - ${signedUpSample.name}`);
    console.log('\n💬 TEXT MESSAGE 1 (Blank):');
    console.log('-'.repeat(80));
    console.log(signedUpSample.textMessage1 || '(empty string)');
    console.log();
  }

  // Sample: Tier 3 with fundraising tips email
  const tier3Sample = updates.find(u => u.tier === 'tier3_partial');
  if (tier3Sample) {
    console.log('\n📍 TIER 3 SAMPLE (Has Page, < $75 - Gets Fundraising Tips Email)');
    console.log(`Example: ${tier3Sample.mn_id} - ${tier3Sample.name} - $${tier3Sample.amount}`);
    console.log('\n💬 TEXT MESSAGE 2:');
    console.log('-'.repeat(80));
    console.log(tier3Sample.textMessage2);
    console.log('\n📧 EMAIL MESSAGE (Fundraising Tips):');
    console.log('-'.repeat(80));
    console.log(tier3Sample.emailMessage1);
    console.log();
  }

  // Sample: Tier 4 with email setup instructions
  const tier4Sample = updates.find(u => u.tier === 'tier4_no_page');
  if (tier4Sample) {
    console.log('\n📍 TIER 4 SAMPLE (No Page - Gets Email Setup Instructions)');
    console.log(`Example: ${tier4Sample.mn_id} - ${tier4Sample.name}`);
    console.log('\n💬 TEXT MESSAGE 2:');
    console.log('-'.repeat(80));
    console.log(tier4Sample.textMessage2);
    console.log('\n📧 EMAIL MESSAGE (Setup Instructions):');
    console.log('-'.repeat(80));
    console.log(tier4Sample.emailMessage1);
    console.log();
  }

  // Confirm before updating
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  READY TO UPDATE DATABASE');
  console.log('='.repeat(80));
  console.log(`This will update ${updates.length} mentor records in mn_gb_import table.`);
  console.log(`- Text Message 1: ${notSignedUpCount} records (NOT signed up only)`);
  console.log(`- Text Message 2: ${updates.length} records (all mentors)`);
  console.log(`- Email Message 1: ${withEmail} records (Tier 3 & Tier 4)\n`);

  // Update mn_gb_import table
  console.log('💾 Updating mn_gb_import table...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('mn_gb_import')
      .update({
        '📱Custom Text Message 1️⃣': update.textMessage1,
        '📱Custom Text Message 2️⃣': update.textMessage2,
        '📧 Custom Email Message 1️⃣': update.emailMessage1 || '',
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
  console.log(`   Text Message 1 (Training NOT signed up): ${notSignedUpCount}`);
  console.log(`   Email messages added: ${withEmail} (Tier 3: ${tier3WithEmail}, Tier 4: ${tier4WithEmail})`);
  console.log();

  // Export CSV to campaign folder
  console.log('📤 Exporting CSV to campaign folder...\n');

  const OUTPUT_PATH = resolve(__dirname, 'givebutter-import-2025-10-25.csv');

  const { data: exportData, error: exportError } = await supabase
    .from('mn_gb_import')
    .select('*')
    .order('mn_id', { ascending: true });

  if (exportError) {
    console.error('❌ Error fetching export data:', exportError);
  } else if (exportData && exportData.length > 0) {
    const writeStream = createWriteStream(OUTPUT_PATH);
    const stringifier = stringify({
      header: true,
      columns: [
        'Givebutter Contact ID',
        'Contact External ID',
        'Prefix',
        'First Name',
        'Middle Name',
        'Last Name',
        'Date of Birth',
        'Gender',
        'Employer',
        'Title',
        'Primary Email',
        'Additional Emails',
        'Primary Phone',
        'Additional Phones',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'Postal Code',
        'Country',
        'Tags',
        'Notes',
        'Email Subscription Status',
        'Phone Subscription Status',
        'Address Subscription Status',
        '💸 Givebutter Page Setup',
        '📆 Shift Preference',
        '👯‍♂️ Partner Preference',
        '🚂 Mentor Training Complete',
        '✅ Mentor Training Signed Up?',
        '📈 Fully Fundraised',
        '📱Custom Text Message 1️⃣',
        '📧 Custom Email Message 1️⃣',
        '💰 Amount Fundraised',
        '📱Custom Text Message 2️⃣'
      ]
    });

    stringifier.pipe(writeStream);

    for (const record of exportData) {
      if (!record['Primary Email']) continue;

      const row = {
        'Givebutter Contact ID': record['Givebutter Contact ID'] || '',
        'Contact External ID': record['Contact External ID'] || record.mn_id,
        'Prefix': record['Prefix'] || '',
        'First Name': record['First Name'] || '',
        'Middle Name': record['Middle Name'] || '',
        'Last Name': record['Last Name'] || '',
        'Date of Birth': record['Date of Birth'] || '',
        'Gender': record['Gender'] || '',
        'Employer': record['Employer'] || '',
        'Title': record['Title'] || '',
        'Primary Email': record['Primary Email'] || '',
        'Additional Emails': record['Email Addresses'] || '',
        'Primary Phone': record['Primary Phone Number'] || '',
        'Additional Phones': record['Phone Numbers'] || '',
        'Address Line 1': '',
        'Address Line 2': '',
        'City': '',
        'State': '',
        'Postal Code': '',
        'Country': '',
        'Tags': record['Tags'] || 'Mentors 2025',
        'Notes': record['Notes'] || '',
        'Email Subscription Status': record['Email Subscription Status'] || 'yes',
        'Phone Subscription Status': record['Phone Subscription Status'] || 'yes',
        'Address Subscription Status': record['Address Subscription Status'] || 'yes',
        '💸 Givebutter Page Setup': record['💸 Givebutter Page Setup'] || '',
        '📆 Shift Preference': record['📆 Shift Preference'] || '',
        '👯‍♂️ Partner Preference': record['👯‍♂️ Partner Preference'] || '',
        '🚂 Mentor Training Complete': record['🚂 Mentor Training Complete'] || '',
        '✅ Mentor Training Signed Up?': record['✅ Mentor Training Signed Up?'] || '',
        '📈 Fully Fundraised': record['📈 Fully Fundraised'] || '',
        '📱Custom Text Message 1️⃣': record['📱Custom Text Message 1️⃣'] || '',
        '📧 Custom Email Message 1️⃣': record['📧 Custom Email Message 1️⃣'] || '',
        '💰 Amount Fundraised': record['💰 Amount Fundraised'] || '',
        '📱Custom Text Message 2️⃣': record['📱Custom Text Message 2️⃣'] || ''
      };

      stringifier.write(row);
    }

    stringifier.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    console.log(`✅ CSV exported successfully!`);
    console.log(`📁 Location: ${OUTPUT_PATH}\n`);
  }

  console.log('📝 Next Steps:');
  console.log('   1. Find the CSV in: backend/features/comms/gb_imports/updated_import-10.25/');
  console.log('   2. Upload to Givebutter: Contacts → Import → Upload CSV');
  console.log('   3. Send messages as needed using custom fields');
  console.log();
}

// Run the campaign
runCampaign().catch(error => {
  console.error('❌ Campaign failed:', error);
  process.exit(1);
});
