# E2E Tests for Claude Interactive Terminal

このディレクトリには、Claude Interactive TerminalのPlaywrightを使用したE2Eテストが含まれています。

## テストシナリオ

### 基本機能テスト (`terminal.spec.ts`)

1. **ターミナルインターフェースの表示**
   - ヘッダー、接続ステータス、コントロールボタンの確認
   - ターミナルコンテナの表示確認

2. **インタラクティブセッションの開始**
   - Start Sessionボタンのクリック
   - セッション開始メッセージの確認
   - Claudeのウェルカムメッセージの表示

3. **コマンド実行**
   - `ls -la`コマンドの入力と実行
   - Claudeの承認プロンプトへの応答
   - コマンド実行結果の確認

4. **作業ディレクトリの変更**
   - サブディレクトリの指定
   - 正しいパスでのセッション開始確認

5. **セッションの終了**
   - Kill Sessionボタンによるセッション終了
   - プロセス終了メッセージの確認

6. **ターミナルリサイズ**
   - ビューポートサイズ変更時の動作確認
   - ターミナルの適切なリサイズ

7. **セッション状態の維持**
   - 複数コマンドの連続実行
   - セッション内での状態保持確認

8. **ネットワーク切断の処理**
   - オフライン時の適切な状態表示
   - 再接続時の動作確認

9. **無効なディレクトリパスの処理**
   - セキュリティ制限の確認
   - エラーメッセージの表示

10. **ANSIカラーの表示**
    - システムメッセージのカラー表示
    - コマンド出力のカラー対応

### エッジケーステスト

1. **高速なコマンド入力**
   - 連続したコマンド入力の処理

2. **特殊文字の処理**
   - 特殊文字を含むコマンドの実行

3. **Ctrl+C による中断**
   - 実行中のコマンドの中断処理

## テストの実行

```bash
# Playwrightのインストール
npm install --save-dev @playwright/test

# ブラウザのインストール
npx playwright install

# 全てのテストを実行
npx playwright test

# 特定のテストファイルを実行
npx playwright test terminal.spec.ts

# UIモードでテストを実行（デバッグに便利）
npx playwright test --ui

# 特定のブラウザでテストを実行
npx playwright test --project=chromium

# ヘッドレスモードを無効にして実行（ブラウザが表示される）
npx playwright test --headed

# デバッグモードで実行
npx playwright test --debug
```

## テストレポート

テスト実行後、以下のコマンドでHTMLレポートを表示できます：

```bash
npx playwright show-report
```

## CI/CD設定

GitHub Actionsなどでの実行例：

```yaml
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright Browsers
  run: npx playwright install --with-deps
  
- name: Run Playwright tests
  run: npx playwright test
  
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

## トラブルシューティング

1. **タイムアウトエラー**
   - Claudeの応答に時間がかかる場合は、`timeout`値を増やしてください
   - `playwright.config.ts`でグローバルタイムアウトを調整可能

2. **セレクタが見つからない**
   - 要素が表示されるまで適切に待機しているか確認
   - `waitForSelector`や`expect().toBeVisible()`を使用

3. **不安定なテスト**
   - `waitForTimeout`の代わりに適切な待機条件を使用
   - ネットワークリクエストの完了を待つ

## カスタムテストの追加

新しいテストシナリオを追加する場合：

1. `e2e/`ディレクトリに新しい`.spec.ts`ファイルを作成
2. 既存のテストパターンに従って記述
3. 適切な待機処理とアサーションを含める
4. エラーハンドリングのテストも含める