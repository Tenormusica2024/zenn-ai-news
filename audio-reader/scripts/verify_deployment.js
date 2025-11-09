#!/usr/bin/env node
// GitHub Pages デプロイ後の動作確認スクリプト

const https = require('https');
const { spawn } = require('child_process');

const DEFAULT_URL = 'https://tenormusica2024.github.io/zenn-ai-news/';

function parseArguments() {
  const args = process.argv.slice(2);
  const params = { url: DEFAULT_URL };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      params.url = args[i + 1];
      i++;
    } else if (args[i] === '--slug' && args[i + 1]) {
      params.slug = args[i + 1];
      i++;
    }
  }
  
  return params;
}

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, html: data });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function checkEpisodeExists(html, slug) {
  const slugPattern = new RegExp(`slug:\\s*['"\`]${slug}['"\`]`);
  return slugPattern.test(html);
}

function checkThumbnail(html, slug) {
  const thumbnailPattern = new RegExp(`audio-reader/web/${slug}-thumbnail\\.jpg`);
  return thumbnailPattern.test(html);
}

function extractAllSlugs(html) {
  const slugPattern = /slug:\s*['"`]([^'"`]+)['"`]/g;
  const slugs = [];
  let match;
  
  while ((match = slugPattern.exec(html)) !== null) {
    slugs.push(match[1]);
  }
  
  return slugs;
}

async function main() {
  const params = parseArguments();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 GitHub Pages デプロイ確認スクリプト');
  console.log('='.repeat(60));
  console.log(`🌐 URL: ${params.url}`);
  if (params.slug) {
    console.log(`📌 確認対象スラッグ: ${params.slug}`);
  }
  console.log('='.repeat(60) + '\n');
  
  try {
    console.log('📡 HTMLを取得中...');
    const { statusCode, html } = await fetchHTML(params.url);
    
    // ステータスコード確認
    console.log(`✅ ステータスコード: ${statusCode}`);
    if (statusCode !== 200) {
      console.error(`❌ エラー: ステータスコードが200ではありません`);
      process.exit(1);
    }
    
    // HTML基本確認
    console.log(`📄 HTMLサイズ: ${(html.length / 1024).toFixed(2)} KB`);
    
    // availableArticles 配列の存在確認
    if (!html.includes('availableArticles')) {
      console.error('❌ エラー: availableArticles 配列が見つかりません');
      console.error('   デプロイが正しく完了していない可能性があります\n');
      process.exit(1);
    }
    console.log('✅ availableArticles 配列を確認');
    
    // 全エピソードスラッグ抽出
    const allSlugs = extractAllSlugs(html);
    console.log(`\n📋 登録されているエピソード数: ${allSlugs.length}`);
    
    if (allSlugs.length === 0) {
      console.error('❌ エラー: エピソードが1つも登録されていません\n');
      process.exit(1);
    }
    
    console.log('\n【登録済みエピソード一覧】');
    allSlugs.forEach((slug, index) => {
      console.log(`  ${index + 1}. ${slug}`);
    });
    
    // 特定スラッグの確認（指定されている場合）
    if (params.slug) {
      console.log(`\n🔍 スラッグ "${params.slug}" の詳細確認:`);
      
      const episodeExists = checkEpisodeExists(html, params.slug);
      if (episodeExists) {
        console.log(`  ✅ エピソードが見つかりました`);
      } else {
        console.error(`  ❌ エピソードが見つかりません`);
        console.error(`\n【トラブルシューティング】`);
        console.error(`1. index.html に "${params.slug}" が追加されているか確認`);
        console.error(`2. Git commit & push が正しく完了しているか確認`);
        console.error(`3. GitHub Actionsのビルドが成功しているか確認:`);
        console.error(`   https://github.com/Tenormusica2024/zenn-ai-news/actions\n`);
        process.exit(1);
      }
      
      const thumbnailExists = checkThumbnail(html, params.slug);
      if (thumbnailExists) {
        console.log(`  ✅ サムネイルパスが正しく設定されています`);
      } else {
        console.error(`  ⚠️  警告: サムネイルパスが見つかりません`);
        console.error(`     期待されるパス: audio-reader/web/${params.slug}-thumbnail.jpg`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ デプロイ確認完了');
    console.log('='.repeat(60));
    
    console.log('\n【次のステップ】');
    console.log('1. ブラウザで実際にアクセスして目視確認:');
    console.log(`   ${params.url}`);
    console.log('   ※ Ctrl+Shift+R でキャッシュクリアを忘れずに！');
    console.log('\n2. 確認項目:');
    console.log('   - 新エピソードが一覧の先頭に表示される');
    console.log('   - サムネイル画像が正しく表示される');
    console.log('   - 音声が正常に再生される');
    console.log('   - 音声切り替えが機能する（ja-male → ja-female → ja-normal）');
    console.log('   - モバイル表示でも問題ない\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(60));
    console.error(`エラー内容: ${error.message}\n`);
    
    console.error('【トラブルシューティング】');
    console.error('1. URLが正しいか確認:');
    console.error(`   ${params.url}`);
    console.error('\n2. ネットワーク接続を確認');
    console.error('\n3. GitHub Pagesが有効になっているか確認:');
    console.error('   https://github.com/Tenormusica2024/zenn-ai-news/settings/pages\n');
    
    process.exit(1);
  }
}

// 使用方法表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('\n使用方法:');
  console.log('  node verify_deployment.js [--url <URL>] [--slug <スラッグ>]');
  console.log('\nオプション:');
  console.log('  --url   確認するURL（デフォルト: https://tenormusica2024.github.io/zenn-ai-news/）');
  console.log('  --slug  確認対象のエピソードスラッグ（指定すると詳細確認を実行）');
  console.log('\n例:');
  console.log('  # デフォルトURL全体確認');
  console.log('  node verify_deployment.js');
  console.log('\n  # 特定エピソードの詳細確認');
  console.log('  node verify_deployment.js --slug "github-agent-hq-unified-ai-coding-2025"');
  console.log('\n  # カスタムURL確認');
  console.log('  node verify_deployment.js --url "https://example.com/zenn-ai-news/"\n');
  process.exit(0);
}

main();
