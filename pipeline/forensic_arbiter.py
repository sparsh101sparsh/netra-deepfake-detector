import os
import sys
import time
import cv2
import numpy as np
import torch
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corneal_specular_physics import CornealSpecularForensicDetector
from rppg_vascular_pulse import MelaninCalibratedRPPGDetector
from audiovisual_sync import IndicAudioVisualSyncDetector

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(WORKSPACE, "netra"))
from netra_v2 import NETRAv2
from training.augmentations import get_netra_v2_eval_transforms

class FourPillarsForensicArbiter:
    """
    NETRA Master Gated Forensic Arbiter.
    Fuses:
    1. Spatial Invariant Head (EfficientNet-B4 + LinearNorm)
    2. Indic Audio-Visual Biomechanical Alignment (Phoneme-Viseme ACCI)
    3. 3D Corneal Specular Parallax & Gaze Physics
    4. Melanin-Calibrated rPPG Blood Volume Pulse
    """
    def __init__(self, netra_ckpt_path: str = None, device: str = None):
        if device is None:
            self.device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
        else:
            self.device = torch.device(device)
            
        # Pillar 1: Spatial
        self.spatial_model = NETRAv2(freeze_backbone=False, pretrained=False)
        if netra_ckpt_path and os.path.exists(netra_ckpt_path):
            ckpt = torch.load(netra_ckpt_path, map_location=self.device)
            state = ckpt.get("model_state_dict", ckpt)
            self.spatial_model.load_state_dict(state)
        self.spatial_model.to(self.device)
        self.spatial_model.eval()
        self.transform = get_netra_v2_eval_transforms(224)
        
        # Pillar 2: Audio-Visual
        self.av_detector = IndicAudioVisualSyncDetector(fps=30.0)
        
        # Pillar 3: Ocular Physics
        self.ocular_detector = CornealSpecularForensicDetector(disparity_threshold_deg=8.5)
        
        # Pillar 4: Vascular Pulse
        self.rppg_detector = MelaninCalibratedRPPGDetector(fps=30.0)
        
        # Landmark Detector
        try:
            import insightface
            self.face_app = insightface.app.FaceAnalysis(
                name='buffalo_l',
                root=os.path.join(WORKSPACE, 'models_checkpoints'),
                providers=['CPUExecutionProvider']
            )
            self.face_app.prepare(ctx_id=-1, det_size=(640, 640))
        except Exception:
            self.face_app = None

    def extract_eye_crops(self, frame_bgr: np.ndarray):
        """Extracts left and right eye crops using landmark coordinates."""
        h, w = frame_bgr.shape[:2]
        if self.face_app is not None:
            try:
                faces = self.face_app.get(frame_bgr)
                if faces and hasattr(faces[0], 'kps'):
                    kps = faces[0].kps # 0: left_eye, 1: right_eye, 2: nose, 3: left_mouth, 4: right_mouth
                    lx, ly = int(kps[0][0]), int(kps[0][1])
                    rx, ry = int(kps[1][0]), int(kps[1][1])
                    eye_dist = max(20, int(np.linalg.norm(kps[0] - kps[1])))
                    radius = int(eye_dist * 0.35)
                    
                    left_crop = frame_bgr[max(0, ly - radius):min(h, ly + radius), max(0, lx - radius):min(w, lx + radius)]
                    right_crop = frame_bgr[max(0, ry - radius):min(h, ry + radius), max(0, rx - radius):min(w, rx + radius)]
                    if left_crop.size > 0 and right_crop.size > 0:
                        return left_crop, right_crop
            except Exception:
                pass
                
        # Fallback proportional cropping
        left_eye = frame_bgr[int(h * 0.30):int(h * 0.48), int(w * 0.22):int(w * 0.48)]
        right_eye = frame_bgr[int(h * 0.30):int(h * 0.48), int(w * 0.52):int(w * 0.78)]
        return left_eye, right_eye

    def analyze_media(
        self,
        frames_bgr: list,
        audio_signal: np.ndarray = None,
        is_single_image: bool = False
    ):
        """
        Executes multi-pillar forensic audit on input frames/video.
        """
        t0 = time.time()
        
        if not frames_bgr:
            return {"verdict": "ERROR", "error": "No frames provided"}
            
        num_frames = len(frames_bgr)
        primary_frame = frames_bgr[num_frames // 2]
        
        # --- PILLAR 1: Spatial Invariant Score ---
        rgb = cv2.cvtColor(primary_frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.spatial_model(tensor)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]
            p_fake_spatial = float(probs[1])
            
        # --- PILLAR 3: 3D Corneal Specular Physics ---
        left_eye, right_eye = self.extract_eye_crops(primary_frame)
        ocular_parity, ocular_consistent, disparity_deg, ocular_evidence = self.ocular_detector.compute_ocular_parity(left_eye, right_eye)
        p_fake_ocular = float(1.0 - ocular_parity)
        
        # --- Multi-Frame Pillars (Video) ---
        if not is_single_image and num_frames >= 15:
            # Pillar 2: Audio-Visual Biomechanics
            av_auth, acci, av_evidence = self.av_detector.compute_articulatory_correlation(frames_bgr, audio_signal)
            p_fake_av = float(1.0 - av_auth)
            
            # Pillar 4: Vascular Pulse
            rppg_auth, snr, bpm, rppg_evidence = self.rppg_detector.analyze_video_pulse(frames_bgr)
            p_fake_rppg = float(1.0 - rppg_auth)
            
            # Gated Multi-Modal Fusion (Weighted Evidence)
            # Physical light transport and biological vascular pulse act as hard vetoes
            weights = [0.35, 0.25, 0.20, 0.20] # [Spatial, AV, Ocular, Vascular]
            scores = [p_fake_spatial, p_fake_av, p_fake_ocular, p_fake_rppg]
            
            # Hard Physical Veto: If corneal reflection is impossible (>15 deg disparity) OR zero rPPG pulse
            if disparity_deg > 14.0 or (snr < 0.12 and num_frames > 45):
                composite_p_fake = max(0.92, float(np.average(scores, weights=weights)))
            else:
                composite_p_fake = float(np.average(scores, weights=weights))
                
        else:
            # Single Image / Short Clip Analysis (Spatial + Ocular Physics)
            p_fake_av = None
            av_evidence = "N/A (Single image evaluation)"
            p_fake_rppg = None
            rppg_evidence = "N/A (Requires >1.5s video for cardiac pulse)"
            
            weights = [0.70, 0.30]
            scores = [p_fake_spatial, p_fake_ocular]
            composite_p_fake = float(np.average(scores, weights=weights))
            
        elapsed_ms = (time.time() - t0) * 1000
        
        verdict = "DEEPFAKE" if composite_p_fake >= 0.50 else "AUTHENTIC"
        confidence = composite_p_fake if verdict == "DEEPFAKE" else (1.0 - composite_p_fake)
        
        return {
            "verdict": verdict,
            "confidence": round(float(confidence), 4),
            "composite_fake_probability": round(float(composite_p_fake), 4),
            "latency_ms": round(float(elapsed_ms), 2),
            "pillar_breakdown": {
                "pillar_1_spatial_invariant": {
                    "fake_probability": round(p_fake_spatial, 4),
                    "status": "FLAGGED_SYNTHETIC" if p_fake_spatial >= 0.5 else "AUTHENTIC"
                },
                "pillar_2_audiovisual_sync": {
                    "fake_probability": round(p_fake_av, 4) if p_fake_av is not None else None,
                    "evidence": av_evidence
                },
                "pillar_3_corneal_ocular_physics": {
                    "fake_probability": round(p_fake_ocular, 4),
                    "reflection_disparity_deg": disparity_deg,
                    "is_physically_consistent": ocular_consistent,
                    "evidence": ocular_evidence
                },
                "pillar_4_vascular_rppg_pulse": {
                    "fake_probability": round(p_fake_rppg, 4) if p_fake_rppg is not None else None,
                    "evidence": rppg_evidence
                }
            }
        }
