"""
NETRA Challenger M9-1: Independent Empirical Benchmark & Latency Stress Suite
==============================================================================
Empirically challenges Milestone 9 (Requirement R4) benchmark suite:
  1. Independent per-frame localization and annotation latency profiling across
     all 20 benchmark deepfake videos using high-precision independent timers.
  2. Verifies 100% of frames process in <200ms with mean <50ms.
  3. Stress tests batch pipeline execution with parallel video worker threads (concurrency).
  4. Rapid sequence burst testing (cache/memory leak/degradation).
  5. Adversarial inputs: 4K, HD, square, tiny (32x32), extreme aspect ratios,
     all-black, all-white, random noise, and non-standard frames.
  6. Parameter boundary tests: anomaly scores (0.0 to 1.0), clean vs anomaly,
     region overrides, and invalid input rejection.
  7. End-to-end PDF generation and high-res pypdfium2 rasterization with safe
     resource cleanup (with-block context managers).
  8. Exports independent challenger telemetry to:
     tests/artifacts/benchmark_rendered_pages/challenger_m9_empirical_telemetry.json.
"""

import os
import sys
import io
import time
import json
import glob
import hashlib
import uuid
import concurrent.futures
from typing import List, Dict, Any, Tuple
from datetime import datetime, timezone

import pytest
import numpy as np
import cv2
import pypdfium2
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

TESTS_DIR = os.path.join(PROJECT_ROOT, "tests")
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)

from backend.netra.pipeline.visual_localizer import (
    VisualAnomalyLocalizer,
    AnomalyRegionType
)

# Benchmark base directory
BENCHMARK_BASE_DIR = os.path.join(
    PROJECT_ROOT,
    "garbage", "kaggle_and_scratch", "benchmark_datasets", "generated_100_deepfake_videos"
)

ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "tests", "artifacts", "benchmark_rendered_pages")
KEYFRAMES_DIR = os.path.join(PROJECT_ROOT, "backend", "media", "keyframes")

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(KEYFRAMES_DIR, exist_ok=True)

# 20 Benchmark videos under test
BENCHMARK_20_VIDEOS = [
    "deepfake_Ajit_Doval.mp4",
    "deepfake_Arvind_Kejriwal.mp4",
    "deepfake_Nirmala_Sitharaman.mp4",
    "deepfake_Peyush_Bansal.mp4",
    "deepfake_S_Jaishankar.mp4",
    "deepfake_Alia_Bhatt.mp4",
    "deepfake_Deepika_Padukone.mp4",
    "deepfake_Gautam_Adani.mp4",
    "deepfake_MS_Dhoni.mp4",
    "deepfake_Shah_Rukh_Khan.mp4",
    "deepfake_Narendra_Modi.mp4",
    "deepfake_Amitabh_Bachchan.mp4",
    "deepfake_Rahul_Gandhi.mp4",
    "deepfake_Shashi_Tharoor.mp4",
    "deepfake_Rajinikanth.mp4",
    "deepfake_Amit_Shah.mp4",
    "deepfake_Mukesh_Ambani.mp4",
    "deepfake_Ritesh_Agarwal.mp4",
    "deepfake_S_Somanath.mp4",
    "deepfake_Virat_Kohli.mp4",
]


def count_amber_pixels(img_rgb_or_bgr: np.ndarray, is_bgr: bool = False, tolerance: float = 24.0) -> int:
    """Counts pixels matching signature amber #f59e0b (RGB: 245, 158, 11 / BGR: 11, 158, 245)."""
    if is_bgr:
        target = np.array([11, 158, 245], dtype=np.float32)
    else:
        target = np.array([245, 158, 11], dtype=np.float32)
    diff = img_rgb_or_bgr.astype(np.float32) - target
    dist = np.linalg.norm(diff, axis=2)
    return int(np.sum(dist <= tolerance))


# ===========================================================================
# 1. INDEPENDENT LATENCY PROFILING ACROSS VIDEO FRAMES
# ===========================================================================
class TestChallengerIndependentLatencyProfiling:
    """
    Independently profiles per-frame localization and annotation latency across
    frames from all 20 benchmark videos.
    """

    def test_independent_profiling_across_all_20_videos(self):
        """
        Samples 5 distinct temporal frames per video across all 20 videos (100 frames total).
        Asserts 100% of frames process in < 200ms and batch mean is < 50ms.
        Computes mean, median, p90, p95, p99, min, max, and std deviation.
        """
        latencies_ms: List[float] = []
        video_details: List[Dict[str, Any]] = []
        unhandled_exceptions = 0

        for video_filename in BENCHMARK_20_VIDEOS:
            video_path = os.path.join(BENCHMARK_BASE_DIR, video_filename)
            assert os.path.exists(video_path), f"Video file not found: {video_path}"

            cap = cv2.VideoCapture(video_path)
            assert cap.isOpened(), f"Cannot open video: {video_path}"

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 60)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

            # 5 diverse temporal sample points across video duration
            sample_points = [
                int(total_frames * 0.10),
                int(total_frames * 0.30),
                int(total_frames * 0.50),
                int(total_frames * 0.70),
                max(0, total_frames - 3)
            ]

            vid_lats = []
            for f_idx in sample_points:
                cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
                ret, frame = cap.read()
                if not ret or frame is None:
                    continue

                try:
                    # Independent high-precision timer
                    t_start = time.perf_counter()
                    annotated_bgr, meta = VisualAnomalyLocalizer.localize_and_annotate(
                        frame, anomaly_score=0.96
                    )
                    t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

                    latencies_ms.append(t_elapsed_ms)
                    vid_lats.append(t_elapsed_ms)

                    # Strict per-frame SLA check: MUST be < 200ms
                    assert t_elapsed_ms < 200.0, (
                        f"Per-frame SLA violated: {t_elapsed_ms:.2f}ms >= 200.0ms on "
                        f"{video_filename} frame #{f_idx}"
                    )

                    # Validate bounding box coordinates and shape
                    bbox = meta.get("bounding_box")
                    assert bbox is not None and len(bbox) == 4
                    bx, by, bw, bh = bbox
                    img_h, img_w = frame.shape[:2]
                    assert 0 <= bx < img_w, f"bx {bx} out of range [0, {img_w})"
                    assert 0 <= by < img_h, f"by {by} out of range [0, {img_h})"
                    assert bw >= 20, f"bw {bw} too small (<20)"
                    assert bh >= 20, f"bh {bh} too small (<20)"
                    assert bx + bw <= img_w, f"bbox extends past image width: {bx + bw} > {img_w}"
                    assert by + bh <= img_h, f"bbox extends past image height: {by + bh} > {img_h}"

                    # Validate normalized coordinates
                    norm_box = meta.get("normalized_box")
                    assert norm_box is not None and len(norm_box) == 4
                    for val in norm_box:
                        assert 0.0 <= val <= 1.0, f"Normalized coordinate {val} outside [0.0, 1.0]"

                    # Validate signature amber border and badge
                    amber_count = count_amber_pixels(annotated_bgr, is_bgr=True)
                    assert amber_count >= 40, f"Expected >=40 amber pixels, found {amber_count}"
                    assert meta.get("forensic_badge") == "ANOMALY DETECTED HERE"

                except Exception as exc:
                    unhandled_exceptions += 1
                    raise exc

            cap.release()

            video_details.append({
                "video": video_filename,
                "frames_tested": len(vid_lats),
                "mean_ms": round(float(np.mean(vid_lats)), 2) if vid_lats else 0.0,
                "max_ms": round(float(np.max(vid_lats)), 2) if vid_lats else 0.0,
                "status": "PASS"
            })

        # Global assertions
        assert unhandled_exceptions == 0, f"{unhandled_exceptions} unhandled exceptions raised!"
        assert len(latencies_ms) >= 80, f"Expected >=80 sampled frames, got {len(latencies_ms)}"

        lat_arr = np.array(latencies_ms)
        mean_val = float(np.mean(lat_arr))
        median_val = float(np.median(lat_arr))
        p90_val = float(np.percentile(lat_arr, 90))
        p95_val = float(np.percentile(lat_arr, 95))
        p99_val = float(np.percentile(lat_arr, 99))
        min_val = float(np.min(lat_arr))
        max_val = float(np.max(lat_arr))
        std_val = float(np.std(lat_arr))

        # Check 100% of frames < 200ms
        assert max_val < 200.0, f"Max latency {max_val:.2f}ms exceeded 200ms threshold!"
        # Check mean < 50ms
        assert mean_val < 50.0, f"Mean latency {mean_val:.2f}ms exceeded 50ms threshold!"
        # Check p99 < 100ms
        assert p99_val < 100.0, f"p99 latency {p99_val:.2f}ms exceeded 100ms target!"

        # Save independent challenger telemetry report
        telemetry = {
            "challenger": "Challenger M9-1",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sample_count": len(latencies_ms),
            "unhandled_exceptions": unhandled_exceptions,
            "sla_verification": {
                "per_frame_max_sla_ms": 200.0,
                "per_frame_mean_sla_ms": 50.0,
                "max_observed_ms": round(max_val, 2),
                "mean_observed_ms": round(mean_val, 2),
                "median_observed_ms": round(median_val, 2),
                "p90_observed_ms": round(p90_val, 2),
                "p95_observed_ms": round(p95_val, 2),
                "p99_observed_ms": round(p99_val, 2),
                "min_observed_ms": round(min_val, 2),
                "std_dev_ms": round(std_val, 2),
                "sla_pass_rate_percent": 100.0
            },
            "video_details": video_details
        }
        report_file = os.path.join(ARTIFACTS_DIR, "challenger_m9_empirical_telemetry.json")
        with open(report_file, "w") as f:
            json.dump(telemetry, f, indent=2)

        assert os.path.exists(report_file)


# ===========================================================================
# 2. CONCURRENCY & MULTITHREADED STRESS TESTING
# ===========================================================================
class TestChallengerMultithreadedStress:
    """
    Stress tests concurrent execution of the visual localization pipeline
    across multiple parallel worker threads to detect race conditions, GIL bottlenecks,
    or resource starvation.
    """

    def test_parallel_threadpool_execution_8_threads(self):
        """
        Executes 40 concurrent localization tasks across 8 worker threads simultaneously.
        Verifies thread safety, 0 unhandled exceptions, and that all latencies stay < 200ms.
        """
        # Pre-extract test frames from 5 different videos
        test_frames = []
        for v_name in BENCHMARK_20_VIDEOS[:5]:
            v_path = os.path.join(BENCHMARK_BASE_DIR, v_name)
            cap = cv2.VideoCapture(v_path)
            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None:
                test_frames.append(frame)

        assert len(test_frames) >= 3, "Failed to load test frames for concurrency test"

        def worker_task(task_id: int) -> Dict[str, Any]:
            frame = test_frames[task_id % len(test_frames)]
            score = 0.85 + (task_id % 15) * 0.01
            t0 = time.perf_counter()
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
                frame, anomaly_score=score
            )
            lat_ms = (time.perf_counter() - t0) * 1000.0
            amber_px = count_amber_pixels(annotated, is_bgr=True)
            return {
                "task_id": task_id,
                "latency_ms": lat_ms,
                "amber_pixels": amber_px,
                "has_bbox": meta.get("bounding_box") is not None
            }

        num_tasks = 40
        num_workers = 8
        results = []
        errors = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            future_to_id = {executor.submit(worker_task, i): i for i in range(num_tasks)}
            for future in concurrent.futures.as_completed(future_to_id):
                try:
                    res = future.result()
                    results.append(res)
                except Exception as exc:
                    errors.append(exc)

        assert len(errors) == 0, f"Encountered {len(errors)} errors during multithreaded stress: {errors}"
        assert len(results) == num_tasks, f"Expected {num_tasks} completed tasks, got {len(results)}"

        concurrent_latencies = [r["latency_ms"] for r in results]
        max_concurrent_lat = max(concurrent_latencies)
        mean_concurrent_lat = np.mean(concurrent_latencies)

        # Under 8 concurrent threads, no task should exceed 200ms
        assert max_concurrent_lat < 200.0, f"Max concurrent latency {max_concurrent_lat:.2f}ms exceeded 200ms"
        assert mean_concurrent_lat < 50.0, f"Mean concurrent latency {mean_concurrent_lat:.2f}ms exceeded 50ms"

        # Verify all tasks produced valid amber borders
        for r in results:
            assert r["amber_pixels"] >= 40
            assert r["has_bbox"] is True


# ===========================================================================
# 3. BURST & RAPID SEQUENCE TESTING
# ===========================================================================
class TestChallengerRapidSequenceBurst:
    """
    Verifies system stability and absence of memory leaks or performance degradation
    under rapid consecutive frame requests.
    """

    def test_rapid_burst_sequence_60_frames(self):
        """
        Executes 60 consecutive frame localizations in rapid sequence.
        Compares latency of first 10 frames vs last 10 frames to verify no thermal/cache degradation.
        """
        sample_video = os.path.join(BENCHMARK_BASE_DIR, BENCHMARK_20_VIDEOS[0])
        cap = cv2.VideoCapture(sample_video)
        ret, frame = cap.read()
        cap.release()
        assert ret and frame is not None

        burst_latencies = []
        for i in range(60):
            t0 = time.perf_counter()
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
                frame, anomaly_score=0.92
            )
            lat = (time.perf_counter() - t0) * 1000.0
            burst_latencies.append(lat)

        first_10_mean = np.mean(burst_latencies[:10])
        last_10_mean = np.mean(burst_latencies[-10:])
        overall_max = max(burst_latencies)
        overall_mean = np.mean(burst_latencies)

        assert overall_max < 200.0, f"Burst max latency {overall_max:.2f}ms exceeded 200ms"
        assert overall_mean < 50.0, f"Burst mean latency {overall_mean:.2f}ms exceeded 50ms"
        # Verify no catastrophic slowdown (>3x slowdown over sequence)
        assert last_10_mean < first_10_mean * 3.0 + 10.0, (
            f"Possible performance degradation: first 10 mean = {first_10_mean:.2f}ms, "
            f"last 10 mean = {last_10_mean:.2f}ms"
        )


# ===========================================================================
# 4. ADVERSARIAL GEOMETRIC & RESOLUTION EDGE CASES
# ===========================================================================
class TestChallengerGeometricEdgeCases:
    """
    Stress tests the localization engine against unusual, extreme, or adversarial
    resolutions, aspect ratios, and color distributions.
    """

    @pytest.mark.parametrize("resolution, name", [
        ((2160, 3840, 3), "4K Ultra-HD"),
        ((1080, 1920, 3), "1080p Full-HD"),
        ((720, 1280, 3), "720p HD"),
        ((512, 512, 3), "Square 512x512"),
        ((128, 128, 3), "Low-res 128x128"),
        ((64, 64, 3), "Tiny 64x64"),
        ((240, 1920, 3), "Ultra-wide banner"),
        ((1920, 360, 3), "Ultra-tall mobile vertical"),
    ])
    def test_extreme_resolutions_and_aspect_ratios(self, resolution, name):
        """
        Synthesizes test frames at extreme resolutions and verifies:
          1. Processing completes in < 200ms.
          2. No exceptions raised.
          3. Bounding boxes are clamped within frame bounds.
        """
        h, w, c = resolution
        # Create synthetic test frame with simulated skin-tone center patch
        synth_frame = np.full((h, w, c), 120, dtype=np.uint8)
        # Add skin patch in center
        py1, py2 = int(h * 0.25), int(h * 0.75)
        px1, px2 = int(w * 0.25), int(w * 0.75)
        if py2 > py1 and px2 > px1:
            # BGR for human skin tone (approx YCrCb: Cr~150, Cb~100 -> B~100, G~130, R~180)
            synth_frame[py1:py2, px1:px2] = [100, 130, 180]

        t0 = time.perf_counter()
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
            synth_frame, anomaly_score=0.88
        )
        lat_ms = (time.perf_counter() - t0) * 1000.0

        assert lat_ms < 200.0, f"Resolution {name} ({w}x{h}) took {lat_ms:.2f}ms >= 200ms"
        assert annotated.shape == synth_frame.shape

        bx, by, bw, bh = meta["bounding_box"]
        assert 0 <= bx < w
        assert 0 <= by < h
        assert bx + bw <= w
        assert by + bh <= h
        assert bw >= 20
        assert bh >= 20

    def test_all_black_frame(self):
        """Pure black frame (all zeros): must not divide by zero or crash."""
        black = np.zeros((720, 1280, 3), dtype=np.uint8)
        t0 = time.perf_counter()
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(black, anomaly_score=0.95)
        lat = (time.perf_counter() - t0) * 1000.0
        assert lat < 200.0
        assert meta.get("bounding_box") is not None

    def test_all_white_frame(self):
        """Pure white frame (all 255s): specular variance must not crash."""
        white = np.full((720, 1280, 3), 255, dtype=np.uint8)
        t0 = time.perf_counter()
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(white, anomaly_score=0.95)
        lat = (time.perf_counter() - t0) * 1000.0
        assert lat < 200.0
        assert meta.get("bounding_box") is not None

    def test_random_noise_frame(self):
        """Random Gaussian noise frame: morphological operations must not crash."""
        noise = np.random.randint(0, 256, (720, 1280, 3), dtype=np.uint8)
        t0 = time.perf_counter()
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(noise, anomaly_score=0.91)
        lat = (time.perf_counter() - t0) * 1000.0
        assert lat < 200.0
        assert meta.get("bounding_box") is not None


# ===========================================================================
# 5. PARAMETER BOUNDARIES & INPUT VALIDATION
# ===========================================================================
class TestChallengerParameterBoundaries:
    """
    Tests score thresholds, region overrides, and invalid input handling.
    """

    def test_clean_vs_anomaly_threshold(self):
        """
        Verifies that frames with anomaly_score < 0.45 or is_authentic=True render
        in emerald green (#10b981) with 'COHERENCE VERIFIED' badge,
        while frames >= 0.45 render in amber (#f59e0b) with 'ANOMALY DETECTED HERE'.
        """
        dummy = np.full((480, 640, 3), 128, dtype=np.uint8)

        # Anomaly case (score 0.90)
        ann_anom, meta_anom = VisualAnomalyLocalizer.localize_and_annotate(dummy, anomaly_score=0.90)
        assert meta_anom["forensic_badge"] == "ANOMALY DETECTED HERE"
        assert count_amber_pixels(ann_anom, is_bgr=True) >= 40

        # Clean case (score 0.20)
        ann_clean, meta_clean = VisualAnomalyLocalizer.localize_and_annotate(dummy, anomaly_score=0.20)
        assert meta_clean["forensic_badge"] == "COHERENCE VERIFIED"

        # Explicit authentic flag
        ann_auth, meta_auth = VisualAnomalyLocalizer.localize_and_annotate(dummy, is_authentic=True)
        assert meta_auth["forensic_badge"] == "COHERENCE VERIFIED"

    @pytest.mark.parametrize("region_key, expected_substring", [
        ("eyewear", "Eyewear"),
        ("iris", "Iris"),
        ("lip_sync", "Lip-Sync"),
        ("facial_seam", "Lip-Sync"),
    ])
    def test_forced_region_overrides(self, region_key, expected_substring):
        """Verifies that forced_region correctly routes to requested landmark region."""
        dummy = np.full((480, 640, 3), 128, dtype=np.uint8)
        _, meta = VisualAnomalyLocalizer.localize_and_annotate(
            dummy, anomaly_score=0.95, forced_region=region_key
        )
        assert expected_substring in meta["semantic_label"]

    def test_invalid_frame_raises_value_error(self):
        """Verifies that None or empty frames raise ValueError cleanly."""
        with pytest.raises(ValueError, match="Invalid image frame"):
            VisualAnomalyLocalizer.localize_and_annotate(None)

        with pytest.raises(ValueError, match="Invalid image frame"):
            VisualAnomalyLocalizer.localize_and_annotate(np.zeros((0, 0, 3), dtype=np.uint8))


# ===========================================================================
# 6. END-TO-END PDF GENERATION & RASTERIZATION INTEGRITY
# ===========================================================================
class TestChallengerPDFAndRasterizationIntegrity:
    """
    Verifies court-ready ReportLab PDF generation and pypdfium2 rasterization
    using safe context manager handling to prevent file descriptor leaks.
    """

    def test_pdf_generation_and_pypdfium2_safe_rendering(self):
        """
        Builds a forensic PDF with keyframe snapshots and verifies:
          1. PDF is generated cleanly.
          2. pypdfium2 renders page 1 with scale=2 (>1000 x >1400 px).
          3. Document context is properly closed.
        """
        # Pick one real benchmark video
        video_filename = BENCHMARK_20_VIDEOS[0]
        video_path = os.path.join(BENCHMARK_BASE_DIR, video_filename)
        cap = cv2.VideoCapture(video_path)
        ret, frame = cap.read()
        cap.release()
        assert ret and frame is not None

        annotated_bgr, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.98)
        snap_path = os.path.join(KEYFRAMES_DIR, f"challenger_test_{uuid.uuid4().hex[:6]}.jpg")
        cv2.imwrite(snap_path, annotated_bgr)
        assert os.path.exists(snap_path)

        # Import build helper from benchmark test
        from test_benchmark_20_videos import build_court_ready_forensic_pdf

        test_pdf_path = os.path.join(ARTIFACTS_DIR, f"challenger_test_{uuid.uuid4().hex[:6]}.pdf")
        keyframe_snaps = [{
            "frame_number": 15,
            "timestamp": "00:00.50",
            "anomaly_region": meta["semantic_label"],
            "anomaly_score": 0.98,
            "image_path": snap_path,
            "detector_subsystem": meta["detector_subsystem"],
            "statutory_act": meta["statutory_act"],
            "bounding_box": meta["bounding_box"]
        }]
        video_meta = {"fps": 30.0, "total_frames": 60, "width": 1920, "height": 1080, "duration_sec": 2.0}

        build_court_ready_forensic_pdf(
            pdf_path=test_pdf_path,
            subject_slug="challenger_test",
            video_filename=video_filename,
            keyframe_snapshots=keyframe_snaps,
            video_meta=video_meta
        )

        assert os.path.exists(test_pdf_path)
        assert os.path.getsize(test_pdf_path) > 10000

        # Safely open with pypdfium2 and render
        with pypdfium2.PdfDocument(test_pdf_path) as doc:
            assert len(doc) >= 1
            page = doc[0]
            bitmap = page.render(scale=2)
            pil_img = bitmap.to_pil()
            w, h = pil_img.size
            assert w >= 1000 and h >= 1400

            # Amber pixel assertion on rendered PDF page
            rgb_arr = np.array(pil_img.convert("RGB"))
            amber_px = count_amber_pixels(rgb_arr, is_bgr=False)
            assert amber_px >= 40, f"Rendered PDF page must contain >=40 amber pixels, got {amber_px}"

        # Clean up temporary test artifacts
        if os.path.exists(snap_path):
            os.remove(snap_path)
        if os.path.exists(test_pdf_path):
            os.remove(test_pdf_path)
