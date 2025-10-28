# Mentor Access Portal

**Route:** `/mentor` (public-facing, auth-gated)
**Users:** UGA student mentors (1,000 annually)
**Purpose:** Self-service portal for mentors to access their information and event details

---

## Status

**🚧 Not Yet Implemented** - This is a planned interface

---

## Purpose

The Mentor Access portal provides a **self-service interface** for mentors to:
1. View their personal information and fundraising progress
2. Access Event Day details and their assigned partner
3. Update contact information
4. Access training resources and event materials
5. Communicate with SWAB staff (future)

**Key Distinction from Exec Interface:**
- **Read-only** for most data (mentors cannot edit core data)
- **Limited write access** (can update phone, email, preferences)
- **No admin functions** (no sync, no global view, no override)
- **Public-facing** (requires authentication)

---

## Authentication & Access

### Login Methods
**Option 1: Email-based (Passwordless)**
- Enter UGA or personal email
- Receive magic link via email
- Click link to authenticate
- Session persists for 30 days

**Option 2: Phone-based (SMS)**
- Enter phone number (same as check-in)
- Receive SMS code
- Enter code to authenticate
- Session persists for 30 days

**Recommendation:** Email-based (more secure, less SMS cost)

### Supabase Auth Integration
- **Auth Channel:** `mentor` (separate from admin)
- **Row-Level Security (RLS):**
  - Mentors can only view/edit their own record
  - `WHERE mentor.uga_email = auth.user.email` or `phone = auth.user.phone`
- **Session management:** JWT tokens

### Registration/Onboarding
**First-time login:**
1. Mentor authenticates via email/phone
2. System matches to `mentors` table record
3. Create user account linked to mentor record
4. Set preferences (notifications, etc.)
5. Accept terms/policies
6. Access dashboard

---

## Key Features

### 1. Dashboard / Home Screen

**Welcome Section:**
- "Welcome back, [First Name]!"
- Event Day date countdown
- Quick status overview

**Status Cards:**
- **Fundraising Progress**
  - Amount raised: $X / $75 (goal)
  - Progress bar
  - Link to fundraising page
  - "Share your page" button

- **Partner Assignment**
  - Partner's name and contact (if assigned)
  - "Partner not assigned yet" (if not)
  - "Contact your partner" button

- **Training Status**
  - ✓ Training completed (date) OR
  - ⏱ Training not completed (sign up link)

- **Event Day Readiness**
  - Checklist of requirements:
    - ☐ Fundraising goal met ($75)
    - ☐ Training completed
    - ☐ Partner assigned
    - ☐ Contact info verified
  - "You're all set!" OR "X items remaining"

**Upcoming Events:**
- Training session dates (if not completed)
- Event Day date and time
- Calendar integration (add to Google Calendar, etc.)

---

### 2. My Profile

**Personal Information (Read-Only):**
- Full name
- UGA email (verified)
- Mentor ID (for reference)
- Registration date

**Contact Information (Editable):**
- Personal email (can update)
- Phone number (can update)
- Shirt size (can update)

**Preferences:**
- Notification preferences (email, SMS)
- Shift preference (if applicable)
- Dietary restrictions (for Event Day)

**Actions:**
- "Save Changes" button
- Confirmation message on save
- **API:** PATCH `/api/mentor/profile`

---

### 3. Fundraising

**Overview:**
- Current amount raised
- Goal: $75
- Progress visualization (progress bar, percentage)
- Donors list (name, amount, date) - from Givebutter
- Total donors count

**Fundraising Page:**
- Link to personal Givebutter page
- "Copy Link" button (easy sharing)
- QR code for in-person sharing
- Social media share buttons (Twitter, Facebook, Instagram)

**Resources:**
- Fundraising tips and templates
- Sample messages for outreach
- FAQs about fundraising

**Note:** If mentor doesn't have Givebutter page yet:
- Show "Set up your page" instructions
- Link to setup form (Jotform)
- Explain benefits of fundraising page

---

### 4. Partner & Event Day Info

**Partner Information:**
- Partner's name
- Partner's phone and email (for coordination)
- "Message Partner" button (opens email or SMS)
- Partner's fundraising status (optional, for motivation)

**If no partner assigned:**
- "Partner assignment coming soon"
- Expected assignment date
- Explanation of partner assignment process

**Event Day Details:**
- Date and time
- Location and parking instructions
- What to bring checklist:
  - ☐ Photo ID
  - ☐ SWAB t-shirt
  - ☐ Fully charged phone
  - ☐ Comfortable shoes
- Schedule overview:
  - Check-in time
  - Walmart shopping
  - Lunch
  - Activities
  - Departure time

**Event Day Map:**
- Campus map with key locations
- Parking instructions
- Check-in location highlighted

---

### 5. Training & Resources

**Training Completion:**
- ✓ "You completed training on [Date]"
- View training materials (slides, video)
- Certificate of completion (printable)

**OR**

- "Training required before Event Day"
- Available training sessions (dates/times)
- "Sign Up for Training" link → Jotform

**Resources Library:**
- Event Day guide (PDF)
- Mentor handbook
- Safety guidelines
- Child interaction best practices
- Emergency procedures
- FAQ document

**Videos:**
- Orientation video
- Event Day walkthrough
- Testimonials from past mentors

---

### 6. Communication (Future)

**Messages:**
- Inbox for messages from SWAB staff
- Announcements (broadcast to all mentors)
- Direct messages (mentor ↔ staff)

**Notifications:**
- Push notifications (if PWA)
- Email notifications
- SMS notifications (optional)

**Notification Types:**
- Training reminders
- Fundraising milestones
- Partner assignment
- Event Day reminders
- General announcements

---

## Database Integration

### Read Access
**From `mentors` table:**
- Personal info (name, email, phone, mn_id)
- Fundraising data (amount_raised, gb_contact_id, campaign_member)
- Training status (training_done, training_at)
- Partner (partner_mn_id)
- Status (status_category)

**From `raw_gb_campaign_members` (if needed):**
- Detailed fundraising data
- Donors list (via Givebutter API)

**From Event Day tables (closer to event):**
- Assigned check-in time (if applicable)
- Bus shift assignment (if applicable)

### Write Access
**To `mentors` table (limited fields):**
- `personal_email` (can update)
- `phone` (can update)
- `shirt_size` (can update)
- `mentor_preferences` (JSONB field for preferences)

**To `mentor_notifications` table (new):**
- Notification preferences
- Read/unread status

---

## API Routes

**Profile:**
- GET `/api/mentor/profile` - Get own profile
- PATCH `/api/mentor/profile` - Update editable fields

**Fundraising:**
- GET `/api/mentor/fundraising` - Get fundraising stats
- GET `/api/mentor/fundraising/donors` - Get donors list (from Givebutter)

**Partner:**
- GET `/api/mentor/partner` - Get partner info

**Training:**
- GET `/api/mentor/training` - Training status and resources

**Event:**
- GET `/api/mentor/event-info` - Event Day details

**Notifications (Future):**
- GET `/api/mentor/notifications` - Inbox
- PATCH `/api/mentor/notifications/:id` - Mark as read

---

## Security Considerations

### Row-Level Security (RLS)
**Enable RLS on `mentors` table:**
```sql
-- Mentors can only see their own record
CREATE POLICY mentor_view_own
ON mentors FOR SELECT
USING (auth.uid() = user_id OR uga_email = auth.email());

-- Mentors can only update specific fields
CREATE POLICY mentor_update_own
ON mentors FOR UPDATE
USING (auth.uid() = user_id OR uga_email = auth.email())
WITH CHECK (
  -- Only allow updating these fields
  personal_email IS NOT NULL AND
  phone IS NOT NULL AND
  shirt_size IS NOT NULL
);
```

### Data Privacy
- **Hide sensitive data:**
  - Don't show other mentors' personal info (except partner)
  - Don't show financial details beyond own fundraising
  - Don't show admin notes or internal tracking
- **Audit logging:** Track profile updates

---

## UI/UX Specifications

### Design
- **Mobile-first** (mentors primarily on phones)
- **Simple navigation** (bottom nav or tab bar)
- **Clean, friendly UI** (not corporate/admin)
- **SWAB branding** (colors, logo)

### Components (Shadcn)
- `Card` for info sections
- `Progress` for fundraising
- `Button` for actions
- `Badge` for status indicators
- `Avatar` for mentor/partner
- `Tabs` for navigation
- `Sheet` or `Dialog` for modals

### Color Scheme
- Match SWAB brand (primary colors)
- Green for completion/success
- Orange for pending/action needed
- Red for critical (e.g., fundraising deadline)

### Navigation
**Bottom Tab Bar (Mobile):**
1. Home (dashboard)
2. Profile
3. Fundraising
4. Partner
5. Resources

**Desktop:** Sidebar or top nav

---

## Notifications Strategy

### Email Notifications
- Welcome email on first login
- Fundraising milestone emails ($25, $50, $75 reached)
- Partner assignment notification
- Training reminders (1 week, 1 day before)
- Event Day reminder (1 week, 1 day before)

### SMS Notifications (Opt-In)
- Event Day morning: "Today's the day! See you at 8 AM"
- Last-minute changes or urgent updates

### In-App Notifications
- Badge count on notification icon
- Toast/banner for new messages
- Push notifications (if PWA)

---

## Onboarding Flow

**First-Time User Experience:**
1. **Landing page:** "Welcome to SWAB Mentor Portal"
2. **Login:** Enter email or phone
3. **Verify:** Magic link or SMS code
4. **Match account:** System links to mentor record
5. **Profile verification:** Confirm contact info
6. **Tour:** Quick walkthrough of portal features
7. **Dashboard:** Access full portal

**Returning Users:**
- Direct login → Dashboard

---

## Edge Cases

1. **Mentor not found in database**
   - Error: "We couldn't find your mentor record"
   - Instructions: Contact SWAB staff
   - Support email/phone displayed

2. **Multiple mentors with same email**
   - Disambiguation screen: "Which mentor are you?"
   - Show names and IDs
   - Select correct profile

3. **Dropped mentor accessing portal**
   - Show status: "Your participation status: Dropped"
   - Explanation and contact info
   - Option to appeal or inquire

4. **Partner assigned but partner also dropped**
   - Show: "Your partner is no longer participating"
   - Reassurance: "You'll be assigned a new partner soon"

5. **Accessing after Event Day**
   - Show: "Event Day complete! Thank you for participating"
   - Post-event survey
   - Option to join next year

---

## Testing Requirements

- Test auth flow (email magic link, SMS code)
- Test RLS policies (can only view own data)
- Test profile updates
- Test on mobile devices (iOS, Android)
- Test with 1,000 concurrent users
- Test notification delivery
- Accessibility testing

---

## Performance Considerations

- **Expected users:** 1,000 mentors
- **Peak traffic:** Week before Event Day
- **Response time:** < 500ms for profile load
- **Caching:** Profile data (5 min TTL)
- **Image optimization:** Compress resources
- **PWA:** Offline capability for resources

---

## Future Enhancements (Not MVP)

### Phase 2:
- **Mentor-to-mentor messaging** (chat with partner)
- **Photo gallery** (past Event Day photos)
- **Mentor directory** (opt-in, public profiles)
- **Referral system** (invite friends to become mentors)

### Phase 3:
- **Gamification** (fundraising leaderboard, badges)
- **Social feed** (mentor posts, updates)
- **Event Day live tracking** (parent tracking but for mentors)
- **Post-event feedback survey**

### Phase 4:
- **Mobile app** (native iOS/Android)
- **Mentor matching preferences** (request specific partners)
- **Scheduling** (pick training session time)
- **Multi-year history** (returning mentors see past years)

---

## Integration with Other Systems

### Receives from:
- **Mentor Database:** All mentor data, sync from Jotform/Givebutter

### Provides to:
- **Mentor Database:** Profile updates (phone, email changes)
- **Communications system:** Notification preferences

### External Dependencies:
- **Givebutter API:** Fundraising data and donors
- **Jotform:** Training signup (embed or link)
- **Email provider:** Notification emails (SendGrid, Mailgun, etc.)
- **SMS provider:** SMS notifications (Twilio)

---

## Success Metrics

**Engagement:**
- % mentors who login (target: 80%+)
- Average logins per mentor
- Time spent on portal

**Fundraising Impact:**
- Increase in funds raised (vs. previous year)
- % mentors reaching goal ($75)

**Self-Service:**
- % profile updates made by mentors (not staff)
- Reduction in support emails/calls

**Satisfaction:**
- User satisfaction survey (target: 4.5/5 stars)
- NPS score

---

## Launch Strategy

### Phase 1: MVP (Pre-Event Day)
- Dashboard with status overview
- Profile viewing and editing
- Fundraising progress display
- Partner info display
- Training status check
- Event Day info page

### Phase 2: Enhanced (Post-Event, Future Years)
- Communication features
- Notifications system
- Resource library expansion
- Mobile app

### Phase 3: Advanced (Year 2+)
- Gamification
- Social features
- Advanced analytics for mentors
- Integration with other campus systems

---

## Rollout Plan

1. **Soft launch:** Invite 50 mentors for beta testing
2. **Gather feedback:** Survey beta users
3. **Iterate:** Fix bugs, improve UX
4. **Full launch:** Email all mentors with login instructions
5. **Support:** Provide help documentation and support channel
6. **Monitor:** Track usage and errors
7. **Optimize:** Continuous improvement based on data

---

## Documentation Needs

### For Mentors:
- How to login (email/SMS)
- How to update profile
- How to share fundraising page
- How to contact partner
- FAQs

### For Developers:
- API documentation
- Database schema for mentor portal
- Auth flow implementation
- RLS policies
- Deployment guide

### For Staff:
- How to support mentors with login issues
- Common questions and answers
- Escalation procedures
