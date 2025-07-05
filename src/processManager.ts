import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { ProcessManager, ExecuteCommandOptions } from './types';

export const createProcessManager = (baseDirectory: string): ProcessManager => {
  const resolvedBaseDirectory = path.resolve(baseDirectory);
  console.log(`Base directory set to: ${resolvedBaseDirectory}`);
  
  return {
    activeProcesses: new Map<string, ChildProcessWithoutNullStreams>(),
    baseDirectory: resolvedBaseDirectory,
  };
};

export const validateWorkingDirectory = (
  workingDir: string,
  baseDirectory: string
): boolean => {
  return workingDir.startsWith(baseDirectory);
};

export const resolveWorkingDirectory = (
  baseDirectory: string,
  relativePath?: string
): string => {
  return relativePath 
    ? path.resolve(baseDirectory, relativePath)
    : baseDirectory;
};

export const executeCommand = (
  manager: ProcessManager,
  options: ExecuteCommandOptions
): ChildProcessWithoutNullStreams => {
  const { socketId, command, relativePath } = options;
  
  // Kill existing process if any
  killProcess(manager, socketId);

  // Resolve working directory
  const workingDir = resolveWorkingDirectory(manager.baseDirectory, relativePath);

  // Security validation
  if (!validateWorkingDirectory(workingDir, manager.baseDirectory)) {
    throw new Error('Working directory must be within the base directory');
  }

  // Spawn Claude process
  const claudeProcess = spawn('claude', ['-p', command], {
    cwd: workingDir,
    env: { ...process.env },
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log(`Executing in: ${workingDir}`);
  console.log(`Command: claude -p ${command}`);
  console.log(`Process PID: ${claudeProcess.pid}`);
  
  // Close stdin to prevent hanging on input prompts
  claudeProcess.stdin.end();
  
  // Store the process
  manager.activeProcesses.set(socketId, claudeProcess);

  return claudeProcess;
};

export const killProcess = (manager: ProcessManager, socketId: string): void => {
  const process = manager.activeProcesses.get(socketId);
  if (process) {
    process.kill('SIGTERM');
    manager.activeProcesses.delete(socketId);
  }
};

export const killAllProcesses = (manager: ProcessManager): void => {
  manager.activeProcesses.forEach((process) => {
    process.kill('SIGTERM');
  });
  manager.activeProcesses.clear();
};

export const hasActiveProcess = (manager: ProcessManager, socketId: string): boolean => {
  return manager.activeProcesses.has(socketId);
};

export const getActiveProcessCount = (manager: ProcessManager): number => {
  return manager.activeProcesses.size;
};