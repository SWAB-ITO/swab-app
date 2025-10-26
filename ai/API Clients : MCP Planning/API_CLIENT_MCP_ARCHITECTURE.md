# API Client & MCP Server Architecture

## Executive Summary

This document outlines the architecture for building production-ready API clients and MCP (Model Context Protocol) servers for Jotform and Givebutter integrations.

### Project Goals

**API Clients:**
- Production-quality clients used **everywhere** in the codebase
- Replace all direct API calls with these consistent clients
- Provide type-safe, validated operations for syncing, checking, and verifying data
- Built for reliability with retry logic, rate limiting, and comprehensive error handling

**MCP Servers:**
- Expose **ALL** API operations as interactive tools for Claude Code
- Enable real-time checks, verification, and operations (e.g., archive mentors, check numbers)
- Docker-hosted for simple deployment and management
- Direct 1:1 mapping of API operations to MCP tools

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [API Architecture Patterns](#api-architecture-patterns)
3. [MCP Server Architecture](#mcp-server-architecture)
4. [Proposed Structure](#proposed-structure)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Best Practices Summary](#best-practices-summary)

---

## Current State Analysis

### Existing Implementation Strengths

#### 1. **HttpClient Base Class** (`backend/lib/infrastructure/clients/http-client.ts`)
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting (requests per second)
- ✅ Timeout handling with AbortController
- ✅ Consistent error handling
- ✅ Logging integration
- ✅ Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)

#### 2. **JotformClient** (`backend/lib/infrastructure/clients/jotform-client.ts`)
- ✅ Extends HttpClient with Jotform-specific methods
- ✅ Automatic response unwrapping (extracts `.content` from Jotform responses)
- ✅ Comprehensive endpoint coverage (forms, submissions, questions, properties)
- ✅ Pagination support with `getAllFormSubmissions()`
- ✅ TypeScript interfaces for all major types
- ✅ API key verification

#### 3. **GivebutterClient** (`backend/lib/infrastructure/clients/givebutter-client.ts`)
- ✅ Extends HttpClient with Givebutter-specific methods
- ✅ Automatic pagination for campaigns, members, contacts, transactions
- ✅ Support for filters and query parameters
- ✅ TypeScript interfaces for all resources
- ✅ Contact archiving capability

#### 4. **BaseProcessor Pattern** (`backend/lib/infrastructure/processors/base-processor.ts`)
- ✅ Abstract base class for data processors
- ✅ Metrics tracking (processed, failed, skipped)
- ✅ Error handling and logging
- ✅ Dry run mode support
- ✅ Consistent interface for transform/validate/process

### Gaps & Opportunities

#### API Clients - Missing Endpoints

**Givebutter (9 missing endpoints):**
- ❌ `createCampaign()` - POST /campaigns
- ❌ `updateCampaign()` - PATCH /campaigns/{id}
- ❌ `deleteCampaign()` - DELETE /campaigns/{id}
- ❌ `deleteMember()` - DELETE /members/{id}
- ❌ `getTeams()` - GET /teams
- ❌ `getTeam()` - GET /teams/{id}
- ❌ `createContact()` - POST /contacts
- ❌ `updateContact()` - PATCH /contacts/{id}
- ❌ `restoreContact()` - PATCH /contacts/{id}/restore

**Jotform (8 missing endpoints):**
- ❌ `createForm()` - POST /user/forms
- ❌ `updateForm()` - POST /form/{id}/properties
- ❌ `deleteForm()` - DELETE /form/{id}
- ❌ `createSubmission()` - POST /form/{id}/submissions
- ❌ `updateSubmission()` - POST /submission/{id}
- ❌ `deleteSubmission()` - DELETE /submission/{id}
- ❌ `createWebhook()` - POST /form/{id}/webhooks
- ❌ `deleteWebhook()` - DELETE /form/{id}/webhooks/{webhookId}

**Other Needs:**
- ❌ **No runtime validation** - Need Zod schemas
- ❌ **Missing PATCH method** in HttpClient

#### MCP Servers
- ❌ **Don't exist yet** - Need to build both servers
- ❌ **Docker deployment** - Need Dockerfile and docker-compose setup
- ❌ **All operations as tools** - Every API method exposed as MCP tool

---

## API Architecture Patterns

### Core Design Principles

#### 1. **Type Safety First**
```typescript
// Generic response wrapper
export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp?: string;
  };
}

// Reusable pagination
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}
```

#### 2. **Runtime Validation with Zod**
```typescript
import { z } from 'zod';

// Define schemas for validation
const JotformSubmissionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  answers: z.record(z.any()),
  status: z.string().optional(),
});

// Validate at runtime
const validated = JotformSubmissionSchema.parse(rawData);
```

#### 3. **Modular Domain Organization**
```
backend/lib/infrastructure/clients/
├── base/
│   ├── http-client.ts          # Base HTTP functionality
│   ├── paginated-client.ts     # Pagination helpers
│   └── cached-client.ts        # Caching layer
├── jotform/
│   ├── jotform-client.ts       # Main client
│   ├── schemas.ts              # Zod validation schemas
│   ├── types.ts                # TypeScript types
│   └── endpoints/
│       ├── forms.ts            # Form operations
│       ├── submissions.ts      # Submission operations
│       ├── webhooks.ts         # Webhook operations
│       └── users.ts            # User operations
└── givebutter/
    ├── givebutter-client.ts    # Main client
    ├── schemas.ts              # Zod validation schemas
    ├── types.ts                # TypeScript types
    └── endpoints/
        ├── campaigns.ts        # Campaign operations
        ├── contacts.ts         # Contact operations
        ├── transactions.ts     # Transaction operations
        └── members.ts          # Member operations
```

#### 4. **Error Handling Strategy**
```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public context?: Record<string, any>,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Usage
throw new ApiError(
  'Failed to fetch submissions',
  response.status,
  { formId, attempt: 3 },
  response.status >= 500 // Retryable for 5xx errors
);
```

#### 5. **Consistent Method Naming**
```typescript
// Naming convention:
// - get{Resource}         -> single resource by ID
// - get{Resources}        -> paginated list
// - getAll{Resources}     -> all resources with auto-pagination
// - create{Resource}      -> create single
// - update{Resource}      -> update single
// - delete{Resource}      -> delete single
// - archive{Resource}     -> soft delete

class ExampleClient {
  async getForm(id: string): Promise<Form> { }
  async getForms(page?: number): Promise<PaginatedResponse<Form>> { }
  async getAllForms(): Promise<Form[]> { }
  async createForm(data: CreateFormInput): Promise<Form> { }
  async updateForm(id: string, data: UpdateFormInput): Promise<Form> { }
  async deleteForm(id: string): Promise<void> { }
}
```

---

## MCP Server Architecture

### MCP Core Concepts

#### The Three Primitives

**1. Resources (Application-controlled)**
- READ-ONLY data sources (similar to GET endpoints)
- Examples: forms list, campaign members, contact records
- No side effects, no computation
- Cached and optimized for repeated access

**2. Tools (Model-controlled)**
- ACTIONS the AI can invoke (similar to POST/PUT/DELETE)
- Examples: create submission, update contact, archive member
- Can have side effects
- Require careful permission management

**3. Prompts (User-controlled)**
- Reusable prompt templates
- Examples: "Analyze form responses", "Generate fundraising report"
- Help guide complex multi-step tasks

### MCP Best Practices

#### Single Responsibility Principle
```
✅ GOOD: jotform-mcp-server (handles all Jotform operations)
✅ GOOD: givebutter-mcp-server (handles all Givebutter operations)

❌ BAD: forms-crm-mcp-server (mixes multiple platforms)
```

#### Defense in Depth Security
1. **Network Isolation** - MCP server runs in isolated process
2. **Authentication** - API keys stored in environment variables
3. **Authorization** - Tool-level permissions (read vs write)
4. **Input Validation** - Zod schemas for all inputs
5. **Output Sanitization** - Remove sensitive data before returning

#### Structured Tool Design
```typescript
// ❌ AVOID: Generic CRUD operations
{
  name: "update_record",
  description: "Update any record",
  parameters: { table: "string", id: "string", data: "object" }
}

// ✅ PREFER: Domain-specific operations
{
  name: "update_contact_tags",
  description: "Add or remove tags from a Givebutter contact",
  parameters: {
    contactId: "number",
    tagsToAdd: "string[]",
    tagsToRemove: "string[]"
  }
}
```

### MCP Server Structure

```
backend/mcp/
├── jotform/
│   ├── server.ts              # Main MCP server
│   ├── tools/
│   │   ├── forms.ts           # Form-related tools
│   │   ├── submissions.ts     # Submission tools
│   │   └── webhooks.ts        # Webhook tools
│   ├── resources/
│   │   ├── forms.ts           # Form resources
│   │   └── submissions.ts     # Submission resources
│   ├── prompts/
│   │   ├── analyze-responses.ts
│   │   └── export-data.ts
│   └── schemas/
│       └── tool-schemas.ts    # Zod schemas for tool inputs
└── givebutter/
    ├── server.ts              # Main MCP server
    ├── tools/
    │   ├── contacts.ts        # Contact tools
    │   ├── campaigns.ts       # Campaign tools
    │   └── members.ts         # Member tools
    ├── resources/
    │   ├── contacts.ts        # Contact resources
    │   ├── campaigns.ts       # Campaign resources
    │   └── transactions.ts    # Transaction resources
    ├── prompts/
    │   ├── fundraising-report.ts
    │   └── donor-analysis.ts
    └── schemas/
        └── tool-schemas.ts    # Zod schemas for tool inputs
```

### Example MCP Server Implementation

```typescript
// backend/mcp/jotform/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JotformClient } from "../../lib/infrastructure/clients/jotform-client.js";
import { Logger } from "../../lib/utils/logger.js";

const logger = new Logger('JotformMCP');
const client = new JotformClient({
  apiKey: process.env.JOTFORM_API_KEY!,
  logger,
});

// Create MCP server
const server = new Server(
  {
    name: "jotform-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// LIST RESOURCES
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "jotform://forms",
        name: "All Forms",
        description: "List all Jotform forms",
        mimeType: "application/json",
      },
      {
        uri: "jotform://form/{formId}/submissions",
        name: "Form Submissions",
        description: "Get submissions for a specific form",
        mimeType: "application/json",
      },
    ],
  };
});

// READ RESOURCE
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "jotform://forms") {
    const forms = await client.getForms();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(forms, null, 2),
        },
      ],
    };
  }

  // Handle dynamic URIs like jotform://form/123/submissions
  const submissionsMatch = uri.match(/^jotform:\/\/form\/([^/]+)\/submissions$/);
  if (submissionsMatch) {
    const formId = submissionsMatch[1];
    const submissions = await client.getAllFormSubmissions(formId);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(submissions, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// LIST TOOLS
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_form_questions",
        description: "Get all questions for a specific form",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "search_submissions",
        description: "Search form submissions with filters",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The form ID to search",
            },
            filter: {
              type: "object",
              description: "Filter criteria (e.g., {status: 'ACTIVE'})",
            },
          },
          required: ["formId"],
        },
      },
    ],
  };
});

// CALL TOOL
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_form_questions") {
    const questions = await client.getFormQuestions(args.formId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(questions, null, 2),
        },
      ],
    };
  }

  if (name === "search_submissions") {
    const submissions = await client.getFormSubmissions(args.formId, {
      filter: args.filter,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(submissions, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Jotform MCP server started");
}

main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
```

---

## Proposed Structure

### Directory Organization

```
mentor-database/
├── backend/
│   ├── lib/
│   │   └── infrastructure/
│   │       └── clients/
│   │           ├── base/
│   │           │   ├── http-client.ts           # Existing (enhanced)
│   │           │   ├── paginated-client.ts      # NEW - Pagination helpers
│   │           │   └── cached-client.ts         # NEW - Caching layer
│   │           ├── jotform/
│   │           │   ├── jotform-client.ts        # Existing (enhanced)
│   │           │   ├── schemas.ts               # NEW - Zod schemas
│   │           │   ├── types.ts                 # Existing (refactored)
│   │           │   └── endpoints/               # NEW - Organized endpoints
│   │           │       ├── forms.ts
│   │           │       ├── submissions.ts
│   │           │       ├── webhooks.ts
│   │           │       └── users.ts
│   │           └── givebutter/
│   │               ├── givebutter-client.ts     # Existing (enhanced)
│   │               ├── schemas.ts               # NEW - Zod schemas
│   │               ├── types.ts                 # Existing (refactored)
│   │               └── endpoints/               # NEW - Organized endpoints
│   │                   ├── campaigns.ts
│   │                   ├── contacts.ts
│   │                   ├── transactions.ts
│   │                   └── members.ts
│   └── mcp/                                     # NEW - MCP servers
│       ├── shared/
│       │   ├── base-server.ts                   # Base MCP server utilities
│       │   └── health-check.ts                  # Health monitoring
│       ├── jotform/
│       │   ├── server.ts                        # Main server
│       │   ├── tools/
│       │   ├── resources/
│       │   ├── prompts/
│       │   └── schemas/
│       └── givebutter/
│           ├── server.ts                        # Main server
│           ├── tools/
│           ├── resources/
│           ├── prompts/
│           └── schemas/
└── package.json                                  # Updated with MCP SDK
```

### MCP Server Docker Deployment

**Architecture:**
- Each MCP server runs in its own Docker container
- Containers communicate via stdio (standard input/output)
- Claude Code connects to containers via `docker exec -i`
- Environment variables stored in `.env` file
- Simple restart with `docker-compose restart`

**Docker Structure:**
```
backend/mcp/
├── Dockerfile                    # Builds both MCP servers
├── docker-compose.yml            # Orchestrates containers
├── .env                          # API keys (gitignored)
├── jotform/
│   └── server.ts                 # Jotform MCP server
└── givebutter/
    └── server.ts                 # Givebutter MCP server
```

**Benefits:**
- Isolated processes (one crash doesn't affect the other)
- Easy deployment (`docker-compose up -d`)
- Simple configuration (environment variables)
- Works on any platform (Mac, Linux, Windows)
- Can host remotely if needed

### API Client Enhancement Plan

#### 1. **Add Zod Validation**
```typescript
// backend/lib/infrastructure/clients/jotform/schemas.ts
import { z } from 'zod';

export const JotformAnswerSchema = z.object({
  name: z.string().optional(),
  text: z.string().optional(),
  type: z.string().optional(),
  answer: z.any(),
});

export const JotformSubmissionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  answers: z.record(JotformAnswerSchema),
  status: z.string().optional(),
  new: z.string().optional(),
  flag: z.string().optional(),
  notes: z.string().optional(),
  ip: z.string().optional(),
});

export const JotformFormSchema = z.object({
  id: z.string(),
  username: z.string(),
  title: z.string(),
  status: z.enum(['ENABLED', 'DISABLED', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string().optional(),
  count: z.string(),
  url: z.string().url(),
});
```

#### 2. **Add Missing Endpoints**

**Jotform Additions:**
- `createForm()` - Create new form
- `updateFormProperties()` - Update form settings
- `deleteForm()` - Delete form
- `createWebhook()` - Set up webhooks
- `deleteWebhook()` - Remove webhooks
- `createSubmission()` - Submit form programmatically
- `updateSubmission()` - Update existing submission
- `deleteSubmission()` - Delete submission

**Givebutter Additions:**
- `createContact()` - Create new contact
- `updateContact()` - Update contact details
- `restoreContact()` - Restore archived contact
- `createCampaign()` - Create new campaign
- `updateCampaign()` - Update campaign settings
- `createTransaction()` - Record transaction
- `getFunds()` - Get all funds
- `getPayouts()` - Get payout history

#### 3. **Add Caching Layer**
```typescript
// backend/lib/infrastructure/clients/base/cached-client.ts
import { HttpClient } from './http-client';

export interface CacheOptions {
  ttl: number; // milliseconds
  enabled: boolean;
}

export class CachedClient extends HttpClient {
  private cache: Map<string, { data: any; expires: number }> = new Map();

  async get<T>(endpoint: string, options = {}): Promise<T> {
    const cacheKey = `${endpoint}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached.data;
    }

    const data = await super.get<T>(endpoint, options);

    // Cache for 5 minutes by default
    this.cache.set(cacheKey, {
      data,
      expires: Date.now() + (options.cacheTtl || 300000),
    });

    return data;
  }

  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### 4. **Enhanced Error Handling**
```typescript
// backend/lib/infrastructure/clients/base/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public context?: Record<string, any>,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      context: this.context,
      retryable: this.retryable,
    };
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    public retryAfter: number // seconds
  ) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter}s`,
      429,
      '',
      { retryAfter },
      true
    );
    this.name = 'RateLimitError';
  }
}
```

---

## Implementation Roadmap

### Week 1: Complete API Clients

**Goal:** All 17 missing endpoints implemented and tested

#### Days 1-2: Givebutter Client (9 endpoints)
- [ ] Add PATCH method to HttpClient base class
- [ ] Add `createCampaign()`, `updateCampaign()`, `deleteCampaign()`
- [ ] Add `deleteMember()`
- [ ] Add `getTeams()`, `getTeam()` + GivebutterTeam interface
- [ ] Add `createContact()`, `updateContact()`, `restoreContact()`
- [ ] Test all new endpoints with integration tests

#### Days 3-4: Jotform Client (8 endpoints)
- [ ] Add `createForm()`, `updateForm()`, `deleteForm()`
- [ ] Add `createSubmission()`, `updateSubmission()`, `deleteSubmission()`
- [ ] Add `createWebhook()`, `deleteWebhook()`
- [ ] Test all new endpoints with integration tests

#### Day 5: Add Zod Validation
- [ ] Install Zod package
- [ ] Create schema files for both APIs
- [ ] Add validation to critical methods
- [ ] Test schema validation

### Week 2: Build MCP Servers

**Goal:** Docker-hosted MCP servers with ALL operations exposed as tools

#### Days 1-2: Build MCP Servers
- [ ] Install MCP SDK
- [ ] Create Jotform MCP server - map ALL client methods to tools
- [ ] Create Givebutter MCP server - map ALL client methods to tools
- [ ] Test with MCP inspector

#### Day 3: Docker Setup
- [ ] Create Dockerfile for MCP servers
- [ ] Create docker-compose.yml
- [ ] Build and test Docker containers
- [ ] Document environment variables

#### Days 4-5: Configure & Test with Claude Code
- [ ] Configure MCP servers for Claude Code
- [ ] Test real-world operations (archive mentor, check numbers, etc.)
- [ ] Fix any issues
- [ ] Write usage documentation

### Week 3: Polish & Deploy

#### Days 1-2: Testing
- [ ] Write unit tests for new client methods
- [ ] Test all MCP tools end-to-end
- [ ] Verify error handling
- [ ] Load test Docker containers

#### Days 3-5: Documentation & Deployment
- [ ] Document all API client methods
- [ ] Document all MCP tools with examples
- [ ] Create troubleshooting guide
- [ ] Deploy to production
- [ ] Monitor usage and iterate

---

## Best Practices Summary

### API Client Development

#### ✅ DO
- Use strong TypeScript types for all inputs and outputs
- Validate data at runtime with Zod schemas
- Implement comprehensive error handling with custom error classes
- Use consistent naming conventions for methods
- Provide both paginated and auto-paginated methods
- Cache read-only data with appropriate TTL
- Log all requests and responses in debug mode
- Include retry logic with exponential backoff
- Respect API rate limits
- Write unit tests for all methods

#### ❌ DON'T
- Hardcode API keys or credentials
- Ignore error responses
- Make unbounded requests without pagination
- Skip input validation
- Return raw API responses without typing
- Expose internal implementation details
- Make synchronous blocking calls
- Ignore rate limit headers
- Skip logging for debugging
- Mix concerns (keep clients focused on API communication)

### MCP Server Development

#### ✅ DO
- **Expose ALL API operations as tools** - Every client method becomes a tool
- Follow single responsibility principle (one server per API)
- Use direct, clear tool names matching the API operations (e.g., `create_contact`, `delete_member`)
- Validate all tool inputs with Zod schemas
- Provide clear, helpful error messages
- Use structured logging with request context
- Test with MCP inspector during development
- Deploy in Docker for isolation and reliability

#### ❌ DON'T
- Create generic CRUD operations (be domain-specific)
- Expose dangerous operations without safeguards
- Return unstructured or inconsistent data
- Skip input validation
- Ignore errors silently
- Mix multiple API concerns in one server
- Hardcode configuration values
- Skip logging and monitoring
- Expose sensitive data in responses
- Deploy without testing

### Security Checklist

#### API Clients
- [ ] API keys stored in environment variables
- [ ] No credentials in source code
- [ ] HTTPS only for all requests
- [ ] Input validation before sending requests
- [ ] Output sanitization for sensitive data
- [ ] Rate limiting to prevent abuse
- [ ] Timeout limits to prevent hanging
- [ ] Error messages don't expose internal details

#### MCP Servers
- [ ] Input validation with Zod schemas
- [ ] Output sanitization (remove sensitive fields)
- [ ] Tool-level permission checks
- [ ] Audit logging for all actions
- [ ] Rate limiting per tool
- [ ] Resource access controls
- [ ] Secure credential storage
- [ ] Health checks don't expose secrets
- [ ] Error messages don't leak information
- [ ] Regular security audits

### Testing Strategy

#### Unit Tests
```typescript
describe('JotformClient', () => {
  it('should fetch forms successfully', async () => {
    const client = new JotformClient({ apiKey: 'test-key' });
    const forms = await client.getForms();
    expect(forms).toBeInstanceOf(Array);
  });

  it('should handle rate limiting', async () => {
    const client = new JotformClient({ apiKey: 'test-key' });
    // Simulate rate limit response
    await expect(client.getForms()).rejects.toThrow(RateLimitError);
  });
});
```

#### Integration Tests
```typescript
describe('JotformClient Integration', () => {
  it('should sync submissions end-to-end', async () => {
    const client = new JotformClient({ apiKey: process.env.JOTFORM_API_KEY });
    const forms = await client.getForms();
    const submissions = await client.getAllFormSubmissions(forms[0].id);
    expect(submissions.length).toBeGreaterThan(0);
  });
});
```

#### MCP Server Tests
```typescript
describe('Jotform MCP Server', () => {
  it('should list resources', async () => {
    const response = await server.handleRequest({
      method: 'resources/list',
    });
    expect(response.resources).toBeDefined();
    expect(response.resources.length).toBeGreaterThan(0);
  });

  it('should execute get_form_questions tool', async () => {
    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'get_form_questions',
        arguments: { formId: '123' },
      },
    });
    expect(response.content).toBeDefined();
  });
});
```

---

## Appendix: Key Technologies

### Required Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.x.x",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.x.x",
    "typescript": "^5.x.x",
    "jest": "^29.x.x",
    "@types/jest": "^29.x.x"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./build",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

---

## Conclusion

This architecture provides a comprehensive, production-ready foundation for:

1. **Robust API Clients** - Type-safe, validated, performant, and reliable
2. **Powerful MCP Servers** - Secure, observable, and easy to use with Claude
3. **Maintainable Codebase** - Well-organized, tested, and documented
4. **Scalable Solution** - Designed to grow with your needs

The implementation roadmap provides a clear path from current state to production-ready MCP servers, with emphasis on security, reliability, and developer experience.

Next steps: Review this architecture, provide feedback, and begin Phase 1 implementation.
