#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, access } from "fs/promises";
import { glob } from "glob";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { platform } from "os";

const execAsync = promisify(exec);
const DEFAULT_WORKSPACE = process.env.MCP_WORKSPACE || "/workspace";

// Detect container runtime (Docker or Podman)
let containerRuntime: string | null = null;

async function detectContainerRuntime(): Promise<string> {
  if (containerRuntime) return containerRuntime;

  // Try Docker first
  try {
    await execAsync("docker --version");
    containerRuntime = "docker";
    return containerRuntime;
  } catch (error) {
    // Docker not available
  }

  // Try Podman as fallback
  try {
    await execAsync("podman --version");
    containerRuntime = "podman";
    return containerRuntime;
  } catch (error) {
    // Neither available
  }

  return "none";
}

// Get Maven command based on platform
function getMavenCommand(): string {
  const isWindows = platform() === "win32";
  return isWindows ? "mvn.cmd" : "mvn";
}

function resolveProjectPath(input?: string): string {
  if (!input || input.trim() === "") return DEFAULT_WORKSPACE;
  if (/^[A-Za-z]:\\/.test(input)) return DEFAULT_WORKSPACE;
  return input;
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "check_environment",
    description: "Check development environment: Maven, Java, Docker/Podman availability, platform info",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Optional: Path to verify Maven wrapper exists",
        },
      },
    },
  },
  {
    name: "investigate_jwt_claims",
    description: "Extract JWT claim structure from JwtTokenUtil/JwtRequestFilter without reading full file. Returns only the claims that production code expects.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "investigate_response_wrapper",
    description: "Check if controller responses are wrapped in {data: ...} structure. Returns boolean and wrapper class info.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "investigate_entity_relationships",
    description: "Map entity relationships (@ManyToOne, @OneToMany) for a specific entity. Returns dependency graph without full file content.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
        entityName: {
          type: "string",
          description: "Name of the entity class to investigate",
        },
      },
      required: ["projectPath", "entityName"],
    },
  },
  {
    name: "find_missing_properties",
    description: "Find all @Value properties in production code and check which are missing from application-test.properties",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "validate_maven_compile",
    description: "Run 'mvn clean compile test-compile' and return structured results (pass/fail, error summary)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "run_test_checkpoint",
    description: "Run specific test class or method and return structured results (pass/fail counts, failure messages)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
        testClass: {
          type: "string",
          description: "Test class name (e.g., 'SmokeTest' or 'UserControllerTest')",
        },
        testMethod: {
          type: "string",
          description: "Optional: specific test method name",
        },
      },
      required: ["projectPath", "testClass"],
    },
  },
  {
    name: "analyze_controller",
    description: "Analyze controller to extract: endpoints, HTTP methods, required auth, request/response DTOs. Returns structured summary.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
        controllerName: {
          type: "string",
          description: "Controller class name",
        },
      },
      required: ["projectPath", "controllerName"],
    },
  },
  {
    name: "check_json_naming_strategy",
    description: "Check DTO @JsonNaming strategy (snake_case vs camelCase) for a specific package or DTO",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
        dtoPackage: {
          type: "string",
          description: "DTO package path (e.g., 'com.example.dto')",
        },
      },
      required: ["projectPath", "dtoPackage"],
    },
  },
  {
    name: "find_beans_needing_exclusion",
    description: "Find @Configuration/@Service/@Component beans that likely need @Profile('!test') exclusion (AWS, tenant, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "analyze_repository",
    description: "Extract repository query methods, custom queries, and whether it uses soft-delete filtering",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
        repositoryName: {
          type: "string",
          description: "Repository interface name",
        },
      },
      required: ["projectPath", "repositoryName"],
    },
  },
  {
    name: "check_spring_boot_version",
    description: "Detect Spring Boot version and Java version from pom.xml. Returns 2.x vs 3.x and javax vs jakarta info.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
      },
      required: ["projectPath"],
    },
  },
  {
    name: "investigate_service",
    description: "Analyze service class: what business logic, which repositories used, what exceptions thrown",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path to the Spring Boot project root",
        },
        serviceName: {
          type: "string",
          description: "Service class name",
        },
      },
      required: ["projectPath", "serviceName"],
    },
  },
];

const RESOURCES: Resource[] = [
  {
    uri: "mcp://spring-integration-test/health",
    name: "health",
    description: "Simple liveness resource to verify the MCP server is reachable",
    mimeType: "text/plain",
  },
];

// Helper functions
async function checkEnvironment(projectPath?: string): Promise<string> {
  const results: any = {
    platform: platform(),
    maven: { available: false, version: "" },
    java: { available: false, version: "" },
    container: { runtime: "none", version: "" },
    recommendations: [],
  };

  const mvnCmd = getMavenCommand();

  // Check Maven
  try {
    const { stdout } = await execAsync(`${mvnCmd} -version`);
    results.maven.available = true;
    const versionMatch = stdout.match(/Apache Maven ([\d.]+)/);
    if (versionMatch) results.maven.version = versionMatch[1];
  } catch (error) {
    results.recommendations.push("Install Maven: https://maven.apache.org/install.html");
  }

  // Check Java
  try {
    const { stdout } = await execAsync("java -version");
    results.java.available = true;
    const versionMatch = stdout.match(/version "?([^"\s]+)"?/);
    if (versionMatch) results.java.version = versionMatch[1];
  } catch (error) {
    results.recommendations.push("Install Java JDK 11+: https://adoptium.net/");
  }

  // Check container runtime
  const runtime = await detectContainerRuntime();
  results.container.runtime = runtime;

  if (runtime !== "none") {
    try {
      const { stdout } = await execAsync(`${runtime} --version`);
      const versionMatch = stdout.match(/version ([\d.]+)/);
      if (versionMatch) results.container.version = versionMatch[1];
    } catch (error) {
      // Version check failed
    }
  } else {
    results.recommendations.push(
      "Optional: Install Docker (https://docs.docker.com/get-docker/) or Podman (https://podman.io/getting-started/installation)"
    );
  }

  // Check Maven wrapper if project path provided
  if (projectPath) {
    const wrapperPath = path.join(
      projectPath,
      platform() === "win32" ? "mvnw.cmd" : "mvnw"
    );
    try {
      await access(wrapperPath);
      results.mavenWrapper = true;
      results.recommendations.push("Maven wrapper found - use ./mvnw instead of mvn");
    } catch (error) {
      results.mavenWrapper = false;
    }
  }

  // Platform-specific recommendations
  if (results.platform === "win32") {
    results.recommendations.push("Windows detected - ensure paths use double backslashes in config");
  }

  return JSON.stringify(results, null, 2);
}

async function findJavaFiles(projectPath: string, pattern: string): Promise<string[]> {
  const srcPath = path.join(projectPath, "src", "main", "java");
  const files = await glob(`${srcPath}/**/${pattern}.java`);
  return files;
}

async function findTestFiles(projectPath: string, pattern: string): Promise<string[]> {
  const testPath = path.join(projectPath, "src", "test", "java");
  const files = await glob(`${testPath}/**/${pattern}.java`);
  return files;
}

async function readJavaFile(filePath: string): Promise<string> {
  return await readFile(filePath, "utf-8");
}

// Tool implementations
async function investigateJwtClaims(projectPath: string): Promise<string> {
  // Find JwtTokenUtil or JwtRequestFilter
  const jwtUtilFiles = await findJavaFiles(projectPath, "*JwtTokenUtil*");
  const jwtFilterFiles = await findJavaFiles(projectPath, "*JwtRequestFilter*");
  const jwtFiles = [...jwtUtilFiles, ...jwtFilterFiles];

  if (jwtFiles.length === 0) {
    return JSON.stringify({
      found: false,
      message: "No JWT utility files found. Search for files containing 'Jwt'",
    }, null, 2);
  }

  const claims: string[] = [];
  const claimMethods: Record<string, string> = {};

  for (const file of jwtFiles) {
    const content = await readJavaFile(file);

    // Extract getClaim or get() calls
    const getClaimPattern = /\.get(?:Claim)?\(['"]([\w_]+)['"]\)/g;
    const matches = content.matchAll(getClaimPattern);

    for (const match of matches) {
      claims.push(match[1]);
    }

    // Extract standard JWT methods
    if (content.includes(".getId()")) claimMethods.jti = "getUserId() or similar";
    if (content.includes(".getSubject()")) claimMethods.sub = "getEmail() or username";

    // Extract custom claims
    const customClaimPattern = /claims\.get\(['"]([\w_]+)['"]\)/g;
    const customMatches = content.matchAll(customClaimPattern);

    for (const match of customMatches) {
      claims.push(match[1]);
    }
  }

  return JSON.stringify({
    found: true,
    file: path.basename(jwtFiles[0]),
    standardClaims: claimMethods,
    customClaims: [...new Set(claims)],
    recommendation: "Include these claims in BaseIntegrationTest.generateTestToken()",
  }, null, 2);
}

async function investigateResponseWrapper(projectPath: string): Promise<string> {
  const adviceFiles = await findJavaFiles(projectPath, "*Advice*");
  const configFiles = await findJavaFiles(projectPath, "*Response*");
  const allFiles = [...adviceFiles, ...configFiles];

  let hasWrapper = false;
  let wrapperClass = "";
  let wrapperField = "data";

  for (const file of allFiles) {
    const content = await readJavaFile(file);

    if (content.includes("ResponseBodyAdvice") || content.includes("@ControllerAdvice")) {
      hasWrapper = true;
      wrapperClass = path.basename(file, ".java");

      // Try to find the wrapper field name
      const wrapperPattern = /class\s+\w+\s*\{[^}]*(\w+)\s*:/;
      const match = content.match(wrapperPattern);
      if (match) wrapperField = match[1];
    }
  }

  return JSON.stringify({
    hasWrapper,
    wrapperClass: hasWrapper ? wrapperClass : "None",
    wrapperField: hasWrapper ? wrapperField : "N/A",
    jsonPathPrefix: hasWrapper ? `$.${wrapperField}` : "$",
    recommendation: hasWrapper
      ? `Use jsonPath("$.${wrapperField}.id") in controller tests`
      : "Use jsonPath(\"$.id\") directly in controller tests",
  }, null, 2);
}

async function investigateEntityRelationships(
  projectPath: string,
  entityName: string
): Promise<string> {
  const entityFiles = await findJavaFiles(projectPath, entityName);

  if (entityFiles.length === 0) {
    return JSON.stringify({
      found: false,
      message: `Entity ${entityName} not found`,
    }, null, 2);
  }

  const content = await readJavaFile(entityFiles[0]);
  const relationships: Record<string, any[]> = {
    manyToOne: [],
    oneToMany: [],
    oneToOne: [],
    manyToMany: [],
  };

  // Extract @ManyToOne relationships
  const manyToOnePattern = /@ManyToOne[\s\S]*?private\s+(\w+)\s+(\w+);/g;
  let match;
  while ((match = manyToOnePattern.exec(content)) !== null) {
    relationships.manyToOne.push({
      type: match[1],
      field: match[2],
      required: !content.includes(`@JoinColumn.*${match[2]}.*nullable.*true`),
    });
  }

  // Extract @OneToMany relationships
  const oneToManyPattern = /@OneToMany[\s\S]*?private\s+(?:List|Set)<(\w+)>\s+(\w+);/g;
  while ((match = oneToManyPattern.exec(content)) !== null) {
    relationships.oneToMany.push({
      type: match[1],
      field: match[2],
    });
  }

  // Check for inheritance
  const inheritancePattern = /extends\s+(\w+)/;
  const inheritanceMatch = content.match(inheritancePattern);
  const inheritance = inheritanceMatch ? inheritanceMatch[1] : null;

  // Check for discriminator
  const hasDiscriminator = content.includes("@DiscriminatorColumn");

  return JSON.stringify({
    found: true,
    entity: entityName,
    inheritance: inheritance,
    discriminator: hasDiscriminator,
    relationships,
    creationOrder: [
      ...relationships.manyToOne.map(r => `1. Create ${r.type} first (required dependency)`),
      `2. Create ${entityName}`,
      ...relationships.oneToMany.map(r => `3. Create ${r.type} (children)`),
    ],
    warning: hasDiscriminator
      ? `⚠️ This entity uses inheritance - use specific subclass, not base ${entityName} class`
      : null,
  }, null, 2);
}

async function findMissingProperties(projectPath: string): Promise<string> {
  const srcPath = path.join(projectPath, "src", "main", "java");
  const javaFiles = await glob(`${srcPath}/**/*.java`);

  const properties = new Set<string>();

  for (const file of javaFiles) {
    const content = await readJavaFile(file);
    const valuePattern = /@Value\(["'](\$\{[^}]+\})["']\)/g;
    let match;

    while ((match = valuePattern.exec(content)) !== null) {
      const propName = match[1].replace(/\$\{([^:}]+).*\}/, "$1");
      properties.add(propName);
    }
  }

  // Check which are in application-test.properties
  const testPropsPath = path.join(
    projectPath,
    "src",
    "test",
    "resources",
    "application-test.properties"
  );

  let testProps = "";
  try {
    testProps = await readFile(testPropsPath, "utf-8");
  } catch (error) {
    return JSON.stringify({
      found: true,
      totalProperties: properties.size,
      missingProperties: Array.from(properties),
      testPropertiesFileExists: false,
      action: "Create src/test/resources/application-test.properties with these properties",
    }, null, 2);
  }

  const missingProps = Array.from(properties).filter(
    (prop) => !testProps.includes(prop)
  );

  return JSON.stringify({
    found: true,
    totalProperties: properties.size,
    missingProperties: missingProps,
    testPropertiesFileExists: true,
    action: missingProps.length > 0
      ? `Add these ${missingProps.length} properties to application-test.properties`
      : "All properties are defined in test config ✓",
  }, null, 2);
}

async function validateMavenCompile(projectPath: string): Promise<string> {
  const mvnCmd = getMavenCommand();

  try {
    const { stdout, stderr } = await execAsync(`${mvnCmd} clean compile test-compile`, {
      cwd: projectPath,
      timeout: 180000, // 3 minutes
    });

    const success = stdout.includes("BUILD SUCCESS");

    // Extract error summary if failed
    const errors: string[] = [];
    if (!success) {
      const errorPattern = /\[ERROR\]\s+(.+)/g;
      let match;
      while ((match = errorPattern.exec(stderr)) !== null) {
        errors.push(match[1]);
      }
    }

    return JSON.stringify({
      success,
      message: success ? "✓ BUILD SUCCESS" : "✗ BUILD FAILED",
      errors: errors.slice(0, 10), // First 10 errors only
      recommendation: success
        ? "Proceed to writing tests"
        : "Fix compilation errors before writing tests",
    }, null, 2);
  } catch (error: any) {
    const stderr = error.stderr || "";
    const errors: string[] = [];
    const errorPattern = /\[ERROR\]\s+(.+)/g;
    let match;
    while ((match = errorPattern.exec(stderr)) !== null) {
      errors.push(match[1]);
    }

    return JSON.stringify({
      success: false,
      message: "✗ BUILD FAILED",
      errors: errors.slice(0, 10),
      recommendation: "Fix compilation errors before writing tests",
    }, null, 2);
  }
}

async function runTestCheckpoint(
  projectPath: string,
  testClass: string,
  testMethod?: string
): Promise<string> {
  const mvnCmd = getMavenCommand();
  const testSpec = testMethod ? `${testClass}#${testMethod}` : testClass;

  try {
    const { stdout, stderr } = await execAsync(
      `${mvnCmd} test -Dtest=${testSpec}`,
      {
        cwd: projectPath,
        timeout: 120000, // 2 minutes
      }
    );

    const output = stdout + stderr;

    // Parse test results
    const testsRunPattern = /Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/;
    const match = output.match(testsRunPattern);

    if (!match) {
      return JSON.stringify({
        success: false,
        message: "Could not parse test results",
        output: output.slice(-500), // Last 500 chars
      }, null, 2);
    }

    const [, run, failures, errors, skipped] = match;
    const success = failures === "0" && errors === "0";

    // Extract failure messages
    const failureMessages: string[] = [];
    if (!success) {
      const failurePattern = /<<< FAILURE![^>]*\n([\s\S]*?)(?=\n\n|\nTests run:)/g;
      let failMatch;
      while ((failMatch = failurePattern.exec(output)) !== null) {
        failureMessages.push(failMatch[1].trim().slice(0, 200)); // First 200 chars
      }
    }

    return JSON.stringify({
      success,
      testsRun: parseInt(run),
      failures: parseInt(failures),
      errors: parseInt(errors),
      skipped: parseInt(skipped),
      failureMessages: failureMessages.slice(0, 5), // First 5 failures
      recommendation: success
        ? "✓ Tests passed - continue to next batch"
        : "✗ Fix failures before continuing",
    }, null, 2);
  } catch (error: any) {
    const output = error.stdout + error.stderr;
    return JSON.stringify({
      success: false,
      message: "Test execution failed",
      output: output.slice(-1000), // Last 1000 chars
    }, null, 2);
  }
}

async function analyzeController(
  projectPath: string,
  controllerName: string
): Promise<string> {
  const controllerFiles = await findJavaFiles(projectPath, controllerName);

  if (controllerFiles.length === 0) {
    return JSON.stringify({
      found: false,
      message: `Controller ${controllerName} not found`,
    }, null, 2);
  }

  const content = await readJavaFile(controllerFiles[0]);

  // Extract endpoints
  const endpoints: any[] = [];
  const mappingPattern = /@(Get|Post|Put|Delete|Patch)Mapping\([^)]*["']([^"']+)["'][^)]*\)\s+public\s+[\w<>]+\s+(\w+)/g;
  let match;

  while ((match = mappingPattern.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      handlerMethod: match[3],
    });
  }

  // Check for auth requirement
  const requiresAuth = content.includes("@PreAuthorize") ||
                      !content.includes("@PermitAll");

  // Check base path
  const basePathPattern = /@RequestMapping\(["']([^"']+)["']\)/;
  const basePathMatch = content.match(basePathPattern);
  const basePath = basePathMatch ? basePathMatch[1] : "";

  return JSON.stringify({
    found: true,
    controller: controllerName,
    basePath,
    requiresAuth,
    endpointCount: endpoints.length,
    endpoints: endpoints.map(e => ({
      ...e,
      fullPath: basePath + e.path,
    })),
    testRecommendation: {
      authTests: requiresAuth ? "Write auth tests first (401 unauthorized)" : "No auth required",
      crudTests: `Write tests for ${endpoints.length} endpoints`,
    },
  }, null, 2);
}

async function checkJsonNamingStrategy(
  projectPath: string,
  dtoPackage: string
): Promise<string> {
  const dtoPath = path.join(projectPath, "src", "main", "java", ...dtoPackage.split("."));
  const dtoFiles = await glob(`${dtoPath}/**/*.java`);

  const strategies: Record<string, number> = {};

  for (const file of dtoFiles) {
    const content = await readJavaFile(file);

    if (content.includes("@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy")) {
      strategies.snake_case = (strategies.snake_case || 0) + 1;
    } else if (content.includes("@JsonNaming")) {
      strategies.other = (strategies.other || 0) + 1;
    } else {
      strategies.camelCase = (strategies.camelCase || 0) + 1;
    }
  }

  const primary = Object.entries(strategies).sort((a, b) => b[1] - a[1])[0];

  return JSON.stringify({
    dtoPackage,
    filesAnalyzed: dtoFiles.length,
    strategies,
    primaryStrategy: primary ? primary[0] : "camelCase",
    recommendation: primary && primary[0] === "snake_case"
      ? 'Use snake_case in JSON: {"company_id": 100}'
      : 'Use camelCase in JSON: {"companyId": 100}',
  }, null, 2);
}

async function findBeansNeedingExclusion(projectPath: string): Promise<string> {
  const srcPath = path.join(projectPath, "src", "main", "java");
  const javaFiles = await glob(`${srcPath}/**/*.java`);

  const beansToExclude: any[] = [];
  const keywords = ["aws", "tenant", "secret", "s3", "dynamo", "sqs", "sns"];

  for (const file of javaFiles) {
    const content = await readJavaFile(file);
    const fileName = path.basename(file, ".java");

    const isBean = content.includes("@Configuration") ||
                   content.includes("@Service") ||
                   content.includes("@Component");

    if (isBean) {
      const hasProfile = content.includes("@Profile");
      const needsExclusion = keywords.some(k =>
        fileName.toLowerCase().includes(k) ||
        content.toLowerCase().includes(k)
      );

      if (needsExclusion && !hasProfile) {
        beansToExclude.push({
          file: fileName,
          path: file.replace(projectPath, ""),
          reason: keywords.filter(k =>
            fileName.toLowerCase().includes(k) ||
            content.toLowerCase().includes(k)
          ),
        });
      }
    }
  }

  return JSON.stringify({
    found: beansToExclude.length,
    beansToExclude,
    recommendation: beansToExclude.length > 0
      ? `Add @Profile("!test") to these ${beansToExclude.length} classes`
      : "No beans found that need exclusion",
    action: 'Add: @Profile("!test") above @Configuration/@Service/@Component',
  }, null, 2);
}

async function analyzeRepository(
  projectPath: string,
  repositoryName: string
): Promise<string> {
  const repoFiles = await findJavaFiles(projectPath, repositoryName);

  if (repoFiles.length === 0) {
    return JSON.stringify({
      found: false,
      message: `Repository ${repositoryName} not found`,
    }, null, 2);
  }

  const content = await readJavaFile(repoFiles[0]);

  // Extract query methods
  const queryMethods: any[] = [];
  const methodPattern = /(?:@Query[^)]*\))?\s*([\w<>]+)\s+(\w+)\s*\([^)]*\)/g;
  let match;

  while ((match = methodPattern.exec(content)) !== null) {
    if (!match[2].startsWith("find") && !match[2].startsWith("count") &&
        !match[2].startsWith("exists") && !match[2].startsWith("delete")) {
      continue;
    }

    queryMethods.push({
      returnType: match[1],
      methodName: match[2],
      isCustomQuery: content.includes(`@Query`) &&
                     content.indexOf(`@Query`) < content.indexOf(match[2]),
    });
  }

  // Check for soft delete
  const hasSoftDelete = content.includes("@Where") && content.includes("deleted");

  return JSON.stringify({
    found: true,
    repository: repositoryName,
    queryMethodCount: queryMethods.length,
    queryMethods: queryMethods.slice(0, 10), // First 10 methods
    hasSoftDelete,
    testRecommendation: {
      softDeleteWarning: hasSoftDelete
        ? "⚠️ Always set .deleted(false) in test data"
        : null,
      customQueryTests: queryMethods.filter(m => m.isCustomQuery).length > 0
        ? "Write tests for custom @Query methods"
        : "Standard Spring Data methods can use template",
    },
  }, null, 2);
}

async function checkSpringBootVersion(projectPath: string): Promise<string> {
  const pomPath = path.join(projectPath, "pom.xml");

  try {
    const pomContent = await readFile(pomPath, "utf-8");
    const parser = new XMLParser();
    const pom = parser.parse(pomContent);

    const springBootVersion =
      pom.project?.parent?.version ||
      pom.project?.properties?.["spring-boot.version"] ||
      "Unknown";

    const javaVersion =
      pom.project?.properties?.["java.version"] ||
      pom.project?.properties?.["maven.compiler.source"] ||
      "Unknown";

    const isSpringBoot3 = springBootVersion.startsWith("3");
    const isJava17Plus = parseInt(javaVersion) >= 17;

    return JSON.stringify({
      springBootVersion,
      javaVersion,
      isSpringBoot3,
      persistenceApi: isSpringBoot3 ? "jakarta.persistence.*" : "javax.persistence.*",
      recommendations: {
        imports: isSpringBoot3
          ? "Use jakarta.persistence.* imports"
          : "Use javax.persistence.* imports",
        testDependencies: isJava17Plus
          ? "Use JUnit 5.10+, Mockito 5.x+"
          : "Use JUnit 5.11.4, Mockito 5.14.2 (Java 11 compatible)",
        moduleOpens: isJava17Plus
          ? "Add --add-opens flags to maven-surefire-plugin"
          : "Module opens optional but recommended for Orika",
      },
    }, null, 2);
  } catch (error) {
    return JSON.stringify({
      error: "Could not parse pom.xml",
      message: "Ensure pom.xml exists and is valid XML",
    }, null, 2);
  }
}

async function investigateService(
  projectPath: string,
  serviceName: string
): Promise<string> {
  const serviceFiles = await findJavaFiles(projectPath, serviceName);

  if (serviceFiles.length === 0) {
    return JSON.stringify({
      found: false,
      message: `Service ${serviceName} not found`,
    }, null, 2);
  }

  const content = await readJavaFile(serviceFiles[0]);

  // Extract autowired repositories
  const repositories: string[] = [];
  const autowiredPattern = /@Autowired\s+(?:private\s+)?(\w+Repository)\s+\w+/g;
  let match;

  while ((match = autowiredPattern.exec(content)) !== null) {
    repositories.push(match[1]);
  }

  // Extract public methods
  const publicMethods: string[] = [];
  const methodPattern = /public\s+[\w<>]+\s+(\w+)\s*\(/g;
  while ((match = methodPattern.exec(content)) !== null) {
    publicMethods.push(match[1]);
  }

  // Extract exceptions thrown
  const exceptions: string[] = [];
  const throwPattern = /throw\s+new\s+(\w+Exception)/g;
  while ((match = throwPattern.exec(content)) !== null) {
    if (!exceptions.includes(match[1])) {
      exceptions.push(match[1]);
    }
  }

  // Check for @Transactional
  const isTransactional = content.includes("@Transactional");

  return JSON.stringify({
    found: true,
    service: serviceName,
    isTransactional,
    repositoryDependencies: repositories,
    publicMethodCount: publicMethods.length,
    publicMethods: publicMethods.slice(0, 10),
    exceptionTypes: exceptions,
    testRecommendation: {
      setup: `Autowire: ${serviceName} and ${repositories.join(", ")}`,
      happyPath: `Test ${publicMethods.length} public methods`,
      exceptions: exceptions.length > 0
        ? `Write tests for ${exceptions.join(", ")}`
        : "No explicit exception tests needed",
    },
  }, null, 2);
}

// Server setup
const server = new Server(
  {
    name: "spring-integration-test-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri !== RESOURCES[0].uri) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text: "ok",
      },
    ],
  };
});

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args) {
      throw new Error("Missing required arguments");
    }

    switch (name) {
      case "check_environment":
        return {
          content: [
            {
              type: "text",
              text: await checkEnvironment(
                resolveProjectPath(args.projectPath as string | undefined)
              ),
            },
          ],
        };

      case "investigate_jwt_claims":
        return {
          content: [
            {
              type: "text",
              text: await investigateJwtClaims(
                resolveProjectPath(args.projectPath as string)
              ),
            },
          ],
        };

      case "investigate_response_wrapper":
        return {
          content: [
            {
              type: "text",
              text: await investigateResponseWrapper(
                resolveProjectPath(args.projectPath as string)
              ),
            },
          ],
        };

      case "investigate_entity_relationships":
        return {
          content: [
            {
              type: "text",
              text: await investigateEntityRelationships(
                resolveProjectPath(args.projectPath as string),
                args.entityName as string
              ),
            },
          ],
        };

      case "find_missing_properties":
        return {
          content: [
            {
              type: "text",
              text: await findMissingProperties(
                resolveProjectPath(args.projectPath as string)
              ),
            },
          ],
        };

      case "validate_maven_compile":
        return {
          content: [
            {
              type: "text",
              text: await validateMavenCompile(
                resolveProjectPath(args.projectPath as string)
              ),
            },
          ],
        };

      case "run_test_checkpoint":
        return {
          content: [
            {
              type: "text",
              text: await runTestCheckpoint(
                resolveProjectPath(args.projectPath as string),
                args.testClass as string,
                args.testMethod as string | undefined
              ),
            },
          ],
        };

      case "analyze_controller":
        return {
          content: [
            {
              type: "text",
              text: await analyzeController(
                resolveProjectPath(args.projectPath as string),
                args.controllerName as string
              ),
            },
          ],
        };

      case "check_json_naming_strategy":
        return {
          content: [
            {
              type: "text",
              text: await checkJsonNamingStrategy(
                resolveProjectPath(args.projectPath as string),
                args.dtoPackage as string
              ),
            },
          ],
        };

      case "find_beans_needing_exclusion":
        return {
          content: [
            {
              type: "text",
              text: await findBeansNeedingExclusion(
                resolveProjectPath(args.projectPath as string)
              ),
            },
          ],
        };

      case "analyze_repository":
        return {
          content: [
            {
              type: "text",
              text: await analyzeRepository(
                resolveProjectPath(args.projectPath as string),
                args.repositoryName as string
              ),
            },
          ],
        };

      case "check_spring_boot_version":
        return {
          content: [
            {
              type: "text",
              text: await checkSpringBootVersion(
                resolveProjectPath(args.projectPath as string)
              ),
            },
          ],
        };

      case "investigate_service":
        return {
          content: [
            {
              type: "text",
              text: await investigateService(
                resolveProjectPath(args.projectPath as string),
                args.serviceName as string
              ),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message,
            stack: error.stack,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Spring Integration Test MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
