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

// WAVファイルを結合（シンプルな連結）
function concatenateWavBuffers(buffers) {
  // 最初のWAVヘッダーを取得
  const firstHeader = buffers[0].slice(0, 44);
  
  // 全データ部分を結合
  const dataChunks = buffers.map(buf => buf.slice(44));
  const totalDataSize = dataChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  
  // 新しいWAVヘッダーを作成（データサイズを更新）
  const header = Buffer.from(firstHeader);
  header.writeUInt32LE(totalDataSize + 36, 4); // ChunkSize
  header.writeUInt32LE(totalDataSize, 40);     // Subchunk2Size
  
  // ヘッダー + 全データを結合
  return Buffer.concat([header, ...dataChunks]);
}

// 記事全体を1つの音声ファイルとして生成
async function createArticleAudio(articlePath, outputDir) {
  console.log(`記事読み込み: ${articlePath}`);
  
  // マークダウンファイル読み込み
  const markdown = fs.readFileSync(articlePath, 'utf-8');
  const text = extractTextFromMarkdown(markdown);
  
  console.log(`抽出したテキスト長: ${text.length}文字`);
  
  // VOICEVOX API制限対策で1000文字単位に分割
  const chunks = splitIntoChunks(text, 1000);
  console.log(`${chunks.length}個のチャンクに分割して生成（最終的に1ファイルに結合）`);
  
  // 各チャンクを音声化してバッファに保存
  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[${i + 1}/${chunks.length}] 音声生成中...`);
    const audioData = await textToSpeech(chunks[i], SPEAKER_ID);
    audioBuffers.push(audioData);
    
    // API負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 全チャンクを1つのWAVファイルに結合
  console.log(`\n音声ファイルを結合中...`);
  const combinedAudio = concatenateWavBuffers(audioBuffers);
  
  // 1つのファイルとして保存
  const filename = 'article.wav';
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, combinedAudio);
  
  console.log(`\n✅ 音声ファイル生成完了: ${filename}`);
  console.log(`出力先: ${outputDir}`);
  
  // プレイリスト情報を保存
  const playlist = {
    article: path.basename(articlePath),
    chunks: [filename],
    totalChunks: 1,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'playlist.json'),
    JSON.stringify(playlist, null, 2)
  );
  
  return [filename];
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
