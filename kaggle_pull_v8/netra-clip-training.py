"""
NETRA CLIP Probe Training Script (Kaggle — Full Run v5)

Dataset: aryankashyapnaveen/indian-face-dataset (35k real Indian faces)  
Fakes: Generated via Self-Blended Images (SBI) — no upload needed

Backbone: openai/clip-vit-large-patch14 (ViT-L/14) — FROZEN
Probe: 3-layer MLP on top of 768-dim CLIP features

FIX: Avoids efficientnet_pytorch CUDA sm_60 error
     CLIP loaded via transformers/HuggingFace (not git+github.com/openai/CLIP)
     Works on P100, T4, V100

Output: /kaggle/working/clip_model_best.pth
"""

import os
import subprocess
import sys

# ── Install dependencies ──────────────────────────────────────────────────────
subprocess.run([sys.executable, "-m", "pip", "install", "-q",
    "transformers",
    "opencv-python-headless",
], check=False)

import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import cv2
import json
from pathlib import Path
from transformers import CLIPProcessor, CLIPModel

# ─── GPU Compatibility Check ─────────────────────────────────────────────────
def check_cuda():
    """
    Check GPU compute capability. Forces CPU if P100 (sm_60) detected,
    since Kaggle's PyTorch 2.x requires sm_70+ (Volta or newer).
    """
    if not torch.cuda.is_available():
        print("No CUDA available — using CPU")
        return "cpu"
    try:
        device_name = torch.cuda.get_device_name(0)
        major, minor = torch.cuda.get_device_capability(0)
        print(f"GPU: {device_name} | Compute: sm_{major}{minor}")
        if major < 7:
            print(f"⚠️  sm_{major}{minor} < sm_70 — P100 incompatible with installed PyTorch.")
            print("   Forcing CPU mode to avoid CUDA kernel crash.")
            os.environ["CUDA_VISIBLE_DEVICES"] = ""
            return "cpu"
        x = torch.zeros(1).cuda()
        _ = x + x
        print(f"✅ GPU: {device_name} | VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
        return "cuda"
    except Exception as e:
        print(f"⚠️  CUDA error: {e} — falling back to CPU")
        return "cpu"

DEVICE_STR = check_cuda()
device = torch.device(DEVICE_STR)

# ─── Configuration ────────────────────────────────────────────────────────────
OUTPUT_DIR = "/kaggle/working"
MODEL_SAVE_PATH = os.path.join(OUTPUT_DIR, "clip_model_best.pth")

EPOCHS = 15 if DEVICE_STR == "cuda" else 5
BATCH_SIZE = 64 if DEVICE_STR == "cuda" else 16  # Large batch OK — backbone frozen
LR = 1e-3
WEIGHT_DECAY = 1e-4
VAL_SPLIT = 0.15
NUM_WORKERS = 2 if DEVICE_STR == "cuda" else 0
MAX_IMAGES_PER_CLASS = 35000

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


# ─── Dataset Loader ───────────────────────────────────────────────────────────
def get_kaggle_dataset_images(max_images: int = MAX_IMAGES_PER_CLASS) -> list:
    dataset_path = "/kaggle/input/indian-face-dataset"
    print(f"\nScanning: {dataset_path}")
    if not os.path.exists(dataset_path):
        print("  ❌ Dataset not found — using placeholder images")
        return _make_placeholders(500)
    paths = []
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]:
        paths.extend([str(p) for p in Path(dataset_path).rglob(ext)])
    random.shuffle(paths)
    paths = paths[:max_images]
    print(f"  ✅ Found {len(paths)} real images")
    return paths

def _make_placeholders(n: int) -> list:
    d = os.path.join(OUTPUT_DIR, "placeholder")
    os.makedirs(d, exist_ok=True)
    paths = []
    for i in range(n):
        img = Image.fromarray(np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8))
        p = os.path.join(d, f"img_{i:05d}.jpg")
        img.save(p)
        paths.append(p)
    return paths

def generate_sbi_fakes(real_paths: list, output_dir: str, max_images: int) -> list:
    os.makedirs(output_dir, exist_ok=True)
    existing = list(Path(output_dir).glob("*.jpg"))
    if len(existing) >= min(max_images // 2, len(real_paths) // 2):
        print(f"  ✅ Using {len(existing)} existing SBI fakes")
        return [str(p) for p in existing[:max_images]]

    print(f"\nGenerating SBI fakes from {len(real_paths)} images...")
    saved = 0
    needed = min(max_images, len(real_paths))
    for real_path in random.sample(real_paths, min(needed, len(real_paths))):
        if saved >= needed:
            break
        try:
            img = cv2.imread(real_path)
            if img is None or img.shape[0] < 50:
                continue
            h, w = img.shape[:2]
            cx, cy = w // 2, h // 2
            rx, ry = random.randint(w//6, w//2), random.randint(h//6, h//2)
            x1, x2 = max(0, cx-rx), min(w, cx+rx)
            y1, y2 = max(0, cy-ry), min(h, cy+ry)
            mask = np.zeros((h, w), dtype=np.float32)
            mask[y1:y2, x1:x2] = 1.0
            mask = cv2.GaussianBlur(mask, (random.choice([21, 31, 41]), random.choice([21, 31, 41])), 0)
            shift = np.random.uniform(-25, 25, (1, 1, 3)).astype(np.float32)
            altered = np.clip(img.astype(np.float32) + shift, 0, 255).astype(np.uint8)
            m = np.stack([mask]*3, axis=-1)
            blended = (img.astype(np.float32)*(1-m) + altered.astype(np.float32)*m).astype(np.uint8)
            cv2.imwrite(os.path.join(output_dir, f"fake_{saved:05d}.jpg"), blended)
            saved += 1
            if saved % 2000 == 0:
                print(f"  {saved}/{needed} SBI fakes generated...")
        except Exception:
            continue
    print(f"  ✅ Generated {saved} SBI fakes")
    return [str(p) for p in Path(output_dir).glob("*.jpg")][:max_images]


# ─── Dataset ──────────────────────────────────────────────────────────────────
class NetraDataset(Dataset):
    def __init__(self, samples, processor):
        self.samples = samples
        self.processor = processor

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224), (128, 128, 128))
        # Pre-process for CLIP
        inputs = self.processor(images=img, return_tensors="pt")
        pixel_values = inputs["pixel_values"].squeeze(0)
        return pixel_values, label


# ─── Model: CLIP Probe (3-layer MLP) ─────────────────────────────────────────
class CLIPProbe(nn.Module):
    def __init__(self, input_dim: int = 768, num_classes: int = 2):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        return self.mlp(x)


def collate_fn(batch):
    pixels = torch.stack([b[0] for b in batch])
    labels = torch.tensor([b[1] for b in batch])
    return pixels, labels


# ─── Training Loop ────────────────────────────────────────────────────────────
def train():
    print("=" * 60)
    print("NETRA CLIP Probe Training (v5 — Full Run)")
    print(f"Dataset: Indian Face Dataset (35k images)")
    print(f"Device: {device} | Epochs: {EPOCHS} | Batch: {BATCH_SIZE}")
    print("=" * 60)

    # Load CLIP ViT-L/14 from HuggingFace (auto-cached)
    print("\nLoading CLIP ViT-L/14 from HuggingFace...")
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14").to(device)
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
    clip_model.eval()
    for p in clip_model.parameters():
        p.requires_grad = False
    print("✅ CLIP backbone loaded and frozen")

    # Get CLIP visual embedding dimension
    with torch.no_grad():
        dummy = torch.zeros(1, 3, 224, 224).to(device)
        out = clip_model.get_image_features(pixel_values=dummy)
        dummy_features = out if isinstance(out, torch.Tensor) else out[0]
        clip_dim = dummy_features.shape[-1]
    print(f"CLIP feature dim: {clip_dim}")

    # Load data
    real_paths = get_kaggle_dataset_images(MAX_IMAGES_PER_CLASS)
    fake_dir = os.path.join(OUTPUT_DIR, "data", "sbi_fakes_clip")
    fake_paths = generate_sbi_fakes(real_paths, fake_dir, MAX_IMAGES_PER_CLASS)

    n = min(len(real_paths), len(fake_paths))
    real_paths, fake_paths = random.sample(real_paths, n), random.sample(fake_paths, n)
    all_samples = [(p, 0) for p in real_paths] + [(p, 1) for p in fake_paths]
    random.shuffle(all_samples)
    n_val = int(len(all_samples) * VAL_SPLIT)
    train_samples, val_samples = all_samples[n_val:], all_samples[:n_val]
    print(f"\nDataset: {n} real + {n} fake | Train: {len(train_samples)} | Val: {len(val_samples)}")

    train_ds = NetraDataset(train_samples, processor)
    val_ds = NetraDataset(val_samples, processor)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                              num_workers=NUM_WORKERS, collate_fn=collate_fn,
                              pin_memory=(DEVICE_STR == "cuda"))
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False,
                            num_workers=NUM_WORKERS, collate_fn=collate_fn,
                            pin_memory=(DEVICE_STR == "cuda"))

    probe = CLIPProbe(input_dim=clip_dim).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(probe.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    best_val_acc = 0.0
    history = []

    for epoch in range(1, EPOCHS + 1):
        probe.train()
        t_correct, t_total = 0, 0
        for batch_idx, (pixels, labels) in enumerate(train_loader):
            pixels, labels = pixels.to(device), labels.to(device)
            with torch.no_grad():
                out = clip_model.get_image_features(pixel_values=pixels)
                features = out if isinstance(out, torch.Tensor) else out[0]
                features = features.float()
            optimizer.zero_grad()
            out = probe(features)
            loss = criterion(out, labels)
            loss.backward()
            optimizer.step()
            _, pred = out.max(1)
            t_correct += pred.eq(labels).sum().item()
            t_total += labels.size(0)
            if batch_idx % 50 == 0:
                print(f"  E{epoch}/{EPOCHS} | B{batch_idx}/{len(train_loader)} "
                      f"| acc={100*t_correct/max(t_total,1):.1f}%")

        probe.eval()
        v_correct, v_total = 0, 0
        with torch.no_grad():
            for pixels, labels in val_loader:
                pixels, labels = pixels.to(device), labels.to(device)
                out = clip_model.get_image_features(pixel_values=pixels)
                features = out if isinstance(out, torch.Tensor) else out[0]
                features = features.float()
                out_probe = probe(features)
                _, pred = out_probe.max(1)
                v_correct += pred.eq(labels).sum().item()
                v_total += labels.size(0)

        t_acc = 100.0 * t_correct / max(t_total, 1)
        v_acc = 100.0 * v_correct / max(v_total, 1)
        scheduler.step()

        history.append({"epoch": epoch, "train_acc": round(t_acc, 2), "val_acc": round(v_acc, 2)})
        print(f"\nEpoch {epoch}/{EPOCHS}: Train={t_acc:.2f}% | Val={v_acc:.2f}%")

        if v_acc > best_val_acc:
            best_val_acc = v_acc
            torch.save({
                "epoch": epoch,
                "probe_state_dict": probe.state_dict(),
                "val_acc": v_acc,
                "clip_model_id": "openai/clip-vit-large-patch14",
                "clip_dim": clip_dim,
            }, MODEL_SAVE_PATH)
            print(f"  ✅ NEW BEST saved! Val={v_acc:.2f}%")

    with open(os.path.join(OUTPUT_DIR, "clip_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    print(f"\n🏁 CLIP TRAINING COMPLETE! Best val acc: {best_val_acc:.2f}%")
    print(f"Saved to: {MODEL_SAVE_PATH}")


if __name__ == "__main__":
    train()
