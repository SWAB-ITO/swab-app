# Givebutter Import Feature

Export mentor data to CSV format for importing into Givebutter's contact management system.

## Quick Start

```bash
# 1. Sync latest data from Jotform and Givebutter
npm run sync

# 2. Run ETL to populate mn_gb_import table
npm run etl

# 3. Export to CSV
npm run gb:export
```

The CSV file will be generated at: `backend/features/gb-import/data/givebutter-import-YYYY-MM-DD.csv`

## Architecture

### Data Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SOURCE DATA                                                   │
│    - Jotform (mentor signups with preferred_name)               │
│    - Givebutter API (existing contacts, campaign members)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SYNC (npm run sync)                                          │
│    → raw_mn_signups (includes preferred_name from Jotform)     │
│    → raw_gb_full_contacts                                       │
│    → raw_gb_campaign_members                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ETL (npm run etl)                                            │
│    → mentors table (single source of truth)                     │
│    → mn_gb_import (formatted for Givebutter)                    │
│                                                                  │
│    buildGbImportRow():                                          │
│      'Prefix' ← mentor.preferred_name  ✓                        │
│      'First Name' ← mentor.first_name                           │
│      '📈 Fully Fundraised?' ← calculated from amount_raised    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EXPORT (npm run gb:export)                                   │
│    → givebutter-import-YYYY-MM-DD.csv                           │
│                                                                  │
│    IMPORTANT: Export script is READ-ONLY                        │
│    - Does NOT modify mn_gb_import                               │
│    - Simply exports the data to CSV                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. MANUAL UPLOAD                                                │
│    → Givebutter Admin Panel → Contacts → Import                │
└─────────────────────────────────────────────────────────────────┘
```

## Key Fields

### Prefix Field (Preferred Name)
The **Prefix** field contains each mentor's preferred name:
- Source: `mentors.preferred_name`
- From: Jotform signup form "preferredName" field
- Fallback: If no preferred name provided, uses `first_name`
- Purpose: The name the mentor wants to be addressed as in communications

**Examples:**
- Mentor named "William" might prefer "Will" → Prefix = "Will"
- Mentor named "Elizabeth" might prefer "Beth" → Prefix = "Beth"
- Mentor named "Robert" with no preference → Prefix = "Robert"

### Other Important Fields

| CSV Column | Source | Notes |
|------------|--------|-------|
| Givebutter Contact ID | `mentors.gb_contact_id` | For updating existing contacts |
| Contact External ID | `mentors.mn_id` | Our internal mentor ID |
| First Name | `mentors.first_name` | Legal first name |
| Primary Email | `mentors.personal_email` or `uga_email` | Preferred contact |
| 📈 Fully Fundraised? | Calculated | "Yes" if `amount_raised >= 75` |
| 💸 Givebutter Page Setup | `mentors.campaign_member` | "Yes" if joined campaign |
| Tags | Static | "Mentors 2025" |

## Scripts

### Export Script
**Location**: `backend/features/gb-import/scripts/export.ts`
**Command**: `npm run gb:export`

**What it does**:
1. Reads from `mn_gb_import` table (populated by ETL)
2. Validates data (checks for Prefix field population)
3. Generates CSV with Givebutter's expected format
4. Saves to `backend/features/gb-import/data/`

**Output**:
- Logs sample of Prefix field values for verification
- Reports how many records have Prefix populated
- Warns if Prefix field is empty (indicates ETL issue)

## Folder Structure

```
backend/features/gb-import/
├── README.md           # This file
├── planning/
│   └── OVERVIEW.md    # Detailed architecture and troubleshooting
├── scripts/
│   └── export.ts      # Export script (reads mn_gb_import → CSV)
└── data/              # Generated CSV files
    └── givebutter-import-YYYY-MM-DD.csv
```

## Troubleshooting

### Prefix field is empty in CSV

**Symptoms**: CSV shows empty Prefix column or all mentors missing preferred names

**Diagnosis**:
```bash
# Check if mentors table has preferred_name
npm run gb:export

# Look for this output:
# ✓ Records with Prefix: 789/789  ← Should be 100%
```

**Solutions**:
1. **Re-run sync and ETL**:
   ```bash
   npm run sync:jotform-signups  # Refresh signup data
   npm run etl                    # Repopulate mn_gb_import
   npm run gb:export              # Generate CSV
   ```

2. **Verify ETL is mapping correctly**:
   - Check `backend/core/etl/process.ts` → `buildGbImportRow()` function
   - Should have: `'Prefix': mentor.preferred_name`

3. **Check Jotform field name**:
   - Verify form has field named "preferredName"
   - Check `backend/core/sync/jotform-signups.ts` line 83

### CSV file not generating

**Check**:
1. mn_gb_import table exists and has data (run `npm run etl` first)
2. Output directory exists: `backend/features/gb-import/data/`
3. Permissions to write to data folder

### Old export script still being used

**Issue**: Running `npm run export:givebutter` uses old script that upserts to mn_gb_import

**Solution**: Use the new command instead:
```bash
npm run gb:export  # New, cleaner export (read-only)
```

**Note**: The old script at `backend/scripts/export-givebutter-import.ts` is deprecated but kept for reference.

## Development

### Adding new fields to export

1. **Add field to ETL**: Edit `backend/core/etl/process.ts` → `buildGbImportRow()`
2. **Add column to export**: Edit `scripts/export.ts` → `columns` array
3. **Map the data**: Edit `scripts/export.ts` → row building section

### Testing changes

```bash
# Full pipeline test
npm run sync        # Get latest data
npm run etl         # Process and populate mn_gb_import
npm run gb:export   # Generate CSV

# Verify output
head backend/features/gb-import/data/givebutter-import-*.csv
```

## Future Enhancements

- [ ] Frontend UI for one-click export
- [ ] Direct Givebutter API integration (skip CSV upload step)
- [ ] Automated scheduling (daily/weekly exports)
- [ ] Preview mode (show what will be exported before generating CSV)
- [ ] Diff view (show changes since last export)
- [ ] Export filtering (e.g., only new mentors, only changed records)

## Related Documentation

- See `planning/OVERVIEW.md` for detailed architecture
- ETL documentation: `backend/core/etl/README.md` (if exists)
- Sync documentation: `backend/core/sync/README.md` (if exists)
