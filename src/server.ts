// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { ClaudeCodeManager } from './ClaudeCodeManager';

interface ClaudeCommand {
  command: string;
  relativePath?: string; // ベースディレクトリからの相対パス
}

interface ProcessOutput {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data: string | number;
  timestamp: number;
}

interface ServerConfig {
  baseDirectory: string;
  port: number;
}


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

const claudeManager = new ClaudeCodeManager(config.baseDirectory);

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(cors());

// 設定情報を返すエンドポイント
app.get('/api/config', (req, res) => {
  res.json({
    baseDirectory: config.baseDirectory,
    port: config.port
  });
});

// WebSocket接続の処理
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('execute-command', (data: ClaudeCommand) => {
    const { command, relativePath } = data;
    console.log(`Executing command: ${command}${relativePath ? ` in ${relativePath}` : ''}`);

    try {
      const process = claudeManager.executeCommand(socket.id, command, relativePath);

      // プロセスが正常に起動したことを通知
      socket.emit('output', {
        type: 'system',
        data: `Process started with PID: ${process.pid}`,
        timestamp: Date.now()
      });

      // spawnイベントをリスニング
      process.on('spawn', () => {
        console.log('Process spawned successfully');
        socket.emit('output', {
          type: 'system',
          data: 'Claude process spawned successfully',
          timestamp: Date.now()
        });
      });

      // 標準出力の処理
      process.stdout.on('data', (data: Buffer) => {
        console.log(`stdout received (${data.length} bytes): ${data.toString()}`);
        const output: ProcessOutput = {
          type: 'stdout',
          data: data.toString(),
          timestamp: Date.now()
        };
        socket.emit('output', output);
      });

      // 標準エラー出力の処理
      process.stderr.on('data', (data: Buffer) => {
        console.log(`stderr received (${data.length} bytes): ${data.toString()}`);
        const output: ProcessOutput = {
          type: 'stderr',
          data: data.toString(),
          timestamp: Date.now()
        };
        socket.emit('output', output);
      });

      // プロセス終了時の処理
      process.on('exit', (code: number | null, signal: string | null) => {
        console.log(`Process exited with code: ${code}, signal: ${signal}`);
        const output: ProcessOutput = {
          type: 'exit',
          data: code || 0,
          timestamp: Date.now()
        };
        socket.emit('output', output);
        claudeManager.killProcess(socket.id);
      });

      // エラー処理
      process.on('error', (error: Error) => {
        console.error(`Process error: ${error.message}`);
        const output: ProcessOutput = {
          type: 'error',
          data: error.message,
          timestamp: Date.now()
        };
        socket.emit('output', output);
        claudeManager.killProcess(socket.id);
      });

      // closeイベントの処理
      process.on('close', (code: number | null, signal: string | null) => {
        console.log(`Process closed with code: ${code}, signal: ${signal}`);
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

  // プロセスの強制終了
  socket.on('kill-process', () => {
    claudeManager.killProcess(socket.id);
    socket.emit('process-killed');
  });

  // 切断時の処理
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    claudeManager.killProcess(socket.id);
  });
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  claudeManager.killAllProcesses();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  claudeManager.killAllProcesses();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});