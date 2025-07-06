import { test, expect } from '@playwright/test';

test.describe('Claude Interactive Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display the terminal interface', async ({ page }) => {
    // ヘッダーの確認
    await expect(page.getByRole('heading', { name: 'Claude Interactive Terminal' })).toBeVisible();
    
    // 接続ステータスの確認
    await expect(page.getByText('Connected')).toBeVisible();
    
    // コントロールボタンの確認
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Kill Session' })).toBeDisabled();
    
    // ターミナルコンテナの確認
    await expect(page.locator('#terminal')).toBeVisible();
  });

  test('should start an interactive Claude session', async ({ page }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // セッション開始の確認
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Kill Session' })).toBeEnabled();
    
    // システムメッセージの確認
    await expect(page.getByText('[System] Claude interactive session started')).toBeVisible();
    
    // Claudeのウェルカムメッセージを待つ
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
  });

  test('should execute commands in Claude session', async ({ page }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeの準備を待つ（ウェルカムメッセージ）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    // ターミナルにフォーカスを当てる
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // コマンド入力（ls -la）
    await page.keyboard.type('ls -la');
    await page.keyboard.press('Enter');
    
    // Claudeの応答を待つ（承認プロンプト）
    await expect(page.getByText('Do you want to proceed?')).toBeVisible({ timeout: 15000 });
    
    // 承認（1を入力）
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    // コマンド実行結果を確認
    await expect(page.getByText(/total \d+/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('package.json')).toBeVisible();
  });


  test('should kill active session', async ({ page }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeの準備を待つ
    await page.waitForTimeout(2000);
    
    // セッション終了
    await page.getByRole('button', { name: 'Kill Session' }).click();
    
    // セッション終了の確認
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Kill Session' })).toBeDisabled();
    
    // プロセス終了メッセージの確認
    await expect(page.getByText('[Process exited with code')).toBeVisible();
  });

  test('should handle terminal resize', async ({ page }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // ウィンドウサイズ変更
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // ターミナルがリサイズされたことを確認（視覚的な確認が必要）
    const terminal = page.locator('#terminal');
    await expect(terminal).toBeVisible();
    
    // さらに小さくリサイズ
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    // ターミナルが引き続き表示されていることを確認
    await expect(terminal).toBeVisible();
  });

  test('should maintain session state during interaction', async ({ page }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeの準備を待つ（ウェルカムメッセージ）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    // ターミナルにフォーカスを当てる
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // 最初のコマンド
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');
    
    // 承認プロンプトを待つ
    await expect(page.getByText('Do you want to proceed?')).toBeVisible({ timeout: 15000 });
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    // 結果を待つ
    await page.waitForTimeout(1000);
    
    // 次のコマンド（セッションが維持されていることを確認）
    await page.keyboard.type('echo "Session is active"');
    await page.keyboard.press('Enter');
    
    // 承認プロンプトを待つ
    await expect(page.getByText('Do you want to proceed?')).toBeVisible({ timeout: 15000 });
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    // エコー結果の確認（コマンド出力のみを対象にする）
    await expect(page.locator('#terminal').getByText('Session is active').last()).toBeVisible({ timeout: 15000 });
  });

  test('should handle network disconnection gracefully', async ({ page, context }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // 接続状態を確認
    await expect(page.getByText('Connected')).toBeVisible();
    
    // WebSocketを強制的に切断（JavaScript経由）
    await page.evaluate(() => {
      // @ts-ignore
      if (window.socket) {
        // @ts-ignore
        window.socket.disconnect();
      }
    });
    
    // 切断ステータスの確認
    await expect(page.getByText('Disconnected')).toBeVisible({ timeout: 5000 });
    
    // ボタンの状態確認（切断時はセッションが非アクティブになる）
    await expect(page.getByRole('button', { name: 'Start Session' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Kill Session' })).toBeDisabled();
    
    // 少し待ってから再接続を確認（Socket.ioは自動再接続する）
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });
  });


  test('should display ANSI colors correctly', async ({ page }) => {
    // セッション開始
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // システムメッセージ（緑色）の確認
    const systemMessage = page.locator('text=[System]').first();
    await expect(systemMessage).toBeVisible();
    
    // Claudeの準備を待つ（ウェルカムメッセージ）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    // ターミナルにフォーカスを当てる
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // カラー出力を生成するコマンド
    await page.keyboard.type('ls --color=always');
    await page.keyboard.press('Enter');
    
    // 承認プロンプトを待つ
    await expect(page.getByText('Do you want to proceed?')).toBeVisible({ timeout: 15000 });
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    // カラー出力が表示されることを確認（ディレクトリは通常青色で表示される）
    await expect(page.locator('#terminal')).toContainText('src', { timeout: 15000 });
  });
});

test.describe('Claude Terminal - Edge Cases', () => {
  test('should handle rapid command inputs', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeの準備を待つ（ウェルカムメッセージ）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    // ターミナルにフォーカスを当てる
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // 複数のコマンドを素早く入力
    for (let i = 0; i < 3; i++) {
      await page.keyboard.type(`echo "Test ${i}"`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }
    
    // 最初のコマンドが表示されていることを確認
    await expect(page.locator('#terminal')).toContainText('echo "Test 0"', { timeout: 10000 });
  });

  test('should handle special characters in commands', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeの準備を待つ（ウェルカムメッセージ）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    // ターミナルにフォーカスを当てる
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // 特殊文字を含むコマンド
    await page.keyboard.type('echo "Hello, World! @#$%^&*()"');
    await page.keyboard.press('Enter');
    
    // 承認プロンプトを待つ
    await expect(page.getByText('Do you want to proceed?')).toBeVisible({ timeout: 15000 });
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    // 出力の確認（コマンド出力のみを対象にする）
    await expect(page.locator('#terminal').getByText('Hello, World! @#$%^&*()').last()).toBeVisible({ timeout: 15000 });
  });

  test('should handle Ctrl+C interruption', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('button', { name: 'Start Session' }).click();
    
    // Claudeの準備を待つ（ウェルカムメッセージ）
    await expect(page.getByText('Welcome to Claude Code!')).toBeVisible({ timeout: 10000 });
    
    // ターミナルにフォーカスを当てる
    await page.locator('#terminal').click();
    await page.waitForTimeout(500);
    
    // 長時間実行されるコマンドを開始
    await page.keyboard.type('sleep 10');
    await page.keyboard.press('Enter');
    
    // 承認プロンプトを待つ
    await expect(page.getByText('Do you want to proceed?')).toBeVisible({ timeout: 15000 });
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    
    // Ctrl+Cで中断
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control+C');
    
    // 中断されたことを確認（新しいプロンプトが表示される）
    await expect(page.locator('#terminal')).toContainText('>', { timeout: 10000 });
  });
});