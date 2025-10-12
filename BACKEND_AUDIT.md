# Backend Architecture Audit

**Project:** Mentor Database System
**Date:** 2025-10-11
**Purpose:** Comprehensive analysis of backend code quality, performance, and maintainability

---

## Executive Summary

**Overall Assessment:** The backend is well-architected with clear separation of concerns and good performance optimizations. Recent improvements (O(1) lookup maps, pagination) show solid engineering. However, there are opportunities for better code reuse, error handling standardization, and debugging infrastructure.

**Key Metrics:**
- Match rate improved: 33% → 82%
- Files analyzed: 18 backend files
- Critical issues: 2
- High priority issues: 8
- Medium priority issues: 12
- Low priority issues: 7

---

## Section 1: File Organization Analysis

### Current Structure Overview

```
backend/
├── core/
│   ├── sync/          # 9 sync scripts (API integrations)
│   ├── etl/           # 1 ETL processor
│   └── config/        # 1 Supabase config
├── lib/
│   └── services/      # 3 service classes (matching, parsing, conflicts)
└── scripts/           # 4 debug/analysis scripts
```

### Strengths

1. **Clear separation of concerns:** Sync scripts are isolated from ETL logic
2. **Services abstraction:** Matching, parsing, and conflict detection are properly extracted
3. **Config centralization:** Single source of truth for Supabase configuration

### Issues Identified

#### MEDIUM: Duplicate HTTP Client Code
**Location:** Multiple files use raw `fetch()` with similar patterns
- `jotform-setup.ts:34-47` - Jotform API wrapper
- `jotform-signups.ts:34-47` - Identical Jotform API wrapper
- `givebutter-members.ts:37-50` - Givebutter API wrapper
- `api-contacts.ts:137-145` - Givebutter API wrapper

**Impact:** Code duplication, inconsistent error handling, harder maintenance

**Recommendation:** Create `backend/lib/http/jotform-client.ts` and `backend/lib/http/givebutter-client.ts`
```typescript
// Example structure
export class JotformClient {
  constructor(private apiKey: string) {}

  async fetch(endpoint: string) {
    // Centralized error handling, retry logic, rate limiting
  }
}
```

#### LOW: Scripts Directory Organization
**Location:** `backend/scripts/`

**Issue:** Debug scripts are mixed together without clear purpose indication

**Recommendation:**
```
backend/scripts/
├── debug/          # Temporary debugging scripts
│   ├── debug-matching.ts
│   └── audit-matching-logic.ts
└── analysis/       # Permanent analysis/reporting scripts
    ├── check-contact-stats.ts
    └── check-actual-counts.ts
```

#### MEDIUM: Missing Abstraction for Progress Logging
**Location:** All sync scripts have similar console.log patterns

**Files affected:**
- `jotform-setup.ts:96-102, 140-141`
- `jotform-signups.ts:131, 150-152`
- `givebutter-members.ts:66, 142`
- `givebutter-contacts.ts:157-158`

**Recommendation:** Create `backend/lib/utils/progress-logger.ts`
```typescript
export class ProgressLogger {
  log(current: number, total: number, label: string, interval = 50) {
    if (current % interval === 0) {
      console.log(`   Processed ${current}/${total} ${label}...`);
    }
  }
}
```

---

## Section 2: Performance Analysis

### Strengths (Recent Improvements)

#### O(1) Lookup Maps (EXCELLENT)
**Location:** `etl/process.ts:401-429`, `contact-matching.ts:236-325`

**Analysis:** Converted O(N*M) nested loops to O(1) hash map lookups. This is a critical optimization for large datasets.

Before (implied):
```typescript
// O(N * M) - N mentors * M contacts
for (const mentor of mentors) {
  for (const contact of contacts) {
    if (mentor.phone === contact.phone) return contact;
  }
}
```

After:
```typescript
// O(N + M) - Build map once, lookup in O(1)
const phoneToContact = new Map();
for (const contact of contacts) {
  phoneToContact.set(normalizePhone(contact.phone), contact);
}
// Later: O(1) lookup
const match = phoneToContact.get(normalizePhone(mentor.phone));
```

**Impact:** 40k contacts matched in seconds instead of hours

#### Pagination for Large Datasets
**Location:** `etl/process.ts:256-279`

**Code:**
```typescript
let page = 0;
const pageSize = 1000;
while (true) {
  const { data } = await supabase
    .from('raw_gb_full_contacts')
    .select('*')
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (!data || data.length === 0) break;
  rawContacts.push(...data);
  if (data.length < pageSize) break;
  page++;
}
```

**Good:** Handles Supabase's 1000-row limit correctly
**Issue:** No progress indicator for large paginated queries

#### Batch Processing
**Location:** `givebutter-contacts.ts:89-107`, `upload-gb-csv.ts:94-115`

**Analysis:** Proper batch size (100) for database operations. Good balance between memory and network overhead.

### Issues Identified

#### HIGH: Missing Database Query Optimization
**Location:** `etl/process.ts:244-253`

**Current code:**
```typescript
const [
  { data: rawSignups },
  { data: rawSetup },
  { data: rawMembers },
  { data: rawMnGbContacts },
] = await Promise.all([
  supabase.from('raw_mn_signups').select('*'),
  supabase.from('raw_mn_funds_setup').select('*'),
  supabase.from('raw_gb_campaign_members').select('*').range(0, 10000),
  supabase.from('raw_mn_gb_contacts').select('mn_id, contact_id'),
]);
```

**Issues:**
1. `select('*')` loads unnecessary columns (raw_data JSONB can be huge)
2. `.range(0, 10000)` is arbitrary - should paginate like contacts
3. Missing indexes on frequently queried fields

**Recommendation:**
```typescript
// Only select needed columns
supabase.from('raw_mn_signups')
  .select('submission_id, mn_id, first_name, last_name, phone, uga_email, personal_email, submitted_at')

// Add progress tracking for large tables
console.log('📥 Loading raw data with pagination...\n');
const members = await loadWithPagination('raw_gb_campaign_members', 1000);
```

**Database indexes needed:**
```sql
-- Matching queries (file: contact-matching.ts)
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON raw_gb_full_contacts(primary_phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON raw_gb_full_contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON raw_gb_full_contacts(external_id);

-- ETL queries (file: etl/process.ts)
CREATE INDEX IF NOT EXISTS idx_mentors_phone ON mentors(phone);
CREATE INDEX IF NOT EXISTS idx_members_phone ON raw_gb_campaign_members(phone);
CREATE INDEX IF NOT EXISTS idx_members_email ON raw_gb_campaign_members(email);
```

#### MEDIUM: No Query Caching for Repeated Operations
**Location:** `api-contacts.ts:134-250`

**Issue:** Iterates through mentors making individual API calls without caching conflict rules or field mappings

**Current:**
```typescript
for (let i = 0; i < mentors.length; i += BATCH_SIZE) {
  await Promise.all(batch.map(async (mentor) => {
    // Fetch from API
    // Detect conflicts (re-computes rules each time)
    // Log conflicts
  }));
}
```

**Recommendation:**
```typescript
// Pre-compute conflict rules once
const conflictRules = new ConflictRuleEngine();
// Cache field mappings
const fieldMapper = new FieldMapper(customFieldsConfig);

for (const batch of batches) {
  await Promise.all(batch.map(async (mentor) => {
    // Use cached rules
  }));
}
```

#### HIGH: Memory Leak Risk with Large CSV Processing
**Location:** `givebutter-contacts.ts:81-107`

**Analysis:** CSV parser uses streaming (good!) but accumulates batch array without clearing

**Current:**
```typescript
const batch: ContactRow[] = [];
for await (const row of parser) {
  batch.push(/* ... */);
  if (batch.length >= BATCH_SIZE) {
    await processBatch(batch.splice(0, BATCH_SIZE)); // splice modifies array
  }
}
```

**Issue:** `.splice()` returns removed elements but original array still holds references until GC

**Fix:**
```typescript
if (batch.length >= BATCH_SIZE) {
  const toProcess = batch.slice(0, BATCH_SIZE);
  batch.length = 0; // Clear array immediately
  await processBatch(toProcess);
}
```

#### MEDIUM: No Rate Limiting for External APIs
**Location:** `api-contacts.ts:126-259`

**Current:** Hard-coded 10 requests/second delay
```typescript
const BATCH_SIZE = 10;
const DELAY_MS = 1000;
```

**Issues:**
1. No backoff on 429 (rate limit) responses
2. No circuit breaker for repeated failures
3. Assumes all APIs have same limits

**Recommendation:** Use exponential backoff
```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential: 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## Section 3: Code Quality

### Duplicate Code Extraction Opportunities

#### HIGH: Phone/Email Normalization Logic
**Locations:**
- `etl/process.ts:186-202` - normalizePhone + normalizeEmail
- `contact-matching.ts:113-125` - EXPORTED functions
- `conflict-detection.ts:14` - IMPORTS from contact-matching
- `check-contact-stats.ts:96-98` - Inline normalization
- `debug-matching.ts:6` - Imports from contact-matching

**Issue:** Normalization is defined in 2 places, used inconsistently

**Recommendation:** Move to `backend/lib/utils/normalize.ts`
```typescript
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '';
  return `+1${digits.slice(-10)}`;
}

export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}
```

#### CRITICAL: Error Insertion Pattern Duplicated
**Location:** Multiple files use similar error insertion logic

**Files:**
- `etl/process.ts:313-327, 353-378, 444-454, 501-510, 663-672, 684-693`
- `api-contacts.ts:152-166, 220-240`
- `contact-matching.ts:439-450, 550-562, 600-611`

**Issue:** Every file manually builds error objects with slight variations

**Current pattern:**
```typescript
errors.push({
  mn_id: signup.mn_id,
  phone: signup.phone,
  error_type: 'missing_mn_id',
  error_message: 'Signup missing mn_id',
  severity: 'critical',
  source_table: 'raw_mn_signups',
  raw_data: signup,
});
```

**Recommendation:** Create `backend/lib/services/error-logger.ts`
```typescript
export class ErrorLogger {
  private errors: MentorError[] = [];

  logMissingMnId(signup: any) {
    this.errors.push({
      mn_id: signup.mn_id,
      error_type: 'missing_mn_id',
      error_message: `Signup ${signup.submission_id} missing mn_id`,
      severity: 'critical',
      source_table: 'raw_mn_signups',
      raw_data: signup,
    });
  }

  logDuplicateContact(phone: string, contactIds: number[]) {
    // Standard duplicate logging
  }

  async save(supabase: SupabaseClient) {
    if (this.errors.length === 0) return;
    await supabase.from('mn_errors').insert(this.errors);
  }
}
```

### Functions Over 100 Lines

#### CRITICAL: ETL Process Function is 850 Lines
**Location:** `etl/process.ts:225-850`

**Severity:** CRITICAL - This is a god function that does everything

**Current structure:**
1. Load raw data (55 lines)
2. Validate mn_id (27 lines)
3. Deduplicate (46 lines)
4. Load existing mentors (9 lines)
5. Build lookup maps (26 lines)
6. Process mentors (172 lines)
7. Upsert to DB (28 lines)
8. Detect duplicates (53 lines)
9. Populate export table (88 lines)
10. Link campaign members (10 lines)
11. Log errors (11 lines)
12. Summary (27 lines)

**Recommendation:** Split into smaller functions
```typescript
class ETLPipeline {
  async execute() {
    const rawData = await this.loadRawData();
    const validatedSignups = await this.validateSignups(rawData.signups);
    const uniqueSignups = this.deduplicateByPhone(validatedSignups);
    const lookupMaps = this.buildLookupMaps(rawData);
    const mentors = this.processMentors(uniqueSignups, lookupMaps);
    await this.saveMentors(mentors);
    await this.generateExport(mentors);
    await this.logErrors();
  }

  private async loadRawData(): Promise<RawData> { /* ... */ }
  private validateSignups(signups: RawSignup[]): RawSignup[] { /* ... */ }
  // etc.
}
```

#### HIGH: Contact Matching Function is 100+ Lines
**Location:** `contact-matching.ts:140-231`

**Function:** `matchContactsToMentors()`

**Issue:** Single function handles:
1. Loading mentors
2. Loading members
3. Building lookup maps (85 lines nested function)
4. Matching logic
5. Database updates
6. Duplicate detection
7. Error logging

**Recommendation:** Extract to class methods
```typescript
class ContactMatcher {
  async match() {
    await this.loadData();
    this.buildMaps();
    await this.performMatching();
    await this.detectDuplicates();
    return this.getResults();
  }
}
```

#### MEDIUM: Givebutter API Sync is 218 Lines
**Location:** `api-contacts.ts:69-287`

**Recommendation:** Extract helper methods
```typescript
class GivebutterAPISync {
  async sync() {
    const mentors = await this.loadMentors();
    for (const batch of this.batches(mentors)) {
      await this.syncBatch(batch);
    }
  }

  private async syncContact(mentor: Mentor) { /* ... */ }
  private async handleDeletedContact(mentor: Mentor) { /* ... */ }
  private async detectConflicts(mentor: Mentor, gbContact: any) { /* ... */ }
}
```

### Missing Error Handling

#### HIGH: No Error Handling for File I/O
**Location:** `etl/process.ts:27-36`

**Current:**
```typescript
function loadConfig<T>(filename: string, fallback: T): T {
  try {
    const path = resolve(__dirname, '../config', filename);
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`⚠️  Error loading ${filename}:`, error instanceof Error ? error.message : error);
    console.log(`   Using fallback configuration for ${filename}`);
    return fallback;
  }
}
```

**Issue:** Swallows errors silently - could lead to wrong behavior if config is critical

**Recommendation:**
```typescript
function loadConfig<T>(filename: string, required = false): T | null {
  try {
    // ... load file
  } catch (error) {
    if (required) {
      throw new Error(`FATAL: Required config file ${filename} not found`);
    }
    console.warn(`Using defaults for optional config: ${filename}`);
    return null;
  }
}
```

#### MEDIUM: Unhandled Promise Rejections in Parallel Operations
**Location:** `etl/process.ts:244-253`

**Current:**
```typescript
const [
  { data: rawSignups },
  { data: rawSetup },
  { data: rawMembers },
] = await Promise.all([
  supabase.from('raw_mn_signups').select('*'),
  supabase.from('raw_mn_funds_setup').select('*'),
  supabase.from('raw_gb_campaign_members').select('*'),
]);
```

**Issue:** If one query fails, all fail. No partial recovery.

**Recommendation:**
```typescript
const results = await Promise.allSettled([
  supabase.from('raw_mn_signups').select('*'),
  supabase.from('raw_mn_funds_setup').select('*'),
  supabase.from('raw_gb_campaign_members').select('*'),
]);

// Handle failures gracefully
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`Failed to load ${tables[index]}:`, result.reason);
    // Decide: continue with empty data or abort?
  }
});
```

#### HIGH: No Timeout for External API Calls
**Location:** All sync scripts using `fetch()`

**Issue:** No timeout - can hang indefinitely on slow/dead endpoints

**Recommendation:**
```typescript
async function fetchWithTimeout(url: string, options: any, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}
```

### Inconsistent Patterns

#### MEDIUM: Inconsistent Progress Logging Format
**Locations:**
- `jotform-setup.ts:140-141` - `Processed ${inserted} submissions...`
- `givebutter-contacts.ts:157-158` - `Processed ${inserted} mentor contacts...`
- `etl/process.ts:253` - `Synced ${Math.min(i + BATCH_SIZE, mentors.length)}/${mentors.length} contacts...`

**Recommendation:** Standardize format
```typescript
console.log(`   [${current}/${total}] ${label}...`);
// Example: "   [500/1000] Processing contacts..."
```

#### LOW: Mixed String Formatting
**Locations:**
- Template literals: `jotform-setup.ts:102`
- Concatenation: `givebutter-contacts.ts:171`
- `.toLocaleString()` sometimes used, sometimes not

**Recommendation:** Always use template literals + `.toLocaleString()` for counts

---

## Section 4: Debugging & Maintainability

### Logging Strategy

#### CRITICAL: Console.log vs Structured Logging
**Issue:** All files use raw `console.log()` without:
1. Log levels (debug, info, warn, error)
2. Timestamps
3. Context (file, function)
4. Structured data (JSON)

**Current:**
```typescript
console.log(`✅ Found ${submissions.length} submissions\n`);
console.error(`❌ Error syncing ${submission.id}:`, error.message);
```

**Recommendation:** Implement structured logging
```typescript
// backend/lib/utils/logger.ts
export class Logger {
  constructor(private context: string) {}

  info(message: string, data?: any) {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      data,
    }));
  }

  error(message: string, error?: Error, data?: any) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      error: error?.message,
      stack: error?.stack,
      data,
    }));
  }
}

// Usage
const logger = new Logger('jotform-signups');
logger.info('Starting sync', { formId: SIGNUP_FORM_ID });
logger.error('Sync failed', error, { submissionId });
```

**Benefits:**
- Machine-parseable logs
- Easy to filter by level
- Can pipe to log aggregation (Datadog, Sentry)
- Includes context automatically

#### HIGH: Missing Critical Logging Points

**Location:** `api-contacts.ts:175-217`

**Current:** Upserts contact but doesn't log the update
```typescript
const { error: upsertError } = await supabase
  .from('raw_mn_gb_contacts')
  .upsert({ /* ... */ });

if (upsertError) {
  console.error(`   ❌ Error upserting contact for ${mentor.mn_id}:`, upsertError);
  errors++;
  return;
}
// Missing: success log with contact_id
```

**Recommendation:** Log all state changes
```typescript
if (upsertError) {
  logger.error('Contact upsert failed', upsertError, { mnId: mentor.mn_id });
} else {
  logger.debug('Contact upserted', {
    mnId: mentor.mn_id,
    contactId: gbContact.id,
    source: 'api_sync',
  });
}
```

#### MEDIUM: No Logging for Business Logic Decisions
**Location:** `etl/process.ts:557-563`

**Current:** Status computation has no logging
```typescript
const statusCategory =
  task.fundraised_done && task.training_done ? 'complete' :
  task.campaign_member && !task.fundraised_done ? 'needs_fundraising' :
  task.setup_done && !task.campaign_member ? 'needs_page' :
  'needs_setup';
```

**Issue:** Can't debug why a mentor got assigned a certain status

**Recommendation:** Log decision factors
```typescript
logger.debug('Computing mentor status', {
  mnId: mentor.mn_id,
  fundraisedDone: task.fundraised_done,
  trainingDone: task.training_done,
  campaignMember: task.campaign_member,
  setupDone: task.setup_done,
  resultingStatus: statusCategory,
});
```

### Error Messages

#### HIGH: Vague Error Messages
**Location:** `jotform-setup.ts:42`, `jotform-signups.ts:42`, `givebutter-members.ts:46`

**Current:**
```typescript
throw new Error(`Jotform API error: ${response.status} ${await response.text()}`);
```

**Issues:**
1. Loses response body if it's large
2. No request details (endpoint, headers)
3. No retry suggestion

**Recommendation:**
```typescript
class APIError extends Error {
  constructor(
    public service: string,
    public endpoint: string,
    public status: number,
    public responseBody: string,
  ) {
    super(`${service} API error (${status}): ${endpoint}\n${responseBody.slice(0, 500)}`);
  }
}

// Usage
if (!response.ok) {
  const body = await response.text();
  throw new APIError('Jotform', endpoint, response.status, body);
}
```

#### MEDIUM: Missing User-Facing Error Context
**Location:** `orchestrator.ts:170-178`

**Current:**
```typescript
if (!result.success) {
  failed = true;
  errorMessage = `${step.name} failed: ${result.error}`;
  console.error(`\n❌ ${step.name} failed\n`);
  console.error(result.error);
  break;
}
```

**Issue:** User sees error but no actionable guidance

**Recommendation:**
```typescript
if (!result.success) {
  const helpMessage = this.getHelpForError(step.name, result.error);
  console.error(`\n❌ ${step.name} failed\n`);
  console.error(`   Error: ${result.error}`);
  console.error(`\n   💡 Troubleshooting:`);
  helpMessage.forEach(msg => console.error(`      - ${msg}`));
  break;
}
```

### Type Definitions

#### MEDIUM: Type Duplication Across Files
**Issue:** Same interfaces defined in multiple places

**Examples:**
- `Mentor` type: defined in `etl/process.ts:135`, `contact-matching.ts:60`, `conflict-detection.ts:13`
- `JotformSubmission`: defined in `jotform-setup.ts:28`, `jotform-signups.ts:28`
- `GivebutterContact`: defined in `api-contacts.ts:29`, `contact-matching.ts:17`

**Recommendation:** Create `backend/types/` directory
```typescript
// backend/types/mentor.ts
export interface Mentor {
  mn_id: string;
  phone: string;
  // ... all fields
}

// backend/types/jotform.ts
export interface JotformSubmission { /* ... */ }
export interface JotformAnswer { /* ... */ }

// backend/types/givebutter.ts
export interface GivebutterContact { /* ... */ }
export interface GivebutterMember { /* ... */ }
```

#### LOW: Missing Return Type Annotations
**Locations:**
- `etl/process.ts:49-57` - `extractValue()` has explicit return but function signature could be clearer
- `orchestrator.ts:113` - `runScript()` return type is explicit (good)
- `contact-matching.ts:236` - `buildLookupMaps()` inferred but complex return

**Recommendation:** Add explicit return types for public methods
```typescript
// Before
function extractValue(answer: any) {
  return answer?.trim() || null;
}

// After
function extractValue(answer: any): string | null {
  return answer?.trim() || null;
}
```

---

## Section 5: Architecture Improvements

### Recommended Refactoring Priorities

#### Priority 1: Extract Common HTTP Clients (CRITICAL)
**Impact:** HIGH
**Effort:** 2 hours
**Files affected:** 6 sync scripts

**Actions:**
1. Create `backend/lib/http/jotform-client.ts`
2. Create `backend/lib/http/givebutter-client.ts`
3. Implement retry logic, rate limiting, timeouts
4. Update all sync scripts to use clients

**Benefits:**
- Single place to add features (caching, metrics)
- Consistent error handling
- Easier testing (mock the client)

#### Priority 2: Implement Structured Logging (HIGH)
**Impact:** HIGH
**Effort:** 3 hours
**Files affected:** All backend files

**Actions:**
1. Create `backend/lib/utils/logger.ts`
2. Add log levels (debug, info, warn, error)
3. Replace all console.log/error calls
4. Add context to each logger instance

**Benefits:**
- Machine-parseable logs
- Easy debugging with log levels
- Production-ready logging

#### Priority 3: Split ETL Process into Pipeline (HIGH)
**Impact:** MEDIUM
**Effort:** 4 hours
**Files affected:** `etl/process.ts`

**Actions:**
1. Create `backend/core/etl/pipeline.ts` with ETLPipeline class
2. Extract steps into methods
3. Add progress tracking per step
4. Make each step testable independently

**Benefits:**
- Easier to understand
- Testable in isolation
- Can add/remove steps without touching core logic

#### Priority 4: Create Error Logging Service (MEDIUM)
**Impact:** MEDIUM
**Effort:** 2 hours
**Files affected:** 8 files

**Actions:**
1. Create `backend/lib/services/error-logger.ts`
2. Standardize error types
3. Replace all manual error.push() calls

**Benefits:**
- Consistent error format
- Easier to query errors
- Can add error analytics

#### Priority 5: Centralize Type Definitions (LOW)
**Impact:** LOW
**Effort:** 1 hour
**Files affected:** Multiple

**Actions:**
1. Create `backend/types/` directory
2. Move all interfaces to appropriate files
3. Update imports

**Benefits:**
- Single source of truth for types
- Easier to maintain
- Better IDE autocomplete

### Suggested New Abstractions

#### 1. Database Pagination Helper
**Location:** `backend/lib/utils/paginate.ts`

```typescript
export async function paginateQuery<T>(
  query: any,
  pageSize = 1000,
  onProgress?: (loaded: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await query.range(
      page * pageSize,
      (page + 1) * pageSize - 1
    );

    if (error) throw error;
    if (!data || data.length === 0) break;

    results.push(...data);
    onProgress?.(results.length);

    if (data.length < pageSize) break;
    page++;
  }

  return results;
}

// Usage
const contacts = await paginateQuery(
  supabase.from('raw_gb_full_contacts').select('*'),
  1000,
  (loaded) => console.log(`Loaded ${loaded} contacts...`)
);
```

#### 2. Sync Operation Wrapper
**Location:** `backend/lib/sync/sync-operation.ts`

```typescript
export class SyncOperation {
  constructor(
    private name: string,
    private orchestrator: SyncOrchestrator,
    private logger: Logger
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const logId = await this.orchestrator.startSyncLog(this.name);
    this.logger.info(`Starting ${this.name}`);

    try {
      const result = await fn();
      await this.orchestrator.completeSyncLog(logId, 'completed');
      this.logger.info(`Completed ${this.name}`);
      return result;
    } catch (error) {
      await this.orchestrator.completeSyncLog(logId, 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      this.logger.error(`Failed ${this.name}`, error as Error);
      throw error;
    }
  }
}

// Usage in sync scripts
const syncOp = new SyncOperation('jotform-signups', orchestrator, logger);
await syncOp.execute(async () => {
  // Actual sync logic
  return { inserted, errors };
});
```

#### 3. Field Mapper for ETL
**Location:** `backend/lib/etl/field-mapper.ts`

```typescript
export class FieldMapper {
  constructor(private config: any) {}

  mapCustomFields(mentor: Mentor, task: MentorTask): Record<string, any> {
    const fields: Record<string, any> = {};

    for (const field of this.config.fields) {
      fields[field.name] = this.mapField(field, mentor, task);
    }

    return fields;
  }

  private mapField(field: any, mentor: Mentor, task: MentorTask): any {
    // Centralized field mapping logic
  }
}
```

### Files to Split or Combine

#### Split: etl/process.ts (850 lines)
**Reason:** God file that does everything

**Suggested structure:**
```
backend/core/etl/
├── pipeline.ts              # Main ETLPipeline class
├── loaders/
│   ├── raw-data-loader.ts   # Load from raw tables
│   └── config-loader.ts     # Load JSON configs
├── processors/
│   ├── validator.ts         # Validate mn_id, phone, etc.
│   ├── deduplicator.ts      # Dedupe by phone
│   ├── matcher.ts           # Match across sources
│   └── status-computer.ts   # Compute status
├── transformers/
│   ├── field-mapper.ts      # Map fields for export
│   └── tag-generator.ts     # Generate tags
└── writers/
    ├── mentor-writer.ts     # Upsert mentors
    └── export-writer.ts     # Populate mn_gb_import
```

#### Combine: Debug Scripts
**Files:**
- `check-contact-stats.ts`
- `check-actual-counts.ts`
- `debug-matching.ts`
- `audit-matching-logic.ts`

**Recommendation:** Create single CLI tool
```
backend/scripts/diagnostics.ts

Usage:
  npm run diagnostics stats      # Contact stats
  npm run diagnostics counts     # Row counts
  npm run diagnostics matching   # Debug matching
  npm run diagnostics audit      # Full audit
```

#### Split: contact-matching.ts (644 lines)
**Reason:** Complex class with multiple responsibilities

**Suggested structure:**
```
backend/lib/services/matching/
├── contact-matcher.ts        # Main orchestrator
├── lookup-builder.ts         # Build O(1) maps
├── strategy/
│   ├── external-id-strategy.ts
│   ├── phone-strategy.ts
│   ├── email-strategy.ts
│   └── member-strategy.ts
└── duplicate-resolver.ts     # Detect & resolve dupes
```

---

## Section 6: Security & Data Integrity

### Issues Identified

#### HIGH: API Keys in Environment Variables
**Location:** All sync scripts load keys from `.env.local`

**Current approach:** Acceptable for development, needs upgrade for production

**Recommendation:**
- Use secret management service (AWS Secrets Manager, Vault)
- Add key rotation mechanism
- Log when keys are accessed

#### MEDIUM: No Input Validation on CSV Upload
**Location:** `upload-gb-csv.ts:34-39`

**Current:**
```typescript
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('❌ Error: CSV path required');
  process.exit(1);
}
```

**Issue:** No validation that file is actually a CSV or size check

**Recommendation:**
```typescript
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('❌ Error: CSV path required');
  process.exit(1);
}

// Validate file
if (!csvPath.endsWith('.csv')) {
  console.error('❌ Error: File must be a .csv file');
  process.exit(1);
}

const stats = await stat(csvPath);
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
if (stats.size > MAX_SIZE) {
  console.error(`❌ Error: File too large (${stats.size} bytes > ${MAX_SIZE})`);
  process.exit(1);
}
```

#### LOW: No Data Sanitization on Raw Data
**Location:** ETL process stores raw_data as-is

**Recommendation:** Add sanitization layer
```typescript
function sanitizeRawData(data: any): any {
  // Remove potential PII or sensitive data before storing
  const { creditCard, ssn, ...safe } = data;
  return safe;
}
```

---

## Section 7: Testing Recommendations

### Missing Test Coverage

**Current state:** No test files found

**Recommendations:**

#### Unit Tests Needed
1. **Normalization functions** (`normalizePhone`, `normalizeEmail`)
   - Test edge cases: empty strings, null, invalid formats

2. **Field mapping logic** (`etl/process.ts:723-754`)
   - Test all field types (yes_no, text, number)

3. **Status computation** (`etl/process.ts:557-563`)
   - Test all status transitions

#### Integration Tests Needed
1. **ETL pipeline** with mock data
2. **Contact matching** with known inputs/outputs
3. **API sync** with mocked Givebutter responses

#### Test Structure
```
backend/
└── __tests__/
    ├── unit/
    │   ├── normalize.test.ts
    │   ├── field-mapper.test.ts
    │   └── status-computer.test.ts
    ├── integration/
    │   ├── etl-pipeline.test.ts
    │   └── contact-matching.test.ts
    └── fixtures/
        ├── mock-signups.json
        ├── mock-contacts.json
        └── mock-members.json
```

---

## Appendix A: Quick Wins (< 30 min each)

1. **Add database indexes** (5 min)
   - Run SQL from Section 2

2. **Fix memory leak in CSV parser** (10 min)
   - Change `.splice()` to `.length = 0` in `givebutter-contacts.ts:155`

3. **Add timeout to fetch calls** (15 min)
   - Wrap all `fetch()` calls with timeout

4. **Standardize progress logging format** (20 min)
   - Replace all progress logs with consistent format

5. **Add explicit return types** (30 min)
   - Add to all exported functions

---

## Appendix B: Performance Benchmarks

### Current Performance (from logs)
- **ETL Process:** ~5-10 seconds for 626 mentors
- **CSV Upload:** ~20,000 rows/sec (good!)
- **Contact Matching:** 82% match rate (excellent!)
- **API Sync:** ~10 contacts/sec (rate limited)

### Potential Improvements
1. **Database indexes:** 2-5x faster queries
2. **Connection pooling:** 1.5x faster for many small queries
3. **Parallel ETL steps:** 1.5x faster overall
4. **Cached conflict rules:** 1.3x faster API sync

---

## Appendix C: Code Smells Detected

### Smell: Magic Numbers
- `BATCH_SIZE = 100` appears in multiple files
- `pageSize = 1000` appears in multiple files
- `999001` used as error placeholder counter

**Fix:** Create constants file
```typescript
// backend/lib/constants.ts
export const DB_BATCH_SIZE = 100;
export const DB_PAGE_SIZE = 1000;
export const ERROR_PLACEHOLDER_START = 999001;
```

### Smell: Long Parameter Lists
- `findMatchingContact()` has 6 parameters (contact-matching.ts:330)

**Fix:** Use parameter object
```typescript
interface MatchingContext {
  mentor: Mentor;
  lookupMaps: LookupMaps;
  allContacts: GivebutterContact[];
}

async findMatchingContact(context: MatchingContext): Promise<GivebutterContact | null>
```

### Smell: Feature Envy
- `conflict-detection.ts` knows too much about `Mentor` internal structure

**Fix:** Add methods to Mentor model
```typescript
class MentorModel {
  hasConflictWith(gbContact: GivebutterContact): boolean {
    // Mentor knows its own conflict detection rules
  }
}
```

---

## Summary of Action Items

### Immediate (This Week)
- [ ] Add database indexes for matching queries
- [ ] Fix memory leak in CSV processor
- [ ] Add timeout to all fetch() calls
- [ ] Create HTTP client abstractions

### Short-term (Next Sprint)
- [ ] Implement structured logging
- [ ] Split ETL process into pipeline
- [ ] Create error logging service
- [ ] Add unit tests for core logic

### Long-term (Next Quarter)
- [ ] Full test coverage (>80%)
- [ ] Refactor contact-matching.ts
- [ ] Implement monitoring & alerting
- [ ] Add performance metrics

---

**End of Audit Report**
