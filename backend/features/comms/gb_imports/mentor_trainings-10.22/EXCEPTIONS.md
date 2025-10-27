# Import Exceptions - Mentor Trainings 10.22.2025

## Overview
This document tracks data quality issues and exceptions found during the mentor training text message campaign on October 22, 2025. These issues should be monitored and prevented when moving to production.

---

## Exception #1: Kate Rose - Duplicate Givebutter Contact

**Mentor ID:** MN0262
**Phone:** +15617624901
**Email:** katerose1420@gmail.com
**Row in CSV:** 458

### Issue
Kate Rose has duplicate contacts in Givebutter:
- **Contact ID 29818693** - Currently in our database
- **Contact ID 16378030** - Duplicate found in Givebutter

When attempting to import row 458, Givebutter rejects the update because it detects the duplicate contact by matching phone number or email.

### Root Cause
Duplicate contact exists in Givebutter's database, likely from:
- Previous manual import
- Contact created through different campaign
- Multiple form submissions with different contact IDs

### Fix Applied
**Status:** Documented (requires manual Givebutter action)

**Recommended Actions:**
1. **OPTION 1: Merge in Givebutter (Preferred)**
   - Log into Givebutter admin
   - Navigate to Contacts → Search for "Kate Rose"
   - Identify both contacts (29818693 and 16378030)
   - Use Givebutter's merge feature to consolidate into contact 29818693
   - Re-import CSV after merge

2. **OPTION 2: Update our database**
   - If contact 16378030 is the "correct" one, update our database:
   ```sql
   UPDATE mentors
   SET gb_contact_id = '16378030'
   WHERE mn_id = 'MN0262';
   ```
   - Re-run ETL: `npm run sync:etl`
   - Re-export CSV: `npm run comms:export`

3. **OPTION 3: Temporary workaround**
   - Manually remove row 458 from CSV before import
   - Import remaining contacts
   - Fix duplicate later

### Production Prevention
- Implement duplicate detection in sync process (backend/core/sync/api-contacts.ts)
- Add validation to flag contacts with multiple Givebutter IDs
- Create automated duplicate resolution workflow

---

## Exception #2: Emily Hummel - Invalid Prefix Field

**Mentor ID:** MN0809
**Phone:** +16784677640
**Email:** emilyhummel1001@gmail.com
**Row in CSV:** 635

### Issue
The `Prefix` field contained "Emily Hummel" (12 characters), which caused an import error. Givebutter expects the prefix field to contain honorifics/titles (Mr., Ms., Dr., etc.), not full names.

**Original Data:**
```
First Name: Emily
Last Name: Hummel
Prefix: "Emily Hummel"  ← Invalid
```

### Root Cause
User entered their full name in the prefix field during form submission, possibly due to:
- Confusing form label/instructions
- Autocomplete filling wrong field
- User misunderstanding the purpose of the "prefix" field

The data originated from the Jotform submission and was synced into our database without validation.

### Fix Applied
**Status:** ✅ Fixed

**Actions Taken:**
```typescript
// Updated mn_gb_import table
UPDATE mn_gb_import
SET "Prefix" = '',
    needs_sync = true,
    updated_at = NOW()
WHERE mn_id = 'MN0809';
```

**Result:** Prefix cleared to empty string, allowing successful import.

### Production Prevention

1. **Add validation in ETL process** (backend/core/etl/process.ts):
   ```typescript
   // Validate prefix field
   if (prefix && prefix.length > 10) {
     console.warn(`Invalid prefix for ${mn_id}: "${prefix}" - clearing`);
     prefix = '';
   }

   // Only allow common prefixes
   const validPrefixes = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Rev.'];
   if (prefix && !validPrefixes.includes(prefix)) {
     console.warn(`Unusual prefix for ${mn_id}: "${prefix}"`);
   }
   ```

2. **Update Jotform:**
   - Add clearer instructions: "Title (e.g., Mr., Ms., Dr.) - Optional"
   - Add validation on form field to reject long values
   - Consider using dropdown instead of free text

3. **Add data quality checks:**
   - Create validation script to flag unusual prefix values before export
   - Add to `npm run comms:validate` checks

---

## Summary

| Exception | Mentor | Issue | Status | Action Required |
|-----------|--------|-------|--------|-----------------|
| #1 | Kate Rose (MN0262) | Duplicate GB contact (29818693 vs 16378030) | Documented | Merge in Givebutter |
| #2 | Emily Hummel (MN0809) | Invalid prefix "Emily Hummel" | ✅ Fixed | None (add validation) |

---

## Next Steps for Production Database

1. **Immediate:**
   - [ ] Merge Kate Rose duplicate contacts in Givebutter
   - [ ] Re-export CSV with fixes: `npm run comms:export`
   - [ ] Import to Givebutter and verify both rows import successfully

2. **Before next campaign:**
   - [ ] Add prefix validation to ETL process (backend/core/etl/process.ts)
   - [ ] Implement duplicate contact detection
   - [ ] Add automated data quality checks
   - [ ] Update Jotform prefix field with better instructions/validation

3. **Long-term:**
   - [ ] Create comprehensive data validation framework
   - [ ] Add duplicate resolution workflow
   - [ ] Implement pre-import validation reports

---

**Last Updated:** October 22, 2025
**Campaign:** Mentor Training Sign-Up Messages
**Fixed By:** Claude Code
