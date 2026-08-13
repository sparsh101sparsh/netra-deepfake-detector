#!/usr/bin/env python3
"""
Benchmark NETRA vs GenD (and MesoNet) on Local Deepfakes & Real Swapped Dataset:
- 78 Local AI Face-Swapped Images (InSwapper + GPEN GAN) from `batch_benchmark_results/generated_swaps/`
- 78 Local Authentic Real Portraits from `dataset/`
Total: 156 Evaluated Images of Indian Public Figures.
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
SWAPS_DIR = os.path.join(WORKSPACE, "batch_benchmark_results", "generated_swaps")
DATASET_DIR = os.path.join(WORKSPACE, "dataset")
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
# 1. NETRA Model
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

    def predict_image(self, pil_img):
        tensor = self.transform(pil_img).unsqueeze(0).to(device)
        with torch.no_grad():
            prob_fake = torch.softmax(self.model(tensor), dim=1)[0, 1].item()
        return float(prob_fake)

# -------------------------------------------------------------
# 2. GenD (CLIP-ViT-L/14) Model
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

    def predict_image(self, pil_img):
        tensor = self.feature_extractor.preprocess(pil_img).unsqueeze(0).to(device)
        with torch.no_grad():
            features = self.feature_extractor(tensor)
            logits = self.model(features)
            # Index 0: Real, Index 1: Fake
            prob_fake = F.softmax(logits, dim=-1)[0, 1].item()
        return float(prob_fake)

# -------------------------------------------------------------
# 3. MesoNet Models
# -------------------------------------------------------------
class MesoEvaluator:
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

    def predict_image(self, pil_img):
        tensor = self.transform(pil_img).unsqueeze(0).to(device)
        with torch.no_grad():
            score_real = self.model(tensor).item()
        prob_fake = 1.0 - score_real
        return float(prob_fake)

# -------------------------------------------------------------
# 4. Face Cropping Helper
# -------------------------------------------------------------
def load_and_crop_face(image_path):
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return None
    h, w = img_bgr.shape[:2]
    c_size = min(h, w)
    cy, cx = int(h * 0.45), w // 2
    half = int(c_size * 0.42)
    crop = img_bgr[max(0, cy - half):min(h, cy + half), max(0, cx - half):min(w, cx + half)]
    if crop.size == 0:
        crop = img_bgr
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)

# -------------------------------------------------------------
# 5. Build Dataset List
# -------------------------------------------------------------
def collect_evaluation_samples():
    swap_files = sorted(glob.glob(os.path.join(SWAPS_DIR, "*.jpg")))
    samples = []
    
    # 1. Swapped Deepfake Images (Label = 1)
    for s_path in swap_files:
        fname = os.path.basename(s_path)
        # Extract figure name e.g. "swap_043_Narendra_Modi.jpg" -> "Narendra_Modi"
        parts = fname.replace(".jpg", "").split("_")[2:]
        figure_name = "_".join(parts)
        samples.append({
            "path": s_path,
            "filename": fname,
            "figure": figure_name,
            "ground_truth": 1,
            "label": "FAKE"
        })
        
    # 2. Corresponding Real Portraits from dataset/ (Label = 0)
    for item in list(samples):
        fig_dir = os.path.join(DATASET_DIR, item["figure"])
        if os.path.exists(fig_dir):
            real_imgs = sorted([f for f in glob.glob(os.path.join(fig_dir, "*.jpg")) + glob.glob(os.path.join(fig_dir, "*.png")) if not f.endswith(".tmp.jpg")])
            if real_imgs:
                # Pick the primary portrait (01 or first)
                r_path = real_imgs[0]
                samples.append({
                    "path": r_path,
                    "filename": os.path.basename(r_path),
                    "figure": item["figure"],
                    "ground_truth": 0,
                    "label": "REAL"
                })
        else:
            # Fallback: check any available portrait
            pass
            
    # If any remaining count needed to make exactly balanced 78 Real:
    real_count = sum(1 for s in samples if s["ground_truth"] == 0)
    fake_count = sum(1 for s in samples if s["ground_truth"] == 1)
    
    if real_count < fake_count:
        all_dirs = sorted(glob.glob(os.path.join(DATASET_DIR, "*")))
        for d in all_dirs:
            if not os.path.isdir(d): continue
            fig_name = os.path.basename(d)
            if any(s["figure"] == fig_name and s["ground_truth"] == 0 for s in samples):
                continue
            r_imgs = sorted(glob.glob(os.path.join(d, "*.jpg")) + glob.glob(os.path.join(d, "*.png")))
            if r_imgs:
                samples.append({
                    "path": r_imgs[0],
                    "filename": os.path.basename(r_imgs[0]),
                    "figure": fig_name,
                    "ground_truth": 0,
                    "label": "REAL"
                })
                if sum(1 for s in samples if s["ground_truth"] == 0) == fake_count:
                    break

    return samples

# -------------------------------------------------------------
# 6. Main Benchmark Runner
# -------------------------------------------------------------
def run_local_benchmark():
    print("================================================================")
    print("    RUNNING NETRA VS GEND ON LOCAL SWAPPED DEEPFAKES DATASET")
    print("================================================================")
    
    netra = NetraSpatialDetector(NETRA_CKPT)
    print("✅ NETRA Spatial Detector Loaded")
    
    gend = GenDEvaluator()
    print("✅ GenD (CLIP-ViT-L/14) Foundation Model Loaded")
    
    meso_incept = MesoEvaluator(MesoInception4, "MesoInception_DF.pth")
    print("✅ MesoInception-4 Loaded")
    
    meso4 = MesoEvaluator(Meso4, "Meso4_DF.pth")
    print("✅ MesoNet-4 Loaded\n")
    
    samples = collect_evaluation_samples()
    total_fake = sum(1 for s in samples if s["ground_truth"] == 1)
    total_real = sum(1 for s in samples if s["ground_truth"] == 0)
    print(f"Total Test Images: {len(samples)} ({total_fake} Face-Swapped Deepfakes + {total_real} Real Portraits)\n")
    
    results = []
    latencies = {"NETRA": [], "GenD": [], "MesoInception4": [], "Meso4": []}
    
    for i, item in enumerate(samples, 1):
        pil_img = load_and_crop_face(item["path"])
        if pil_img is None:
            continue
            
        # NETRA Inference
        t0 = time.time()
        netra_score = netra.predict_image(pil_img)
        latencies["NETRA"].append((time.time() - t0) * 1000)
        
        # GenD Inference
        t0 = time.time()
        gend_score = gend.predict_image(pil_img)
        latencies["GenD"].append((time.time() - t0) * 1000)
        
        # MesoInception4 Inference
        t0 = time.time()
        meso_incept_score = meso_incept.predict_image(pil_img)
        latencies["MesoInception4"].append((time.time() - t0) * 1000)
        
        # Meso4 Inference
        t0 = time.time()
        meso4_score = meso4.predict_image(pil_img)
        latencies["Meso4"].append((time.time() - t0) * 1000)
        
        res = {
            "index": i,
            "filename": item["filename"],
            "figure": item["figure"],
            "ground_truth": item["ground_truth"],
            "label": item["label"],
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
        
        if i % 25 == 0 or i == len(samples):
            print(f"[{i:3d}/{len(samples)}] {item['figure']:<25} ({item['label']:<4}) | NETRA: {netra_score:.3f} | GenD: {gend_score:.3f} | MesoIncept: {meso_incept_score:.3f}")

    # -------------------------------------------------------------
    # 7. Compute Statistical Metrics
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
    # 8. Generate Visual Comparison Plots
    # -------------------------------------------------------------
    print("\nGenerating Local Swaps Benchmark Visualizations...")
    
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
    plt.title('ROC Curves on Local Face-Swapped & Authentic Dataset', fontsize=13, fontweight='bold', pad=15, color='#ffffff')
    plt.legend(loc="lower right", frameon=True, facecolor='#111118', edgecolor='#333344', fontsize=9.5)
    plt.grid(True, linestyle=':', alpha=0.3, color='#555566')
    plt.tight_layout()
    roc_plot_path = os.path.join(PLOTS_DIR, "local_swaps_roc_curves.png")
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
                ax.text(c, r, f"{cm[r, c]}\n({cm[r, c]/78*100:.0f}%)",
                        ha="center", va="center",
                        color="white" if cm[r, c] < thresh else "black",
                        fontsize=11, fontweight='bold')
                        
        ax.set_xlabel('Predicted Label', color='#aaaaaa', fontsize=10)
        if ax == axes[0]:
            ax.set_ylabel('True Label', color='#aaaaaa', fontsize=10)
        ax.tick_params(colors='#888888')
        
    plt.suptitle('Confusion Matrices Comparison (Local Dataset: 78 Real / 78 Swapped Fakes)', fontsize=14, fontweight='bold', color='#ffffff', y=1.03)
    plt.tight_layout()
    cm_plot_path = os.path.join(PLOTS_DIR, "local_swaps_confusion_matrices.png")
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
    ax1.set_title('Accuracy, AUC & F1 on Local Face Swaps', color='#ffffff', fontsize=13, fontweight='bold', pad=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(names_short, color='#cccccc', fontsize=11, fontweight='bold')
    ax1.set_ylim(0, 110)
    ax1.legend(frameon=True, facecolor='#111118', edgecolor='#333344', fontsize=9.5)
    ax1.grid(axis='y', linestyle=':', alpha=0.3, color='#555566')
    ax1.tick_params(colors='#888888')
    
    # Latency Bar Chart
    colors_lat = ['#00f0ff', '#a855f7', '#f59e0b', '#ef4444']
    bars_lat = ax2.bar(names_short, lats, color=colors_lat, width=0.5, edgecolor='#ffffff', linewidth=0.5)
    ax2.set_ylabel('Latency per Image (ms)', color='#cccccc', fontsize=11)
    ax2.set_title('Inference Latency per Image (ms)', color='#ffffff', fontsize=13, fontweight='bold', pad=12)
    ax2.grid(axis='y', linestyle=':', alpha=0.3, color='#555566')
    ax2.tick_params(colors='#888888')
    
    for bar in bars_lat:
        yval = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2.0, yval + max(lats)*0.02, f"{yval:.1f} ms", ha='center', va='bottom', color='#ffffff', fontweight='bold', fontsize=10)
        
    plt.tight_layout()
    bar_plot_path = os.path.join(PLOTS_DIR, "local_swaps_metrics_barchart.png")
    plt.savefig(bar_plot_path, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"  • Saved Bar Chart: {bar_plot_path}")

    # -------------------------------------------------------------
    # 9. Save Full JSON Results
    # -------------------------------------------------------------
    full_output = {
        "benchmark_dataset": "Local InSwapper/GPEN Face-Swaps & Dataset Portraits",
        "total_images": len(results),
        "total_real": total_real,
        "total_fake": total_fake,
        "device": str(device),
        "summary_metrics": {k: {m: v for m, v in val.items() if m not in ['fpr', 'tpr']} for k, val in metrics.items()},
        "per_image_results": results
    }
    
    json_path = os.path.join(REPORTS_DIR, "local_swaps_benchmark_results.json")
    with open(json_path, "w") as f:
        json.dump(full_output, f, indent=2)
    print(f"\nFull Benchmark JSON Results saved to: {json_path}")
    
    return full_output

if __name__ == "__main__":
    run_local_benchmark()
