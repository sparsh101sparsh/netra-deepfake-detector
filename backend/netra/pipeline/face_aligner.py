"""
NETRA Facial Landmark & Alignment Preprocessing Engine
Stabilizes face bounding boxes across temporal video frames,
aligns face orientation, and extracts normalized canonical face crops.
"""

import os
import cv2
import numpy as np
from typing import Tuple, Optional, Dict, List

NETRA_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MODELS_DIR = os.path.join(NETRA_ROOT, "models")
CASCADE_FACE_PATH = os.path.join(MODELS_DIR, "haarcascade_frontalface_default.xml")
CASCADE_EYE_PATH = os.path.join(MODELS_DIR, "haarcascade_eye.xml")


class TemporalFaceAligner:
    """
    Tracks and aligns faces temporally to prevent jitter and isolate true facial skin.
    """
    def __init__(self, target_size: Tuple[int, int] = (224, 224), smoothing_alpha: float = 0.65):
        self.target_size = target_size
        self.smoothing_alpha = smoothing_alpha
        self.prev_bbox: Optional[Tuple[int, int, int, int]] = None
        
        # Load Cascades
        self.face_cascade = cv2.CascadeClassifier(CASCADE_FACE_PATH) if os.path.exists(CASCADE_FACE_PATH) else None
        self.eye_cascade = cv2.CascadeClassifier(CASCADE_EYE_PATH) if os.path.exists(CASCADE_EYE_PATH) else None

    def reset_tracker(self):
        self.prev_bbox = None

    def detect_and_align_face(self, frame_bgr: np.ndarray) -> Tuple[np.ndarray, bool, Dict]:
        """
        Detects, temporally smooths, and crops the facial region.
        Returns: (aligned_face_bgr, face_detected, metadata)
        """
        img_h, img_w = frame_bgr.shape[:2]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        
        raw_bbox = None
        if self.face_cascade is not None and not self.face_cascade.empty():
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(80, 80)
            )
            if len(faces) > 0:
                # Select largest face near image center
                def score_face(r):
                    x, y, w, h = r
                    cx, cy = x + w / 2, y + h / 2
                    dist_to_center = np.hypot(cx - img_w / 2, cy - img_h / 2)
                    area = w * h
                    return area - dist_to_center * 10
                best_face = max(faces, key=score_face)
                raw_bbox = tuple(map(int, best_face))
                
        # Temporal smoothing
        if raw_bbox is not None:
            if self.prev_bbox is None:
                smooth_bbox = raw_bbox
            else:
                # EMA filter
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
            # Fallback portrait center crop
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
            face_crop = cv2.resize(frame_bgr, self.target_size)
        else:
            face_crop = cv2.resize(face_crop, self.target_size, interpolation=cv2.INTER_AREA)

        metadata = {
            "bbox": (x1, y1, x2 - x1, y2 - y1),
            "face_found": face_found,
            "original_resolution": (img_w, img_h)
        }
        return face_crop, face_found, metadata
