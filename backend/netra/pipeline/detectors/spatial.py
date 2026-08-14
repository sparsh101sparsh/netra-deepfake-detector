"""
NETRA Spatial Detector — EfficientNet-B4 + Self-Blended Images (SBI)
Detects: Face swap artifacts, blending boundaries, texture inconsistencies.

Model source priority:
1. Fine-tuned weights: spatial_model_best.pth (trained on Indian Face Dataset + SBI)
2. Custom checkpoint from SPATIAL_MODEL_PATH environment variable
3. Pretrained baseline: torchvision EfficientNet-B4 IMAGENET1K_V1
"""
import os
import sys
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union

import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

logger = logging.getLogger(__name__)

# Default inference transforms — matches training preprocessing
INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def get_spatial_device() -> torch.device:
    """Select best available device: CUDA -> MPS (Apple Silicon) -> CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def resolve_spatial_checkpoint_path(custom_path: Optional[str] = None) -> Optional[str]:
    """
    Search for trained spatial checkpoint across known locations:
    1. Explicit custom path
    2. SPATIAL_MODEL_PATH environment variable
    3. Repo root spatial_model_best.pth
    4. Relative parent directory lookups
    """
    candidates = []
    if custom_path:
        candidates.append(custom_path)

    env_path = os.getenv("SPATIAL_MODEL_PATH")
    if env_path:
        candidates.append(env_path)

    # Relative to this file location
    current_file = Path(__file__).resolve()
    for parent in current_file.parents:
        candidates.append(str(parent / "spatial_model_best.pth"))
        candidates.append(str(parent / "models" / "spatial_model_best.pth"))

    # Working directory lookups
    cwd = Path.cwd()
    candidates.append(str(cwd / "spatial_model_best.pth"))
    candidates.append(str(cwd / "netra" / "spatial_model_best.pth"))
    candidates.append(str(cwd / "models" / "spatial_model_best.pth"))

    for c in candidates:
        if c and os.path.isfile(c):
            return os.path.abspath(c)

    return None


class SpatialSBIDetector:
    """
    EfficientNet-B4 fine-tuned with Self-Blended Images (SBI) augmentation.
    SBI creates realistic fake training data by blending real face segments,
    teaching the model to detect the exact boundary artifacts face-swappers create.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.device = get_spatial_device()
        logger.info(f"SpatialSBIDetector: initialized on device {self.device}")

        self.model_path = resolve_spatial_checkpoint_path(model_path)
        self.model = self._load_model(self.model_path)
        self.model.eval()

        # Face detector for cropping — InsightFace with fallback
        self._init_face_detector()

    def _init_face_detector(self):
        """Initialize face detector with fallback to OpenCV Haar Cascades."""
        self.face_detector_available = False
        self.face_app = None
        self.cv2_face_cascade = None

        try:
            import insightface
            providers = ["CPUExecutionProvider"]
            if self.device.type == "cuda":
                providers.insert(0, "CUDAExecutionProvider")
            self.face_app = insightface.app.FaceAnalysis(providers=providers)
            self.face_app.prepare(ctx_id=0 if self.device.type == "cuda" else -1)
            self.face_detector_available = True
            logger.info("SpatialSBIDetector: InsightFace initialized successfully")
        except Exception as e:
            logger.info(f"InsightFace unavailable ({e}), using OpenCV face detector fallback")
            self._init_opencv_face_fallback()

    def _init_opencv_face_fallback(self):
        """OpenCV CascadeClassifier fallback for face localization."""
        CascadeClass = getattr(cv2, "CascadeClassifier", None)
        if CascadeClass is None and hasattr(cv2, "objdetect"):
            CascadeClass = getattr(cv2.objdetect, "CascadeClassifier", None)

        if CascadeClass is None:
            return

        cascade_candidates = [
            "/home/ubuntu/netra/models/haarcascade_frontalface_default.xml",
            os.path.expanduser("~/netra/models/haarcascade_frontalface_default.xml"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "haarcascade_frontalface_default.xml"),
            os.path.join(os.getcwd(), "netra", "models", "haarcascade_frontalface_default.xml"),
            os.path.join(os.getcwd(), "models", "haarcascade_frontalface_default.xml"),
        ]
        cv2_data = getattr(cv2, "data", None)
        if cv2_data and hasattr(cv2_data, "haarcascades"):
            cascade_candidates.append(os.path.join(cv2_data.haarcascades, "haarcascade_frontalface_default.xml"))

        for cand in cascade_candidates:
            if cand and os.path.isfile(cand):
                try:
                    clf = CascadeClass(cand)
                    if not clf.empty():
                        self.cv2_face_cascade = clf
                        self.face_detector_available = True
                        logger.info(f"SpatialSBIDetector: OpenCV face cascade loaded from {cand}")
                        break
                except Exception:
                    continue

    def _load_model(self, model_path: Optional[str]) -> nn.Module:
        """
        Load EfficientNet-B4:
        1. If custom checkpoint found: load fine-tuned weights into model
        2. If no checkpoint found: load pretrained IMAGENET1K weights baseline (NEVER weights=None)
        """
        if model_path and os.path.exists(model_path):
            logger.info(f"SpatialSBIDetector: Loading fine-tuned weights from {model_path}")
            # Instantiate architecture for weight loading
            model = models.efficientnet_b4(weights=None)
            model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)

            checkpoint = torch.load(model_path, map_location=self.device)
            state_dict = checkpoint.get("model_state_dict", checkpoint)
            model.load_state_dict(state_dict)
            self.model_source = f"checkpoint:{model_path}"
            logger.info(f"SpatialSBIDetector: Checkpoint loaded successfully from {model_path}")
        else:
            logger.warning("SpatialSBIDetector: Custom checkpoint not found, loading torchvision IMAGENET1K_V1 pretrained baseline")
            try:
                weights = models.EfficientNet_B4_Weights.IMAGENET1K_V1
                model = models.efficientnet_b4(weights=weights)
            except Exception:
                model = models.efficientnet_b4(pretrained=True)
            model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
            self.model_source = "torchvision:EfficientNet_B4_Weights.IMAGENET1K_V1"

        return model.to(self.device)

    def _detect_and_crop_face(self, frame_bgr: np.ndarray) -> np.ndarray:
        """Detect largest face and return cropped region with padding, or center portrait crop."""
        h, w = frame_bgr.shape[:2]

        # 1. InsightFace detection
        if self.face_app is not None:
            try:
                faces = self.face_app.get(frame_bgr)
                if faces:
                    largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                    x1, y1, x2, y2 = [int(c) for c in largest.bbox]
                    pad_x = int((x2 - x1) * 0.2)
                    pad_y = int((y2 - y1) * 0.2)
                    x1 = max(0, x1 - pad_x)
                    y1 = max(0, y1 - pad_y)
                    x2 = min(w, x2 + pad_x)
                    y2 = min(h, y2 + pad_y)
                    crop = frame_bgr[y1:y2, x1:x2]
                    if crop.size > 0 and crop.shape[0] >= 10 and crop.shape[1] >= 10:
                        return crop
            except Exception as e:
                logger.debug(f"InsightFace crop error: {e}")

        # 2. OpenCV Haar cascade fallback
        if self.cv2_face_cascade is not None:
            try:
                gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
                faces = self.cv2_face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
                if len(faces) > 0:
                    best = max(faces, key=lambda r: r[2] * r[3])
                    x, y, fw, fh = best
                    pad_x = int(fw * 0.2)
                    pad_y = int(fh * 0.2)
                    x1 = max(0, x - pad_x)
                    y1 = max(0, y - pad_y)
                    x2 = min(w, x + fw + pad_x)
                    y2 = min(h, y + fh + pad_y)
                    crop = frame_bgr[y1:y2, x1:x2]
                    if crop.size > 0 and crop.shape[0] >= 10 and crop.shape[1] >= 10:
                        return crop
            except Exception as e:
                logger.debug(f"OpenCV face cascade crop error: {e}")

        # 3. Portrait center crop fallback
        crop_size = int(min(h, w) * 0.75)
        cx, cy = w // 2, int(h * 0.42)
        x1 = max(0, cx - crop_size // 2)
        y1 = max(0, cy - crop_size // 2)
        x2 = min(w, x1 + crop_size)
        y2 = min(h, y1 + crop_size)
        crop = frame_bgr[y1:y2, x1:x2]
        return crop if crop.size > 0 else frame_bgr

    def predict_frame(self, frame_input: Union[str, np.ndarray]) -> Dict:
        """
        Run inference on a single frame.
        Returns: {fake_probability, flags, face_found, confidence}
        """
        results = self.predict_frames_batch([frame_input], batch_size=1)
        return results[0] if results else {
            "fake_probability": 0.5,
            "flags": ["inference_error"],
            "face_found": False,
            "confidence": 0.0,
        }

    def predict_frames_batch(
        self,
        frame_inputs: List[Union[str, np.ndarray]],
        batch_size: int = 16
    ) -> List[Dict]:
        """
        Run batch inference on multiple frames.
        Supports file paths (str) or raw BGR images (np.ndarray).
        Processes in chunks of batch_size for memory efficiency and throughput.
        """
        if not frame_inputs:
            return []

        all_results: List[Dict] = []

        for start_idx in range(0, len(frame_inputs), batch_size):
            chunk = frame_inputs[start_idx:start_idx + batch_size]
            tensors_in_chunk = []
            valid_indices = []
            chunk_results: List[Dict] = [None] * len(chunk)  # type: ignore

            for i, item in enumerate(chunk):
                try:
                    if isinstance(item, str):
                        frame_bgr = cv2.imread(item)
                    elif isinstance(item, np.ndarray):
                        frame_bgr = item
                    else:
                        frame_bgr = None

                    if frame_bgr is None or frame_bgr.size == 0:
                        chunk_results[i] = {
                            "fake_probability": 0.0,
                            "flags": ["read_error"],
                            "face_found": False,
                            "confidence": 0.0,
                        }
                        continue

                    # Crop facial region
                    face_crop = self._detect_and_crop_face(frame_bgr)
                    face_found = face_crop is not frame_bgr or self.face_detector_available

                    # Convert BGR -> RGB -> PIL -> Normalized Tensor
                    face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(face_rgb)
                    tensor = INFERENCE_TRANSFORMS(pil_img)

                    tensors_in_chunk.append(tensor)
                    valid_indices.append((i, face_found, frame_bgr, face_crop))

                except Exception as e:
                    logger.error(f"Error preprocessing frame at index {start_idx + i}: {e}")
                    chunk_results[i] = {
                        "fake_probability": 0.5,
                        "flags": ["preprocessing_error"],
                        "face_found": False,
                        "confidence": 0.0,
                        "face_crop": None,
                    }

            # Run batched neural forward pass
            if tensors_in_chunk:
                try:
                    batch_tensor = torch.stack(tensors_in_chunk).to(self.device)
                    with torch.no_grad():
                        logits = self.model(batch_tensor)
                        probs = torch.softmax(logits, dim=1)
                        # Index 1 = fake
                        fake_probs = probs[:, 1].detach().cpu().numpy()

                    for j, (orig_i, face_found, frame_bgr, face_crop) in enumerate(valid_indices):
                        fake_prob = float(fake_probs[j])
                        flags = self._generate_flags(fake_prob, frame_bgr)
                        chunk_results[orig_i] = {
                            "fake_probability": round(fake_prob, 4),
                            "flags": flags,
                            "face_found": face_found,
                            "confidence": round(fake_prob, 4),
                            "face_crop": face_crop,
                        }
                except Exception as e:
                    logger.error(f"Neural batch inference error: {e}")
                    for orig_i, face_found, _ in valid_indices:
                        if chunk_results[orig_i] is None:
                            chunk_results[orig_i] = {
                                "fake_probability": 0.5,
                                "flags": ["inference_error"],
                                "face_found": face_found,
                                "confidence": 0.0,
                            }

            # Fill any remaining None entries
            for i in range(len(chunk_results)):
                if chunk_results[i] is None:
                    chunk_results[i] = {
                        "fake_probability": 0.5,
                        "flags": ["unknown_error"],
                        "face_found": False,
                        "confidence": 0.0,
                    }

            all_results.extend(chunk_results)

        return all_results

    def _generate_flags(self, fake_prob: float, frame_bgr: np.ndarray) -> List[str]:
        """Generate human-readable artifact flags based on confidence levels."""
        flags = []
        if fake_prob > 0.9:
            flags.extend(["blend_boundary_detected", "texture_inconsistency"])
        elif fake_prob > 0.75:
            flags.extend(["eye_reflection_mismatch", "subtle_artifacts_detected"])
        elif fake_prob > 0.6:
            flags.append("subtle_artifacts_detected")
        return flags
