# Mentor Database - Exec Config & Setup

**Route:** `/` (root), `/mentors`, `/sync`, `/settings`
**Users:** Exec board members, Directors, internal staff
**Purpose:** Year-round mentor data management and preparation for Event Day

---

## Current Implementation Status

**✅ Fully Implemented** - This is the existing codebase before monorepo conversion

See source code in `src/app/` for full implementation details.

---

## Purpose

The Mentor Database is the **pre-event data preparation system**. It handles all mentor-related activities from recruitment through Event Day readiness:

1. **Data Synchronization** - Pull from Jotform (signups, setup, training) and Givebutter (fundraising)
2. **Data Processing** - ETL, conflict detection, contact matching
3. **Mentor Management** - View, search, track progress
4. **Training Check-In** - Pre-event training session attendance
5. **Partner Management** - Assign and verify mentor pairs
6. **Export** - Generate CSV for external systems
7. **Configuration** - API keys, form mappings, sync settings

---

## Key Pages & Routes

### 1. Dashboard (`/` - page.tsx:18-194)

**Purpose:** Home screen with overview and quick actions

**Features:**
- **Program Overview Stats:**
  - Total Mentors (minus dropped)
  - Need Fundraising (< $75)
  - Need GB Page (no fundraising page)
  - Need Training Signup (not signed up)
  - API: `/api/dashboard/stats`

- **Quick Actions Cards:**
  - View Mentors → `/mentors`
  - Sync Data → `/sync`
  - Configure Settings → `/settings`

**Components:**
- `StatCard` - Metric display with icon, value, description
- Gradient background, large typography
- Card-based navigation

---

### 2. Mentors (`/mentors` - mentors/page.tsx:74-701)

**Purpose:** Search, browse, and manage mentor records

**Features:**

#### A. Quick Search (Phone-Based)
- **Input:** Last 4 digits of phone number
- **Debounced search** (150ms) → `/api/mentors?phone=:last4`
- **Results:** Command/Combobox dropdown
- **Display:** Phone, name, training status
- **Action:** Click to open check-in dialog

**Similar pattern to Event Day MN Check In, but includes training info**

#### B. Training Check-In Dialog
**Modal workflow:**
1. Display mentor info (name, phone, fundraising status)
2. Show:
   - Fundraising Page status (Active / Not Set Up)
   - Amount Raised
   - Training status (Already Checked In / Not Checked In)
3. **Notes field** (optional, for check-in context)
4. **Actions:**
   - "Check In to Training" → POST `/api/mentors/checkin`
   - "Undo Check-In" → DELETE `/api/mentors/checkin`
   - Success state → "Check-In Complete!" → "Next Person"

**Database:**
- Updates `mentors.training_done = true`
- Records `mentors.training_at = NOW()`
- Saves optional notes in `mentors.notes`

#### C. Browse All Mentors Table
- **Table component:** TanStack React Table
- **Columns:**
  - ID (mn_id)
  - First Name (sortable)
  - Last Name (sortable)
  - Email (personal or UGA)
  - Phone
  - Amount Raised (formatted currency)
  - Status (status_category badge)
  - Actions (dropdown menu)

- **Pagination:** Built-in
- **Row click:** Opens detail dialog
- **Actions menu:**
  - View Details
  - Copy ID

**API:** GET `/api/mentors` → Returns all mentors (minus dropped)

---

### 3. Sync Dashboard (`/sync` - sync/page.tsx:31-375)

**Purpose:** Data synchronization from external sources

**Features:**

#### A. System Status Cards
- **System Status:** Initialized / Not Configured
- **Last Sync:** Date and time
- **Active Errors:** Count of unresolved issues

**API:** GET `/api/sync/init`

#### B. Sync Operations

**Operation 1: Periodic Sync**
- **Button:** "Run Periodic Sync"
- **Action:** POST `/api/sync/periodic`
- **Process:**
  - Jotform signups sync
  - Jotform setup form sync
  - Jotform training signup sync
  - Givebutter campaign members sync
  - ETL processing
  - Givebutter API contact sync
- **Output:** Streaming response (Server-Sent Events)
- **Live feed:** Real-time progress messages
- **Updates:** `sync_log` table

**Operation 2: CSV Upload**
- **Button:** "Select CSV File"
- **Action:** POST `/api/sync/upload-csv` (multipart/form-data)
- **Purpose:** Upload Givebutter full contact export
- **Process:**
  - Parse CSV
  - Match contacts by email/phone
  - Capture Givebutter contact IDs
  - Update `raw_gb_full_contacts`
- **Output:** Streaming response with progress

#### C. Recent Activity
- **Display:** Last 10 sync operations from `sync_log`
- **Component:** `SyncLogList`
- **Fields:** Timestamp, operation type, status, duration

#### D. Errors & Conflicts
- **Display:** Unresolved errors from `mn_errors`
- **Fields:** Error type, severity, message, mentor ID, timestamp
- **Component:** `StatusBadge` for severity (info, warning, error, critical)
- **Empty state:** "No unresolved errors"

**API:**
- GET `/api/sync/logs?type=sync_log&limit=10`
- GET `/api/sync/logs?type=errors&limit=10`

---

### 4. Settings (`/settings` - settings/page.tsx:38-611)

**Purpose:** API configuration and system preferences

**Tabs:**
1. **Account** (placeholder - coming soon)
2. **API Config** (active)
3. **Preferences** (placeholder - coming soon)

#### API Configuration Wizard

**Step 1: API Configuration**
- **Inputs:**
  - Jotform API Key (password field)
  - Givebutter API Key (password field)
- **Action:** "Test API Connection" → POST `/api/sync/test-keys`
- **Validation:** Both APIs must return success
- **On Success:** Auto-discover forms/campaigns

**Step 2: Form Selection**
- **Jotform Forms Discovery:**
  - Button: "Discover Forms" → POST `/api/sync/discover-jotform`
  - Returns: List of forms from Jotform account
  - Select: Signup Form, Setup Form, Training Signup Form

- **Givebutter Campaigns Discovery:**
  - Button: "Discover Campaigns" → POST `/api/sync/discover-givebutter`
  - Returns: List of campaigns from Givebutter
  - Select: Campaign code

- **Component:** `FormSelector` (dropdown with search)

**Step 3: CSV Upload** (Optional)
- Same as Sync page CSV upload
- Optional step in wizard

**Step 4: Review & Sync**
- Review all selections
- **Save Configuration:** POST `/api/sync/config`
  - Stores API keys and form/campaign IDs in `sync_config` table
  - Encrypted storage for API keys
- **Run Initial Sync:** Same as Periodic Sync
- **Streaming progress display**

**Component:** `ConfigWizard`
- Multi-step wizard with progress indicator
- Persistent state (localStorage)
- Validation per step

---

## Database Schema (Current)

### Raw Sources
- `raw_mn_signups` - Jotform initial signup + BGC
- `raw_mn_funds_setup` - Jotform fundraiser setup
- `raw_mn_training_signup` - Jotform training session signup
- `raw_gb_full_contacts` - CSV upload + API (all GB contacts)
- `raw_gb_campaign_members` - GB API campaign fundraising data

### Processing
- `mentors` - **Single source of truth** for all mentor data
  - Consolidated from all raw sources via ETL
  - Fields: mn_id, name, contact info, fundraising, training, partner, status

### Export
- `mn_gb_import` - Staging table for CSV export to Givebutter

### Admin
- `mn_errors` - Error tracking (conflicts, validation failures)
- `mn_changes` - Mentor changes and issues tracking
- `sync_log` - Sync operation history
- `csv_import_log` - CSV upload tracking
- `sync_config` - Stored API keys and configuration

**See:** `supabase/migrations/00000_initial_schema.sql`

---

## API Routes

**Dashboard:**
- GET `/api/dashboard/stats` - Overview statistics

**Mentors:**
- GET `/api/mentors` - All mentors
- GET `/api/mentors?phone=:last4` - Search by phone
- POST `/api/mentors/checkin` - Check in to training
- DELETE `/api/mentors/checkin` - Undo check-in

**Sync:**
- GET `/api/sync/init` - System initialization status
- POST `/api/sync/periodic` - Run full sync (SSE)
- POST `/api/sync/upload-csv` - Upload CSV (SSE)
- GET `/api/sync/logs` - Sync history and errors
- GET `/api/sync/config` - Get saved configuration
- POST `/api/sync/config` - Save configuration
- POST `/api/sync/test-keys` - Validate API keys
- POST `/api/sync/discover-jotform` - List Jotform forms
- POST `/api/sync/discover-givebutter` - List Givebutter campaigns

**Backend:**
- Core logic in `backend/core/`
- Processors: `jotform-sync-processor.ts`, `givebutter-sync-processor.ts`, `csv-processor.ts`
- ETL: `etl/process.ts`
- Services: `contact-matching.ts`, `conflict-detection.ts`

---

## Key Features Not Yet Built

### A. Partner Assignment Interface
**Status:** Database supports it, UI not built

**Planned Features:**
- View all mentors
- Search for partner
- Assign partner (bidirectional)
- Verify both mentors confirmed
- Handle partner drops (reassignment)
- Export partner pairs for Event Day

**Database:**
- `mentors.partner_mn_id` (FK to other mentor)
- Constraint: Bidirectional (if A → B, then B → A)

### B. Mentor Status Management
**Status:** Basic status exists, but no workflow UI

**Status Categories:**
- `active` - Participating
- `dropped` - No longer participating
- `waitlist` - Not yet confirmed
- `incomplete` - Missing requirements

**Planned Features:**
- Bulk status updates
- Status change reason tracking
- Notification to mentors on status change

### C. Export Functionality
**Status:** Backend exists, UI minimal

**Export Needs:**
- CSV export for Givebutter import
- Partner pairs list for Event Day
- Training attendance report
- Fundraising report

### D. Communications
**Status:** Not implemented

**Future:**
- Send email to all mentors
- Send SMS to mentor groups
- Template management
- Communication history log

---

## Configuration Requirements (Year-to-Year)

### What Changes Annually:

1. **API Form/Campaign IDs:**
   - New Jotform signup form each year
   - New Jotform setup form each year
   - New Jotform training form each year
   - New Givebutter campaign each year
   - **Reconfigured via Settings wizard**

2. **Mentor Data:**
   - New cohort of mentors
   - New signups throughout recruitment period
   - Partner reassignments
   - **Handled via Sync operations**

3. **Timing:**
   - Training session dates
   - Event Day date
   - Fundraising deadline
   - **Configurable parameters (future)**

### What Stays Stable:

1. **API Keys:**
   - Jotform API key (organization account)
   - Givebutter API key (organization account)
   - **Saved in Settings, rarely changes**

2. **Data Structure:**
   - Database schema
   - ETL logic
   - Field mappings

3. **Workflows:**
   - Check-in process
   - Sync process
   - Partner assignment logic

---

## UI/UX Patterns

### Design System
- **Colors:** Primary, accent, info, success, warning, error
- **Typography:** Large headings (5xl-6xl), body (base-xl)
- **Layout:** Container, padding, gradients
- **Components:** Shadcn UI (Card, Button, Table, Dialog, etc.)

### Navigation
- **No sidebar/header nav** in current build
- **Card-based navigation** on homepage
- **Direct URL access** for deep linking

### Responsive
- **Mobile-friendly** (min breakpoints)
- **Desktop-first** design (primary use case)
- **Touch targets** for tablet use

---

## Testing & Quality

### Current Testing
- Manual testing during development
- No automated test suite yet

### Needed:
- Unit tests for ETL logic
- Integration tests for sync operations
- E2E tests for critical workflows
- Load testing for sync with 1,000+ mentors

---

## Future Monorepo Conversion Notes

**Current structure:**
- All in `src/app/` - Single Next.js app
- Routes directly under `app/`

**Post-conversion:**
- Mentor Database becomes namespace: `/admin` or `/mentor-db`
- Event Day becomes namespace: `/event`
- Shared components/utilities extracted
- Separate auth channels

**Migration Plan:**
- Keep existing code largely intact
- Move routes to new namespace
- Update internal links
- Maintain database schema (no breaking changes)

---

## Dependencies

### External Services
- **Jotform API** - Form submissions
- **Givebutter API** - Fundraising data
- **Supabase** - Database, Auth, Edge Functions
- **Vercel** - Hosting

### NPM Packages
- Next.js 14+
- React
- TanStack React Table
- Shadcn UI components
- Tailwind CSS
- TypeScript
- (See package.json for full list)

---

## Known Issues & Tech Debt

1. **No auth yet** - Anyone can access all pages
2. **No error boundaries** - App crashes on unhandled errors
3. **No loading states** on some operations
4. **CSV upload feedback** could be better
5. **Partner assignment UI** not built
6. **Export features** incomplete
7. **Communication tools** not implemented

---

## Success Criteria

**Pre-Event:**
- ✅ All mentor data synced from Jotform and Givebutter
- ✅ Conflicts resolved and mentors validated
- ✅ Training attendance tracked
- ⏳ Partner pairs assigned and confirmed
- ✅ Fundraising progress monitored
- ⏳ Ready for Event Day handoff

**System Health:**
- ✅ Sync operations run successfully
- ✅ Error tracking functional
- ⏳ Data quality high (< 5% error rate)
- ✅ Dashboard accessible and accurate

---

## Integration with Event Day

**Data Handoff:**
- `mentors` table → Event Day MN Check In (phone lookup, partner verification)
- `mentors.partner_mn_id` → Event Day Matching (verify pairs)
- Training completion → Not directly used on Event Day (pre-req check only)

**Timing:**
- Mentor Database used: Year-round (recruitment through prep)
- Final sync: Night before Event Day
- Event Day: Switch to Event Day operational interfaces
