# 🏗️ Final Restructure Plan

**Single source of truth for database redesign**

---

## 🎯 Core Principles

1. **Simplicity** - Minimal tables, maximum clarity
2. **Intuitive naming** - Non-technical users can understand
3. **No data generation** - Never fabricate IDs, always preserve raw truth
4. **Context-aware merging** - Smart duplicate handling based on data quality
5. **Single source of truth** - One mentor record, traceable to raw sources

---

## 📊 Final Schema (3 Layers)

### **Layer 1: Raw Tables** (unchanged API dumps)

```sql
-- Mentor signups from Jotform
CREATE TABLE mn_signups_raw (
  submission_id TEXT PRIMARY KEY,
  mn_id TEXT,                   -- From Jotform (should always exist)
  prefix TEXT,                  -- Preferred name (if different from first)
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  uga_email TEXT,
  personal_email TEXT,
  phone TEXT,
  uga_class TEXT,
  shirt_size TEXT,
  gender TEXT,
  submitted_at TIMESTAMPTZ,
  raw_data JSONB
);

-- Fundraising setup completions
CREATE TABLE funds_setup_raw (
  submission_id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  submitted_at TIMESTAMPTZ,
  raw_data JSONB
);

-- Campaign members (fundraising status)
CREATE TABLE campaign_members_raw (
  member_id INTEGER PRIMARY KEY,
  campaign_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  amount_raised DECIMAL,
  created_at TIMESTAMPTZ
);

-- Complete contacts from Givebutter CSV export
CREATE TABLE full_contacts_raw (
  contact_id INTEGER PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  tags TEXT[],
  custom_fields JSONB,
  created_at TIMESTAMPTZ
);
```

### **Layer 2: Mentors Table** (single source of truth)

```sql
CREATE TABLE mentors (
  -- PRIMARY KEY
  mn_id TEXT PRIMARY KEY,           -- MN-#### (from Jotform)

  -- ALTERNATE KEYS (for matching/lookups)
  phone TEXT UNIQUE NOT NULL,       -- +1XXXXXXXXXX (E.164 format)
  gb_contact_id INTEGER UNIQUE,     -- Givebutter contact ID

  -- IDENTITY
  first_name TEXT NOT NULL,         -- Legal first name (always)
  middle_name TEXT,                 -- Middle name (optional)
  last_name TEXT NOT NULL,          -- Legal last name (always)
  preferred_name TEXT,              -- What they go by (if different from first)
  display_name TEXT NOT NULL,       -- preferred_name || first_name
  full_name TEXT NOT NULL,          -- Complete name for display

  -- CONTACT (personal email prioritized)
  personal_email TEXT,              -- PRIMARY (better delivery)
  uga_email TEXT,                   -- SECONDARY (UGA blocks some emails)

  -- DEMOGRAPHICS
  gender TEXT,
  shirt_size TEXT,
  uga_class TEXT,

  -- PREFERENCES (direct junction points → sync to Givebutter)
  shift_preference TEXT,            -- 🗓️ Option 1-4
  partner_preference INTEGER,       -- 👥 Ranking number
  custom_text_override TEXT,        -- 📱 Override auto-generated status text

  -- STATUS (computed from mn_tasks)
  status_category TEXT,             -- needs_setup | needs_page | needs_fundraising | complete
  status_text TEXT,                 -- Auto-generated or custom override

  -- RELATIONAL (links to raw sources for traceability)
  signup_submission_id TEXT REFERENCES mn_signups_raw(submission_id),
  setup_submission_id TEXT REFERENCES funds_setup_raw(submission_id),

  -- METADATA
  signup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentors_phone ON mentors(phone);
CREATE INDEX idx_mentors_gb_contact ON mentors(gb_contact_id);
CREATE INDEX idx_mentors_status ON mentors(status_category);
```

### **Layer 3: Extension Tables** (detailed tracking)

```sql
-- Task completion tracking (feeds mentors.status_category)
CREATE TABLE mn_tasks (
  mn_id TEXT PRIMARY KEY REFERENCES mentors(mn_id) ON DELETE CASCADE,

  -- SIGNUP PHASE
  signup_done BOOLEAN DEFAULT false,        -- 📝 Completed Jotform signup
  signup_at TIMESTAMPTZ,

  -- SETUP PHASE
  setup_done BOOLEAN DEFAULT false,         -- 🎨 Completed fundraising setup
  setup_at TIMESTAMPTZ,

  -- FUNDRAISING PHASE
  campaign_member BOOLEAN DEFAULT false,    -- Joined Givebutter campaign
  campaign_joined_at TIMESTAMPTZ,
  amount_raised DECIMAL DEFAULT 0,          -- Current total raised
  fundraised_done BOOLEAN DEFAULT false,    -- 📈 Raised $75+
  fundraised_at TIMESTAMPTZ,

  -- TRAINING PHASE (future)
  training_done BOOLEAN DEFAULT false,      -- 🏋️ Attended training
  training_at TIMESTAMPTZ,

  -- COMPUTED STATUS (auto-calculated)
  status_category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN fundraised_done AND training_done THEN 'complete'
      WHEN campaign_member AND NOT fundraised_done THEN 'needs_fundraising'
      WHEN setup_done AND NOT campaign_member THEN 'needs_page'
      WHEN signup_done AND NOT setup_done THEN 'needs_setup'
      ELSE 'unknown'
    END
  ) STORED,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON mn_tasks(status_category);

-- Error logging (conflicts, missing data, edge cases)
CREATE TABLE mn_errors (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- IDENTIFIERS (may be partial/null if can't identify mentor)
  mn_id TEXT,                       -- NULL if we can't match to mentor
  phone TEXT,                       -- Alternate identifier
  email TEXT,                       -- Another way to trace

  -- ERROR DETAILS
  error_type TEXT NOT NULL,         -- duplicate | missing_mn_id | name_mismatch | missing_email
  error_message TEXT NOT NULL,      -- Human-readable description
  severity TEXT DEFAULT 'warning',  -- warning | error | critical

  -- CONTEXT
  source_table TEXT,                -- Which raw table triggered this
  raw_data JSONB,                   -- Full raw record for debugging

  -- RESOLUTION
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_errors_unresolved ON mn_errors(resolved) WHERE NOT resolved;
CREATE INDEX idx_errors_type ON mn_errors(error_type);
```

---

## 🔄 ETL Logic (Corrected)

### **Key Principles:**

1. **Never generate mn_id** - If missing, log error and either:
   - Skip mentor (if critical)
   - Create with obviously wrong ID: `MN-ERROR-001`, `MN-ERROR-002` (incrementing)
   - Flag in mn_errors table

2. **Context-aware duplicate merging:**
   - Mass email contact (generic names) → Keep real contact, add UGA email from mass contact
   - Two real contacts with different name parts → Merge intelligently (preferred → prefix, first → firstName, etc.)
   - Ignore old tags (rely on new custom fields)

3. **Email prioritization:**
   - Personal email = PRIMARY (UGA emails have delivery issues)
   - UGA email = SECONDARY/Additional

4. **Phone normalization:**
   - Always E.164 format: `+1XXXXXXXXXX`
   - Required field (impossible to be missing per Jotform)

### **ETL Steps:**

```typescript
// STEP 1: Load raw data
const signups = await supabase.from('mn_signups_raw').select('*');
const setup = await supabase.from('funds_setup_raw').select('*');
const members = await supabase.from('campaign_members_raw').select('*');
const contacts = await supabase.from('full_contacts_raw').select('*');

// STEP 2: Validate mn_id presence
const errors = [];
signups.forEach(signup => {
  if (!signup.mn_id) {
    errors.push({
      phone: signup.phone,
      email: signup.uga_email || signup.personal_email,
      error_type: 'missing_mn_id',
      error_message: `Signup ${signup.submission_id} missing mn_id from Jotform`,
      severity: 'critical',
      source_table: 'mn_signups_raw',
      raw_data: signup
    });
  }
});

// STEP 3: Deduplicate by phone (keep most recent signup)
const phoneMap = new Map();
signups.forEach(signup => {
  if (!signup.mn_id || !signup.phone) return; // Skip invalid

  const normPhone = normalizePhone(signup.phone);
  const existing = phoneMap.get(normPhone);

  if (!existing || signup.submitted_at > existing.submitted_at) {
    phoneMap.set(normPhone, signup);
  } else {
    // Log duplicate
    errors.push({
      mn_id: signup.mn_id,
      phone: normPhone,
      error_type: 'duplicate',
      error_message: `Duplicate signup: ${signup.mn_id} vs ${existing.mn_id}`,
      severity: 'warning',
      raw_data: { newer: signup, older: existing }
    });
  }
});

// STEP 4: Match to Givebutter contacts (smart matching)
const uniqueSignups = Array.from(phoneMap.values());
uniqueSignups.forEach(signup => {
  const normPhone = normalizePhone(signup.phone);

  // Try phone match first
  let gbContact = contacts.find(c => normalizePhone(c.primary_phone) === normPhone);

  // Try email match if no phone match
  if (!gbContact) {
    const emails = [signup.personal_email, signup.uga_email].filter(Boolean);
    gbContact = contacts.find(c =>
      emails.some(e => normalizeEmail(e) === normalizeEmail(c.primary_email))
    );
  }

  // If multiple matches, log conflict
  if (contacts.filter(c => /* matches */)) {
    errors.push({ /* conflict details */ });
  }

  // Build mentor record
  const mentor = {
    mn_id: signup.mn_id,
    phone: normPhone,
    gb_contact_id: gbContact?.contact_id,

    // Names
    first_name: signup.first_name,
    middle_name: signup.middle_name,
    last_name: signup.last_name,
    preferred_name: signup.prefix,  // Jotform prefix = preferred name
    display_name: signup.prefix || signup.first_name,
    full_name: buildFullName(signup),

    // Emails (prioritize personal)
    personal_email: signup.personal_email,
    uga_email: signup.uga_email,

    // Demographics
    gender: signup.gender,
    shirt_size: signup.shirt_size,
    uga_class: signup.uga_class,

    // Status (computed from tasks)
    status_category: /* from mn_tasks */,
    status_text: getStatusText(/* ... */),

    // Relational
    signup_submission_id: signup.submission_id,
    signup_at: signup.submitted_at
  };

  // Match to setup
  const setupMatch = setup.find(s =>
    normalizePhone(s.phone) === normPhone ||
    normalizeEmail(s.email) === normalizeEmail(signup.uga_email)
  );
  if (setupMatch) {
    mentor.setup_submission_id = setupMatch.submission_id;
  }

  // Build tasks
  const memberMatch = members.find(/* match by phone/email */);
  const tasks = {
    mn_id: mentor.mn_id,
    signup_done: true,
    signup_at: signup.submitted_at,
    setup_done: !!setupMatch,
    setup_at: setupMatch?.submitted_at,
    campaign_member: !!memberMatch,
    amount_raised: memberMatch?.amount_raised || 0,
    fundraised_done: (memberMatch?.amount_raised || 0) >= 75
  };

  return { mentor, tasks };
});

// STEP 5: Insert to database
await supabase.from('mentors').upsert(mentors);
await supabase.from('mn_tasks').upsert(tasks);
await supabase.from('mn_errors').insert(errors);
```

---

## 🔧 Duplicate Merge Strategy

### **Scenario A: Mass Email Contact + Real Contact**

**Example:**
- Contact 1: `F.25.12345 L.25.12345` | `student@uga.edu` | No phone | Tags: `UGA.S.1`
- Contact 2: `John Smith` | `john@gmail.com` | `+18045551234` | Tags: `Mentors 2024`

**Action:**
1. Keep Contact 2 (real person)
2. Add `student@uga.edu` to Contact 2 "Additional Emails"
3. Archive/delete Contact 1 via Givebutter API
4. Update Contact 2 tags: `Mentors 2025`

### **Scenario B: Two Real Contacts with Different Name Components**

**Example:**
- Contact 1: Prefix: `Tim` | First: `John` | Last: `Smith` | Email: `john@gmail.com`
- Contact 2: First: `Timothy` | Middle: `Paul` | Last: `Smith` | Email: `tim.smith@uga.edu`

**Action:**
1. Merge into single contact:
   - Prefix: `Tim` (preferred name from Contact 1)
   - First: `Timothy` (legal first name from Contact 2)
   - Middle: `Paul` (from Contact 2)
   - Last: `Smith`
   - Primary Email: `john@gmail.com`
   - Additional Emails: `tim.smith@uga.edu`
   - Phone: (whichever is present)
2. Archive less complete contact
3. Update merged contact tags: `Mentors 2025`

### **Implementation:**

```bash
# New script: lib/givebutter/merge-duplicates.ts
npm run admin:gb:merge-duplicates        # Preview merge plan
npm run admin:gb:merge-duplicates apply  # Execute merges
```

**Result:** Far fewer than 72 conflicts (most resolved via smart merging)

---

## 📤 CSV Export to Givebutter

### **Column Mapping:**

```typescript
const csvRow = {
  // IDs
  'Givebutter Contact ID': mentor.gb_contact_id || '',
  'Contact External ID': mentor.mn_id,  // MN-####

  // Names
  'Prefix': mentor.preferred_name || '',
  'First Name': mentor.first_name,
  'Middle Name': mentor.middle_name || '',
  'Last Name': mentor.last_name,

  // Contact
  'Primary Email': mentor.personal_email || mentor.uga_email,
  'Additional Emails': mentor.uga_email && mentor.personal_email ? mentor.uga_email : '',
  'Primary Phone': mentor.phone,

  // Engagement (always TRUE for mentors)
  'Engage Email Subscribed': 'TRUE',
  'Engage SMS Subscribed': 'TRUE',
  'Engage Mail Subscribed': 'TRUE',

  // Tags (ONLY current year)
  'Tags': 'Mentors 2025',

  // Custom Fields (emoji fields from Givebutter)
  '📝 Sign Up Complete': tasks.signup_done ? 'Yes' : 'No',
  '🎨 Givebutter Page Setup': tasks.setup_done ? 'Yes' : 'No',
  '🗓️ Shift Preference': mentor.shift_preference || '',
  '👥 Partner Preference': mentor.partner_preference || '',
  '🏋️ Mentor Training Complete': tasks.training_done ? 'Yes' : 'No',
  '📈 Fully Fundraised?': tasks.fundraised_done ? 'Yes' : 'No',
  '📱 Custom Text Message': mentor.custom_text_override || mentor.status_text
};
```

### **What's REMOVED (old legacy fields):**
- ❌ Pre-Fill URL
- ❌ BGC Link
- ❌ Sign Up Link
- ❌ BGC Complete?
- ❌ Sign Up Complete?
- ❌ Mighty Cause?
- ❌ $ Raised
- ❌ Text Instructions
- ❌ Shift
- ❌ $ Status

---

## 🎨 Naming Standards

### **Tables:**
```
mn_*           Mentor-specific (mn_signups_raw, mn_tasks, mn_errors)
funds_*        Fundraising-specific (funds_setup_raw)
campaign_*     Campaign-specific (campaign_members_raw)
full_*         Complete/comprehensive (full_contacts_raw)
*_raw          Layer 1 (raw API dumps)
```

### **Fields:**
```
*_id           IDs (mn_id, contact_id, submission_id, member_id)
*_done         Booleans (signup_done, setup_done, training_done, fundraised_done)
*_at           Timestamps (signup_at, setup_at, created_at, updated_at)
gb_*           Givebutter-specific prefix (gb_contact_id)
```

### **Database = snake_case, Code = camelCase:**
```typescript
// Database
SELECT first_name, signup_done FROM mentors;

// TypeScript
interface Mentor {
  firstName: string;
  signupDone: boolean;
}
```

---

## ✅ Key Decisions Summary

| Question | Decision |
|----------|----------|
| mn_id generation? | ❌ NEVER generate. Log error if missing. Use `MN-ERROR-###` as PK placeholder only if absolutely necessary. |
| Primary key? | ✅ `mn_id` (MN-####) with phone as UNIQUE constraint |
| Duplicate merge? | ✅ Context-aware: mass email → delete, real contacts → merge intelligently |
| Email priority? | ✅ Personal email PRIMARY, UGA email SECONDARY |
| Missing email? | ✅ Impossible (required field), but string together from sources if needed |
| Naming? | ✅ snake_case for SQL, descriptive & concise |
| Error table? | ✅ KEEP (simplified mn_errors for logging conflicts) |
| Layer 3 tables? | ✅ mn_tasks + mn_errors ONLY (remove mentor_texts, sync logs) |

---

## 🚀 Implementation Checklist

- [ ] **Phase 1:** Create migration `00003_final_schema.sql`
- [ ] **Phase 2:** Update sync scripts for new raw table names
- [ ] **Phase 3:** Rewrite ETL with corrected logic
- [ ] **Phase 4:** Implement `merge-duplicates.ts` script
- [ ] **Phase 5:** Rewrite CSV export for new Givebutter fields
- [ ] **Phase 6:** Update validation script
- [ ] **Phase 7:** Test full workflow
- [ ] **Phase 8:** Update documentation (consolidate/remove old docs)

---

**This is the FINAL plan. No more META docs. Ready to implement?**
