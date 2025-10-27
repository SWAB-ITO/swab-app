# Sync Management UI Specification

**Date**: 2025-01-27
**Status**: Planning
**Priority**: High - Critical for backend refactoring

---

## Overview

User interface for managing sync operations, resolving conflicts, viewing errors, and tracking changes. Provides visibility and control over the bidirectional sync between Jotform, our database, and Givebutter.

---

## Pages & Routes

```
/sync
  /dashboard          - Overview: last sync status, pending items
  /conflicts          - Conflicts requiring human decisions (PRIORITY)
  /errors             - System errors with retry capability
  /warnings           - Non-blocking warnings to acknowledge
  /changes            - Audit log of data changes
  /history            - Past sync operations with details
```

---

## 1. Sync Dashboard (`/sync/dashboard`)

### Purpose
High-level overview of sync health and pending actions.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Sync Status Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│ Last Sync: 2 hours ago (Completed)                          │
│ Next Scheduled: In 22 hours                                  │
│                                                              │
│ [ Run Sync Now ]  [ Schedule Sync ]  [ View History ]       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ ⚠️ Conflicts │ ❌ Errors    │ ⚠️ Warnings  │ ✅ Changes   │
│                                                             │
│     3        │     0        │     12       │     45       │
│   Pending    │   Active     │   Unacked    │   Recent     │
│                                                             │
│ [ Resolve ]  │ [ View ]     │ [ Review ]   │ [ View Log ] │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Recent Sync Operations                                       │
├─────────────────────────────────────────────────────────────┤
│ ✅ Full Sync - 2025-01-27 14:03                             │
│    976 mentors, 0 errors, 3 conflicts                       │
│                                                              │
│ ✅ Jotform Sync - 2025-01-27 09:15                          │
│    15 new submissions                                        │
│                                                              │
│ ✅ Givebutter API Sync - 2025-01-27 06:00                   │
│    976 contacts updated                                      │
└─────────────────────────────────────────────────────────────┘
```

### Components
- Status cards (conflicts, errors, warnings, changes)
- Action buttons (run sync, schedule)
- Recent sync timeline
- Quick filters

---

## 2. Conflicts Resolution (`/sync/conflicts`) - **PRIORITY**

### Purpose
Present data conflicts requiring human decisions with context to make informed choices.

### Conflict Types

1. **Contact Selection** - Multiple contacts match, equal priority
2. **Phone Mismatch** - Different phone numbers from different sources
3. **Email Mismatch** - Different emails from different sources
4. **Data Staleness** - Very old data vs recent data with missing fields
5. **External ID Collision** - Two contacts claim same External ID

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Conflicts Requiring Resolution (3)                           │
│ Filter: [ All ] [ Contact Selection ] [ Data Mismatch ]      │
│ Sort: [ Most Recent ] [ Priority ] [ Mentor Name ]           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📞 Phone Number Mismatch - MN0543 (Elizabeth Wang)           │
│ Created: 2 hours ago                                         │
├─────────────────────────────────────────────────────────────┤
│ We have two different phone numbers for this mentor:         │
│                                                              │
│ ○ Option A: +1 (770) 970-3446                               │
│   Source: Jotform Signup (submitted 2025-01-20)             │
│   ✓ Most recent                                              │
│   ✓ From primary data source                                 │
│                                                              │
│ ○ Option B: +1 (404) 555-1234                               │
│   Source: Givebutter Contact (last modified 2024-11-15)     │
│   ⚠️ Older data (2 months old)                               │
│   ⚠️ Secondary source                                         │
│                                                              │
│ 💡 Recommendation: Use Option A (most recent submission)     │
│                                                              │
│ [ Use Option A ]  [ Use Option B ]  [ Enter Custom Value ]  │
│ [ Skip This Conflict ]  [ View Full History → ]             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👥 Multiple Contacts - MN0410 (Beth Anne Ward)               │
│ Created: 1 day ago                                           │
├─────────────────────────────────────────────────────────────┤
│ Found 2 contacts in Givebutter with equal scoring:          │
│                                                              │
│ ○ Contact #27696972                                          │
│   Name: Elizabeth Ward                                       │
│   Email: bethanneward22@gmail.com                            │
│   Phone: +1 (912) 602-0668                                   │
│   Tags: Mentors 2025, SWAB                                   │
│   Last Modified: 2025-01-15                                  │
│   Completeness: █████████░ 85%                               │
│   Campaign Member: Yes ($25 raised)                          │
│                                                              │
│ ○ Contact #14523856                                          │
│   Name: Beth Anne Ward                                       │
│   Email: eaw36150@uga.edu (UGA only)                         │
│   Phone: +1 (912) 602-0668                                   │
│   Tags: Mentors 2025                                         │
│   Last Modified: 2025-01-15                                  │
│   Completeness: ████████░░ 80%                               │
│   Campaign Member: No                                        │
│                                                              │
│ 💡 Recommendation: Contact #27696972                         │
│    Reason: More complete data + campaign member              │
│                                                              │
│ [ Use Contact #27696972 ]  [ Use Contact #14523856 ]        │
│ [ View in Givebutter → ]  [ Merge in Givebutter → ]         │
└─────────────────────────────────────────────────────────────┘
```

### Features
- **Visual Comparison**: Side-by-side options with metadata
- **Recommendation System**: AI-suggested choice with reasoning
- **Contextual Information**: Tags, dates, completeness scores
- **Bulk Actions**: "Resolve all with recommendations"
- **External Links**: Deep links to Givebutter for verification
- **History**: View past conflicts for same mentor

### States
- `pending` - Awaiting decision
- `resolved` - Decision made
- `skipped` - Deferred for later

---

## 3. Error Log (`/sync/errors`)

### Purpose
Display system errors with retry capability.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Sync Errors (0 active)                                       │
│ Filter: [ All ] [ API Errors ] [ DB Errors ] [ Retryable ]  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ No Active Errors ✅                                          │
│ Last error: 3 days ago (Rate limit - auto-resolved)         │
└─────────────────────────────────────────────────────────────┘

Past Errors (Resolved)
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Rate Limit Hit - Givebutter API                          │
│ Occurred: 2025-01-24 15:32                                   │
│ Resolved: Auto-retry after 60s (successful)                 │
│ Affected: 50 contacts (batch 5/10)                          │
└─────────────────────────────────────────────────────────────┘
```

### Error Types
- **API Errors**: Timeouts, rate limits, authentication failures
- **DB Errors**: Constraint violations, connection issues
- **Data Errors**: Invalid format, missing required fields

### Actions
- Manual retry
- Mark as resolved
- View stack trace
- Export error log

---

## 4. Warnings (`/sync/warnings`)

### Purpose
Non-critical issues that don't block sync but should be reviewed.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Warnings (12 unacknowledged)                                 │
│ [ Acknowledge All ]  [ Filter by Type ]                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Stale Data - MN0123 (John Doe)                           │
│ Givebutter contact last modified 45 days ago                 │
│ Recommend re-syncing this contact                            │
│ [ Sync Now ]  [ Acknowledge ]                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Missing Optional Field - MN0456 (Jane Smith)             │
│ No middle name provided in Jotform                           │
│ [ Acknowledge ]  [ Add Data ]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Change Log (`/sync/changes`)

### Purpose
Audit trail of all data changes with filtering and search.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Change Log (Last 7 days)                                     │
│ Filter: [All Types] [Date Range] [Mentor Search]            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📧 Email Updated - MN0543 (Elizabeth Wang)                   │
│ 2 hours ago - Source: Jotform Signup                         │
│ Old: elizabeth.wang@gmail.com                                │
│ New: ellielwang1@gmail.com                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏷️ Status Changed - MN0410 (Beth Anne Ward)                 │
│ 1 day ago - Source: Givebutter Tag                          │
│ Old: active                                                  │
│ New: dropped (Dropped 25 tag added)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👤 New Mentor - MN0999 (New Student)                        │
│ 3 days ago - Source: Jotform Signup                         │
│ First submission received                                    │
└─────────────────────────────────────────────────────────────┘
```

### Features
- Timeline view
- Export to CSV
- Per-mentor history
- Field-specific filtering

---

## 6. Sync History (`/sync/history`)

### Purpose
Detailed logs of past sync operations.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Sync History                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ✅ Full Sync - 2025-01-27 14:03 (2h ago)                    │
│ Duration: 3m 42s                                             │
│ Processed: 976 mentors                                       │
│ Changes: 45 field updates, 3 new mentors                     │
│ Issues: 3 conflicts (pending), 0 errors                      │
│ [ View Details ] [ Download Log ]                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Design System Integration

### Colors
- **Success**: Green (#10b981) - Completed syncs, resolved items
- **Warning**: Yellow (#f59e0b) - Warnings, pending conflicts
- **Error**: Red (#ef4444) - System errors, failures
- **Info**: Blue (#3b82f6) - Changes, audit items

### Icons
- ⚠️ Conflicts
- ❌ Errors
- ⚠️ Warnings
- ✅ Changes
- 🔄 Sync in progress
- 📞 Phone
- 📧 Email
- 👥 Contact
- 🏷️ Tags

### Typography
- Headings: Inter Bold
- Body: Inter Regular
- Monospace: Source Code Pro (for IDs, technical details)

---

## State Management

### Required State
```typescript
interface SyncState {
  lastSync: {
    timestamp: string;
    status: 'completed' | 'in_progress' | 'failed';
    duration: number;
    stats: SyncStats;
  };

  conflicts: Conflict[];
  errors: SyncError[];
  warnings: SyncWarning[];
  changes: MentorChange[];

  pendingCount: {
    conflicts: number;
    errors: number;
    warnings: number;
  };
}

interface Conflict {
  id: string;
  type: ConflictType;
  mn_id: string;
  mentor_name: string;
  option_a: ConflictOption;
  option_b: ConflictOption;
  recommendation: 'a' | 'b' | null;
  created_at: string;
  status: 'pending' | 'resolved' | 'skipped';
}
```

---

## API Endpoints Needed

```
GET  /api/sync/status              - Dashboard stats
POST /api/sync/run                 - Trigger sync
GET  /api/sync/conflicts           - List conflicts
POST /api/sync/conflicts/:id       - Resolve conflict
GET  /api/sync/errors              - List errors
POST /api/sync/errors/:id/retry    - Retry error
GET  /api/sync/warnings            - List warnings
POST /api/sync/warnings/:id/ack    - Acknowledge warning
GET  /api/sync/changes             - Change log
GET  /api/sync/history             - Sync history
```

---

## Mobile Considerations

- Responsive cards for conflict resolution
- Swipe actions for acknowledge/resolve
- Push notifications for critical conflicts
- Offline mode for viewing (no actions)

---

## Future Enhancements

- Real-time sync status updates (WebSocket)
- Conflict resolution AI suggestions (ML-based)
- Batch conflict resolution
- Scheduled sync with cron syntax
- Email notifications for conflicts
- Slack integration for sync alerts

---

**Next Steps:**
1. Backend implementation (sync_conflicts table, API endpoints)
2. UI component library integration
3. State management setup (React Query)
4. API routes implementation
5. Component development
6. Testing with real conflict scenarios
