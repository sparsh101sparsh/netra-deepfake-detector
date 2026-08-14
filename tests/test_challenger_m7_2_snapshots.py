"""
Challenger M7-2: Empirical Challenge Suite for Snapshot Artifacts & Forensic Metadata
=====================================================================================
Empirically tests and verifies:
1. Real benchmark deepfake video execution via worker.process_job
2. Keyframe snapshot JPEG file persistence, dimensions, and size (>10 KB)
3. Amber #f59e0b (BGR 11, 158, 245) tamper-evident border pixels
4. "ANOMALY DETECTED HERE" forensic badge presence, readability, and contrast
5. Facial identity preservation (no occlusion, blurring, or solid masking of identity)
6. Schema completeness in final_result["keyframe_snapshots"] and final_result["frames"]
7. Boundary conditions: extreme aspect ratios, low anomaly fallback, temporal spacing
8. Performance SLA: Keyframe extraction and bounding box latency strictly <200ms
9. Exception shielding: Zero unhandled exceptions under corrupt input or S3 failures
"""

import os
import sys
import time
import shutil
from unittest.mock import MagicMock, patch
import pytest
import numpy as np
import cv2

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.netra.pipeline.visual_localizer import VisualAnomalyLocalizer, AnomalyRegionType
from worker.worker import process_job

BENCHMARK_DIR = os.path.join(
    PROJECT_ROOT,
    "garbage", "kaggle_and_scratch", "benchmark_datasets", "generated_100_deepfake_videos"
)

MEDIA_KEYFRAMES_DIR = os.path.join(PROJECT_ROOT, "backend", "media", "keyframes")


class TestBenchmarkRealVideoExecution:
    """
    Tier 1: Real-world benchmark execution across multiple deepfake videos.
    """

    @pytest.mark.parametrize("video_filename", [
        "deepfake_Ajit_Doval.mp4",
        "deepfake_Alia_Bhatt.mp4",
        "deepfake_Narendra_Modi.mp4",
        "deepfake_Nirmala_Sitharaman.mp4",
        "deepfake_Amitabh_Bachchan.mp4",
    ])
    def test_worker_generates_valid_snapshots_on_real_video(self, video_filename: str):
        video_path = os.path.join(BENCHMARK_DIR, video_filename)
        assert os.path.exists(video_path), f"Benchmark video missing: {video_path}"

        job_id = f"challenger-m7-2-{os.path.splitext(video_filename)[0]}"
        captured = []

        mock_s3 = MagicMock()
        mock_s3.download_file = lambda bucket, key, dest: shutil.copyfile(video_path, dest)
        mock_s3.upload_file = MagicMock()

        env_overrides = {"MPLCONFIGDIR": "/tmp/matplotlib"}
        with patch.dict(os.environ, env_overrides), \
             patch("worker.worker.s3", mock_s3), \
             patch("worker.worker.update_job_progress", MagicMock()), \
             patch("worker.worker.write_result_to_dynamo", side_effect=lambda j, r, worker_id=None: captured.append(r)):
            process_job(job_id, video_filename, worker_id="challenger-agent")

        assert len(captured) == 1, "Job must successfully produce final_result in DynamoDB"
        result = captured[0]

        # 1. Validate keyframe_snapshots presence and count (top 1-3 flagged anomaly frames, capped at 3)
        snapshots = result.get("keyframe_snapshots")
        assert snapshots is not None, "final_result must contain 'keyframe_snapshots'"
        assert isinstance(snapshots, list), "'keyframe_snapshots' must be a list"
        assert 1 <= len(snapshots) <= 3, f"Expected 1-3 snapshots for {video_filename}, got {len(snapshots)}"

        # 2. Inspect each snapshot
        for snap in snapshots:
            # File persistence check
            img_path = snap.get("image_path")
            assert img_path is not None, "Snapshot record missing 'image_path'"
            assert os.path.exists(img_path), f"Snapshot file not found on disk: {img_path}"
            assert img_path.startswith(MEDIA_KEYFRAMES_DIR) or "backend/media/keyframes" in img_path

            # File size check (>10 KB)
            file_size = os.path.getsize(img_path)
            assert file_size > 10 * 1024, f"Snapshot file size too small ({file_size} bytes, expected >10KB): {img_path}"

            # Valid JPEG image decoding
            img_bgr = cv2.imread(img_path)
            assert img_bgr is not None and img_bgr.size > 0, f"Cannot decode JPEG image: {img_path}"
            h, w = img_bgr.shape[:2]
            assert h >= 100 and w >= 100, f"Unreasonable image dimensions {w}x{h} for {img_path}"

            # Verify amber #f59e0b pixels (BGR: 11, 158, 245)
            # In JPEG with DCT loss, allow tolerance <= 12 per channel
            b, g, r = img_bgr[:, :, 0], img_bgr[:, :, 1], img_bgr[:, :, 2]
            amber_mask = (
                (np.abs(b.astype(int) - 11) <= 12) &
                (np.abs(g.astype(int) - 158) <= 12) &
                (np.abs(r.astype(int) - 245) <= 12)
            )
            amber_pixels = int(np.count_nonzero(amber_mask))
            assert amber_pixels >= 100, (
                f"Expected at least 100 amber pixels on bounding box/badge for {img_path}, found {amber_pixels}"
            )

            # Verify badge presence: dark background (#0f172a -> BGR 42, 23, 15) and white text
            dark_bg_mask = (b < 60) & (g < 40) & (r < 30)
            dark_bg_pixels = int(np.count_nonzero(dark_bg_mask))
            assert dark_bg_pixels >= 300, (
                f"Expected at least 300 dark background badge pixels for {img_path}, found {dark_bg_pixels}"
            )

            white_text_mask = (b > 210) & (g > 210) & (r > 210)
            white_text_pixels = int(np.count_nonzero(white_text_mask))
            assert white_text_pixels >= 100, (
                f"Expected at least 100 white text pixels for badge text for {img_path}, found {white_text_pixels}"
            )

            # Verify facial identity is preserved:
            # The bounding box interior must NOT be blacked out or masked.
            bx, by, bw, bh = snap.get("bounding_box", [0, 0, 0, 0])
            # Sample interior of bounding box away from edges
            pad_x = max(4, int(bw * 0.15))
            pad_y = max(4, int(bh * 0.15))
            if bw > 2 * pad_x and bh > 2 * pad_y:
                interior_crop = img_bgr[by + pad_y : by + bh - pad_y, bx + pad_x : bx + bw - pad_x]
                assert interior_crop.size > 0
                variance = float(np.var(interior_crop))
                # Natural facial feature crops have texture variance > 50
                assert variance > 50.0, (
                    f"Interior of bounding box lacks texture variance ({variance:.2f}), possible blank/blur occlusion"
                )

            # 3. Verify schema fields
            assert isinstance(snap["frame_number"], int)
            assert isinstance(snap["timestamp"], str) and ":" in snap["timestamp"]
            assert isinstance(snap["anomaly_region"], str) and len(snap["anomaly_region"]) > 0
            assert isinstance(snap["anomaly_score"], float) and 0.0 <= snap["anomaly_score"] <= 1.0
            assert isinstance(snap["detector_subsystem"], str) and len(snap["detector_subsystem"]) > 0
            assert len(snap["bounding_box"]) == 4 and all(isinstance(v, int) for v in snap["bounding_box"])
            assert len(snap["normalized_box"]) == 4 and all(0.0 <= v <= 1.0 for v in snap["normalized_box"])
            assert isinstance(snap["evidence_code"], str) and snap["evidence_code"].startswith("EVD-")
            assert isinstance(snap["statutory_act"], str) and "Section 66D" in snap["statutory_act"]
            assert snap["image_url"].startswith("/api/")
            assert snap["annotated_image_url"] == snap["image_url"]

        # 4. Verify final_result["frames"] schema mapping
        frames = result.get("frames", [])
        assert len(frames) > 0, "final_result must contain 'frames'"
        snapshot_urls = {s["annotated_image_url"] for s in snapshots}
        frame_annotated_urls = {f.get("annotated_image_url") for f in frames if f.get("annotated_image_url")}

        # All snapshot URLs must be represented in frames payload
        for s_url in snapshot_urls:
            assert s_url in frame_annotated_urls, f"Snapshot URL {s_url} not found in frames payload"


class TestAdversarialVisualForensics:
    """
    Tier 2: Adversarial stress testing for visual localization and snapshot generation.
    """

    def test_amber_color_exactness(self):
        """
        Verify exact hex #f59e0b conversion:
        Hex #f59e0b -> RGB (245, 158, 11) -> OpenCV BGR (11, 158, 245)
        """
        expected_bgr = (11, 158, 245)
        assert VisualAnomalyLocalizer.AMBER_BGR == expected_bgr, (
            f"Expected AMBER_BGR to be {expected_bgr}, got {VisualAnomalyLocalizer.AMBER_BGR}"
        )

    def test_badge_text_untruncated_and_exact(self):
        """
        Verify badge text is 'ANOMALY DETECTED HERE' and rendered neatly.
        """
        frame = np.full((720, 1280, 3), 160, dtype=np.uint8)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.92)

        assert meta.get("forensic_badge") == "ANOMALY DETECTED HERE"
        assert meta.get("border_color_hex") == "#f59e0b"

    def test_latency_sla_under_200ms_across_batch(self):
        """
        Verify that localization and annotation completes in strictly <200ms per frame.
        """
        frame = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
        latencies = []
        for _ in range(15):
            t0 = time.perf_counter()
            _ = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.88)
            latencies.append((time.perf_counter() - t0) * 1000.0)

        max_latency = max(latencies)
        avg_latency = sum(latencies) / len(latencies)
        assert max_latency < 200.0, f"Max latency {max_latency:.2f}ms exceeded 200ms SLA"
        assert avg_latency < 50.0, f"Average latency {avg_latency:.2f}ms too high"

    def test_extreme_aspect_ratios_clamping(self):
        """
        Verify that bounding box coordinates remain clamped within frame boundaries
        even on unusual aspect ratios (e.g., vertical 9:16 reels, ultrawide 21:9).
        """
        aspect_ratios = [
            (1920, 1080),  # Vertical smartphone reel (h=1920, w=1080)
            (1080, 2560),  # Ultrawide (h=1080, w=2560)
            (480, 640),    # Legacy SD
            (2160, 3840),  # 4K UHD
        ]

        for h, w in aspect_ratios:
            frame = np.full((h, w, 3), 128, dtype=np.uint8)
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.85)
            bx, by, bw, bh = meta["bounding_box"]

            assert 0 <= bx < w
            assert 0 <= by < h
            assert bw >= 20 and bh >= 20
            assert bx + bw <= w, f"Box width exceeds image width: bx={bx}, bw={bw}, w={w}"
            assert by + bh <= h, f"Box height exceeds image height: by={by}, bh={bh}, h={h}"

    def test_temporal_diversity_cap_at_three(self):
        """
        Verify that filter_high_anomaly_keyframes caps at 3 and enforces min temporal gap.
        """
        frames = [
            {"frame_number": 5, "confidence": 0.99},
            {"frame_number": 6, "confidence": 0.98},
            {"frame_number": 7, "confidence": 0.97},
            {"frame_number": 25, "confidence": 0.96},
            {"frame_number": 26, "confidence": 0.95},
            {"frame_number": 50, "confidence": 0.94},
            {"frame_number": 51, "confidence": 0.93},
        ]
        selected = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            frames, threshold=0.75, min_frame_gap=10, max_keyframes=3
        )
        assert len(selected) == 3
        nums = [f["frame_number"] for f in selected]
        assert nums == [5, 25, 50]
        for i in range(len(nums) - 1):
            assert abs(nums[i] - nums[i+1]) >= 10

    def test_low_anomaly_authentic_video_fallback(self):
        """
        Verify that when zero frames exceed 0.75 in an authentic video,
        fallback provides top frames only if suspicion exists, and does not crash.
        """
        low_frames = [
            {"frame_number": 1, "confidence": 0.12},
            {"frame_number": 15, "confidence": 0.15},
            {"frame_number": 30, "confidence": 0.08},
        ]
        selected = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            low_frames, threshold=0.75, min_frame_gap=10, max_keyframes=3
        )
        # Low confidence (<0.40) should not produce false positive anomaly frames
        assert len(selected) == 0

    def test_exception_shielding_graceful_handling(self):
        """
        Verify worker handles visual localizer failure or corrupt image without crashing.
        """
        video_path = os.path.join(BENCHMARK_DIR, "deepfake_Ajit_Doval.mp4")
        job_id = "test-shielding-fault-001"
        captured = []

        mock_s3 = MagicMock()
        mock_s3.download_file = lambda bucket, key, dest: shutil.copyfile(video_path, dest)
        mock_s3.upload_file = MagicMock(side_effect=RuntimeError("S3 Connection Down"))

        # Inject failure into VisualAnomalyLocalizer.localize_and_annotate where it is bound in worker
        with patch.dict(os.environ, {"MPLCONFIGDIR": "/tmp/matplotlib"}), \
             patch("worker.worker.s3", mock_s3), \
             patch("worker.worker.VisualAnomalyLocalizer.localize_and_annotate",
                   side_effect=RuntimeError("Simulated GPU Fault")), \
             patch("worker.worker.update_job_progress", MagicMock()), \
             patch("worker.worker.write_result_to_dynamo", side_effect=lambda j, r, worker_id=None: captured.append(r)):
            process_job(job_id, "deepfake_Ajit_Doval.mp4", worker_id="shielding-worker")

        assert len(captured) == 1, "Job should complete even when visual localizer encounters fault"
        result = captured[0]
        assert result.get("verdict") is not None
        assert result.get("keyframe_snapshots") == [], "Should fall back gracefully to empty list on failure"
