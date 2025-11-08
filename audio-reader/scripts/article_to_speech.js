#!/usr/bin/env node
// Zenn記事をVOICEVOXで音声ファイルに変換するスクリプト

const fs = require('fs');
const path = require('path');
const http = require('http');

const VOICEVOX_API = 'http://localhost:50021';

// 利用可能な話者リスト
const AVAILABLE_SPEAKERS = {
  'zundamon': { id: 3, name: 'ずんだもん（ノーマル）', description: '親しみやすい声' },
  'no7-reading': { id: 31, name: 'No.7（読み聞かせ）', description: '朗読に特化した落ち着いた男性声' },
  'aoyama-calm': { id: 84, name: '青山龍星（しっとり）', description: '落ち着いた朗読向け男性声' }
};

// デフォルトの話者（コマンドライン引数で変更可能）
const DEFAULT_SPEAKER = 'zundamon';

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

// HTTP リクエストヘルパー（タイムアウト・リトライ対応）
function httpRequest(url, options = {}, binary = false, timeout = 30000, retries = 3) {
  return new Promise(async (resolve, reject) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await new Promise((resolveInner, rejectInner) => {
          const req = http.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: timeout
          }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
              if (res.statusCode !== 200) {
                rejectInner(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
                return;
              }
              if (binary) {
                resolveInner(Buffer.concat(chunks));
              } else {
                resolveInner(Buffer.concat(chunks).toString());
              }
            });
          });
          
          req.on('error', rejectInner);
          req.on('timeout', () => {
            req.destroy();
            rejectInner(new Error(`Request timeout after ${timeout}ms`));
          });
          
          if (options.body) {
            req.write(options.body);
          }
          
          req.end();
        });
        
        return resolve(result);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          console.log(`リトライ ${attempt}/${retries}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    reject(new Error(`Failed after ${retries} attempts: ${lastError.message}`));
  });
}

// テキストを音声に変換
async function textToSpeech(text, speakerId) {
  console.log(`テキスト変換中: ${text.substring(0, 50)}...`);
  
  try {
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
  } catch (error) {
    console.error(`音声変換エラー: ${error.message}`);
    console.error('VOICEVOX APIサーバーが起動しているか確認してください');
    console.error(`確認コマンド: curl http://localhost:50021/version`);
    throw error;
  }
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
async function createArticleAudio(articlePath, outputDir, speakerKey) {
  const speaker = AVAILABLE_SPEAKERS[speakerKey];
  console.log(`記事読み込み: ${articlePath}`);
  console.log(`話者: ${speaker.name} (ID: ${speaker.id})`);
  
  // VOICEVOXサーバー起動確認
  try {
    await httpRequest(`${VOICEVOX_API}/version`);
  } catch (error) {
    console.error('\n⚠️  VOICEVOXサーバーに接続できません');
    console.error('以下を確認してください:');
    console.error('1. VOICEVOXアプリケーションが起動しているか');
    console.error('2. 設定 → エンジン → 「HTTPサーバーを起動する」がONか');
    console.error('3. ポート番号が50021か\n');
    throw new Error('VOICEVOX API server is not running');
  }
  
  // マークダウンファイル読み込み
  const markdown = fs.readFileSync(articlePath, 'utf-8');
  const text = extractTextFromMarkdown(markdown);
  
  console.log(`抽出したテキスト長: ${text.length}文字`);
  
  // VOICEVOX API制限対策で1000文字単位に分割
  const chunks = splitIntoChunks(text, 1000);
  console.log(`${chunks.length}個のチャンクに分割して生成（最終的に1ファイルに結合）`);
  
  // 各チャンクを音声化してバッファに保存（エラー時は部分保存）
  const audioBuffers = [];
  let failedChunks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[${i + 1}/${chunks.length}] 音声生成中...`);
    try {
      const audioData = await textToSpeech(chunks[i], speaker.id);
      audioBuffers.push(audioData);
      
      // API負荷軽減のため少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`⚠️  チャンク ${i + 1} の音声生成失敗: ${error.message}`);
      failedChunks.push(i + 1);
      
      // 3個以上連続で失敗した場合は中断
      if (failedChunks.length >= 3 && failedChunks.slice(-3).every((v, idx) => v === i + 1 - 2 + idx)) {
        console.error('\n3個以上のチャンクが連続で失敗しました。処理を中断します。');
        if (audioBuffers.length > 0) {
          console.log(`\n部分的に生成された音声（${audioBuffers.length}チャンク）を保存します...`);
          break;
        } else {
          throw new Error('音声生成に失敗しました');
        }
      }
    }
  }
  
  if (audioBuffers.length === 0) {
    throw new Error('音声データが1つも生成されませんでした');
  }
  
  if (failedChunks.length > 0) {
    console.log(`\n⚠️  失敗したチャンク: ${failedChunks.join(', ')}`);
    console.log(`成功したチャンク: ${audioBuffers.length}/${chunks.length}`);
  }
  
  // 全チャンクを1つのWAVファイルに結合
  console.log(`\n音声ファイルを結合中...`);
  let combinedAudio;
  try {
    combinedAudio = concatenateWavBuffers(audioBuffers);
    console.log(`結合後のファイルサイズ: ${(combinedAudio.length / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error(`WAVファイル結合エラー: ${error.message}`);
    throw new Error(`音声ファイルの結合に失敗しました: ${error.message}`);
  }
  
  // 1つのファイルとして保存（話者名を含む）
  const filename = `article_${speakerKey}.wav`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, combinedAudio);
  
  console.log(`\n✅ 音声ファイル生成完了: ${filename}`);
  console.log(`出力先: ${outputDir}`);
  
  // プレイリスト情報を保存
  const playlist = {
    article: path.basename(articlePath),
    speaker: speakerKey,
    speakerName: speaker.name,
    chunks: [filename],
    totalChunks: 1,
    engine: "VOICEVOX",
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
  const speakerKey = process.argv[3] || DEFAULT_SPEAKER;
  
  if (!articlePath) {
    console.error('使用方法: node article_to_speech.js <記事のパス> [話者キー]');
    console.error('例: node article_to_speech.js ../articles/affinity-3-free-canva-ai-strategy-2025.md no7-reading');
    console.error('\n利用可能な話者:');
    Object.entries(AVAILABLE_SPEAKERS).forEach(([key, speaker]) => {
      console.error(`  ${key}: ${speaker.name} - ${speaker.description}`);
    });
    process.exit(1);
  }
  
  if (!AVAILABLE_SPEAKERS[speakerKey]) {
    console.error(`エラー: 不明な話者キー: ${speakerKey}`);
    console.error('利用可能な話者:', Object.keys(AVAILABLE_SPEAKERS).join(', '));
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
    await createArticleAudio(articlePath, outputDir, speakerKey);
  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

main();
