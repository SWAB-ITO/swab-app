# Mentor Training Sign-Up Campaign

**Date:** October 22, 2025

**Status:** Planning

**Channels:** Text (2-part sequential message)

## Campaign Goals & Context

This campaign announces the mentor training sign-up form and provides personalized fundraising status updates to all mentors. Sign-ups for the initial mentor roster closed this morning, and we're now directing everyone to complete the training sign-up form which contains critical Event Day information.

**Two-part message strategy:**
- **Text 1**: Intro + training sign-up call-to-action with personalized Jotform URL (email pre-populated)
- **Text 2**: Personalized fundraising status (varies by tier)
- Both messages will be scheduled to send sequentially in Givebutter

---

## DRAFTED MESSAGES

### TEXT MESSAGE 1️⃣ (Personalized URL)

```
Hey {{preferred_name}}!

Sign ups officially finished up this morning and we are SUPER excited to get the ball rolling for Event Day November 9th!

⚠️ FILL OUT THE MENTOR TRAINING SIGN UP:
https://form.jotform.com/SWAB_UGA/mentor-training-sign-up?email={{personal_email}}

Trainings are Oct 27, 28, 29 - sign up! This form has all the important info you need before Event Day!
```

**Variables:** `{{preferred_name}}`, `{{personal_email}}` (pre-populates email field in Jotform)

**Character count:** ~270 characters (varies slightly by email length)

---

### TEXT MESSAGE 2

#### **Top 15 Tier: Top fundraisers with personalized ranking**
*Criteria: Top 15 mentors by amount_raised AND amount_raised >= $165*

💸 FUNDRAISING STATUS:

✅ You've fundraised ${{amount_raised}}
🏆 YOU'RE RANKED #{{rank}} OUT OF 850+ MENTORS!!!

You're crushing it! We're announcing a fundraising competition at Mentor Trainings with prizes - keep going to secure your spot at the top!

Questions? Reply to this text or email info@swabuga.org!
```

**Variables:** `{{amount_raised}}`, `{{rank}}`

---

#### **Tier 1: High Fundraisers (not in top 15)**
*Criteria: amount_raised >= $165 AND not in top 15*

```
💸 FUNDRAISING STATUS:

✅ You've fundraised ${{amount_raised}}
You're one of our TOP FUNDRAISERS!!! Keep going - we're announcing an individual competition at Trainings!

Questions? Reply to this text or email info@swabuga.org!
```

**Variables:** `{{amount_raised}}`

---

#### **Tier 2: Fully Fundraised**
*Criteria: $75 <= amount_raised < $165*

```
💸 FUNDRAISING STATUS:

✅ You've fundraised ${{amount_raised}}
You're doing AWESOME! Keep going - we're announcing an individual competition at Trainings!

Questions? Reply to this text or email info@swabuga.org!
```

**Variables:** `{{amount_raised}}`

---

#### **Tier 3: Partial Fundraising (Page Exists)**
*Criteria: gb_member_id IS NOT NULL AND amount_raised < $75*

```
💸 FUNDRAISING STATUS:

🔄 You've fundraised ${{amount_raised}}
Not quite at $75 yet, but your page is created! Keep fundraising or turn in money at Mentor Trainings.

Questions? Reply to this text or email info@swabuga.org!
```

**Variables:** `{{amount_raised}}`

---

#### **Tier 4: No Page / Setup Needed**
*Criteria: gb_member_id IS NULL (not on Mentors 2025 team)*

```
⛔️ ACTION NEEDED: CREATE YOUR FUNDRAISING PAGE

Your page isn't set up yet. Here's exactly what to do:
| 1. Go to: https://givebutter.com/SWABUGA2025/join
| 2. Sign in or create account with: {{personal_email}}
| 3. Click "Join Team" and select this team: Mentors 2025
| 4. Set your goal: $75
| 5. Customize your page & share it!

You've got this! 
Questions? Reply to this text or email info@swabuga.org!
```

**Variables:** `{{personal_email}}`

---

## Implementation Notes

### Database Schema
- Uses existing `mn_gb_import` table
- Populates two custom fields:
  - `=�Custom Text Message 1�` - Universal intro message
  - `=�Custom Text Message 2�` - Personalized fundraising status

### Tier Detection Logic

**Priority order (check in this sequence):**

1. **Top 15 Tier**:
   - Query all mentors, sort by `amount_raised DESC`
   - Take top 15 where `amount_raised >= 165`
   - Assign rank (1-15)

2. **Tier 1 ($165+)**:
   - `amount_raised >= 165`
   - NOT in top 15

3. **Tier 2 ($75-$164)**:
   - `amount_raised >= 75 AND amount_raised < 165`

4. **Tier 3 ($0-$74 with page)**:
   - `gb_member_id IS NOT NULL AND amount_raised < 75`
   - This includes people with $0 who HAVE created their page

5. **Tier 4 (No Page)**:
   - `gb_member_id IS NULL`
   - Not on Mentors 2025 team = no fundraising page created

### Variable Replacements
- `{{amount_raised}}` - From `mentors.amount_raised`
- `{{rank}}` - Calculated rank for top 15 (1-15)
- `{{personal_email}}` - From `mentors.personal_email` (used in Text 1 Jotform URL and Tier 4)

### Campaign Script Requirements
- Generate Text 1 with personalized Jotform URL (email parameter) for all mentors
- Generate tier-specific Text 2 based on fundraising status
- Calculate top 15 rankings dynamically
- Handle variable replacements for both messages
- URL-encode email addresses for Jotform parameter
- Update `mn_gb_import` table with both message fields
- Set `needs_sync: true` to trigger CSV export

### CSV Export
- Use existing export script: `npm run comms:export`
- Include both `=�Custom Text Message 1�` and `=�Custom Text Message 2�` columns
- Ensure proper CSV escaping for multi-line content

### Sending in Givebutter
1. Import updated CSV to Givebutter
2. Create **first text campaign** using `=�Custom Text Message 1�` field
3. Schedule immediately
4. Create **second text campaign** using `=�Custom Text Message 2�` field
5. Schedule 1-2 minutes after first text completes
6. Both messages will appear sequential to recipients

---
