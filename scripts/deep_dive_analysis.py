#!/usr/bin/env python3
"""
Deep-Dive Forensic Analysis: Image-by-Image Diagnostic of Local Swapped Deepfakes & Real Portraits.
Analyzes every image, computes raw logits, image statistics, error categorization,
and diagnoses why NETRA fails vs GenD.
"""

import os
import sys
import glob
import cv2
import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image

WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SWAPS_DIR = os.path.join(WORKSPACE, "batch_benchmark_results", "generated_swaps")
DATASET_DIR = os.path.join(WORKSPACE, "dataset")
REPORTS_DIR = os.path.join(WORKSPACE, "benchmark_reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

NETRA_CKPT = os.path.join(WORKSPACE, "netra", "spatial_model_best.pth")

device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))

# -------------------------------------------------------------
# 1. Load NETRA Model
# -------------------------------------------------------------
netra_model = models.efficientnet_b4(weights=None)
netra_model.classifier[1] = nn.Linear(netra_model.classifier[1].in_features, 2)
if os.path.exists(NETRA_CKPT):
    ckpt = torch.load(NETRA_CKPT, map_location=device)
    state = ckpt.get("model_state_dict", ckpt)
    netra_model.load_state_dict(state)
netra_model.to(device)
netra_model.eval()

netra_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# -------------------------------------------------------------
# 2. Load GenD Model
# -------------------------------------------------------------
from transformers import CLIPModel, CLIPProcessor
from safetensors.torch import load_file
from huggingface_hub import hf_hub_download

class LinearProbe(nn.Module):
    def __init__(self, input_dim, num_classes, normalize_inputs=False):
        super().__init__()
        self.linear = nn.Linear(input_dim, num_classes)
        self.normalize_inputs = normalize_inputs

    def forward(self, x: torch.Tensor, **kwargs):
        if self.normalize_inputs:
            x = F.normalize(x, p=2, dim=1)
        return self.linear(x)

class CLIPEncoder(nn.Module):
    def __init__(self, model_name="openai/clip-vit-large-patch14"):
        super().__init__()
        self._preprocess = CLIPProcessor.from_pretrained(model_name)
        clip = CLIPModel.from_pretrained(model_name)
        self.vision_model = clip.vision_model
        self.model_name = model_name
        self.features_dim = self.vision_model.config.hidden_size
        self.visual_projection = clip.visual_projection

    def preprocess(self, image: Image.Image) -> torch.Tensor:
        return self._preprocess(images=image, return_tensors="pt")["pixel_values"][0]

    def forward(self, preprocessed_images: torch.Tensor) -> torch.Tensor:
        return self.vision_model(preprocessed_images).pooler_output

    def get_features_dim(self):
        return self.features_dim

class GenDModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.feature_extractor = CLIPEncoder("openai/clip-vit-large-patch14")
        self.model = LinearProbe(self.feature_extractor.get_features_dim(), 2, normalize_inputs=True)
        ckpt_path = hf_hub_download(repo_id="yermandy/GenD_CLIP_L_14", filename="model.safetensors")
        self.load_state_dict(load_file(ckpt_path))
        self.to(device)
        self.eval()

    def forward(self, x):
        features = self.feature_extractor(x)
        return self.model(features)

gend_model = GenDModel()

# -------------------------------------------------------------
# 3. Image Feature Analysis Helpers
# -------------------------------------------------------------
def compute_image_stats(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    mean_lum = float(np.mean(gray))
    std_lum = float(np.std(gray))
    
    # Sharpness (Laplacian variance)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    
    # High frequency residual (median filter subtraction)
    med = cv2.medianBlur(gray, 3)
    high_freq = float(np.mean(np.abs(gray.astype(float) - med.astype(float))))
    
    return {
        "brightness": round(mean_lum, 2),
        "contrast_rms": round(std_lum, 2),
        "sharpness_laplacian": round(laplacian_var, 2),
        "high_freq_energy": round(high_freq, 2)
    }

def crop_face(img_bgr):
    h, w = img_bgr.shape[:2]
    c_size = min(h, w)
    cy, cx = int(h * 0.45), w // 2
    half = int(c_size * 0.42)
    crop = img_bgr[max(0, cy - half):min(h, cy + half), max(0, cx - half):min(w, cx + half)]
    if crop.size == 0:
        crop = img_bgr
    return crop

def analyze_all_images():
    swap_files = sorted(glob.glob(os.path.join(SWAPS_DIR, "*.jpg")))
    
    analysis_results = []
    
    netra_tp = 0 # Detected fake correctly
    netra_fn = 0 # Fake missed (thought real)
    netra_tn = 0 # Real detected real
    netra_fp = 0 # Real misclassified as fake
    
    print(f"=== ANALYZING {len(swap_files)} SWAPPED IMAGES + 78 REAL PORTRAITS ===")
    
    for s_path in swap_files:
        fname = os.path.basename(s_path)
        parts = fname.replace(".jpg", "").split("_")[2:]
        figure_name = "_".join(parts)
        
        # 1. Analyze Fake Swapped Image
        img_fake_bgr = cv2.imread(s_path)
        stats_fake = compute_image_stats(img_fake_bgr)
        crop_fake = crop_face(img_fake_bgr)
        pil_fake = Image.fromarray(cv2.cvtColor(crop_fake, cv2.COLOR_BGR2RGB))
        
        # NETRA Inference
        t_netra = netra_transform(pil_fake).unsqueeze(0).to(device)
        with torch.no_grad():
            logits_netra = netra_model(t_netra)
            probs_netra = torch.softmax(logits_netra, dim=1).cpu().numpy()[0]
            netra_fake_prob = float(probs_netra[1])
            netra_l0, netra_l1 = float(logits_netra[0, 0]), float(logits_netra[0, 1])
            
        # GenD Inference
        t_gend = gend_model.feature_extractor.preprocess(pil_fake).unsqueeze(0).to(device)
        with torch.no_grad():
            logits_gend = gend_model(t_gend)
            probs_gend = F.softmax(logits_gend, dim=-1).cpu().numpy()[0]
            gend_fake_prob = float(probs_gend[1])
            gend_l0, gend_l1 = float(logits_gend[0, 0]), float(logits_gend[0, 1])
            
        netra_correct_fake = netra_fake_prob >= 0.5
        if netra_correct_fake:
            netra_tp += 1
            fake_status = "TRUE_POSITIVE (Detected Fake)"
        else:
            netra_fn += 1
            fake_status = "FALSE_NEGATIVE (Missed Deepfake)"
            
        # 2. Analyze Corresponding Real Image
        fig_dir = os.path.join(DATASET_DIR, figure_name)
        real_imgs = sorted([f for f in glob.glob(os.path.join(fig_dir, "*.jpg")) + glob.glob(os.path.join(fig_dir, "*.png")) if not f.endswith(".tmp.jpg")]) if os.path.exists(fig_dir) else []
        
        real_info = None
        if real_imgs:
            r_path = real_imgs[0]
            img_real_bgr = cv2.imread(r_path)
            stats_real = compute_image_stats(img_real_bgr)
            crop_real = crop_face(img_real_bgr)
            pil_real = Image.fromarray(cv2.cvtColor(crop_real, cv2.COLOR_BGR2RGB))
            
            # NETRA
            t_netra_r = netra_transform(pil_real).unsqueeze(0).to(device)
            with torch.no_grad():
                logits_r = netra_model(t_netra_r)
                probs_r = torch.softmax(logits_r, dim=1).cpu().numpy()[0]
                netra_real_fake_prob = float(probs_r[1])
                netra_r_l0, netra_r_l1 = float(logits_r[0, 0]), float(logits_r[0, 1])
                
            # GenD
            t_gend_r = gend_model.feature_extractor.preprocess(pil_real).unsqueeze(0).to(device)
            with torch.no_grad():
                logits_g_r = gend_model(t_gend_r)
                probs_g_r = F.softmax(logits_g_r, dim=-1).cpu().numpy()[0]
                gend_real_fake_prob = float(probs_g_r[1])
                gend_r_l0, gend_r_l1 = float(logits_g_r[0, 0]), float(logits_g_r[0, 1])
                
            if netra_real_fake_prob < 0.5:
                netra_tn += 1
                real_status = "TRUE_NEGATIVE (Correct Real)"
            else:
                netra_fp += 1
                real_status = "FALSE_POSITIVE (False Alarm on Real)"
                
            real_info = {
                "real_filename": os.path.basename(r_path),
                "stats": stats_real,
                "netra_fake_prob": round(netra_real_fake_prob, 4),
                "netra_logits": [round(netra_r_l0, 3), round(netra_r_l1, 3)],
                "gend_fake_prob": round(gend_real_fake_prob, 4),
                "gend_logits": [round(gend_r_l0, 3), round(gend_r_l1, 3)],
                "netra_status": real_status
            }
            
        entry = {
            "figure": figure_name,
            "swap_filename": fname,
            "fake_stats": stats_fake,
            "netra_fake_prob": round(netra_fake_prob, 4),
            "netra_logits": [round(netra_l0, 3), round(netra_l1, 3)],
            "gend_fake_prob": round(gend_fake_prob, 4),
            "gend_logits": [round(gend_l0, 3), round(gend_l1, 3)],
            "netra_fake_status": fake_status,
            "real_comparison": real_info
        }
        analysis_results.append(entry)
        
    print(f"\n--- NETRA Diagnostic Confusion Summary on Local Swaps ---")
    print(f"  • True Positives (Detected Fakes):   {netra_tp} / 78 ({netra_tp/78*100:.1f}%)")
    print(f"  • False Negatives (Missed Fakes):    {netra_fn} / 78 ({netra_fn/78*100:.1f}%)")
    print(f"  • True Negatives (Correct Reals):    {netra_tn} / 78 ({netra_tn/78*100:.1f}%)")
    print(f"  • False Positives (False Alarms):    {netra_fp} / 78 ({netra_fp/78*100:.1f}%)")
    
    # Save full analysis json
    diagnostic_path = os.path.join(REPORTS_DIR, "deep_dive_diagnostic_analysis.json")
    with open(diagnostic_path, "w") as f:
        json.dump({
            "summary": {
                "total_swaps": len(swap_files),
                "netra_tp": netra_tp,
                "netra_fn": netra_fn,
                "netra_tn": netra_tn,
                "netra_fp": netra_fp,
                "netra_fake_recall": round(netra_tp/78*100, 2),
                "netra_real_specificity": round(netra_tn/78*100, 2)
            },
            "detailed_images": analysis_results
        }, f, indent=2)
        
    print(f"Saved full diagnostic report to: {diagnostic_path}\n")

if __name__ == "__main__":
    analyze_all_images()
