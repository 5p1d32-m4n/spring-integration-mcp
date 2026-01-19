#!/usr/bin/env node

/**
 * Simple test script to verify the check_environment tool works
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'index.js');

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();

  // Look for the response after we send our request
  try {
    const lines = responseData.split('\n');
    for (const line of lines) {
      if (line.trim() && line.startsWith('{')) {
        const parsed = JSON.parse(line);
        if (parsed.id === 2) {
          console.log('✓ check_environment tool response:');
          console.log(JSON.stringify(parsed, null, 2));
          server.kill();
          process.exit(0);
        }
      }
    }
  } catch (e) {
    // Not JSON yet, keep accumulating
  }
});

server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(1);
  }
});

// Send initialization
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait a bit then send the tool call
setTimeout(() => {
  const toolRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'check_environment',
      arguments: {
        projectPath: process.cwd()
      }
    }
  };

  server.stdin.write(JSON.stringify(toolRequest) + '\n');
}, 500);

// Timeout after 5 seconds
setTimeout(() => {
  console.error('Test timeout');
  server.kill();
  process.exit(1);
}, 5000);
