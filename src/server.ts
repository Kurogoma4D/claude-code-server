// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { ServerConfig, ClaudeCommand } from './types';
import { createProcessManager, killAllProcesses } from './processManager';
import { handleExecuteCommand, handleKillProcess, handleDisconnect } from './socketHandlers';
import { createPtyManager, killAllPtys } from './ptyManager';
import { handleStartSession, handleTerminalInput, handleTerminalResize, handleKillSession, handlePtyDisconnect } from './ptyHandlers';

// コマンドライン引数から設定を取得
const config: ServerConfig = {
  baseDirectory: process.argv[2] || process.cwd(),
  port: parseInt(process.env.PORT || '3000', 10)
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // VPN環境なので全許可
    methods: ['GET', 'POST']
  }
});

const processManager = createProcessManager(config.baseDirectory);
const ptyManager = createPtyManager(config.baseDirectory);

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(cors());

// 設定情報を返すエンドポイント
app.get('/api/config', (_req, res) => {
  res.json({
    baseDirectory: config.baseDirectory,
    port: config.port
  });
});

// ヘルスチェックエンドポイント
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket接続の処理
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Legacy command execution (for backward compatibility)
  socket.on('execute-command', (data: ClaudeCommand) => {
    handleExecuteCommand(socket, processManager, data);
  });

  socket.on('kill-process', () => {
    handleKillProcess(socket, processManager);
  });

  // New PTY-based interactive session
  socket.on('start-session', (data: { relativePath?: string }) => {
    handleStartSession(socket, ptyManager, data);
  });

  socket.on('terminal-input', (data: { data: string }) => {
    handleTerminalInput(socket, ptyManager, data);
  });

  socket.on('terminal-resize', (data: { cols: number; rows: number }) => {
    handleTerminalResize(socket, ptyManager, data);
  });

  socket.on('kill-session', () => {
    handleKillSession(socket, ptyManager);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket, processManager);
    handlePtyDisconnect(socket, ptyManager);
  });
});

// サーバーの起動
server.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║          Claude Code WebSocket Server              ║
╠════════════════════════════════════════════════════╣
║ Server URL:  http://localhost:${config.port}              ║
║ Base Dir:    ${config.baseDirectory.padEnd(38)}║
╚════════════════════════════════════════════════════╝
  `);
});

// グレースフルシャットダウン
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  killAllProcesses(processManager);
  killAllPtys(ptyManager);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));