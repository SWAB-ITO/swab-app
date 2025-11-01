# SWAB Mentor Database - Dependency Documentation

Comprehensive documentation for all dependencies, tools, and services used in the SWAB Mentor Database application.

## Quick Links

- [Core Framework](#core-framework)
- [UI Components](#ui-components)
- [Cloud Services](#cloud-services)
- [API Integrations](#api-integrations)
- [MCP Servers](#mcp-servers-model-context-protocol)
- [Development Tools](#development-tools)

---

## Core Framework

### Next.js 16.0.0
**Modern React Framework for Production**

- **Documentation**: [Next.JS/nextjs.md](./Next.JS/nextjs.md)
- **Official Site**: https://nextjs.org
- **Version**: 16.0.0 (React 19.0.0)
- **Key Features**:
  - App Router with React Server Components
  - Turbopack for fast development
  - Built-in optimization (images, fonts, scripts)
  - API routes and server actions
  - Static and dynamic rendering

**Quick Start**:
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
```

---

## UI Components

### shadcn/ui 3.4.0
**Component Code Distribution Platform**

- **Documentation**: [Shadcn/shadcn-ui.md](./Shadcn/shadcn-ui.md)
- **Official Site**: https://ui.shadcn.com
- **Philosophy**: Not a library - you own the component code
- **Key Features**:
  - 60+ accessible components
  - Built on Radix UI primitives
  - Full TypeScript support
  - Themeable with CSS variables
  - Dark mode support
  - AI-ready component structure

**Quick Start**:
```bash
npx shadcn@latest add button        # Add a component
npx shadcn@latest add dialog        # Add another component
npx shadcn@latest diff               # Check for updates
```

**Installed Components**:
- Checkbox, Dialog, Dropdown Menu, Label
- Popover, Progress, Scroll Area, Select
- Separator, Slot, Tabs
- Plus: Lucide Icons, TanStack Table

### Supporting Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Merge Tailwind CSS classes
- **lucide-react**: Beautiful icon library

---

## Cloud Services

### Vercel
**Deployment & Hosting Platform**

#### Vercel CLI
- **Documentation**: [Vercel/vercel-cli.md](./Vercel/vercel-cli.md)
- **Official Docs**: https://vercel.com/docs/cli
- **Installation**: `npm i -g vercel`
- **Version**: 48.4.0+
- **Key Commands**:
  ```bash
  vercel login             # Authenticate
  vercel deploy            # Deploy to Vercel
  vercel dev               # Local development
  vercel logs              # View deployment logs
  ```

#### Vercel MCP Server
- **Documentation**: [Vercel/vercel-mcp.md](./Vercel/vercel-mcp.md)
- **Server URL**: https://mcp.vercel.com
- **Status**: Public Beta
- **Purpose**: AI tools integration for project management
- **Features**: Access logs, manage deployments, search docs

#### Vercel Analytics
- **Packages**: `@vercel/analytics`, `@vercel/speed-insights`
- **Purpose**: Real-time performance monitoring and Web Vitals tracking

### Supabase
**Open Source Firebase Alternative**

#### Supabase CLI
- **Documentation**: [Supabase/supabase-cli.md](./Supabase/supabase-cli.md)
- **Official Docs**: https://supabase.com/docs/guides/local-development
- **Installation**: `npm install supabase --save-dev` or `brew install supabase`
- **Key Commands**:
  ```bash
  supabase start           # Start local stack
  supabase stop            # Stop local stack
  supabase db reset        # Reset database
  supabase db push         # Apply migrations
  ```

#### Supabase MCP Server
- **Documentation**: [Supabase/supabase-mcp.md](./Supabase/supabase-mcp.md)
- **Server URL**: https://mcp.supabase.com/mcp
- **Status**: Generally Available
- **Purpose**: AI-assisted database management
- **⚠️ Important**: Development/testing only - never production data

#### Supabase SDK
- **Packages**: `@supabase/supabase-js`, `@supabase/ssr`
- **Purpose**: Database client, authentication, storage, real-time subscriptions

**Project Scripts**:
```bash
npm run db:start         # Start Supabase locally
npm run db:stop          # Stop Supabase
npm run db:reset         # Reset database
npm run db:migrate       # Apply migrations
npm run db:studio        # Open Supabase Studio
```

---

## API Integrations

### Jotform API
**Form Builder & Data Management**

- **Documentation**: [Jotform/jotform-api.md](./Jotform/jotform-api.md)
- **Official Docs**: https://api.jotform.com/docs/
- **Base URL**: https://api.jotform.com
- **Authentication**: API Key (header or query param)

**Key Features**:
- Form management (create, update, delete)
- Submission CRUD operations
- Webhook configuration
- Multiple SDKs (11 languages including Node.js)

**Available Endpoints**:
- User Management
- Forms (7 endpoints)
- Submissions (6 endpoints)
- Webhooks (4 endpoints)

**Project Scripts**:
```bash
npm run sync:jotform-signups          # Sync form signups
npm run sync:jotform-setup            # Sync setup forms
npm run sync:jotform-training-signup  # Sync training signups
npm run sync:partner-preference       # Sync partner preferences
```

### Givebutter API
**Fundraising Platform**

- **Documentation**: [Givebutter/givebutter-api.md](./Givebutter/givebutter-api.md)
- **Raw Schemas**: [Givebutter/Givebutter API Docs.md](./Givebutter/Givebutter%20API%20Docs.md)
- **Official Docs**: https://docs.givebutter.com/reference/reference-getting-started
- **Base URL**: https://api.givebutter.com/v1
- **Authentication**: Bearer token

**Key Features**:
- Campaign management (CRUD)
- Campaign members and teams
- Contact management (with archive/restore)
- Transaction tracking
- Pagination support

**Available Resources**:
- Campaigns (6 endpoints)
- Campaign Members (4 endpoints)
- Campaign Teams (2 endpoints)
- Contacts (7 endpoints)
- Transactions, Tickets, Payouts, Funds

**Project Scripts**:
```bash
npm run sync:givebutter-members    # Sync campaign members
npm run sync:givebutter-contacts   # Sync contacts
npm run gb:export                  # Export data
npm run gb:validate                # Validate export
```

---

## MCP Servers (Model Context Protocol)

### Overview
MCP servers enable AI tools (like Claude Code) to interact with external services through a standardized protocol.

**Configuration**: `.mcp.json` in project root

### Custom MCP Servers

#### Jotform MCP Server
- **Documentation**: [ac-mcp/README.md](./ac-mcp/README.md)
- **Tools**: 19 tools for forms, submissions, webhooks
- **Setup**: Docker-based, requires JOTFORM_API_KEY
- **Usage**: Integrated with Claude Code for form management

#### Givebutter MCP Server
- **Documentation**: [ac-mcp/README.md](./ac-mcp/README.md)
- **Tools**: 22 tools for campaigns, contacts, transactions
- **Setup**: Docker-based, requires GIVEBUTTER_API_KEY
- **Usage**: Integrated with Claude Code for fundraising management

**Project Scripts**:
```bash
npm run mcp:build              # Build MCP servers
npm run mcp:dev:jotform        # Run Jotform MCP in dev mode
npm run mcp:dev:givebutter     # Run Givebutter MCP in dev mode
```

**Docker Management**:
```bash
cd backend/mcp
docker-compose up -d           # Start MCP servers
docker-compose logs -f         # View logs
docker-compose restart         # Restart servers
docker-compose down            # Stop and remove
```

### Cloud MCP Servers

#### Vercel MCP
- **Type**: HTTP Transport
- **URL**: https://mcp.vercel.com
- **Auth**: OAuth
- **Features**: Deployment management, log access, docs search

#### Supabase MCP
- **Type**: HTTP Transport
- **URL**: https://mcp.supabase.com/mcp
- **Auth**: Dynamic client registration (browser-based)
- **Features**: Database management, schema design, query execution

#### shadcn MCP
- **Type**: Command-line
- **Command**: `npx shadcn@latest mcp`
- **Features**: Component search, documentation, examples

### MCP Configuration

**Located at**: `.mcp.json`

```json
{
  "mcpServers": {
    "shadcn": { /* Component discovery */ },
    "jotform": { /* Custom Docker server */ },
    "givebutter": { /* Custom Docker server */ },
    "vercel": { /* Cloud HTTP server */ },
    "supabase": { /* Cloud HTTP server */ }
  }
}
```

---

## Development Tools

### TypeScript 5
- **Configuration**: `tsconfig.json`, `tsconfig.backend.json`
- **Purpose**: Type safety for entire codebase

### Tailwind CSS 3.4.17
- **Configuration**: `tailwind.config.js`
- **Purpose**: Utility-first CSS framework
- **Plugins**: `tailwindcss-animate`

### tsx 4.19.2
- **Purpose**: Execute TypeScript files directly
- **Usage**: All backend scripts use tsx

### ESLint
- **Script**: `npm run lint`
- **Purpose**: Code quality and consistency

### Additional Tools

#### CSV Processing
- **Packages**: `csv-parse`, `csv-stringify`
- **Purpose**: Import/export data operations

#### Environment Variables
- **Package**: `dotenv`
- **Configuration**: `.env.local`, `.env`
- **Usage**: API keys, database URLs, feature flags

---

## Project Structure

```
swab-app/
├── .mcp.json                    # MCP server configuration
├── package.json                 # Dependencies and scripts
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── src/
│   ├── app/                     # Next.js App Router
│   ├── components/              # React components
│   │   └── ui/                  # shadcn/ui components
│   └── lib/                     # Utilities
├── backend/
│   ├── core/
│   │   ├── sync/               # Data sync scripts
│   │   └── etl/                # ETL processes
│   ├── features/               # Feature modules
│   ├── mcp/                    # MCP servers
│   │   ├── jotform/
│   │   ├── givebutter/
│   │   └── docker-compose.yml
│   └── scripts/                # Admin scripts
├── supabase/
│   ├── migrations/             # Database migrations
│   └── config.toml             # Supabase configuration
└── dep docs/                   # This documentation
    ├── README.md               # This file
    ├── ac-mcp/                 # MCP servers docs
    ├── Next.JS/                # Next.js docs
    ├── Shadcn/                 # shadcn/ui docs
    ├── Vercel/                 # Vercel docs
    ├── Supabase/               # Supabase docs
    ├── Jotform/                # Jotform API docs
    └── Givebutter/             # Givebutter API docs
```

---

## Common Workflows

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Supabase
npm run db:start

# 3. Start Next.js dev server
npm run dev

# 4. (Optional) Start MCP servers
cd backend/mcp
docker-compose up -d
```

### Data Synchronization

```bash
# Sync all data sources
npm run sync:all

# Sync specific sources
npm run sync:jotform-signups
npm run sync:givebutter-members
npm run sync:givebutter-contacts
```

### Database Management

```bash
# Reset database (careful!)
npm run db:reset

# Create new migration
npm run db:new-migration my_migration_name

# Apply migrations
npm run db:migrate

# Open Supabase Studio
npm run db:studio
```

### Building for Production

```bash
# Build application
npm run build

# Start production server
npm run start
```

---

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Jotform
JOTFORM_API_KEY=your_jotform_api_key

# Givebutter
GIVEBUTTER_API_KEY=your_givebutter_api_key

# Optional: Production credentials
PROD_SUPABASE_URL=prod_url
PROD_SUPABASE_SERVICE_ROLE_KEY=prod_key
```

**Note**: Never commit `.env` or `.env.local` files to version control.

---

## Version Summary

| Dependency | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.0 | React framework |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety |
| shadcn/ui | 3.4.0 | Component system |
| Supabase JS | 2.47.10 | Database client |
| Tailwind CSS | 3.4.17 | CSS framework |
| Vercel Analytics | 1.5.0 | Performance monitoring |
| Lucide React | 0.545.0 | Icon library |
| TanStack Table | 8.21.3 | Data tables |
| MCP SDK | 1.20.2 | Model Context Protocol |

---

## Getting Help

### Documentation
- Review specific dependency documentation in subdirectories
- Check official documentation links provided in each file
- Refer to inline code comments

### Common Issues
- **Build errors**: Clear `.next` and `node_modules`, reinstall
- **Database issues**: Reset with `npm run db:reset`
- **MCP connection issues**: Check Docker containers are running
- **Environment variables**: Ensure all required vars are set

### Support Channels
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs
- **shadcn/ui**: https://ui.shadcn.com/docs

---

## Maintenance

### Keep Dependencies Updated

```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all packages (carefully)
npm update
```

### Update shadcn/ui Components

```bash
# Check for component updates
npx shadcn@latest diff

# Update all components
npx shadcn@latest update
```

### Update Documentation

When adding new dependencies:
1. Create documentation in appropriate subdirectory
2. Update this README with links and quick reference
3. Update `.mcp.json` if MCP server is added
4. Document environment variables needed

---

## Contributing

When modifying dependencies:

1. **Document changes** in relevant documentation files
2. **Update package.json** version numbers in docs
3. **Test thoroughly** before committing
4. **Update this README** with new features or changes
5. **Note breaking changes** clearly

---

*Last Updated: November 2025*
