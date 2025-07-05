import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';

export class ClaudeCodeManager {
  private activeProcesses: Map<string, ChildProcessWithoutNullStreams> = new Map();
  private baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = path.resolve(baseDirectory);
    console.log(`Base directory set to: ${this.baseDirectory}`);
  }

  executeCommand(socketId: string, command: string, relativePath?: string): ChildProcessWithoutNullStreams {
    // 既存のプロセスがあれば終了
    this.killProcess(socketId);

    // 作業ディレクトリを決定（相対パスが指定されていればベースディレクトリと結合）
    const workingDir = relativePath 
      ? path.resolve(this.baseDirectory, relativePath)
      : this.baseDirectory;

    // セキュリティ: 作業ディレクトリがベースディレクトリ内にあることを確認
    if (!workingDir.startsWith(this.baseDirectory)) {
      throw new Error('Working directory must be within the base directory');
    }

    // 実際のclaudeコマンド
    const claudeProcess = spawn('claude', ['-p', command], {
      cwd: workingDir,
      env: { ...process.env },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(`Executing in: ${workingDir}`);
    console.log(`Command: claude -p ${command}`);
    console.log(`Process PID: ${claudeProcess.pid}`);
    
    // stdinを閉じて、入力待ちを防ぐ
    claudeProcess.stdin.end();
    
    this.activeProcesses.set(socketId, claudeProcess);

    return claudeProcess;
  }

  killProcess(socketId: string): void {
    const process = this.activeProcesses.get(socketId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(socketId);
    }
  }

  killAllProcesses(): void {
    this.activeProcesses.forEach((process, socketId) => {
      process.kill('SIGTERM');
    });
    this.activeProcesses.clear();
  }
}