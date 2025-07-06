import * as pty from 'node-pty';
import path from 'path';

interface PtyProcess {
  pty: pty.IPty;
  socketId: string;
  workingDirectory: string;
}

interface PtyManager {
  activeProcesses: Map<string, PtyProcess>;
  baseDirectory: string;
}

export function createPtyManager(baseDirectory: string): PtyManager {
  return {
    activeProcesses: new Map(),
    baseDirectory: path.resolve(baseDirectory)
  };
}

export function createPty(
  manager: PtyManager,
  socketId: string,
  workingDirectory: string,
  onData: (data: string) => void,
  onExit: (code: number, signal: number) => void
): pty.IPty | null {
  // Kill existing PTY if any
  const existing = manager.activeProcesses.get(socketId);
  if (existing) {
    existing.pty.kill();
    manager.activeProcesses.delete(socketId);
  }

  try {
    const ptyProcess = pty.spawn('claude', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: workingDirectory,
      env: process.env
    });

    manager.activeProcesses.set(socketId, {
      pty: ptyProcess,
      socketId,
      workingDirectory
    });

    ptyProcess.onData(onData);
    ptyProcess.onExit(({ exitCode, signal }) => {
      manager.activeProcesses.delete(socketId);
      onExit(exitCode, signal || 0);
    });

    return ptyProcess;
  } catch (error) {
    console.error('Failed to spawn PTY:', error);
    return null;
  }
}

export function writeToPty(manager: PtyManager, socketId: string, data: string): boolean {
  const process = manager.activeProcesses.get(socketId);
  if (process?.pty) {
    process.pty.write(data);
    return true;
  }
  return false;
}

export function resizePty(manager: PtyManager, socketId: string, cols: number, rows: number): boolean {
  const process = manager.activeProcesses.get(socketId);
  if (process?.pty) {
    process.pty.resize(cols, rows);
    return true;
  }
  return false;
}

export function killPty(manager: PtyManager, socketId: string): boolean {
  const process = manager.activeProcesses.get(socketId);
  if (process) {
    process.pty.kill();
    manager.activeProcesses.delete(socketId);
    return true;
  }
  return false;
}

export function killAllPtys(manager: PtyManager): void {
  manager.activeProcesses.forEach((process) => {
    process.pty.kill();
  });
  manager.activeProcesses.clear();
}