import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SDFVD_DIR = os.path.join(BASE_DIR, "benchmark_datasets", "SDFVD")
FAKE_DIR = os.path.join(SDFVD_DIR, "fake")
REAL_DIR = os.path.join(SDFVD_DIR, "real")

def generate_metadata():
    fake_files = sorted([f for f in os.listdir(FAKE_DIR) if f.endswith(".mp4")])
    real_files = sorted([f for f in os.listdir(REAL_DIR) if f.endswith(".mp4")])

    metadata = {
        "dataset_name": "SDFVD (Small DeepFake Video Dataset)",
        "source": "Hemgg/SDFVD-video-dataset",
        "description": "Curated deepfake and real video benchmark dataset featuring diverse subjects and backgrounds.",
        "total_videos": len(fake_files) + len(real_files),
        "total_fake": len(fake_files),
        "total_real": len(real_files),
        "items": []
    }

    # Add fake items
    for f in fake_files:
        path = os.path.join(FAKE_DIR, f)
        metadata["items"].append({
            "filename": f,
            "relative_path": os.path.relpath(path, BASE_DIR),
            "label": "fake",
            "is_manipulated": 1,
            "size_bytes": os.path.getsize(path)
        })

    # Add real items
    for r in real_files:
        path = os.path.join(REAL_DIR, r)
        metadata["items"].append({
            "filename": r,
            "relative_path": os.path.relpath(path, BASE_DIR),
            "label": "real",
            "is_manipulated": 0,
            "size_bytes": os.path.getsize(path)
        })

    out_json = os.path.join(SDFVD_DIR, "metadata.json")
    with open(out_json, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Generated metadata for {len(metadata['items'])} items at {out_json}")

if __name__ == "__main__":
    generate_metadata()
