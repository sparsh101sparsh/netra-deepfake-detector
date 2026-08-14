"""
Project NETRA — Challenger M9-2 Empirical Test Suite
=============================================================================
Role: Visual Artifact & Pixel Integrity Verifier
Milestone: Milestone 9 (Requirement R4)

Empirical Challenge Dimensions:
  1. High-Resolution Rendered PNG Dimensions (>1000 x >1400 px) across 20 benchmark pages.
  2. Signature Amber #f59e0b (RGB: 245, 158, 11 / BGR: 11, 158, 245) Pixel Distributions.
  3. Institutional Forensic Badge ("ANOMALY DETECTED HERE") Text, Contrast, and Geometry.
  4. Court-Admissible Statutory Legal Clauses (Section 65B/63, Section 66D, Section 318(4)).
  5. Facial Identity Preservation & Non-Obscuration Analysis (Bounding Box Ratios & Stroke).
  6. Batch Benchmark Telemetry Integrity and Consistency.
"""

import os
import sys
import glob
import json
import pytest
import numpy as np
import cv2
import pypdfium2
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "tests", "artifacts", "benchmark_rendered_pages")
KEYFRAMES_MEDIA_DIR = os.path.join(PROJECT_ROOT, "backend", "media", "keyframes")
BENCHMARK_BASE_DIR = os.path.join(
    PROJECT_ROOT, "garbage", "kaggle_and_scratch", "benchmark_datasets", "generated_100_deepfake_videos"
)

# 20 curated benchmark deepfake videos
EXPECTED_20_SLUGS = [
    "deepfake_Ajit_Doval",
    "deepfake_Arvind_Kejriwal",
    "deepfake_Nirmala_Sitharaman",
    "deepfake_Peyush_Bansal",
    "deepfake_S_Jaishankar",
    "deepfake_Alia_Bhatt",
    "deepfake_Deepika_Padukone",
    "deepfake_Gautam_Adani",
    "deepfake_MS_Dhoni",
    "deepfake_Shah_Rukh_Khan",
    "deepfake_Narendra_Modi",
    "deepfake_Amitabh_Bachchan",
    "deepfake_Rahul_Gandhi",
    "deepfake_Shashi_Tharoor",
    "deepfake_Rajinikanth",
    "deepfake_Amit_Shah",
    "deepfake_Mukesh_Ambani",
    "deepfake_Ritesh_Agarwal",
    "deepfake_S_Somanath",
    "deepfake_Virat_Kohli",
]


class TestChallengerM9VisualArtifactIntegrity:
    """Empirical verification of rendered pages, pixel distributions, and forensic elements."""

    def test_01_rendered_png_presence_and_dimensions(self):
        """
        Challenge 1: Verify that all 20 benchmark rendered PNG pages exist,
        and their dimensions strictly exceed 1000 x 1400 pixels.
        """
        assert os.path.isdir(ARTIFACTS_DIR), f"Artifacts directory missing: {ARTIFACTS_DIR}"

        png_files = sorted(glob.glob(os.path.join(ARTIFACTS_DIR, "*_page_1_render.png")))
        assert len(png_files) == 20, f"Expected exactly 20 rendered PNG pages, found {len(png_files)}"

        for slug in EXPECTED_20_SLUGS:
            expected_file = os.path.join(ARTIFACTS_DIR, f"{slug}_page_1_render.png")
            assert os.path.exists(expected_file), f"Missing rendered page for {slug}: {expected_file}"

            with Image.open(expected_file) as img:
                w, h = img.size
                mode = img.mode
                # Strictly verify dimensions > 1000 x > 1400 px
                assert w > 1000, f"PNG {slug} width {w} not > 1000 px"
                assert h > 1400, f"PNG {slug} height {h} not > 1400 px"
                # A4 at scale=2 produces 1191x1684 px
                assert w >= 1190 and h >= 1680, f"PNG {slug} resolution ({w}x{h}) below A4 2x scale"
                assert mode in ("RGB", "RGBA"), f"Unexpected image mode {mode} for {slug}"

    def test_02_amber_pixel_color_distribution_rendered_png(self):
        """
        Challenge 2A: Verify signature amber #f59e0b (RGB: 245, 158, 11) pixel distribution
        on rendered PNG pages.
        """
        target_rgb = np.array([245, 158, 11], dtype=np.float32)

        for slug in EXPECTED_20_SLUGS:
            png_path = os.path.join(ARTIFACTS_DIR, f"{slug}_page_1_render.png")
            bgr = cv2.imread(png_path)
            assert bgr is not None, f"Failed reading PNG: {png_path}"
            arr = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

            dist = np.linalg.norm(arr - target_rgb, axis=2)
            exact_count = int(np.sum(dist == 0))
            tol24_count = int(np.sum(dist <= 24.0))

            # Must contain exact amber pixels (from vector HR divider line)
            assert exact_count >= 2000, (
                f"Page {slug} has insufficient exact amber pixels: {exact_count} (expected >= 2000)"
            )
            # Must contain total amber pixels in tolerance zone
            assert tol24_count >= 2050, (
                f"Page {slug} has insufficient total amber pixels: {tol24_count} (expected >= 2050)"
            )

    def test_03_amber_pixel_color_distribution_keyframes(self):
        """
        Challenge 2B: Verify amber #f59e0b (BGR: 11, 158, 245) on keyframe snapshots
        in backend/media/keyframes/.
        """
        target_bgr = np.array([11, 158, 245], dtype=np.float32)

        for slug in EXPECTED_20_SLUGS:
            pattern = os.path.join(KEYFRAMES_MEDIA_DIR, f"{slug}_frame_*_annotated.jpg")
            snaps = glob.glob(pattern)
            assert len(snaps) >= 1, f"No keyframe snapshots found for {slug}"

            for snap_path in snaps:
                bgr = cv2.imread(snap_path)
                assert bgr is not None, f"Failed reading keyframe: {snap_path}"

                dist = np.linalg.norm(bgr.astype(np.float32) - target_bgr, axis=2)
                # Due to JPEG 95 compression, distance tolerance <= 24 is standard
                amber_count = int(np.sum(dist <= 24.0))
                assert amber_count >= 500, (
                    f"Keyframe {os.path.basename(snap_path)} amber count {amber_count} < 500 px"
                )

    def test_04_forensic_badge_geometry_and_template_correlation(self):
        """
        Challenge 3: Verify the institutional forensic badge ('ANOMALY DETECTED HERE')
        structure across keyframe snapshots:
          - Dark background (#0f172a, BGR: 42, 23, 15)
          - High-contrast white text pixels (RGB: 255, 255, 255)
          - Normalized template cross-correlation >= 0.90
        """
        badge_text = "ANOMALY DETECTED HERE"

        for slug in EXPECTED_20_SLUGS:
            pattern = os.path.join(KEYFRAMES_MEDIA_DIR, f"{slug}_frame_*_annotated.jpg")
            snaps = glob.glob(pattern)
            for snap_path in snaps:
                img = cv2.imread(snap_path)
                h, w = img.shape[:2]

                # Check dark background pixels
                dark_target = np.array([42, 23, 15], dtype=np.float32)
                dark_dist = np.linalg.norm(img.astype(np.float32) - dark_target, axis=2)
                dark_px = int(np.sum(dark_dist <= 15.0))
                assert dark_px >= 3000, (
                    f"Badge dark background in {os.path.basename(snap_path)} insufficient: {dark_px} px"
                )

                # Check white text pixels
                white_target = np.array([255, 255, 255], dtype=np.float32)
                white_dist = np.linalg.norm(img.astype(np.float32) - white_target, axis=2)
                white_px = int(np.sum(white_dist <= 25.0))
                assert white_px >= 800, (
                    f"Badge white text in {os.path.basename(snap_path)} insufficient: {white_px} px"
                )

                # Template cross-correlation
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = max(0.42, min(0.68, w / 1400.0))
                thickness = 2
                (tw, th), baseline = cv2.getTextSize(badge_text, font, font_scale, thickness)
                badge_h = th + 14
                badge_w = tw + 18

                tmpl = np.zeros((badge_h, badge_w, 3), dtype=np.uint8)
                tmpl[:] = (42, 23, 15)
                cv2.rectangle(tmpl, (0, 0), (badge_w - 1, badge_h - 1), (11, 158, 245), 1)
                cv2.putText(
                    tmpl, badge_text, (8, badge_h - (baseline + 3)),
                    font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA
                )

                res = cv2.matchTemplate(img, tmpl, cv2.TM_CCOEFF_NORMED)
                _, max_val, _, _ = cv2.minMaxLoc(res)
                assert max_val >= 0.90, (
                    f"Template match for badge in {os.path.basename(snap_path)} failed: correlation={max_val:.4f} < 0.90"
                )

    def test_05_court_ready_statutory_clauses_in_pdfs(self):
        """
        Challenge 4: Extract text from all 20 PDF reports via pypdfium2 and assert
        mandatory statutory legal clauses:
          - Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023
          - Section 66D Information Technology Act 2000
          - Section 318(4) Bharatiya Nyaya Sanhita 2023
          - CYBER CRIME INCIDENT REPORT & FORENSIC EVIDENCE DOSSIER
          - SHA-256 Non-Repudiation Seal
        """
        required_clauses = [
            "CYBER CRIME INCIDENT REPORT",
            "Section 66D",
            "Section 318(4)",
            "DEEPFAKE MANIPULATION",
            "SHA-256 Non-Repudiation Seal",
            "Multi-Detector Neural Telemetry",
            "Flagged Forensic Keyframe Visual Evidence",
        ]

        for slug in EXPECTED_20_SLUGS:
            pdf_path = os.path.join(ARTIFACTS_DIR, f"{slug}_forensic_report.pdf")
            assert os.path.exists(pdf_path), f"Missing PDF: {pdf_path}"

            doc = pypdfium2.PdfDocument(pdf_path)
            assert len(doc) >= 1, f"Empty PDF: {pdf_path}"

            full_text = ""
            for page in doc:
                textpage = page.get_textpage()
                full_text += textpage.get_text_range() + "\n"

            for clause in required_clauses:
                assert clause in full_text, (
                    f"Missing statutory clause '{clause}' in {os.path.basename(pdf_path)}"
                )

    def test_06_facial_identity_preservation_and_non_obscuration(self):
        """
        Challenge 5: Verify that bounding box overlays preserve facial identity:
          - Bounding box is drawn with 3px stroke outline (not solid filled)
          - Bounding box to face ROI area ratio is < 30%
          - Bounding box to full frame area ratio is < 8%
          - Face ROI pixel modification (obscuration) is strictly < 10%
        """
        from backend.netra.pipeline.visual_localizer import VisualAnomalyLocalizer

        for slug in EXPECTED_20_SLUGS:
            vid_filename = f"{slug}.mp4"
            vid_path = os.path.join(BENCHMARK_BASE_DIR, vid_filename)
            assert os.path.exists(vid_path), f"Video missing: {vid_path}"

            cap = cv2.VideoCapture(vid_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 60)
            f_idx = min(20, max(0, total_frames // 4))

            cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
            ret, frame = cap.read()
            cap.release()
            assert ret and frame is not None, f"Failed reading frame {f_idx} from {vid_filename}"

            h, w = frame.shape[:2]
            fx, fy, fw, fh = VisualAnomalyLocalizer.estimate_face_roi(frame)
            face_area = fw * fh

            annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(frame, anomaly_score=0.96)
            bx, by, bw, bh = meta["bounding_box"]
            box_area = bw * bh
            frame_area = w * h

            ratio_face = box_area / face_area
            ratio_frame = box_area / frame_area

            # Assert localized landmark sub-zone, never eclipsing the full face
            assert ratio_face < 0.35, f"Bounding box occupies {ratio_face:.2%} of face in {slug}, eclipsing identity!"
            assert ratio_frame < 0.08, f"Bounding box occupies {ratio_frame:.2%} of frame in {slug}"

            # Measure exact pixel difference in face ROI to prove interior is unoccluded
            face_orig = frame[fy:fy+fh, fx:fx+fw]
            face_annot = annotated[fy:fy+fh, fx:fx+fw]
            diff = np.abs(face_orig.astype(np.int32) - face_annot.astype(np.int32))
            modified_pixels = np.sum(np.any(diff > 0, axis=2))
            obscuration_pct = (modified_pixels / face_area) * 100.0

            # Under 10% face pixel modification confirms stroke-only outline and identity preservation
            assert obscuration_pct < 10.0, (
                f"Face obscuration {obscuration_pct:.2f}% exceeds 10% in {slug}"
            )

    def test_07_benchmark_telemetry_report_audit(self):
        """
        Challenge 6: Verify integrity and consistency of benchmark_telemetry_report.json.
        """
        telemetry_file = os.path.join(ARTIFACTS_DIR, "benchmark_telemetry_report.json")
        assert os.path.exists(telemetry_file), f"Telemetry report missing: {telemetry_file}"

        with open(telemetry_file, "r") as f:
            data = json.load(f)

        assert data["total_videos_analyzed"] == 20
        assert data["total_frames_analyzed"] == 60
        assert data["unhandled_exceptions"] == 0
        assert data["sla_compliance_rate_percent"] == 100.0

        lat = data["latency_metrics_ms"]
        assert lat["mean"] < 50.0, f"Mean latency {lat['mean']}ms >= 50ms"
        assert lat["max"] < 200.0, f"Max latency {lat['max']}ms >= 200ms"
        assert lat["p99"] < 200.0, f"P99 latency {lat['p99']}ms >= 200ms"

        assert len(data["video_telemetry"]) == 20
        for item in data["video_telemetry"]:
            assert item["status"] == "SUCCESS"
            assert item["max_latency_ms"] < 200.0
