# note.com 自動投稿システム完全セットアップガイド

## 概要

このガイドでは、Zenn記事をnote.comに自動投稿するための完全な手順を説明します。

## 前提条件

- Node.js 18以上
- note.comアカウント
- Git

## 🔒 セキュリティ重要事項

**⚠️ 認証情報は絶対にGitにコミットしないでください**

このガイドでは環境変数を使用して認証情報を安全に管理します。

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

### 1-2. プロジェクト構造の作成

```bash
# 共通モジュール用ディレクトリ作成
mkdir -p utils config
```

### 1-3. 依存関係のインストール

```bash
npm install
npm install dotenv js-yaml chalk cli-progress keytar  # keytarは任意（利用不可の場合は.envにフォールバック）
npm run build
```

### 1-4. 共通モジュールの作成

#### utils/browser-helpers.js

```javascript
import chalk from 'chalk';

export function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    warn: chalk.yellow('⚠'),
    error: chalk.red('✗')
  }[level];
  console.log(`${prefix} [${timestamp}] ${message}`);
}

export async function findElement(page, selectorList, elementName) {
  for (const selector of selectorList) {
    const element = page.locator(selector);
    const count = await element.count();
    if (count > 0) {
      log('success', `${elementName}を検出: ${selector}`);
      return element;
    }
  }
  throw new Error(`${elementName}が見つかりませんでした。noteのUIが変更された可能性があります。`);
}

export async function retryOperation(operation, maxRetries = 3, waitTime = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      log('warn', `リトライ ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

#### config/note-config.js

```javascript
export const CONFIG = {
  timeouts: {
    pageLoad: 30000,
    loginWait: 10000,
    elementWait: 10000,
    shortWait: 1000,
    saveConfirm: 10000
  },
  typing: {
    minDelay: 10,
    maxDelay: 30
  },
  maxChunkSize: 1000
};

export const SELECTORS = {
  login: {
    email: [
      'input[placeholder*="mail@example"]',
      'input[type="email"]',
      'input[name="email"]'
    ],
    password: [
      'input[type="password"]',
      'input[name="password"]'
    ],
    submitButton: [
      'button:has-text("ログイン")',
      'button[type="submit"]'
    ]
  },
  editor: {
    title: [
      'textarea[placeholder*="タイトル"]',
      'textarea[aria-label*="タイトル"]'
    ],
    body: [
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]'
    ],
    saveButton: [
      'button:has-text("下書き保存")',
      'button[aria-label*="下書き保存"]'
    ],
    saveConfirm: [
      'text=保存しました',
      '[aria-label*="保存しました"]'
    ],
    closeDialog: [
      'button[aria-label*="閉じる"]',
      'button:has-text("×")'
    ]
  }
};
```

### 1-5. Playwright ブラウザのインストール

```bash
npx playwright install chromium
```

実行後、Chromiumブラウザがインストールされます。

### 1-6. 環境変数ファイルの作成

プロジェクトルートに `.env` ファイルを作成：

```bash
# Windows
notepad .env
# Mac/Linux
nano .env
```

`.env` ファイルの内容：
```env
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
```

**🔒 セキュリティ強化（推奨）:**

暗号化ストレージを使用する場合（より安全）：

```bash
# Mac/Linux
chmod 600 .env

# keytarを使用した認証情報の保存（オプション）
node -e "const keytar = require('keytar'); keytar.setPassword('note-post-mcp', 'email', 'your-email@example.com'); keytar.setPassword('note-post-mcp', 'password', 'your-password');"
```

**⚠️ 必ず `.gitignore` に追加:**
```bash
echo ".env" >> .gitignore
echo ".note-state.json" >> .gitignore
```

## 2. note.com 認証状態の取得

### 2-1. ログインスクリプトの作成

`login-note.js` を作成：

```javascript
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { log, findElement, retryOperation } from './utils/browser-helpers.js';
import { CONFIG, SELECTORS } from './config/note-config.js';

dotenv.config();

const STATE_PATH = path.join(os.homedir(), '.note-state.json');

// 認証情報の取得（keytarを優先、フォールバックとして.env）
let email, password;
let authSource = 'なし';

try {
  const keytar = await import('keytar').catch(() => null);
  if (keytar && keytar.default) {
    try {
      email = await keytar.default.getPassword('note-post-mcp', 'email');
      password = await keytar.default.getPassword('note-post-mcp', 'password');
      if (email && password) {
        log('success', '暗号化ストレージから認証情報を取得');
        authSource = 'keytar';
      }
    } catch (getError) {
      log('warn', `keytar読み込み失敗: ${getError.message}`);
    }
  }
} catch (importError) {
  log('warn', `keytarモジュールのインポート失敗: ${importError.message}`);
}

if (!email || !password) {
  email = process.env.NOTE_EMAIL;
  password = process.env.NOTE_PASSWORD;
  if (email && password) {
    log('warn', '.envファイルから認証情報を取得（推奨: keytarで暗号化）');
    authSource = '.env';
  }
}

if (!email || !password) {
  log('error', 'NOTE_EMAILとNOTE_PASSWORDを.envまたはkeytarに設定してください');
  log('info', `確認済み: keytar(${authSource === 'keytar' ? '成功' : '失敗'}), .env(${process.env.NOTE_EMAIL ? '存在' : '未設定'})`);
  process.exit(1);
}

log('info', `認証情報ソース: ${authSource}`);

log('info', 'ブラウザ起動...');
const browser = await chromium.launch({
  headless: false,
  args: ['--lang=ja-JP']
});

const context = await browser.newContext({
  locale: 'ja-JP',
  viewport: { width: 1280, height: 720 }
});

const page = await context.newPage();

try {
  log('info', 'ログインページにアクセス...');
  await retryOperation(async () => {
    await page.goto('https://note.com/login', { 
      waitUntil: 'domcontentloaded', 
      timeout: CONFIG.timeouts.pageLoad 
    });
  });
  await page.waitForTimeout(3000);
  
  log('info', '自動ログイン開始...');
  const emailInput = await findElement(page, SELECTORS.login.email, 'メールアドレス入力欄');
  await emailInput.fill(email);
  log('success', 'メールアドレス入力完了');
  
  const passwordInput = await findElement(page, SELECTORS.login.password, 'パスワード入力欄');
  await passwordInput.fill(password);
  log('success', 'パスワード入力完了');
  
  const loginButton = await findElement(page, SELECTORS.login.submitButton, 'ログインボタン');
  await loginButton.click();
  log('success', 'ログインボタンクリック完了');
  
  log('info', 'ログイン完了を確認中...');
  await page.waitForURL(/note\.com\/(?!login)/, { timeout: CONFIG.timeouts.loginWait });
  log('success', 'ログイン成功');
  
  await page.waitForTimeout(2000);
  
  log('info', '認証状態を保存中...');
  await context.storageState({ path: STATE_PATH });
  log('success', `認証状態を保存しました: ${STATE_PATH}`);
  
  log('info', 'ブラウザを閉じてください...');
  await page.waitForEvent('close', { timeout: 30000 }).catch(() => {});
  
} catch (error) {
  log('error', `エラー: ${error.message}`);
  await page.screenshot({ path: 'login-error.png' });
  log('warn', 'エラー時のスクリーンショット: login-error.png');
  throw error;
} finally {
  await browser.close();
  log('success', '完了');
}
```

### 2-2. ログインスクリプトの実行

```bash
node login-note.js
```

実行後：
1. ブラウザが自動的に開く
2. 自動ログインが実行される
3. ログイン成功後、認証状態が `.note-state.json` に保存される
4. ブラウザを手動で閉じる

**確認（OS別）:**
```bash
# Windows
dir %USERPROFILE%\.note-state.json
# Mac/Linux
ls ~/.note-state.json
```

## 3. MCP Server の登録（Claude Code）

### 3-1. 環境変数の設定

```bash
# Windows PowerShell
$env:NOTE_POST_MCP_STATE_PATH = "$env:USERPROFILE\.note-state.json"

# Mac/Linux
export NOTE_POST_MCP_STATE_PATH="$HOME/.note-state.json"
```

### 3-2. MCP Server の登録

```bash
# Windows
claude mcp add note-post-mcp -s user -e NOTE_POST_MCP_STATE_PATH="%USERPROFILE%\.note-state.json" -- npx @gonuts555/note-post-mcp@latest

# Mac/Linux
claude mcp add note-post-mcp -s user -e NOTE_POST_MCP_STATE_PATH="$HOME/.note-state.json" -- npx @gonuts555/note-post-mcp@latest
```

### 3-3. 登録確認

```bash
claude mcp list
```

出力例：
```
note-post-mcp  npx @gonuts555/note-post-mcp@latest
```

## 4. Zenn記事のnote.com形式への変換

### 4-1. Zenn記事の取得

例: `~/Documents/zenn-ai-news/articles/ai-agents-70-percent-failure-reality-2025.md`

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

**変換スクリプト（改善版）:**

`convert-zenn-to-note.js`:
```javascript
import fs from 'fs';
import yaml from 'js-yaml';
import { log } from './utils/browser-helpers.js';

const zennPath = process.argv[2];
const notePath = process.argv[3];

if (!zennPath || !notePath) {
  log('error', 'Usage: node convert-zenn-to-note.js <zenn-file> <note-file>');
  process.exit(1);
}

try {
  const content = fs.readFileSync(zennPath, 'utf8');
  
  // Front matter抽出
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontMatterMatch) {
    throw new Error('Front matterが見つかりません');
  }
  
  const frontMatter = yaml.load(frontMatterMatch[1]);
  const body = frontMatterMatch[2].trim();
  
  // note.com形式に変換
  const noteContent = {
    title: frontMatter.title || 'タイトルなし',
    tags: frontMatter.topics || []
  };
  
  let output = '---\n';
  output += `title: ${noteContent.title}\n`;
  output += 'tags:\n';
  noteContent.tags.forEach(tag => {
    output += `  - ${tag}\n`;
  });
  output += '---\n\n';
  output += body;
  
  fs.writeFileSync(notePath, output, 'utf8');
  log('success', `変換完了: ${notePath}`);
  log('info', `タイトル: ${noteContent.title}`);
  log('info', `タグ数: ${noteContent.tags.length}`);
  log('info', `本文文字数: ${body.length}`);
  
} catch (error) {
  log('error', `変換エラー: ${error.message}`);
  process.exit(1);
}
```

**実行:**
```bash
node convert-zenn-to-note.js "path/to/zenn-article.md" "path/to/note-article.md"
```

## 5. 下書き保存の実行

### 5-1. 下書き保存スクリプトの作成

`save-draft.js`:
```javascript
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import cliProgress from 'cli-progress';
import { log, findElement, retryOperation, randomDelay } from './utils/browser-helpers.js';
import { CONFIG, SELECTORS } from './config/note-config.js';

dotenv.config();

const STATE_PATH = path.join(os.homedir(), '.note-state.json');
const markdownPath = process.argv[2];

if (!markdownPath) {
  log('error', 'Usage: node save-draft.js <markdown-file>');
  process.exit(1);
}

// 認証状態ファイルの存在確認と有効期限検証
if (!fs.existsSync(STATE_PATH)) {
  log('error', `認証状態ファイルが見つかりません: ${STATE_PATH}`);
  log('info', 'login-note.js を先に実行してください');
  process.exit(1);
}

// ファイルの更新日時を確認（7日以上経過していたら警告）
const stats = fs.statSync(STATE_PATH);
const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
if (daysSinceUpdate > 7) {
  log('warn', `認証状態ファイルが ${Math.floor(daysSinceUpdate)} 日前に作成されました`);
  log('warn', 'セッションが期限切れの場合、login-note.js を再実行してください');
}

// Cookie有効期限の検証
try {
  const stateContent = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  const cookies = stateContent.cookies || [];
  const now = Date.now();
  const expiredCookies = cookies.filter(c => c.expires && c.expires * 1000 < now);
  if (expiredCookies.length > 0) {
    log('error', `${expiredCookies.length} 個のCookieが期限切れです`);
    log('error', 'login-note.js を実行して認証状態を更新してください');
    process.exit(1);
  }
} catch (error) {
  log('warn', `認証状態ファイルの検証に失敗: ${error.message}`);
}

try {
  // Markdownファイルを読み込み
  const content = fs.readFileSync(markdownPath, 'utf8');
  
  // Front matter抽出
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontMatterMatch) {
    throw new Error('Front matterが見つかりません');
  }
  
  const frontMatter = yaml.load(frontMatterMatch[1]);
  const body = frontMatterMatch[2].trim();
  
  const title = frontMatter.title || 'タイトルなし';
  const tags = frontMatter.tags || [];
  
  log('info', `タイトル: ${title}`);
  log('info', `タグ数: ${tags.length}`);
  log('info', `本文文字数: ${body.length}`);
  
  // ブラウザを起動
  log('info', 'ブラウザ起動・認証状態ロード...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ 
    storageState: STATE_PATH,
    locale: 'ja-JP'
  });
  const page = await context.newPage();
  
  try {
    log('info', 'エディターページにアクセス...');
    await retryOperation(async () => {
      await page.goto('https://editor.note.com/new', { 
        waitUntil: 'domcontentloaded', 
        timeout: CONFIG.timeouts.pageLoad 
      });
    });
    await page.waitForTimeout(CONFIG.timeouts.shortWait);
    
    // AIダイアログを閉じる
    const closeButton = await findElement(page, SELECTORS.editor.closeDialog, 'ダイアログ閉じるボタン').catch(() => null);
    if (closeButton) {
      await closeButton.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    
    log('info', 'タイトルを入力...');
    const titleArea = await findElement(page, SELECTORS.editor.title, 'タイトル入力欄');
    await titleArea.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elementWait });
    await titleArea.fill(title);
    await page.waitForTimeout(CONFIG.timeouts.shortWait);
    
    log('info', '本文を入力...');
    const editor = await findElement(page, SELECTORS.editor.body, '本文エディター');
    await editor.waitFor({ state: 'visible' });
    await editor.click();
    await page.waitForTimeout(500);
    
    // 本文を段落ごとに入力（プログレスバー付き）
    const paragraphs = body.split('\n\n');
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(paragraphs.length, 0);
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      
      // 長い段落をチャンクに分割
      if (paragraph.length > CONFIG.maxChunkSize) {
        const chunks = paragraph.match(new RegExp(`.{1,${CONFIG.maxChunkSize}}`, 'g')) || [];
        for (const chunk of chunks) {
          await editor.pressSequentially(chunk, { 
            delay: randomDelay(CONFIG.typing.minDelay, CONFIG.typing.maxDelay)
          });
          await page.waitForTimeout(randomDelay(100, 300));
        }
      } else {
        // 人間らしい入力パターンを実装
        const sentences = paragraph.split(/([。、！？.!?])/);
        for (let j = 0; j < sentences.length; j++) {
          const sentence = sentences[j];
          if (!sentence) continue;
          
          // 文章ごとに入力
          await editor.pressSequentially(sentence, { 
            delay: randomDelay(CONFIG.typing.minDelay, CONFIG.typing.maxDelay)
          });
          
          // 句読点の後は長めの停止（人間らしさ）
          if (/[。、！？.!?]/.test(sentence)) {
            await page.waitForTimeout(randomDelay(300, 800));
          }
          
          // ランダムにマウス移動（bot検出回避 - 動的確率20-50%）
          const mouseMoveChance = 0.2 + Math.random() * 0.3;
          if (Math.random() < mouseMoveChance) {
            const box = await editor.boundingBox();
            if (box) {
              await page.mouse.move(
                box.x + Math.random() * box.width,
                box.y + Math.random() * box.height,
                { steps: randomDelay(5, 15) }
              );
            }
          }
          
          // ランダムにスクロール（bot検出回避 - 15%の確率）
          if (Math.random() < 0.15) {
            await page.mouse.wheel(0, randomDelay(-50, 50));
          }
          
          // ランダムに思考停止（bot検出回避 - 10%の確率）
          if (Math.random() < 0.1) {
            await page.waitForTimeout(randomDelay(1000, 3000));
          }
        }
      }
      
      if (i < paragraphs.length - 1) {
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(randomDelay(200, 700));
      }
      
      progressBar.update(i + 1);
    }
    
    progressBar.stop();
    
    log('info', '下書き保存ボタンをクリック...');
    await page.waitForTimeout(2000);
    
    const saveButton = await findElement(page, SELECTORS.editor.saveButton, '下書き保存ボタン');
    await saveButton.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elementWait });
    
    // ボタンが有効になるまで待機
    for (let i = 0; i < 20; i++) {
      if (await saveButton.isEnabled()) break;
      await page.waitForTimeout(100);
    }
    
    await saveButton.click();
    log('success', '下書き保存ボタンクリック完了');
    
    // 「保存しました」メッセージを多段階で厳格に確認
    let saveConfirmed = false;
    
    // ステップ1: メッセージ要素の確認
    try {
      const saveConfirm = await findElement(page, SELECTORS.editor.saveConfirm, '保存完了メッセージ');
      await saveConfirm.waitFor({ timeout: CONFIG.timeouts.saveConfirm });
      saveConfirmed = true;
      log('success', '保存メッセージを確認');
    } catch (error) {
      log('warn', '保存メッセージが見つかりません。追加検証を実施します...');
    }
    
    // ステップ2: URL変化の確認（下書き保存後はURLが変わる）
    const currentUrl = page.url();
    const urlPattern = /^https:\/\/editor\.note\.com\/notes\/n[a-f0-9]{13}\/edit\/$/;
    if (!saveConfirmed && urlPattern.test(currentUrl)) {
      log('success', 'エディターURLの変化を確認（下書き保存成功）');
      saveConfirmed = true;
    }
    
    // ステップ3: DOM要素の存在確認（より具体的なセレクタ）
    if (!saveConfirmed) {
      try {
        // note.comの実際のDOM構造に基づくセレクタ
        const savedIndicator = await page.locator('button[data-testid="save-button"][disabled], .editor-header__save-status:has-text("保存済み"), [aria-live="polite"]:has-text("保存しました")').count();
        if (savedIndicator > 0) {
          log('success', '保存済み状態を示すDOM要素を確認');
          saveConfirmed = true;
        }
      } catch (error) {
        log('warn', 'DOM要素による確認も失敗');
      }
    }
    
    // ステップ3.5: API-based verification（最終フォールバック）
    if (!saveConfirmed) {
      try {
        const response = await page.request.get(currentUrl);
        if (response.ok()) {
          log('success', 'APIレスポンスで下書きの存在を確認');
          saveConfirmed = true;
        }
      } catch (error) {
        log('warn', 'API確認も失敗');
      }
    }
    
    // ステップ4: 最終判定
    if (!saveConfirmed) {
      log('error', '下書き保存の確認に失敗しました（全ての検証方法で保存を確認できませんでした）');
      log('error', '以下の手段で手動確認してください:');
      log('error', `1. エディターURL（${currentUrl}）に直接アクセス`);
      log('error', '2. note.com > 記事の管理 > 下書き一覧で確認');
      await page.screenshot({ path: path.join(path.dirname(markdownPath), 'save-verification-failed.png'), fullPage: true });
      throw new Error('下書き保存が確認できませんでした');
    } else {
      log('success', '下書き保存成功を確認（多段階検証完了）');
    }
    
    await page.waitForTimeout(3000);
    
    log('info', '最終確認スクリーンショット撮影...');
    const screenshotDir = path.dirname(markdownPath);
    await page.screenshot({ 
      path: path.join(screenshotDir, 'draft-saved.png'), 
      fullPage: true 
    });
    
    const finalUrl = page.url();
    log('success', '完了！');
    log('info', `エディターURL: ${finalUrl}`);
    log('info', 'スクリーンショット: draft-saved.png');
    
  } catch (error) {
    log('error', `エラー: ${error.message}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(path.dirname(markdownPath), `draft-error-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log('warn', `エラー時のスクリーンショット: ${screenshotPath}`);
    throw error;
  } finally {
    await browser.close();
  }
  
} catch (error) {
  log('error', `致命的エラー: ${error.message}`);
  process.exit(1);
}
```

### 5-2. 下書き保存の実行

```bash
node save-draft.js "path/to/note-article.md"
```

**実行結果例:**
```
ℹ [2025-01-15T10:00:00.000Z] タイトル: AIエージェント、7割失敗してるってマジか
ℹ [2025-01-15T10:00:00.001Z] タグ数: 4
ℹ [2025-01-15T10:00:00.002Z] 本文文字数: 6699
ℹ [2025-01-15T10:00:00.003Z] ブラウザ起動・認証状態ロード...
ℹ [2025-01-15T10:00:05.000Z] エディターページにアクセス...
✓ [2025-01-15T10:00:10.000Z] タイトル入力欄を検出: textarea[placeholder*="タイトル"]
...
✓ [2025-01-15T10:05:00.000Z] 下書き保存成功を確認
✓ [2025-01-15T10:05:05.000Z] 完了！
ℹ [2025-01-15T10:05:05.001Z] エディターURL: https://editor.note.com/notes/n93618151dd62/edit/
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

### 7-1. 認証エラー（Timeout exceeded）

**原因:** `.note-state.json` の認証情報が期限切れ

**解決方法:**
```bash
node login-note.js
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

### 7-3. 環境変数が読み込まれない

**解決方法:**
1. `.env` ファイルがプロジェクトルートにあるか確認
2. ファイル内容を確認
3. スクリプトを再実行

### 7-4. セレクタが見つからない

**原因:** noteのUI変更

**対処方法:**
1. エラーメッセージを確認
2. `SELECTORS` オブジェクトのフォールバックを活用
3. 必要に応じてセレクタを更新

## 8. セキュリティのベストプラクティス

1. **認証情報の保護:**
   - `.env` を `.gitignore` に追加
   - `.note-state.json` を `.gitignore` に追加
   - パスワードは定期的に変更

2. **アクセス権限:**
   - `.env` のパーミッションを制限（Mac/Linux: `chmod 600 .env`）
   - `.note-state.json` も同様に制限

3. **バックアップ:**
   - 重要な記事は下書き保存前にバックアップ
   - スクリーンショットで動作を記録

## 9. 正しいセレクタ一覧

note.comのエディターで使用する正しいセレクタ（フォールバック含む）：

| 要素 | 優先度1 | 優先度2 | 優先度3 |
|------|---------|---------|---------|
| タイトル | `textarea[placeholder*="タイトル"]` | `textarea[aria-label*="タイトル"]` | - |
| 本文 | `div[contenteditable="true"][role="textbox"]` | `div[contenteditable="true"]` | - |
| 下書き保存 | `button:has-text("下書き保存")` | `button[aria-label*="下書き保存"]` | - |
| 保存確認 | `text=保存しました` | `[aria-label*="保存しました"]` | - |

## 10. MCP Tool の使用（Claude Code経由）

### 10-1. 環境変数の設定

Claude Codeの設定で環境変数を設定：

```json
{
  "mcpServers": {
    "note-post-mcp": {
      "env": {
        "NOTE_POST_MCP_STATE_PATH": "${HOME}/.note-state.json"
      }
    }
  }
}
```

### 10-2. Claude Codeから実行

```javascript
// Claude Code内で実行
mcp__note-post-mcp__save_draft({
  markdown_path: "~/Documents/note-post-mcp/note-article.md",
  state_path: "~/.note-state.json",
  screenshot_dir: "~/Documents/note-post-mcp",
  timeout: 300000
})
```

## 11. 自動化フロー全体図

```
1. Zenn記事作成
   ↓
2. .env ファイルに認証情報設定
   ↓
3. login-note.js で認証状態取得
   ↓
4. convert-zenn-to-note.js で形式変換
   ↓
5. save-draft.js で下書き保存
   ↓
6. 保存成功確認（エラー時はリトライ）
   ↓
7. エディターURL取得
   ↓
8. ブラウザで下書き確認
```

## 12. 参考情報

- **note-post-mcp GitHub:** https://github.com/Go-555/note-post-mcp
- **Playwright Documentation:** https://playwright.dev/
- **note.com:** https://note.com/
- **dotenv Documentation:** https://github.com/motdotla/dotenv
- **js-yaml Documentation:** https://github.com/nodeca/js-yaml

## 補足

- 本ガイドはWindows/Mac/Linux対応です
- 認証情報は定期的に更新が必要です
- 大量の記事を一度に投稿する場合は、適切な待機時間を設けてください
- noteのUIが変更された場合、セレクタのフォールバック機能が自動で対応します
