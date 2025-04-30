#!/usr/bin/env python3
"""
Script to generate VTT captions from video files using OpenAI's Whisper.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Optional, List

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
        help='Path to input video file or directory'
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

def main():
    """Main entry point."""
    # Check for FFmpeg
    if not check_ffmpeg():
        print("Error: FFmpeg is not installed or not in PATH")
        print("Please install FFmpeg and try again")
        sys.exit(1)
        
    parser = setup_argparse()
    args = parser.parse_args()
    
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