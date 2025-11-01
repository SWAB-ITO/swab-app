# Managing Givebutter

> This document is the source of truth for Givebutter tags and custom fields. Use this to maintain consistency across the codebase and prevent configuration drift.

## Overview

Givebutter integration requires careful management of:
1. **Tags** - Used for segmentation and filtering contacts
2. **Custom Fields** - Used to store mentor-specific data that syncs between our database and Givebutter

## Tags

### Strategy: Year-Agnostic Naming

**Current Year**: Always use generic names without year suffix
- `Mentors` (not "Mentors 2025")
- `Dropped` (not "Dropped 25")

**Past Years**: Add year suffix when the year ends
- At end of 2025: Rename `Mentors` → `Mentors 2025`
- At end of 2025: Rename `Dropped` → `Dropped 2025`

**Rationale**:
- Keeps segments and filters working year-over-year without code changes
- Automatically archives old cohorts with year suffix
- New year uses same generic tags (no code updates needed)

### Current Tags (2025)

| Tag Name | Purpose | Applied When |
|----------|---------|--------------|
| `Mentors` | Primary cohort tag | All active mentors |
| `Dropped` | Inactive mentors | When `dropped = true` |

### Tag Configuration Location
- **Config File**: `backend/core/config/tags.json`
- **Applied In**: `backend/core/etl/process.ts` (function `getMentorTags`)

---

## Custom Fields

### How to Find Custom Field IDs

When you export/import contacts from Givebutter, the CSV uses field IDs in the format `custom_fields_field_XXXXXX`. When fields are removed and re-added in Givebutter, they get NEW IDs.

**To find current field IDs:**
1. Export any contact from Givebutter as CSV
2. Look at column headers - they will show `custom_fields_field_256673`, etc.
3. Match the order to the fields in Givebutter settings
4. Update the ID column in the table below
5. Update `backend/core/config/givebutter-field-ids.json`

### Current Custom Fields

| Num | Label | Field Type | Database Source | Givebutter Field ID |
|---|---|---|---|---|
| 1 | ✅ Mentor Training Signed Up | Checkbox | `mentors.training_signup_done` | **256669** |
| 2 | 🎁 Givebutter Page Setup | Checkbox | `mentors.gb_member_id` | **256670** |
| 3 | 🤝 Partner Preference | Number | `mentors.partner_preference` | **256672** |
| 4 | 🧑‍🏫 Mentor Training Complete | Checkbox | `mentors.training_done` | **256673** |
| 5 | 📈 Fully Fundraised | Checkbox | `mentors.fundraised_done` | **256675** |
| 6 | 📱 Custom Text Message1️⃣ | Text | Generated per campaign | **256676** |
| 7 | 💌 Custom Email Message1️⃣ | Text | Generated per campaign | **258777** |
| 8 | 🤑 Amount Fundraised | Number | `mentors.amount_raised` | **262775** |
| 9 | 📱Custom Text Message 2️⃣ | Text | Generated per campaign | **262847** |
| 10 | 🎓 UGA Class | Option | `mentors.uga_class` | **264472** |
| 11 | 📆 Shift Preference | Option | `mentors.shift_preference` | **265730** |
| 12 | ☘️ Internal or External | Option | `mentors.internal_external` (TBD) | **TBD** - Field exists in Givebutter, not yet populated |
| 13 | 🏆 Other Experience | Option | `mentors.other_experience` (TBD) | **TBD** - Field exists in Givebutter, not yet populated |

**Note**: Fields 12 & 13 are created in Givebutter but have no data yet. Field IDs will be obtained once we populate them with data.

### Option Field Values

#### Field 10: 🎓 UGA Class (single select)
- Freshman
- Sophomore
- Junior
- Senior
- Grad. Student

#### Field 11: 📆 Shift Preference (single select)
- 8:30-1:30
- 9:15-2:15
- 10:00-3:00
- 10:45-3:45
- 11:30-4:30

**Note**: In database, these may be stored with emoji prefixes (e.g., "🩰 | 11:30-4:30")

#### Field 12: ☘️ Internal or External (single select)
- Mentor
- Ambassador
- FYC

#### Field 13: 🏆 Other Experience (multi select)
- Spanish
- Cognitive
- Physical

---

## Configuration Locations in Codebase

### Tags Configuration
- **`backend/core/config/tags.json`** - Defines tag names and application rules
- **`backend/core/etl/process.ts`** - Function `getMentorTags()` applies tags based on mentor data

### Custom Fields Configuration
- **`backend/core/config/custom-fields.json`** - Maps field names to database sources and defines yes/no mappings
- **`backend/core/config/givebutter-field-ids.json`** - Maps Givebutter field IDs to human-readable names
- **`backend/core/etl/process.ts`** - Function `buildGbImportRow()` transforms data for export

### Export/Import Process
1. **ETL Process** (`npm run etl`) populates `mn_gb_import` table from `mentors` table
2. **Export API** (`GET /api/mentors/gb-import`) generates CSV from `mn_gb_import` table
3. **Manual Import** - Upload CSV to Givebutter

---

## Implementation Checklist

### To Implement New Tag/Custom Field Strategy:

- [ ] **Update tags.json**
  - Change `"Mentors 2025"` → `"Mentors"`
  - Change `"Dropped 25"` → `"Dropped"`
  - Remove all other status-based tags

- [ ] **Update getMentorTags() in process.ts**
  - Remove logic that adds "No Page", "Not Fundraised", "Status: XXX" tags
  - Keep only "Mentors" and "Dropped" logic

- [ ] **Export fresh CSV from Givebutter**
  - Get current field IDs for all 13 custom fields
  - Fill in "Givebutter Field ID" column above

- [ ] **Update givebutter-field-ids.json**
  - Map all 13 field IDs to their labels
  - Add fields 12 & 13 mappings

- [ ] **Update custom-fields.json**
  - Add field 12 (☘️ Internal or External)
  - Add field 13 (🏆 Other Experience)
  - Verify all emoji labels match Givebutter exactly

- [ ] **Database Changes** (if needed)
  - Add `mentors.internal_external` column
  - Add `mentors.other_experience` column

- [ ] **Test full sync pipeline**
  - Run `npm run sync:*` scripts
  - Run `npm run etl`
  - Export CSV and verify format
  - Test import to Givebutter with 3 test contacts

---
