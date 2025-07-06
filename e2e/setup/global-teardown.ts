import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  // モックディレクトリをクリーンアップ
  const mockDir = path.join(process.cwd(), 'e2e', 'temp-bin');
  
  if (fs.existsSync(mockDir)) {
    fs.rmSync(mockDir, { recursive: true, force: true });
    console.log('🧹 Claude mock cleanup completed');
  }
}

export default globalTeardown;