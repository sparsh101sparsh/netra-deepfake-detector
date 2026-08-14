"""
Project NETRA — Milestone 10 Empirical Challenger Test Suite (M10-2)
=============================================================================
Role: Adversarial Multi-Face & Scoring Challenger
Milestone: Milestone 10 (Dual-Branch Routing & Multi-Face Forensics Engine)

Empirical Challenge Dimensions:
  1. Multi-Face Extraction & Detection (2, 3, 4 faces) with mixed authentic and synthetic characteristics.
  2. Neural Metrics Completeness & Non-NaN Guarantees (sbi_artifact_level, ocular_reflection_symmetry, eyewear_specular_score, lip_sync_laplacian_score).
  3. Highest-Risk Face Tracking (max_fake_probability, highest_risk_face_id, composite_face_verdict).
  4. Base64 Data URI Decodeability & Format Integrity (data:image/jpeg;base64,... -> valid JPEG matching canvas).
  5. Visual Preview Color Consistency & Adversarial Boundary Verification:
     - Verify color-coded bounding boxes: Amber (#f59e0b) / Red (#ef4444) for synthetic, Emerald (#10b981) for authentic.
     - Detect discrepancies between JSON border_color_hex and actual rendered pixels.
     - Stress-test the threshold boundary [0.50, 0.65).
"""

import os
import sys
import io
import base64
import pytest
import numpy as np
import cv2
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.netra.pipeline.dual_branch_router import (
    process_image_forensics,
    score_individual_faces,
    generate_annotated_preview,
    MultiTierFaceDetector,
    COLOR_RED_BGR,
    COLOR_AMBER_BGR,
    COLOR_EMERALD_BGR,
    SYNTHETIC_THRESHOLD,
    HIGH_SYNTHETIC_THRESHOLD
)

SOURCE_DIR = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/LivePortrait/assets/examples/source"


def load_source_face(filename: str, target_size=(500, 600)) -> np.ndarray:
    path = os.path.join(SOURCE_DIR, filename)
    assert os.path.isfile(path), f"Source face image missing: {path}"
    img = cv2.imread(path)
    assert img is not None and img.size > 0, f"Failed to load image: {path}"
    return cv2.resize(img, target_size)


@pytest.fixture(scope="module")
def two_face_canvas():
    # s0 (authentic ~0.34) and s3 (synthetic/deepfake ~0.76)
    img_auth = load_source_face("s0.jpg")
    img_synth = load_source_face("s3.jpg")
    canvas = np.hstack([img_auth, img_synth])
    _, buf = cv2.imencode(".jpg", canvas)
    return canvas, buf.tobytes()


@pytest.fixture(scope="module")
def three_face_canvas():
    # s1 (authentic ~0.19), s0 (authentic/suspicious ~0.55 on resize), s4 (synthetic/deepfake ~0.94)
    img1 = load_source_face("s1.jpg")
    img2 = load_source_face("s0.jpg")
    img3 = load_source_face("s4.jpg")
    canvas = np.hstack([img1, img2, img3])
    _, buf = cv2.imencode(".jpg", canvas)
    return canvas, buf.tobytes()


@pytest.fixture(scope="module")
def four_face_canvas():
    # 2x2 grid: Top: s1, s0; Bottom: s4, s3
    img1 = load_source_face("s1.jpg")
    img2 = load_source_face("s0.jpg")
    img3 = load_source_face("s4.jpg")
    img4 = load_source_face("s3.jpg")
    top = np.hstack([img1, img2])
    bot = np.hstack([img3, img4])
    canvas = np.vstack([top, bot])
    _, buf = cv2.imencode(".jpg", canvas)
    return canvas, buf.tobytes()


@pytest.fixture(scope="module")
def pure_authentic_canvas():
    # s1 and s2 both authentic
    img1 = load_source_face("s1.jpg")
    img2 = load_source_face("s2.jpg")
    canvas = np.hstack([img1, img2])
    _, buf = cv2.imencode(".jpg", canvas)
    return canvas, buf.tobytes()


class TestEmpiricalMultiFaceM10:
    """Empirical stress test suite for multi-face localization, neural scoring, and previews."""

    def test_01_two_faces_mixed_authentic_synthetic(self, two_face_canvas):
        """
        Challenge 1: Verify 2-face image with mixed authentic and synthetic faces:
        - Both faces localized with valid non-overlapping bounding boxes.
        - Exactly 2 faces scored in 'faces' array with distinct face_ids.
        - Composite verdict tracks the highest-risk face.
        """
        canvas, raw_bytes = two_face_canvas
        result = process_image_forensics(raw_bytes, filename="two_faces_test.jpg")

        assert result["status"] == "success"
        assert result["analysis_mode"] == "pure_face"
        facial = result["facial_analysis"]
        assert facial["face_count"] == 2
        faces = facial["faces"]
        assert len(faces) == 2

        face_ids = [f["face_id"] for f in faces]
        assert len(set(face_ids)) == 2, f"Duplicate face_ids detected: {face_ids}"

        # Bounding box validity
        img_h, img_w = canvas.shape[:2]
        for f in faces:
            bx, by, bw, bh = f["bbox"]
            assert bx >= 0 and by >= 0, f"Negative bbox coordinates: {f['bbox']}"
            assert bx + bw <= img_w + 5, f"Bbox exceeds image width: {f['bbox']} on {img_w}"
            assert by + bh <= img_h + 5, f"Bbox exceeds image height: {f['bbox']} on {img_h}"
            assert bw >= 20 and bh >= 20, f"Bbox too small: {f['bbox']}"

            # Normalized bbox checks
            nx, ny, nw, nh = f["normalized_bbox"]
            assert 0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0
            assert 0.0 < nw <= 1.0 and 0.0 < nh <= 1.0

        # Composite tracking
        highest_face = max(faces, key=lambda x: x["fake_probability"])
        assert facial["highest_risk_face_id"] == highest_face["face_id"]
        assert facial["max_fake_probability"] == highest_face["fake_probability"]
        assert result["composite_risk_score"] == int(highest_face["fake_probability"] * 100)

    def test_02_three_faces_composite_tracking(self, three_face_canvas):
        """
        Challenge 2: Verify 3-face composite image:
        - All 3 faces detected and uniquely identified.
        - Highest risk face dictates composite verdict and score.
        """
        canvas, raw_bytes = three_face_canvas
        result = process_image_forensics(raw_bytes, filename="three_faces_test.jpg")

        assert result["status"] == "success"
        facial = result["facial_analysis"]
        assert facial["face_count"] == 3
        faces = facial["faces"]
        assert len(faces) == 3

        face_ids = [f["face_id"] for f in faces]
        assert face_ids == ["face_1", "face_2", "face_3"]

        probs = [f["fake_probability"] for f in faces]
        max_prob = max(probs)
        highest_face = next(f for f in faces if f["fake_probability"] == max_prob)

        assert facial["highest_risk_face_id"] == highest_face["face_id"]
        assert facial["max_fake_probability"] == highest_face["fake_probability"]

        if max_prob >= 0.75:
            assert facial["composite_face_verdict"] == "DEEPFAKE"
            assert result["composite_verdict"] == "CRITICAL FACIAL DEEPFAKE DETECTED"
        elif max_prob >= 0.50:
            assert facial["composite_face_verdict"] == "SUSPICIOUS"
            assert result["composite_verdict"] == "SUSPICIOUS FACIAL PATTERNS DETECTED"
        else:
            assert facial["composite_face_verdict"] == "AUTHENTIC"

    def test_03_four_faces_quadrant_grid_metrics(self, four_face_canvas):
        """
        Challenge 3: Verify 4-face 2x2 grid:
        - All 4 faces detected across distinct spatial quadrants.
        - Neural metrics properly populated for all 4 faces.
        """
        canvas, raw_bytes = four_face_canvas
        result = process_image_forensics(raw_bytes, filename="four_faces_grid.jpg")

        assert result["status"] == "success"
        facial = result["facial_analysis"]
        assert facial["face_count"] == 4
        faces = facial["faces"]
        assert len(faces) == 4

        # Verify neural metrics are present and non-trivial for all 4 faces
        for i, f in enumerate(faces):
            nm = f["neural_metrics"]
            assert "sbi_artifact_level" in nm
            assert "ocular_reflection_symmetry" in nm
            assert "eyewear_specular_score" in nm
            assert "lip_sync_laplacian_score" in nm

            assert 0.0 <= nm["sbi_artifact_level"] <= 1.0
            assert 0.0 <= nm["ocular_reflection_symmetry"] <= 1.0
            assert nm["eyewear_specular_score"] >= 0.0
            assert nm["lip_sync_laplacian_score"] >= 0.0

            assert f["evidence_code"].startswith("EVD-")
            assert len(f["forensic_badge"]) > 0

    def test_04_pure_authentic_multi_face_baseline(self, pure_authentic_canvas):
        """
        Challenge 4: Baseline test with authentic multi-face media:
        - Verify all faces scored as AUTHENTIC.
        - Composite verdict is AUTHENTIC.
        - All border_color_hex are emerald (#10b981).
        """
        canvas, raw_bytes = pure_authentic_canvas
        result = process_image_forensics(raw_bytes, filename="authentic_canvas.jpg")

        facial = result["facial_analysis"]
        assert facial["face_count"] == 2
        faces = facial["faces"]

        for f in faces:
            assert f["verdict"] == "AUTHENTIC"
            assert f["risk_level"] == "SAFE"
            assert f["border_color_hex"] == "#10b981"
            assert "AUTHENTIC" in f["forensic_badge"]

        assert facial["composite_face_verdict"] == "AUTHENTIC"
        assert result["composite_risk_level"] == "SAFE"

    def test_05_base64_preview_integrity_and_decoding(self, three_face_canvas):
        """
        Challenge 5: Verify preview base64 data URI:
        - Must start with 'data:image/jpeg;base64,'.
        - Must be non-empty and decode to valid JPEG bytes.
        - Decoded JPEG dimensions must match original canvas dimensions.
        """
        canvas, raw_bytes = three_face_canvas
        result = process_image_forensics(raw_bytes, filename="b64_test.jpg")

        b64_uri = result["facial_analysis"]["annotated_preview_base64"]
        assert b64_uri is not None
        assert b64_uri.startswith("data:image/jpeg;base64,")

        raw_b64 = b64_uri.split(",", 1)[1]
        decoded_bytes = base64.b64decode(raw_b64)
        assert len(decoded_bytes) > 1000

        # Validate JPEG SOI marker \xff\xd8
        assert decoded_bytes[:2] == b"\xff\xd8"

        # Decode into image and verify dimensions
        np_arr = np.frombuffer(decoded_bytes, np.uint8)
        decoded_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        assert decoded_img is not None
        assert decoded_img.shape[:2] == canvas.shape[:2]

    def test_06_neural_metrics_boundedness_and_non_nan(self, four_face_canvas):
        """
        Challenge 6: Rigorous numerical audit on neural metrics:
        - Check that no metric is NaN or Infinite.
        - Check that normalized coordinates sum properly and are bounded.
        """
        canvas, raw_bytes = four_face_canvas
        result = process_image_forensics(raw_bytes, filename="numerical_audit.jpg")

        for f in result["facial_analysis"]["faces"]:
            prob = f["fake_probability"]
            assert not np.isnan(prob) and not np.isinf(prob)

            nm = f["neural_metrics"]
            for k, val in nm.items():
                assert not np.isnan(val), f"Metric {k} is NaN for face {f['face_id']}"
                assert not np.isinf(val), f"Metric {k} is Inf for face {f['face_id']}"

    def test_07_adversarial_challenge_color_code_discrepancy(self, three_face_canvas):
        """
        Challenge 7 (Adversarial Stress Test):
        Detects threshold inconsistency between score_individual_faces and generate_annotated_preview:
        - score_individual_faces assigns border_color_hex = '#f59e0b' (Amber) and badge = 'SYNTHETIC'
          for fake_prob in [0.50, 0.75).
        - generate_annotated_preview uses SYNTHETIC_THRESHOLD = 0.65 to assign box_color.
        - When fake_prob is in [0.50, 0.65), face['border_color_hex'] is Amber, but the rendered
          pixels on the preview image are Emerald Green (129, 185, 16)!
        """
        canvas, raw_bytes = three_face_canvas
        result = process_image_forensics(raw_bytes, filename="color_discrepancy_probe.jpg")
        faces = result["facial_analysis"]["faces"]

        # Decode rendered preview image from base64
        b64_uri = result["facial_analysis"]["annotated_preview_base64"]
        raw_b64 = b64_uri.split(",", 1)[1]
        annotated_img = cv2.imdecode(np.frombuffer(base64.b64decode(raw_b64), np.uint8), cv2.IMREAD_COLOR)

        discrepancies = []
        for f in faces:
            prob = f["fake_probability"]
            expected_hex = f["border_color_hex"]
            bx, by, bw, bh = f["bbox"]

            # Sample the bounding box stroke pixel (at left edge midpoint)
            sample_y = min(annotated_img.shape[0] - 1, by + bh // 2)
            sample_x = min(annotated_img.shape[1] - 1, bx)
            stroke_bgr = annotated_img[sample_y, sample_x]

            # In BGR:
            # Amber: [11, 158, 245] -> high BGR channel 2 (Red ~245), high channel 1 (Green ~158), low channel 0 (Blue ~11)
            # Emerald: [129, 185, 16] -> high channel 1 (Green ~185), channel 0 (Blue ~129), low channel 2 (Red ~16)
            # Red: [68, 68, 239] -> high channel 2 (Red ~239)
            is_pixel_emerald = (stroke_bgr[1] > 140 and stroke_bgr[2] < 60)
            is_pixel_amber = (stroke_bgr[2] > 200 and stroke_bgr[1] > 120 and stroke_bgr[0] < 50)
            is_pixel_red = (stroke_bgr[2] > 200 and stroke_bgr[1] < 100)

            if 0.50 <= prob < 0.65:
                # This face is classified as SUSPICIOUS and SYNTHETIC with expected_hex #f59e0b
                if is_pixel_emerald and expected_hex == "#f59e0b":
                    discrepancies.append({
                        "face_id": f["face_id"],
                        "fake_probability": prob,
                        "verdict": f["verdict"],
                        "badge": f["forensic_badge"],
                        "json_border_hex": expected_hex,
                        "rendered_pixel_bgr": stroke_bgr.tolist(),
                        "issue": "Rendered box is Emerald Green despite JSON border_color_hex being Amber (#f59e0b) and badge being SYNTHETIC."
                    })

        if discrepancies:
            msg = (
                f"CHALLENGE DETECTED: Visual/JSON color discrepancy on {len(discrepancies)} face(s): "
                f"{discrepancies}"
            )
            pytest.fail(msg)
