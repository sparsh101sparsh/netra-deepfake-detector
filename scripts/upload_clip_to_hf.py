import os
import sys
from huggingface_hub import HfApi

# 1. Check HF Token
hf_token = os.getenv("HF_TOKEN")
if not hf_token:
    print("❌ HF_TOKEN not found in environment.")
    sys.exit(1)

api = HfApi(token=hf_token)
try:
    user_info = api.whoami()
    username = user_info["name"]
except Exception as e:
    print(f"❌ Failed to get user info from token: {e}")
    sys.exit(1)

repo_id = f"{username}/clip-detector-v1"

# 2. Ensure repository exists
try:
    print(f"Creating repository: {repo_id}...")
    api.create_repo(repo_id=repo_id, repo_type="model", private=True, exist_ok=True)
    print(f"✅ Created/Verified repository: {repo_id}")
except Exception as e:
    print(f"❌ Error accessing Hugging Face API: {e}")
    sys.exit(1)

# 3. Create a README to act as the model stub for now
readme_content = """# NETRA CLIP Model (Context / Semantic Detector)
This repository contains the fine-tuned CLIP (ViT-L/14) model weights for Project NETRA.
It is used in the pipeline to detect contextual mismatches between visual frames and audio speech.

*Note: The actual multi-gigabyte `.pth` weights are synced via the Kaggle kernel `netra-clip-training`.*
"""

readme_path = os.path.join(os.path.dirname(__file__), "CLIP_README.md")
with open(readme_path, "w") as f:
    f.write(readme_content)

# 4. Upload the README stub
print(f"⬆️ Uploading model configuration to '{repo_id}'...")
try:
    api.upload_file(
        path_or_fileobj=readme_path,
        path_in_repo="README.md",
        repo_id=repo_id,
        repo_type="model",
        commit_message="Initialize CLIP model repository"
    )
    print("🎉 Upload successful! Your CLIP model repository is now live.")
except Exception as e:
    print(f"❌ Failed to upload: {e}")
    sys.exit(1)
