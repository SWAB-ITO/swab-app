# 📁 Project Structure

**Clean, organized codebase - October 7, 2025**

---

## 🗂️ Directory Tree

```
mentor-database/
│
├── 📱 app/                           Next.js 15 frontend
│   ├── layout.tsx                   Root layout with metadata
│   └── page.tsx                     Dashboard homepage (545 mentors)
│
├── 🔧 lib/                           Backend business logic
│   │
│   ├── admin/                       ✅ Baseline infrastructure
│   │   ├── config/
│   │   │   └── supabase.ts         Single config source (local/cloud)
│   │   │
│   │   ├── utils/
│   │   │   └── supabase/           Next.js Supabase clients
│   │   │       ├── client.ts       Browser client
│   │   │       ├── server.ts       Server component client
│   │   │       └── middleware.ts   Middleware client
│   │   │
│   │   ├── pipeline/
│   │   │   ├── sync/               🔄 Layer 1: APIs → Raw tables
│   │   │   │   ├── all.ts          Run all 4 syncs in sequence
│   │   │   │   ├── jotform-signups.ts
│   │   │   │   ├── jotform-setup.ts
│   │   │   │   ├── givebutter-members.ts
│   │   │   │   └── givebutter-contacts.ts
│   │   │   │
│   │   │   └── etl/                🔄 Layer 2: Raw → Main tables
│   │   │       └── process.ts      Transform & deduplicate
│   │   │
│   │   ├── check-env.ts            Validate API keys & env setup
│   │   └── verify-data.ts          Verify database counts
│   │
│   ├── givebutter/                  🎨 Givebutter API operations
│   │   ├── consolidate-duplicates.ts    Fix incomplete contacts
│   │   └── clean-tags.ts                Update all tags to Mentors 2025
│   │
│   └── text-messages/               📱 Text messaging system
│       ├── export-contacts.ts       Generate Givebutter CSV export
│       └── validate-export.ts       Validate before import
│
├── 📚 docs/                          Documentation
│   ├── FINAL_RESTRUCTURE.md        🎯 Master implementation plan
│   ├── CODEBASE_AUDIT.md           Complete structural audit
│   ├── GUIDE.md                    How the system works
│   ├── ISSUES.md                   Data quality issues & fixes
│   ├── TEXT_CAMPAIGNS.md           Send text messages guide
│   └── CONTRIBUTING.md             Developer contribution guide
│
├── 🗄️ supabase/                     Database
│   └── migrations/
│       ├── 00001_three_layer_architecture.sql    Base schema
│       └── 00002_text_messaging_system.sql       (Will be replaced by 00003)
│
├── 📊 data/                          CSV exports
│   ├── givebutter-contacts-export.csv           Current contacts (47K rows)
│   ├── Full_Export_10.7.csv                     Latest with TEST F contact
│   └── givebutter-import-2025-10-07.csv         Generated (outdated)
│
├── 🎨 components/                    React components (empty - future use)
├── 📁 public/                        Static assets (Next.js convention)
│
├── ⚙️ Config Files
│   ├── package.json                 npm scripts & dependencies
│   ├── tsconfig.json                TypeScript configuration
│   ├── tailwind.config.ts           Tailwind CSS setup
│   ├── next.config.ts               Next.js configuration
│   └── README.md                    Project overview
│
└── .git/                             Git repository
```

---

## 🔄 Data Flow

```
┌─────────────────┐
│   Jotform API   │  ← Signup & Setup forms
└────────┬────────┘
         │
         ├─→ npm run sync:jotform-signups
         └─→ npm run sync:jotform-setup
                    │
                    ↓
         ┌──────────────────────┐
         │  mn_signups_raw      │
         │  funds_setup_raw     │  (Layer 1: Raw tables)
         └──────────┬───────────┘
                    │
┌─────────────────┐ │
│ Givebutter API  │ │
└────────┬────────┘ │
         │          │
         ├─→ npm run sync:givebutter-members
         └─→ npm run sync:givebutter-contacts
                    │
                    ↓
         ┌──────────────────────┐
         │  campaign_members_raw│
         │  full_contacts_raw   │  (Layer 1: Raw tables)
         └──────────┬───────────┘
                    │
                    │  npm run etl
                    ↓
         ┌──────────────────────┐
         │      mentors         │  (Layer 2: Main table)
         │      mn_tasks        │  (Layer 3: Extensions)
         │      mn_errors       │
         └──────────┬───────────┘
                    │
                    │  npm run text:export
                    ↓
         ┌──────────────────────┐
         │  CSV for Givebutter  │
         └──────────────────────┘
                    │
                    │  Manual import to Givebutter
                    ↓
         ┌──────────────────────┐
         │  Givebutter contacts │
         │  with custom fields  │
         └──────────────────────┘
                    │
                    │  Filter by status
                    ↓
         ┌──────────────────────┐
         │   Send SMS campaign  │  📱
         └──────────────────────┘
```

---

## 📦 npm Scripts

### **Data Pipeline**
```bash
npm run sync              # Pull from all APIs (Jotform + Givebutter)
npm run sync:jotform-signups
npm run sync:jotform-setup
npm run sync:givebutter-members
npm run sync:givebutter-contacts
npm run etl               # Transform raw → main tables
```

### **Text Messaging**
```bash
npm run text:export       # Export mentors to CSV
npm run text:validate     # Validate CSV before import
```

### **Database**
```bash
npm run db:start          # Start local Supabase
npm run db:stop           # Stop local Supabase
npm run db:reset          # Reset & re-run migrations
npm run db:migrate        # Apply new migrations
npm run db:studio         # Open Supabase Studio UI
```

### **Admin Tools**
```bash
npm run admin:check-env   # Validate API keys
npm run admin:verify      # Check database counts
npm run admin:gb:consolidate   # Fix incomplete contacts
npm run admin:gb:clean-tags    # Clean all tags
```

### **Development**
```bash
npm run dev               # Start Next.js dev server (local DB)
npm run dev:cloud         # Start with cloud DB
npm run build             # Build for production
npm run lint              # Run ESLint
```

---

## 🎯 Import Patterns

### **From Pipeline Scripts**
```typescript
import { getSupabaseConfig } from '../../config/supabase';
```

### **From Admin Scripts**
```typescript
import { getSupabaseConfig } from './config/supabase';
```

### **From Givebutter Scripts**
```typescript
import { getSupabaseConfig } from '../admin/config/supabase';
```

### **From Next.js App**
```typescript
import { createClient } from '@/lib/admin/utils/supabase/server';
```

---

## 📊 Database Schema (Current)

### **Layer 1: Raw Tables**
- `jotform_signups_raw` (560 rows)
- `jotform_setup_raw` (425 rows)
- `givebutter_members_raw` (484 rows)
- `givebutter_contacts_raw` (576 rows)

### **Layer 2: Main Table**
- `mentors` (548 unique)

### **Layer 3: Extensions**
- `mentor_tasks` (548 rows)
- `mentor_texts` (548 rows) - *Will be merged into mentors*
- `mentor_errors` (120 conflicts)

**Note:** Schema will be updated in migration 00003

---

## 🚀 Next Implementation: FINAL_RESTRUCTURE.md

1. Rename tables (mn_signups_raw, funds_setup_raw, etc.)
2. Simplify booleans (signup_done vs has_signed_up)
3. Merge mentor_texts into mentors table
4. Add emoji custom fields (📝🎨🗓️👥🏋️📈📱)
5. Implement smart duplicate merging
6. Update CSV export for new structure

---

**Clean, organized, ready to scale** ✨
