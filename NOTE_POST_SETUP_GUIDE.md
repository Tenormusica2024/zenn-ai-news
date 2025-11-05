# note.com 自動投稿システム完全セットアップガイド

## 概要

このガイドでは、Zenn記事をnote.comに自動投稿するための完全な手順を説明します。

## 前提条件

- Node.js 18以上
- note.comアカウント（tenormusica7@gmail.com / Tbbr43gb）
- Git

## 1. note-post-mcp のインストール

### 1-1. リポジトリのクローン

```bash
cd C:\Users\Tenormusica\Documents
git clone https://github.com/Go-555/note-post-mcp.git
cd note-post-mcp
```

### 1-2. 依存関係のインストール

```bash
npm install
npm run build
```

### 1-3. Playwright ブラウザのインストール

```bash
npm run install-browser
```

実行後、以下のメッセージが表示されれば成功：
```
Chromium 141.0.7390.37 downloaded to C:\Users\Tenormusica\AppData\Local\ms-playwright\chromium-1179
```

## 2. note.com 認証状態の取得

### 2-1. ログインスクリプトの作成

`C:\Users\Tenormusica\Documents\note-post-mcp\login-note.js` を作成：

```javascript
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const statePath = path.join(process.env.USERPROFILE, '.note-state.json');

console.log('1. ブラウザ起動...');
const browser = await chromium.launch({
  headless: false,
  args: ['--lang=ja-JP']
});

const context = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 1280, height: 720 }
});

const page = await context.newPage();

console.log('2. ログインページにアクセス...');
await page.goto('https://note.com/login');
await page.waitForTimeout(3000);

console.log('3. 自動ログイン...');
const emailInput = page.locator('input[placeholder*="mail@example"]');
await emailInput.fill('tenormusica7@gmail.com');

const passwordInput = page.locator('input[type="password"]');
await passwordInput.fill('Tbbr43gb');

const loginButton = page.locator('button:has-text("ログイン")');
await loginButton.click();

console.log('4. ログイン完了を待機（10秒）...');
await page.waitForTimeout(10000);

console.log('5. 認証状態を保存...');
await context.storageState({ path: statePath });

console.log('✓ 認証状態を保存しました:', statePath);
console.log('\nブラウザを閉じてください...');

await page.waitForEvent('close').catch(() => {});

await browser.close();
console.log('✓ 完了');
```

### 2-2. ログインスクリプトの実行

```bash
cd C:\Users\Tenormusica\Documents\note-post-mcp
node login-note.js
```

実行後：
1. ブラウザが自動的に開く
2. 自動ログインが実行される
3. 10秒待機後、認証状態が `C:\Users\Tenormusica\.note-state.json` に保存される
4. ブラウザを手動で閉じる

**確認:**
```bash
dir C:\Users\Tenormusica\.note-state.json
```

## 3. MCP Server の登録（Claude Code）

### 3-1. MCP Server の登録

```bash
claude mcp add note-post-mcp -s user -e NOTE_POST_MCP_STATE_PATH="C:\Users\Tenormusica\.note-state.json" -- npx @gonuts555/note-post-mcp@latest
```

### 3-2. 登録確認

```bash
claude mcp list
```

出力例：
```
note-post-mcp  npx @gonuts555/note-post-mcp@latest
```

## 4. Zenn記事のnote.com形式への変換

### 4-1. Zenn記事の取得

例: `C:\Users\Tenormusica\Documents\zenn-ai-news\articles\ai-agents-70-percent-failure-reality-2025.md`

### 4-2. note.com形式への変換

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

**変換スクリプト例:**

`convert-zenn-to-note.js`:
```javascript
import fs from 'fs';

const zennPath = process.argv[2];
const notePath = process.argv[3];

if (!zennPath || !notePath) {
  console.error('Usage: node convert-zenn-to-note.js <zenn-file> <note-file>');
  process.exit(1);
}

const content = fs.readFileSync(zennPath, 'utf8');
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
      title = line.replace('title:', '').trim();
    } else if (line.startsWith('topics:')) {
      const topicsStr = line.replace('topics:', '').trim();
      const topicsMatch = topicsStr.match(/\[(.*)\]/);
      if (topicsMatch) {
        const topicsList = topicsMatch[1].split(',').map(t => t.trim().replace(/"/g, ''));
        tags.push(...topicsList);
      }
    }
  } else if (frontMatterEnded) {
    bodyLines.push(line);
  }
}

// note.com形式で出力
let output = '---\n';
output += `title: ${title}\n`;
output += 'tags:\n';
tags.forEach(tag => {
  output += `  - ${tag}\n`;
});
output += '---\n\n';
output += bodyLines.join('\n').trim();

fs.writeFileSync(notePath, output, 'utf8');
console.log('✓ 変換完了:', notePath);
```

**実行:**
```bash
node convert-zenn-to-note.js "C:\Users\Tenormusica\Documents\zenn-ai-news\articles\ai-agents-70-percent-failure-reality-2025.md" "C:\Users\Tenormusica\Documents\note-post-mcp\ai-agents-failure-note.md"
```

## 5. 下書き保存の実行

### 5-1. 下書き保存スクリプトの作成

`save-draft.js`:
```javascript
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const statePath = 'C:/Users/Tenormusica/.note-state.json';
const markdownPath = process.argv[2];

if (!markdownPath) {
  console.error('Usage: node save-draft.js <markdown-file>');
  process.exit(1);
}

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
  const screenshotDir = path.dirname(markdownPath);
  await page.screenshot({ path: path.join(screenshotDir, 'draft-saved.png'), fullPage: true });
  
  const finalUrl = page.url();
  console.log('\n✅ 完了！');
  console.log('エディターURL:', finalUrl);
  console.log('スクリーンショット: draft-saved.png');
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  await page.screenshot({ path: path.join(path.dirname(markdownPath), 'draft-error.png'), fullPage: true });
}

await browser.close();
```

### 5-2. 下書き保存の実行

```bash
cd C:\Users\Tenormusica\Documents\note-post-mcp
node save-draft.js "C:\Users\Tenormusica\Documents\note-post-mcp\ai-agents-failure-note.md"
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
   10/69 段落完了
   20/69 段落完了
   ...
5. 下書き保存ボタンをクリック...
   ✓ 下書き保存ボタンをクリックしました

6. 最終確認スクリーンショット...

✅ 完了！
エディターURL: https://editor.note.com/notes/n93618151dd62/edit/
スクリーンショット: draft-saved.png
```

## 6. 下書きの確認

### 6-1. ブラウザで確認

1. 出力されたエディターURLにアクセス
   ```
   https://editor.note.com/notes/[記事ID]/edit/
   ```

2. または、note.comにログイン後：
   - 右上のユーザーアイコン → 「記事の管理」
   - または「投稿」ボタンから下書き一覧を確認

## 7. トラブルシューティング

### 7-1. 認証エラー（Timeout 180000ms exceeded）

**原因:** `.note-state.json` の認証情報が期限切れ

**解決方法:**
```bash
cd C:\Users\Tenormusica\Documents\note-post-mcp
node login-note.js
```

### 7-2. Playwright ブラウザが見つからない

**エラー:**
```
Executable doesn't exist at C:\Users\Tenormusica\AppData\Local\ms-playwright\chromium-1179\chrome-win\chrome.exe
```

**解決方法:**
```bash
cd C:\Users\Tenormusica\Documents\note-post-mcp
npx playwright install chromium
```

### 7-3. AIダイアログが邪魔をする

**対処方法:** スクリプト内で自動的に閉じる処理が実装済み
```javascript
const closeButton = page.locator('button[aria-label*="閉じる"], button:has-text("×")').first();
if (await closeButton.count() > 0) {
  await closeButton.click().catch(() => {});
  await page.waitForTimeout(500);
}
```

## 8. 重要なURL・パス一覧

| 項目 | 値 |
|------|-----|
| note-post-mcpディレクトリ | `C:\Users\Tenormusica\Documents\note-post-mcp` |
| 認証状態ファイル | `C:\Users\Tenormusica\.note-state.json` |
| Zenn記事ディレクトリ | `C:\Users\Tenormusica\Documents\zenn-ai-news\articles` |
| note.comログインページ | `https://note.com/login` |
| note.comエディター（新規） | `https://editor.note.com/new` |
| note.comエディター（編集） | `https://editor.note.com/notes/[記事ID]/edit/` |

## 9. 正しいセレクタ一覧

note.comのエディターで使用する正しいセレクタ：

| 要素 | セレクタ | 用途 |
|------|----------|------|
| タイトル入力欄 | `textarea[placeholder*="タイトル"]` | タイトル入力 |
| 本文エディター | `div[contenteditable="true"][role="textbox"]` | 本文入力 |
| 下書き保存ボタン | `button:has-text("下書き保存")` | 下書き保存 |
| 公開ボタン | `button:has-text("公開に進む")` | 公開処理 |
| 閉じるボタン | `button[aria-label*="閉じる"]` | ダイアログ閉じる |

## 10. MCP Tool の使用（Claude Code経由）

### 10-1. Claude Codeから直接実行

```javascript
// Claude Code内で実行
mcp__note-post-mcp__save_draft({
  markdown_path: "C:/Users/Tenormusica/Documents/note-post-mcp/ai-agents-failure-note.md",
  state_path: "C:/Users/Tenormusica/.note-state.json",
  screenshot_dir: "C:/Users/Tenormusica/Documents/note-post-mcp",
  timeout: 300000
})
```

## 11. 自動化フロー全体図

```
1. Zenn記事作成
   ↓
2. note.com形式に変換（Front matter変換）
   ↓
3. note.com認証状態確認（必要なら再ログイン）
   ↓
4. save-draft.js 実行
   ↓
5. エディターで記事入力（自動）
   ↓
6. 下書き保存ボタンクリック（自動）
   ↓
7. エディターURL取得
   ↓
8. ブラウザで下書き確認
```

## 12. 参考情報

- **note-post-mcp GitHub:** https://github.com/Go-555/note-post-mcp
- **Playwright Documentation:** https://playwright.dev/
- **note.com:** https://note.com/

## 補足

- 本ガイドは `tenormusica7@gmail.com` アカウント専用です
- 認証情報は定期的に更新が必要です（セッション期限切れ対策）
- 大量の記事を一度に投稿する場合は、適切な待機時間を設けてください
