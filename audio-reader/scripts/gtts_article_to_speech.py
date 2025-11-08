#!/usr/bin/env python
# gTTS (Google Text-to-Speech) 音声生成スクリプト

import sys
import os
from pathlib import Path
import re
import json
from datetime import datetime

try:
    from gtts import gTTS
except ImportError as e:
    print(f"エラー: 必要なパッケージがインストールされていません: {e}", file=sys.stderr)
    print("以下のコマンドを実行してください:", file=sys.stderr)
    print("pip install gTTS", file=sys.stderr)
    sys.exit(1)

# 利用可能な話者リスト（gTTSは音声タイプなし、言語コードのみ）
AVAILABLE_VOICES = {
    'ja-normal': {'lang': 'ja', 'name': '日本語（標準）', 'description': 'Google翻訳の日本語音声'},
}

DEFAULT_VOICE = 'ja-normal'

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

def generate_audio(article_path, output_dir, voice_key=DEFAULT_VOICE):
    """記事から音声ファイルを生成"""
    
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
    
    # 出力ディレクトリ作成
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # gTTSで音声生成（全テキストを一度に処理）
    print("音声生成中...")
    try:
        tts = gTTS(text=text, lang=voice_config['lang'], slow=False)
        
        filename = f"article_{voice_key}.mp3"
        filepath = output_path / filename
        
        tts.save(str(filepath))
        
        print(f"\n[OK] 音声ファイル生成完了: {filename}")
        print(f"出力先: {output_dir}")
        
        # プレイリスト情報保存
        playlist = {
            "article": Path(article_path).name,
            "speaker": voice_key,
            "speakerName": voice_config['name'],
            "chunks": [filename],
            "totalChunks": 1,
            "engine": "gTTS",
            "createdAt": datetime.now().isoformat()
        }
        
        playlist_path = output_path / 'playlist.json'
        with open(playlist_path, 'w', encoding='utf-8') as f:
            json.dump(playlist, f, ensure_ascii=False, indent=2)
        
        return filename
        
    except Exception as e:
        print(f"エラー: 音声生成に失敗しました: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("使用方法: python gtts_article_to_speech.py <記事のパス> [話者キー]", file=sys.stderr)
        print(f"例: python gtts_article_to_speech.py article.md {DEFAULT_VOICE}", file=sys.stderr)
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
