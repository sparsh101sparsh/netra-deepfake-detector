#!/usr/bin/env python3
"""
NETRA Pretrained Model Fetcher
Downloads pretrained models from HuggingFace for the Day-1 baseline.
These work at ~85% AUC without any fine-tuning.
After Kaggle training completes, fine-tuned weights will replace these.
"""
import os
import subprocess
import sys


def download_pretrained_models(output_dir: str = "./models"):
    os.makedirs(output_dir, exist_ok=True)
    hf_token = os.getenv("HF_TOKEN", "")

    print("=" * 60)
    print("NETRA: Downloading pretrained baseline models from HuggingFace")
    print("=" * 60)

    models = [
        {
            "repo_id": "Wvolfas/deepfake-video-detection",
            "local_dir": os.path.join(output_dir, "spatial_pretrained"),
            "description": "EfficientNet deepfake video detection (baseline visual)"
        },
        {
            "repo_id": "MelodyMachine/Deepfake-audio-detection-V2",
            "local_dir": os.path.join(output_dir, "audio_pretrained"),
            "description": "Wav2Vec2 deepfake audio detection (99.7% accuracy)"
        },
    ]

    for model in models:
        print(f"\nDownloading: {model['description']}")
        print(f"  Source: {model['repo_id']}")
        print(f"  Target: {model['local_dir']}")

        try:
            from huggingface_hub import snapshot_download
            snapshot_download(
                repo_id=model["repo_id"],
                local_dir=model["local_dir"],
                token=hf_token if hf_token else None,
            )
            print(f"  ✅ Downloaded to {model['local_dir']}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")

    print("\nAll pretrained models downloaded.")
    print("\nNEXT STEPS after Kaggle training completes:")
    print("1. Download spatial_model_best.pth from Kaggle notebook output")
    print("2. Upload to HuggingFace: netra-ai/spatial-detector-v1")
    print("3. Set env var: SPATIAL_HF_MODEL_ID=netra-ai/spatial-detector-v1")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "./models"
    download_pretrained_models(output)
