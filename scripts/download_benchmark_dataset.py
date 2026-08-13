import os
import sys
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "benchmark_datasets")
SDFVD_DIR = os.path.join(DATASET_DIR, "SDFVD")

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def download_file(url, target_path, expected_size=None):
    if os.path.exists(target_path) and expected_size:
        if os.path.getsize(target_path) == expected_size:
            return True, target_path, "Already exists"
    
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    temp_path = target_path + ".tmp"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp, open(temp_path, "wb") as f:
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                f.write(chunk)
        
        if expected_size and os.path.getsize(temp_path) != expected_size:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return False, target_path, f"Size mismatch: expected {expected_size}, got {os.path.getsize(temp_path)}"
            
        os.replace(temp_path, target_path)
        return True, target_path, f"Downloaded ({os.path.getsize(target_path)} bytes)"
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False, target_path, str(e)

def download_sdfvd():
    print("=== Fetching SDFVD (Small DeepFake Video Dataset) File Lists ===")
    fake_tree_url = "https://huggingface.co/api/datasets/Hemgg/SDFVD-video-dataset/tree/main/Fake"
    real_tree_url = "https://huggingface.co/api/datasets/Hemgg/SDFVD-video-dataset/tree/main/Real"
    
    fake_items = fetch_json(fake_tree_url)
    real_items = fetch_json(real_tree_url)
    
    download_tasks = []
    
    for item in fake_items:
        if item.get("type") == "file" and item.get("path", "").endswith(".mp4"):
            fname = os.path.basename(item["path"])
            url = f"https://huggingface.co/datasets/Hemgg/SDFVD-video-dataset/resolve/main/Fake/{fname}"
            target = os.path.join(SDFVD_DIR, "fake", fname)
            size = item.get("size")
            download_tasks.append((url, target, size, "fake", fname))
            
    for item in real_items:
        if item.get("type") == "file" and item.get("path", "").endswith(".mp4"):
            fname = os.path.basename(item["path"])
            url = f"https://huggingface.co/datasets/Hemgg/SDFVD-video-dataset/resolve/main/Real/{fname}"
            target = os.path.join(SDFVD_DIR, "real", fname)
            size = item.get("size")
            download_tasks.append((url, target, size, "real", fname))
            
    print(f"Total files to download for SDFVD: {len(download_tasks)} ({len(fake_items)} fake, {len(real_items)} real)")
    
    completed = 0
    total = len(download_tasks)
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(download_file, url, target, size): (category, fname)
            for url, target, size, category, fname in download_tasks
        }
        
        for future in as_completed(futures):
            category, fname = futures[future]
            success, target_path, msg = future.result()
            completed += 1
            status = "✅" if success else "❌"
            print(f"[{completed}/{total}] {status} [{category.upper()}] {fname}: {msg}")
            
    print(f"\nSDFVD Download Complete! Saved in {SDFVD_DIR}\n")

if __name__ == "__main__":
    download_sdfvd()
