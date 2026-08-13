import os
import sys
import time
import torch
import numpy as np
from PIL import Image

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(WORKSPACE, "netra"))
sys.path.insert(0, os.path.join(WORKSPACE, "netra", "training"))

from netra_v2 import NETRAv2
from augmentations import get_netra_v2_eval_transforms

class CascadeDetector:
    """
    Two-Stage Cascaded Deepfake Detector:
    - Stage 1: NETRA V2 (EfficientNet-B4 + LinearNorm Head) ~29ms
    - Stage 2: GenD (CLIP-ViT-L/14 Foundation Model) ~110ms
    """
    def __init__(
        self,
        netra_checkpoint_path: str = None,
        t_low: float = 0.25,
        t_high: float = 0.75,
        device: str = None
    ):
        if device is None:
            self.device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
        else:
            self.device = torch.device(device)
            
        self.t_low = t_low
        self.t_high = t_high
        self.transform = get_netra_v2_eval_transforms(224)
        
        # Load NETRA V2
        self.netra = NETRAv2(freeze_backbone=False, pretrained=False)
        if netra_checkpoint_path and os.path.exists(netra_checkpoint_path):
            ckpt = torch.load(netra_checkpoint_path, map_location=self.device)
            state = ckpt.get("model_state_dict", ckpt)
            self.netra.load_state_dict(state)
        self.netra.to(self.device)
        self.netra.eval()
        
        # Lazy load GenD (only when instantiated or first escalation)
        self._gend = None

    @property
    def gend(self):
        if self._gend is None:
            from scripts.benchmark_local_swaps import GenDEvaluator
            self._gend = GenDEvaluator()
        return self._gend

    def predict_image(self, pil_img: Image.Image):
        """
        Runs cascaded inference:
        1. Fast NETRA pass (Stage 1)
        2. Escalates to GenD (Stage 2) ONLY if probability falls within [t_low, t_high]
        """
        t0 = time.time()
        
        # Stage 1: NETRA V2
        tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.netra(tensor)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
            p_fake = float(probs[1])
            
        stage1_time = (time.time() - t0) * 1000
        
        # Check Decision Boundaries
        if p_fake < self.t_low:
            return {
                "verdict": "REAL",
                "is_fake": 0,
                "confidence": round(1.0 - p_fake, 4),
                "p_fake": round(p_fake, 4),
                "deciding_stage": "STAGE_1_NETRA",
                "escalated": False,
                "latency_ms": round(stage1_time, 2)
            }
            
        if p_fake > self.t_high:
            return {
                "verdict": "FAKE",
                "is_fake": 1,
                "confidence": round(p_fake, 4),
                "p_fake": round(p_fake, 4),
                "deciding_stage": "STAGE_1_NETRA",
                "escalated": False,
                "latency_ms": round(stage1_time, 2)
            }
            
        # Stage 2: Escalate to GenD (Oracle Arbiter)
        t_stage2 = time.time()
        gend_fake_prob = self.gend.predict_image(pil_img)
        total_time = (time.time() - t0) * 1000
        
        return {
            "verdict": "FAKE" if gend_fake_prob >= 0.5 else "REAL",
            "is_fake": 1 if gend_fake_prob >= 0.5 else 0,
            "confidence": round(gend_fake_prob if gend_fake_prob >= 0.5 else (1.0 - gend_fake_prob), 4),
            "p_fake": round(gend_fake_prob, 4),
            "stage1_p_fake": round(p_fake, 4),
            "deciding_stage": "STAGE_2_GEND",
            "escalated": True,
            "latency_ms": round(total_time, 2)
        }
