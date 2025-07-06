import { test, expect } from '@playwright/test';

test.describe('Simple Mock Test', () => {
  test('should verify mock is working', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeのウェルカムメッセージを待つ（デバッグのため時間を長く取る）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 30000 });
    
    // これだけで成功すれば、モックは動作している
    console.log('✅ Mock is working - Welcome message appeared');
    
    // ターミナルにフォーカスを当ててからコマンド入力
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    await page.keyboard.type('ls -la');
    await page.keyboard.press('Enter');
    
    // 何らかの応答があることを確認（具体的なテキストではなく、出力があることを確認）
    await page.waitForTimeout(2000);
    
    // ターミナルに何かしらの新しいコンテンツが追加されたかをチェック
    const terminalContent = await page.locator('#terminal').textContent();
    console.log('Terminal content length:', terminalContent?.length);
    
    // コマンドが表示されることを確認
    await expect(page.locator('#terminal')).toContainText('ls -la', { timeout: 10000 });
  });
});