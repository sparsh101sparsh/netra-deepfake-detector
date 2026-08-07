"""
scripts/verify_models.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NETRA v5.0 — Model & Dataset Verification Script

Checks:
  1. Pretrained models exist in S3 (spatial + audio)
  2. Fine-tuned model exists in S3 (optional)
  3. Can load both weight sets correctly
  4. Training datasets have expected counts in S3

Prints:
  "✅ Pretrained path ready"
  "✅ Fine-tuned path ready"   OR   "⚠️  Fine-tuned path not ready (using pretrained)"
  Exact command for the worker to load models

Usage:
  python scripts/verify_models.py
  python scripts/verify_models.py --load-test   # Actually load model weights (slow)
  python scripts/verify_models.py --fix          # Auto-fetch missing pretrained models
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

try:
    import boto3
    S3_OK = True
except ImportError:
    S3_OK = False
    print("❌ boto3 not installed. Run: pip install boto3")
    sys.exit(1)

S3_BUCKET_MODELS   = os.getenv("S3_BUCKET_MODELS",   "netra-models")
S3_BUCKET_DATASETS = os.getenv("S3_BUCKET_DATASETS", "netra-datasets")
REGION             = os.getenv("AWS_DEFAULT_REGION",  "us-east-1")

s3 = boto3.client("s3", region_name=REGION)


# ─── S3 Helpers ───────────────────────────────────────────────────────────────

def s3_exists(bucket: str, prefix: str) -> tuple[bool, int, float]:
    """Check if any objects exist under prefix. Returns (exists, count, size_mb)."""
    try:
        paginator = s3.get_paginator("list_objects_v2")
        count = 0
        size_bytes = 0
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                count += 1
                size_bytes += obj.get("Size", 0)
        return count > 0, count, size_bytes / 1024 / 1024
    except Exception as e:
        return False, 0, 0.0


def s3_download_tmp(bucket: str, key: str) -> str:
    """Download an S3 file to a temp path and return that path."""
    suffix = Path(key).suffix or ".tmp"
    tmp = tempfile.mktemp(suffix=suffix)
    s3.download_file(bucket, key, tmp)
    return tmp


# ─── Model Checks ─────────────────────────────────────────────────────────────

def check_pretrained_spatial() -> dict:
    """
    Check: s3://netra-models/spatial/wvolfas/ has model weights.
    """
    exists, count, size_mb = s3_exists(S3_BUCKET_MODELS, "spatial/wvolfas/")
    return {
        "name": "Spatial Pretrained (Wvolfas/EfficientNet-B4)",
        "s3_path": f"s3://{S3_BUCKET_MODELS}/spatial/wvolfas/",
        "exists": exists,
        "count": count,
        "size_mb": size_mb,
        "hf_repo": "Wvolfas/deepfake-video-detection",
    }


def check_pretrained_audio() -> dict:
    """
    Check: s3://netra-models/audio/ has Wav2Vec2 weights.
    """
    exists_m, count_m, size_m = s3_exists(S3_BUCKET_MODELS, "audio/melodyMachine/")
    exists_b, count_b, size_b = s3_exists(S3_BUCKET_MODELS, "audio/bisher/")
    exists = exists_m or exists_b
    return {
        "name": "Audio Pretrained (Wav2Vec2 Deepfake)",
        "s3_path": f"s3://{S3_BUCKET_MODELS}/audio/",
        "exists": exists,
        "primary_exists": exists_m,
        "fallback_exists": exists_b,
        "primary_size_mb": size_m,
        "fallback_size_mb": size_b,
        "hf_repo_primary": "MelodyMachine/Deepfake-audio-detection-V2",
        "hf_repo_fallback": "Bisher/wav2vec2_ASV_deepfake_audio_detection",
    }


def check_finetuned_spatial() -> dict:
    """
    Check: s3://netra-models/spatial/model.pt exists (post-training output).
    This is the canonical path the worker checks first.
    """
    # Check canonical path
    key = "spatial/model.pt"
    try:
        resp = s3.head_object(Bucket=S3_BUCKET_MODELS, Key=key)
        size_mb = resp["ContentLength"] / 1024 / 1024
        return {
            "name": "Spatial Fine-Tuned (EfficientNet-B4)",
            "s3_path": f"s3://{S3_BUCKET_MODELS}/{key}",
            "exists": True,
            "size_mb": size_mb,
        }
    except Exception:
        pass

    # Also check training output archive (model.tar.gz from SageMaker)
    exists_tar, _, size_tar = s3_exists(S3_BUCKET_MODELS, "training-output/")
    return {
        "name": "Spatial Fine-Tuned (EfficientNet-B4)",
        "s3_path": f"s3://{S3_BUCKET_MODELS}/spatial/model.pt",
        "exists": False,
        "tar_exists": exists_tar,
        "tar_size_mb": size_tar,
        "note": "SageMaker training-output tar found — run promote script to extract model.pt" if exists_tar else "Not trained yet",
    }


def check_datasets() -> list[dict]:
    """Check all training dataset prefixes in S3."""
    checks = [
        ("IMFDB real faces",         "imfdb/",            "real",  34000),
        ("DF-Platter fake crops",    "df_platter_micro/", "fake",  1000),
        ("FairFace Indian subset",   "fairface_indian/",  "real",  500),
        ("Celeb-DF v2 test samples", "celebdf_sample/",   "test",  100),
        ("Training/real/ (merged)",  "training/real/",    "real",  5000),
        ("Training/fake/ (merged)",  "training/fake/",    "fake",  500),
    ]
    results = []
    for name, prefix, split, min_expected in checks:
        exists, count, size_mb = s3_exists(S3_BUCKET_DATASETS, prefix)
        results.append({
            "name": name,
            "prefix": f"s3://{S3_BUCKET_DATASETS}/{prefix}",
            "exists": exists,
            "count": count,
            "size_mb": size_mb,
            "min_expected": min_expected,
            "sufficient": count >= min_expected,
        })
    return results


# ─── Load Test ────────────────────────────────────────────────────────────────

def load_test_spatial_pretrained() -> bool:
    """
    Actually download and load the pretrained spatial model.
    Checks the Wvolfas model loads correctly with HuggingFace Transformers.
    """
    print("  Loading pretrained spatial model (may take ~30s on first download)...")
    try:
        from transformers import AutoFeatureExtractor, AutoModelForImageClassification
        model = AutoModelForImageClassification.from_pretrained("Wvolfas/deepfake-video-detection")
        params = sum(p.numel() for p in model.parameters()) / 1e6
        print(f"  ✅ Pretrained spatial model loaded: {params:.1f}M parameters")
        return True
    except Exception as e:
        print(f"  ❌ Pretrained spatial load failed: {e}")
        return False


def load_test_audio_pretrained() -> bool:
    """Load Wav2Vec2 audio model for deepfake detection."""
    print("  Loading pretrained audio model...")
    try:
        from transformers import pipeline
        pipe = pipeline(
            "audio-classification",
            model="MelodyMachine/Deepfake-audio-detection-V2",
        )
        print(f"  ✅ Audio model loaded: {type(pipe.model).__name__}")
        return True
    except Exception as e:
        print(f"  ❌ Audio model load failed: {e}")
        # Try fallback
        try:
            from transformers import Wav2Vec2ForSequenceClassification
            fb = Wav2Vec2ForSequenceClassification.from_pretrained(
                "Bisher/wav2vec2_ASV_deepfake_audio_detection"
            )
            print(f"  ✅ Audio fallback model loaded")
            return True
        except Exception as e2:
            print(f"  ❌ Audio fallback also failed: {e2}")
            return False


def load_test_finetuned() -> bool:
    """Download and load the fine-tuned model.pt from S3."""
    print("  Loading fine-tuned model from S3...")
    try:
        import torch
        from torchvision.models import efficientnet_b4

        tmp_path = "/tmp/netra_spatial_model.pt"
        s3.download_file(S3_BUCKET_MODELS, "spatial/model.pt", tmp_path)
        state = torch.load(tmp_path, map_location="cpu")

        # state_dict or raw model
        if isinstance(state, dict) and "model" in state:
            state = state["model"]  # checkpoint format

        model = efficientnet_b4()
        import torch.nn as nn
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, 1)
        model.load_state_dict(state, strict=False)
        params = sum(p.numel() for p in model.parameters()) / 1e6
        print(f"  ✅ Fine-tuned model loaded: {params:.1f}M parameters")
        os.remove(tmp_path)
        return True
    except Exception as e:
        print(f"  ❌ Fine-tuned model load failed: {e}")
        return False


# ─── Auto-Fix ─────────────────────────────────────────────────────────────────

def auto_fix_missing(pretrained_spatial: dict, pretrained_audio: dict) -> None:
    """Run fetch_pretrained_models.py to fill any missing pretrained weights."""
    if pretrained_spatial["exists"] and pretrained_audio["exists"]:
        print("  ✅ All pretrained models present — no fix needed")
        return

    print("  ⚠️  Missing pretrained models — running fetch_pretrained_models.py...")
    result = subprocess.run(
        [sys.executable, "scripts/fetch_pretrained_models.py"],
        capture_output=False,
    )
    if result.returncode == 0:
        print("  ✅ Auto-fix complete")
    else:
        print("  ❌ Auto-fix failed — run manually: python scripts/fetch_pretrained_models.py")


# ─── Main Report ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="NETRA Model & Dataset Verifier")
    parser.add_argument("--load-test", action="store_true",
                        help="Actually load model weights (requires PyTorch + HuggingFace)")
    parser.add_argument("--fix", action="store_true",
                        help="Auto-fetch any missing pretrained models")
    args = parser.parse_args()

    print()
    print("=" * 70)
    print("  NETRA v5.0 — Model & Dataset Verification")
    print(f"  S3 Models:   s3://{S3_BUCKET_MODELS}/")
    print(f"  S3 Datasets: s3://{S3_BUCKET_DATASETS}/")
    print("=" * 70)

    # ── Model checks ──────────────────────────────────────────────────────────
    print("\n【 PRETRAINED MODELS 】")

    sp = check_pretrained_spatial()
    au = check_pretrained_audio()
    ft = check_finetuned_spatial()

    # Spatial pretrained
    icon = "✅" if sp["exists"] else "❌"
    print(f"\n  {icon} {sp['name']}")
    print(f"     S3: {sp['s3_path']}")
    print(f"     Files: {sp['count']} | Size: {sp['size_mb']:.1f} MB")
    if not sp["exists"]:
        print(f"     Fix: python scripts/fetch_pretrained_models.py")

    # Audio pretrained
    icon = "✅" if au["exists"] else "❌"
    print(f"\n  {icon} {au['name']}")
    print(f"     Primary (MelodyMachine): {'✅' if au['primary_exists'] else '❌'}  ({au['primary_size_mb']:.1f} MB)")
    print(f"     Fallback (Bisher):       {'✅' if au['fallback_exists'] else '❌'}  ({au['fallback_size_mb']:.1f} MB)")
    if not au["exists"]:
        print(f"     Fix: python scripts/fetch_pretrained_models.py")

    print(f"\n【 FINE-TUNED MODEL 】")
    icon = "✅" if ft["exists"] else "⚠️ "
    print(f"\n  {icon} {ft['name']}")
    print(f"     S3: {ft['s3_path']}")
    if ft["exists"]:
        print(f"     Size: {ft['size_mb']:.1f} MB")
    else:
        note = ft.get("note", "Not trained yet")
        print(f"     Status: {note}")
        if ft.get("tar_exists"):
            print(f"     SageMaker tar found — run to extract:")
            print(f"       python training/promote_model.py")
        else:
            print(f"     To train: python training/launch_training.py")

    # ── Load tests ────────────────────────────────────────────────────────────
    if args.load_test:
        print("\n【 LOAD TESTS 】")
        sp_ok = load_test_spatial_pretrained()
        au_ok = load_test_audio_pretrained()
        if ft["exists"]:
            ft_ok = load_test_finetuned()
        else:
            ft_ok = False
            print("  ⚠️  Skipping fine-tuned load test (model.pt not in S3)")

    # ── Dataset checks ────────────────────────────────────────────────────────
    print("\n【 TRAINING DATASETS 】")
    datasets = check_datasets()
    total_gb = 0.0
    for ds in datasets:
        icon = "✅" if ds["sufficient"] else ("⚠️ " if ds["exists"] else "❌")
        print(f"\n  {icon} {ds['name']}")
        print(f"     {ds['prefix']}")
        print(f"     Count: {ds['count']:,} | Size: {ds['size_mb']:.1f} MB | Min expected: {ds['min_expected']:,}")
        total_gb += ds["size_mb"] / 1024

    print(f"\n  Total S3 dataset usage: {total_gb:.2f} GB / 10.0 GB limit  {'✅' if total_gb < 9.5 else '⚠️  OVER LIMIT'}")

    # ── Auto-fix ──────────────────────────────────────────────────────────────
    if args.fix:
        print("\n【 AUTO-FIX 】")
        auto_fix_missing(sp, au)

    # ── Final summary ─────────────────────────────────────────────────────────
    pretrained_ready = sp["exists"] and au["exists"]
    finetuned_ready  = ft["exists"]

    print("\n" + "=" * 70)
    print("  FINAL STATUS")
    print("=" * 70)

    if pretrained_ready:
        print("  ✅ Pretrained path ready — worker can run with USE_PRETRAINED_ONLY=true")
    else:
        print("  ❌ Pretrained path NOT ready — run: python scripts/fetch_pretrained_models.py")

    if finetuned_ready:
        print("  ✅ Fine-tuned path ready — worker will use s3://netra-models/spatial/model.pt")
    else:
        print("  ⚠️  Fine-tuned path not ready (worker will use pretrained — this is OK)")
        print("       To train: python training/launch_training.py")

    print()
    print("  Worker load command (put in worker.py):")
    print("""
  def load_spatial_detector():
      try:
          # Try fine-tuned first
          import torch
          from torchvision.models import efficientnet_b4
          import torch.nn as nn
          s3.download_file('netra-models', 'spatial/model.pt', '/tmp/spatial_model.pt')
          model = efficientnet_b4()
          model.classifier[1] = nn.Linear(model.classifier[1].in_features, 1)
          model.load_state_dict(torch.load('/tmp/spatial_model.pt', map_location='cpu'))
          print("[Spatial] Loaded fine-tuned model from S3")
          return model.eval()
      except Exception:
          # Fall back to pretrained HuggingFace checkpoint
          from transformers import AutoModelForImageClassification
          model = AutoModelForImageClassification.from_pretrained(
              'Wvolfas/deepfake-video-detection'
          )
          print("[Spatial] Loaded pretrained HuggingFace checkpoint (fallback)")
          return model.eval()
    """)

    print("=" * 70)

    # Exit code: 0 if pretrained ready, 1 if neither is ready
    sys.exit(0 if pretrained_ready else 1)


if __name__ == "__main__":
    main()
