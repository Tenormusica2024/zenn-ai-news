# Zenn記事音声朗読プロジェクト

Zennに投稿した記事をVOICEVOX（ずんだもん）で音声化し、Webブラウザで再生できるプロジェクトです。

## 📋 機能

- Zenn記事（Markdown）をテキスト抽出
- VOICEVOX APIで音声合成（ずんだもん）
- チャンク分割による長文対応
- Webベースの音声プレイヤー
- 再生速度調整（0.5x - 2.0x）
- チャンク単位でのスキップ・選択再生
- プログレスバーでのシーク操作

## 🚀 セットアップ

### 1. VOICEVOXのインストール

1. [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード
2. インストールして起動
3. デフォルトでポート50021でAPIサーバーが起動

### 2. 必要なパッケージ

```bash
# Node.js環境が必要（既にインストール済みの場合はスキップ）
node --version  # v14以上推奨
```

## 📖 使用方法

### ステップ1: 音声ファイル生成

```bash
cd audio-reader/scripts

# 記事を音声化
node article_to_speech.js ../../articles/affinity-3-free-canva-ai-strategy-2025.md
```

**生成されるファイル:**
- `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/chunk_000.wav`
- `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/chunk_001.wav`
- ...
- `audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/playlist.json`

### ステップ2: Webプレイヤーで再生

**🚨 重要: HTTPサーバー経由で起動する必要があります（CORS対策）**

```bash
# ローカルHTTPサーバーを起動
cd audio-reader/web
python -m http.server 8080

# ブラウザで開く
# http://localhost:8080/audio-player.html にアクセス
```

**Windows簡易起動コマンド:**
```bash
cd audio-reader/web
python -m http.server 8080 & start http://localhost:8080/audio-player.html
```

**⚠️ file:// プロトコルで直接開くとCORSエラーが発生します**
- ❌ `start audio-player.html` - CORSエラー
- ✅ `http://localhost:8080/audio-player.html` - 正常動作

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

### 音声キャラクター変更

`scripts/article_to_speech.js` の `SPEAKER_ID` を変更:

```javascript
const SPEAKER_ID = 3;  // ずんだもん（ノーマル）
// 1: 四国めたん（ノーマル）
// 8: 春日部つむぎ（ノーマル）
// 10: 雨晴はう（ノーマル）
```

VOICEVOXで利用可能なスピーカーIDは以下で確認:
```bash
curl http://localhost:50021/speakers
```

### チャンクサイズ調整

長い文章の分割サイズを変更:

```javascript
const chunks = splitIntoChunks(text, 200);  // 200文字で分割
```

### プレイヤーのスタイル

`web/audio-player.html` のCSSセクションを編集してデザインカスタマイズ可能。

## 🐛 トラブルシューティング

### VOICEVOX接続エラー

```
エラー: connect ECONNREFUSED 127.0.0.1:50021
```

**解決方法:**
1. VOICEVOXアプリが起動しているか確認
2. 設定でAPIサーバーが有効になっているか確認

### 音声が途切れる

**解決方法:**
- チャンクサイズを小さくする（例: 150文字）
- API呼び出し間の待機時間を増やす:
  ```javascript
  await new Promise(resolve => setTimeout(resolve, 200)); // 100→200ms
  ```

### ブラウザで音声が再生できない / CORSエラー

**原因:**
- `file://` プロトコルで直接HTMLを開いている
- ブラウザのCORSポリシーによりローカルファイル間のfetchがブロック

**解決方法:**
- 必ずHTTPサーバー経由でアクセス:
  ```bash
  cd audio-reader/web
  python -m http.server 8080
  # http://localhost:8080/audio-player.html にアクセス
  ```

**エラーメッセージ例:**
```
Access to fetch at 'file:///...' from origin 'null' has been blocked by CORS policy
```
→ HTTPサーバー起動で解決

## 📝 ライセンス

- VOICEVOXの利用規約に従います
- 音声ファイルの商用利用はVOICEVOXの各キャラクター利用規約を確認してください

## 🔗 参考リンク

- [VOICEVOX](https://voicevox.hiroshiba.jp/)
- [VOICEVOX API ドキュメント](https://voicevox.github.io/voicevox_engine/api/)
- [ずんだもん利用規約](https://zunko.jp/guideline.html)
