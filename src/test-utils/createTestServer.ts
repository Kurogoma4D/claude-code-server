import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { ServerConfig, ClaudeCommand } from '../types';
import { createProcessManager } from '../processManager';
import { handleExecuteCommand, handleKillProcess, handleDisconnect } from '../socketHandlers';

export function createTestServer(baseDirectory: string = '/tmp/test') {
  return new Promise<any>((resolve, reject) => {
    const config: ServerConfig = {
      baseDirectory,
      port: 0, // Let the OS choose a random port
    };

    const app = express();
    const server = createServer(app);
    const io = new SocketServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    const processManager = createProcessManager(config.baseDirectory);

    // Static files
    app.use(express.static(path.join(__dirname, '../../public')));
    app.use(express.json());
    app.use(cors());

    // Configuration endpoint
    app.get('/api/config', (_req, res) => {
      res.json({
        baseDirectory: config.baseDirectory,
        port: config.port
      });
    });

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // WebSocket connection handling
    io.on('connection', (socket) => {
      socket.on('execute-command', (data: ClaudeCommand) => {
        handleExecuteCommand(socket, processManager, data);
      });

      socket.on('kill-process', () => {
        handleKillProcess(socket, processManager);
      });

      socket.on('disconnect', () => {
        handleDisconnect(socket, processManager);
      });
    });

    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        config.port = address.port;
      }
      resolve(server);
    });

    server.on('error', reject);
  });
}