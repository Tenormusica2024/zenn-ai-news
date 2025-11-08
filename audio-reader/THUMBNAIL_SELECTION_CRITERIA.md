# 記事サムネイル画像選定基準

## 目的
Zenn記事の音声朗読プレイヤーに表示するサムネイル画像を選定する際の基準を定義する。

---

## 必須条件（Must Have）

### 1. 記事内容との関連性
- **記事の主要トピックを視覚的に表現している**
- 製品・サービス名が視覚的に確認できる（UI、ロゴ、ブランド等）
- 記事で扱う技術・機能が実際に使用されている様子が写っている

**例（良い）:**
- Affinity Photo 3の記事 → Affinityの実際のUIスクリーンショット
- Canva AI戦略の記事 → Canva AIタブが表示されたインターフェース
- プログラミング記事 → 実際のコードエディタ画面

**例（悪い）:**
- ランダムなプレースホルダー画像
- 記事内容と無関係な風景写真
- 抽象的なイメージ画像のみ

---

### 2. 視覚的魅力（Visual Appeal）

#### 人物が含まれる場合の優先順位：
1. **若い女性** - 最も訴求力が高い
2. 若い男性
3. 中年・高齢の人物

#### 人物の条件：
- ✅ 万人受けする外見（親しみやすい、プロフェッショナル）
- ✅ 自然な表情・ポーズ
- ✅ 実際に製品・サービスを使用している様子
- ❌ 威圧感のある表情
- ❌ 過度に演出された不自然なポーズ
- ❌ 顔のアップのみ（製品が見えない）

#### 人物が含まれない場合：
- クリーンで見やすいUIスクリーンショット
- 製品ロゴ・ブランドが明確に表示
- 高解像度・高品質

---

### 3. 画像品質
- **解像度**: 最低800x400px以上
- **ファイルサイズ**: 100KB〜500KB（500KBを超える場合は圧縮検討）
- **フォーマット**: JPG（推奨）、PNG、GIF（アニメーションは慎重に検討）
- **アスペクト比**: 2:1（800x400px等）を推奨

---

## 選定プロセス

### ステップ1: 記事内容の分析
```
1. 記事の主要トピックを特定
   - 製品名
   - サービス名
   - 技術名
   - 主要な主張・戦略

2. 記事で扱う視覚的要素を確認
   - UIがあるか
   - ロゴがあるか
   - デモンストレーションがあるか
```

### ステップ2: 画像ソースの検索
```
1. WebSearchで記事関連の公式画像を検索
   例: "[製品名] official press image", "[サービス名] screenshot UI"

2. WebFetchで記事元のサイトから画像URL抽出
   - プレスリリースページ
   - 技術ブログ
   - 公式ニュース記事

3. 画像の優先順位:
   ① 公式プレスリリース画像
   ② 技術系メディアの記事画像
   ③ 公式製品スクリーンショット
   ④ ストックフォト（最終手段）
```

### ステップ3: 候補画像の評価
```
各画像に対して以下をスコアリング（5点満点）:

1. 記事関連性（5点）
   - 5点: 記事の主要トピックすべてをカバー
   - 3点: 主要トピックの一部をカバー
   - 1点: 間接的に関連
   - 0点: 無関係

2. 視覚的魅力（5点）
   - 5点: 若い女性が製品を使用、自然な表情
   - 4点: 若い女性/男性、やや演出的
   - 3点: 中年・高齢、または人物なしの美しいUI
   - 2点: 人物なし、標準的なUI
   - 1点: 低品質

3. 技術的品質（5点）
   - 5点: 800x400px以上、100-300KB、高解像度
   - 3点: 最低基準クリア
   - 1点: 解像度不足

総合スコア12点以上を採用
```

### ステップ4: 最終確認
```bash
# 画像のダウンロード・確認
curl -L "[画像URL]" -o thumbnail.jpg
ls -lh thumbnail.jpg  # サイズ確認

# Read ツールで視覚的内容確認
Read(file_path="thumbnail.jpg")

# 以下を確認:
✓ 記事内容との関連性が明確か
✓ 人物が含まれる場合、選定基準を満たすか
✓ 画像品質が十分か（解像度・鮮明さ）
✓ ファイルサイズが適切か（0バイトでないか）
```

---

## 具体例: Affinity 3 Free Canva AI Strategy 2025

### 記事の主要トピック:
1. Affinity Photo 3の無料化
2. CanvaのAI戦略
3. Affinity + Canvaの統合

### 候補画像の評価:

#### 候補A: Affinityの統合UIスクリーンショット（人物: 中年男性）
- 記事関連性: 5/5（Affinity UI + Canva AIタブ表示）
- 視覚的魅力: 2/5（中年男性のポートレート編集）
- 技術的品質: 5/5（高解像度、245KB）
- **総合: 12/15**

#### 候補B: 若い女性がCanva AIを使用している画像
- 記事関連性: 4/5（Canva AI戦略を表現、Affinityは間接的）
- 視覚的魅力: 5/5（若い女性、自然な作業風景）
- 技術的品質: 5/5（高解像度、498KB）
- **総合: 14/15** ✅ **採用**

### 選定理由:
- 視覚的魅力が高い（若い女性が実際に製品を使用）
- Canva AI戦略という記事の主要トピックを直接表現
- 親しみやすく、クリックされやすいサムネイル
- Affinityは記事タイトル・テキストで補完可能

---

## 注意事項

### 著作権・ライセンス
- 公式プレスリリース画像を優先（通常は使用許可あり）
- 技術系メディアの記事画像は引用の範囲内で使用
- 必要に応じて出典をコメントやGitコミットメッセージに記載

### 避けるべき画像
- ❌ 0バイトの空ファイル（ダウンロード失敗）
- ❌ 低解像度（400px未満）
- ❌ 過度に圧縮された画質の悪い画像
- ❌ 透かし・ウォーターマークが大きく入った画像
- ❌ 記事内容と無関係な人物・風景

---

## 実装例（自動化スクリプト用）

```javascript
// article_thumbnail_selector.js
async function selectThumbnail(articleTitle, articleTopics) {
  // 1. WebSearchで候補画像を検索
  const searchQuery = `${articleTitle} official press image screenshot`;
  const searchResults = await webSearch(searchQuery);
  
  // 2. 画像URLを抽出
  const imageUrls = await extractImageUrls(searchResults);
  
  // 3. 各画像をスコアリング
  const scoredImages = await Promise.all(
    imageUrls.map(async (url) => {
      const image = await downloadImage(url);
      const score = {
        relevance: scoreRelevance(image, articleTopics),
        appeal: scoreVisualAppeal(image),
        quality: scoreTechnicalQuality(image)
      };
      return { url, score, total: score.relevance + score.appeal + score.quality };
    })
  );
  
  // 4. 最高スコアの画像を選択
  const bestImage = scoredImages.sort((a, b) => b.total - a.total)[0];
  
  if (bestImage.total >= 12) {
    return bestImage.url;
  }
  
  // フォールバック: 記事タイトルのみ表示
  return null;
}
```

---

## 更新履歴

- 2025-11-08: 初版作成
  - 基本的な選定基準を定義
  - 人物選定の優先順位を明確化
  - 具体例（Affinity 3記事）を追加
