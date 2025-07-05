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

The codebase uses functional and typing-based architecture instead of class-based:

- **src/server.ts**: Main server implementation with Express and Socket.io setup
- **src/types.ts**: TypeScript type definitions and interfaces
- **src/processManager.ts**: Functional modules for managing Claude CLI child processes
- **src/socketHandlers.ts**: Functional handlers for WebSocket events and process management
- **src/test-utils/createTestServer.ts**: Test utility for creating test server instances
- **public/index.html**: Web UI with embedded JavaScript providing a terminal-like interface

### Testing

The project uses Jest with TypeScript support:

- **src/__tests__/processManager.test.ts**: Unit tests for process management functions
- **src/__tests__/server.test.ts**: Integration tests for HTTP endpoints and WebSocket communication
- Mock implementations for `child_process.spawn` to simulate Claude CLI without external dependencies

## Key Implementation Details

1. **Functional Process Management**: Process management is handled through pure functions in `processManager.ts` that operate on a `ProcessManager` state object. Functions spawn child processes for Claude commands using `claude -p [command]` and manage their lifecycle. Only one command can run at a time per client.

2. **Type-Safe Architecture**: All interfaces and types are defined in `types.ts`, providing strong typing throughout the application. This includes `ProcessManager`, `ClaudeCommand`, `ProcessOutput`, and `ServerConfig` interfaces.

3. **Event Handling**: Socket.io event handlers are functional modules in `socketHandlers.ts` that compose process management functions with WebSocket communication.

4. **Working Directory Security**: Functions validate that command execution stays within a base directory (configurable via command-line argument). Path validation prevents directory traversal attacks.

5. **Real-time Communication**: Socket.io events handle:
   - `execute-command`: Run a Claude command with optional relative path
   - `kill-process`: Terminate the running process
   - `output`: Stream command output (stdout/stderr/system messages/errors)
   - `process-killed`: Confirmation of process termination

6. **Configuration**:
   - Port: Set via `PORT` environment variable (default: 3000)
   - Base directory: First command-line argument (default: current directory)

7. **Testing Strategy**:
   - External `claude` command is mocked in tests
   - Process lifecycle events are simulated
   - WebSocket communication is tested end-to-end
   - Security constraints (directory traversal) are validated
   - Functional approach enables isolated unit testing of individual functions

## TypeScript Configuration

The project uses strict TypeScript with ES2020 target. Source files are in `./src` and compiled to `./dist`. Jest is configured with ts-jest for TypeScript test execution. Strong typing is enforced throughout with explicit interfaces and type definitions.

## Security Considerations

- The server executes system commands through the Claude CLI
- CORS is configured to accept all origins (intended for VPN environments)
- Working directory validation prevents navigation outside the base directory
- Process stdin is immediately closed to prevent hanging on input prompts
