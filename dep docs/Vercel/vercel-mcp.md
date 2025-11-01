# Vercel MCP Server

Official documentation for the Vercel Model Context Protocol (MCP) server.

## Overview

Vercel MCP is a secure, OAuth-compliant interface that lets AI clients interact with your Vercel projects. It enables AI tools like Claude Code, Cursor, and Windsurf to securely access logs, documentation, and project metadata directly from your development environment.

## Official Resources

- **Main MCP Documentation**: https://vercel.com/docs/mcp
- **Vercel MCP Server Docs**: https://vercel.com/docs/mcp/vercel-mcp
- **Deploying MCP Servers**: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
- **Blog Post**: https://vercel.com/blog/introducing-vercel-mcp-connect-vercel-to-your-ai-tools

## Server URL

```
https://mcp.vercel.com
```

### Project-Specific URLs

For enhanced performance with automatic project context:

```
https://mcp.vercel.com/<teamSlug>/<projectSlug>
```

## Installation

### Claude Code

```bash
npm install -g @anthropic-ai/claude-code
cd your-project
claude mcp add --transport http vercel https://mcp.vercel.com
claude
/mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

### Windsurf

Add to `mcp_config.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "serverUrl": "https://mcp.vercel.com"
    }
  }
}
```

### Claude.ai and Claude Desktop

Available for Pro, Max, Team, or Enterprise plans. Add custom connector with:
- URL: `https://mcp.vercel.com`
- Authentication: OAuth

## Authentication

Most clients use OAuth authentication flow:

1. Add the MCP server configuration
2. Initiate connection (varies by client)
3. Complete the Vercel sign-in flow when prompted

## Key Features

- Search Vercel documentation
- Manage teams, projects, and deployments
- Access logs and project metadata
- Secure OAuth-compliant interface
- Integration with popular AI development tools

## Technical Details

Vercel published `@vercel/mcp-adapter` (renamed to `mcp-handler`) which supports both:
- Older SSE transport
- Newer stateless HTTP transport

## Status

Public Beta (as of August 2025)
