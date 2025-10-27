# Updated Givebutter Import - October 25, 2025

**Purpose:** Create a fresh Givebutter import with the latest data, customized training signup messaging, and email setup instructions for mentors without pages.

## What's New

This campaign updates the existing mentor data with:

1. **Fresh sync data** - Latest fundraising amounts, training signups, etc.
2. **Smart training signup messaging** - Text Message 1 changes based on whether they've signed up for training
3. **Email setup instructions** - Added `📧 Custom Email Message 1️⃣` field specifically for Tier 4 (no page) mentors with step-by-step Givebutter page creation instructions

## Message Structure

### Text Message 1 - Training Signup (ONLY for those NOT signed up)

**Recipients:** ~650 mentors who HAVE NOT signed up for training
**Note:** Mentors who HAVE signed up (~326) get NO Text Message 1 (blank field)

```
⚠️ ACTION NEEDED: SIGN UP FOR MENTOR TRAINING

Training is REQUIRED. Sessions are Oct 27, 28, 29.

SIGN UP NOW:
{personalized Jotform URL}

This form has all the important info you need. Please make sure to fill it out!
```

### Text Message 2 - Fundraising Status (All Tiers)
- Tier-specific fundraising status update (same as before)

### Email Message 1 - Page Setup Instructions (Tier 4 Only)
**Recipients:** ~214 mentors without Givebutter pages

```
🎯 ACTION NEEDED: Create Your Fundraising Page

We don't see your fundraising page set up yet. Don't worry - it's quick and easy! Here's exactly what to do:

STEP-BY-STEP INSTRUCTIONS:

1. Sign in or create an account using this email: {personal_email}
2. Click "Join Team" and select: Mentors 2025
3. Set your fundraising goal to: $75
4. Visit this link: https://givebutter.com/SWABUGA2025/join and use the instructions above!

Customize your page with a photo and personal message before sharing your page link with friends and family!

Once your page is set up, you can start fundraising right away. Remember: You'll need to fundraise $75 (or bring cash/checks to Mentor Training) before Event Day on November 9th.
```

### Email Message 2 - Fundraising Tips (NEW - Tier 3: Has page, < $75)
**Recipients:** ~569 mentors with pages who haven't reached $75 yet

```
📈 Keep Going - You're Almost There!

Your fundraising page is set up and you've raised ${amount_raised} so far. Great start! Just ${amount_remaining} more to hit your $75 goal!

Here are some quick tips to reach your goal:

💡 Quick Fundraising Tips:
• Text your family and close friends directly
• Post a personal story about why you're mentoring with SWAB
• Check out https://mentors.swabuga.org/setup/tips-and-tricks

Can't fundraise online? No problem! You can bring cash or checks to Mentor Training (Oct 27, 28, or 29).

Your fundraising page: {fundraising_page_url}
```

## Message Distribution

| Group | Count | Text 1 | Text 2 | Email |
|-------|-------|--------|--------|-------|
| Training NOT signed up | ~650 | ⚠️ Training signup | Tier-specific | Depends on tier below |
| Training signed up | ~326 | (blank) | Tier-specific | Depends on tier below |
| | | | | |
| **Tier 4** (no page) | ~214 | Conditional | ✅ Setup needed | **Email 1**: Page setup |
| **Tier 3** ($0-$74 with page) | ~569 | Conditional | ✅ Partial | **Email 2**: Tips + URL |
| Tier 2 ($75-$164) | ~158 | Conditional | ✅ Complete | (blank) |
| Tier 1 ($165+) | ~20 | Conditional | ✅ High achiever | (blank) |
| Top 15 | ~15 | Conditional | ✅ Ranked | (blank) |

## Usage

### 1. Run the Campaign Script
```bash
npx tsx backend/features/comms/gb_imports/updated_import-10.25/updated_import_10_25.ts
```

### 2. Export to CSV
```bash
npm run gb:export
```

### 3. Upload to Givebutter
- Navigate to Givebutter → Contacts → Import
- Upload the generated CSV file
- Verify field mappings (especially the new email field)

## Database Fields Updated

- `📱Custom Text Message 1️⃣` - All mentors
- `📱Custom Text Message 2️⃣` - All mentors
- `📧 Custom Email Message 1️⃣` - **Only Tier 4 mentors** (new!)

## Implementation Notes

- Based on `mentor_trainings-10.22` template
- Only Tier 4 (no page) mentors get the email field populated
- All other tiers have email field set to empty string
- Email message contains personalized setup link with mentor's email pre-filled
