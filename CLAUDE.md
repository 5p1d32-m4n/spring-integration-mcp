# CLAUDE.md - Spring Integration Test MCP Server

## Project Overview

A token-efficient MCP server for Spring Boot integration testing. Returns structured JSON summaries instead of dumping entire files, dramatically reducing token usage.

## Build & Run

```bash
npm install
npm run build
npm start
```

## Architecture

- **Language**: TypeScript
- **SDK**: @modelcontextprotocol/sdk
- **Transport**: stdio
- **Entry**: dist/index.js (compiled from src/index.ts)

## Tool Categories

### Environment Tools
- `check_environment` - Verify Maven, Java, Docker/Podman availability

### Setup Phase Tools
- `check_spring_boot_version` - Detect Spring Boot 2 vs 3, javax vs jakarta imports
- `find_missing_properties` - Find @Value properties missing from test config
- `find_beans_needing_exclusion` - Find beans needing @Profile("!test")

### Investigation Phase Tools
- `investigate_jwt_claims` - Extract JWT claims structure
- `investigate_response_wrapper` - Check for {data: ...} response wrappers
- `investigate_entity_relationships` - Map @ManyToOne/@OneToMany dependencies
- `investigate_service` - Analyze service dependencies and exceptions
- `analyze_controller` - Extract endpoints, HTTP methods, auth requirements
- `analyze_repository` - Extract query methods, soft-delete info
- `check_json_naming_strategy` - Detect camelCase vs snake_case

### Checkpoint Validation Tools
- `validate_maven_compile` - Run compile and return structured pass/fail
- `run_test_checkpoint` - Run tests and return parsed results

## Key Design Principles

### Token Efficiency
- Return JSON summaries, not full file contents
- Extract only relevant information
- Provide actionable recommendations

### Non-Intrusive Testing
- Read-only analysis of production code
- No modifications to source files
- Safe for CI/CD pipelines

## Workflow

1. `check_environment` - Verify prerequisites
2. `check_spring_boot_version` - Detect project configuration
3. Investigation tools - Gather context for test writing
4. `validate_maven_compile` - Verify code compiles
5. `run_test_checkpoint` - Run and validate tests

## Adding New Tools

1. Add tool definition to `TOOLS` array in `src/index.ts`
2. Implement handler function
3. Add case to switch statement in request handler
4. Rebuild: `npm run build`

## Platform Support

- Linux, macOS, Windows
- Auto-detects Docker or Podman
- Platform-specific Maven commands (mvn vs mvn.cmd)
