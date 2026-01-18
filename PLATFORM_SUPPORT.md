# Platform Support Guide

## Supported Platforms

This MCP server is fully cross-platform and tested on:
- **Linux** (Ubuntu 20.04+, Fedora 38+, Arch)
- **macOS** (11.0+ Big Sur and later)
- **Windows** (10, 11 with PowerShell 5.1+ or PowerShell Core 7+)

## Platform-Specific Features

### Automatic Detection

The MCP server automatically detects:

1. **Operating System**
   - Linux: Uses standard Unix paths and commands
   - macOS: Uses Unix paths with macOS-specific conventions
   - Windows: Uses Windows paths with backslashes, `.cmd` extensions

2. **Maven Command**
   - Linux/macOS: `mvn`
   - Windows: `mvn.cmd`
   - All platforms: Detects and recommends Maven wrapper (`./mvnw` or `mvnw.cmd`)

3. **Container Runtime**
   - Tries Docker first
   - Falls back to Podman if Docker unavailable
   - Continues without container runtime if neither available

## Prerequisites by Platform

### 🐧 Linux

**Required:**
- Node.js 18+ (`node --version`)
- Maven 3.6+ OR Maven wrapper in project
- Java 11+ JDK

**Optional:**
- Docker OR Podman (for container-based features)

**Installation:**
```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install nodejs npm maven openjdk-17-jdk

# Fedora
sudo dnf install nodejs npm maven java-17-openjdk-devel

# Arch
sudo pacman -S nodejs npm maven jdk-openjdk

# Install Podman (if no Docker)
sudo apt-get install podman  # Debian/Ubuntu
sudo dnf install podman      # Fedora
sudo pacman -S podman        # Arch
```

### 🍎 macOS

**Required:**
- Node.js 18+ (via Homebrew)
- Maven 3.6+ (via Homebrew) OR Maven wrapper
- Java 11+ JDK

**Optional:**
- Docker Desktop OR Podman

**Installation:**
```bash
# Install Homebrew first (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install prerequisites
brew install node
brew install maven
brew install openjdk@17

# Link Java (macOS-specific)
sudo ln -sfn /usr/local/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Install Podman (if no Docker Desktop)
brew install podman
podman machine init
podman machine start
```

### 🪟 Windows

**Required:**
- Node.js 18+ (Windows installer from nodejs.org)
- Maven 3.6+ OR Maven wrapper
- Java 11+ JDK

**Optional:**
- Docker Desktop OR Podman

**Installation (PowerShell as Administrator):**
```powershell
# Using winget (Windows 11 / Windows 10 with App Installer)
winget install OpenJS.NodeJS
winget install Apache.Maven
winget install Microsoft.OpenJDK.17

# Or using Chocolatey
choco install nodejs
choco install maven
choco install openjdk17

# Install Podman (if no Docker Desktop)
winget install RedHat.Podman

# Initialize Podman (if installed)
podman machine init
podman machine start
```

**Manual Installation:**
1. Download from official websites:
   - Node.js: https://nodejs.org/
   - Maven: https://maven.apache.org/download.cgi
   - Java JDK 17: https://adoptium.net/
   - Podman: https://podman.io/getting-started/installation

2. Add to PATH:
   - Control Panel → System → Advanced → Environment Variables
   - Add paths to Maven bin, Java bin

## Configuration Paths by Platform

### Claude Code Config Location

| Platform | Path |
|----------|------|
| Linux | `~/.config/claude/config.json` |
| macOS | `~/.config/claude/config.json` |
| Windows | `%USERPROFILE%\.config\claude\config.json` |

### Path Format in Config

**Linux/macOS:**
```json
{
  "args": ["/home/username/Dev/spring-integration-test-mcp/dist/index.js"]
}
```

**Windows:**
```json
{
  "args": ["C:\\Users\\Username\\Dev\\spring-integration-test-mcp\\dist\\index.js"]
}
```

**CRITICAL:** Windows requires **double backslashes** (`\\`) in JSON!

## Platform-Specific Troubleshooting

### Linux Issues

#### Permission Denied on Maven Wrapper
```bash
chmod +x mvnw
```

#### Node not found
```bash
# Check if Node is in PATH
which node

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:/usr/local/bin"
```

#### Podman socket permissions
```bash
# Add user to podman group
sudo usermod -aG podman $USER
newgrp podman
```

### macOS Issues

#### "node" is damaged and can't be opened
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /usr/local/bin/node
```

#### Java not found after installation
```bash
# Set JAVA_HOME in ~/.zshrc or ~/.bash_profile
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"

# Reload shell
source ~/.zshrc
```

#### Podman machine won't start
```bash
# Remove and recreate machine
podman machine stop
podman machine rm
podman machine init
podman machine start
```

### Windows Issues

#### "mvn is not recognized"
```powershell
# Check PATH
$env:PATH -split ';' | Select-String maven

# Add Maven to PATH (as Administrator)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Apache\maven\bin", "Machine")

# Restart PowerShell
```

#### PowerShell Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# Allow scripts (as Administrator)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Path with spaces in config
```json
{
  "args": ["C:\\Program Files\\NodeJS\\node_modules\\...\\index.js"]
}
```
Double backslashes handle spaces correctly in JSON.

#### Windows Defender blocking Node
- Add exception: Windows Security → Virus & threat protection → Exclusions
- Add: `node.exe` and the MCP server directory

## Container Runtime Support

### Docker vs Podman

| Feature | Docker | Podman |
|---------|--------|--------|
| Root required | Yes (daemon) | No (rootless) |
| Windows support | Docker Desktop | WSL2 + Podman |
| macOS support | Docker Desktop | Podman machine |
| License | Free for personal | Fully open source |

### Using Podman as Docker Replacement

**Linux:**
```bash
# Create Docker alias (optional)
alias docker=podman
alias docker-compose=podman-compose

# Add to ~/.bashrc or ~/.zshrc permanently
echo "alias docker=podman" >> ~/.bashrc
```

**macOS:**
```bash
# Podman machine must be running
podman machine start

# Create alias
alias docker=podman
echo "alias docker=podman" >> ~/.zshrc
```

**Windows (PowerShell):**
```powershell
# Create function alias
function docker { podman $args }

# Add to PowerShell profile
Add-Content $PROFILE "function docker { podman `$args }"
```

### MCP Server Detection

The server automatically detects container runtime:

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

## Testing Platform-Specific Functionality

### Verify Maven Command

```
Use validate_maven_compile with projectPath "/path/to/project"
```

**Linux/macOS:** Uses `mvn`
**Windows:** Uses `mvn.cmd`
**All with wrapper:** Recommends `./mvnw` or `mvnw.cmd`

### Verify Path Handling

```
Use check_spring_boot_version with projectPath "C:\\Users\\Test\\project"
```

**Windows:** Paths with backslashes work correctly
**Linux/macOS:** Forward slashes work correctly

## Performance Considerations

### Linux
- **Fastest** for Maven builds (native Unix tools)
- Best for development in Docker/Podman environments

### macOS
- Good performance with native Maven
- Podman requires machine VM (slight overhead)
- Docker Desktop has filesystem performance considerations

### Windows
- Maven slightly slower than Linux (NTFS overhead)
- WSL2 recommended for heavy Maven workloads
- Podman requires WSL2 backend

### Recommendation for Best Performance

**Heavy Maven usage:**
1. Linux (native)
2. macOS (native)
3. Windows + WSL2
4. Windows (native)

**MCP Server itself:**
- No significant performance difference across platforms
- Node.js runs efficiently on all platforms

## IDE Integration

### VS Code (All Platforms)

Works seamlessly with Claude Code extension on all platforms.

### IntelliJ IDEA

Can use external tools to call Maven via MCP server:
1. Tools → External Tools → Add
2. Command: Use MCP tool via Claude Code CLI

### Command Line

**Linux/macOS:**
```bash
claude "Use run_test_checkpoint with testClass 'UserTest'"
```

**Windows PowerShell:**
```powershell
claude "Use run_test_checkpoint with testClass 'UserTest'"
```

## WSL2 Considerations (Windows)

### Using MCP Server from WSL2

**Install in WSL2:**
```bash
# Inside WSL2
cd ~/Dev
git clone <repo>
cd spring-integration-test-mcp
npm install
npm run build
```

**Configure for WSL2:**
```json
{
  "args": ["/home/username/Dev/spring-integration-test-mcp/dist/index.js"]
}
```

### Accessing Windows Projects from WSL2

```bash
cd /mnt/c/Users/Username/Dev/my-project
```

**Use in MCP:**
```
Use validate_maven_compile with projectPath "/mnt/c/Users/Username/Dev/my-project"
```

## Support Matrix

| Platform | Maven | Java | Docker | Podman | Status |
|----------|-------|------|--------|--------|--------|
| Ubuntu 20.04+ | ✅ | ✅ | ✅ | ✅ | Fully Supported |
| Fedora 38+ | ✅ | ✅ | ✅ | ✅ | Fully Supported |
| Arch Linux | ✅ | ✅ | ✅ | ✅ | Fully Supported |
| macOS 11+ | ✅ | ✅ | ✅ | ✅ | Fully Supported |
| Windows 10/11 | ✅ | ✅ | ✅ | ⚠️ | Supported (Podman via WSL2) |
| Windows + WSL2 | ✅ | ✅ | ✅ | ✅ | Fully Supported |

✅ = Fully supported
⚠️ = Supported with caveats (see notes)

## Getting Help

**Platform-specific issues:**
1. Run `Use check_environment` to get diagnostic info
2. Check PATH variables for Maven, Java, Node
3. Verify config file has correct path format for your OS
4. Check this guide's troubleshooting section

**Still stuck?**
- Include output from `check_environment` tool
- Specify your exact platform and version
- Include error messages from MCP server logs
