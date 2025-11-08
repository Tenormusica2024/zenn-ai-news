# Zenn記事音声朗読システム 設計書

## 📋 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [技術スタック](#技術スタック)
4. [環境構築手順](#環境構築手順)
5. [ディレクトリ構造](#ディレクトリ構造)
6. [音声エンジン仕様](#音声エンジン仕様)
7. [実装詳細](#実装詳細)
8. [API仕様](#api仕様)
9. [トラブルシューティング](#トラブルシューティング)

---

## システム概要

### 目的

Zenn記事をMarkdown形式から音声ファイルに変換し、Webブラウザで朗読再生できるシステム。

### 主要機能

1. **Markdown→音声変換**
   - frontmatter、コードブロック、URL等の除去
   - 本文テキストのみを抽出
   - 複数の音声エンジンに対応

2. **音声エンジン選択**
   - **gTTS (Google Text-to-Speech)**: 軽量・高速・無料
   - **VOICEVOX**: 高品質・多様な声・処理重い

3. **Webプレイヤー**
   - ダークモード対応UI
   - 再生速度変更（0.5x〜2.0x）
   - ナレーター切り替え
   - プログレスバー・シーク機能

### パフォーマンス比較

| 項目 | gTTS | VOICEVOX |
|------|------|----------|
| ファイルサイズ | 5.4MB (MP3) | 25MB (WAV) |
| 処理速度 | 高速（10秒程度） | 低速（1分以上） |
| CPU/メモリ負荷 | 低 | 高 |
| 音声品質 | 標準 | 高品質 |
| オフライン動作 | 不可 | 可能 |
| ライセンス | Apache 2.0 | 無料（商用可） |

---

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                   ユーザー操作                            │
│              (ブラウザ: audio-player.html)               │
└─────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   HTTPサーバー                            │
│                   (server.js)                            │
└─────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────┐
│              音声ファイル + playlist.json                 │
│                  (audio/記事名/)                         │
└─────────────────────────────────────────────────────────┘
                            ↑
                            │
┌─────────────────────────────────────────────────────────┐
│            音声生成統合スクリプト                          │
│          (generate_article_audio.js)                     │
└─────────────────────────────────────────────────────────┘
                ┌───────────┴───────────┐
                ↓                       ↓
┌──────────────────────┐   ┌──────────────────────┐
│   gTTS Python        │   │   VOICEVOX Node.js   │
│   (gtts_article_     │   │   (article_to_       │
│    to_speech.py)     │   │    speech.js)        │
└──────────────────────┘   └──────────────────────┘
```

### データフロー

```
1. Markdown記事
   ↓
2. テキスト抽出（frontmatter除去、整形）
   ↓
3. 音声エンジン選択
   ├─ gTTS: Google翻訳API経由で音声生成
   └─ VOICEVOX: ローカルサーバーで音声生成
   ↓
4. 音声ファイル保存 (MP3 or WAV)
   ↓
5. playlist.json生成（メタデータ）
   ↓
6. Webプレイヤーで再生
```

---

## 技術スタック

### バックエンド

| 技術 | バージョン | 用途 |
|------|----------|------|
| **Node.js** | v18以上（動作確認: v22.18.0） | 統合スクリプト・HTTPサーバー |
| **Python** | 3.10+ | gTTS音声生成 |
| **VOICEVOX** | 0.24.1 | 高品質音声生成（オプション） |

### Pythonパッケージ（gTTS用）

```txt
gTTS==2.5.4           # Google Text-to-Speech
click==8.1.8          # CLI依存関係
requests==2.32.5      # HTTP依存関係
```

### フロントエンド

| 技術 | 用途 |
|------|------|
| HTML5 Audio API | 音声再生 |
| Vanilla JavaScript | UI制御 |
| CSS3 (Gradient) | ダークモードデザイン |

---

## 環境構築手順

### 前提条件確認

以下のコマンドを実行して、必要なバージョンがインストールされているか確認してください。

```bash
# Node.jsバージョン確認
node --version
# v18.0.0以上が必要（確認済み動作バージョン: v22.18.0）

# Pythonバージョン確認
python --version
# Python 3.10.0以上が必要

# インターネット接続確認（gTTS使用時に必要）
ping google.com -n 1
```

**バージョンが古い場合**:
- Node.js: https://nodejs.org/ からLTS版をダウンロード
- Python: https://www.python.org/downloads/ から3.10以上をダウンロード

### 1. プロジェクトクローン

```bash
git clone [リポジトリURL]
cd zenn-ai-news/audio-reader
```

### 2. Python仮想環境構築（gTTS用）

```bash
# 仮想環境作成
python -m venv venv_kokoro

# 仮想環境有効化（Windows）
venv_kokoro\Scripts\activate

# 仮想環境有効化（Mac/Linux）
source venv_kokoro/bin/activate

# パッケージインストール
pip install gTTS
```

### 3. VOICEVOX導入（オプション）

高品質音声が必要な場合のみ導入。

```bash
# 1. VOICEVOX公式サイトからダウンロード
# https://voicevox.hiroshiba.jp/

# 2. インストーラーを実行
# - Windowsの場合: VOICEVOX-Windows-*.exe をダブルクリック
# - Macの場合: VOICEVOX-Mac-*.dmg を開いてアプリケーションフォルダにドラッグ

# 3. VOICEVOXアプリケーションを起動
# - Windowsの場合: スタートメニュー → VOICEVOX

# 4. APIサーバーの起動確認（重要）
# VOICEVOXのメニューバー → 「設定」 → 「エンジン」タブ
# 「HTTPサーバーを起動する」にチェックが入っていることを確認
# ポート番号が50021であることを確認

# 5. APIサーバー動作確認
curl http://localhost:50021/version
# 成功例: {"version":"0.24.1"}
# 失敗例: curl: (7) Failed to connect to localhost port 50021
#   → VOICEVOXの設定で「HTTPサーバーを起動する」を有効化してください
```

### 4. Node.js依存関係（不要）

HTTPサーバーは標準ライブラリのみで動作するため、`npm install`不要。

### 5. 動作確認

```bash
# 1. HTTPサーバー起動（このターミナルは起動したまま維持）
node server.js
# → Server running at http://localhost:8081/

# 2. ブラウザでアクセス（別タブまたは新しいウィンドウを開く）
# http://localhost:8081/

# または直接プレイヤーにアクセス
# http://localhost:8081/web/audio-player.html

# 注意: 
# - サーバーを停止する場合は Ctrl+C を押す
# - 音声ファイルが存在しない場合はエラーが表示されます
# - 音声ファイル生成については「付録A」の「3. 音声生成テスト」を参照
```

---

## ディレクトリ構造

```
audio-reader/
├── audio/                          # 生成音声ファイル格納
│   └── [記事名]/
│       ├── article_ja-normal.mp3   # gTTS音声
│       ├── article_zundamon.wav    # VOICEVOX音声
│       └── playlist.json           # メタデータ
│
├── scripts/                        # 音声生成スクリプト
│   ├── generate_article_audio.js  # 統合スクリプト（推奨）
│   ├── gtts_article_to_speech.py  # gTTS実装
│   └── article_to_speech.js       # VOICEVOX実装
│
├── web/                            # Webプレイヤー
│   ├── audio-player.html          # メインUI
│   └── affinity-thumbnail.jpg     # サムネイル画像
│
├── venv_kokoro/                    # Python仮想環境
│   ├── Lib/                        # Pythonライブラリ（共通）
│   ├── Scripts/                    # 実行ファイル（Windows）
│   │   ├── python.exe              # Python実行ファイル
│   │   ├── pip.exe                 # パッケージマネージャー
│   │   ├── activate.bat            # 仮想環境有効化（バッチ）
│   │   └── Activate.ps1            # 仮想環境有効化（PowerShell）
│   └── bin/                        # 実行ファイル（Mac/Linux）
│       ├── python                  # Python実行ファイル
│       ├── pip                     # パッケージマネージャー
│       └── activate                # 仮想環境有効化
│
├── server.js                       # HTTPサーバー
└── DESIGN_DOCUMENT.md              # 本ドキュメント
```

---

## 音声エンジン仕様

### gTTS (Google Text-to-Speech)

#### 特徴

- **軽量**: 外部API呼び出しでローカル処理不要
- **高速**: 10秒程度で3600文字の音声生成完了
- **無料**: Google翻訳API使用、無制限
- **制限**: インターネット接続必須、音声品質は標準的

#### 出力仕様

- **フォーマット**: MP3
- **サンプリングレート**: 24kHz
- **ビットレート**: 可変（VBR）
- **ファイルサイズ**: 約1.5KB/文字（3600文字→5.4MB）

#### スクリプト仕様

**ファイル**: `scripts/gtts_article_to_speech.py`

**使用方法**:
```bash
python gtts_article_to_speech.py <記事パス> [話者キー]

# 実際の記事ファイルを使用した例
python gtts_article_to_speech.py ../articles/affinity-3-free-canva-ai-strategy-2025.md ja-normal

# 一般的な例
python gtts_article_to_speech.py ../articles/[記事名].md ja-normal
```

**話者キー**:
- `ja-normal`: 日本語標準音声（デフォルト）

**処理フロー**:
1. Markdown読み込み
2. frontmatter除去
3. 見出し記号、コードブロック、URL除去
4. gTTS APIで音声生成
5. MP3ファイル保存
6. playlist.json生成

---

### VOICEVOX

#### 特徴

- **高品質**: 感情表現豊かな音声
- **多様性**: 複数のキャラクターボイス
- **オフライン**: ローカル処理で完結
- **重い**: CPU/メモリ負荷大、処理時間1分以上

#### 出力仕様

- **フォーマット**: WAV
- **サンプリングレート**: 24kHz
- **ビット深度**: 16bit
- **ファイルサイズ**: 約7KB/文字（3600文字→25MB）

#### スクリプト仕様

**ファイル**: `scripts/article_to_speech.js`

**使用方法**:
```bash
node article_to_speech.js <記事パス> [話者キー]

# デフォルト（zundamon）で生成
node article_to_speech.js ../articles/article.md

# 明示的にzundamonを指定（推奨）
node article_to_speech.js ../articles/article.md zundamon
```

**話者キー**:
- `zundamon`: ずんだもん（ノーマル） - ID: 3（**デフォルト、推奨：軽量・高速**）
- `no7-reading`: No.7（読み聞かせ） - ID: 31（非推奨：処理が非常に重い）
- `aoyama-calm`: 青山龍星（しっとり） - ID: 84（非推奨：処理が重い）

**注意**: speaker IDはVOICEVOXのバージョンにより異なる場合があります。正確なIDは以下のコマンドで確認できます:
```bash
curl http://localhost:50021/speakers
```

**前提条件**:
- VOICEVOXアプリケーション起動中
- APIサーバー: http://localhost:50021

---

## 実装詳細

### 統合スクリプト: `generate_article_audio.js`

#### 目的

音声エンジンの選択を自動化し、単一のコマンドで音声生成を実行。

#### 実装コード（抜粋）

```javascript
const AVAILABLE_SPEAKERS = {
  // gTTS（軽量・高速）
  'ja-normal': { 
    type: 'gtts', 
    name: 'Google翻訳音声（標準）', 
    description: '軽量・高速なGoogle TTS' 
  },
  // VOICEVOX（高品質だが重い）
  'zundamon': { 
    type: 'voicevox', 
    id: 3, 
    name: 'ずんだもん（ノーマル）', 
    description: '親しみやすい声' 
  }
};

async function generateAudio(articlePath, speakerKey) {
  const speaker = AVAILABLE_SPEAKERS[speakerKey];
  
  if (speaker.type === 'gtts') {
    // Python venv経由でgTTSスクリプト実行
    await runPythonScript('gtts_article_to_speech.py', articlePath, speakerKey);
  } else if (speaker.type === 'voicevox') {
    // Node.jsでVOICEVOXスクリプト実行
    await runVoicevoxScript(articlePath, speakerKey);
  }
}

function runPythonScript(scriptName, articlePath, speakerKey) {
  const pythonPath = path.join(__dirname, '..', 'venv_kokoro', 'Scripts', 'python.exe');
  const process = spawn(pythonPath, [scriptPath, articlePath, speakerKey]);
  // ...
}
```

#### 使用方法

```bash
cd scripts

# gTTS（推奨：軽量・高速） - 実際の例
node generate_article_audio.js "../articles/affinity-3-free-canva-ai-strategy-2025.md" ja-normal

# VOICEVOX（高品質だが重い） - 実際の例
node generate_article_audio.js "../articles/affinity-3-free-canva-ai-strategy-2025.md" zundamon

# 一般的な例
node generate_article_audio.js "../articles/[記事名].md" ja-normal
```

---

### Markdown→テキスト抽出ロジック

両スクリプト共通の処理。

#### 処理内容

```python
# Python版（gtts_article_to_speech.py）
def extract_text_from_markdown(markdown):
    # 1. frontmatter除去
    text = re.sub(r'^---\n[\s\S]*?\n---\n', '', markdown)
    
    # 2. 参照元セクション除去
    text = re.sub(r'^##\s*参照元\n[\s\S]*?(?=\n##\s)', '', text, flags=re.MULTILINE)
    
    # 3. 見出し記号除去（#, ##, ### 等）
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # 4. リンク記法を文字列に変換 [テキスト](URL) → テキスト
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # 5. 太字・斜体記号除去
    text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^\*]+)\*', r'\1', text)
    
    # 6. コードブロック除去
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # 7. URLのみの行を除去
    text = re.sub(r'^https?://.*$', '', text, flags=re.MULTILINE)
    
    # 8. 複数の空行を1つに
    text = re.sub(r'\n\n+', '\n\n', text)
    
    # 9. 箇条書き記号除去
    text = re.sub(r'^[-*]\s+', '', text, flags=re.MULTILINE)
    
    return text.strip()
```

#### 入力例

```markdown
---
title: "記事タイトル"
emoji: "📝"
---

# はじめに

[リンクテキスト](https://example.com)

**太字** *斜体*

```javascript
console.log('code');
```

https://example.com

- 箇条書き1
- 箇条書き2
```

#### 出力例

```
はじめに

リンクテキスト

太字 斜体

箇条書き1
箇条書き2
```

---

### playlist.json仕様

#### 目的

音声ファイルのメタデータ管理。Webプレイヤーがファイル情報を取得。

#### フォーマット

```json
{
  "article": "記事ファイル名.md",
  "speaker": "ja-normal",
  "speakerName": "日本語（標準）",
  "chunks": [
    "article_ja-normal.mp3"
  ],
  "totalChunks": 1,
  "engine": "gTTS",
  "createdAt": "2025-11-08T19:53:29.908580"
}
```

#### フィールド説明

| フィールド | 型 | 説明 |
|----------|---|------|
| `article` | string | 元記事ファイル名 |
| `speaker` | string | 話者キー（ja-normal, zundamon等） |
| `speakerName` | string | 話者表示名 |
| `chunks` | array | 音声ファイル名リスト（現在は常に1ファイル） |
| `totalChunks` | number | チャンク数（現在は常に1） |
| `engine` | string | 使用エンジン（gTTS, VOICEVOX） |
| `createdAt` | string | 生成日時（ISO 8601形式） |

---

### Webプレイヤー: `audio-player.html`

#### 主要機能

1. **音声再生制御**
   - 再生/一時停止
   - 前へ/次へ（将来的に複数チャンク対応）
   - シークバー操作

2. **再生速度変更**
   - 0.5x / 0.75x / 1.0x / 1.25x / 1.5x / 2.0x

3. **ナレーター切り替え**
   - Google翻訳音声（ja-normal）
   - VOICEVOX ずんだもん（zundamon）
   - 切り替え時に再生位置保持

#### JavaScript実装（抜粋）

```javascript
// 音声ファイル読み込み
function loadChunk(index) {
  currentChunkIndex = index;
  
  // gTTSはMP3、VOICEVOXはWAV
  const extension = currentVoice === 'ja-normal' ? 'mp3' : 'wav';
  const filename = `article_${currentVoice}.${extension}`;
  
  audio.src = audioBasePath + filename;
  updateChunkInfo();
  updateButtons();
  renderChunkList();
}

// ナレーター変更時の処理
voiceSelect.addEventListener('change', () => {
  currentVoice = voiceSelect.value;
  const wasPlaying = !audio.paused;
  const currentTime = audio.currentTime;
  
  loadChunk(currentChunkIndex);
  
  audio.addEventListener('loadedmetadata', () => {
    audio.currentTime = currentTime; // 再生位置復元
    if (wasPlaying) {
      audio.play();
    }
  }, { once: true });
});
```

#### UI設計

**カラーパレット**:
- 背景: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)`
- パネル: `rgba(20, 20, 20, 0.8)` 〜 `rgba(35, 35, 35, 0.8)`
- アクセント: `#4a9eff` (青) / `#8a2be2` (紫)
- テキスト: `#ffffff` (白) / `#999` (グレー)

**レイアウト**:
```
┌────────────────────────────────────┐
│   🎙️ Zenn記事音声朗読               │
├────────────────────────────────────┤
│                                    │
│   [記事タイトル]                    │
│                                    │
│   ┌──────────────────────────┐    │
│   │   サムネイル画像           │    │
│   └──────────────────────────┘    │
│                                    │
│   ━━━━━━━━━━━━━━━━━━━━━━━━       │ プログレスバー
│   0:00               5:30          │
│                                    │
│   チャンク 1 / 1                    │
│                                    │
│   [⏮️ 前へ] [▶️ 再生] [次へ ⏭️]      │
│                                    │
│   再生速度: [1.0x ▼]                │
│   ナレーター: [Google翻訳 ▼]        │
│                                    │
├────────────────────────────────────┤
│   [1. article_ja-normal.mp3]       │ チャンクリスト
└────────────────────────────────────┘
```

---

## API仕様

### HTTPサーバー (`server.js`)

#### エンドポイント

```
GET /                           → web/audio-player.html（自動リダイレクト）
GET /web/audio-player.html     → プレイヤーHTML
GET /web/affinity-thumbnail.jpg → サムネイル画像
GET /audio/[記事名]/[ファイル]   → 音声ファイル（MP3/WAV）
GET /audio/[記事名]/playlist.json → メタデータ
```

**注意**: ルート `/` へのアクセスは自動的に `/web/audio-player.html` にマッピングされます。

#### MIMEタイプ

| 拡張子 | Content-Type |
|-------|--------------|
| `.html` | `text/html` |
| `.js` | `text/javascript` |
| `.css` | `text/css` |
| `.json` | `application/json` |
| `.mp3` | `audio/mpeg` |
| `.wav` | `audio/wav` |
| `.jpg` | `image/jpg` |
| `.png` | `image/png` |

#### 起動方法

```bash
node server.js
# → Server running at http://localhost:8081/
```

---

## トラブルシューティング

### Q1. gTTS音声生成が失敗する

**症状**:
```
ModuleNotFoundError: No module named 'gtts'
```

**対処法**:
```bash
# 仮想環境有効化
venv_kokoro\Scripts\activate

# gTTSインストール
pip install gTTS

# 確認
python -c "import gtts; print(gtts.__version__)"
```

---

### Q2. VOICEVOX音声生成が失敗する

**症状1: APIサーバー接続エラー**
```
⚠️  VOICEVOXサーバーに接続できません
以下を確認してください:
1. VOICEVOXアプリケーションが起動しているか
2. 設定 → エンジン → 「HTTPサーバーを起動する」がONか
3. ポート番号が50021か
```

**対処法**:
1. VOICEVOXアプリケーション起動確認:
   ```bash
   # Windows（PowerShell/コマンドプロンプト）
   tasklist | findstr VOICEVOX
   ```

2. VOICEVOXの設定確認:
   - メニューバー → 「設定」 → 「エンジン」タブ
   - 「HTTPサーバーを起動する」にチェック
   - ポート番号: 50021

3. APIサーバー動作確認:
   ```bash
   curl http://localhost:50021/version
   # 期待される結果: {"version":"0.24.1"}
   ```

**症状2: 音声生成中のエラー**
```
Error: HTTP 500: {"detail":"Internal Server Error"}
```

**対処法**:
1. VOICEVOXアプリケーションを再起動

2. 話者リスト確認:
   ```bash
   curl http://localhost:50021/speakers
   ```

3. ずんだもん（zundamon）以外のキャラクターは処理が重いため避ける

4. テキストが長すぎる場合はチャンク分割サイズを小さくする（article_to_speech.js:160行目）

---

### Q3. プレイヤーで音声が再生されない

**症状**:
ブラウザで再生ボタンを押しても音が出ない

**対処法**:
1. ブラウザの開発者ツール（F12）でコンソールエラー確認

2. ファイルパス確認:
   ```bash
   # Windows（PowerShell）
   ls audio\affinity-3-free-canva-ai-strategy-2025\
   
   # Windows（コマンドプロンプト）
   dir audio\affinity-3-free-canva-ai-strategy-2025\
   
   # Mac/Linux
   ls audio/affinity-3-free-canva-ai-strategy-2025/
   
   # 期待される結果: article_ja-normal.mp3 または article_zundamon.wav が存在する
   ```

3. HTTPサーバー起動確認:
   ```bash
   curl http://localhost:8081/audio/affinity-3-free-canva-ai-strategy-2025/playlist.json
   ```

---

### Q4. Python仮想環境のパスエラー

**症状**:
```
Error: Cannot find module 'C:\...\venv_kokoro\Scripts\python.exe'
```

**原因**:
仮想環境が正しく作成されていない、または異なるディレクトリに存在する。

**対処法**:

**方法1: 仮想環境の存在確認**:
```bash
# Windows（PowerShell）
Test-Path venv_kokoro\Scripts\python.exe
# → True（存在する）または False（存在しない）

# Windows（コマンドプロンプト）
if exist venv_kokoro\Scripts\python.exe (echo 存在します) else (echo 存在しません)

# Mac/Linux
test -f venv_kokoro/bin/python && echo "存在します" || echo "存在しません"

# 全OS対応（現在のPython実行ファイルのパスを表示）
python -c "import sys; print(sys.executable)"
```

**方法2: 仮想環境の再作成**:
```bash
python -m venv venv_kokoro
venv_kokoro\Scripts\activate
pip install gTTS
```

**方法3: システムPythonを使用する場合**（非推奨）:
`generate_article_audio.js` のLine 50を修正:
```javascript
// デフォルト（仮想環境使用）
const pythonPath = path.join(__dirname, '..', 'venv_kokoro', 'Scripts', 'python.exe');

// システムPythonに変更（gTTSがシステムにインストールされている場合のみ）
const pythonPath = 'python';  // または 'python3'
```

---

### Q5. 文字化け（Windowsコンソール）

**症状**:
```
���o�����e�L�X�g��: 3627����
```

**影響**: なし（音声ファイルは正常に生成される）

**対処法**:

**方法1: PowerShellを使用（推奨）**:
```powershell
# PowerShellはデフォルトでUTF-8対応
node generate_article_audio.js ...
```

**方法2: コードページ変更**:
```bash
chcp 65001  # UTF-8に変更
node generate_article_audio.js ...
```

**方法3: スクリプト内でエンコーディング指定**:
Pythonスクリプトの先頭に追加（既に `gtts_article_to_speech.py` には含まれている）:
```python
# -*- coding: utf-8 -*-
```

---

## パフォーマンスチューニング

### gTTS最適化

gTTSは既に最適化されているため、追加チューニング不要。

### VOICEVOX最適化

```javascript
// article_to_speech.js

// API負荷軽減のための待機時間
await new Promise(resolve => setTimeout(resolve, 100));  // 100ms待機

// チャンク分割サイズ（小さくすると処理が分散）
const chunks = splitIntoChunks(text, 1000);  // 1000文字単位
```

---

## 将来的な拡張案

### 1. 複数チャンク対応

現在は1記事=1音声ファイルだが、長文記事は分割して生成。

**実装案**:
- 10,000文字以上の記事は5,000文字単位で分割
- `playlist.json` の `chunks` 配列に複数ファイル
- プレイヤーで自動連続再生

### 2. 音声キャッシュ機能

同じ記事の再生成を避けるため、既存ファイルをチェック。

**実装案**:
```javascript
if (fs.existsSync(outputPath)) {
  console.log('既存の音声ファイルを使用します');
  return;
}
```

### 3. 並列音声生成

複数の話者音声を並列生成。

**実装案**:
```javascript
const speakers = ['ja-normal', 'zundamon'];
await Promise.all(speakers.map(s => generateAudio(articlePath, s)));
```

### 4. 音声エンジン追加

- **Coqui TTS**: オープンソース高品質TTS
- **pyttsx3**: 完全オフライン動作
- **ElevenLabs API**: 商用高品質（有料）

---

## ライセンス

### 使用ライブラリ

| ライブラリ | ライセンス | 商用利用 |
|----------|----------|---------|
| gTTS | Apache 2.0 | ✓ |
| VOICEVOX | 無料 | ✓（利用規約要確認） |

### 本プロジェクト

MIT License（推奨）

---

## 付録

### A. 完全な環境構築コマンド（Windows）

```powershell
# 1. リポジトリクローン
git clone [URL]
cd zenn-ai-news/audio-reader

# 2. Python仮想環境
python -m venv venv_kokoro
venv_kokoro\Scripts\activate
pip install gTTS

# 3. サンプル記事作成（初回テスト用）
mkdir ..\articles 2>nul
echo ---> ..\articles\test-article.md
echo title: テスト記事>> ..\articles\test-article.md
echo --->> ..\articles\test-article.md
echo.>> ..\articles\test-article.md
echo # はじめに>> ..\articles\test-article.md
echo これはテスト用の記事です。>> ..\articles\test-article.md

# 4. 音声生成テスト
cd scripts
node generate_article_audio.js "..\articles\test-article.md" ja-normal

# 5. 生成確認
dir ..\audio\test-article\
# → article_ja-normal.mp3 と playlist.json が存在することを確認

# 6. サーバー起動（audio-readerディレクトリに戻る）
cd ..
node server.js
# → Server running at http://localhost:8081/

# 7. ブラウザでアクセス（新しいウィンドウで）
start http://localhost:8081/

# 注意: 実際の記事でテストする場合は、articles/フォルダに記事を配置してから実行してください
```

### B. 完全な環境構築コマンド（Mac/Linux）

```bash
# 1. リポジトリクローン
git clone [URL]
cd zenn-ai-news/audio-reader

# 2. Python仮想環境
python3 -m venv venv_kokoro
source venv_kokoro/bin/activate
pip install gTTS

# 3. 音声生成テスト（実際の記事を使用）
cd scripts
node generate_article_audio.js "../articles/affinity-3-free-canva-ai-strategy-2025.md" ja-normal

# 4. 生成確認
ls ../audio/affinity-3-free-canva-ai-strategy-2025/
# → article_ja-normal.mp3 と playlist.json が存在することを確認

# 5. サーバー起動（audio-readerディレクトリに戻る）
cd ..
node server.js
# → Server running at http://localhost:8081/

# 6. ブラウザでアクセス（新しいウィンドウで）
open http://localhost:8081/
```

---

## 更新履歴

| 日付 | バージョン | 内容 |
|------|----------|------|
| 2025-11-08 | v1.0.0 | 初版作成（gTTS導入完了） |

---

**END OF DOCUMENT**
