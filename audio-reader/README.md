# 🎙️ Zenn記事音声朗読プロジェクト

> Zennに投稿した記事をgTTS（Google Text-to-Speech）またはVOICEVOX（ずんだもん）で音声化し、Webブラウザで再生できるプロジェクトです。

**📅 作成日**: 2025/11/08  
**🔄 最終更新**: 2025/11/08

**🎯 プロジェクトステータス**: 安定稼働中（Google Cloud TTS実装完了）

## 📋 機能

- Zenn記事（Markdown）をテキスト抽出
- **Google Cloud TTS（Text-to-Speech）による高品質音声合成（デフォルト）**
- **VOICEVOX APIによる音声合成（オプション）**
- チャンク分割による長文対応（5000バイト制限対応）
- Webベースの音声プレイヤー
- 再生速度調整（0.5x - 2.0x）
- 複数チャンクの連続再生
- プログレスバーでのシーク操作
- サムネイル画像表示機能

## 🚀 セットアップ

### 前提条件

- **Node.js**: v18.0以上（確認済み動作バージョン: v22.18.0）
- **Python**: 3.10以上
- **Google Cloud プロジェクト**: Text-to-Speech API有効化済み
- **サービスアカウントキー**: JSON形式（プロジェクトルートに配置）

### 1. 音声エンジンの準備

**Google Cloud TTS（デフォルト・推奨）:**
1. Google Cloud Consoleでプロジェクト作成
2. Text-to-Speech APIを有効化
3. サービスアカウントを作成し、JSONキーをダウンロード
4. `service-account-key.json` としてプロジェクトルートに配置
5. 詳細は「Google Cloud TTS設定」セクション参照

**VOICEVOX（オプション・高品質だが重い）:**
1. [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード
2. インストールして起動
3. デフォルトでポート50021でAPIサーバーが起動

### 2. Pythonパッケージのインストール

```bash
# Python仮想環境作成
python -m venv venv_kokoro

# 仮想環境有効化（Windows）
venv_kokoro\Scripts\activate

# 仮想環境有効化（Mac/Linux）
source venv_kokoro/bin/activate

# 依存パッケージ一括インストール（推奨）
pip install -r requirements.txt

# または個別インストール
pip install google-cloud-texttospeech

# インストール確認
python -c "from google.cloud import texttospeech; print('OK')"
```

**依存パッケージ（`requirements.txt`に記載）:**
- `google-cloud-texttospeech>=2.16.0` (メイン)
- `protobuf` (自動インストール)
- `googleapis-common-protos` (自動インストール)
- `grpcio` (自動インストール)
- `google-auth` (自動インストール)
- `google-api-core` (自動インストール)

## 📖 使用方法

### クイックスタート（最小手順）

```bash
# 1. プロジェクトディレクトリに移動
cd C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader

# 2. 音声生成（Google Cloud TTS）
node scripts/generate_article_audio.js ../articles/[記事ファイル名].md ja-normal

# 3. サーバー起動
node server.js

# 4. ブラウザで開く
# http://localhost:8081/
```

### ステップ1: 音声ファイル生成

```bash
cd audio-reader/scripts

# Google Cloud TTSで音声化（デフォルト・推奨）
node generate_article_audio.js ../../articles/affinity-3-free-canva-ai-strategy-2025.md ja-normal

# VOICEVOXで音声化（オプション・高品質だが重い）
node generate_article_audio.js ../../articles/affinity-3-free-canva-ai-strategy-2025.md zundamon
```

**生成されるファイル:**
- `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/article_ja-normal.mp3`（Google Cloud TTS）
- `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/article_ja-normal_chunk_01.mp3`（長文の場合、複数チャンク）
- `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/playlist.json`（メタデータ）
- または `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/article_zundamon.wav`（VOICEVOX）

### ステップ2: Webプレイヤーで再生

**🚨 重要: 専用HTTPサーバー（server.js）経由で起動してください**

```bash
# Node.js HTTPサーバーを起動（audio-readerディレクトリから）
cd audio-reader
node server.js
# → Server running at http://localhost:8081/

# ブラウザで開く
# http://localhost:8081/ にアクセス（自動的にプレイヤーが表示されます）
```

**Windows簡易起動コマンド:**
```bash
cd audio-reader
start /B node server.js && timeout /t 2 && start http://localhost:8081/
```

**Mac/Linux簡易起動コマンド:**
```bash
cd audio-reader
node server.js & sleep 2 && open http://localhost:8081/  # Mac
node server.js & sleep 2 && xdg-open http://localhost:8081/  # Linux
```

**⚠️ file:// プロトコルで直接開くとCORSエラーが発生します**
- ❌ `start audio-player.html` - CORSエラー
- ❌ `python -m http.server` - Range Requests非対応でシーク不可
- ✅ `node server.js` → `http://localhost:8081/` - 正常動作（Range Requests対応）

## 🎨 プレイヤー機能

- **再生/一時停止**: 中央の再生ボタン
- **チャンク移動**: 前へ/次へボタン
- **チャンク選択**: 下部リストから直接選択
- **シーク**: プログレスバーをクリック
- **再生速度**: ドロップダウンで0.5x〜2.0x選択

## 📁 プロジェクト構造

```
audio-reader/
├── scripts/
│   └── article_to_speech.js    # 記事→音声変換スクリプト
├── audio/
│   └── [記事名]/
│       ├── chunk_000.wav       # 音声ファイル（チャンク）
│       ├── chunk_001.wav
│       └── playlist.json       # プレイリスト情報
├── web/
│   └── audio-player.html       # Webプレイヤー
└── README.md
```

## 🔧 カスタマイズ

### 音声エンジン・音声選択

**Google Cloud TTS音声:**
- `ja-normal`: 日本語（標準）- Standard音声（デフォルト・無料枠大）
- `ja-male`: 日本語（男性）- Neural2音声（高品質）
- `ja-female`: 日本語（女性）- Neural2音声（高品質）

**VOICEVOX音声:**
- `zundamon`: ずんだもん（ノーマル）- 親しみやすい声

使用例:
```bash
# 標準音声（推奨・無料枠が大きい）
node generate_article_audio.js article.md ja-normal

# 男性声（高品質）
node generate_article_audio.js article.md ja-male

# 女性声（高品質）
node generate_article_audio.js article.md ja-female

# ずんだもん（VOICEVOX起動必須）
node generate_article_audio.js article.md zundamon
```

利用可能な音声一覧を確認:
```bash
node scripts/generate_article_audio.js
```

### プレイヤーのスタイル

`web/audio-player.html` のCSSセクションを編集してデザインカスタマイズ可能。

---

## 🔑 Google Cloud TTS設定

### 1. Google Cloudプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存プロジェクトを選択）
3. プロジェクトIDをメモ（例: `my-tts-project-12345`）

### 2. Text-to-Speech APIの有効化

1. Google Cloud Console左メニュー → 「APIとサービス」 → 「ライブラリ」
2. 検索ボックスに「Cloud Text-to-Speech API」と入力
3. 「Cloud Text-to-Speech API」をクリック
4. 「有効にする」ボタンをクリック

### 3. サービスアカウント作成

1. Google Cloud Console左メニュー → 「IAMと管理」 → 「サービスアカウント」
2. 「サービスアカウントを作成」をクリック
3. サービスアカウント名: `tts-service-account`（任意）
4. 役割: 「Cloud Text-to-Speech ユーザー」を選択
5. 「完了」をクリック

### 4. サービスアカウントキーの取得

1. 作成したサービスアカウントをクリック
2. 「キー」タブ → 「鍵を追加」 → 「新しい鍵を作成」
3. キーのタイプ: 「JSON」を選択
4. 「作成」をクリック → JSON形式のキーファイルがダウンロードされます

### 5. キーファイルの配置

```bash
# ダウンロードしたJSONファイルを audio-reader ディレクトリにコピー
cp ~/Downloads/my-project-12345-abcdef123456.json C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader\service-account-key.json
```

**重要:** 
- ファイル名は必ず `service-account-key.json` にしてください
- プロジェクトルート（audio-readerディレクトリ）に配置してください
- このファイルは`.gitignore`に追加して、Gitにコミットしないでください

### 6. 認証テスト

```bash
# Python仮想環境を有効化
cd C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader
venv_kokoro\Scripts\activate

# テスト実行
python -c "from google.cloud import texttospeech; client = texttospeech.TextToSpeechClient(); print('認証成功')"
```

**期待される結果:** `認証成功` と表示される

**エラーが発生した場合:**
- `google.auth.exceptions.DefaultCredentialsError` → キーファイルのパスを確認
- `FileNotFoundError` → `service-account-key.json` が正しい場所にあるか確認

## 🐛 トラブルシューティング

### Google Cloud TTS認証エラー

**症状:**
```
google.auth.exceptions.DefaultCredentialsError: Could not automatically determine credentials
```

**解決方法:**
1. `service-account-key.json` がプロジェクトルートに存在するか確認
   ```bash
   ls -la service-account-key.json
   ```

2. 環境変数 `GOOGLE_APPLICATION_CREDENTIALS` を手動設定（通常は不要）
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader\service-account-key.json"
   
   # Windows コマンドプロンプト
   set GOOGLE_APPLICATION_CREDENTIALS=C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader\service-account-key.json
   
   # Mac/Linux
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. Text-to-Speech APIが有効化されているか確認
   - Google Cloud Console → APIとサービス → 有効なAPI
   - 「Cloud Text-to-Speech API」が表示されていることを確認

### Google Cloud TTS音声生成エラー

**症状:**
```
エラー: Network error / Connection timeout
```

**解決方法:**
1. インターネット接続を確認
2. Google TTS APIが利用可能か確認

### VOICEVOX接続エラー（VOICEVOX使用時のみ）

**症状:**
```
エラー: connect ECONNREFUSED 127.0.0.1:50021
```

**解決方法:**
1. VOICEVOXアプリが起動しているか確認
2. 設定でAPIサーバーが有効になっているか確認

### ブラウザで音声が再生できない / CORSエラー

**原因:**
- `file://` プロトコルで直接HTMLを開いている
- ブラウザのCORSポリシーによりローカルファイル間のfetchがブロック

**解決方法:**
- 必ずHTTPサーバー経由でアクセス:
  ```bash
  cd audio-reader
  python -m http.server 8080
  # http://localhost:8080/web/audio-player.html にアクセス
  ```

**エラーメッセージ例:**
```
Access to fetch at 'file:///...' from origin 'null' has been blocked by CORS policy
```
→ HTTPサーバー起動で解決

## 📁 プロジェクト構造（詳細）

```
audio-reader/
├── audio/                          # 生成音声ファイル格納
│   └── [記事名]/
│       ├── article_ja-normal.mp3   # Google Cloud TTS音声
│       ├── article_ja-normal_chunk_01.mp3  # チャンク分割音声（長文の場合）
│       ├── article_ja-normal_chunk_02.mp3
│       ├── article_zundamon.wav    # VOICEVOX音声（オプション）
│       └── playlist.json           # メタデータ
│
├── scripts/                        # 音声生成スクリプト
│   ├── generate_article_audio.js  # 統合スクリプト（推奨）
│   ├── generate_tts_audio.py      # Google Cloud TTS実装
│   ├── gtts_article_to_speech.py  # gTTS実装（非推奨・互換性のため残存）
│   ├── article_to_speech.js       # VOICEVOX実装
│   └── kokoro_tts.py              # Kokoro TTS実装（実験的）
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
├── server.js                       # HTTPサーバー（Range Requests対応）
├── service-account-key.json        # Google Cloud認証キー（手動配置・Git除外）
├── README.md                       # 本ファイル
├── DESIGN_DOCUMENT.md              # 詳細設計書
├── TESTING.md                      # テストガイド
└── THUMBNAIL_SELECTION_CRITERIA.md # サムネイル選定基準
```

---

## 📝 ライセンス

- Google Cloud TTSの利用規約に従います（有料サービス・無料枠あり）
- VOICEVOXの利用規約に従います
- 音声ファイルの商用利用はGoogle Cloud TTS・VOICEVOXの各利用規約を確認してください

## 📜 開発履歴・変更ログ

### 2025-11-08: Google Cloud TTS実装完了（メジャーアップデート）

**主要変更:**
- gTTS（Google翻訳音声）→ Google Cloud TTS（高品質Neural2音声）に移行
- チャンク分割機能実装（5000バイト制限対応）
- 複数チャンク連続再生機能実装
- サービスアカウントキー認証システム導入

**技術的改善:**
- `generate_tts_audio.py`: Google Cloud TTS統合スクリプト新規作成
- `generate_article_audio.js`: 統合フロントエンドスクリプト（Google Cloud TTS + VOICEVOX対応）
- `server.js`: Range Requests対応で大容量MP3ファイルのシーク機能実装
- Markdown解析精度向上（frontmatter除去、参照元セクション除去等）

**動作確認済み環境:**
- Node.js v22.18.0
- Python 3.10+
- Google Cloud Text-to-Speech API

### 2025-11-08以前: 初期実装

- VOICEVOX音声生成実装
- gTTS音声生成実装（現在は非推奨）
- Webプレイヤー基本機能実装
- サムネイル画像表示機能
- ダークモードUI実装

---

## 🔗 参考リンク

- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech)
- [Google Cloud TTS 料金](https://cloud.google.com/text-to-speech/pricing)
- [VOICEVOX](https://voicevox.hiroshiba.jp/)
- [VOICEVOX API ドキュメント](https://voicevox.github.io/voicevox_engine/api/)
- [ずんだもん利用規約](https://zunko.jp/guideline.html)
