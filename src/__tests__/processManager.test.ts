import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { 
  createProcessManager, 
  executeCommand, 
  killProcess, 
  killAllProcesses,
  validateWorkingDirectory,
  resolveWorkingDirectory,
  hasActiveProcess,
  getActiveProcessCount
} from '../processManager';

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
      setTimeout(() => {
        this.emit('exit', 0, signal);
      }, 0);
    }
  }
}

describe('Process Manager', () => {
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess as any);
  });

  describe('createProcessManager', () => {
    it('should create a process manager with correct base directory', () => {
      const manager = createProcessManager('/test/base/directory');
      
      expect(manager.activeProcesses).toBeInstanceOf(Map);
      expect(manager.baseDirectory).toBe('/test/base/directory');
      expect(manager.activeProcesses.size).toBe(0);
    });
  });

  describe('validateWorkingDirectory', () => {
    it('should return true for valid working directory', () => {
      const baseDir = '/test/base';
      const workingDir = '/test/base/subdir';
      
      expect(validateWorkingDirectory(workingDir, baseDir)).toBe(true);
    });

    it('should return false for invalid working directory (path traversal)', () => {
      const baseDir = '/test/base';
      const workingDir = '/test/other';
      
      expect(validateWorkingDirectory(workingDir, baseDir)).toBe(false);
    });
  });

  describe('resolveWorkingDirectory', () => {
    it('should return base directory when no relative path is provided', () => {
      const baseDir = '/test/base';
      const result = resolveWorkingDirectory(baseDir);
      
      expect(result).toBe(baseDir);
    });

    it('should resolve relative path correctly', () => {
      const baseDir = '/test/base';
      const relativePath = 'subdir';
      const result = resolveWorkingDirectory(baseDir, relativePath);
      
      expect(result).toBe('/test/base/subdir');
    });
  });

  describe('executeCommand', () => {
    it('should spawn claude process with correct arguments', () => {
      const manager = createProcessManager('/test/base/directory');
      const options = {
        socketId: 'test-socket',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      };

      executeCommand(manager, options);

      expect(mockSpawn).toHaveBeenCalledWith('claude', ['-p', 'hello world'], {
        cwd: '/test/base/directory',
        env: process.env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(mockProcess.stdin.end).toHaveBeenCalled();
    });

    it('should spawn claude process with relative path', () => {
      const manager = createProcessManager('/test/base/directory');
      const options = {
        socketId: 'test-socket',
        command: 'hello world',
        relativePath: 'subdir',
        workingDirectory: '/test/base/directory'
      };

      executeCommand(manager, options);

      expect(mockSpawn).toHaveBeenCalledWith('claude', ['-p', 'hello world'], {
        cwd: '/test/base/directory/subdir',
        env: process.env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should prevent directory traversal attacks', () => {
      const manager = createProcessManager('/test/base/directory');
      const options = {
        socketId: 'test-socket',
        command: 'hello world',
        relativePath: '../../../etc/passwd',
        workingDirectory: '/test/base/directory'
      };

      expect(() => {
        executeCommand(manager, options);
      }).toThrow('Working directory must be within the base directory');
    });

    it('should kill existing process before starting new one', () => {
      const manager = createProcessManager('/test/base/directory');
      const options = {
        socketId: 'test-socket',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      };

      // Start first process
      const firstProcess = executeCommand(manager, options);
      const killSpy = jest.spyOn(firstProcess, 'kill');

      // Start second process
      executeCommand(manager, options);

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    });

    it('should store process in active processes map', () => {
      const manager = createProcessManager('/test/base/directory');
      const options = {
        socketId: 'test-socket',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      };

      executeCommand(manager, options);

      expect(manager.activeProcesses.has('test-socket')).toBe(true);
      expect(getActiveProcessCount(manager)).toBe(1);
    });
  });

  describe('killProcess', () => {
    it('should kill process and remove from active processes', () => {
      const manager = createProcessManager('/test/base/directory');
      const options = {
        socketId: 'test-socket',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      };

      const process = executeCommand(manager, options);
      const killSpy = jest.spyOn(process, 'kill');

      killProcess(manager, 'test-socket');

      expect(killSpy).toHaveBeenCalledWith('SIGTERM');
      expect(hasActiveProcess(manager, 'test-socket')).toBe(false);
    });

    it('should handle killing non-existent process gracefully', () => {
      const manager = createProcessManager('/test/base/directory');

      expect(() => {
        killProcess(manager, 'non-existent-socket');
      }).not.toThrow();
    });
  });

  describe('killAllProcesses', () => {
    it('should kill all active processes', () => {
      const manager = createProcessManager('/test/base/directory');
      
      const process1 = executeCommand(manager, {
        socketId: 'socket1',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      });
      
      const process2 = executeCommand(manager, {
        socketId: 'socket2',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      });

      const killSpy1 = jest.spyOn(process1, 'kill');
      const killSpy2 = jest.spyOn(process2, 'kill');

      killAllProcesses(manager);

      expect(killSpy1).toHaveBeenCalledWith('SIGTERM');
      expect(killSpy2).toHaveBeenCalledWith('SIGTERM');
      expect(getActiveProcessCount(manager)).toBe(0);
    });
  });

  describe('utility functions', () => {
    it('should correctly report active process status', () => {
      const manager = createProcessManager('/test/base/directory');
      
      expect(hasActiveProcess(manager, 'test-socket')).toBe(false);
      
      executeCommand(manager, {
        socketId: 'test-socket',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      });
      
      expect(hasActiveProcess(manager, 'test-socket')).toBe(true);
    });

    it('should correctly count active processes', () => {
      const manager = createProcessManager('/test/base/directory');
      
      expect(getActiveProcessCount(manager)).toBe(0);
      
      executeCommand(manager, {
        socketId: 'socket1',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      });
      
      expect(getActiveProcessCount(manager)).toBe(1);
      
      executeCommand(manager, {
        socketId: 'socket2',
        command: 'hello world',
        workingDirectory: '/test/base/directory'
      });
      
      expect(getActiveProcessCount(manager)).toBe(2);
    });
  });
});