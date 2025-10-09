# Contributing Guide

**Code standards and architecture guidelines for AI agents working on this codebase.**

---

## Core Philosophy

This project follows these principles:

1. **Modular & Programmatic** - All functionality can be called programmatically (not CLI-only)
2. **Future-ready** - Designed to be automated/scheduled/run from frontend
3. **3-Layer Architecture** - Raw data → Processing → Main tables (clear separation)
4. **No Data Generation** - Never fabricate IDs or data; preserve raw truth
5. **Simplicity** - Minimal tables, intuitive naming, maximum clarity

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  External APIs (Jotform, Givebutter)                      │
│         ↓                                                   │
│  SYNC → Raw Tables (_raw suffix)                           │
│         ↓                                                   │
│  ETL → Main Tables (mentors, mn_tasks, mn_errors)         │
│         ↓                                                   │
│  EXPORT → CSV for Givebutter import                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Current Schema (Post-Restructure)

**Layer 1: Raw Tables** (Unchanged API dumps)
- `mn_signups_raw` - Jotform signups (mn_id from form)
- `funds_setup_raw` - Jotform setup completions
- `campaign_members_raw` - Givebutter campaign members (has FK to mentors)
- `full_gb_contacts` - Full Givebutter contacts export

**Layer 2: Main Tables** (Processed/clean data)
- `mentors` - Primary mentor records (mn_id TEXT as PK)
- `mn_tasks` - Task completion tracking
- `mn_errors` - Validation errors and duplicate warnings
- `mn_gb_import` - Prepared for CSV export (exact Givebutter column names)

**Key Changes from Old Architecture:**
- ✅ mn_id (TEXT) replaces mentor_id (UUID)
- ✅ campaign_members_raw now has FK to mentors via mn_id
- ✅ gb_member_id added to mentors table
- ✅ mn_gb_import replaces manual CSV generation
- ✅ mentor_texts merged into mentors (deleted as separate table)
- ✅ Deleted: givebutter_custom_fields, givebutter_sync_log

---

## File Structure

```
backend/
├── core/                    # Core data pipeline
│   ├── config/              # Configuration
│   │   ├── supabase.ts      # Supabase connection config
│   │   ├── custom-fields.json  # Givebutter custom field definitions
│   │   └── tags.json        # Contact tag configuration
│   ├── sync/                # External APIs → Raw tables
│   │   ├── jotform-signups.ts
│   │   ├── jotform-setup.ts
│   │   ├── givebutter-members.ts
│   │   ├── givebutter-contacts.ts
│   │   └── all.ts
│   └── etl/                 # Raw → Main tables transformation
│       └── process.ts
├── features/                # Feature-specific functionality
│   └── text-messages/       # Text messaging campaigns
│       ├── config/message-templates.json
│       ├── message-engine.ts
│       ├── export-contacts.ts
│       ├── validate-export.ts
│       └── check-messages.ts
├── lib/                     # Shared utilities
│   ├── operations/          # API write operations
│   │   └── givebutter/consolidate-duplicates.ts
│   ├── supabase/            # Supabase clients (client, server, middleware)
│   └── utilities/           # Tools (check-env, verify-data)
└── data/                    # Generated CSV exports

supabase/migrations/         # Database schema migrations
docs/                        # Documentation
src/                         # Frontend application
├── app/                     # Next.js app router pages
├── components/              # React components
│   ├── layout/              # Navigation components
│   ├── providers/           # Context providers
│   └── ui/                  # Reusable UI components
└── lib/                     # Frontend utilities
```

---

## Code Standards

### 1. Make Functions Programmatically Callable

**DO THIS** - Export main logic as functions:
```typescript
// ✅ Can be called from CLI OR programmatically
export async function syncJotformSignups(options?: { silent?: boolean }) {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // ... sync logic

  return { synced: count, errors: errorList };
}

// CLI execution
if (require.main === module) {
  syncJotformSignups();
}
```

**NOT THIS** - Hardcoded CLI-only:
```typescript
// ❌ Can only run from command line
async function main() {
  console.log('Starting...');
  // ... hardcoded logic with no return value
}

main();
```

**Why:** Future frontend can call `syncJotformSignups()` directly. Can be scheduled via cron. Can be tested programmatically.

---

### 2. TypeScript & Types

**Always use explicit types:**
```typescript
// ✅ Good
interface Mentor {
  mn_id: string;
  phone: string;
  gb_contact_id?: number;
  gb_member_id?: number;
  first_name: string;
  last_name: string;
}

function processMentor(mentor: Mentor): ProcessResult {
  // ...
}

// ❌ Bad
function processMentor(mentor: any) {
  // ...
}
```

---

### 3. Database Operations

**Current Table Names (use these!):**
- `mn_signups_raw`, `funds_setup_raw`, `campaign_members_raw`, `full_gb_contacts`
- `mentors`, `mn_tasks`, `mn_errors`, `mn_gb_import`

**Current Field Names:**
- `mn_id` (not mentor_id)
- `gb_contact_id` (not givebutter_contact_id)
- `gb_member_id` (NEW - campaign member ID)
- `*_done` booleans (not has_*)
- `*_at` timestamps (not *_completed_at)

**Always use UPSERT for syncs:**
```typescript
// ✅ Idempotent (can run multiple times)
await supabase
  .from('mn_signups_raw')
  .upsert(data, { onConflict: 'submission_id' });

// ❌ Not idempotent (creates duplicates)
await supabase
  .from('mn_signups_raw')
  .insert(data);
```

**Respect FK order:**
```typescript
// ✅ Good (clear FK before deleting parent)
await supabase.from('campaign_members_raw').update({ mn_id: null }).not('mn_id', 'is', null);
await supabase.from('mn_tasks').delete().gte('mn_id', '');
await supabase.from('mentors').delete().gte('mn_id', '');

// ❌ Bad (FK constraint violation)
await supabase.from('mentors').delete().gte('mn_id', '');
```

---

### 4. Error Handling & Logging

**Consistent error handling:**
```typescript
// ✅ Good
const { data, error } = await supabase.from('mentors').select('*');

if (error) {
  console.error('❌ Error fetching mentors:', error.message);
  throw new Error(`Failed to fetch mentors: ${error.message}`);
}

// ❌ Bad
const { data } = await supabase.from('mentors').select('*');
```

**Consistent log format:**
```typescript
// ✅ Good
console.log('\n' + '='.repeat(80));
console.log('📥 SYNCING JOTFORM SIGNUPS → DATABASE');
console.log('='.repeat(80) + '\n');

console.log(`✅ Synced ${count} records`);
console.error(`❌ Error:`, error.message);

// ❌ Bad
console.log('syncing...');
console.log(error);
```

---

### 5. Never Generate IDs

**Critical Rule:** `mn_id` comes from Jotform. NEVER generate it.

```typescript
// ✅ Good - Log error if missing
if (!signup.mn_id || !signup.mn_id.trim()) {
  errors.push({
    mn_id: `999${errorCounter++}`,  // Placeholder for error tracking only
    error_type: 'missing_mn_id',
    severity: 'critical',
    error_message: 'Signup missing mn_id from Jotform',
  });
  return null;  // Skip this mentor
}

// ❌ Bad - Never do this
if (!signup.mn_id) {
  signup.mn_id = `MN${Date.now()}`;  // NEVER GENERATE
}
```

---

### 6. Phone & Email Normalization

**Phone: E.164 format**
```typescript
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '';
  const last10 = digits.slice(-10);
  return `+1${last10}`;  // +1XXXXXXXXXX
}
```

**Email: Prioritize personal over UGA**
```typescript
// ✅ Personal email is PRIMARY
const primaryEmail = mentor.personal_email || mentor.uga_email;
const additionalEmail = mentor.personal_email ? mentor.uga_email : null;
```

---

### 7. Status Categories

**Current values (use these!):**
- `needs_setup` - Hasn't completed setup form
- `needs_page` - Setup done but not a campaign member
- `needs_fundraising` - Campaign member but < $75 raised
- `complete` - Fully fundraised AND trained

**Old values (don't use):**
- ❌ `needs_page_creation`
- ❌ `fully_complete`

---

## Naming Conventions

### Files
```
✅ Good:
backend/core/sync/jotform-signups.ts     (kebab-case)
backend/lib/operations/givebutter/consolidate-duplicates.ts
src/components/layout/top-nav.tsx            (kebab-case)
src/components/ui/Button.tsx                 (PascalCase for React components)
src/lib/utils.ts                             (kebab-case)

❌ Bad:
backend/core/sync/JotformSignups.ts
lib/operations/ConsolidateDuplicates.ts
```

### Functions
```typescript
✅ Good:
export async function syncJotformSignups()     (camelCase, descriptive)
function normalizePhone(phone: string)         (verb + noun)

❌ Bad:
export async function sync()
function phone(p)
```

### npm Scripts
```
✅ Good:
npm run sync:jotform-signups    (category:specific)
npm run admin:gb:consolidate-duplicates

❌ Bad:
npm run syncJotform
npm run consolidateContacts
```

---

## Adding New Features

### Adding a Sync Source

**Example:** Adding Stripe payment sync

1. **Create sync script:**
```typescript
// backend/core/sync/stripe-payments.ts

export async function syncStripePayments() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // 1. Fetch from Stripe API
  const payments = await fetchFromStripe();

  // 2. Transform to match raw table schema
  const transformed = payments.map(transformPayment);

  // 3. Upsert to raw table
  const { error } = await supabase
    .from('stripe_payments_raw')
    .upsert(transformed, { onConflict: 'payment_id' });

  return { synced: transformed.length, error };
}

// CLI execution
if (require.main === module) {
  syncStripePayments();
}
```

2. **Create migration for raw table**
3. **Add npm script:** `"sync:stripe-payments": "tsx backend/core/sync/stripe-payments.ts"`
4. **Update ETL** to process the new raw data

---

### Adding Operations (Givebutter API writes)

**Example:** Bulk updating contact tags

1. **Create operation script:**
```typescript
// backend/lib/operations/givebutter/update-tags.ts

export async function updateContactTags(options: { dryRun?: boolean } = {}) {
  // 1. Query database
  const { data: contacts } = await supabase.from('mentors').select('gb_contact_id');

  // 2. Prepare API updates
  const updates = contacts.map(prepareUpdate);

  if (options.dryRun) {
    console.log('🔍 DRY RUN - Would update:', updates.length);
    return { preview: updates };
  }

  // 3. Execute via Givebutter API
  for (const update of updates) {
    await fetch(`${GIVEBUTTER_API}/contacts/${update.id}`, {
      method: 'PATCH',
      // ...
    });
  }

  return { updated: updates.length };
}

// CLI execution with dry run
if (require.main === module) {
  const dryRun = !process.argv.includes('apply');
  updateContactTags({ dryRun });
}
```

2. **Add npm script:** `"admin:gb:update-tags": "tsx backend/lib/operations/givebutter/update-tags.ts"`

---

## Testing Changes

**Before committing:**

```bash
# 1. Sync raw data
npm run sync

# 2. Run ETL
npm run etl

# 3. Verify data
npm run admin:verify

# 4. Test your new feature
npm run [your-script]
```

---

## Don't Break These Rules

1. ❌ **Never modify raw tables** - They're untouched API dumps
2. ❌ **Never generate mn_id** - It comes from Jotform only
3. ❌ **Never skip error handling** - Always handle errors explicitly
4. ❌ **Never hardcode config** - Use `backend/core/config/supabase.ts`
5. ❌ **Never make CLI-only scripts** - Export functions for programmatic use
6. ❌ **Never use old table/field names** - See "Current Table Names" section

---

## Key Takeaways for AI Agents

When working on this codebase:

- ✅ Use current table/field names (mn_id, gb_contact_id, mn_tasks, etc.)
- ✅ Export functions for programmatic use (not just CLI)
- ✅ Follow 3-layer architecture (raw → ETL → main)
- ✅ Use TypeScript types explicitly
- ✅ Handle errors and log consistently
- ✅ NEVER generate mn_id
- ✅ Prioritize personal_email over uga_email
- ✅ Use E.164 phone format (+1XXXXXXXXXX)

**Questions?** See existing code:
- Pipeline: `backend/core/sync/jotform-signups.ts`
- ETL: `backend/core/etl/process.ts`
- Operations: `backend/lib/operations/givebutter/consolidate-duplicates.ts`
- Export: `backend/features/text-messages/export-contacts.ts`

---

**Remember:** This system is designed to be automated in the future. Every script should be callable programmatically, not just from the command line.
