# 🚀 Zenn Article Audio Reader - GitHub Pages デプロイガイド

> **作成日**: 2025/11/09  
> **最終更新**: 2025/11/10  
> **ステータス**: ✅ 本番稼働中

---

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [新規記事追加の完全ワークフロー](#新規記事追加の完全ワークフロー) ← **最重要**
3. [GitHub Pages デプロイ完全ガイド](#github-pages-デプロイ完全ガイド)
4. [ディレクトリ構造とパス設計](#ディレクトリ構造とパス設計)
5. [トラブルシューティング完全版](#トラブルシューティング完全版)
6. [開発履歴とナレッジベース](#開発履歴とナレッジベース)

---

## 🎯 プロジェクト概要

### 基本情報

- **プロジェクト名**: Zenn Article Audio Reader
- **目的**: Zenn記事を高品質な音声で朗読するWebアプリケーション
- **デプロイ方式**: GitHub Pages（静的サイトホスティング）
- **本番URL**: https://tenormusica2024.github.io/zenn-ai-news/
- **リポジトリ**: https://github.com/Tenormusica2024/zenn-ai-news

### 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (Vanilla)
- **音声合成**: Google Cloud TTS (Neural2音声)
- **音声形式**: MP3 (チャンク分割対応)
- **プレイヤー**: Web Audio API
- **ホスティング**: GitHub Pages (静的サイト)
- **開発サーバー**: Node.js HTTP Server (Range Requests対応)

### 主要機能

1. **複数記事管理**: プレイリスト形式で複数記事を管理
2. **チャンク分割再生**: 長文記事を複数チャンクに分割して連続再生
3. **音声制御**: 再生速度調整 (0.5x - 2.0x)、音量調整、シーク操作
4. **レスポンシブデザイン**: デスクトップ・モバイル両対応
5. **いいね機能**: ローカルストレージ使用
6. **ポートフォリオ統合**: フッターにポートフォリオサイトへの戻るリンク

---

## 🆕 新規記事追加の完全ワークフロー

**🚨 CRITICAL: このセクションは新規記事追加時に必ず参照してください**

このワークフローに従うことで、ブランチ間のファイル移動、音声生成、サムネイル取得、Git管理の全ステップを網羅できます。

### 前提条件

- masterブランチで記事（Markdown）を作成済み
- Google Cloud TTS認証キーが設定済み
- Node.js環境が整っている

### ステップ1: 作業ブランチの準備と記事ファイル作成

**🔍 ブランチ戦略の簡素化**: 以前はmasterブランチで記事作成→feature/article-audio-reader-cleanに移動という複雑な手順でしたが、**すべての作業をfeature/article-audio-reader-cleanブランチで完結**させることで初心者にも分かりやすくなります。

```bash
# 1. 作業ブランチに切り替え（すでにいる場合はスキップ）
git checkout feature/article-audio-reader-clean
git pull origin feature/article-audio-reader-clean

# 2. 現在のブランチを確認
git branch
# → * feature/article-audio-reader-clean が表示されることを確認

# 3. articles/ディレクトリに記事を作成
# ファイル名: [スラッグ].md
# 例: chatgpt-vulnerabilities-hackedgpt-2025.md
# この時点ではコミット・プッシュしない（音声・サムネイルと一緒にコミット）
```

**📝 なぜこの方法が優れているのか:**
- ❌ **旧方式**: masterで作成→コミット→feature/article-audio-reader-cleanに切り替え→git checkout master --で取得（複雑）
- ✅ **新方式**: feature/article-audio-reader-cleanで作成→音声・サムネイル追加→まとめてコミット（シンプル）
- ✅ ブランチ間の移動が不要
- ✅ Git初心者でも理解しやすい
- ✅ コミット履歴が整理される（1記事=1コミット）

### ステップ2: サムネイル画像取得

**🚨 CRITICAL: ウェブ上から記事に最適な画像を取得する**

**🔧 自動化スクリプト（今後の改善予定）:**
現在は手動実行ですが、`scripts/fetch_thumbnail.js`のような自動化スクリプトを作成予定です。

**現在の手動実行手順:**
```bash
# 1. WebSearchで画像検索（Claude Code実行）
# 例: "ChatGPT vulnerability HackedGPT security image thumbnail 2025"

# 2. WebFetchで画像URL抽出（Claude Code実行）
# The Hacker News等のセキュリティメディアから抽出

# 3. 画像ダウンロード
cd audio-reader/web
curl -o [スラッグ]-thumbnail.jpg "[画像URL]"

# 4. 画像確認（Claude Code: Read ツール実行）
# 視覚的に内容を確認し、記事に適しているか判定

# 5. 画像サイズ確認（推奨: 50KB-200KB）
ls -lh [スラッグ]-thumbnail.jpg

cd ../..
```

**🎯 将来的な自動化スクリプト案:**
```javascript
// scripts/fetch_thumbnail.js（今後実装予定）
// 使用方法: node scripts/fetch_thumbnail.js "記事タイトル" "記事スラッグ"
// 自動でWebSearch → WebFetch → ダウンロード → 最適化を実行
```

**絶対禁止事項:**
- ❌ SVGで画像を作成する
- ❌ Pythonで画像を生成する
- ❌ ローカルで画像を作成する

**推奨される画像ソース:**
- ✅ The Hacker News記事の画像
- ✅ セキュリティメディアの記事画像
- ✅ 公式ブログの画像
- ✅ 著作権的に問題のないニュース画像

### ステップ4: 音声生成（両方の音声）

**🚨 CRITICAL: 必ずaudio-readerディレクトリで実行**

**🔍 なぜaudio-readerディレクトリで実行する必要があるのか:**

1. **package.jsonの配置場所**: `audio-reader/package.json`に依存パッケージが定義されており、`node_modules`もaudio-reader配下にある
2. **相対パスの設計**: `generate_article_audio.js`は相対パス`../articles/[スラッグ].md`で記事ファイルを参照する設計
3. **Google Cloud認証キー**: `service-account-key.json`がaudio-reader直下に配置されており、スクリプトはこの場所を前提としている
4. **出力先ディレクトリ**: 音声ファイルの出力先`audio/`がaudio-reader配下に存在

**❌ zenn-ai-newsディレクトリから実行した場合:**
```bash
# 誤った実行例
cd C:\Users\Tenormusica\Documents\zenn-ai-news
node audio-reader/scripts/generate_article_audio.js articles/[スラッグ].md ja-male

# エラー内容:
# Error: Cannot find module '@google-cloud/text-to-speech'
# → node_modulesがaudio-reader配下にあるため見つからない
```

**✅ 正しい実行手順:**
```bash
# 1. audio-readerディレクトリに移動
cd audio-reader

# 2. 男性音声生成
node scripts/generate_article_audio.js ../articles/[スラッグ].md ja-male

# 3. 女性音声生成
node scripts/generate_article_audio.js ../articles/[スラッグ].md ja-female

# 4. 生成確認
ls -la audio/[スラッグ]/
# → 以下のファイルが存在することを確認:
#    article_ja-male_chunk_01.mp3, article_ja-male_chunk_02.mp3, ...
#    article_ja-female_chunk_01.mp3, article_ja-female_chunk_02.mp3, ...
#    playlist.json

# 5. プロジェクトルートに戻る
cd ..
```

**🔍 音声生成失敗時の詳細対処法:**
```bash
# エラー1: Cannot find module '@google-cloud/text-to-speech'
# 原因: audio-readerディレクトリで実行していない
# 対処: cd audio-reader で移動してから再実行

# エラー2: Google Cloud認証エラー "Could not load the default credentials"
# 原因: service-account-key.jsonが存在しない、または配置場所が違う
# 対処: 以下のコマンドで確認
ls -la audio-reader/service-account-key.json
# → ファイルが存在しない場合は、Google Cloud Consoleから再ダウンロード

# エラー3: ENOENT: no such file or directory, open '../articles/[スラッグ].md'
# 原因: 記事ファイルが存在しない、またはパスが間違っている
# 対処: 記事ファイルの存在確認
ls -la ../articles/[スラッグ].md

# エラー4: Quota exceeded for quota metric 'CharacterCount'
# 原因: Google Cloud TTSの無料枠を超過した
# 対処: Google Cloud Consoleで課金設定を確認、または翌月まで待機
```

### ステップ5: index.html更新

**🚨 CRITICAL: availableArticles配列の先頭に追加**

```javascript
// index.html内のavailableArticles配列を編集

const availableArticles = [
  // ✅ 新規記事は配列の先頭（0番目）に追加
  {
    slug: '[スラッグ]',  // ← 記事ファイル名から.mdを除去
    title: '[記事タイトル]',  // ← 記事の正式タイトル
    thumbnail: 'audio-reader/web/[スラッグ]-thumbnail.jpg',  // ← サムネイル画像パス
    publishDate: 'YYYY/MM/DD',  // ← 公開日（例: 2025/11/10）
    url: 'https://zenn.dev/dragonrondo/articles/[スラッグ]',  // ← Zenn記事URL
    likes: 0  // ← 初期値は0
  },
  // 既存の記事（そのまま残す）
  {
    slug: 'affinity-3-free-canva-ai-strategy-2025',
    title: 'Affinity無料化でCanvaとの競争激化...',
    // ...
  },
  // ...
];
```

**📝 フィールド説明:**
- `slug`: 記事ファイル名から`.md`を除去したもの
- `title`: 記事のタイトル（Markdown frontmatterの`title`と同じ）
- `thumbnail`: サムネイル画像のパス（必ず`audio-reader/web/`から始める）
- `publishDate`: 記事の公開日（YYYY/MM/DD形式）
- `url`: Zenn記事のURL（`https://zenn.dev/dragonrondo/articles/[スラッグ]`）
- `likes`: 初期値は`0`

### ステップ6: Git管理確認（必須チェックリスト）

**🚨 CRITICAL: 以下の全ファイルがGit管理下にあることを確認**

```bash
# ✅ 記事ファイル確認
git ls-files articles/[スラッグ].md
# → articles/[スラッグ].md が表示されることを確認

# ✅ 音声ファイル確認
git ls-files audio-reader/audio/[スラッグ]/
# → 全ての.mp3ファイルとplaylist.jsonが表示されることを確認

# ✅ サムネイル画像確認
git ls-files audio-reader/web/[スラッグ]-thumbnail.jpg
# → audio-reader/web/[スラッグ]-thumbnail.jpg が表示されることを確認

# ✅ index.html更新確認
git diff index.html
# → availableArticles配列に新規記事が追加されていることを確認
```

**⚠️ ファイルが表示されない場合:**
```bash
# ファイルが表示されない場合は手動で追加
git add articles/[スラッグ].md
git add audio-reader/audio/[スラッグ]/
git add audio-reader/web/[スラッグ]-thumbnail.jpg
git add index.html
```

### ステップ7: ローカル確認（必須）

**🚨 CRITICAL: GitHub Pagesにプッシュする前に必ずローカルで確認**

**❌ ローカル確認をスキップした場合のリスク:**
- GitHub Pagesにプッシュ後に404エラー発見
- 音声ファイルが再生されないエラー発見
- サムネイル画像が表示されないエラー発見
- **結果**: 修正→再プッシュ→1-2分待機→確認の無駄なサイクル（合計5-10分のロス）

**✅ ローカル確認を実施した場合:**
- プッシュ前にエラーを発見・修正（30秒-1分で完了）
- 本番環境への影響なし
- **結果**: 確実な1回のプッシュで完了

```bash
# 1. 開発サーバー起動
cd audio-reader
node server.js
# → Server running at http://localhost:8081/

# 2. ブラウザで確認
# http://localhost:8081/ にアクセス

# 3. 確認項目:
#    - 新規記事が一覧の先頭に表示されているか
#    - サムネイル画像が正しく表示されているか
#    - 音声（男性/女性）が正常に再生されるか
#    - 再生速度調整が機能するか
#    - シーク操作が機能するか

# 4. 確認完了後、サーバーを停止
# Ctrl+C でサーバー停止

# 5. プロジェクトルートに戻る
cd ..
```

### ステップ8: Git操作

```bash
# 1. 変更をステージング
git add .

# 2. コミット（詳細なメッセージ）
git commit -m "[記事タイトル]の音声・サムネイル追加

- 記事ファイル: articles/[スラッグ].md
- 音声ファイル: audio-reader/audio/[スラッグ]/ (ja-male, ja-female)
- サムネイル画像: audio-reader/web/[スラッグ]-thumbnail.jpg
- index.html: availableArticles配列に追加"

# 3. プッシュ
git push origin feature/article-audio-reader-clean
```

### ステップ9: デプロイ確認

**🚨 CRITICAL: 1-2分待機後にGitHub Pagesで確認**

```bash
# 1. 1-2分待機（GitHub Pages自動デプロイ完了を待つ）
sleep 120

# 2. HTTPステータス確認
curl -I https://tenormusica2024.github.io/zenn-ai-news/
# → HTTP/2 200 が表示されることを確認

# 3. サムネイル画像確認
curl -I https://tenormusica2024.github.io/zenn-ai-news/audio-reader/web/[スラッグ]-thumbnail.jpg
# → HTTP/2 200 が表示されることを確認

# 4. 音声ファイル確認
curl -I https://tenormusica2024.github.io/zenn-ai-news/audio-reader/audio/[スラッグ]/article_ja-male_chunk_01.mp3
# → HTTP/2 200 が表示されることを確認
```

**🌐 ブラウザで最終確認:**
1. https://tenormusica2024.github.io/zenn-ai-news/ にアクセス
2. Ctrl+Shift+R で強制リフレッシュ（キャッシュクリア）
3. 新規記事が一覧の先頭に表示されているか確認
4. サムネイル画像が表示されているか確認
5. 記事をクリックして音声が再生されるか確認

### 🔍 トラブルシューティング（拡充版）

**問題1: 音声生成エラー「Cannot find module '@google-cloud/text-to-speech'」**
```bash
# 原因: zenn-ai-newsディレクトリから実行している
# 対処: audio-readerディレクトリで実行
cd audio-reader
node scripts/generate_article_audio.js ../articles/[スラッグ].md ja-male

# または、依存パッケージが未インストール
# 対処: audio-readerディレクトリでnpm install実行
cd audio-reader
npm install
```

**問題2: Google Cloud TTS認証エラー**
```bash
# エラーメッセージ: "Could not load the default credentials"
# 原因1: service-account-key.jsonが存在しない
# 対処: ファイル存在確認
ls -la audio-reader/service-account-key.json

# 原因2: 認証キーのパーミッションエラー（Linux/Mac）
# 対処: パーミッション修正
chmod 600 audio-reader/service-account-key.json

# 原因3: 認証キーの内容が不正
# 対処: Google Cloud Consoleから再ダウンロード
# https://console.cloud.google.com/iam-admin/serviceaccounts
```

**問題3: 音声ファイルサイズが大きすぎる（GitHub 100MB制限）**
```bash
# 症状: git push時に "file exceeds 100 MB" エラー
# 原因: 長文記事の音声ファイルが100MBを超えている

# 対処方法1: チャンク分割設定を調整
# scripts/generate_article_audio.js内のMAX_CHUNK_SIZEを小さくする
# 例: 5000 → 3000 バイト

# 対処方法2: MP3のビットレートを下げる（音質低下あり）
# generate_tts_audio.py内のaudioEncodingを調整
```

**問題4: playlist.json生成エラー**
```bash
# 症状: 音声ファイルは生成されるがplaylist.jsonが作成されない
# 原因: スクリプト実行途中でエラー発生

# 対処: 詳細ログを確認
cd audio-reader
node scripts/generate_article_audio.js ../articles/[スラッグ].md ja-male --verbose

# 原因がわかったら該当エラーを修正後、再実行
```

**問題5: GitHub Pagesで404エラー**
```bash
# 原因: ファイルがGit管理下にない
# 対処: ステップ6のチェックリストを再確認
git ls-files | grep [スラッグ]
# → 全ファイルが表示されない場合は git add で追加
```

**問題6: サムネイル画像が表示されない**
```bash
# 原因: パスが間違っている
# 対処: index.html内のパスを確認
# ✅ 正しい: audio-reader/web/[スラッグ]-thumbnail.jpg
# ❌ 間違い: /web/[スラッグ]-thumbnail.jpg

# または、画像ファイルがGit管理下にない
git ls-files audio-reader/web/[スラッグ]-thumbnail.jpg
```

**問題7: チャンク分割が正しく動作しない**
```bash
# 症状: 音声が途中で途切れる、または再生されない
# 原因: Markdown解析エラー、またはチャンク分割ロジックの問題

# 対処: 記事の構造を確認
# - Markdown frontmatterが正しく記載されているか
# - 特殊文字（絵文字、記号）が含まれていないか
# - コードブロックが正しく閉じられているか

# デバッグモードで実行
cd audio-reader
node scripts/generate_article_audio.js ../articles/[スラッグ].md ja-male --debug
```

---

## 🚀 GitHub Pages デプロイ完全ガイド

### 1. ブランチ戦略

#### ブランチ構成

```
master (main)
├── feature/article-audio-reader-clean  ← GitHub Pages公開ブランチ（本番）
└── 他の開発ブランチ
```

**重要**: GitHub Pagesは `feature/article-audio-reader-clean` ブランチから公開

#### ブランチ選択の理由

- **クリーンな履歴**: 大容量ファイル・機密情報を含まない
- **安定性**: テスト済みの安定したコード
- **分離**: 開発作業と本番環境の分離

#### ブランチ間のワークフロー

**🔍 なぜ2つのブランチを使うのか?**

1. **masterブランチ**: 記事（Markdown）の保管・管理
   - Zenn記事のソースファイルを管理
   - 記事の履歴・バージョン管理
   - 記事の下書き・レビュー

2. **feature/article-audio-reader-cleanブランチ**: 本番公開用
   - 音声ファイル・サムネイル画像を含む
   - GitHub Pagesで公開される
   - index.htmlで記事一覧を管理

**🔧 ブランチ間のファイル移動:**
```bash
# masterブランチから特定ファイルのみを取得
git checkout master -- articles/[スラッグ].md

# ✅ この操作のメリット:
# - masterブランチの変更を持ち込まない
# - 必要なファイルだけを取得できる
# - ブランチをマージせずに済む
```

### 2. GitHub Pages 設定手順

#### Settings → Pages 設定

1. GitHubリポジトリ → **Settings** タブ
2. 左メニュー → **Pages**
3. **Source** セクション:
   - Branch: `feature/article-audio-reader-clean`
   - Folder: `/ (root)`
4. **Save** をクリック

#### 公開URL確認

- 設定完了後、数分で以下のURLで公開される:
  ```
  https://tenormusica2024.github.io/zenn-ai-news/
  ```

### 3. デプロイワークフロー

#### 標準デプロイフロー

```bash
# 1. ファイル編集
# （index.html, audio-reader/ 配下など）

# 2. Git操作
cd "C:\Users\Tenormusica\Documents\zenn-ai-news"
git add .
git commit -m "機能追加/修正内容の説明"
git push origin feature/article-audio-reader-clean

# 3. GitHub Pages自動デプロイ
# プッシュ後、1-2分で自動デプロイ完了

# 4. キャッシュクリア + 確認
# ブラウザで Ctrl+Shift+R (強制リフレッシュ)
# または新規シークレットウィンドウで確認
```

#### デプロイ確認コマンド

```bash
# HTTPステータスコード確認
curl -I https://tenormusica2024.github.io/zenn-ai-news/

# 期待結果: HTTP/2 200
```

---

## 📁 ディレクトリ構造とパス設計

### プロジェクトルート構造

```
zenn-ai-news/
├── index.html                              # メインHTMLファイル（エントリーポイント）
├── .gitignore                              # Git除外設定
├── README.md                               # プロジェクト説明
├── DEPLOYMENT_GUIDE.md                     # 本ファイル
│
├── audio-reader/                           # 音声リーダー本体
│   ├── audio/                              # 音声ファイル格納
│   │   ├── affinity-3-free-canva-ai-strategy-2025/
│   │   │   ├── article_ja-male_chunk_01.mp3
│   │   │   ├── article_ja-male_chunk_02.mp3
│   │   │   ├── article_ja-male_chunk_03.mp3
│   │   │   ├── article_ja-female_chunk_01.mp3
│   │   │   ├── article_ja-female_chunk_02.mp3
│   │   │   ├── article_ja-female_chunk_03.mp3
│   │   │   └── playlist.json               # メタデータ
│   │   │
│   │   └── ai-agents-70-percent-failure-reality-2025/
│   │       ├── article_ja-male_chunk_01.mp3
│   │       ├── article_ja-male_chunk_02.mp3
│   │       ├── article_ja-female_chunk_01.mp3
│   │       ├── article_ja-female_chunk_02.mp3
│   │       └── playlist.json
│   │
│   ├── web/                                # Webアセット
│   │   ├── affinity-thumbnail.jpg          # サムネイル画像1
│   │   └── ai-agents-thumbnail.jpg         # サムネイル画像2
│   │
│   ├── scripts/                            # 音声生成スクリプト
│   │   ├── generate_article_audio.js       # 統合スクリプト
│   │   └── generate_tts_audio.py           # Google Cloud TTS実装
│   │
│   ├── venv_kokoro/                        # Python仮想環境（.gitignore）
│   ├── server.js                           # 開発用HTTPサーバー
│   ├── service-account-key.json            # Google Cloud認証キー（.gitignore）
│   └── README.md                           # audio-reader説明
│
└── articles/                               # Markdown記事ソース（非公開）
    ├── affinity-3-free-canva-ai-strategy-2025.md
    └── ai-agents-70-percent-failure-reality-2025.md
```

### パス設計の重要ポイント

#### GitHub Pagesのベースパス

```
https://tenormusica2024.github.io/zenn-ai-news/
```

- リポジトリ名 `zenn-ai-news` がベースパスに含まれる
- すべてのリソースパスはこのベースを基準にする

#### 正しいパス記述

**HTML内のリソースパス（index.html）:**

```html
<!-- ✅ 正しい: 相対パス（GitHub Pages対応） -->
<img src="audio-reader/web/affinity-thumbnail.jpg" alt="Thumbnail">
<audio id="audio" src="audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/article_ja-male_chunk_01.mp3"></audio>

<!-- ❌ 間違い: 絶対パス（ローカル専用） -->
<img src="/audio-reader/web/affinity-thumbnail.jpg" alt="Thumbnail">
```

**JavaScript内のfetchパス:**

```javascript
// ✅ 正しい: ベースパス不要（相対パス）
const response = await fetch('audio-reader/audio/affinity-3-free-canva-ai-strategy-2025/playlist.json');

// ❌ 間違い: 先頭に / をつけない
const response = await fetch('/audio-reader/audio/...');
```

**理由:**
- GitHub Pagesでは `/` から始まるパスは `https://tenormusica2024.github.io/` を指す
- リポジトリ名 `/zenn-ai-news/` が抜けてしまう

---

## 🔧 トラブルシューティング完全版

### 問題1: 音声ファイルが404エラー

#### 症状

```
Failed to load resource: the server responded with a status of 404 (Not Found)
https://tenormusica2024.github.io/audio/affinity-3-free-canva-ai-strategy-2025/article_ja-male_chunk_01.mp3
```

#### 原因

1. **パスが間違っている** - `/audio/` ではなく `audio-reader/audio/`
2. **ファイルがGitに含まれていない** - `.gitignore` で除外されている
3. **ブランチが間違っている** - `master` ではなく `feature/article-audio-reader-clean`

#### 解決方法

```bash
# 1. .gitignore確認
cat .gitignore
# → audio-reader/venv_kokoro/ のみ除外されていることを確認

# 2. 音声ファイルがGit管理下にあるか確認
git ls-files audio-reader/audio/

# 3. ファイルがない場合、追加
git add audio-reader/audio/
git commit -m "音声ファイルを追加"
git push origin feature/article-audio-reader-clean

# 4. GitHub Pagesで確認
# 1-2分後に https://tenormusica2024.github.io/zenn-ai-news/ でアクセス
```

### 問題2: サムネイル画像が表示されない

#### 症状

- ブラウザコンソールに404エラー
- 画像の代わりに壊れたアイコンが表示される

#### 原因

1. **パスが間違っている** - `/web/` ではなく `audio-reader/web/`
2. **ファイル名が違う** - `thumbnail.jpg` ではなく `affinity-thumbnail.jpg`
3. **大文字小文字の違い** - `Thumbnail.jpg` ではなく `thumbnail.jpg`（Linux環境では厳密）

#### 解決方法

```bash
# 1. ファイルの存在確認
ls -la audio-reader/web/

# 2. index.html内のパス確認
grep -n "thumbnail" index.html

# 3. パス修正（index.html）
# ❌ src="/web/affinity-thumbnail.jpg"
# ✅ src="audio-reader/web/affinity-thumbnail.jpg"

# 4. Git操作
git add index.html
git commit -m "サムネイルパス修正"
git push origin feature/article-audio-reader-clean
```

### 問題3: ローカルで動作するがGitHub Pagesで404

#### 原因分析チェックリスト

```bash
# 1. ブランチ確認
git branch
# → feature/article-audio-reader-clean にいるか？

# 2. GitHub Pages設定確認
# Settings → Pages → Branch が feature/article-audio-reader-clean か？

# 3. ファイルがプッシュされているか確認
git log --oneline -5
git ls-files | grep "audio-reader"

# 4. GitHub上でファイル確認
# https://github.com/Tenormusica2024/zenn-ai-news/tree/feature/article-audio-reader-clean
# → audio-reader/audio/ 配下にMP3ファイルが見えるか？
```

### 問題4: キャッシュで変更が反映されない

#### 症状

- コードを修正してプッシュしたのに古い内容が表示される
- デベロッパーツールで見ると古いコードが読み込まれている

#### 解決方法

**レベル1: 強制リフレッシュ**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**レベル2: キャッシュクリア + リロード**
```
1. F12 でデベロッパーツール起動
2. Networkタブ → "Disable cache" にチェック
3. リロードボタンを右クリック → "Empty Cache and Hard Reload"
```

**レベル3: シークレットウィンドウ**
```
Ctrl + Shift + N (Windows)
Cmd + Shift + N (Mac)
新規ウィンドウで https://tenormusica2024.github.io/zenn-ai-news/ にアクセス
```

### 問題5: GitHub Pagesのデプロイが完了しない

#### 確認方法

```bash
# 1. GitHub Actions確認
# https://github.com/Tenormusica2024/zenn-ai-news/actions
# → pages-build-deployment ワークフローが成功しているか確認

# 2. デプロイログ確認
# Actionsタブ → 最新のpages-build-deployment → ログを確認

# 3. デプロイ状態確認
# Settings → Pages → "Your site is live at https://..." が表示されているか
```

#### よくあるエラーと対処

**エラー: ファイルサイズが大きすぎる**
```
Error: File size exceeds 100 MB
```

対処:
```bash
# 大容量ファイルを.gitignoreに追加
echo "large-file.mp3" >> .gitignore
git rm --cached large-file.mp3
git commit -m "大容量ファイル除外"
git push origin feature/article-audio-reader-clean
```

**エラー: ブランチが見つからない**
```
Error: Branch not found
```

対処:
```bash
# Settings → Pages → Branchを再設定
# feature/article-audio-reader-clean を選択 → Save
```

---

## 📚 開発履歴とナレッジベース

### 2025-11-10: サムネイル画像取得プロセス追加

#### サムネイル画像の作成方法

**🚨 CRITICAL: ウェブ上から記事に最適な画像を取得する**

1. **WebSearch実行**
   - 記事のトピックに関連するキーワードで画像検索
   - 例: `ChatGPT vulnerability HackedGPT security image thumbnail 2025`

2. **WebFetch実行**
   - 検索結果の記事URLから画像URLを抽出
   - メイン画像・サムネイル画像を優先的に抽出

3. **画像ダウンロード**
   ```bash
   cd "C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader\web"
   curl -o [記事スラッグ]-thumbnail.jpg "[画像URL]"
   ```

4. **Read ツールで画像確認**
   - ダウンロードした画像の内容を視覚的に確認
   - 記事の内容に適しているか判定

**絶対禁止事項:**
- ❌ SVGで画像を作成する
- ❌ Pythonで画像を生成する
- ❌ ローカルで画像を作成する

**推奨される画像ソース:**
- ✅ The Hacker News記事の画像
- ✅ セキュリティメディアの記事画像
- ✅ 公式ブログの画像
- ✅ 著作権的に問題のないニュース画像

#### 実装例（2025-11-10）

**記事:** ChatGPT脆弱性「HackedGPT」  
**画像ソース:** The Hacker News記事  
**画像URL:** https://blogger.googleusercontent.com/img/.../openai.jpg  
**画像内容:** OpenAIロゴが表示されたスマートフォンとサイバーセキュリティ環境  
**ファイルサイズ:** 41KB  

### 2025-11-09: GitHub Pages デプロイ完了

#### 実施内容

1. **音声ファイル404エラー解決**
   - パス修正: `/audio/` → `audio-reader/audio/`
   - `.gitignore` 見直し（音声ファイルは除外しない）
   - Git管理下に音声ファイルを追加

2. **サムネイル画像404エラー解決**
   - パス修正: `/web/` → `audio-reader/web/`
   - 画像ファイルをGit管理下に追加

3. **GitHub Pages設定完了**
   - ブランチ: `feature/article-audio-reader-clean`
   - フォルダ: `/ (root)`
   - 公開URL: https://tenormusica2024.github.io/zenn-ai-news/

4. **フッター追加**
   - ポートフォリオサイトへの戻るボタン
   - GitHubリポジトリリンク
   - ai-trend-dailyと同様のデザイン

#### 学んだこと

**GitHub Pagesのパス設計:**
- リポジトリ名がベースパスに含まれる
- 相対パスを使用すべき（`/` から始めない）
- ローカルと本番で同じパスにする

**デバッグ手法:**
- ブラウザコンソールでパス確認
- `git ls-files` でGit管理状況確認
- GitHub上のファイルブラウザで最終確認

**キャッシュ対策:**
- Ctrl+Shift+R で強制リフレッシュ
- シークレットウィンドウで確認
- デベロッパーツールでDisable cache

### 2025-11-08: Google Cloud TTS実装

#### 主要変更

- gTTS → Google Cloud TTS (Neural2音声) に移行
- チャンク分割機能実装（5000バイト制限対応）
- 複数チャンク連続再生機能
- サービスアカウントキー認証導入

#### 技術的改善

- `generate_tts_audio.py`: Google Cloud TTS統合スクリプト
- `server.js`: Range Requests対応でシーク機能実装
- Markdown解析精度向上

### 初期実装（2025-11-08以前）

- VOICEVOX音声生成実装
- Webプレイヤー基本機能
- サムネイル画像表示
- ダークモードUI

---

## 🔗 関連リンク

### ドキュメント

- [README.md](./audio-reader/README.md) - セットアップガイド
- [DESIGN_DOCUMENT.md](./audio-reader/DESIGN_DOCUMENT.md) - 詳細設計書
- [TESTING.md](./audio-reader/TESTING.md) - テストガイド

### 外部リソース

- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### プロジェクトURL

- **本番サイト**: https://tenormusica2024.github.io/zenn-ai-news/
- **リポジトリ**: https://github.com/Tenormusica2024/zenn-ai-news
- **ポートフォリオ**: https://tenormusica2024.github.io/portfolio/

---

## 📝 付録: よく使うコマンド集

### ローカル開発

```bash
# 開発サーバー起動
cd "C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader"
node server.js
# http://localhost:8081/ でアクセス

# 音声生成（Google Cloud TTS）
node scripts/generate_article_audio.js ../articles/記事ファイル名.md ja-male
```

### Git操作

```bash
# ステータス確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "変更内容の説明"

# プッシュ
git push origin feature/article-audio-reader-clean

# ブランチ確認
git branch

# ブランチ切り替え
git checkout feature/article-audio-reader-clean
```

### デバッグ

```bash
# HTTPステータス確認
curl -I https://tenormusica2024.github.io/zenn-ai-news/

# Git管理ファイル一覧
git ls-files

# 特定ディレクトリのGit管理ファイル
git ls-files audio-reader/audio/

# 最近のコミット履歴
git log --oneline -10
```

---

**End of Document** - このガイドは継続的に更新されます。
