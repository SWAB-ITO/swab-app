# Data Quality Findings - Preferred Name Field

**Date**: October 16, 2025
**Issue**: Some mentors may have filled out name fields backwards

## Summary

The sync script is now correctly capturing preferred names from `fullName.prefix`. However, investigation revealed some users appear to have filled out the form incorrectly, entering their legal name in "Preferred Name" and their nickname in "Legal First Name".

## Technical Findings

### ✅ System is Working Correctly

1. **Jotform Form Labels** - Clearly marked:
   ```
   Prefix field → "Preferred Name"
   First field → "Legal First Name"
   ```

2. **Sync Script** - NOW FIXED:
   ```typescript
   preferred_name: fullName.prefix  // ✅ Correct
   first_name: fullName.first       // ✅ Correct
   ```

3. **ETL Process** - Already correct:
   ```typescript
   const preferredName = signup.preferred_name?.trim() || firstName;
   ```

### ❌ User Data Entry Errors

**Example Cases Found:**

| Legal First Name | Preferred Name | Likely Reality | Issue |
|-----------------|---------------|----------------|-------|
| Emm | Emma | Emma is legal, Emm is nickname | Backwards |
| (Sarah) | Madeline | Sarah is legal, Madeline is preferred? | Unclear - could be middle name |

**Verified Correct Examples:**
| Legal First Name | Preferred Name | Explanation |
|-----------------|---------------|-------------|
| Emma | Morgan | Goes by middle name |
| Prabhjot | Prabh | Shortened version |
| Timothy | TJ | Initials |

## Root Cause

The form labels are correct, but some users either:
1. **Misread the labels** and filled them backwards
2. **Assumed prefix = nickname** (common on forms)
3. **Rushed through** and swapped the fields

## Impact Analysis

Out of 822 signups with preferred names:
- **679 have preferred names** captured
- **Unknown** how many are backwards (need manual review)
- **Estimated 5-10%** may have data entry errors based on spot checks

## Recommendations

### Option 1: Accept Data As-Is (LOW EFFORT)
**Pros:**
- No additional work
- Most data appears correct
- Users should have read labels carefully

**Cons:**
- Some mentors will be called by wrong name
- Unprofessional if calling "Emm" when legal name is "Emma"

### Option 2: Add Validation to Future Forms (MEDIUM EFFORT)
**Actions:**
1. Add help text: "Preferred Name: What we should call you (leave blank if same as legal name)"
2. Add example: "Legal: Elizabeth, Preferred: Beth"
3. Consider making Preferred Name optional - blank means use Legal First Name

**Pros:**
- Prevents future errors
- Clearer for users

**Cons:**
- Doesn't fix existing data
- Requires Jotform form edit

### Option 3: Manual Data Cleanup (HIGH EFFORT)
**Process:**
1. Export list of mentors where Preferred ≠ First
2. Flag suspicious cases (unusually short legal names, etc.)
3. Email mentors to confirm: "We have your name as [Legal]. You prefer [Preferred]. Is this correct?"
4. Update corrections in database

**Pros:**
- High data quality
- Shows attention to detail

**Cons:**
- Time consuming
- Requires mentor participation
- May annoy mentors with correct data

### Option 4: Create Self-Service Update Form (MEDIUM-HIGH EFFORT)
**Implementation:**
1. Create simple Jotform: "Update Your Name Preferences"
2. Pre-fill with current data: "Current Legal Name: X, Current Preferred: Y"
3. Allow corrections
4. Sync updates into system

**Pros:**
- Empowers mentors to fix their own data
- Can be used for future corrections
- Scalable

**Cons:**
- Development time
- Not all mentors will respond

## Recommended Approach

**Phase 1: Quick Win (This Week)**
- ✅ Sync script fixed (DONE)
- ✅ Export working with preferred names (DONE)
- Export CSV and use AS-IS for now
- Note any obviously wrong ones for manual follow-up

**Phase 2: Prevention (Before Next Signup)**
- Update Jotform form with clearer help text
- Add validation/examples
- Make Preferred Name optional with explicit "leave blank if same"

**Phase 3: Cleanup (Optional, If Time)**
- Create self-service update form
- Send to all mentors as "Verify Your Info"
- Update records based on responses

## Detection Script

Created script to flag suspicious cases:
```bash
npx tsx backend/scripts/check-data-quality.ts
```

Looks for patterns like:
- Very short "legal" names (Emm, Liv, Bri) that might be nicknames
- Longer "preferred" names that might be legal names
- Common nickname → full name patterns

## Current Status

**System:** ✅ Working correctly - capturing and exporting preferred names

**Data Quality:** ⚠️ Mixed - majority correct, some user errors

**Action Needed:** Decision on data cleanup approach

## Questions for Product Owner

1. **Priority Level?**
   - Critical to fix before Givebutter upload?
   - Or acceptable to use current data?

2. **Acceptable Error Rate?**
   - If 5% have backwards names, is that okay?
   - Or do we need 100% accuracy?

3. **Resources Available?**
   - Can we manually review ~50 suspicious cases?
   - Or should we automate with update form?

4. **User Experience?**
   - Contact mentors to confirm?
   - Or risk using potentially wrong names?
