#!/usr/bin/env node

// テスト環境でのサーバー起動スクリプト
// 環境変数を正しく設定してからサーバーを起動する

const path = require('path');
const { spawn } = require('child_process');

// モックディレクトリをPATHに追加
const mockDir = path.join(process.cwd(), 'e2e', 'temp-bin');
process.env.PATH = `${mockDir}:${process.env.PATH}`;

console.log('🔧 Test environment setup:');
console.log(`📁 Mock directory: ${mockDir}`);
console.log(`🔍 PATH: ${process.env.PATH.split(':').slice(0, 3).join(':')}`);

// デバッグ用：claudeコマンドの場所を確認
const { execSync } = require('child_process');
try {
  const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
  console.log(`✅ Using claude at: ${claudePath}`);
} catch (error) {
  console.log('❌ Claude command not found in PATH');
}

// サーバーを起動
const serverProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  env: process.env
});

// シグナルハンドリング
process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
});

serverProcess.on('exit', (code) => {
  process.exit(code);
});