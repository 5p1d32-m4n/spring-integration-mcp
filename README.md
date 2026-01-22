# Spring Integration Test MCP Server

A token-efficient MCP server for Spring Boot integration testing. Returns structured JSON summaries instead of dumping entire files.

## Quick Start (Docker)

### 1. Build the image

```bash
# Using Docker
docker build -t spring-integration-test-mcp .

# Or using Podman
podman build -t spring-integration-test-mcp .
```

### 2. Add config to your Spring Boot project

Create `.mcp.json` in any Spring Boot project you want to test:

```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", ".:/workspace", "spring-integration-test-mcp"]
    }
  }
}
```

> Replace `docker` with `podman` if using Podman.
> For Codex CLI, use the global `config.toml` example below instead of `.mcp.json`.

### 3. Start Claude Code

```bash
cd /path/to/your/spring-boot-project
claude
```

Claude Code will prompt you to approve the MCP server. After approval, run `/mcp` to verify it's connected.

### 4. Start Codex CLI (global config)

Add this to your Codex config file (usually `~/.codex/config.toml` on Windows: `C:\Users\brandon.baker\.codex\config.toml`):

```toml
[mcp_servers.spring-integration-test]
command = "docker"
args = ["run", "-i", "--rm", "-v", "C:\\path\\to\\spring-boot-project:/workspace", "spring-integration-test-mcp"]
```

Restart Codex after saving `config.toml`. The server is started on demand when Codex uses a tool.

## Available Tools

### Environment
- `check_environment` - Verify Maven, Java, Docker/Podman availability

### Setup Phase
- `check_spring_boot_version` - Detect Spring Boot 2 vs 3, javax vs jakarta
- `find_missing_properties` - Find @Value properties missing from test config
- `find_beans_needing_exclusion` - Find beans needing @Profile("!test")

### Investigation Phase
- `investigate_jwt_claims` - Extract JWT claims structure
- `investigate_response_wrapper` - Check for {data: ...} response wrappers
- `investigate_entity_relationships` - Map entity dependencies
- `investigate_service` - Analyze service dependencies and exceptions
- `analyze_controller` - Extract endpoints, HTTP methods, auth requirements
- `analyze_repository` - Extract query methods, soft-delete info
- `check_json_naming_strategy` - Detect camelCase vs snake_case

### Validation Phase
- `validate_maven_compile` - Run compile and return structured pass/fail
- `run_test_checkpoint` - Run tests and return parsed results

## Example Usage

```
Use check_environment with projectPath "/workspace"
Use analyze_controller with projectPath "/workspace" and controllerName "UserController"
Use run_test_checkpoint with projectPath "/workspace" and testClass "UserControllerTest"
```

## Alternative: Run without Docker

If you prefer not to use Docker:

```bash
# Build
cd spring-integration-test-mcp
npm install
npm run build

# Create .mcp.json in your Spring Boot project
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "node",
      "args": ["/absolute/path/to/spring-integration-test-mcp/dist/index.js"]
    }
  }
}
```

## Distrobox (Bazzite / immutable Fedora) notes

If you are running Codex inside a Distrobox container, Podman inside the container
may fail with a storage DB mismatch (host vs container paths). In that case, use
one of the two approaches below.

### Option A (recommended): run the MCP server directly with Node

Build inside the container:

```bash
npm run build
```

Then point Codex to the compiled entrypoint:

```toml
[mcp_servers.spring-integration-test]
command = "node"
args = ["/home/brandon/Dev/spring-integration-test-mcp/dist/index.js"]
```

### Option B: use host Podman from inside Distrobox

Build the image on the host:

```bash
podman build -t spring-integration-test-mcp /home/brandon/Dev/spring-integration-test-mcp
```

Then call host Podman via `distrobox-host-exec`:

```toml
[mcp_servers.spring-integration-test]
command = "distrobox-host-exec"
args = ["podman","run","-i","--rm","-v","/home/brandon/Dev/your-spring-project:/workspace","spring-integration-test-mcp"]
```

## Troubleshooting

### MCP server not appearing
- Restart Claude Code after creating `.mcp.json`
- Run `/mcp` to check server status

### Docker image not found
```bash
docker images | grep spring-integration-test-mcp
```
If not listed, rebuild the image.

### Permission errors on mounted volumes
Rebuild with your user ID:
```bash
docker build --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t spring-integration-test-mcp .
```

## Platform Support

- Linux, macOS, Windows
- Docker or Podman
- Auto-detects `mvn` vs `mvn.cmd`
