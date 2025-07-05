import request from 'supertest';
import { Server } from 'http';
import { io as ioClient, Socket } from 'socket.io-client';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { createTestServer } from '../test-utils/createTestServer';
import { AddressInfo } from 'net';

interface ProcessOutput {
  type: 'stdout' | 'stderr' | 'exit' | 'error' | 'system';
  data: string | number;
  timestamp: number;
}

// Mock child_process.spawn
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock ChildProcess class
class MockChildProcess extends EventEmitter {
  public pid: number | undefined = 12345;
  public stdout = new EventEmitter();
  public stderr = new EventEmitter();
  public stdin = {
    end: jest.fn(),
  };

  private _killed = false;

  kill(signal?: string) {
    if (!this._killed) {
      this._killed = true;
      // Use setTimeout to avoid recursion issues
      setTimeout(() => {
        this.emit('exit', 0, signal);
      }, 0);
    }
  }
}

describe('Server', () => {
  let server: Server;
  let clientSocket: Socket;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess as any);
    
    server = await createTestServer();
    
    // Create client socket
    const address = server.address() as AddressInfo;
    clientSocket = ioClient(`http://localhost:${address.port}`);
    
    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (server) {
      server.close();
    }
  });

  describe('HTTP Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should return server configuration', async () => {
      const response = await request(server)
        .get('/api/config')
        .expect(200);

      expect(response.body).toEqual({
        baseDirectory: expect.any(String),
        port: expect.any(Number),
      });
    });
  });

  describe('WebSocket Communication', () => {
    it('should handle execute-command event', (done) => {
      const command = 'hello world';
      
      clientSocket.on('output', (output: ProcessOutput) => {
        if (output.type === 'system' && output.data.toString().includes('Process started')) {
          expect(mockSpawn).toHaveBeenCalledWith('claude', ['-p', command], {
            cwd: expect.any(String),
            env: process.env,
            shell: false,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          done();
        }
      });

      clientSocket.emit('execute-command', { command });
    });

    it('should handle stdout output', (done) => {
      const command = 'hello world';
      const testOutput = 'Hello from Claude!';
      
      clientSocket.on('output', (output: ProcessOutput) => {
        if (output.type === 'stdout') {
          expect(output.data).toBe(testOutput);
          done();
        }
      });

      clientSocket.emit('execute-command', { command });
      
      // Simulate stdout output
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from(testOutput));
      }, 50);
    });

    it('should handle stderr output', (done) => {
      const command = 'hello world';
      const testError = 'Error from Claude!';
      
      clientSocket.on('output', (output: ProcessOutput) => {
        if (output.type === 'stderr') {
          expect(output.data).toBe(testError);
          done();
        }
      });

      clientSocket.emit('execute-command', { command });
      
      // Simulate stderr output
      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from(testError));
      }, 50);
    });

    it('should handle process exit', (done) => {
      const command = 'hello world';
      
      clientSocket.on('output', (output: ProcessOutput) => {
        if (output.type === 'exit') {
          expect(output.data).toBe(0);
          done();
        }
      });

      clientSocket.emit('execute-command', { command });
      
      // Simulate process exit
      setTimeout(() => {
        mockProcess.emit('exit', 0);
      }, 50);
    });

    it('should handle process error', (done) => {
      const command = 'hello world';
      const testError = new Error('Process failed');
      
      clientSocket.on('output', (output: ProcessOutput) => {
        if (output.type === 'error') {
          expect(output.data).toBe(testError.message);
          done();
        }
      });

      clientSocket.emit('execute-command', { command });
      
      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', testError);
      }, 50);
    });

    it('should handle kill-process event', (done) => {
      const command = 'hello world';
      
      clientSocket.on('process-killed', () => {
        done();
      });

      clientSocket.emit('execute-command', { command });
      
      // Wait a bit then kill the process
      setTimeout(() => {
        clientSocket.emit('kill-process');
      }, 50);
    });
  });
});