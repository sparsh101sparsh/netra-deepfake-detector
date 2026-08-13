#!/usr/bin/env python3
"""
Comprehensive Multi-Model Deepfake Benchmark Suite:
1. NETRA (Our Spatial Biometric Model - EfficientNet-B4)
2. MesoNet (Meso4 & MesoInception4)
3. GenD (CLIP-ViT-L/14 - SOTA Cross-Dataset Academic Leader)

Evaluated on the SDFVD (Small DeepFake Video Dataset) Benchmark (53 Real + 53 Fake MP4s).
Generates JSON statistics, matplotlib comparison plots, and outputs summary metrics.
"""

import os
import sys
import time
import json
import glob
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from sklearn.metrics import roc_curve, auc, confusion_matrix, precision_recall_fscore_support, accuracy_score

WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SDFVD_DIR = os.path.join(WORKSPACE, "benchmark_datasets", "SDFVD")
REPORTS_DIR = os.path.join(WORKSPACE, "benchmark_reports")
PLOTS_DIR = os.path.join(REPORTS_DIR, "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)

NETRA_CKPT = os.path.join(WORKSPACE, "netra", "spatial_model_best.pth")
MESO_DIR = os.path.join(WORKSPACE, "otherdeepfakemodelthatwehavetobenchmarkagainest")
sys.path.insert(0, MESO_DIR)
from mesonet_pytorch import Meso4, MesoInception4

device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
print(f"Using Compute Device: {device}")

# -------------------------------------------------------------
# 1. NETRA Spatial Detector Definition
# -------------------------------------------------------------
class NetraSpatialDetector:
    def __init__(self, checkpoint_path):
        self.model = models.efficientnet_b4(weights=None)
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, 2)
        if os.path.exists(checkpoint_path):
            ckpt = torch.load(checkpoint_path, map_location=device)
            self.model.load_state_dict(ckpt.get("model_state_dict", ckpt))
        self.model.to(device)
        self.model.eval()
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict(self, crops):
        if not crops: return 0.5
        tensors = []
        for c in crops:
            rgb = cv2.cvtColor(c, cv2.COLOR_BGR2RGB)
            tensors.append(self.transform(Image.fromarray(rgb)))
        batch = torch.stack(tensors).to(device)
        with torch.no_grad():
            probs = torch.softmax(self.model(batch), dim=1)[:, 1].cpu().numpy()
        return float(np.mean(probs))

# -------------------------------------------------------------
# 2. MesoNet Evaluator
# -------------------------------------------------------------
class MesoNetEvaluator:
    def __init__(self, model_class, weight_filename):
        self.model = model_class()
        weight_path = os.path.join(MESO_DIR, "pytorch_weights", weight_filename)
        if os.path.exists(weight_path):
            state = torch.load(weight_path, map_location=device)
            self.model.load_state_dict(state)
        self.model.to(device)
        self.model.eval()
        self.transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor()
        ])

    def predict(self, crops):
        if not crops: return 0.5
        tensors = []
        for c in crops:
            rgb = cv2.cvtColor(c, cv2.COLOR_BGR2RGB)
            tensors.append(self.transform(Image.fromarray(rgb)))
        batch = torch.stack(tensors).to(device)
        with torch.no_grad():
            real_scores = self.model(batch).view(-1).cpu().numpy()
        # In MesoNet: ~1.0 = Real, ~0.0 = Fake. Fake Prob = 1.0 - real_score
        fake_probs = 1.0 - real_scores
        return float(np.mean(fake_probs))

# -------------------------------------------------------------
# 3. GenD (CLIP-ViT-L/14) SOTA Architecture
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

class GenDEvaluator(nn.Module):
    def __init__(self):
        super().__init__()
        self.feature_extractor = CLIPEncoder("openai/clip-vit-large-patch14")
        self.model = LinearProbe(self.feature_extractor.get_features_dim(), 2, normalize_inputs=True)
        
        ckpt_path = hf_hub_download(repo_id="yermandy/GenD_CLIP_L_14", filename="model.safetensors")
        state_dict = load_file(ckpt_path)
        self.load_state_dict(state_dict)
        self.to(device)
        self.eval()

    def predict(self, crops):
        if not crops: return 0.5
        tensors = []
        for c in crops:
            rgb = cv2.cvtColor(c, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            tensors.append(self.feature_extractor.preprocess(pil_img))
        batch = torch.stack(tensors).to(device)
        with torch.no_grad():
            features = self.feature_extractor(batch)
            logits = self.model(features)
            # Class 0: Real, Class 1: Fake
            fake_probs = F.softmax(logits, dim=-1)[:, 1].cpu().numpy()
        return float(np.mean(fake_probs))

# -------------------------------------------------------------
# 4. Face Cropping & Video Sampling Helper
# -------------------------------------------------------------
def extract_video_crops(video_path, num_frames=8):
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        return []
        
    frame_indices = np.linspace(0, total_frames - 1, min(num_frames, total_frames), dtype=int)
    crops = []
    
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret or frame is None:
            continue
            
        h, w = frame.shape[:2]
        c_size = min(h, w)
        cy, cx = int(h * 0.45), w // 2
        half = int(c_size * 0.38)
        crop = frame[max(0, cy - half):min(h, cy + half), max(0, cx - half):min(w, cx + half)]
        if crop.size > 0:
            crops.append(crop)
            
    cap.release()
    return crops

# -------------------------------------------------------------
# 5. Benchmark Execution Loop
# -------------------------------------------------------------
def run_benchmark():
    print("================================================================")
    print("      INITIALIZING MODELS FOR MULTI-MODEL BENCHMARK")
    print("================================================================")
    
    t0 = time.time()
    netra = NetraSpatialDetector(NETRA_CKPT)
    print("✅ NETRA (EfficientNet-B4 Spatial Detector) Loaded")
    
    meso4 = MesoNetEvaluator(Meso4, "Meso4_DF.pth")
    print("✅ MesoNet Meso-4 (DF Weights) Loaded")
    
    meso_incept = MesoNetEvaluator(MesoInception4, "MesoInception_DF.pth")
    print("✅ MesoNet MesoInception-4 (DF Weights) Loaded")
    
    gend = GenDEvaluator()
    print("✅ GenD (CLIP-ViT-L/14 Foundation Model) Loaded")
    print(f"Models initialization completed in {time.time() - t0:.2f}s\n")

    # Load SDFVD Dataset metadata
    metadata_path = os.path.join(SDFVD_DIR, "metadata.json")
    with open(metadata_path, "r") as f:
        meta = json.load(f)
        
    items = meta["items"]
    print(f"Running Benchmark on {len(items)} videos ({meta['total_fake']} Fake, {meta['total_real']} Real)...")
    
    results = []
    latencies = {"NETRA": [], "GenD": [], "MesoInception4": [], "Meso4": []}
    
    for i, item in enumerate(items, 1):
        v_path = os.path.join(WORKSPACE, item["relative_path"])
        ground_truth = item["is_manipulated"] # 1 = Fake, 0 = Real
        label_str = item["label"].upper()
        
        crops = extract_video_crops(v_path, num_frames=8)
        
        # NETRA Inference
        t_start = time.time()
        netra_score = netra.predict(crops)
        latencies["NETRA"].append((time.time() - t_start) * 1000)
        
        # GenD Inference
        t_start = time.time()
        gend_score = gend.predict(crops)
        latencies["GenD"].append((time.time() - t_start) * 1000)
        
        # MesoInception4 Inference
        t_start = time.time()
        meso_incept_score = meso_incept.predict(crops)
        latencies["MesoInception4"].append((time.time() - t_start) * 1000)
        
        # Meso4 Inference
        t_start = time.time()
        meso4_score = meso4.predict(crops)
        latencies["Meso4"].append((time.time() - t_start) * 1000)
        
        res = {
            "index": i,
            "filename": item["filename"],
            "ground_truth": ground_truth,
            "ground_truth_label": label_str,
            "netra_score": round(netra_score, 4),
            "gend_score": round(gend_score, 4),
            "meso_incept_score": round(meso_incept_score, 4),
            "meso4_score": round(meso4_score, 4),
            "netra_pred": 1 if netra_score >= 0.5 else 0,
            "gend_pred": 1 if gend_score >= 0.5 else 0,
            "meso_incept_pred": 1 if meso_incept_score >= 0.5 else 0,
            "meso4_pred": 1 if meso4_score >= 0.5 else 0,
        }
        results.append(res)
        
        if i % 15 == 0 or i == len(items):
            print(f"[{i:3d}/{len(items)}] {item['filename']:<10} ({label_str:<4}) | NETRA: {netra_score:.3f} | GenD: {gend_score:.3f} | MesoIncept: {meso_incept_score:.3f} | Meso4: {meso4_score:.3f}")

    # -------------------------------------------------------------
    # 6. Compute Statistical Metrics
    # -------------------------------------------------------------
    y_true = np.array([r["ground_truth"] for r in results])
    
    models_dict = {
        "NETRA (Ours)": (np.array([r["netra_score"] for r in results]), np.array([r["netra_pred"] for r in results]), np.mean(latencies["NETRA"])),
        "GenD (CLIP-L/14)": (np.array([r["gend_score"] for r in results]), np.array([r["gend_pred"] for r in results]), np.mean(latencies["GenD"])),
        "MesoInception-4": (np.array([r["meso_incept_score"] for r in results]), np.array([r["meso_incept_pred"] for r in results]), np.mean(latencies["MesoInception4"])),
        "MesoNet-4": (np.array([r["meso4_score"] for r in results]), np.array([r["meso4_pred"] for r in results]), np.mean(latencies["Meso4"])),
    }
    
    metrics = {}
    
    print("\n" + "=" * 105)
    print(f"{'MODEL':<20} | {'ACCURACY':<10} | {'AUC-ROC':<10} | {'PRECISION':<10} | {'RECALL':<10} | {'SPECIFICITY':<12} | {'F1-SCORE':<10} | {'LATENCY (ms)'}")
    print("=" * 105)
    
    for name, (scores, preds, avg_lat) in models_dict.items():
        acc = accuracy_score(y_true, preds) * 100
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, preds, average='binary', zero_division=0)
        prec, rec, f1 = prec * 100, rec * 100, f1 * 100
        
        fpr, tpr, _ = roc_curve(y_true, scores)
        roc_auc = auc(fpr, tpr) * 100
        
        tn, fp, fn, tp = confusion_matrix(y_true, preds).ravel()
        spec = (tn / (tn + fp)) * 100 if (tn + fp) > 0 else 0.0
        
        metrics[name] = {
            "accuracy": round(acc, 2),
            "auc_roc": round(roc_auc, 2),
            "precision": round(prec, 2),
            "recall": round(rec, 2),
            "specificity": round(spec, 2),
            "f1_score": round(f1, 2),
            "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
            "latency_ms": round(avg_lat, 2),
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
        }
        
        print(f"{name:<20} | {acc:>8.2f}% | {roc_auc:>8.2f}% | {prec:>8.2f}% | {rec:>8.2f}% | {spec:>10.2f}% | {f1:>8.2f}% | {avg_lat:>8.2f} ms")

    print("=" * 105)

    # -------------------------------------------------------------
    # 7. Generate Visual Comparison Plots
    # -------------------------------------------------------------
    print("\nGenerating Benchmark Visualizations...")
    
    # 1. ROC Curves Plot
    plt.figure(figsize=(8, 6), dpi=300)
    colors = {"NETRA (Ours)": "#00f0ff", "GenD (CLIP-L/14)": "#a855f7", "MesoInception-4": "#f59e0b", "MesoNet-4": "#ef4444"}
    plt.style.use('dark_background')
    
    for name in models_dict.keys():
        fpr = metrics[name]["fpr"]
        tpr = metrics[name]["tpr"]
        auc_val = metrics[name]["auc_roc"]
        lw = 2.5 if "NETRA" in name or "GenD" in name else 1.5
        plt.plot(fpr, tpr, color=colors[name], lw=lw, label=f'{name} (AUC = {auc_val:.1f}%)')
        
    plt.plot([0, 1], [0, 1], color='#666666', lw=1.2, linestyle='--', label='Random Chance (50%)')
    plt.xlim([-0.02, 1.02])
    plt.ylim([-0.02, 1.05])
    plt.xlabel('False Positive Rate (1 - Specificity)', fontsize=11, fontweight='bold', color='#e0e0e0')
    plt.ylabel('True Positive Rate (Recall / Sensitivity)', fontsize=11, fontweight='bold', color='#e0e0e0')
    plt.title('Receiver Operating Characteristic (ROC) Comparison (SDFVD)', fontsize=13, fontweight='bold', pad=15, color='#ffffff')
    plt.legend(loc="lower right", frameon=True, facecolor='#111118', edgecolor='#333344', fontsize=9.5)
    plt.grid(True, linestyle=':', alpha=0.3, color='#555566')
    plt.tight_layout()
    roc_plot_path = os.path.join(PLOTS_DIR, "roc_curves_comparison.png")
    plt.savefig(roc_plot_path)
    plt.close()
    print(f"  • Saved ROC Plot: {roc_plot_path}")

    # 2. Confusion Matrices Plot
    fig, axes = plt.subplots(1, 4, figsize=(18, 4.5), dpi=300)
    fig.patch.set_facecolor('#0d0d12')
    
    for ax, name in zip(axes, models_dict.keys()):
        tn = metrics[name]["tn"]
        fp = metrics[name]["fp"]
        fn = metrics[name]["fn"]
        tp = metrics[name]["tp"]
        cm = np.array([[tn, fp], [fn, tp]])
        
        ax.set_facecolor('#14141c')
        im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.magma)
        ax.set_title(name, fontsize=12, fontweight='bold', color='#ffffff', pad=10)
        
        tick_marks = np.arange(2)
        ax.set_xticks(tick_marks)
        ax.set_yticks(tick_marks)
        ax.set_xticklabels(['Real', 'Fake'], color='#cccccc', fontsize=10)
        ax.set_yticklabels(['Real', 'Fake'], color='#cccccc', fontsize=10)
        
        thresh = cm.max() / 2.
        for r in range(2):
            for c in range(2):
                ax.text(c, r, f"{cm[r, c]}\n({cm[r, c]/53*100:.0f}%)",
                        ha="center", va="center",
                        color="white" if cm[r, c] < thresh else "black",
                        fontsize=11, fontweight='bold')
                        
        ax.set_xlabel('Predicted Label', color='#aaaaaa', fontsize=10)
        if ax == axes[0]:
            ax.set_ylabel('True Label', color='#aaaaaa', fontsize=10)
        ax.tick_params(colors='#888888')
        
    plt.suptitle('Confusion Matrices Comparison (SDFVD 106 Videos: 53 Real / 53 Fake)', fontsize=14, fontweight='bold', color='#ffffff', y=1.03)
    plt.tight_layout()
    cm_plot_path = os.path.join(PLOTS_DIR, "confusion_matrices_comparison.png")
    plt.savefig(cm_plot_path, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"  • Saved Confusion Matrix Plot: {cm_plot_path}")

    # 3. Bar Chart Comparison (Accuracy, AUC, F1, Latency)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.2), dpi=300)
    fig.patch.set_facecolor('#0d0d12')
    ax1.set_facecolor('#14141c')
    ax2.set_facecolor('#14141c')
    
    names_short = ["NETRA", "GenD", "MesoIncept", "Meso4"]
    accs = [metrics[m]["accuracy"] for m in models_dict.keys()]
    aucs = [metrics[m]["auc_roc"] for m in models_dict.keys()]
    f1s = [metrics[m]["f1_score"] for m in models_dict.keys()]
    lats = [metrics[m]["latency_ms"] for m in models_dict.keys()]
    
    x = np.arange(len(names_short))
    width = 0.25
    
    rects1 = ax1.bar(x - width, accs, width, label='Accuracy (%)', color='#00f0ff')
    rects2 = ax1.bar(x, aucs, width, label='AUC-ROC (%)', color='#a855f7')
    rects3 = ax1.bar(x + width, f1s, width, label='F1-Score (%)', color='#10b981')
    
    ax1.set_ylabel('Score (%)', color='#cccccc', fontsize=11)
    ax1.set_title('Detection Accuracy, AUC & F1-Score', color='#ffffff', fontsize=13, fontweight='bold', pad=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(names_short, color='#cccccc', fontsize=11, fontweight='bold')
    ax1.set_ylim(0, 110)
    ax1.legend(frameon=True, facecolor='#111118', edgecolor='#333344', fontsize=9.5)
    ax1.grid(axis='y', linestyle=':', alpha=0.3, color='#555566')
    ax1.tick_params(colors='#888888')
    
    # Latency Bar Chart
    colors_lat = ['#00f0ff', '#a855f7', '#f59e0b', '#ef4444']
    bars_lat = ax2.bar(names_short, lats, color=colors_lat, width=0.5, edgecolor='#ffffff', linewidth=0.5)
    ax2.set_ylabel('Inference Latency per Video (ms)', color='#cccccc', fontsize=11)
    ax2.set_title('Inference Latency Comparison (Lower is Faster)', color='#ffffff', fontsize=13, fontweight='bold', pad=12)
    ax2.grid(axis='y', linestyle=':', alpha=0.3, color='#555566')
    ax2.tick_params(colors='#888888')
    
    for bar in bars_lat:
        yval = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2.0, yval + max(lats)*0.02, f"{yval:.1f} ms", ha='center', va='bottom', color='#ffffff', fontweight='bold', fontsize=10)
        
    plt.tight_layout()
    bar_plot_path = os.path.join(PLOTS_DIR, "performance_latency_comparison.png")
    plt.savefig(bar_plot_path, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"  • Saved Performance & Latency Bar Chart: {bar_plot_path}")

    # -------------------------------------------------------------
    # 8. Save Full JSON Results
    # -------------------------------------------------------------
    full_output = {
        "benchmark_dataset": "SDFVD (Small DeepFake Video Dataset)",
        "total_videos": len(results),
        "total_real": int(np.sum(y_true == 0)),
        "total_fake": int(np.sum(y_true == 1)),
        "device": str(device),
        "summary_metrics": {k: {m: v for m, v in val.items() if m not in ['fpr', 'tpr']} for k, val in metrics.items()},
        "per_video_results": results
    }
    
    json_path = os.path.join(REPORTS_DIR, "benchmark_results_sdfvd_all_models.json")
    with open(json_path, "w") as f:
        json.dump(full_output, f, indent=2)
    print(f"\nFull Benchmark JSON Results saved to: {json_path}")
    
    return full_output

if __name__ == "__main__":
    run_benchmark()
