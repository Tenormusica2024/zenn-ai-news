# Zenn記事音声朗読システム - 完全ワークフロー&トラブルシューティング

**このドキュメントは記事追加・デプロイ・エラー対応の実践的ガイドです。システム概要・技術仕様は [DESIGN_DOCUMENT.md](./DESIGN_DOCUMENT.md) を参照してください。**

---

## 📋 目次

1. [🚀 新規記事追加の完全ワークフロー](#新規記事追加の完全ワークフロー)
2. [🤖 自動化スクリプトの使用方法](#自動化スクリプトの使用方法)
3. [🐛 トラブルシューティング](#トラブルシューティング)

---

## 🚀 新規記事追加の完全ワークフロー

**このセクションは最も重要です。新規記事を追加する際は必ずこの手順に従ってください。**

### 📝 概要

記事作成から音声生成、サムネイル設定、GitHub Pagesデプロイまでの全工程を100%確実に実行するためのチェックリスト形式のワークフローです。

### ✅ チェックリスト形式の実行手順

#### STEP 1: 記事ファイルの準備

```bash
# 作業ディレクトリに移動
cd "C:\Users\Tenormusica\Documents\zenn-ai-news"

# 変数設定（記事スラッグを設定）
$ARTICLE_SLUG = "github-agent-hq-unified-ai-coding-2025"  # ← 実際の記事スラッグに変更

# 記事ファイルが存在することを確認
Test-Path "articles\$ARTICLE_SLUG.md"  # True が返ることを確認

# 記事内容が正しいことを確認（10行以上あること）
(Get-Content "articles\$ARTICLE_SLUG.md").Count
```

**確認項目:**
- [ ] 記事ファイルが `articles/` ディレクトリに存在する
- [ ] 記事ファイルの行数が10行以上ある（404エラーでないこと）
- [ ] frontmatter（---で囲まれた部分）が正しく記載されている

---

#### STEP 2: 音声ファイル生成（3種類必須）

**🎯 推奨方法: 自動化スクリプト使用（1コマンドで3種類生成）**

```bash
# audio-readerディレクトリに移動
cd audio-reader

# 3種類の音声を自動生成（ja-male, ja-female, ja-normal）
node scripts/generate_all_audio.js "../articles/$ARTICLE_SLUG.md"

# 生成確認（6ファイル以上存在することを確認）
Get-ChildItem "audio\$ARTICLE_SLUG\"
```

**⏱️ 従来の方法: 個別生成（3コマンド必要）**

```bash
# 2-1. ja-male（男性音声・デフォルト）を生成
node scripts/generate_article_audio.js "../articles/$ARTICLE_SLUG.md" ja-male

# 2-2. ja-female（女性音声）を生成
node scripts/generate_article_audio.js "../articles/$ARTICLE_SLUG.md" ja-female

# 2-3. ja-normal（標準音声・バックアップ）を生成
node scripts/generate_article_audio.js "../articles/$ARTICLE_SLUG.md" ja-normal

# 生成確認（6ファイル以上存在することを確認）
Get-ChildItem "audio\$ARTICLE_SLUG\"
```

**期待される出力:**
```
article_ja-male_chunk_01.mp3
article_ja-male_chunk_02.mp3
article_ja-female_chunk_01.mp3
article_ja-female_chunk_02.mp3
article_ja-normal_chunk_01.mp3
article_ja-normal_chunk_02.mp3
playlist.json
```

**確認項目:**
- [ ] ja-male音声ファイルが生成された（chunk_01.mp3, chunk_02.mp3等）
- [ ] ja-female音声ファイルが生成された
- [ ] ja-normal音声ファイルが生成された
- [ ] playlist.jsonが正しく生成された

**🚨 重要:** 3種類すべての音声を生成しないと、ユーザーが音声切り替え時に404エラーになります。

**生成時間の目安:**
- ja-male: 約30秒
- ja-female: 約20-30秒
- ja-normal: 約20-30秒
- **合計: 約1-1.5分**（自動化スクリプト使用時）

---

#### STEP 3: サムネイル画像設定

**3-1. 記事関連の画像を検索**

```bash
# WebSearchツールで画像検索
# 例: "GitHub Agent HQ 2025" "AI開発環境" 等
```

**3-2. 画像をダウンロード**

```bash
# web/ ディレクトリに保存（ファイル名: [記事スラッグ]-thumbnail.jpg）
# 例: github-agent-hq-unified-ai-coding-2025-thumbnail.jpg
```

**3-3. 画像ファイル存在確認**

```bash
Test-Path "audio-reader\web\$ARTICLE_SLUG-thumbnail.jpg"  # True が返ることを確認
```

**確認項目:**
- [ ] サムネイル画像が `audio-reader/web/` に配置されている
- [ ] ファイル名が `[記事スラッグ]-thumbnail.jpg` 形式である
- [ ] 画像サイズが適切（推奨: 横1200px × 縦630px程度）

---

#### STEP 4: index.html に新エピソードを追加

**🎯 推奨方法: 自動化スクリプト使用**

```bash
# ルートディレクトリに戻る
cd ..

# 新エピソード自動追加
node audio-reader/scripts/add_new_episode.js \
  --slug "github-agent-hq-unified-ai-coding-2025" \
  --title "GitHub Agent HQ統合AI開発環境2025" \
  --date "2025-11-09" \
  --url "https://zenn.dev/dragonrondo/articles/github-agent-hq-unified-ai-coding-2025" \
  --thumbnail "github-agent-hq-unified-ai-coding-2025-thumbnail.jpg"
```

**⏱️ 従来の方法: 手動編集（非推奨）**

```javascript
// index.html の availableArticles 配列の先頭に追加
const availableArticles = [
  {
    slug: 'github-agent-hq-unified-ai-coding-2025',
    title: 'GitHub Agent HQ統合AI開発環境2025',
    thumbnail: 'audio-reader/web/github-agent-hq-unified-ai-coding-2025-thumbnail.jpg',
    publishDate: '2025/11/09',
    url: 'https://zenn.dev/dragonrondo/articles/github-agent-hq-unified-ai-coding-2025',
    likes: 0
  },
  // 既存エピソード...
];
```

**確認項目:**
- [ ] index.html が自動更新された（または手動編集完了）
- [ ] バックアップファイル（index.html.backup）が作成された
- [ ] `git diff index.html` で変更内容が正しいことを確認

---

#### STEP 5: ローカルサーバーで動作確認

```bash
# audio-readerディレクトリに移動
cd audio-reader

# ローカルサーバー起動
node server.js

# ブラウザで確認
# http://localhost:8081/
```

**確認項目:**
- [ ] 新エピソードが一覧の先頭に表示される
- [ ] サムネイル画像が正しく表示される
- [ ] クリックで記事詳細画面に遷移する
- [ ] 音声が正常に再生される
- [ ] 音声切り替えが機能する（ja-male → ja-female → ja-normal）
- [ ] すべての音声が404エラーなく再生される

**🚨 エラー発生時**: [トラブルシューティング](#トラブルシューティング) セクションを参照

---

#### STEP 6: Git commit & push

```bash
# ルートディレクトリに戻る
cd ..

# 変更ファイル確認
git status

# ステージング
git add .

# コミット
git commit -m "新エピソード追加: [記事タイトル]

- 音声ファイル生成（ja-male, ja-female, ja-normal）
- サムネイル画像追加
- index.html 更新

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# プッシュ
git push origin feature/article-audio-reader-clean
```

**確認項目:**
- [ ] すべての変更がコミットされた
- [ ] コミットメッセージが詳細に記載されている
- [ ] プッシュが成功した

---

#### STEP 7: GitHub Pages デプロイ確認

**手動確認:**

```bash
# ブラウザでGitHub Pages URLを開く
# https://tenormusica2024.github.io/zenn-ai-news/

# 🚨 CRITICAL: Ctrl+Shift+R で強制キャッシュクリアを実行
```

**🎯 自動確認（推奨）:**

```bash
# デプロイ確認スクリプト実行
cd audio-reader
node scripts/verify_deployment.js --slug "github-agent-hq-unified-ai-coding-2025"
```

**確認項目:**
- [ ] HTTPステータスコードが200である
- [ ] 新エピソードが一覧に表示される
- [ ] サムネイル画像が表示される
- [ ] 音声が再生される
- [ ] モバイル表示でも問題ない

**🚨 エラー発生時**: [トラブルシューティング](#トラブルシューティング) セクションを参照

---

#### STEP 8: 完了確認チェックリスト

- [ ] STEP 1: 記事ファイル準備 ✅
- [ ] STEP 2: 音声ファイル生成（3種類） ✅
- [ ] STEP 3: サムネイル画像設定 ✅
- [ ] STEP 4: index.html 更新 ✅
- [ ] STEP 5: ローカル動作確認 ✅
- [ ] STEP 6: Git commit & push ✅
- [ ] STEP 7: GitHub Pages デプロイ確認 ✅

**すべて✅なら完了です！🎉**

---

## 🤖 自動化スクリプトの使用方法

### 概要

手動作業を自動化し、ヒューマンエラーを防ぐためのNode.jsスクリプト群。

### 利用可能なスクリプト

#### 1. 音声一括生成スクリプト (`generate_all_audio.js`)

**目的:** 3種類の音声ファイル（ja-male, ja-female, ja-normal）を1コマンドで自動生成

**使用方法:**
```bash
cd audio-reader
node scripts/generate_all_audio.js "../articles/[記事スラッグ].md"
```

**実行例:**
```bash
node scripts/generate_all_audio.js "../articles/github-agent-hq-unified-ai-coding-2025.md"
```

**実行内容:**
1. ja-male音声を生成（男性音声・デフォルト）
2. ja-female音声を生成（女性音声）
3. ja-normal音声を生成（標準音声・バックアップ）
4. 各音声の生成時間を計測・表示
5. 生成されたファイル一覧を表示
6. 合計所要時間を表示

**利点:**
- **3種類の音声を1コマンドで生成**（従来は3コマンド必要）
- 進捗状況をリアルタイム表示
- 生成時間を自動計測
- エラー時のトラブルシューティングガイド自動表示

**出力例:**
```
============================================================
🚀 記事音声一括生成スクリプト
============================================================
📄 記事: ../articles/github-agent-hq-unified-ai-coding-2025.md
🎙️  生成する音声: ja-male, ja-female, ja-normal
============================================================

============================================================
🎙️  音声生成開始: ja-male
============================================================
...
✅ ja-male 音声生成完了（所要時間: 28.3秒）

============================================================
🎙️  音声生成開始: ja-female
============================================================
...
✅ ja-female 音声生成完了（所要時間: 24.7秒）

============================================================
🎙️  音声生成開始: ja-normal
============================================================
...
✅ ja-normal 音声生成完了（所要時間: 26.1秒）

============================================================
✅ すべての音声生成が完了しました！
============================================================

【生成結果サマリー】
  ✓ ja-male: 28.3秒
  ✓ ja-female: 24.7秒
  ✓ ja-normal: 26.1秒

📊 合計所要時間: 79.1秒
============================================================

📁 生成されたファイル:
   ディレクトリ: C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader\audio\github-agent-hq-unified-ai-coding-2025
   MP3ファイル数: 6個
   - article_ja-male_chunk_01.mp3
   - article_ja-male_chunk_02.mp3
   - article_ja-female_chunk_01.mp3
   - article_ja-female_chunk_02.mp3
   - article_ja-normal_chunk_01.mp3
   - article_ja-normal_chunk_02.mp3

✅ 期待される最小ファイル数（6個）が確認できました
```

---

#### 2. 新エピソード追加スクリプト (`add_new_episode.js`)

**目的:** index.html に新エピソードを安全に自動追加

**使用方法:**
```bash
cd audio-reader
node scripts/add_new_episode.js \
  --slug "[記事スラッグ]" \
  --title "[記事タイトル]" \
  --date "YYYY-MM-DD" \
  --url "[Zenn記事URL]" \
  --thumbnail "[サムネイルファイル名（オプション）]"
```

**実行例:**
```bash
node scripts/add_new_episode.js \
  --slug "github-agent-hq-unified-ai-coding-2025" \
  --title "GitHub Agent HQ統合AI開発環境2025" \
  --date "2025-11-09" \
  --url "https://zenn.dev/dragonrondo/articles/github-agent-hq-unified-ai-coding-2025" \
  --thumbnail "github-agent-hq-unified-ai-coding-2025-thumbnail.jpg"
```

**実行内容:**
1. 必須パラメータの検証
2. 日付形式の検証（YYYY-MM-DD）
3. 重複エピソードのチェック
4. バックアップファイル作成（index.html.backup）
5. availableArticles 配列の先頭に新エピソード挿入
6. ファイル書き込み
7. 変更内容の表示
8. 確認項目・次のステップのガイド表示

**利点:**
- **重複エピソードを自動検出**（同じスラッグが既に存在する場合はエラー）
- **日付形式を自動検証**（YYYY-MM-DD形式でなければエラー）
- **バックアップ自動作成**（問題発生時に即座に復元可能）
- **構文エラー防止**（カンマ・括弧の対応を自動調整）

**出力例:**
```
============================================================
📝 index.html 更新スクリプト
============================================================
📄 ファイル: C:\Users\Tenormusica\Documents\zenn-ai-news\index.html
📌 新エピソード: GitHub Agent HQ統合AI開発環境2025
============================================================

📦 バックアップ作成: C:\Users\Tenormusica\Documents\zenn-ai-news\index.html.backup
✅ index.html 更新完了

【追加された内容】
      {
        slug: 'github-agent-hq-unified-ai-coding-2025',
        title: 'GitHub Agent HQ統合AI開発環境2025',
        thumbnail: 'audio-reader/web/github-agent-hq-unified-ai-coding-2025-thumbnail.jpg',
        publishDate: '2025/11/09',
        url: 'https://zenn.dev/dragonrondo/articles/github-agent-hq-unified-ai-coding-2025',
        likes: 0
      },

【確認項目】
1. index.html を開いて availableArticles 配列を確認
2. 新エピソードが配列の先頭に追加されていることを確認
3. 既存エピソードが削除されていないことを確認
4. 構文エラーがないことを確認（カンマ・括弧の対応等）

【次のステップ】
1. 変更内容を確認:
   git diff index.html

2. 問題がなければコミット:
   git add index.html
   git commit -m "新エピソード追加: GitHub Agent HQ統合AI開発環境2025"

3. 問題があればバックアップから復元:
   cp C:\Users\Tenormusica\Documents\zenn-ai-news\index.html.backup C:\Users\Tenormusica\Documents\zenn-ai-news\index.html
```

---

#### 3. デプロイ確認スクリプト (`verify_deployment.js`)

**目的:** GitHub Pages デプロイ後の動作を自動確認

**使用方法:**
```bash
cd audio-reader
node scripts/verify_deployment.js [--url <URL>] [--slug <スラッグ>]
```

**実行例:**
```bash
# デフォルトURL全体確認
node scripts/verify_deployment.js

# 特定エピソードの詳細確認
node scripts/verify_deployment.js --slug "github-agent-hq-unified-ai-coding-2025"

# カスタムURL確認
node scripts/verify_deployment.js --url "https://example.com/zenn-ai-news/"
```

**実行内容:**
1. HTTPステータスコード確認（200であることを検証）
2. HTMLサイズ表示
3. availableArticles 配列の存在確認
4. 登録済みエピソード一覧抽出
5. 特定エピソードの存在確認（--slug指定時）
6. サムネイルパス確認
7. トラブルシューティングガイド表示

**利点:**
- **デプロイ成功を自動検証**（HTTPステータスコード・HTML構造）
- **エピソード登録を自動確認**（特定スラッグの存在チェック）
- **サムネイル設定を自動確認**（正しいパスが設定されているか）
- **エラー時の対応策を自動表示**（トラブルシューティングガイド）

**出力例:**
```
============================================================
🔍 GitHub Pages デプロイ確認スクリプト
============================================================
🌐 URL: https://tenormusica2024.github.io/zenn-ai-news/
📌 確認対象スラッグ: github-agent-hq-unified-ai-coding-2025
============================================================

📡 HTMLを取得中...
✅ ステータスコード: 200
📄 HTMLサイズ: 45.23 KB
✅ availableArticles 配列を確認

📋 登録されているエピソード数: 8

【登録済みエピソード一覧】
  1. github-agent-hq-unified-ai-coding-2025
  2. ai-coding-trends-2024
  3. cursor-ai-review-2024
  ...

🔍 スラッグ "github-agent-hq-unified-ai-coding-2025" の詳細確認:
  ✅ エピソードが見つかりました
  ✅ サムネイルパスが正しく設定されています

============================================================
✅ デプロイ確認完了
============================================================

【次のステップ】
1. ブラウザで実際にアクセスして目視確認:
   https://tenormusica2024.github.io/zenn-ai-news/
   ※ Ctrl+Shift+R でキャッシュクリアを忘れずに！

2. 確認項目:
   - 新エピソードが一覧の先頭に表示される
   - サムネイル画像が正しく表示される
   - 音声が正常に再生される
   - 音声切り替えが機能する（ja-male → ja-female → ja-normal）
   - モバイル表示でも問題ない
```

---

### スクリプトファイル構造

```
audio-reader/
└── scripts/
    ├── generate_article_audio.js  # 単一音声生成（既存）
    ├── generate_all_audio.js      # 3種類音声一括生成（NEW）
    ├── add_new_episode.js         # 新エピソード追加（NEW）
    └── verify_deployment.js       # デプロイ確認（NEW）
```

---

### 自動化スクリプトを使った推奨ワークフロー

```bash
# 1. 音声生成（1コマンド）
cd audio-reader
node scripts/generate_all_audio.js "../articles/article-slug.md"

# 2. 新エピソード追加（1コマンド）
cd ..
node audio-reader/scripts/add_new_episode.js \
  --slug "article-slug" \
  --title "記事タイトル" \
  --date "2025-11-09" \
  --url "https://zenn.dev/dragonrondo/articles/article-slug"

# 3. ローカル確認
cd audio-reader
node server.js

# 4. Git操作
cd ..
git add .
git commit -m "新エピソード追加: 記事タイトル"
git push origin feature/article-audio-reader-clean

# 5. デプロイ確認（1コマンド）
cd audio-reader
node scripts/verify_deployment.js --slug "article-slug"
```

**従来のワークフロー（手動）: 約8コマンド**  
**自動化ワークフロー: 約5コマンド**  
**削減率: 約37.5%**

---

## 🐛 トラブルシューティング

### 🚨 エラー分類

#### レベル1: 軽微（自動復旧可能）
- 一時的なネットワークエラー
- キャッシュ関連の問題

#### レベル2: 中程度（マニュアル対応必要）
- ファイルパス間違い
- パラメータ不正

#### レベル3: 深刻（システム設定確認必要）
- API認証エラー
- 環境変数未設定

---

### 音声生成関連のエラー

#### エラー1: 「記事ファイルが見つかりません」

**症状:**
```
❌ エラー: ファイルが見つかりません: ../articles/article-slug.md
```

**原因:**
- 記事ファイルのパスが間違っている
- 記事ファイル名のタイプミス
- 作業ディレクトリが間違っている

**解決方法:**
```bash
# 1. 現在のディレクトリ確認
pwd

# 2. 記事ファイルの存在確認
Test-Path "../articles/article-slug.md"

# 3. 記事ファイル一覧表示
Get-ChildItem "../articles/"

# 4. 正しいパスで再実行
node scripts/generate_all_audio.js "../articles/[正しいスラッグ].md"
```

---

#### エラー2: 「Google Cloud TTS API認証エラー」

**症状:**
```
❌ エラー: Request had invalid authentication credentials
```

**原因:**
- `GOOGLE_APPLICATION_CREDENTIALS` 環境変数が未設定
- サービスアカウントキーファイルのパスが間違っている
- APIが有効になっていない

**解決方法:**
```bash
# 1. 環境変数の確認
echo $env:GOOGLE_APPLICATION_CREDENTIALS  # Windows PowerShell
echo $GOOGLE_APPLICATION_CREDENTIALS      # macOS/Linux

# 2. 環境変数を設定（Windows PowerShell）
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account-key.json"

# 3. 環境変数を設定（macOS/Linux）
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# 4. APIの有効化確認
# Google Cloud Console → API とサービス → Cloud Text-to-Speech API
```

---

#### エラー3: 「チャンク分割エラー」

**症状:**
```
❌ エラー: チャンク分割中にエラーが発生しました
```

**原因:**
- 記事ファイルが空または不正な形式
- Markdown構文が壊れている
- 特殊文字が含まれている

**解決方法:**
```bash
# 1. 記事ファイルの内容確認
Get-Content "../articles/article-slug.md" | Select-Object -First 20

# 2. 記事ファイルの行数確認（10行以上あること）
(Get-Content "../articles/article-slug.md").Count

# 3. Markdownの構文確認
# - frontmatterが正しく記載されているか（--- で囲まれているか）
# - コードブロックが正しく閉じられているか

# 4. 特殊文字の確認・修正
# - 全角スペース → 半角スペース
# - 特殊な引用符 → 標準の引用符
```

---

### index.html 更新関連のエラー

#### エラー4: 「同じスラッグのエピソードが既に存在します」

**症状:**
```
❌ エラー: 同じスラッグのエピソードが既に存在します: article-slug
```

**原因:**
- 既に同じスラッグのエピソードが登録されている
- 重複追加を試行している

**解決方法:**
```bash
# 1. index.html で既存エピソードを確認
grep "slug: 'article-slug'" ../index.html

# 2. 重複の場合は既存エピソードを削除（手動編集）
# または、
# 3. 異なるスラッグを使用して再実行
```

---

#### エラー5: 「日付形式が不正です」

**症状:**
```
❌ エラー: 日付形式が不正です（YYYY-MM-DD形式で指定してください）
   入力値: 2025/11/09
```

**原因:**
- 日付形式が YYYY-MM-DD でない
- スラッシュ（/）を使用している

**解決方法:**
```bash
# 正しい形式で再実行
node scripts/add_new_episode.js \
  --slug "article-slug" \
  --title "記事タイトル" \
  --date "2025-11-09" \  # ← ハイフン（-）を使用
  --url "https://zenn.dev/dragonrondo/articles/article-slug"
```

---

### デプロイ確認関連のエラー

#### エラー6: 「ステータスコードが200ではありません」

**症状:**
```
❌ エラー: ステータスコードが200ではありません
```

**原因:**
- GitHub Pagesのデプロイが完了していない
- GitHub Actionsのビルドが失敗している
- URLが間違っている

**解決方法:**
```bash
# 1. GitHub Actionsのビルド状況確認
# https://github.com/Tenormusica2024/zenn-ai-news/actions

# 2. ビルドログ確認
# 最新のワークフロー実行 → View logs

# 3. デプロイ完了を待機（通常1-2分）

# 4. 再度確認
node scripts/verify_deployment.js --slug "article-slug"
```

---

#### エラー7: 「エピソードが見つかりません」

**症状:**
```
❌ エピソードが見つかりません
```

**原因:**
- index.html への追加が完了していない
- Git commit & push が完了していない
- GitHub Pagesのデプロイが完了していない

**解決方法:**
```bash
# 1. index.html の確認
grep "slug: 'article-slug'" ../index.html

# 2. Git状態確認
git status
git log --oneline -5

# 3. プッシュ確認
git push origin feature/article-audio-reader-clean

# 4. GitHub Actionsのビルド確認
# https://github.com/Tenormusica2024/zenn-ai-news/actions

# 5. デプロイ完了後に再確認
node scripts/verify_deployment.js --slug "article-slug"
```

---

#### エラー8: 「サムネイルパスが見つかりません」

**症状:**
```
⚠️  警告: サムネイルパスが見つかりません
     期待されるパス: audio-reader/web/article-slug-thumbnail.jpg
```

**原因:**
- サムネイル画像が配置されていない
- ファイル名が間違っている
- パスが間違っている

**解決方法:**
```bash
# 1. サムネイル画像の存在確認
Test-Path "audio-reader\web\article-slug-thumbnail.jpg"

# 2. ファイル名確認
Get-ChildItem "audio-reader\web\"

# 3. サムネイル画像を配置
# 正しいファイル名: [記事スラッグ]-thumbnail.jpg

# 4. Git commit & push
git add audio-reader/web/article-slug-thumbnail.jpg
git commit -m "サムネイル画像追加: article-slug"
git push origin feature/article-audio-reader-clean

# 5. デプロイ完了後に再確認
```

---

### ローカルサーバー関連のエラー

#### エラー9: 「ポート8081は既に使用されています」

**症状:**
```
❌ エラー: listen EADDRINUSE: address already in use :::8081
```

**原因:**
- 別のプロセスがポート8081を使用している
- 以前起動したサーバーが終了していない

**解決方法:**
```bash
# Windows PowerShell
# 1. ポート8081を使用しているプロセスを確認
netstat -ano | findstr :8081

# 2. プロセスIDを確認してタスクマネージャーで終了
# または
# 3. プロセスを強制終了
Stop-Process -Id [プロセスID] -Force

# 4. サーバーを再起動
node server.js
```

```bash
# macOS/Linux
# 1. ポート8081を使用しているプロセスを確認
lsof -i :8081

# 2. プロセスを終了
kill -9 [プロセスID]

# 3. サーバーを再起動
node server.js
```

---

#### エラー10: 「音声ファイルが404エラー」

**症状:**
- ブラウザで音声再生時に404エラー
- コンソールに `Failed to load resource: the server responded with a status of 404` 表示

**原因:**
- 音声ファイルが生成されていない
- ファイルパスが間違っている
- playlist.jsonの設定が間違っている

**解決方法:**
```bash
# 1. 音声ファイルの存在確認
Get-ChildItem "audio\article-slug\"

# 2. 期待されるファイル数確認（6ファイル以上）
# - article_ja-male_chunk_01.mp3
# - article_ja-male_chunk_02.mp3
# - article_ja-female_chunk_01.mp3
# - article_ja-female_chunk_02.mp3
# - article_ja-normal_chunk_01.mp3
# - article_ja-normal_chunk_02.mp3

# 3. 音声が不足している場合は再生成
node scripts/generate_all_audio.js "../articles/article-slug.md"

# 4. playlist.json の確認
Get-Content "audio\article-slug\playlist.json"

# 5. サーバー再起動
node server.js
```

---

### その他のエラー

#### エラー11: 「Markdownパースエラー」

**症状:**
```
❌ エラー: Markdownのパースに失敗しました
```

**原因:**
- frontmatterの構文が間違っている
- コードブロックが正しく閉じられていない
- 特殊文字が含まれている

**解決方法:**
```bash
# 1. frontmatterの確認
# 正しい形式:
---
title: "記事タイトル"
emoji: "🚀"
type: "tech"
topics: ["ai", "github"]
published: true
---

# 2. コードブロックの確認
# 正しい形式:
```bash
コマンド
```

# 3. 特殊文字の確認
# - 全角スペース → 半角スペース
# - 特殊な引用符 → 標準の引用符（" や '）
```

---

#### エラー12: 「Git操作エラー」

**症状:**
```
❌ エラー: fatal: not a git repository
```

**原因:**
- Gitリポジトリのルートディレクトリにいない
- .gitディレクトリが存在しない

**解決方法:**
```bash
# 1. 現在のディレクトリ確認
pwd

# 2. Gitリポジトリのルートに移動
cd "C:\Users\Tenormusica\Documents\zenn-ai-news"

# 3. Gitリポジトリの確認
Test-Path ".git"  # True が返ることを確認

# 4. Git操作を再実行
```

---

### 緊急時の復旧手順

#### シナリオ1: index.html を誤って壊した

**症状:**
- index.html の構文エラー
- ページが表示されない

**解決方法:**
```bash
# 1. バックアップから復元
cp index.html.backup index.html

# 2. Git履歴から復元
git checkout HEAD -- index.html

# 3. 最新コミットの状態に戻す
git reset --hard HEAD
```

---

#### シナリオ2: 音声ファイルが全て消えた

**症状:**
- audio/ディレクトリが空
- 音声再生が404エラー

**解決方法:**
```bash
# 1. Git履歴から確認（大容量ファイルはGitに含まれない可能性）
git log --all --full-history -- "audio/*"

# 2. 音声ファイルを再生成
cd audio-reader
node scripts/generate_all_audio.js "../articles/article-slug.md"

# 3. 全記事の音声を再生成（必要な場合）
# 各記事に対して generate_all_audio.js を実行
```

---

#### シナリオ3: GitHub Pagesが動作しない

**症状:**
- GitHub Pages URLにアクセスできない
- 404エラー

**解決方法:**
```bash
# 1. GitHub Pages設定確認
# https://github.com/Tenormusica2024/zenn-ai-news/settings/pages
# Source: Deploy from a branch
# Branch: feature/article-audio-reader-clean
# Folder: / (root)

# 2. GitHub Actionsのビルド確認
# https://github.com/Tenormusica2024/zenn-ai-news/actions

# 3. ビルドが失敗している場合はログ確認

# 4. 必要に応じて再プッシュ
git commit --allow-empty -m "Rebuild GitHub Pages"
git push origin feature/article-audio-reader-clean
```

---

## 📚 関連ドキュメント

- [DESIGN_DOCUMENT.md](./DESIGN_DOCUMENT.md) - システム概要・技術仕様
- [README.md](../README.md) - プロジェクト全体の説明

---

**最終更新: 2025-11-09**
