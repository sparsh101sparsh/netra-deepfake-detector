import sys
import os
import cv2
import torch
import tempfile
import numpy as np

# Add the backend path to sys.path so we can import the model
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from netra.pipeline.detectors.spatial import SpatialSBIDetector

def extract_frames(video_path, num_frames=10):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Failed to open video: {video_path}")
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Total frames in video: {total_frames}")
    
    if total_frames == 0:
        raise Exception("Video has 0 frames.")

    frame_indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)
    frames = []
    
    temp_dir = tempfile.mkdtemp()
    
    for i, idx in enumerate(frame_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frame_path = os.path.join(temp_dir, f"frame_{i}.jpg")
            cv2.imwrite(frame_path, frame)
            frames.append(frame_path)
        else:
            print(f"Failed to read frame {idx}")
            
    cap.release()
    return frames, temp_dir

def main():
    if len(sys.argv) < 3:
        print("Usage: python test_video_local.py <video_path> <model_path>")
        sys.exit(1)

    video_path = sys.argv[1]
    model_path = sys.argv[2]

    if not os.path.exists(video_path):
        print(f"Video not found: {video_path}")
        sys.exit(1)

    print("Extracting frames...")
    try:
        frame_paths, temp_dir = extract_frames(video_path, num_frames=10)
    except Exception as e:
        print(e)
        sys.exit(1)

    print(f"Extracted {len(frame_paths)} frames. Loading Spatial Detector...")
    detector = SpatialSBIDetector(model_path=model_path)
    
    print("Running predictions...")
    results = detector.predict_frames_batch(frame_paths)
    
    fake_probs = []
    for i, res in enumerate(results):
        prob = res.get('fake_probability', 0.0)
        fake_probs.append(prob)
        print(f"Frame {i}: Fake Prob = {prob:.4f}, Face Found = {res.get('face_found')}, Flags = {res.get('flags')}")
        
    avg_fake_prob = sum(fake_probs) / len(fake_probs) if fake_probs else 0.0
    verdict = "FAKE" if avg_fake_prob > 0.6 else "REAL"
    
    print("-" * 40)
    print(f"Final Average Fake Probability: {avg_fake_prob:.4f}")
    print(f"Final Verdict: {verdict}")
    print("-" * 40)

if __name__ == "__main__":
    main()
