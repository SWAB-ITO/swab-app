# Sync Correct Mentor Info to Givebutter - October 27, 2025

## Purpose

This script syncs the current, correct mentor information from the `mentors` table to the `mn_gb_import` table after all database fixes have been applied. It ensures that Givebutter has the most up-to-date and accurate information for all active mentors.

## What It Does

1. **Fetches Active Mentors**: Gets all mentors who have current signups in `raw_mn_signups`
2. **Transforms Data**: Converts mentor data to Givebutter import format with all necessary fields
3. **Updates Database**: Upserts all records into `mn_gb_import` table
4. **Exports CSV**: Creates a clean CSV file ready for upload to Givebutter

## Data Synced

The script syncs the following information:

### Basic Contact Info
- First Name, Middle Name, Last Name
- Primary Email (personal email preferred, UGA email as fallback)
- Primary Phone Number
- Gender
- Givebutter Contact ID (if exists)
- External ID (MN ID)

### Custom Fields
- ✅ **Mentor Training Signed Up?**: Yes/No based on `training_signup_done`
- 💸 **Givebutter Page Setup**: Yes/No based on `gb_member_id` presence
- 📆 **Shift Preference**: From `shift_preference` field
- 👯‍♂️ **Partner Preference**: From `partner_preference` field
- 🚂 **Mentor Training Complete**: Yes/No based on `training_done`
- 📈 **Fully Fundraised**: Yes if `fundraised_done` OR `amount_raised >= 75`
- 💰 **Amount Fundraised**: Current `amount_raised` value
- 📱 **Custom Text Messages 1️⃣ & 2️⃣**: Empty (ready for campaign-specific messages)
- 📧 **Custom Email Message 1️⃣**: Empty (ready for campaign-specific messages)

### Subscription Status
- Email: yes
- Phone: yes
- Address: yes

### Tags
- All mentors tagged with: "Mentors 2025"

## Usage

```bash
npx tsx backend/features/comms/gb_imports/sync-correct-info-10.27/sync-mentor-info.ts
```

## Output

The script will:
1. Display progress as it updates records
2. Show statistics about the sync (counts, statuses, etc.)
3. Create a CSV file: `givebutter-import-sync-2025-10-27.csv`

## Last Run Results (October 27, 2025)

```
📊 Data Summary:
   Total mentors: 959
   With GB Contact ID: 516
   With GB Member ID (page setup): 782
   With email: 959
   With phone: 959
   Training signed up: 657
   Fully fundraised: 208

✅ Updated 959 records successfully
📁 CSV records: 959
```

## Next Steps

After running the script:

1. **Locate CSV**: Find the file in this directory (`givebutter-import-sync-2025-10-27.csv`)
2. **Upload to Givebutter**:
   - Go to Givebutter → Contacts → Import
   - Upload the CSV file
   - Map fields (should auto-map if using same field names)
   - Confirm import
3. **Verify**: Check a few sample contacts in Givebutter to ensure data synced correctly

## Notes

- The script only syncs **active mentors** (those with records in `raw_mn_signups`)
- All records are marked with `needs_sync = true` in `mn_gb_import`
- Custom message fields (text/email) are intentionally left blank - ready for campaign-specific content
- The CSV format matches Givebutter's import specification exactly

## Troubleshooting

### "URI too long" Error
- Fixed in current version by fetching all records and filtering in JavaScript
- No action needed

### Missing Mentors
- Ensure the mentor has a record in `raw_mn_signups` (only active mentors are included)
- Check that the mentor exists in the `mentors` table

### Incorrect Data
- Verify the source data in the `mentors` table is correct
- Re-run the script after fixing source data
- The script performs upserts, so it's safe to run multiple times
