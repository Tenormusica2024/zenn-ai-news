#!/usr/bin/env node
// Zenn記事をVOICEVOXで音声ファイルに変換するスクリプト

const fs = require('fs');
const path = require('path');
const http = require('http');

const VOICEVOX_API = 'http://localhost:50021';
const SPEAKER_ID = 13; // 青山龍星（ノーマル）

// マークダウンから本文を抽出（frontmatterと特殊記法を除去）
function extractTextFromMarkdown(markdown) {
  // frontmatter除去
  let text = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');
  
  // 参照元セクションのみ除去（見出しとURLを削除、本文は残す）
  text = text.replace(/^##\s*参照元\n[\s\S]*?(?=\n##\s)/m, '');
  
  // 見出し記号除去
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // リンク記法を文字列に変換
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // 太字・斜体記号除去
  text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
  text = text.replace(/\*([^\*]+)\*/g, '$1');
  
  // コードブロック除去
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // URLのみの行を除去
  text = text.replace(/^https?:\/\/.*$/gm, '');
  
  // 複数の空行を1つに
  text = text.replace(/\n\n+/g, '\n\n');
  
  // 箇条書き記号除去
  text = text.replace(/^[-*]\s+/gm, '');
  
  return text.trim();
}

// 長文をVOICEVOXのAPI制限に合わせて分割（1000文字程度）
function splitIntoChunks(text, maxLength = 1000) {
  const sentences = text.split(/[。\n]/);
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '。';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// HTTP リクエストヘルパー
function httpRequest(url, options = {}, binary = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
          return;
        }
        if (binary) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(Buffer.concat(chunks).toString());
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// テキストを音声に変換
async function textToSpeech(text, speakerId) {
  console.log(`テキスト変換中: ${text.substring(0, 50)}...`);
  
  // 音声クエリ生成
  const audioQueryUrl = `${VOICEVOX_API}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
  const audioQuery = await httpRequest(audioQueryUrl, { method: 'POST' });
  
  // 音声合成
  const synthesisUrl = `${VOICEVOX_API}/synthesis?speaker=${speakerId}`;
  const audioData = await httpRequest(synthesisUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: audioQuery
  }, true);
  
  return audioData;
}

// 記事全体を音声化（チャンク分割は大きめに）
async function createArticleAudio(articlePath, outputDir) {
  console.log(`記事読み込み: ${articlePath}`);
  
  // マークダウンファイル読み込み
  const markdown = fs.readFileSync(articlePath, 'utf-8');
  const text = extractTextFromMarkdown(markdown);
  
  console.log(`抽出したテキスト長: ${text.length}文字`);
  
  // VOICEVOX API制限対策で1000文字単位に分割
  const chunks = splitIntoChunks(text, 1000);
  console.log(`${chunks.length}個のチャンクに分割`);
  
  // 各チャンクを音声化
  const audioFiles = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[${i + 1}/${chunks.length}] 音声生成中...`);
    const audioData = await textToSpeech(chunks[i], SPEAKER_ID);
    
    const filename = `chunk_${String(i).padStart(3, '0')}.wav`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, audioData);
    audioFiles.push(filename);
    
    // API負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ 音声ファイル生成完了: ${audioFiles.length}個`);
  console.log(`出力先: ${outputDir}`);
  
  // プレイリスト情報を保存
  const playlist = {
    article: path.basename(articlePath),
    chunks: audioFiles,
    totalChunks: audioFiles.length,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'playlist.json'),
    JSON.stringify(playlist, null, 2)
  );
  
  return audioFiles;
}

// メイン処理
async function main() {
  const articlePath = process.argv[2];
  
  if (!articlePath) {
    console.error('使用方法: node article_to_speech.js <記事のパス>');
    console.error('例: node article_to_speech.js ../articles/affinity-3-free-canva-ai-strategy-2025.md');
    process.exit(1);
  }
  
  if (!fs.existsSync(articlePath)) {
    console.error(`エラー: ファイルが見つかりません: ${articlePath}`);
    process.exit(1);
  }
  
  const articleName = path.basename(articlePath, '.md');
  const outputDir = path.join(__dirname, '..', 'audio', articleName);
  
  // 出力ディレクトリ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    await createArticleAudio(articlePath, outputDir);
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

main();
