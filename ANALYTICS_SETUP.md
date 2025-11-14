# Google Analytics 設定ドキュメント

## 実装日
2025-11-11

## 目的
- Zenn AI News サイトの訪問者数・閲覧記事の把握
- ページビュー数・滞在時間の分析
- 最も人気のある記事の特定

## 現在の設定状況

### ステップ1: 初回実装（2025-11-11）
**測定ID**: `G-YJ1WP1J2NQ`（ポートフォリオサイトと共用）
- プロパティ: Portfolio Website
- データストリーム: 共用
- 問題点: ポートフォリオサイトとデータが混在

### ステップ2: 専用プロパティ作成（2025-11-11 完了）
**測定ID**: `G-9JGSVRVHQ4`（zenn-ai-news専用）
- プロパティ名: Zenn AI News
- データストリーム: zenn-ai-news
- 目的: データ混在の回避、正確な分析
- ステータス: ✅ 実装完了・デプロイ済み

## Google Analytics 新規プロパティ作成手順

### 1. Google Analytics管理画面にアクセス
- URL: https://analytics.google.com/
- アカウント: tenormusica7@gmail.com または dragonrondo@gmail.com

### 2. プロパティ作成
1. 左下の「管理」（歯車アイコン）をクリック
2. 「プロパティ」列の「プロパティを作成」をクリック
3. 以下の情報を入力:
   - **プロパティ名**: `Zenn AI News`
   - **レポートのタイムゾーン**: `日本`
   - **通貨**: `日本円（JPY）`
4. 「次へ」をクリック

### 3. ビジネスの詳細
- **業種**: メディアとエンターテイメント → オンライン コンテンツ
- **ビジネスの規模**: 小規模（従業員数 1～10人）
- **Googleアナリティクスのビジネスにおける利用目的**:
  - ☑ ユーザー行動の調査
  - ☑ サイトまたはアプリのパフォーマンスの測定
- 「作成」をクリック

### 4. データストリーム作成
1. プラットフォーム選択: **「ウェブ」**をクリック
2. 以下の情報を入力:
   - **ウェブサイトのURL**: `https://tenormusica2024.github.io/zenn-ai-news/`
   - **ストリーム名**: `zenn-ai-news`
3. 「ストリームを作成」をクリック

### 5. 測定IDの取得
- データストリームの詳細画面に表示される **測定ID**（`G-XXXXXXXXXX`形式）をコピー
- この測定IDを `index.html` に記載

## 実装ファイル

### index.html への実装
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenn Article Audio Reader</title>
  
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-[測定ID]"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-[測定ID]');
  </script>
  
  <style>
  ...
```

## 測定ID更新手順

### コード更新
1. `index.html` を開く
2. `G-YJ1WP1J2NQ` を新しい測定ID `G-XXXXXXXXXX` に置換（2箇所）
3. Git commit & push
4. GitHub Pages デプロイ待機（1-2分）

### 動作確認
```bash
# デプロイ確認
curl -s https://tenormusica2024.github.io/zenn-ai-news/ | grep "G-"

# Analyticsダッシュボードで確認
# https://analytics.google.com/
# 左メニュー → 「リアルタイム」
# サイトにアクセス後、1-2分以内に「現在のユーザー: 1」が表示されることを確認
```

## トラブルシューティング

### 問題1: リアルタイムレポートにデータが表示されない
**原因**: 
- 測定IDの記載ミス
- ブラウザキャッシュの影響
- Analyticsのデータ反映遅延

**解決方法**:
1. ブラウザのコンソールを開く（F12）
2. ネットワークタブで `collect?v=2` リクエストを確認
3. キャッシュクリア（Ctrl+Shift+R）して再アクセス
4. 2-3分待機してから再度リアルタイムレポート確認

### 問題2: ポートフォリオとデータが混在している
**原因**: 
- 同じ測定ID（G-YJ1WP1J2NQ）を使用している

**解決方法**:
- 本ドキュメントの手順で専用プロパティを作成
- 測定IDを更新

## データの見方

### リアルタイムレポート
- **現在のユーザー**: 過去30分間にサイトを訪問中のユーザー数
- **過去30分間のページパフォーマンス**: どのページが閲覧されているか

### エンゲージメントレポート（標準レポート）
- **ページビュー数**: 各ページの閲覧回数
- **平均エンゲージメント時間**: ユーザーがページに滞在した時間
- **イベント数**: ユーザーの操作（クリック、スクロール等）

### よく使う指標
- **セッション**: 訪問回数
- **ユーザー**: 訪問者数（重複なし）
- **ページビュー**: ページ表示回数
- **直帰率**: 1ページのみ見て離脱した割合

## 今後の拡張案

### カスタムイベント設定（オプション）
- 音声再生開始
- 音声再生完了
- いいねクリック
- Zenn記事への遷移

### 設定例（将来的に実装する場合）
```javascript
// 音声再生開始
audio.addEventListener('play', () => {
  gtag('event', 'audio_play', {
    'article_slug': articles[currentArticleIndex].slug
  });
});
```

## 参考資料
- [Google Analytics 4 設定ガイド](https://support.google.com/analytics/answer/9304153)
- [GA4 測定ID確認方法](https://support.google.com/analytics/answer/9539598)
- [GA4 リアルタイムレポート](https://support.google.com/analytics/answer/9271392)

## 変更履歴
- 2025-11-11: 初回実装（ポートフォリオと共用の測定ID使用）
- 2025-11-11: 本ドキュメント作成（専用プロパティ作成手順を追加）
