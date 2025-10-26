# MCP Servers for Jotform & Givebutter

This directory contains MCP (Model Context Protocol) servers that expose Jotform and Givebutter API operations as tools for Claude Code.

## Overview

- **Jotform MCP Server**: 19 tools for forms, submissions, and webhooks
- **Givebutter MCP Server**: 22 tools for campaigns, members, contacts, and transactions
- **Total**: 41 tools providing complete API access

## Quick Start

### 1. Set Up Environment Variables

Copy the example env file and add your API keys:

```bash
cd backend/mcp
cp .env.example .env
# Edit .env and add your real API keys
```

Your `.env` should look like:
```bash
JOTFORM_API_KEY=your_actual_jotform_api_key
GIVEBUTTER_API_KEY=your_actual_givebutter_api_key
```

### 2. Build the MCP Servers

```bash
# From project root
npm run mcp:build
```

This compiles TypeScript and makes the servers executable.

### 3. Run with Docker (Recommended for Claude Code)

```bash
cd backend/mcp

# Build and start containers
docker-compose build
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f jotform-mcp
docker-compose logs -f givebutter-mcp
```

### 4. Configure Claude Code

Create or update `~/.config/claude-code/mcp_config.json`:

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

**Note**: If you're using Claude Desktop instead of Claude Code, the config file path is:
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

For Claude Desktop without Docker, use:
```json
{
  "mcpServers": {
    "jotform": {
      "command": "node",
      "args": [
        "/absolute/path/to/mentor-database/build/mcp/jotform/server.js"
      ],
      "env": {
        "JOTFORM_API_KEY": "your_key_here"
      }
    },
    "givebutter": {
      "command": "node",
      "args": [
        "/absolute/path/to/mentor-database/build/mcp/givebutter/server.js"
      ],
      "env": {
        "GIVEBUTTER_API_KEY": "your_key_here"
      }
    }
  }
}
```

### 5. Restart Claude Code

1. Quit Claude Code completely
2. Ensure Docker containers are running: `docker-compose ps`
3. Start Claude Code
4. Verify MCP servers are connected

## Development

### Run in Dev Mode (without Docker)

```bash
# Terminal 1 - Run Jotform MCP server
JOTFORM_API_KEY=your_key npm run mcp:dev:jotform

# Terminal 2 - Run Givebutter MCP server
GIVEBUTTER_API_KEY=your_key npm run mcp:dev:givebutter
```

### Test with MCP Inspector

```bash
# Install inspector globally
npm install -g @modelcontextprotocol/inspector

# Test Jotform server
JOTFORM_API_KEY=your_key npx @modelcontextprotocol/inspector npx tsx backend/mcp/jotform/server.ts

# Test Givebutter server
GIVEBUTTER_API_KEY=your_key npx @modelcontextprotocol/inspector npx tsx backend/mcp/givebutter/server.ts
```

## Available Tools

### Jotform Tools (19)

**User**
- `get_user` - Get user profile information

**Forms (7)**
- `get_forms` - List all forms
- `get_form` - Get specific form
- `get_form_questions` - Get form questions
- `get_form_properties` - Get form properties
- `create_form` - Create new form
- `update_form` - Update form properties
- `delete_form` - Delete form

**Submissions (6)**
- `get_form_submissions` - Get submissions (paginated)
- `get_all_form_submissions` - Get ALL submissions (auto-paginated)
- `get_submission` - Get single submission
- `create_submission` - Create submission
- `update_submission` - Update submission
- `delete_submission` - Delete submission

**Webhooks (4)**
- `get_form_reports` - Get form reports
- `get_form_webhooks` - Get webhooks
- `create_webhook` - Create webhook
- `delete_webhook` - Delete webhook

**Utility (1)**
- `verify_api_key` - Verify API key

### Givebutter Tools (22)

**Campaigns (6)**
- `get_campaigns` - List all campaigns
- `get_campaign` - Get specific campaign
- `get_campaign_by_code` - Find by campaign code
- `create_campaign` - Create campaign
- `update_campaign` - Update campaign
- `delete_campaign` - Delete campaign

**Members (4)**
- `get_campaign_members` - Get members (paginated)
- `get_all_campaign_members` - Get ALL members (auto-paginated)
- `get_member` - Get specific member
- `delete_member` - Delete member

**Teams (2)**
- `get_teams` - List all teams
- `get_team` - Get specific team

**Contacts (7)**
- `get_contacts` - Get contacts (paginated)
- `get_all_contacts` - Get ALL contacts (auto-paginated)
- `get_contact` - Get specific contact
- `create_contact` - Create contact
- `update_contact` - Update contact
- `archive_contact` - Archive contact
- `restore_contact` - Restore archived contact

**Transactions (2)**
- `get_transactions` - Get transactions (paginated, with filters)
- `get_all_transactions` - Get ALL transactions (auto-paginated, with filters)

**Utility (1)**
- `verify_api_key` - Verify API key

## Example Usage with Claude Code

### Check Mentor Applications
```
You: How many people submitted the mentor application form today?

Claude uses:
- get_forms() to find "Mentor Application"
- get_all_form_submissions(formId) with filter
- Counts submissions from today
```

### Archive a Mentor
```
You: Archive contact John Doe from Givebutter

Claude uses:
- get_all_contacts()
- Searches for "John Doe"
- archive_contact(contactId)
```

### Check Fundraising Progress
```
You: How many mentors in the 2025 campaign have fully fundraised?

Claude uses:
- get_campaign_by_code("mentor-2025")
- get_all_campaign_members(campaignId)
- Filters where raised >= goal
```

## Docker Management

```bash
# View logs
docker-compose logs -f jotform-mcp
docker-compose logs -f givebutter-mcp

# Restart after code changes
docker-compose build
docker-compose restart

# Stop all servers
docker-compose stop

# Start all servers
docker-compose start

# Remove containers
docker-compose down

# Remove containers and images
docker-compose down --rmi all
```

## Troubleshooting

### "Cannot connect to MCP server"
- Check containers are running: `docker-compose ps`
- Check logs: `docker-compose logs jotform-mcp`
- Verify environment variables: `docker-compose config`

### "API key not found"
- Check `.env` file exists in `backend/mcp/`
- Verify API keys are set correctly
- Restart containers: `docker-compose restart`

### "Changes not taking effect"
- Rebuild images: `docker-compose build`
- Restart containers: `docker-compose up -d`

### Server not showing in Claude Code
1. Check config file path is correct
2. Make sure JSON is valid
3. Restart Claude Code completely
4. Check Docker containers are running

## Architecture

Each MCP server:
1. **Initializes** the API client with environment variables
2. **Lists tools** - Returns all available operations
3. **Handles tool calls** - Maps tool names to client methods
4. **Returns results** - Formats responses as JSON
5. **Error handling** - Catches and returns errors with `isError: true`

The servers use stdio transport for communication with Claude Code, which works seamlessly with Docker using `docker exec -i`.

## Security Notes

- **Never commit** `.env` files (already in `.gitignore`)
- API keys are stored in Docker environment variables
- Servers run in isolated containers
- No network ports are exposed (stdio only)

## Next Steps

1. Set up your `.env` file with real API keys
2. Build and start Docker containers
3. Configure Claude Code
4. Test with real operations
5. Start using Claude Code to interact with Jotform & Givebutter!
