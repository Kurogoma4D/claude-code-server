import { Socket } from 'socket.io';
import path from 'path';
import { createPty, writeToPty, resizePty, killPty } from './ptyManager';

interface StartSessionData {
  relativePath?: string;
  cols?: number;
  rows?: number;
}

interface TerminalInputData {
  data: string;
}

interface TerminalResizeData {
  cols: number;
  rows: number;
}

export function handleStartSession(socket: Socket, manager: any, data: StartSessionData) {
  const workingDirectory = data.relativePath
    ? path.resolve(manager.baseDirectory, data.relativePath)
    : manager.baseDirectory;

  // Validate directory
  if (!workingDirectory.startsWith(manager.baseDirectory)) {
    socket.emit('terminal-output', {
      type: 'error',
      data: 'Error: Cannot navigate outside base directory',
      timestamp: Date.now()
    });
    return;
  }

  const ptyProcess = createPty(
    manager,
    socket.id,
    workingDirectory,
    data.cols || 80,
    data.rows || 30,
    (data) => {
      socket.emit('terminal-output', {
        type: 'data',
        data,
        timestamp: Date.now()
      });
    },
    (exitCode, signal) => {
      socket.emit('terminal-output', {
        type: 'exit',
        data: { exitCode, signal },
        timestamp: Date.now()
      });
    }
  );

  if (ptyProcess) {
    socket.emit('terminal-output', {
      type: 'system',
      data: `Claude interactive session started in ${workingDirectory}`,
      timestamp: Date.now()
    });
  } else {
    socket.emit('terminal-output', {
      type: 'error',
      data: 'Failed to start Claude session',
      timestamp: Date.now()
    });
  }
}

export function handleTerminalInput(socket: Socket, manager: any, data: TerminalInputData) {
  const success = writeToPty(manager, socket.id, data.data);
  if (!success) {
    socket.emit('terminal-output', {
      type: 'error',
      data: 'No active session. Please start a session first.',
      timestamp: Date.now()
    });
  }
}

export function handleTerminalResize(socket: Socket, manager: any, data: TerminalResizeData) {
  resizePty(manager, socket.id, data.cols, data.rows);
}

export function handleKillSession(socket: Socket, manager: any) {
  const killed = killPty(manager, socket.id);
  if (killed) {
    socket.emit('terminal-output', {
      type: 'system',
      data: 'Session terminated',
      timestamp: Date.now()
    });
  }
}

export function handlePtyDisconnect(socket: Socket, manager: any) {
  console.log(`Client disconnected: ${socket.id}`);
  killPty(manager, socket.id);
}