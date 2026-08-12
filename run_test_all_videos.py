import sys
import os
import glob
import json

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from netra.pipeline.detectors.spatial import SpatialSBIDetector

def run_test():
    model_path = os.path.join(os.path.dirname(__file__), "spatial_model_best.pth")
    if not os.path.exists(model_path):
        print(f"Model path not found: {model_path}")
        sys.exit(1)

    print("=========================================")
    print("  NETRA ML MODEL TEST — ALL 3 VIDEOS")
    print(f"  Model Weights: {model_path}")
    print("=========================================\n")

    detector = SpatialSBIDetector(model_path=model_path)

    targets = [
        {
            "name": "Video 1: Modiji Swapped Video",
            "video_path": os.path.join(os.path.dirname(__file__), "modiji_swapped_video.mov"),
            "frames_dir": os.path.join(os.path.dirname(__file__), "extracted_frames", "video1_modiji")
        },
        {
            "name": "Video 2: Movie Video (Movie on 04-08-26 at 10.52 PM)",
            "video_path": "/Users/iamsparsh00321/Downloads/Movie on 04-08-26 at 10.52 PM.mov",
            "frames_dir": os.path.join(os.path.dirname(__file__), "extracted_frames", "video2_movie")
        },
        {
            "name": "Video 3: Nahtscrazy Video",
            "video_path": "/Users/iamsparsh00321/Downloads/nahtscrazy.mov",
            "frames_dir": os.path.join(os.path.dirname(__file__), "extracted_frames", "video3_nahtscrazy")
        }
    ]

    summary_results = []

    for item in targets:
        print(f"\n--- Testing {item['name']} ---")
        frames = sorted(glob.glob(os.path.join(item['frames_dir'], "*.jpg")))
        print(f"Found {len(frames)} pre-extracted frames in {item['frames_dir']}")

        if not frames:
            print("No frames found!")
            continue

        results = detector.predict_frames_batch(frames)
        fake_probs = []

        print("\nFrame breakdown:")
        for i, res in enumerate(results):
            prob = res.get('fake_probability', 0.0)
            fake_probs.append(prob)
            filename = os.path.basename(frames[i])
            print(f"  Frame {i+1} ({filename}): Fake Prob = {prob:.4f} ({prob*100:.1f}%), Face Found = {res.get('face_found')}, Flags = {res.get('flags')}")

        avg_prob = sum(fake_probs) / len(fake_probs) if fake_probs else 0.0
        max_prob = max(fake_probs) if fake_probs else 0.0
        min_prob = min(fake_probs) if fake_probs else 0.0
        verdict = "DEEPFAKE / FAKE" if avg_prob > 0.50 else "REAL / AUTHENTIC"

        res_summary = {
            "name": item["name"],
            "total_frames_tested": len(frames),
            "avg_fake_prob": round(avg_prob, 4),
            "max_fake_prob": round(max_prob, 4),
            "min_fake_prob": round(min_prob, 4),
            "verdict": verdict,
            "confidence_percent": round(avg_prob * 100, 2) if avg_prob > 0.5 else round((1 - avg_prob) * 100, 2)
        }
        summary_results.append(res_summary)

        print("-" * 50)
        print(f"SUMMARY FOR {item['name']}:")
        print(f"  Average Fake Probability: {avg_prob:.4f} ({avg_prob*100:.2f}%)")
        print(f"  Max Frame Fake Prob:    {max_prob:.4f} ({max_prob*100:.2f}%)")
        print(f"  Min Frame Fake Prob:    {min_prob:.4f} ({min_prob*100:.2f}%)")
        print(f"  VERDICT: {verdict}")
        print("-" * 50)

    print("\n=========================================")
    print("            FINAL OVERALL SUMMARY        ")
    print("=========================================")
    print(json.dumps(summary_results, indent=2))

if __name__ == "__main__":
    run_test()
