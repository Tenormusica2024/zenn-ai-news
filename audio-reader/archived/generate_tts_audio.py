#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Google Cloud Text-to-Speech API を使用した音声生成スクリプト
"""

import os
import sys
import io
from google.cloud import texttospeech
from pathlib import Path

# Windowsコンソールのエンコーディング問題対策
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# 環境変数でサービスアカウントキーを設定
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'service-account-key.json'

def split_text_by_bytes(text: str, max_bytes: int = 4000) -> list:
    """
    テキストをバイト数制限に基づいて分割
    
    Args:
        text: 分割するテキスト
        max_bytes: 最大バイト数（デフォルト4000、API制限は5000）
    
    Returns:
        分割されたテキストのリスト
    """
    chunks = []
    current_chunk = ""
    
    for line in text.split('\n'):
        test_chunk = current_chunk + line + '\n'
        if len(test_chunk.encode('utf-8')) > max_bytes:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = line + '\n'
        else:
            current_chunk = test_chunk
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def generate_audio(text: str, output_path: str, voice_name: str = 'ja-JP-Neural2-C'):
    """
    Google Cloud TTS APIで音声を生成
    
    Args:
        text: 読み上げるテキスト
        output_path: 出力ファイルパス（MP3）
        voice_name: 音声名
            - ja-JP-Neural2-B: 男性声
            - ja-JP-Neural2-C: 女性声
            - ja-JP-Neural2-D: 男性声（低音）
    """
    from pydub import AudioSegment
    
    client = texttospeech.TextToSpeechClient()
    
    # テキストをチャンクに分割
    chunks = split_text_by_bytes(text, max_bytes=4000)
    print(f'   テキスト分割: {len(chunks)} チャンク')
    
    audio_segments = []
    
    for i, chunk in enumerate(chunks, 1):
        print(f'   チャンク {i}/{len(chunks)} 処理中... ({len(chunk)} chars)')
        
        # 音声合成リクエスト設定
        synthesis_input = texttospeech.SynthesisInput(text=chunk)
        
        # 音声パラメータ
        voice = texttospeech.VoiceSelectionParams(
            language_code="ja-JP",
            name=voice_name
        )
        
        # オーディオ設定（MP3形式）
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0  # 話速（0.25～4.0）
        )
        
        # 音声合成実行
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        # AudioSegment作成
        audio_segment = AudioSegment.from_mp3(
            io.BytesIO(response.audio_content)
        )
        audio_segments.append(audio_segment)
    
    # 全チャンクを結合
    combined = audio_segments[0]
    for segment in audio_segments[1:]:
        combined += segment
    
    # MP3ファイル保存
    combined.export(output_path, format="mp3")
    
    print(f'✅ 音声生成完了: {output_path}')
    print(f'   文字数: {len(text)} chars')
    print(f'   音声: {voice_name}')

def generate_article_audio(article_slug: str):
    """
    記事の音声ファイルを生成（男性声・女性声）
    
    Args:
        article_slug: 記事のスラッグ名
    """
    # 記事テキストファイル読み込み（親ディレクトリの articles/ を参照）
    article_path = Path(__file__).parent.parent / 'articles' / f'{article_slug}.md'
    if not article_path.exists():
        print(f'❌ エラー: 記事ファイルが見つかりません - {article_path}')
        return
    
    with open(article_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 音声出力ディレクトリ作成
    audio_dir = Path(f'audio/{article_slug}')
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    # 男性声生成
    male_path = audio_dir / 'article_ja-male.mp3'
    print(f'\n🎙️ 男性声を生成中...')
    generate_audio(content, str(male_path), voice_name='ja-JP-Neural2-B')
    
    # 女性声生成
    female_path = audio_dir / 'article_ja-female.mp3'
    print(f'\n🎙️ 女性声を生成中...')
    generate_audio(content, str(female_path), voice_name='ja-JP-Neural2-C')
    
    print(f'\n✅ 記事の音声生成完了: {article_slug}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('使用方法: python generate_tts_audio.py <article-slug>')
        print('例: python generate_tts_audio.py affinity-3-free-canva-ai-strategy-2025')
        sys.exit(1)
    
    article_slug = sys.argv[1]
    generate_article_audio(article_slug)
