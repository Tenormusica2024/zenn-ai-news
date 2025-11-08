#!/usr/bin/env node
// 既存のWAVファイルを1つに結合するスクリプト

const fs = require('fs');
const path = require('path');

// 引数: outputDir
const outputDir = process.argv[2];

if (!outputDir || !fs.existsSync(outputDir)) {
  console.error('使用方法: node concat_wav.js <出力ディレクトリ>');
  process.exit(1);
}

// playlist.json読み込み
const playlistPath = path.join(outputDir, 'playlist.json');
if (!fs.existsSync(playlistPath)) {
  console.error(`エラー: ${playlistPath} が見つかりません`);
  process.exit(1);
}

const playlist = JSON.parse(fs.readFileSync(playlistPath, 'utf-8'));
const chunkFiles = playlist.chunks;

console.log(`${chunkFiles.length}個のWAVファイルを結合します...`);

// 各WAVファイルを読み込み
const audioBuffers = [];
for (const filename of chunkFiles) {
  const filepath = path.join(outputDir, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`エラー: ${filepath} が見つかりません`);
    process.exit(1);
  }
  const buffer = fs.readFileSync(filepath);
  audioBuffers.push(buffer);
  console.log(`読み込み: ${filename} (${buffer.length} bytes)`);
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

const combinedAudio = concatenateWavBuffers(audioBuffers);

// 1つのファイルとして保存
const outputFilename = 'article.wav';
const outputFilepath = path.join(outputDir, outputFilename);
fs.writeFileSync(outputFilepath, combinedAudio);

console.log(`\n✅ 結合完了: ${outputFilename} (${combinedAudio.length} bytes)`);

// プレイリスト更新
playlist.chunks = [outputFilename];
playlist.totalChunks = 1;
playlist.updatedAt = new Date().toISOString();

fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
console.log(`✅ playlist.json更新完了`);
