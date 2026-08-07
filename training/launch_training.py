"""
training/launch_training.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Launch SageMaker training job for NETRA spatial detector.
Run from local M4 AFTER bootstrap_aws.py + S3 data upload.

Usage:
  python training/launch_training.py          # 5-epoch mini smoke test
  python training/launch_training.py --full   # 30-epoch full run (hours)

HUMAN MUST DO FIRST:
  1. Create NETRASageMakerRole in IAM with S3 + ECR + CloudWatch access
  2. Upload training frames to s3://netra-datasets/training/
  3. Set SAGEMAKER_ROLE_ARN in .env
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
import os
import sys
import argparse
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

try:
    import sagemaker
    from sagemaker.pytorch import PyTorch
    from sagemaker.inputs import TrainingInput
except ImportError:
    print("❌ sagemaker not installed. Run: pip install sagemaker")
    sys.exit(1)

ROLE_ARN          = os.getenv("SAGEMAKER_ROLE_ARN", "")
INSTANCE_TYPE     = os.getenv("SAGEMAKER_INSTANCE_TYPE", "ml.g4dn.xlarge")
S3_DATASETS       = os.getenv("S3_BUCKET_DATASETS", "netra-datasets")
S3_MODELS         = os.getenv("S3_BUCKET_MODELS", "netra-models")
WANDB_KEY         = os.getenv("WANDB_API_KEY", "")
REGION            = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
USE_PRETRAINED_ONLY = os.getenv("USE_PRETRAINED_ONLY", "true")


def launch(full: bool = False):
    if not ROLE_ARN:
        print("❌ SAGEMAKER_ROLE_ARN not set in .env — cannot launch training")
        print("   HUMAN MUST: create NETRASageMakerRole in AWS IAM console first")
        sys.exit(1)

    epochs = 30 if full else 5
    job_name = f"netra-spatial-{'full' if full else 'mini'}-{datetime.now().strftime('%Y%m%d-%H%M')}"

    print(f"🚀 Launching SageMaker training job: {job_name}")
    print(f"   Instance: {INSTANCE_TYPE} Spot (falls back to On-Demand if no Spot capacity)")
    print(f"   Epochs: {epochs}")
    print(f"   USE_PRETRAINED_ONLY: {USE_PRETRAINED_ONLY}")

    estimator = PyTorch(
        entry_point="sagemaker_train_spatial.py",
        source_dir="training",
        requirements_file="training/requirements.txt",   # Installed into container at job start
        role=ROLE_ARN,
        framework_version="2.0",
        py_version="py310",
        instance_type=INSTANCE_TYPE,
        instance_count=1,

        # Spot instance — saves ~70% cost; requires checkpoint_s3_uri for resume
        # If Spot is unavailable (>15 min wait) consider switching to On-Demand:
        #   python training/launch_training.py --no-spot
        use_spot_instances=not args.no_spot,
        max_run=14400,          # 4 hours max wall time
        max_wait=18000 if not args.no_spot else None,  # 5h spot wait; None = on-demand
        checkpoint_s3_uri=f"s3://{S3_MODELS}/checkpoints/{job_name}/",

        # Output model.tar.gz → S3
        # Contains model.pt — promoted to spatial/model.pt by promote_model.py
        output_path=f"s3://{S3_MODELS}/training-output/",

        hyperparameters={
            "epochs":      epochs,
            "lr":          "0.0001",
            "batch-size":  "16",
        },
        environment={
            "WANDB_API_KEY":      WANDB_KEY,
            "WANDB_PROJECT":      "netra-v5",
            "USE_PRETRAINED_ONLY": USE_PRETRAINED_ONLY,
            "S3_BUCKET_MODELS":   S3_MODELS,
        },

        # SageMaker metrics regex — visible in CloudWatch + WandB
        metric_definitions=[
            {"Name": "auc",  "Regex": r"auc: ([0-9\.]+)"},
            {"Name": "loss", "Regex": r"loss=([0-9\.]+)"},
        ],
    )

    training_input = TrainingInput(
        s3_data=f"s3://{S3_DATASETS}/training/",
        content_type="application/x-image",
    )

    estimator.fit({"training": training_input}, job_name=job_name, wait=False)

    print(f"\n✅ Job submitted: {job_name}")
    print(f"   Monitor: https://console.aws.amazon.com/sagemaker/home?region={REGION}#/jobs/{job_name}")
    if WANDB_KEY:
        print(f"   WandB:   https://wandb.ai/project/netra-v5")
    print(f"\n   When job completes (~30 min for mini, ~3 hr for full):")
    print(f"     python training/promote_model.py --job {job_name}")
    print(f"     → Extracts model.pt → s3://{S3_MODELS}/spatial/model.pt")
    print(f"     → Then set USE_PRETRAINED_ONLY=false in .env and restart worker")
    print(f"\n   Verify: python scripts/verify_models.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Launch SageMaker training")
    parser.add_argument("--full",    action="store_true", help="30-epoch full run instead of 5-epoch mini")
    parser.add_argument("--no-spot", action="store_true", help="Use On-Demand instead of Spot (faster start, higher cost)")
    args = parser.parse_args()
    launch(full=args.full)
