# Docker Deployment Guide

## Quick Start

### Build the Image

```bash
# Build with default UID/GID 1000 (typical first user on Linux)
docker build -t spring-integration-test-mcp .

# Or customize for your user ID
docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t spring-integration-test-mcp .
```

**Works with both Docker and Podman:**
```bash
# Using Podman (same commands)
podman build -t spring-integration-test-mcp .
```

This uses a **multi-stage build** to:
1. Compile TypeScript in the builder stage
2. Create a minimal runtime image with only production dependencies
3. Include Maven and Java for running Spring Boot tests
4. Configure proper user permissions matching your host user

### Run Standalone

Test the server directly:

```bash
# Basic test - just verify it starts
docker run -i --rm spring-integration-test-mcp

# Test with a Spring Boot project
docker run -i --rm \
  -v /path/to/your/spring/project:/workspace \
  spring-integration-test-mcp
```

## Integration with Claude Code

### Method 1: Docker-based MCP Server (Recommended for Distribution)

Add to your Claude Code `settings.json`:

```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "${workspaceFolder}:/workspace",
        "spring-integration-test-mcp"
      ],
      "env": {},
      "description": "Spring Boot integration testing tools"
    }
  }
}
```

**Benefits:**
- No need to install Node.js locally
- Isolated environment
- Consistent across different machines
- Includes Maven and Java automatically

**Drawbacks:**
- Slightly slower startup
- Requires Docker installed
- Additional layer between IDE and tools

### Method 2: Direct Node.js (Recommended for Development)

Add to your Claude Code `settings.json`:

```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "node",
      "args": ["/home/brandon/Dev/spring-integration-test-mcp/dist/index.js"],
      "env": {},
      "description": "Spring Boot integration testing tools"
    }
  }
}
```

**Benefits:**
- Faster startup
- Easier debugging
- Direct file access

**Drawbacks:**
- Requires Node.js installed
- May need Maven/Java installed separately

## Docker Image Features

### Multi-Stage Build

The Dockerfile uses two stages:

1. **Builder Stage** (`FROM node:20-slim AS builder`)
   - Installs all dependencies (including TypeScript)
   - Compiles TypeScript to JavaScript
   - Results in `dist/` folder

2. **Runtime Stage** (`FROM node:20-slim`)
   - Only production dependencies
   - Copies compiled `dist/` from builder
   - Includes Maven + Java + Git
   - Runs as non-root user (`mcpuser`)

**Size comparison:**
- Without multi-stage: ~800MB
- With multi-stage: ~600MB (saves ~200MB)

### Security Features

- **Non-root user**: Runs as configured UID (default 1000, customizable via `--build-arg USER_ID`)
- **Permission matching**: User ID matches host user to avoid permission issues
- **Minimal base**: Uses `node:20-slim` (smaller attack surface)
- **No secrets**: No credentials baked into image
- **Health check**: Verifies Node.js is working

### Included Tools

The image includes:
- **Node.js 20**: For running the MCP server
- **OpenJDK 17**: For running Spring Boot tests
- **Maven**: For building and testing Spring projects
- **Git**: For Git-based operations

## Volume Mounts

### Spring Boot Project

Mount your Spring Boot project to `/workspace`:

```bash
docker run -i --rm \
  -v /home/user/myproject:/workspace \
  spring-integration-test-mcp
```

Then use tools with `projectPath: "/workspace"`:

```json
{
  "name": "check_spring_boot_version",
  "arguments": {
    "projectPath": "/workspace"
  }
}
```

### Maven Cache (Optional)

Speed up Maven builds by caching dependencies:

```bash
docker run -i --rm \
  -v /home/user/myproject:/workspace \
  -v maven-cache:/home/mcpuser/.m2 \
  spring-integration-test-mcp
```

Create the volume first:
```bash
docker volume create maven-cache
```

## Advanced Usage

### Custom Java Version

If you need Java 11 instead of 17, modify the Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-11-jdk-headless \
    maven \
    git \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

Rebuild:
```bash
docker build -t spring-integration-test-mcp:java11 .
```

### Platform-Specific Builds

Build for different architectures:

```bash
# ARM64 (Apple Silicon, AWS Graviton)
docker build --platform linux/arm64 -t spring-integration-test-mcp:arm64 .

# AMD64 (Intel/AMD)
docker build --platform linux/amd64 -t spring-integration-test-mcp:amd64 .

# Multi-platform
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t spring-integration-test-mcp:latest \
  --push .
```

### Docker Compose

For complex setups with databases, create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    image: spring-integration-test-mcp
    stdin_open: true
    volumes:
      - ./myproject:/workspace
      - maven-cache:/home/mcpuser/.m2
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  maven-cache:
  postgres-data:
```

Run with:
```bash
docker-compose run --rm mcp-server
```

## Troubleshooting

### Build Fails: TypeScript Errors

Ensure your code compiles locally first:
```bash
npm run build
```

### Container Exits Immediately

This is normal - the MCP server waits for stdio input. Test it:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | docker run -i --rm spring-integration-test-mcp
```

### Maven/Java Not Found

Verify they're installed in the image:
```bash
docker run -it --rm spring-integration-test-mcp bash -c "java -version && mvn -version"
```

### Permission Errors

If you get permission errors on mounted volumes, rebuild with your user ID:

```bash
# Find your user ID
id -u
id -g

# Rebuild with your IDs
docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t spring-integration-test-mcp .
```

The Dockerfile accepts `USER_ID` and `GROUP_ID` build arguments to match your host user, preventing permission issues when mounting volumes.

**Note for distrobox/toolbox users:** Build the image from your host system, not inside the container, to ensure proper user ID mapping.

## Distribution

### Push to Docker Hub

```bash
# Login
docker login

# Tag
docker tag spring-integration-test-mcp:latest yourusername/spring-integration-test-mcp:latest
docker tag spring-integration-test-mcp:latest yourusername/spring-integration-test-mcp:1.0.0

# Push
docker push yourusername/spring-integration-test-mcp:latest
docker push yourusername/spring-integration-test-mcp:1.0.0
```

Users can then pull and use:
```bash
docker pull yourusername/spring-integration-test-mcp:latest
```

### GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u yourusername --password-stdin

# Tag
docker tag spring-integration-test-mcp:latest ghcr.io/yourusername/spring-integration-test-mcp:latest

# Push
docker push ghcr.io/yourusername/spring-integration-test-mcp:latest
```

### Export as Tar (Offline Distribution)

```bash
# Export
docker save spring-integration-test-mcp:latest | gzip > spring-integration-test-mcp.tar.gz

# Import (on another machine)
docker load < spring-integration-test-mcp.tar.gz
```

## Comparison: Docker vs Native

| Aspect | Docker | Native (Node.js) |
|--------|--------|------------------|
| Setup | Install Docker | Install Node.js + Maven + Java |
| Startup | 2-3s | <1s |
| Isolation | Complete | None |
| Updates | Pull new image | `git pull && npm install && npm run build` |
| Debugging | More complex | Direct |
| Distribution | Easy (single image) | Complex (need all deps) |
| CI/CD | Perfect | Requires setup |

## Podman Alternative

This Dockerfile works with Podman as well (same commands):

```bash
# Build
podman build -t spring-integration-test-mcp .

# Run
podman run -i --rm \
  -v /path/to/project:/workspace \
  spring-integration-test-mcp
```

### Claude Code Configuration with Podman

In `~/.claude.json`, add to the `mcpServers` section:

```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "podman",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/spring/project:/workspace",
        "spring-integration-test-mcp"
      ],
      "disabled": false
    }
  }
}
```

**Note:** Replace `/path/to/your/spring/project` with your actual project path, or use `${workspaceFolder}` if your MCP client supports it.

### Distrobox/Toolbox Users

If you're using distrobox or toolbox:
1. **Build on host:** Run `podman build` from your host terminal (not inside distrobox)
2. **Shared directories:** Your home directory is shared, so `/home/username` paths work in both locations
3. **Config location:** Claude Code config is in `~/.claude.json`
