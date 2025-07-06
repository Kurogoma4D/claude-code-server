# 🤖 Claude Code Server

A WebSocket server that provides a web interface for executing Claude Code CLI commands remotely. The server manages child processes for Claude commands and streams output in real-time through Socket.io.

## ✨ Features

- 🚀 Real-time command execution through web interface
- 💻 Terminal-like web UI with xterm.js
- 🔌 WebSocket communication for streaming output
- 🎛️ Process management with kill capability
- 🔒 Working directory security validation
- 🌍 Cross-platform support with node-pty

## 🚀 Getting Started

The fastest way to get started is using npx:

```bash
# Run the server in the current directory
npx ccserve

# Or specify a different base directory
npx ccserve /path/to/your/project
```

This will start the server on port 3000 (or the port specified in the `PORT` environment variable). Open your browser to `http://localhost:3000` to access the web interface.

### CAUTION

This project is intended only in private network (like access via VPN).
Do not hosting on public network.

## ⚙️ Configuration

- **Port**: Set via `PORT` environment variable (default: 3000)
- **Base Directory**: First command-line argument (default: current directory)

## 🛠️ Development

### 📜 Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Production server
npm start

# Testing
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:e2e        # End-to-end tests
npm run test:e2e:ui     # E2E tests with UI
npm run test:e2e:debug  # E2E tests with debug
```

## 🔐 Security

- 🌐 CORS configured for all origins (intended for VPN environments)
- 🛡️ Working directory validation prevents directory traversal
- ⛔ Process stdin immediately closed to prevent hanging
- 📁 Path validation enforces base directory constraints

## 📄 License

MIT