# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Google Analytics トラッキング実装（2025-11-11）
  - 訪問者数・ページビュー数の追跡機能
  - 初回実装: ポートフォリオサイトと共用の測定ID（G-YJ1WP1J2NQ）使用
  - 今後: 専用測定ID発行予定（データ混在回避のため）
- ANALYTICS_SETUP.md ドキュメント作成
  - Google Analytics設定手順の詳細記録
  - 新規プロパティ作成手順
  - トラブルシューティングガイド

### Changed
- index.html に gtag.js トラッキングコード追加

## [1.0.0] - 2025-11-11

### Added
- Gemini Deep Research記事の音声生成機能
  - Google Cloud Text-to-Speech API使用
  - Neural2 voices対応（ja-Neural2-B, ja-Neural2-C, ja-Neural2-D）
  - チャンク分割による長文対応
- ChatGPT脆弱性記事の音声生成機能
- Web Audio Player実装
  - 記事リスト表示
  - 音声再生コントロール（再生/一時停止/前後スキップ）
  - いいね機能
  - Zenn記事へのリンク
- プロジェクトドキュメント
  - README.md
  - DEPLOYMENT_GUIDE.md
  - TROUBLESHOOTING_GEMINI_AUDIO.md

### Technical Details
- Firebase Authentication実装
- Google Cloud Service Account設定
- GitHub Pages デプロイ設定

## Project History

### 初期開発（2025-11）
- Zenn記事の音声化システム構築
- Google Cloud TTS統合
- Web Audio Player UI実装
- GitHub Pages自動デプロイ設定
