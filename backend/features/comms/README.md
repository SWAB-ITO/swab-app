# Communication Campaigns (Text & Email)

**System for sending personalized text messages and emails to mentors via Givebutter.**

---

## ⚠️ CRITICAL - READ FIRST

**Sending incorrect information to 600+ mentors damages trust and credibility.**

**BEFORE creating any campaign:**

1. **Read**: `CRITICAL_WARNINGS.md` (same directory)
2. **Run**: `npx tsx backend/scripts/verify-campaign-data-sources.ts`
3. **Test**: Always use `--test` flag first

**Common mistakes that WILL cause errors:**
- Using undefined fields or stale data
- Not syncing data before running campaigns
- Skipping validation before sending

**If you're unsure about data sources, STOP and verify first.**

---

## Overview

This system manages dual-channel communications (SMS + Email) to mentors. Each campaign generates:
- **Text messages**: Full, self-contained messages (via Givebutter SMS)
- **Email custom sections**: Status-specific content injected into email templates (via Givebutter Email)

### Message Structure

**Text**: Complete message sent via SMS
```
Hi Alex! Thank you for signing up as a mentor...
[Full message with all details]
Questions? info@swabuga.org. As always, GO SWAB!
```

**Email**: Composable with custom field injection
```
[OPENING - written in Givebutter email composer]
Hi Alex, Thank you for signing up...

{{📧 Custom Email Message 1️⃣}} ← Status-specific section from database

[CLOSING - written in Givebutter email composer]
Next steps for all mentors...
```

---

## Quick Start

### 1. Plan Your Campaign

Create a campaign plan in `messages/<campaign_name>/PLAN.md`:
- Define message content for text and email
- Specify status-specific variants
- Document campaign goals and target audience

See `messages/initial_message - 10.13/PLAN.md` as an example.

### 2. Verify Data Sources

**REQUIRED BEFORE CREATING CAMPAIGN:**
```bash
npx tsx backend/scripts/verify-campaign-data-sources.ts
```

This shows:
- What fields exist in each table
- Sample data from each table
- Where to find common data (amount_raised, status, etc.)

### 3. Create Campaign Script

Create a campaign script (or copy from template):
```bash
cp backend/features/comms/templates/campaign-template.ts \
   backend/features/comms/messages/<campaign_name>/<campaign_name>.ts
```

Customize the script with your message content from PLAN.md.

**IMPORTANT:** All mentor data is now in the `mentors` table:
- `amount_raised` is directly available in `mentors` table
- No need to join with other tables for fundraising data
- See template for examples

### 4. Test the Campaign Script

**ALWAYS test first:**
```bash
npx tsx backend/features/comms/messages/<campaign_name>/<campaign_name>.ts --test
```

This will:
- Generate messages WITHOUT updating database
- Show validation errors
- Display sample messages
- Let you verify data accuracy

### 5. Run the Campaign Script

Once testing passes:
```bash
npx tsx backend/features/comms/messages/<campaign_name>/<campaign_name>.ts
```

This will:
- Fetch mentors from all necessary tables
- Generate personalized text messages (full)
- Generate personalized email custom sections (status-specific)
- Validate messages for errors
- Show preview by status
- Update `mn_gb_import` table with both fields

### 4. Export to CSV

```bash
npm run comms:export
```

Generates: `backend/data/givebutter-import-YYYY-MM-DD.csv`

Optional: Validate the CSV before uploading
```bash
npm run comms:validate
```

### 5. Upload to Givebutter

1. Go to Givebutter → **Contacts** → **Import**
2. Upload the CSV
3. Givebutter will match contacts and update custom fields:
   - `📱Custom Text Message 1️⃣` (full text message)
   - `📧 Custom Email Message 1️⃣` (email custom section)

### 6. Send Text Messages

1. Go to **Engage** → **Texts** → **New Text**
2. Insert the custom field: `{{📱Custom Text Message 1️⃣}}`
3. Filter recipients as needed
4. Send immediately or schedule

### 7. Send Emails

1. Go to **Engage** → **Email** → **New Email**
2. Write your opening section
3. Insert the custom field: `{{📧 Custom Email Message 1️⃣}}`
4. Write your closing section
5. Filter recipients and send

---

## Directory Structure

```
backend/features/comms/
├── README.md                          # This file
├── templates/
│   └── campaign-template.ts           # Template for creating new campaigns
├── tools/
│   ├── export.ts                      # Export mn_gb_import to CSV
│   ├── validate.ts                    # Validate CSV before Givebutter upload
│   ├── query.ts                       # Query and analyze mentor data
│   └── test.ts                        # Test campaign message generation
└── messages/
    └── initial_message - 10.13/       # Example campaign
        ├── PLAN.md                    # Campaign plan and message content
        └── initial_message_10_13.ts   # Campaign script
```

## Key Files

### `templates/campaign-template.ts`
Template for creating new campaigns. Copy and customize for each campaign.

### `tools/export.ts`
Exports `mn_gb_import` table to Givebutter-compatible CSV. Includes both text and email custom fields.

**Usage:**
```bash
npm run comms:export                              # Export all mentors to backend/data
npm run comms:export changed                      # Export only mentors needing sync
npm run comms:export -- --output="path/to/dir"    # Export to custom directory
```

### `tools/validate.ts`
Validates CSV for common issues before uploading to Givebutter.

**Usage:**
```bash
npm run comms:validate [filename]   # Validates most recent export if no filename
```

### `tools/query.ts`
Analyzes mentor data to help plan campaigns.

**Usage:**
```bash
npx tsx backend/features/comms/tools/query.ts
```

---

## Custom Fields in Givebutter

Two custom fields are used for communications:

### `📱Custom Text Message 1️⃣`
- **Purpose:** Full text message (complete, self-contained)
- **Length:** No practical limit, but aim for 2-3 SMS (~320-460 chars)
- **Used in:** Givebutter SMS campaigns
- **Populated by:** Campaign scripts (text message)

### `📧 Custom Email Message 1️⃣`
- **Purpose:** Status-specific email section (middle part only)
- **Length:** No limit (emails can be long)
- **Used in:** Givebutter email campaigns (injected via `{{📧 Custom Email Message 1️⃣}}`)
- **Populated by:** Campaign scripts (email custom section)

---

## Technical Details

### Database Flow
```
mentors table (single source of truth - includes amount_raised, status, etc.)
    ↓
campaign script (generates personalized messages)
    ↓
mn_gb_import table (staging - generated on-demand for campaign)
    ↓
export.ts (generates CSV)
    ↓
Givebutter Import (updates contacts)
    ↓
Givebutter Engage (send texts/emails)
```

### Message Variables
Common variables used in messages:
- `{{name}}` - Preferred name (or first name)
- `{{email}}` - Mentor's email
- `{{amount_raised}}` - Current fundraising amount
- `{{remaining}}` - Amount left to reach $75

### Status Categories
Mentors are categorized by `status_category`:
- `complete` - Fundraising page created & $75 fundraised
- `needs_fundraising` - Page created, but not fully fundraised
- `needs_page` - Setup form completed, but no page found
- `needs_setup` - No setup form completed yet

---

## Tips

### Before Running a Campaign
1. Use `query.ts` to analyze your mentor data
2. Check status distribution and contact ID coverage
3. Review your message content in PLAN.md
4. Test the campaign script to preview messages

### After Running a Campaign
1. Export CSV with `npm run comms:export` and validate it with `npm run comms:validate`
2. Upload to Givebutter (Contacts → Import)
3. For texts: Create SMS campaign with `{{📱Custom Text Message 1️⃣}}`
4. For emails: Create email with opening, `{{📧 Custom Email Message 1️⃣}}`, and closing
5. Filter recipients and send

### SMS Pricing
Givebutter Plus includes unlimited SMS (up to 10,000 per day). Multi-part SMS (2-3 messages) count as one message toward the daily limit.

---

## Questions?

Contact the development team or reference the campaign scripts in `messages/` for examples.
