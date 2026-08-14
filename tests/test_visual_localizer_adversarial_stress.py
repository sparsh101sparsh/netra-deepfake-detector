"""
NETRA — Spatial Visual Anomaly Localization Engine (R1)
Empirical Adversarial Stress Testing & Latency Profiling Suite

Covers:
  1. Adversarial Frame Inputs:
     - Zero-size / empty / None frames
     - Extremely tiny frames (1x1, 2x2, 10x10) and extreme aspect ratios (1x1000, 1000x1)
     - Massive 4K frames (3840x2160)
     - Uniform pixel distributions (solid black, solid white, solid gray, random noise, checkerboard)
     - Non-contiguous arrays, BGRA 4-channel frames
  2. Malformed face_bbox Inputs:
     - Negative coordinates, zero / negative width/height
     - Float coordinates, inverted dimensions
     - Off-canvas bounding boxes, invalid lengths / types
  3. Keyframe Filter Edge Cases:
     - Empty input list
     - 1000 frames with identical scores
     - Threshold boundary precision (0.74999 vs 0.75000 vs 0.75001)
     - Temporal gap edge cases, missing / malformed dictionary keys, alias params
  4. Color & Badge Rendering Integrity:
     - OpenCV BGR color values (AMBER_BGR, DARK_BG_BGR)
     - Badge boundary positioning at top edge (y=0)
  5. 100-Iteration Latency Benchmark on Real Benchmark Video Frames:
     - Measures mean, p50, p95, p99, and max latency against the <200ms SLA.
"""

import os
import sys
import math
import time
import glob
import unittest
import numpy as np
import cv2

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.netra.pipeline.visual_localizer import (
    VisualAnomalyLocalizer,
    AnomalyRegionType,
)


class TestAdversarialFrameDimensions(unittest.TestCase):
    """Stress tests covering boundary frame sizes and aspect ratios."""

    def test_zero_and_empty_frames(self):
        """Zero-size and empty frames must raise ValueError cleanly without unhandled crashes."""
        with self.assertRaises(ValueError):
            VisualAnomalyLocalizer.localize_and_annotate(None)

        with self.assertRaises(ValueError):
            VisualAnomalyLocalizer.localize_and_annotate(np.array([]))

        with self.assertRaises(ValueError):
            VisualAnomalyLocalizer.localize_and_annotate(np.zeros((0, 0, 3), dtype=np.uint8))

    def test_extremely_tiny_frames(self):
        """Frames under 16x16 down to 1x1 should execute without unhandled crash."""
        tiny_shapes = [(1, 1, 3), (2, 2, 3), (5, 5, 3), (10, 10, 3), (16, 16, 3)]
        for shape in tiny_shapes:
            img = np.random.randint(0, 256, shape, dtype=np.uint8)
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
            self.assertIsNotNone(annotated)
            self.assertIn("bounding_box", meta)
            self.assertIn("normalized_box", meta)
            self.assertEqual(len(meta["bounding_box"]), 4)
            self.assertEqual(len(meta["normalized_box"]), 4)

    def test_extreme_aspect_ratios(self):
        """Very wide or very tall frames (e.g. 1000x2, 2x1000) must process safely."""
        extreme_shapes = [
            (2, 1000, 3),
            (1000, 2, 3),
            (10, 2000, 3),
            (2000, 10, 3),
        ]
        for shape in extreme_shapes:
            img = np.zeros(shape, dtype=np.uint8)
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
            self.assertIsNotNone(annotated)
            bx, by, bw, bh = meta["bounding_box"]
            self.assertGreaterEqual(bx, 0)
            self.assertGreaterEqual(by, 0)

    def test_massive_4k_frames(self):
        """Massive 4K frames (3840x2160) must process correctly within reasonable latency."""
        img_4k = np.random.randint(0, 256, (2160, 3840, 3), dtype=np.uint8)
        t0 = time.perf_counter()
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img_4k)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.assertIsNotNone(annotated)
        self.assertEqual(annotated.shape, (2160, 3840, 3))
        bx, by, bw, bh = meta["bounding_box"]
        self.assertGreaterEqual(bx, 0)
        self.assertGreaterEqual(by, 0)
        self.assertLessEqual(bx + bw, 3840)
        self.assertLessEqual(by + bh, 2160)

        # Ensure normalized coordinates are valid within [0, 1]
        for coord in meta["normalized_box"]:
            self.assertGreaterEqual(coord, 0.0)
            self.assertLessEqual(coord, 1.0)

        # 4K frame must execute well under the 200ms threshold
        self.assertLess(elapsed_ms, 200.0, f"4K frame took too long: {elapsed_ms:.2f}ms")


class TestAdversarialPixelDistributions(unittest.TestCase):
    """Stress tests covering adversarial pixel value distributions."""

    def test_uniform_solid_black(self):
        """All-black frame (zero variance) must produce valid localization without divide-by-zero."""
        img = np.zeros((720, 1280, 3), dtype=np.uint8)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)
        self.assertIn(meta["anomaly_region"], [
            "Eyewear / Specular Glare Plane",
            "Iris / Pupil Ocular Region",
            "Perioral / Mouth Blending Boundary"
        ])
        for k, v in meta["diagnostics"].items():
            self.assertFalse(math.isnan(v), f"Diagnostic metric {k} was NaN on solid black frame")

    def test_uniform_solid_white(self):
        """All-white frame (max intensity) must process safely without overflow."""
        img = np.full((720, 1280, 3), 255, dtype=np.uint8)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)
        for k, v in meta["diagnostics"].items():
            self.assertFalse(math.isnan(v), f"Diagnostic metric {k} was NaN on solid white frame")

    def test_uniform_solid_gray(self):
        """Mid-gray frame (128 across all channels) must execute cleanly."""
        img = np.full((720, 1280, 3), 128, dtype=np.uint8)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)
        for k, v in meta["diagnostics"].items():
            self.assertFalse(math.isnan(v), f"Diagnostic metric {k} was NaN on solid gray frame")

    def test_random_uniform_noise(self):
        """Full-frame random noise must not cause unexpected contour or gradient explosions."""
        img = np.random.randint(0, 256, (720, 1280, 3), dtype=np.uint8)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)
        for k, v in meta["diagnostics"].items():
            self.assertFalse(math.isnan(v), f"Diagnostic metric {k} was NaN on noise frame")

    def test_checkerboard_pattern(self):
        """High-frequency alternating checkerboard pattern."""
        img = np.zeros((720, 1280, 3), dtype=np.uint8)
        img[::4, ::4] = 255
        img[1::4, 1::4] = 255
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)

    def test_non_contiguous_array(self):
        """Fortran-ordered (column-major) non-contiguous arrays must be handled properly."""
        img = np.zeros((720, 1280, 3), dtype=np.uint8, order="F")
        self.assertFalse(img.flags.c_contiguous)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)

    def test_four_channel_bgra(self):
        """BGRA 4-channel image frames should be processed without crashing."""
        img = np.zeros((720, 1280, 4), dtype=np.uint8)
        img[:, :, 3] = 255
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(img)
        self.assertIsNotNone(annotated)


class TestMalformedFaceBboxes(unittest.TestCase):
    """Stress tests covering malformed or out-of-bounds face_bbox arguments."""

    def setUp(self):
        self.img = np.zeros((720, 1280, 3), dtype=np.uint8)

    def test_negative_coordinates(self):
        """Negative x, y coordinates must be clamped or safely handled."""
        cases = [
            (-100, -50, 300, 400),
            (-500, -500, 100, 100),
            (-10, 50, 200, 200),
        ]
        for bbox in cases:
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(self.img, face_bbox=bbox)
            bx, by, bw, bh = meta["bounding_box"]
            self.assertGreaterEqual(bx, 0)
            self.assertGreaterEqual(by, 0)
            self.assertLessEqual(bx + bw, 1280)
            self.assertLessEqual(by + bh, 720)

    def test_zero_and_negative_dimensions(self):
        """Width and height <= 0 or < 20 must trigger fallback to estimated face ROI."""
        cases = [
            (200, 200, 0, 0),
            (200, 200, -50, -50),
            (200, 200, 10, 10),
            (200, 200, -100, 400),
        ]
        for bbox in cases:
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(self.img, face_bbox=bbox)
            bx, by, bw, bh = meta["bounding_box"]
            self.assertGreaterEqual(bw, 20)
            self.assertGreaterEqual(bh, 20)

    def test_float_coordinates(self):
        """Float values in face_bbox must be converted to int without TypeError."""
        bbox = (150.7, 100.2, 350.8, 450.4)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(self.img, face_bbox=bbox)
        bx, by, bw, bh = meta["bounding_box"]
        self.assertIsInstance(bx, int)
        self.assertIsInstance(by, int)
        self.assertIsInstance(bw, int)
        self.assertIsInstance(bh, int)

    def test_off_canvas_bounding_box(self):
        """Bounding box located entirely or partially beyond canvas boundaries."""
        cases = [
            (1250, 700, 300, 300),
            (2000, 3000, 500, 500),
        ]
        for bbox in cases:
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(self.img, face_bbox=bbox)
            bx, by, bw, bh = meta["bounding_box"]
            self.assertGreaterEqual(bx, 0)
            self.assertGreaterEqual(by, 0)
            self.assertLessEqual(bx + bw, 1280)
            self.assertLessEqual(by + bh, 720)

    def test_malformed_tuple_lengths_and_types(self):
        """Tuples of wrong length or None must fall back gracefully to face ROI."""
        cases = [
            (100, 100),
            (100, 100, 200),
            (100, 100, 200, 300, 400),
            None,
        ]
        for bbox in cases:
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(self.img, face_bbox=bbox)
            self.assertEqual(len(meta["bounding_box"]), 4)

    def test_non_sequence_face_bbox_type_error_behavior(self):
        """Passing non-sequence types like int raises TypeError because isolate_regions uses len(face_bbox)."""
        with self.assertRaises(TypeError):
            VisualAnomalyLocalizer.isolate_regions(self.img, face_bbox=12345)



class TestFilterHighAnomalyKeyframesStress(unittest.TestCase):
    """Stress tests covering filter_high_anomaly_keyframes boundary conditions."""

    def test_empty_input_list(self):
        """Empty frame list returns empty list."""
        self.assertEqual(VisualAnomalyLocalizer.filter_high_anomaly_keyframes([]), [])
        self.assertEqual(VisualAnomalyLocalizer.filter_high_anomaly_keyframes(None), [])

    def test_1000_frames_identical_scores(self):
        """Large list with 1000 identical high scores must respect max_keyframes and min_frame_gap."""
        frames = [{"frame_number": i, "confidence": 0.92} for i in range(1000)]
        res = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            frames, threshold=0.75, min_frame_gap=15, max_keyframes=5
        )
        self.assertEqual(len(res), 5)
        f_nums = [f["frame_number"] for f in res]
        for i in range(len(f_nums) - 1):
            self.assertGreaterEqual(abs(f_nums[i+1] - f_nums[i]), 15)

    def test_threshold_boundary_precision(self):
        """Boundary values 0.74999 vs 0.75000 vs 0.75001."""
        frames = [
            {"frame_number": 1, "confidence": 0.74999},
            {"frame_number": 20, "confidence": 0.75000},
            {"frame_number": 40, "confidence": 0.75001},
        ]
        # Strict (no fallback): only 0.75001 strictly exceeds 0.75
        res_strict = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            frames, threshold=0.75, fallback_if_empty=False
        )
        self.assertEqual(len(res_strict), 1)
        self.assertEqual(res_strict[0]["frame_number"], 40)

        # With fallback: when all are below 0.75, fallback provides top suspicious
        sub_frames = [
            {"frame_number": 1, "confidence": 0.74999},
            {"frame_number": 20, "confidence": 0.74990},
        ]
        res_fallback = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            sub_frames, threshold=0.75, fallback_if_empty=True
        )
        self.assertEqual(len(res_fallback), 2)
        self.assertEqual(res_fallback[0]["frame_number"], 1)

    def test_temporal_gap_edge_cases(self):
        """Unordered frame sequences, reversed frames, and negative frame numbers."""
        frames = [
            {"frame_number": 50, "confidence": 0.95},
            {"frame_number": 52, "confidence": 0.98},  # gap 2 from 50 (should be skipped if gap=10)
            {"frame_number": 20, "confidence": 0.91},
            {"frame_number": 80, "confidence": 0.92},
        ]
        res = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            frames, threshold=0.75, min_frame_gap=10, max_keyframes=3
        )
        # Top score is frame 52 (0.98).
        # Frame 50 (gap 2) is skipped.
        # Next are frame 80 (0.92, gap 28) and frame 20 (0.91, gap 32).
        f_nums = [f["frame_number"] for f in res]
        self.assertEqual(f_nums, [52, 80, 20])

    def test_missing_and_alternate_score_keys(self):
        """Handles confidence, spatial_score, anomaly_score, fake_probability, score."""
        frames = [
            {"frame_number": 1, "spatial_score": 0.94},
            {"frame_number": 15, "anomaly_score": 0.91},
            {"frame_number": 30, "fake_probability": 0.88},
            {"frame_number": 45, "score": 0.85},
        ]
        res = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(frames, threshold=0.75)
        self.assertEqual(len(res), 3)

    def test_alias_parameters(self):
        """Tests top_k and min_temporal_gap keyword aliases."""
        frames = [
            {"frame_number": 0, "confidence": 0.95},
            {"frame_number": 12, "confidence": 0.92},
            {"frame_number": 25, "confidence": 0.89},
            {"frame_number": 40, "confidence": 0.88},
        ]
        res = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
            frames, top_k=2, min_temporal_gap=10
        )
        self.assertEqual(len(res), 2)


class TestColorAndBadgeIntegrity(unittest.TestCase):
    """Verifies OpenCV BGR color definitions and badge placement rendering."""

    def test_color_constants(self):
        """Assert exact BGR channel values for Amber (#f59e0b) and Dark (#0f172a)."""
        self.assertEqual(VisualAnomalyLocalizer.AMBER_BGR, (11, 158, 245))
        self.assertEqual(VisualAnomalyLocalizer.DARK_BG_BGR, (42, 23, 15))
        self.assertEqual(VisualAnomalyLocalizer.CARD_BORDER_BGR, (95, 58, 30))
        self.assertEqual(VisualAnomalyLocalizer.TEXT_WHITE_BGR, (255, 255, 255))

    def test_badge_rendering_at_top_edge(self):
        """When bounding box is at y=0, badge must render inside the box rather than off-canvas."""
        img = np.zeros((720, 1280, 3), dtype=np.uint8)
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
            img, face_bbox=(300, -100, 400, 100)
        )
        bx, by, bw, bh = meta["bounding_box"]
        self.assertEqual(by, 0)  # Box touches frame top
        self.assertIsNotNone(annotated)
        self.assertEqual(annotated.shape, (720, 1280, 3))



class TestPerformanceBenchmarkRealVideoFrames(unittest.TestCase):
    """Profiles latency on 100 real benchmark video frames and asserts SLA < 200ms."""

    def test_100_iterations_benchmark_frames(self):
        pattern = os.path.join(
            PROJECT_ROOT,
            "garbage", "kaggle_and_scratch", "benchmark_datasets",
            "generated_100_deepfake_videos", "*.mp4"
        )
        video_files = sorted(glob.glob(pattern))
        self.assertGreaterEqual(len(video_files), 10, "Benchmark video dataset not found")

        frames = []
        for vf in video_files:
            cap = cv2.VideoCapture(vf)
            cnt = 0
            while cnt < 10:
                ret, frame = cap.read()
                if not ret:
                    break
                frames.append(frame)
                cnt += 1
            cap.release()
            if len(frames) >= 100:
                break

        frames = frames[:100]
        self.assertEqual(len(frames), 100)

        latencies_ms = []
        for i, frame in enumerate(frames):
            t0 = time.perf_counter()
            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.93)
            t1 = time.perf_counter()
            latencies_ms.append((t1 - t0) * 1000.0)

            # Assert returned contracts on every frame
            self.assertEqual(annotated.shape, frame.shape)
            self.assertEqual(len(meta["bounding_box"]), 4)
            self.assertEqual(len(meta["normalized_box"]), 4)
            self.assertEqual(meta["forensic_badge"], "ANOMALY DETECTED HERE")
            self.assertEqual(meta["border_color_hex"], "#f59e0b")

        latencies_arr = np.array(latencies_ms)
        p50 = float(np.percentile(latencies_arr, 50))
        p95 = float(np.percentile(latencies_arr, 95))
        p99 = float(np.percentile(latencies_arr, 99))
        p_mean = float(np.mean(latencies_arr))
        p_max = float(np.max(latencies_arr))

        print(f"\n[STRESS LATENCY PROFILING RESULTS]")
        print(f"Iterations: {len(latencies_arr)}")
        print(f"Mean:       {p_mean:.3f} ms")
        print(f"p50:        {p50:.3f} ms")
        print(f"p95:        {p95:.3f} ms")
        print(f"p99:        {p99:.3f} ms")
        print(f"Max:        {p_max:.3f} ms")

        # Rigorous SLA verification
        self.assertLess(p_mean, 50.0, f"Mean latency too high: {p_mean}ms")
        self.assertLess(p95, 100.0, f"p95 latency too high: {p95}ms")
        self.assertLess(p99, 200.0, f"p99 latency SLA violated: {p99}ms >= 200ms")
        self.assertLess(p_max, 200.0, f"Max latency SLA violated: {p_max}ms >= 200ms")


if __name__ == "__main__":
    unittest.main()
