# Spring Integration Test MCP Server

A Model Context Protocol (MCP) server optimized for **token-efficient** Spring Boot integration testing workflow. This server provides targeted code analysis tools that return structured summaries instead of dumping entire files, dramatically reducing token usage when working with Java/Spring Boot projects.

## 🎯 Key Features

**Token Savings:**
- Returns **structured JSON summaries** instead of full file contents
- **Targeted extraction** of JWT claims, entity relationships, endpoints
- **Parsed test results** instead of raw Maven output
- **Smart pattern matching** for common issues

**Integration Testing Workflow:**
- Follows the [INTEGRATION_TESTING_GUIDE.md](../INTEGRATION_TESTING_GUIDE.md) methodology
- Checkpoint validation tools
- Investigation helpers for the "5-minute investigation phase"
- Automated pitfall detection

## 📦 Installation

### Quick Install

**Linux/macOS:**
```bash
cd spring-integration-test-mcp
npm install
npm run build
```

**Windows:**
```powershell
cd spring-integration-test-mcp
npm install
npm run build
```

**See [PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md) for detailed platform-specific instructions and troubleshooting.**

## 🔧 Configuration

### Claude Code (CLI)

Add to your Claude Code config file:

**Linux/macOS:**
```bash
# Edit config
code ~/.config/claude/config.json
```

**Windows (PowerShell):**
```powershell
# Edit config
code $env:USERPROFILE\.config\claude\config.json
```

**Configuration:**
```json
{
  "mcpServers": {
    "spring-integration-test": {
      "command": "node",
      "args": ["/absolute/path/to/spring-integration-test-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

**Platform-specific paths:**

| Platform | Replace with |
|----------|-------------|
| Linux | `/home/brandon/Dev/spring-integration-test-mcp/dist/index.js` |
| macOS | `/Users/brandon/Dev/spring-integration-test-mcp/dist/index.js` |
| Windows | `C:\\Users\\Brandon\\Dev\\spring-integration-test-mcp\\dist\\index.js` |

### Claude Desktop (Optional)

**macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Linux:**
```bash
code ~/.config/Claude/claude_desktop_config.json
```

**Windows:**
```powershell
code $env:APPDATA\Claude\claude_desktop_config.json
```

Same JSON configuration as above.

### Restart

- **Claude Code:** Restart your terminal or run `source ~/.bashrc` / `source ~/.zshrc`
- **Claude Desktop:** Completely close and reopen the application

## 🛠️ Available Tools

### Environment Tools

#### `check_environment`
Verifies development environment setup: Maven, Java, Docker/Podman, platform detection.

**Example:**
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

**Why This Matters:**
- Detects **Podman** automatically if Docker is not available
- Platform-specific Maven command detection (mvn vs mvn.cmd)
- Validates prerequisites before starting test development

**Token Savings:** Returns 400 chars vs running multiple shell commands manually

---

### Setup Phase Tools

#### `check_spring_boot_version`
Detects Spring Boot 2 vs 3, Java version, and returns correct import statements.

**Example:**
```json
{
  "springBootVersion": "2.7.0",
  "javaVersion": "11",
  "persistenceApi": "javax.persistence.*",
  "recommendations": {
    "imports": "Use javax.persistence.* imports",
    "testDependencies": "Use JUnit 5.11.4, Mockito 5.14.2"
  }
}
```

**Token Savings:** Returns 200 chars instead of reading 1000+ line pom.xml

---

#### `find_missing_properties`
Scans all `@Value` annotations and checks what's missing from test config.

**Example:**
```json
{
  "totalProperties": 12,
  "missingProperties": ["jwt.secret", "team.webhook"],
  "action": "Add these 2 properties to application-test.properties"
}
```

**Token Savings:** Returns only missing properties instead of dumping entire codebase

---

#### `find_beans_needing_exclusion`
Identifies `@Configuration/@Service/@Component` beans that need `@Profile("!test")`.

**Example:**
```json
{
  "found": 3,
  "beansToExclude": [
    {
      "file": "ServiceConfig",
      "reason": ["aws", "s3"]
    }
  ],
  "action": "Add @Profile(\"!test\") to these 3 classes"
}
```

**Token Savings:** Returns 300 chars instead of reading dozens of config files

---

### Investigation Phase Tools

#### `investigate_jwt_claims`
Extracts required JWT claims from `JwtTokenUtil` without reading full file.

**Example:**
```json
{
  "found": true,
  "standardClaims": {
    "jti": "getUserId()",
    "sub": "getEmail()"
  },
  "customClaims": ["company_id", "company_uuid"],
  "recommendation": "Include these claims in BaseIntegrationTest.generateTestToken()"
}
```

**Token Savings:** Returns 200 chars instead of 800+ line security file

---

#### `investigate_response_wrapper`
Checks if responses are wrapped in `{data: ...}` structure.

**Example:**
```json
{
  "hasWrapper": true,
  "wrapperField": "data",
  "jsonPathPrefix": "$.data",
  "recommendation": "Use jsonPath(\"$.data.id\") in controller tests"
}
```

**Token Savings:** Returns 150 chars instead of reading entire controller advice

---

#### `investigate_entity_relationships`
Maps entity dependencies (@ManyToOne, @OneToMany) and creation order.

**Example:**
```json
{
  "entity": "Activity",
  "inheritance": "BaseModel",
  "discriminator": true,
  "relationships": {
    "manyToOne": [
      {"type": "ActivityTemplate", "field": "template", "required": true}
    ]
  },
  "creationOrder": [
    "1. Create ActivityTemplate first (required dependency)",
    "2. Create Activity"
  ],
  "warning": "⚠️ Use specific subclass, not base Activity class"
}
```

**Token Savings:** Returns 400 chars instead of 2000+ line entity file

---

#### `analyze_controller`
Extracts endpoints, HTTP methods, auth requirements without reading full file.

**Example:**
```json
{
  "controller": "UserController",
  "basePath": "/api/users",
  "requiresAuth": true,
  "endpoints": [
    {"method": "GET", "path": "/api/users", "handlerMethod": "getUsers"},
    {"method": "POST", "path": "/api/users", "handlerMethod": "createUser"}
  ],
  "testRecommendation": {
    "authTests": "Write auth tests first (401 unauthorized)",
    "crudTests": "Write tests for 2 endpoints"
  }
}
```

**Token Savings:** Returns 300 chars instead of 1500+ line controller

---

#### `check_json_naming_strategy`
Detects camelCase vs snake_case from DTOs.

**Example:**
```json
{
  "filesAnalyzed": 15,
  "primaryStrategy": "snake_case",
  "recommendation": "Use snake_case in JSON: {\"company_id\": 100}"
}
```

**Token Savings:** Returns 100 chars instead of reading 15 DTO files

---

#### `analyze_repository`
Extracts query methods and soft-delete info.

**Example:**
```json
{
  "repository": "UserRepository",
  "queryMethodCount": 8,
  "hasSoftDelete": true,
  "testRecommendation": {
    "softDeleteWarning": "⚠️ Always set .deleted(false) in test data"
  }
}
```

**Token Savings:** Returns 250 chars instead of full repository interface

---

#### `investigate_service`
Analyzes service dependencies, methods, and exceptions.

**Example:**
```json
{
  "service": "UserService",
  "repositoryDependencies": ["UserRepository", "RoleRepository"],
  "publicMethods": ["createUser", "updateUser", "deleteUser"],
  "exceptionTypes": ["BadRequestException", "NotFoundException"],
  "testRecommendation": {
    "setup": "Autowire: UserService and UserRepository, RoleRepository",
    "exceptions": "Write tests for BadRequestException, NotFoundException"
  }
}
```

**Token Savings:** Returns 300 chars instead of 2000+ line service file

---

### Checkpoint Validation Tools

#### `validate_maven_compile`
Runs `mvn clean compile test-compile` and returns structured pass/fail.

**Example:**
```json
{
  "success": false,
  "message": "✗ BUILD FAILED",
  "errors": [
    "package jakarta.persistence does not exist",
    "cannot find symbol: class EntityManager"
  ],
  "recommendation": "Fix compilation errors before writing tests"
}
```

**Token Savings:** Returns 200 chars instead of 5000+ chars of Maven output

---

#### `run_test_checkpoint`
Runs specific test and returns parsed results.

**Example:**
```json
{
  "success": true,
  "testsRun": 5,
  "failures": 0,
  "errors": 0,
  "recommendation": "✓ Tests passed - continue to next batch"
}
```

**When failures occur:**
```json
{
  "success": false,
  "testsRun": 5,
  "failures": 2,
  "failureMessages": [
    "Expected: <200> but was: <401> - JWT claims missing"
  ],
  "recommendation": "✗ Fix failures before continuing"
}
```

**Token Savings:** Returns 300 chars instead of 3000+ chars of test output

---

## 📚 Usage Examples

### Phase 1: Setup Investigation

```
Use investigate_jwt_claims to find required JWT claims for the activity service
```

Returns structured claims list instead of dumping JwtTokenUtil.java

### Phase 2: Pre-Test Investigation

```
1. Use check_spring_boot_version on /path/to/project
2. Use investigate_response_wrapper on /path/to/project
3. Use analyze_controller with controllerName "ActivityController"
4. Use investigate_entity_relationships with entityName "Activity"
```

Gets all investigation checklist data in 4 calls with ~1KB total vs ~50KB reading files

### Phase 3: Test Writing

```
1. Write authentication tests
2. Use run_test_checkpoint with testClass "ActivityControllerTest" and testMethod "testGetActivity_Unauthorized"
3. If passes, write CRUD tests
4. Use run_test_checkpoint with testClass "ActivityControllerTest"
```

Iterative batch validation with parsed results

### Phase 4: Checkpoint Validation

```
Use validate_maven_compile to verify setup before writing tests
```

Get pass/fail + error summary instead of full Maven output

## 🎯 Token Efficiency Comparison

**Traditional Approach (Reading Files):**
```
1. Read JwtTokenUtil.java (800 lines) = ~3KB
2. Read ControllerAdvice.java (200 lines) = ~800 bytes
3. Read Activity.java (500 lines) = ~2KB
4. Read ActivityController.java (300 lines) = ~1.2KB
5. Read test output (200 lines) = ~5KB

Total: ~12KB for investigation phase
```

**MCP Server Approach:**
```
1. investigate_jwt_claims = 200 bytes
2. investigate_response_wrapper = 150 bytes
3. investigate_entity_relationships = 400 bytes
4. analyze_controller = 300 bytes
5. run_test_checkpoint = 300 bytes

Total: ~1.3KB for investigation phase (10x reduction!)
```

## 🔄 Integration with INTEGRATION_TESTING_GUIDE.md

This MCP server directly implements the investigation checklist from the guide:

| Guide Step | MCP Tool | Token Savings |
|------------|----------|---------------|
| "Check JWT claims" | `investigate_jwt_claims` | 95% fewer tokens |
| "Check response wrapper" | `investigate_response_wrapper` | 90% fewer tokens |
| "Check entity relationships" | `investigate_entity_relationships` | 85% fewer tokens |
| "Find missing properties" | `find_missing_properties` | 90% fewer tokens |
| "Run checkpoint validation" | `validate_maven_compile`, `run_test_checkpoint` | 95% fewer tokens |

## 🚀 Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Test a specific tool
node dist/index.js
# Then send MCP request via stdio
```

## 📝 Adding New Tools

1. Add tool definition to `TOOLS` array
2. Implement handler function
3. Add case to switch statement in request handler
4. Update README with examples

## 🐛 Debugging

Enable MCP server logs in Claude Desktop:
1. Help → Show Logs
2. Look for "spring-integration-test" server messages

## 🌍 Platform Support

**Fully supported on:**
- ✅ Linux (Ubuntu, Fedora, Arch)
- ✅ macOS (11.0+)
- ✅ Windows (10, 11 with PowerShell)

**Automatic detection:**
- Platform-specific Maven commands (`mvn` vs `mvn.cmd`)
- Docker OR Podman (automatic fallback)
- Maven wrapper detection

**See [PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md) for:**
- Platform-specific installation
- Docker vs Podman setup
- Troubleshooting guide
- WSL2 configuration

## 🐳 Container Runtime Support

**Automatic Detection:**
The MCP server automatically detects and uses Docker or Podman:

```
Use check_environment
```

Returns:
```json
{
  "container": {
    "runtime": "podman",  // or "docker" or "none"
    "version": "4.8.0"
  }
}
```

**No Docker?** Install Podman as a drop-in replacement:
- **Linux:** `sudo apt-get install podman` or `sudo dnf install podman`
- **macOS:** `brew install podman && podman machine init && podman machine start`
- **Windows:** `winget install RedHat.Podman`

The server works without containers - they're optional for future features.

## 📄 License

MIT

## 🤝 Contributing

This MCP server follows the patterns from INTEGRATION_TESTING_GUIDE.md. When adding tools:
- Return structured JSON, not raw file dumps
- Focus on extraction, not reading
- Provide actionable recommendations
- Include "why" explanations
- Support Windows, macOS, and Linux

## 🔗 Related

- [INTEGRATION_TESTING_GUIDE.md](../INTEGRATION_TESTING_GUIDE.md) - The guide this server implements
- [PLATFORM_SUPPORT.md](PLATFORM_SUPPORT.md) - Detailed platform-specific setup
- [QUICKSTART.md](QUICKSTART.md) - Quick start for your platform
- [MCP Documentation](https://modelcontextprotocol.io/) - Official MCP protocol docs
