#!/usr/bin/env node
// 記事音声一括生成スクリプト
// 3種類の音声（ja-male, ja-female, ja-normal）を自動的に生成

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SPEAKERS = ['ja-male', 'ja-female', 'ja-normal'];

function generateAudio(articlePath, speaker) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'generate_article_audio.js');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎙️  音声生成開始: ${speaker}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const startTime = Date.now();
    const process = spawn('node', [scriptPath, articlePath, speaker]);
    
    let outputBuffer = '';
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      console.log(output);
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        console.log(`\n✅ ${speaker} 音声生成完了（所要時間: ${duration}秒）\n`);
        resolve({ speaker, duration, success: true });
      } else {
        console.error(`\n❌ ${speaker} 音声生成失敗（終了コード: ${code}）\n`);
        reject(new Error(`${speaker} generation failed with code ${code}`));
      }
    });
  });
}

async function main() {
  const articlePath = process.argv[2];
  
  if (!articlePath) {
    console.error('❌ エラー: 記事ファイルのパスを指定してください');
    console.error('\n使用方法:');
    console.error('  node generate_all_audio.js <記事のパス>');
    console.error('\n例:');
    console.error('  node generate_all_audio.js ../articles/article.md');
    process.exit(1);
  }
  
  if (!fs.existsSync(articlePath)) {
    console.error(`❌ エラー: ファイルが見つかりません: ${articlePath}`);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 記事音声一括生成スクリプト');
  console.log('='.repeat(60));
  console.log(`📄 記事: ${articlePath}`);
  console.log(`🎙️  生成する音声: ${SPEAKERS.join(', ')}`);
  console.log('='.repeat(60) + '\n');
  
  const overallStartTime = Date.now();
  const results = [];
  
  try {
    // 3種類の音声を順次生成
    for (const speaker of SPEAKERS) {
      const result = await generateAudio(articlePath, speaker);
      results.push(result);
    }
    
    const overallEndTime = Date.now();
    const totalDuration = ((overallEndTime - overallStartTime) / 1000).toFixed(1);
    
    // 成功サマリー表示
    console.log('\n' + '='.repeat(60));
    console.log('✅ すべての音声生成が完了しました！');
    console.log('='.repeat(60));
    console.log('\n【生成結果サマリー】');
    results.forEach(result => {
      console.log(`  ✓ ${result.speaker}: ${result.duration}秒`);
    });
    console.log(`\n📊 合計所要時間: ${totalDuration}秒`);
    console.log('='.repeat(60) + '\n');
    
    // 生成ファイル確認
    const articleSlug = path.basename(articlePath, '.md');
    const audioDir = path.join(__dirname, '..', 'audio', articleSlug);
    
    if (fs.existsSync(audioDir)) {
      const files = fs.readdirSync(audioDir);
      const mp3Files = files.filter(f => f.endsWith('.mp3'));
      
      console.log('📁 生成されたファイル:');
      console.log(`   ディレクトリ: ${audioDir}`);
      console.log(`   MP3ファイル数: ${mp3Files.length}個`);
      mp3Files.forEach(file => {
        console.log(`   - ${file}`);
      });
      
      if (mp3Files.length >= 6) {
        console.log('\n✅ 期待される最小ファイル数（6個）が確認できました');
      } else {
        console.log(`\n⚠️  警告: MP3ファイル数が6個未満です（現在: ${mp3Files.length}個）`);
      }
    }
    
    console.log('\n【次のステップ】');
    console.log('1. ローカルサーバーで動作確認');
    console.log('   cd ..');
    console.log('   node server.js');
    console.log('   ブラウザで http://localhost:8081/ を開く');
    console.log('\n2. 音声切り替えテスト');
    console.log('   - ja-male → ja-female → ja-normal');
    console.log('   - すべての音声が正常に再生されることを確認');
    console.log('\n3. サムネイル画像設定');
    console.log('   - WebSearchで記事関連画像を検索');
    console.log('   - 画像をダウンロードして web/ に配置\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 音声生成中にエラーが発生しました');
    console.error('='.repeat(60));
    console.error(`エラー内容: ${error.message}\n`);
    
    console.error('【トラブルシューティング】');
    console.error('1. 既存の不完全なファイルを削除:');
    console.error(`   rm -rf audio/${path.basename(articlePath, '.md')}/`);
    console.error('\n2. 記事ファイルが正しいことを確認:');
    console.error(`   cat ${articlePath} | wc -l  # 10行以上あること`);
    console.error('\n3. 再実行:');
    console.error(`   node generate_all_audio.js ${articlePath}\n`);
    
    process.exit(1);
  }
}

main();
