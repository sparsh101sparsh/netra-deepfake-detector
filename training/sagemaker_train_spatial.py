"""
training/sagemaker_train_spatial.py
SageMaker entry-point: EfficientNet-B4 fine-tuning for NETRA spatial detector.
Runs inside SageMaker PyTorch container on ml.g4dn.xlarge Spot instance.

Input layout (read from SM_CHANNEL_TRAINING):
  /opt/ml/input/data/training/real/*.jpg    ← IMFDB + FairFace (~37k images)
  /opt/ml/input/data/training/fake/*.jpg    ← DF-Platter micro (~2k images)

Output:
  /opt/ml/model/model.pt                    ← Best epoch weights (canonical name)
  /opt/ml/model/metrics.json               ← Final AUC + epoch count

S3 final path (promoted by promote_model.py):
  s3://netra-models/spatial/model.pt

Priority: Should-Have. USE_PRETRAINED_ONLY=true skips fine-tune entirely.
"""
import os
import sys
import argparse
import json
import shutil
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms, models
    from sklearn.metrics import roc_auc_score
    import numpy as np
    TORCH_OK = True
except ImportError:
    TORCH_OK = False

# ─── WandB (optional) ─────────────────────────────────────────────────────────
try:
    import wandb
    WANDB_KEY = os.getenv("WANDB_API_KEY", "")
    if WANDB_KEY:
        wandb.login(key=WANDB_KEY)
    WANDB_OK = True
except ImportError:
    WANDB_OK = False

PRETRAINED_ONLY = os.getenv("USE_PRETRAINED_ONLY", "true").lower() == "true"


# ─── SageMaker channel paths ───────────────────────────────────────────────────
SM_DATA_DIR  = os.getenv("SM_CHANNEL_TRAINING", "/opt/ml/input/data/training")
SM_MODEL_DIR = os.getenv("SM_MODEL_DIR",        "/opt/ml/model")
SM_CKPT_DIR  = os.getenv("SM_CHECKPOINT_PATH",  "/opt/ml/checkpoints")  # Spot resume
os.makedirs(SM_MODEL_DIR, exist_ok=True)
os.makedirs(SM_CKPT_DIR,  exist_ok=True)


# ─── SBI Augmentation (Self-Blended Images) ───────────────────────────────────
# SBI blends a real face with itself using alpha masks to create pseudo-fakes.
# This teaches EfficientNet-B4 to detect blending artifacts without needing
# large amounts of real deepfake data.

def sbi_augment(img_pil):
    """
    Self-Blended Image augmentation on a PIL Image.
    Randomly blends the image with a color-jittered copy via a random soft mask.
    Returns PIL Image (preserves real label — SBI creates 'hard examples' of real).
    Probability: 30% chance applied (rest pass through unchanged).
    """
    import random
    if not PIL_OK or random.random() > 0.30:
        return img_pil  # Pass through unchanged 70% of the time

    try:
        from PIL import ImageFilter
        import numpy as np

        arr = np.array(img_pil).astype(np.float32)
        h, w = arr.shape[:2]

        # Random soft elliptical alpha mask
        cx, cy = random.randint(w // 4, 3 * w // 4), random.randint(h // 4, 3 * h // 4)
        rx, ry = random.randint(w // 6, w // 3), random.randint(h // 6, h // 3)
        Y, X = np.ogrid[:h, :w]
        dist = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
        alpha = np.clip(1.0 - dist, 0, 1).astype(np.float32)
        # Smooth the mask
        alpha_blur = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(radius=max(2, w // 20))
        )).astype(np.float32) / 255.0
        alpha3 = alpha_blur[:, :, np.newaxis]

        # Source image with colour jitter (simulates lighting change)
        jitter_strength = random.uniform(0.1, 0.3)
        src = arr * (1.0 + random.uniform(-jitter_strength, jitter_strength))
        src = np.clip(src, 0, 255)

        # Blend
        blended = alpha3 * src + (1.0 - alpha3) * arr
        blended = np.clip(blended, 0, 255).astype(np.uint8)
        return Image.fromarray(blended)
    except Exception:
        return img_pil  # Fail silently — augmentation is optional


try:
    from PIL import Image
    PIL_OK = True
except ImportError:
    PIL_OK = False


# ─── Dataset ───────────────────────────────────────────────────────────────────────────────
class DeepfakeFrameDataset(Dataset):
    """
    Expects directory layout:
      <root>/real/*.jpg    ← label 0 (authentic)
      <root>/fake/*.jpg    ← label 1 (deepfake)
    SBI augmentation is applied on-the-fly to 'real' images.
    Handles subdirectories (IMFDB has per-actor subdirs).
    """
    def __init__(self, root: str, transform=None, apply_sbi: bool = True):
        self.apply_sbi = apply_sbi
        self.samples = []
        for label, cls in [(0, "real"), (1, "fake")]:
            p = Path(root) / cls
            if p.exists():
                for f in p.rglob("*.jpg"):    # rglob handles subdirectories
                    self.samples.append((str(f), label))
                for f in p.rglob("*.JPEG"):
                    self.samples.append((str(f), label))
        self.transform = transform
        print(f"[Dataset] {len(self.samples)} samples from {root}")
        real_count = sum(1 for _, l in self.samples if l == 0)
        fake_count = sum(1 for _, l in self.samples if l == 1)
        print(f"[Dataset] Real: {real_count:,}  Fake: {fake_count:,}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            from PIL import Image
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224))
        # Apply SBI only to real images (label == 0) to create hard examples
        if self.apply_sbi and label == 0:
            img = sbi_augment(img)
        if self.transform:
            img = self.transform(img)
        return img, label


# ─── Model ────────────────────────────────────────────────────────────────────
def build_model(device: str) -> nn.Module:
    """EfficientNet-B4 with binary classification head."""
    if not TORCH_OK:
        raise RuntimeError("PyTorch not available")
    from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights
    model = efficientnet_b4(weights=EfficientNet_B4_Weights.IMAGENET1K_V1)
    # Replace classifier head for binary output
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, 1)
    return model.to(device)


def load_checkpoint(model: nn.Module, optimizer, ckpt_dir: str):
    """Resume from latest checkpoint if it exists (Spot instance recovery)."""
    ckpts = sorted(Path(ckpt_dir).glob("epoch_*.pth"))
    if not ckpts:
        return 0
    latest = ckpts[-1]
    state = torch.load(latest, map_location="cpu")
    model.load_state_dict(state["model"])
    optimizer.load_state_dict(state["optimizer"])
    start_epoch = state["epoch"] + 1
    print(f"[Checkpoint] Resumed from epoch {state['epoch']} ({latest.name})")
    return start_epoch


# ─── Training loop ────────────────────────────────────────────────────────────
def train(args):
    if not TORCH_OK:
        print("[ERROR] PyTorch not installed — cannot train")
        sys.exit(1)

    if torch.cuda.is_available():
        device = "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"
    print(f"[Train] Device: {device} | Epochs: {args.epochs} | LR: {args.lr}")

    tfm = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(0.2, 0.2, 0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    dataset = DeepfakeFrameDataset(SM_DATA_DIR, transform=tfm, apply_sbi=True)
    if len(dataset) == 0:
        print("[WARN] No training data found — saving pretrained model only")
        _save_pretrained_only()
        return

    # ── Train / val split (90/10) ────────────────────────────────────────────────
    import random
    all_indices = list(range(len(dataset)))
    random.shuffle(all_indices)
    val_size  = max(1, int(0.10 * len(all_indices)))
    val_idx   = all_indices[:val_size]
    train_idx = all_indices[val_size:]
    from torch.utils.data import Subset
    train_set = Subset(dataset, train_idx)
    val_set   = Subset(dataset, val_idx)
    print(f"[Train] Split: {len(train_set):,} train / {len(val_set):,} val")

    # Val uses no augmentation
    val_tfm = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_dataset = DeepfakeFrameDataset(SM_DATA_DIR, transform=val_tfm, apply_sbi=False)
    val_set = Subset(val_dataset, val_idx)

    loader     = DataLoader(train_set, batch_size=args.batch_size, shuffle=True,
                            num_workers=0, pin_memory=(device == "cuda"))
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False,
                            num_workers=0, pin_memory=(device == "cuda"))

    model     = build_model(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    start_epoch = load_checkpoint(model, optimizer, SM_CKPT_DIR)

    if WANDB_OK and WANDB_KEY:
        wandb.init(project=os.getenv("WANDB_PROJECT", "netra-v5"),
                   name="spatial-efficientnet-b4",
                   config=vars(args))

    best_auc = 0.0

    for epoch in range(start_epoch, args.epochs):
        # ── Train ──────────────────────────────────────────────────────────────
        model.train()
        total_loss = 0.0
        for imgs, labels in loader:
            imgs   = imgs.to(device)
            labels = labels.float().to(device).unsqueeze(1)
            optimizer.zero_grad()
            logits = model(imgs)
            loss   = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        avg_loss = total_loss / len(loader)
        scheduler.step()

        # ── Val eval (on dedicated val split) ─────────────────────────────────
        model.eval()
        all_probs, all_labels_val = [], []
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs   = imgs.to(device)
                probs  = torch.sigmoid(model(imgs)).cpu().numpy()
                all_probs.extend(probs.flatten())
                all_labels_val.extend(labels.numpy())
        try:
            auc = roc_auc_score(all_labels_val, all_probs)
        except Exception:
            auc = 0.0

        print(f"[Epoch {epoch+1}/{args.epochs}] loss={avg_loss:.4f} auc={auc:.4f}")
        # SageMaker metrics regex pattern: "auc: 0.9500"
        print(f"auc: {auc:.4f}")

        if WANDB_OK and WANDB_KEY:
            wandb.log({"epoch": epoch+1, "loss": avg_loss, "auc": auc})

        # Save checkpoint (Spot resume)
        ckpt = {"epoch": epoch, "model": model.state_dict(), "optimizer": optimizer.state_dict()}
        torch.save(ckpt, f"{SM_CKPT_DIR}/epoch_{epoch:03d}.pth")

        # Save best model — canonical name model.pt (NOT .pth)
        if auc > best_auc:
            best_auc = auc
            torch.save(model.state_dict(), f"{SM_MODEL_DIR}/model.pt")
            print(f"[Best] New best AUC: {best_auc:.4f} → saved as model.pt")

    print(f"[Done] Best val AUC: {best_auc:.4f}")
    print(f"[Done] Fine-tuned model saved to {SM_MODEL_DIR}/model.pt")
    print(f"[Done] SageMaker will tar this to s3://netra-models/training-output/*.tar.gz")
    print(f"[Done] Run: python training/promote_model.py   to extract → s3://netra-models/spatial/model.pt")
    with open(f"{SM_MODEL_DIR}/metrics.json", "w") as f:
        json.dump({"best_auc": best_auc, "epochs": args.epochs}, f)

    if WANDB_OK and WANDB_KEY:
        wandb.finish()


def _save_pretrained_only():
    """When USE_PRETRAINED_ONLY=true or no data, re-package HF pretrained weights."""
    print("[Pretrained] Downloading EfficientNet-B4 pretrained weights to S3 only...")
    try:
        from transformers import AutoFeatureExtractor, AutoModelForImageClassification
        model = AutoModelForImageClassification.from_pretrained("Wvolfas/deepfake-video-detection")
        model.save_pretrained(SM_MODEL_DIR)
        print(f"[Pretrained] Saved to {SM_MODEL_DIR}")
    except Exception as e:
        print(f"[Pretrained] Error: {e}")


# ─── Entry ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs",     type=int,   default=5)     # 5 for mini-run, 30 for full
    parser.add_argument("--lr",         type=float, default=1e-4)
    parser.add_argument("--batch-size", type=int,   default=16)
    args = parser.parse_args()

    if PRETRAINED_ONLY:
        print("[Mode] USE_PRETRAINED_ONLY=true — skipping fine-tune")
        _save_pretrained_only()
    else:
        train(args)
