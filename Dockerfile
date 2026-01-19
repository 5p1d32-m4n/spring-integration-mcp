# Spring Integration Test MCP Server
# Token-efficient Spring Boot integration testing tools
#
# Build:
#   docker build -t spring-integration-test-mcp .
#   # Or with custom user ID to match your host user:
#   docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t spring-integration-test-mcp .
#
# Run:
#   docker run -i --rm -v /path/to/spring/project:/workspace spring-integration-test-mcp
#
# Works with Podman too (replace 'docker' with 'podman' in commands above)
#
# For Claude Code MCP configuration (~/.claude.json, in the "mcpServers" section):
# {
#   "mcpServers": {
#     "spring-integration-test": {
#       "command": "docker",
#       "args": ["run", "-i", "--rm", "-v", "/path/to/project:/workspace", "spring-integration-test-mcp"],
#       "disabled": false
#     }
#   }
# }
#
# Build arguments:
#   USER_ID  - User ID to run as (default: 1000)
#   GROUP_ID - Group ID to run as (default: 1000)

# Build stage - compile TypeScript
FROM node:20-slim AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Runtime stage - minimal image with compiled code
FROM node:20-slim

# Allow customization of user ID (defaults to 1000, the typical first user on Linux)
ARG USER_ID=1000
ARG GROUP_ID=1000

# Metadata
LABEL org.opencontainers.image.title="Spring Integration Test MCP Server"
LABEL org.opencontainers.image.description="Token-efficient MCP server for Spring Boot integration testing"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/yourusername/spring-integration-test-mcp"

# Set working directory
WORKDIR /app

# Install Maven and Java for test execution tools
# Also install git (often needed for Spring Boot projects)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    maven \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Java environment
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Copy package files for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from builder
COPY --from=builder /build/dist/ ./dist/

# Create volume mount point for Spring Boot projects
VOLUME ["/workspace"]

# Set up workspace and permissions for configured user
# Create group and user if they don't exist, or use existing ones
RUN mkdir -p /workspace && \
    (getent group ${GROUP_ID} || groupadd -g ${GROUP_ID} mcpgroup) && \
    (id -u ${USER_ID} >/dev/null 2>&1 || useradd -m -u ${USER_ID} -g ${GROUP_ID} mcpuser) && \
    chown -R ${USER_ID}:${GROUP_ID} /app /workspace

# Switch to non-root user
USER ${USER_ID}:${GROUP_ID}

# Health check (optional - verifies Node is working)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=1 \
  CMD node --version || exit 1

# Run the server on stdio
CMD ["node", "dist/index.js"]
