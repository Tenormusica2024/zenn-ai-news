#!/usr/bin/env python
# Kokoro-82M TTS音声生成スクリプト

import sys
import os
from pathlib import Path

try:
    from kokoro import KPipeline
    import soundfile as sf
    import re
except ImportError as e:
    print(f"エラー: 必要なパッケージがインストールされていません: {e}", file=sys.stderr)
    print("以下のコマンドを実行してください:", file=sys.stderr)
    print("pip install kokoro soundfile", file=sys.stderr)
    sys.exit(1)

# 利用可能な話者リスト
AVAILABLE_VOICES = {
    'af_heart': {'lang': 'j', 'name': '女性（落ち着き）', 'description': '落ち着いた女性声'},
    'af_bella': {'lang': 'j', 'name': '女性（明るい）', 'description': '明るい女性声'},
    'am_adam': {'lang': 'j', 'name': '男性（標準）', 'description': '標準的な男性声'},
}

DEFAULT_VOICE = 'af_heart'

def extract_text_from_markdown(markdown):
    """マークダウンから本文を抽出"""
    # frontmatter除去
    text = re.sub(r'^---\n[\s\S]*?\n---\n', '', markdown)
    
    # 参照元セクション除去
    text = re.sub(r'^##\s*参照元\n[\s\S]*?(?=\n##\s)', '', text, flags=re.MULTILINE)
    
    # 見出し記号除去
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # リンク記法を文字列に変換
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # 太字・斜体記号除去
    text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^\*]+)\*', r'\1', text)
    
    # コードブロック除去
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # URLのみの行を除去
    text = re.sub(r'^https?://.*$', '', text, flags=re.MULTILINE)
    
    # 複数の空行を1つに
    text = re.sub(r'\n\n+', '\n\n', text)
    
    # 箇条書き記号除去
    text = re.sub(r'^[-*]\s+', '', text, flags=re.MULTILINE)
    
    return text.strip()

def split_text_by_sentences(text, max_chars=1000):
    """テキストを文単位で分割（日本語対応）"""
    sentences = re.split(r'[。\n]', text)
    chunks = []
    current_chunk = ''
    
    for sentence in sentences:
        if not sentence.strip():
            continue
        
        if len(current_chunk) + len(sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += sentence + '。'
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks

def generate_audio(article_path, output_dir, voice_key=DEFAULT_VOICE):
    """記事から音声ファイルを生成"""
    
    # 話者設定確認
    if voice_key not in AVAILABLE_VOICES:
        print(f"エラー: 不明な話者キー: {voice_key}", file=sys.stderr)
        print(f"利用可能な話者: {', '.join(AVAILABLE_VOICES.keys())}", file=sys.stderr)
        sys.exit(1)
    
    voice_config = AVAILABLE_VOICES[voice_key]
    print(f"記事読み込み: {article_path}")
    print(f"話者: {voice_config['name']} ({voice_key})")
    
    # マークダウン読み込み
    with open(article_path, 'r', encoding='utf-8') as f:
        markdown = f.read()
    
    text = extract_text_from_markdown(markdown)
    print(f"抽出したテキスト長: {len(text)}文字")
    
    # テキスト分割
    chunks = split_text_by_sentences(text, max_chars=1000)
    print(f"{len(chunks)}個のチャンクに分割")
    
    # Kokoro-82Mパイプライン初期化
    try:
        pipeline = KPipeline(lang_code=voice_config['lang'])
    except Exception as e:
        print(f"エラー: Kokoroパイプライン初期化失敗: {e}", file=sys.stderr)
        print("eSpeak-NGがインストールされているか確認してください", file=sys.stderr)
        sys.exit(1)
    
    # 各チャンクを音声化
    audio_segments = []
    for i, chunk in enumerate(chunks):
        print(f"[{i + 1}/{len(chunks)}] 音声生成中...")
        try:
            audio = pipeline(chunk, voice=voice_key)
            audio_segments.append(audio)
        except Exception as e:
            print(f"警告: チャンク{i + 1}の生成に失敗: {e}", file=sys.stderr)
            continue
    
    if not audio_segments:
        print("エラー: 音声セグメントが生成されませんでした", file=sys.stderr)
        sys.exit(1)
    
    # 音声セグメントを結合
    import numpy as np
    combined_audio = np.concatenate(audio_segments)
    
    # ファイル保存
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    filename = f"article_{voice_key}.wav"
    filepath = output_path / filename
    
    sf.write(str(filepath), combined_audio, 24000)
    
    print(f"\n✅ 音声ファイル生成完了: {filename}")
    print(f"出力先: {output_dir}")
    
    # プレイリスト情報保存
    import json
    playlist = {
        "article": Path(article_path).name,
        "speaker": voice_key,
        "speakerName": voice_config['name'],
        "chunks": [filename],
        "totalChunks": 1,
        "engine": "Kokoro-82M",
        "createdAt": ""
    }
    
    from datetime import datetime
    playlist["createdAt"] = datetime.now().isoformat()
    
    playlist_path = output_path / 'playlist.json'
    with open(playlist_path, 'w', encoding='utf-8') as f:
        json.dump(playlist, f, ensure_ascii=False, indent=2)
    
    return filename

def main():
    if len(sys.argv) < 2:
        print("使用方法: python kokoro_tts.py <記事のパス> [話者キー]", file=sys.stderr)
        print(f"例: python kokoro_tts.py article.md {DEFAULT_VOICE}", file=sys.stderr)
        print("\n利用可能な話者:", file=sys.stderr)
        for key, config in AVAILABLE_VOICES.items():
            print(f"  {key}: {config['name']} - {config['description']}", file=sys.stderr)
        sys.exit(1)
    
    article_path = sys.argv[1]
    voice_key = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_VOICE
    
    if not os.path.exists(article_path):
        print(f"エラー: ファイルが見つかりません: {article_path}", file=sys.stderr)
        sys.exit(1)
    
    # 出力ディレクトリ決定
    article_name = Path(article_path).stem
    output_dir = Path(__file__).parent.parent / 'audio' / article_name
    
    try:
        generate_audio(article_path, str(output_dir), voice_key)
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
