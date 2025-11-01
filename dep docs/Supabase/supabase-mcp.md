# Supabase MCP Server

Official documentation for the Supabase Model Context Protocol (MCP) server.

## Overview

The Supabase MCP Server bridges the gap between AI tools and your Supabase projects, enabling natural language commands and agent-like experiences for database management. It standardizes how Large Language Models (LLMs) communicate with Supabase, allowing AI tools to spin up projects, design tables, query data, and manage configurations through a unified protocol.

## Official Resources

- **Getting Started Guide**: https://supabase.com/docs/guides/getting-started/mcp
- **Features Page**: https://supabase.com/features/mcp-server
- **GitHub Repository**: https://github.com/supabase-community/supabase-mcp
- **Blog Post**: https://supabase.com/blog/mcp-server
- **Remote MCP Announcement**: https://supabase.com/blog/remote-mcp-server

## Server URL

```
https://mcp.supabase.com/mcp
```

## Supported AI Tools

- Cursor
- Claude (Claude.ai, Claude Desktop, Claude Code)
- Windsurf
- Visual Studio Code (Copilot)
- Cline

## Installation

### Remote Installation (No npm Required)

The Supabase MCP server is hosted remotely, eliminating the need for local npm package installation.

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

### One-Click Installation

Cursor users can install directly through the provided deep link without manual configuration.

## Authentication

### Default Method (Recommended)

The system uses dynamic client registration with automatic browser-based login during setup. No personal access tokens (PATs) required for typical usage.

### CI Environment (Manual)

For automated environments without browser access, create a PAT and pass it via Authorization header:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### OAuth Alternative

Manually create an OAuth app in your Supabase organization settings if your MCP client requires OAuth credentials instead of PATs.

## Key Capabilities

Access over 20 tools for:

- Database design and table management
- Data querying with SQL
- Project management
- Branch management
- Log retrieval
- Configuration management

## Security Recommendations

**CRITICAL**: Never connect the MCP server to production data. Supabase MCP is only designed for development and testing purposes.

Best practices:
- Use development projects only
- Enable read-only mode for real data access
- Scope servers to specific projects
- Review all tool calls before execution

## Technical Details

- Hosted remotely at `https://mcp.supabase.com/mcp`
- Supports dynamic client registration
- OAuth and PAT authentication methods
- No local installation required
- Browser-based authentication flow

## Status

Generally available (as of 2025)
