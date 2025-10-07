# Current Data Issues

**What's broken and how to fix it.**

---

## Current State

```
Mentors: 545 unique
├── With Givebutter contact: 419 (77%)
└── Without contact: 126 (23%)

Issues:
├── 32 incomplete contacts (fixable)
├── 126 missing contact IDs (need to create)
└── 24+ conflicts logged (manual review)

Status Breakdown:
├── Fully complete: 0
├── Needs fundraising: 356
├── Needs page creation: 28
└── Needs setup: 164
```

---

## Issue 1: Incomplete Mass Email Contacts (32)

**Problem:** Some mentors have incomplete Givebutter contacts from bulk UGA email imports.

**Characteristics:**
- Generic name: `"F.25.##### L.25.#####"`
- No phone number
- Mass email tags: `UGA Students`, `UGA.S.#`

**Two scenarios:**
- **Scenario A (22):** Mentor's only contact is incomplete
  - Fix: UPDATE with correct name/phone + set tags to `["Mentors 2025"]`
- **Scenario B (10):** Mentor has 2 contacts (one incomplete, one complete)
  - Fix: DELETE incomplete + UPDATE complete tags to `["Mentors 2025"]`

**How to fix:**
```bash
npm run admin:gb:consolidate        # Preview
npm run admin:gb:consolidate apply  # Apply
```

---

## Issue 2: Missing Contact IDs (126)

**Problem:** 126 mentors don't have Givebutter contact IDs.

**Why:**
- New mentors not yet in Givebutter
- Email/phone mismatch
- Contact created with different identifier

**Options:**
1. Create via API (need to build script)
2. Wait for fundraising (auto-creates)
3. Manual matching in Givebutter UI

---

## Issue 3: Data Conflicts (24+)

**Problem:** Conflicts logged in `mentor_errors` table.

**Common types:**
- Multiple Givebutter contacts for same email
- Missing required fields
- Data mismatches

**How to review:**
```bash
npm run db:start
# Visit http://127.0.0.1:54323
# Query mentor_errors table
```

---

## Tag Cleanup

**Tags to remove:**
- `Mentors 2024`, `High Engagement 2024`, `Internal 2024` (old year)
- `UGA Students`, `UGA.S.#`, `UGA F2025` (mass email)

**Correct tags:**
- `Mentors 2025` - ALL current mentors should have ONLY this

**How to fix:**
```bash
npm run admin:gb:clean-tags        # Preview
npm run admin:gb:clean-tags apply  # Apply
```

---

## Full Cleanup Workflow

```bash
# 1. Pull latest
npm run sync
npm run etl

# 2. Fix incomplete contacts
npm run admin:gb:consolidate
npm run admin:gb:consolidate apply

# 3. Clean tags
npm run admin:gb:clean-tags
npm run admin:gb:clean-tags apply

# 4. Re-sync
npm run sync:givebutter-contacts
npm run etl
npm run admin:verify
```

---

For how the system works, see **[GUIDE.md](GUIDE.md)**.
