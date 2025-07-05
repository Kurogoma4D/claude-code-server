import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { ClaudeCodeManager } from '../ClaudeCodeManager';

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

  kill(signal?: string) {
    this.emit('exit', 0, signal);
  }
}

describe('ClaudeCodeManager', () => {
  let manager: ClaudeCodeManager;
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess as any);
    manager = new ClaudeCodeManager('/test/base/directory');
  });

  describe('executeCommand', () => {
    it('should spawn claude process with correct arguments', () => {
      const socketId = 'test-socket';
      const command = 'hello world';

      manager.executeCommand(socketId, command);

      expect(mockSpawn).toHaveBeenCalledWith('claude', ['-p', command], {
        cwd: '/test/base/directory',
        env: process.env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should spawn claude process with relative path', () => {
      const socketId = 'test-socket';
      const command = 'hello world';
      const relativePath = 'subdir';

      manager.executeCommand(socketId, command, relativePath);

      expect(mockSpawn).toHaveBeenCalledWith('claude', ['-p', command], {
        cwd: '/test/base/directory/subdir',
        env: process.env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should prevent directory traversal attacks', () => {
      const socketId = 'test-socket';
      const command = 'hello world';
      const relativePath = '../../../etc/passwd';

      expect(() => {
        manager.executeCommand(socketId, command, relativePath);
      }).toThrow('Working directory must be within the base directory');
    });

    it('should kill existing process before starting new one', () => {
      const socketId = 'test-socket';
      const command = 'hello world';

      // Start first process
      const firstProcess = manager.executeCommand(socketId, command);
      const killSpy = jest.spyOn(firstProcess, 'kill');

      // Start second process
      manager.executeCommand(socketId, command);

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    });

    it('should close stdin after spawning process', () => {
      const socketId = 'test-socket';
      const command = 'hello world';

      manager.executeCommand(socketId, command);

      expect(mockProcess.stdin.end).toHaveBeenCalled();
    });
  });

  describe('killProcess', () => {
    it('should kill process and remove from active processes', () => {
      const socketId = 'test-socket';
      const command = 'hello world';

      const process = manager.executeCommand(socketId, command);
      const killSpy = jest.spyOn(process, 'kill');

      manager.killProcess(socketId);

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle killing non-existent process', () => {
      const socketId = 'non-existent-socket';

      expect(() => {
        manager.killProcess(socketId);
      }).not.toThrow();
    });
  });

  describe('killAllProcesses', () => {
    it('should kill all active processes', () => {
      const socketId1 = 'socket1';
      const socketId2 = 'socket2';
      const command = 'hello world';

      const process1 = manager.executeCommand(socketId1, command);
      const process2 = manager.executeCommand(socketId2, command);

      const killSpy1 = jest.spyOn(process1, 'kill');
      const killSpy2 = jest.spyOn(process2, 'kill');

      manager.killAllProcesses();

      expect(killSpy1).toHaveBeenCalledWith('SIGTERM');
      expect(killSpy2).toHaveBeenCalledWith('SIGTERM');
    });
  });
});