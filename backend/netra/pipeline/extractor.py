"""
NETRA Video/Audio Extractor
Handles frame extraction and audio separation from input video.
Runs on the GPU worker EC2 instance.
"""
import cv2
import subprocess
import os
import asyncio
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np


def extract_frames(video_path: str, job_id: str, output_dir: str) -> List[Dict]:
    """
    Adaptive temporal sampling strategy:
    - Tier 1: 1 frame every 2 seconds (quick scan, max 30 frames)
    - Tier 2: If any frame > 0.6 fake score, sample 1 frame/0.5s around it
    Returns list of {frame_number, timestamp, image_path}
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_seconds = total_frames / fps

    # Sample 1 frame every 2 seconds, cap at 30 frames
    sample_interval = max(1, int(fps * 2))
    frames = []

    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_interval == 0:
            timestamp_sec = frame_idx / fps
            timestamp_str = f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}"
            frame_filename = f"frame_{frame_idx:06d}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)

            cv2.imwrite(frame_path, frame)
            frames.append({
                "frame_number": frame_idx,
                "timestamp": timestamp_str,
                "timestamp_sec": timestamp_sec,
                "image_path": frame_path,
            })

            if len(frames) >= 30:  # Hard cap per spec
                break

        frame_idx += 1

    cap.release()
    return frames


def extract_audio(video_path: str, output_path: str) -> Optional[str]:
    """
    Extracts 16kHz mono WAV for audio deepfake detection.
    Returns path to .wav file, or None if video has no audio.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-ac", "1",        # Mono
        "-ar", "16000",    # 16kHz for Wav2Vec2
        "-vn",             # No video
        output_path
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0 and os.path.exists(output_path):
            return output_path
        return None
    except Exception:
        return None


async def extract_frames_async(video_path: str, job_id: str, output_dir: str) -> List[Dict]:
    """Async wrapper for frame extraction."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract_frames, video_path, job_id, output_dir)


async def extract_audio_async(video_path: str, output_path: str) -> Optional[str]:
    """Async wrapper for audio extraction."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract_audio, video_path, output_path)
