# Initial Communication Campaign

**Date:** October 12, 2025

**Status:** Planning

**Channels:** Text & Email

## Campaign Goals & Context Dump
> Note: This campaign will be delivered via both text and emai. The text will be one final injected text per mentor, regardless of what custom injection was within the text. We will upload it as one custom filed and send texts to mentorsusing just that field to prevent further complication. Email however will have the seperated parts. I will put the sections into the email that are global then have a field injection for the one piece that changes per mentor. I believe there are currently 2 fields around custom messages...maybe we can rename them to one for email which is just the custom part the other of which is the full curated message

### Envisioned Flow of Communication

- Hi {{mentor name}} SWAB is happening November 9th & we are excited for Event Day!  
- This is where we will deviate and have different options depending on mentor status:
    - Page created, fully fundraised, ready for mentor trainings!
    - Page created, not fundraised $75 yet, only final task before trainings is to fundraise.
    - GB setup form filled out, page not found on givebutter. Use your {{mentor_personal_email}} email, select Mentors 2025 as your team, set your goal to $75, and click this link to create a fundraising page (https://givebutter.com/SWABUGA2025/join).
    - Check this email {{mentor_personal_email}} for a "Next Steps..." email from SWAB wil a link to setup your fundraising page.
- The next step, mentor training sessions will be October 20th, 21st, and 28th and mentors must sign up & attend a session where we will hand out your shirts, mentor train, and prep you for Event Day (we do not care which one. if you cant go to the one you signed up for but you can go to another last minute, just come and do not worry about the sign up)
- Info about partners & group creation will come out after mentor sign ups close this Friday, Oct 17. If you have any friends you want to partner or group with, make sure to tell them to sign up before the deadline!
- Other than that, all you have to do is pay attention to our emails & texts over the next month leading up to Event Day. Thank you and contact info@swabuga.org with any questions.

---

## Target Audience & Stylistic Goals: All mentors that have signed up before we create this message
- The goal for the final message is for it to be very clear, neutral tone with common terms that are effortlessly intuitive and make mentors feel "wow, that makes sense no need to worry"
- We want to use as few words as possible without being confusing or robotic
    - Complete and optimal clarity is the end state goal

## Execution Idea
- We can execute by first using this context as a starting point, edit the current state to reflect both the email and text nature of the execution, change any errors caused by renaming the parent folder to comms and removing the campaign middle one
- The thought is to then create a draft version that is the exact things we are planning to say that we will co-create then finalize in this md file lower, then add info on the implementation of the messages into the import database before we prep the csv for contact import & gb syncing
    - we can ensure that the template, tools, readme, etc all respect and understand our full goals here to ensure we leave with a good product

---

## DRAFTED MESSAGES

### TEXT MESSAGE (Full Unified Message)

The text will be one complete message that varies by mentor status. Target: 2-3 SMS (320-460 characters) - warm but concise.

#### Status: Complete (fundraised + page created)
```
Hi {{name}}!

Thank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...

You're all set - your fundraising page is created & we see you've fully fundraised your $75!

Next steps: Mentor training (Oct 20, 21, or 28) sign up details coming soon. Partner/group info coming after signups close Friday, Oct 17. Tell your friends to sign up before the deadline!

Got questions? info@swabuga.org. As always, GO SWAB!
```

#### Status: Needs Fundraising (page created, not fully fundraised)
```
Hi {{name}}!

Thank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...

You're almost there - your fundraising page is created & you've raised ${{amount_raised}}! Just ${{remaining}} more to hit your $75 goal.

Next steps: Finish fundraising, then mentor training (Oct 20, 21, or 28) sign up details coming soon. Partner/group info coming after signups close Friday, Oct 17. Tell your friends to sign up!

Got questions? info@swabuga.org. As always, GO SWAB!
```

#### Status: Needs Page (setup form completed, no page found)
```
Hi {{name}}!

Thank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...

Action needed: Create your fundraising page. Use your {{personal_email}} email, select "Mentors 2025" team, set goal to $75, after you click this link: https://givebutter.com/SWABUGA2025/join

Once your page is set up, just fundraise $75 then attend mentor training (Oct 20, 21, or 28). Partner/group info coming after signups close Friday, Oct 17. Tell your friends to sign up!

Questions? info@swabuga.org. As always, GO SWAB!
```

#### Status: Needs Setup (no setup form completed)
```
Hi {{name}}!

Thank you for signing up as a mentor for SWAB Event Day, Nov 9th! Check your email for the full details, but in short...

Action needed: Check this email ({{personal_email}}) for a "Next Steps..." message from SWAB with a fundraising setup link.

Once you complete setup & fundraise $75, you'll just attend mentor training (Oct 20, 21, or 28). Partner/group info coming after signups close Friday, Oct 17. Tell friends to sign up!

Questions? info@swabuga.org. As always, GO SWAB!
```

---

### EMAIL MESSAGE (Composable with Custom Field Injection)

The email provides full details that complement the text message. It has a warm opening, status-specific custom section (injected field), and detailed itemized closing.

#### Email Opening (Same for all mentors - written in Givebutter composer)
```
Hi {{name}},

Thank you for signing up to be a mentor for SWAB Event Day on November 9th - less than a month away! We are so excited to have you on board.

This email covers everything you need to know as a mentor leading up to Event Day. Let's start with what you need to focus on right now:

---

💸 **YOUR FUNDRAISING STATUS**
```

#### Email Custom Middle Section (Varies by status - this goes in `📧 Custom Email Message 1️⃣` field)

**Status: Complete**
```
✅ You're all set!

Your fundraising page is set up and you've fully fundraised your $75 goal. Amazing work! You're ready for the next steps.
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

🗓️ **WHAT'S COMING NEXT**

🧑‍🏫 Mentor Training Sessions (REQUIRED Before Event Day)
Sign up details coming soon! You'll attend ONE session (Oct 20, 21, or 28) where we will:
• Hand out your SWAB shirt
• Train you on Event Day responsibilities
• Answer questions and prep you for success

Don't stress about which session you pick - if you need sing up for one but need to switch last minute, just come to whichever works!

---

👯‍♂️ Partners & Groups
Info coming after signups close this Friday, Oct 17th. Want to attend with friends? Make sure they sign up before the deadline! Otherwise, we'll match you with other mentors.

Note: Groups just mean you'll have the same arrival time on Event Day & attend the same shift. A "shift" We'll send details about shift preferences and group formation after the 17th.

---

❓ **Got questions?** Contact us anytime at info@swabuga.org.

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