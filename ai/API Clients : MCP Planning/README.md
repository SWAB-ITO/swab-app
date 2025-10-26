# API Clients & MCP Server Planning

## Overview

This directory contains comprehensive research, architecture, and implementation planning for creating production-ready API clients and MCP (Model Context Protocol) servers for Jotform and Givebutter integrations.

---

## Documents

### 1. 📋 [API_CLIENT_MCP_ARCHITECTURE.md](./API_CLIENT_MCP_ARCHITECTURE.md)
**Main architecture document** covering:
- Current state analysis of existing clients
- API architecture patterns and best practices
- MCP server architecture principles
- Proposed directory structure
- 6-week implementation roadmap
- Security checklist
- Testing strategy

**Start here** for understanding the overall architecture and design decisions.

---

### 2. 🛠️ [MCP_TOOLS_RESOURCES_SPEC.md](./MCP_TOOLS_RESOURCES_SPEC.md)
**Detailed specification** for MCP servers:
- Complete list of resources for Jotform and Givebutter
- Complete list of tools with parameters and responses
- Prompt templates for common tasks
- Implementation priority and phasing
- Testing checklist

**Use this** as the definitive specification when building MCP servers.

---

### 3. 🚀 [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
**Practical implementation guide** with:
- Copy-paste code examples
- Step-by-step setup instructions
- Working MCP server implementations
- Configuration examples
- Troubleshooting guide

**Start here** to begin building immediately.

---

## Key Technologies

- **TypeScript** - Type-safe development
- **Zod** - Runtime validation
- **MCP SDK** - Model Context Protocol
- **Supabase** - Database
- **Node.js** - Runtime environment

---

## Quick Links

### External Documentation
- [Jotform API Docs](https://api.jotform.com/docs/)
- [Givebutter API Docs](https://docs.givebutter.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Zod Documentation](https://zod.dev/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Internal Documentation
- [Current Jotform Client](../../../backend/lib/infrastructure/clients/jotform-client.ts)
- [Current Givebutter Client](../../../backend/lib/infrastructure/clients/givebutter-client.ts)
- [HTTP Client Base](../../../backend/lib/infrastructure/clients/http-client.ts)
- [Base Processor](../../../backend/lib/infrastructure/processors/base-processor.ts)

---

## Research Summary

### What We Learned

#### API Client Best Practices
✅ Use strong TypeScript types everywhere
✅ Validate at runtime with Zod schemas
✅ Implement consistent error handling
✅ Provide both paginated and auto-paginated methods
✅ Cache read-only data appropriately
✅ Use exponential backoff for retries
✅ Respect rate limits

#### MCP Server Principles
✅ Single responsibility per server
✅ Defense-in-depth security
✅ Domain-specific tools (not generic CRUD)
✅ Structured logging and observability
✅ Health checks and graceful degradation
✅ Clear separation: Resources vs Tools vs Prompts

#### Current Implementation Strengths
✅ Solid HttpClient foundation with retry/timeout/rate limiting
✅ Clean client inheritance structure
✅ Good separation of concerns
✅ Comprehensive endpoint coverage for core functionality
✅ BaseProcessor pattern for data processing

#### Gaps Identified
❌ No runtime validation (need Zod)
❌ Incomplete endpoint coverage
❌ No MCP server implementations
❌ Limited caching
❌ No webhook support

---

## Implementation Roadmap

### Phase 1: API Client Enhancements (Weeks 1-2)
1. Add Zod schemas and validation
2. Implement missing endpoints
3. Add caching layer
4. Enhance error handling

### Phase 2: MCP Server Development (Weeks 3-4)
1. Build MCP foundation
2. Implement Jotform MCP server
3. Implement Givebutter MCP server
4. Create prompt templates

### Phase 3: Production Readiness (Weeks 5-6)
1. Add observability and monitoring
2. Security audit
3. Comprehensive testing
4. Documentation and deployment

---

## Getting Started

### For Architects & Planners
1. Read [API_CLIENT_MCP_ARCHITECTURE.md](./API_CLIENT_MCP_ARCHITECTURE.md)
2. Review [MCP_TOOLS_RESOURCES_SPEC.md](./MCP_TOOLS_RESOURCES_SPEC.md)
3. Provide feedback on architecture
4. Approve implementation plan

### For Developers
1. Read [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
2. Set up development environment
3. Build first MCP server
4. Test with MCP inspector
5. Iterate and expand

### For Testers
1. Review [API_CLIENT_MCP_ARCHITECTURE.md](./API_CLIENT_MCP_ARCHITECTURE.md) testing section
2. Review testing checklist in [MCP_TOOLS_RESOURCES_SPEC.md](./MCP_TOOLS_RESOURCES_SPEC.md)
3. Create test plans
4. Validate implementations

---

## Project Structure

```
mentor-database/
├── ai/
│   └── API Clients : MCP Planning/
│       ├── README.md                           # This file
│       ├── API_CLIENT_MCP_ARCHITECTURE.md      # Main architecture
│       ├── MCP_TOOLS_RESOURCES_SPEC.md         # Detailed specs
│       ├── QUICK_START_GUIDE.md                # Implementation guide
│       ├── Givebutter API Docs.md              # API reference
│       └── JotForm API Client.js               # Initial client
└── backend/
    ├── lib/infrastructure/clients/
    │   ├── base/
    │   │   ├── http-client.ts                  # ✅ Exists
    │   │   ├── paginated-client.ts             # 🔄 To create
    │   │   └── cached-client.ts                # 🔄 To create
    │   ├── jotform/
    │   │   ├── jotform-client.ts               # ✅ Exists (enhance)
    │   │   ├── schemas.ts                      # 🔄 To create
    │   │   ├── types.ts                        # 🔄 To create
    │   │   └── endpoints/                      # 🔄 To create
    │   └── givebutter/
    │       ├── givebutter-client.ts            # ✅ Exists (enhance)
    │       ├── schemas.ts                      # 🔄 To create
    │       ├── types.ts                        # 🔄 To create
    │       └── endpoints/                      # 🔄 To create
    └── mcp/                                    # 🔄 To create
        ├── shared/
        ├── jotform/
        └── givebutter/
```

Legend:
- ✅ Exists - Already implemented
- 🔄 To create - Needs to be built

---

## Key Decisions Made

### Architecture Decisions

**Decision 1: Use Zod for Runtime Validation**
- **Rationale:** TypeScript provides compile-time safety, but runtime validation prevents invalid API responses from causing issues
- **Impact:** All API responses will be validated, increasing reliability

**Decision 2: Separate MCP Server per API**
- **Rationale:** Follows MCP best practice of single responsibility
- **Impact:** Two separate servers (jotform-mcp, givebutter-mcp)

**Decision 3: Domain-Specific Tools (Not Generic CRUD)**
- **Rationale:** MCP best practice - tools should be meaningful operations, not low-level database operations
- **Impact:** Tools like "update_contact_tags" instead of "update_record"

**Decision 4: Build on Existing HttpClient**
- **Rationale:** Current implementation is solid with retry/timeout/rate limiting
- **Impact:** Enhance rather than replace existing code

**Decision 5: Three-Phase Implementation**
- **Rationale:** Incremental delivery allows for feedback and iteration
- **Impact:** Can start using enhanced clients before MCP servers are complete

### Technology Decisions

**TypeScript + ES Modules**
- Modern JavaScript with full type safety
- Required by MCP SDK

**Zod for Validation**
- Industry standard for TypeScript runtime validation
- Can infer types from schemas (DRY principle)

**MCP SDK Official Package**
- Well-supported by Anthropic
- Active development and community

---

## Success Criteria

### API Clients
- [ ] 100% of required endpoints implemented
- [ ] All responses validated with Zod schemas
- [ ] >80% test coverage
- [ ] Error handling covers all edge cases
- [ ] Performance acceptable (< 100ms for cached requests)
- [ ] Documentation complete

### MCP Servers
- [ ] All specified resources implemented
- [ ] All specified tools implemented
- [ ] Works with Claude Desktop
- [ ] Tools return consistent, well-formatted responses
- [ ] Security audit passed
- [ ] Performance acceptable (< 500ms for most operations)
- [ ] Documentation and examples complete

### Overall Project
- [ ] Zero production incidents
- [ ] Positive user feedback from Claude Desktop testing
- [ ] All tests passing
- [ ] Security requirements met
- [ ] Successfully deployed to production

---

## Next Steps

1. **Review & Feedback** (Week 0)
   - Stakeholders review architecture documents
   - Provide feedback and suggestions
   - Approve implementation plan

2. **Kickoff** (Week 1, Day 1)
   - Set up development environment
   - Install dependencies
   - Create project structure

3. **Sprint 1** (Week 1)
   - Add Zod schemas
   - Validate existing endpoints
   - Create enhanced error classes

4. **Continue** following the roadmap in [API_CLIENT_MCP_ARCHITECTURE.md](./API_CLIENT_MCP_ARCHITECTURE.md)

---

## Questions?

For technical questions or clarifications:
1. Review the relevant document
2. Check the troubleshooting section in [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
3. Consult external documentation links above
4. Ask the development team

---

## Version History

- **v1.0** (2025-10-25) - Initial research and architecture complete
  - Comprehensive API client research
  - MCP server architecture and best practices
  - Detailed tool and resource specifications
  - Quick start implementation guide
  - 6-week implementation roadmap

---

## Contributors

Research and documentation by Claude Code in collaboration with SWAB Mentor Database Team.

---

## License

Internal use only - SWAB Mentor Database Project
