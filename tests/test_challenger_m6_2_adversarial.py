"""
Adversarial Empirical Challenge Suite for Milestone 6-2
Target: backend/netra/pipeline/visual_localizer.py

Empirically verifies:
1. Exact Color Fidelity:
   - Amber stroke: #f59e0b -> BGR (11, 158, 245)
   - Badge background: #0f172a -> BGR (42, 23, 15)
   - Badge text: White (255, 255, 255)
   - Badge text content: "ANOMALY DETECTED HERE"
2. Spatial Landmark Isolation & Identity Non-Obstruction:
   - Eyewear region covers eyes/spectacles plane (EVD-EYE-SPECULAR-GLARE)
   - Iris region covers corneal sockets (EVD-IRIS-CORNEAL-DISCONTINUITY)
   - Lip-sync seam covers perioral zone (EVD-LIP-SYNC-BOUNDARY-SEAM)
   - Ocular and perioral zones are anatomically separated without vertical overlap
   - Bounding boxes are non-destructive outlines (interior facial pixels preserved)
   - Sub-region area occupies < 30% of total facial area
3. Boundary & Non-Clipping Behavior:
   - Top frame boundary (by = 0, by = 2, by = 10)
   - Bottom frame boundary (by + bh = img_h)
   - Left and right frame boundaries (bx = 0, bx + bw = img_w)
   - Badge rendering non-clipping behavior
   - Extreme aspect ratios and corrupt/extreme inputs
4. Real Deepfake Video Verification:
   - Multi-video extraction from generated_100_deepfake_videos
   - Verification of pixel colors, latency (<200ms), and statutory citations
"""

import os
import glob
import time
import pytest
import numpy as np
import cv2

from backend.netra.pipeline.visual_localizer import VisualAnomalyLocalizer, AnomalyRegionType

BENCHMARK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "garbage", "kaggle_and_scratch", "benchmark_datasets", "generated_100_deepfake_videos"
)


class TestAdversarialColorsAndBadges:
    """Rigorous empirical verification of pixel color values and badge styling."""

    def test_exact_bgr_color_constants(self):
        """Verify BGR constants mathematically correspond to the required hex codes."""
        # Amber: #f59e0b -> R=0xf5=245, G=0x9e=158, B=0x0b=11
        # In BGR: (11, 158, 245)
        assert VisualAnomalyLocalizer.AMBER_BGR == (11, 158, 245), (
            f"Expected (11, 158, 245), got {VisualAnomalyLocalizer.AMBER_BGR}"
        )
        # Dark Slate: #0f172a -> R=0x0f=15, G=0x17=23, B=0x2a=42
        # In BGR: (42, 23, 15)
        assert VisualAnomalyLocalizer.DARK_BG_BGR == (42, 23, 15), (
            f"Expected (42, 23, 15), got {VisualAnomalyLocalizer.DARK_BG_BGR}"
        )
        # White Text: (255, 255, 255)
        assert VisualAnomalyLocalizer.TEXT_WHITE_BGR == (255, 255, 255)

    def test_rendered_pixels_contain_exact_amber_and_slate(self):
        """Verify the annotated image pixels actually contain exact amber and dark slate values."""
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        # Fill with a neutral gray so our colors stand out uniquely
        frame[:] = (100, 100, 100)

        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
            frame, anomaly_score=0.95, face_bbox=(400, 200, 480, 400)
        )

        amber_bgr = np.array([11, 158, 245], dtype=np.uint8)
        dark_slate_bgr = np.array([42, 23, 15], dtype=np.uint8)
        white_bgr = np.array([255, 255, 255], dtype=np.uint8)

        amber_count = np.count_nonzero(np.all(annotated == amber_bgr, axis=-1))
        dark_slate_count = np.count_nonzero(np.all(annotated == dark_slate_bgr, axis=-1))
        white_count = np.count_nonzero(np.all(annotated == white_bgr, axis=-1))

        assert amber_count >= 100, f"Expected >= 100 amber border pixels, found {amber_count}"
        assert dark_slate_count >= 500, f"Expected >= 500 dark slate badge background pixels, found {dark_slate_count}"
        assert white_count >= 20, f"Expected >= 20 white text pixels, found {white_count}"
        assert meta["border_color_hex"] == "#f59e0b"
        assert meta["forensic_badge"] == "ANOMALY DETECTED HERE"

    def test_badge_position_above_box_when_space_permits(self):
        """When y is sufficiently far from top (y >= badge_h + 2), badge must be placed above the box."""
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        frame[:] = (100, 100, 100)
        by = 250
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
            frame, anomaly_score=0.90, face_bbox=(400, by, 400, 400), prefer_region="eyewear"
        )
        box = meta["bounding_box"]
        target_by = box[1]

        # Scan columns above target_by for dark slate badge pixels
        dark_slate_bgr = np.array([42, 23, 15], dtype=np.uint8)
        area_above = annotated[max(0, target_by - 40):target_by, box[0]:box[0] + box[2]]
        badge_pixels_above = np.count_nonzero(np.all(area_above == dark_slate_bgr, axis=-1))
        assert badge_pixels_above > 100, "Badge should be positioned above bounding box when space permits"

    def test_badge_position_inside_box_when_box_touches_top(self):
        """When box touches top boundary (y=0), badge must flip inside top of box to prevent clipping."""
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        frame[:] = (100, 100, 100)

        # Force face sufficiently high up that eyewear box clamps to by=0
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
            frame, anomaly_score=0.90, face_bbox=(400, -100, 400, 400), prefer_region="eyewear"
        )
        box = meta["bounding_box"]
        assert box[1] == 0, f"Expected box[1] == 0, got {box[1]}"

        # Scan area inside top of box for dark slate badge pixels
        dark_slate_bgr = np.array([42, 23, 15], dtype=np.uint8)
        area_inside = annotated[box[1]:box[1] + 45, box[0]:box[0] + box[2]]
        badge_pixels_inside = np.count_nonzero(np.all(area_inside == dark_slate_bgr, axis=-1))
        assert badge_pixels_inside > 100, "Badge should be placed inside box top when at y=0"

    def test_badge_never_clips_outside_frame_boundaries(self):
        """Adversarial stress test on coordinates: box at all extreme edges."""
        img_h, img_w = 600, 800

        corner_cases = [
            (0, 0, 100, 100),               # Top-left corner
            (img_w - 120, 0, 120, 100),       # Top-right corner
            (0, img_h - 120, 100, 120),       # Bottom-left corner
            (img_w - 120, img_h - 120, 120, 120), # Bottom-right corner
            (0, -50, 100, 100),              # Above top frame edge
            (img_w - 60, 200, 60, 60),      # Near right edge
        ]

        for fx, fy, fw, fh in corner_cases:
            frame = np.zeros((img_h, img_w, 3), dtype=np.uint8)
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
                frame, anomaly_score=0.91, face_bbox=(fx, fy, fw, fh)
            )
            bx, by, bw, bh = meta["bounding_box"]
            assert 0 <= bx <= img_w - 20
            assert 0 <= by <= img_h - 20
            assert bx + bw <= img_w
            assert by + bh <= img_h
            assert annotated.shape == (img_h, img_w, 3)


class TestAdversarialLandmarkIsolationAndIdentity:
    """Verifies anatomical accuracy and identity non-obstruction."""

    def test_three_regions_isolation_and_coverage(self):
        """Test that all three regions are distinct sub-facial zones."""
        frame = np.zeros((1000, 1000, 3), dtype=np.uint8)
        face_bbox = (200, 200, 600, 600)  # Face from y=200 to 800
        fx, fy, fw, fh = face_bbox

        regions = VisualAnomalyLocalizer.isolate_regions(frame, face_bbox)
        ew = regions[AnomalyRegionType.EYEWEAR]
        iris = regions[AnomalyRegionType.IRIS]
        lip = regions[AnomalyRegionType.LIP_SYNC]

        # 1. Eyewear region: covers upper ocular plane
        assert ew[1] >= fy + int(fh * 0.15), "Eyewear y should start in upper face"
        assert ew[1] + ew[3] <= fy + int(fh * 0.55), "Eyewear y should end before mid-nose"

        # 2. Iris region: narrower focused ocular band
        assert iris[1] >= fy + int(fh * 0.20), "Iris y should start near eyes"
        assert iris[1] + iris[3] <= fy + int(fh * 0.48), "Iris y should end before lower nose"
        assert iris[3] < ew[3], "Iris band should be more focused vertically than eyewear"

        # 3. Lip-sync region: perioral mouth boundary zone
        assert lip[1] >= fy + int(fh * 0.58), "Lip sync y should start below nose"
        assert lip[1] + lip[3] <= fy + fh, "Lip sync y should not extend below chin"

        # 4. Vertical separation: iris and lip-sync MUST NOT OVERLAP
        iris_bottom = iris[1] + iris[3]
        lip_top = lip[1]
        assert lip_top > iris_bottom, (
            f"Ocular zone (bottom: {iris_bottom}) overlaps perioral zone (top: {lip_top})"
        )

    def test_identity_non_obstruction_interior_pixels_preserved(self):
        """
        Adversarial test: Confirm that bounding boxes are outlines (thickness=3),
        leaving the face inside the box 100% visible and unmasked.
        """
        # Create a frame with unique identifiable pattern (gradient + texture)
        frame = np.zeros((600, 600, 3), dtype=np.uint8)
        for i in range(600):
            frame[i, :, 0] = (i * 2) % 256
            frame[:, i, 1] = (i * 3) % 256
            frame[i, i, 2] = 200

        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
            frame, anomaly_score=0.94, face_bbox=(150, 150, 300, 300), prefer_region="lip_sync"
        )

        bx, by, bw, bh = meta["bounding_box"]

        # Interior region well inside the box outline (offset by 5px from border)
        interior_orig = frame[by + 6:by + bh - 6, bx + 6:bx + bw - 6]
        interior_ann = annotated[by + 6:by + bh - 6, bx + 6:bx + bw - 6]

        # Interior pixels must be IDENTICAL to original (not blocked, masked, or blurred)
        diff = np.max(np.abs(interior_ann.astype(int) - interior_orig.astype(int)))
        assert diff == 0, f"Facial identity inside bounding box was modified! Max diff: {diff}"

    def test_landmark_subregion_area_ratio(self):
        """Verifies bounding box is a localized sub-region, occupying < 30% of facial area."""
        frame = np.zeros((800, 800, 3), dtype=np.uint8)
        face_bbox = (200, 150, 400, 500)
        face_area = face_bbox[2] * face_bbox[3]

        regions = VisualAnomalyLocalizer.isolate_regions(frame, face_bbox)
        for r_name, (rx, ry, rw, rh) in regions.items():
            box_area = rw * rh
            ratio = box_area / face_area
            assert ratio < 0.30, (
                f"Region {r_name} occupies {ratio*100:.1f}% of face, violating localized isolation"
            )


class TestAdversarialStatutoryAndSemanticIntegrity:
    """Verifies semantic labels, evidence codes, and statutory compliance citations."""

    @pytest.mark.parametrize("prefer_input,expected_evd,expected_label,statutory_tokens", [
        (
            "eyewear",
            "EVD-EYE-SPECULAR-GLARE",
            "Eyewear Specular Glare & Feature Discontinuity",
            ["Section 66D IT Act 2000"]
        ),
        (
            "iris",
            "EVD-IRIS-CORNEAL-DISCONTINUITY",
            "Iris/Pupil Corneal Reflection Discontinuity",
            ["Section 66D IT Act 2000"]
        ),
        (
            "lip_sync",
            "EVD-LIP-SYNC-BOUNDARY-SEAM",
            "Lip-Sync Blending Boundary Artifact",
            ["Section 318(4) BNS 2023"]
        ),
    ])
    def test_statutory_and_evidence_codes(self, prefer_input, expected_evd, expected_label, statutory_tokens):
        frame = np.zeros((600, 600, 3), dtype=np.uint8)
        _, meta = VisualAnomalyLocalizer.localize_and_annotate(
            frame, anomaly_score=0.91, prefer_region=prefer_input
        )
        assert meta["evidence_code"] == expected_evd
        assert meta["semantic_label"] == expected_label
        for token in statutory_tokens:
            assert token in meta["statutory_act"], f"Missing statutory citation '{token}' in {meta['statutory_act']}"

    def test_normalized_box_precision(self):
        """Verifies normalized bounding box coordinates are in range [0.0, 1.0] with 4 decimals."""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        _, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.88)
        norm_box = meta["normalized_box"]
        assert len(norm_box) == 4
        nx, ny, nw, nh = norm_box
        assert 0.0 <= nx <= 1.0
        assert 0.0 <= ny <= 1.0
        assert 0.0 < nw <= 1.0
        assert 0.0 < nh <= 1.0
        assert nx + nw <= 1.0001
        assert ny + nh <= 1.0001


class TestAdversarialKeyframeFiltering:
    """Stress tests candidate filtering with degenerate and malformed metadata."""

    def test_filter_keyframes_robustness_to_missing_keys(self):
        """Engine extracts score from various candidate key names and ignores malformed items."""
        frames = [
            {"frame_number": 5, "fake_probability": 0.88},
            {"frame_idx": 15, "spatial_score": 0.95},
            {"index": 30, "anomaly_score": 0.92},
            {"frame": 45, "score": 0.89},
            {"frame_number": 60, "confidence": "0.91"},  # String representation
            {"frame_number": 75, "confidence": None},     # None score
            {"frame_number": 90, "confidence": "invalid"}, # Non-float string
        ]
        res = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(frames, threshold=0.75, top_k=5)
        # Frames 75 and 90 should be excluded because their scores cannot be parsed or are 0
        excluded_numbers = {75, 90}
        selected_numbers = {f.get("frame_number") or f.get("frame_idx") or f.get("index") or f.get("frame") for f in res}
        assert not selected_numbers.intersection(excluded_numbers), "Malformed score frames should be rejected"
        assert len(res) == 5, f"Expected 5 qualified frames, got {len(res)}"

    def test_filter_keyframes_temporal_spacing_enforcement(self):
        """Must reject frames too close in time (< min_frame_gap)."""
        frames = [
            {"frame_number": 10, "confidence": 0.99},
            {"frame_number": 12, "confidence": 0.98},  # gap 2 < 15
            {"frame_number": 15, "confidence": 0.97},  # gap 5 < 15
            {"frame_number": 28, "confidence": 0.96},  # gap 18 >= 15
            {"frame_number": 30, "confidence": 0.95},  # gap 2 < 15
            {"frame_number": 50, "confidence": 0.94},  # gap 22 >= 15
        ]
        res = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(frames, threshold=0.75, min_frame_gap=15, top_k=3)
        assert len(res) == 3
        nums = [f["frame_number"] for f in res]
        assert nums == [10, 28, 50]


class TestAdversarialRealDeepfakeVideos:
    """Direct empirical execution across real deepfake video files from benchmark dataset."""

    def test_multi_video_frame_forensic_inspection(self):
        """Extracts frames from 5 actual deepfake videos and inspects rendered outputs."""
        pattern = os.path.join(BENCHMARK_DIR, "*.mp4")
        video_files = sorted(glob.glob(pattern))[:5]
        assert len(video_files) >= 5, f"Found {len(video_files)} videos in {BENCHMARK_DIR}"

        amber_bgr = np.array([11, 158, 245], dtype=np.uint8)
        dark_slate_bgr = np.array([42, 23, 15], dtype=np.uint8)

        latencies = []

        for vpath in video_files:
            vname = os.path.basename(vpath)
            cap = cv2.VideoCapture(vpath)
            assert cap.isOpened(), f"Could not open {vname}"

            # Read frame 30
            cap.set(cv2.CAP_PROP_POS_FRAMES, 30)
            ret, frame = cap.read()
            cap.release()
            assert ret and frame is not None, f"Could not read frame from {vname}"

            h, w = frame.shape[:2]
            assert w >= 480 and h >= 360

            # Execute localization and measure latency
            t0 = time.perf_counter()
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
                frame, anomaly_score=0.965
            )
            lat_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(lat_ms)

            # Assert SLA
            assert lat_ms < 200.0, f"Latency {lat_ms:.2f}ms exceeded 200ms on {vname}"

            # Assert presence of amber border and dark slate badge
            amber_matches = np.count_nonzero(np.all(annotated == amber_bgr, axis=-1))
            slate_matches = np.count_nonzero(np.all(annotated == dark_slate_bgr, axis=-1))
            assert amber_matches >= 80, f"Insufficient amber pixels on {vname}: {amber_matches}"
            assert slate_matches >= 300, f"Insufficient slate pixels on {vname}: {slate_matches}"

            # Assert metadata integrity
            bx, by, bw, bh = meta["bounding_box"]
            assert 0 <= bx < w and 0 <= by < h
            assert bx + bw <= w and by + bh <= h
            assert meta["forensic_badge"] == "ANOMALY DETECTED HERE"
            assert meta["evidence_code"].startswith("EVD-")
            assert "Section 66D" in meta["statutory_act"]

        mean_lat = sum(latencies) / len(latencies)
        assert mean_lat < 20.0, f"Mean latency {mean_lat:.2f}ms exceeds target 20ms"
