"""
scripts/prepare_datasets.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dataset preparation pipeline for NETRA v5.0 EfficientNet-B4 fine-tuning.

Datasets prepared:
  1. IMFDB Complete     → all 34,512 real Indian faces (already cropped by CVIT)
  2. DF-Platter Micro   → ≤ 2,000 deepfake face crops from 5 videos only
  3. FairFace Indian    → ~3,000 Indian faces (HuggingFace auto-download)
  4. Celeb-DF v2 sample → ~500 frames (test split only)

All images resized to 224×224 JPEGs before S3 upload.
Total target: ≤ 7.5 GB on S3.

Final S3 layout (what SageMaker reads):
  s3://netra-datasets/training/real/    ← IMFDB + FairFace
  s3://netra-datasets/training/fake/    ← DF-Platter + Celeb-DF
  s3://netra-datasets/training/test/real/
  s3://netra-datasets/training/test/fake/

Source archives (stored separately for audit):
  s3://netra-datasets/imfdb/
  s3://netra-datasets/df_platter_micro/
  s3://netra-datasets/fairface_indian/
  s3://netra-datasets/celebdf_sample/

Usage:
  python scripts/prepare_datasets.py --step all
  python scripts/prepare_datasets.py --step imfdb
  python scripts/prepare_datasets.py --step fairface
  python scripts/prepare_datasets.py --step dfplatter --dfplatter-dir /path/to/df_platter_videos
  python scripts/prepare_datasets.py --step celebdf --celebdf-dir /path/to/celeb_df_frames
  python scripts/prepare_datasets.py --step upload   # Upload processed crops to S3
  python scripts/prepare_datasets.py --step verify   # Check S3 sizes + counts
  python scripts/prepare_datasets.py --dry-run       # Print actions, no upload
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import sys
import json
import time
import shutil
import hashlib
import argparse
import tempfile
import urllib.request
from pathlib import Path
from typing import List, Tuple, Optional

from dotenv import load_dotenv
load_dotenv()

# ─── Optional heavy deps (skip gracefully if not installed) ───────────────────
try:
    from PIL import Image
    PIL_OK = True
except ImportError:
    PIL_OK = False
    print("⚠️  Pillow not installed — run: pip install Pillow")

try:
    import boto3
    S3_OK = True
except ImportError:
    S3_OK = False
    print("⚠️  boto3 not installed — run: pip install boto3")

try:
    import cv2
    CV2_OK = True
except ImportError:
    CV2_OK = False  # Pillow fallback used

try:
    import datasets as hf_datasets
    HF_DATASETS_OK = True
except ImportError:
    HF_DATASETS_OK = False

# ─── Config ───────────────────────────────────────────────────────────────────
S3_BUCKET_DATASETS = os.getenv("S3_BUCKET_DATASETS", "netra-datasets")
REGION             = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
HF_TOKEN           = os.getenv("HF_TOKEN", "")
WANDB_KEY          = os.getenv("WANDB_API_KEY", "")

# Local workspace inside /tmp (EC2 has ~50 GB NVMe; Mac has local disk)
WORK_DIR = Path(os.getenv("NETRA_WORK_DIR", "/tmp/netra_datasets"))

# S3 prefixes
S3_IMFDB     = "imfdb/"
S3_DFPLATTER = "df_platter_micro/"
S3_FAIRFACE  = "fairface_indian/"
S3_CELEBDF   = "celebdf_sample/"
S3_TRAIN     = "training/"          # What SageMaker reads

# Resize target
IMG_SIZE = (224, 224)
JPEG_QUALITY = 92

# Hard limits
MAX_DFPLATTER_CROPS = 2000
MAX_FAIRFACE_CROPS  = 3000
MAX_CELEBDF_FRAMES  = 500
MAX_TOTAL_GB        = 9.5   # Fail-safe before hitting 10 GB limit

s3 = boto3.client("s3", region_name=REGION) if S3_OK else None


# ─── Utilities ────────────────────────────────────────────────────────────────

def log(msg: str, level: str = "INFO") -> None:
    icons = {"INFO": "ℹ️ ", "OK": "✅", "WARN": "⚠️ ", "ERROR": "❌", "STEP": "🔷"}
    print(f"{icons.get(level, '  ')} {msg}", flush=True)


def resize_to_jpeg(src_path: Path, dst_path: Path, size: Tuple[int, int] = IMG_SIZE) -> bool:
    """Resize image to size and save as JPEG. Returns True on success."""
    try:
        if CV2_OK:
            img = cv2.imread(str(src_path))
            if img is None:
                return False
            img = cv2.resize(img, size, interpolation=cv2.INTER_AREA)
            cv2.imwrite(str(dst_path), img, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        elif PIL_OK:
            with Image.open(src_path) as img:
                img = img.convert("RGB").resize(size, Image.LANCZOS)
                img.save(dst_path, "JPEG", quality=JPEG_QUALITY)
        else:
            return False
        return True
    except Exception as e:
        log(f"  resize failed {src_path.name}: {e}", "WARN")
        return False


def upload_dir_to_s3(local_dir: Path, s3_prefix: str, dry_run: bool = False) -> Tuple[int, float]:
    """
    Upload all JPEGs in local_dir to s3://netra-datasets/<s3_prefix>/.
    Returns (count, total_mb).
    Idempotent — skips files already in S3 by checking object existence.
    """
    if not S3_OK:
        log("boto3 not available — cannot upload", "ERROR")
        return 0, 0.0

    files = list(local_dir.rglob("*.jpg")) + list(local_dir.rglob("*.jpeg")) + list(local_dir.rglob("*.JPEG"))
    total_mb = sum(f.stat().st_size for f in files) / 1024 / 1024
    log(f"Uploading {len(files):,} files ({total_mb:.1f} MB) → s3://{S3_BUCKET_DATASETS}/{s3_prefix}")

    if dry_run:
        log("[DRY RUN] Skipping actual upload", "WARN")
        return len(files), total_mb

    import concurrent.futures
    ok = 0
    
    def _upload(fpath):
        rel = fpath.relative_to(local_dir)
        s3_key = s3_prefix + str(rel)
        try:
            try:
                s3.head_object(Bucket=S3_BUCKET_DATASETS, Key=s3_key)
                return True
            except s3.exceptions.ClientError if hasattr(s3, 'exceptions') else Exception:
                pass
            except Exception:
                pass
            
            s3.upload_file(str(fpath), S3_BUCKET_DATASETS, s3_key)
            return True
        except Exception as e:
            log(f"  Upload failed {fpath.name}: {e}", "WARN")
            return False

    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
        futures = [executor.submit(_upload, f) for f in files]
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            if future.result():
                ok += 1
            if (i + 1) % 500 == 0:
                log(f"  Progress: {i+1}/{len(files)}", "INFO")

    log(f"Uploaded {ok}/{len(files)} files to s3://{S3_BUCKET_DATASETS}/{s3_prefix}", "OK")
    return ok, total_mb


def check_s3_gb_total() -> float:
    """Return total GB currently used in netra-datasets bucket."""
    if not S3_OK:
        return 0.0
    try:
        paginator = s3.get_paginator("list_objects_v2")
        total_bytes = 0
        for page in paginator.paginate(Bucket=S3_BUCKET_DATASETS):
            for obj in page.get("Contents", []):
                total_bytes += obj.get("Size", 0)
        return total_bytes / 1024 / 1024 / 1024
    except Exception as e:
        log(f"Could not measure S3 size: {e}", "WARN")
        return 0.0


# ─── Step 1: IMFDB ────────────────────────────────────────────────────────────

def prepare_imfdb(imfdb_src: Optional[Path] = None, dry_run: bool = False) -> int:
    """
    Prepare IMFDB Complete dataset.

    If imfdb_src is given: expects extracted directory with any of:
      - JPEGs already (just resize + upload)
      - Subfolders by actor name with face crops

    IMFDB is pre-cropped by CVIT — no face detection needed.
    All images → training/real/ on S3.
    Returns count of processed images.
    """
    log("STEP 1: IMFDB Complete — 34,512 real Indian faces", "STEP")

    out_dir = WORK_DIR / "imfdb_processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    if imfdb_src is None:
        log("IMFDB source not provided via --imfdb-dir", "WARN")
        log("To get IMFDB:", "INFO")
        log("  1. Go to: https://cvit.iiit.ac.in/projects/IMFDB/", "INFO")
        log("  2. Fill the access form (research use)", "INFO")
        log("  3. Download IMFDB.tar.gz (~3-4 GB)", "INFO")
        log("  4. Extract: tar -xzf IMFDB.tar.gz", "INFO")
        log("  5. Re-run: python scripts/prepare_datasets.py --step imfdb --imfdb-dir /path/to/IMFDB", "INFO")
        log("Skipping IMFDB for now — will proceed with other datasets", "WARN")
        return 0

    src = Path(imfdb_src)
    if not src.exists():
        log(f"IMFDB source path not found: {src}", "ERROR")
        return 0

    # Find all image files (IMFDB uses .jpg, .JPG, .png)
    exts = ["*.jpg", "*.JPG", "*.jpeg", "*.JPEG", "*.png", "*.PNG"]
    all_images = []
    for ext in exts:
        all_images.extend(src.rglob(ext))

    log(f"Found {len(all_images):,} images in {src}", "INFO")

    processed = 0
    for img_path in all_images:
        dst = out_dir / f"imfdb_{img_path.stem}_{processed:06d}.jpg"
        if dst.exists():  # Idempotent
            processed += 1
            continue
        if resize_to_jpeg(img_path, dst):
            processed += 1

        if processed % 1000 == 0 and processed > 0:
            log(f"  Processed {processed:,}/{len(all_images):,} IMFDB images", "INFO")

    log(f"IMFDB: {processed:,} images ready in {out_dir}", "OK")

    if not dry_run:
        # Upload to both audit path and training/real/
        upload_dir_to_s3(out_dir, S3_IMFDB, dry_run)
        upload_dir_to_s3(out_dir, S3_TRAIN + "real/imfdb/", dry_run)

    return processed


# ─── Step 2: DF-Platter Micro-Sample ─────────────────────────────────────────

def prepare_dfplatter(dfplatter_src: Optional[Path] = None, dry_run: bool = False) -> int:
    """
    Extract ≤ 2,000 face crops from ≤ 5 DF-Platter videos.

    DF-Platter requires license from: https://iab-rubric.org/df-platter-database
    After getting access, download any 5 videos and point --dfplatter-dir to them.

    If videos: uses OpenCV to extract 1 frame/sec, then MediaPipe face detection.
    If dir already has JPEGs: just resize and upload.
    Returns count.
    """
    log("STEP 2: DF-Platter Micro-Sample — ≤ 2,000 deepfake face crops", "STEP")

    out_dir = WORK_DIR / "dfplatter_processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    if dfplatter_src is None:
        log("DF-Platter source not provided via --dfplatter-dir", "WARN")
        log("DF-Platter requires a license request:", "INFO")
        log("  1. Go to: https://iab-rubric.org/df-platter-database", "INFO")
        log("  2. Fill the access form (research use)", "INFO")
        log("  3. Download ANY 5 videos from the dataset", "INFO")
        log("  4. Re-run: python scripts/prepare_datasets.py --step dfplatter --dfplatter-dir /path/to/5_videos", "INFO")
        log("Skipping DF-Platter for now", "WARN")
        return 0

    src = Path(dfplatter_src)
    if not src.exists():
        log(f"DF-Platter path not found: {src}", "ERROR")
        return 0

    # Case A: directory already contains pre-extracted face crop JPEGs
    existing_jpegs = list(src.rglob("*.jpg")) + list(src.rglob("*.JPG"))
    if existing_jpegs:
        log(f"Found {len(existing_jpegs)} pre-extracted JPEGs in {src}", "INFO")
        processed = 0
        for img_path in existing_jpegs[:MAX_DFPLATTER_CROPS]:
            dst = out_dir / f"dfplatter_{processed:06d}.jpg"
            if dst.exists():
                processed += 1
                continue
            if resize_to_jpeg(img_path, dst):
                processed += 1
        log(f"DF-Platter: {processed:,} face crops ready", "OK")
        if not dry_run:
            upload_dir_to_s3(out_dir, S3_DFPLATTER, dry_run)
            upload_dir_to_s3(out_dir, S3_TRAIN + "fake/dfplatter/", dry_run)
        return processed

    # Case B: directory contains video files → extract frames
    if not CV2_OK:
        log("OpenCV not available for video extraction. Install: pip install opencv-python", "ERROR")
        log("Alternatively, pre-extract frames and use --dfplatter-dir with JPEG files", "INFO")
        return 0

    video_exts = ["*.mp4", "*.avi", "*.mov", "*.mkv"]
    videos = []
    for ext in video_exts:
        videos.extend(src.glob(ext))
    videos = videos[:5]  # Hard cap: max 5 videos

    log(f"Processing {len(videos)} DF-Platter videos (max 5)", "INFO")

    total_crops = 0
    crops_per_video = MAX_DFPLATTER_CROPS // max(len(videos), 1)

    try:
        import mediapipe as mp
        face_det = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
        USE_MEDIAPIPE = True
        log("Using MediaPipe face detection", "INFO")
    except ImportError:
        USE_MEDIAPIPE = False
        log("MediaPipe not available — saving raw frames (no face crop)", "WARN")

    for vid_idx, video_path in enumerate(videos):
        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        frame_interval = max(1, int(fps))  # 1 frame per second
        frame_count = 0
        crops_this_video = 0

        log(f"  Processing video {vid_idx+1}/{len(videos)}: {video_path.name}", "INFO")

        while cap.isOpened() and crops_this_video < crops_per_video and total_crops < MAX_DFPLATTER_CROPS:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                if USE_MEDIAPIPE:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = face_det.process(rgb)
                    if results.detections:
                        det = results.detections[0]
                        bb = det.location_data.relative_bounding_box
                        h, w = frame.shape[:2]
                        x1 = max(0, int(bb.xmin * w))
                        y1 = max(0, int(bb.ymin * h))
                        x2 = min(w, int((bb.xmin + bb.width) * w))
                        y2 = min(h, int((bb.ymin + bb.height) * h))
                        if x2 > x1 and y2 > y1:
                            crop = frame[y1:y2, x1:x2]
                            crop = cv2.resize(crop, IMG_SIZE, interpolation=cv2.INTER_AREA)
                            dst = out_dir / f"dfplatter_{total_crops:06d}.jpg"
                            cv2.imwrite(str(dst), crop, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                            total_crops += 1
                            crops_this_video += 1
                else:
                    # No MediaPipe: save full frame resized
                    resized = cv2.resize(frame, IMG_SIZE, interpolation=cv2.INTER_AREA)
                    dst = out_dir / f"dfplatter_{total_crops:06d}.jpg"
                    cv2.imwrite(str(dst), resized, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                    total_crops += 1
                    crops_this_video += 1

            frame_count += 1

        cap.release()
        log(f"  Video {vid_idx+1}: extracted {crops_this_video} crops", "OK")

    log(f"DF-Platter: {total_crops:,} face crops ready", "OK")
    if not dry_run and total_crops > 0:
        upload_dir_to_s3(out_dir, S3_DFPLATTER, dry_run)
        upload_dir_to_s3(out_dir, S3_TRAIN + "fake/dfplatter/", dry_run)
    return total_crops


# ─── Step 3: FairFace Indian subset ──────────────────────────────────────────

def prepare_fairface(dry_run: bool = False) -> int:
    """
    Download FairFace dataset from HuggingFace (nateraw/fairface) and filter
    for race == 'Indian' or 'East Indian'. Target: ~3,000 images.
    Goes to training/real/ (authentic diverse Indian faces).
    """
    log("STEP 3: FairFace Indian subset — ~3,000 diverse Indian faces", "STEP")

    if not HF_DATASETS_OK:
        log("datasets library not installed. Run: pip install datasets", "ERROR")
        log("Skipping FairFace", "WARN")
        return 0

    out_dir = WORK_DIR / "fairface_processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Check if already processed (idempotent)
    existing = list(out_dir.glob("*.jpg"))
    if len(existing) >= MAX_FAIRFACE_CROPS:
        log(f"FairFace already processed ({len(existing)} images) — skipping re-download", "OK")
        if not dry_run:
            upload_dir_to_s3(out_dir, S3_FAIRFACE, dry_run)
            upload_dir_to_s3(out_dir, S3_TRAIN + "real/fairface/", dry_run)
        return len(existing)

    log("Downloading FairFace from HuggingFace (nateraw/fairface)...", "INFO")
    log("This may take a few minutes on first download (~1 GB)", "INFO")

    try:
        token = HF_TOKEN if HF_TOKEN else None
        ds = hf_datasets.load_dataset(
            "nateraw/fairface",
            split="train",
            token=token,
            trust_remote_code=True,
        )
    except Exception as e:
        log(f"Failed to load FairFace dataset: {e}", "ERROR")
        log("Try: pip install datasets huggingface_hub", "WARN")
        return 0

    # FairFace labels: 'Black' (0), 'East Asian' (1), 'Indian' (2),
    #                  'Latino_Hispanic' (3), 'Middle Eastern' (4), 
    #                  'Southeast Asian' (5), 'White' (6)
    INDIAN_RACE_ID = 2
    log(f"Dataset size: {len(ds):,} samples — filtering for Indian race (ID={INDIAN_RACE_ID})", "INFO")

    processed = 0
    for sample in ds:
        if processed >= MAX_FAIRFACE_CROPS:
            break

        race = sample.get("race")
        if race != INDIAN_RACE_ID:
            continue

        try:
            import io
            if "img_bytes" in sample:
                img_data = sample["img_bytes"]
                img = Image.open(io.BytesIO(img_data))
            else:
                img = sample["image"]
            
            if not hasattr(img, "resize"):
                continue
            img = img.convert("RGB").resize(IMG_SIZE, Image.LANCZOS if PIL_OK else None)
            dst = out_dir / f"fairface_{processed:06d}.jpg"
            img.save(dst, "JPEG", quality=JPEG_QUALITY)
            processed += 1
        except Exception as e:
            log(f"  sample {processed} error: {e}", "WARN")
            continue

        if processed % 500 == 0:
            log(f"  FairFace Indian: {processed:,} processed", "INFO")

    log(f"FairFace: {processed:,} Indian faces ready in {out_dir}", "OK")

    if not dry_run and processed > 0:
        upload_dir_to_s3(out_dir, S3_FAIRFACE, dry_run)
        upload_dir_to_s3(out_dir, S3_TRAIN + "real/fairface/", dry_run)

    return processed


# ─── Step 4: Celeb-DF v2 sample (test only) ──────────────────────────────────

def prepare_celebdf(celebdf_src: Optional[Path] = None, dry_run: bool = False) -> int:
    """
    Prepare Celeb-DF v2 sample for cross-domain evaluation (test split ONLY).
    Expects up to 500 pre-extracted frames.

    Official download: https://github.com/yuezunli/celeb-deepfakeforensics
    Must sign the form and get direct link from authors.

    After download, extract any frames folder and pass --celebdf-dir.
    """
    log("STEP 4: Celeb-DF v2 sample — ~500 frames (test split only)", "STEP")

    out_dir = WORK_DIR / "celebdf_processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    if celebdf_src is None:
        log("Celeb-DF v2 source not provided via --celebdf-dir", "WARN")
        log("To get Celeb-DF v2:", "INFO")
        log("  1. Sign form at: github.com/yuezunli/celeb-deepfakeforensics", "INFO")
        log("  2. Download test video subset (not the full 2 GB)", "INFO")
        log("  3. Extract any 500 frames as JPEGs", "INFO")
        log("  4. Re-run: python scripts/prepare_datasets.py --step celebdf --celebdf-dir /path/to/frames", "INFO")
        log("Skipping Celeb-DF for now — fine-tuning will proceed without cross-domain test", "WARN")
        return 0

    src = Path(celebdf_src)
    if not src.exists():
        log(f"Celeb-DF path not found: {src}", "ERROR")
        return 0

    all_images = []
    for ext in ["*.jpg", "*.JPG", "*.jpeg", "*.png"]:
        all_images.extend(src.rglob(ext))
    all_images = all_images[:MAX_CELEBDF_FRAMES]

    processed = 0
    for img_path in all_images:
        dst = out_dir / f"celebdf_{processed:06d}.jpg"
        if dst.exists():
            processed += 1
            continue
        if resize_to_jpeg(img_path, dst):
            processed += 1

    log(f"Celeb-DF v2: {processed:,} frames ready (test split)", "OK")

    if not dry_run and processed > 0:
        upload_dir_to_s3(out_dir, S3_CELEBDF, dry_run)
        # Celeb-DF goes to test/fake/ (cross-domain test, not training)
        upload_dir_to_s3(out_dir, S3_TRAIN + "test/fake/celebdf/", dry_run)

    return processed


# ─── Step 5: Verify S3 state ──────────────────────────────────────────────────

def verify_s3_datasets() -> None:
    """Print counts and sizes for all dataset prefixes in S3."""
    log("Verifying S3 dataset state...", "STEP")

    if not S3_OK:
        log("boto3 not available", "ERROR")
        return

    prefixes = {
        "IMFDB (real)":         S3_IMFDB,
        "DF-Platter (fake)":    S3_DFPLATTER,
        "FairFace (real)":      S3_FAIRFACE,
        "Celeb-DF (test fake)": S3_CELEBDF,
        "Training/real/":       S3_TRAIN + "real/",
        "Training/fake/":       S3_TRAIN + "fake/",
    }

    total_gb = 0.0
    print()
    print(f"{'Dataset':<30} {'Count':>8} {'Size (MB)':>12}")
    print("-" * 55)

    for label, prefix in prefixes.items():
        try:
            paginator = s3.get_paginator("list_objects_v2")
            count = 0
            size_bytes = 0
            for page in paginator.paginate(Bucket=S3_BUCKET_DATASETS, Prefix=prefix):
                for obj in page.get("Contents", []):
                    count += 1
                    size_bytes += obj.get("Size", 0)
            size_mb = size_bytes / 1024 / 1024
            total_gb += size_bytes / 1024 / 1024 / 1024
            status = "✅" if count > 0 else "❌"
            print(f"{status} {label:<28} {count:>8,} {size_mb:>10.1f} MB")
        except Exception as e:
            print(f"❌ {label:<28} ERROR: {e}")

    print("-" * 55)
    limit_ok = "✅" if total_gb < MAX_TOTAL_GB else "⚠️ OVER LIMIT"
    print(f"   TOTAL: {total_gb:.2f} GB / {MAX_TOTAL_GB} GB limit  {limit_ok}")
    print()

    if total_gb > MAX_TOTAL_GB:
        log(f"WARNING: Total S3 usage {total_gb:.2f} GB exceeds {MAX_TOTAL_GB} GB limit!", "WARN")
        log("Delete celebdf_sample/ or reduce df_platter_micro/ if needed", "WARN")


# ─── Step 6: Print SageMaker data paths ──────────────────────────────────────

def print_sagemaker_data_config() -> None:
    """Print the exact S3 paths that training/launch_training.py should use."""
    print()
    log("SageMaker Training Data Config", "STEP")
    print(f"""
    training_input = TrainingInput(
        s3_data="s3://{S3_BUCKET_DATASETS}/{S3_TRAIN}",
        content_type="application/x-image",
    )

    # Layout inside SageMaker container:
    #   /opt/ml/input/data/training/real/   ← ~37,512 JPEG real faces
    #   /opt/ml/input/data/training/fake/   ← ~2,000 JPEG deepfake faces

    # Test set:
    #   /opt/ml/input/data/training/test/fake/  ← ~500 Celeb-DF frames
    """)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="NETRA Dataset Preparation Pipeline")
    parser.add_argument("--step", choices=["all", "imfdb", "fairface", "dfplatter", "celebdf", "upload", "verify"],
                        default="verify", help="Which step to run")
    parser.add_argument("--imfdb-dir",     type=str, default=None, help="Path to extracted IMFDB directory")
    parser.add_argument("--dfplatter-dir", type=str, default=None, help="Path to DF-Platter videos or pre-extracted JPEGs")
    parser.add_argument("--celebdf-dir",   type=str, default=None, help="Path to Celeb-DF v2 frames")
    parser.add_argument("--dry-run",       action="store_true",    help="Print actions without uploading")
    args = parser.parse_args()

    print("=" * 70)
    print("  NETRA v5.0 — Dataset Preparation Pipeline")
    print(f"  S3 Bucket: {S3_BUCKET_DATASETS}")
    print(f"  Work Dir:  {WORK_DIR}")
    print(f"  Dry Run:   {args.dry_run}")
    print("=" * 70)

    WORK_DIR.mkdir(parents=True, exist_ok=True)

    counts = {}

    if args.step in ("all", "imfdb"):
        counts["imfdb"] = prepare_imfdb(
            imfdb_src=Path(args.imfdb_dir) if args.imfdb_dir else None,
            dry_run=args.dry_run
        )

    if args.step in ("all", "fairface"):
        counts["fairface"] = prepare_fairface(dry_run=args.dry_run)

    if args.step in ("all", "dfplatter"):
        counts["dfplatter"] = prepare_dfplatter(
            dfplatter_src=Path(args.dfplatter_dir) if args.dfplatter_dir else None,
            dry_run=args.dry_run
        )

    if args.step in ("all", "celebdf"):
        counts["celebdf"] = prepare_celebdf(
            celebdf_src=Path(args.celebdf_dir) if args.celebdf_dir else None,
            dry_run=args.dry_run
        )

    verify_s3_datasets()
    print_sagemaker_data_config()

    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    for ds, cnt in counts.items():
        print(f"  {ds:<20} {cnt:>8,} images")

    total = sum(counts.values())
    print(f"  {'TOTAL':<20} {total:>8,} images")
    print()
    print("  Next steps:")
    print("  1. python scripts/verify_models.py        # Check models + data")
    print("  2. python training/launch_training.py     # Kick off SageMaker fine-tune")
    print("=" * 70)


if __name__ == "__main__":
    main()
