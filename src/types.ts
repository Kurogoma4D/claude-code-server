import { ChildProcessWithoutNullStreams } from 'child_process';

export interface ClaudeCommand {
  command: string;
  relativePath?: string;
}

export interface ProcessOutput {
  type: 'stdout' | 'stderr' | 'exit' | 'error' | 'system';
  data: string | number;
  timestamp: number;
}

export interface ServerConfig {
  baseDirectory: string;
  port: number;
}

export interface ProcessManager {
  activeProcesses: Map<string, ChildProcessWithoutNullStreams>;
  baseDirectory: string;
}

export interface ExecuteCommandOptions {
  socketId: string;
  command: string;
  relativePath?: string;
  workingDirectory: string;
}

export type ProcessEventHandler = (output: ProcessOutput) => void;