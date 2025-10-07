# SWAB Mentor Database

**Production Next.js + Supabase app for managing SWAB mentor signups, fundraising, and communications.**

## 🏗️ Modern Architecture

```
┌─────────────────────────────────┐
│   Next.js Frontend (Vercel)     │
│   - Admin dashboard             │
│   - Mentor status view          │
│   - Data sync controls          │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│   Supabase (PostgreSQL)         │
│   - Normalized source tables    │
│   - Unified mentors view        │
│   - Auto-generated REST API     │
└────────────┬────────────────────┘
             │
    Managed via Supabase CLI
    (Git-based migrations)
```

## 🎯 Discovery-First Workflow

**IMPORTANT:** Run discovery scripts FIRST before finalizing schema!

This project uses a **discovery-first approach**:
1. Run discovery scripts to see actual API field structures
2. Map fields to database schema based on real data
3. Build schema with correct field names
4. Deploy and sync

This prevents the "guess-and-fix" cycle.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ & npm
- Supabase CLI (`brew install supabase/tap/supabase`)
- API Keys: Jotform, Givebutter

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy template
cp .env.local.example .env.local

# Edit .env.local with your credentials
# (Supabase values will be auto-filled by Vercel integration)
```

### 3. Deploy to Vercel + Supabase

#### Option A: Vercel Marketplace (Recommended)

1. Push this repo to GitHub
2. Go to Vercel → New Project
3. Import your repo
4. In "Integrations", add **Supabase** from marketplace
5. This auto-creates Supabase project and sets environment variables
6. Deploy!

#### Option B: Local Development First

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local Supabase
supabase init
supabase start

# This gives you local database URL and keys
# Add them to .env.local
```

### 4. **DISCOVERY PHASE** - Understand API Structure

```bash
# Explore Jotform data structure
npm run discover:jotform

# Explore Givebutter data structure
npm run discover:givebutter
```

**Review the output carefully!** This shows:
- Actual field names from APIs
- Data types and structures
- Suggested database mappings

### 5. Build/Update Database Schema

Based on discovery output, update:
```
supabase/migrations/00001_initial_schema.sql
```

Then apply:
```bash
# Local
supabase db reset

# Production (via Supabase dashboard or CLI)
supabase db push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
mentor-database/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── dashboard/               # Mentor dashboard (TODO)
│   ├── sync/                    # Data sync interface (TODO)
│   └── settings/                # Configuration (TODO)
│
├── components/                   # React components
│
├── lib/
│   ├── utils/
│   │   └── supabase/            # Supabase clients
│   │       ├── client.ts        # Browser client
│   │       ├── server.ts        # Server client
│   │       └── middleware.ts    # Auth middleware
│   │
│   └── scripts/                 # Discovery & sync scripts
│       ├── discover-jotform.ts  # Explore Jotform API
│       ├── discover-givebutter.ts # Explore Givebutter API
│       └── sync-all.ts          # Sync all sources (TODO)
│
├── supabase/
│   └── migrations/              # Database schema (version controlled)
│       └── 00001_initial_schema.sql
│
├── .env.local.example           # Environment template
├── package.json
└── README.md                    # This file
```

---

## 🗄️ Database Architecture

### Source Tables (One per API)

- **`jotform_signups`** - Mentor signup submissions
- **`jotform_setup`** - Givebutter setup form submissions
- **`givebutter_members`** - Campaign members from Givebutter
- **`givebutter_contacts`** - Contact IDs for API updates

### The Unified View: `mentors`

**THE single source of truth.** Joins all source tables with:
- Multi-email matching (UGA + personal + phone fallback)
- Auto-computed status categories (4 groups for texting)
- Auto-generated text instructions
- All fundraising data in one queryable view

### Utility Tables

- **`sync_queue`** - Pending Givebutter contact updates
- **`error_log`** - Data conflicts requiring manual review
- **`sync_history`** - Audit trail of sync operations

---

## 🔄 Development Workflow

### Adding New API Fields

1. Run discovery script to see new fields
2. Create new migration:
   ```bash
   supabase migration new add_new_fields
   ```
3. Edit the migration file
4. Apply locally: `supabase db reset`
5. Test with real data
6. Push to production: `supabase db push`

### Database Changes

```bash
# Create new migration
supabase migration new description_of_change

# Apply locally
supabase db reset

# Generate diff (see what changed)
supabase db diff

# Push to production
supabase db push
```

### Running Sync Scripts

```bash
# Discover API structure (run first!)
npm run discover:jotform
npm run discover:givebutter

# Sync all data (once scripts are built)
npm run sync:all
```

---

## 🎨 Building the Frontend

### Mentor Dashboard (TODO)

Query the `mentors` view from Supabase:

```typescript
import { createClient } from '@/lib/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: mentors } = await supabase
    .from('mentors')
    .select('*')
    .order('signup_date', { ascending: false })

  return <MentorTable mentors={mentors} />
}
```

### Status Categories

Mentors are auto-categorized:

| Category | Criteria | Text Message |
|---------|----------|--------------|
| `needs_setup` | Signed up only | "Look for Next Steps email..." |
| `needs_page_creation` | Both forms but not member | "Use this link to create page..." |
| `needs_fundraising` | Member but < $75 | "Work on fundraising your $75..." |
| `fully_complete` | Member + $75+ raised | "You are all set!" |

---

## 🚢 Deployment

### Vercel + Supabase Integration

1. Push to GitHub
2. Vercel → New Project → Import repo
3. Add Supabase integration (auto-configures env vars)
4. Deploy!

Environment variables are automatically set by Vercel when using Supabase marketplace integration.

### Manual Supabase Setup

If not using Vercel marketplace:

1. Create Supabase project at supabase.com
2. Get credentials from Settings → API
3. Add to Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 Mentor Status Flow

```
1. Signup (Jotform) → has_signed_up = true
   ↓
2. Setup Form (Jotform) → has_completed_setup = true
   ↓
3. Create Givebutter Page → is_campaign_member = true
   ↓
4. Fundraise $75+ → fully_fundraised = true
```

Each step updates the mentor's `status_category` and `text_instructions` automatically via the database view.

---

## 🛠️ Troubleshooting

### "Supabase CLI not found"
```bash
brew install supabase/tap/supabase
```

### "Discovery script fails"
- Check API keys in `.env.local`
- Verify form IDs and campaign IDs are correct
- Check API rate limits

### "Database migration fails"
- Check SQL syntax in migration file
- Ensure no duplicate table/column names
- Run `supabase db reset --debug` for details

### "Next.js build errors"
```bash
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📚 Next Steps

- [ ] Run discovery scripts to map actual API fields
- [ ] Finalize database schema based on discovered fields
- [ ] Build dashboard UI to view mentors
- [ ] Build sync interface to pull data from APIs
- [ ] Add authentication (Supabase Auth)
- [ ] Build CSV export for text messaging
- [ ] Set up automated syncs (cron or Vercel cron)

---

**Built with modern best practices for SWAB UGA** 🏗️

*Git-based migrations • Type-safe APIs • Production-ready deployment*
