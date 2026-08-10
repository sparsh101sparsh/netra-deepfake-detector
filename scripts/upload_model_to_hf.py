#!/usr/bin/env python3
"""
Upload Fine-Tuned Spatial Model to Hugging Face
-----------------------------------------------
This script uploads the trained spatial model (spatial_model_best.pth)
to your Hugging Face Hub repository (netra-ai/spatial-detector-v1).

Requirements:
    pip install huggingface_hub python-dotenv
"""
import os
import sys

try:
    from huggingface_hub import HfApi
    from huggingface_hub.utils import RepositoryNotFoundError
except ImportError:
    print("❌ Missing required package 'huggingface_hub'.")
    print("Please install it by running: pip install huggingface_hub")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ Missing required package 'python-dotenv'.")
    print("Please install it by running: pip install python-dotenv")
    sys.exit(1)

def main():
    # Load environment variables from the .env file in the parent directory
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    load_dotenv(dotenv_path=env_path)

    # 1. Check HF Token
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token or hf_token == "<your-huggingface-token>":
        print("❌ Hugging Face token (HF_TOKEN) not found or not set properly in .env")
        print("Get your write-access token from https://huggingface.co/settings/tokens")
        sys.exit(1)

    api = HfApi(token=hf_token)
    try:
        user_info = api.whoami()
        username = user_info["name"]
    except Exception as e:
        print(f"❌ Failed to get user info from token: {e}")
        sys.exit(1)

    repo_id = os.getenv("SPATIAL_HF_MODEL_ID", f"{username}/spatial-detector-v1")
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "spatial_model_best.pth")

    if not os.path.exists(model_path):
        print(f"❌ Model file not found at: {model_path}")
        print("Make sure you have downloaded 'spatial_model_best.pth' from Kaggle and placed it in the netra/ folder.")
        sys.exit(1)

    # 3. Ensure repository exists
    try:
        api.model_info(repo_id)
        print(f"✅ Found existing Hugging Face repository: {repo_id}")
    except RepositoryNotFoundError:
        print(f"⚠️ Repository '{repo_id}' not found. Creating it now...")
        try:
            api.create_repo(repo_id=repo_id, repo_type="model", private=True)
            print(f"✅ Created private repository: {repo_id}")
        except Exception as e:
            print(f"❌ Failed to create repository: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error accessing Hugging Face API: {e}")
        sys.exit(1)

    # 4. Upload the model
    print(f"⬆️ Uploading '{model_path}' to '{repo_id}'...")
    try:
        api.upload_file(
            path_or_fileobj=model_path,
            path_in_repo="spatial_model_best.pth",
            repo_id=repo_id,
            repo_type="model",
            commit_message="Upload fine-tuned spatial model (EfficientNet-B4 + SBI)"
        )
        print("🎉 Upload successful! Your model is now live on the Hugging Face Hub.")
    except Exception as e:
        print(f"❌ Failed to upload model: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
