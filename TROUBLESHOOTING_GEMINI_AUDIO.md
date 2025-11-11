# Gemini Deep Research記事 音声化作業 トラブルシューティング記録

## 作業日時
2025-11-11

## 概要
Gemini Deep Research記事の音声化作業中に発生した問題と解決方法を記録

---

## 問題1: Google Cloud TTS認証エラー (403 Permission Denied)

### 発生状況
```
google.api_core.exceptions.PermissionDenied: 403 Caller does not have required permission to use project yt-transcript-demo-2025
```

### 原因
- サービスアカウントは既に存在していたが、サービスアカウントキーファイルが存在しなかった
- Application Default Credentials (ADC) では適切な権限が取得できなかった
- `service-account-key.json` ファイルが存在しないため、Python スクリプトが正しく認証できなかった

### 解決方法
新しいサービスアカウントキーを作成：

```bash
gcloud iam service-accounts keys create "C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader\service-account-key.json" \
  --iam-account=zenn-audio-tts@yt-transcript-demo-2025.iam.gserviceaccount.com \
  --project=yt-transcript-demo-2025
```

### 学んだこと
- サービスアカウントの存在 ≠ サービスアカウントキーの存在
- ユーザーが「すでに存在する」と言った場合は、キーファイルが必要かどうかを確認する必要がある
- `GOOGLE_APPLICATION_CREDENTIALS` 環境変数に正しいキーファイルのパスを設定する必要がある

---

## 問題2: Gitマージコンフリクト

### 発生状況
`feature/article-audio-reader` ブランチを `feature/article-audio-reader-clean` にマージした際にコンフリクト発生：

```
CONFLICT (content): Merge conflict in index.html
CONFLICT (add/add): Merge conflict in articles/gemini-deep-research-workspace-integration-2025.md
```

### 原因
- `index.html` の `availableArticles` 配列で、両ブランチが異なる記事を先頭に配置
  - HEAD (feature/article-audio-reader-clean): ChatGPT記事 (2025/11/10)
  - feature/article-audio-reader: Gemini記事 (2025/11/11)
- 記事ファイルが両方のブランチで追加されていた (ADD/ADD conflict)

### 解決方法
1. **index.html**: 両方の記事を保持し、日付順（新しい順）に並べる
   ```javascript
   const availableArticles = [
     {
       slug: 'gemini-deep-research-workspace-integration-2025',  // 2025/11/11
       // ...
     },
     {
       slug: 'chatgpt-vulnerabilities-hackedgpt-2025',  // 2025/11/10
       // ...
     },
     // ...
   ];
   ```

2. **記事ファイル**: `git add` で解決
   ```bash
   git add articles/gemini-deep-research-workspace-integration-2025.md
   ```

### 学んだこと
- マージ時は両方の変更内容を尊重する（どちらかを削除するのではなく両方保持）
- ADD/ADD コンフリクトは `git add` で解決できる
- 記事リストは日付順（新しい順）に並べるのが適切

---

## 問題3: GitHub Push Protection - シークレット検出

### 発生状況
```
remote: error: GH013: Repository rule violations found for refs/heads/feature/article-audio-reader-clean.
remote: - GITHUB PUSH PROTECTION
remote:   Push cannot contain secrets
remote:   —— Google Cloud Service Account Credentials ——————————
remote:   commit: 9a28e4f0a52af3ab5d4e86cafd84dbdde42c9d59
remote:   path: audio-reader/service-account-key.json:1
```

### 原因
- `audio-reader/service-account-key.json` がGit履歴に含まれていた
- `.gitignore` に記載されていたが、既にコミット済みのファイルは除外されない
- GitHub の Secret Scanning がサービスアカウントキーを検出してプッシュをブロック

### 解決方法
Git履歴から完全に削除：

```bash
# 1. コミットを取り消してservice-account-key.jsonをステージングから除外
git reset --soft HEAD~1
git restore --staged audio-reader/service-account-key.json

# 2. Git履歴全体からファイルを削除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch audio-reader/service-account-key.json" \
  --prune-empty --tag-name-filter cat -- --all

# 3. 強制プッシュ
git push origin feature/article-audio-reader-clean --force
```

### 学んだこと
- `.gitignore` は未追跡ファイルのみに有効。既にコミット済みのファイルは除外されない
- シークレットをコミットしてしまった場合は `git filter-branch` で履歴から完全削除が必要
- サービスアカウントキーは絶対にGitに含めない（`.gitignore` に事前登録必須）
- 強制プッシュ (`--force`) は履歴を書き換えた場合のみ使用

---

## 問題4: Playwright ブラウザが未インストール

### 発生状況
```
Failed to initialize browser: browserType.launch: Executable doesn't exist at C:\Users\Tenormusica\AppData\Local\ms-playwright\chromium-1179\chrome-win\chrome.exe
```

### 原因
- Playwright のブラウザバイナリが更新されていなかった
- 新しいバージョンのPlaywrightでは古いブラウザが使用できない

### 解決方法（回避策）
curlで代替確認を実施：

```bash
curl -s https://tenormusica2024.github.io/zenn-ai-news/ | grep -E "(gemini-deep-research|availableArticles)"
```

### 根本解決（未実施）
```bash
npx playwright install
```

### 学んだこと
- Playwright更新時は `npx playwright install` でブラウザの再インストールが必要
- デプロイ確認はcurlでも実施可能（スクリーンショットが不要な場合）
- 自動化ツールの依存関係は定期的にメンテナンスが必要

---

## 問題5: Bash コマンドの `&amp;&amp;` エスケープエラー

### 発生状況
```
/usr/bin/bash: eval: line 1: syntax error near unexpected token `;&'
```

### 原因
- XML/HTMLエンコードされた `&amp;&amp;` が Bash コマンドに渡された
- ツール呼び出し時のパラメータエンコーディングの問題

### 解決方法
通常の `&&` を使用：

```bash
# ❌ 誤り
cd "path" &amp;&amp; git add file

# ✅ 正しい
cd "path" && git add file
```

### 学んだこと
- Bash コマンドには HTML エンティティエンコーディングを使用しない
- `&&` はそのまま記述する

---

## 成功した作業フロー

### 1. 音声生成
```bash
cd C:\Users\Tenormusica\Documents\zenn-ai-news\audio-reader
node generate-article-audio.js gemini-deep-research-workspace-integration-2025
```

**結果:**
- 3種類の音声 × 2チャンク = 6ファイル生成
- 総サイズ: 約11MB
- 生成時間: 46.1秒

### 2. Web Player更新
```javascript
// index.html の availableArticles に追加
{
  slug: 'gemini-deep-research-workspace-integration-2025',
  title: 'Gemini Deep Research × Workspace統合の真価',
  thumbnail: 'audio-reader/web/ai-agents-thumbnail.jpg',
  publishDate: '2025/11/11',
  url: 'https://zenn.dev/dragonrondo/articles/gemini-deep-research-workspace-integration-2025',
  likes: 0
}
```

### 3. Git操作
```bash
# feature/article-audio-reader ブランチでコミット
git add .
git commit -m "Gemini Deep Research記事の音声生成完了 + Web Player追加"

# feature/article-audio-reader-clean にマージ
git checkout feature/article-audio-reader-clean
git merge feature/article-audio-reader --no-edit

# コンフリクト解決後
git add index.html articles/gemini-deep-research-workspace-integration-2025.md
git commit -m "マージコンフリクト解決: 両記事を保持（Gemini最新、ChatGPT 2番目）"

# シークレット削除後に強制プッシュ
git push origin feature/article-audio-reader-clean --force
```

### 4. デプロイ確認
```bash
# GitHub Pagesデプロイ待機（1-2分）
sleep 120

# デプロイ確認
curl -s https://tenormusica2024.github.io/zenn-ai-news/ | grep gemini-deep-research
```

---

## ベストプラクティス

### サービスアカウントキー管理
1. `.gitignore` に事前登録
2. 環境変数 `GOOGLE_APPLICATION_CREDENTIALS` で指定
3. 絶対にGitにコミットしない
4. 定期的にキーローテーション実施

### マージコンフリクト対応
1. 両方の変更を尊重する（一方を削除しない）
2. 日付順・重要度順など明確な基準で並べる
3. コンフリクト解決後は必ずテスト実行

### Git履歴管理
1. センシティブ情報は絶対にコミットしない
2. コミット前に `.gitignore` を確認
3. 万が一コミットした場合は即座に `git filter-branch` で削除
4. 強制プッシュは慎重に実施（チーム作業時は特に注意）

### 自動化ツールメンテナンス
1. 定期的に依存関係を更新
2. ブラウザ自動化ツールは定期的に再インストール
3. 代替手段を常に準備（curl, wget等）

---

## 参考資料

- [Google Cloud Service Account Keys](https://cloud.google.com/iam/docs/keys-create-delete)
- [Git Filter Branch](https://git-scm.com/docs/git-filter-branch)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Playwright Installation](https://playwright.dev/docs/intro)

---

## 作業時間
- 音声生成: 約5分
- マージコンフリクト解決: 約10分
- Git履歴クリーンアップ: 約3分
- デプロイ確認: 約3分
- **合計**: 約21分
