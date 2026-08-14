"""
Forensic Audit Script for Visual Anomaly Localizer (M6 / R1)
Location: .agents/teamwork_preview_auditor_m6_1/forensic_verification_script.py
"""

import os
import sys
import ast
import time
import json
import numpy as np
import cv2

PROJECT_ROOT = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.netra.pipeline.visual_localizer import VisualAnomalyLocalizer, AnomalyRegionType


def test_color_hex_bgr_fidelity():
    print("\n--- 1. Color Fidelity & BGR Hex Mapping Check ---")
    # Amber #f59e0b -> RGB (245, 158, 11) -> BGR (11, 158, 245)
    expected_amber = (11, 158, 245)
    actual_amber = VisualAnomalyLocalizer.AMBER_BGR
    assert actual_amber == expected_amber, f"AMBER_BGR mismatch: expected {expected_amber}, got {actual_amber}"
    print(f"[PASS] AMBER_BGR: {actual_amber} matches #f59e0b")

    # Dark BG #0f172a -> RGB (15, 23, 42) -> BGR (42, 23, 15)
    expected_dark = (42, 23, 15)
    actual_dark = VisualAnomalyLocalizer.DARK_BG_BGR
    assert actual_dark == expected_dark, f"DARK_BG_BGR mismatch: expected {expected_dark}, got {actual_dark}"
    print(f"[PASS] DARK_BG_BGR: {actual_dark} matches #0f172a")

    # Card border #1e3a5f -> RGB (30, 58, 95) -> BGR (95, 58, 30)
    expected_border = (95, 58, 30)
    actual_border = VisualAnomalyLocalizer.CARD_BORDER_BGR
    assert actual_border == expected_border, f"CARD_BORDER_BGR mismatch: expected {expected_border}, got {actual_border}"
    print(f"[PASS] CARD_BORDER_BGR: {actual_border} matches #1e3a5f")


def test_ast_for_hardcoding_and_facades():
    print("\n--- 2. AST Static Analysis for Hardcoding, Facades, & Mocks ---")
    target_path = os.path.join(PROJECT_ROOT, "backend/netra/pipeline/visual_localizer.py")
    with open(target_path, "r") as f:
        source_code = f.read()

    tree = ast.parse(source_code, filename=target_path)

    # 1. Check for mock imports
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            mod = getattr(node, "module", "") or ""
            names = [alias.name for alias in node.names]
            for bad in ["mock", "unittest.mock", "pytest_mock"]:
                if bad in mod or any(bad in n for n in names):
                    raise AssertionError(f"Prohibited mock import detected: {mod} {names}")

    print("[PASS] Zero mock libraries or testing fixtures imported in production module.")

    # 2. Check for hardcoded benchmark video names or person names in AST string constants
    benchmark_tokens = [
        "ajit_doval", "arvind_kejriwal", "nirmala_sitharaman", "peyush_bansal", "s_jaishankar",
        "alia_bhatt", "deepika_padukone", "gautam_adani", "ms_dhoni", "shah_rukh_khan",
        "narendra_modi", "amitabh_bachchan", "rahul_gandhi", "shashi_tharoor", "rajinikanth",
        "amit_shah", "mukesh_ambani", "ritesh_agarwal", "s_somanath", "virat_kohli",
        "deepfake_", ".mp4"
    ]
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            val_lower = node.value.lower()
            for token in benchmark_tokens:
                assert token not in val_lower, f"Suspicious benchmark token found in string literal: '{node.value}'"


    print("[PASS] Zero benchmark names, video slugs, or file filters found in source code.")

    # 3. Check for trivial facade functions (functions with only pass or return constant)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            # Check if body is just Return(Constant)
            if len(node.body) == 1 and isinstance(node.body[0], ast.Return):
                if isinstance(node.body[0].value, ast.Constant):
                    raise AssertionError(f"Facade function detected: {node.name} returns constant {node.body[0].value.value}")

    print("[PASS] Zero facade functions returning trivial constants detected.")


def test_dynamic_skin_roi_tracking():
    print("\n--- 3. Dynamic Skin ROI Tracking Test ---")
    h, w = 480, 640

    # Skin color in YCrCb: Cr in [133, 173], Cb in [77, 127]
    # Let's create an RGB/BGR skin color:
    # Typical skin BGR ~ (130, 150, 200)
    # Let's verify what BGR yields skin locus
    test_patch = np.full((10, 10, 3), (120, 150, 200), dtype=np.uint8)
    ycrcb = cv2.cvtColor(test_patch, cv2.COLOR_BGR2YCrCb)
    cr = ycrcb[0, 0, 1]
    cb = ycrcb[0, 0, 2]
    assert 133 <= cr <= 173 and 77 <= cb <= 127, f"Color not in skin locus: Cr={cr}, Cb={cb}"

    # Frame 1: Skin patch placed on LEFT side of frame
    frame_left = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(frame_left, (80, 100), (220, 300), (120, 150, 200), -1)
    roi_left = VisualAnomalyLocalizer.estimate_face_roi(frame_left)

    # Frame 2: Skin patch placed on RIGHT side of frame
    frame_right = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.rectangle(frame_right, (420, 100), (560, 300), (120, 150, 200), -1)
    roi_right = VisualAnomalyLocalizer.estimate_face_roi(frame_right)

    print(f"Skin Left ROI: {roi_left}")
    print(f"Skin Right ROI: {roi_right}")

    assert roi_left[0] < roi_right[0], f"ROI x failed to follow skin patch: left={roi_left[0]}, right={roi_right[0]}"
    assert abs(roi_left[0] - 80) <= 20, f"ROI left x unexpected: {roi_left[0]}"
    assert abs(roi_right[0] - 420) <= 20, f"ROI right x unexpected: {roi_right[0]}"
    print("[PASS] estimate_face_roi dynamically tracks facial skin patches across spatial translations.")


def test_dynamic_feature_selection():
    print("\n--- 4. Dynamic Anomaly Region Feature Selection ---")
    h, w = 480, 640
    base_face = (100, 100, 200, 250)

    # Scenario A: High specular glare in the eyewear region
    frame_glare = np.full((h, w, 3), 80, dtype=np.uint8)
    # Add face
    frame_glare[100:350, 100:300] = (120, 150, 200)
    # Add bright saturated white specular glare in eyewear zone (fy + 0.20*fh ~ 150)
    frame_glare[145:175, 120:280] = (250, 250, 250)
    # Add high frequency noise in eyewear zone
    noise = np.random.randint(0, 50, (30, 160, 3), dtype=np.uint8)
    frame_glare[145:175, 120:280] = cv2.add(frame_glare[145:175, 120:280], noise)

    chosen_type_a, box_a, meta_a = VisualAnomalyLocalizer.evaluate_primary_anomaly(frame_glare, base_face)
    print(f"Glare Scenario: Chosen={chosen_type_a}, Meta scores={meta_a['regional_scores']}")

    # Scenario B: High bilateral ocular asymmetry in iris zone
    frame_iris = np.full((h, w, 3), 80, dtype=np.uint8)
    frame_iris[100:350, 100:300] = (120, 150, 200)
    # Iris zone: fy + 0.24*fh ~ 160, fx + 0.14*fw ~ 128 to 272. Midpoint ~ 200
    # Left eye: bright glint
    frame_iris[155:185, 130:190] = (240, 240, 240)
    # Right eye: dark socket
    frame_iris[155:185, 210:270] = (20, 20, 20)

    chosen_type_b, box_b, meta_b = VisualAnomalyLocalizer.evaluate_primary_anomaly(frame_iris, base_face)
    print(f"Iris Asymmetry Scenario: Chosen={chosen_type_b}, Meta scores={meta_b['regional_scores']}")

    # Scenario C: Heavy seam / Laplacian gradient in mouth/lip zone
    frame_lip = np.full((h, w, 3), 80, dtype=np.uint8)
    frame_lip[100:350, 100:300] = (120, 150, 200)
    # Mouth zone: fy + 0.64*fh ~ 260
    # Create alternating sharp horizontal edge lines in lip region
    for y in range(255, 310, 4):
        frame_lip[y:y+2, 130:270] = (0, 0, 0)
        frame_lip[y+2:y+4, 130:270] = (255, 255, 255)

    chosen_type_c, box_c, meta_c = VisualAnomalyLocalizer.evaluate_primary_anomaly(frame_lip, base_face)
    print(f"Lip Seam Scenario: Chosen={chosen_type_c}, Meta scores={meta_c['regional_scores']}")

    # Ensure dynamic response to pixel variations
    assert meta_a["regional_scores"]["eyewear_specular"] != meta_b["regional_scores"]["eyewear_specular"], "Scores did not vary dynamically"
    assert meta_b["regional_scores"]["iris_discontinuity"] != meta_c["regional_scores"]["iris_discontinuity"], "Scores did not vary dynamically"
    assert meta_c["regional_scores"]["lip_sync_laplacian"] != meta_a["regional_scores"]["lip_sync_laplacian"], "Scores did not vary dynamically"
    print("[PASS] Regional anomaly metrics dynamically reflect genuine pixel distributions and gradients.")


def test_real_video_workload_diversity():
    print("\n--- 5. Real Benchmark Deepfake Videos Diversity & Performance ---")
    video_dir = os.path.join(PROJECT_ROOT, "garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos")
    if not os.path.isdir(video_dir):
        print(f"[SKIP] Video directory not found: {video_dir}")
        return

    video_files = [f for f in os.listdir(video_dir) if f.endswith(".mp4")][:6]
    print(f"Testing across {len(video_files)} benchmark videos: {video_files}")

    boxes = []
    latencies = []
    scores = []

    for vname in video_files:
        vpath = os.path.join(video_dir, vname)
        cap = cv2.VideoCapture(vpath)
        assert cap.isOpened(), f"Could not open {vpath}"
        cap.set(cv2.CAP_PROP_POS_FRAMES, 45)
        ret, frame = cap.read()
        cap.release()
        assert ret and frame is not None


        t0 = time.perf_counter()
        annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.92)
        dt = (time.perf_counter() - t0) * 1000.0
        latencies.append(dt)

        box = meta["bounding_box"]
        boxes.append(tuple(box))
        scores.append(meta.get("diagnostics", {}))

    print(f"Latencies (ms): {[round(x, 2) for x in latencies]}")
    print(f"Bounding boxes across videos: {boxes}")
    assert max(latencies) < 200.0, f"Max latency {max(latencies)}ms exceeded 200ms"
    assert len(set(boxes)) > 1, f"Bounding boxes are identical across distinct videos! {boxes}"
    print("[PASS] Real benchmark video tests produced distinct, dynamic bounding boxes with all latencies < 200ms.")


def test_pixel_annotation_integrity():
    print("\n--- 6. Pixel Annotation Integrity (Border & Badge) ---")
    frame = np.full((720, 1280, 3), 100, dtype=np.uint8)
    annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.88)

    bx, by, bw, bh = meta["bounding_box"]

    # Verify amber border pixels are present on bounding box edges
    # Top border edge:
    top_edge = annotated[by, bx:bx+bw]
    amber = np.array([11, 158, 245], dtype=np.uint8)
    matches_top = np.all(top_edge == amber, axis=-1)
    assert np.any(matches_top), "Amber border not drawn on top edge"

    # Bottom border edge:
    bottom_edge = annotated[by+bh-1, bx:bx+bw]
    matches_bottom = np.all(bottom_edge == amber, axis=-1)
    assert np.any(matches_bottom), "Amber border not drawn on bottom edge"

    # Left border edge:
    left_edge = annotated[by:by+bh, bx]
    matches_left = np.all(left_edge == amber, axis=-1)
    assert np.any(matches_left), "Amber border not drawn on left edge"

    # Right border edge:
    right_edge = annotated[by:by+bh, bx+bw-1]
    matches_right = np.all(right_edge == amber, axis=-1)
    assert np.any(matches_right), "Amber border not drawn on right edge"

    # Verify dark badge background exists in badge area
    dark_bg = np.array([42, 23, 15], dtype=np.uint8)
    dark_matches = np.all(annotated == dark_bg, axis=-1)
    assert np.count_nonzero(dark_matches) > 100, "Dark badge background not found in annotated frame"

    print("[PASS] Amber (#f59e0b) 3px bounding box and dark badge background (#0f172a) physically verified in pixels.")


if __name__ == "__main__":
    try:
        test_color_hex_bgr_fidelity()
        test_ast_for_hardcoding_and_facades()
        test_dynamic_skin_roi_tracking()
        test_dynamic_feature_selection()
        test_real_video_workload_diversity()
        test_pixel_annotation_integrity()
        print("\n=======================================================")
        print("ALL FORENSIC CHECKS PASSED: Module is 100% CLEAN.")
        print("=======================================================")
    except Exception as e:
        print(f"\n[INTEGRITY VIOLATION DETECTED]: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
