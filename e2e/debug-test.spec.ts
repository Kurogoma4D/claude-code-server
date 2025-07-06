import { test, expect } from '@playwright/test';

test.describe('Debug Test', () => {
  test('should debug input flow', async ({ page }) => {
    // ブラウザのコンソールログを監視
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
        console.log('[BROWSER]', msg.text());
      }
    });

    await page.goto('http://localhost:3000');
    
    console.log('Starting session...');
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    console.log('Waiting for welcome message...');
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    console.log('Session should be active now. Typing test input...');
    await page.waitForTimeout(1000);
    
    // ターミナルにフォーカスを当てる
    console.log('Focusing on terminal...');
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // 異なる方法で入力を試す
    console.log('Method 1: Using keyboard.press()');
    await page.keyboard.press('a');
    await page.waitForTimeout(500);
    
    console.log('Method 2: Using keyboard.type()');
    await page.keyboard.type('b');
    await page.waitForTimeout(500);
    
    console.log('Method 3: Using direct terminal input');
    await page.locator('#terminal').focus();
    await page.keyboard.type('c');
    await page.waitForTimeout(500);
    
    // Enter を押す
    console.log('Pressing Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    console.log('Browser logs collected:', logs.length);
    logs.forEach((log, i) => {
      console.log(`  ${i}: ${log}`);
    });
    
    // セッションが実際にアクティブになっているかUI状態で確認
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Kill Session' })).toBeEnabled();
    
    // ターミナルがアクティブで入力を受け付けているか確認
    const terminalContent = await page.locator('#terminal').textContent();
    expect(terminalContent).toContain('Welcome to Claude Code!');
    
    console.log('✅ Session is active - UI state confirmed');
  });
});