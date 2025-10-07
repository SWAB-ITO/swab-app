# Contributing Guide

**Code standards and file organization for adding new features.**

---

## Table of Contents

1. [File Structure Rules](#file-structure-rules)
2. [Adding Pipeline Features](#adding-pipeline-features)
3. [Adding Admin Tools](#adding-admin-tools)
4. [Adding Frontend Features](#adding-frontend-features)
5. [Code Standards](#code-standards)
6. [Naming Conventions](#naming-conventions)

---

## File Structure Rules

**DO NOT break the 3-layer architecture:**

```
lib/
├── pipeline/          # ONLY data pipeline code
│   ├── sync/         # LAYER 1: APIs → Raw tables
│   └── etl/          # LAYER 2: Raw → Main tables
├── admin/            # ONLY maintenance & API writes
│   ├── givebutter/   # Grouped by service
│   └── jotform/      # (future)
└── config/           # ONLY configuration
    └── supabase.ts

app/                   # ONLY Next.js frontend
├── (routes)/         # Page routes
└── components/       # React components
```

**Key Rules:**
1. **Pipeline scripts** = Read-only from APIs, write to database
2. **Admin scripts** = Write to external APIs (Givebutter, Jotform)
3. **Frontend** = Read from database, display to users
4. **Never mix concerns** - Each folder has ONE job

---

## Adding Pipeline Features

### Adding a New Sync Source

**Example:** Adding Stripe payment sync

**1. Create sync script:**
```
lib/pipeline/sync/stripe-payments.ts
```

**2. Follow this template:**
```typescript
/**
 * SYNC SCRIPT: Stripe Payments → Database
 *
 * Fetches payment data from Stripe and syncs to raw table.
 * Usage: npm run sync:stripe-payments
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

async function syncStripePayments() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING STRIPE PAYMENTS → DATABASE');
  console.log('='.repeat(80) + '\n');

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

  if (error) console.error('❌ Error:', error);
  else console.log(`✅ Synced ${transformed.length} payments`);
}

syncStripePayments();
```

**3. Create migration for raw table:**
```bash
npm run db:new-migration add_stripe_payments_raw
```

**4. Add to sync/all.ts:**
```typescript
// Add to sync/all.ts
import './stripe-payments';
```

**5. Add npm script:**
```json
"sync:stripe-payments": "tsx lib/pipeline/sync/stripe-payments.ts"
```

**6. Update ETL to process new data:**
```typescript
// In lib/pipeline/etl/process.ts
const { data: rawPayments } = await supabase
  .from('stripe_payments_raw')
  .select('*');

// Match payments to mentors
// Add to mentors table or create new extension table
```

---

### Adding ETL Logic

**Example:** Adding payment tracking

**1. Create extension table migration:**
```sql
-- supabase/migrations/00002_add_payments.sql
CREATE TABLE mentor_payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(mentor_id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  stripe_payment_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Update ETL process:**
```typescript
// In lib/pipeline/etl/process.ts

// After processing mentors, process payments
for (const payment of rawPayments) {
  const mentor = mentors.find(m => m.uga_email === payment.email);

  if (mentor) {
    mentorPayments.push({
      mentor_id: mentor.mentor_id,
      amount: payment.amount,
      payment_date: payment.created_at,
      stripe_payment_id: payment.id
    });
  }
}

// Upsert payments
await supabase.from('mentor_payments').upsert(mentorPayments);
```

**3. Maintain the pattern:**
- ✅ Raw data preserved in `stripe_payments_raw`
- ✅ Processed data in extension table `mentor_payments`
- ✅ Can rebuild anytime with `npm run etl`

---

## Adding Admin Tools

### Adding Givebutter Operations

**Example:** Creating missing contacts via API

**1. Create admin script:**
```
lib/admin/givebutter/create-missing-contacts.ts
```

**2. Follow this template:**
```typescript
/**
 * ADMIN TOOL: Create Missing Givebutter Contacts
 *
 * Creates Givebutter contacts for 126 mentors without contact IDs.
 * Usage: npm run admin:gb:create-missing [apply]
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GIVEBUTTER_API_KEY = process.env.GIVEBUTTER_API_KEY;
const GIVEBUTTER_API_URL = 'https://api.givebutter.com/v1';

async function createMissingContacts(applyChanges: boolean = false) {
  console.log('\n' + '='.repeat(80));
  console.log(applyChanges ? '🔧 CREATING MISSING CONTACTS' : '🔍 DRY RUN');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // 1. Get mentors without contact IDs
  const { data: mentors } = await supabase
    .from('mentors')
    .select('*')
    .is('givebutter_contact_id', null);

  console.log(`Found ${mentors?.length || 0} mentors without contacts\n`);

  if (!applyChanges) {
    console.log('Preview (run with "apply" to execute)\n');
    return;
  }

  // 2. Create contacts via Givebutter API
  for (const mentor of mentors || []) {
    const response = await fetch(`${GIVEBUTTER_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: mentor.display_name,
        last_name: mentor.last_name,
        primary_email: mentor.uga_email || mentor.personal_email,
        primary_phone: mentor.phone,
        tags: ['Mentors 2025']
      })
    });

    const data = await response.json();
    console.log(`✅ Created contact ${data.id} for ${mentor.display_name}`);
  }
}

const applyChanges = process.argv.includes('apply');
createMissingContacts(applyChanges);
```

**3. Add npm script:**
```json
"admin:gb:create-missing": "tsx lib/admin/givebutter/create-missing-contacts.ts"
```

**4. Always include dry run:**
- ✅ Default = preview only
- ✅ `apply` flag = actually execute
- ✅ Prevents accidental API writes

---

### Adding Jotform Operations

**Future example:** Same pattern, different folder

```
lib/admin/jotform/
├── update-form-fields.ts
└── bulk-email-mentors.ts
```

**Rule:** Group by external service, not by operation type.

---

## Adding Frontend Features

### Adding a New Page

**Example:** Dashboard to view mentors by status

**1. Create page route:**
```
app/dashboard/page.tsx
```

**2. Follow this template:**
```typescript
import { createClient } from '@/lib/utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Query mentors with tasks
  const { data: mentors } = await supabase
    .from('mentors')
    .select(`
      *,
      mentor_tasks(*)
    `)
    .order('signup_date', { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Mentor Dashboard</h1>
      <MentorTable mentors={mentors} />
    </div>
  );
}
```

**3. Create component:**
```
app/components/MentorTable.tsx
```

**Rules:**
- ✅ Server components by default
- ✅ Query Supabase from server components (no API routes needed)
- ✅ Use client components only for interactivity
- ✅ Keep components in `app/components/`

---

### Adding a Client Component

**Example:** Interactive filter

**1. Create component:**
```
app/components/MentorFilter.tsx
```

**2. Follow this template:**
```typescript
'use client';

import { useState } from 'react';

export function MentorFilter({ mentors }: { mentors: any[] }) {
  const [filter, setFilter] = useState('all');

  const filtered = mentors.filter(m => {
    if (filter === 'all') return true;
    return m.mentor_tasks?.status_category === filter;
  });

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All Mentors</option>
        <option value="needs_setup">Needs Setup</option>
        <option value="needs_page_creation">Needs Page</option>
        <option value="needs_fundraising">Needs Fundraising</option>
        <option value="fully_complete">Complete</option>
      </select>

      <div className="mt-4">
        {filtered.map(mentor => (
          <MentorCard key={mentor.mentor_id} mentor={mentor} />
        ))}
      </div>
    </div>
  );
}
```

**Rules:**
- ✅ Mark with `'use client'`
- ✅ Receive data as props (from server component)
- ✅ Handle interactivity (state, events)

---

## Code Standards

### TypeScript

**Always use types:**
```typescript
// ✅ Good
interface Mentor {
  mentor_id: string;
  display_name: string;
  uga_email: string;
}

function processMentor(mentor: Mentor): void {
  // ...
}

// ❌ Bad
function processMentor(mentor: any) {
  // ...
}
```

**Import from config:**
```typescript
// ✅ Good
import { getSupabaseConfig } from '../../config/supabase';

// ❌ Bad
const url = process.env.SUPABASE_URL;
```

---

### Error Handling

**Always handle errors:**
```typescript
// ✅ Good
const { data, error } = await supabase.from('mentors').select('*');

if (error) {
  console.error('❌ Error fetching mentors:', error.message);
  process.exit(1);
}

// ❌ Bad
const { data } = await supabase.from('mentors').select('*');
```

---

### Logging

**Consistent log format:**
```typescript
// ✅ Good
console.log('\n' + '='.repeat(80));
console.log('📥 SYNCING JOTFORM → DATABASE');
console.log('='.repeat(80) + '\n');

console.log(`✅ Synced ${count} records`);
console.error(`❌ Error:`, error.message);

// ❌ Bad
console.log('syncing...');
console.log(error);
```

---

### Database Operations

**Always use UPSERT for syncs:**
```typescript
// ✅ Good (idempotent)
await supabase
  .from('jotform_signups_raw')
  .upsert(data, { onConflict: 'submission_id' });

// ❌ Bad (can create duplicates)
await supabase
  .from('jotform_signups_raw')
  .insert(data);
```

**Respect foreign key order:**
```typescript
// ✅ Good (mentors first, then tasks)
await supabase.from('mentors').insert(mentors);
await supabase.from('mentor_tasks').insert(tasks);

// ❌ Bad (tasks reference mentors that don't exist yet)
await Promise.all([
  supabase.from('mentors').insert(mentors),
  supabase.from('mentor_tasks').insert(tasks)
]);
```

---

## Naming Conventions

### Files

```
✅ Good:
lib/pipeline/sync/jotform-signups.ts     (kebab-case)
lib/admin/givebutter/clean-tags.ts       (kebab-case)
app/components/MentorTable.tsx           (PascalCase for components)

❌ Bad:
lib/pipeline/sync/JotformSignups.ts
lib/admin/givebutter/CleanTags.ts
app/components/mentor-table.tsx
```

### npm Scripts

```
✅ Good:
npm run sync:jotform-signups    (category:specific)
npm run admin:gb:consolidate    (category:service:action)

❌ Bad:
npm run syncJotform
npm run consolidateContacts
```

### Functions

```
✅ Good:
async function syncJotformSignups()     (camelCase, descriptive)
function normalizePhone(phone: string)  (verb + noun)

❌ Bad:
async function sync()
function phone(p)
```

### Database Tables

```
✅ Good:
jotform_signups_raw       (snake_case, descriptive)
mentor_tasks              (snake_case)

❌ Bad:
JotformSignups
tasks
```

---

## Migration Guidelines

### Creating Migrations

**1. Always use CLI:**
```bash
npm run db:new-migration add_feature_name
```

**2. Write idempotent migrations:**
```sql
-- ✅ Good (can run multiple times)
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY
);

ALTER TABLE existing_table
  ADD COLUMN IF NOT EXISTS new_column TEXT;

-- ❌ Bad (fails on re-run)
CREATE TABLE new_table (id UUID PRIMARY KEY);
ALTER TABLE existing_table ADD COLUMN new_column TEXT;
```

**3. Include rollback:**
```sql
-- Migration: add_payments
CREATE TABLE mentor_payments (...);

-- Rollback (in comments):
-- DROP TABLE mentor_payments;
```

---

## Testing Changes

**Before committing:**

```bash
# 1. Reset database
npm run db:reset

# 2. Run full pipeline
npm run sync
npm run etl

# 3. Verify data
npm run admin:verify

# 4. Test your new feature
npm run [your-new-script]
```

---

## Documentation Requirements

**When adding a new feature:**

1. **Update GUIDE.md** if adding new concepts
2. **Update ISSUES.md** if fixing data quality
3. **Update README.md** if adding core scripts
4. **Add script description** at top of file

**Script header template:**
```typescript
/**
 * [SYNC/ADMIN/ETL]: Brief description
 *
 * Longer explanation of what this does and why.
 *
 * Usage: npm run script:name [flags]
 */
```

---

## Don't Break These Rules

1. ❌ **Never modify raw tables** - They're untouched API dumps
2. ❌ **Never mix pipeline and admin** - Clear separation of concerns
3. ❌ **Never skip error handling** - Always log errors clearly
4. ❌ **Never hardcode config** - Use `lib/config/supabase.ts`
5. ❌ **Never commit without testing** - Run full pipeline first

---

## Questions?

See existing code for examples:
- **Pipeline:** `lib/pipeline/sync/jotform-signups.ts`
- **ETL:** `lib/pipeline/etl/process.ts`
- **Admin:** `lib/admin/givebutter/consolidate-duplicates.ts`
- **Frontend:** `app/page.tsx`

Follow these patterns and the codebase stays clean! 🎯
