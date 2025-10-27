/**
 * MENTOR TRAINING SIGN-UP CAMPAIGN - OCTOBER 22, 2025
 *
 * Two-part text message campaign to announce mentor training sign-ups and provide
 * personalized fundraising status updates.
 *
 * Message content is defined in PLAN.md
 *
 * Usage:
 *   npx tsx backend/features/comms/gb_imports/mentor_trainings-10.22/mentor_trainings_10_22.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================================
// CAMPAIGN CONFIGURATION
// ============================================================================

const CAMPAIGN = {
  name: 'Mentor Training Sign-Up - October 22',
  description: 'Two-part message: training sign-up + personalized fundraising status',

  jotformBaseUrl: 'https://form.jotform.com/SWAB_UGA/mentor-training-sign-up',

  // Text Message 1 - Personalized with name and Jotform URL
  textMessage1: (name: string, email: string) => {
    const encodedEmail = encodeURIComponent(email);
    return `Hey ${name}!

Sign ups officially finished up this morning and we are SUPER excited to get the ball rolling for Event Day November 9th!

⚠️ FILL OUT THE MENTOR TRAINING SIGN UP:
https://form.jotform.com/SWAB_UGA/mentor-training-sign-up?email=${encodedEmail}

Trainings are Oct 27, 28, 29 - sign up! This form has all the important info you need before Event Day!`;
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
| 1. Go to: https://givebutter.com/SWABUGA2025/join
| 2. Sign in or create account with: ${email}
| 3. Click "Join Team" and select this team: Mentors 2025
| 4. Set your goal: $75
| 5. Customize your page & share it!

You've got this!
Questions? Reply to this text or email info@swabuga.org!`,
  },

  // Email Message - Only for tier4 (no page)
  emailMessage_noPage: (email: string) =>
    `🎯 ACTION NEEDED: Create Your Fundraising Page

We don't see your fundraising page set up yet. Don't worry - it's quick and easy! Here's exactly what to do:

STEP-BY-STEP INSTRUCTIONS:

1. Visit this link: https://givebutter.com/SWABUGA2025/join

2. Sign in or create an account using this email: ${email}

3. Click "Join Team" and select: Mentors 2025

4. Set your fundraising goal to: $75

5. Customize your page with a photo and personal message

6. Share your page link with friends and family!

Once your page is set up, you can start fundraising right away. If you have any trouble with these steps, reply to this email or contact us at info@swabuga.org and we'll help you get set up!

Remember: You'll need to fundraise $75 (or bring cash/checks to Mentor Training) before Event Day on November 9th.`,
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

    // Priority order (FIXED: use gb_member_id to check if they have a page)
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

function composeMessages(mentor: MentorWithTier): { textMessage1: string; textMessage2: string } {
  const name = mentor.preferred_name || mentor.first_name;
  const email = mentor.personal_email || 'your.email@example.com';
  const amount = mentor.amount_raised || 0;

  // Text Message 1 - Personalized with name and Jotform URL
  const textMessage1 = CAMPAIGN.textMessage1(name, email);

  // Text Message 2 - Tier-specific
  let textMessage2: string;

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
      break;

    case 'tier4_no_page':
      textMessage2 = CAMPAIGN.textMessage2.tier4_no_page(email);
      break;
  }

  return { textMessage1, textMessage2 };
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

  // Fetch ALL mentors
  console.log('🔍 Fetching mentors...\n');

  const { data: mentors, error } = await supabase.from('mentors').select('*');

  if (error) {
    console.error('❌ Error fetching mentors:', error);
    process.exit(1);
  }

  if (!mentors || mentors.length === 0) {
    console.log('⚠️  No mentors found\n');
    process.exit(0);
  }

  console.log(`✅ Found ${mentors.length} mentors\n`);

  // Calculate tiers
  console.log('🎯 Calculating tiers and rankings...\n');

  const mentorsWithTiers = calculateTiers(mentors);

  // Generate messages
  console.log('💬 Generating personalized messages...\n');

  const updates = mentorsWithTiers.map(mentor => {
    const { textMessage1, textMessage2 } = composeMessages(mentor);

    return {
      mn_id: mentor.mn_id,
      tier: mentor.tier,
      rank: mentor.rank,
      textMessage1,
      textMessage2,
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

  // Check message lengths
  const avgText1Length = Math.round(
    updates.reduce((sum, u) => sum + u.text1Length, 0) / updates.length
  );
  const avgText2Length = Math.round(
    updates.reduce((sum, u) => sum + u.text2Length, 0) / updates.length
  );

  console.log(`📏 Average message lengths:`);
  console.log(`   Text 1: ${avgText1Length} characters (~${Math.ceil(avgText1Length / 160)} SMS)`);
  console.log(`   Text 2: ${avgText2Length} characters (~${Math.ceil(avgText2Length / 160)} SMS)`);
  console.log();

  // Show sample messages for each tier
  console.log('🔍 SPOT CHECK PREVIEWS:\n');
  console.log('='.repeat(80));

  // Text Message 1 sample
  const sampleMentor = updates[0];
  console.log('\n💬 TEXT MESSAGE 1️⃣ (Same structure, personalized URL)');
  console.log('-'.repeat(80));
  console.log(`Example: ${sampleMentor.mn_id} - ${sampleMentor.name}`);
  console.log(`${sampleMentor.text1Length} characters (~${Math.ceil(sampleMentor.text1Length / 160)} SMS)\n`);
  console.log(sampleMentor.textMessage1);
  console.log();

  // Text Message 2 samples by tier
  console.log('\n💬 TEXT MESSAGE 2️⃣ (Tier-specific)');
  console.log('='.repeat(80));

  const tierOrder: TierType[] = [
    'top15',
    'tier1_high',
    'tier2_complete',
    'tier3_partial',
    'tier4_no_page',
  ];

  tierOrder.forEach(tier => {
    const tierUpdates = updates.filter(u => u.tier === tier);
    if (tierUpdates.length > 0) {
      const tierNames: Record<TierType, string> = {
        top15: 'TOP 15 (Ranked)',
        tier1_high: 'TIER 1 ($165+)',
        tier2_complete: 'TIER 2 ($75-$164)',
        tier3_partial: 'TIER 3 ($1-$74)',
        tier4_no_page: 'TIER 4 (No Page)',
      };

      console.log(`\n📍 ${tierNames[tier]} (${tierUpdates.length} mentors)`);
      console.log('-'.repeat(80));

      const sample = tierUpdates[0];
      console.log(`\nExample: ${sample.mn_id} - ${sample.name}`);
      if (sample.rank) {
        console.log(`Rank: #${sample.rank} | Amount: $${sample.amount}`);
      } else {
        console.log(`Amount: $${sample.amount}`);
      }
      console.log(`\n💬 MESSAGE (${sample.text2Length} chars):`);
      console.log(sample.textMessage2);
      console.log();
    }
  });

  // Confirm before updating
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  READY TO UPDATE DATABASE');
  console.log('='.repeat(80));
  console.log(`This will update ${updates.length} mentor records in mn_gb_import table.`);
  console.log('Both text message fields will be populated.\n');

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
  console.log('   2. Upload to Givebutter: Contacts → Import → Upload CSV');
  console.log('   3. Send Text 1: Engage → Texts → New Text (use 📱Custom Text Message 1️⃣)');
  console.log('   4. Send Text 2: Engage → Texts → New Text (use 📱Custom Text Message 2️⃣)');
  console.log('   5. Schedule Text 2 to send 1-2 minutes after Text 1 completes');
  console.log();
}

// Run the campaign
runCampaign().catch(error => {
  console.error('❌ Campaign failed:', error);
  process.exit(1);
});
