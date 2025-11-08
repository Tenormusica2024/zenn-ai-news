#!/usr/bin/env node
// 記事音声生成 統合スクリプト（VOICEVOX + gTTS対応）

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 利用可能な話者リスト
const AVAILABLE_SPEAKERS = {
  // gTTS（軽量・高速）
  'ja-normal': { 
    type: 'gtts', 
    name: 'Google翻訳音声（標準）', 
    description: '軽量・高速なGoogle TTS' 
  },
  // VOICEVOX（高品質だが重い）
  'zundamon': { 
    type: 'voicevox', 
    id: 3, 
    name: 'ずんだもん（ノーマル）', 
    description: '親しみやすい声' 
  }
};

const DEFAULT_SPEAKER = 'ja-normal';

async function generateAudio(articlePath, speakerKey) {
  const speaker = AVAILABLE_SPEAKERS[speakerKey];
  
  if (!speaker) {
    console.error(`エラー: 不明な話者キー: ${speakerKey}`);
    console.error('利用可能な話者:', Object.keys(AVAILABLE_SPEAKERS).join(', '));
    process.exit(1);
  }
  
  console.log(`音声生成開始: ${speaker.name} (${speakerKey})`);
  
  if (speaker.type === 'gtts') {
    // gTTS (Python) を使用
    await runPythonScript('gtts_article_to_speech.py', articlePath, speakerKey);
  } else if (speaker.type === 'voicevox') {
    // VOICEVOX (Node.js) を使用
    await runVoicevoxScript(articlePath, speakerKey);
  }
}

function runPythonScript(scriptName, articlePath, speakerKey) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    const pythonPath = path.join(__dirname, '..', 'venv_kokoro', 'Scripts', 'python.exe');
    
    console.log(`Python実行: ${pythonPath}`);
    console.log(`スクリプト: ${scriptPath}`);
    
    const process = spawn(pythonPath, [scriptPath, articlePath, speakerKey]);
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('音声生成完了（gTTS）');
        resolve();
      } else {
        reject(new Error(`Python script exited with code ${code}`));
      }
    });
  });
}

async function runVoicevoxScript(articlePath, speakerKey) {
  // 既存のarticle_to_speech.jsを呼び出す
  const scriptPath = path.join(__dirname, 'article_to_speech.js');
  
  return new Promise((resolve, reject) => {
    const process = spawn('node', [scriptPath, articlePath, speakerKey]);
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('音声生成完了（VOICEVOX）');
        resolve();
      } else {
        reject(new Error(`Node.js script exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const articlePath = process.argv[2];
  const speakerKey = process.argv[3] || DEFAULT_SPEAKER;
  
  if (!articlePath) {
    console.error('使用方法: node generate_article_audio.js <記事のパス> [話者キー]');
    console.error('例: node generate_article_audio.js ../articles/article.md ja-normal');
    console.error('\n利用可能な話者:');
    Object.entries(AVAILABLE_SPEAKERS).forEach(([key, speaker]) => {
      console.error(`  ${key}: ${speaker.name} - ${speaker.description}`);
    });
    process.exit(1);
  }
  
  if (!fs.existsSync(articlePath)) {
    console.error(`エラー: ファイルが見つかりません: ${articlePath}`);
    process.exit(1);
  }
  
  try {
    await generateAudio(articlePath, speakerKey);
    console.log('\n✓ すべての処理が完了しました');
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

main();
