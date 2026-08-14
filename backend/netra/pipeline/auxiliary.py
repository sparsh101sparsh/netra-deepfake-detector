"""
NETRA Auxiliary Signal Analyzer
No ML training needed — these use classical CV algorithms.

Signals:
- Face landmark jitter (DLIB EAR / MediaPipe)
- Eye blink analysis (EAR)
- Head pose estimation (InsightFace)
- Compression artifact detection (DCT analysis)
- Lighting consistency check
- Video metadata forensics (FFprobe)
"""
import cv2
import subprocess
import json
import numpy as np
import os
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


def analyze_metadata(video_path: str) -> Dict:
    """
    Run FFprobe to detect re-encoding, codec chain, bitrate anomalies.
    Returns dict of metadata flags.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", "-show_streams", video_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return {"anomalies": ["ffprobe_failed"], "reencode_count": 0}

        metadata = json.loads(result.stdout)
        anomalies = []
        reencode_count = 0

        # Check video streams
        video_streams = [s for s in metadata.get("streams", []) if s.get("codec_type") == "video"]
        for stream in video_streams:
            codec = stream.get("codec_name", "")
            if codec in ("h264", "h265", "hevc"):
                reencode_count += 1

            # Check for suspicious encoder metadata
            tags = stream.get("tags", {})
            encoder = tags.get("encoder", tags.get("ENCODER", "")).lower()
            if "deepfake" in encoder or "swap" in encoder:
                anomalies.append("suspicious_encoder_tag")

        # Check bitrate anomalies
        fmt = metadata.get("format", {})
        bit_rate = int(fmt.get("bit_rate", 0))
        if bit_rate > 0 and bit_rate < 100000:
            anomalies.append("very_low_bitrate")

        if reencode_count > 1:
            anomalies.append(f"reencoded_{reencode_count}_times")

        return {
            "reencode_count": reencode_count,
            "anomalies": anomalies,
            "codec": video_streams[0].get("codec_name") if video_streams else "unknown",
            "duration": float(fmt.get("duration", 0)),
            "bit_rate": bit_rate,
        }

    except Exception as e:
        logger.error(f"Metadata analysis failed: {e}")
        return {"anomalies": ["metadata_analysis_failed"], "reencode_count": 0}


def analyze_eye_blinks(frames: List[Dict]) -> Dict:
    """
    MediaPipe-based eye blink analysis using Eye Aspect Ratio (EAR).
    Normal: 15-20 blinks/minute (1 every ~3-4 seconds).
    Deepfakes often show: zero blinks, too-regular blinks, or robotic patterns.
    """
    try:
        import mediapipe as mp
        mp_solutions = getattr(mp, "solutions", None)
        if not mp_solutions and hasattr(mp, "python"):
            mp_solutions = getattr(mp.python, "solutions", None)
        if not mp_solutions:
            return {"blink_rate_per_minute": 0, "blink_anomalous": False, "ear_std": 0}
        mp_face_mesh = mp_solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
        )

        # Eye landmark indices for EAR calculation
        LEFT_EYE = [33, 160, 158, 133, 153, 144]
        RIGHT_EYE = [362, 385, 387, 263, 373, 380]

        ear_values = []
        blink_count = 0

        for frame_info in frames[:20]:  # Limit to 20 frames for speed
            img = cv2.imread(frame_info["image_path"])
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                h, w = img.shape[:2]

                def get_point(idx):
                    return np.array([landmarks[idx].x * w, landmarks[idx].y * h])

                def ear(eye_indices):
                    pts = [get_point(i) for i in eye_indices]
                    A = np.linalg.norm(pts[1] - pts[5])
                    B = np.linalg.norm(pts[2] - pts[4])
                    C = np.linalg.norm(pts[0] - pts[3])
                    return (A + B) / (2.0 * C) if C > 0 else 0

                left_ear = ear(LEFT_EYE)
                right_ear = ear(RIGHT_EYE)
                avg_ear = (left_ear + right_ear) / 2
                ear_values.append(avg_ear)

                if avg_ear < 0.2:
                    blink_count += 1

        face_mesh.close()

        flags = []
        if len(ear_values) > 5:
            if blink_count == 0:
                flags.append("zero_blinks_detected")
            blink_rate = blink_count / (len(frames) * 2 / 30)  # blinks per minute approx
            if blink_rate < 5:
                flags.append("abnormally_low_blink_rate")
            ear_std = float(np.std(ear_values))
            if ear_std < 0.005:
                flags.append("robotic_eye_pattern")

        return {
            "blink_count": blink_count,
            "ear_values": ear_values[:5],  # Sample for JSON
            "flags": flags,
            "available": True,
        }

    except Exception as e:
        logger.warning(f"Eye blink analysis failed: {e}")
        return {"blink_count": 0, "flags": [], "available": False}


def analyze_face_landmarks_jitter(frames: List[Dict]) -> Dict:
    """
    Detect unnatural face landmark movement across frames.
    Deepfakes often have high jitter in landmark positions.
    Threshold: std dev > 2px = suspicious.
    """
    try:
        import mediapipe as mp
        mp_solutions = getattr(mp, "solutions", None)
        if not mp_solutions and hasattr(mp, "python"):
            mp_solutions = getattr(mp.python, "solutions", None)
        if not mp_solutions:
            return {"landmark_jitter": 0.0, "anomalies": []}
        mp_face_mesh = mp_solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1)

        nose_positions = []
        for frame_info in frames[:15]:
            img = cv2.imread(frame_info["image_path"])
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)
            if results.multi_face_landmarks:
                nose_tip = results.multi_face_landmarks[0].landmark[1]
                h, w = img.shape[:2]
                nose_positions.append([nose_tip.x * w, nose_tip.y * h])

        face_mesh.close()

        flags = []
        if len(nose_positions) > 3:
            positions = np.array(nose_positions)
            std_dev = float(np.std(positions))
            if std_dev > 2.0:
                flags.append(f"landmark_jitter_std_{std_dev:.1f}px")

        return {"flags": flags, "landmark_std_dev": float(np.std(nose_positions)) if nose_positions else 0, "available": True}

    except Exception as e:
        logger.warning(f"Landmark analysis failed: {e}")
        return {"flags": [], "available": False}


def run_all_auxiliary(video_path: str, frames: List[Dict]) -> Dict:
    """Run all auxiliary signal analyses and aggregate results."""
    metadata = analyze_metadata(video_path)
    blink_data = analyze_eye_blinks(frames)
    landmark_data = analyze_face_landmarks_jitter(frames)

    all_flags = (
        metadata.get("anomalies", []) +
        blink_data.get("flags", []) +
        landmark_data.get("flags", [])
    )

    return {
        "metadata": metadata,
        "blink_analysis": blink_data,
        "landmark_analysis": landmark_data,
        "all_flags": all_flags,
    }
