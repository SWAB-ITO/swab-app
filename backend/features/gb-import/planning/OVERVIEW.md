# Givebutter Import Feature

## Purpose
Export mentor data from our system in a format compatible with Givebutter's contact import system. This allows us to keep Givebutter updated with the latest mentor information and fundraising status.

## Architecture

### Data Flow
```
Raw Data (Jotform, Givebutter API)
  ↓ [Sync Scripts]
raw_mn_signups, raw_gb_full_contacts, raw_gb_campaign_members
  ↓ [ETL Process]
mentors (single source of truth)
  ↓ [ETL Process - buildGbImportRow()]
mn_gb_import (formatted for Givebutter import)
  ↓ [Export Script]
givebutter-import-YYYY-MM-DD.csv
  ↓ [Manual Upload]
Givebutter Admin Panel
```

### Key Tables

#### `mentors` - Single Source of Truth
- Contains all mentor data including `preferred_name`
- Updated by ETL process (`backend/core/etl/process.ts`)
- Fields: `mn_id`, `first_name`, `preferred_name`, `personal_email`, `amount_raised`, etc.

#### `mn_gb_import` - Givebutter Import Staging
- Formatted specifically for Givebutter CSV import
- Populated by ETL process using `buildGbImportRow()` helper
- **Prefix field** = `mentor.preferred_name` (the name mentors want to be called)
- Should NOT be modified by export scripts - read-only for export

## Current Issues (10/16/2025)

### Issue: Prefix Field Not Populating with Preferred Names
**Status**: INVESTIGATING

**Problem**:
- `mentors.preferred_name` is correctly populated from Jotform
- ETL code correctly maps `'Prefix': mentor.preferred_name` in `buildGbImportRow()`
- But `mn_gb_import.Prefix` appears to be NULL or not showing preferred names

**Root Cause Analysis**:
1. ✅ Jotform sync correctly extracts `preferredName` → `raw_mn_signups.preferred_name`
2. ✅ ETL correctly maps `signup.preferred_name` → `mentors.preferred_name`
3. ✅ ETL's `buildGbImportRow()` correctly maps `mentor.preferred_name` → `Prefix`
4. ❓ Need to verify data actually making it into `mn_gb_import.Prefix`

**Investigation Steps**:
- [ ] Query `mn_gb_import` directly to check Prefix values
- [ ] Check if Prefix column exists and has correct data type
- [ ] Verify ETL is running the `buildGbImportRow()` function
- [ ] Check for any column name mismatches (encoding issues with emoji fields?)

## Scripts

### Export Script
**Location**: `backend/features/gb-import/scripts/export.ts`

**Responsibility**:
- Read from `mn_gb_import` table
- Generate CSV file with Givebutter-compatible format
- Should NOT modify `mn_gb_import` table

**Usage**: `npm run export:givebutter`

### ETL Process (Import Staging Population)
**Location**: `backend/core/etl/process.ts`

**Function**: `buildGbImportRow(mentor, messageEngine, customFieldsConfig, getMentorTags)`

**Responsibility**:
- Transform `mentors` records into Givebutter import format
- Populate `mn_gb_import` table with formatted data
- Map `preferred_name` to `Prefix` field

## Data Mapping

### Critical Fields
| Givebutter Field | Source | Notes |
|-----------------|--------|-------|
| Prefix | `mentors.preferred_name` | The name the mentor wants to be called by |
| First Name | `mentors.first_name` | Legal first name from Jotform |
| Primary Email | `mentors.personal_email` or `uga_email` | Preferred contact email |
| Givebutter Contact ID | `mentors.gb_contact_id` | For updating existing contacts |
| 📈 Fully Fundraised? | Calculated from `amount_raised` | Yes if >= $75 |

## Testing Checklist

- [ ] Run full sync: `npm run sync`
- [ ] Run ETL: `npm run etl`
- [ ] Query `mn_gb_import` to verify Prefix field
- [ ] Run export: `npm run export:givebutter`
- [ ] Verify CSV has correct preferred names in Prefix column
- [ ] Test import in Givebutter staging environment

## Future Enhancements
- [ ] Add frontend UI for managing imports
- [ ] Automated scheduling of exports
- [ ] Direct API integration with Givebutter (skip CSV step)
- [ ] Validation and preview before export
