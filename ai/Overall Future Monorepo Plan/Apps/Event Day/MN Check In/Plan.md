# Mentor Check-In Interface

**Route:** `/event/mentor-checkin`
**Users:** Check-in staff (2-3 volunteers)
**Purpose:** Verify mentor pairs on arrival morning of Event Day

---

## Workflow

From mist.swabuga.org detailed flow:

1. **Mentor pairs arrive together** (pre-assigned partners)
2. **Either partner provides last 4 digits of phone number**
3. **System retrieves both partners' information simultaneously**
4. **Staff confirms** the retrieved info matches the mentors present
5. **Success path:** Pair proceeds to matching queue
6. **Failure path:** Escalate to Tech Help Desk

---

## Key Interface Requirements

### Primary Input
- **Large phone number field** (last 4 digits only)
- Auto-search on typing (debounced)
- Clear/reset button
- Focus on input after each check-in

### Search Results Display
- Show both partners' information together
- Display fields:
  - Full names (both mentors)
  - Complete phone numbers (both)
  - Emails (both)
  - Already checked in? (status badge)
- Click result to select

### Confirmation View
- Large, clear display of mentor pair
- Side-by-side or stacked cards
- Visual confirmation: "Does this match the people in front of you?"
- **Primary action:** "Check In This Pair" (large button)
- **Secondary action:** "Wrong Pair - Go Back"

### Post Check-In
- Success message with mentor names
- Auto-clear and return to search after 2 seconds
- "Next Pair" button to skip auto-clear

### Error/Exception Handling
- "No matches found" state
- "Escalate to Tech Help" button (prominent)
- Notes field for exceptions (optional)
- Manual search by name fallback

---

## Similar Pattern in Current Codebase

`/mentors` page (src/app/mentors/page.tsx:108-143) implements similar phone search:
- Debounced search on input
- Command/Combobox component for results
- Phone-based lookup
- Check-in flow with dialog confirmation

**Key differences for Event Day:**
- Simpler UI (no table view needed)
- Focus on speed (check-in takes ~15 seconds)
- Pair verification (2 mentors, not 1)
- No training info needed
- Larger touch targets (mobile/tablet use)

---

## Database Operations

### Read Queries
**Table:** `mentors`
**Lookup by:** `phone` (last 4 digits match)
**Fields needed:**
- `mn_id` (both partners)
- `first_name`, `last_name` (both)
- `phone` (both)
- `personal_email` or `uga_email` (both)
- `partner_mn_id` (to retrieve partner)
- `event_checked_in` (status flag)

**Query pattern:**
```sql
-- Find mentor by last 4 of phone
SELECT * FROM mentors
WHERE phone LIKE '%' || :last4digits
AND status_category != 'dropped'

-- Then retrieve partner
SELECT * FROM mentors
WHERE mn_id = :partner_mn_id
```

### Write Operations
**Table:** `event_mentor_checkins` (new table needed)
**Fields:**
- `checkin_id` (uuid, pk)
- `mentor1_id` (fk � mentors.mn_id)
- `mentor2_id` (fk � mentors.mn_id)
- `checked_in_at` (timestamp)
- `checked_in_by` (staff identifier)
- `notes` (text, nullable)
- `created_at`, `updated_at`

**Also update:** `mentors.event_checked_in = true` for both partners

---

## UI/UX Specifications

### Layout
- **Full-screen, centered focus**
- No navigation needed (dedicated station)
- Large typography (readable from standing position)
- High contrast colors

### Components (Shadcn)
- `Command` / `CommandInput` for search
- `Card` for mentor pair display
- `Button` (large size)
- `Badge` for status indicators
- `Alert` for errors
- `Dialog` for confirmation

### States
1. **Ready** - Empty search, waiting for input
2. **Searching** - Loading spinner
3. **Results** - List of matching pairs
4. **Confirming** - Selected pair, awaiting confirmation
5. **Success** - Check-in complete
6. **Error** - No matches or system issue

### Accessibility
- Keyboard navigation (Tab, Enter)
- Screen reader support
- Touch-friendly (min 44x44px targets)
- Error announcements

---

## Edge Cases

1. **Multiple matches on last 4 digits**
   - Show all matches
   - Staff selects correct pair visually
   - Consider adding name hint in search

2. **Partner not found**
   - Show error: "Partner data missing"
   - Escalate to Tech Help

3. **Already checked in**
   - Show warning badge
   - Allow re-confirmation or undo
   - Track duplicate attempts

4. **Mentor without partner**
   - Flag as error
   - Cannot check in solo mentor
   - Escalate to assign emergency partner

5. **Dropped mentor attempting check-in**
   - Soft block with message
   - Allow override with Tech Help code

---

## Performance Considerations

- **Expected volume:** ~1,000 mentors = 500 pairs
- **Time window:** 60-90 minutes morning arrival
- **Peak rate:** ~10 pairs/minute
- **Response time:** < 500ms for search
- **Offline capability:** Not required (venue has WiFi)

---

## Staff Training Needs

- How to ask for "last 4 of phone"
- Visual confirmation process
- When to escalate to Tech Help
- How to handle "I forgot my phone" scenarios
- Reset/clear after check-in

---

## Testing Requirements

- Load test with 500 pair records
- Test last 4 digit collisions
- Test partner lookup failures
- Test check-in idempotency
- Mobile device compatibility
- Tablet orientation (landscape/portrait)

---

## Future Enhancements (Not MVP)

- QR code scan as alternative to phone input
- Photo display of mentors (from profile)
- Bulk check-in for groups
- Print confirmation receipts
- Analytics dashboard for check-in rate
