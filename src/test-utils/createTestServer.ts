import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { ClaudeCodeManager } from '../ClaudeCodeManager';

interface ClaudeCommand {
  command: string;
  relativePath?: string;
}

interface ProcessOutput {
  type: 'stdout' | 'stderr' | 'exit' | 'error' | 'system';
  data: string | number;
  timestamp: number;
}

interface ServerConfig {
  baseDirectory: string;
  port: number;
}

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

    const claudeManager = new ClaudeCodeManager(config.baseDirectory);

    // Static files
    app.use(express.static(path.join(__dirname, '../../public')));
    app.use(express.json());
    app.use(cors());

    // Configuration endpoint
    app.get('/api/config', (req, res) => {
      res.json({
        baseDirectory: config.baseDirectory,
        port: config.port
      });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // WebSocket connection handling
    io.on('connection', (socket) => {
      socket.on('execute-command', (data: ClaudeCommand) => {
        const { command, relativePath } = data;

        try {
          const process = claudeManager.executeCommand(socket.id, command, relativePath);

          // Process started notification
          socket.emit('output', {
            type: 'system',
            data: `Process started with PID: ${process.pid}`,
            timestamp: Date.now()
          });

          // Spawn event
          process.on('spawn', () => {
            socket.emit('output', {
              type: 'system',
              data: 'Claude process spawned successfully',
              timestamp: Date.now()
            });
          });

          // stdout
          process.stdout.on('data', (data: Buffer) => {
            const output: ProcessOutput = {
              type: 'stdout',
              data: data.toString(),
              timestamp: Date.now()
            };
            socket.emit('output', output);
          });

          // stderr
          process.stderr.on('data', (data: Buffer) => {
            const output: ProcessOutput = {
              type: 'stderr',
              data: data.toString(),
              timestamp: Date.now()
            };
            socket.emit('output', output);
          });

          // exit
          process.on('exit', (code: number | null) => {
            const output: ProcessOutput = {
              type: 'exit',
              data: code || 0,
              timestamp: Date.now()
            };
            socket.emit('output', output);
            claudeManager.killProcess(socket.id);
          });

          // error
          process.on('error', (error: Error) => {
            const output: ProcessOutput = {
              type: 'error',
              data: error.message,
              timestamp: Date.now()
            };
            socket.emit('output', output);
            claudeManager.killProcess(socket.id);
          });

        } catch (error) {
          const output: ProcessOutput = {
            type: 'error',
            data: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          };
          socket.emit('output', output);
        }
      });

      socket.on('kill-process', () => {
        claudeManager.killProcess(socket.id);
        socket.emit('process-killed');
      });

      socket.on('disconnect', () => {
        claudeManager.killProcess(socket.id);
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