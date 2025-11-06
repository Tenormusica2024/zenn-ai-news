# note.com 半自動投稿ツール セットアップガイド（プロトタイプ版）

## 概要

このガイドでは、Zenn記事をnote.comに投稿するための実際の手順を説明します。

**📌 重要**: このドキュメントは実際に存在するファイルに基づいています。

## ⚠️ 重要な制限事項

このツールは**プロトタイプ**です。以下の作業は手動で行う必要があります：

- **Zenn記事のnote.com形式への変換**（Front matter編集が必須）
- **スクリプト内のファイルパス編集**（自分の環境に合わせて変更）
- **認証状態の定期的な更新**（セッション期限切れ時）

完全自動化は現在未実装です。

## 前提条件

- Node.js 18以上
- note.comアカウント
- Git

## 🔒 セキュリティ重要事項

**⚠️ 認証情報は絶対にGitにコミットしないでください**

## 1. note-post-mcp のインストール

### 1-1. リポジトリのクローン

```bash
# Windows
cd %USERPROFILE%\Documents
# Mac/Linux
cd ~/Documents

git clone https://github.com/Go-555/note-post-mcp.git
cd note-post-mcp
```

### 1-2. 依存関係のインストール

```bash
npm install
```

**インストールされるパッケージ**:
- `playwright`: ブラウザ自動化
- `dotenv`: 環境変数管理
- `@modelcontextprotocol/sdk`: MCP Server機能
- `zod`: バリデーション

### 1-3. Playwright ブラウザのインストール

```bash
npx playwright install chromium
```

実行後、Chromiumブラウザがインストールされます。

## 2. note.com 認証状態の取得

### 2-1. ログインスクリプトの実行

`simple-login.js` を使用して手動ログインを実行します：

```javascript
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const statePath = path.join(process.env.USERPROFILE, '.note-state.json');

console.log('ブラウザを起動します...');
console.log('note.comにログインしてください。');
console.log('ログイン完了後、このウィンドウを閉じてください。');

const browser = await chromium.launch({
  headless: false,
  args: ['--lang=ja-JP']
});

const context = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 1280, height: 720 }
});

const page = await context.newPage();
await page.goto('https://note.com/login');

// ブラウザが閉じられるまで待機
await page.waitForEvent('close').catch(() => {});

console.log('認証状態を保存しています...');

try {
  await context.storageState({ path: statePath });
  console.log('✅ 認証状態を保存しました！');
  console.log(`保存先: ${statePath}`);
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
}

await browser.close();
```

### 2-2. ログインスクリプトの実行

```bash
node simple-login.js
```

実行後：
1. ブラウザが自動的に開く
2. note.comのログインページが表示される
3. **手動でログイン**（メールアドレスとパスワードを入力）
4. ログイン完了後、ブラウザウィンドウを閉じる
5. 認証状態が `.note-state.json` に保存される

**確認（OS別）:**
```bash
# Windows
dir %USERPROFILE%\.note-state.json
# Mac/Linux
ls ~/.note-state.json
```

## 3. Zenn記事のnote.com形式への変換

### 3-1. Zenn記事の取得

例: `~/Documents/zenn-ai-news/articles/ai-agents-70-percent-failure-reality-2025.md`

### 3-2. note.com形式への変換

**⚠️ 重要**: 現在のスクリプトは**タイトルと本文のみ**を自動入力します。

**自動入力される項目:**
- タイトル
- 本文

**手動入力が必要な項目:**
- タグ（note.comの画面で直接入力）
- カバー画像
- 公開設定

**変換前（Zenn形式）:**
```markdown
---
title: "AIエージェント、7割失敗してるってマジか"
emoji: "🤖"
type: "tech"
topics: ["AI", "エージェント", "ChatGPT", "機械学習"]
published: false
---

本文...
```

**変換後（note.com形式）:**
```markdown
---
title: "AIエージェント、7割失敗してるってマジか"
tags:
  - AI
  - エージェント
  - ChatGPT
  - 機械学習
---

本文...
```

**手動変換の手順**:
1. Zenn記事のfront matterを編集
2. `emoji`, `type`, `published` を削除
3. `topics` を `tags` に変更
4. `tags` の形式を配列形式に変更

## 4. 下書き保存の実行

### 4-1. 下書き保存スクリプト（save-draft-final.js）

**🚨 セキュリティ警告: このコードをコピーする前に必ずお読みください**
- 以下のコードには `YOUR_USERNAME` などのプレースホルダーが含まれています
- **そのままコピペして実行すると失敗します**
- 必ず自分の環境に合わせてパスを修正してください
- 認証情報（`.note-state.json`）は絶対にGitにコミットしないでください

実際の環境で動作確認済みの`save-draft-final.js`のコード例（ただし、パス編集が必須です）：

```javascript
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const statePath = 'C:/Users/YOUR_USERNAME/.note-state.json';
const markdownPath = 'C:/Users/YOUR_USERNAME/Documents/note-post-mcp/YOUR_ARTICLE.md';

// Markdownファイルを読み込み
const content = fs.readFileSync(markdownPath, 'utf8');

// Front matterとbodyを分離
const lines = content.split('\n');
let inFrontMatter = false;
let frontMatterEnded = false;
let title = '';
const tags = [];
const bodyLines = [];

for (const line of lines) {
  if (line.trim() === '---') {
    if (!frontMatterEnded) {
      inFrontMatter = !inFrontMatter;
      if (!inFrontMatter) {
        frontMatterEnded = true;
      }
      continue;
    }
  }
  
  if (inFrontMatter) {
    if (line.startsWith('title:')) {
      title = line.replace('title:', '').trim().replace(/^[\"']|[\"']$/g, '');
    } else if (line.trim().startsWith('- ')) {
      tags.push(line.trim().substring(2));
    }
  } else if (frontMatterEnded) {
    bodyLines.push(line);
  }
}

const body = bodyLines.join('\n').trim();

console.log('タイトル:', title);
console.log('タグ数:', tags.length);
console.log('本文文字数:', body.length);

// ブラウザを起動
console.log('\n1. ブラウザ起動・認証状態ロード...');
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ 
  storageState: statePath,
  locale: 'ja-JP'
});
const page = await context.newPage();

try {
  console.log('2. エディターページにアクセス...');
  await page.goto('https://editor.note.com/new', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // AIダイアログを閉じる（存在する場合）
  const closeButton = page.locator('button[aria-label*="閉じる"], button:has-text("×")').first();
  if (await closeButton.count() > 0) {
    await closeButton.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  
  console.log('3. タイトルを入力...');
  const titleArea = page.locator('textarea[placeholder*="タイトル"]');
  await titleArea.waitFor({ state: 'visible', timeout: 10000 });
  await titleArea.fill(title);
  await page.waitForTimeout(1000);
  
  console.log('4. 本文を入力...');
  const editor = page.locator('div[contenteditable="true"][role="textbox"]').first();
  await editor.waitFor({ state: 'visible' });
  await editor.click();
  await page.waitForTimeout(500);
  
  // 本文を段落ごとに入力
  const paragraphs = body.split('\n\n');
  for (let i = 0; i < paragraphs.length; i++) {
    await editor.pressSequentially(paragraphs[i], { delay: 5 });
    if (i < paragraphs.length - 1) {
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
    }
    
    // 進捗表示
    if ((i + 1) % 10 === 0) {
      console.log(`   ${i + 1}/${paragraphs.length} 段落完了`);
    }
  }
  
  console.log('5. 下書き保存ボタンをクリック...');
  await page.waitForTimeout(2000);
  
  const saveButton = page.locator('button:has-text("下書き保存")').first();
  await saveButton.waitFor({ state: 'visible', timeout: 10000 });
  
  // ボタンが有効になるまで待機
  for (let i = 0; i < 20; i++) {
    if (await saveButton.isEnabled()) break;
    await page.waitForTimeout(100);
  }
  
  await saveButton.click();
  console.log('   ✓ 下書き保存ボタンをクリックしました');
  
  // 「保存しました」メッセージを待つ
  await page.locator('text=保存しました').waitFor({ timeout: 5000 }).catch(() => {
    console.log('   ⚠ 「保存しました」メッセージは表示されませんでしたが、処理は続行します');
  });
  
  await page.waitForTimeout(3000);
  
  console.log('\n6. 最終確認スクリーンショット...');
  await page.screenshot({ path: 'C:/Users/YOUR_USERNAME/Documents/note-post-mcp/draft-saved-final.png', fullPage: true });
  
  const finalUrl = page.url();
  console.log('\n✅ 完了！');
  console.log('エディターURL:', finalUrl);
  console.log('スクリーンショット: draft-saved-final.png');
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  await page.screenshot({ path: 'C:/Users/YOUR_USERNAME/Documents/note-post-mcp/draft-error-final.png', fullPage: true });
}

await browser.close();
```

### 4-2. スクリプトのカスタマイズ

**⚠️ 重要**: 上記のサンプルコードは既にプレースホルダー（`YOUR_USERNAME`, `YOUR_ARTICLE.md`）を使用しています。実際に使用する前に、これらを自分の環境に合わせて変更してください：

**OS別のパス設定例:**

**Windows:**
```javascript
const statePath = 'C:/Users/YOUR_USERNAME/.note-state.json';
const markdownPath = 'C:/Users/YOUR_USERNAME/Documents/note-post-mcp/YOUR_ARTICLE.md';
```
- `YOUR_USERNAME` → あなたのWindowsユーザー名
- `YOUR_ARTICLE.md` → 実際の記事ファイル名

**Mac/Linux:**
```javascript
const statePath = `${process.env.HOME}/.note-state.json`;
const markdownPath = `${process.env.HOME}/Documents/note-post-mcp/YOUR_ARTICLE.md`;
```
- `YOUR_ARTICLE.md` → 実際の記事ファイル名

**スクリーンショット保存先**（295行目、304行目）:
- デフォルト: `C:/Users/YOUR_USERNAME/Documents/note-post-mcp/`
- **このディレクトリが存在しない場合、スクリプトは失敗します**
- 事前に作成するか、既存のディレクトリに変更してください

### 4-3. 下書き保存の実行

```bash
node save-draft-final.js
```

**実行結果例:**
```
タイトル: AIエージェント、7割失敗してるってマジか
タグ数: 4
本文文字数: 6699

1. ブラウザ起動・認証状態ロード...
2. エディターページにアクセス...
3. タイトルを入力...
4. 本文を入力...
   10/50 段落完了
   20/50 段落完了
   ...
5. 下書き保存ボタンをクリック...
   ✓ 下書き保存ボタンをクリックしました

6. 最終確認スクリーンショット...

✅ 完了！
エディターURL: https://editor.note.com/notes/n93618151dd62/edit/
スクリーンショット: draft-saved-final.png
```

## 5. 下書きの確認

### 5-1. ブラウザで確認

1. 出力されたエディターURLにアクセス
   ```
   https://editor.note.com/notes/[記事ID]/edit/
   ```

2. または、note.comにログイン後：
   - 右上のユーザーアイコン → 「記事の管理」
   - または「投稿」ボタンから下書き一覧を確認

## 6. MCP Server の登録（Claude Code）

### 6-1. 環境変数の設定

```bash
# Windows PowerShell
$env:NOTE_POST_MCP_STATE_PATH = "$env:USERPROFILE\.note-state.json"

# Mac/Linux
export NOTE_POST_MCP_STATE_PATH="$HOME/.note-state.json"
```

### 6-2. MCP Server の登録

```bash
# Windows
claude mcp add note-post-mcp -s user -e NOTE_POST_MCP_STATE_PATH="%USERPROFILE%\.note-state.json" -- npx @gonuts555/note-post-mcp@latest

# Mac/Linux
claude mcp add note-post-mcp -s user -e NOTE_POST_MCP_STATE_PATH="$HOME/.note-state.json" -- npx @gonuts555/note-post-mcp@latest
```

### 6-3. 登録確認

```bash
claude mcp list
```

出力例：
```
note-post-mcp  npx @gonuts555/note-post-mcp@latest
```

## 7. トラブルシューティング

### 7-1. 認証エラー（Timeout exceeded）

**原因:** `.note-state.json` の認証情報が期限切れ

**解決方法:**
```bash
node simple-login.js
```

### 7-2. Playwright ブラウザが見つからない

**エラー:**
```
Executable doesn't exist at ...
```

**解決方法:**
```bash
npx playwright install chromium
```

### 7-3. ファイルパスのエラー

**エラー:**
```
Error: ENOENT: no such file or directory
```

**解決方法:**
- `save-draft-final.js` の199行目と200行目のパスを確認
- または、コード内の `YOUR_USERNAME` と検索して該当箇所を特定
- Windows の場合、パスのスラッシュは `/` を使用（`\` ではない）

### 7-4. セレクタが見つからない

**原因:** noteのUI変更

**対処方法:**
1. エラーメッセージを確認
2. note.comのHTML構造を確認（F12 > Elements）
3. セレクタを更新

**主要セレクタ一覧**:
| 要素 | セレクタ |
|------|---------|
| タイトル | `textarea[placeholder*="タイトル"]` |
| 本文 | `div[contenteditable="true"][role="textbox"]` |
| 下書き保存 | `button:has-text("下書き保存")` |
| 保存確認 | `text=保存しました` |

## 8. セキュリティのベストプラクティス

1. **認証情報の保護:**
   - `.note-state.json` を `.gitignore` に追加
   - パスワードをコードにハードコードしない
   - パスワードは定期的に変更

2. **アクセス権限:**
   - `.note-state.json` のパーミッションを制限（Mac/Linux: `chmod 600 ~/.note-state.json`）

3. **バックアップ:**
   - 重要な記事は下書き保存前にバックアップ
   - スクリーンショットで動作を記録

## 9. 自動化フロー全体図

```
1. Zenn記事作成
   ↓
2. simple-login.js で認証状態取得（初回のみ）
   ↓
3. 手動でZenn記事をnote.com形式に変換
   ↓
4. save-draft-final.js のパスを編集
   ↓
5. save-draft-final.js で下書き保存
   ↓
6. 保存成功確認（スクリーンショット・エディターURL）
   ↓
7. ブラウザで下書き確認
```

## 10. 参考情報

- **note-post-mcp GitHub:** https://github.com/Go-555/note-post-mcp
- **Playwright Documentation:** https://playwright.dev/
- **note.com:** https://note.com/

## 補足

- 本ガイドはWindows/Mac/Linux対応です
- 認証情報は定期的に更新が必要です
- 大量の記事を一度に投稿する場合は、適切な待機時間を設けてください
- noteのUIが変更された場合、セレクタを更新する必要があります

## 📝 実装状況

**✅ 実装済み:**
- `simple-login.js`: 手動ログイン + 認証状態保存
- `save-draft-final.js`: 下書き保存機能

**⚠️ 未実装:**
- 自動ログイン機能（手動ログインのみ）
- Zenn記事の自動変換（手動変換が必要）
- 共通モジュール（各スクリプトは独立）
- Bot検出回避の高度な機能
- 多段階検証

**📌 このドキュメントは実際に存在するファイルに基づいています。**
