# Unified Architecture & Refactoring Plan
## Serverless Migration + Backend Refactoring

**Created:** October 27, 2025
**Status:** Planning Phase
**Purpose:** Merge serverless migration strategy with existing backend refactoring plans

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Plan Analysis](#plan-analysis)
3. [Synergies & Conflicts](#synergies--conflicts)
4. [Unified Architecture](#unified-architecture)
5. [Technology Stack Decisions](#technology-stack-decisions)
6. [Phased Implementation](#phased-implementation)
7. [Critical Path](#critical-path)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Two Plans, One Vision

**MIGRATION_PLAN.md**: Transition from Node.js scripts to Vercel + Supabase Edge Functions
**REFACTORING_PLAN.md**: Fix sync issues, add conflict detection, modularize ETL, config-driven architecture

### The Big Picture

We're not just migrating to serverless - we're **rebuilding the sync system from the ground up** with:
- ✅ Serverless-first architecture (Vercel + Edge Functions)
- ✅ Robust conflict detection & resolution
- ✅ Comprehensive change tracking
- ✅ Config-driven, year-agnostic design
- ✅ Modular, testable codebase
- ✅ Production-grade error handling

### Key Insight

**The migration IS the perfect opportunity to do the refactoring right.**

Rather than:
1. Refactor existing Node.js code → Then migrate to serverless
2. OR migrate broken code → Then fix it

We should:
**Refactor AS we migrate** - building the new system correctly from the start.

---

## Plan Analysis

### MIGRATION_PLAN.md - Core Themes

| Theme | Description | Priority |
|-------|-------------|----------|
| **Serverless Limits** | Vercel timeouts (10-60s), no `spawn()` | CRITICAL |
| **Hybrid Architecture** | Vercel frontend + Supabase Edge Functions backend | CORE |
| **Directory Restructure** | `backend/lib/` → `src/lib/server/` | PHASE 1 |
| **Edge Functions** | Long-running sync ops (up to 10min) | PHASE 2 |
| **API Refactoring** | Replace `spawn()` with Edge Function calls | PHASE 3 |
| **Cron Jobs** | Vercel Cron for scheduled syncs | PHASE 4 |
| **Environment** | Proper secrets management | ONGOING |

### REFACTORING_PLAN.md - Core Themes

| Theme | Description | Priority |
|-------|-------------|----------|
| **CSV Upload Failures** | 29 errors due to stale contact data | URGENT |
| **Contact Selection** | Winner selection with 3 duplicate scenarios | CRITICAL |
| **CSV Feedback Loop** | Bidirectional sync (push → pull → push) | CRITICAL |
| **Conflict Detection** | Auto-resolve vs user-decision conflicts | HIGH |
| **Change Tracking** | `mn_changes` table for audit trail | HIGH |
| **Config-Driven** | `sync_configs` table for year-switching | HIGH |
| **ETL Simplification** | Break 977-line file into modules | MEDIUM |
| **Core vs Features** | Separate sync logic from comms | MEDIUM |
| **Database Schema** | Add tables: conflicts, warnings, changes | PHASE 1 |
| **Duplicate Archival** | Archive losing contacts via API | MEDIUM |

---

## Synergies & Conflicts

### 🤝 Synergies (Where Plans Align)

#### 1. **Modularization Benefits Both**
- **Refactoring**: Break ETL into small modules
- **Migration**: Small modules → easier to port to Edge Functions
- **Synergy**: Refactor into modules that work in BOTH Node.js AND Deno

#### 2. **Config-Driven Architecture**
- **Refactoring**: `sync_configs` table for year-switching
- **Migration**: Edge Functions read config from Supabase
- **Synergy**: Config system works identically in both environments

#### 3. **Database-Centric Design**
- **Refactoring**: All state in database (conflicts, changes, errors)
- **Migration**: Edge Functions are stateless, rely on database
- **Synergy**: Database as single source of truth for both

#### 4. **Separation of Concerns**
- **Refactoring**: Core sync vs Features (comms)
- **Migration**: Short ops (API routes) vs Long ops (Edge Functions)
- **Synergy**: Clear boundaries make migration easier

#### 5. **Error Handling & Logging**
- **Refactoring**: `sync_errors`, `sync_warnings` tables
- **Migration**: Edge Functions log to same tables
- **Synergy**: Unified observability across environments

### ⚠️ Conflicts & Considerations

#### 1. **Runtime Differences: Node.js vs Deno**

| Feature | Node.js (Current) | Deno (Edge Functions) | Resolution |
|---------|-------------------|----------------------|------------|
| Module system | CommonJS/ESM | ESM only | ✅ Use ESM everywhere |
| Package manager | npm | JSR, npm via CDN | ⚠️ Check all deps |
| File system | `fs`, `path` | Deno APIs | ⚠️ Abstract or avoid |
| Environment | `.env` via dotenv | Edge Function secrets | ✅ Config in DB |
| TypeScript | ts-node/tsx | Native | ✅ Better in Deno |
| CSV libraries | csv-parse, csv-stringify | Same via npm: CDN | ✅ Compatible |

**Decision**: Write **runtime-agnostic** code that works in both environments during transition.

#### 2. **File Operations in Serverless**

**Problem**: Current code writes CSVs to filesystem
```typescript
// backend/features/comms/tools/export.ts
const writeStream = createWriteStream(OUTPUT_PATH); // ❌ Won't work in Edge Functions
```

**Solutions**:
- **Option A**: Return CSV as string, let API route handle file download
- **Option B**: Stream CSV directly to client (no temp file)
- **Option C**: Upload CSV to Supabase Storage, return URL

**Decision**: Use **Option B** for Edge Functions, keep Option A for development scripts.

#### 3. **Long-Running Operations**

**Current State**:
- Full sync can take 10+ minutes
- ETL processes 1000+ records

**Vercel Limits**:
- Hobby: 10 seconds
- Pro: 60 seconds (300s max)

**Edge Function Limits**:
- 10 minutes max
- But ideal: < 5 minutes

**Solution**:
- **Phase 1**: Move to Edge Functions (10 min OK for now)
- **Phase 2**: Optimize for <5 min (batching, parallel processing)
- **Phase 3**: Consider background jobs if still too slow (Inngest, etc.)

#### 4. **Development vs Production Workflows**

**Development** (Local):
- Need to run scripts directly via `tsx` for debugging
- Want fast iteration without deployment

**Production** (Vercel/Supabase):
- All operations via Edge Functions
- Cron-triggered

**Solution**:
- Keep `backend/` scripts for **development & debugging**
- Edge Functions call **shared library code** (same logic)
- Use `--local` flag to use local Supabase during dev

---

## Unified Architecture

### The Target State

```
┌─────────────────────────────────────────────────────────────────────┐
│  VERCEL (Next.js App)                                                │
│                                                                      │
│  ┌──────────────┐  ┌───────────────────────────┐  ┌──────────────┐│
│  │   Frontend   │  │    API Routes (< 60s)     │  │ Vercel Crons ││
│  │   (React)    │  │  - CRUD operations        │  │  (Triggers)  ││
│  │              │  │  - Dashboard queries      │  │              ││
│  │  Pages:      │  │  - Trigger Edge Functions │  │  Every 6hrs  ││
│  │  /mentors    │  │  - Stream progress        │  │              ││
│  │  /sync       │  │                           │  │              ││
│  │  /conflicts  │  └─────────────┬─────────────┘  └──────┬───────┘│
│  └──────────────┘                │                       │         │
└────────────────────────────────┬─┼───────────────────────┼─────────┘
                                 │ │                       │
                    ┌────────────▼─▼───────────────────────▼─────────┐
                    │  SUPABASE                                       │
                    │                                                 │
                    │  ┌───────────────────────────────────────────┐ │
                    │  │  PostgreSQL Database                       │ │
                    │  │                                            │ │
                    │  │  Core Tables:                              │ │
                    │  │  • mentors (source of truth)              │ │
                    │  │  • raw_mn_signups, raw_mn_setup, etc.    │ │
                    │  │  • raw_gb_full_contacts, raw_gb_members  │ │
                    │  │  • mn_gb_import (CSV export staging)     │ │
                    │  │                                            │ │
                    │  │  Management Tables: (NEW!)                │ │
                    │  │  • sync_configs (year-specific config)    │ │
                    │  │  • sync_conflicts (requires user decision)│ │
                    │  │  • sync_warnings (non-blocking issues)    │ │
                    │  │  • sync_errors (with retry tracking)      │ │
                    │  │  • mn_changes (audit trail)               │ │
                    │  │  • sync_log (operation history)           │ │
                    │  └───────────────────────────────────────────┘ │
                    │                                                 │
                    │  ┌───────────────────────────────────────────┐ │
                    │  │  Edge Functions (Deno, 10min timeout)     │ │
                    │  │                                            │ │
                    │  │  Sync Operations:                          │ │
                    │  │  • sync-jotform-signups                    │ │
                    │  │  • sync-jotform-setup                      │ │
                    │  │  • sync-jotform-training                   │ │
                    │  │  • sync-givebutter-members                 │ │
                    │  │  • sync-givebutter-contacts                │ │
                    │  │                                            │ │
                    │  │  ETL Operations:                           │ │
                    │  │  • etl-load-and-validate                   │ │
                    │  │  • etl-deduplicate                         │ │
                    │  │  • etl-match-contacts (conflict detection!)│ │
                    │  │  • etl-merge-data                          │ │
                    │  │  • etl-detect-changes                      │ │
                    │  │  • etl-populate-export                     │ │
                    │  │                                            │ │
                    │  │  Export Operations:                        │ │
                    │  │  • export-csv-stream                       │ │
                    │  │  • validate-export                         │ │
                    │  │                                            │ │
                    │  │  Orchestrators:                            │ │
                    │  │  • sync-orchestrator (run all syncs)       │ │
                    │  │  • etl-orchestrator (run all ETL steps)    │ │
                    │  └───────────────────────────────────────────┘ │
                    │                                                 │
                    │  ┌───────────────────────────────────────────┐ │
                    │  │  Supabase Storage (Optional)              │ │
                    │  │  • CSV exports (if needed)                │ │
                    │  │  • Logs archives                          │ │
                    │  └───────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │   Jotform API   │  │ Givebutter API  │  │  External CSVs  │
          │   (Forms)       │  │  (Contacts,     │  │  (Manual        │
          │                 │  │   Members)      │  │   Uploads)      │
          └─────────────────┘  └─────────────────┘  └─────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│  DEVELOPMENT ENVIRONMENT (Local)                                     │
│                                                                      │
│  backend/ scripts (Node.js + tsx)                                    │
│  • Run directly for debugging                                        │
│  • Import from src/lib/server/ (shared code)                        │
│  • Use local Supabase (http://127.0.0.1:54321)                      │
│  • Fast iteration, no deployment needed                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Shared Library Structure

**Key Innovation**: Code that works in BOTH Node.js (dev) and Deno (production)

```
src/lib/server/                    ← Runtime-agnostic shared code
├── config/
│   ├── supabase.ts                ← Supabase client factory
│   ├── sync-config-loader.ts      ← Load from sync_configs table
│   └── constants.ts               ← App-wide constants
├── clients/
│   ├── jotform.ts                 ← Jotform API client
│   ├── givebutter.ts              ← Givebutter API client
│   └── http.ts                    ← Generic HTTP client (fetch API)
├── processors/
│   ├── contact-selector.ts        ← Winner selection logic
│   ├── conflict-detector.ts       ← Conflict detection engine
│   ├── change-detector.ts         ← Detect what changed
│   └── duplicate-archiver.ts      ← Archive duplicates
├── transformers/
│   ├── phone-normalizer.ts        ← E.164 normalization
│   ├── email-normalizer.ts        ← Email cleaning
│   ├── name-builder.ts            ← Full name construction
│   └── status-calculator.ts       ← Mentor status logic
├── validators/
│   ├── mentor-validator.ts        ← Validate mentor data
│   ├── contact-validator.ts       ← Validate contact data
│   └── csv-validator.ts           ← Validate CSV format
├── utils/
│   ├── logger.ts                  ← Structured logging
│   ├── error-handler.ts           ← Error management
│   └── retry.ts                   ← Retry logic with backoff
└── types/
    └── index.ts                   ← Shared TypeScript types

supabase/functions/                ← Edge Functions (Deno)
├── _shared/                       ← Symlink to src/lib/server
├── sync-jotform-signups/
│   └── index.ts                   ← Imports from _shared
├── sync-givebutter-members/
│   └── index.ts
├── etl-match-contacts/
│   └── index.ts
└── sync-orchestrator/
    └── index.ts

backend/                           ← Development scripts (Node.js)
├── core/
│   ├── sync/
│   │   ├── jotform-signups.ts     ← Imports from src/lib/server
│   │   └── orchestrator.ts
│   └── etl/
│       └── process.ts
└── scripts/                       ← One-off admin scripts
    └── debug-csv-failures.ts
```

---

## Technology Stack Decisions

### Database: PostgreSQL (Supabase)
**Why**: Already using, excellent for this use case
**Schema Changes**: Add 4 new tables (see Phase 1)

### Backend Runtime: **Hybrid**

| Environment | Runtime | Use Case |
|-------------|---------|----------|
| **Production** | Deno (Supabase Edge Functions) | Long-running sync/ETL operations |
| **Development** | Node.js (tsx) | Local debugging, one-off scripts |
| **API Routes** | Node.js (Vercel) | Short CRUD operations, orchestration |

### Frontend: Next.js 16 + React 19
**Why**: Already using, works well
**Changes**: Add conflict resolution UI, improved sync dashboard

### Package Management

| Environment | Package Manager | Notes |
|-------------|----------------|-------|
| **Next.js** | npm | Keep existing |
| **Edge Functions** | JSR + npm via CDN | Deno-native |
| **Shared Code** | ESM modules | Import from `src/lib/server/` |

### Key Libraries

| Purpose | Library | Compatible? | Notes |
|---------|---------|-------------|-------|
| **Supabase Client** | `@supabase/supabase-js` | ✅ Yes | Works in both Node & Deno |
| **CSV Parsing** | `csv-parse` | ✅ Yes | Available via npm: CDN |
| **CSV Generation** | `csv-stringify` | ✅ Yes | Available via npm: CDN |
| **HTTP Client** | Native `fetch` | ✅ Yes | Built-in to both runtimes |
| **Logging** | Custom Logger class | ✅ Yes | No external deps |
| **Validation** | Zod (optional) | ✅ Yes | Works everywhere |

---

## Phased Implementation

### Overview: 6 Phases Over 8-10 Weeks

```
Week 1-2:  Phase 0 - Critical Fixes (URGENT)
Week 2-3:  Phase 1 - Foundation (Database + Config)
Week 3-4:  Phase 2 - Core Refactoring (ETL + Conflicts)
Week 4-6:  Phase 3 - Serverless Migration (Edge Functions)
Week 6-7:  Phase 4 - Integration & Testing
Week 7-8:  Phase 5 - Production Deployment
Week 8-10: Phase 6 - Optimization & Polish
```

---

## Phase 0: Critical Fixes (Week 1-2)
**Goal**: Stop the bleeding - fix immediate CSV upload issues

### Tasks

#### 0.1 - Fix Stale Contact Data (URGENT - Day 1-2)
- [ ] Download fresh Givebutter export (all 40k+ contacts)
- [ ] Upload to `raw_gb_full_contacts` table
- [ ] Verify External IDs are up-to-date

#### 0.2 - Fix Contact Matching Logic (Day 2-3)
- [ ] Update `backend/core/etl/process.ts:530`
- [ ] Priority: External ID → Phone/Email
- [ ] Add validation: reject mismatched External IDs

#### 0.3 - Re-run ETL & Export (Day 3-4)
- [ ] Run ETL with fresh contact data
- [ ] Generate new CSV export
- [ ] Validate CSV (check for conflicts)

#### 0.4 - Verify Upload (Day 4-5)
- [ ] Upload CSV to Givebutter
- [ ] Target: **0 errors** (down from 29)
- [ ] Document any remaining issues

**Deliverable**: Working CSV upload with 0 errors
**Dependencies**: None (do this NOW)
**Risk**: High if not done - production blocked

---

## Phase 1: Foundation (Week 2-3)
**Goal**: Build the foundation for both refactoring and migration

### Tasks

#### 1.1 - Database Schema Updates
Create new tables for conflict management and change tracking:

```sql
-- Execute these migrations via Supabase migration

-- 1. Rename mn_errors → sync_errors
ALTER TABLE mn_errors RENAME TO sync_errors;

-- 2. Enhance sync_errors
ALTER TABLE sync_errors
  ADD COLUMN severity TEXT DEFAULT 'error',
  ADD COLUMN can_retry BOOLEAN DEFAULT FALSE,
  ADD COLUMN retry_count INTEGER DEFAULT 0,
  ADD COLUMN next_retry_at TIMESTAMPTZ,
  ADD COLUMN resolved BOOLEAN DEFAULT FALSE;

-- 3. Create sync_configs (year-specific configuration)
CREATE TABLE sync_configs (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'string',
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(year, config_key)
);

-- Populate with 2025 config
INSERT INTO sync_configs (year, config_key, config_value, description) VALUES
  (2025, 'jotform_signup_form_id', '250685983663169', 'Mentor Sign Up Form'),
  (2025, 'jotform_setup_form_id', '250754977634066', 'Givebutter Setup Form'),
  (2025, 'jotform_training_form_id', '252935716589069', 'Training Sign Up'),
  (2025, 'givebutter_campaign_code', 'SWABUGA2025', 'Campaign code'),
  (2025, 'fundraising_goal', '75', 'Goal per mentor');

-- 4. Create mn_changes (audit trail)
CREATE TABLE mn_changes (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  source_table TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  synced_to_gb BOOLEAN DEFAULT FALSE,
  CHECK (change_type IN ('dropped', 'field_change', 'status_change', 'new_mentor'))
);

-- 5. Create sync_conflicts (user decisions needed)
CREATE TABLE sync_conflicts (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  conflict_type TEXT NOT NULL,
  option_a JSONB NOT NULL,
  option_b JSONB NOT NULL,
  context JSONB,
  recommended_option TEXT,
  recommendation_reason TEXT,
  status TEXT DEFAULT 'pending',
  user_decision TEXT,
  custom_value TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'medium',
  CHECK (conflict_type IN ('contact_selection', 'phone_mismatch', 'email_mismatch', 'external_id_collision')),
  CHECK (status IN ('pending', 'resolved', 'skipped'))
);

-- 6. Create sync_warnings (non-blocking issues)
CREATE TABLE sync_warnings (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  warning_type TEXT NOT NULL,
  warning_message TEXT NOT NULL,
  field_name TEXT,
  current_value TEXT,
  suggested_value TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'low'
);

-- 7. Update mentors table
ALTER TABLE mentors
  ADD COLUMN IF NOT EXISTS dropped BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shift_preference TEXT,
  ADD COLUMN IF NOT EXISTS partner_preference TEXT;
```

**Files to Create**:
- `supabase/migrations/YYYYMMDDHHMMSS_add_conflict_management.sql`

#### 1.2 - Config System Implementation

**Create**: `src/lib/server/config/sync-config-loader.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

export interface SyncConfig {
  jotformSignupFormId: string;
  jotformSetupFormId: string;
  jotformTrainingFormId: string;
  givebutterCampaignCode: string;
  givebutterMentorTag: string;
  fundraisingGoal: number;
  eventDate: string;
}

export async function loadSyncConfig(
  year: number,
  supabaseUrl: string,
  supabaseKey: string
): Promise<SyncConfig> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('year', year)
    .eq('active', true);

  if (error) throw error;

  const getConfig = (key: string): string => {
    const config = data?.find(c => c.config_key === key);
    if (!config) throw new Error(`Missing config: ${key} for year ${year}`);
    return config.config_value;
  };

  return {
    jotformSignupFormId: getConfig('jotform_signup_form_id'),
    jotformSetupFormId: getConfig('jotform_setup_form_id'),
    jotformTrainingFormId: getConfig('jotform_training_form_id'),
    givebutterCampaignCode: getConfig('givebutter_campaign_code'),
    givebutterMentorTag: getConfig('givebutter_mentor_tag'),
    fundraisingGoal: parseInt(getConfig('fundraising_goal')),
    eventDate: getConfig('event_date'),
  };
}
```

#### 1.3 - Shared Library Setup

**Directory Structure**:
```bash
mkdir -p src/lib/server/{config,clients,processors,transformers,validators,utils,types}
```

**Copy Files** (from existing backend):
- `backend/lib/utils/logger.ts` → `src/lib/server/utils/logger.ts`
- `backend/lib/utils/validators.ts` → `src/lib/server/validators/`
- `backend/lib/infrastructure/clients/` → `src/lib/server/clients/`

**Test**: Verify all imports resolve correctly

#### 1.4 - Update Existing Scripts to Use Config

**Files to Update**:
- `backend/core/sync/jotform-signups.ts`
- `backend/core/sync/jotform-setup.ts`
- `backend/core/sync/jotform-training-signup.ts`
- `backend/core/sync/givebutter-members.ts`

**Pattern**:
```typescript
// OLD
const SIGNUP_FORM_ID = '250685983663169';

// NEW
import { loadSyncConfig } from '../../lib/server/config/sync-config-loader';
const config = await loadSyncConfig(2025, supabaseUrl, supabaseKey);
const signups = await fetchJotform(config.jotformSignupFormId);
```

**Deliverable**: All scripts use `sync_configs` table
**Dependencies**: Database migrations (1.1)
**Risk**: Low - backward compatible

---

## Phase 2: Core Refactoring (Week 3-4)
**Goal**: Modularize ETL, add conflict detection

### Tasks

#### 2.1 - Break Down ETL into Modules

**Current State**: `backend/core/etl/process.ts` (977 lines)
**Target**: 8 focused modules (< 150 lines each)

**New Structure**:
```
src/lib/server/etl/
├── orchestrator.ts              # Coordinates all steps
├── steps/
│   ├── 01-load-raw.ts          # Load from raw_* tables
│   ├── 02-validate.ts          # Validate mn_ids, phones
│   ├── 03-deduplicate.ts       # Dedupe by phone (keep recent)
│   ├── 04-match-contacts.ts   # Match to GB contacts (WITH CONFLICT DETECTION)
│   ├── 05-merge-data.ts        # Compile mentors table
│   ├── 06-detect-changes.ts    # Track what changed → mn_changes
│   ├── 07-populate-export.ts   # Generate mn_gb_import
│   └── 08-archive-duplicates.ts# Archive losing contacts
└── types.ts                     # ETL-specific types
```

**Each Step Interface**:
```typescript
export interface ETLStep {
  name: string;
  execute(context: ETLContext): Promise<ETLStepResult>;
}

export interface ETLContext {
  supabase: SupabaseClient;
  logger: Logger;
  config: SyncConfig;
  // Shared data between steps
  signups: Signup[];
  contacts: Contact[];
  mentors: Mentor[];
  conflicts: Conflict[];
  changes: Change[];
}

export interface ETLStepResult {
  success: boolean;
  recordsProcessed: number;
  errors: Error[];
  metrics: Record<string, any>;
}
```

**Migration Strategy**:
1. Create new module structure
2. Extract logic from `process.ts` step by step
3. Test each module independently
4. Keep old `process.ts` as backup until all modules work
5. Delete old file once proven

#### 2.2 - Implement Conflict Detection

**Create**: `src/lib/server/processors/conflict-detector.ts`

**Features**:
- Detect contact selection conflicts (multiple candidates with similar scores)
- Detect phone/email mismatches
- Detect External ID collisions
- Auto-resolve when confidence is high (>100 point score difference)
- Create conflict record when confidence is low

**Integration**:
```typescript
// In 04-match-contacts.ts
const conflictDetector = new ConflictDetector(context.supabase, context.logger);

for (const signup of signups) {
  const candidates = findContactCandidates(signup);
  const result = await conflictDetector.detectContactSelectionConflict(
    signup.mn_id,
    candidates
  );

  if (result.hasConflict && !result.autoResolve) {
    // Log conflict for user to resolve
    await conflictDetector.logConflict(result.conflict);
    context.conflicts.push(result.conflict);
    continue; // Skip this mentor for now
  }

  // Use auto-resolved winner
  signup.gb_contact_id = result.winner.contact_id;
}
```

#### 2.3 - Implement Change Detection

**Create**: `src/lib/server/processors/change-detector.ts`

**Logic**:
```typescript
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

  // Check "dropped" status
  if (newMentor.dropped && !oldMentor.dropped) {
    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'dropped',
      old_value: 'false',
      new_value: 'true',
      source_table: 'raw_gb_full_contacts',
    });
  }

  // Check important fields
  const trackedFields = ['phone', 'personal_email', 'training_signup', 'amount_raised'];

  for (const field of trackedFields) {
    if (oldMentor[field] !== newMentor[field]) {
      changes.push({
        mn_id: newMentor.mn_id,
        change_type: 'field_change',
        field_name: field,
        old_value: String(oldMentor[field]),
        new_value: String(newMentor[field]),
        source_table: sourceTable,
      });
    }
  }

  return changes;
}
```

#### 2.4 - Separate Core from Features

**Move Files**:
- `backend/features/comms/tools/export.ts` → `src/lib/server/export/csv-exporter.ts`
- `backend/features/comms/tools/validate.ts` → `src/lib/server/export/csv-validator.ts`

**Update npm Scripts**:
```json
{
  "scripts": {
    "export:csv": "tsx src/lib/server/export/csv-exporter.ts",
    "validate:csv": "tsx src/lib/server/export/csv-validator.ts"
  }
}
```

**Simplify Comms Scripts**:
```typescript
// backend/features/comms/campaigns/training-reminder.ts

// Only do message generation, NO sync logic
export async function generateTrainingReminderMessages() {
  const supabase = createClient(/* ... */);

  // 1. READ from mentors
  const { data: mentors } = await supabase
    .from('mentors')
    .select('*')
    .eq('training_signup_done', false);

  // 2. Generate messages
  const updates = mentors.map(m => ({
    mn_id: m.mn_id,
    '📱Custom Text Message 1️⃣': generateTextMessage(m),
  }));

  // 3. UPSERT to mn_gb_import (ONLY message fields)
  for (const update of updates) {
    await supabase
      .from('mn_gb_import')
      .update({ '📱Custom Text Message 1️⃣': update['📱Custom Text Message 1️⃣'] })
      .eq('Contact External ID', update.mn_id);
  }

  // Core sync handles the rest (CSV export → Upload to GB)
}
```

**Deliverable**: Modular ETL with conflict detection
**Dependencies**: Phase 1 complete
**Risk**: Medium - requires thorough testing

---

## Phase 3: Serverless Migration (Week 4-6)
**Goal**: Move long-running operations to Supabase Edge Functions

### Tasks

#### 3.1 - Set Up Edge Functions Environment

**Install Supabase CLI**:
```bash
brew install supabase/tap/supabase
```

**Initialize Edge Functions**:
```bash
cd supabase
supabase functions new sync-jotform-signups
supabase functions new sync-givebutter-members
supabase functions new etl-orchestrator
supabase functions new export-csv-stream
```

**Create Shared Code Symlink**:
```bash
cd supabase/functions
ln -s ../../src/lib/server _shared
```

**Configure Deno Import Map** (`supabase/functions/import_map.json`):
```json
{
  "imports": {
    "@/lib/": "../../src/lib/server/",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.47.10",
    "csv-stringify": "npm:csv-stringify@^6.6.0",
    "csv-parse": "npm:csv-parse@^6.1.0"
  }
}
```

#### 3.2 - Convert First Sync Script (Pilot)

**Migrate**: `backend/core/sync/jotform-signups.ts` → `supabase/functions/sync-jotform-signups/index.ts`

**Pattern**:
```typescript
// supabase/functions/sync-jotform-signups/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'
import { JotformClient } from '@/lib/clients/jotform.ts'
import { loadSyncConfig } from '@/lib/config/sync-config-loader.ts'
import { Logger } from '@/lib/utils/logger.ts'

serve(async (req) => {
  const logger = new Logger('sync-jotform-signups');

  try {
    // 1. Get config from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jotformApiKey = Deno.env.get('JOTFORM_API_KEY')!;

    const config = await loadSyncConfig(2025, supabaseUrl, supabaseKey);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Create Jotform client
    const jotformClient = new JotformClient({ apiKey: jotformApiKey, logger });

    // 3. Fetch submissions
    logger.info('Fetching Jotform submissions...');
    const submissions = await jotformClient.getFormSubmissions(
      config.jotformSignupFormId
    );

    logger.info(`Fetched ${submissions.length} submissions`);

    // 4. Transform and upsert to raw_mn_signups
    const transformed = submissions.map(transformSubmission);

    const { error } = await supabase
      .from('raw_mn_signups')
      .upsert(transformed, { onConflict: 'submission_id' });

    if (error) throw error;

    logger.info('Sync complete');

    // 5. Return results
    return new Response(
      JSON.stringify({
        success: true,
        recordsSynced: transformed.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error('Sync failed', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
})
```

**Test Locally**:
```bash
supabase functions serve sync-jotform-signups --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/sync-jotform-signups
```

**Deploy**:
```bash
supabase functions deploy sync-jotform-signups --project-ref your-project-ref
```

#### 3.3 - Convert All Sync Scripts

**Migrate**:
- `sync-jotform-setup`
- `sync-jotform-training`
- `sync-givebutter-members`
- `sync-givebutter-contacts`

**Use Same Pattern** as 3.2

#### 3.4 - Convert ETL to Edge Functions

**Strategy**: ETL is monolithic - break into **steps** that can be chained

**Create**:
- `etl-load-and-validate` (step 1-2)
- `etl-deduplicate` (step 3)
- `etl-match-contacts` (step 4, includes conflict detection)
- `etl-merge-data` (step 5)
- `etl-detect-changes` (step 6)
- `etl-populate-export` (step 7)
- `etl-orchestrator` (calls all steps in order)

**Alternative**: Single `etl-full` function that runs all steps (simpler, but longer runtime)

**Decision**: Start with **single function**, split if timeout issues occur

#### 3.5 - Create CSV Export Edge Function

**Challenge**: Can't write to filesystem in Edge Functions

**Solution**: Stream CSV directly to response

```typescript
// supabase/functions/export-csv-stream/index.ts
import { stringify } from 'csv-stringify'

serve(async (req) => {
  const supabase = createClient(/* ... */);

  // Fetch data
  const { data: exportData } = await supabase
    .from('mn_gb_import')
    .select('*')
    .order('mn_id');

  // Create CSV stream
  const stringifier = stringify({
    header: true,
    columns: ['Givebutter Contact ID', 'First Name', /* ... */]
  });

  // Stream to response
  const stream = new ReadableStream({
    start(controller) {
      stringifier.on('data', (chunk) => controller.enqueue(chunk));
      stringifier.on('end', () => controller.close());

      for (const record of exportData) {
        stringifier.write(record);
      }
      stringifier.end();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="givebutter-import.csv"'
    }
  });
})
```

#### 3.6 - Create Orchestrator Edge Function

**Purpose**: Chain all sync + ETL operations

```typescript
// supabase/functions/sync-orchestrator/index.ts
serve(async (req) => {
  const logger = new Logger('orchestrator');
  const results = [];

  const steps = [
    'sync-jotform-signups',
    'sync-jotform-setup',
    'sync-jotform-training',
    'sync-givebutter-members',
    'etl-full',
  ];

  for (const step of steps) {
    logger.info(`Running: ${step}`);

    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/${step}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        }
      }
    );

    const result = await response.json();
    results.push({ step, ...result });

    if (!result.success) {
      logger.error(`Step ${step} failed, stopping orchestration`);
      break;
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" }
  });
})
```

**Deliverable**: All sync/ETL operations running as Edge Functions
**Dependencies**: Phase 2 complete
**Risk**: Medium - runtime compatibility issues possible

---

## Phase 4: Integration & Testing (Week 6-7)
**Goal**: Wire up frontend, API routes, and crons

### Tasks

#### 4.1 - Refactor API Routes

**Update**: `src/app/api/sync/run/route.ts`

```typescript
// OLD: spawn() tsx scripts
const child = spawn('tsx', [scriptPath]);

// NEW: Invoke Edge Function
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Stream progress via SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendUpdate = (message: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
      };

      try {
        // Call orchestrator Edge Function
        sendUpdate('Starting sync orchestrator...');

        const response = await fetch(
          `${supabaseUrl}/functions/v1/sync-orchestrator`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
            }
          }
        );

        const result = await response.json();

        for (const stepResult of result.results) {
          sendUpdate(`${stepResult.step}: ${stepResult.success ? '✅' : '❌'}`);
        }

        controller.close();
      } catch (error) {
        sendUpdate(`Error: ${error.message}`);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  });
}
```

**Update All API Routes**:
- `/api/sync/run`
- `/api/sync/jotform`
- `/api/sync/givebutter`
- `/api/etl/run`
- `/api/export/generate`

#### 4.2 - Build Conflict Resolution UI

**Create**: `src/app/conflicts/page.tsx`

**Features**:
- List all pending conflicts
- Show side-by-side comparison (Option A vs Option B)
- Display system recommendation with reasoning
- Allow user to choose A, B, or custom value
- Bulk actions: "Accept all recommendations"

**API Route**: `src/app/api/conflicts/[id]/resolve/route.ts`

```typescript
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { decision, custom_value, resolved_by } = await request.json();
  const supabase = createClient(/* ... */);

  // 1. Get conflict
  const { data: conflict } = await supabase
    .from('sync_conflicts')
    .select('*')
    .eq('id', params.id)
    .single();

  // 2. Apply decision to mentors table
  const resolvedValue = decision === 'custom'
    ? custom_value
    : conflict[`option_${decision}`].value;

  if (conflict.conflict_type === 'phone_mismatch') {
    await supabase
      .from('mentors')
      .update({ phone: resolvedValue })
      .eq('mn_id', conflict.mn_id);
  }

  // 3. Mark conflict as resolved
  await supabase
    .from('sync_conflicts')
    .update({
      status: 'resolved',
      user_decision: decision,
      resolved_at: new Date().toISOString(),
      resolved_by,
    })
    .eq('id', params.id);

  return NextResponse.json({ success: true });
}
```

#### 4.3 - Set Up Vercel Cron

**Create**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-periodic",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Create**: `src/app/api/cron/sync-periodic/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Trigger sync orchestrator
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/sync-orchestrator`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${anonKey}` }
    }
  );

  const result = await response.json();

  return NextResponse.json(result);
}
```

#### 4.4 - Comprehensive Testing

**Test Matrix**:

| Test Case | Environment | Expected Result |
|-----------|-------------|-----------------|
| Fresh sync (empty DB) | Local | All tables populated |
| Incremental sync | Local | Only new records added |
| Duplicate detection | Local | Duplicates flagged |
| Conflict detection (close scores) | Local | Conflict created |
| Conflict detection (clear winner) | Local | Auto-resolved |
| Change detection | Local | Changes logged to mn_changes |
| CSV export | Local | Valid CSV generated |
| Edge Function: sync-jotform | Supabase staging | Data in raw_mn_signups |
| Edge Function: etl-full | Supabase staging | Mentors table updated |
| Edge Function: orchestrator | Supabase staging | All steps complete |
| API Route: /api/sync/run | Vercel preview | SSE stream works |
| Conflict resolution UI | Vercel preview | Can resolve conflict |
| Vercel Cron | Vercel production | Triggers on schedule |

**Load Testing**:
- 1000+ submissions
- 50+ conflicts
- 10+ concurrent sync requests

**Deliverable**: Fully integrated system with UI
**Dependencies**: Phase 3 complete
**Risk**: Medium - integration bugs likely

---

## Phase 5: Production Deployment (Week 7-8)
**Goal**: Deploy to production, monitor closely

### Tasks

#### 5.1 - Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Edge Functions deployed to production
- [ ] Database migrations applied to production
- [ ] Environment variables configured
- [ ] Backup of production database taken
- [ ] Rollback plan documented

#### 5.2 - Staged Deployment

**Week 7 - Day 1**: Deploy Edge Functions
```bash
supabase functions deploy --project-ref prod-ref
```
- Monitor logs for 24 hours
- Test manual invocation
- Don't enable auto-sync yet

**Week 7 - Day 3**: Deploy Next.js App
```bash
vercel --prod
```
- Smoke test UI
- Test manual sync trigger
- Monitor error rate

**Week 7 - Day 5**: Enable Cron Jobs
- Update `vercel.json` in production
- Set `CRON_SECRET` env var
- Monitor first scheduled execution

#### 5.3 - Monitoring & Alerting

**Set Up**:
- Supabase Edge Function logs
- Vercel function logs
- Database query performance monitoring
- Error tracking (Sentry or similar)

**Alerts**:
- Sync failure (email/Slack)
- High conflict rate (>10%)
- API timeout
- Database errors

#### 5.4 - Documentation

**Create**:
- Deployment guide
- Troubleshooting guide
- User manual for conflict resolution
- API documentation

**Deliverable**: Production system live
**Dependencies**: Phase 4 complete
**Risk**: High - production issues expected

---

## Phase 6: Optimization & Polish (Week 8-10)
**Goal**: Improve performance, add nice-to-have features

### Tasks

#### 6.1 - Performance Optimization

- [ ] Profile Edge Functions (identify bottlenecks)
- [ ] Add database indexes for common queries
- [ ] Implement batch processing for large datasets
- [ ] Cache config in memory (reduce DB queries)
- [ ] Parallel processing where possible

#### 6.2 - Enhanced Features

- [ ] Real-time sync status (WebSocket)
- [ ] Sync history dashboard with charts
- [ ] Bulk conflict resolution
- [ ] Export conflict report to CSV
- [ ] Email notifications for conflicts
- [ ] Automatic retry for failed syncs

#### 6.3 - Developer Experience

- [ ] Improve local development setup
- [ ] Add E2E test suite
- [ ] Create seed data for testing
- [ ] Add code comments and JSDoc
- [ ] Create architecture diagrams

#### 6.4 - Prepare for 2026

- [ ] Test year-switching (2025 → 2026)
- [ ] Document process for adding new forms
- [ ] Create template for new campaigns
- [ ] Archive 2025 data (if needed)

**Deliverable**: Polished, optimized system
**Dependencies**: Phase 5 complete
**Risk**: Low - non-critical features

---

## Critical Path

### What MUST happen in order:

```
Phase 0: Fix CSV Issues
  └─> Phase 1: Database + Config Foundation
      └─> Phase 2: Core Refactoring (ETL + Conflicts)
          ├─> Phase 3: Serverless Migration
          │   └─> Phase 4: Integration & Testing
          │       └─> Phase 5: Production Deployment
          │           └─> Phase 6: Optimization
          └─> (Optional) Can deploy without full migration
```

### Parallel Work Streams

Some tasks can happen simultaneously:

```
Week 2-3:
├─ [Team A] Phase 1 - Database Schema + Config System
└─ [Team B] Phase 2 - Start ETL refactoring

Week 3-4:
├─ [Team A] Phase 3 - Set up Edge Functions environment
└─ [Team B] Phase 2 - Continue ETL + conflict detection

Week 4-5:
├─ [Team A] Phase 3 - Migrate sync scripts to Edge Functions
├─ [Team B] Phase 3 - Migrate ETL to Edge Functions
└─ [Team C] Phase 4 - Build conflict resolution UI

Week 5-6:
├─ [Team A] Phase 4 - API route refactoring
├─ [Team B] Phase 4 - Testing
└─ [Team C] Phase 4 - Cron setup
```

---

## Risk Assessment

### High Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Deno Compatibility** | Edge Functions fail | Test all libraries early, have Node.js fallback |
| **Edge Function Timeouts** | Syncs fail | Optimize, batch, or use background jobs |
| **Data Loss During Migration** | CRITICAL | Thorough testing, database backups, rollback plan |
| **Production Downtime** | User-facing | Staged deployment, feature flags, instant rollback |
| **Conflict Detection False Positives** | User frustration | Tune scoring algorithm, allow bulk accept |

### Medium Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| **CSV Format Changes** | Upload failures | Validation layer, schema versioning |
| **API Rate Limits** | Sync slowdowns | Implement retry with backoff, queue system |
| **Database Performance** | Slow queries | Indexes, query optimization, caching |
| **Timezone Issues** | Data inconsistencies | Use UTC everywhere, convert at display |

### Low Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| **UI Bugs** | Minor UX issues | Thorough testing, user feedback |
| **Documentation Gaps** | Dev confusion | Continuous documentation updates |
| **Config Mistakes** | Wrong form IDs | Validation, staging environment |

---

## Success Metrics

### Phase 0 Success
- ✅ CSV uploads to Givebutter: **0 errors** (down from 29)
- ✅ Contact matching accuracy: **100%**

### Phase 1 Success
- ✅ All sync scripts use `sync_configs` table
- ✅ Year can be switched by updating config (no code changes)
- ✅ All 4 new tables created and working

### Phase 2 Success
- ✅ ETL broken into 8 modules (< 150 lines each)
- ✅ Conflict detection catches ambiguous cases
- ✅ Auto-resolve works for clear winners (>90% of cases)
- ✅ Change tracking logs all field changes

### Phase 3 Success
- ✅ All sync operations running as Edge Functions
- ✅ Edge Functions complete in < 10 minutes
- ✅ CSV export streams correctly (no temp files)
- ✅ Orchestrator chains all steps successfully

### Phase 4 Success
- ✅ Conflict resolution UI functional
- ✅ API routes invoke Edge Functions (no `spawn()`)
- ✅ Vercel Cron triggers on schedule
- ✅ All tests passing

### Phase 5 Success
- ✅ Production deployment successful
- ✅ Zero downtime during deployment
- ✅ Error rate < 1%
- ✅ Scheduled syncs running automatically

### Phase 6 Success
- ✅ Sync time < 5 minutes (down from 10+)
- ✅ Real-time status updates working
- ✅ Developer onboarding < 1 hour
- ✅ Ready for 2026 transition

---

## Next Steps

1. **Review this plan** - Get feedback, adjust priorities
2. **Assign owners** - Who owns each phase?
3. **Set timeline** - Firm dates for each phase
4. **Start Phase 0** - Fix CSV issues ASAP
5. **Parallel prep** - Begin Phase 1 planning while Phase 0 executes

---

## Appendix: Key Decisions

### Decision 1: Hybrid Architecture (Vercel + Edge Functions)
**Rationale**: Best balance of Vercel's frontend excellence and Supabase's backend power
**Alternatives Considered**: All-Vercel (with Inngest), All-Supabase (with custom frontend)

### Decision 2: Refactor During Migration
**Rationale**: Avoids refactoring twice, ensures new system is clean
**Alternatives Considered**: Refactor first (slower), Migrate first (technical debt)

### Decision 3: Config-Driven Architecture
**Rationale**: Makes year-switching trivial, reduces code changes
**Alternatives Considered**: Hardcoded values (inflexible), env vars (messy)

### Decision 4: Conflict Detection System
**Rationale**: Prevents data corruption, builds trust in automation
**Alternatives Considered**: Always auto-resolve (risky), Always ask user (annoying)

### Decision 5: Database as Source of Truth
**Rationale**: Stateless Edge Functions, better observability
**Alternatives Considered**: In-memory state (doesn't scale), File-based (not serverless)

---

**Last Updated**: October 27, 2025
**Status**: Draft - Awaiting Review
**Next Action**: Get stakeholder approval, assign phase owners
