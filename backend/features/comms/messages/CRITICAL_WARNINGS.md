# ⚠️ CRITICAL WARNINGS - READ BEFORE CREATING CAMPAIGNS

## 🚨 Data Accuracy is Critical

When sending messages to 600+ mentors, **every piece of data must be accurate**. A single error (like showing $0 when they've raised $50) can damage trust and credibility.

---

## Common Pitfalls That WILL Cause Errors

### 1. ❌ Using Data Without Running Sync First

**WRONG:**
```typescript
const { data: mentors } = await supabase.from('mentors').select('*');

// Using stale data without syncing first
const message = `You've raised $${mentor.amount_raised}`;
// ❌ ERROR: Data might be stale or missing if sync wasn't run!
```

**RIGHT:**
```typescript
// 1. Run sync to get latest data (before running campaign)
// This populates mentors.amount_raised from GB API

// 2. Fetch mentors (all data is in one table now!)
const { data: mentors } = await supabase.from('mentors').select('*');

// 3. Use the data with safe defaults
const message = `You've raised $${mentor.amount_raised || 0}`;
// ✅ GOOD: amount_raised is directly in mentors table, with fallback
```

### 2. ❌ Not Verifying Data Sources Before Campaign Launch

**REQUIRED CHECKLIST:**

Before running ANY campaign script:

1. **Know your data sources**
   - What table has the data you need?
   - Do you need to JOIN multiple tables?
   - Are there any calculated fields?

2. **Test with real data**
   - Query 5-10 sample records manually
   - Verify the data is correct in the database
   - Check that your script accesses the right fields

3. **Run verification script** (see below)

### 3. ❌ Using Old/Outdated Documentation

**SIMPLIFIED SCHEMA (Current):**

| Table | Fields | Purpose |
|-------|--------|---------|
| `mentors` | All mentor data including `amount_raised`, `status_category`, `gb_contact_id`, etc. | **Single source of truth** |
| `raw_gb_campaign_members` | Original GB API data | Raw source only |
| `raw_gb_full_contacts` | All GB contacts | For matching contacts |

**The `mentors` table now contains ALL data you need** - no joins required for campaigns!

---

## 🛡️ Required Safety Checks

### Before Running Campaign Script

**1. Verify Data Schema**
```bash
npx tsx backend/scripts/verify-campaign-data-sources.ts
```

This will show you:
- What fields exist in each table
- Sample data from each table
- Which fields are NULL vs populated

**2. Test Message Generation**

Pick 3-5 mentors with different statuses and verify messages manually:

```typescript
// In your campaign script, add this BEFORE the main run:
if (process.argv.includes('--test')) {
  console.log('TEST MODE - Showing 5 sample messages\n');

  const testMentors = mentors.slice(0, 5);
  testMentors.forEach(mentor => {
    const { textMessage, emailCustomSection } = composeMessages(mentor);
    console.log(`\n${mentor.preferred_name} (${mentor.mn_id})`);
    console.log(`Status: ${mentor.status_category}`);
    console.log(`Amount raised: $${mentor.amount_raised || 0}`);
    console.log(`\nText:\n${textMessage}`);
    console.log(`\nEmail:\n${emailCustomSection}`);
    console.log('\n' + '='.repeat(80));
  });

  process.exit(0);
}
```

Run with: `npx tsx your-campaign.ts --test`

**3. Export Sample CSV**

Before full export, test with a small subset:
```bash
npm run comms:export -- --output="backend/features/comms/test" --limit=10
```

Manually review the 10 records for accuracy.

### Before Uploading to Givebutter

**1. Run Final Validation**
```bash
npx tsx backend/scripts/final-csv-check.ts
```

**2. Manual Spot Check**

Open the CSV and manually verify 5-10 random records:
- Names are correct
- Phone numbers are valid
- Emails are correct
- Custom message amounts/details are accurate

**3. Check Variable Replacement**

Search the CSV for these patterns - they should NOT exist:
- `{{` or `}}`
- `$undefined`
- `$null`
- `$NaN`

---

## 📋 Pre-Send Checklist

**STOP! Before you click "Send" on 600+ messages, answer these:**

- [ ] Did I verify data sources are correct?
- [ ] Did I test message generation with sample data?
- [ ] Did I run the verification script?
- [ ] Did I manually check 5-10 records in the CSV?
- [ ] Did I search for unreplaced variables ({{...}})?
- [ ] Did I verify monetary amounts are accurate?
- [ ] Did I test the full workflow end-to-end with 1-2 test contacts?

**If you answered NO to ANY of these, DO NOT SEND.**

---

## 🔧 Tools to Prevent Errors

### 1. Verification Script

Location: `backend/scripts/verify-campaign-data-sources.ts`

This script shows:
- Available fields in each table
- Sample records with actual data
- Which fields have NULL values
- Data type validation

### 2. Test Mode

All campaign scripts should support `--test` flag:
```bash
npx tsx backend/features/comms/messages/your-campaign/script.ts --test
```

This shows sample messages WITHOUT updating the database.

### 3. Data Source Documentation

Before creating a campaign, check: `backend/ARCHITECTURE.md`

It documents which table contains which data.

---

## 💡 Best Practices

### 1. **Always Run Sync Before Campaigns**

Ensure data is current before generating messages:

```typescript
// ✅ GOOD: Simple query - all data in one table!
const { data: mentors } = await supabase.from('mentors').select('*');

// All fields are available directly:
// - amount_raised
// - status_category
// - gb_contact_id
// - personal_email
// - etc.

// No joins or merging needed!
```

### 2. **Default to Safe Values**

```typescript
// ✅ GOOD: Provide fallbacks
const amountRaised = mentor.amount_raised || 0;
const remaining = Math.max(0, 75 - amountRaised);
const email = mentor.personal_email || 'your registered email';

// ❌ BAD: No fallback
const message = `You've raised $${mentor.amount_raised}`;  // Could be undefined!
```

### 3. **Log Data Issues**

```typescript
// Check for missing critical data
mentors.forEach(mentor => {
  if (mentor.status_category === 'needs_fundraising' && !mentor.amount_raised) {
    console.warn(`⚠️  ${mentor.mn_id}: Missing amount_raised for needs_fundraising status`);
  }
});
```

### 4. **Validate Before Update**

```typescript
// Before updating database
updates.forEach(update => {
  if (update.textMessage.includes('undefined') || update.textMessage.includes('null')) {
    throw new Error(`Invalid message for ${update.mn_id}: contains undefined/null`);
  }

  if (update.textMessage.includes('{{') || update.textMessage.includes('}}')) {
    throw new Error(`Invalid message for ${update.mn_id}: unreplaced variables`);
  }
});
```

---

## 🚨 Red Flags - Stop Immediately If You See:

1. **All mentors showing $0 raised** when you know some have fundraised
2. **Messages containing `undefined`, `null`, or `NaN`**
3. **Variables like `{{name}}` or `{{amount}}` in final messages**
4. **All messages are identical** when they should be personalized
5. **Validation script shows errors**
6. **Sample CSV doesn't match what you see in the database**

---

## Recovery Steps If You Send Incorrect Messages

1. **STOP** - Don't send more messages
2. **Acknowledge the error** publicly if needed
3. **Send correction** message to affected recipients
4. **Document** what went wrong
5. **Update this guide** with lessons learned
6. **Add automated checks** to prevent recurrence

---

## Questions?

If you're unsure about ANY aspect of data sourcing or message generation:

1. Check the database schema
2. Run verification scripts
3. Test with small samples
4. Ask for review before sending to 600+ people

**Remember: It's better to delay sending than to send incorrect information.**
