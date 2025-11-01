# Supabase CLI

Official documentation for the Supabase Command Line Interface.

## Overview

The Supabase CLI enables developers to run the entire Supabase stack locally on your machine or in a CI environment. It provides a command-line interface for local development, testing, database migrations, and deployment workflows.

## Official Resources

- **Getting Started Guide**: https://supabase.com/docs/guides/local-development/cli/getting-started
- **CLI Reference**: https://supabase.com/docs/reference/cli/install
- **npm Package**: https://www.npmjs.com/package/supabase
- **GitHub Repository**: https://github.com/supabase/cli
- **Local Development Docs**: https://supabase.com/docs/guides/local-development

## Installation

### Node.js/npm

Run commands without installation:

```bash
npx supabase [command]
# or with Bun
bunx supabase [command]
```

Install as dev dependency:

```bash
npm install supabase --save-dev
```

### macOS

```bash
brew install supabase/tap/supabase
```

### Windows

Using Scoop:

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Linux

- Via Homebrew (Linux compatible)
- Download `.apk`, `.deb`, or `.rpm` packages from GitHub releases

## Prerequisites

The CLI uses Docker containers to manage services. Requires one of:
- Docker Desktop
- Rancher Desktop
- Podman
- OrbStack
- colima

## Getting Started

### Initialize Local Project

```bash
supabase init
```

Creates a `supabase` folder with local project structure (safe for version control).

### Start Local Development Stack

```bash
supabase start
```

Launches Supabase services. Initial run downloads Docker images.

### Stop Services

```bash
supabase stop
```

Halts the stack while preserving local database state.

## Local Development Environment

Once running, access:

- **Studio** (Graphical Interface): http://localhost:54323
- **API Gateway** (REST/GraphQL): http://localhost:54321
- **PostgreSQL**: Direct database access via psql or database clients

## Key Features

- Complete Supabase toolset locally
- Database migrations and schema management
- Local testing before cloud deployment
- CI/CD workflow integration
- Development utilities (SMTP server, database diff tool)
- Edge function deployment
- Type generation from database schema
- PostgreSQL backups

## Updates

Update using the same method as installation:

```bash
# Homebrew
brew upgrade supabase

# npm
npm update supabase
```

## Common Commands

```bash
# Initialize project
supabase init

# Start local stack
supabase start

# Stop local stack
supabase stop

# Link to remote project
supabase link --project-ref YOUR_PROJECT_REF

# Create migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database
supabase db reset

# Generate types
supabase gen types typescript

# Deploy edge functions
supabase functions deploy
```

## Use Cases

- Run Supabase stack locally for development
- Test database migrations before production
- Generate TypeScript types from schema
- Manage edge functions
- Set up CI/CD pipelines
- Create and manage database backups
- Local testing of authentication flows
- Schema diffing and version control

## Notes

- Requires Docker or compatible container runtime
- Creates `supabase` folder for configuration (version control safe)
- Includes SMTP server for local email testing
- Supports local and cloud deployment workflows
- Integrates with Supabase Platform for production deploys
