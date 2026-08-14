"""
NETRA Video/Audio Extractor
Handles fast-seeking frame extraction and 16kHz mono audio separation from input video.
Optimized for high-throughput forensic preprocessing.
"""
import os
import sys
import asyncio
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def get_video_metadata(video_path: str) -> Dict:
    """
    Safely extract video metadata (FPS, duration, resolution, total frames)
    with strict guards against zero-division and invalid streams.
    """
    if not os.path.exists(video_path):
        return {
            "fps": 25.0,
            "total_frames": 0,
            "duration_seconds": 0.0,
            "width": 0,
            "height": 0,
            "has_video": False,
        }

    cap = cv2.VideoCapture(video_path)
    try:
        if not cap.isOpened():
            return {
                "fps": 25.0,
                "total_frames": 0,
                "duration_seconds": 0.0,
                "width": 0,
                "height": 0,
                "has_video": False,
            }

        raw_fps = cap.get(cv2.CAP_PROP_FPS)
        fps = float(raw_fps) if (raw_fps is not None and raw_fps > 0 and not np.isnan(raw_fps) and not np.isinf(raw_fps)) else 25.0

        raw_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        total_frames = int(raw_frames) if (raw_frames is not None and raw_frames > 0 and not np.isnan(raw_frames) and not np.isinf(raw_frames)) else 0

        duration_seconds = (total_frames / fps) if (total_frames > 0 and fps > 0) else 0.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        return {
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration_seconds": round(duration_seconds, 2),
            "width": width,
            "height": height,
            "has_video": total_frames > 0 or (width > 0 and height > 0),
        }
    finally:
        cap.release()


def extract_frames(
    video_path: str,
    job_id: str,
    output_dir: str,
    max_frames: int = 30
) -> List[Dict]:
    """
    Adaptive temporal frame extraction with fast interval seeking (`cap.set(cv2.CAP_PROP_POS_FRAMES, ...)`).
    - Samples 1 frame every 2 seconds (up to max_frames, default 30)
    - Returns list of {frame_number, timestamp, timestamp_sec, image_path, resolution}
    """
    if not os.path.exists(video_path):
        raise ValueError(f"Video file does not exist: {video_path}")

    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    try:
        raw_fps = cap.get(cv2.CAP_PROP_FPS)
        fps = float(raw_fps) if (raw_fps is not None and raw_fps > 0 and not np.isnan(raw_fps) and not np.isinf(raw_fps)) else 25.0

        raw_total = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        total_frames = int(raw_total) if (raw_total is not None and raw_total > 0 and not np.isnan(raw_total) and not np.isinf(raw_total)) else 0

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        sample_interval = max(1, int(fps * 2))  # 1 frame every 2 seconds
        frames = []

        # Fast Interval Seeking when total_frames is known
        if total_frames > 0:
            target_indices = list(range(0, total_frames, sample_interval))[:max_frames]
            for idx in target_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    continue

                timestamp_sec = (idx / fps) if fps > 0 else 0.0
                timestamp_str = f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}"
                frame_filename = f"frame_{idx:06d}.jpg"
                frame_path = os.path.join(output_dir, frame_filename)

                cv2.imwrite(frame_path, frame)
                frames.append({
                    "frame_number": idx,
                    "timestamp": timestamp_str,
                    "timestamp_sec": round(timestamp_sec, 3),
                    "image_path": frame_path,
                    "resolution": (width, height),
                })

        # Fallback to sequential scan if fast seek produced no frames or stream has no frame count
        if not frames:
            logger.info("Using sequential frame extraction fallback")
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            frame_idx = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                if frame_idx % sample_interval == 0:
                    timestamp_sec = (frame_idx / fps) if fps > 0 else 0.0
                    timestamp_str = f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}"
                    frame_filename = f"frame_{frame_idx:06d}.jpg"
                    frame_path = os.path.join(output_dir, frame_filename)

                    cv2.imwrite(frame_path, frame)
                    frames.append({
                        "frame_number": frame_idx,
                        "timestamp": timestamp_str,
                        "timestamp_sec": round(timestamp_sec, 3),
                        "image_path": frame_path,
                        "resolution": (width, height),
                    })

                    if len(frames) >= max_frames:
                        break

                frame_idx += 1

        logger.info(f"Extracted {len(frames)} frames from {video_path} into {output_dir}")
        return frames

    finally:
        cap.release()


def extract_audio(video_path: str, output_path: str) -> Optional[str]:
    """
    Extracts 16kHz mono WAV for audio deepfake detection.
    Returns path to .wav file, or None if video has no audio or FFmpeg fails.
    """
    if not os.path.exists(video_path):
        logger.error(f"Cannot extract audio: video does not exist at {video_path}")
        return None

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-ac", "1",        # Mono channel
        "-ar", "16000",    # 16kHz sampling rate
        "-vn",             # Disable video recording
        output_path
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"Successfully extracted audio to {output_path} ({os.path.getsize(output_path)} bytes)")
            return output_path
        else:
            err_msg = result.stderr.strip() if result.stderr else "Empty audio stream"
            logger.info(f"Audio stream not extracted from {video_path}: {err_msg.splitlines()[-1] if err_msg else ''}")
            if os.path.exists(output_path) and os.path.getsize(output_path) == 0:
                os.remove(output_path)
            return None
    except subprocess.TimeoutExpired:
        logger.error(f"FFmpeg audio extraction timed out for {video_path}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in FFmpeg audio extraction: {e}")
        return None


async def extract_frames_async(video_path: str, job_id: str, output_dir: str, max_frames: int = 30) -> List[Dict]:
    """Async wrapper for fast frame extraction."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract_frames, video_path, job_id, output_dir, max_frames)


async def extract_audio_async(video_path: str, output_path: str) -> Optional[str]:
    """Async wrapper for audio extraction."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract_audio, video_path, output_path)
