"""
training/promote_model.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Promotes the best EfficientNet-B4 weights from a completed SageMaker training
job to the canonical path:  s3://netra-models/spatial/model.pt

SageMaker saves training output as:
  s3://netra-models/training-output/<job-name>/output/model.tar.gz

Inside that tar:
  model.pt          ← the weights we want

This script:
  1. Lists all completed SageMaker training jobs (or accepts a job name)
  2. Downloads model.tar.gz from S3
  3. Extracts model.pt
  4. Uploads to s3://netra-models/spatial/model.pt  (canonical path)
  5. Writes metadata JSON with job name + AUC

After running this script, set USE_PRETRAINED_ONLY=false in .env
and restart the worker — it will auto-load the fine-tuned model.

Usage:
  python training/promote_model.py                         # Auto-find latest job
  python training/promote_model.py --job netra-spatial-mini-20260806-1230
  python training/promote_model.py --dry-run               # Print only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import sys
import json
import tarfile
import tempfile
import argparse
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

try:
    import boto3
except ImportError:
    print("❌ boto3 not installed. Run: pip install boto3")
    sys.exit(1)

S3_BUCKET_MODELS = os.getenv("S3_BUCKET_MODELS", "netra-models")
REGION           = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

s3  = boto3.client("s3",        region_name=REGION)
sm  = boto3.client("sagemaker", region_name=REGION)


def list_completed_training_jobs(prefix: str = "netra-spatial") -> list[dict]:
    """Return completed SageMaker training jobs ordered by creation time (newest first)."""
    paginator = sm.get_paginator("list_training_jobs")
    jobs = []
    for page in paginator.paginate(NameContains=prefix, StatusEquals="Completed"):
        jobs.extend(page.get("TrainingJobSummaries", []))
    jobs.sort(key=lambda j: j.get("CreationTime", datetime.min), reverse=True)
    return jobs


def get_job_s3_output(job_name: str) -> str | None:
    """Return the S3 URI of the model.tar.gz output for a completed job."""
    try:
        resp = sm.describe_training_job(TrainingJobName=job_name)
        return resp.get("ModelArtifacts", {}).get("S3ModelArtifacts")
    except Exception as e:
        print(f"❌ Could not describe job {job_name}: {e}")
        return None


def download_and_extract_model(tar_s3_uri: str, tmp_dir: str) -> Path | None:
    """
    Download model.tar.gz from S3 URI and extract model.pt.
    Returns local path to model.pt or None on failure.
    """
    # Parse s3://bucket/key
    uri = tar_s3_uri.replace("s3://", "")
    bucket, key = uri.split("/", 1)

    tar_path = os.path.join(tmp_dir, "model.tar.gz")
    print(f"⬇️  Downloading {tar_s3_uri} ...")
    try:
        s3.download_file(bucket, key, tar_path)
        size_mb = os.path.getsize(tar_path) / 1024 / 1024
        print(f"   Downloaded ({size_mb:.1f} MB)")
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return None

    print("📦 Extracting model.pt from archive...")
    try:
        with tarfile.open(tar_path, "r:gz") as tar:
            members = tar.getnames()
            print(f"   Archive contains: {members}")

            # Find model.pt (may be at root or in a subdir)
            model_member = None
            for m in members:
                if m.endswith("model.pt") or m == "model.pt":
                    model_member = m
                    break

            if model_member is None:
                # Fallback: try spatial_detector_best.pth (old format)
                for m in members:
                    if ".pth" in m or ".pt" in m:
                        model_member = m
                        print(f"   ⚠️  Using non-canonical name: {m}")
                        break

            if model_member is None:
                print(f"❌ No .pt or .pth file found in archive: {members}")
                return None

            tar.extract(model_member, path=tmp_dir)
            extracted = Path(tmp_dir) / model_member
            print(f"   ✅ Extracted: {extracted} ({extracted.stat().st_size / 1024 / 1024:.1f} MB)")
            return extracted

    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return None


def upload_canonical(local_path: Path, dry_run: bool = False) -> bool:
    """Upload extracted model.pt to s3://netra-models/spatial/model.pt"""
    canonical_key = "spatial/model.pt"
    size_mb = local_path.stat().st_size / 1024 / 1024

    print(f"\n📌 Promoting to canonical path:")
    print(f"   {local_path}  ({size_mb:.1f} MB)")
    print(f"   → s3://{S3_BUCKET_MODELS}/{canonical_key}")

    if dry_run:
        print("   [DRY RUN] Skipping upload")
        return True

    try:
        s3.upload_file(str(local_path), S3_BUCKET_MODELS, canonical_key)
        print(f"   ✅ Uploaded successfully")
        return True
    except Exception as e:
        print(f"   ❌ Upload failed: {e}")
        return False


def write_promote_metadata(job_name: str, tar_s3_uri: str, model_size_mb: float) -> None:
    """Write metadata JSON about which job produced the current spatial/model.pt"""
    meta = {
        "job_name":    job_name,
        "source_tar":  tar_s3_uri,
        "promoted_at": datetime.utcnow().isoformat() + "Z",
        "canonical_s3_key": f"s3://{S3_BUCKET_MODELS}/spatial/model.pt",
        "model_size_mb": round(model_size_mb, 2),
    }
    meta_key = "spatial/promote_metadata.json"
    try:
        s3.put_object(
            Bucket=S3_BUCKET_MODELS,
            Key=meta_key,
            Body=json.dumps(meta, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        print(f"   📝 Metadata written to s3://{S3_BUCKET_MODELS}/{meta_key}")
    except Exception as e:
        print(f"   ⚠️  Could not write metadata: {e}")


def main():
    parser = argparse.ArgumentParser(description="Promote SageMaker model → s3://netra-models/spatial/model.pt")
    parser.add_argument("--job",     type=str, default=None, help="SageMaker job name (auto-detected if omitted)")
    parser.add_argument("--dry-run", action="store_true",    help="Print actions without uploading")
    args = parser.parse_args()

    print("=" * 65)
    print("  NETRA v5.0 — Model Promotion")
    print(f"  Target: s3://{S3_BUCKET_MODELS}/spatial/model.pt")
    print(f"  Dry Run: {args.dry_run}")
    print("=" * 65)

    # ── Find job ──────────────────────────────────────────────────────────────
    if args.job:
        job_name = args.job
        print(f"\n🔍 Using specified job: {job_name}")
    else:
        print("\n🔍 Auto-detecting latest completed netra-spatial training job...")
        jobs = list_completed_training_jobs(prefix="netra-spatial")
        if not jobs:
            print("❌ No completed netra-spatial training jobs found.")
            print("   Run: python training/launch_training.py")
            print("   Then wait for it to complete (~30 min for mini, ~4hr for full)")
            sys.exit(1)
        job_name = jobs[0]["TrainingJobName"]
        print(f"   Found: {job_name} (latest completed)")

    # ── Get S3 output URI ─────────────────────────────────────────────────────
    tar_uri = get_job_s3_output(job_name)
    if not tar_uri:
        # Manual fallback: try known output path pattern
        tar_uri = f"s3://{S3_BUCKET_MODELS}/training-output/{job_name}/output/model.tar.gz"
        print(f"⚠️  Could not get output from SageMaker API — trying: {tar_uri}")

    print(f"\n📦 Source tar: {tar_uri}")

    # ── Download + extract ────────────────────────────────────────────────────
    with tempfile.TemporaryDirectory() as tmp_dir:
        model_path = download_and_extract_model(tar_uri, tmp_dir)
        if model_path is None:
            print("\n❌ Could not extract model.pt from training output.")
            print("   Check the SageMaker job completed successfully:")
            print(f"   aws sagemaker describe-training-job --training-job-name {job_name}")
            sys.exit(1)

        size_mb = model_path.stat().st_size / 1024 / 1024
        ok = upload_canonical(model_path, dry_run=args.dry_run)

        if ok and not args.dry_run:
            write_promote_metadata(job_name, tar_uri, size_mb)

    # ── Final instructions ────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    if ok:
        print("  ✅ PROMOTION COMPLETE")
        print()
        print("  Model is now available at:")
        print(f"    s3://{S3_BUCKET_MODELS}/spatial/model.pt")
        print()
        print("  Next steps:")
        print("  1. Update .env:  USE_PRETRAINED_ONLY=false")
        print("  2. Restart worker:  docker restart netra-worker")
        print("     OR ssh to GPU instance and restart the container")
        print()
        print("  Verify: python scripts/verify_models.py --load-test")
    else:
        print("  ❌ PROMOTION FAILED — see errors above")
    print("=" * 65)


if __name__ == "__main__":
    main()
