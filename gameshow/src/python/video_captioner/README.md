# Video Captioner

⚠️ **Important: Python Environment Setup**
This project requires its own Python virtualenv. Even though the project is in a nix-managed workspace, do NOT use the nix Python. Instead:

1. Make sure you have Python 3.12+ installed on your system
2. Create a new virtualenv:
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Always activate the virtualenv before running any Python commands:
   ```bash
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

A Python tool to automatically generate VTT captions from MP4 videos using OpenAI's Whisper.

## Overview

This tool uses OpenAI's Whisper (local version) to transcribe audio from video files and generate WebVTT captions. It's completely free to use as it runs locally on your machine without requiring any API keys or internet connection.

## Features

- Generate WebVTT captions from MP4 videos
- Support for multiple languages
- Local processing with no API costs
- Configurable model sizes (tiny, base, small, medium, large)
- Batch processing support

## Prerequisites

- nix package manager (all other dependencies are handled by nix-shell)
- Git (for cloning the repository)

## Quick Start

1. Clone and enter the repository:
   ```bash
   git clone <repository-url>
   cd agentstm
   ```

2. Enter nix shell (this will set up all required dependencies):
   ```bash
   nix-shell
   ```

3. Navigate to the video captioner directory:
   ```bash
   cd gameshow/src/python/video_captioner
   ```

4. Set up Python environment (first time only):
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   source venv/bin/activate

   # Set up library path for PyTorch
   export LD_LIBRARY_PATH=/nix/store/$(ls -t /nix/store | grep stdenv-linux | head -n1)/lib:$LD_LIBRARY_PATH

   # Install dependencies
   pip install --upgrade pip setuptools wheel
   pip install -r requirements.txt
   ```

5. For subsequent runs, activate environment and set library path:
   ```bash
   source venv/bin/activate
   ## Ugh i don't understand why this crap is required if nix is supposed to take care of the build env stuff
   ## export LD_LIBRARY_PATH=/nix/store/$(ls -t /nix/store | grep stdenv-linux | head -n1)/lib:$LD_LIBRARY_PATH
   ```

6. Generate captions for a video:
   ```bash
   PYTHONPATH=src python src/generate_captions.py --input /path/to/your/video.mp4 --output /path/to/output/captions.vtt
   ```

Example:
```bash
PYTHONPATH=src python src/generate_captions.py --input ../../../episode_01/Intro/movs/final.mp4 --output ../../../episode_01/Intro/movs/captions.vtt
```

## Command Line Arguments

- `--input`: Path to input video file or directory
- `--output`: Path to output VTT file or directory
- `--model`: Choose Whisper model size (tiny, base, small, medium, large). Default: small
- `--language`: Specify source language (e.g., "en" for English). Default: auto-detect
- `--batch`: Process all videos in input directory

## Project Structure

```
video_captioner/
├── src/
│   ├── __init__.py
│   ├── generate_captions.py  # Main script
│   └── utils.py             # Utility functions
├── data/
│   ├── input/              # Place input videos here
│   └── output/             # Generated captions go here
├── requirements.txt
└── README.md
```

## Performance Considerations

- Model size affects accuracy and speed:
  - tiny: Fastest but less accurate (~1GB RAM)
  - small: Good balance for most uses (~2GB RAM)
  - medium: Better accuracy (~5GB RAM)
  - large: Most accurate (~10GB RAM)

## Troubleshooting

If you see `FP16 is not supported on CPU; using FP32 instead`:
- This is normal when running on CPU
- The warning doesn't affect caption quality
- For faster processing, consider using a smaller model (--model tiny)

If you see `libstdc++.so.6: cannot open shared object file`:
- Make sure you've set the LD_LIBRARY_PATH as shown in the setup instructions
- This is needed for PyTorch to find the C++ standard library

## Development

To deactivate the Python virtual environment when you're done:
```bash
deactivate
```

## License

TrueMetry
