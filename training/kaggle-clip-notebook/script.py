"""
NETRA CLIP Probe Training Script — v12 (P100-Compatible)

ROOT CAUSE OF PREVIOUS FAILURES:
  The `transformers` package installs a modern PyTorch wheel (sm_70+) when it's
  pip-installed, which overwrites Kaggle's pre-installed PyTorch. The P100 GPU
  on Kaggle has sm_60 (Pascal), so the new wheel crashes with:
    "Tesla P100-PCIE-16GB with CUDA capability sm_60 is not compatible..."

FIX STRATEGY (v12):
  1. FIRST: Detect GPU capability BEFORE importing any ML library.
  2. If sm_60 (P100): Install PyTorch 2.2.0+cu118 first — which still supports sm_60.
     Then install transformers (which will detect existing pytorch and not overwrite it).
  3. If sm_75+ (T4/V100/A100): Use pre-installed PyTorch as-is.
  4. Fallback: CPU mode if GPU unusable.

KEY DIFFERENCES vs v11:
  - GPU detection runs BEFORE any torch import
  - PyTorch 2.2.0+cu118 installed first if P100 detected
  - Feature extraction DOES run on GPU (P100 has 16GB — plenty for ViT-L/14)
  - Dataset size: 10k/class on GPU, 2k/class on CPU (emergency fallback)
  - EPOCHS: 12 on GPU, 5 on CPU
  - Robust disk-quota guard: stops generating if < 2GB free

Output: /kaggle/working/clip_probe_best.pth
"""

import os, sys, subprocess, random, json, gc, time, shutil
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# STEP 0: GPU capability detection — runs before ANY torch import
# This is the critical fix: we must know the GPU first to choose the right
# PyTorch wheel.
# ─────────────────────────────────────────────────────────────────────────────
print("="*60)
print("NETRA CLIP Probe Training — v12 (P100-Compatible)")
print("="*60)

def detect_gpu_capability_raw():
    """Use nvidia-smi to detect GPU capability without importing torch."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,compute_cap", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return None, None
        line = result.stdout.strip().split("\n")[0]
        parts = [p.strip() for p in line.split(",")]
        name = parts[0]
        cap_str = parts[1]  # e.g. "6.0" or "7.5"
        major = int(cap_str.split(".")[0])
        minor = int(cap_str.split(".")[1])
        return name, (major, minor)
    except Exception as e:
        print(f"  nvidia-smi error: {e}")
        return None, None

gpu_name, gpu_cap = detect_gpu_capability_raw()

if gpu_name is None:
    print("  No GPU detected via nvidia-smi → will run on CPU")
    GPU_MODE = "cpu"
elif gpu_cap[0] < 7:
    # P100 is sm_60 — needs PyTorch 2.2.0+cu118
    print(f"  GPU: {gpu_name} | Compute: {gpu_cap[0]}.{gpu_cap[1]} (Pascal sm_60)")
    print("  → Installing PyTorch 2.2.0+cu118 (supports sm_60) BEFORE transformers...")
    ret = subprocess.run([
        sys.executable, "-m", "pip", "install", "-q", "--force-reinstall",
        "torch==2.2.0+cu118",
        "torchvision==0.17.0+cu118",
        "torchaudio==2.2.0+cu118",
        "--index-url", "https://download.pytorch.org/whl/cu118",
        "--no-deps"   # critical: don't let pip upgrade numpy/etc
    ], check=False)
    if ret.returncode == 0:
        print("  ✅ PyTorch 2.2.0+cu118 installed → P100 will be used as GPU")
        GPU_MODE = "cuda"
    else:
        print("  ⚠️  PyTorch reinstall failed → fallback CPU")
        GPU_MODE = "cpu"
else:
    print(f"  GPU: {gpu_name} | Compute: {gpu_cap[0]}.{gpu_cap[1]} (Volta+ compatible)")
    GPU_MODE = "cuda"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Install remaining deps (transformers last — won't overwrite pytorch)
# ─────────────────────────────────────────────────────────────────────────────
print("\n[0/5] Installing dependencies...")
subprocess.run([
    sys.executable, "-m", "pip", "install", "-q",
    "transformers", "opencv-python-headless", "Pillow"
], check=False)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Now safe to import torch
# ─────────────────────────────────────────────────────────────────────────────
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from PIL import Image
import cv2
from transformers import CLIPProcessor, CLIPModel

print(f"  PyTorch version: {torch.__version__}")
print(f"  CUDA available: {torch.cuda.is_available()}")

# Final device confirmation
if GPU_MODE == "cuda":
    if torch.cuda.is_available():
        try:
            _ = torch.zeros(1).cuda() + torch.zeros(1).cuda()
            vram = torch.cuda.get_device_properties(0).total_memory / 1e9
            print(f"  ✅ GPU CONFIRMED | {torch.cuda.get_device_name(0)} | {vram:.1f}GB VRAM")
            HAS_GPU = True
        except Exception as e:
            print(f"  ⚠️  CUDA test failed: {e} → CPU fallback")
            GPU_MODE = "cpu"
            HAS_GPU = False
    else:
        print("  ⚠️  CUDA not available after install → CPU fallback")
        GPU_MODE = "cpu"
        HAS_GPU = False
else:
    HAS_GPU = False

device = torch.device(GPU_MODE)

# ─── Seed ────────────────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
if HAS_GPU:
    torch.cuda.manual_seed(SEED)

# ─── Config ──────────────────────────────────────────────────────────────────
OUTPUT_DIR     = "/kaggle/working"
FEAT_CACHE_DIR = os.path.join(OUTPUT_DIR, "clip_feat_cache")
FAKE_DIR       = os.path.join(OUTPUT_DIR, "data", "sbi_fakes")
CKPT_PATH      = os.path.join(OUTPUT_DIR, "clip_probe_best.pth")
HISTORY_PATH   = os.path.join(OUTPUT_DIR, "clip_history.json")

# GPU (P100 16GB): can extract 10k/class comfortably
# CPU fallback: 2k/class (emergency — should never hit this)
MAX_PER_CLASS  = 10000 if HAS_GPU else 2000
EPOCHS         = 12    if HAS_GPU else 5
BATCH_SIZE     = 256   if HAS_GPU else 128
LR             = 3e-4
WEIGHT_DECAY   = 1e-4
VAL_SPLIT      = 0.15
FEAT_BATCH     = 64    if HAS_GPU else 16    # For CLIP feature extraction

DISK_LIMIT_GB  = 18.0   # Stop generating fakes if disk exceeds this (Kaggle 20GB limit)

os.makedirs(FEAT_CACHE_DIR, exist_ok=True)
os.makedirs(FAKE_DIR, exist_ok=True)

print(f"\nConfig: device={GPU_MODE} | epochs={EPOCHS} | max/class={MAX_PER_CLASS}")
print(f"        batch={BATCH_SIZE} | feat_batch={FEAT_BATCH} | lr={LR}")

# ─── Disk Safety Check ───────────────────────────────────────────────────────
def get_disk_used_gb(path="/kaggle/working"):
    try:
        total, used, free = shutil.disk_usage(path)
        return used / 1e9
    except Exception:
        return 0.0

def check_disk_ok():
    used = get_disk_used_gb()
    ok = used < DISK_LIMIT_GB
    if not ok:
        print(f"  ⚠️  Disk usage {used:.1f}GB exceeds limit {DISK_LIMIT_GB}GB — stopping generation")
    return ok

# ─── Helpers: Real Images ────────────────────────────────────────────────────
def get_real_images(max_n):
    base = "/kaggle/input/indian-face-dataset"
    if not os.path.exists(base):
        print("  Dataset not found — generating random noise placeholders")
        return _placeholders(min(max_n, 200))
    paths = []
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]:
        paths.extend(str(p) for p in Path(base).rglob(ext))
    # Filter out tiny / corrupt files
    valid = []
    for p in paths:
        try:
            if os.path.getsize(p) > 500:  # skip files < 500 bytes
                valid.append(p)
        except Exception:
            continue
    random.shuffle(valid)
    valid = valid[:max_n]
    print(f"  ✅ {len(valid)} valid real images found")
    return valid

def _placeholders(n):
    d = os.path.join(OUTPUT_DIR, "placeholders")
    os.makedirs(d, exist_ok=True)
    out = []
    for i in range(n):
        p = os.path.join(d, f"ph_{i:05d}.jpg")
        if not os.path.exists(p):
            arr = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
            Image.fromarray(arr).save(p, quality=85)
        out.append(p)
    return out

# ─── SBI Fake Generation (Disk-Safe) ─────────────────────────────────────────
def generate_sbi_fakes(real_paths, fake_dir, max_n):
    existing = list(Path(fake_dir).glob("*.jpg"))
    if len(existing) >= max_n:
        print(f"  ✅ Using {len(existing)} cached SBI fakes")
        return [str(p) for p in existing[:max_n]]

    print(f"  Generating up to {max_n} SBI fakes (disk-safe)...")
    needed  = min(max_n, len(real_paths))
    sources = random.sample(real_paths, min(needed, len(real_paths)))
    saved   = 0
    t0      = time.time()

    for rp in sources:
        if saved >= needed:
            break
        if not check_disk_ok():
            print(f"  Stopping at {saved} fakes due to disk limit")
            break
        try:
            img = cv2.imread(rp)
            if img is None or min(img.shape[:2]) < 32:
                continue
            img = cv2.resize(img, (224, 224))
            h, w = img.shape[:2]
            cx, cy = w // 2, h // 2
            rx = random.randint(w // 6, w // 2)
            ry = random.randint(h // 6, h // 2)
            x1, x2 = max(0, cx - rx), min(w, cx + rx)
            y1, y2 = max(0, cy - ry), min(h, cy + ry)
            mask = np.zeros((h, w), np.float32)
            mask[y1:y2, x1:x2] = 1.0
            ks   = random.choice([21, 31, 41])
            mask = cv2.GaussianBlur(mask, (ks, ks), 0)
            shift   = np.random.uniform(-30, 30, (1, 1, 3)).astype(np.float32)
            alt     = np.clip(img.astype(np.float32) + shift, 0, 255).astype(np.uint8)
            m       = np.stack([mask] * 3, axis=-1)
            blended = (img * (1 - m) + alt * m).astype(np.uint8)
            cv2.imwrite(
                os.path.join(fake_dir, f"fake_{saved:06d}.jpg"),
                blended,
                [cv2.IMWRITE_JPEG_QUALITY, 85]
            )
            saved += 1
            if saved % 1000 == 0:
                elapsed = time.time() - t0
                disk    = get_disk_used_gb()
                print(f"    {saved}/{needed} fakes | {elapsed:.0f}s | disk={disk:.1f}GB")
        except Exception:
            continue

    print(f"  ✅ {saved} SBI fakes generated")
    return [str(p) for p in Path(fake_dir).glob("*.jpg")][:max_n]

# ─── CLIP Feature Extraction ─────────────────────────────────────────────────
def extract_features(paths, labels_list, clip_model, processor, feat_file):
    """Extract CLIP image features. Cached on disk — only runs once."""
    if os.path.exists(feat_file + ".npy") and os.path.exists(feat_file + "_labels.npy"):
        print(f"  ✅ Loading cached features: {feat_file}")
        X = np.load(feat_file + ".npy")
        y = np.load(feat_file + "_labels.npy")
        print(f"  Loaded: X={X.shape}, y={y.shape}")
        return X, y

    print(f"  Extracting CLIP features for {len(paths)} images on {GPU_MODE}...")
    all_feats, all_labels = [], []
    clip_model.eval()

    n_batches = (len(paths) + FEAT_BATCH - 1) // FEAT_BATCH
    t0 = time.time()

    for batch_idx, i in enumerate(range(0, len(paths), FEAT_BATCH)):
        batch_paths  = paths[i: i + FEAT_BATCH]
        batch_labels = labels_list[i: i + FEAT_BATCH]

        imgs = []
        for p in batch_paths:
            try:
                imgs.append(Image.open(p).convert("RGB"))
            except Exception:
                imgs.append(Image.new("RGB", (224, 224), (128, 128, 128)))

        try:
            inputs = processor(images=imgs, return_tensors="pt", padding=True)
            pv     = inputs["pixel_values"].to(device)
            with torch.no_grad():
                out   = clip_model.get_image_features(pixel_values=pv)
                feats = out if isinstance(out, torch.Tensor) else out[0]
            if feats.dim() == 3:
                feats = feats[:, 0, :]
            feats = feats / feats.norm(dim=-1, keepdim=True)   # L2 normalize
            all_feats.append(feats.float().cpu().numpy())
            all_labels.extend(batch_labels)
        except Exception as e:
            print(f"    ⚠️  Batch {batch_idx} error: {e} — skipping")
            continue

        if batch_idx % 50 == 0:
            elapsed = time.time() - t0
            done    = min(i + FEAT_BATCH, len(paths))
            eta     = (elapsed / max(done, 1)) * (len(paths) - done)
            print(f"    {done}/{len(paths)} | {elapsed:.0f}s elapsed | ETA {eta:.0f}s")

        # Periodic GPU cache clear
        if HAS_GPU and batch_idx % 100 == 0:
            torch.cuda.empty_cache()

    if not all_feats:
        raise RuntimeError("Feature extraction produced zero batches — check image paths!")

    X = np.vstack(all_feats).astype(np.float32)
    y = np.array(all_labels, dtype=np.float32)
    np.save(feat_file + ".npy",        X)
    np.save(feat_file + "_labels.npy", y)
    print(f"  ✅ Features saved: X={X.shape}")
    return X, y

# ─── Probe Model ─────────────────────────────────────────────────────────────
class CLIPProbe(nn.Module):
    """3-layer MLP on top of frozen CLIP features. BCEWithLogitsLoss (1 output)."""
    def __init__(self, input_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(256, 1),   # Single logit → BCEWithLogitsLoss
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)  # → [B]

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*60}")
    print(f"Device: {GPU_MODE} | Epochs: {EPOCHS} | Max/class: {MAX_PER_CLASS}")
    print(f"{'='*60}\n")

    # [1/5] Load CLIP backbone
    print("[1/5] Loading CLIP ViT-L/14...")
    try:
        clip_model = CLIPModel.from_pretrained(
            "openai/clip-vit-large-patch14",
            torch_dtype=torch.float32,  # always float32 for compatibility
        ).to(device)
        processor  = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
        clip_model.eval()
        for p in clip_model.parameters():
            p.requires_grad = False
        total_params = sum(p.numel() for p in clip_model.parameters()) / 1e6
        print(f"  ✅ CLIP loaded and frozen ({total_params:.0f}M params)")
    except Exception as e:
        print(f"  ❌ CLIP load failed: {e}")
        raise

    # Probe the feature dimension
    with torch.no_grad():
        dummy = torch.zeros(1, 3, 224, 224).to(device)
        out   = clip_model.get_image_features(pixel_values=dummy)
        feat_dim = (out if isinstance(out, torch.Tensor) else out[0]).shape[-1]
    print(f"  CLIP feature dim: {feat_dim}")

    if HAS_GPU:
        vram_used = torch.cuda.memory_allocated(0) / 1e9
        print(f"  GPU VRAM used after CLIP load: {vram_used:.2f}GB")

    # [2/5] Load data
    print("\n[2/5] Loading data...")
    real_paths = get_real_images(MAX_PER_CLASS)
    fake_paths = generate_sbi_fakes(real_paths, FAKE_DIR, MAX_PER_CLASS)

    n          = min(len(real_paths), len(fake_paths))
    real_paths = random.sample(real_paths, n)
    fake_paths = random.sample(fake_paths, n)

    all_paths  = real_paths + fake_paths
    all_labels = [0.0] * n + [1.0] * n

    combined = list(zip(all_paths, all_labels))
    random.shuffle(combined)
    all_paths, all_labels = zip(*combined)
    all_paths, all_labels = list(all_paths), list(all_labels)

    n_val       = int(len(all_paths) * VAL_SPLIT)
    train_paths = all_paths[n_val:]; train_labels = all_labels[n_val:]
    val_paths   = all_paths[:n_val]; val_labels   = all_labels[:n_val]
    print(f"  Train: {len(train_paths)} | Val: {len(val_paths)}")

    # [3/5] Extract features (runs on GPU! cached after first run)
    print("\n[3/5] Extracting CLIP features...")
    train_feat_file = os.path.join(FEAT_CACHE_DIR, "train")
    val_feat_file   = os.path.join(FEAT_CACHE_DIR, "val")

    X_train, y_train = extract_features(train_paths, train_labels, clip_model, processor, train_feat_file)
    X_val,   y_val   = extract_features(val_paths,   val_labels,   clip_model, processor, val_feat_file)

    # Free CLIP — we don't need it anymore
    print("  Freeing CLIP model from memory...")
    del clip_model
    gc.collect()
    if HAS_GPU:
        torch.cuda.empty_cache()

    # [4/5] Build TensorDataset
    print("\n[4/5] Building data loaders...")
    Xt = torch.from_numpy(X_train)
    yt = torch.from_numpy(y_train)
    Xv = torch.from_numpy(X_val)
    yv = torch.from_numpy(y_val)

    train_loader = DataLoader(TensorDataset(Xt, yt), batch_size=BATCH_SIZE, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(TensorDataset(Xv, yv), batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # [5/5] Train
    print(f"\n[5/5] Training probe ({EPOCHS} epochs)...")
    probe     = CLIPProbe(feat_dim).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.AdamW(probe.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    best_val_acc = 0.0
    history      = []

    for epoch in range(1, EPOCHS + 1):
        # Train
        probe.train()
        t_loss, t_correct, t_total = 0.0, 0, 0
        for X_batch, y_batch in train_loader:
            X_batch = X_batch.to(device)
            y_batch = y_batch.to(device)
            optimizer.zero_grad()
            logits  = probe(X_batch)
            loss    = criterion(logits, y_batch)
            loss.backward()
            optimizer.step()
            preds      = (logits.detach() > 0).float()
            t_correct += (preds == y_batch).sum().item()
            t_total   += y_batch.size(0)
            t_loss    += loss.item() * y_batch.size(0)
        t_acc  = 100.0 * t_correct / max(t_total, 1)
        t_loss /= max(t_total, 1)

        # Validate
        probe.eval()
        v_correct, v_total = 0, 0
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch = X_batch.to(device)
                y_batch = y_batch.to(device)
                logits  = probe(X_batch)
                preds   = (logits > 0).float()
                v_correct += (preds == y_batch).sum().item()
                v_total   += y_batch.size(0)
        v_acc = 100.0 * v_correct / max(v_total, 1)

        scheduler.step()
        history.append({
            "epoch": epoch, "train_acc": round(t_acc, 2),
            "val_acc": round(v_acc, 2), "train_loss": round(t_loss, 4)
        })
        print(f"Epoch {epoch:2d}/{EPOCHS} | Loss={t_loss:.4f} | Train={t_acc:.2f}% | Val={v_acc:.2f}%", flush=True)

        if v_acc > best_val_acc:
            best_val_acc = v_acc
            torch.save({
                "epoch":            epoch,
                "probe_state_dict": probe.state_dict(),
                "val_acc":          v_acc,
                "clip_model_id":    "openai/clip-vit-large-patch14",
                "feat_dim":         feat_dim,
                "arch":             "BCEWithLogitsLoss_single_logit",
                "pytorch_version":  torch.__version__,
                "device":           GPU_MODE,
            }, CKPT_PATH)
            print(f"  ✅ NEW BEST saved (val={v_acc:.2f}%)")

        with open(HISTORY_PATH, "w") as f:
            json.dump(history, f, indent=2)

    print(f"\n🏁 DONE! Best val acc: {best_val_acc:.2f}%")
    print(f"   Saved to: {CKPT_PATH}")
    return best_val_acc


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        print(f"\n❌ FATAL ERROR: {e}")
        traceback.print_exc()
        sys.exit(1)
