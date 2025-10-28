# Backend Refactoring Plan
**Date**: 2025-01-27
**Status**: ✅ Root cause identified, immediate fix in progress
**Reference**: See `/sync.png` for architecture diagram

---

## 🔴 Critical Issue (RESOLVED)

### CSV Upload Failures - 29 errors
**Symptom**: "Contact with External ID [MNXXXX] already exists"

**Root Cause** (Confirmed via `debug-csv-failures.ts`):
- ETL matched mentors to **WRONG** Givebutter contacts (junk contacts with no External ID)
- Our CSV tries to SET External ID on these wrong contacts
- But the REAL contacts with those MN IDs exist elsewhere in Givebutter
- Givebutter rejects: "that External ID is already taken"

**Fix Applied**:
- ✅ Fixed contact matching logic in ETL (`process.ts:530`)
  - **Now**: Check External ID FIRST (highest priority)
  - **Then**: Fall back to phone/email only if no External ID match
  - **Error**: If phone/email match has different External ID
- ✅ Re-synced all 976 contacts from Givebutter (fresh External ID data)
- ⏳ **Next**: Download fresh Givebutter export → Upload to `raw_gb_full_contacts` → Re-run ETL

**DEEPER ROOT CAUSE** (2025-01-27 evening):
The real issue is **stale local data** + **CSV feedback loop not completed**:
1. We uploaded mentor CSV to Givebutter → Set External IDs on 962 contacts
2. Our `raw_gb_full_contacts` table still has OLD data (before the upload)
3. ETL can't find contacts WITH External IDs because local data is stale
4. Falls back to phone/email matching → Finds wrong/junk contacts
5. Tries to set External ID on wrong contact → Givebutter rejects (already exists elsewhere)

**Complete Fix**:
1. ✅ Fix ETL matching logic (External ID priority)
2. ⏳ Download FRESH Givebutter export (with updated External IDs)
3. ⏳ Upload to `raw_gb_full_contacts` (complete CSV feedback loop)
4. ⏳ Re-run ETL (will now find correct contacts)
5. ⏳ Archive duplicate contacts via API

---

## 🔄 Contact Selection & Duplicate Handling

### **THE THREE DUPLICATE SCENARIOS**

When a mentor signs up, they may have multiple contacts in Givebutter:

1. **Campaign Member Duplicate**
   - Created when mentor creates fundraising page
   - May use different name (nickname, preferred name)
   - Has Campaign Member ID
   - Often has incomplete contact info

2. **Prior Year Contact**
   - From previous year's campaign
   - Has outdated information
   - May have old External ID (if we used them before)
   - Tagged with old year (e.g., "Mentors 2024")

3. **Mass Email Contact**
   - Created from mass email campaigns to @uga.edu addresses
   - Has ONLY UGA email, no personal email
   - Has minimal information (often just name + email)
   - No tags or very generic tags

### **CONTACT SELECTION PRIORITY (Decision Tree)**

When multiple contacts exist for one mentor, select winner using this hierarchy:

```
1️⃣ MOST RECENT JOTFORM SIGNUP = SOURCE OF TRUTH
   ├─→ Deduplicate signups by phone (keep most recent)
   ├─→ That signup's MN ID is the "correct" External ID
   └─→ Use that MN ID to find/create the correct contact

2️⃣ SEARCH FOR CONTACT WITH EXTERNAL ID
   ├─→ Query raw_gb_full_contacts WHERE external_id = MN_ID
   ├─→ If found: This is the winner! (already correctly linked)
   └─→ If not found: Continue to step 3

3️⃣ SEARCH BY PHONE/EMAIL (Find best candidate)
   ├─→ Find all contacts matching phone OR email
   ├─→ If multiple found, pick winner:
   │   ├─→ Priority 1: Contact WITH "Dropped 25" tag (if exists)
   │   ├─→ Priority 2: Contact WITHOUT "Dropped 25" but with campaign tags
   │   ├─→ Priority 3: Most recent last_modified_utc
   │   └─→ Priority 4: Most complete data (has both emails, phone, address)
   └─→ Winner gets the External ID set

4️⃣ ARCHIVE ALL OTHER DUPLICATES
   ├─→ Collect all non-winner contact IDs
   ├─→ Archive via Givebutter API: POST /contacts/{id}/archive
   └─→ Log archived contact IDs to sync_log/mn_changes

5️⃣ SPECIAL CASE: Mass Email Contacts (@uga.edu only)
   ├─→ If contact has ONLY @uga.edu email and no personal email
   ├─→ AND has minimal info (no phone, no address)
   ├─→ AND is NOT a campaign member
   ├─→ → Always archive (never select as winner)
```

### **IMPLEMENTATION: Contact Selector Module**

```typescript
// backend/core/etl/steps/04-select-winner-contact.ts

interface ContactCandidate {
  contact_id: number;
  external_id: string | null;
  first_name: string;
  last_name: string;
  primary_phone: string | null;
  primary_email: string | null;
  additional_emails: string | null;
  tags: string[] | null;
  last_modified_utc: string;
  campaign_member_id: number | null;
  completeness_score: number; // 0-100
}

export async function selectWinnerContact(
  mnId: string,
  phone: string,
  personalEmail: string,
  ugaEmail: string,
  rawContacts: RawContact[]
): Promise<{ winner: ContactCandidate; losers: ContactCandidate[] }> {

  // STEP 1: Check if any contact already has this External ID
  const contactWithExternalId = rawContacts.find(c => c.external_id === mnId);
  if (contactWithExternalId) {
    const losers = rawContacts.filter(c =>
      c.contact_id !== contactWithExternalId.contact_id &&
      (c.primary_phone === phone ||
       c.primary_email === personalEmail ||
       c.additional_emails?.includes(ugaEmail))
    );
    return { winner: contactWithExternalId, losers };
  }

  // STEP 2: Find all contacts matching phone/email
  const candidates = rawContacts.filter(c =>
    c.primary_phone === phone ||
    c.primary_email === personalEmail ||
    c.primary_email === ugaEmail ||
    c.additional_emails?.includes(personalEmail) ||
    c.additional_emails?.includes(ugaEmail)
  );

  if (candidates.length === 0) {
    // No existing contact - will create new one
    return { winner: null, losers: [] };
  }

  // STEP 3: Filter out mass email contacts (never winners)
  const viableCandidates = candidates.filter(c =>
    !isMassEmailContact(c)
  );

  if (viableCandidates.length === 0) {
    // All candidates are mass email contacts - create new
    return { winner: null, losers: candidates };
  }

  // STEP 4: Score and rank candidates
  const scored = viableCandidates.map(c => ({
    ...c,
    score: calculateContactScore(c),
  }));

  scored.sort((a, b) => b.score - a.score);

  const winner = scored[0];
  const losers = candidates.filter(c => c.contact_id !== winner.contact_id);

  return { winner, losers };
}

function isMassEmailContact(contact: ContactCandidate): boolean {
  const hasOnlyUgaEmail =
    contact.primary_email?.endsWith('@uga.edu') &&
    !contact.additional_emails;

  const hasMinimalInfo =
    !contact.primary_phone &&
    !contact.address_line_1 &&
    !contact.campaign_member_id;

  return hasOnlyUgaEmail && hasMinimalInfo;
}

function calculateContactScore(contact: ContactCandidate): number {
  let score = 0;

  // Priority 1: Dropped status (highest weight)
  if (contact.tags?.includes('Dropped 25')) {
    score += 1000; // Dropped contacts are always preferred (already processed)
  }

  // Priority 2: Has campaign tags
  const hasCampaignTag = contact.tags?.some(t =>
    t.includes('Mentors 2025') || t.includes('SWAB')
  );
  if (hasCampaignTag) score += 500;

  // Priority 3: Most recent
  const daysSinceUpdate =
    (Date.now() - new Date(contact.last_modified_utc).getTime()) /
    (1000 * 60 * 60 * 24);
  score += Math.max(0, 100 - daysSinceUpdate); // Newer = higher

  // Priority 4: Data completeness
  if (contact.primary_phone) score += 50;
  if (contact.primary_email) score += 30;
  if (contact.additional_emails) score += 20;
  if (contact.address_line_1) score += 20;
  if (contact.campaign_member_id) score += 30;

  return score;
}
```

---

## 🔁 CSV Feedback Loop (Bidirectional Sync)

### **TERMINOLOGY (CRITICAL!)**

**Givebutter Operations:**
- **EXPORT**: Download CSV from Givebutter (Givebutter → CSV File)
  - Example: Download all 40k+ contacts from Givebutter
  - Used to get current state of ALL contacts
- **IMPORT**: Upload CSV to Givebutter (CSV File → Givebutter)
  - Example: Upload 962 mentor updates to Givebutter
  - Used to update contacts in Givebutter

**Our System Operations:**
- **UPLOAD**: Upload CSV to our database (CSV File → raw_gb_full_contacts)
  - Example: Upload Givebutter's export to populate raw_gb_full_contacts
  - Used to refresh our local data
- **DOWNLOAD**: Generate CSV from our database (mn_gb_import → CSV File)
  - Example: Generate mentor updates from mn_gb_import
  - Used to prepare data for Givebutter import

**Complete Cycle:**
```
1. EXPORT from Givebutter (40k+ contacts) → CSV file
2. UPLOAD to our system → raw_gb_full_contacts table
3. Run ETL → Process raw tables → mentors → mn_gb_import
4. DOWNLOAD from our system → mn_gb_import → CSV file
5. IMPORT to Givebutter → Update contacts
```

### **THE COMPLETE CYCLE**

The `mn_gb_import` table serves as the **bidirectional sync hub**:

```
┌─────────────────────────────────────────────────────────────┐
│  PUSH TO GIVEBUTTER (Our Changes → GB)                       │
├─────────────────────────────────────────────────────────────┤
│  1. ETL processes raw tables → mentors                       │
│  2. Populate mn_gb_import from mentors                       │
│  3. Export CSV from mn_gb_import                             │
│  4. Upload CSV to Givebutter                                 │
│     ├─→ Sets External IDs on contacts                        │
│     ├─→ Updates names, emails, phones                        │
│     ├─→ Updates custom fields (training, fundraising)        │
│     └─→ Creates NEW contacts (if no match found)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PULL FROM GIVEBUTTER (GB Changes → Our System)              │
├─────────────────────────────────────────────────────────────┤
│  5. Download FRESH Givebutter export (all 40k+ contacts)     │
│  6. Upload CSV to raw_gb_full_contacts (NO FILTERING!)       │
│     ├─→ Stores ALL contacts with updated External IDs        │
│     ├─→ Includes manual edits made in GB UI                  │
│     └─→ Includes newly created contacts                      │
│                                                              │
│  7. Sync specific contacts via API (by contact ID)           │
│     ├─→ For the ~976 mentors we care about                   │
│     ├─→ Gets latest custom fields, tags, amounts             │
│     └─→ Faster than full export (minutes vs hours)          │
│                                                              │
│  8. Update mn_gb_import with changes from GB                 │
│     ├─→ If amount_raised changed in GB → Update import table │
│     ├─→ If tags changed in GB → Update import table          │
│     └─→ If contact info edited in UI → Update import table   │
│                                                              │
│  9. Update mentors table from mn_gb_import                   │
│     ├─→ Sync fundraising amounts                             │
│     ├─→ Sync dropped status (Dropped 25 tag)                 │
│     └─→ Sync manual contact info edits                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Loop back to step 1)
```

### **WHY mn_gb_import IS CRITICAL**

**Problem it solves**: Givebutter API has limitations
- ✅ Can READ full contact data via API
- ❌ Cannot WRITE custom fields via API (must use CSV import)
- ❌ Cannot bulk update 962 contacts efficiently via API

**Solution**: Use CSV for PUSH, API for PULL
- **PUSH (CSV Export)**: Update 962 contacts with custom fields
- **PULL (API Sync)**: Get latest data from GB (fundraising, manual edits)
- **mn_gb_import**: Merges both directions to prevent data loss

**Example Scenario**:
1. We set "Training Signed Up = Yes" in our system
2. Export CSV → Upload to GB → Training field updated
3. Admin manually edits phone number in GB UI
4. API sync pulls phone change → Updates mn_gb_import
5. Next CSV export includes BOTH training field AND new phone
6. ✅ No data lost, everything in sync

---

## 🗑️ Duplicate Archival System

### **Why Archive Instead of Delete**

Givebutter doesn't allow permanent deletion (for data safety), but provides archival:
- Archived contacts don't appear in searches
- Don't appear in contact exports
- Don't interfere with External ID uniqueness
- Can be restored if needed

### **When to Archive**

Archive contacts during the ETL process after winner selection:

1. **After Contact Selection** (Step 4 in ETL)
   - Collected all "loser" contact IDs
   - Archive them immediately to prevent future confusion

2. **Mass Email Cleanup**
   - After identifying mass email contacts (@uga.edu only, no personal email)
   - Archive ALL of them (they're never winners)

3. **Prior Year Contacts**
   - If mentor has contact from 2024 AND new 2025 contact
   - Archive the 2024 one after transferring External ID to 2025 contact

### **Implementation: Archive Service**

```typescript
// backend/core/services/contact-archiver.ts

import { GivebutterClient } from '@/backend/lib/infrastructure/clients/givebutter-client';
import { Logger } from '@/backend/lib/utils/logger';

export class ContactArchiver {
  private gbClient: GivebutterClient;
  private logger: Logger;

  constructor(gbClient: GivebutterClient, logger: Logger) {
    this.gbClient = gbClient;
    this.logger = logger;
  }

  async archiveDuplicates(
    mnId: string,
    winnerContactId: number,
    loserContactIds: number[]
  ): Promise<{ archived: number[]; failed: number[] }> {
    const archived: number[] = [];
    const failed: number[] = [];

    this.logger.info(`Archiving ${loserContactIds.length} duplicate contacts for ${mnId}`);

    for (const contactId of loserContactIds) {
      try {
        // Givebutter API: POST /contacts/{id}/archive
        await this.gbClient.archiveContact(contactId);
        archived.push(contactId);
        this.logger.info(`✅ Archived contact ${contactId} (duplicate of ${winnerContactId})`);
      } catch (error: any) {
        failed.push(contactId);
        this.logger.error(`❌ Failed to archive contact ${contactId}:`, error.message);
      }

      // Rate limiting: Wait 100ms between API calls
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Log to mn_changes table
    if (archived.length > 0) {
      await this.logArchivedContacts(mnId, winnerContactId, archived);
    }

    return { archived, failed };
  }

  private async logArchivedContacts(
    mnId: string,
    winnerContactId: number,
    archivedContactIds: number[]
  ) {
    const { error } = await supabase
      .from('mn_changes')
      .insert({
        mn_id: mnId,
        change_type: 'duplicates_archived',
        old_value: archivedContactIds.join(','),
        new_value: String(winnerContactId),
        source_table: 'raw_gb_full_contacts',
        notes: `Archived ${archivedContactIds.length} duplicate contacts, kept ${winnerContactId}`,
      });

    if (error) {
      this.logger.error('Failed to log archived contacts:', error);
    }
  }
}
```

### **Integration with ETL**

```typescript
// backend/core/etl/steps/05-archive-duplicates.ts

export async function archiveDuplicatesStep(
  context: ETLContext
): Promise<void> {
  console.log('🗑️  Step 5: Archiving duplicate contacts...\n');

  const archiver = new ContactArchiver(context.gbClient, context.logger);
  let totalArchived = 0;
  let totalFailed = 0;

  for (const [mnId, duplicates] of context.duplicatesToArchive.entries()) {
    const { archived, failed } = await archiver.archiveDuplicates(
      mnId,
      duplicates.winner,
      duplicates.losers
    );

    totalArchived += archived.length;
    totalFailed += failed.length;
  }

  console.log(`\n✅ Archived ${totalArchived} duplicate contacts`);
  if (totalFailed > 0) {
    console.log(`⚠️  Failed to archive ${totalFailed} contacts (check logs)`);
  }
}
```

### **Givebutter Client Addition**

```typescript
// backend/lib/infrastructure/clients/givebutter-client.ts

export class GivebutterClient {
  // ... existing methods

  /**
   * Archive a contact (soft delete - can be restored)
   * POST /contacts/{id}/archive
   */
  async archiveContact(contactId: number): Promise<void> {
    const response = await this.request('POST', `/contacts/${contactId}/archive`);
    if (!response.ok) {
      throw new Error(`Failed to archive contact ${contactId}: ${response.statusText}`);
    }
  }

  /**
   * Restore an archived contact
   * POST /contacts/{id}/restore
   */
  async restoreContact(contactId: number): Promise<void> {
    const response = await this.request('POST', `/contacts/${contactId}/restore`);
    if (!response.ok) {
      throw new Error(`Failed to restore contact ${contactId}: ${response.statusText}`);
    }
  }
}
```

---

## 🧩 Separation of Concerns: Core vs Features

### **The Problem: Mixed Responsibilities**

Currently `backend/features/comms/` has:
- ❌ CSV export logic (`tools/export.ts`) - This is CORE sync, not a feature
- ❌ Sync-like logic mixed with message generation
- ❌ Duplicate logic conflicting with core sync

### **The Solution: Clear Boundaries**

```
┌─────────────────────────────────────────────────────────────┐
│  CORE: backend/core/sync/ + etl/                             │
│  Responsibility: Bidirectional sync with external systems    │
├─────────────────────────────────────────────────────────────┤
│  ✅ Fetch from Jotform/Givebutter APIs                       │
│  ✅ Populate raw tables                                       │
│  ✅ Run ETL (raw → mentors)                                   │
│  ✅ Populate mn_gb_import with FULL contact data              │
│  ✅ Export mn_gb_import to CSV                                │
│  ✅ Upload CSV to Givebutter                                  │
│  ✅ Download Givebutter export                                │
│  ✅ Upload export to raw_gb_full_contacts                     │
│  ✅ Contact selection, deduplication, archival                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  FEATURE: backend/features/comms/                            │
│  Responsibility: Generate campaign-specific messages         │
├─────────────────────────────────────────────────────────────┤
│  ✅ READ from mentors table (current state)                  │
│  ✅ Filter by criteria (training_signup = false)             │
│  ✅ Generate personalized text messages                       │
│  ✅ Generate personalized email sections                      │
│  ✅ UPSERT to mn_gb_import (ONLY message fields):            │
│     - 📱Custom Text Message 1️⃣                               │
│     - 📧 Custom Email Message 1️⃣                             │
│  ❌ NO CSV export                                             │
│  ❌ NO contact matching/selection                             │
│  ❌ NO sync logic                                             │
└─────────────────────────────────────────────────────────────┘
```

### **What Needs to Move**

**Move to Core:**
- `backend/features/comms/tools/export.ts` → `backend/core/sync/export-contacts.ts`
- `backend/features/comms/tools/validate.ts` → `backend/core/sync/validate-csv.ts`

**Keep in Comms (but simplify):**
- `backend/features/comms/gb_imports/*/` - Campaign scripts (read mentors + generate messages)
- `backend/features/comms/templates/` - Message templates

**Delete from Comms:**
- Any duplicate ETL-like logic
- Any contact matching logic
- Any sync configuration

### **Updated Comms Workflow**

```typescript
// backend/features/comms/gb_imports/training_reminder-10.27/training_reminder.ts

import { createClient } from '@supabase/supabase-js';

async function generateTrainingReminderMessages() {
  const supabase = createClient(/* ... */);

  // 1. READ from mentors (source of truth)
  const { data: mentors } = await supabase
    .from('mentors')
    .select('*')
    .eq('training_signup', false);

  // 2. Generate personalized messages
  const updates = mentors.map(mentor => {
    const textMessage = generateTextMessage(mentor);
    const emailSection = generateEmailSection(mentor);

    return {
      mn_id: mentor.mn_id,
      '📱Custom Text Message 1️⃣': textMessage,
      '📧 Custom Email Message 1️⃣': emailSection,
    };
  });

  // 3. UPSERT to mn_gb_import (ONLY message fields)
  for (const update of updates) {
    await supabase
      .from('mn_gb_import')
      .update({
        '📱Custom Text Message 1️⃣': update['📱Custom Text Message 1️⃣'],
        '📧 Custom Email Message 1️⃣': update['📧 Custom Email Message 1️⃣'],
      })
      .eq('Contact External ID', update.mn_id);
  }

  console.log(`✅ Updated ${updates.length} mentors with campaign messages`);
}

// 4. Core sync handles the rest:
//    - npm run sync:export → Export CSV
//    - Upload to Givebutter
//    - Download fresh export
//    - npm run sync:upload-csv → Update raw_gb_full_contacts
```

### **Benefits of This Separation**

1. **No Duplicate Logic**: Core sync is the ONLY place with contact matching/selection
2. **Comms is Portable**: Can be reused for different campaigns without touching sync
3. **Clear Ownership**: Core team owns sync, comms team owns message generation
4. **Easier Testing**: Can test message generation independently of sync
5. **No Conflicts**: Comms can't accidentally break sync by modifying wrong fields

---

## 📐 Target Architecture (from diagram)

### **Data Flow Overview**

```
┌─────────────────────────────────────────────────────────────┐
│  RAW TABLES (Year-Configurable via sync_configs)            │
│  ↓ These are always updated with latest API data            │
├─────────────────────────────────────────────────────────────┤
│  • raw_mn_training_signup  ← Jotform training form          │
│  • raw_mn_setup           ← Jotform setup form              │
│  • raw_mn_signups         ← Jotform main signup (+ BGC)     │
│  • raw_gb_members         ← Givebutter campaign members     │
│  • raw_gb_full_contacts   ← Givebutter contacts (uploaded)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      ETL PROCESSING
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  DATA ROUTING (Confirmed Correct ✅)                         │
├─────────────────────────────────────────────────────────────┤
│  raw_mn_signups → mentors                                    │
│    ├─→ mn_id, phone, personal_email, uga_email              │
│    ├─→ first_name, middle_name, last_name, preferred_name   │
│    ├─→ gender, shirt_size, uga_class                        │
│    └─→ signup_submission_id, signup_at                      │
│                                                              │
│  raw_mn_funds_setup → mentors                                │
│    ├─→ setup_submission_id (matched by phone/email)         │
│    └─→ Used for status: needs_page vs needs_setup           │
│                                                              │
│  raw_mn_training_signup → mentors                            │
│    ├─→ training_signup_done (boolean)                       │
│    ├─→ training_signup_at (timestamp)                       │
│    └─→ training_signup_submission_id                        │
│                                                              │
│  raw_gb_campaign_members → mentors                           │
│    ├─→ campaign_member (boolean - IS in campaign)           │
│    ├─→ gb_member_id (Givebutter member ID)                  │
│    ├─→ amount_raised (fundraising total)                    │
│    ├─→ fundraising_page_url                                 │
│    └─→ Used for status: has page = campaign_member          │
│                                                              │
│  raw_gb_full_contacts → mentors                              │
│    ├─→ gb_contact_id (via External ID matching)             │
│    ├─→ dropped (from "Dropped 25" tag)                      │
│    └─→ Contact selection with conflict detection            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  MAIN TABLE: mentors                                         │
│  ↓ ETL compiles all raw data using logical rules            │
├─────────────────────────────────────────────────────────────┤
│  Status Calculation (✅ Confirmed):                          │
│    if (amount_raised >= 75)         → 'complete'            │
│    else if (campaign_member)        → 'needs_fundraising'   │
│    else if (setup_submission_id)    → 'needs_page'          │
│    else                             → 'needs_setup'         │
│                                                              │
│  Core Fields:                                                │
│  • phone, personal_email, uga_email                          │
│  • gb_contact_id, gb_member_id                               │
│  • preferred_name (pref), first, middle, last, full_name     │
│  • gender, UGA_class, shirt_size                             │
│  • shift_preference, partner_preference                      │
│  • campaign_member, amount_raised                            │
│  • (don't need fundraising_halted or timestamp)              │
│                                                              │
│  Training Fields:                                            │
│  • training_signup + training_signup_at                      │
│  • attended_training + training_at                           │
│                                                              │
│  Tracking Fields:                                            │
│  • signup, setup, training_signup (Jotform IDs)              │
│  • created_at, updated_at                                    │
│  • notes, tags                                               │
│  • dropped (boolean - "Dropped 25" status)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SUPPORT TABLES                                              │
├─────────────────────────────────────────────────────────────┤
│  • mn_changes      → Track dropped mentors & field changes   │
│  • mn_gb_import    → Prepare GB upload (API limits!)         │
│  • sync_errors     → Collect, note, track, resolve errors    │
│  • sync_log        → Track syncs (system-level)              │
│  • sync_configs    → Configure form IDs, API keys, etc.      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Updates

### **1. Rename Table**
```sql
-- mn_errors → sync_errors (more descriptive)
ALTER TABLE mn_errors RENAME TO sync_errors;
```

### **2. Create `mn_changes` Table**
Track what changed between syncs + dropped mentor detection
```sql
CREATE TABLE mn_changes (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  change_type TEXT NOT NULL, -- 'dropped', 'field_change', 'status_change', 'new_mentor'
  field_name TEXT,            -- Which field changed (null for 'dropped' or 'new_mentor')
  old_value TEXT,             -- Previous value
  new_value TEXT,             -- New value
  source_table TEXT,          -- Which raw table triggered this change
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  synced_to_gb BOOLEAN DEFAULT FALSE,  -- Has this been exported to GB?
  resolved BOOLEAN DEFAULT FALSE,      -- Has this been addressed?
  notes TEXT,

  CHECK (change_type IN ('dropped', 'field_change', 'status_change', 'new_mentor'))
);

CREATE INDEX idx_mn_changes_mn_id ON mn_changes(mn_id);
CREATE INDEX idx_mn_changes_type ON mn_changes(change_type);
CREATE INDEX idx_mn_changes_unresolved ON mn_changes(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_mn_changes_unsycned ON mn_changes(synced_to_gb) WHERE synced_to_gb = FALSE;
```

### **3. Create `sync_conflicts` Table** (NEW!)
Track data conflicts requiring human decisions
```sql
CREATE TABLE sync_conflicts (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  conflict_type TEXT NOT NULL, -- 'contact_selection', 'phone_mismatch', 'email_mismatch', 'data_staleness', 'external_id_collision'

  -- The two options to choose from
  option_a JSONB NOT NULL,      -- { value, source, metadata: { last_modified, completeness_score, tags, etc } }
  option_b JSONB NOT NULL,      -- Same structure

  -- Context for decision-making
  context JSONB,                -- Additional info: related contacts, history, scoring breakdown
  recommended_option TEXT,      -- 'a' | 'b' | null (system recommendation)
  recommendation_reason TEXT,   -- Why system recommends this option

  -- Resolution
  status TEXT DEFAULT 'pending', -- 'pending' | 'resolved' | 'skipped'
  user_decision TEXT,            -- 'a' | 'b' | 'custom'
  custom_value TEXT,             -- If user chose neither option
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,              -- User email or system identifier

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  sync_log_id INTEGER REFERENCES sync_log(id),
  source_table TEXT,             -- Which raw table triggered this
  severity TEXT DEFAULT 'medium', -- 'high' | 'medium' | 'low'

  CHECK (conflict_type IN ('contact_selection', 'phone_mismatch', 'email_mismatch',
                          'data_staleness', 'external_id_collision', 'fundraising_mismatch')),
  CHECK (status IN ('pending', 'resolved', 'skipped')),
  CHECK (user_decision IN ('a', 'b', 'custom', NULL)),
  CHECK (severity IN ('high', 'medium', 'low'))
);

CREATE INDEX idx_conflicts_status ON sync_conflicts(status) WHERE status = 'pending';
CREATE INDEX idx_conflicts_mn_id ON sync_conflicts(mn_id);
CREATE INDEX idx_conflicts_type ON sync_conflicts(conflict_type);
CREATE INDEX idx_conflicts_severity ON sync_conflicts(severity);
```

### **4. Update `sync_errors` Table** (Rename from mn_errors)
Better categorization and retry tracking
```sql
-- Rename existing table
ALTER TABLE mn_errors RENAME TO sync_errors;

-- Add new columns
ALTER TABLE sync_errors
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'error',
  ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_method TEXT; -- 'auto_retry' | 'manual' | 'ignored'

-- Rename error_type to be more specific
ALTER TABLE sync_errors ALTER COLUMN error_type TYPE TEXT;

-- Add check constraints
ALTER TABLE sync_errors
  ADD CONSTRAINT check_severity CHECK (severity IN ('error', 'warning')),
  ADD CONSTRAINT check_resolution CHECK (resolution_method IN ('auto_retry', 'manual', 'ignored', NULL));

CREATE INDEX idx_errors_unresolved ON sync_errors(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_errors_retryable ON sync_errors(can_retry, next_retry_at) WHERE can_retry = TRUE;
```

### **5. Create `sync_warnings` Table** (NEW!)
Non-blocking issues for review
```sql
CREATE TABLE sync_warnings (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  warning_type TEXT NOT NULL,  -- 'missing_field', 'stale_data', 'unusual_value', 'low_confidence'
  warning_message TEXT NOT NULL,

  -- Context
  field_name TEXT,              -- Which field has the warning
  current_value TEXT,           -- Current value that triggered warning
  suggested_value TEXT,         -- Suggested fix (if any)
  context JSONB,                -- Additional metadata

  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  sync_log_id INTEGER REFERENCES sync_log(id),
  source_table TEXT,
  severity TEXT DEFAULT 'low', -- 'high' | 'medium' | 'low'

  CHECK (warning_type IN ('missing_field', 'stale_data', 'unusual_value', 'low_confidence', 'duplicate_detected')),
  CHECK (severity IN ('high', 'medium', 'low'))
);

CREATE INDEX idx_warnings_unacked ON sync_warnings(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX idx_warnings_mn_id ON sync_warnings(mn_id);
CREATE INDEX idx_warnings_type ON sync_warnings(warning_type);
```

### **6. Create `sync_configs` Table**
Single source of truth for year-specific configuration
```sql
CREATE TABLE sync_configs (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(year, config_key),
  CHECK (config_type IN ('string', 'number', 'boolean', 'json'))
);

CREATE INDEX idx_sync_configs_year ON sync_configs(year);
CREATE INDEX idx_sync_configs_active ON sync_configs(active) WHERE active = TRUE;

-- Populate with 2025 values
INSERT INTO sync_configs (year, config_key, config_value, description) VALUES
  (2025, 'jotform_signup_form_id', '250685983663169', '2025 Mentor Sign Up Form'),
  (2025, 'jotform_setup_form_id', '250754977634066', '2025 Mentor Givebutter Setup Form'),
  (2025, 'jotform_training_form_id', '252935716589069', '2025 Mentor Training Sign Up'),
  (2025, 'givebutter_campaign_code', 'SWABUGA2025', '2025 Event Day Fundraiser Campaign'),
  (2025, 'givebutter_mentor_tag', 'Mentors 2025', 'Tag for identifying 2025 mentors'),
  (2025, 'fundraising_goal', '75', 'Fundraising goal per mentor'),
  (2025, 'event_date', '2025-11-09', 'Event Day date');
```

### **4. Update `mentors` Table**
Add missing fields from diagram
```sql
ALTER TABLE mentors
  -- Training fields (distinguish signup vs attendance)
  ADD COLUMN IF NOT EXISTS training_signup BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS training_signup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attended_training BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS training_at TIMESTAMPTZ,

  -- Dropped status tracking
  ADD COLUMN IF NOT EXISTS dropped BOOLEAN DEFAULT FALSE,

  -- Partner/shift preferences (if not exists)
  ADD COLUMN IF NOT EXISTS shift_preference TEXT,
  ADD COLUMN IF NOT EXISTS partner_preference TEXT;

-- Update existing training_signup_done field to training_signup
UPDATE mentors SET training_signup = training_signup_done WHERE training_signup_done IS NOT NULL;
```

---

## ⚠️ Conflict Detection & Resolution System

### **Philosophy: When to Create Conflicts**

**Auto-Resolve (High Confidence):**
- Clear priority rules (e.g., Jotform always wins for signup data)
- One option significantly better (completeness score >20% higher)
- Recent data vs very stale data (>90 days old)

**Create Conflict (Low Confidence):**
- Equal scoring (within 10% of each other)
- Both options have same recency
- Conflicting data from equally authoritative sources
- High-impact fields (phone, email, contact_id)

### **Conflict Detection During ETL**

```typescript
// backend/core/etl/services/conflict-detector.ts

import { Logger } from '@/backend/lib/utils/logger';

interface ConflictDetectionResult {
  hasConflict: boolean;
  autoResolve: boolean;
  winner?: any;
  conflict?: Conflict;
}

export class ConflictDetector {
  private logger: Logger;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient, logger: Logger) {
    this.supabase = supabase;
    this.logger = logger;
  }

  /**
   * Detect contact selection conflicts
   * When multiple contacts match a mentor with similar scores
   */
  async detectContactSelectionConflict(
    mnId: string,
    mentorName: string,
    candidates: ContactCandidate[]
  ): Promise<ConflictDetectionResult> {

    if (candidates.length < 2) {
      return { hasConflict: false, autoResolve: true, winner: candidates[0] };
    }

    // Score all candidates
    const scored = candidates.map(c => ({
      ...c,
      score: this.calculateContactScore(c)
    })).sort((a, b) => b.score - a.score);

    const [best, secondBest] = scored;
    const scoreDiff = best.score - secondBest.score;

    // If score difference > 100 points (significant), auto-resolve
    if (scoreDiff > 100) {
      this.logger.info(`Auto-resolving contact selection for ${mnId}: score diff ${scoreDiff}`);
      return { hasConflict: false, autoResolve: true, winner: best };
    }

    // Close scores = conflict!
    this.logger.warn(`Contact selection conflict for ${mnId}: scores within ${scoreDiff}`);

    const conflict: Conflict = {
      mn_id: mnId,
      conflict_type: 'contact_selection',
      option_a: {
        value: best.contact_id,
        source: 'raw_gb_full_contacts',
        metadata: {
          name: `${best.first_name} ${best.last_name}`,
          email: best.primary_email,
          phone: best.primary_phone,
          tags: best.tags,
          last_modified: best.last_modified_utc,
          completeness_score: best.completeness_score,
          score: best.score,
          campaign_member: !!best.campaign_member_id,
        }
      },
      option_b: {
        value: secondBest.contact_id,
        source: 'raw_gb_full_contacts',
        metadata: {
          name: `${secondBest.first_name} ${secondBest.last_name}`,
          email: secondBest.primary_email,
          phone: secondBest.primary_phone,
          tags: secondBest.tags,
          last_modified: secondBest.last_modified_utc,
          completeness_score: secondBest.completeness_score,
          score: secondBest.score,
          campaign_member: !!secondBest.campaign_member_id,
        }
      },
      context: {
        mentor_name: mentorName,
        total_candidates: candidates.length,
        score_difference: scoreDiff,
        both_have_campaign_tags: best.tags?.includes('Mentors 2025') && secondBest.tags?.includes('Mentors 2025'),
      },
      recommended_option: best.score > secondBest.score ? 'a' : null,
      recommendation_reason: best.score > secondBest.score
        ? `Contact A has ${scoreDiff} point score advantage due to ${this.getScoreReasons(best, secondBest)}`
        : 'Both contacts have equal priority',
      severity: 'high', // Blocks processing
      source_table: 'raw_gb_full_contacts',
    };

    return { hasConflict: true, autoResolve: false, conflict };
  }

  /**
   * Detect phone number mismatches
   */
  async detectPhoneMismatch(
    mnId: string,
    mentorName: string,
    jotformPhone: string,
    givebutterPhone: string,
    jotformSubmittedAt: string,
    gbLastModified: string
  ): Promise<ConflictDetectionResult> {

    // Normalize phones for comparison
    const normalized1 = this.normalizePhone(jotformPhone);
    const normalized2 = this.normalizePhone(givebutterPhone);

    if (normalized1 === normalized2) {
      return { hasConflict: false, autoResolve: true, winner: jotformPhone };
    }

    // Check recency
    const jfDate = new Date(jotformSubmittedAt);
    const gbDate = new Date(gbLastModified);
    const daysDiff = Math.abs(jfDate.getTime() - gbDate.getTime()) / (1000 * 60 * 60 * 24);

    // If Jotform is significantly more recent (>30 days), auto-resolve
    if (jfDate > gbDate && daysDiff > 30) {
      this.logger.info(`Auto-resolving phone for ${mnId}: Jotform data ${Math.round(daysDiff)} days newer`);
      return { hasConflict: false, autoResolve: true, winner: jotformPhone };
    }

    // Close recency = conflict
    const conflict: Conflict = {
      mn_id: mnId,
      conflict_type: 'phone_mismatch',
      option_a: {
        value: jotformPhone,
        source: 'raw_mn_signups',
        metadata: {
          submitted_at: jotformSubmittedAt,
          days_old: Math.round((Date.now() - jfDate.getTime()) / (1000 * 60 * 60 * 24)),
          is_primary_source: true,
        }
      },
      option_b: {
        value: givebutterPhone,
        source: 'raw_gb_full_contacts',
        metadata: {
          last_modified: gbLastModified,
          days_old: Math.round((Date.now() - gbDate.getTime()) / (1000 * 60 * 60 * 24)),
          is_primary_source: false,
        }
      },
      context: {
        mentor_name: mentorName,
        recency_difference_days: Math.round(daysDiff),
      },
      recommended_option: jfDate >= gbDate ? 'a' : 'b',
      recommendation_reason: jfDate >= gbDate
        ? 'Jotform is the primary data source and has more recent data'
        : 'Givebutter data is more recent (may be manually updated)',
      severity: 'medium',
      source_table: 'raw_mn_signups',
    };

    return { hasConflict: true, autoResolve: false, conflict };
  }

  /**
   * Log conflict to database
   */
  async logConflict(conflict: Conflict, syncLogId?: number): Promise<void> {
    const { error } = await this.supabase
      .from('sync_conflicts')
      .insert({
        mn_id: conflict.mn_id,
        conflict_type: conflict.conflict_type,
        option_a: conflict.option_a,
        option_b: conflict.option_b,
        context: conflict.context,
        recommended_option: conflict.recommended_option,
        recommendation_reason: conflict.recommendation_reason,
        severity: conflict.severity,
        source_table: conflict.source_table,
        sync_log_id: syncLogId,
      });

    if (error) {
      this.logger.error('Failed to log conflict:', error);
    } else {
      this.logger.info(`Logged ${conflict.conflict_type} conflict for ${conflict.mn_id}`);
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private calculateContactScore(contact: ContactCandidate): number {
    // Same scoring logic from contact selector
    let score = 0;
    if (contact.tags?.includes('Dropped 25')) score += 1000;
    const hasCampaignTag = contact.tags?.some(t => t.includes('Mentors 2025'));
    if (hasCampaignTag) score += 500;
    // ... etc
    return score;
  }

  private getScoreReasons(winner: any, loser: any): string {
    const reasons: string[] = [];
    if (winner.completeness_score > loser.completeness_score) {
      reasons.push('more complete data');
    }
    if (winner.campaign_member_id && !loser.campaign_member_id) {
      reasons.push('is campaign member');
    }
    if (winner.tags?.length > loser.tags?.length) {
      reasons.push('more tags');
    }
    return reasons.join(', ') || 'overall scoring';
  }
}
```

### **Conflict Resolution API**

```typescript
// src/app/api/sync/conflicts/[id]/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { decision, custom_value, resolved_by } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get the conflict
  const { data: conflict, error: fetchError } = await supabase
    .from('sync_conflicts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !conflict) {
    return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
  }

  // 2. Apply the decision
  const resolvedValue = decision === 'custom'
    ? custom_value
    : decision === 'a'
    ? conflict.option_a.value
    : conflict.option_b.value;

  // 3. Update the mentor record based on conflict type
  if (conflict.conflict_type === 'phone_mismatch') {
    await supabase
      .from('mentors')
      .update({ phone: resolvedValue })
      .eq('mn_id', conflict.mn_id);
  } else if (conflict.conflict_type === 'contact_selection') {
    await supabase
      .from('mentors')
      .update({ gb_contact_id: resolvedValue })
      .eq('mn_id', conflict.mn_id);

    // Archive the losing contact
    const loserContactId = decision === 'a'
      ? conflict.option_b.value
      : conflict.option_a.value;

    // Call archiveContact via Givebutter API
    // await gbClient.archiveContact(loserContactId);
  }

  // 4. Mark conflict as resolved
  const { error: updateError } = await supabase
    .from('sync_conflicts')
    .update({
      status: 'resolved',
      user_decision: decision,
      custom_value: decision === 'custom' ? custom_value : null,
      resolved_at: new Date().toISOString(),
      resolved_by,
    })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 5. Log the resolution to mn_changes
  await supabase
    .from('mn_changes')
    .insert({
      mn_id: conflict.mn_id,
      change_type: 'conflict_resolved',
      field_name: conflict.conflict_type,
      old_value: decision === 'a'
        ? JSON.stringify(conflict.option_b)
        : JSON.stringify(conflict.option_a),
      new_value: resolvedValue,
      source_table: 'sync_conflicts',
      notes: `User resolved ${conflict.conflict_type} conflict by choosing ${decision}`,
    });

  return NextResponse.json({ success: true, resolved_value: resolvedValue });
}
```

### **Integration with ETL**

```typescript
// backend/core/etl/steps/04-match-contacts-with-conflicts.ts

export async function matchContactsWithConflictDetection(
  context: ETLContext
): Promise<void> {
  console.log('🔍 Step 4: Matching contacts (with conflict detection)...\n');

  const conflictDetector = new ConflictDetector(context.supabase, context.logger);
  const conflicts: Conflict[] = [];
  let autoResolved = 0;

  for (const signup of context.signups) {
    const { winner, losers } = await selectWinnerContact(
      signup.mn_id,
      signup.phone,
      signup.personal_email,
      signup.uga_email,
      context.rawContacts
    );

    // Check if winner selection had conflicts
    const allCandidates = [winner, ...losers].filter(Boolean);
    const conflictResult = await conflictDetector.detectContactSelectionConflict(
      signup.mn_id,
      `${signup.first_name} ${signup.last_name}`,
      allCandidates
    );

    if (conflictResult.hasConflict && !conflictResult.autoResolve) {
      // Create conflict for user to resolve
      conflicts.push(conflictResult.conflict!);
      await conflictDetector.logConflict(conflictResult.conflict!, context.syncLogId);

      // Skip this mentor for now (will be processed after conflict resolution)
      context.logger.warn(`Skipping ${signup.mn_id} due to contact selection conflict`);
      continue;
    }

    if (conflictResult.autoResolve) {
      autoResolved++;
    }

    // Use the resolved contact
    signup.gb_contact_id = conflictResult.winner.contact_id;
    // ... continue processing
  }

  console.log(`\n✅ Matched contacts:`);
  console.log(`   Auto-resolved: ${autoResolved}`);
  console.log(`   Conflicts created: ${conflicts.length} (pending user decision)`);
  console.log(`   Skipped: ${conflicts.length} mentors (will process after resolution)\n`);
}
```

---

## 🔄 Sync System Refactoring

### **Phase 1: Config-Driven Sync**

#### Step 1: Create Config Loader
```typescript
// backend/core/config/sync-config-loader.ts
export async function loadSyncConfig(year: number): Promise<SyncConfig> {
  const { data, error } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('year', year)
    .eq('active', true);

  return {
    jotformSignupFormId: getConfig(data, 'jotform_signup_form_id'),
    jotformSetupFormId: getConfig(data, 'jotform_setup_form_id'),
    jotformTrainingFormId: getConfig(data, 'jotform_training_form_id'),
    givebutterCampaignCode: getConfig(data, 'givebutter_campaign_code'),
    givebutterMentorTag: getConfig(data, 'givebutter_mentor_tag'),
    fundraisingGoal: parseInt(getConfig(data, 'fundraising_goal')),
    eventDate: getConfig(data, 'event_date'),
  };
}
```

#### Step 2: Update Sync Scripts
Replace all hardcoded values:
```typescript
// OLD (hardcoded):
const SIGNUP_FORM_ID = '250685983663169';

// NEW (config-driven):
const config = await loadSyncConfig(2025);
const signups = await fetchJotformSubmissions(config.jotformSignupFormId);
```

**Files to update**:
- `backend/core/sync/jotform-signups.ts`
- `backend/core/sync/jotform-setup.ts`
- `backend/core/sync/jotform-training-signup.ts`
- `backend/core/sync/givebutter-members.ts`
- `backend/core/sync/givebutter-contacts.ts`

---

### **Phase 2: Change Tracking System**

#### Detect Changes During ETL
```typescript
// backend/core/etl/detect-changes.ts
export async function detectChanges(
  oldMentor: Mentor | null,
  newMentor: Mentor,
  sourceTable: string
): Promise<Change[]> {
  const changes: Change[] = [];

  // New mentor
  if (!oldMentor) {
    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'new_mentor',
      source_table: sourceTable,
    });
    return changes;
  }

  // Check for "dropped" status
  const nowDropped = newMentor.tags?.includes('Dropped 25') || false;
  const wasDropped = oldMentor.dropped || false;
  if (nowDropped && !wasDropped) {
    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'dropped',
      old_value: 'false',
      new_value: 'true',
      source_table: 'raw_gb_full_contacts',
    });
  }

  // Check important fields
  const fieldsToTrack = [
    'phone',
    'personal_email',
    'uga_email',
    'training_signup',
    'attended_training',
    'amount_raised',
    'gb_contact_id',
  ];

  fieldsToTrack.forEach(field => {
    if (oldMentor[field] !== newMentor[field]) {
      changes.push({
        mn_id: newMentor.mn_id,
        change_type: 'field_change',
        field_name: field,
        old_value: String(oldMentor[field] || 'null'),
        new_value: String(newMentor[field] || 'null'),
        source_table: sourceTable,
      });
    }
  });

  return changes;
}
```

#### Record Changes to Database
```typescript
// backend/core/etl/record-changes.ts
export async function recordChanges(changes: Change[]) {
  if (changes.length === 0) return;

  const { error } = await supabase
    .from('mn_changes')
    .insert(changes);

  if (error) {
    console.error('Failed to record changes:', error);
  } else {
    console.log(`✅ Recorded ${changes.length} changes to mn_changes table`);
  }
}
```

---

### **Phase 3: ETL Simplification**

Break down monolithic `process.ts` (977 lines) into focused modules:

```
backend/core/etl/
├── orchestrator.ts          # Main coordinator (replaces process.ts)
├── steps/
│   ├── 01-load-raw.ts       # Load all raw tables
│   ├── 02-validate.ts       # Validate mn_ids, phones
│   ├── 03-deduplicate.ts    # Dedupe by phone
│   ├── 04-match-contacts.ts # Match to GB contacts (FIXED LOGIC!)
│   ├── 05-merge-data.ts     # Compile mentors table
│   ├── 06-detect-changes.ts # Track what changed
│   ├── 07-populate-export.ts# Generate mn_gb_import
│   └── 08-link-members.ts   # Link campaign members
├── transformers/
│   ├── phone-normalizer.ts
│   ├── email-normalizer.ts
│   └── name-builder.ts
└── validators/
    ├── phone-validator.ts
    └── email-validator.ts
```

**Key Principle**: Each step is **< 150 lines**, single responsibility, testable.

---

### **Phase 4: Conflict Resolution Rules**

Create declarative rules for data conflicts:

```typescript
// backend/core/config/conflict-rules.ts
export const CONFLICT_RULES: ConflictRule[] = [
  {
    field: 'phone',
    priority: ['raw_mn_signups', 'raw_gb_full_contacts'],
    reason: 'Jotform signup is source of truth for phone',
  },
  {
    field: 'personal_email',
    priority: ['raw_mn_signups', 'raw_gb_full_contacts'],
    reason: 'Jotform signup is source of truth for personal email',
  },
  {
    field: 'uga_email',
    priority: ['raw_mn_signups', 'raw_gb_full_contacts'],
    reason: 'Jotform signup is source of truth for UGA email',
  },
  {
    field: 'amount_raised',
    priority: ['raw_gb_campaign_members'],
    reason: 'Givebutter is always source of truth for fundraising',
    immutable: true,  // Never overwrite
  },
  {
    field: 'training_signup',
    priority: ['raw_mn_training_signup'],
    reason: 'Training form is source of truth for signup',
  },
  {
    field: 'gb_contact_id',
    priority: ['raw_gb_full_contacts', 'existing_mentors'],
    reason: 'Never overwrite existing contact ID unless from GB sync',
  },
  {
    field: 'dropped',
    priority: ['raw_gb_full_contacts'],
    reason: 'Dropped status comes from GB "Dropped 25" tag',
  },
];
```

---

### **Phase 5: Next.js API Structure**

Create proper API routes for frontend calls:

```
src/app/api/
├── sync/
│   ├── all/route.ts           # POST /api/sync/all
│   ├── jotform/route.ts       # POST /api/sync/jotform
│   ├── givebutter/route.ts    # POST /api/sync/givebutter
│   ├── status/route.ts        # GET /api/sync/status
│   └── changes/route.ts       # GET /api/sync/changes
├── etl/
│   ├── run/route.ts           # POST /api/etl/run
│   └── status/route.ts        # GET /api/etl/status
├── export/
│   ├── generate/route.ts      # POST /api/export/generate
│   └── validate/route.ts      # POST /api/export/validate
└── mentors/
    ├── route.ts               # GET /api/mentors
    ├── [id]/route.ts          # GET /api/mentors/:id
    ├── conflicts/route.ts     # GET /api/mentors/conflicts
    └── changes/route.ts       # GET /api/mentors/changes
```

**Example Implementation**:
```typescript
// src/app/api/sync/all/route.ts
import { NextResponse } from 'next/server';
import { runAllSyncs } from '@/backend/core/sync/orchestrator';

export async function POST(request: Request) {
  try {
    const { skipETL } = await request.json();
    const result = await runAllSyncs({ skipETL });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return sync status
  const status = await getSyncStatus();
  return NextResponse.json(status);
}
```

---

## 📋 Implementation Checklist

### ✅ Immediate (Week 1) - **IN PROGRESS**
- [x] Identify root cause of CSV failures → `debug-csv-failures.ts`
- [x] Fix contact matching logic in ETL → `process.ts:530`
- [x] Re-sync Givebutter contacts → `npm run sync:api-contacts` (INCOMPLETE - only synced 976, not all 40k+)
- [ ] **CRITICAL: Download fresh Givebutter export CSV** (Contacts → Export → All Contacts)
- [ ] Upload fresh export to database → `npm run sync:upload-csv /path/to/export.csv`
- [ ] Re-run ETL with fresh contact data → `npm run etl`
- [ ] Re-export CSV → `npm run comms:export`
- [ ] Verify upload to Givebutter (0 errors expected)
- [ ] *Future*: Implement duplicate archival system

### 🔧 Short Term (Week 2-3)
- [ ] **Separate Concerns: Move Core Logic Out of Comms**
  - [ ] Move `features/comms/tools/export.ts` → `core/sync/export-contacts.ts`
  - [ ] Move `features/comms/tools/validate.ts` → `core/sync/validate-csv.ts`
  - [ ] Update npm scripts to point to new locations
  - [ ] Simplify comms campaign scripts (only message generation)
  - [ ] Remove any duplicate ETL/sync logic from comms folder
- [ ] Create database tables (`mn_changes`, `sync_configs`)
- [ ] Populate `sync_configs` with 2025 values
- [ ] Create config loader (`sync-config-loader.ts`)
- [ ] Update all sync scripts to use config loader
- [ ] Test year-switching (2025 → 2026 should be config change only)

### 📊 Medium Term (Week 4-6) - **Conflict Management System**
- [ ] **Conflict Detection & Resolution**
  - [ ] Create `sync_conflicts` table (schema above)
  - [ ] Create `sync_warnings` table (schema above)
  - [ ] Update `sync_errors` table (add retry, resolution tracking)
  - [ ] Implement `ConflictDetector` service
  - [ ] Add conflict detection to ETL steps
  - [ ] Build conflict resolution API endpoints
  - [ ] Create bulk conflict resolution (use all recommendations)
  - [ ] Test with real conflict scenarios
- [ ] **UI Implementation** (see `ai/UI-Redesign/SYNC_MANAGEMENT_UI.md`)
  - [ ] Sync dashboard page
  - [ ] Conflicts resolution page (PRIORITY)
  - [ ] Errors log page
  - [ ] Warnings page
  - [ ] Change log page
  - [ ] Sync history page
- [ ] Implement change detection system
- [ ] Add change tracking to ETL
- [ ] Break down ETL into modules
- [ ] Add logging and monitoring

### 🎨 Long Term (Week 7+)
- [ ] Real-time sync status updates (WebSocket)
- [ ] Conflict resolution AI/ML suggestions
- [ ] Email/Slack notifications for conflicts
- [ ] Automated sync scheduling with cron
- [ ] Performance optimization (batch processing)
- [ ] Comprehensive documentation
- [ ] Sync metrics and analytics dashboard

---

## 🎯 Success Criteria

1. **CSV Uploads** - Zero errors when uploading to Givebutter ✅
2. **Config-Driven** - All year-specific values in `sync_configs` table
3. **Change Visibility** - Can see what changed between any two syncs
4. **Code Clarity** - New developer understands sync in < 1 hour
5. **Maintainability** - Adding a new form/field takes < 30 minutes
6. **Reliability** - Syncs complete without manual intervention
7. **Traceability** - Can trace any data back to its source

---

## 📝 Notes & Conventions

### Directory Structure
```
backend/
├── core/
│   ├── config/          # Configuration loaders
│   ├── sync/            # Raw table sync scripts
│   └── etl/             # Data transformation
├── features/
│   └── comms/           # Communication campaigns
├── lib/
│   ├── infrastructure/  # Clients, processors
│   └── utils/           # Shared utilities
├── mcp/                 # MCP servers
└── scripts/             # One-off utilities
```

### Naming Conventions
- Tables: `snake_case` (e.g., `mn_changes`, `sync_configs`)
- Files: `kebab-case.ts` (e.g., `sync-config-loader.ts`)
- Functions: `camelCase` (e.g., `loadSyncConfig`)
- Components: `PascalCase` (e.g., `SyncStatusPanel`)

### Git Commits
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Reference issues: `fix: contact matching priority #123`

---

**Last Updated**: 2025-01-27 (Evening - Complete Architecture Update)
**Status**: Phase 1 (Immediate Fix) - 40% complete
**Next Action**: Download fresh Givebutter export CSV → Upload to database
**Key Insight**: CSV feedback loop must be completed - local `raw_gb_full_contacts` is stale
