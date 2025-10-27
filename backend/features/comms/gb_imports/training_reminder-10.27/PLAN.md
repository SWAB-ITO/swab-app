# Training Reminder Campaign - October 27, 2025

## Overview
Campaign to remind mentors who haven't completed their training signup.

## Target Audience
Mentors with `training_signup_done = false` or `null`

**Total Target**: 362 mentors (37.1% of all mentors)

## Campaign Goals
1. Remind mentors to complete their training signup
2. Provide clear instructions and deadline
3. Answer common questions

## Message Content

### Text Message (Full, Self-Contained)
```
[TODO: Write complete text message here]
```

### Email Custom Section (Status-Specific)
```
[TODO: Write email custom section here - will be injected into email template]
```

## Status-Specific Variants
If different messages are needed based on mentor status:

### Status: needs_setup
- [TODO: Define message variant]

### Status: needs_page
- [TODO: Define message variant]

### Status: needs_fundraising
- [TODO: Define message variant]

### Status: complete
- [TODO: Define message variant]

## Important Notes
- 362 mentors have not completed training signup
- These mentors need to sign up for a training session
- Training form: https://form.jotform.com/SWAB_UGA/mentor-training-sign-up

## Testing Checklist
- [ ] Run data verification script
- [ ] Test campaign script with `--test` flag
- [ ] Review sample messages for each status
- [ ] Validate message length (aim for 2-3 SMS for text)
- [ ] Check for personalization variables
- [ ] Ensure all data sources are synced

## Send Checklist
- [ ] Export CSV with `npm run comms:export`
- [ ] Validate CSV with `npm run comms:validate`
- [ ] Upload to Givebutter
- [ ] Create text campaign with `{{📱Custom Text Message 1️⃣}}`
- [ ] Create email campaign with opening + `{{📧 Custom Email Message 1️⃣}}` + closing
- [ ] Filter recipients appropriately
- [ ] Send or schedule
