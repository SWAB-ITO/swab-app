# Event Day - Exec Config & Setup

**Route:** `/event/admin`
**Users:** Event coordinators, Directors, Tech lead
**Purpose:** Pre-event configuration, real-time monitoring, and troubleshooting

---

## Purpose

Unlike the operational interfaces (check-in, matching, checkpoints, checkout), this is the **control center** for Event Day. It handles:

1. **Pre-Event Configuration** (days/weeks before)
2. **Day-Of Monitoring** (real-time oversight)
3. **Exception Handling** (troubleshooting and overrides)
4. **Post-Event Reporting** (wrap-up and analysis)

---

## Section 1: Pre-Event Configuration

### A. Checkpoint Configuration

**Purpose:** Define checkpoint locations and expectations for the year

**Fields to configure:**
- **Checkpoint 1:**
  - Name: "Auditorium Exit" (editable)
  - Location description: "Main auditorium, exit doors"
  - Expected volunteers: 2
  - GPS coordinates (optional)

- **Checkpoint 2:**
  - Name: "Bus Return" (editable)
  - Location description: "School bus loop"
  - Expected volunteers: 3
  - GPS coordinates (optional)

- **Checkpoint 3:**
  - Name: "Gym Entry" (editable)
  - Location description: "Gymnasium main entrance"
  - Expected volunteers: 2
  - GPS coordinates (optional)

**Interface:**
- Three checkpoint cards
- Edit button per checkpoint
- Form with name, description, location, volunteer count
- Save to `event_config` table

**Why this matters:**
- Venue may change year-to-year
- Checkpoint names shown in all interfaces
- Staff see relevant location descriptions in PWA

---

### B. Staff Assignment

**Purpose:** Assign volunteers to specific stations before Event Day

**Assignments needed:**
- **Mentor Check-In:** 2-3 staff
- **Mentee Check-In:** 2-3 staff
- **Matching:** 2-3 staff
- **Checkpoint 1:** 2 staff
- **Checkpoint 2:** 3 staff
- **Checkpoint 3:** 2 staff
- **Check-Out:** 3-5 staff

**Interface:**
- Table or cards showing each station
- Drag-and-drop volunteer assignment
- Volunteer pool list (name, phone, role)
- Color-coding by assignment
- Print station assignments (day-of reference)

**Database:**
- `event_staff_assignments` table
  - `assignment_id` (pk)
  - `staff_name`
  - `staff_phone`
  - `station` (enum: mentor_checkin, mentee_checkin, matching, cp1, cp2, cp3, checkout)
  - `shift_start`, `shift_end` (optional)

---

### C. Event Day Parameters

**Configuration options:**
- **Event Date:** Date picker
- **Check-In Start Time:** Time picker (e.g., 8:00 AM)
- **Matching Start Time:** Time picker (e.g., 8:30 AM)
- **Expected Participants:**
  - Total mentors (e.g., 1,000)
  - Total mentees (e.g., 500)
  - Expected trios (e.g., 500)
- **Trio Configuration:**
  - Mentors per trio: 2 (default, could be configurable)
  - Mentees per trio: 1 (default)
- **Timing Thresholds:**
  - Max time at checkpoint: 30 minutes (alert if exceeded)
  - Checkout notification delay: 5 minutes
- **SMS Configuration:**
  - Default pickup location message
  - Mentor notification template
  - Twilio phone number

**Storage:** `event_config` table (single row, year/event specific)

---

### D. Mentee Import

**Purpose:** Load mentee registration data before Event Day

**Import Sources:**
1. **Jotform:** Mentee registration form
2. **CSV Upload:** From external system
3. **Manual Entry:** For walk-ups or special cases

**Interface:**
- Sync button (similar to Mentor Database sync)
- CSV upload with field mapping
- Manual entry form
- Data validation and preview
- Bulk actions (mark as attended, etc.)

**Table:** `mentees`
**Fields:**
- `mentee_id` (pk)
- `first_name`, `last_name`
- `age`, `grade`
- `parent1_name`, `parent1_phone`, `parent1_email`
- `parent2_name`, `parent2_phone`, `parent2_email`
- `special_notes`
- `shirt_size`
- `registration_source`
- `registered_at`

**Validation:**
- No duplicate names (warn if potential duplicates)
- Parent contact required
- Age/grade reasonable ranges

---

### E. System Readiness Check

**Pre-Event Checklist:**
- ☐ All mentors synced and verified
- ☐ Mentor pairs assigned
- ☐ Mentee data loaded
- ☐ Checkpoint locations configured
- ☐ Staff assignments complete
- ☐ SMS integration tested
- ☐ QR code printing tested
- ☐ All devices ready (tablets, phones)
- ☐ Network connectivity verified

**Interface:**
- Checklist with auto-checks where possible
- Manual checkbox for physical verification
- Red/yellow/green status indicators
- "Ready for Event Day" final confirmation

---

## Section 2: Real-Time Monitoring Dashboard

### A. Overview Metrics

**High-Level Stats (Top of dashboard):**
- **Check-In Progress:**
  - Mentors checked in: 456 / 500 (91%)
  - Mentees checked in: 423 / 500 (85%)
- **Matching Progress:**
  - Trios created: 387 / 500 (77%)
- **Checkpoint Flow:**
  - At CP1: 145
  - At CP2: 98
  - At CP3: 144
- **Checkouts:**
  - Completed: 112 / 500 (22%)

**Visual:** Progress bars, pie charts, or gauges

---

### B. Station-Specific Views

**Tabs or sections for each station:**

#### Mentor Check-In Monitor
- Total checked in
- Check-in rate (pairs/minute)
- Recent check-ins (last 10)
- Errors/exceptions count
- Average time per check-in

#### Mentee Check-In Monitor
- Total checked in
- Check-in rate (mentees/minute)
- Recent check-ins (last 10)
- Sibling groups created: X
- QR codes generated: X
- Errors/exceptions count

#### Matching Monitor
- Total trios created
- Matching rate (trios/minute)
- Current queue lengths:
  - Mentor pairs waiting: 23
  - Mentees waiting: 18
- Recent matches (last 10)
- Queue imbalance alert (if mentor/mentee mismatch)

#### Checkpoint Flow Monitor
- **Heat Map:** Visualize where trios are located
- **Timeline:** Trio progress through checkpoints
- **Stuck Trios:** Trios exceeding time threshold at a checkpoint
- **Checkpoint Stats:**
  - CP1: 45 scans, 12 scans/min
  - CP2: 38 scans, 10 scans/min
  - CP3: 51 scans, 15 scans/min

#### Check-Out Monitor
- Total checkouts
- Checkout rate (mentees/minute)
- Rush pickups: X
- Parents waiting: X
- Mentees ready for pickup (at CP3): X
- Average wait time per pickup type

---

### C. Alerts & Warnings

**Real-Time Alert System:**
- **Warning:** Queue imbalance (more mentors than mentees or vice versa)
- **Alert:** Trio stuck at checkpoint > 30 minutes
- **Error:** Duplicate check-in attempt
- **Critical:** System error (database, SMS failure, etc.)

**Alert Display:**
- Toast notifications (top-right)
- Alert feed (sidebar or dedicated tab)
- Dismissible or auto-dismiss
- Filter by severity (info, warning, error, critical)

---

### D. Live Activity Feed

**Recent Activity Log:**
- Real-time stream of events
- Filterable by station or type
- Example entries:
  - "✓ Mentor pair #123 checked in"
  - "✓ Trio #47 created (John & Jane → Billy)"
  - "⚠️ Duplicate scan attempt at CP2 for Trio #32"
  - "✓ Sarah Johnson checked out (Standard pickup)"

**Format:** Timestamp, event type, description, staff involved

---

## Section 3: Exception Handling & Troubleshooting

### A. Search & Lookup

**Unified Search Bar:**
- Search by:
  - Mentor name, phone, ID
  - Mentee name, ID
  - Trio ID
  - Parent name, phone
- Quick access to any record
- View full details and history

**Use Cases:**
- "Where is Billy Johnson right now?"
- "Has mentor Jane Doe checked in?"
- "Show me Trio #47's full journey"

---

### B. Manual Overrides

**Override Capabilities (Admin Only):**
- **Force check-in:** Bypass normal check-in process
- **Force trio creation:** Manually create trio (if matching fails)
- **Force checkpoint scan:** Record scan manually (if QR fails)
- **Force checkout:** Emergency checkout (parent verified externally)
- **Break trio:** Split trio if issue discovered
- **Reassign mentee:** Move mentee to different trio

**Audit Trail:** All overrides logged with:
- Admin user who performed override
- Reason (text field)
- Timestamp
- Original state and new state

---

### C. Issue Resolution

**Common Issues Interface:**
- **Mentor without partner:** Assign emergency partner
- **Mentee not registered:** Emergency registration form
- **Trio creation failed:** Retry or manual creation
- **QR code not scanning:** Regenerate QR or manual entry
- **SMS not delivered:** Resend or manual phone call
- **Parent identity issue:** Escalation protocol

**Actions per issue:**
- View details
- Suggested resolution
- Take action button
- Mark as resolved
- Escalate to Director

---

## Section 4: Post-Event Reporting

### A. Summary Report

**Key Metrics:**
- Total participants (mentors, mentees)
- Total trios created
- Total checkpoints scanned
- Total checkouts completed
- Average time metrics:
  - Check-in time
  - Matching time
  - Time between checkpoints
  - Checkout time
- Error count and types
- Override count

**Export Options:**
- PDF report
- CSV data export
- Google Sheets integration

---

### B. Data Cleanup

**Post-Event Actions:**
- Mark event as "completed"
- Archive event data
- Clear event-specific tables (if desired)
- Generate mentor attendance records
- Export for accounting/reimbursement

---

## Database Requirements

### New Tables

**`event_config`**
```sql
- event_id (pk)
- event_date
- checkin_start_time
- matching_start_time
- expected_mentors
- expected_mentees
- checkpoint1_name, checkpoint1_location, checkpoint1_volunteers
- checkpoint2_name, checkpoint2_location, checkpoint2_volunteers
- checkpoint3_name, checkpoint3_location, checkpoint3_volunteers
- sms_template
- sms_phone_number
- max_checkpoint_time_minutes
- created_at, updated_at
```

**`event_staff_assignments`**
```sql
- assignment_id (pk)
- event_id (fk)
- staff_name
- staff_phone
- station (enum)
- shift_start, shift_end
- created_at
```

**`event_overrides` (audit table)**
```sql
- override_id (pk)
- event_id (fk)
- admin_user
- override_type (enum: force_checkin, force_trio, etc.)
- target_id (mentor_id, mentee_id, trio_id, etc.)
- reason (text)
- original_state (jsonb)
- new_state (jsonb)
- created_at
```

**`event_alerts`**
```sql
- alert_id (pk)
- event_id (fk)
- alert_type (enum: queue_imbalance, trio_stuck, etc.)
- severity (enum: info, warning, error, critical)
- message (text)
- resolved (boolean)
- resolved_by
- resolved_at
- created_at
```

---

## UI/UX Specifications

### Layout
- **Dashboard style** (not wizard-like)
- **Navigation tabs:** Config | Monitor | Troubleshoot | Reports
- **Responsive:** Desktop primary, tablet secondary
- **Dark mode support:** Long hours on Event Day

### Components (Shadcn)
- `Tabs` for navigation
- `Card` for metrics
- `Progress` for completion tracking
- `Badge` for status indicators
- `Alert` for warnings
- `Table` for activity feed
- `Dialog` for overrides
- `Command` for search
- `Chart` components (via Recharts or similar)

### Real-Time Updates
- **WebSocket connection** for live data
- **Polling fallback** if WebSocket unavailable
- **Update frequency:** 5 seconds
- **Visual indicator:** "Live" badge with pulse animation

---

## Security & Access Control

**Authentication:**
- Supabase Auth (admin channel)
- Role-based access:
  - **Director:** Full access (including overrides)
  - **Coordinator:** Monitor and alerts only
  - **Tech Lead:** Full access (including troubleshooting)

**Audit:**
- All overrides logged
- All configuration changes logged
- Access logs (who viewed what, when)

---

## Testing Requirements

- Test pre-event configuration flow
- Test real-time data updates (simulated load)
- Test alert generation and display
- Test override functionality
- Test search across all entities
- Test report generation
- Load test dashboard with 500 active trios

---

## Integration Points

### Receives data from:
- **All operational interfaces:** Check-ins, matching, checkpoints, checkout
- **Mentor Database:** Mentor data, partner assignments

### Provides to:
- **Operational interfaces:** Configuration data (checkpoint names, etc.)
- **SMS system:** Templates and phone number

---

## Future Enhancements (Not MVP)

- **Predictive analytics:** "At current rate, matching will complete by 10:45 AM"
- **Mobile app version:** Monitor from anywhere
- **Auto-alerting:** Text/email to coordinators for critical alerts
- **Video feeds:** Live camera views of checkpoint stations
- **Weather integration:** Outdoor checkpoint alerts
- **Historical comparison:** Compare to previous years' metrics
- **AI-powered recommendations:** "Consider adding staff to Checkpoint 2"
- **Voice control:** "Alexa, how many mentees are checked in?"
