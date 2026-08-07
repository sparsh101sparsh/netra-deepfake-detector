"""
NETRA EfficientNet-B4 + SBI Training Script (Kaggle — Full Run v5)

Dataset: aryankashyapnaveen/indian-face-dataset (35k real Indian faces)
Fakes: Generated via Self-Blended Images (SBI) — no upload needed

FIX: Uses torchvision EfficientNet-B4 (no efficientnet_pytorch dependency)
     Works on P100 (sm_60), T4 (sm_75) and V100 (sm_70)
     Forces CUDA_VISIBLE_DEVICES='' if GPU not compatible, uses CPU as fallback

GPU: P100 (16GB) or T4 — assigned automatically by Kaggle
Output: /kaggle/working/spatial_model_best.pth
"""

import os
import subprocess
import sys

# ── Install only what's needed (torchvision already installed on Kaggle) ──────
subprocess.run([sys.executable, "-m", "pip", "install", "-q",
    "opencv-python-headless",
], check=False)

import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torchvision.models as models
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import cv2
import json
from pathlib import Path

# ─── GPU Compatibility Check ─────────────────────────────────────────────────
def check_cuda_compatibility():
    """
    Check GPU compute capability against PyTorch requirements.
    Kaggle's PyTorch 2.x requires sm_70+ (Volta). P100=sm_60 (Pascal) will crash.
    Forces CPU if incompatible rather than crashing mid-training.
    """
    if not torch.cuda.is_available():
        print("No CUDA device available — running on CPU")
        return "cpu"

    try:
        device_name = torch.cuda.get_device_name(0)
        compute_cap = torch.cuda.get_device_capability(0)
        major, minor = compute_cap
        print(f"GPU: {device_name}")
        print(f"Compute Capability: {major}.{minor}")

        # PyTorch >= 2.0 on Kaggle requires sm_70+ (Volta or newer)
        # P100 is sm_60 (Pascal) — NOT compatible with pre-installed PyTorch build
        if major < 7:
            print(f"⚠️  GPU sm_{major}{minor} < sm_70 minimum for Kaggle's PyTorch build.")
            print("   Forcing CPU mode to avoid 'no kernel image' CUDA error.")
            print("   Training on CPU — slower but correct. ~5 epochs × 10k images ≈ 30 min.")
            os.environ["CUDA_VISIBLE_DEVICES"] = ""
            return "cpu"

        # Test a simple CUDA operation to confirm full compatibility
        x = torch.zeros(1).cuda()
        _ = x + x
        print("✅ CUDA test passed — using GPU")
        return "cuda"
    except Exception as e:
        print(f"⚠️  CUDA error: {e}")
        print("Falling back to CPU (training will be slower but correct)")
        return "cpu"


# ─── Configuration ────────────────────────────────────────────────────────────
OUTPUT_DIR = "/kaggle/working"
MODEL_SAVE_PATH = os.path.join(OUTPUT_DIR, "spatial_model_best.pth")

# Auto-detect GPU compatibility
DEVICE_STR = check_cuda_compatibility()
device = torch.device(DEVICE_STR)
print(f"\nUsing device: {device}")

# Training config — balanced for both GPU and CPU runtime
EPOCHS = 15 if DEVICE_STR == "cuda" else 5
BATCH_SIZE = 32 if DEVICE_STR == "cuda" else 16
LR = 1e-4
WEIGHT_DECAY = 1e-5
IMG_SIZE = 224
VAL_SPLIT = 0.15
NUM_WORKERS = 2 if DEVICE_STR == "cuda" else 0  # CPU: 0 workers avoids overhead
MAX_IMAGES_PER_CLASS = 35000  # Use all 35k images from indian-face-dataset

# ─── Reproducibility ─────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


# ─── Dataset: Read directly from mounted Kaggle dataset ───────────────────────
def get_kaggle_dataset_images(max_images: int = MAX_IMAGES_PER_CLASS) -> list:
    """
    Scan the mounted indian-face-dataset.
    Directory structure: /kaggle/input/indian-face-dataset/train/<PERSON_NAME>/<img>.jpg
    """
    dataset_path = "/kaggle/input/indian-face-dataset"
    print(f"\nScanning: {dataset_path}")
    
    if not os.path.exists(dataset_path):
        print(f"  ❌ Dataset not found at {dataset_path}")
        print("  Using synthetic placeholder images for pipeline validation...")
        return _make_placeholder_images(500)
    
    paths = []
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]:
        paths.extend(list(Path(dataset_path).rglob(ext)))
    
    paths = [str(p) for p in paths]
    random.shuffle(paths)
    paths = paths[:max_images]
    print(f"  ✅ Found {len(paths)} real images")
    return paths


def _make_placeholder_images(n: int) -> list:
    """Fallback: generate random face-shaped images for pipeline test."""
    placeholder_dir = os.path.join(OUTPUT_DIR, "placeholder_real")
    os.makedirs(placeholder_dir, exist_ok=True)
    paths = []
    for i in range(n):
        img_array = np.random.randint(50, 200, (IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
        path = os.path.join(placeholder_dir, f"real_{i:05d}.jpg")
        Image.fromarray(img_array).save(path)
        paths.append(path)
    print(f"  Created {n} placeholder images")
    return paths


# ─── SBI: Generate Fake Images ────────────────────────────────────────────────
def generate_sbi_fakes(real_paths: list, output_dir: str, max_images: int) -> list:
    """
    Self-Blended Images (SBI) — Shiohara & Yamasaki CVPR 2022.
    Creates convincing deepfake training samples from real faces,
    simulating the blending boundary artifacts that face-swapping tools leave.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if already generated
    existing = list(Path(output_dir).glob("*.jpg"))
    if len(existing) >= min(max_images // 2, len(real_paths) // 2):
        print(f"  ✅ Using {len(existing)} existing SBI fakes")
        return [str(p) for p in existing[:max_images]]
    
    print(f"\nGenerating SBI fakes from {len(real_paths)} real images...")
    saved = 0
    needed = min(max_images, len(real_paths))
    sample_paths = random.sample(real_paths, min(needed, len(real_paths)))
    
    for real_path in sample_paths:
        if saved >= needed:
            break
        try:
            img = cv2.imread(real_path)
            if img is None:
                continue
            
            h, w = img.shape[:2]
            if h < 50 or w < 50:  # Skip very small images
                continue
            
            # Define blend region (face-swap boundary simulation)
            cx, cy = w // 2, h // 2
            rx = random.randint(w // 6, w // 2)
            ry = random.randint(h // 6, h // 2)
            x1, x2 = max(0, cx - rx), min(w, cx + rx)
            y1, y2 = max(0, cy - ry), min(h, cy + ry)
            
            # Soft mask with Gaussian blur (simulates blending artifact)
            mask = np.zeros((h, w), dtype=np.float32)
            mask[y1:y2, x1:x2] = 1.0
            kernel_size = random.choice([21, 31, 41, 51])
            mask = cv2.GaussianBlur(mask, (kernel_size, kernel_size), 0)
            
            # Color/brightness shift (simulates lighting mismatch from different video)
            shift = np.random.uniform(-25, 25, size=(1, 1, 3)).astype(np.float32)
            gamma = random.uniform(0.85, 1.15)
            altered = np.clip((img.astype(np.float32) + shift) * gamma, 0, 255).astype(np.uint8)
            
            # Blend
            mask_3ch = np.stack([mask, mask, mask], axis=-1)
            blended = (img.astype(np.float32) * (1 - mask_3ch) +
                      altered.astype(np.float32) * mask_3ch).astype(np.uint8)
            
            out_path = os.path.join(output_dir, f"fake_{saved:05d}.jpg")
            cv2.imwrite(out_path, blended)
            saved += 1
            
            if saved % 1000 == 0:
                print(f"  Generated {saved}/{needed} SBI fakes...")
                
        except Exception:
            continue
    
    print(f"  ✅ Generated {saved} SBI fakes")
    return [str(p) for p in Path(output_dir).glob("*.jpg")][:max_images]


# ─── Dataset Class ────────────────────────────────────────────────────────────
class NetraDataset(Dataset):
    def __init__(self, samples: list, transform):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx: int):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (128, 128, 128))
        return self.transform(img), label


# ─── Transforms ───────────────────────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE + 16, IMG_SIZE + 16)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
    transforms.RandomRotation(5),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ─── Model ────────────────────────────────────────────────────────────────────
def build_model() -> nn.Module:
    """
    Use torchvision EfficientNet-B4 — no external package required.
    Pre-trained on ImageNet, fine-tuned with binary head (real=0, fake=1).
    """
    model = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, 2)
    print(f"EfficientNet-B4 loaded (torchvision) | Head: {in_features} → 2")
    return model.to(device)


# ─── Training Loop ────────────────────────────────────────────────────────────
def train():
    print("=" * 60)
    print("NETRA EfficientNet-B4 + SBI Training (v5 — Full Run)")
    print(f"Dataset: Indian Face Dataset (35k images)")
    print(f"Device: {device} | Epochs: {EPOCHS} | Batch: {BATCH_SIZE}")
    print("=" * 60)

    # 1. Load real images
    real_paths = get_kaggle_dataset_images(MAX_IMAGES_PER_CLASS)
    if not real_paths:
        print("FATAL: No images found. Exiting.")
        return

    # 2. Generate SBI fake images
    fake_dir = os.path.join(OUTPUT_DIR, "data", "sbi_fakes")
    fake_paths = generate_sbi_fakes(real_paths, fake_dir, MAX_IMAGES_PER_CLASS)

    # 3. Balance classes
    n = min(len(real_paths), len(fake_paths))
    real_paths, fake_paths = random.sample(real_paths, n), random.sample(fake_paths, n)
    print(f"\nDataset: {n} real + {n} fake = {2*n} total images")

    # 4. Train/val split
    all_samples = [(p, 0) for p in real_paths] + [(p, 1) for p in fake_paths]
    random.shuffle(all_samples)
    n_val = int(len(all_samples) * VAL_SPLIT)
    train_samples, val_samples = all_samples[n_val:], all_samples[:n_val]
    print(f"Train: {len(train_samples)} | Val: {len(val_samples)}")

    train_ds = NetraDataset(train_samples, train_transform)
    val_ds = NetraDataset(val_samples, val_transform)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                              num_workers=NUM_WORKERS, pin_memory=(DEVICE_STR == "cuda"))
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False,
                            num_workers=NUM_WORKERS, pin_memory=(DEVICE_STR == "cuda"))

    # 5. Model, loss, optimizer
    model = build_model()
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    best_val_acc = 0.0
    history = []

    for epoch in range(1, EPOCHS + 1):
        # ── Train ──
        model.train()
        t_loss, t_correct, t_total = 0.0, 0, 0
        for batch_idx, (imgs, labels) in enumerate(train_loader):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            t_loss += loss.item()
            _, pred = out.max(1)
            t_correct += pred.eq(labels).sum().item()
            t_total += labels.size(0)

            if batch_idx % 50 == 0:
                print(f"  E{epoch}/{EPOCHS} | B{batch_idx}/{len(train_loader)} "
                      f"| loss={loss.item():.4f} | acc={100*t_correct/max(t_total,1):.1f}%")

        # ── Validate ──
        model.eval()
        v_correct, v_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                out = model(imgs)
                _, pred = out.max(1)
                v_correct += pred.eq(labels).sum().item()
                v_total += labels.size(0)

        t_acc = 100.0 * t_correct / max(t_total, 1)
        v_acc = 100.0 * v_correct / max(v_total, 1)
        scheduler.step()

        epoch_log = {
            "epoch": epoch,
            "train_loss": round(t_loss / len(train_loader), 4),
            "train_acc": round(t_acc, 2),
            "val_acc": round(v_acc, 2),
            "lr": round(scheduler.get_last_lr()[0], 7),
        }
        history.append(epoch_log)
        print(f"\n{'='*40}")
        print(f"Epoch {epoch}/{EPOCHS} Summary:")
        print(f"  Train Acc: {t_acc:.2f}% | Val Acc: {v_acc:.2f}%")
        print(f"  LR: {epoch_log['lr']}")

        if v_acc > best_val_acc:
            best_val_acc = v_acc
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_acc": v_acc,
                "train_acc": t_acc,
                "config": {
                    "img_size": IMG_SIZE,
                    "architecture": "efficientnet_b4",
                    "num_classes": 2,
                    "trained_on": "indian-face-dataset + SBI",
                }
            }, MODEL_SAVE_PATH)
            print(f"  ✅ NEW BEST — saved to {MODEL_SAVE_PATH}")
        print(f"{'='*40}\n")

    # Save full history
    with open(os.path.join(OUTPUT_DIR, "training_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    print("\n" + "=" * 60)
    print("🏁 TRAINING COMPLETE!")
    print(f"Best Val Accuracy: {best_val_acc:.2f}%")
    print(f"Model saved to: {MODEL_SAVE_PATH}")
    print("\nNEXT STEPS:")
    print("1. Download spatial_model_best.pth from Kaggle output panel")
    print("2. Upload to HuggingFace: huggingface-cli upload netra-ai/spatial-detector-v1 spatial_model_best.pth model.pth")
    print("3. Set SPATIAL_HF_MODEL_ID=netra-ai/spatial-detector-v1 in your EC2 .env")
    print("=" * 60)


if __name__ == "__main__":
    train()
