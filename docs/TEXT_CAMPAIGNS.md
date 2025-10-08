# Text Message Campaigns

**How to send targeted text messages to mentors using Givebutter.**

---

## Overview

This system syncs mentor data with custom fields to Givebutter, enabling filtered text message campaigns based on mentor status.

**Key Features:**
- ✅ Export mentors to Givebutter-compatible CSV
- ✅ Sync custom fields: "Text Instructions" and "$ Status"
- ✅ Filter contacts by status category for targeted messaging
- ✅ Track sync status per mentor

---

## Quick Start

```bash
# 1. Pull latest data
npm run sync && npm run etl

# 2. Export mentors to CSV
npm run text:export

# 3. Validate before import
npm run text:validate

# 4. Import to Givebutter (manual step)
# Go to Givebutter → Contacts → Import → Upload CSV

# 5. Send text campaign (in Givebutter UI)
# Engage → Texts → New Text → Filter by "$ Status"
```

---

## The Four Status Categories

### 1. `needs_setup` (164 mentors)
**What it means:** Signed up but haven't completed the setup form

**Text Instructions:**
> Look for the "Next Steps" email from SWAB and complete the Givebutter setup form.

**How to filter in Givebutter:**
- Engage → Texts → New Text
- Add Filter → Contact Custom Fields → "$ Status"
- Condition: "equals" → Value: `needs_setup`

---

### 2. `needs_page_creation` (28 mentors)
**What it means:** Completed setup but haven't created fundraising page

**Text Instructions:**
> Use the link from your "Next Steps" email to create your Givebutter fundraising page.

**How to filter in Givebutter:**
- Add Filter → Contact Custom Fields → "$ Status"
- Condition: "equals" → Value: `needs_page_creation`

---

### 3. `needs_fundraising` (359 mentors)
**What it means:** Have fundraising page but haven't raised $75

**Text Instructions:**
> Work on fundraising your $75. Once you hit $75, you're all set!

**How to filter in Givebutter:**
- Add Filter → Contact Custom Fields → "$ Status"
- Condition: "equals" → Value: `needs_fundraising`

---

### 4. `fully_complete` (0 mentors currently)
**What it means:** Raised $75, ready for the event

**Text Instructions:**
> You are all set! Look out for more information closer to the event.

**How to filter in Givebutter:**
- Add Filter → Contact Custom Fields → "$ Status"
- Condition: "equals" → Value: `fully_complete`

---

## Full Workflow

### Step 1: Sync Latest Data

```bash
# Pull from Jotform and Givebutter
npm run sync

# Process into clean tables
npm run etl

# Verify counts
npm run admin:verify
```

**What this does:**
- Fetches latest signups, setup completions, campaign members
- Deduplicates and matches across sources
- Updates mentor status categories
- Populates "Text Instructions" custom field

---

### Step 2: Export to CSV

```bash
# Export all mentors
npm run text:export

# OR export only changed mentors
npm run text:export -- changed
```

**Output:** `data/givebutter-import-YYYY-MM-DD.csv`

**What's included:**
- All mentor contact info (name, email, phone)
- Custom fields: "Text Instructions", "$ Status", "Mentor ID"
- Tags: "Mentors 2025"
- Givebutter Contact ID (for updates to existing contacts)

---

### Step 3: Validate CSV

```bash
npm run text:validate
```

**Checks for:**
- ✅ Required fields (First Name, Last Name)
- ✅ Email OR phone present
- ✅ Phone format (E.164: +1XXXXXXXXXX)
- ✅ Custom field length (max 255 chars)
- ✅ Duplicate contacts
- ✅ Valid status categories

---

### Step 4: Import to Givebutter

**Manual steps in Givebutter UI:**

1. **Go to Contacts:**
   - Navigate to `Contacts` in left sidebar

2. **Click Import:**
   - Top right corner → `Import`

3. **Upload CSV:**
   - Upload `givebutter-import-YYYY-MM-DD.csv`
   - Givebutter will auto-map columns

4. **Review Mapping:**
   - Verify columns are mapped correctly
   - Custom fields should auto-match by name

5. **Import:**
   - Click `Import Contacts`
   - Givebutter will match existing contacts by:
     - First Name + Last Name + (Email OR Phone)
   - Updates existing contacts
   - Creates new contacts for 127 mentors without contact IDs

6. **Wait for Completion:**
   - Large imports may take a few minutes
   - You'll receive an email when complete

---

### Step 5: Re-Sync Contacts

After import completes, pull updated contacts back to database:

```bash
# Export fresh contacts CSV from Givebutter
# Contacts → Export → Download CSV

# Replace old CSV
mv ~/Downloads/givebutter-contacts-*.csv data/givebutter-contacts-export.csv

# Re-sync
npm run sync:givebutter-contacts

# Re-run ETL to update mentor records
npm run etl
```

---

### Step 6: Send Text Campaign

**In Givebutter UI:**

1. **Navigate to Texts:**
   - `Engage` → `Texts` → `+ New Text`

2. **Select Recipients:**
   - Filter by `Contact Custom Fields` → `$ Status`
   - Example: `$ Status` equals `needs_fundraising`

3. **Compose Message:**
   - Use the "Text Instructions" field as a guide
   - Personalize with merge fields (First Name, etc.)
   - Max 450 characters

4. **Preview:**
   - Send test message to yourself first

5. **Schedule or Send:**
   - Send immediately or schedule for later

---

## Message Templates

### Needs Setup

```
Hi {{First Name}}! 👋

You signed up for SWAB 2025 - thank you! 🎉

Next step: Complete the Givebutter setup form from the "Next Steps" email we sent you.

Questions? Reply here!

- SWAB Team
```

### Needs Page Creation

```
Hi {{First Name}}!

Great job completing setup! 👏

Next: Create your fundraising page using the link in your "Next Steps" email.

This takes just 2 minutes!

- SWAB Team
```

### Needs Fundraising

```
Hi {{First Name}}! 🌟

You're doing great! Keep sharing your fundraising page - you're at ${{Amount Raised}} so far.

Goal: $75 to complete registration.

You've got this! 💪

- SWAB Team
```

### Fully Complete

```
Hi {{First Name}}! ✨

You're all set for SWAB 2025! 🎊

You raised your $75 and we can't wait to see you at the event.

More details coming soon!

- SWAB Team
```

---

## Custom Fields Reference

### Current Fields (Synced)

| Field Name | Type | Source | Purpose |
|-----------|------|---------|---------|
| Text Instructions | Text (255) | `mentor_texts.custom_field_instructions` | What mentor should do next |
| $ Status | Text (50) | `mentor_texts.custom_field_status` | Status category for filtering |
| Mentor ID | Text (50) | `mentor_texts.custom_field_mentor_id` | Jotform mentor ID |

### Legacy Fields (Not Synced)

| Field Name | Type | Purpose |
|-----------|------|---------|
| Pre-Fill URL | Text | Pre-filled form URLs |
| BGC Link | Text | Background check links |
| Sign Up Link | Text | Registration links |
| BGC Complete? | Toggle | Tracking background checks |
| Sign Up Complete? | Toggle | Tracking sign up status |
| $ Raised | Number | Amount raised (from Givebutter) |
| Shift | Text | Event shift assignments |

---

## Filtering Contacts

### By Status Category

```
Filter: Contact Custom Fields
Field: $ Status
Condition: equals
Value: needs_fundraising
```

### By Tag

```
Filter: Tags
Condition: includes
Value: Mentors 2025
```

### Combined Filters

Example: "Mentors who need fundraising AND have UGA email"

```
Filter 1: Contact Custom Fields → $ Status equals needs_fundraising
Filter 2: Primary Email → includes → @uga.edu
```

---

## Troubleshooting

### Issue: Import failed for some contacts

**Cause:** Missing required fields or invalid data

**Fix:**
```bash
npm run text:validate
# Review errors and warnings
# Fix data in Supabase if needed
# Re-export and re-validate
```

---

### Issue: Custom fields not updating

**Cause:** Field names don't match exactly (case-sensitive)

**Fix:**
- Verify field names in Givebutter match CSV column headers exactly
- Custom field: "Text Instructions" (not "text_instructions")

---

### Issue: Contacts not filtering correctly

**Cause:** Status values don't match filter

**Fix:**
- Use exact values: `needs_setup`, `needs_page_creation`, `needs_fundraising`, `fully_complete`
- Values are case-sensitive

---

### Issue: Duplicate contacts created

**Cause:** Givebutter couldn't match by name+email/phone

**Fix:**
- Review and merge duplicates in Givebutter UI
- Ensure phone format is correct (+1XXXXXXXXXX)
- Ensure names match exactly

---

## Advanced: Automated Sync Workflow

**Coming soon:** Scripts to automate the full cycle

```bash
# Future automation (not yet implemented)
npm run text:sync-all   # Sync data → Export → Validate → Upload
```

**Current workflow requires:**
1. Manual CSV import to Givebutter (Step 4)
2. Manual CSV export from Givebutter (Step 5)

---

## Requirements

### Givebutter Plus Subscription

**Required for:**
- Outbound SMS messaging
- 10,000 message daily limit
- Contact custom fields filtering

### 10DLC Compliance

**Required for:**
- Sending SMS in the US
- One-time registration with mobile carriers

**How to register:**
- Givebutter → Engage → Texts → Register Phone Number

---

## FAQ

### Q: How often should I re-sync?

**A:** Depends on activity:
- Before each text campaign (to get latest status updates)
- After major events (form deadlines, fundraising milestones)
- Weekly during active recruitment periods

---

### Q: Can I send to all mentors at once?

**A:** Yes, but not recommended:
- Different mentors need different messages
- Use status filters for targeted messaging
- More personal = better engagement

---

### Q: What if a mentor's status changes after I export?

**A:**
- Run the sync workflow again before sending
- Or filter by "Last Modified" date in Givebutter

---

### Q: How do I know which mentors received which messages?

**A:**
- Givebutter tracks all sent messages
- Engage → Texts → View sent messages
- See open rates, click rates, replies

---

## Related Documentation

- **[GUIDE.md](GUIDE.md)** - How the data pipeline works
- **[ISSUES.md](ISSUES.md)** - Current data quality issues
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Adding new features

---

**Built for SWAB UGA** • Text messaging system • Powered by Givebutter
