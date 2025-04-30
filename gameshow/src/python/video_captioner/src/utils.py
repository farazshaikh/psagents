"""Utility functions for video captioning."""

import os
import subprocess
from pathlib import Path
from typing import Optional

def check_ffmpeg() -> bool:
    """Check if FFmpeg is installed and accessible."""
    try:
        subprocess.run(['ffmpeg', '-version'], 
                      stdout=subprocess.PIPE, 
                      stderr=subprocess.PIPE)
        return True
    except FileNotFoundError:
        return False

def extract_audio(video_path: Path, output_path: Optional[Path] = None) -> Path:
    """
    Extract audio from video file.
    
    Args:
        video_path: Path to video file
        output_path: Optional path for output audio file
        
    Returns:
        Path to extracted audio file
    """
    if output_path is None:
        output_path = video_path.with_suffix('.wav')
        
    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-vn',  # Disable video
        '-acodec', 'pcm_s16le',  # Audio codec
        '-ar', '16000',  # Sample rate
        '-ac', '1',  # Mono
        '-y',  # Overwrite output file
        str(output_path)
    ]
    
    subprocess.run(cmd, 
                  stdout=subprocess.PIPE, 
                  stderr=subprocess.PIPE,
                  check=True)
    
    return output_path

def get_video_duration(video_path: Path) -> float:
    """
    Get duration of video file in seconds.
    
    Args:
        video_path: Path to video file
        
    Returns:
        Duration in seconds
    """
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        str(video_path)
    ]
    
    result = subprocess.run(cmd,
                          stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE,
                          text=True,
                          check=True)
    
    return float(result.stdout) 