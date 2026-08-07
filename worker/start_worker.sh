#!/bin/bash
# NETRA Worker Startup Script — runs on EC2 g4dn.xlarge on boot
set -e

echo "Starting NETRA GPU Worker..."

# Check CUDA
python3 -c "import torch; print(f'CUDA: {torch.cuda.is_available()}, GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"

# Download model weights from HuggingFace if not present
if [ ! -f "/opt/netra/models/spatial/model.pth" ]; then
    echo "Downloading spatial model from HuggingFace..."
    python3 -c "
from huggingface_hub import hf_hub_download
import os
try:
    path = hf_hub_download(
        repo_id=os.getenv('SPATIAL_HF_MODEL_ID', 'Wvolfas/deepfake-video-detection'),
        filename='model.pth',
        local_dir='/opt/netra/models/spatial'
    )
    print(f'Downloaded to {path}')
except Exception as e:
    print(f'Download failed (will use pretrained): {e}')
"
fi

# Start worker
exec python3 worker.py
