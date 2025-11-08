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
| **Node.js** | v22.18.0 | 統合スクリプト・HTTPサーバー |
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

### 前提条件

- Node.js v18以上
- Python 3.10以上
- インターネット接続（gTTS使用時）

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
# VOICEVOX公式サイトからダウンロード
# https://voicevox.hiroshiba.jp/

# インストール後、アプリケーション起動
# APIサーバーが http://localhost:50021 で起動
```

### 4. Node.js依存関係（不要）

HTTPサーバーは標準ライブラリのみで動作するため、`npm install`不要。

### 5. 動作確認

```bash
# HTTPサーバー起動
node server.js
# → Server running at http://localhost:8081/

# ブラウザでアクセス
# http://localhost:8081/web/audio-player.html
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
│   └── Scripts/
│       └── python.exe
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

# 例
python gtts_article_to_speech.py ../articles/article.md ja-normal
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

# 例
node article_to_speech.js ../articles/article.md zundamon
```

**話者キー**:
- `zundamon`: ずんだもん（ノーマル） - ID: 3
- `no7-reading`: No.7（読み聞かせ） - ID: 31（非推奨：重い）
- `aoyama-calm`: 青山龍星（しっとり） - ID: 84（非推奨：重い）

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

# gTTS（推奨：軽量・高速）
node generate_article_audio.js "../articles/記事名.md" ja-normal

# VOICEVOX（高品質だが重い）
node generate_article_audio.js "../articles/記事名.md" zundamon
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
GET /                           → web/audio-player.html
GET /web/audio-player.html     → プレイヤーHTML
GET /web/affinity-thumbnail.jpg → サムネイル画像
GET /audio/[記事名]/[ファイル]   → 音声ファイル（MP3/WAV）
GET /audio/[記事名]/playlist.json → メタデータ
```

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

**症状**:
```
Error: HTTP 500: {"detail":"Internal Server Error"}
```

**対処法**:
1. VOICEVOXアプリケーションを再起動
2. APIサーバー確認:
   ```bash
   curl http://localhost:50021/version
   ```
3. ずんだもん以外のキャラクターは処理が重いため避ける

---

### Q3. プレイヤーで音声が再生されない

**症状**:
ブラウザで再生ボタンを押しても音が出ない

**対処法**:
1. ブラウザの開発者ツール（F12）でコンソールエラー確認
2. ファイルパス確認:
   ```bash
   ls audio/記事名/
   # article_ja-normal.mp3 または article_zundamon.wav が存在するか
   ```
3. HTTPサーバー起動確認:
   ```bash
   curl http://localhost:8081/audio/記事名/playlist.json
   ```

---

### Q4. Python仮想環境のパスエラー

**症状**:
```
Error: Cannot find module 'C:\...\venv_kokoro\Scripts\python.exe'
```

**対処法**:
`generate_article_audio.js` のPythonパス修正:
```javascript
// 現在のパス
const pythonPath = path.join(__dirname, '..', 'venv_kokoro', 'Scripts', 'python.exe');

// システムPythonを使う場合
const pythonPath = 'python';  // または 'python3'
```

---

### Q5. 文字化け（Windowsコンソール）

**症状**:
```
���o�����e�L�X�g��: 3627����
```

**影響**: なし（音声ファイルは正常に生成される）

**対処法**（オプション）:
```bash
# PowerShellで実行
chcp 65001  # UTF-8に変更
node generate_article_audio.js ...
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

# 3. 音声生成テスト
node scripts/generate_article_audio.js "../articles/affinity-3-free-canva-ai-strategy-2025.md" ja-normal

# 4. サーバー起動
node server.js

# 5. ブラウザでアクセス
start http://localhost:8081/web/audio-player.html
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

# 3. 音声生成テスト
node scripts/generate_article_audio.js "../articles/affinity-3-free-canva-ai-strategy-2025.md" ja-normal

# 4. サーバー起動
node server.js

# 5. ブラウザでアクセス
open http://localhost:8081/web/audio-player.html
```

---

## 更新履歴

| 日付 | バージョン | 内容 |
|------|----------|------|
| 2025-11-08 | v1.0.0 | 初版作成（gTTS導入完了） |

---

**END OF DOCUMENT**
