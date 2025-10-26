FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.backend.json ./

# Install dependencies
RUN npm ci

# Copy backend code
COPY backend/ ./backend/

# Build TypeScript for MCP servers
RUN npm run mcp:build

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "console.log('healthy')" || exit 1

# Default command (will be overridden by docker-compose)
CMD ["node", "build/mcp/jotform/server.js"]
