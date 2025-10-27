# Backend Architecture

OUT OF DATE !!!!!

## Directory Structure

```
backend/
├── core/
│   ├── etl/
│   │   └── process.ts              # Main ETL pipeline (with 7 helpers)
│   ├── processors/                 # Feature-specific logic
│   ├── services/                   # Business logic services
│   └── sync/
│       ├── orchestrator.ts         # Coordinates sync jobs (async spawn)
│       ├── api-contacts.ts         # Syncs Givebutter contacts via API
│       └── upload-gb-csv.ts        # Handles CSV imports
├── lib/
│   ├── infrastructure/
│   │   ├── clients/
│   │   │   ├── http-client.ts      # Base HTTP client (retry, rate limit, timeout)
│   │   │   ├── givebutter-client.ts # Givebutter API wrapper (auto pagination)
│   │   │   └── jotform-client.ts   # Jotform API wrapper
│   │   └── operators/
│   │       ├── batch-upserter.ts   # Batch DB operations (upsert/insert/delete)
│   │       └── lookup-builder.ts   # Build efficient lookup maps
│   ├── supabase/
│   │   └── database.types.ts       # Generated DB types
│   ├── types/                      # TypeScript types
│   └── utils/
│       ├── logger.ts               # Structured logging
│       ├── error-handler.ts        # Centralized error management
│       └── validators.ts           # normalizePhone, normalizeEmail, etc.
└── scripts/                        # Admin utilities
```

---

## Core Concepts

### 1. Infrastructure Layer
Reusable components for HTTP, database, logging, error handling.
- **Clients**: Type-safe API wrappers with retry/rate-limiting
- **Operators**: Batch operations, lookups
- **Utils**: Logging, validation, error handling

### 2. Simplified Sync Architecture

**Raw Sources:**
- `raw_mn_signups` - Jotform initial signup + BGC
- `raw_mn_funds_setup` - Jotform fundraiser setup form
- `raw_gb_full_contacts` - CSV upload + tag-based API queries (tag: "Mentors 2025")
- `raw_gb_campaign_members` - GB API campaign members with fundraising data

**Processing:**
- `mentors` - Single source of truth (includes amount_raised, status, gb_contact_id, etc.)

**Export:**
- `mn_gb_import` - Staging table generated on-demand for feature needs

**Sync Workflow:**
1. Fetch Jotform signups → `raw_mn_signups`
2. Fetch Jotform setup → `raw_mn_funds_setup`
3. Fetch GB campaign members → `raw_gb_campaign_members` (amount_raised)
4. Query GB API by tag "Mentors 2025" → upsert to `raw_gb_full_contacts` (keeps data fresh)
5. Run ETL → match & merge → `mentors` (single source of truth)
6. Feature-specific prep → `mn_gb_import` (e.g., add custom messages for comms)
7. Export → CSV → upload to Givebutter
8. Query GB API by tag → update `raw_gb_full_contacts` (confirmed contact IDs)

### 3. ETL Pipeline
Transform raw data into clean records:

1. **Load raw sources** - `raw_mn_signups`, `raw_mn_funds_setup`, `raw_gb_campaign_members`, `raw_gb_full_contacts`
2. **Validate & deduplicate** - Assign placeholder IDs, remove duplicates by phone
3. **Build lookups** - Create O(1) phone/email maps for matching
4. **Match & merge** - Match signup → setup → member → GB contact
5. **Process** - Build mentor records (with amount_raised from campaign_members)
6. **Detect duplicates** - Find duplicate GB contacts by phone/email
7. **Stage export** - Generate `mn_gb_import` rows for feature needs

---

## How Sync Works

### Orchestrator (`core/sync/orchestrator.ts`)

Runs sync jobs sequentially with async spawn (non-blocking):

```typescript
async runPeriodicSync() {
  const steps = [
    'npm run sync:jotform-signups',
    'npm run sync:jotform-setup',
    'npm run sync:givebutter-members',
    'npm run etl',
    'npm run sync:api-contacts',
  ];

  for (const step of steps) {
    const result = await this.runScript(step);
    if (!result.success) break;
  }
}
```

Logs to `sync_log` table with status, duration, errors.

### GB API Tag Query

Query contacts by tag "Mentors 2025":
1. Fetch contacts via `GivebutterClient` with tag filter
2. Upsert to `raw_gb_full_contacts` (keeps data fresh between CSV uploads)
3. Only syncs tagged contacts we care about (not all 48k contacts)
4. Update `mentors.gb_contact_id` for matched contacts

Rate limited: 10 req/s (built into client)

### CSV Upload (`core/sync/upload-gb-csv.ts`)

1. Parse CSV (40k+ contacts)
2. Clear `raw_gb_full_contacts`
3. Batch insert via `BatchUpserter`
4. Match contacts to mentors (phone → email → external_id)
5. Update `mentors.gb_contact_id`

---

## How ETL Works (`core/etl/process.ts`)

### Main Flow

```typescript
// 1. Load raw data
const signups = await supabase.from('raw_mn_signups').select('*');
const setup = await supabase.from('raw_mn_funds_setup').select('*');
const members = await supabase.from('raw_gb_campaign_members').select('*');
const gbContacts = await supabase.from('raw_gb_full_contacts').select('*');

// 2. Validate and deduplicate
const validatedSignups = validateAndFixMnIds(signups, errors);
const uniqueSignups = deduplicateByPhone(validatedSignups, errors);

// 3. Build lookups for O(1) matching
const { phoneToContact, emailToContacts } = buildContactLookups(gbContacts);
const membersByEmail = buildMemberLookup(members);  // For amount_raised

// 4. Process each signup - merge all data into mentor record
const mentors = [];
for (const signup of uniqueSignups) {
  const mentor = processMentorSignup(signup, {
    setupForms: setup,
    members: membersByEmail,
    contacts: { phoneToContact, emailToContacts },
    errors
  });
  if (mentor) {
    // Mentor now includes amount_raised directly from campaign_members
    mentors.push(mentor);
  }
}

// 5. Detect duplicates
detectGivebutterDuplicates(gbContacts, emailToContacts, errors);

// 6. Write mentors to database (includes all data: amount_raised, status, etc.)
await batchUpserter.upsert('mentors', mentors, { onConflict: 'mn_id' });

// 7. Generate GB import on-demand for specific features (e.g., comms campaigns)
// This is done separately in feature-specific scripts, not in ETL
await errorHandler.flush();
```

### Contact Matching Priority

1. **Phone**: Lookup in `phoneToContact` map from `raw_gb_full_contacts` (normalized E.164)
2. **Email**: Lookup in `emailToContacts` map from `raw_gb_full_contacts` (lowercased)
3. **External ID**: Fallback match on `contact.external_id === mn_id`
4. **Existing link**: Check `mentors.gb_contact_id` if already matched

### Data Quality Rules

- Missing mn_id → Assign placeholder ID (999001+)
- Duplicate phone → Keep newest record
- Invalid phone/email → Log error, continue processing
- Multiple GB contacts with same phone/email → Log duplicate error

---

## Infrastructure Components

### Clients

**GivebutterClient** (`lib/infrastructure/clients/givebutter-client.ts`)
```typescript
const client = new GivebutterClient({ apiKey, logger });
const contacts = await client.getAllContacts();           // Auto pagination
const contact = await client.getContact(id);              // Single contact
const members = await client.getAllCampaignMembers(id);   // All members
```

**JotformClient** (`lib/infrastructure/clients/jotform-client.ts`)
```typescript
const client = new JotformClient({ apiKey, logger });
const submissions = await client.getFormSubmissions(formId);
```

**HttpClient** (base class)
- Automatic retry with exponential backoff (3 attempts)
- Configurable timeout (default: 30s)
- Rate limiting (requests/second)
- Request/response logging

### Operators

**BatchUpserter** (`lib/infrastructure/operators/batch-upserter.ts`)
```typescript
const upserter = new BatchUpserter({ supabase, logger, errorHandler });

// Upsert (default batch size: 100)
const result = await upserter.upsert('mentors', records, { onConflict: 'mn_id' });

// Insert
await upserter.insert('raw_gb_full_contacts', contacts);

// Delete
await upserter.deleteByIds('mentors', 'mn_id', ['123', '456']);
```

**LookupBuilder** (`lib/infrastructure/operators/lookup-builder.ts`)
```typescript
const phoneMap = LookupBuilder.buildMap(
  contacts,
  (c) => normalizePhone(c.phone),  // Key function
  (c) => c                          // Value function
);
```

### Utils

**Logger** (`lib/utils/logger.ts`)
```typescript
const logger = new Logger('JobName');
logger.start('operation');
logger.info('message', { data });
logger.error('message', error);
logger.end('operation');  // Logs duration
```

**ErrorHandler** (`lib/utils/error-handler.ts`)
```typescript
const handler = new ErrorHandler({ supabase, logger, bufferSize: 50 });
handler.add({
  mn_id: '123',
  error_type: 'validation_failed',
  error_message: 'Invalid phone',
  severity: 'error',
  source_table: 'raw_mn_signups',
});
await handler.flush();  // Write buffered errors to mn_errors table
```

**Validators** (`lib/utils/validators.ts`)
```typescript
normalizePhone('(555) 123-4567')  // '+15551234567'
normalizeEmail('USER@EXAMPLE.COM') // 'user@example.com'
isValidPhone('+15551234567')       // true
isValidEmail('user@example.com')   // true
```

---

## How to Extend

### Add a New Sync Job

1. Create script in `backend/scripts/` or `backend/core/sync/`
2. Use infrastructure components:
```typescript
import { JotformClient } from '../lib/infrastructure/clients/jotform-client';
import { BatchUpserter } from '../lib/infrastructure/operators/batch-upserter';
import { Logger } from '../lib/utils/logger';
import { ErrorHandler } from '../lib/utils/error-handler';

const logger = new Logger('NewSync');
const client = new JotformClient({ apiKey, logger });
const upserter = new BatchUpserter({ supabase, logger, errorHandler });

const data = await client.getFormSubmissions(formId);
await upserter.upsert('table_name', data, { onConflict: 'id' });
await errorHandler.flush();
```

3. Add to `orchestrator.ts` if needed for periodic sync

### Modify ETL Logic

Edit `backend/core/etl/process.ts`:

- **Change matching logic**: Modify `processMentorSignup()` helper
- **Add validation**: Update `validateAndFixMnIds()` or create new helper
- **Change deduplication**: Modify `deduplicateByPhone()` (e.g., prefer mentor with most data)
- **Add custom field**: Update `buildGbImportRow()` to include new field

### Create New API Client

Extend `HttpClient`:
```typescript
import { HttpClient } from '../lib/infrastructure/clients/http-client';

export class NewApiClient extends HttpClient {
  constructor(config: { apiKey: string; logger?: Logger }) {
    super({
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerSecond: 10 },
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      logger: config.logger,
    });
  }

  async getResource(id: string): Promise<Resource> {
    return this.get<Resource>(`/resources/${id}`);
  }
}
```

---

## Key Patterns

1. **Always use infrastructure**: Don't use raw `fetch()` or manual loops
2. **Structured logging**: Use `Logger`, not `console.log`
3. **Error buffering**: Use `ErrorHandler`, don't lose errors
4. **Batch operations**: Use `BatchUpserter` for database writes
5. **Normalize data**: Use `validators.ts` functions consistently
6. **Helper extraction**: Keep functions under 50 lines, extract to helpers

## Troubleshooting

**API key errors**: Run `npm run sync:init`

**Sync failures**: Check `sync_log` table for errors

**Data quality issues**: Query `mn_errors` table:
```sql
SELECT error_type, COUNT(*) as count, severity
FROM mn_errors
GROUP BY error_type, severity
ORDER BY count DESC;
```

**Missing matches**: Upload Givebutter CSV to capture contact IDs

**Duplicates**: Use Givebutter UI to consolidate, then re-sync
