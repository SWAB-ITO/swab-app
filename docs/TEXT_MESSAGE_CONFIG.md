# Text Message Configuration Guide

**How to configure and send personalized text messages to mentors.**

---

## Overview

The text message system uses a **config-driven approach** where:
1. ✅ Message templates are stored in JSON config (not hardcoded)
2. ✅ Messages automatically personalize based on mentor data
3. ✅ ETL process populates messages in the `📱Custom Text Message 1️⃣` field
4. ✅ Export to Givebutter → filter by status → send texts

**No code changes needed** when updating message content - just edit the JSON file.

---

## Quick Start

```bash
# 1. Edit message templates
# → Edit: backend/features/text-messages/config/message-templates.json

# 2. Preview messages with sample data
npm run text:preview

# 3. Run ETL to generate personalized messages
npm run etl

# 4. Verify messages were populated
npx tsx backend/features/text-messages/check-messages.ts

# 5. Export to Givebutter
npm run text:export

# 6. Import CSV to Givebutter, then send texts
# → Engage → Texts → Filter by status → Send
```

---

## How It Works

### 1. Message Templates (JSON Config)

**File:** `backend/features/text-messages/config/message-templates.json`

This file contains:
- **Campaigns**: Multiple campaigns (e.g., "Initial Outreach", "Mid-Campaign Check-in")
- **Messages**: One message per status category (`needs_setup`, `needs_page`, `needs_fundraising`, `complete`)
- **Variables**: Placeholders like `{{first_name}}`, `{{amount_raised}}`

**Example:**
```json
{
  "campaigns": [
    {
      "id": "2025-initial-outreach",
      "name": "Initial Outreach - January 2025",
      "active": true,
      "messages": {
        "needs_setup": {
          "template": "Hi {{first_name}}! 👋 Thanks for signing up...",
          "variables": ["first_name"]
        }
      }
    }
  ]
}
```

### 2. ETL Process

When you run `npm run etl`, the system:
1. Processes mentors and calculates their `status_category`
2. For each mentor, calls the **Message Engine**
3. Message Engine selects the right template based on status
4. Replaces `{{first_name}}` with actual name, `{{amount_raised}}` with actual amount
5. Populates `mn_gb_import` table with personalized messages

### 3. Export to Givebutter

**File:** `backend/features/text-messages/export-contacts.ts`

When you run `npm run text:export`, it:
1. Reads `mn_gb_import` table (already has personalized messages)
2. Generates CSV with all Givebutter columns
3. Includes `📱Custom Text Message 1️⃣` column with personalized messages

### 4. Send in Givebutter UI

1. Upload CSV to Givebutter (Contacts → Import)
2. Go to Engage → Texts → New Text
3. **Don't write a message** - the field already has personalized text!
4. Filter by status (optional): Add Filter → "Status" → `needs_setup`
5. Send

Each mentor receives their personalized message based on their status.

---

## Editing Messages

### Example: Change "needs_setup" Message

**Current message:**
```
Hi {{first_name}}! 👋 Thanks for signing up as a SWAB mentor.
Next step: Complete your setup form.
Check your email for "Next Steps" from SWAB.
```

**To change:**

1. **Edit the config file:**
   ```bash
   # Open: backend/features/text-messages/config/message-templates.json
   ```

2. **Update the template:**
   ```json
   "needs_setup": {
     "template": "Hey {{first_name}}! 🎉 Welcome to SWAB mentors! Please complete your setup form ASAP. Link in your email!",
     "variables": ["first_name"],
     "character_count": 110
   }
   ```

3. **Preview the change:**
   ```bash
   npm run text:preview
   ```

4. **Re-run ETL to regenerate messages:**
   ```bash
   npm run etl
   ```

5. **Verify:**
   ```bash
   npx tsx backend/features/text-messages/check-messages.ts
   ```

6. **Export and send:**
   ```bash
   npm run text:export
   # → Import to Givebutter → Send
   ```

---

## Available Variables

Variables are placeholders that get replaced with actual mentor data.

### Current Variables

| Variable | Source | Example | Fallback |
|----------|--------|---------|----------|
| `{{first_name}}` | `mentors.first_name` | `"Alex"` | `"there"` |
| `{{preferred_name}}` | `mentors.preferred_name` | `"Lex"` | Falls back to `first_name` |
| `{{amount_raised}}` | `mentors.amount_raised` | `"45"` | `"0"` |
| `{{amount_remaining}}` | Calculated: `75 - amount_raised` | `"30"` | `"75"` |
| `{{shift_preference}}` | `mentors.shift_preference` | `"Option 2"` | `""` |

### Using Variables in Templates

```json
"needs_fundraising": {
  "template": "{{first_name}}, you've raised ${{amount_raised}}! Just ${{amount_remaining}} to go!",
  "variables": ["first_name", "amount_raised", "amount_remaining"]
}
```

**Output for mentor with `first_name="Alex"` and `amount_raised=45`:**
```
Alex, you've raised $45! Just $30 to go!
```

### Adding New Variables

To add a new variable (e.g., `{{partner_name}}`):

1. **Define it in the config:**
   ```json
   "variable_definitions": {
     "partner_name": {
       "source": "mentors.partner_name",
       "description": "Name of mentor's partner",
       "fallback": ""
     }
   }
   ```

2. **Use it in templates:**
   ```json
   "needs_page": {
     "template": "Hi {{first_name}}! Your partner is {{partner_name}}. Create your page together!",
     "variables": ["first_name", "partner_name"]
   }
   ```

---

## Creating Multiple Campaigns

You can have multiple campaigns (e.g., for different times in the year).

### Example: Add "Mid-Campaign Reminder"

```json
{
  "campaigns": [
    {
      "id": "2025-initial-outreach",
      "name": "Initial Outreach - January 2025",
      "active": false,  // ⬅️ Deactivate old campaign
      "messages": { ... }
    },
    {
      "id": "2025-mid-campaign",
      "name": "Mid-Campaign Reminder - February 2025",
      "active": true,  // ⬅️ New active campaign
      "messages": {
        "needs_setup": {
          "template": "{{first_name}}, we noticed you haven't completed setup yet. Need help? Reply to this text!",
          "variables": ["first_name"]
        },
        "needs_fundraising": {
          "template": "{{first_name}}, you're at ${{amount_raised}}! Event is in 2 weeks - let's hit $75!",
          "variables": ["first_name", "amount_raised"]
        }
      }
    }
  ]
}
```

**Only one campaign can be `active: true` at a time.**

---

## Message Length Validation

SMS messages longer than 160 characters are split into multiple texts.

**Check length:**
```bash
npm run text:preview
```

**Output shows length:**
```
━━━ NEEDS_SETUP ━━━
📱 Hi Ava! 👋 Thanks for signing up...
📊 Length: 132 chars ✅
```

**If over 160:**
```
📊 Length: 175 chars ⚠️ Message exceeds 160 characters. May be split into multiple SMS.
```

---

## Workflow for Updating Messages

### Scenario: Event is in 2 weeks, send urgency message

1. **Edit config** (`backend/features/text-messages/config/message-templates.json`):
   ```json
   "needs_fundraising": {
     "template": "🚨 URGENT {{first_name}}! Event is in 2 WEEKS. You're at ${{amount_raised}}. We need that $75 ASAP!",
     "variables": ["first_name", "amount_raised"]
   }
   ```

2. **Preview:**
   ```bash
   npm run text:preview
   ```

3. **Sync latest data:**
   ```bash
   npm run sync
   ```

4. **Re-run ETL** (generates new messages):
   ```bash
   npm run etl
   ```

5. **Export:**
   ```bash
   npm run text:export
   ```

6. **Import to Givebutter:**
   - Upload `backend/data/givebutter-import-2025-01-08.csv`

7. **Send texts:**
   - Engage → Texts → Filter by "needs_fundraising" → Send

---

## Future: UI-Based Message Management

**Vision:** Build a frontend where you can:
- ✅ Edit message templates in a text editor (no JSON editing)
- ✅ Preview messages with real mentor data
- ✅ Create/activate campaigns with date ranges
- ✅ Schedule automated sends
- ✅ See message history

**Current State:** Config is JSON-based but structured for easy UI integration.

**What's ready:**
- `MessageEngine` class is programmatically callable
- `getMessagesForMentors()` function can be called from API routes
- Config structure is UI-friendly (campaigns, templates, variables)

**To add UI:**
1. Create Next.js page: `src/app/messages/page.tsx`
2. Fetch config via API route: `src/app/api/messages/config/route.ts`
3. Display in form editor
4. Save updates back to JSON (or migrate to database)
5. Call `npm run etl` via API route after save

---

## Troubleshooting

### Messages are empty in Givebutter

**Check:**
```bash
npx tsx backend/features/text-messages/check-messages.ts
```

**If empty:**
- Did you run `npm run etl` after editing the config?
- Is there an active campaign in the config (`"active": true`)?
- Check for errors: `npm run etl` (look for message engine errors)

### Messages have `{{first_name}}` instead of actual name

**Cause:** Variable not found in mentor data

**Fix:**
- Check variable definition in `variable_definitions`
- Ensure mentor has the required field (e.g., `first_name` exists in DB)
- Check fallback value in variable definition

### Message length warning

**Solution:** Shorten the message or accept it will be split into 2 SMS.

**Tips:**
- Use abbreviations: "Please" → "Pls", "You are" → "You're"
- Remove emojis (they count as 2 chars sometimes)
- Split into two separate campaigns if too much info

---

## Commands Reference

```bash
# Preview message templates
npm run text:preview

# Verify messages in database
npx tsx backend/features/text-messages/check-messages.ts

# Generate personalized messages (part of ETL)
npm run etl

# Export to CSV
npm run text:export

# Validate CSV before import
npm run text:validate
```

---

## File Structure

```
backend/features/text-messages/
├── config/
│   └── message-templates.json    # ⬅️ EDIT THIS to change messages
├── message-engine.ts              # Engine that applies templates
├── export-contacts.ts             # CSV export
├── validate-export.ts             # CSV validation
└── check-messages.ts              # Verification tool

docs/
└── TEXT_MESSAGE_CONFIG.md         # This file
```

---

## Key Concepts

1. **Config-driven**: Messages in JSON, not hardcoded
2. **Personalized**: Variables replaced with real mentor data
3. **Status-based**: Different messages per status category
4. **Campaign support**: Multiple campaigns, one active at a time
5. **Future-ready**: Structured for UI management

**Bottom line:** To change what mentors receive, edit the JSON file and re-run ETL. No code changes needed!
