"""
NETRA Facial Landmark & Alignment Preprocessing Engine
Stabilizes face bounding boxes across temporal video frames,
aligns face orientation, and extracts normalized canonical face crops.
"""
import os
import sys
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

NETRA_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(NETRA_ROOT, "models")


def _get_cascade_classifier_class():
    """Safely obtain OpenCV CascadeClassifier class across OpenCV variants."""
    if hasattr(cv2, "CascadeClassifier"):
        return cv2.CascadeClassifier
    if hasattr(cv2, "objdetect") and hasattr(cv2.objdetect, "CascadeClassifier"):
        return cv2.objdetect.CascadeClassifier
    return None


def _load_safe_cascade(filename: str) -> Optional[object]:
    """
    Safely locate and load a Haar cascade XML file across candidate locations:
    1. models/ directory in repo
    2. cv2.data.haarcascades built-in package data
    3. Working directory models/
    """
    CascadeClass = _get_cascade_classifier_class()
    if CascadeClass is None:
        logger.warning("OpenCV CascadeClassifier class is not accessible.")
        return None

    candidate_paths = [
        os.path.join(MODELS_DIR, filename),
        os.path.join(os.getcwd(), "netra", "models", filename),
        os.path.join(os.getcwd(), "models", filename),
    ]

    # Check cv2.data.haarcascades
    cv2_data = getattr(cv2, "data", None)
    if cv2_data and hasattr(cv2_data, "haarcascades"):
        candidate_paths.append(os.path.join(cv2_data.haarcascades, filename))

    for path in candidate_paths:
        if path and os.path.isfile(path):
            try:
                clf = CascadeClass(path)
                if clf is not None and not clf.empty():
                    logger.debug(f"Loaded cascade from {path}")
                    return clf
            except Exception as e:
                logger.debug(f"Error loading cascade from {path}: {e}")
                continue

    logger.info(f"Cascade {filename} not found in candidates. Portrait center crop fallback will be used.")
    return None


class TemporalFaceAligner:
    """
    Tracks and aligns faces temporally to prevent jitter and isolate true facial skin.
    Provides graceful fallbacks when Haar cascades or landmarks are unavailable.
    """

    def __init__(self, target_size: Tuple[int, int] = (224, 224), smoothing_alpha: float = 0.65):
        self.target_size = target_size
        self.smoothing_alpha = smoothing_alpha
        self.prev_bbox: Optional[Tuple[int, int, int, int]] = None

        # Load Cascades with safe attribute and path access
        self.face_cascade = _load_safe_cascade("haarcascade_frontalface_default.xml")
        self.eye_cascade = _load_safe_cascade("haarcascade_eye.xml")

    def reset_tracker(self):
        """Reset temporal state tracker."""
        self.prev_bbox = None

    def detect_and_align_face(self, frame_bgr: np.ndarray) -> Tuple[np.ndarray, bool, Dict]:
        """
        Detects, temporally smooths, and crops the facial region.
        Returns: (aligned_face_bgr, face_detected, metadata)
        """
        if frame_bgr is None or frame_bgr.size == 0:
            blank = np.zeros((self.target_size[1], self.target_size[0], 3), dtype=np.uint8)
            return blank, False, {"bbox": (0, 0, 0, 0), "face_found": False, "original_resolution": (0, 0)}

        img_h, img_w = frame_bgr.shape[:2]
        raw_bbox = None

        if self.face_cascade is not None:
            try:
                gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=4,
                    minSize=(60, 60)
                )
                if len(faces) > 0:
                    # Select largest face with proximity bias towards image center
                    def score_face(r):
                        x, y, w, h = r
                        cx, cy = x + w / 2.0, y + h / 2.0
                        dist_to_center = np.hypot(cx - img_w / 2.0, cy - img_h / 2.0)
                        area = w * h
                        return area - dist_to_center * 10

                    best_face = max(faces, key=score_face)
                    raw_bbox = tuple(map(int, best_face))
            except Exception as e:
                logger.debug(f"Cascade detectMultiScale error: {e}")
                raw_bbox = None

        # Temporal smoothing filter
        if raw_bbox is not None:
            if self.prev_bbox is None:
                smooth_bbox = raw_bbox
            else:
                a = self.smoothing_alpha
                smooth_bbox = (
                    int(a * raw_bbox[0] + (1 - a) * self.prev_bbox[0]),
                    int(a * raw_bbox[1] + (1 - a) * self.prev_bbox[1]),
                    int(a * raw_bbox[2] + (1 - a) * self.prev_bbox[2]),
                    int(a * raw_bbox[3] + (1 - a) * self.prev_bbox[3]),
                )
            self.prev_bbox = smooth_bbox
            face_found = True
        elif self.prev_bbox is not None:
            smooth_bbox = self.prev_bbox
            face_found = True
        else:
            # Golden ratio portrait center crop fallback
            crop_size = int(min(img_h, img_w) * 0.70)
            cx, cy = img_w // 2, int(img_h * 0.40)
            smooth_bbox = (cx - crop_size // 2, cy - crop_size // 2, crop_size, crop_size)
            face_found = False

        x, y, w, h = smooth_bbox

        # Add 15% margin around face
        pad_x = int(w * 0.15)
        pad_y = int(h * 0.15)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img_w, x + w + pad_x)
        y2 = min(img_h, y + h + pad_y)

        face_crop = frame_bgr[y1:y2, x1:x2]
        if face_crop.size == 0 or face_crop.shape[0] < 10 or face_crop.shape[1] < 10:
            face_crop = cv2.resize(frame_bgr, self.target_size, interpolation=cv2.INTER_LINEAR)
        else:
            interp = cv2.INTER_AREA if (face_crop.shape[0] >= self.target_size[1]) else cv2.INTER_LINEAR
            face_crop = cv2.resize(face_crop, self.target_size, interpolation=interp)

        metadata = {
            "bbox": (x1, y1, max(0, x2 - x1), max(0, y2 - y1)),
            "face_found": face_found,
            "original_resolution": (img_w, img_h)
        }
        return face_crop, face_found, metadata

    def align_frames_batch(self, frames: List[np.ndarray]) -> List[Tuple[np.ndarray, bool, Dict]]:
        """Process a sequence of video frames with continuous temporal smoothing."""
        results = []
        for frame in frames:
            res = self.detect_and_align_face(frame)
            results.append(res)
        return results
