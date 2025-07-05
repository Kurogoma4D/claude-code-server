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
```

## Architecture

The codebase consists of a TypeScript backend server and a single-page HTML frontend:

- **src/server.ts**: Main server implementation containing:
  - `ClaudeCodeManager` class: Manages Claude CLI child processes
  - Express server: Serves static files and API endpoints
  - Socket.io server: Handles WebSocket connections for real-time command execution
  
- **public/index.html**: Web UI with embedded JavaScript providing a terminal-like interface

## Key Implementation Details

1. **Process Management**: The `ClaudeCodeManager` class spawns child processes for Claude commands and manages their lifecycle. Only one command can run at a time per client.

2. **Working Directory**: The server restricts command execution to within a base directory (configurable via command-line argument). All path operations validate that the working directory stays within bounds.

3. **Real-time Communication**: Socket.io events handle:
   - `execute`: Run a Claude command
   - `kill`: Terminate the running process
   - `stdout`/`stderr`: Stream command output
   - `exit`: Process completion

4. **Configuration**:
   - Port: Set via `PORT` environment variable (default: 3000)
   - Base directory: First command-line argument (default: current directory)

## TypeScript Configuration

The project uses strict TypeScript with ES2020 target. Source files are in `./src` and compiled to `./dist`.

## Security Considerations

- The server executes system commands through the Claude CLI
- CORS is configured to accept all origins (intended for VPN environments)
- Working directory validation prevents navigation outside the base directory