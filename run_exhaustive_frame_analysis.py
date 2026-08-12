#!/usr/bin/env python3
"""
NETRA Dense Exhaustive Frame-by-Frame Analyzer
Analyzes EVERY SINGLE FRAME (100% frame coverage, stride=1) across all videos
using PyTorch GPU batching on Apple Silicon MPS.
"""

import os
import sys
import json
import time
import cv2
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import numpy as np

os.environ["MPLCONFIGDIR"] = "/tmp/matplotlib_cache"

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from netra.pipeline.fusion import GatedFusionEngine

INFERENCE_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


class DenseSpatialAnalyzer:
    def __init__(self, checkpoint_path: str):
        self.device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
        print(f"[*] Initializing Dense Spatial Model on: {self.device}")
        
        self.model = models.efficientnet_b4()
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, 2)
        
        if os.path.exists(checkpoint_path):
            ckpt = torch.load(checkpoint_path, map_location=self.device)
            if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
                self.model.load_state_dict(ckpt["model_state_dict"])
            else:
                self.model.load_state_dict(ckpt)
            print(f"[*] Loaded weights from {os.path.basename(checkpoint_path)}")
        else:
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
            
        self.model.to(self.device)
        self.model.eval()

    def crop_portrait_roi(self, frame_bgr: np.ndarray):
        img_h, img_w = frame_bgr.shape[:2]
        crop_size = min(img_h, img_w)
        cy, cx = int(img_h * 0.42), img_w // 2
        half = int(crop_size * 0.42)
        y1 = max(0, cy - half)
        y2 = min(img_h, cy + half)
        x1 = max(0, cx - half)
        x2 = min(img_w, cx + half)
        return frame_bgr[y1:y2, x1:x2]

    def analyze_video_exhaustive(self, video_path: str, batch_size: int = 16):
        video_name = os.path.basename(video_path)
        print("\n" + "=" * 80)
        print(f"  EXHAUSTIVE (100% FRAME) SCAN: {video_name}")
        print("=" * 80)
        
        if not os.path.exists(video_path):
            print(f"[-] File not found: {video_path}")
            return None
            
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[-] Could not open video: {video_path}")
            return None
            
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        print(f"[*] Video Details: {total_frames} total frames | {fps:.2f} FPS | Duration: {duration:.2f}s")
        print(f"[*] Processing 100% of frames (stride=1, batch_size={batch_size})...")
        
        t0 = time.time()
        all_frames_data = []
        batch_tensors = []
        batch_metadata = []
        
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            timestamp_sec = frame_idx / fps
            timestamp_str = f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}"
            
            face_roi = self.crop_portrait_roi(frame)
            face_rgb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(face_rgb)
            tensor = INFERENCE_TRANSFORMS(pil_img)
            
            batch_tensors.append(tensor)
            batch_metadata.append({
                "frame_idx": frame_idx,
                "timestamp_str": timestamp_str,
                "timestamp_sec": timestamp_sec
            })
            
            if len(batch_tensors) == batch_size:
                batch_tensor_stacked = torch.stack(batch_tensors).to(self.device)
                with torch.no_grad():
                    logits = self.model(batch_tensor_stacked)
                    probs = torch.softmax(logits, dim=1)
                    fake_probs = probs[:, 1].cpu().numpy().tolist()
                    
                for meta, f_prob in zip(batch_metadata, fake_probs):
                    all_frames_data.append({
                        "frame": meta["frame_idx"],
                        "timestamp": meta["timestamp_str"],
                        "timestamp_sec": meta["timestamp_sec"],
                        "fake_probability": round(float(f_prob), 4)
                    })
                batch_tensors = []
                batch_metadata = []
                
            frame_idx += 1
            
        # Process remainder
        if batch_tensors:
            batch_tensor_stacked = torch.stack(batch_tensors).to(self.device)
            with torch.no_grad():
                logits = self.model(batch_tensor_stacked)
                probs = torch.softmax(logits, dim=1)
                fake_probs = probs[:, 1].cpu().numpy().tolist()
                
            for meta, f_prob in zip(batch_metadata, fake_probs):
                all_frames_data.append({
                    "frame": meta["frame_idx"],
                    "timestamp": meta["timestamp_str"],
                    "timestamp_sec": meta["timestamp_sec"],
                    "fake_probability": round(float(f_prob), 4)
                })
                
        cap.release()
        elapsed = time.time() - t0
        print(f"[✓] Scanned all {len(all_frames_data)} frames in {elapsed:.2f}s ({len(all_frames_data)/max(0.01, elapsed):.1f} FPS)")
        
        # Statistics
        scores = [f["fake_probability"] for f in all_frames_data]
        mean_score = float(np.mean(scores))
        median_score = float(np.median(scores))
        std_score = float(np.std(scores))
        peak_score = float(np.max(scores))
        min_score = float(np.min(scores))
        
        high_fake_frames = sum(1 for s in scores if s >= 0.80)
        medium_fake_frames = sum(1 for s in scores if 0.50 <= s < 0.80)
        clean_frames = sum(1 for s in scores if s < 0.50)
        
        # Top 30% metric
        top_scores = sorted(scores, reverse=True)[:max(1, len(scores) // 3)]
        effective_score = float(np.mean(top_scores))
        
        # Fusion
        fusion = GatedFusionEngine()
        flags = []
        if effective_score > 0.80:
            flags.extend(["dense_temporal_boundary_artifacts", "sbi_blending_anomaly"])
        if std_score > 0.25:
            flags.append("temporal_instability_detected")
            
        verdict_res = fusion.fuse(visual_score=effective_score, audio_score=None, aux_flags=flags)
        
        summary = {
            "video_name": video_name,
            "video_path": video_path,
            "total_frames": len(all_frames_data),
            "duration_sec": duration,
            "scan_fps": round(len(all_frames_data) / max(0.01, elapsed), 1),
            "verdict": verdict_res["verdict"],
            "confidence": verdict_res["confidence"],
            "risk_level": verdict_res["risk_level"],
            "effective_score": round(effective_score, 4),
            "mean_score": round(mean_score, 4),
            "median_score": round(median_score, 4),
            "std_dev": round(std_score, 4),
            "peak_score": round(peak_score, 4),
            "min_score": round(min_score, 4),
            "frame_distribution": {
                "high_fake_ge_80pct": high_fake_frames,
                "medium_fake_50_to_80pct": medium_fake_frames,
                "clean_lt_50pct": clean_frames,
                "pct_frames_flagged_fake": round((high_fake_frames + medium_fake_frames) / len(all_frames_data) * 100, 1)
            },
            "frame_by_frame": all_frames_data
        }
        
        # Save individual JSON
        safe_name = "".join([c if c.isalnum() or c in ('-', '_') else '_' for c in os.path.splitext(video_name)[0]])
        out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"dense_{safe_name}.json")
        with open(out_path, "w") as f:
            json.dump(summary, f, indent=2)
            
        return summary


def main():
    checkpoint = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/spatial_model_best.pth"
    analyzer = DenseSpatialAnalyzer(checkpoint)
    
    videos = [
        "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/modiji_swapped_video.mov",
        "/Users/iamsparsh00321/Downloads/Movie on 04-08-26 at 10.52\u202fPM.mov",
        "/Users/iamsparsh00321/Downloads/nahtscrazy.mov"
    ]
    
    results = []
    for vid in videos:
        res = analyzer.analyze_video_exhaustive(vid)
        if res:
            results.append(res)
            
    # Save combined report
    combined_path = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/dense_exhaustive_comparison.json"
    with open(combined_path, "w") as f:
        json.dump(results, f, indent=2)
        
    print("\n" + "=" * 80)
    print("  ALL 3 VIDEOS EXHAUSTIVE COMPARISON SUMMARY")
    print("=" * 80)
    for r in results:
        dist = r["frame_distribution"]
        print(f"  • {r['video_name']}:")
        print(f"      Frames: {r['total_frames']} ({r['duration_sec']:.2f}s) | Verdict: {r['verdict']} ({r['confidence']}%)")
        print(f"      Mean Score: {r['mean_score']*100:.1f}% | Median: {r['median_score']*100:.1f}% | Peak: {r['peak_score']*100:.1f}% | Min: {r['min_score']*100:.1f}%")
        print(f"      Frame Distribution: 🔴 High (>80%): {dist['high_fake_ge_80pct']} | 🟡 Med (50-80%): {dist['medium_fake_50_to_80pct']} | 🟢 Clean (<50%): {dist['clean_lt_50pct']} ({dist['pct_frames_flagged_fake']}% flagged)")
    print("=" * 80)


if __name__ == "__main__":
    main()
