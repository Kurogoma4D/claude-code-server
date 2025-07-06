import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  // モックディレクトリを作成
  const mockDir = path.join(process.cwd(), 'e2e', 'temp-bin');
  if (!fs.existsSync(mockDir)) {
    fs.mkdirSync(mockDir, { recursive: true });
  }

  // claudeコマンドのモックを作成
  const mockClaudePath = path.join(mockDir, 'claude');
  const mockScriptPath = path.join(process.cwd(), 'e2e', 'mocks', 'claude-mock.js');
  
  // シンボリックリンクまたはスクリプトを作成
  const mockScript = `#!/bin/bash
node "${mockScriptPath}" "$@"
`;
  
  fs.writeFileSync(mockClaudePath, mockScript);
  fs.chmodSync(mockClaudePath, '755');

  // 環境変数にモックのパスを追加
  process.env.PATH = `${mockDir}:${process.env.PATH}`;
  
  console.log('✅ Claude mock setup completed');
  console.log(`📁 Mock directory: ${mockDir}`);
  console.log(`🔧 Mock claude at: ${mockClaudePath}`);
}

export default globalSetup;