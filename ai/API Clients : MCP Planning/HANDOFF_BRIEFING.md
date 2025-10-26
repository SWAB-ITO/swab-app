# 🚀 Project Handoff Briefing - API Clients & MCP Servers

## Quick Context (30 seconds)

We're building:
1. **API Clients** - Production code for Jotform & Givebutter APIs (used throughout codebase)
2. **MCP Servers** - Interactive tools for Claude Code to perform operations (archive mentors, check numbers, etc.)

**Status:** Week 1 COMPLETE ✅ | Starting Week 2 (MCP Servers)

---

## ✅ What's Already Done

### Week 1: API Clients - COMPLETE
- ✅ Added PATCH method to HttpClient
- ✅ Added GivebutterTeam interface
- ✅ Added 9 Givebutter methods (campaigns, members, teams, contacts)
- ✅ Added 8 Jotform methods (forms, submissions, webhooks)
- ✅ TypeScript builds successfully
- ✅ Total: 17 new methods added

### Client Locations
```
backend/lib/infrastructure/clients/
├── http-client.ts           ✅ Has PATCH method (line 160)
├── givebutter-client.ts     ✅ 22 methods total (13 existing + 9 new)
└── jotform-client.ts        ✅ 19 methods total (11 existing + 8 new)
```

---

## 🎯 What's Next: Week 2 - Build MCP Servers

### Goal
Create 2 Docker-hosted MCP servers that expose ALL API operations as tools for Claude Code.

### Scope
- **Jotform MCP Server:** 19 tools (1:1 mapping to client methods)
- **Givebutter MCP Server:** 22 tools (1:1 mapping to client methods)
- **Total:** 41 tools
- **Deployment:** Docker with docker-compose

---

## 📁 Key Files & Locations

### Documentation (Read These First)
```
ai/API Clients : MCP Planning/
├── READY_TO_START.md              # Go/no-go summary
├── JOTFORM_TOOLS_COMPLETE.md      # 19 tools specification
├── GIVEBUTTER_TOOLS_COMPLETE.md   # 22 tools specification
├── QUICK_START_GUIDE.md           # Implementation guide (Part 2 & 3)
└── API_CLIENT_MCP_ARCHITECTURE.md # Full architecture
```

### Implementation Files (Create These)
```
backend/mcp/
├── Dockerfile                  # Build both MCP servers
├── docker-compose.yml          # Orchestrate containers
├── .env                        # API keys (gitignored)
├── jotform/
│   └── server.ts              # Jotform MCP server (19 tools)
└── givebutter/
    └── server.ts              # Givebutter MCP server (22 tools)
```

---

## 🔧 Week 2 Implementation Steps

### Day 1-2: Build MCP Servers

**1. Install MCP SDK**
```bash
npm install @modelcontextprotocol/sdk
```

**2. Create Jotform MCP Server**
- File: `backend/mcp/jotform/server.ts`
- Template in: `QUICK_START_GUIDE.md` (Part 2, Step 2)
- Map all 19 client methods to MCP tools
- Reference: `JOTFORM_TOOLS_COMPLETE.md`

**3. Create Givebutter MCP Server**
- File: `backend/mcp/givebutter/server.ts`
- Similar structure to Jotform server
- Map all 22 client methods to MCP tools
- Reference: `GIVEBUTTER_TOOLS_COMPLETE.md`

**4. Test with MCP Inspector**
```bash
npx @modelcontextprotocol/inspector node build/mcp/jotform/server.js
```

### Day 3: Docker Setup

**1. Create Dockerfile**
- File: `backend/mcp/Dockerfile`
- Template in: `QUICK_START_GUIDE.md` (Part 3, Step 1)

**2. Create docker-compose.yml**
- File: `backend/mcp/docker-compose.yml`
- Template in: `QUICK_START_GUIDE.md` (Part 3, Step 2)

**3. Create .env file**
- File: `backend/mcp/.env`
- Add to .gitignore
- Template in: `QUICK_START_GUIDE.md` (Part 3, Step 3)

**4. Build and test**
```bash
cd backend/mcp
docker-compose build
docker-compose up -d
docker-compose ps  # Verify running
docker-compose logs -f jotform-mcp  # Check logs
```

### Days 4-5: Claude Code Integration

**1. Configure Claude Code**
- Path: `~/.config/claude-code/mcp_config.json`
- Template in: `QUICK_START_GUIDE.md` (Part 3, Step 5)

**2. Test real operations**
- "Archive mentor John Doe"
- "How many mentors fully fundraised?"
- "Did john@example.com submit the form?"

**3. Fix any issues and document**

---

## 🎯 MCP Tool Mapping (Reference)

### Jotform Tools (19 total)
```typescript
// User
get_user

// Forms (7 tools)
get_forms
get_form
get_form_questions
get_form_properties
create_form          // NEW
update_form          // NEW
delete_form          // NEW

// Submissions (6 tools)
get_form_submissions
get_all_form_submissions
get_submission
create_submission    // NEW
update_submission    // NEW
delete_submission    // NEW

// Webhooks (4 tools)
get_form_reports
get_form_webhooks    // NEW
create_webhook       // NEW
delete_webhook       // NEW

// Verify
verify_api_key
```

### Givebutter Tools (22 total)
```typescript
// Campaigns (6 tools)
get_campaigns
get_campaign
get_campaign_by_code
create_campaign      // NEW
update_campaign      // NEW
delete_campaign      // NEW

// Members (4 tools)
get_campaign_members
get_all_campaign_members
get_member
delete_member        // NEW

// Teams (2 tools)
get_teams            // NEW
get_team             // NEW

// Contacts (7 tools)
get_contacts
get_all_contacts
get_contact
create_contact       // NEW
update_contact       // NEW
archive_contact
restore_contact      // NEW

// Transactions (2 tools)
get_transactions
get_all_transactions

// Verify
verify_api_key
```

---

## 💡 MCP Server Pattern (Template)

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { JotformClient } from "../../lib/infrastructure/clients/jotform-client.js";

// Initialize client
const client = new JotformClient({
  apiKey: process.env.JOTFORM_API_KEY!,
});

// Create MCP server
const server = new Server(
  { name: "jotform-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// LIST TOOLS
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_forms",
        description: "List all forms",
        inputSchema: { type: "object", properties: {} }
      },
      // ... 18 more tools
    ]
  };
});

// CALL TOOL
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_forms") {
    const forms = await client.getForms();
    return {
      content: [{ type: "text", text: JSON.stringify(forms, null, 2) }]
    };
  }
  // ... handle 18 more tools
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch(console.error);
```

---

## 🚨 Important Notes

### Design Principles
1. **1:1 Mapping** - Every client method = one MCP tool (no extras, no missing)
2. **Simple names** - Tool names match method names (e.g., `get_forms` → `client.getForms()`)
3. **Direct execution** - Tools directly call client methods, minimal logic
4. **Consistent errors** - All errors caught and returned with `isError: true`

### Docker Requirements
- Both servers in same Dockerfile (different CMD)
- Separate containers via docker-compose
- stdin_open: true and tty: true for stdio
- Environment variables for API keys

### Claude Code Config
- Uses `docker exec -i` to connect to containers
- Config path may vary - verify actual location
- Both servers run simultaneously

---

## 📋 Quick Start Commands

```bash
# Verify Week 1 complete
cd /Users/calebsandler/Code\ Repos/SWAB/mentor-database
npm run build  # Should succeed

# Install MCP SDK
npm install @modelcontextprotocol/sdk

# Create MCP directory structure
mkdir -p backend/mcp/{jotform,givebutter}

# Start building servers (follow QUICK_START_GUIDE.md Part 2)
# Then Docker setup (follow QUICK_START_GUIDE.md Part 3)
```

---

## 📚 Reference Documents Priority

1. **QUICK_START_GUIDE.md Part 2** - MCP server code examples
2. **JOTFORM_TOOLS_COMPLETE.md** - All 19 Jotform tool specs
3. **GIVEBUTTER_TOOLS_COMPLETE.md** - All 22 Givebutter tool specs
4. **QUICK_START_GUIDE.md Part 3** - Docker deployment guide
5. **API_CLIENT_MCP_ARCHITECTURE.md** - Architecture context

---

## 🎯 Success Criteria

**Week 2 Done When:**
- [ ] 2 MCP servers built (41 tools total)
- [ ] Both servers running in Docker
- [ ] Claude Code can connect to both
- [ ] Can execute real operations (archive, check, verify)
- [ ] All tools tested and working

---

## 💬 Questions? Check These First

- **"What tools do I need to build?"** → See tool lists above or `*_TOOLS_COMPLETE.md`
- **"How do I structure the MCP server?"** → `QUICK_START_GUIDE.md` Part 2
- **"Docker setup not working?"** → `QUICK_START_GUIDE.md` Part 3, Troubleshooting
- **"What's the architecture?"** → `API_CLIENT_MCP_ARCHITECTURE.md`

---

## 🚀 Ready to Start!

You have everything you need:
- ✅ All client methods implemented
- ✅ Complete documentation
- ✅ Code templates
- ✅ Clear roadmap

**Start with:** Install MCP SDK, then build Jotform MCP server following `QUICK_START_GUIDE.md` Part 2.

Good luck! 🎉
