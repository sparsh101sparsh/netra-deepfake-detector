"""
NETRA CLIP Linear Probe Detector
Detects: AI-generated faces from unseen generators (the "unknown unknowns").

Architecture: Frozen CLIP ViT-L/14 backbone + trainable 3-layer MLP probe head.
Based on UnivFD (Universal Fake Detector) — generalises without retraining.

Training: Done on Kaggle using IMFDB + FF++ features.
Weights: netra-ai/clip-probe-v1 on HuggingFace.
"""
import torch
import torch.nn as nn
import open_clip
from PIL import Image
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

PROBE_MODEL_PATH = os.getenv("CLIP_PROBE_PATH", None)


class CLIPProbeHead(nn.Module):
    """Lightweight MLP probe trained on top of frozen CLIP features."""

    def __init__(self, in_features: int = 768):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 2)  # Binary: real/fake
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.mlp(x)


class CLIPDeepfakeProbe:
    """
    Frozen CLIP ViT-L/14 + lightweight MLP probe.
    Only the probe head was trained — CLIP backbone is completely frozen.
    Generalises to deepfake generators released after training time.
    """

    def __init__(self, probe_path: Optional[str] = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.available = False

        try:
            # Load CLIP model (frozen backbone)
            self.clip_model, _, self.preprocess = open_clip.create_model_and_transforms(
                "ViT-L-14", pretrained="openai"
            )
            self.clip_model = self.clip_model.to(self.device)
            self.clip_model.eval()

            # Freeze ALL CLIP parameters
            for param in self.clip_model.parameters():
                param.requires_grad = False

            # Load probe head
            self.probe = CLIPProbeHead(in_features=768).to(self.device)

            if probe_path and os.path.exists(probe_path):
                logger.info(f"Loading trained CLIP probe from {probe_path}")
                state_dict = torch.load(probe_path, map_location=self.device)
                self.probe.load_state_dict(state_dict)
            else:
                logger.info("CLIP probe: using random weights (no fine-tuned probe found)")

            self.probe.eval()
            self.available = True
            logger.info("CLIPDeepfakeProbe initialized successfully")

        except Exception as e:
            logger.warning(f"CLIPDeepfakeProbe unavailable: {e}")

    def predict_frame(self, frame_path: str) -> Dict:
        """
        Run CLIP + probe inference on a single frame.
        Returns: {fake_probability, method, confidence}
        """
        if not self.available:
            return {"fake_probability": None, "method": "clip_probe", "available": False}

        try:
            img = Image.open(frame_path).convert("RGB")
            img_tensor = self.preprocess(img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                # Extract CLIP visual features
                features = self.clip_model.encode_image(img_tensor)
                features = features / features.norm(dim=-1, keepdim=True)  # L2 normalize

                # Run probe
                logits = self.probe(features.float())
                probs = torch.softmax(logits, dim=1)
                fake_prob = probs[0, 1].item()

            return {
                "fake_probability": round(fake_prob, 4),
                "method": "clip_probe",
                "available": True,
                "confidence": round(fake_prob, 4),
            }

        except Exception as e:
            logger.error(f"CLIP probe error: {e}")
            return {"fake_probability": None, "method": "clip_probe", "available": False}
