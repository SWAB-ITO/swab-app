# Unified Architecture & Refactoring Plan
## Serverless Migration + Backend Refactoring

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

## Current Implementation Status

**Last Audit:** October 29, 2025
**Overall Progress:** ~55% Complete (Phase 0 & 1 COMPLETE, core system production-ready)

### ✅ Phase 0 & 1 Complete (See completion reports)

**Phase 0** - Critical Fixes: ✅ 100% Complete
- 0 CSV upload errors (955/955 mentors uploaded successfully)
- External ID conflict prevention implemented
- Contact matching logic hardened
- *Documented in:* `PHASE_0_COMPLETE.md`

**Phase 1** - Foundation: ✅ 100% Complete (Infrastructure)
- Database tables created (`sync_configs`, `sync_conflicts`, `sync_warnings`, enhanced `mn_changes`)
- Config loader system built (`src/lib/server/config/sync-config-loader.ts`)
- Shared library structure established (`src/lib/server/`)
- Migration applied (`20251028000000_phase1_foundation.sql`)
- *Documented in:* `PHASE_1_COMPLETE.md`

### ✅ What's Fully Implemented (Production-Ready)

| Component | Location | Size | Status |
|-----------|----------|------|--------|
| **ETL Pipeline** | `backend/core/etl/process.ts` | 1,136 lines | ✅ Production-hardened (monolithic) |
| **Contact Matching** | `backend/core/services/contact-matching.ts` | 18KB | ✅ O(1) lookups + conflict prevention |
| **Database Schema** | `supabase/migrations/` | 5 migrations | ✅ All Phase 1 tables created |
| **Sync Orchestration** | `backend/core/sync/orchestrator.ts` | 279 lines | ✅ SSE streaming, error handling |
| **Sync Scripts** | `backend/core/sync/` | 10 scripts | ✅ Modular, some using config loader |
| **Config System** | `src/lib/server/config/` | Dual system | ⚠️ Partially adopted (see below) |
| **API Routes** | `src/app/api/` | 14 routes | ✅ Dashboard, mentors, sync, SSE |
| **Frontend UI** | `src/app/`, `src/components/` | 30+ components | ✅ Complete with check-in system |
| **Shared Library** | `src/lib/server/` | 6 directories | ✅ Runtime-agnostic structure |

**Key Achievement:** Production-ready application with full sync pipeline, check-in system, and SSE real-time progress streaming.

### ⚠️ What's Partially Implemented

| Component | Status | Issue |
|-----------|--------|-------|
| **Config Loader Adoption** | ⚠️ Partial | `jotform-signups.ts` uses it, but orchestrator and other scripts still use old `sync_config` table |
| **ETL Modularization** | ⚠️ Pending | Grew from 977 to 1,136 lines (production fixes), needs Phase 2 refactor |
| **Conflict Detection** | ⚠️ Tables exist | Database infrastructure ready, but no API/UI implementation yet |

### ❌ What's Missing (Phase 2+ Features)

| Component | Phase | Impact |
|-----------|-------|--------|
| **Conflict Resolution UI/API** | Phase 2 | Can't manually resolve conflicts (tables exist but unused) |
| **Change Detection Logic** | Phase 2 | `mn_changes` table exists but no auto-tracking code |
| **Contact Archival System** | Phase 2 | Can't clean up duplicates automatically via GB API |
| **ETL Modularization** | Phase 2 | 1,136-line monolith hard to test/maintain |
| **Complete Config Migration** | Phase 2 | Need to migrate all scripts from `sync_config` to `sync_configs` |
| **Supabase Edge Functions** | Phase 3 | None created yet (needed for Vercel timeout bypass) |
| **Partner Matching Logic** | Phase 2 | New requirement: Partner form integration (ID: 252988541198170) |
| **Status Category Rework** | Phase 2 | New requirement: Multi-status system (dropped, no_page, no_training, etc.) |
| **GB Website Field** | Phase 2 | New requirement: Export mentor's GB page URL as contact website |
| **UGA Class Logic Fix** | Phase 2 | New requirement: Training form first, fallback to signup |

### 📊 Implementation by Phase

```
Phase 0 (Critical Fixes):        ██████████ 100% ✅ COMPLETE
Phase 1 (Foundation):            ██████████ 100% ✅ COMPLETE
Phase 2 (Core Refactoring):      ███░░░░░░░  30% (ETL working, partial config adoption)
Phase 3 (Serverless Migration):  ░░░░░░░░░░   0% (Not started)
Phase 4 (Integration & Testing): ░░░░░░░░░░   0% (Not started)
Phase 5 (Production Deployment): ░░░░░░░░░░   0% (Not started)
Phase 6 (Optimization):          ░░░░░░░░░░   0% (Not started)
```

**Overall:** 55% Complete (Foundation solid, ready for Phase 2)

**Next Immediate Steps (Phase 2):**
1. Complete config loader migration across all sync scripts (2 hours)
2. Implement conflict resolution API + UI (8 hours)
3. Add new requirements (GB website, UGA class fix, partner form, status rework) (6 hours)
4. Modularize ETL into focused step modules (12 hours)

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
| **ETL Simplification** | Break 1,136-line file into modules | MEDIUM |
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

## Quick Win Features (Optional - Before Refactoring)

These features can be implemented quickly and independently from the main refactoring plan:

### GB Import Download from Mentors Page

**Goal**: Add ability to download up-to-date Givebutter import CSV from the mentors page

**Value**: Allows manual GB imports with current data including manual edits

**Implementation** (1-2 hours):
```typescript
// New API route: /api/mentors/export/gb-import
// GET /api/mentors/export/gb-import?status=active&fundraised=true

1. Query mentors table with optional filters (status, fundraising, training)
2. Transform to GB CSV format using mn_gb_import column mapping
3. Include custom fields from config/custom-fields.json
4. Return as downloadable CSV file
```

**Features**:
- ✅ Export all mentors (quick button)
- ✅ Filtered export (by status, fundraising completion, training completion, campaign membership)
- ✅ Real-time data from mentors table (includes manual edits)
- ✅ Uses existing GB import format

**UI Addition**:
- Add "Download GB Import" button to `/mentors` page
- Add optional filter panel (collapsible)

**Benefits**:
- No dependency on ETL or scheduled exports
- Always reflects current state including manual edits
- Can be used for emergency GB updates

---

## Phased Implementation

### Overview: 6 Phases

```
Phase 0 - Critical Fixes                ✅ COMPLETE (See PHASE_0_COMPLETE.md)
Phase 1 - Foundation                    ✅ COMPLETE (See PHASE_1_COMPLETE.md)
Phase 2 - Core Refactoring              🔨 IN PROGRESS (30% complete)
Phase 3 - Serverless Migration          📋 PLANNED
Phase 4 - Integration & Testing         📋 PLANNED
Phase 5 - Production Deployment         📋 PLANNED
Phase 6 - Optimization & Polish         📋 PLANNED
```

**Note**: Phase 0 and Phase 1 sections have been removed from this document as they are comprehensively documented in their respective completion reports (`PHASE_0_COMPLETE.md` and `PHASE_1_COMPLETE.md`). This document now focuses on Phase 2 onward.

---

---

## Phase 2: Core Refactoring
**Goal**: Modularize ETL, add conflict detection, protect manually-set fields

**Current Status**: ⚠️ 20% Complete (ETL works but not modular, no conflict/change detection implemented)

**🚨 CRITICAL FIX**: Currently, the ETL overwrites manually-set event-day fields (`training_at`, `fundraised_at`, `notes`) on every sync run. Phase 2 will implement the protected fields system defined in the conflict rules (see section 2.3.2) to preserve these values.

### Tasks

#### 2.1 - Break Down ETL into Modules

**Current State**: `backend/core/etl/process.ts` (1,136 lines)
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

**Philosophy: When to Create Conflicts**

**Auto-Resolve (High Confidence):**
- Clear priority rules (e.g., Jotform always wins for signup data)
- One option significantly better (completeness score >20% higher)
- Recent data vs very stale data (>90 days old)

**Create Conflict (Low Confidence):**
- Equal scoring (within 10% of each other)
- Both options have same recency
- Conflicting data from equally authoritative sources
- High-impact fields (phone, email, contact_id)

**Full Implementation:**

```typescript
// src/lib/server/processors/conflict-detector.ts

import { Logger } from '@/lib/server/utils/logger';

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

**Integration with ETL:**

```typescript
// In 04-match-contacts.ts
const conflictDetector = new ConflictDetector(context.supabase, context.logger);

for (const signup of signups) {
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
    await conflictDetector.logConflict(conflictResult.conflict!, context.syncLogId);
    context.logger.warn(`Skipping ${signup.mn_id} due to contact selection conflict`);
    continue; // Skip this mentor for now
  }

  // Use the resolved contact
  signup.gb_contact_id = conflictResult.winner.contact_id;
}
```

#### 2.2.1 - Conflict Resolution API (Manual Resolution)

**Purpose**: Allow users to manually resolve conflicts through UI

**Create**: `src/app/api/sync/conflicts/[id]/route.ts`

```typescript
// src/app/api/sync/conflicts/[id]/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GivebutterClient } from '@/lib/server/clients/givebutter';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get specific conflict
  const { data: conflict, error } = await supabase
    .from('sync_conflicts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !conflict) {
    return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
  }

  return NextResponse.json(conflict);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { decision, custom_value, resolved_by } = await request.json();

  // Validate decision
  if (!['a', 'b', 'custom'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  if (decision === 'custom' && !custom_value) {
    return NextResponse.json(
      { error: 'custom_value required when decision is custom' },
      { status: 400 }
    );
  }

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

  // Prevent re-resolving
  if (conflict.status === 'resolved') {
    return NextResponse.json(
      { error: 'Conflict already resolved' },
      { status: 409 }
    );
  }

  // 2. Determine resolved value
  const resolvedValue = decision === 'custom'
    ? custom_value
    : decision === 'a'
    ? conflict.option_a.value
    : conflict.option_b.value;

  // 3. Apply decision to mentors table based on conflict type
  try {
    if (conflict.conflict_type === 'phone_mismatch') {
      // Update phone in mentors table
      const { error: updateError } = await supabase
        .from('mentors')
        .update({ phone: resolvedValue })
        .eq('mn_id', conflict.mn_id);

      if (updateError) throw updateError;

    } else if (conflict.conflict_type === 'email_mismatch') {
      // Update email in mentors table
      const { error: updateError } = await supabase
        .from('mentors')
        .update({ personal_email: resolvedValue })
        .eq('mn_id', conflict.mn_id);

      if (updateError) throw updateError;

    } else if (conflict.conflict_type === 'contact_selection') {
      // Update gb_contact_id in mentors table
      const { error: updateError } = await supabase
        .from('mentors')
        .update({ gb_contact_id: parseInt(resolvedValue) })
        .eq('mn_id', conflict.mn_id);

      if (updateError) throw updateError;

      // Archive the losing contact via Givebutter API
      const loserContactId = decision === 'a'
        ? conflict.option_b.value
        : decision === 'custom'
        ? conflict.option_b.value // Assume if custom, archive both old options
        : conflict.option_a.value;

      if (loserContactId && parseInt(loserContactId) > 0) {
        try {
          const gbClient = new GivebutterClient(
            process.env.GIVEBUTTER_API_KEY!
          );
          await gbClient.archiveContact(parseInt(loserContactId));
        } catch (archiveError) {
          console.error(
            `Failed to archive contact ${loserContactId}:`,
            archiveError
          );
          // Don't fail the whole resolution if archival fails
          // Log as warning instead
          await supabase.from('sync_warnings').insert({
            mn_id: conflict.mn_id,
            warning_type: 'archival_failed',
            warning_message: `Failed to archive duplicate contact ${loserContactId}`,
            field_name: 'gb_contact_id',
            current_value: String(loserContactId),
          });
        }
      }

    } else if (conflict.conflict_type === 'external_id_collision') {
      // This is complex - may need to update BOTH contacts
      // For now, just log and require manual intervention
      await supabase.from('sync_errors').insert({
        error_type: 'manual_intervention_required',
        error_message: `External ID collision for ${conflict.mn_id} requires database admin`,
        context: { conflict_id: params.id, decision, resolved_value: resolvedValue },
      });

      return NextResponse.json(
        {
          error: 'External ID collisions require manual database intervention',
          requiresAdmin: true
        },
        { status: 400 }
      );
    }

    // 4. Mark conflict as resolved
    const { error: resolveError } = await supabase
      .from('sync_conflicts')
      .update({
        status: 'resolved',
        user_decision: decision,
        custom_value: decision === 'custom' ? custom_value : null,
        resolved_at: new Date().toISOString(),
        resolved_by: resolved_by || 'unknown',
      })
      .eq('id', params.id);

    if (resolveError) throw resolveError;

    // 5. Log the resolution to mn_changes
    await supabase.from('mn_changes').insert({
      mn_id: conflict.mn_id,
      change_type: 'conflict_resolved',
      field_name: conflict.conflict_type,
      old_value: decision === 'a'
        ? JSON.stringify(conflict.option_b)
        : JSON.stringify(conflict.option_a),
      new_value: String(resolvedValue),
      source_table: 'sync_conflicts',
      notes: `User ${resolved_by} resolved ${conflict.conflict_type} conflict by choosing ${decision}`,
    });

    return NextResponse.json({
      success: true,
      resolved_value: resolvedValue,
      conflict_type: conflict.conflict_type,
      mn_id: conflict.mn_id,
    });

  } catch (error: any) {
    console.error('Error resolving conflict:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve conflict' },
      { status: 500 }
    );
  }
}
```

**Create**: `src/app/api/sync/conflicts/route.ts` (List all conflicts)

```typescript
// src/app/api/sync/conflicts/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get conflicts with mentor data
  const query = supabase
    .from('sync_conflicts')
    .select(`
      *,
      mentor:mentors!sync_conflicts_mn_id_fkey (
        mn_id,
        first_name,
        last_name,
        preferred_name,
        phone,
        personal_email
      )
    `)
    .order('detected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query.eq('status', status);
  }

  const { data: conflicts, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    conflicts,
    total: count,
    limit,
    offset,
  });
}

// Bulk resolution: Accept all recommendations
export async function POST(request: Request) {
  const { resolved_by } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all pending conflicts that have recommendations
  const { data: conflicts, error: fetchError } = await supabase
    .from('sync_conflicts')
    .select('*')
    .eq('status', 'pending')
    .not('recommended_option', 'is', null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!conflicts || conflicts.length === 0) {
    return NextResponse.json({
      success: true,
      resolved_count: 0,
      message: 'No conflicts with recommendations to resolve',
    });
  }

  const results = {
    resolved: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  // Resolve each conflict using its recommendation
  for (const conflict of conflicts) {
    try {
      const decision = conflict.recommended_option; // 'a' or 'b'
      const resolvedValue = conflict[`option_${decision}`].value;

      // Apply resolution (similar to individual POST logic above)
      if (conflict.conflict_type === 'phone_mismatch') {
        await supabase
          .from('mentors')
          .update({ phone: resolvedValue })
          .eq('mn_id', conflict.mn_id);
      } else if (conflict.conflict_type === 'contact_selection') {
        await supabase
          .from('mentors')
          .update({ gb_contact_id: parseInt(resolvedValue) })
          .eq('mn_id', conflict.mn_id);
      }
      // ... handle other types

      // Mark as resolved
      await supabase
        .from('sync_conflicts')
        .update({
          status: 'resolved',
          user_decision: decision,
          resolved_at: new Date().toISOString(),
          resolved_by: resolved_by || 'bulk_auto_resolve',
        })
        .eq('id', conflict.id);

      results.resolved.push(conflict.id);

    } catch (error: any) {
      results.failed.push({
        id: conflict.id,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    resolved_count: results.resolved.length,
    failed_count: results.failed.length,
    resolved: results.resolved,
    failed: results.failed,
  });
}
```

**Frontend Usage Example:**

```typescript
// src/app/conflicts/page.tsx (UI component)

'use client';

import { useState, useEffect } from 'react';

interface Conflict {
  id: string;
  mn_id: string;
  conflict_type: string;
  option_a: { value: any; metadata: any };
  option_b: { value: any; metadata: any };
  recommended_option: 'a' | 'b' | null;
  recommendation_reason: string;
  mentor: {
    first_name: string;
    last_name: string;
    preferred_name: string;
  };
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConflicts();
  }, []);

  async function fetchConflicts() {
    const res = await fetch('/api/sync/conflicts?status=pending');
    const data = await res.json();
    setConflicts(data.conflicts || []);
    setLoading(false);
  }

  async function resolveConflict(
    conflictId: string,
    decision: 'a' | 'b' | 'custom',
    customValue?: string
  ) {
    const res = await fetch(`/api/sync/conflicts/${conflictId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        custom_value: customValue,
        resolved_by: 'admin@swabuga.org', // Get from auth
      }),
    });

    if (res.ok) {
      // Refresh list
      fetchConflicts();
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  }

  async function resolveAllRecommendations() {
    if (!confirm('Resolve all conflicts using system recommendations?')) {
      return;
    }

    const res = await fetch('/api/sync/conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_by: 'admin@swabuga.org' }),
    });

    const data = await res.json();
    alert(`Resolved ${data.resolved_count} conflicts`);
    fetchConflicts();
  }

  if (loading) return <div>Loading conflicts...</div>;

  return (
    <div>
      <h1>Conflict Resolution</h1>
      <p>{conflicts.length} pending conflicts</p>

      <button onClick={resolveAllRecommendations}>
        ✅ Accept All Recommendations
      </button>

      {conflicts.map(conflict => (
        <div key={conflict.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <h3>
            {conflict.mentor.preferred_name || conflict.mentor.first_name} {conflict.mentor.last_name}
            ({conflict.mn_id})
          </h3>
          <p><strong>Type:</strong> {conflict.conflict_type}</p>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <h4>Option A</h4>
              <pre>{JSON.stringify(conflict.option_a, null, 2)}</pre>
              <button onClick={() => resolveConflict(conflict.id, 'a')}>
                Choose A
              </button>
            </div>

            <div>
              <h4>Option B</h4>
              <pre>{JSON.stringify(conflict.option_b, null, 2)}</pre>
              <button onClick={() => resolveConflict(conflict.id, 'b')}>
                Choose B
              </button>
            </div>
          </div>

          {conflict.recommended_option && (
            <div style={{ background: '#e0ffe0', padding: '10px', marginTop: '10px' }}>
              <strong>Recommendation:</strong> Option {conflict.recommended_option.toUpperCase()}
              <br />
              <em>{conflict.recommendation_reason}</em>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Deliverable**: Full conflict resolution workflow (API + UI)
**Dependencies**: Phase 1.1 (database tables), Phase 2.2 (conflict detector)
**Risk**: Medium - user experience needs careful design

#### 2.3 - Implement Change Detection

**Goal**: Track all changes to mentor data for audit trail and notification purposes

**Create**: `src/lib/server/processors/change-detector.ts`

---

### Change Detection Core Logic

```typescript
// src/lib/server/processors/change-detector.ts

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Mentor = Database['public']['Tables']['mentors']['Row'];
type Change = Database['public']['Tables']['mn_changes']['Insert'];

export interface ChangeConfig {
  trackedFields: string[];
  significantFields: string[]; // Fields that trigger notifications
  ignoredFields: string[]; // Fields that are never tracked (e.g., timestamps)
}

const DEFAULT_CONFIG: ChangeConfig = {
  trackedFields: [
    'phone',
    'personal_email',
    'uga_email',
    'training_signup',
    'training_signup_done',
    'amount_raised',
    'dropped',
    'first_name',
    'last_name',
    'preferred_name',
  ],
  significantFields: [
    'dropped',
    'training_signup_done',
    'amount_raised',
  ],
  ignoredFields: [
    'created_at',
    'updated_at',
    'last_synced_at',
  ],
};

export async function detectChanges(
  oldMentor: Mentor | null,
  newMentor: Mentor,
  sourceTable: string,
  config: ChangeConfig = DEFAULT_CONFIG
): Promise<Change[]> {
  const changes: Change[] = [];

  // New mentor created
  if (!oldMentor) {
    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'new_mentor',
      source_table: sourceTable,
      field_name: null,
      old_value: null,
      new_value: JSON.stringify(newMentor),
      is_significant: true,
      changed_at: new Date().toISOString(),
    });
    return changes;
  }

  // Detect dropped status change (very important)
  if (newMentor.dropped && !oldMentor.dropped) {
    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'dropped',
      source_table: sourceTable,
      field_name: 'dropped',
      old_value: 'false',
      new_value: 'true',
      is_significant: true,
      changed_at: new Date().toISOString(),
    });
  }

  // Detect re-activation (dropped → active)
  if (!newMentor.dropped && oldMentor.dropped) {
    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'reactivated',
      source_table: sourceTable,
      field_name: 'dropped',
      old_value: 'true',
      new_value: 'false',
      is_significant: true,
      changed_at: new Date().toISOString(),
    });
  }

  // Check all tracked fields for changes
  for (const field of config.trackedFields) {
    const oldValue = oldMentor[field as keyof Mentor];
    const newValue = newMentor[field as keyof Mentor];

    // Skip if values are the same
    if (oldValue === newValue) continue;

    // Skip if both are null/undefined
    if ((oldValue === null || oldValue === undefined) &&
        (newValue === null || newValue === undefined)) continue;

    const isSignificant = config.significantFields.includes(field);

    changes.push({
      mn_id: newMentor.mn_id,
      change_type: 'field_change',
      source_table: sourceTable,
      field_name: field,
      old_value: oldValue ? String(oldValue) : null,
      new_value: newValue ? String(newValue) : null,
      is_significant: isSignificant,
      changed_at: new Date().toISOString(),
    });
  }

  return changes;
}

/**
 * Persist changes to mn_changes table
 */
export async function logChanges(changes: Change[]): Promise<void> {
  if (changes.length === 0) return;

  const supabase = createClient();

  const { error } = await supabase
    .from('mn_changes')
    .insert(changes);

  if (error) {
    console.error('Failed to log changes:', error);
    throw new Error(`Failed to log changes: ${error.message}`);
  }
}

/**
 * Get change history for a specific mentor
 */
export async function getMentorChangeHistory(
  mn_id: string,
  options?: {
    limit?: number;
    significantOnly?: boolean;
    since?: Date;
  }
) {
  const supabase = createClient();

  let query = supabase
    .from('mn_changes')
    .select('*')
    .eq('mn_id', mn_id)
    .order('changed_at', { ascending: false });

  if (options?.significantOnly) {
    query = query.eq('is_significant', true);
  }

  if (options?.since) {
    query = query.gte('changed_at', options.since.toISOString());
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch change history: ${error.message}`);
  }

  return data;
}

/**
 * Get recent changes across all mentors (for dashboard)
 */
export async function getRecentChanges(options?: {
  limit?: number;
  significantOnly?: boolean;
  changeType?: string;
}) {
  const supabase = createClient();

  let query = supabase
    .from('mn_changes')
    .select(`
      *,
      mentors!inner(first_name, last_name, preferred_name)
    `)
    .order('changed_at', { ascending: false });

  if (options?.significantOnly) {
    query = query.eq('is_significant', true);
  }

  if (options?.changeType) {
    query = query.eq('change_type', options.changeType);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch recent changes: ${error.message}`);
  }

  return data;
}
```

---

### Integration into ETL Pipeline

```typescript
// src/lib/server/etl/load.ts (excerpt)

import { detectChanges, logChanges } from '../processors/change-detector';

export async function loadMentorData(mentors: Mentor[]): Promise<void> {
  const supabase = createClient();

  for (const newMentor of mentors) {
    // Get existing mentor
    const { data: oldMentor } = await supabase
      .from('mentors')
      .select('*')
      .eq('mn_id', newMentor.mn_id)
      .single();

    // Detect changes
    const changes = await detectChanges(
      oldMentor,
      newMentor,
      'raw_mn_signups' // or 'raw_gb_full_contacts' depending on source
    );

    // Upsert mentor
    await supabase
      .from('mentors')
      .upsert(newMentor, { onConflict: 'mn_id' });

    // Log changes
    if (changes.length > 0) {
      await logChanges(changes);
      console.log(`Logged ${changes.length} changes for ${newMentor.mn_id}`);
    }
  }
}
```

---

### API Route for Change History

```typescript
// src/app/api/mentors/[mn_id]/changes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getMentorChangeHistory } from '@/lib/server/processors/change-detector';

export async function GET(
  request: NextRequest,
  { params }: { params: { mn_id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const significantOnly = searchParams.get('significant') === 'true';
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;

    const changes = await getMentorChangeHistory(params.mn_id, {
      limit,
      significantOnly,
      since,
    });

    return NextResponse.json({
      mn_id: params.mn_id,
      change_count: changes.length,
      changes,
    });
  } catch (error) {
    console.error('Error fetching change history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch change history' },
      { status: 500 }
    );
  }
}
```

---

### UI Component for Change History

```typescript
// src/components/features/mentors/change-history.tsx

'use client';

import { useState, useEffect } from 'react';

interface Change {
  id: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  is_significant: boolean;
  changed_at: string;
  source_table: string;
}

export function ChangeHistoryList({ mn_id }: { mn_id: string }) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChanges();
  }, [mn_id]);

  async function fetchChanges() {
    const res = await fetch(`/api/mentors/${mn_id}/changes?limit=50`);
    const data = await res.json();
    setChanges(data.changes || []);
    setLoading(false);
  }

  function formatChangeType(type: string): string {
    switch (type) {
      case 'new_mentor': return '🆕 New Mentor';
      case 'dropped': return '⚠️ Dropped';
      case 'reactivated': return '✅ Reactivated';
      case 'field_change': return '📝 Field Changed';
      default: return type;
    }
  }

  if (loading) return <div>Loading change history...</div>;
  if (changes.length === 0) return <div>No changes recorded</div>;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Change History</h3>
      <div className="space-y-1">
        {changes.map((change) => (
          <div
            key={change.id}
            className={`p-2 rounded border ${
              change.is_significant ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className="font-medium">{formatChangeType(change.change_type)}</span>
              <span className="text-gray-500">
                {new Date(change.changed_at).toLocaleString()}
              </span>
            </div>
            {change.field_name && (
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-mono">{change.field_name}</span>:{' '}
                <span className="line-through">{change.old_value || 'null'}</span>
                {' → '}
                <span className="font-semibold">{change.new_value || 'null'}</span>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Source: {change.source_table}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Useful SQL Queries for Change Analysis

```sql
-- Get all significant changes in the last 24 hours
SELECT
  c.*,
  m.first_name,
  m.last_name
FROM mn_changes c
JOIN mentors m ON c.mn_id = m.mn_id
WHERE c.is_significant = true
  AND c.changed_at > NOW() - INTERVAL '24 hours'
ORDER BY c.changed_at DESC;

-- Count changes by type
SELECT
  change_type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_significant THEN 1 END) as significant_count
FROM mn_changes
WHERE changed_at > NOW() - INTERVAL '7 days'
GROUP BY change_type
ORDER BY count DESC;

-- Find mentors with the most changes
SELECT
  mn_id,
  COUNT(*) as change_count,
  MAX(changed_at) as last_changed
FROM mn_changes
GROUP BY mn_id
ORDER BY change_count DESC
LIMIT 20;

-- Track "dropped" status changes
SELECT
  c.*,
  m.first_name,
  m.last_name
FROM mn_changes c
JOIN mentors m ON c.mn_id = m.mn_id
WHERE c.change_type IN ('dropped', 'reactivated')
ORDER BY c.changed_at DESC;
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

#### 2.5 - Declarative Conflict Resolution Rules

**Create**: `src/lib/server/config/conflict-rules.ts`

**Purpose**: Centralized, declarative rules for field-level conflict resolution

```typescript
// src/lib/server/config/conflict-rules.ts

export interface ConflictRule {
  field: string;
  priority: string[];  // Table names in priority order
  reason: string;
  immutable?: boolean; // If true, never overwrite this field
  bidirectional?: boolean; // If true, can sync back from GB to our system
}

export const CONFLICT_RULES: ConflictRule[] = [
  // Contact Information (Jotform is authoritative)
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

  // Fundraising (Givebutter is authoritative)
  {
    field: 'amount_raised',
    priority: ['raw_gb_campaign_members'],
    reason: 'Givebutter is always source of truth for fundraising',
    immutable: true,  // Never overwrite with our data
    bidirectional: true, // Always pull latest from GB
  },
  {
    field: 'fundraising_page_url',
    priority: ['raw_gb_campaign_members'],
    reason: 'Givebutter generates and owns page URLs',
    immutable: true,
  },
  {
    field: 'campaign_member',
    priority: ['raw_gb_campaign_members'],
    reason: 'Only GB knows if mentor created a page',
    immutable: true,
    bidirectional: true,
  },

  // Training (Jotform is authoritative for signup, manual for check-in)
  {
    field: 'training_signup_done',
    priority: ['raw_mn_training_signup'],
    reason: 'Training form is source of truth for signup',
  },
  {
    field: 'training_signup_at',
    priority: ['raw_mn_training_signup'],
    reason: 'Timestamp from training form submission',
  },
  {
    field: 'training_at',
    priority: ['existing_mentors'],
    reason: 'Manually set during event-day training check-in - NEVER overwrite',
    immutable: true,
  },

  // Fundraising completion (Manual verification)
  {
    field: 'fundraised_at',
    priority: ['existing_mentors'],
    reason: 'Manually marked complete after verification - NEVER overwrite',
    immutable: true,
  },

  // Notes (Manual annotations)
  {
    field: 'notes',
    priority: ['existing_mentors'],
    reason: 'Manual annotations - NEVER overwrite',
    immutable: true,
  },

  // Setup (Jotform is authoritative)
  {
    field: 'setup_submission_id',
    priority: ['raw_mn_funds_setup'],
    reason: 'Setup form determines if mentor completed setup',
  },

  // Contact ID (Special - never overwrite unless from GB sync)
  {
    field: 'gb_contact_id',
    priority: ['raw_gb_full_contacts', 'existing_mentors'],
    reason: 'Never overwrite existing contact ID unless from GB sync',
    immutable: true,
  },

  // Dropped Status (Givebutter tags are authoritative)
  {
    field: 'dropped',
    priority: ['raw_gb_full_contacts'],
    reason: 'Dropped status comes from GB "Dropped 25" tag',
    bidirectional: true,
  },
];

/**
 * Get the authoritative source for a field
 */
export function getFieldAuthority(fieldName: string): ConflictRule | null {
  return CONFLICT_RULES.find(rule => rule.field === fieldName) || null;
}

/**
 * Determine which value wins in a conflict
 */
export function resolveFieldConflict(
  fieldName: string,
  values: Map<string, any>  // table name → value
): { winner: any; source: string; reason: string } {
  const rule = getFieldAuthority(fieldName);

  if (!rule) {
    throw new Error(`No conflict rule defined for field: ${fieldName}`);
  }

  // Find first available value according to priority
  for (const source of rule.priority) {
    if (values.has(source) && values.get(source) !== null) {
      return {
        winner: values.get(source),
        source,
        reason: rule.reason,
      };
    }
  }

  // No value found in any source
  return {
    winner: null,
    source: 'none',
    reason: 'No value available from any source',
  };
}
```

**Usage in ETL**:

```typescript
// In 05-merge-data.ts
import { resolveFieldConflict, CONFLICT_RULES } from '@/lib/server/config/conflict-rules';

// When merging mentor data from multiple sources
const phoneValues = new Map([
  ['raw_mn_signups', signup.phone],
  ['raw_gb_full_contacts', contact?.primary_phone],
]);

const { winner: phone, source, reason } = resolveFieldConflict('phone', phoneValues);

mentor.phone = phone;

// Log if there was a conflict
if (signup.phone !== contact?.primary_phone && contact?.primary_phone) {
  logger.info(`Phone conflict for ${mentor.mn_id}: chose ${source} (${reason})`);
}
```

**Benefits**:
- Single source of truth for field priorities
- Easy to update rules without changing ETL logic
- Clear documentation of data ownership
- Auditable conflict resolution

**Deliverable**: Modular ETL with conflict detection
**Dependencies**: Phase 1 complete
**Risk**: Medium - requires thorough testing

---

## 🧩 Separation of Concerns: Core vs Features

### **The Problem: Mixed Responsibilities**

**Current State** (`backend/features/comms/`):
- ❌ CSV export logic in `tools/export.ts` - This is CORE sync, not a feature!
- ❌ Sync-like logic mixed with message generation
- ❌ Duplicate logic conflicting with core sync
- ❌ Contact matching logic duplicated from ETL

**Issues This Creates:**
1. **Maintainability Nightmare**: Same logic in multiple places means bugs fixed in one place persist in others
2. **Testing Complexity**: Can't test message generation without triggering full sync
3. **Unclear Ownership**: Who owns CSV export? Core team or comms team?
4. **Broken Abstractions**: Comms scripts directly manipulating sync state

### **The Solution: Clear Boundaries**

```
┌─────────────────────────────────────────────────────────────┐
│  CORE: backend/core/sync/ + etl/                             │
│  Responsibility: Bidirectional sync with external systems    │
├─────────────────────────────────────────────────────────────┤
│  ✅ Fetch from Jotform/Givebutter APIs                       │
│  ✅ Populate raw tables (raw_mn_signups, raw_gb_*)           │
│  ✅ Run ETL (raw → mentors)                                   │
│  ✅ Populate mn_gb_import with FULL contact data              │
│  ✅ Export mn_gb_import to CSV                                │
│  ✅ Upload CSV to Givebutter (import operation)               │
│  ✅ Download Givebutter export (get all 40k+ contacts)        │
│  ✅ Upload export to raw_gb_full_contacts                     │
│  ✅ Contact selection, deduplication, archival                │
│  ✅ Conflict detection and resolution                         │
│  ✅ Change tracking (mn_changes table)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  FEATURE: backend/features/comms/                            │
│  Responsibility: Generate campaign-specific messages         │
├─────────────────────────────────────────────────────────────┤
│  ✅ READ from mentors table (current state)                  │
│  ✅ Filter by criteria (e.g., training_signup = false)       │
│  ✅ Generate personalized text messages                       │
│  ✅ Generate personalized email sections                      │
│  ✅ UPSERT to mn_gb_import (ONLY message fields):            │
│     - 📱Custom Text Message 1️⃣                               │
│     - 📧 Custom Email Message 1️⃣                             │
│  ❌ NO CSV export (core handles this)                        │
│  ❌ NO contact matching/selection (core handles this)        │
│  ❌ NO sync logic (core handles this)                        │
│  ❌ NO ETL operations (core handles this)                    │
└─────────────────────────────────────────────────────────────┘
```

### **What Needs to Move**

#### Files to Migrate to Core:

| Current Location | New Location | Reason |
|------------------|--------------|--------|
| `backend/features/comms/tools/export.ts` | `backend/core/sync/export-contacts.ts` | CSV export is core sync responsibility |
| `backend/features/comms/tools/validate.ts` | `backend/core/sync/validate-csv.ts` | CSV validation is core sync responsibility |
| Any contact matching logic in comms | DELETE | Already in ETL, don't duplicate |

#### Files to Keep in Comms (but simplify):

| File | Keep/Simplify | New Responsibility |
|------|---------------|-------------------|
| `backend/features/comms/gb_imports/*/` | ✅ Keep | Campaign-specific message generation ONLY |
| `backend/features/comms/templates/` | ✅ Keep | Message templates |
| `backend/features/comms/tools/query.ts` | ✅ Keep | Query helpers for filtering mentors |

#### Files to Delete from Comms:

- Any duplicate ETL-like logic
- Any contact matching/selection code
- Any sync configuration duplicates

### **Updated Comms Workflow Example**

**OLD WAY** (mixed responsibilities):
```typescript
// ❌ BAD: backend/features/comms/gb_imports/training_reminder.ts

// 1. Fetches from API (should be core sync!)
const contacts = await givebutterClient.getContacts();

// 2. Matches contacts (duplicates ETL logic!)
const matched = matchContactsToMentors(contacts);

// 3. Generates messages (OK - this IS comms responsibility)
const messages = generateTrainingReminders(matched);

// 4. Exports CSV (should be core sync!)
await exportCSV(messages);
```

**NEW WAY** (clear separation):
```typescript
// ✅ GOOD: backend/features/comms/campaigns/training-reminder.ts

import { createClient } from '@supabase/supabase-js';

export async function generateTrainingReminderMessages() {
  const supabase = createClient(/* ... */);

  // 1. READ from mentors table (source of truth maintained by core sync)
  const { data: mentors } = await supabase
    .from('mentors')
    .select('*')
    .eq('training_signup', false)         // Filter for those who haven't signed up
    .eq('dropped', false)                  // Exclude dropped mentors
    .gte('signup_at', '2025-01-01');      // Only current year

  console.log(`Found ${mentors.length} mentors needing training reminder`);

  // 2. Generate personalized messages (ONLY comms responsibility)
  const updates = mentors.map(mentor => {
    const textMessage = generateTextMessage(mentor);
    const emailSection = generateEmailSection(mentor);

    return {
      mn_id: mentor.mn_id,
      '📱Custom Text Message 1️⃣': textMessage,
      '📧 Custom Email Message 1️⃣': emailSection,
    };
  });

  // 3. UPSERT to mn_gb_import (ONLY message fields - don't touch contact data!)
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
  console.log('📤 Next step: Run core sync to export CSV and upload to Givebutter');
}

// Helper functions (comms-specific logic)
function generateTextMessage(mentor: Mentor): string {
  return `Hi ${mentor.preferred_name || mentor.first_name}!
Don't forget to sign up for mentor training.
Your link: https://training.swabuga.org/${mentor.mn_id}`;
}

function generateEmailSection(mentor: Mentor): string {
  return `<p>Hi ${mentor.preferred_name || mentor.first_name},</p>
<p>We noticed you haven't signed up for training yet...</p>`;
}

// 4. Core sync handles the rest (called separately):
//    Step 1: npm run comms:training-reminder  (← YOU ARE HERE)
//    Step 2: npm run sync:export              (core exports CSV from mn_gb_import)
//    Step 3: Upload CSV to Givebutter UI      (manual or automated via API)
//    Step 4: npm run sync:upload-csv          (core downloads GB export, updates raw_gb_full_contacts)
```

### **Benefits of This Separation**

1. **No Duplicate Logic**
   - Core sync is the ONLY place with contact matching/selection
   - CSV export logic exists in ONE place only
   - Single source of truth for sync operations

2. **Comms is Portable**
   - Can reuse for different campaigns without touching sync
   - Message generation logic isolated and testable
   - Easy to create new campaigns by copying template

3. **Clear Ownership**
   - Core team owns: sync, ETL, CSV export, conflict resolution
   - Comms team owns: message templates, campaign filters, personalization

4. **Easier Testing**
   - Can test message generation independently of sync
   - Mock mentors table for comms tests
   - Integration tests focus on boundaries

5. **No Conflicts**
   - Comms can't accidentally break sync by modifying wrong fields
   - Clear contract: comms only writes to message fields in mn_gb_import
   - Core sync manages all contact data fields

### **Migration Checklist**

#### Phase 1: Move Core Logic Out of Comms
- [ ] Move `features/comms/tools/export.ts` → `core/sync/export-contacts.ts`
- [ ] Move `features/comms/tools/validate.ts` → `core/sync/validate-csv.ts`
- [ ] Update npm scripts:
  ```json
  {
    "scripts": {
      "sync:export": "tsx backend/core/sync/export-contacts.ts",
      "sync:validate": "tsx backend/core/sync/validate-csv.ts"
    }
  }
  ```

#### Phase 2: Simplify Comms Scripts
- [ ] Remove any contact matching logic from comms scripts
- [ ] Remove any API client usage (Jotform/Givebutter) from comms
- [ ] Update all comms scripts to follow new pattern:
  - READ from mentors table only
  - Generate messages
  - UPDATE mn_gb_import (message fields only)

#### Phase 3: Update Documentation
- [ ] Document new comms workflow in README
- [ ] Create template for new campaigns
- [ ] Add examples of correct vs incorrect separation

#### Phase 4: Delete Duplicates
- [ ] Search for duplicate contact matching logic → Delete
- [ ] Search for duplicate ETL logic → Delete
- [ ] Search for duplicate sync config → Delete

### **Enforcement: Code Review Guidelines**

When reviewing comms PRs, reject if:
- ❌ Uses Jotform or Givebutter API clients directly
- ❌ Contains contact matching/selection logic
- ❌ Exports CSV files
- ❌ Modifies non-message fields in mn_gb_import
- ❌ Contains sync or ETL logic

When reviewing core PRs, reject if:
- ❌ Contains message generation templates (belongs in comms)
- ❌ Contains campaign-specific filtering logic

#### 2.6 - Add Givebutter Website Field to Export

**Goal**: Export mentor's Givebutter fundraising page URL as the contact's website field

**Implementation**:

**File to Modify**: `backend/core/etl/process.ts` (in `buildGbImportRow()` function)

```typescript
// In buildGbImportRow() function, add website field:
function buildGbImportRow(mentor: ProcessedMentor, config: SyncConfig): GbImportRow {
  // ... existing code ...

  // NEW: Add website field with mentor's GB page URL
  const websiteUrl = mentor.campaign_page_url
    ? mentor.campaign_page_url
    : null;

  return {
    // ... existing fields ...
    'Contact Website': websiteUrl,  // Add this line
    // ... rest of fields ...
  };
}
```

**Database Changes**: No changes needed - `campaign_page_url` already exists in `raw_gb_campaign_members` and is synced to `mentors` table.

**CSV Template**: Givebutter import template already supports "Contact Website" column.

**Testing**:
- Verify website URL appears in GB import CSV
- Confirm Givebutter accepts the import with website field
- Check that contact's website in GB matches their fundraising page

**Deliverable**: Mentors' GB pages automatically linked in their contact records
**Time Estimate**: 1 hour

---

#### 2.7 - Fix UGA Class Logic (Training Form Priority)

**Goal**: Prioritize training form's UGA class field, fallback to signup form if missing

**Current Issue**: UGA class may only be captured at training signup (not at initial signup)

**Implementation**:

**File to Modify**: `backend/core/etl/process.ts` (in signup processing logic)

```typescript
// In processMentorSignup(), update UGA class logic:

// OLD (current):
const ugaClass = signup.uga_class || null;

// NEW (training form priority):
const ugaClass = training?.uga_class || signup.uga_class || null;
```

**Logic**:
1. Check if `raw_mn_training_signup` has `uga_class` for this mentor
2. If yes → use training form value (most recent)
3. If no → fall back to `raw_mn_signups.uga_class`
4. If neither → null

**Database Changes**: None needed - both tables already have `uga_class` column (added in migration `20251028000001`).

**Testing**:
- Test mentor with UGA class only in signup form → uses signup value
- Test mentor with UGA class only in training form → uses training value
- Test mentor with UGA class in both forms → uses training value (priority)
- Test mentor with neither → gracefully handles null

**Deliverable**: UGA class captured accurately from most recent source
**Time Estimate**: 1 hour

---

#### 2.8 - Partner & Shift Preference Form Integration

**Goal**: Add new Jotform form for collecting partner preferences and shift assignments

**New Form ID**: `252988541198170` (Partner & Shift Preference Form)

**Part 1: Database Schema Updates**

**Migration**: `supabase/migrations/YYYYMMDDHHMMSS_add_partner_matching_fields.sql`

```sql
-- Add new columns to mentors table for partner matching
ALTER TABLE mentors
  ADD COLUMN IF NOT EXISTS partner_phone TEXT,           -- Phone of preferred partner
  ADD COLUMN IF NOT EXISTS partner_phone_match BOOLEAN,  -- Whether partner reciprocated
  ADD COLUMN IF NOT EXISTS partner_shift_match BOOLEAN;  -- Whether partner has same shift

-- Add new raw table for partner form submissions
CREATE TABLE IF NOT EXISTS raw_mn_partner_preference (
  submission_id TEXT PRIMARY KEY,
  mn_id TEXT,
  partner_phone TEXT,                -- Phone number of preferred partner
  shift_preference TEXT,             -- Morning/Afternoon/Either
  partner_notes TEXT,                -- Additional partner preferences
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_partner_mn_id ON raw_mn_partner_preference(mn_id);
CREATE INDEX idx_raw_partner_phone ON raw_mn_partner_preference(partner_phone);

COMMENT ON TABLE raw_mn_partner_preference IS 'Raw submissions from Partner & Shift Preference Form (Jotform ID: 252988541198170)';
```

**Part 2: Sync Script**

**Create**: `backend/core/sync/jotform-partner-preference.ts`

```typescript
/**
 * SYNC SCRIPT: Jotform Partner & Shift Preference Form → Database
 *
 * Fetches submissions from Partner Preference form and syncs to database.
 *
 * Usage: npm run sync:partner-preference
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { loadSyncConfigFromEnv } from '../../../src/lib/server/config/sync-config-loader';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;

async function fetchJotform(endpoint: string) {
  const response = await fetch(`https://api.jotform.com/v1${endpoint}`, {
    headers: { 'APIKEY': API_KEY! },
  });

  if (!response.ok) {
    throw new Error(`Jotform API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content;
}

function parseSubmission(submission: any) {
  const answers = submission.answers;

  const getAnswerByName = (name: string) => {
    const answer = Object.values(answers).find((a: any) => a.name === name);
    if (!answer) return null;
    if (typeof answer.answer === 'string') return answer.answer.trim() || null;
    if (typeof answer.answer === 'object' && answer.answer.full) {
      return answer.answer.full.trim() || null;
    }
    return null;
  };

  return {
    submission_id: submission.id,
    mn_id: getAnswerByName('mnid'),
    partner_phone: getAnswerByName('partnerPhone'),
    shift_preference: getAnswerByName('shiftPreference'),
    partner_notes: getAnswerByName('partnerNotes'),
    submitted_at: new Date(submission.created_at).toISOString(),
  };
}

async function syncPartnerPreference() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING PARTNER PREFERENCE FORM → DATABASE');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: JOTFORM_API_KEY not set in environment');
    process.exit(1);
  }

  // Load sync configuration
  console.log('📋 Loading sync configuration...');
  const syncConfig = await loadSyncConfigFromEnv(2025);
  const formId = syncConfig.jotformPartnerFormId || '252988541198170';
  console.log(`✅ Using form ID: ${formId}\n`);

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  try {
    console.log(`🔍 Fetching submissions from form ${formId}...`);
    const submissions = await fetchJotform(`/form/${formId}/submissions?limit=1000`);
    console.log(`✅ Found ${submissions.length} submissions\n`);

    let inserted = 0;
    let errors = 0;

    for (const submission of submissions) {
      try {
        const parsed = parseSubmission(submission);

        const { error } = await supabase
          .from('raw_mn_partner_preference')
          .upsert(parsed, { onConflict: 'submission_id' });

        if (error) {
          console.error(`❌ Error syncing ${submission.id}:`, error.message);
          errors++;
        } else {
          inserted++;
          if (inserted % 50 === 0) {
            console.log(`   Processed ${inserted} submissions...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error parsing ${submission.id}:`, err);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Results:`);
    console.log(`   Total submissions: ${submissions.length}`);
    console.log(`   Synced successfully: ${inserted}`);
    console.log(`   Errors: ${errors}`);
    console.log();

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPartnerPreference();
```

**Part 3: ETL Integration**

**File to Modify**: `backend/core/etl/process.ts`

```typescript
// Load partner preference data
const { data: partnerPrefs } = await supabase
  .from('raw_mn_partner_preference')
  .select('*');

// In processMentorSignup(), add partner data:
const partnerPref = partnerPrefs?.find(p => p.mn_id === signup.mn_id);

const mentorUpdate = {
  // ... existing fields ...
  shift_preference: partnerPref?.shift_preference || signup.shift_preference || null,
  partner_phone: partnerPref?.partner_phone || null,
  // partner_phone_match and partner_shift_match will be computed later
};
```

**Part 4: Partner Matching Logic (Placeholder for Future)**

**Note**: Full partner matching algorithm will be implemented later. For now, just store the data.

**Future Algorithm**:
1. For each mentor with `partner_phone`:
   - Find mentor with matching phone number
   - Check if that mentor ALSO listed THIS mentor's phone
   - If yes → `partner_phone_match = true`
   - Check if both have same `shift_preference`
   - If yes → `partner_shift_match = true`
2. Generate partner pairs report
3. Flag conflicts (unreciprocated preferences, shift mismatches)

**Part 5: Config System Updates**

**File to Modify**: `supabase/migrations/20251028000000_phase1_foundation.sql` (or new migration)

```sql
-- Add partner form ID to sync_configs
INSERT INTO sync_configs (year, config_key, config_value, description) VALUES
  (2025, 'jotform_partner_form_id', '252988541198170', 'Partner & Shift Preference Form')
ON CONFLICT (year, config_key) DO NOTHING;
```

**Part 6: Config Wizard Updates**

**File to Modify**: `src/components/features/config/wizard-steps.tsx`

Add new form selection step for partner preference form, similar to existing training form step.

**Part 7: Orchestrator Updates**

**File to Modify**: `backend/core/sync/orchestrator.ts`

```typescript
// Add partner preference sync to orchestration:
{
  name: 'Jotform Partner Preference',
  script: 'jotform-partner-preference.ts',
  required: false, // Optional - may not exist for all years
},
```

**Part 8: npm Scripts**

**File to Modify**: `package.json`

```json
{
  "scripts": {
    "sync:partner-preference": "tsx backend/core/sync/jotform-partner-preference.ts"
  }
}
```

**Testing**:
- Verify form sync works without errors
- Check partner data appears in mentors table
- Confirm shift_preference updates from partner form
- Test partner matching placeholder logic

**Deliverable**: Partner preference form fully integrated into sync pipeline (matching logic deferred)
**Time Estimate**: 4 hours (database + sync script + ETL integration)

---

#### 2.9 - Status Category Rework (Multi-Status System)

**Goal**: Support multiple simultaneous statuses instead of single `status_category` field

**Current Issue**: A mentor can have multiple statuses at once:
- `dropped` - Explicitly dropped out
- `no_page` - Signed up but no GB page created yet
- `no_training_signup` - Haven't signed up for training
- `no_training` - Signed up but haven't attended
- `not_fundraised` - Haven't reached fundraising goal
- `no_preference` - Haven't submitted partner/shift preferences

**Problem**: Current `status_category` field only allows ONE status at a time.

**Solution Options**:

**Option A: Tags-Based System (Recommended)**
- Add statuses as tags in `mn_gb_import.tags` field
- Benefits: Flexible, supports multiple statuses, GB-native feature
- Implementation: Update `getMentorTags()` function in ETL

**Option B: Separate Boolean Fields**
- Add columns: `has_page`, `training_signed_up`, `training_complete`, `fundraised`, `has_preferences`
- Benefits: Easy to query, explicit
- Drawbacks: Inflexible, requires migrations for new statuses

**Option C: JSONB Status Field**
- Add `statuses JSONB` column with array of status strings
- Benefits: Flexible, queryable via PostgreSQL JSON operators
- Drawbacks: More complex queries

**Recommended Approach: Option A (Tags) + Keep status_category for Primary Status**

**Implementation**:

**File to Modify**: `backend/core/etl/process.ts`

```typescript
// Update getMentorTags() function:
function getMentorTags(mentor: ProcessedMentor, config: TagsConfig): string {
  const tags = [];

  // Default tags (year, campaign)
  if (config.settings?.apply_default_to_all) {
    tags.push(config.tags.default); // e.g., "Mentors 2025"
  }

  // Status-based tags
  if (mentor.dropped) {
    tags.push('Dropped 25');
  }

  if (!mentor.campaign_page_url) {
    tags.push('No Page'); // Needs to create GB fundraising page
  }

  if (!mentor.training_signup_done) {
    tags.push('No Training Signup');
  } else if (mentor.training_signup_done && !mentor.training_done) {
    tags.push('Training Incomplete');
  }

  if (mentor.campaign_page_url && !mentor.fundraised_done) {
    tags.push('Not Fundraised');
  }

  if (!mentor.partner_phone && !mentor.shift_preference) {
    tags.push('No Preferences'); // Needs to submit partner/shift form
  }

  // Primary status (for filtering in GB)
  const primaryStatus = mentor.status_category || 'active';
  tags.push(`Status: ${primaryStatus}`);

  // Custom tags
  if (config.tags.custom) {
    tags.push(...config.tags.custom);
  }

  return tags.filter(Boolean).join(config.settings?.delimiter || ', ');
}
```

**Benefits**:
- ✅ Multiple statuses visible at once
- ✅ Easy to filter in Givebutter (by tag)
- ✅ No database migration needed
- ✅ Backwards compatible with existing `status_category`

**Configuration**:

**File to Modify**: `backend/core/config/tags.json`

```json
{
  "year": "2025",
  "tags": {
    "default": "Mentors 2025",
    "status_based": {
      "active": ["Active"],
      "dropped": ["Dropped 25"],
      "inactive": ["Inactive"]
    },
    "custom": []
  },
  "settings": {
    "apply_default_to_all": true,
    "apply_status_tags": true,
    "delimiter": ", ",
    "apply_progress_tags": true  // NEW: Enable progress-based tags
  }
}
```

**Testing**:
- Test mentor with multiple incomplete steps → multiple status tags
- Test mentor who completes step → tag removed
- Verify tags appear correctly in GB import CSV
- Confirm tags are importable to Givebutter

**Deliverable**: Multi-status system via tags + primary status category preserved
**Time Estimate**: 2 hours

---

## Developer Conventions & Standards

**⚠️ IMPORTANT:** Follow these conventions consistently across the entire codebase.

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| **Database Tables** | `snake_case` | `mn_changes`, `sync_configs`, `raw_mn_signups` |
| **Database Columns** | `snake_case` | `mn_id`, `created_at`, `training_signup_done` |
| **TypeScript Files** | `kebab-case.ts` | `sync-config-loader.ts`, `conflict-detector.ts` |
| **TypeScript Functions** | `camelCase` | `loadSyncConfig`, `detectChanges`, `selectWinnerContact` |
| **TypeScript Classes** | `PascalCase` | `ConflictDetector`, `ContactArchiver`, `Logger` |
| **React Components** | `PascalCase` | `SyncStatusPanel`, `ConflictResolutionUI` |
| **Interfaces/Types** | `PascalCase` | `ContactCandidate`, `ETLContext`, `ConflictRule` |
| **Constants** | `UPPER_SNAKE_CASE` | `CONFLICT_RULES`, `MAX_RETRIES`, `DEFAULT_TIMEOUT` |

### Git Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

# Examples:
feat(etl): add conflict detection to contact matching
fix(sync): correct External ID priority in contact selector
refactor(db): split mn_errors into sync_errors and sync_warnings
docs(api): document conflict resolution endpoints
chore(deps): update @supabase/supabase-js to v2.47.10

# Types: feat, fix, refactor, docs, test, chore, perf, style, ci

# Include issue references:
fix(csv): prevent duplicate External ID errors #123
```

### Directory Structure Rules

```
backend/
├── core/              # Core sync and ETL logic (year-agnostic)
│   ├── config/        # Configuration loaders
│   ├── sync/          # Raw table sync scripts
│   ├── etl/           # Data transformation
│   └── services/      # Business logic services
├── features/          # Feature-specific code (campaigns, comms)
│   └── comms/         # Communication tools (ONLY message generation)
├── lib/               # Shared libraries
│   ├── infrastructure/  # Clients, processors, operators
│   ├── supabase/      # Supabase client utilities
│   └── utils/         # Shared utilities
├── mcp/               # Model Context Protocol servers
└── scripts/           # One-off admin/debug scripts

src/
├── app/               # Next.js app (routes, pages)
├── components/        # React components
│   ├── ui/            # Base UI components (Shadcn)
│   ├── composite/     # Composite business components
│   ├── features/      # Feature-specific components
│   └── layout/        # Layout components
└── lib/
    ├── server/        # Server-only code (for Edge Functions migration)
    └── utils.ts       # Client-side utilities
```

### Code Organization Principles

1. **Separation of Concerns**:
   - Core sync logic in `backend/core/`
   - Feature code in `backend/features/`
   - Shared utilities in `backend/lib/`

2. **Single Responsibility**:
   - Each file should have ONE clear purpose
   - Functions should do ONE thing well
   - Target: < 150 lines per module

3. **Immutable Rules**:
   - Never modify data from Givebutter that GB owns (amount_raised, page URLs)
   - Never overwrite gb_contact_id unless from GB sync
   - Always use config table for year-specific values

4. **Error Handling**:
   - Log errors to `sync_errors` table
   - Use structured logging (Logger class)
   - Include context (mn_id, source_table, etc.)

### Testing Standards

- Unit tests for processors, validators, transformers
- Integration tests for ETL steps
- E2E tests for full sync cycles
- Test with realistic data volumes (1000+ records)

---

## Phase 3: Serverless Migration
**Goal**: Move long-running operations to Supabase Edge Functions

---

### File Migration Map

**Overview**: This section documents the complete migration of backend scripts to serverless architecture (Supabase Edge Functions + Next.js API Routes).

---

#### Backend → Supabase Edge Functions

| Current File | New Location | Purpose | Priority |
|--------------|--------------|---------|----------|
| `backend/core/sync/jotform-signups.ts` | `supabase/functions/sync-jotform/index.ts` | Sync Jotform mentor signups | **HIGH** |
| `backend/core/sync/givebutter-members.ts` | `supabase/functions/sync-givebutter/index.ts` | Sync Givebutter campaign members | **HIGH** |
| `backend/core/sync/givebutter-contacts.ts` | `supabase/functions/sync-givebutter-contacts/index.ts` | Sync Givebutter contact details | **HIGH** |
| `backend/core/etl/process.ts` (1,136 lines) | `supabase/functions/etl-orchestrator/index.ts` | Orchestrate full ETL pipeline | **HIGH** |
| `backend/tools/export-csv.ts` | `supabase/functions/export-csv/index.ts` | Generate CSV export for Givebutter | **MEDIUM** |

**Migration Strategy**:
- Break monolithic `process.ts` into 8 modular Edge Functions (see Phase 2.1)
- Each Edge Function should be <200 lines for maintainability
- Share common code via `supabase/functions/_shared/` directory
- Use Deno import maps for consistent imports

---

#### Backend → Next.js API Routes

| Current File | New Location | Purpose | Priority |
|--------------|--------------|---------|----------|
| `backend/api/conflicts.ts` | `src/app/api/sync/conflicts/route.ts` | List conflicts | **HIGH** |
| `backend/api/resolve-conflict.ts` | `src/app/api/sync/conflicts/[id]/route.ts` | Resolve single conflict | **HIGH** |
| `backend/api/sync-status.ts` | `src/app/api/sync/status/route.ts` | Get sync status | **MEDIUM** |
| `backend/api/trigger-sync.ts` | `src/app/api/sync/trigger/route.ts` | Manually trigger sync | **MEDIUM** |
| `backend/api/export-csv.ts` | `src/app/api/export/csv/route.ts` | Download CSV | **MEDIUM** |

**Migration Strategy**:
- Use Next.js App Router API routes (`route.ts` convention)
- Implement proper error handling and validation
- Use Supabase server client for database access
- Return structured JSON responses

---

#### Backend → Next.js Server Actions (Optional)

| Current File | New Location | Purpose | Priority |
|--------------|--------------|---------|----------|
| `backend/tools/validate-data.ts` | `src/app/actions/validate-data.ts` | Server-side validation | **LOW** |
| `backend/tools/bulk-update.ts` | `src/app/actions/bulk-update.ts` | Bulk operations | **LOW** |

**Migration Strategy**:
- Use for form submissions and interactive UI actions
- Better UX than API routes for user-triggered actions
- Can progressively enhance from API routes later

---

#### Backend → Shared Libraries

| Current File | New Location | Purpose | Used By |
|--------------|--------------|---------|---------|
| `backend/lib/clients/jotform.ts` | `src/lib/server/clients/jotform.ts` | Jotform API client | Edge Functions + API Routes |
| `backend/lib/clients/givebutter.ts` | `src/lib/server/clients/givebutter.ts` | Givebutter API client | Edge Functions + API Routes |
| `backend/lib/config/sync-config-loader.ts` | `src/lib/server/config/sync-config-loader.ts` | Load sync config from DB | All sync functions |
| `backend/lib/processors/conflict-detector.ts` | `src/lib/server/processors/conflict-detector.ts` | Detect data conflicts | ETL orchestrator |
| `backend/lib/processors/change-detector.ts` | `src/lib/server/processors/change-detector.ts` | Track data changes | ETL orchestrator |
| `backend/lib/processors/contact-matcher.ts` | `src/lib/server/processors/contact-matcher.ts` | Match contacts using scoring | ETL orchestrator |
| `backend/lib/utils/logger.ts` | `src/lib/server/utils/logger.ts` | Structured logging | All functions |
| `backend/lib/utils/validation.ts` | `src/lib/server/utils/validation.ts` | Data validation helpers | All functions |

**Migration Strategy**:
- Place in `src/lib/server/` for Next.js usage
- Symlink to `supabase/functions/_shared/` for Edge Functions
- Use TypeScript for type safety across both environments
- Keep Deno-compatible (no Node.js-specific APIs)

---

#### ETL Modularization Plan

**Current**: `backend/core/etl/process.ts` (1,136 lines, monolithic)

**New Structure**: Break into focused Edge Functions

```
supabase/functions/
├── sync-jotform/          # Fetch Jotform data
├── sync-givebutter/       # Fetch Givebutter data
├── etl-validate/          # Step 1-2: Load and validate raw data
├── etl-deduplicate/       # Step 3: Deduplicate by mn_id
├── etl-match-contacts/    # Step 4: Match contacts + detect conflicts
├── etl-merge-data/        # Step 5: Merge into mentors table
├── etl-detect-changes/    # Step 6: Track changes to mn_changes
├── etl-populate-export/   # Step 7: Populate mn_gb_import
└── etl-orchestrator/      # Calls all steps in sequence
```

**Orchestrator Pattern**:
```typescript
// supabase/functions/etl-orchestrator/index.ts

async function runETL() {
  // Step 1: Validate raw data
  await invokeFunction('etl-validate');

  // Step 2: Deduplicate
  await invokeFunction('etl-deduplicate');

  // Step 3: Match contacts
  const { conflicts } = await invokeFunction('etl-match-contacts');

  if (conflicts > 0) {
    logger.warn(`${conflicts} conflicts detected - manual resolution required`);
    // Notify admin
  }

  // Step 4: Merge data
  await invokeFunction('etl-merge-data');

  // Step 5: Detect changes
  await invokeFunction('etl-detect-changes');

  // Step 6: Populate export
  await invokeFunction('etl-populate-export');
}
```

---

#### Cron Jobs (Vercel)

**Create**: `src/app/api/cron/` directory for scheduled tasks

```
src/app/api/cron/
├── sync-jotform/
│   └── route.ts          # Trigger: Daily at 2:00 AM
├── sync-givebutter/
│   └── route.ts          # Trigger: Daily at 2:30 AM
├── run-etl/
│   └── route.ts          # Trigger: Daily at 3:00 AM
└── export-csv/
    └── route.ts          # Trigger: Daily at 4:00 AM (after ETL)
```

**Pattern**:
```typescript
// src/app/api/cron/sync-jotform/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Invoke Edge Function
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-jotform`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year: 2025 }),
      }
    );

    const data = await res.json();

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

**Configure in `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-jotform",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/sync-givebutter",
      "schedule": "30 2 * * *"
    },
    {
      "path": "/api/cron/run-etl",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/export-csv",
      "schedule": "0 4 * * *"
    }
  ]
}
```

---

#### Files to Delete After Migration

Once migration is complete and tested, these files can be removed:

```bash
# Delete entire backend directory
rm -rf backend/

# Specifically:
- backend/core/
- backend/scripts/
- backend/tools/
- backend/api/
- backend/lib/
```

**⚠️ IMPORTANT**: Only delete after:
1. All Edge Functions deployed and tested
2. All API Routes working
3. All tests passing
4. Production running successfully and stable
5. Backup taken of entire backend directory

---

#### Migration Checklist

**Phase 3.1: Setup**
- [ ] Install Supabase CLI
- [ ] Initialize Edge Functions structure
- [ ] Create symlinks for shared code
- [ ] Configure Deno import maps
- [ ] Set up local development environment

**Phase 3.2: Pilot (Jotform Sync)**
- [ ] Migrate `jotform-signups.ts` → Edge Function
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy to staging
- [ ] Verify sync works correctly
- [ ] Monitor performance and errors

**Phase 3.3: Additional Syncs**
- [ ] Migrate `givebutter-members.ts`
- [ ] Migrate `givebutter-contacts.ts`
- [ ] Test all syncs together
- [ ] Verify data accuracy

**Phase 3.4: ETL Migration**
- [ ] Break `process.ts` into modules
- [ ] Implement orchestrator
- [ ] Test full pipeline locally
- [ ] Deploy to staging
- [ ] Verify data integrity (compare old vs new)

**Phase 3.5: API Routes**
- [ ] Migrate conflict resolution routes
- [ ] Migrate sync status routes
- [ ] Migrate CSV export route
- [ ] Test UI integration

**Phase 3.6: Cron Jobs**
- [ ] Create cron API routes
- [ ] Configure `vercel.json`
- [ ] Test scheduled execution
- [ ] Set up monitoring/alerts

**Phase 3.7: Cleanup**
- [ ] Run production until stable
- [ ] Verify all functionality working
- [ ] Take backup of `backend/`
- [ ] Delete old backend files
- [ ] Update documentation

---

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

**Migrate**: `backend/core/sync/jotform-signups.ts` → `supabase/functions/sync-jotform/index.ts`

**Goal**: Create comprehensive Edge Function template with error handling, logging, and production-ready features

---

### Complete Edge Function Template

```typescript
// supabase/functions/sync-jotform/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import type { Database } from '../_shared/database.types.ts'

// Import shared utilities (place in supabase/functions/_shared/)
import { Logger } from '../_shared/logger.ts'
import { JotformClient } from '../_shared/clients/jotform.ts'
import { loadSyncConfig } from '../_shared/config/sync-config-loader.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  year?: number;
  dry_run?: boolean;
  limit?: number;
}

interface SyncResult {
  success: boolean;
  records_synced: number;
  errors: number;
  duration_ms: number;
  dry_run: boolean;
  errors_detail?: any[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logger = new Logger('sync-jotform');
  const startTime = Date.now();
  let syncLogId: string | null = null;

  try {
    // 1. Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jotformApiKey = Deno.env.get('JOTFORM_API_KEY');

    if (!supabaseUrl || !supabaseKey || !jotformApiKey) {
      throw new Error('Missing required environment variables');
    }

    // 2. Parse request body
    const body: SyncRequest = req.method === 'POST'
      ? await req.json().catch(() => ({}))
      : {};

    const year = body.year || 2025;
    const dryRun = body.dry_run || false;
    const limit = body.limit; // Optional limit for testing

    logger.info(`Starting sync for year ${year}${dryRun ? ' (DRY RUN)' : ''}`);

    // 3. Initialize clients
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);
    const jotformClient = new JotformClient({
      apiKey: jotformApiKey,
      logger
    });

    // 4. Load config from database
    const config = await loadSyncConfig(year, supabase);

    if (!config) {
      throw new Error(`No sync configuration found for year ${year}`);
    }

    if (!config.jotform_signup_form_id) {
      throw new Error('Jotform signup form ID not configured');
    }

    // 5. Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'jotform_signups',
        year: year,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      logger.error('Failed to create sync log', logError);
    } else {
      syncLogId = syncLog.id;
    }

    // 6. Fetch submissions from Jotform
    logger.info(`Fetching submissions from form ${config.jotform_signup_form_id}...`);

    const submissions = await jotformClient.getFormSubmissions(
      config.jotform_signup_form_id,
      { limit }
    );

    logger.info(`Fetched ${submissions.length} submissions`);

    // 7. Transform submissions to database format
    const transformed = submissions.map((sub: any) => {
      try {
        return transformJotformSubmission(sub, year);
      } catch (error) {
        logger.error(`Failed to transform submission ${sub.id}`, error);
        // Log error to sync_errors table
        supabase.from('sync_errors').insert({
          sync_log_id: syncLogId,
          error_type: 'transformation_error',
          error_message: error.message,
          context: { submission_id: sub.id },
        });
        return null;
      }
    }).filter(Boolean); // Remove nulls

    logger.info(`Transformed ${transformed.length} submissions`);

    // 8. Upsert to database (unless dry run)
    if (!dryRun) {
      const { error: upsertError } = await supabase
        .from('raw_mn_signups')
        .upsert(transformed, {
          onConflict: 'submission_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        throw upsertError;
      }

      logger.info('Successfully upserted submissions to database');
    } else {
      logger.info('DRY RUN: Skipped database upsert');
    }

    // 9. Update sync log as completed
    const duration = Date.now() - startTime;

    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_processed: submissions.length,
          records_updated: transformed.length,
          duration_ms: duration,
        })
        .eq('id', syncLogId);
    }

    // 10. Return success response
    const result: SyncResult = {
      success: true,
      records_synced: transformed.length,
      errors: submissions.length - transformed.length,
      duration_ms: duration,
      dry_run: dryRun,
    };

    logger.info(`Sync completed in ${duration}ms`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Sync failed', error);

    // Update sync log as failed
    if (syncLogId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient<Database>(supabaseUrl, supabaseKey);

      await supabase
        .from('sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          duration_ms: duration,
        })
        .eq('id', syncLogId);

      // Log error to sync_errors
      await supabase.from('sync_errors').insert({
        sync_log_id: syncLogId,
        error_type: 'function_error',
        error_message: error.message,
        error_stack: error.stack,
      });
    }

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: duration,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    );
  }
})

/**
 * Transform a Jotform submission to raw_mn_signups format
 */
function transformJotformSubmission(submission: any, year: number) {
  const answers = submission.answers;

  return {
    submission_id: submission.id,
    year: year,
    mn_id: answers['3']?.answer || null, // Adjust field IDs
    first_name: answers['4']?.answer?.first || null,
    last_name: answers['4']?.answer?.last || null,
    preferred_name: answers['5']?.answer || null,
    phone: answers['6']?.answer || null,
    personal_email: answers['7']?.answer || null,
    uga_email: answers['8']?.answer || null,
    training_signup: answers['9']?.answer === 'Yes',
    submitted_at: submission.created_at,
    updated_at: submission.updated_at,
    raw_data: submission, // Store full submission for reference
  };
}
```

---

### Shared Logger Utility

```typescript
// supabase/functions/_shared/logger.ts

export class Logger {
  constructor(private context: string) {}

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;

    if (data) {
      logMessage += ` ${JSON.stringify(data)}`;
    }

    return logMessage;
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('INFO', message, data));
  }

  error(message: string, error?: any) {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage('ERROR', message, errorData));
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('WARN', message, data));
  }

  debug(message: string, data?: any) {
    console.debug(this.formatMessage('DEBUG', message, data));
  }
}
```

---

### Shared Config Loader

```typescript
// supabase/functions/_shared/config/sync-config-loader.ts

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export async function loadSyncConfig(year: number, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('year', year)
    .single();

  if (error) {
    throw new Error(`Failed to load sync config for year ${year}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No sync configuration found for year ${year}`);
  }

  return data;
}
```

---

### Local Testing

```bash
# 1. Start local Supabase
supabase start

# 2. Serve Edge Function
supabase functions serve sync-jotform --env-file .env.local --no-verify-jwt

# 3. Test with curl (dry run)
curl -X POST http://localhost:54321/functions/v1/sync-jotform \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "dry_run": true, "limit": 10}'

# 4. Test with curl (live)
curl -X POST http://localhost:54321/functions/v1/sync-jotform \
  -H "Content-Type: application/json" \
  -d '{"year": 2025}'

# 5. Check logs
supabase functions logs sync-jotform
```

---

### Production Deployment

```bash
# 1. Set secrets in Supabase
supabase secrets set JOTFORM_API_KEY=your-api-key --project-ref your-project-ref

# 2. Deploy function
supabase functions deploy sync-jotform --project-ref your-project-ref --no-verify-jwt

# 3. Test in production (dry run first)
curl -X POST https://your-project.supabase.co/functions/v1/sync-jotform \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "dry_run": true}'

# 4. Monitor logs
supabase functions logs sync-jotform --project-ref your-project-ref --follow
```

---

### Edge Function Performance Considerations

**Timeout Management**:
- Supabase Edge Functions have a 10-minute execution limit
- For large datasets (>1000 records), implement batching:

```typescript
// Process in batches of 100
const BATCH_SIZE = 100;
for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
  const batch = transformed.slice(i, i + BATCH_SIZE);
  await supabase.from('raw_mn_signups').upsert(batch);
  logger.info(`Processed batch ${i / BATCH_SIZE + 1}`);
}
```

**Memory Management**:
- Edge Functions have limited memory (512MB default)
- Stream large datasets instead of loading all at once
- Clear large objects after processing

**Error Recovery**:
- Log all errors to `sync_errors` table for review
- Implement retry logic for transient failures
- Use dry-run mode to validate before production run

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

## Phase 4: Integration & Testing
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

#### 4.4 - Comprehensive Testing Strategy

### Testing Philosophy

**Goal**: Ensure zero data loss, correct conflict resolution, and reliable sync operations

**Approach**: Test locally → Test on staging → Test in production (with monitoring)

---

### Local Testing Setup

**Prerequisites**:
```bash
# 1. Start local Supabase
supabase start

# 2. Run migrations
supabase db reset

# 3. Verify migrations applied
supabase db diff

# 4. In another terminal, serve Edge Functions locally
supabase functions serve --env-file .env.local

# 5. In another terminal, start Next.js
npm run dev

# 6. Open app
open http://localhost:3000/sync
```

**Environment Variables** (`.env.local`):
```env
# Supabase (local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# APIs
JOTFORM_API_KEY=your-jotform-key
GIVEBUTTER_API_KEY=your-givebutter-key

# Cron
CRON_SECRET=local-dev-secret
```

---

### Test Cases

#### **Test 1: Fresh Sync (Empty Database)**

**Purpose**: Verify system works from scratch

**Steps**:
1. Reset database: `supabase db reset`
2. Trigger sync via UI: `/sync` → Click "Run Full Sync"
3. Monitor progress in real-time
4. Check results

**Expected Outcomes**:
- [ ] All raw tables populated (`raw_mn_signups`, `raw_gb_full_contacts`, etc.)
- [ ] Mentors table has ~962 records
- [ ] mn_gb_import table populated with export data
- [ ] CSV file generated successfully
- [ ] sync_log entry created with status='completed'
- [ ] No errors in sync_errors table

**Validation Queries**:
```sql
-- Check record counts
SELECT 'raw_mn_signups' as table_name, COUNT(*) FROM raw_mn_signups
UNION ALL
SELECT 'mentors', COUNT(*) FROM mentors
UNION ALL
SELECT 'mn_gb_import', COUNT(*) FROM mn_gb_import;

-- Check for errors
SELECT * FROM sync_errors WHERE resolved = FALSE;

-- Check sync log
SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 5;
```

---

#### **Test 2: Incremental Sync**

**Purpose**: Verify only new/changed data is processed

**Setup**:
1. Run initial sync (Test 1)
2. Add 5 new Jotform submissions (manually or via test data)
3. Update 3 existing mentor records in Givebutter

**Steps**:
1. Run sync again via UI
2. Monitor for changes

**Expected Outcomes**:
- [ ] 5 new records added to raw_mn_signups
- [ ] 5 new mentors created
- [ ] 3 existing mentors updated (changes logged to mn_changes)
- [ ] sync_log shows incremental sync (records_processed = 8)
- [ ] No duplicates created

**Validation**:
```sql
-- Check changes were logged
SELECT * FROM mn_changes
WHERE detected_at > NOW() - INTERVAL '1 hour'
ORDER BY detected_at DESC;

-- Verify no duplicates
SELECT phone, COUNT(*) as count
FROM mentors
GROUP BY phone
HAVING COUNT(*) > 1;
```

---

#### **Test 3: Duplicate Contact Detection**

**Purpose**: Verify contact selector chooses correct contact when duplicates exist

**Setup**:
1. Create test mentor with phone: +1-555-0100
2. Create 3 Givebutter contacts with same phone:
   - Contact A: campaign member, recent, complete data
   - Contact B: old contact from 2024, has "Dropped 24" tag
   - Contact C: mass email contact (@uga.edu only, minimal info)

**Steps**:
1. Run sync

**Expected Outcomes**:
- [ ] Contact A selected as winner (highest score)
- [ ] Contacts B & C flagged for archival
- [ ] Winner gets External ID set to mentor's mn_id
- [ ] Sync proceeds without conflicts (auto-resolved)

---

#### **Test 4: Conflict Detection (Close Scoring)**

**Purpose**: Verify conflicts created when contact scores are similar

**Setup**:
1. Create test mentor
2. Create 2 Givebutter contacts with identical scores:
   - Contact A: recent, campaign member, complete data
   - Contact B: recent, campaign member, complete data

**Steps**:
1. Run sync

**Expected Outcomes**:
- [ ] Conflict created in sync_conflicts table
- [ ] conflict_type = 'contact_selection'
- [ ] Both options included with metadata
- [ ] Recommended option provided with reasoning
- [ ] Mentor skipped in sync (not added to mentors table yet)
- [ ] sync_log shows "conflicts_created: 1"

**Validation**:
```sql
SELECT * FROM sync_conflicts
WHERE status = 'pending'
ORDER BY detected_at DESC;
```

---

#### **Test 5: Conflict Resolution**

**Purpose**: Verify manual conflict resolution works

**Setup**: Use conflict from Test 4

**Steps**:
1. Navigate to `/conflicts`
2. View conflict details
3. Choose Option A
4. Click "Resolve"

**Expected Outcomes**:
- [ ] Conflict marked as resolved in database
- [ ] Mentor record created/updated with chosen contact_id
- [ ] Losing contact archived via Givebutter API
- [ ] Resolution logged to mn_changes
- [ ] Conflict disappears from pending list

---

#### **Test 6: Change Detection**

**Purpose**: Verify changes tracked correctly

**Setup**:
1. Complete initial sync
2. Manually update mentor in Givebutter UI:
   - Change phone from 555-0100 to 555-0200
   - Add "Dropped 25" tag

**Steps**:
1. Download fresh Givebutter export
2. Upload to raw_gb_full_contacts
3. Run ETL

**Expected Outcomes**:
- [ ] 2 changes logged to mn_changes:
  - change_type='field_change', field_name='phone'
  - change_type='dropped'
- [ ] Mentor record updated with new phone
- [ ] Mentor.dropped set to TRUE

---

#### **Test 7: CSV Export Validation**

**Purpose**: Verify exported CSV is valid for Givebutter import

**Steps**:
1. Run full sync + ETL
2. Generate CSV export
3. Validate CSV format

**Expected Outcomes**:
- [ ] CSV has required columns: Contact External ID, First Name, Last Name, etc.
- [ ] All mn_ids present as External IDs
- [ ] No duplicate External IDs
- [ ] Phone numbers in E.164 format
- [ ] Email addresses valid
- [ ] Custom fields populated correctly
- [ ] File size reasonable (~200KB for 962 records)

**Validation Script**:
```typescript
// backend/scripts/validate-csv.ts
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const csvContent = fs.readFileSync('./exports/givebutter-import.csv', 'utf-8');
const records = parse(csvContent, { columns: true });

// Check for duplicates
const externalIds = records.map(r => r['Contact External ID']);
const duplicates = externalIds.filter((id, index) => externalIds.indexOf(id) !== index);

if (duplicates.length > 0) {
  console.error('❌ Duplicate External IDs found:', duplicates);
  process.exit(1);
}

console.log(`✅ CSV valid: ${records.length} records, no duplicates`);
```

---

#### **Test 8: Edge Function - Sync Jotform**

**Environment**: Supabase Staging

**Steps**:
```bash
# Deploy to staging
supabase functions deploy sync-jotform-signups --project-ref staging-ref

# Test invocation
curl -X POST \
  https://your-project.supabase.co/functions/v1/sync-jotform-signups \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

**Expected Outcomes**:
- [ ] Function completes in < 2 minutes
- [ ] raw_mn_signups table updated
- [ ] Returns success: true
- [ ] sync_log entry created
- [ ] No errors in Edge Function logs

---

#### **Test 9: Edge Function - ETL Full**

**Environment**: Supabase Staging

**Purpose**: Verify ETL runs in Edge Function environment (Deno)

**Steps**:
1. Deploy ETL Edge Function
2. Ensure raw tables have data (from Test 8)
3. Invoke ETL function

**Expected Outcomes**:
- [ ] Function completes in < 10 minutes (within Edge Function limit)
- [ ] Mentors table populated/updated
- [ ] mn_gb_import table populated
- [ ] Changes tracked in mn_changes
- [ ] Conflicts logged (if any)

---

#### **Test 10: API Route - SSE Streaming**

**Environment**: Vercel Preview

**Purpose**: Verify real-time progress updates work

**Steps**:
1. Deploy to Vercel preview: `vercel --preview`
2. Navigate to `/sync`
3. Click "Run Full Sync"
4. Watch progress bar

**Expected Outcomes**:
- [ ] Progress updates stream in real-time
- [ ] Each step shows status (running, completed, failed)
- [ ] Final status displayed
- [ ] No timeout errors
- [ ] Can see progress for each sync stage:
  - "Syncing Jotform signups..."
  - "Syncing Givebutter members..."
  - "Running ETL..."
  - "Complete!"

---

#### **Test 11: Vercel Cron**

**Environment**: Vercel Production (after deployment)

**Purpose**: Verify scheduled syncs work

**Setup**:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-periodic",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

**Steps**:
1. Deploy to production
2. Wait for scheduled execution (or trigger manually via Vercel dashboard)
3. Check logs

**Expected Outcomes**:
- [ ] Cron triggers on schedule
- [ ] Authentication succeeds (CRON_SECRET verified)
- [ ] Sync orchestrator invoked
- [ ] Sync completes successfully
- [ ] Results logged to database

**Manual Trigger**:
```bash
curl https://your-app.vercel.app/api/cron/sync-periodic \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

### Load Testing

**Purpose**: Verify system handles production volumes

**Test Scenarios**:

#### Load Test 1: Large Dataset
- **Setup**: 1500 Jotform submissions, 2000 Givebutter contacts
- **Expected**: Sync completes in < 10 minutes, no timeouts

#### Load Test 2: High Conflict Rate
- **Setup**: Create 100 conflicts (similar contact scores)
- **Expected**: All conflicts logged, ETL continues for non-conflicting mentors

#### Load Test 3: Concurrent Requests
- **Setup**: Trigger 5 simultaneous syncs
- **Expected**: One completes, others queued or rejected gracefully

**Load Testing Tools**:
```bash
# Use k6 for API load testing
k6 run load-test.js

# Or Artillery
artillery run artillery-config.yml
```

---

### Regression Testing

**Create automated test suite**:

```typescript
// tests/e2e/sync.test.ts

import { test, expect } from '@playwright/test';

test.describe('Full Sync Flow', () => {
  test('should complete sync without errors', async ({ page }) => {
    await page.goto('http://localhost:3000/sync');

    // Click sync button
    await page.click('button:has-text("Run Full Sync")');

    // Wait for completion (max 5 minutes)
    await expect(page.locator('text=Sync Complete')).toBeVisible({ timeout: 300000 });

    // Check for errors
    const errorCount = await page.locator('[data-test-id="error-count"]').textContent();
    expect(errorCount).toBe('0');
  });

  test('should resolve conflicts', async ({ page }) => {
    await page.goto('http://localhost:3000/conflicts');

    // Should show conflicts if any
    const conflictCount = await page.locator('[data-test-id="conflict-count"]').textContent();

    if (parseInt(conflictCount || '0') > 0) {
      // Click first conflict
      await page.click('[data-test-id="conflict-item"]:first-child');

      // Choose Option A
      await page.click('button:has-text("Choose A")');

      // Verify resolved
      await expect(page.locator('text=Conflict Resolved')).toBeVisible();
    }
  });
});
```

---

### Validation Checklist

After ALL tests pass:

- [ ] All raw tables populated correctly
- [ ] Mentors table has correct data
- [ ] mn_gb_import table ready for export
- [ ] CSV exports without errors
- [ ] Conflicts logged and resolvable
- [ ] Changes tracked in mn_changes
- [ ] sync_log shows all operations
- [ ] No unresolved errors in sync_errors
- [ ] Edge Functions work in staging
- [ ] API routes work in Vercel preview
- [ ] Cron jobs trigger on schedule
- [ ] Performance acceptable (< 10 min for full sync)
- [ ] Data integrity maintained (no data loss)

**Deliverable**: Fully tested system ready for production
**Dependencies**: Phase 3 complete
**Risk**: Medium - integration bugs likely

---

## Phase 5: Production Deployment
**Goal**: Deploy to production, monitor closely

### Tasks

#### 5.1 - Pre-Deployment Checklist

**Code Quality Verification**:
```bash
# Run all tests
npm run test
npm run test:e2e

# TypeScript type checking
npx tsc --noEmit

# Lint check
npm run lint

# Build check
npm run build
```

**Environment Configuration**:
- [ ] All environment variables set in Vercel production
- [ ] All secrets set in Supabase Edge Functions
- [ ] `CRON_SECRET` generated and configured
- [ ] API keys verified (Jotform, Givebutter)
- [ ] Supabase URL and keys correct for production

**Database Readiness**:
```bash
# Verify staging database migration
supabase db push --db-url $STAGING_DATABASE_URL

# Create production backup
pg_dump $PROD_DATABASE_URL > backups/pre-migration-$(date +%Y%m%d).sql

# Apply migrations to production (DRY RUN)
supabase db push --db-url $PROD_DATABASE_URL --dry-run

# Apply migrations to production (LIVE)
supabase db push --db-url $PROD_DATABASE_URL
```

**Edge Functions Verification**:
- [ ] Edge Functions deployed to staging and tested
- [ ] Edge Functions invocation tested manually
- [ ] Edge Functions performance acceptable (<10 min)
- [ ] Edge Functions error handling verified

**Testing on Staging**:
- [ ] Full sync completed successfully on staging
- [ ] Conflict resolution UI works on staging
- [ ] CSV export downloads correctly
- [ ] Cron jobs trigger on schedule
- [ ] No errors in staging logs
- [ ] Performance benchmarks met

**Documentation & Communication**:
- [ ] Rollback plan documented (see 5.5)
- [ ] Team notified of deployment schedule
- [ ] Downtime window communicated (if any)
- [ ] Backup contact information verified
- [ ] Post-deployment monitoring plan ready

#### 5.2 - Staged Deployment

**Step 1: Deploy Edge Functions**

```bash
# Deploy all Edge Functions to production
supabase functions deploy sync-jotform --project-ref prod-ref
supabase functions deploy sync-givebutter --project-ref prod-ref
supabase functions deploy resolve-conflicts --project-ref prod-ref
supabase functions deploy generate-csv --project-ref prod-ref

# Verify deployment
supabase functions list --project-ref prod-ref
```

**Post-Deployment Verification**:
```bash
# Test manual invocation
curl -X POST https://your-project.supabase.co/functions/v1/sync-jotform \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# Check logs
supabase functions logs sync-jotform --project-ref prod-ref
```

**Monitor for 24 hours**:
- Check logs every 2 hours
- Verify no timeout errors
- Ensure dry-run mode works correctly
- **DO NOT enable auto-sync yet**

---

**Step 2: Deploy Next.js App**

```bash
# Deploy to Vercel production
vercel --prod

# Verify deployment
vercel ls
```

**Smoke Tests**:
```bash
# Test homepage loads
curl -I https://your-app.vercel.app/

# Test sync page loads
curl -I https://your-app.vercel.app/sync

# Test API routes
curl https://your-app.vercel.app/api/sync/status
curl https://your-app.vercel.app/api/sync/conflicts
```

**UI Verification** (manual):
- [ ] Login to app
- [ ] Navigate to Sync page
- [ ] Click "Run Full Sync" (observe it calls Edge Functions)
- [ ] Verify sync completes without errors
- [ ] Check sync_errors table is empty
- [ ] Navigate to Conflicts page (if any conflicts)
- [ ] Resolve one conflict manually
- [ ] Download CSV export
- [ ] Verify CSV contains correct data

**Monitor error rate**:
- Check Vercel logs for errors
- Check Supabase logs for database errors
- Verify no 500 errors in first hour
- Test performance (page load times)

---

**Step 3: Enable Cron Jobs**

**Update `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-jotform",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/sync-givebutter",
      "schedule": "30 2 * * *"
    }
  ]
}
```

```bash
# Redeploy with cron configuration
vercel --prod

# Verify CRON_SECRET is set
vercel env ls
```

**Monitor First Scheduled Execution**:
- [ ] Wait for first cron trigger (2:00 AM next day)
- [ ] Check Vercel cron logs: `vercel logs --follow`
- [ ] Verify sync completed successfully
- [ ] Check sync_log table for new entries
- [ ] Verify no errors in sync_errors table
- [ ] Check database was updated correctly
- [ ] Verify CSV export was generated

**Post-Deployment Checklist**:
- [ ] All Edge Functions responding
- [ ] Next.js app serving correctly
- [ ] Cron jobs triggering on schedule
- [ ] Database updates working
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Team notified of successful deployment

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

#### 5.5 - Rollback Plan

**IMPORTANT**: This section documents emergency rollback procedures. Familiarize yourself with these steps BEFORE deployment.

---

### Scenario 1: Edge Functions Fail

**Symptoms**:
- Edge Functions timing out (>10 minutes)
- Edge Functions returning 500 errors
- Database not updating after Edge Function calls

**Rollback Steps**:

```bash
# 1. Identify failing function
supabase functions logs sync-jotform --project-ref prod-ref

# 2. Revert to previous version in Supabase dashboard
# Navigate to: Supabase Dashboard → Edge Functions → sync-jotform → Deployments → Revert

# 3. Alternatively, redeploy previous version from git
git checkout <previous-commit-hash>
supabase functions deploy sync-jotform --project-ref prod-ref
```

**Mitigation**:
- Next.js app continues to work (frontend still accessible)
- Use old `backend/` scripts locally for emergency sync:
  ```bash
  cd backend
  npx tsx scripts/process.ts
  ```

**Data Integrity Check**:
```sql
-- Check if any data was partially written
SELECT * FROM sync_log WHERE status = 'in_progress' ORDER BY started_at DESC LIMIT 10;

-- Check for errors
SELECT * FROM sync_errors WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;
```

---

### Scenario 2: Next.js Deployment Fails

**Symptoms**:
- Vercel deployment fails to build
- 500 errors on all pages
- UI not loading

**Rollback Steps**:

```bash
# 1. Check deployment logs
vercel logs

# 2. Revert in Vercel dashboard
# Navigate to: Vercel Dashboard → Deployments → Select previous deployment → Promote to Production

# 3. Alternatively, redeploy previous version from CLI
git checkout <previous-commit-hash>
vercel --prod
```

**Mitigation**:
- Edge Functions remain available for manual invocation via CLI
- Can manually trigger sync via Supabase dashboard
- Database operations unaffected

**Manual Edge Function Invocation**:
```bash
# Run sync manually if UI is down
curl -X POST https://your-project.supabase.co/functions/v1/sync-jotform \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

### Scenario 3: Database Migration Fails

**Symptoms**:
- Migration errors during `supabase db push`
- Missing tables or columns
- Foreign key constraint violations
- Application errors referencing missing database objects

**Rollback Steps**:

```bash
# 1. STOP ALL DEPLOYMENTS IMMEDIATELY
# Do not deploy Edge Functions or Next.js until database is fixed

# 2. Restore from pre-migration backup
pg_restore -d $PROD_DATABASE_URL backups/pre-migration-<date>.sql

# 3. Verify backup restoration
psql $PROD_DATABASE_URL -c "\dt"  # List tables
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM mentors;"  # Verify data

# 4. Roll back migration files
cd supabase/migrations
git checkout HEAD~1 -- *.sql

# 5. Test migration in staging first
supabase db push --db-url $STAGING_DATABASE_URL

# 6. Re-apply to production after fixing
supabase db push --db-url $PROD_DATABASE_URL
```

**Critical Checks After Restore**:
```sql
-- Verify critical tables exist
SELECT COUNT(*) FROM mentors;
SELECT COUNT(*) FROM mn_gb_import;
SELECT COUNT(*) FROM sync_configs;

-- Verify relationships intact
SELECT m.mn_id, g.gb_contact_id
FROM mentors m
LEFT JOIN mn_gb_import g ON m.mn_id = g."Contact External ID"
LIMIT 10;

-- Check for data loss
SELECT
  (SELECT COUNT(*) FROM mentors) as mentor_count,
  (SELECT COUNT(*) FROM mn_gb_import) as import_count;
```

---

### Scenario 4: Data Corruption Detected

**Symptoms**:
- Duplicate mn_id values in mentors table
- Missing data in critical fields
- Incorrect contact matching
- High number of unresolved conflicts (>50%)

**Emergency Response**:

```bash
# 1. IMMEDIATELY DISABLE CRON JOBS
# Remove cron configuration from vercel.json
vercel --prod

# 2. Restore from last known good backup
pg_restore -d $PROD_DATABASE_URL backups/pre-migration-<date>.sql

# 3. Identify corruption source
# Check sync_log for failed operations
psql $PROD_DATABASE_URL -c "
  SELECT * FROM sync_log
  WHERE status = 'failed'
  ORDER BY started_at DESC
  LIMIT 20;
"

# 4. Check sync_errors for patterns
psql $PROD_DATABASE_URL -c "
  SELECT error_type, COUNT(*)
  FROM sync_errors
  GROUP BY error_type
  ORDER BY COUNT(*) DESC;
"
```

**Data Integrity Validation**:
```sql
-- Check for duplicate mn_id (should be 0)
SELECT mn_id, COUNT(*)
FROM mentors
GROUP BY mn_id
HAVING COUNT(*) > 1;

-- Check for orphaned records
SELECT COUNT(*)
FROM mn_gb_import g
LEFT JOIN mentors m ON g."Contact External ID" = m.mn_id
WHERE m.mn_id IS NULL;

-- Verify contact matching accuracy
SELECT
  conflict_type,
  COUNT(*)
FROM sync_conflicts
WHERE status = 'unresolved'
GROUP BY conflict_type;
```

**Recovery Steps**:
1. Fix data corruption source in code
2. Test fix in local environment with production data snapshot
3. Test fix in staging environment
4. Deploy fix to production
5. Run one-time data cleanup script if needed
6. Re-enable cron jobs only after validation

---

### Scenario 5: Critical Bug in Production

**Symptoms**:
- Application works but produces incorrect results
- Silent data corruption (no errors logged)
- Financial or compliance implications

**Emergency Response**:

```bash
# 1. IMMEDIATELY DISABLE CRON JOBS
# This prevents automated corruption

# 2. Add temporary maintenance message
# Update src/app/sync/page.tsx with banner:
# "Sync is temporarily unavailable for maintenance. Expected back: [TIME]"

# 3. Investigate issue in staging environment
git checkout production
# Fix bug in new branch
git checkout -b hotfix/critical-bug

# 4. Test fix thoroughly
npm run test
npm run test:e2e

# 5. Deploy hotfix
git commit -m "hotfix: [description]"
git push origin hotfix/critical-bug
vercel --prod

# 6. Verify fix in production
# Run manual smoke tests

# 7. Re-enable cron jobs
# Restore cron configuration and redeploy
```

---

### Emergency Contacts

**Technical Escalation**:
- Primary: [Your Name] - [Phone] - [Email]
- Secondary: [Backup Contact] - [Phone] - [Email]

**Service Providers**:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Database Admin: [Contact Info]

**Incident Response Checklist**:
- [ ] Identify which scenario applies (Edge Functions, Next.js, Database, Data)
- [ ] Follow rollback steps for that scenario
- [ ] Document what happened (for post-mortem)
- [ ] Notify team of issue and resolution
- [ ] Verify system is working correctly after rollback
- [ ] Plan fix and re-deployment
- [ ] Conduct post-mortem to prevent recurrence

**Post-Rollback Validation**:
```bash
# After any rollback, verify these work:

# 1. UI loads
curl -I https://your-app.vercel.app/

# 2. Database is accessible
psql $PROD_DATABASE_URL -c "SELECT 1;"

# 3. Edge Functions respond
curl https://your-project.supabase.co/functions/v1/health

# 4. Manual sync works
# Navigate to /sync page and click "Run Full Sync"

# 5. Data is intact
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM mentors;"
```

**Deliverable**: Production system live
**Dependencies**: Phase 4 complete
**Risk**: High - production issues expected

---

## Phase 6: Optimization & Polish
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
Early Phases:
├─ [Team A] Phase 1 - Database Schema + Config System
└─ [Team B] Phase 2 - Start ETL refactoring

Mid Phases:
├─ [Team A] Phase 3 - Set up Edge Functions environment
└─ [Team B] Phase 2 - Continue ETL + conflict detection

Migration Phase:
├─ [Team A] Phase 3 - Migrate sync scripts to Edge Functions
├─ [Team B] Phase 3 - Migrate ETL to Edge Functions
└─ [Team C] Phase 4 - Build conflict resolution UI

Integration Phase:
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

# SEQUENTIAL IMPLEMENTATION ROADMAP

**Document Version:** 2.0
**Last Updated:** October 28, 2025
**Status:** Ready for Execution
**Estimated Total Timeline:** 12-16 weeks (3-4 months)

---

## Overview: The Path from 55% to 100%

This roadmap provides a **clear, sequential path** to implement the complete unified architecture. Each phase builds on the previous one, with clear dependencies, deliverables, and success criteria.

**Phase 0 & 1 Note:** These phases are ✅ COMPLETE and documented in `PHASE_0_COMPLETE.md` and `PHASE_1_COMPLETE.md`. This appendix focuses on the remaining implementation work (Phase 2-6).

### Current State: ~55% Complete
- ✅ Phase 0 complete: CSV upload errors fixed (0 errors, 955/955 mentors uploaded)
- ✅ Phase 1 complete: Database infrastructure ready (sync_configs, sync_conflicts, sync_warnings tables)
- ✅ Core ETL working (1,136 lines, production-hardened but monolithic)
- ✅ Sync orchestration functional with SSE streaming
- ✅ Frontend UI complete with check-in system
- ✅ Config loader built (partially adopted across sync scripts)
- ⚠️ Config system partially adopted (some scripts still use old sync_config table)
- ❌ No conflict detection implementation (tables exist but no API/UI)
- ❌ No serverless (won't work on Vercel production)
- ❌ No partner matching logic
- ❌ No multi-status system

### Target State: 100% Complete
- ✅ Modular, maintainable ETL (8 focused modules)
- ✅ Full config loader adoption (all scripts migrated)
- ✅ Intelligent conflict detection with auto-resolve + UI
- ✅ Complete change tracking and audit trail
- ✅ Partner preference form integrated with matching logic
- ✅ Multi-status system via tags
- ✅ Serverless architecture (Edge Functions + Vercel)
- ✅ Production-ready with monitoring and alerts

---

## 🔧 Phase 2: Core Refactoring (3 weeks)

**Duration:** 15 working days
**Priority:** HIGH - Required for conflict-free sync
**Owner:** Backend Team + QA
**Status:** 🟢 Ready to Start (Phase 1 Complete)

### Goals
1. Complete config loader migration across all sync scripts
2. Implement conflict detection system with API/UI
3. Implement change tracking and audit trail
4. Add contact archival service
5. Break monolithic ETL into 8 focused modules
6. **NEW:** Add Givebutter website field to export
7. **NEW:** Fix UGA class logic (training form priority)
8. **NEW:** Integrate partner & shift preference form (ID: 252988541198170)
9. **NEW:** Implement multi-status system via tags

### Week 1: ETL Modularization

#### 2.1: Design ETL Module Structure (Day 1)

**Create:** `src/lib/server/etl/orchestrator.ts`

```typescript
export interface ETLContext {
  supabase: SupabaseClient;
  logger: Logger;
  config: SyncConfig;
  year: number;
  // Shared data between steps
  rawData: {
    signups: Signup[];
    setup: Setup[];
    training: Training[];
    gbContacts: Contact[];
    gbMembers: Member[];
  };
  processed: {
    mentors: Mentor[];
    conflicts: Conflict[];
    changes: Change[];
    toArchive: { mn_id: string; contactIds: number[] }[];
  };
  metrics: {
    totalProcessed: number;
    conflictsDetected: number;
    autoResolved: number;
    manualRequired: number;
    changesLogged: number;
  };
}

export interface ETLStepResult {
  success: boolean;
  recordsProcessed: number;
  errors: Error[];
  warnings: string[];
  metrics: Record<string, any>;
}
```

#### 2.2: Implement ETL Steps (Days 2-8)

**Create 8 Module Files:**

1. **`etl/steps/01-load-raw.ts`** (Day 2)
   - Load from all raw_* tables
   - Return structured data in ETLContext

2. **`etl/steps/02-validate.ts`** (Day 2)
   - Validate mn_id presence
   - Validate phone format
   - Validate email format
   - Log errors to sync_errors

3. **`etl/steps/03-deduplicate.ts`** (Day 3)
   - Group by phone number
   - Keep most recent submission
   - Log deduplication actions

4. **`etl/steps/04-match-contacts.ts`** (Day 4-5)
   - Implement contact scoring
   - Detect conflicts (close scores)
   - Auto-resolve when clear winner
   - Log conflicts to sync_conflicts

5. **`etl/steps/05-merge-data.ts`** (Day 6)
   - Apply conflict resolution rules
   - Build complete mentor records
   - Handle protected fields (immutable)

6. **`etl/steps/06-detect-changes.ts`** (Day 7)
   - Compare old vs new mentor data
   - Log to mn_changes table
   - Track significant changes

7. **`etl/steps/07-populate-export.ts`** (Day 7)
   - Generate mn_gb_import records
   - Apply custom field mappings
   - Validate export format

8. **`etl/steps/08-archive-duplicates.ts`** (Day 8)
   - Archive losing contacts via GB API
   - Rate limiting (100ms between calls)
   - Log archival actions

**Each Module Testing:**
```bash
npm run test -- steps/01-load-raw.test.ts
# Repeat for all 8 modules
```

#### 2.3: Implement Orchestrator (Day 9)

**File:** `src/lib/server/etl/orchestrator.ts`

```typescript
export async function runETL(year: number): Promise<ETLResult> {
  const context: ETLContext = await initializeContext(year);

  const steps = [
    { name: 'Load Raw Data', execute: loadRawStep },
    { name: 'Validate', execute: validateStep },
    { name: 'Deduplicate', execute: deduplicateStep },
    { name: 'Match Contacts', execute: matchContactsStep },
    { name: 'Merge Data', execute: mergeDataStep },
    { name: 'Detect Changes', execute: detectChangesStep },
    { name: 'Populate Export', execute: populateExportStep },
    { name: 'Archive Duplicates', execute: archiveDuplicatesStep },
  ];

  for (const step of steps) {
    context.logger.info(`Starting: ${step.name}`);
    const result = await step.execute(context);

    if (!result.success) {
      context.logger.error(`Failed: ${step.name}`, result.errors);
      throw new Error(`ETL failed at step: ${step.name}`);
    }

    context.logger.info(`Completed: ${step.name}`, result.metrics);
  }

  return {
    success: true,
    totalRecords: context.metrics.totalProcessed,
    conflicts: context.metrics.conflictsDetected,
    changes: context.metrics.changesLogged,
  };
}
```

**Test Full Pipeline:**
```bash
npm run test -- etl/orchestrator.test.ts
```

### Week 2: Conflict Detection & Change Tracking

#### 2.4: Implement ConflictDetector (Days 10-11)

**File:** `src/lib/server/processors/conflict-detector.ts`

**Implementation:** (See Phase 2.2 in main document for complete code)

**Key Features:**
- `detectContactSelectionConflict()` - When multiple contacts score similarly
- `detectPhoneMismatch()` - When phone differs between sources
- `detectEmailMismatch()` - When email differs
- `detectExternalIdCollision()` - When two mentors claim same External ID
- `logConflict()` - Persist to sync_conflicts table

**Tests:**
```typescript
describe('ConflictDetector', () => {
  it('should auto-resolve when score diff > 100', async () => {
    const candidates = [
      { contact_id: 1, score: 800 },  // Clear winner
      { contact_id: 2, score: 650 },
    ];

    const result = await detector.detectContactSelectionConflict('MN001', candidates);

    expect(result.hasConflict).toBe(false);
    expect(result.autoResolve).toBe(true);
    expect(result.winner.contact_id).toBe(1);
  });

  it('should create conflict when scores close', async () => {
    const candidates = [
      { contact_id: 1, score: 800 },
      { contact_id: 2, score: 795 },  // Within 10 points
    ];

    const result = await detector.detectContactSelectionConflict('MN001', candidates);

    expect(result.hasConflict).toBe(true);
    expect(result.autoResolve).toBe(false);
    expect(result.conflict).toBeDefined();
    expect(result.conflict.recommended_option).toBe('a'); // Higher score
  });
});
```

#### 2.5: Implement ChangeDetector (Day 12)

**File:** `src/lib/server/processors/change-detector.ts`

**Implementation:** (See Phase 2.3 in main document)

**Tracked Fields:**
- `phone`, `personal_email`, `uga_email`
- `training_signup`, `training_signup_done`, `training_at`
- `amount_raised`, `fundraised_at`
- `dropped`
- `first_name`, `last_name`, `preferred_name`

**Special Detection:**
- New mentor created → `change_type: 'new_mentor'`
- Dropped status → `change_type: 'dropped'`
- Reactivated → `change_type: 'reactivated'`
- Field changed → `change_type: 'field_change'` with old/new values

#### 2.6: Implement ContactArchiver (Day 13)

**File:** `src/lib/server/services/contact-archiver.ts`

**Implementation:** (See Critical Implementation Details section)

**Critical Features:**
- Rate limiting (100ms between API calls)
- Error handling (continue on individual failures)
- Logging (all archival actions to mn_changes)

**Add Methods to GivebutterClient:**
```typescript
async archiveContact(contactId: number): Promise<void> {
  const response = await this.request('POST', `/contacts/${contactId}/archive`);
  if (!response.ok) {
    throw new Error(`Failed to archive contact ${contactId}`);
  }
}

async restoreContact(contactId: number): Promise<void> {
  const response = await this.request('POST', `/contacts/${contactId}/restore`);
  if (!response.ok) {
    throw new Error(`Failed to restore contact ${contactId}`);
  }
}
```

### Week 3: API Routes & UI

#### 2.7: Create Conflict Management API (Days 14-15)

**Files:**
1. `src/app/api/sync/conflicts/route.ts` - List conflicts
2. `src/app/api/sync/conflicts/[id]/route.ts` - Resolve conflict
3. `src/app/api/mentors/[mn_id]/changes/route.ts` - Change history

**Implementation:** (See Phase 2.2.1 in main document)

**Test API Endpoints:**
```bash
# List conflicts
curl http://localhost:3000/api/sync/conflicts

# Resolve conflict
curl -X POST http://localhost:3000/api/sync/conflicts/1 \
  -H "Content-Type: application/json" \
  -d '{"decision": "a", "resolved_by": "admin"}'

# Get change history
curl http://localhost:3000/api/mentors/MN001/changes
```

#### 2.8: Build Conflict Resolution UI (Optional - can defer to Phase 4)

**File:** `src/app/conflicts/page.tsx`

**Features:**
- List all pending conflicts
- Show side-by-side comparison (Option A vs B)
- Display recommendation with reasoning
- Allow user to choose A, B, or custom value
- Bulk actions: "Accept all recommendations"

### Phase 2 Success Criteria
- ✅ ETL broken into 8 modules (< 150 lines each)
- ✅ Conflict detection catches ambiguous cases
- ✅ Auto-resolve works for >90% of duplicates
- ✅ Change tracking logs all field changes
- ✅ Contact archival works with rate limiting
- ✅ All tests passing (unit + integration)
- ✅ Conflict API endpoints functional

### Deliverables
1. 8 modular ETL step files
2. ETL orchestrator
3. ConflictDetector class with tests
4. ChangeDetector class with tests
5. ContactArchiver service with tests
6. Conflict management API routes
7. Updated documentation

---

## ☁️ Phase 3: Serverless Migration (3-4 weeks)

**Duration:** 15-20 working days
**Priority:** MEDIUM - Required for production deployment
**Owner:** DevOps + Backend Team
**Status:** 🔵 Blocked by Phase 2

### Goals
1. Set up Supabase Edge Functions environment
2. Migrate all sync scripts to Edge Functions
3. Migrate ETL to Edge Functions
4. Update API routes to invoke Edge Functions
5. Set up Vercel cron jobs

### Week 1: Environment Setup & Pilot

#### 3.1: Install & Configure Supabase CLI (Day 1)

```bash
# Install
brew install supabase/tap/supabase

# Verify
supabase --version

# Link to project
supabase link --project-ref your-project-ref

# Verify linked
supabase status
```

#### 3.2: Create Edge Functions Structure (Day 1)

```bash
cd supabase

# Create sync functions
supabase functions new sync-jotform-signups
supabase functions new sync-jotform-setup
supabase functions new sync-jotform-training
supabase functions new sync-givebutter-members
supabase functions new sync-givebutter-contacts

# Create ETL functions
supabase functions new etl-orchestrator

# Create export function
supabase functions new export-csv-stream

# Create shared code directory
mkdir -p functions/_shared
```

#### 3.3: Set Up Shared Code Symlink (Day 1)

```bash
cd supabase/functions
ln -s ../../src/lib/server _shared

# Verify symlink works
ls -la _shared/
```

#### 3.4: Configure Deno Import Map (Day 1)

**File:** `supabase/functions/import_map.json`

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

#### 3.5: Pilot Migration: sync-jotform-signups (Days 2-3)

**File:** `supabase/functions/sync-jotform-signups/index.ts`

**Implementation:** (See Phase 3.2 in main document for complete template)

**Key Features:**
- CORS handling
- Request parsing
- Environment variable validation
- Config loading from database
- Jotform client integration
- Error handling with sync_log updates
- Dry-run mode support

**Local Testing:**
```bash
# Start local Supabase
supabase start

# Serve function
supabase functions serve sync-jotform-signups --env-file .env.local --no-verify-jwt

# Test with dry run
curl -X POST http://localhost:54321/functions/v1/sync-jotform-signups \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "dry_run": true, "limit": 10}'

# Check logs
supabase functions logs sync-jotform-signups
```

**Deploy to Staging:**
```bash
# Set secrets
supabase secrets set JOTFORM_API_KEY=your-key --project-ref staging-ref

# Deploy
supabase functions deploy sync-jotform-signups --project-ref staging-ref

# Test in staging
curl -X POST https://your-staging.supabase.co/functions/v1/sync-jotform-signups \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "dry_run": true}'
```

**Validation:**
- ✅ Function completes in < 2 minutes
- ✅ raw_mn_signups table updated correctly
- ✅ Returns success: true
- ✅ sync_log entry created
- ✅ No errors in logs

**Decision Point:** If pilot successful, proceed with remaining migrations. If issues found, fix before continuing.

### Week 2: Migrate Remaining Sync Scripts (Days 4-8)

Use same pattern as pilot for:
1. `sync-jotform-setup` (Day 4)
2. `sync-jotform-training` (Day 5)
3. `sync-givebutter-members` (Day 6)
4. `sync-givebutter-contacts` (Day 7)
5. Test all together (Day 8)

**Testing Checklist (for each):**
```bash
# Local test
supabase functions serve {function-name}
curl -X POST http://localhost:54321/functions/v1/{function-name}

# Deploy to staging
supabase functions deploy {function-name} --project-ref staging-ref

# Test in staging
curl -X POST https://staging.supabase.co/functions/v1/{function-name}

# Verify data in database
psql $STAGING_DB -c "SELECT COUNT(*) FROM {target-table};"
```

### Week 3: ETL Migration (Days 9-13)

#### 3.6: Create ETL Edge Functions

**Option A: Single Function** (Simpler, recommended for start)
- `etl-orchestrator` - Runs all 8 steps in sequence
- Timeout risk: Must complete in < 10 minutes
- If timeouts occur, switch to Option B

**Option B: Separate Functions** (More complex, better performance)
- `etl-validate`
- `etl-deduplicate`
- `etl-match-contacts`
- `etl-merge-data`
- `etl-detect-changes`
- `etl-populate-export`
- `etl-orchestrator` - Calls each function via HTTP

**Implementation Strategy:**
1. Start with Option A (single function)
2. Test with production data volumes
3. If completes in < 10 min, keep Option A
4. If timeouts, refactor to Option B

**File:** `supabase/functions/etl-orchestrator/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runETL } from '../_shared/etl/orchestrator.ts'

serve(async (req) => {
  const { year = 2025 } = await req.json().catch(() => ({}));

  try {
    const result = await runETL(year);

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Testing:**
```bash
# Local test with real data
supabase functions serve etl-orchestrator
curl -X POST http://localhost:54321/functions/v1/etl-orchestrator \
  -d '{"year": 2025}'

# Monitor execution time (should be < 10 minutes)

# Deploy to staging
supabase functions deploy etl-orchestrator --project-ref staging-ref

# Test in staging with production data snapshot
```

#### 3.7: Create CSV Export Function (Days 14-15)

**File:** `supabase/functions/export-csv-stream/index.ts`

**Implementation:** (See Phase 3.5 in main document)

**Key Features:**
- Stream CSV directly to response (no temp files)
- Query mn_gb_import table
- Generate CSV with proper headers
- Return as downloadable attachment

### Week 4: API Routes & Cron (Days 16-20)

#### 3.8: Update API Routes (Days 16-17)

**Files to Update:**
1. `src/app/api/sync/run/route.ts`
2. `src/app/api/sync/jotform/route.ts`
3. `src/app/api/sync/givebutter/route.ts`
4. `src/app/api/etl/run/route.ts`

**Pattern:**
```typescript
// Before (spawn Node.js script)
const child = spawn('tsx', ['backend/core/sync/jotform-signups.ts']);

// After (invoke Edge Function)
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-jotform-signups`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year: 2025 }),
  }
);

const result = await response.json();
```

**Test Each Route:**
```bash
# Start Next.js
npm run dev

# Test sync endpoint
curl http://localhost:3000/api/sync/run

# Verify it calls Edge Function
# Check Edge Function logs
supabase functions logs sync-jotform-signups --follow
```

#### 3.9: Set Up Vercel Cron (Days 18-19)

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-jotform",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/sync-givebutter",
      "schedule": "30 2 * * *"
    },
    {
      "path": "/api/cron/run-etl",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/export-csv",
      "schedule": "0 4 * * *"
    }
  ]
}
```

**Create Cron Routes:**

**File:** `src/app/api/cron/sync-periodic/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Invoke sync orchestrator Edge Function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const result = await response.json();

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**Deploy & Test:**
```bash
# Deploy to Vercel
vercel --prod

# Test cron manually (before scheduled time)
curl https://your-app.vercel.app/api/cron/sync-periodic \
  -H "Authorization: Bearer $CRON_SECRET"

# Verify in Vercel dashboard
# Deployments → Cron Jobs → View logs
```

#### 3.10: Cleanup (Day 20)

**Validation:**
- ✅ All sync operations work via Edge Functions
- ✅ All API routes invoke Edge Functions
- ✅ Cron jobs trigger on schedule
- ✅ Performance acceptable (< 10 min for full sync)
- ✅ Error handling works correctly

**Optional Cleanup** (can defer):
- Keep `backend/` directory for now (as backup/fallback)
- Can delete after Phase 5 (production deployment successful)

### Phase 3 Success Criteria
- ✅ All sync scripts migrated to Edge Functions
- ✅ ETL running as Edge Function(s)
- ✅ CSV export streaming from Edge Function
- ✅ API routes invoke Edge Functions (no spawn)
- ✅ Vercel cron jobs configured and tested
- ✅ Full sync completes in < 10 minutes
- ✅ All Edge Functions deployed to staging
- ✅ No timeout errors

### Deliverables
1. 6+ Edge Functions (deployed and tested)
2. Updated API routes
3. Vercel cron configuration
4. Edge Function deployment documentation
5. Performance benchmarks

---

## 🧪 Phase 4: Integration & Testing (2 weeks)

**Duration:** 10 working days
**Priority:** CRITICAL - Validates entire system
**Owner:** QA Team + Backend Team
**Status:** 🔵 Blocked by Phase 3

### Goals
1. Comprehensive test coverage
2. Load testing with production volumes
3. End-to-end validation
4. Performance optimization
5. Bug fixes before production

### Week 1: Test Suite Development (Days 1-5)

#### 4.1: Unit Tests (Days 1-2)

**Test Coverage:**
- ✅ Config loader
- ✅ Conflict detector
- ✅ Change detector
- ✅ Contact selector
- ✅ Contact archiver
- ✅ All ETL steps

**Example:**
```typescript
// src/lib/server/processors/conflict-detector.test.ts
import { ConflictDetector } from './conflict-detector';

describe('ConflictDetector', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector(mockSupabase, mockLogger);
  });

  describe('Contact Selection', () => {
    it('auto-resolves when score difference > 100', async () => {
      // Test implementation
    });

    it('creates conflict when scores within 10 points', async () => {
      // Test implementation
    });

    it('handles mass email contacts correctly', async () => {
      // Test implementation
    });
  });

  describe('Phone Mismatch', () => {
    it('auto-resolves when Jotform data > 30 days newer', async () => {
      // Test implementation
    });

    it('creates conflict when recency within 30 days', async () => {
      // Test implementation
    });
  });
});
```

**Run Tests:**
```bash
npm run test -- --coverage
# Target: > 80% coverage
```

#### 4.2: Integration Tests (Days 3-4)

**Test Scenarios:**
1. Fresh sync (empty database)
2. Incremental sync (only new data)
3. Duplicate contact detection
4. Conflict creation and resolution
5. Change tracking
6. CSV export validation

**Implementation:** (See Phase 4.4 in main document for detailed test cases)

#### 4.3: E2E Tests (Day 5)

**Tool:** Playwright

**File:** `tests/e2e/sync-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Full Sync Flow', () => {
  test('should complete sync without errors', async ({ page }) => {
    // Navigate to sync page
    await page.goto('http://localhost:3000/sync');

    // Click sync button
    await page.click('button:has-text("Run Full Sync")');

    // Wait for completion (max 10 minutes)
    await expect(
      page.locator('text=Sync Complete')
    ).toBeVisible({ timeout: 600000 });

    // Verify no errors
    const errorCount = await page.locator('[data-testid="error-count"]').textContent();
    expect(errorCount).toBe('0');
  });

  test('should resolve conflicts via UI', async ({ page }) => {
    await page.goto('http://localhost:3000/conflicts');

    // If conflicts exist
    const conflictCount = await page.locator('[data-testid="conflict-count"]').textContent();

    if (parseInt(conflictCount) > 0) {
      // Click first conflict
      await page.click('[data-testid="conflict-item"]:first-child');

      // Choose recommended option
      await page.click('button:has-text("Accept Recommendation")');

      // Verify resolved
      await expect(page.locator('text=Conflict Resolved')).toBeVisible();
    }
  });
});
```

**Run E2E Tests:**
```bash
npm run test:e2e
```

### Week 2: Load Testing & Optimization (Days 6-10)

#### 4.4: Load Testing Setup (Day 6)

**Tool:** k6 or Artillery

**File:** `tests/load/sync-load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 concurrent
    { duration: '5m', target: 10 }, // Stay at 10
    { duration: '2m', target: 0 },  // Ramp down
  ],
};

export default function () {
  // Trigger sync
  const res = http.post('https://your-app.vercel.app/api/sync/run', {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'completed without errors': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
  });

  sleep(60); // Wait 60s between requests
}
```

**Run Load Tests:**
```bash
k6 run tests/load/sync-load-test.js
```

#### 4.5: Load Test Scenarios (Days 7-8)

**Scenario 1: Large Dataset**
- 1500 Jotform submissions
- 2000 Givebutter contacts
- Expected: Completes in < 10 minutes

**Scenario 2: High Conflict Rate**
- Create 100 conflicts (similar scores)
- Expected: All conflicts logged correctly

**Scenario 3: Concurrent Requests**
- Trigger 5 simultaneous syncs
- Expected: Queue or reject gracefully

#### 4.6: Performance Optimization (Days 9-10)

**Database Query Optimization:**
```sql
-- Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_mentors_phone ON mentors(phone);
CREATE INDEX IF NOT EXISTS idx_mentors_email ON mentors(personal_email);
CREATE INDEX IF NOT EXISTS idx_gb_contacts_phone ON raw_gb_full_contacts(primary_phone);
CREATE INDEX IF NOT EXISTS idx_gb_contacts_external_id ON raw_gb_full_contacts(external_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM mentors WHERE phone = '+15555551234';
```

**Edge Function Optimization:**
- Implement batching (process 100 records at a time)
- Add caching for config (avoid repeated DB queries)
- Optimize SQL queries (use indexes)

**Validation:**
- ✅ Full sync < 5 minutes (down from 10)
- ✅ ETL processes 1000 records/minute
- ✅ No timeout errors
- ✅ Database CPU < 50% during sync

### Phase 4 Success Criteria
- ✅ All 10 test scenarios passing
- ✅ > 80% code coverage
- ✅ E2E tests passing
- ✅ Load tests passing (1500+ records)
- ✅ Performance optimized (< 5 min sync)
- ✅ No critical bugs
- ✅ Documentation updated

### Deliverables
1. Unit test suite (> 80% coverage)
2. Integration test suite
3. E2E test suite (Playwright)
4. Load test scripts (k6)
5. Performance benchmarks
6. Bug fix commits
7. Test documentation

---

## 🚀 Phase 5: Production Deployment (1-2 weeks)

**Duration:** 5-10 working days
**Priority:** CRITICAL - Go-live
**Owner:** DevOps Team + Lead Developer
**Status:** 🔵 Blocked by Phase 4

### Pre-Deployment Checklist

#### 5.1: Code Quality Verification (Day 1)

```bash
# All tests pass
npm run test
npm run test:e2e
npm run test:load

# TypeScript type checking
npx tsc --noEmit

# Lint check
npm run lint

# Build check
npm run build
```

#### 5.2: Environment Configuration (Day 1)

**Vercel Production:**
```bash
# Set all environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add CRON_SECRET production

# Verify
vercel env ls
```

**Supabase Edge Functions:**
```bash
# Set secrets
supabase secrets set JOTFORM_API_KEY=prod-key --project-ref prod-ref
supabase secrets set GIVEBUTTER_API_KEY=prod-key --project-ref prod-ref

# Verify
supabase secrets list --project-ref prod-ref
```

#### 5.3: Database Backup (Day 1)

```bash
# Create pre-deployment backup
pg_dump $PROD_DATABASE_URL > backups/pre-deployment-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh backups/

# Store in secure location (S3, etc.)
aws s3 cp backups/pre-deployment-*.sql s3://your-backup-bucket/
```

#### 5.4: Database Migration (Day 2)

```bash
# Dry run (test migration without applying)
supabase db push --db-url $PROD_DATABASE_URL --dry-run

# Review output carefully

# Apply migration (if dry run successful)
supabase db push --db-url $PROD_DATABASE_URL

# Verify tables created
psql $PROD_DATABASE_URL -c "\dt" | grep -E "sync_configs|sync_conflicts|sync_warnings"

# Verify data intact
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM mentors;"
```

### Staged Deployment

#### 5.5: Deploy Edge Functions (Days 3-4)

**Day 3: Deploy Sync Functions**
```bash
# Deploy one at a time, test each
supabase functions deploy sync-jotform-signups --project-ref prod-ref
supabase functions deploy sync-jotform-setup --project-ref prod-ref
supabase functions deploy sync-jotform-training --project-ref prod-ref
supabase functions deploy sync-givebutter-members --project-ref prod-ref
supabase functions deploy sync-givebutter-contacts --project-ref prod-ref

# Verify deployment
supabase functions list --project-ref prod-ref
```

**Test Each Function:**
```bash
# Dry run test
curl -X POST https://your-prod.supabase.co/functions/v1/sync-jotform-signups \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "dry_run": true, "limit": 10}'

# Check logs
supabase functions logs sync-jotform-signups --project-ref prod-ref
```

**Day 4: Deploy ETL & Export Functions**
```bash
supabase functions deploy etl-orchestrator --project-ref prod-ref
supabase functions deploy export-csv-stream --project-ref prod-ref

# Test ETL (dry run)
curl -X POST https://your-prod.supabase.co/functions/v1/etl-orchestrator \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"year": 2025, "dry_run": true}'
```

**Monitor for 24 Hours:**
- Check logs every 2 hours
- Verify no errors
- DO NOT enable auto-sync yet

#### 5.6: Deploy Next.js App (Day 5)

```bash
# Deploy to Vercel production
vercel --prod

# Verify deployment
vercel ls

# Get deployment URL
vercel inspect
```

**Smoke Tests:**
```bash
# Homepage
curl -I https://your-app.vercel.app/

# Sync page
curl -I https://your-app.vercel.app/sync

# API status
curl https://your-app.vercel.app/api/sync/status
```

**Manual UI Testing:**
1. Login to app
2. Navigate to /sync
3. Click "Run Full Sync"
4. Verify sync completes
5. Check sync_log table
6. Verify no errors in sync_errors
7. Navigate to /conflicts (if any)
8. Resolve one conflict
9. Download CSV export
10. Verify CSV format

#### 5.7: Enable Cron Jobs (Day 6)

**Update `vercel.json` (if not already):**
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

**Redeploy:**
```bash
vercel --prod
```

**Wait for First Scheduled Execution:**
- Monitor Vercel cron logs
- Verify sync runs automatically
- Check sync_log table for new entry
- Verify data updated correctly

#### 5.8: Monitor & Validate (Days 7-10)

**Daily Monitoring Checklist:**
- [ ] Check Vercel logs for errors
- [ ] Check Supabase logs for errors
- [ ] Verify cron jobs triggered
- [ ] Check sync_errors table
- [ ] Verify data accuracy (spot check)
- [ ] Check performance metrics

**Validation Queries:**
```sql
-- Recent sync logs
SELECT * FROM sync_log
WHERE started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;

-- Any unresolved errors?
SELECT COUNT(*) FROM sync_errors WHERE resolved = FALSE;

-- Any pending conflicts?
SELECT COUNT(*) FROM sync_conflicts WHERE status = 'pending';

-- Data freshness
SELECT MAX(last_synced_at) FROM mentors;
```

**Performance Metrics:**
- Average sync time: < 5 minutes
- Error rate: < 1%
- Uptime: 99.9%

### Rollback Plan

**If Critical Issues Occur:**

**Scenario 1: Edge Functions Fail**
```bash
# Revert to previous version
supabase functions deploy sync-jotform-signups --project-ref prod-ref \
  --version <previous-version-id>

# Or use old backend scripts temporarily
cd backend
npx tsx scripts/process.ts
```

**Scenario 2: Next.js Deployment Fails**
```bash
# Revert in Vercel dashboard
# Or via CLI
vercel rollback
```

**Scenario 3: Database Migration Fails**
```bash
# Restore from backup
pg_restore -d $PROD_DATABASE_URL backups/pre-deployment-*.sql

# Verify restoration
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM mentors;"
```

**(See Phase 5.5 in main document for complete rollback procedures)**

### Phase 5 Success Criteria
- ✅ All Edge Functions deployed and operational
- ✅ Next.js app deployed and accessible
- ✅ Cron jobs triggering on schedule
- ✅ Zero critical errors in first 48 hours
- ✅ Performance meets benchmarks
- ✅ All monitoring alerts configured
- ✅ Rollback plan tested and documented

### Deliverables
1. Production deployment (Edge Functions + Next.js)
2. Cron jobs configured and running
3. Monitoring dashboards
4. Incident response documentation
5. Post-deployment validation report

---

## ✨ Phase 6: Optimization & Polish (2 weeks)

**Duration:** 10 working days
**Priority:** LOW - Nice-to-have improvements
**Owner:** Full Team
**Status:** 🔵 Blocked by Phase 5

### Goals
1. Performance optimization
2. Enhanced features
3. Improved developer experience
4. Prepare for 2026 transition

### Week 1: Performance & Features

#### 6.1: Database Optimization (Days 1-2)

```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentors(status_category);
CREATE INDEX IF NOT EXISTS idx_mentors_dropped ON mentors(dropped);
CREATE INDEX IF NOT EXISTS idx_mentors_year ON mentors(year);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM mentors WHERE status_category = 'active';

-- Optimize slow queries
-- (based on pg_stat_statements analysis)
```

#### 6.2: Caching (Day 3)

**File:** `src/lib/server/config/config-cache.ts`

```typescript
// In-memory cache for config (reduce DB queries)
let configCache: Map<number, SyncConfig> = new Map();
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function loadSyncConfigCached(year: number): Promise<SyncConfig> {
  const now = Date.now();

  // Cache expired?
  if (now - cacheTimestamp > CACHE_TTL) {
    configCache.clear();
  }

  // Check cache
  if (configCache.has(year)) {
    return configCache.get(year)!;
  }

  // Load from DB
  const config = await loadSyncConfig(year);

  // Store in cache
  configCache.set(year, config);
  cacheTimestamp = now;

  return config;
}
```

#### 6.3: Batch Processing (Day 4)

**File:** `src/lib/server/etl/steps/05-merge-data.ts`

```typescript
// Process in batches to avoid memory issues
const BATCH_SIZE = 100;

for (let i = 0; i < mentors.length; i += BATCH_SIZE) {
  const batch = mentors.slice(i, i + BATCH_SIZE);

  await supabase
    .from('mentors')
    .upsert(batch, { onConflict: 'mn_id' });

  context.logger.info(`Processed batch ${i / BATCH_SIZE + 1}`);
}
```

#### 6.4: Real-Time Status Updates (Day 5)

**File:** `src/app/api/sync/status/route.ts`

```typescript
// WebSocket or Server-Sent Events for real-time updates
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send status updates every second
      const interval = setInterval(async () => {
        const status = await getSyncStatus();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
      }, 1000);

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

### Week 2: Developer Experience & 2026 Prep

#### 6.5: Enhanced Dashboards (Days 6-7)

**File:** `src/app/dashboard/page.tsx`

**Features:**
- Real-time sync status
- Charts (sync history, conflict trends)
- Error rate graphs
- Performance metrics

**Libraries:**
- Recharts for charts
- React Query for real-time data

#### 6.6: Bulk Conflict Resolution (Day 8)

**File:** `src/app/conflicts/page.tsx`

**Features:**
- "Accept All Recommendations" button
- Filter by conflict type
- Batch actions

#### 6.7: Developer Documentation (Day 9)

**Create:**
- `docs/DEVELOPER_GUIDE.md` - How to contribute
- `docs/ARCHITECTURE.md` - System architecture
- `docs/TROUBLESHOOTING.md` - Common issues
- `docs/DEPLOYMENT.md` - Deployment procedures

#### 6.8: Prepare for 2026 (Day 10)

**Test Year Transition:**
```sql
-- Add 2026 config
INSERT INTO sync_configs (year, config_key, config_value, description) VALUES
  (2026, 'jotform_signup_form_id', 'NEW_FORM_ID', 'Mentor Sign Up Form 2026'),
  -- ... all other config keys

-- Test switching
YEAR=2026 npm run sync:jotform

-- Verify uses 2026 config
```

**Create Year Transition Guide:**
- `docs/YEAR_TRANSITION.md`
- Step-by-step process for adding new year
- Checklist of config values needed

### Phase 6 Success Criteria
- ✅ Sync time < 5 minutes (optimized)
- ✅ Real-time dashboard working
- ✅ Bulk conflict resolution functional
- ✅ Developer docs complete
- ✅ Year transition tested
- ✅ All optional features working

### Deliverables
1. Performance optimizations (caching, batching)
2. Enhanced dashboards with real-time updates
3. Bulk conflict resolution UI
4. Complete developer documentation
5. Year transition guide and testing

---

## 📅 Timeline Summary

| Phase | Duration | Start After | Critical Path |
|-------|----------|-------------|---------------|
| **Phase 0** | 2-3 days | **NOW** | ✅ YES |
| **Phase 1** | 2 weeks | Phase 0 | ✅ YES |
| **Phase 2** | 3 weeks | Phase 1 | ✅ YES |
| **Phase 3** | 3-4 weeks | Phase 2 | ✅ YES |
| **Phase 4** | 2 weeks | Phase 3 | ✅ YES |
| **Phase 5** | 1-2 weeks | Phase 4 | ✅ YES |
| **Phase 6** | 2 weeks | Phase 5 | ❌ NO (optional) |
| **TOTAL** | **13-16 weeks** | | **(3-4 months)** |

### Milestone Dates

**Project Started:** October 2025
**Phase 0 & 1 Completed:** October 28, 2025
**Phase 2 Start:** October 29, 2025

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 0 Complete | Oct 28, 2025 | ✅ Complete |
| Phase 1 Complete | Oct 28, 2025 | ✅ Complete |
| Phase 2 Complete | Dec 15, 2025 | 🟡 In Progress (30%) |
| Phase 3 Complete | Jan 20, 2026 | 🔵 Planned |
| Phase 4 Complete | Feb 10, 2026 | 🔵 Planned |
| **Production Deployment** | **Feb 20, 2026** | 🔵 Planned |
| Phase 6 Complete | Mar 10, 2026 | 🔵 Planned |

---

## 🎯 Success Metrics Dashboard

### Phase-by-Phase Targets

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|--------|---------|---------|---------|---------|---------|---------|---------|
| **CSV Upload Errors** | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Hardcoded Values** | N/A | 0 | 0 | 0 | 0 | 0 | 0 |
| **Auto-Resolve Rate** | N/A | N/A | >90% | >90% | >90% | >90% | >95% |
| **Sync Time** | N/A | N/A | <10m | <10m | <7m | <7m | <5m |
| **Test Coverage** | N/A | N/A | N/A | N/A | >80% | >80% | >85% |
| **Error Rate** | N/A | N/A | N/A | N/A | <5% | <1% | <0.5% |
| **Uptime** | N/A | N/A | N/A | N/A | N/A | 99.9% | 99.95% |

---

## 🚨 Risk Management

### High-Priority Risks

| Risk | Impact | Probability | Mitigation | Owner |
|------|--------|-------------|------------|-------|
| **Data loss during migration** | CRITICAL | Medium | Comprehensive backups, rollback plan | DevOps |
| **Edge Function timeouts** | HIGH | Medium | Batching, optimization, monitoring | Backend |
| **Production downtime** | HIGH | Low | Staged deployment, feature flags | DevOps |
| **Deno compatibility issues** | MEDIUM | Medium | Early testing, Node.js fallback | Backend |
| **CSV format changes** | MEDIUM | Low | Validation layer, schema versioning | Backend |

### Risk Response Plan

**If Data Loss Detected:**
1. IMMEDIATELY stop all deployments
2. Restore from most recent backup
3. Investigate root cause
4. Fix issue in staging
5. Re-deploy with fix

**If Edge Functions Timeout:**
1. Switch to batch processing
2. Optimize slow queries
3. Consider splitting into multiple functions
4. Use background jobs if needed (Inngest)

**If Production Deployment Fails:**
1. Execute rollback plan (Phase 5.5)
2. Verify rollback successful
3. Fix issues in staging
4. Re-deploy when ready

---

## 👥 Team Roles & Responsibilities

### Recommended Team Structure

| Role | Responsibilities | Phases |
|------|------------------|--------|
| **Lead Developer** | Architecture decisions, code reviews, Phase ownership | All |
| **Backend Developer(s)** | ETL, sync scripts, Edge Functions, API routes | 1-4 |
| **DevOps Engineer** | Infrastructure, deployments, monitoring, cron jobs | 3-5 |
| **QA Engineer** | Test suite, load testing, validation | 4 |
| **Product Owner** | Requirements, priorities, acceptance criteria | All |

### Phase Ownership

| Phase | Primary Owner | Support |
|-------|---------------|---------|
| Phase 0 | Backend Developer | Lead Developer |
| Phase 1 | Backend Developer | DevOps |
| Phase 2 | Backend Developer | QA |
| Phase 3 | DevOps Engineer | Backend Developer |
| Phase 4 | QA Engineer | All |
| Phase 5 | DevOps Engineer | All |
| Phase 6 | Full Team | - |

---

## 📚 Documentation Checklist

**Before Starting:**
- [ ] Team reviewed this roadmap
- [ ] Phase owners assigned
- [ ] Timeline confirmed
- [ ] Development environment ready
- [ ] Backup plan documented

**During Implementation:**
- [ ] Daily standup notes
- [ ] Weekly progress reports
- [ ] Blocker tracking (resolve within 24h)
- [ ] Code review for all PRs
- [ ] Test coverage reports

**After Completion:**
- [ ] Post-mortem (lessons learned)
- [ ] Final documentation update
- [ ] Handoff to operations team
- [ ] Knowledge transfer sessions

---

## 🎉 Definition of Done (Overall Project)

The project is **COMPLETE** when:

- ✅ All 6 phases completed
- ✅ All success criteria met
- ✅ Production deployment stable for 2 weeks
- ✅ Team trained on new system
- ✅ Documentation complete and reviewed
- ✅ Monitoring and alerts configured
- ✅ Rollback procedures tested
- ✅ Year 2026 transition plan ready
- ✅ No critical bugs in backlog
- ✅ Performance benchmarks met
- ✅ Stakeholders signed off

---