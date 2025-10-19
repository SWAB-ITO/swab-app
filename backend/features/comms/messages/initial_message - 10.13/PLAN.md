# Initial Communication Campaign

**Date:** October 12, 2025

**Status:** Planning

**Channels:** Text & Email

## Campaign Goals & Context Dump
> Note: This is a fixed session where we will be essentially correcting the issues that were cause in the initial message. The text is going to say that there were errors in yesterdays text, mentor trainings are now these days to give mentors more fundraising time (October 27th, 28th, 29th {if these dates do not work for you, we will work with you}) details coming soon, and check your email on updated & corrected fundraising instructions. 

## DRAFTED MESSAGES

### TEXT MESSAGE (Full Unified Message)

 ✨ Updated & Corrected Info (As of 4:00pm 10/14) ✨

  Hey again {preferred_name}!

  We are still ironing out the Mentor wrinkles this year & we're sorry for the confusion, but we have some updates:

  • Mentor Training dates moved to Oct 27, 28, 29 (giving you more fundraising time!)
  • Check your email {personal_email} for corrected fundraising status/instructions and all the details you need.

  Contact info@swabuga.org with any issues and as always, GO SWAB!

---

### EMAIL MESSAGE (Composable with Custom Field Injection)

The email provides all the details that complement the text messages we sent. It has a warm opening, status-specific custom section (injected field), and detailed itemized closing.

#### Email Opening (Same for all mentors - written in Givebutter composer)
```
Hi {{name}},

Thank you for signing up to be a mentor for SWAB Event Day on November 9th - less than a month away! We are so excited to have you on board.

This email covers all of the additional details we didnt cover in the text that you need to know. Let's start with what you need to focus on right now:

---

💸 **YOUR FUNDRAISING STATUS**
```

#### Email Custom Middle Section (Varies by status - this goes in `📧 Custom Email Message 1️⃣` field)

**Status: Complete**
```
✅ You're all set!

Your fundraising page is set up and you've fully fundraised your $75 goal. Amazing work! You're ready for the next steps so just look out for SWAB emails.
```

**Status: Needs Fundraising**
```
📈 Almost there!

Your fundraising page is created and you've raised ${{amount_raised}} so far. Just ${{amount_remaining}} more to hit your $75 goal!

Keep sharing your page with friends and family - you're so close!
```

**Status: Needs Page**
```
🎯 ACTION NEEDED: Create Your Fundraising Page

We see you completed the setup form, but couldn't find your fundraising page yet. Here's how to create it:

1. Visit this link: https://givebutter.com/SWABUGA2025/join
2. Use your email: {{personal_email}}
3. Select "Mentors 2025" as your team
4. Set your goal to $75

Once created, share it with friends and family to reach your goal!
```

**Status: Needs Setup**
```
🎯 ACTION NEEDED: Complete Your Setup

Check your email ({{personal_email}}) for a "Next Steps..." message from SWAB. It contains your unique fundraising page setup link.

Can't find it? Check spam or contact us at info@swabuga.org and we'll help!

Once you complete setup, just fundraise $75 before mentor training.
```

#### Email Closing (Same for all mentors - written in Givebutter composer)
```
---

🗓️ WHAT'S COMING NEXT

🧑‍🏫 Mentor Training Sessions (REQUIRED Before Event Day)
Sign up details coming soon! You'll attend ONE session (Oct 27, 28, or 29) where we will:
• Hand out your SWAB shirt
• Train you on Event Day responsibilities
• Answer questions and prep you for success

Don't stress about which session you pick - if you need sing up for one but need to switch last minute, just come to whichever works!

---

👯‍♂️ Partners & Groups
Info coming after signups close this Friday, Oct 17th. Want to attend with friends? Make sure they sign up before the deadline! Otherwise, we'll match you with other mentors.

Note: Groups just mean you'll have the same arrival time on Event Day & attend the same shift. A "shift" We'll send details about shift preferences and group formation after the 17th.

---

❓ Got questions? Contact us anytime at info@swabuga.org.

We can't wait to see you on Event Day! As always, GO SWAB!

The Mentor Team
```

---

## Implementation Notes

### Custom Fields in Givebutter
- `📱Custom Text Message 1️⃣` - Full text message (varies by status)
- `📧 Custom Email Message` - Status-specific middle section only (will be injected into email template)

### Database Schema Update Needed
- Add `📧 Custom Email Message 1️⃣` column to `mn_gb_import` table (added to givebutter on web ui)
- Update `database.types.ts` to include the new field

### Campaign Script Requirements
- Generate status-specific text messages (full message)
- Generate status-specific email middle sections (custom part only)
- Map mentor statuses to correct message variants
- Handle variable replacements: {{name}}, {{personal_email}}, {{amount_raised}}, {{remaining}}

### CSV Export Update
- Include both `📱Custom Text Message 1️⃣` and `📧 Custom Email Message 1️⃣` columns
- Ensure proper CSV escaping for multi-line email content