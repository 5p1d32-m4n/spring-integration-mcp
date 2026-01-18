# Quick Start Guide

## Platform-Specific Setup

Choose your platform below and follow the instructions.

---

## 🐧 Linux Setup

### 1. Install Dependencies
```bash
cd ~/Dev/spring-integration-test-mcp
npm install
npm run build
```

### 2. Configure Claude Code

**Edit config:**
```bash
mkdir -p ~/.config/claude
nano ~/.config/claude/config.json
```

**Or copy the example:**
```bash
cp config-examples/linux-claude-code.json ~/.config/claude/config.json
# Edit the file and replace YOUR_USERNAME with your actual username
```

**Configuration:**
```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "node",
      "args": ["/home/YOUR_USERNAME/Dev/spring-integration-test-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**Replace `YOUR_USERNAME` with your actual username!**

### 3. Verify Installation

```bash
# In Claude Code terminal
claude --help

# Test the MCP server
Use check_environment
```

---

## 🍎 macOS Setup

### 1. Install Dependencies
```bash
cd ~/Dev/spring-integration-test-mcp
npm install
npm run build
```

### 2. Configure Claude Code

**Edit config:**
```bash
mkdir -p ~/.config/claude
code ~/.config/claude/config.json
```

**Or copy the example:**
```bash
cp config-examples/macos-claude-code.json ~/.config/claude/config.json
# Edit the file and replace YOUR_USERNAME with your actual username
```

**Configuration:**
```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/Dev/spring-integration-test-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**Replace `YOUR_USERNAME` with your actual username!**

### 3. Verify Installation

```bash
# In Claude Code terminal
claude --help

# Test the MCP server
Use check_environment
```

---

## 🪟 Windows Setup

### 1. Install Dependencies

**PowerShell:**
```powershell
cd $env:USERPROFILE\Dev\spring-integration-test-mcp
npm install
npm run build
```

**Command Prompt:**
```cmd
cd %USERPROFILE%\Dev\spring-integration-test-mcp
npm install
npm run build
```

### 2. Configure Claude Code

**Edit config (PowerShell):**
```powershell
mkdir $env:USERPROFILE\.config\claude -Force
notepad $env:USERPROFILE\.config\claude\config.json
```

**Or copy the example:**
```powershell
Copy-Item config-examples\windows-claude-code.json $env:USERPROFILE\.config\claude\config.json
# Edit the file and replace YOUR_USERNAME with your actual username
```

**Configuration:**
```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "node",
      "args": ["C:\\Users\\YOUR_USERNAME\\Dev\\spring-integration-test-mcp\\dist\\index.js"],
      "env": {}
    }
  }
}
```

**IMPORTANT:**
- Use **double backslashes** (`\\`) in Windows paths
- Replace `YOUR_USERNAME` with your actual Windows username

### 3. Verify Installation

**PowerShell or CMD:**
```powershell
# In Claude Code
claude --help

# Test the MCP server
Use check_environment
```

---

## 🐳 Docker/Podman Detection

The MCP server automatically detects and uses:
1. **Docker** (if available)
2. **Podman** (if Docker is not available)
3. **Neither** (continues without container runtime)

**Check what's available:**
```
Use check_environment
```

**Install Podman as Docker alternative:**

**Linux:**
```bash
# Debian/Ubuntu
sudo apt-get install podman

# Fedora
sudo dnf install podman

# Arch
sudo pacman -S podman
```

**macOS:**
```bash
brew install podman
podman machine init
podman machine start
```

**Windows:**
```powershell
# Using winget
winget install RedHat.Podman

# Or download installer from:
# https://podman.io/getting-started/installation
```

---

## ✅ Verify Complete Setup

Run this command in Claude Code to verify everything:

```
Use check_environment with projectPath "/path/to/your/spring/project"
```

**Expected output:**
```json
{
  "platform": "linux",
  "maven": {
    "available": true,
    "version": "3.9.6"
  },
  "java": {
    "available": true,
    "version": "17.0.9"
  },
  "container": {
    "runtime": "podman",
    "version": "4.8.0"
  },
  "mavenWrapper": true,
  "recommendations": [
    "Maven wrapper found - use ./mvnw instead of mvn"
  ]
}
```

---

## Usage Workflow

### Phase 1: Setup Investigation (Before Writing Any Tests)

```
I'm setting up integration tests for the activity microservice at /home/brandon/Dev/knostos/services/activity

1. Use check_spring_boot_version
2. Use find_missing_properties
3. Use find_beans_needing_exclusion
4. Use investigate_jwt_claims
```

**Result:** You'll get structured summaries of what needs to be configured, using ~1KB of tokens instead of ~10KB.

---

### Phase 2: Component Investigation (Before Writing Tests for a Component)

**For Controller:**
```
I'm about to write tests for ActivityController

1. Use analyze_controller with controllerName "ActivityController"
2. Use investigate_response_wrapper
3. Use check_json_naming_strategy with dtoPackage "com.medido.activity.dto"
```

**For Service:**
```
I'm about to write tests for ActivityService

1. Use investigate_service with serviceName "ActivityService"
```

**For Repository:**
```
I'm about to write tests for ActivityRepository

1. Use analyze_repository with repositoryName "ActivityRepository"
```

**For Entity:**
```
I need to create test data for Activity entity

1. Use investigate_entity_relationships with entityName "Activity"
```

**Result:** Complete investigation checklist in 3-4 tool calls, ~500 bytes instead of reading multiple files.

---

### Phase 3: Checkpoint Validation (During Test Writing)

**After writing setup code:**
```
Use validate_maven_compile
```

**After writing authentication tests:**
```
Use run_test_checkpoint with testClass "ActivityControllerTest" and testMethod "testGetActivity_Unauthorized"
```

**After writing CRUD batch:**
```
Use run_test_checkpoint with testClass "ActivityControllerTest"
```

**Result:** Get structured pass/fail with error summaries instead of raw Maven output.

---

## Example: Complete Workflow for Writing Controller Tests

### Step 1: Investigation
```
I'm writing integration tests for ActivityController at /home/brandon/Dev/knostos/services/activity

Run the investigation phase:
1. check_spring_boot_version
2. analyze_controller with controllerName "ActivityController"
3. investigate_response_wrapper
4. investigate_jwt_claims
```

**Claude returns:**
```json
{
  "springBootVersion": "2.7.0",
  "persistenceApi": "javax.persistence.*"
}

{
  "basePath": "/api/activities",
  "requiresAuth": true,
  "endpoints": [
    {"method": "GET", "path": "/api/activities", "handlerMethod": "getActivities"},
    {"method": "POST", "path": "/api/activities", "handlerMethod": "createActivity"}
  ]
}

{
  "hasWrapper": true,
  "jsonPathPrefix": "$.data"
}

{
  "customClaims": ["company_id", "company_uuid"]
}
```

**Token usage:** ~800 bytes instead of ~8KB

---

### Step 2: Write Tests Based on Investigation

```
Based on the investigation:
- Spring Boot 2 (use javax.persistence)
- Responses wrapped in $.data
- Requires company_id and company_uuid claims
- 2 endpoints to test

Write ActivityControllerTest following the batch approach
```

---

### Step 3: Validate Each Batch

**After authentication tests:**
```
Use run_test_checkpoint with testClass "ActivityControllerTest" and testMethod "testGetActivities_Unauthorized"
```

**Result:**
```json
{
  "success": true,
  "testsRun": 1,
  "recommendation": "✓ Tests passed - continue to next batch"
}
```

**After CRUD tests:**
```
Use run_test_checkpoint with testClass "ActivityControllerTest"
```

**Result:**
```json
{
  "success": false,
  "failures": 1,
  "failureMessages": [
    "Expected: <3> but was: <0> - Check soft-delete field"
  ]
}
```

**Token usage per checkpoint:** ~300 bytes instead of ~3KB

---

## Tips for Maximum Token Efficiency

### ✅ DO:
- Use MCP tools for **investigation** and **validation**
- Let Claude **read templates** from the guide for test structure
- Use `run_test_checkpoint` after each batch to catch issues early
- Use `investigate_entity_relationships` before creating test data

### ❌ DON'T:
- Ask Claude to read entire controller files (use `analyze_controller`)
- Ask Claude to read JwtTokenUtil (use `investigate_jwt_claims`)
- Ask Claude to parse Maven output (use `validate_maven_compile` or `run_test_checkpoint`)
- Read entities to find relationships (use `investigate_entity_relationships`)

---

## Troubleshooting

### MCP Server Not Showing Up

1. Check config file path is correct
2. Verify `dist/index.js` exists (run `npm run build`)
3. Restart Claude Desktop completely
4. Check logs: Help → Show Logs

### Tool Execution Fails

1. Verify project path is absolute
2. Check Maven is installed (`mvn -version`)
3. Ensure project has `pom.xml` at root

### Wrong Results

1. Verify class names match exactly (case-sensitive)
2. Check project path is correct
3. Try running `validate_maven_compile` first to ensure project compiles

---

## Advanced Usage

### Custom Investigation Workflows

Combine multiple tools for specific scenarios:

**"I'm stuck on authentication issues"**
```
1. Use investigate_jwt_claims
2. Use validate_maven_compile (to check JWT library)
3. Use run_test_checkpoint with auth test
```

**"Entity relationships are complex"**
```
1. Use investigate_entity_relationships with "Activity"
2. Use investigate_entity_relationships with "ActivityTemplate"
3. Use investigate_entity_relationships with "ActivityType"
```

**"Tests are failing mysteriously"**
```
1. Use run_test_checkpoint (get error summary)
2. Use investigate_entity_relationships (check if missing dependencies)
3. Use find_missing_properties (check config)
```

---

## Next Steps

Once comfortable with basic workflow:

1. **Read INTEGRATION_TESTING_GUIDE.md** for complete methodology
2. **Create BaseIntegrationTest** using guide templates
3. **Use MCP tools for investigation** instead of reading files
4. **Follow batch + checkpoint workflow** from the guide

---

## Support

- **Guide:** See [INTEGRATION_TESTING_GUIDE.md](../INTEGRATION_TESTING_GUIDE.md)
- **MCP Docs:** https://modelcontextprotocol.io/
- **Issues:** Check server logs in Claude Desktop (Help → Show Logs)
