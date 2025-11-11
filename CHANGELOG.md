# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Google Analytics 専用プロパティ実装完了（2025-11-11）
  - 測定ID: G-9JGSVRVHQ4（zenn-ai-news専用）
  - データ混在問題を解決（ポートフォリオサイトと分離）
  - 訪問者数・ページビュー数の正確な追跡が可能に
- ANALYTICS_SETUP.md ドキュメント作成
  - Google Analytics設定手順の詳細記録
  - 新規プロパティ作成手順
  - トラブルシューティングガイド
  - 測定ID変更履歴

### Changed
- index.html の測定IDを専用IDに変更（G-YJ1WP1J2NQ → G-9JGSVRVHQ4）

### Fixed
- Analytics データ混在問題を解決

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
