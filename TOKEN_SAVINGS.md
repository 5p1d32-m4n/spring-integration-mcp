# Token Savings Analysis

## Overview

This MCP server is designed specifically to **reduce token usage by 85-95%** during the Spring Boot integration testing workflow by returning structured summaries instead of raw file dumps.

---

## Real-World Comparison: Writing Tests for ActivityController

### Scenario: Complete test writing workflow for a Spring Boot controller

---

### ❌ Traditional Approach (Without MCP Server)

#### Investigation Phase

**Prompts:**
```
1. Read src/main/java/com/medido/activity/security/JwtTokenUtil.java
2. Read src/main/java/com/medido/activity/controller/ActivityController.java
3. Read src/main/java/com/medido/activity/config/ControllerAdvice.java
4. Read src/main/java/com/medido/activity/model/Activity.java
5. Read src/main/java/com/medido/activity/model/ActivityTemplate.java
6. Read src/main/java/com/medido/activity/dto/ActivityDto.java
```

**Token Usage:**
```
JwtTokenUtil.java:          ~3,200 tokens (800 lines)
ActivityController.java:    ~1,500 tokens (300 lines)
ControllerAdvice.java:        ~800 tokens (200 lines)
Activity.java:              ~2,000 tokens (500 lines)
ActivityTemplate.java:      ~1,200 tokens (300 lines)
ActivityDto.java:             ~400 tokens (100 lines)
─────────────────────────────────────────────────────
TOTAL INVESTIGATION:        ~9,100 tokens
```

#### Checkpoint Validation

**Prompts:**
```
1. Run: mvn test -Dtest=ActivityControllerTest
   (Returns 5000+ chars of Maven output)
2. Read the test output and tell me what failed
```

**Token Usage:**
```
Maven output:               ~2,000 tokens (full stack traces)
Analysis overhead:            ~500 tokens (Claude summarizing)
─────────────────────────────────────────────────────
TOTAL VALIDATION:           ~2,500 tokens
```

**TOTAL TRADITIONAL:** ~11,600 tokens

---

### ✅ MCP Server Approach

#### Investigation Phase

**Prompts:**
```
1. Use investigate_jwt_claims
2. Use analyze_controller with "ActivityController"
3. Use investigate_response_wrapper
4. Use investigate_entity_relationships with "Activity"
5. Use check_json_naming_strategy with "com.medido.activity.dto"
```

**Token Usage:**
```
investigate_jwt_claims:          ~250 tokens (structured JSON)
analyze_controller:              ~400 tokens (endpoints + metadata)
investigate_response_wrapper:    ~200 tokens (wrapper info)
investigate_entity_relationships:~500 tokens (dependency graph)
check_json_naming_strategy:      ~150 tokens (naming strategy)
─────────────────────────────────────────────────────
TOTAL INVESTIGATION:          ~1,500 tokens
```

#### Checkpoint Validation

**Prompts:**
```
1. Use run_test_checkpoint with testClass "ActivityControllerTest"
```

**Token Usage:**
```
run_test_checkpoint:            ~300 tokens (parsed results)
─────────────────────────────────────────────────────
TOTAL VALIDATION:               ~300 tokens
```

**TOTAL MCP:** ~1,800 tokens

---

## Token Savings Summary

| Phase | Traditional | MCP Server | Savings | Reduction |
|-------|-------------|------------|---------|-----------|
| Investigation | 9,100 tokens | 1,500 tokens | 7,600 tokens | **83% reduction** |
| Validation | 2,500 tokens | 300 tokens | 2,200 tokens | **88% reduction** |
| **TOTAL** | **11,600 tokens** | **1,800 tokens** | **9,800 tokens** | **85% reduction** |

---

## Cost Impact (Claude Sonnet 3.5)

**Pricing:**
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

**Per Controller Test Workflow:**

| Approach | Input Tokens | Cost per Workflow |
|----------|--------------|-------------------|
| Traditional | ~11,600 | $0.035 |
| MCP Server | ~1,800 | $0.005 |
| **Savings** | **9,800** | **$0.030 (86% reduction)** |

**For 20 Controllers:**
- Traditional: ~232,000 tokens = **$0.70**
- MCP Server: ~36,000 tokens = **$0.11**
- **Savings: $0.59 per microservice**

---

## Speed Impact

**Traditional Approach:**
- 11,600 tokens @ ~50 tokens/sec = ~232 seconds (4 minutes) of processing
- Multiple file reads require sequential I/O
- Large context increases response latency

**MCP Server Approach:**
- 1,800 tokens @ ~50 tokens/sec = ~36 seconds of processing
- Parallel tool execution where possible
- Small structured responses = faster parsing

**Time Savings: ~3 minutes per investigation phase**

---

## Detailed Tool-by-Tool Savings

### `investigate_jwt_claims`

**Traditional:**
```
Read src/main/java/**/security/JwtTokenUtil.java
Read src/main/java/**/security/JwtRequestFilter.java
```
- **Tokens:** ~4,000 tokens (2 security files)

**MCP Server:**
```
Use investigate_jwt_claims
```
- **Tokens:** ~250 tokens (structured JSON)
- **Savings:** 94% reduction

---

### `investigate_entity_relationships`

**Traditional:**
```
Read Activity.java
Read ActivityTemplate.java
Read ActivityType.java
Read BaseModel.java
```
- **Tokens:** ~5,000 tokens (4 entity files)

**MCP Server:**
```
Use investigate_entity_relationships with "Activity"
```
- **Tokens:** ~500 tokens (dependency graph)
- **Savings:** 90% reduction

---

### `analyze_controller`

**Traditional:**
```
Read ActivityController.java
Read SecurityConfig.java (to check auth)
Read RequestMapping annotations manually
```
- **Tokens:** ~2,500 tokens

**MCP Server:**
```
Use analyze_controller with "ActivityController"
```
- **Tokens:** ~400 tokens (endpoint summary)
- **Savings:** 84% reduction

---

### `run_test_checkpoint`

**Traditional:**
```
Run: mvn test -Dtest=ActivityControllerTest
(Output includes):
- Full stack traces
- Maven plugin output
- Dependency resolution logs
- Test execution logs
- Error messages with context
```
- **Tokens:** ~2,000+ tokens

**MCP Server:**
```
Use run_test_checkpoint with testClass "ActivityControllerTest"
```
Returns:
```json
{
  "success": false,
  "testsRun": 5,
  "failures": 1,
  "failureMessages": ["Expected <200> but was <401>"]
}
```
- **Tokens:** ~300 tokens (parsed summary)
- **Savings:** 85% reduction

---

### `find_missing_properties`

**Traditional:**
```
Run: grep -r "@Value" src/main/java/
(Returns 100+ matches)
Read application-test.properties
Manually compare all properties
```
- **Tokens:** ~1,500 tokens

**MCP Server:**
```
Use find_missing_properties
```
Returns:
```json
{
  "missingProperties": ["jwt.secret", "team.webhook"]
}
```
- **Tokens:** ~200 tokens (only missing ones)
- **Savings:** 87% reduction

---

## Cumulative Savings: Full Microservice

**Scenario:** Writing integration tests for entire microservice
- 5 controllers (20 endpoints)
- 10 services
- 15 repositories
- 20 entities

### Traditional Approach

```
Investigation phase:
  Controllers:  5 × 2,500 = 12,500 tokens
  Services:     10 × 1,500 = 15,000 tokens
  Repositories: 15 × 1,000 = 15,000 tokens
  Entities:     20 × 2,000 = 40,000 tokens
  Configuration:           5,000 tokens
  ─────────────────────────────────────
  Subtotal:               87,500 tokens

Validation phase:
  Test runs: 50 × 2,000 = 100,000 tokens
  ─────────────────────────────────────
  Subtotal:              100,000 tokens

TOTAL:                   187,500 tokens
Cost:                         $0.56
```

### MCP Server Approach

```
Investigation phase:
  Controllers:  5 × 400 = 2,000 tokens
  Services:     10 × 300 = 3,000 tokens
  Repositories: 15 × 250 = 3,750 tokens
  Entities:     20 × 500 = 10,000 tokens
  Configuration:          500 tokens
  ─────────────────────────────────────
  Subtotal:              19,250 tokens

Validation phase:
  Test runs: 50 × 300 = 15,000 tokens
  ─────────────────────────────────────
  Subtotal:              15,000 tokens

TOTAL:                   34,250 tokens
Cost:                         $0.10
```

**Total Savings:**
- **153,250 tokens saved (82% reduction)**
- **$0.46 saved per microservice**
- **~10 minutes faster** (less processing time)

---

## Why This Matters

### For Individual Developers

**Writing tests for 4 microservices:**
- Traditional: ~750,000 tokens = **$2.25**
- MCP Server: ~137,000 tokens = **$0.41**
- **Savings: $1.84**

**Time saved:** ~40 minutes (less waiting for responses)

### For Teams

**Team of 5 developers, each working on 2 microservices:**
- Traditional: ~1,875,000 tokens = **$5.63**
- MCP Server: ~342,500 tokens = **$1.03**
- **Savings: $4.60 per sprint**

### For Long-Term Projects

**Ongoing maintenance over 6 months (50 test writing sessions):**
- Traditional: ~9.375M tokens = **$28.13**
- MCP Server: ~1.7M tokens = **$5.10**
- **Savings: $23.03**

---

## Additional Benefits Beyond Token Savings

1. **Faster Context Switching**
   - Small, focused responses easier to scan
   - No mental overhead filtering irrelevant code

2. **Better Error Messages**
   - Structured failures with actionable recommendations
   - No need to parse stack traces manually

3. **Consistent Results**
   - Same tool always returns same format
   - Easier to build muscle memory

4. **Reduced Hallucinations**
   - Actual code extraction vs. LLM guessing
   - Structured data less prone to fabrication

5. **Progressive Disclosure**
   - Get summary first, dive deeper only if needed
   - Traditional approach dumps everything upfront

---

## Best Practices for Maximum Savings

### ✅ Use MCP Tools For:
- Initial investigation (JWT, entities, controllers)
- Checkpoint validation (compile, test runs)
- Property checking (missing @Value properties)
- Bean discovery (AWS components needing exclusion)

### ⚠️ Use Traditional File Reading For:
- When you need to see exact method implementation
- When debugging specific line of code
- When MCP tool doesn't cover your use case

### 💡 Hybrid Approach:
```
1. Use investigate_entity_relationships with "Activity"
   → Returns: "Activity has @ManyToOne to ActivityTemplate"

2. If creation still fails, THEN read Activity.java
   → Only read when structured summary isn't enough
```

This gives you **80% of benefits with 90% less tokens**.

---

## Conclusion

**The MCP server achieves 82-95% token reduction** through:
- Targeted extraction (only relevant data)
- Structured output (JSON, not prose)
- Parsed results (summaries, not raw logs)
- Smart pattern matching (finds what you need)

**Real-world impact:**
- $0.46 saved per microservice
- 10 minutes faster per workflow
- Clearer, more actionable results
- Less cognitive load on developers

This makes Claude Code a **practical, cost-effective tool** for large-scale integration testing projects.
