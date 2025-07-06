#!/usr/bin/env node

// Claude CLI のモック実装
// E2Eテスト用にClaude CLIの動作をシミュレートします

const readline = require('readline');
const fs = require('fs');

// PTY環境での動作を改善
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

let inputBuffer = '';
let isInputMode = false;

// ANSIエスケープシーケンス
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// モックされたClaude応答
const mockResponses = {
  'ls -la': {
    approval: true,
    output: `total 512
drwxr-xr-x  16 user  staff   512 Jul  6 12:06 .
drwxr-xr-x   3 user  staff    96 Jul  6 12:06 ..
-rw-r--r--   1 user  staff  1234 Jul  6 12:06 package.json
-rw-r--r--   1 user  staff   567 Jul  6 12:06 README.md
drwxr-xr-x   4 user  staff   128 Jul  6 12:06 src
drwxr-xr-x   3 user  staff    96 Jul  6 12:06 dist`
  },
  'pwd': {
    approval: true,
    output: process.cwd()
  },
  'echo "Session is active"': {
    approval: true,
    output: 'Session is active'
  },
  'echo "Hello, World! @#$%^&*()"': {
    approval: true,
    output: 'Hello, World! @#$%^&*()'
  },
  'ls --color=always': {
    approval: true,
    output: `${colors.blue}src${colors.reset}
${colors.white}package.json${colors.reset}
${colors.white}README.md${colors.reset}
${colors.blue}dist${colors.reset}`
  },
  'sleep 10': {
    approval: true,
    interruptible: true,
    output: '' // sleepコマンドは通常出力しない
  }
};

// ウェルカムメッセージを表示
function showWelcome() {
  process.stdout.write(`${colors.bright}╭───────────────────────────────────────────────────────────╮${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ ✻ Welcome to Claude Code!                                 │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│                                                           │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│   /help for help, /status for your current setup          │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│                                                           │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│   cwd: ${process.cwd().padEnd(48)} │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}╰───────────────────────────────────────────────────────────╯${colors.reset}\n`);
  process.stdout.write(`\n${colors.dim}※ Tip: Use /memory to view and manage Claude memory${colors.reset}\n\n`);
  
  showSuggestion();
}

// 提案を表示
function showSuggestion() {
  process.stdout.write(`${colors.bright}╭──────────────────────────────────────────────────────────────────────────────╮${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ > Try "write a test for CLAUDE.md"                                                │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}╰──────────────────────────────────────────────────────────────────────────────╯${colors.reset}\n`);
  process.stdout.write(`${colors.dim}? for shortcuts${colors.reset}\n`);
}

// 承認プロンプトを表示
function showApprovalPrompt(command) {
  process.stdout.write(`\n⏺ I'll list the contents of the current directory with detailed information.\n\n`);
  process.stdout.write(`⏺ ${colors.green}Bash${colors.reset}(${command})\n`);
  process.stdout.write(`⎿ Running…\n\n`);
  
  process.stdout.write(`${colors.bright}╭──────────────────────────────────────────────────────────────────────────────╮${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ Bash command                                                                   │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│                                                                              │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ ${command.padEnd(76)} │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ List all files with details                                                    │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│                                                                              │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ Do you want to proceed?                                                        │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ ❯ 1. Yes                                                                      │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│   2. Yes, and don't ask again for ${command.split(' ')[0]} commands in                │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│   ${process.cwd().padEnd(70)} │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│   3. No, and tell Claude what to do differently (esc)                       │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}╰──────────────────────────────────────────────────────────────────────────────╯${colors.reset}\n`);
}

// コマンド出力を表示
function showCommandOutput(output) {
  process.stdout.write(`\n⎿ Agent pid ${process.pid}\n`);
  process.stdout.write(output + '\n');
}

// 新しいプロンプトを表示
function showPrompt() {
  process.stdout.write(`\n${colors.bright}╭──────────────────────────────────────────────────────────────────────────────╮${colors.reset}\n`);
  process.stdout.write(`${colors.bright}│ >                                                                              │${colors.reset}\n`);
  process.stdout.write(`${colors.bright}╰──────────────────────────────────────────────────────────────────────────────╯${colors.reset}\n`);
  process.stdout.write(`${colors.dim}? for shortcuts${colors.reset}\n`);
}

let currentCommand = '';
let waitingForApproval = false;
let sleepProcess = null;

// メイン処理
function main() {
  // デバッグログをファイルに出力（stderr を汚さない）
  const logMsg = `[CLAUDE-MOCK] Starting mock claude with args: ${JSON.stringify(process.argv)}\n`;
  fs.appendFileSync('/tmp/claude-mock.log', logMsg);
  
  // 短い遅延の後にウェルカムメッセージを表示
  setTimeout(() => {
    showWelcome();
  }, 500);

  // 新しい入力処理
  process.stdin.on('data', (key) => {
    // ログに記録
    fs.appendFileSync('/tmp/claude-mock.log', `Input received: ${JSON.stringify(key)}\n`);
    
    if (key === '\u0003') { // Ctrl+C
      if (sleepProcess) {
        clearTimeout(sleepProcess);
        sleepProcess = null;
        process.stdout.write(`\n${colors.yellow}^C${colors.reset}\n`);
        setTimeout(() => {
          showPrompt();
        }, 100);
      } else {
        process.stdout.write(`\n${colors.yellow}Goodbye!${colors.reset}\n`);
        process.exit(0);
      }
      return;
    }
    
    if (key === '\r' || key === '\n') { // Enter
      const trimmedInput = inputBuffer.trim();
      // デバッグログ
      const fs = require('fs');
      fs.appendFileSync('/tmp/claude-mock.log', `Command entered: "${trimmedInput}"\n`);
      inputBuffer = '';
      
      if (waitingForApproval) {
        if (trimmedInput === '1' || trimmedInput === '2') {
          // 承認された場合
          waitingForApproval = false;
          const mockResponse = mockResponses[currentCommand];
          
          if (currentCommand === 'sleep 10') {
            // sleepコマンドの場合、中断可能な長時間処理をシミュレート
            sleepProcess = setTimeout(() => {
              showPrompt();
              sleepProcess = null;
            }, 10000);
          } else {
            setTimeout(() => {
              showCommandOutput(mockResponse.output);
              setTimeout(() => {
                showPrompt();
              }, 200);
            }, 500);
          }
        } else if (trimmedInput === '3' || trimmedInput === 'esc') {
          // 拒否された場合
          waitingForApproval = false;
          setTimeout(() => {
            showPrompt();
          }, 200);
        }
        return;
      }

      if (trimmedInput) {
        // コマンドが入力された場合
        currentCommand = trimmedInput;
        
        // 特殊な処理
        if (trimmedInput.startsWith('echo "Test ')) {
          // 複数のテストコマンドの場合
          process.stdout.write(`\n> ${trimmedInput}\n`);
          setTimeout(() => {
            showPrompt();
          }, 100);
          return;
        }
        
        process.stdout.write(`\n> ${trimmedInput}\n`);
        
        if (mockResponses[trimmedInput]) {
          const mockResponse = mockResponses[trimmedInput];
          if (mockResponse.approval) {
            // 承認が必要なコマンドの場合
            waitingForApproval = true;
            setTimeout(() => {
              showApprovalPrompt(trimmedInput);
            }, 300);
          }
        } else {
          // 未知のコマンドの場合
          const fs = require('fs');
          fs.appendFileSync('/tmp/claude-mock.log', `Unknown command: "${trimmedInput}" Available commands: ${Object.keys(mockResponses).join(', ')}\n`);
          setTimeout(() => {
            process.stdout.write(`\n${colors.red}Unknown command: ${trimmedInput}${colors.reset}\n`);
            showPrompt();
          }, 500);
        }
      }
    } else if (key === '\u007f') { // Backspace
      if (inputBuffer.length > 0) {
        inputBuffer = inputBuffer.slice(0, -1);
        process.stdout.write('\b \b');
      }
    } else if (key.length === 1 && key >= ' ' && key <= '~') { // 単一の印刷可能文字
      inputBuffer += key;
      process.stdout.write(key);
    } else if (key.length > 1) { // 複数文字が一度に来た場合
      for (const char of key) {
        if (char >= ' ' && char <= '~') {
          inputBuffer += char;
          process.stdout.write(char);
        }
      }
    }
  });

  // SIGINTハンドラーは新しい入力処理に統合済み
}

main();