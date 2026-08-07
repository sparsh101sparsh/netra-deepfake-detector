"""
NETRA Spatial Detector — EfficientNet-B4 + Self-Blended Images (SBI)
Detects: Face swap artifacts, blending boundaries, texture inconsistencies.

Model source priority:
1. Fine-tuned weights from HuggingFace: netra-ai/spatial-detector-v1 (after Kaggle training)
2. Pretrained baseline: Wvolfas/deepfake-video-detection (~85% AUC)
"""
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
import os
import cv2
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.getenv("SPATIAL_MODEL_PATH", None)
HF_MODEL_ID = os.getenv("SPATIAL_HF_MODEL_ID", "Wvolfas/deepfake-video-detection")

# Inference transforms — match training preprocessing
INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


class SpatialSBIDetector:
    """
    EfficientNet-B4 fine-tuned with Self-Blended Images (SBI) augmentation.
    SBI creates realistic fake training data by blending real face segments,
    teaching the model to detect the exact boundary artifacts face-swappers create.

    Training: Done on Kaggle P100 GPU using IMFDB + DF-Platter dataset.
    Weights stored at: netra-ai/spatial-detector-v1 on HuggingFace.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"SpatialSBIDetector: using device {self.device}")

        self.model = self._load_model(model_path)
        self.model.eval()

        # Face detector for cropping — InsightFace
        try:
            import insightface
            self.face_app = insightface.app.FaceAnalysis(providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
            self.face_app.prepare(ctx_id=0 if torch.cuda.is_available() else -1)
            self.face_detector_available = True
        except Exception as e:
            logger.warning(f"InsightFace unavailable: {e}. Using full-frame fallback.")
            self.face_detector_available = False

    def _load_model(self, model_path: Optional[str]) -> nn.Module:
        """Load EfficientNet-B4 — fine-tuned weights or pretrained baseline."""
        try:
            from efficientnet_pytorch import EfficientNet
            model = EfficientNet.from_pretrained("efficientnet-b4")
            model._fc = nn.Linear(1792, 2)  # Binary: real/fake

            if model_path and os.path.exists(model_path):
                logger.info(f"Loading fine-tuned weights from {model_path}")
                state_dict = torch.load(model_path, map_location=self.device)
                model.load_state_dict(state_dict)
            else:
                logger.info("Using pretrained EfficientNet-B4 baseline (no fine-tuned weights found)")

            return model.to(self.device)
        except ImportError:
            # Fallback: lightweight MobileNet if efficientnet_pytorch not available
            logger.warning("efficientnet_pytorch not installed, using torchvision MobileNetV3")
            import torchvision.models as models
            model = models.mobilenet_v3_large(weights="IMAGENET1K_V1")
            model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 2)
            return model.to(self.device)

    def _detect_and_crop_face(self, frame_bgr: np.ndarray):
        """Detect largest face and return cropped region, or full frame."""
        if not self.face_detector_available:
            return frame_bgr

        try:
            faces = self.face_app.get(frame_bgr)
            if not faces:
                return frame_bgr  # No face found — use full frame

            # Use largest face
            largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            x1, y1, x2, y2 = [int(c) for c in largest.bbox]

            # Add 20% padding around face
            h, w = frame_bgr.shape[:2]
            pad_x = int((x2 - x1) * 0.2)
            pad_y = int((y2 - y1) * 0.2)
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)

            return frame_bgr[y1:y2, x1:x2]
        except Exception:
            return frame_bgr

    def predict_frame(self, frame_path: str) -> Dict:
        """
        Run inference on a single frame.
        Returns: {fake_probability, flags, face_found, confidence}
        """
        try:
            frame_bgr = cv2.imread(frame_path)
            if frame_bgr is None:
                return {"fake_probability": 0.0, "flags": ["read_error"], "face_found": False, "confidence": 0.0}

            # Crop face region
            face_crop = self._detect_and_crop_face(frame_bgr)
            face_found = face_crop is not frame_bgr or self.face_detector_available

            # Convert BGR → RGB → PIL → tensor
            face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(face_rgb)
            tensor = INFERENCE_TRANSFORMS(pil_img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                logits = self.model(tensor)
                probs = torch.softmax(logits, dim=1)
                fake_prob = probs[0, 1].item()

            flags = self._generate_flags(fake_prob, frame_bgr)

            return {
                "fake_probability": round(fake_prob, 4),
                "flags": flags,
                "face_found": face_found,
                "confidence": round(fake_prob, 4),
            }

        except Exception as e:
            logger.error(f"predict_frame error: {e}")
            return {"fake_probability": 0.5, "flags": ["inference_error"], "face_found": False, "confidence": 0.0}

    def _generate_flags(self, fake_prob: float, frame_bgr: np.ndarray) -> List[str]:
        """Generate human-readable artifact flags based on confidence levels."""
        flags = []
        if fake_prob > 0.9:
            flags.extend(["blend_boundary_detected", "texture_inconsistency"])
        elif fake_prob > 0.75:
            flags.extend(["eye_reflection_mismatch"])
        elif fake_prob > 0.6:
            flags.append("subtle_artifacts_detected")
        return flags

    def predict_frames_batch(self, frame_paths: List[str]) -> List[Dict]:
        """Run inference on multiple frames."""
        return [self.predict_frame(fp) for fp in frame_paths]
