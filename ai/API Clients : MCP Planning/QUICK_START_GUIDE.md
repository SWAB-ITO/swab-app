# Quick Start Guide: API Clients & MCP Servers

## Overview

This guide provides practical, copy-paste examples to:
1. Complete the API clients with all missing endpoints
2. Build MCP servers with ALL operations exposed as tools
3. Deploy in Docker for easy management
4. Configure for Claude Code

---

## Prerequisites

### Install Dependencies

```bash
# Navigate to project root
cd /Users/calebsandler/Code\ Repos/SWAB/mentor-database

# Install required packages
npm install @modelcontextprotocol/sdk zod

# Install dev dependencies
npm install -D @types/node
```

### Environment Setup

Create `.env.local` if not exists:
```bash
# Jotform
JOTFORM_API_KEY=your_jotform_api_key_here

# Givebutter
GIVEBUTTER_API_KEY=your_givebutter_api_key_here
```

---

## Part 1: Enhance API Clients with Zod

### Step 1: Create Jotform Schemas

Create `backend/lib/infrastructure/clients/jotform/schemas.ts`:

```typescript
import { z } from 'zod';

// Answer schema
export const JotformAnswerSchema = z.object({
  name: z.string().optional(),
  text: z.string().optional(),
  type: z.string().optional(),
  answer: z.any(),
});

// Submission schema
export const JotformSubmissionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  answers: z.record(z.string(), JotformAnswerSchema),
  status: z.string().optional(),
  new: z.string().optional(),
  flag: z.string().optional(),
  notes: z.string().optional(),
  ip: z.string().optional(),
});

// Form schema
export const JotformFormSchema = z.object({
  id: z.string(),
  username: z.string(),
  title: z.string(),
  status: z.enum(['ENABLED', 'DISABLED', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string().optional(),
  last_submission: z.string().optional(),
  new: z.string(),
  count: z.string(),
  type: z.string(),
  url: z.string().url(),
});

// Array schemas
export const JotformSubmissionsSchema = z.array(JotformSubmissionSchema);
export const JotformFormsSchema = z.array(JotformFormSchema);

// Infer TypeScript types from schemas
export type JotformAnswer = z.infer<typeof JotformAnswerSchema>;
export type JotformSubmission = z.infer<typeof JotformSubmissionSchema>;
export type JotformForm = z.infer<typeof JotformFormSchema>;
```

### Step 2: Add Validation to JotformClient

Update `backend/lib/infrastructure/clients/jotform-client.ts`:

```typescript
import { JotformFormsSchema, JotformSubmissionsSchema } from './jotform/schemas';

export class JotformClient extends HttpClient {
  // ... existing code ...

  /**
   * Get all forms for the user (with validation)
   */
  async getForms(): Promise<JotformForm[]> {
    const rawForms = await this.get('/user/forms');

    // Validate response at runtime
    try {
      return JotformFormsSchema.parse(rawForms);
    } catch (error) {
      this.logger.error('Form validation failed', error);
      throw new Error('Invalid response from Jotform API');
    }
  }

  /**
   * Get form submissions (with validation)
   */
  async getFormSubmissions(
    formId: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: Record<string, any>;
      orderBy?: string;
    } = {}
  ): Promise<JotformSubmission[]> {
    const params = new URLSearchParams();
    params.append('limit', String(options.limit || 1000));

    if (options.offset) {
      params.append('offset', String(options.offset));
    }
    if (options.filter) {
      params.append('filter', JSON.stringify(options.filter));
    }
    if (options.orderBy) {
      params.append('orderby', options.orderBy);
    }

    const queryString = params.toString();
    const endpoint = `/form/${formId}/submissions${queryString ? `?${queryString}` : ''}`;

    const rawSubmissions = await this.get(endpoint);

    // Validate response at runtime
    try {
      return JotformSubmissionsSchema.parse(rawSubmissions);
    } catch (error) {
      this.logger.error('Submission validation failed', error);
      throw new Error('Invalid response from Jotform API');
    }
  }
}
```

### Step 3: Create Givebutter Schemas

Create `backend/lib/infrastructure/clients/givebutter/schemas.ts`:

```typescript
import { z } from 'zod';

// Contact schema
export const GivebutterContactSchema = z.object({
  id: z.number(),
  external_id: z.string().optional(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.any()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Campaign schema
export const GivebutterCampaignSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  raised: z.number(),
  goal: z.number(),
  donors: z.number(),
  members: z.number(),
  url: z.string().url(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Member schema
export const GivebutterMemberSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  display_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  raised: z.number(),
  goal: z.number(),
  donors: z.number(),
  url: z.string().url(),
});

// Pagination meta
export const PaginationMetaSchema = z.object({
  current_page: z.number(),
  from: z.number(),
  last_page: z.number(),
  per_page: z.number(),
  to: z.number(),
  total: z.number(),
});

// Paginated response
export const GivebutterPaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    meta: PaginationMetaSchema,
  });

// Infer types
export type GivebutterContact = z.infer<typeof GivebutterContactSchema>;
export type GivebutterCampaign = z.infer<typeof GivebutterCampaignSchema>;
export type GivebutterMember = z.infer<typeof GivebutterMemberSchema>;
```

---

## Part 2: Build Your First MCP Server

### Step 1: Set Up Project Structure

```bash
# Create directories
mkdir -p backend/mcp/jotform/{tools,resources,prompts,schemas}
mkdir -p backend/mcp/givebutter/{tools,resources,prompts,schemas}
mkdir -p backend/mcp/shared
```

### Step 2: Create Jotform MCP Server

Create `backend/mcp/jotform/server.ts`:

```typescript
#!/usr/bin/env node

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

// Initialize
const logger = new Logger('JotformMCP');
const apiKey = process.env.JOTFORM_API_KEY;

if (!apiKey) {
  logger.error('JOTFORM_API_KEY environment variable is required');
  process.exit(1);
}

const jotformClient = new JotformClient({
  apiKey,
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
    },
  }
);

// LIST RESOURCES
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.info('Listing resources');

  return {
    resources: [
      {
        uri: "jotform://forms",
        name: "All Forms",
        description: "List all Jotform forms in your account",
        mimeType: "application/json",
      },
    ],
  };
});

// READ RESOURCE
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  logger.info(`Reading resource: ${uri}`);

  if (uri === "jotform://forms") {
    const forms = await jotformClient.getForms();
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

  // Handle form submissions
  const submissionsMatch = uri.match(/^jotform:\/\/form\/([^/]+)\/submissions$/);
  if (submissionsMatch) {
    const formId = submissionsMatch[1];
    logger.info(`Fetching submissions for form ${formId}`);
    const submissions = await jotformClient.getAllFormSubmissions(formId);
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
  logger.info('Listing tools');

  return {
    tools: [
      {
        name: "search_submissions",
        description: "Search form submissions with filters",
        inputSchema: {
          type: "object",
          properties: {
            formId: {
              type: "string",
              description: "The Jotform form ID",
            },
            status: {
              type: "string",
              description: "Filter by status (e.g., ACTIVE, DELETED)",
              enum: ["ACTIVE", "DELETED"],
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 100)",
            },
          },
          required: ["formId"],
        },
      },
      {
        name: "get_form_questions",
        description: "Get all questions from a form",
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
    ],
  };
});

// CALL TOOL
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Calling tool: ${name}`, { args });

  try {
    if (name === "search_submissions") {
      const { formId, status, limit } = args as {
        formId: string;
        status?: string;
        limit?: number;
      };

      const filter = status ? { status } : undefined;

      const submissions = await jotformClient.getFormSubmissions(formId, {
        filter,
        limit: limit || 100,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                formId,
                total: submissions.length,
                submissions,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_form_questions") {
      const { formId } = args as { formId: string };

      const questions = await jotformClient.getFormQuestions(formId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(questions, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, error);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Jotform MCP server started successfully");
}

main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
```

### Step 3: Update package.json

Add to `package.json`:

```json
{
  "type": "module",
  "bin": {
    "jotform-mcp": "./build/mcp/jotform/server.js",
    "givebutter-mcp": "./build/mcp/givebutter/server.js"
  },
  "scripts": {
    "build:mcp": "tsc && chmod +x build/mcp/jotform/server.js && chmod +x build/mcp/givebutter/server.js",
    "dev:jotform-mcp": "tsx backend/mcp/jotform/server.ts",
    "dev:givebutter-mcp": "tsx backend/mcp/givebutter/server.ts"
  }
}
```

### Step 4: Update tsconfig.json

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./build",
    "rootDir": "./backend"
  },
  "include": ["backend/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### Step 5: Build and Test

```bash
# Build MCP servers
npm run build:mcp

# Test with MCP inspector
npx @modelcontextprotocol/inspector node build/mcp/jotform/server.js
```

### Step 6: Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jotform": {
      "command": "node",
      "args": [
        "/Users/calebsandler/Code Repos/SWAB/mentor-database/build/mcp/jotform/server.js"
      ],
      "env": {
        "JOTFORM_API_KEY": "your_jotform_api_key_here"
      }
    },
    "givebutter": {
      "command": "node",
      "args": [
        "/Users/calebsandler/Code Repos/SWAB/mentor-database/build/mcp/givebutter/server.js"
      ],
      "env": {
        "GIVEBUTTER_API_KEY": "your_givebutter_api_key_here"
      }
    }
  }
}
```

### Step 7: Restart Claude Desktop

After saving the config:
1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. You should see the MCP servers connected in the status bar

---

## Part 3: Docker Deployment

### Why Docker?

- **Isolation**: Each MCP server runs independently
- **Easy deployment**: `docker-compose up -d` starts both servers
- **Works everywhere**: Mac, Linux, Windows
- **Simple restart**: `docker-compose restart` to reload changes
- **Production-ready**: Can host remotely if needed

### Step 1: Create Dockerfile

Create `backend/mcp/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy backend code
COPY backend/ ./backend/

# Build TypeScript
RUN npm run build

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "console.log('healthy')" || exit 1

# Default command (will be overridden by docker-compose)
CMD ["node", "build/mcp/jotform/server.js"]
```

### Step 2: Create docker-compose.yml

Create `backend/mcp/docker-compose.yml`:

```yaml
version: '3.8'

services:
  jotform-mcp:
    build:
      context: ../..
      dockerfile: backend/mcp/Dockerfile
    image: mentor-database-jotform-mcp:latest
    container_name: jotform-mcp-server
    environment:
      - JOTFORM_API_KEY=${JOTFORM_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
    # Keep stdin open for MCP stdio communication
    stdin_open: true
    tty: true
    command: ["node", "build/mcp/jotform/server.js"]

  givebutter-mcp:
    build:
      context: ../..
      dockerfile: backend/mcp/Dockerfile
    image: mentor-database-givebutter-mcp:latest
    container_name: givebutter-mcp-server
    environment:
      - GIVEBUTTER_API_KEY=${GIVEBUTTER_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
    stdin_open: true
    tty: true
    command: ["node", "build/mcp/givebutter/server.js"]
```

### Step 3: Create Environment File

Create `backend/mcp/.env`:

```bash
# Jotform API Key
JOTFORM_API_KEY=your_actual_jotform_api_key_here

# Givebutter API Key
GIVEBUTTER_API_KEY=your_actual_givebutter_api_key_here
```

**Important:** Add to `.gitignore`:
```bash
backend/mcp/.env
```

### Step 4: Build and Run

```bash
# Navigate to MCP directory
cd backend/mcp

# Build images
docker-compose build

# Start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f jotform-mcp
docker-compose logs -f givebutter-mcp
```

### Step 5: Configure Claude Code

For **Claude Code** (not Claude Desktop), configure to connect via Docker:

Create/update `~/.config/claude-code/mcp_config.json`:

```json
{
  "mcpServers": {
    "jotform": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "jotform-mcp-server",
        "node",
        "build/mcp/jotform/server.js"
      ]
    },
    "givebutter": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "givebutter-mcp-server",
        "node",
        "build/mcp/givebutter/server.js"
      ]
    }
  }
}
```

### Step 6: Restart Claude Code

1. Quit Claude Code completely
2. Ensure Docker containers are running: `docker-compose ps`
3. Start Claude Code
4. Verify MCP servers connected (check status bar or use `/mcp status` command)

### Docker Management Commands

```bash
# View logs
docker-compose logs -f jotform-mcp
docker-compose logs -f givebutter-mcp

# Restart a server (after code changes)
docker-compose restart jotform-mcp
docker-compose restart givebutter-mcp

# Stop all servers
docker-compose stop

# Start all servers
docker-compose start

# Rebuild after code changes
docker-compose build
docker-compose up -d

# Remove containers
docker-compose down

# Remove containers and images
docker-compose down --rmi all
```

### Troubleshooting Docker

**Issue: "Cannot connect to MCP server"**
- Check containers are running: `docker-compose ps`
- Check logs: `docker-compose logs jotform-mcp`
- Verify environment variables: `docker-compose config`

**Issue: "API key not found"**
- Check `.env` file exists in `backend/mcp/`
- Verify API keys are set correctly
- Restart containers: `docker-compose restart`

**Issue: "Port already in use"**
- MCP stdio doesn't use ports, so this shouldn't happen
- If using HTTP transport, change ports in docker-compose.yml

**Issue: "Changes not taking effect"**
- Rebuild images: `docker-compose build`
- Restart containers: `docker-compose up -d`

---

## Part 4: Testing Your MCP Server

### Test with MCP Inspector

```bash
# Install inspector globally
npm install -g @modelcontextprotocol/inspector

# Test Jotform server
npx @modelcontextprotocol/inspector node build/mcp/jotform/server.js
```

The inspector will open in your browser and let you:
- List resources
- Read resources
- List tools
- Call tools with parameters
- See request/response in real-time

### Example Test Sequence

1. **List Resources**
   - Should show "jotform://forms"

2. **Read Resource: jotform://forms**
   - Should return all your forms

3. **List Tools**
   - Should show "search_submissions" and "get_form_questions"

4. **Call Tool: get_form_questions**
   ```json
   {
     "formId": "231234567890"
   }
   ```
   - Should return all questions from the form

5. **Call Tool: search_submissions**
   ```json
   {
     "formId": "231234567890",
     "status": "ACTIVE",
     "limit": 10
   }
   ```
   - Should return active submissions

---

## Part 4: Create Givebutter MCP Server

Create `backend/mcp/givebutter/server.ts`:

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GivebutterClient } from "../../lib/infrastructure/clients/givebutter-client.js";
import { Logger } from "../../lib/utils/logger.js";

// Initialize
const logger = new Logger('GivebutterMCP');
const apiKey = process.env.GIVEBUTTER_API_KEY;

if (!apiKey) {
  logger.error('GIVEBUTTER_API_KEY environment variable is required');
  process.exit(1);
}

const givebutterClient = new GivebutterClient({
  apiKey,
  logger,
});

// Create MCP server
const server = new Server(
  {
    name: "givebutter-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// LIST RESOURCES
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.info('Listing resources');

  return {
    resources: [
      {
        uri: "givebutter://campaigns",
        name: "All Campaigns",
        description: "List all Givebutter campaigns",
        mimeType: "application/json",
      },
      {
        uri: "givebutter://contacts",
        name: "All Contacts",
        description: "List all contacts (paginated)",
        mimeType: "application/json",
      },
    ],
  };
});

// READ RESOURCE
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  logger.info(`Reading resource: ${uri}`);

  if (uri === "givebutter://campaigns") {
    const campaigns = await givebutterClient.getCampaigns();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(campaigns, null, 2),
        },
      ],
    };
  }

  if (uri === "givebutter://contacts") {
    // Get first page of contacts
    const contacts = await givebutterClient.getContacts(1, 100);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(contacts, null, 2),
        },
      ],
    };
  }

  // Handle campaign members
  const membersMatch = uri.match(/^givebutter:\/\/campaign\/([^/]+)\/members$/);
  if (membersMatch) {
    const campaignId = parseInt(membersMatch[1]);
    logger.info(`Fetching members for campaign ${campaignId}`);
    const members = await givebutterClient.getAllCampaignMembers(campaignId);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(members, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// LIST TOOLS
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing tools');

  return {
    tools: [
      {
        name: "search_contacts",
        description: "Search contacts by tags or other criteria",
        inputSchema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags",
            },
            limit: {
              type: "number",
              description: "Maximum number of results",
            },
          },
        },
      },
      {
        name: "get_campaign_by_code",
        description: "Find a campaign by its code",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The campaign code (e.g., 'mentor-2025')",
            },
          },
          required: ["code"],
        },
      },
    ],
  };
});

// CALL TOOL
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Calling tool: ${name}`, { args });

  try {
    if (name === "search_contacts") {
      const { tags, limit } = args as {
        tags?: string[];
        limit?: number;
      };

      // For now, get all contacts and filter client-side
      // In production, you'd implement server-side filtering
      const allContacts = await givebutterClient.getAllContacts();

      let filtered = allContacts;

      if (tags && tags.length > 0) {
        filtered = allContacts.filter(contact =>
          contact.tags?.some(tag => tags.includes(tag))
        );
      }

      if (limit) {
        filtered = filtered.slice(0, limit);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: filtered.length,
                contacts: filtered,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_campaign_by_code") {
      const { code } = args as { code: string };

      const campaign = await givebutterClient.getCampaignByCode(code);

      if (!campaign) {
        return {
          content: [
            {
              type: "text",
              text: `Campaign with code "${code}" not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(campaign, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, error);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Givebutter MCP server started successfully");
}

main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
```

---

## Common Issues & Solutions

### Issue: "Cannot find module"

**Solution:** Make sure you've built the project:
```bash
npm run build:mcp
```

### Issue: "JOTFORM_API_KEY is not defined"

**Solution:** Add API key to environment:
```bash
export JOTFORM_API_KEY="your_key_here"
# or add to .env.local
```

### Issue: "Server not showing in Claude Desktop"

**Solution:**
1. Check config file path is correct
2. Make sure JSON is valid (use jsonlint.com)
3. Restart Claude Desktop completely
4. Check logs in `~/Library/Logs/Claude/`

### Issue: "Permission denied" when running server

**Solution:** Make the file executable:
```bash
chmod +x build/mcp/jotform/server.js
chmod +x build/mcp/givebutter/server.js
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Create Zod schemas
3. ✅ Build Jotform MCP server
4. ✅ Build Givebutter MCP server
5. ✅ Test with MCP inspector
6. ✅ Configure Claude Desktop
7. 🔄 Add more tools and resources
8. 🔄 Implement advanced features
9. 🔄 Add comprehensive tests
10. 🔄 Deploy to production

---

## Useful Commands

```bash
# Development
npm run dev:jotform-mcp          # Run Jotform MCP in dev mode
npm run dev:givebutter-mcp       # Run Givebutter MCP in dev mode

# Building
npm run build:mcp                # Build both MCP servers

# Testing
npx @modelcontextprotocol/inspector node build/mcp/jotform/server.js

# Debugging
# Add this to your code:
console.error('Debug:', { variable });  # Logs to stderr (visible in Claude Desktop logs)

# Check Claude Desktop logs
tail -f ~/Library/Logs/Claude/mcp*.log
```

---

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Jotform API Docs](https://api.jotform.com/docs/)
- [Givebutter API Docs](https://docs.givebutter.com/)
- [Zod Documentation](https://zod.dev/)

---

## Support

If you run into issues:
1. Check the MCP inspector for detailed error messages
2. Review Claude Desktop logs: `~/Library/Logs/Claude/`
3. Verify API keys are correct
4. Test API clients independently first
5. Refer to the main architecture documents

Happy coding! 🚀
