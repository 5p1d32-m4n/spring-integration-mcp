# MCP Server Setup Guide

## Overview

This MCP server provides token-efficient tools for Spring Boot integration testing. It returns structured JSON summaries instead of dumping entire files.

## Which Setup Method Should I Use?

Choose based on where you're running Claude Code:

| Your Setup | Recommended Method | Why |
|------------|-------------------|-----|
| **Native Linux** (Ubuntu, Fedora, Arch) | Method 2: Container | Has Maven + Java built-in |
| **Distrobox/Toolbox** (Bazzite, Silverblue) | Method 1: Node.js | Avoids podman path issues |
| **macOS** | Either works | Choose based on preference |
| **Windows** | Either works | Choose based on preference |
| **Immutable OS** (Bazzite, Silverblue) | Method 1 inside distrobox | Can't easily install Node natively |

**Quick Decision:**
- Running Claude Code **inside distrobox**? → Use Method 1 (Node.js)
- Running Claude Code **on native host**? → Use Method 2 (Container)

---

## Setup Methods

### Method 1: Node.js Direct (Best for Distrobox)

#### Setup Steps

1. **Build the server** (inside your distrobox):
   ```bash
   cd ~/Dev/spring-integration-test-mcp
   npm install
   npm run build
   ```

2. **Find your Claude Code config location:**
   - **All platforms:** `~/.claude.json`

3. **Add the MCP server configuration:**

   Edit `~/.claude.json` and add to the `mcpServers` section:

   ```json
   {
     "mcpServers": {
       "spring-integration-test": {
         "command": "node",
         "args": ["/home/brandon/Dev/spring-integration-test-mcp/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

   **Important:**
   - Use the **absolute path** to `dist/index.js`
   - Distrobox shares your home directory, so paths like `/home/username` work everywhere

4. **Restart Claude Code** to load the new MCP server

5. **Verify it's working:**
   - Type `/mcp` in Claude Code to see available servers
   - You should see `spring-integration-test` listed
   - Try: `use check_environment`

### Method 2: Container (Best for Native Host)

**Use this if:**
- You're running Claude Code on your **native host** (not inside distrobox)
- You want Maven + Java pre-installed in an isolated environment
- You're distributing this to others

**Pros:**
- ✅ Includes Maven + Java + Node.js (all dependencies bundled)
- ✅ Isolated environment
- ✅ Consistent across different machines
- ✅ No need to install Node.js/Maven/Java on host

**Cons:**
- ❌ Slightly slower startup (container overhead)
- ❌ Doesn't work well inside distrobox (path mapping issues)
- ❌ Requires Docker or Podman installed

#### Setup Steps

1. **Build the image** (on your **native host**, not inside distrobox):
   ```bash
   # Exit distrobox if you're in one
   exit

   # Now on your Bazzite/Fedora/native host:
   cd /home/brandon/Dev/spring-integration-test-mcp

   # Using Podman (recommended for Fedora/Bazzite/RHEL)
   podman build -t spring-integration-test-mcp .

   # OR using Docker
   docker build -t spring-integration-test-mcp .

   # Optional: Match your user ID (usually not needed, default is 1000)
   podman build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t spring-integration-test-mcp .
   ```

2. **Test the container** (on your native host):
   ```bash
   # Quick test - should show server startup message then wait
   podman run -i --rm spring-integration-test-mcp
   # Press Ctrl+C to exit

   # Test with your Spring Boot project
   podman run -i --rm \
     -v /home/brandon/Dev/knostos/services/activity:/workspace \
     spring-integration-test-mcp
   # Press Ctrl+C to exit
   ```

3. **Configure Claude Code** (if running on native host):

   Edit `~/.claude.json` and add to the `mcpServers` section:

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
           "/home/brandon/Dev/knostos/services/activity:/workspace",
           "spring-integration-test-mcp"
         ],
         "disabled": false
       }
     }
   }
   ```

   **Important Notes:**
   - Replace `podman` with `docker` if using Docker
   - Replace the path with your actual Spring Boot project path
   - The `-v` flag format is `host_path:/workspace`
   - **DO NOT manually run the container** - Claude Code starts it automatically

4. **Restart Claude Code** for changes to take effect

5. **Verify it's working:**
   - Type `/mcp` in Claude Code to see available servers
   - You should see `spring-integration-test` listed
   - Try: `use check_environment`

### Method 3: Claude Desktop (Legacy)

1. **Build the server** (same as Method 1)

2. **Find your Claude Desktop config:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Add configuration** (see `claude-desktop-config.example.json`)

## Available Tools

Once configured, you'll have access to these tools:

### Environment Tools
- `check_environment` - Verify Maven, Java, Docker/Podman availability

### Setup Phase
- `check_spring_boot_version` - Detect Spring Boot 2 vs 3
- `find_missing_properties` - Find @Value properties missing from test config
- `find_beans_needing_exclusion` - Find beans needing @Profile("!test")

### Investigation Phase
- `investigate_jwt_claims` - Extract JWT claims structure
- `investigate_response_wrapper` - Check for response wrappers
- `investigate_entity_relationships` - Map entity dependencies
- `investigate_service` - Analyze service dependencies
- `analyze_controller` - Extract endpoints and HTTP methods
- `analyze_repository` - Extract query methods
- `check_json_naming_strategy` - Detect camelCase vs snake_case

### Validation Phase
- `validate_maven_compile` - Run compile and return structured results
- `run_test_checkpoint` - Run tests and return parsed results

## Testing the Setup

### Quick Test (Direct)

```bash
# Test locally
node test-tool.mjs

# Or test manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js
```

### Test in Claude Code

Ask Claude Code:
```
Use the check_environment tool to verify my development environment
```

You should see structured output like:
```json
{
  "platform": "linux",
  "maven": {
    "available": true,
    "version": "3.9.12"
  },
  "java": {
    "available": true,
    "version": "17.0.2"
  },
  "container": {
    "runtime": "docker",
    "version": "24.0.5"
  }
}
```

## Special Environments

### Distrobox / Toolbox Users (Bazzite, Fedora Silverblue, etc.)

You have **two options** depending on where you run Claude Code:

#### Option A: Claude Code Inside Distrobox (Recommended for Bazzite)

**Best for:** Immutable systems where installing Node.js natively is difficult

1. **Use Method 1 (Node.js Direct)**
   - Build MCP server inside your distrobox: `npm install && npm run build`
   - Configure with `"command": "node"` in settings.json
   - Distrobox has Node.js, Maven, Java already installed

2. **Example config** (`~/.claude.json`):
   ```json
   {
     "mcpServers": {
       "spring-integration-test": {
         "command": "node",
         "args": ["/home/brandon/Dev/spring-integration-test-mcp/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

3. **Why this works:**
   - Distrobox shares your home directory
   - Paths like `/home/brandon/` work the same inside distrobox
   - Avoids podman path mapping issues (`/var/home` vs `/home`)

#### Option B: Claude Code on Native Host

**Best for:** If you can run Claude Code on your native Bazzite host

1. **Use Method 2 (Container)**
   - Build container on native host: `podman build -t spring-integration-test-mcp .`
   - Configure with `"command": "podman"` in settings.json
   - Container includes all dependencies

2. **Example config** (`~/.claude.json`):
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
           "/home/brandon/Dev/knostos/services/activity:/workspace",
           "spring-integration-test-mcp"
         ],
         "disabled": false
       }
     }
   }
   ```

3. **Build location:**
   - Always build the container image on the **native host**, not inside distrobox
   - Avoids podman storage path conflicts

### Bazzite Linux Specific

Bazzite ships with Podman by default. If you get `docker: command not found`:
- Use `podman` instead (same commands)
- Podman is already installed via the "bazaar" package manager

## Troubleshooting

### Server Not Found
- Verify the absolute path in your config is correct
- Check that `dist/index.js` exists (run `npm run build`)
- Restart Claude Code after config changes

### Tools Not Appearing
- Check Claude Code logs for MCP server errors
- Verify Node.js is installed and accessible (for node method)
- Verify Podman/Docker is installed (for container method)
- Ensure the server starts successfully: `node dist/index.js` or `podman run -i --rm spring-integration-test-mcp`

### Permission Errors (Container Method)
- Rebuild with your user ID: `podman build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t spring-integration-test-mcp .`
- Verify volume mount paths are absolute paths
- On Windows, use forward slashes in paths

### Container Issues
- **Command not found:** Replace `docker` with `podman` in your config if using Podman
- **Image not found:** Verify the image built successfully: `podman images | grep spring-integration-test-mcp`
- **Container exits immediately (when testing manually):** This is normal - the MCP server waits for stdio input from Claude Code
- **Podman storage errors in distrobox:**
  - Either: Build on your host system instead
  - Or: Use Method 1 (Node.js) inside distrobox
- **MCP server not appearing in Claude Code:**
  - Don't manually run the container - Claude Code manages it
  - Check if container is already running: `podman ps` - if so, stop it
  - Restart Claude Code completely
  - Verify config with `/mcp` command in Claude Code

## Development Mode

For development with auto-rebuild:

```bash
# Terminal 1: Watch for changes
npm run dev

# Terminal 2: Test changes
node test-tool.mjs
```

## Platform-Specific Notes

### Linux
- Default paths work as-is
- Supports both Docker and Podman

### macOS
- Uses `mvn` command
- Docker Desktop recommended

### Windows
- Uses `mvn.cmd` command
- Use double backslashes in config paths: `C:\\path\\to\\project`
- Git Bash or WSL recommended for development
