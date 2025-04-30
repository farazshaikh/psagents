#!/usr/bin/env python3
"""
Script to generate VTT captions from video files using OpenAI's Whisper.
"""

import argparse
import os
import sys
import json
import re
from pathlib import Path
from typing import Optional, List, Dict, Union

import whisper
from tqdm import tqdm

from utils import check_ffmpeg

def setup_argparse() -> argparse.ArgumentParser:
    """Configure command line arguments."""
    parser = argparse.ArgumentParser(
        description='Generate VTT captions from video files using Whisper'
    )
    parser.add_argument(
        '--input',
        type=str,
        required=True,
        help='Path to input video file/directory, or VTT file when using --json-captions'
    )
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='Path to output VTT file or directory'
    )
    parser.add_argument(
        '--model',
        type=str,
        default='small',
        choices=['tiny', 'base', 'small', 'medium', 'large'],
        help='Whisper model size to use'
    )
    parser.add_argument(
        '--language',
        type=str,
        help='Language code (e.g., "en" for English). If not specified, will auto-detect'
    )
    parser.add_argument(
        '--batch',
        action='store_true',
        help='Process all video files in input directory'
    )
    parser.add_argument(
        '--interactive-captions',
        action='store_true',
        help='Convert plain text VTT captions to interactive captions format'
    )
    return parser

def get_video_files(input_path: str) -> List[Path]:
    """Get list of video files to process."""
    input_path = Path(input_path)
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv'}
    
    if input_path.is_file():
        if input_path.suffix.lower() in video_extensions:
            return [input_path]
        else:
            print(f"Error: {input_path} is not a supported video file")
            sys.exit(1)
    
    if input_path.is_dir():
        return [f for f in input_path.glob('**/*') 
                if f.suffix.lower() in video_extensions]
    
    print(f"Error: {input_path} not found")
    sys.exit(1)

def get_output_path(input_file: Path, output_arg: str) -> Path:
    """Determine output path for VTT file."""
    output_path = Path(output_arg)
    
    # If output is a directory, use input filename with .vtt extension
    if output_path.is_dir():
        return output_path / f"{input_file.stem}.vtt"
    
    # If output has no extension, treat it as a directory
    if not output_path.suffix:
        output_path.mkdir(parents=True, exist_ok=True)
        return output_path / f"{input_file.stem}.vtt"
    
    # Ensure parent directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return output_path

def generate_captions(
    input_file: Path,
    output_file: Path,
    model_name: str = 'small',
    language: Optional[str] = None
) -> None:
    """Generate captions for a single video file."""
    try:
        # Load the model
        print(f"Loading Whisper model: {model_name}")
        model = whisper.load_model(model_name)
        
        # Transcribe the audio
        print(f"Transcribing: {input_file}")
        result = model.transcribe(
            str(input_file),
            language=language,
            verbose=False
        )
        
        # Write VTT file
        print(f"Writing captions to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("WEBVTT\n\n")
            for segment in result["segments"]:
                # Convert time to VTT format (HH:MM:SS.mmm)
                start = format_timestamp(segment["start"])
                end = format_timestamp(segment["end"])
                text = segment["text"].strip()
                
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")
                
        print(f"Successfully generated captions for: {input_file}")
        
    except Exception as e:
        print(f"Error processing {input_file}: {str(e)}")
        raise

def format_timestamp(seconds: float) -> str:
    """Convert seconds to VTT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}"

def parse_vtt_file(file_path: Path) -> List[Dict]:
    """Parse a VTT file containing plain text captions."""
    captions = []
    current_caption = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines and WEBVTT header
        if not line or line == 'WEBVTT':
            i += 1
            continue
            
        # Skip caption numbers
        if line.isdigit():
            i += 1
            continue
            
        # Parse timestamp
        if '-->' in line:
            start, end = line.split(' --> ')
            current_caption = {
                'start': start.strip(),
                'end': end.strip()
            }
            i += 1
            
            # Get the caption text (may be multiline)
            text_lines = []
            while i < len(lines) and lines[i].strip() and not lines[i].strip().isdigit():
                text_lines.append(lines[i].strip())
                i += 1
            
            current_caption['text'] = ' '.join(text_lines)
            captions.append(current_caption)
            continue
            
        i += 1
        
    return captions

def generate_interactive_captions(
    input_file: Path,
    output_file: Path
) -> None:
    """Generate VTT file with JSON formatted captions from plain text VTT."""
    try:
        # Parse input VTT file
        captions = parse_vtt_file(input_file)
        
        # Write VTT file with JSON captions
        print(f"Writing JSON captions to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("WEBVTT\n\n")
            
            for i, caption in enumerate(captions, 1):
                # Write caption number
                f.write(f"{i}\n")
                
                # Write timestamp
                f.write(f"{caption['start']} --> {caption['end']}\n")
                
                # Write caption as JSON
                caption_obj = {
                    'caption': caption['text']
                }
                
                # Format JSON with single quotes and unquoted property names
                json_str = json.dumps(caption_obj, ensure_ascii=False)
                json_str = json_str.replace('"', "'")
                json_str = re.sub(r"'([\w_]+)':", r'\1:', json_str)
                
                f.write(f"{json_str}\n\n")
                
        print(f"Successfully generated JSON captions for: {input_file}")
        
    except Exception as e:
        print(f"Error processing {input_file}: {str(e)}")
        raise

def main():
    """Main entry point."""
    parser = setup_argparse()
    args = parser.parse_args()
    
    # Handle JSON captions if specified
    if args.interactive_captions:
        input_file = Path(args.input)
        if not input_file.exists():
            print(f"Error: JSON captions file not found: {input_file}")
            sys.exit(1)
            
        output_file = get_output_path(input_file, args.output)
        try:
            generate_interactive_captions(input_file, output_file)
            sys.exit(0)
        except Exception as e:
            print(f"Failed to create interactive captions: {str(e)}")
            sys.exit(1)
    
    # Check for FFmpeg for video processing
    if not check_ffmpeg():
        print("Error: FFmpeg is not installed or not in PATH")
        print("Please install FFmpeg and try again")
        sys.exit(1)
    
    # Get list of video files to process
    video_files = get_video_files(args.input)
    if not video_files:
        print("No video files found to process")
        sys.exit(1)
    
    # Process each video file
    for video_file in tqdm(video_files, desc="Processing videos"):
        output_file = get_output_path(video_file, args.output)
        
        try:
            generate_captions(
                video_file,
                output_file,
                args.model,
                args.language
            )
        except Exception as e:
            print(f"Failed to process {video_file}: {str(e)}")
            if not args.batch:
                sys.exit(1)

if __name__ == '__main__':
    main() 
