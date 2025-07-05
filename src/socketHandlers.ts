import { Socket } from 'socket.io';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { ProcessManager, ClaudeCommand, ProcessOutput, ProcessEventHandler } from './types';
import { executeCommand, killProcess } from './processManager';

export const createProcessEventHandlers = (
  socket: Socket,
  manager: ProcessManager,
  socketId: string
) => {
  const emitOutput = (output: ProcessOutput): void => {
    socket.emit('output', output);
  };

  const handleProcessSpawn = (process: ChildProcessWithoutNullStreams): void => {
    emitOutput({
      type: 'system',
      data: `Process started with PID: ${process.pid}`,
      timestamp: Date.now()
    });

    // Spawn event
    process.on('spawn', () => {
      console.log('Process spawned successfully');
      emitOutput({
        type: 'system',
        data: 'Claude process spawned successfully',
        timestamp: Date.now()
      });
    });

    // stdout handler
    process.stdout.on('data', (data: Buffer) => {
      console.log(`stdout received (${data.length} bytes): ${data.toString()}`);
      emitOutput({
        type: 'stdout',
        data: data.toString(),
        timestamp: Date.now()
      });
    });

    // stderr handler
    process.stderr.on('data', (data: Buffer) => {
      console.log(`stderr received (${data.length} bytes): ${data.toString()}`);
      emitOutput({
        type: 'stderr',
        data: data.toString(),
        timestamp: Date.now()
      });
    });

    // exit handler
    process.on('exit', (code: number | null, signal: string | null) => {
      console.log(`Process exited with code: ${code}, signal: ${signal}`);
      emitOutput({
        type: 'exit',
        data: code || 0,
        timestamp: Date.now()
      });
      killProcess(manager, socketId);
    });

    // error handler
    process.on('error', (error: Error) => {
      console.error(`Process error: ${error.message}`);
      emitOutput({
        type: 'error',
        data: error.message,
        timestamp: Date.now()
      });
      killProcess(manager, socketId);
    });

    // close handler
    process.on('close', (code: number | null, signal: string | null) => {
      console.log(`Process closed with code: ${code}, signal: ${signal}`);
    });
  };

  return { emitOutput, handleProcessSpawn };
};

export const handleExecuteCommand = (
  socket: Socket,
  manager: ProcessManager,
  data: ClaudeCommand
): void => {
  const { command, relativePath } = data;
  const socketId = socket.id;
  
  console.log(`Executing command: ${command}${relativePath ? ` in ${relativePath}` : ''}`);

  try {
    const process = executeCommand(manager, {
      socketId,
      command,
      relativePath,
      workingDirectory: manager.baseDirectory
    });

    const { handleProcessSpawn } = createProcessEventHandlers(socket, manager, socketId);
    handleProcessSpawn(process);

  } catch (error) {
    const output: ProcessOutput = {
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    };
    socket.emit('output', output);
  }
};

export const handleKillProcess = (
  socket: Socket,
  manager: ProcessManager
): void => {
  killProcess(manager, socket.id);
  socket.emit('process-killed');
};

export const handleDisconnect = (
  socket: Socket,
  manager: ProcessManager
): void => {
  console.log(`Client disconnected: ${socket.id}`);
  killProcess(manager, socket.id);
};