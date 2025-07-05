# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebSocket server that provides a web interface for executing Claude Code CLI commands remotely. The server manages child processes for Claude commands and streams output in real-time through Socket.io.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Build and start
npm run start:dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Architecture

The codebase has been refactored into modular components:

- **src/server.ts**: Main server implementation with Express and Socket.io setup
- **src/ClaudeCodeManager.ts**: Extracted class that manages Claude CLI child processes
- **src/test-utils/createTestServer.ts**: Test utility for creating test server instances
- **public/index.html**: Web UI with embedded JavaScript providing a terminal-like interface

### Testing

The project uses Jest with TypeScript support:
- **src/__tests__/ClaudeCodeManager.test.ts**: Unit tests for the ClaudeCodeManager class
- **src/__tests__/server.test.ts**: Integration tests for HTTP endpoints and WebSocket communication
- Mock implementations for `child_process.spawn` to simulate Claude CLI without external dependencies

## Key Implementation Details

1. **Process Management**: The `ClaudeCodeManager` class spawns child processes for Claude commands using `claude -p [command]` and manages their lifecycle. Only one command can run at a time per client.

2. **Working Directory**: The server restricts command execution to within a base directory (configurable via command-line argument). All path operations validate that the working directory stays within bounds.

3. **Real-time Communication**: Socket.io events handle:
   - `execute-command`: Run a Claude command with optional relative path
   - `kill-process`: Terminate the running process
   - `output`: Stream command output (stdout/stderr/system messages/errors)
   - `process-killed`: Confirmation of process termination

4. **Configuration**:
   - Port: Set via `PORT` environment variable (default: 3000)
   - Base directory: First command-line argument (default: current directory)

5. **Testing Strategy**: 
   - External `claude` command is mocked in tests
   - Process lifecycle events are simulated
   - WebSocket communication is tested end-to-end
   - Security constraints (directory traversal) are validated

## TypeScript Configuration

The project uses strict TypeScript with ES2020 target. Source files are in `./src` and compiled to `./dist`. Jest is configured with ts-jest for TypeScript test execution.

## Security Considerations

- The server executes system commands through the Claude CLI
- CORS is configured to accept all origins (intended for VPN environments)  
- Working directory validation prevents navigation outside the base directory
- Process stdin is immediately closed to prevent hanging on input prompts