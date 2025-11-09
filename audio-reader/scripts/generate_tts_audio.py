#!/usr/bin/env python
# Google Cloud TTS (Text-to-Speech) 音声生成スクリプト

import sys
import os
from pathlib import Path
import re
import json
from datetime import datetime

try:
    from google.cloud import texttospeech
except ImportError as e:
    print(f"エラー: 必要なパッケージがインストールされていません: {e}", file=sys.stderr)
    print("以下のコマンドを実行してください:", file=sys.stderr)
    print("pip install google-cloud-texttospeech", file=sys.stderr)
    sys.exit(1)

# 利用可能な話者リスト（Google Cloud TTS）
AVAILABLE_VOICES = {
    'ja-male': {
        'language_code': 'ja-JP',
        'name': 'ja-JP-Neural2-C',
        'ssml_gender': texttospeech.SsmlVoiceGender.MALE,
        'display_name': '日本語（男性）',
        'description': 'Google Cloud TTS 日本語男性音声'
    },
    'ja-female': {
        'language_code': 'ja-JP',
        'name': 'ja-JP-Neural2-B',
        'ssml_gender': texttospeech.SsmlVoiceGender.FEMALE,
        'display_name': '日本語（女性）',
        'description': 'Google Cloud TTS 日本語女性音声'
    },
    'ja-normal': {
        'language_code': 'ja-JP',
        'name': 'ja-JP-Standard-A',
        'ssml_gender': texttospeech.SsmlVoiceGender.NEUTRAL,
        'display_name': '日本語（標準）',
        'description': 'Google Cloud TTS 日本語標準音声'
    }
}

DEFAULT_VOICE = 'ja-normal'

def validate_article_content(markdown, article_path):
    """記事ファイルの内容を検証（破損検出）"""
    
    # 最小文字数チェック
    if len(markdown) < 500:
        raise ValueError(
            f"[エラー] 記事ファイルが短すぎます（{len(markdown)}文字）\n"
            f"正常な記事は通常500文字以上あります。\n"
            f"ファイル: {article_path}"
        )
    
    # 404エラーテキストチェック
    if markdown.strip() == "404: Not Found":
        raise ValueError(
            f"[エラー] 記事ファイルが404エラーテキストのみです\n"
            f"正しい記事内容を確認してください。\n"
            f"ファイル: {article_path}"
        )
    
    # frontmatterの存在確認
    if not markdown.startswith("---"):
        raise ValueError(
            f"[エラー] 記事ファイルがfrontmatterで始まっていません\n"
            f"Zenn記事は '---' で始まる必要があります。\n"
            f"ファイル: {article_path}"
        )
    
    print(f"[OK] 記事ファイル検証: 正常")

def extract_text_from_markdown(markdown):
    """マークダウンから本文を抽出"""
    # 1. frontmatter除去（最優先）
    text = re.sub(r'^---\n[\s\S]*?\n---\n', '', markdown)
    
    # 2. 参照元セクション除去（ファイル末尾まで対応）
    text = re.sub(r'^##\s*参照元\n[\s\S]*?(?=\n##\s|\Z)', '', text, flags=re.MULTILINE)
    
    # 3. コードブロック除去（インライン処理前に実施）
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # 4. 見出し記号除去（行頭の # のみ、空白なしも対応）
    text = re.sub(r'^#{1,}\s*', '', text, flags=re.MULTILINE)
    
    # 5. リンク記法を文字列に変換（URL除去前に実施）
    text = re.sub(r'\[([^\]]+?)\]\([^\)]+?\)', r'\1', text)
    
    # 6. 強調記法除去（長いものから順に処理、最短マッチ使用）
    text = re.sub(r'\*{3}(.+?)\*{3}', r'\1', text)  # ***強調***
    text = re.sub(r'\*{2}(.+?)\*{2}', r'\1', text)  # **太字**
    text = re.sub(r'\*(.+?)\*', r'\1', text)        # *斜体*
    
    # 7. 箇条書き記号除去（強調記法除去後に実施）
    text = re.sub(r'^\s*\*+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[-•]\s+', '', text, flags=re.MULTILINE)
    
    # 8. 番号付きリスト記号除去
    text = re.sub(r'^\d+\.\s+', '', text, flags=re.MULTILINE)
    
    # 9. URL除去（すべてのURL、埋め込み含む）
    text = re.sub(r'https?://[^\s]+', '', text)
    
    # 10. 引用記号除去
    text = re.sub(r'^>+\s*', '', text, flags=re.MULTILINE)
    
    # 11. 記号全般を除去（読まなくていい記号）
    # ドル記号、パーセント、アンパサンド、プラス、イコール、パイプ、バックスラッシュ、アンダースコア等
    text = re.sub(r'[\$%&+=|\\]', '', text)
    
    # 12. 複数の空行を1つに統合（最終調整）
    text = re.sub(r'\n\n+', '\n\n', text)
    
    return text.strip()

def split_text_by_bytes(text, max_bytes=4500):
    """テキストをバイト数制限でチャンク分割（段落単位優先）"""
    chunks = []
    current_chunk = ""
    
    # 段落単位で分割（空行で区切られたブロック）
    paragraphs = text.split('\n\n')
    
    for paragraph in paragraphs:
        # 現在のチャンクに段落を追加できるかチェック
        test_chunk = current_chunk + ("\n\n" if current_chunk else "") + paragraph
        
        if len(test_chunk.encode('utf-8')) <= max_bytes:
            current_chunk = test_chunk
        else:
            # 現在のチャンクが空でなければ保存
            if current_chunk:
                chunks.append(current_chunk)
            
            # 段落自体が長すぎる場合、文単位で分割
            if len(paragraph.encode('utf-8')) > max_bytes:
                sentences = re.split(r'([。！？])', paragraph)
                temp_chunk = ""
                
                for i in range(0, len(sentences), 2):
                    sentence = sentences[i] + (sentences[i+1] if i+1 < len(sentences) else "")
                    test = temp_chunk + sentence
                    
                    if len(test.encode('utf-8')) <= max_bytes:
                        temp_chunk = test
                    else:
                        if temp_chunk:
                            chunks.append(temp_chunk)
                        temp_chunk = sentence
                
                current_chunk = temp_chunk
            else:
                current_chunk = paragraph
    
    # 最後のチャンク追加
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks

def generate_audio(article_path, output_dir, voice_key=DEFAULT_VOICE):
    """記事から音声ファイルを生成（チャンク分割対応）"""
    
    if voice_key not in AVAILABLE_VOICES:
        print(f"エラー: 不明な話者キー: {voice_key}", file=sys.stderr)
        print(f"利用可能な話者: {', '.join(AVAILABLE_VOICES.keys())}", file=sys.stderr)
        sys.exit(1)
    
    voice_config = AVAILABLE_VOICES[voice_key]
    print(f"記事読み込み: {article_path}")
    print(f"話者: {voice_config['display_name']} ({voice_key})")
    
    # マークダウン読み込み
    with open(article_path, 'r', encoding='utf-8') as f:
        markdown = f.read()
    
    # 記事内容の検証（破損検出）
    validate_article_content(markdown, article_path)
    
    text = extract_text_from_markdown(markdown)
    print(f"抽出したテキスト長: {len(text)}文字 ({len(text.encode('utf-8'))}バイト)")
    
    # 抽出テキストの長さ警告
    if len(text) < 1000:
        print(f"[警告] 抽出テキストが短すぎます（{len(text)}文字）")
        print(f"正常な記事からは通常1000文字以上のテキストが抽出されます")
    
    # テキストをチャンク分割（5000バイト制限対策）
    chunks = split_text_by_bytes(text, max_bytes=4500)
    print(f"テキストを{len(chunks)}個のチャンクに分割しました")
    
    # 出力ディレクトリ作成
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Google Cloud TTSクライアント初期化
    print("Google Cloud TTS初期化中...")
    try:
        # サービスアカウントキーファイルのパスを明示的に指定
        service_account_key = Path(__file__).parent.parent / 'service-account-key.json'
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(service_account_key)
        
        client = texttospeech.TextToSpeechClient()
        
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_config['language_code'],
            name=voice_config['name'],
            ssml_gender=voice_config['ssml_gender']
        )
        
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        # 各チャンクの音声生成
        chunk_files = []
        for i, chunk in enumerate(chunks, 1):
            print(f"音声生成中... ({i}/{len(chunks)}) - {len(chunk)}文字")
            
            synthesis_input = texttospeech.SynthesisInput(text=chunk)
            
            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # チャンクファイル保存
            if len(chunks) == 1:
                filename = f"article_{voice_key}.mp3"
            else:
                filename = f"article_{voice_key}_chunk_{i:02d}.mp3"
            
            filepath = output_path / filename
            
            with open(filepath, 'wb') as out:
                out.write(response.audio_content)
            
            chunk_files.append(filename)
        
        print(f"\n[OK] 音声ファイル生成完了: {len(chunk_files)}ファイル")
        print(f"出力先: {output_dir}")
        
        # プレイリスト情報保存
        playlist = {
            "article": Path(article_path).name,
            "speaker": voice_key,
            "speakerName": voice_config['display_name'],
            "chunks": chunk_files,
            "totalChunks": len(chunk_files),
            "engine": "Google Cloud TTS",
            "createdAt": datetime.now().isoformat()
        }
        
        playlist_path = output_path / 'playlist.json'
        with open(playlist_path, 'w', encoding='utf-8') as f:
            json.dump(playlist, f, ensure_ascii=False, indent=2)
        
        return chunk_files[0] if len(chunk_files) == 1 else chunk_files
        
    except Exception as e:
        print(f"エラー: 音声生成に失敗しました: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("使用方法: python generate_tts_audio.py <記事のパス> [話者キー]", file=sys.stderr)
        print(f"例: python generate_tts_audio.py article.md {DEFAULT_VOICE}", file=sys.stderr)
        print("\n利用可能な話者:", file=sys.stderr)
        for key, config in AVAILABLE_VOICES.items():
            print(f"  {key}: {config['display_name']} - {config['description']}", file=sys.stderr)
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
