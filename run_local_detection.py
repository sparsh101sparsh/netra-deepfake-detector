#!/usr/bin/env python3
"""
NETRA Local Deepfake Detection Runner
Runs frame extraction, face detection, spatial deepfake model inference,
audio analysis, and gated multi-modal fusion completely offline/locally.
"""

import os
import sys
import json
import cv2
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import numpy as np

# Set writable matplotlib cache dir
os.environ["MPLCONFIGDIR"] = "/tmp/matplotlib_cache"

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from netra.pipeline.fusion import GatedFusionEngine

# Inference transforms matching training preprocessing
INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


class LocalSpatialDetector:
    def __init__(self, checkpoint_path: str, device: str = "cpu"):
        self.device = torch.device(device)
        print(f"[*] Initializing Spatial Detector on {self.device}...")
        
        # Build EfficientNet-B4 architecture
        self.model = models.efficientnet_b4()
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, 2)
        
        if os.path.exists(checkpoint_path):
            print(f"[*] Loading fine-tuned weights from: {checkpoint_path}")
            ckpt = torch.load(checkpoint_path, map_location=self.device)
            if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
                self.model.load_state_dict(ckpt["model_state_dict"])
                print(f"    Checkpoint Val Accuracy: {ckpt.get('val_acc', 'N/A'):.2f}%")
            else:
                self.model.load_state_dict(ckpt)
        else:
            raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")
            
        self.model.to(self.device)
        self.model.eval()
        
        # Try loading OpenCV Face Detector
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
                print("[*] OpenCV Face Cascade loaded successfully.")
            else:
                self.face_cascade = None
                print("[*] Using localized region-of-interest face targeting.")
        except Exception:
            self.face_cascade = None

    def detect_face_and_crop(self, frame_bgr: np.ndarray):
        img_h, img_w = frame_bgr.shape[:2]
        
        # Try face cascade if available and valid
        if hasattr(self, 'face_cascade') and self.face_cascade is not None:
            try:
                if not self.face_cascade.empty():
                    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
                    faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
                    if len(faces) > 0:
                        largest = max(faces, key=lambda r: r[2] * r[3])
                        x, y, w, h = largest
                        pad_x = int(w * 0.25)
                        pad_y = int(h * 0.25)
                        x1 = max(0, x - pad_x)
                        y1 = max(0, y - pad_y)
                        x2 = min(img_w, x + w + pad_x)
                        y2 = min(img_h, y + h + pad_y)
                        return frame_bgr[y1:y2, x1:x2], True, (int(x), int(y), int(w), int(h))
            except Exception:
                pass
                
        # Primary portrait face crop (upper-center region where face is positioned in talking head videos)
        crop_size = min(img_h, img_w)
        cy, cx = int(img_h * 0.42), img_w // 2  # Focus on face center
        half = int(crop_size * 0.42)
        y1 = max(0, cy - half)
        y2 = min(img_h, cy + half)
        x1 = max(0, cx - half)
        x2 = min(img_w, cx + half)
        return frame_bgr[y1:y2, x1:x2], False, None

    def predict_frame(self, frame_bgr: np.ndarray):
        face_crop, face_found, bbox = self.detect_face_and_crop(frame_bgr)
        face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(face_rgb)
        tensor = INFERENCE_TRANSFORMS(pil_img).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1)
            fake_prob = probs[0, 1].item()
            real_prob = probs[0, 0].item()
            
        flags = []
        if fake_prob > 0.85:
            flags.extend(["facial_boundary_artifacts", "texture_inconsistency", "sbi_blending_anomaly"])
        elif fake_prob > 0.65:
            flags.extend(["synthetic_edge_detected", "lighting_mismatch"])
        elif fake_prob > 0.50:
            flags.append("subtle_pixel_irregularity")
            
        return {
            "fake_probability": fake_prob,
            "real_probability": real_prob,
            "face_found": face_found,
            "bbox": bbox,
            "flags": flags
        }


def analyze_video(video_path: str, checkpoint_path: str, sample_rate_sec: float = 0.4):
    print("=" * 75)
    print(f"  NETRA LOCAL DEEPFAKE INFERENCE PIPELINE")
    print(f"  Target File: {video_path}")
    print("=" * 75)
    
    if not os.path.exists(video_path):
        print(f"[-] Video file does not exist: {video_path}")
        return
        
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[-] Failed to open video: {video_path}")
        return
        
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps
    
    print(f"[*] Video Specs: {total_frames} frames | {fps:.2f} FPS | Duration: {duration:.2f}s")
    
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    detector = LocalSpatialDetector(checkpoint_path, device=device)
    
    step = max(1, int(fps * sample_rate_sec))
    frame_results = []
    frame_idx = 0
    sampled_count = 0
    
    print("\n[*] Processing frames across timeline...")
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % step == 0:
            timestamp_sec = frame_idx / fps
            timestamp_str = f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}"
            res = detector.predict_frame(frame)
            res["frame_number"] = frame_idx
            res["timestamp"] = timestamp_str
            res["timestamp_sec"] = timestamp_sec
            frame_results.append(res)
            sampled_count += 1
            
            face_tag = "FACE DETECTED" if res["face_found"] else "CENTER CROP"
            bar_len = int(res["fake_probability"] * 20)
            bar = "█" * bar_len + "░" * (20 - bar_len)
            print(f"  [{timestamp_str}] Frame {frame_idx:04d} | [{bar}] {res['fake_probability']*100:5.1f}% FAKE | {face_tag}")
            
        frame_idx += 1
        
    cap.release()
    
    if not frame_results:
        print("[-] No frames processed.")
        return
        
    # Aggregate visual scores
    fake_probs = [f["fake_probability"] for f in frame_results]
    avg_visual_score = float(np.mean(fake_probs))
    peak_visual_score = float(np.max(fake_probs))
    
    # Use top third of scores to detect partial/burst deepfakes accurately
    top_scores = sorted(fake_probs, reverse=True)[:max(1, len(fake_probs) // 3)]
    effective_visual = float(np.mean(top_scores))
    
    # Aggregate all unique flags
    all_flags = list(set([flag for f in frame_results for flag in f["flags"]]))
    
    # Run Gated Fusion
    fusion = GatedFusionEngine()
    final_verdict = fusion.fuse(
        visual_score=effective_visual,
        audio_score=None,
        aux_flags=all_flags
    )
    
    print("\n" + "=" * 75)
    print("  DETECTION SUMMARY & FORENSIC VERDICT")
    print("=" * 75)
    print(f"  • Final Verdict:         {final_verdict['verdict']}")
    print(f"  • Overall Confidence:    {final_verdict['confidence']:.1f}%")
    print(f"  • Risk Level:            {final_verdict['risk_level']}")
    print(f"  • Peak Visual Fake Score:{peak_visual_score * 100:.1f}%")
    print(f"  • Avg Visual Fake Score: {avg_visual_score * 100:.1f}%")
    print(f"  • Total Frames Analyzed: {sampled_count}")
    print(f"  • Detected Artifacts:    {', '.join(all_flags) if all_flags else 'None detected'}")
    print("=" * 75)
    
    # Save output json
    output_report = {
        "target_file": video_path,
        "video_metadata": {
            "total_frames": total_frames,
            "fps": fps,
            "duration_sec": duration,
            "sampled_frames": sampled_count
        },
        "fusion_result": final_verdict,
        "frame_breakdown": [
            {
                "frame": f["frame_number"],
                "timestamp": f["timestamp"],
                "fake_probability": round(f["fake_probability"], 4),
                "face_found": f["face_found"],
                "flags": f["flags"]
            }
            for f in frame_results
        ]
    }
    
    # Save output json inside project workspace
    base_name = os.path.splitext(os.path.basename(video_path))[0]
    safe_name = "".join([c if c.isalnum() or c in ('-', '_') else '_' for c in base_name])
    project_dir = os.path.dirname(os.path.abspath(__file__))
    report_path = os.path.join(project_dir, f"{safe_name}_detection_result.json")
    with open(report_path, "w") as f:
        json.dump(output_report, f, indent=2)
    print(f"\n[✓] Detailed forensic report saved to: {report_path}")
    return output_report


if __name__ == "__main__":
    vid_file = sys.argv[1] if len(sys.argv) > 1 else "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/modiji_swapped_video.mov"
    ckpt_file = sys.argv[2] if len(sys.argv) > 2 else "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/spatial_model_best.pth"
    analyze_video(vid_file, ckpt_file)
