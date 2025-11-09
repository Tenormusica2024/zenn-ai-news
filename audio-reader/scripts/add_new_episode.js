#!/usr/bin/env node
// index.html に新エピソードを自動追加するスクリプト

const fs = require('fs');
const path = require('path');

function parseArguments() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    params[key] = value;
  }
  
  return params;
}

function validateParams(params) {
  const required = ['slug', 'title', 'date', 'url'];
  const missing = required.filter(key => !params[key]);
  
  if (missing.length > 0) {
    console.error('❌ エラー: 必須パラメータが不足しています');
    console.error(`   不足: ${missing.join(', ')}\n`);
    console.error('使用方法:');
    console.error('  node add_new_episode.js \\');
    console.error('    --slug "article-slug" \\');
    console.error('    --title "記事タイトル" \\');
    console.error('    --date "2025-11-09" \\');
    console.error('    --url "https://zenn.dev/dragonrondo/articles/article-slug" \\');
    console.error('    [--thumbnail "article-slug-thumbnail.jpg"]\n');
    console.error('例:');
    console.error('  node add_new_episode.js \\');
    console.error('    --slug "github-agent-hq-unified-ai-coding-2025" \\');
    console.error('    --title "GitHub Agent HQ統合AI開発環境2025" \\');
    console.error('    --date "2025-11-09" \\');
    console.error('    --url "https://zenn.dev/dragonrondo/articles/github-agent-hq-unified-ai-coding-2025"\n');
    process.exit(1);
  }
  
  // 日付形式チェック（YYYY-MM-DD）
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(params.date)) {
    console.error('❌ エラー: 日付形式が不正です（YYYY-MM-DD形式で指定してください）');
    console.error(`   入力値: ${params.date}\n`);
    process.exit(1);
  }
  
  return true;
}

function createEpisodeObject(params) {
  // デフォルト値設定
  const thumbnail = params.thumbnail || `${params.slug}-thumbnail.jpg`;
  
  // 日付を YYYY/MM/DD 形式に変換
  const publishDate = params.date.replace(/-/g, '/');
  
  return {
    slug: params.slug,
    title: params.title,
    thumbnail: `audio-reader/web/${thumbnail}`,
    publishDate: publishDate,
    url: params.url,
    likes: 0
  };
}

function updateIndexHtml(episode) {
  const indexPath = path.join(__dirname, '..', '..', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ エラー: index.html が見つかりません: ${indexPath}`);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📝 index.html 更新スクリプト');
  console.log('='.repeat(60));
  console.log(`📄 ファイル: ${indexPath}`);
  console.log(`📌 新エピソード: ${episode.title}`);
  console.log('='.repeat(60) + '\n');
  
  // index.htmlを読み込み
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // availableArticles 配列を検索
  const articlesPattern = /const availableArticles = \[/;
  const match = content.match(articlesPattern);
  
  if (!match) {
    console.error('❌ エラー: availableArticles 配列が見つかりません');
    console.error('   index.html の構造を確認してください\n');
    process.exit(1);
  }
  
  // 既に同じスラッグのエピソードが存在するかチェック
  const existingPattern = new RegExp(`slug: ['"\`]${episode.slug}['"\`]`);
  if (existingPattern.test(content)) {
    console.error(`❌ エラー: 同じスラッグのエピソードが既に存在します: ${episode.slug}`);
    console.error('   既存エピソードを削除してから再実行してください\n');
    process.exit(1);
  }
  
  // 新エピソードのJavaScriptコード生成
  const newEpisodeCode = `      {
        slug: '${episode.slug}',
        title: '${episode.title}',
        thumbnail: '${episode.thumbnail}',
        publishDate: '${episode.publishDate}',
        url: '${episode.url}',
        likes: ${episode.likes}
      },\n`;
  
  // availableArticles 配列の先頭に挿入
  const insertPosition = match.index + match[0].length;
  const before = content.substring(0, insertPosition);
  const after = content.substring(insertPosition);
  
  const updatedContent = before + '\n' + newEpisodeCode + after;
  
  // バックアップ作成
  const backupPath = indexPath + '.backup';
  fs.writeFileSync(backupPath, content);
  console.log(`📦 バックアップ作成: ${backupPath}`);
  
  // 更新後のファイル書き込み
  fs.writeFileSync(indexPath, updatedContent);
  console.log(`✅ index.html 更新完了\n`);
  
  // 追加内容表示
  console.log('【追加された内容】');
  console.log(newEpisodeCode);
  
  // 確認項目表示
  console.log('【確認項目】');
  console.log('1. index.html を開いて availableArticles 配列を確認');
  console.log('2. 新エピソードが配列の先頭に追加されていることを確認');
  console.log('3. 既存エピソードが削除されていないことを確認');
  console.log('4. 構文エラーがないことを確認（カンマ・括弧の対応等）\n');
  
  // git diff 推奨
  console.log('【次のステップ】');
  console.log('1. 変更内容を確認:');
  console.log('   git diff index.html');
  console.log('\n2. 問題がなければコミット:');
  console.log('   git add index.html');
  console.log(`   git commit -m "新エピソード追加: ${episode.title}"`);
  console.log('\n3. 問題があればバックアップから復元:');
  console.log(`   cp ${backupPath} ${indexPath}\n`);
}

function main() {
  const params = parseArguments();
  validateParams(params);
  
  const episode = createEpisodeObject(params);
  updateIndexHtml(episode);
  
  console.log('='.repeat(60));
  console.log('✅ 処理完了');
  console.log('='.repeat(60) + '\n');
}

main();
