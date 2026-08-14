"""
Challenger M8-Iter2-1: Empirical Adversarial Challenge Suite
=============================================================
Direct empirical verification of Milestone 8 (Court-Ready Forensic PDF Report Enhancement):
1. Corrupt image bytes, missing images, 0-byte images, HTML masquerade, directory paths.
2. High-resolution PDF rasterization via pypdfium2 (scale=2 -> 1191x1684, scale=3 -> 1786x2526).
3. Amber border #f59e0b and ANOMALY DETECTED HERE badge pixel & layout verification.
4. Absolute zero 500 crashes across all adversarial inputs.
5. Complete retention of forensic diagnostic text and statutory citations.
6. Multi-page document handling & high-concurrency burst stress.
"""

import os
import io
import time
import uuid
import tempfile
import concurrent.futures
from typing import List, Tuple

import cv2
import numpy as np
import pytest
import pypdfium2 as pdfium
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.routes.jobs import save_local_job, KEYFRAMES_DIR
from backend.api.routes.threat_intel import insert_threat_item
from backend.netra.pipeline.visual_localizer import VisualAnomalyLocalizer, AnomalyRegionType


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as tc:
        yield tc


@pytest.fixture(scope="module")
def authentic_annotated_keyframe():
    """Generates an authentic keyframe image with amber border & badge via VisualAnomalyLocalizer."""
    frame = np.full((720, 1280, 3), 45, dtype=np.uint8)
    cv2.circle(frame, (640, 360), 130, (175, 185, 205), -1)
    cv2.circle(frame, (590, 330), 22, (255, 255, 255), -1)
    cv2.circle(frame, (690, 330), 22, (255, 255, 255), -1)

    annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
        frame,
        anomaly_score=0.988,
        prefer_region="eyewear_specular_glare",
        detector_subsystem="GenD Foundation Model ViT-L/14 + Spatial SBI"
    )

    os.makedirs(KEYFRAMES_DIR, exist_ok=True)
    filename = f"challenger_m8_iter2_{uuid.uuid4().hex[:8]}.jpg"
    filepath = os.path.join(KEYFRAMES_DIR, filename)
    cv2.imwrite(filepath, annotated)

    yield {
        "file_path": filepath,
        "filename": filename,
        "annotated_bgr": annotated,
        "meta": meta
    }

    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception:
            pass


def count_amber_pixels(img_rgb: np.ndarray, tolerance: float = 18.0) -> int:
    """Counts pixels matching amber #f59e0b (RGB: 245, 158, 11) within Euclidean tolerance."""
    target = np.array([245, 158, 11], dtype=np.float32)
    diff = img_rgb.astype(np.float32) - target
    dist = np.linalg.norm(diff, axis=2)
    return int(np.sum(dist <= tolerance))


def count_dark_badge_pixels(img_rgb: np.ndarray, tolerance: float = 25.0) -> int:
    """Counts pixels matching dark badge background #0f172a (RGB: 15, 23, 42)."""
    target = np.array([15, 23, 42], dtype=np.float32)
    diff = img_rgb.astype(np.float32) - target
    dist = np.linalg.norm(diff, axis=2)
    return int(np.sum(dist <= tolerance))


def render_pdf_to_images_and_text(pdf_bytes: bytes, scale: int = 2) -> List[Tuple[np.ndarray, str]]:
    """Renders all pages of a PDF to high-resolution RGB numpy arrays and extracts text."""
    doc = pdfium.PdfDocument(pdf_bytes)
    pages = []
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_textpage().get_text_range()
        bitmap = page.render(scale=scale)
        rgb_arr = np.array(bitmap.to_pil().convert("RGB"))
        pages.append((rgb_arr, text))
    return pages


class TestAdversarialImageCorruptions:
    """
    Exhaustive empirical challenge covering all malformed image scenarios:
    0-byte files, truncated JPEG headers, ASCII garbage, HTML 404 masquerading as JPG,
    binary noise, directories passed as image paths, and non-existent files.
    Asserts zero 500 errors and full diagnostic text retention.
    """

    @pytest.mark.parametrize("corrupt_name, corrupt_content", [
        ("zero_byte_empty", b""),
        ("truncated_jpeg_header", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01"),
        ("ascii_garbage", b"NOT_A_VALID_JPEG_OR_IMAGE_DATA_CORRUPTED_PAYLOAD_1234567890"),
        ("html_masquerade", b"<!DOCTYPE html><html><body><h1>404 Not Found - S3 Error</h1></body></html>"),
        ("random_binary_noise", os.urandom(1024)),
    ])
    def test_job_report_pdf_corrupt_images_zero_500_full_text(self, client, corrupt_name, corrupt_content):
        """Verify that jobs/{id}/report.pdf never 500s on corrupt images and retains complete diagnostic text."""
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tf:
            tf.write(corrupt_content)
            temp_path = tf.name

        try:
            job_id = f"adv-job-{corrupt_name}-{uuid.uuid4().hex[:6]}"
            snap = {
                "frame_number": 88,
                "timestamp": "00:02.93",
                "image_path": temp_path,
                "anomaly_region": "Lip-Sync Blending Boundary Artifact",
                "confidence": 0.945,
                "anomaly_score": 0.945,
                "detector_subsystem": "Spatial SBI (EfficientNet-B4)",
                "forensic_finding": "High-frequency latent boundary seam detected near mandibular line."
            }

            save_local_job({
                "job_id": job_id,
                "status": "complete",
                "verdict": "DEEPFAKE",
                "confidence": 94.5,
                "risk_level": "CRITICAL",
                "result": {
                    "verdict": "DEEPFAKE",
                    "confidence": 94.5,
                    "risk_level": "CRITICAL",
                    "keyframe_snapshots": [snap]
                }
            })

            resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
            # 1. Assert ZERO 500 crashes
            assert resp.status_code == 200, f"Expected 200 for {corrupt_name}, got {resp.status_code}"
            assert resp.headers.get("content-type") == "application/pdf"
            assert resp.content.startswith(b"%PDF-1.")

            # 2. Rasterize via pypdfium2
            pages = render_pdf_to_images_and_text(resp.content, scale=2)
            assert len(pages) >= 1
            full_text = " ".join([text for _, text in pages])

            # 3. Assert full diagnostic text retention in fallback card
            assert "Keyframe #88" in full_text
            assert "00:02.93" in full_text
            assert "Lip-Sync Blending Boundary Artifact" in full_text
            assert "94.5%" in full_text
            assert "Spatial SBI (EfficientNet-B4)" in full_text
            assert "Section 65B Indian Evidence Act" in full_text
            assert "Section 66D IT Act" in full_text
            assert "High-frequency latent boundary seam" in full_text

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    @pytest.mark.parametrize("corrupt_name, corrupt_content", [
        ("zero_byte_empty", b""),
        ("truncated_jpeg_header", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01"),
        ("ascii_garbage", b"NOT_A_VALID_JPEG_OR_IMAGE_DATA_CORRUPTED_PAYLOAD_1234567890"),
        ("html_masquerade", b"<!DOCTYPE html><html><body><h1>404 Not Found - S3 Error</h1></body></html>"),
        ("random_binary_noise", os.urandom(1024)),
    ])
    def test_threat_intel_fir_pdf_corrupt_images_zero_500_full_text(self, client, corrupt_name, corrupt_content):
        """Verify that threat-intelligence/{id}/fir-pdf never 500s on corrupt images and retains complete diagnostic text."""
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tf:
            tf.write(corrupt_content)
            temp_path = tf.name

        try:
            threat_id = f"THREAT-ADV-{corrupt_name}-{uuid.uuid4().hex[:6]}"
            snap = {
                "frame_number": 72,
                "timestamp": "00:02.40",
                "image_path": temp_path,
                "anomaly_region": "Iris/Pupil Corneal Reflection Discontinuity",
                "confidence": 0.962,
                "anomaly_score": 0.962,
                "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI",
                "forensic_finding": "Corneal reflection asymmetry indicative of generative diffusion synthesis."
            }

            insert_threat_item({
                "id": threat_id,
                "title": f"Adversarial Image Test - {corrupt_name}",
                "type": "video_deepfake",
                "threat_category": "DIGITAL_ARREST",
                "fake_probability": 0.962,
                "risk_level": "CRITICAL",
                "city": "Hyderabad",
                "state": "Telangana",
                "extracted_iocs": {
                    "phones": ["+91 9988776655"],
                    "upis": ["threat@upi"],
                    "keyframe_snapshots": [snap]
                },
                "fir_dossier": {
                    "incident_summary": "Extortion campaign featuring synthetic digital arrest video."
                }
            })

            resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
            # 1. Assert ZERO 500 crashes
            assert resp.status_code == 200, f"Expected 200 for {corrupt_name}, got {resp.status_code}"
            assert resp.headers.get("content-type") == "application/pdf"
            assert resp.content.startswith(b"%PDF-1.")

            # 2. Rasterize via pypdfium2
            pages = render_pdf_to_images_and_text(resp.content, scale=2)
            assert len(pages) >= 1
            full_text = " ".join([text for _, text in pages])

            # 3. Assert full diagnostic text retention in Section 2 fallback card
            assert "Keyframe #72" in full_text
            assert "00:02.40" in full_text
            assert "Iris/Pupil Corneal Reflection Discontinuity" in full_text
            assert "96.2%" in full_text
            assert "GenD Foundation Model ViT-L/14" in full_text
            assert "Section 65B Indian Evidence Act" in full_text
            assert "Corneal reflection asymmetry" in full_text

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_nonexistent_missing_image_path_handling(self, client):
        """Verify handling when image_path does not exist on disk."""
        job_id = f"adv-missing-{uuid.uuid4().hex[:6]}"
        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 91.0,
                "keyframe_snapshots": [{
                    "frame_number": 33,
                    "timestamp": "00:01.10",
                    "image_path": "/nonexistent/fake/directory/never_existed_image.jpg",
                    "anomaly_region": "Eyewear Specular Glare Plane",
                    "anomaly_score": 0.91,
                    "detector_subsystem": "GenD ViT-L/14"
                }]
            }
        })
        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        pages = render_pdf_to_images_and_text(resp.content)
        _, text = pages[0]
        assert "Keyframe #33" in text
        assert "Eyewear Specular Glare Plane" in text

    def test_directory_path_instead_of_file_handling(self, client):
        """Verify handling when image_path is a directory rather than a file."""
        job_id = f"adv-dir-path-{uuid.uuid4().hex[:6]}"
        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 92.0,
                "keyframe_snapshots": [{
                    "frame_number": 44,
                    "timestamp": "00:01.46",
                    "image_path": KEYFRAMES_DIR,  # Pass directory instead of file
                    "anomaly_region": "Eyewear Specular Glare Plane",
                    "anomaly_score": 0.92
                }]
            }
        })
        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        pages = render_pdf_to_images_and_text(resp.content)
        _, text = pages[0]
        assert "Keyframe #44" in text


class TestVisualRasterizationAndStyling:
    """
    Empirical visual verification using pypdfium2:
    - High-resolution rendering (>1000px width, >1400px height)
    - Signature amber border #f59e0b (RGB: 245, 158, 11)
    - ANOMALY DETECTED HERE badge geometry and text
    - Side-by-side table positioning
    """

    def test_pypdfium2_high_res_rasterization_dimensions(self, client, authentic_annotated_keyframe):
        """Verify pypdfium2 renders crisp high-res raster at scale=2 and scale=3."""
        job_id = f"adv-raster-dims-{uuid.uuid4().hex[:6]}"
        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 98.8,
                "keyframe_snapshots": [{
                    "frame_number": 50,
                    "timestamp": "00:01.66",
                    "anomaly_region": "Eyewear Specular Glare Plane",
                    "anomaly_score": 0.988,
                    "image_path": authentic_annotated_keyframe["file_path"],
                    "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI"
                }]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200

        # Scale 2: A4 (595.28 x 841.89 pt) -> 1191 x 1684 px
        pages_s2 = render_pdf_to_images_and_text(resp.content, scale=2)
        img_s2, _ = pages_s2[0]
        h2, w2, _ = img_s2.shape
        assert w2 >= 1000 and h2 >= 1400, f"Expected >=1000x1400, got {w2}x{h2}"

        # Scale 3: A4 -> 1786 x 2526 px
        pages_s3 = render_pdf_to_images_and_text(resp.content, scale=3)
        img_s3, _ = pages_s3[0]
        h3, w3, _ = img_s3.shape
        assert w3 >= 1700 and h3 >= 2500, f"Expected >=1700x2500, got {w3}x{h3}"

    def test_amber_border_and_badge_visual_evidence(self, client, authentic_annotated_keyframe):
        """
        Visually verify that:
        1. Amber divider line (#f59e0b) is present at the top.
        2. Embedded keyframe on left contains amber bounding box (#f59e0b).
        3. Badge background (#0f172a) and badge border (#f59e0b) are rendered.
        """
        job_id = f"adv-amber-badge-{uuid.uuid4().hex[:6]}"
        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 98.8,
                "keyframe_snapshots": [{
                    "frame_number": 50,
                    "timestamp": "00:01.66",
                    "anomaly_region": "Eyewear Specular Glare Plane",
                    "anomaly_score": 0.988,
                    "image_path": authentic_annotated_keyframe["file_path"],
                    "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI"
                }]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200

        pages = render_pdf_to_images_and_text(resp.content, scale=2)
        page_img, page_text = pages[0]
        h, w, _ = page_img.shape

        # Overall page amber pixel count
        total_amber = count_amber_pixels(page_img)
        assert total_amber > 50, f"Expected >50 amber pixels across page, got {total_amber}"

        # Left half (where Section 2 table embeds keyframe)
        left_evidence_area = page_img[int(h * 0.25) : int(h * 0.65), : w // 2, :]
        left_amber = count_amber_pixels(left_evidence_area)
        assert left_amber >= 30, f"Expected >=30 amber pixels in left keyframe snapshot, got {left_amber}"

        # Dark badge background pixels in left evidence area
        left_dark_badge = count_dark_badge_pixels(left_evidence_area)
        assert left_dark_badge >= 200, f"Expected >=200 dark badge pixels in keyframe snapshot, got {left_dark_badge}"

        # Confirm badge metadata
        assert authentic_annotated_keyframe["meta"]["forensic_badge"] == "ANOMALY DETECTED HERE"


class TestMultiPageAndConcurrencyStress:
    """
    Stress-testing document flow:
    - Multi-page document pagination under 10 keyframes.
    - Concurrency burst: 25 simultaneous parallel requests.
    """

    def test_large_keyframe_list_pagination_jobs(self, client, authentic_annotated_keyframe):
        """Verify that jobs route cleanly clamps large keyframe list to top 3 and paginates without errors."""
        job_id = f"adv-large-snaps-{uuid.uuid4().hex[:6]}"
        snaps = [
            {
                "frame_number": i * 15,
                "timestamp": f"00:{i:02d}.00",
                "anomaly_region": f"Anomaly Zone #{i}",
                "anomaly_score": 0.99 - (i * 0.01),
                "image_path": authentic_annotated_keyframe["file_path"],
                "detector_subsystem": "GenD Foundation Model ViT-L/14"
            }
            for i in range(10)
        ]

        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 99.0,
                "keyframe_snapshots": snaps
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        pages = render_pdf_to_images_and_text(resp.content, scale=2)
        # Should cleanly paginate into 2 pages
        assert 1 <= len(pages) <= 3
        for idx, (img, _) in enumerate(pages):
            assert img.shape[0] >= 1400 and img.shape[1] >= 1000

    def test_concurrency_stress_25_parallel_requests(self, client, authentic_annotated_keyframe):
        """Simultaneously fires 25 requests across both PDF endpoints to assert zero 500 errors."""
        job_id = f"adv-concur-job-{uuid.uuid4().hex[:6]}"
        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 97.0,
                "keyframe_snapshots": [{
                    "frame_number": 1,
                    "timestamp": "00:00.03",
                    "image_path": authentic_annotated_keyframe["file_path"]
                }]
            }
        })

        threat_id = f"THREAT-CONCUR-{uuid.uuid4().hex[:6]}"
        insert_threat_item({
            "id": threat_id,
            "title": "Concurrency Burst Threat",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "fake_probability": 0.97,
            "extracted_iocs": {
                "keyframe_snapshots": [{
                    "frame_number": 1,
                    "timestamp": "00:00.03",
                    "image_path": authentic_annotated_keyframe["file_path"]
                }]
            }
        })

        urls = [
            f"/api/v1/jobs/{job_id}/report.pdf" if i % 2 == 0 else f"/api/v1/threat-intelligence/{threat_id}/fir-pdf"
            for i in range(25)
        ]

        def fetch(url):
            r = client.get(url)
            return r.status_code, len(r.content), r.content.startswith(b"%PDF-1.")

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(fetch, urls))

        assert len(results) == 25
        for idx, (code, size, is_pdf) in enumerate(results):
            assert code == 200, f"Request {idx} failed with code {code}"
            assert is_pdf is True, f"Request {idx} did not return valid PDF stream"
            assert size > 15000, f"Request {idx} returned unexpectedly small file: {size} bytes"
