# Preferred Name Issue - Investigation Results

**Date**: October 16, 2025
**Status**: ROOT CAUSE IDENTIFIED - Jotform form missing field

## Summary

The Prefix field (intended to hold mentor preferred names) is identical to First Name in all exports because **neither Jotform form collects preferred name data**. The sync script looks for a field called "preferredName" that doesn't exist in either form.

## Investigation Results

### Database Analysis

Ran diagnostic script checking all 3 stages of the pipeline:

```
raw_mn_signups:    0/808 with different preferred_name ❌
mentors:           0/793 with different preferred_name ❌
mn_gb_import:      0/789 with different Prefix ❌
```

**Conclusion**: ALL records have NULL preferred_name in raw_mn_signups, which means the field is not being captured from Jotform.

### Jotform Forms Inspection

#### Signup Form (250685983663169)
**Fields Found**:
- fullName (first, middle, last)
- personalEmail
- ugaEmail
- mnPhone
- gender
- ugaClass
- shirtSize
- etc.

**Missing**: ❌ NO field for preferred name/nickname

#### Setup Form (250754977634066)
**Fields Found**:
- personalEmail
- phoneNumber
- mnid
- whatDevice
- etc.

**Missing**: ❌ NO field for preferred name/nickname

### Sync Script Configuration

**Location**: `backend/core/sync/jotform-signups.ts:83`

```typescript
preferred_name: getAnswerByName('preferredName'),  // ← Looking for 'preferredName'
```

The sync script is looking for a field named `preferredName` but this field doesn't exist in the Jotform signup form.

## Root Cause

**The Jotform signup form does not have a preferred name field**, so there is no data to sync. The sync script is configured correctly - it just can't find the field because it doesn't exist in the form.

## Impact

- All mentors are addressed by their legal first name instead of their preferred name
- Communications (emails, texts) use formal names instead of preferred names
- Givebutter imports show identical Prefix and First Name
- No way to distinguish mentors who go by nicknames (e.g., "Will" vs "William")

## Solutions

### Option 1: Add Field to Jotform Signup Form (RECOMMENDED)

**Steps**:
1. Edit Jotform signup form (250685983663169)
2. Add a new Short Text field
3. Label it: "Preferred Name (if different from first name)"
4. Set the field name property to: `preferredName`
5. Make it optional
6. Add help text: "What name do you like to be called? Leave blank if you go by your first name."

**Pros**:
- Captures data at the source (signup time)
- One-time setup for all future mentors
- Clean data pipeline

**Cons**:
- Only applies to new signups
- Existing 808 mentors won't have this data unless they resubmit

### Option 2: Create Separate Preferred Name Update Form

**Steps**:
1. Create new Jotform for updating preferred names
2. Include fields: mnid, preferredName
3. Send to all existing mentors
4. Create separate sync script to update raw_mn_signups

**Pros**:
- Can collect data from existing mentors
- Doesn't modify existing signup form

**Cons**:
- Requires mentor participation
- More complex - need additional sync script
- Data split across multiple forms

### Option 3: Manual Data Entry

**Steps**:
1. Create spreadsheet with mn_id, first_name, preferred_name
2. Manually populate or survey mentors
3. Create import script to update raw_mn_signups

**Pros**:
- Can handle existing mentors
- Simple to understand

**Cons**:
- Labor intensive
- Error prone
- Doesn't scale

## Recommended Action Plan

### Phase 1: Add Field to Signup Form (Immediate)
1. ✅ Add `preferredName` field to Jotform signup form
2. ✅ Verify sync script can capture it (already configured)
3. ✅ Test with a new test submission
4. ✅ Run sync to capture new data

### Phase 2: Backfill Existing Mentors (Optional)
1. Create simple Jotform: "Update Your Preferred Name"
2. Send link to all existing mentors (808 total)
3. Create sync script to merge updates into raw_mn_signups
4. Re-run ETL to update mentors and mn_gb_import tables

### Phase 3: Fallback Logic (Already Implemented)
The ETL already has proper fallback logic:

```typescript
const preferredName = signup.preferred_name?.trim() || firstName;
```

If preferred_name is null or empty, it uses firstName. This means:
- Mentors who don't provide preferred name will use their first name ✓
- No null/empty values in exports ✓
- System continues to work even if field is blank ✓

## Testing Plan

Once field is added to Jotform:

```bash
# 1. Test with new submission
# (Have someone fill out signup form with different preferred name)

# 2. Sync the data
npm run sync:jotform-signups

# 3. Check if captured
npx tsx backend/scripts/debug-preferred-names.ts

# 4. Run ETL
npm run etl

# 5. Export and verify
npm run gb:export

# 6. Check CSV
# Look for records where Prefix ≠ First Name
```

## Related Files

- Sync script: `backend/core/sync/jotform-signups.ts`
- ETL process: `backend/core/etl/process.ts` (line 501, 645, 716)
- Debug script: `backend/scripts/debug-preferred-names.ts`
- Form inspector: `backend/scripts/inspect-jotform-fields.ts`

## Questions for User

1. **Was there ever a preferred name field in the Jotform signup form?**
   - If yes, when was it removed?
   - Can we re-add it with the same field name?

2. **Do you want to collect preferred names from existing mentors?**
   - If yes, should we create a separate update form?
   - Or handle this manually?

3. **Priority level?**
   - Is this critical for the current campaign?
   - Or can it wait until next year's signups?
