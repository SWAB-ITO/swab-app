# SWAB Mentor Database

**3-layer data pipeline for managing 545 mentors.**

```
APIs → Raw tables → ETL → Main tables → Export
```

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Start database
supabase start

# 3. Run pipeline
npm run sync    # Pull from APIs
npm run etl     # Process data

# 4. View
npm run dev     # http://localhost:3000
```

---

## Documentation

- **[docs/GUIDE.md](docs/GUIDE.md)** - How the system works
- **[docs/ISSUES.md](docs/ISSUES.md)** - Current data issues & fixes
- **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Adding new features

---

## Core Scripts

```bash
# Pipeline
npm run sync    # Pull from APIs → raw tables
npm run etl     # Process raw → main tables

# Database
npm run db:start    # Start Supabase
npm run db:stop     # Stop Supabase
npm run db:reset    # Reset database

# Admin
npm run admin:verify            # Check data
npm run admin:gb:consolidate   # Fix incomplete contacts
npm run admin:gb:clean-tags    # Clean tags
```

---

## Current State

```
Mentors: 545 unique
Status: 164 need setup, 28 need page, 356 need fundraising, 0 complete
Issues: 32 incomplete contacts, 126 missing IDs, 24 conflicts
```

See **[docs/ISSUES.md](docs/ISSUES.md)** for fixes.

---

## Architecture

```
LAYER 1: Raw (untouched API dumps)
  ↓ ETL
LAYER 2: Main (mentors table - single source of truth)
  ↓
LAYER 3: Extensions (tasks, texts, errors)
```

**Key:** Raw data is preserved. Main tables rebuild with `npm run etl`.

See **[docs/GUIDE.md](docs/GUIDE.md)** for details.

---

**Built for SWAB UGA** • 3-layer pipeline • 95k rows/sec
