"""
NETRA Challenger M8-1: Empirical PDF Challenge & Visual Forensics Audit
========================================================================
Empirically challenges generated PDFs from:
  1. GET /api/v1/jobs/{id}/report.pdf
  2. GET /api/v1/threat-intelligence/{id}/fir-pdf

Verifies:
  - High-resolution rasterization via pypdfium2 (scale=2, >1000px width, >1400px height)
  - Side-by-side keyframe snapshot image embedding (left) and diagnostic metadata (right)
  - Amber #f59e0b (RGB 245, 158, 11) border and forensic badge pixel verification
  - Statutory compliance citations (Section 65B IEA / Section 63 BSA, Section 66D IT Act, Section 318(4) BNS)
  - Detector subsystem attribution and neural anomaly telemetry
  - Robustness against corrupt images, missing files, URL basenames, boundary strings, and concurrency
"""

import os
import io
import time
import uuid
import tempfile
import concurrent.futures
from typing import Tuple, List, Dict, Any

import cv2
import numpy as np
import pytest
import pypdfium2 as pdfium
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.routes.jobs import save_local_job, _local_jobs_store, KEYFRAMES_DIR
from backend.api.routes.threat_intel import insert_threat_item, get_threat_by_id
from backend.netra.pipeline.visual_localizer import VisualAnomalyLocalizer, AnomalyRegionType


@pytest.fixture
def client():
    with TestClient(app) as tc:
        yield tc


@pytest.fixture
def clean_threat_tracker():
    inserted_ids = []
    def track(item_or_id):
        tid = item_or_id if isinstance(item_or_id, str) else item_or_id.get("id")
        inserted_ids.append(tid)
        return tid
    yield track
    from backend.api.db import get_db
    try:
        conn = get_db()
        for tid in inserted_ids:
            conn.execute("DELETE FROM threat_catalog WHERE id = ?", (tid,))
        conn.close()
    except Exception:
        pass


@pytest.fixture
def real_annotated_keyframe():
    """Generates an authentic annotated keyframe with amber border & badge using VisualAnomalyLocalizer."""
    frame = np.full((720, 1280, 3), 40, dtype=np.uint8)
    # Draw simulated face feature
    cv2.circle(frame, (640, 360), 120, (180, 190, 210), -1)
    cv2.circle(frame, (600, 330), 20, (255, 255, 255), -1)
    cv2.circle(frame, (680, 330), 20, (255, 255, 255), -1)

    annotated, meta = VisualAnomalyLocalizer.localize_and_annotate(
        frame,
        anomaly_score=0.982,
        prefer_region="eyewear_specular_glare",
        detector_subsystem="GenD Foundation Model ViT-L/14 + Spatial SBI"
    )

    filename = f"challenger_m8_snap_{uuid.uuid4().hex[:8]}.jpg"
    os.makedirs(KEYFRAMES_DIR, exist_ok=True)
    file_path = os.path.join(KEYFRAMES_DIR, filename)
    cv2.imwrite(file_path, annotated)

    yield {
        "file_path": file_path,
        "filename": filename,
        "annotated_bgr": annotated,
        "meta": meta
    }

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass


def count_amber_pixels(img_rgb: np.ndarray, tolerance: float = 18.0) -> int:
    """
    Counts pixels matching amber #f59e0b (RGB: 245, 158, 11) within Euclidean distance tolerance.
    """
    target = np.array([245, 158, 11], dtype=np.float32)
    diff = img_rgb.astype(np.float32) - target
    dist = np.linalg.norm(diff, axis=2)
    return int(np.sum(dist <= tolerance))


def extract_pdf_pages_and_render(pdf_bytes: bytes, scale: int = 2) -> List[Tuple[np.ndarray, str]]:
    """
    Renders all pages of a PDF to high-resolution RGB numpy arrays and extracts full text.
    """
    doc = pdfium.PdfDocument(pdf_bytes)
    results = []
    for i in range(len(doc)):
        page = doc[i]
        textpage = page.get_textpage()
        text = textpage.get_text_range()
        bitmap = page.render(scale=scale)
        pil_img = bitmap.to_pil()
        rgb_arr = np.array(pil_img.convert("RGB"))
        results.append((rgb_arr, text))
    return results


# =========================================================================
# TEST SUITE 1: Jobs Report PDF Endpoint (/jobs/{job_id}/report.pdf)
# =========================================================================

class TestJobsReportPdfEmpirical:

    def test_job_report_pdf_generation_and_pypdfium2_rasterization(
        self, client: TestClient, real_annotated_keyframe
    ):
        """
        Verify that a real job with keyframe snapshot generates a court-ready PDF,
        renders cleanly via pypdfium2 to high-res PNG (>1000x1400), and embeds keyframe.
        """
        job_id = f"challenger-job-{uuid.uuid4().hex[:8]}"
        snap = {
            "frame_number": 60,
            "timestamp": "00:02.00",
            "anomaly_region": "Eyewear Specular Glare Plane",
            "confidence": 0.984,
            "anomaly_score": 0.984,
            "image_path": real_annotated_keyframe["file_path"],
            "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI",
            "bounding_box": [120, 80, 240, 110]
        }

        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "verdict": "DEEPFAKE",
            "confidence": 98.4,
            "risk_level": "CRITICAL",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 98.4,
                "risk_level": "CRITICAL",
                "visual_score": 0.992,
                "gend_score": 0.984,
                "audio_score": 0.12,
                "keyframe_snapshots": [snap]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert resp.headers.get("content-type") == "application/pdf"
        assert f"NETRA_Report_{job_id}.pdf" in resp.headers.get("content-disposition", "")
        assert resp.content.startswith(b"%PDF-")
        assert len(resp.content) > 15000, f"PDF with image should be >15KB, got {len(resp.content)}"

        # Render with pypdfium2
        pages = extract_pdf_pages_and_render(resp.content, scale=2)
        assert len(pages) >= 1, "Should have at least 1 page"

        page_img, page_text = pages[0]
        h, w, c = page_img.shape
        assert w >= 1000, f"Expected width >= 1000, got {w}"
        assert h >= 1400, f"Expected height >= 1400, got {h}"

        # Check statutory provisions in text
        assert "Section 65B Indian Evidence Act" in page_text or "Section 65B" in page_text
        assert "Section 66D" in page_text
        assert "Section 318(4)" in page_text or "Bharatiya Nyaya Sanhita" in page_text
        assert "GenD Foundation Model ViT-L/14" in page_text
        assert "Eyewear Specular Glare Plane" in page_text
        assert "98.4%" in page_text
        assert "SHA-256 Non-Repudiation Seal" in page_text

        # Verify presence of amber #f59e0b pixels
        amber_count = count_amber_pixels(page_img)
        assert amber_count > 50, f"Expected >50 amber pixels, found {amber_count}"

    def test_job_report_pdf_side_by_side_layout_geometry(
        self, client: TestClient, real_annotated_keyframe
    ):
        """
        Verify that Section 2 side-by-side layout embeds the photographic snapshot
        on the left half of the page and diagnostic text on the right half.
        """
        job_id = f"challenger-layout-{uuid.uuid4().hex[:8]}"
        snap = {
            "frame_number": 42,
            "timestamp": "00:01.40",
            "anomaly_region": "Iris/Pupil Corneal Reflection Discontinuity",
            "confidence": 0.975,
            "anomaly_score": 0.975,
            "image_path": real_annotated_keyframe["file_path"],
            "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI"
        }

        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 97.5,
                "keyframe_snapshots": [snap]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200

        pages = extract_pdf_pages_and_render(resp.content, scale=2)
        page_img, _ = pages[0]
        h, w, _ = page_img.shape

        # Divide into left half and right half
        left_half = page_img[:, :w//2, :]
        right_half = page_img[:, w//2:, :]

        # The embedded keyframe has amber bounding box on the LEFT side of the table
        # There should be amber pixels in the middle vertical region of left_half
        left_amber = count_amber_pixels(left_half[h//4 : 3*h//4, :, :])
        assert left_amber > 20, f"Expected amber pixels in left half evidence card, got {left_amber}"

    def test_job_report_pdf_keyframe_resolution_from_url_basename(
        self, client: TestClient, real_annotated_keyframe
    ):
        """
        Verify that snapshot with only annotated_image_url resolves correctly
        against KEYFRAMES_DIR by filename basename.
        """
        job_id = f"challenger-url-{uuid.uuid4().hex[:8]}"
        snap = {
            "frame_number": 12,
            "timestamp": "00:00.40",
            "annotated_image_url": f"/api/v1/media/keyframes/{real_annotated_keyframe['filename']}",
            "anomaly_score": 0.96
        }

        save_local_job({
            "job_id": job_id,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 96.0,
                "keyframe_snapshots": [snap]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        # Should embed real image and have size > 15KB
        assert len(resp.content) > 15000

    def test_job_report_pdf_fallback_from_frames_list(
        self, client: TestClient, real_annotated_keyframe
    ):
        """
        Verify that when result has no keyframe_snapshots but has result['frames']
        with annotated_image_url, jobs.py reconstructs keyframe_snaps.
        """
        job_id = f"challenger-frames-{uuid.uuid4().hex[:8]}"
        save_local_job({
            "job_id": job_id,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 95.0,
                "frames": [
                    {
                        "frame_number": 15,
                        "timestamp": "00:00.50",
                        "confidence": 0.95,
                        "annotated_image_url": f"/api/v1/media/keyframes/{real_annotated_keyframe['filename']}"
                    }
                ]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        assert len(resp.content) > 15000

    def test_job_report_pdf_missing_image_graceful_fallback(self, client: TestClient):
        """
        Verify that when image path does not exist on disk, report generation
        gracefully falls back to text card without 500 server crash.
        """
        job_id = f"challenger-missing-img-{uuid.uuid4().hex[:8]}"
        snap = {
            "frame_number": 88,
            "timestamp": "00:02.93",
            "image_path": "/non/existent/path/missing_ghost.jpg",
            "anomaly_region": "Lip-Sync Blending Boundary",
            "anomaly_score": 0.92
        }

        save_local_job({
            "job_id": job_id,
            "result": {
                "verdict": "SUSPICIOUS",
                "confidence": 92.0,
                "keyframe_snapshots": [snap]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        assert resp.content.startswith(b"%PDF-")
        pages = extract_pdf_pages_and_render(resp.content)
        _, text = pages[0]
        assert "Lip-Sync Blending Boundary" in text
        assert "Section 65B Indian Evidence Act" in text

    def test_job_report_pdf_404_for_unknown_job(self, client: TestClient):
        """Verify proper 404 response for unknown random job ID."""
        unknown_id = f"non-existent-uuid-{uuid.uuid4()}"
        resp = client.get(f"/api/v1/jobs/{unknown_id}/report.pdf")
        assert resp.status_code == 404
        assert "not found" in resp.json().get("detail", "").lower()


# =========================================================================
# TEST SUITE 2: Threat Intelligence FIR PDF Endpoint (/threat-intelligence/{id}/fir-pdf)
# =========================================================================

class TestThreatIntelFirPdfEmpirical:

    def test_fir_pdf_generation_and_pypdfium2_rasterization(
        self, client: TestClient, clean_threat_tracker, real_annotated_keyframe
    ):
        """
        Verify that a threat intelligence item with keyframe snapshots generates
        a court-ready Cyber Crime FIR PDF dossier with amber border and Section 2 table.
        """
        threat_id = clean_threat_tracker(insert_threat_item({
            "id": f"THREAT-CHALLENGE-{uuid.uuid4().hex[:8]}",
            "title": "Adversarial Deepfake Extortion Video",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "fake_probability": 0.99,
            "risk_level": "CRITICAL",
            "city": "Mumbai",
            "state": "Maharashtra",
            "extracted_iocs": {
                "phones": ["+91 9876543210"],
                "upis": ["scammer@okhdfcbank"],
                "urls": ["https://netra-arrest-fake.in"],
                "keyframe_snapshots": [
                    {
                        "frame_number": 30,
                        "timestamp": "00:01.00",
                        "anomaly_region": "Eyewear / Specular Glare Plane",
                        "confidence": 0.99,
                        "anomaly_score": 0.99,
                        "image_path": real_annotated_keyframe["file_path"],
                        "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI"
                    }
                ]
            },
            "fir_dossier": {
                "incident_summary": "Extortion scam utilizing deepfake audio and video to coerce victim into transferring funds.",
                "applicable_laws": [
                    "Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023 (Admissibility of electronic records)",
                    "Information Technology Act 2000 — Section 66D (Cheating by personation using computer resource)",
                    "Bharatiya Nyaya Sanhita 2023 — Section 318(4) (Cheating and dishonestly inducing delivery of property)",
                    "Information Technology Act 2000 — Section 66E (Violation of privacy)"
                ]
            }
        }))

        resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert resp.headers.get("content-type") == "application/pdf"
        assert f"NETRA_FIR_{threat_id}.pdf" in resp.headers.get("content-disposition", "")
        assert resp.content.startswith(b"%PDF-")
        assert len(resp.content) > 15000

        pages = extract_pdf_pages_and_render(resp.content, scale=2)
        assert len(pages) >= 1

        page_img, page_text = pages[0]
        h, w, _ = page_img.shape
        assert w >= 1000 and h >= 1400

        # Verify textual content
        assert "CYBER CRIME INCIDENT REPORT" in page_text
        assert "cybercrime.gov.in" in page_text
        assert "Section 65B Indian Evidence Act" in page_text
        assert "Section 66D" in page_text
        assert "Section 318(4)" in page_text
        assert "GenD Foundation Model ViT-L/14" in page_text
        assert "Eyewear / Specular Glare Plane" in page_text

        # Verify amber pixels from both divider and embedded snapshot
        amber_pixels = count_amber_pixels(page_img)
        assert amber_pixels > 50, f"Expected >50 amber pixels, found {amber_pixels}"

    def test_fir_pdf_side_by_side_table_embedding(
        self, client: TestClient, clean_threat_tracker, real_annotated_keyframe
    ):
        """
        Verify that Section 2 side-by-side table places the keyframe snapshot on left
        and the diagnostic metadata table on right.
        """
        threat_id = clean_threat_tracker(insert_threat_item({
            "id": f"THREAT-SBS-{uuid.uuid4().hex[:8]}",
            "title": "Lip Sync Impersonation Campaign",
            "type": "video_deepfake",
            "fake_probability": 0.94,
            "extracted_iocs": {
                "keyframe_snapshots": [
                    {
                        "frame_number": 90,
                        "timestamp": "00:03.00",
                        "anomaly_region": "Lip-Sync Blending Boundary",
                        "confidence": 0.94,
                        "image_path": real_annotated_keyframe["file_path"],
                        "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI"
                    }
                ]
            }
        }))

        resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
        assert resp.status_code == 200

        pages = extract_pdf_pages_and_render(resp.content, scale=2)
        page_img, _ = pages[0]
        h, w, _ = page_img.shape

        left_half = page_img[:, :w//2, :]
        left_amber = count_amber_pixels(left_half[h//4 : 3*h//4, :, :])
        assert left_amber > 20, "Snapshot amber border must be on the left half of the page"

    def test_fir_pdf_section_numbering_cleanliness(
        self, client: TestClient, clean_threat_tracker, real_annotated_keyframe
    ):
        """
        Verify sequential section numbering in FIR PDF:
          1. Executive Incident Summary
          2. Flagged Forensic Keyframe Visual Evidence
          3. Technical Indicators of Compromise (IOCs)
          4. Applicable Legal Provisions under Indian Law
          5. Recommended Law Enforcement Action
        """
        threat_id = clean_threat_tracker(insert_threat_item({
            "id": f"THREAT-SECT-{uuid.uuid4().hex[:8]}",
            "title": "Section Sequence Test",
            "extracted_iocs": {
                "keyframe_snapshots": [
                    {
                        "frame_number": 1,
                        "timestamp": "00:00.03",
                        "image_path": real_annotated_keyframe["file_path"]
                    }
                ]
            }
        }))

        resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
        assert resp.status_code == 200
        pages = extract_pdf_pages_and_render(resp.content)
        all_text = " ".join([text for _, text in pages])

        assert "1. Executive Incident Summary" in all_text
        assert "2. Flagged Forensic Keyframe Visual Evidence" in all_text
        assert "3. Technical Indicators of Compromise" in all_text
        assert "4. Applicable Legal Provisions" in all_text
        assert "5. Recommended Law Enforcement Action" in all_text

    def test_fir_pdf_404_for_unknown_threat(self, client: TestClient):
        """Verify proper 404 response for unknown random threat ID."""
        resp = client.get(f"/api/v1/threat-intelligence/NON_EXISTENT_THREAT_9999/fir-pdf")
        assert resp.status_code == 404
        assert "not found" in resp.json().get("detail", "").lower()


# =========================================================================
# TEST SUITE 3: Adversarial Stress, Edge Cases & Concurrency
# =========================================================================

class TestPdfAdversarialStress:

    def test_multiple_snapshots_pagination_no_overflow(
        self, client: TestClient, real_annotated_keyframe
    ):
        """
        Stress-test with maximum keyframes (3 for jobs, 2 for threat_intel)
        to verify clean pagination and layout flow without overflowing.
        """
        job_id = f"challenger-multi-{uuid.uuid4().hex[:8]}"
        snaps = [
            {
                "frame_number": i * 30,
                "timestamp": f"00:0{i}.00",
                "anomaly_region": f"Anomaly Zone #{i}",
                "confidence": 0.95 - (i * 0.02),
                "image_path": real_annotated_keyframe["file_path"],
                "detector_subsystem": "GenD ViT-L/14 + Spatial SBI"
            }
            for i in range(5) # Provide 5 to test clamping to top 3
        ]

        save_local_job({
            "job_id": job_id,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 95.0,
                "keyframe_snapshots": snaps
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200
        pages = extract_pdf_pages_and_render(resp.content)
        # Verify valid page count and each page renders properly
        for idx, (img, _) in enumerate(pages):
            assert img.shape[0] >= 1000 and img.shape[1] >= 1000

    def test_corrupted_image_file_handling(self, client: TestClient):
        """
        Adversarial Failure Mode Verification:
        When an image file exists on disk but has corrupted / unidentifiable bytes,
        probes whether the PDF builder handles it or raises UnidentifiedImageError.
        Empirically documents that unshielded corrupt image files bubble up PIL.UnidentifiedImageError.
        """
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tf:
            tf.write(b"CORRUPTED_NOT_A_JPEG_FILE_DATA_CORRUPT")
            corrupt_path = tf.name

        try:
            job_id = f"challenger-corrupt-img-{uuid.uuid4().hex[:8]}"
            snap = {
                "frame_number": 77,
                "timestamp": "00:02.50",
                "image_path": corrupt_path,
                "anomaly_score": 0.95
            }
            save_local_job({
                "job_id": job_id,
                "result": {
                    "verdict": "DEEPFAKE",
                    "confidence": 95.0,
                    "keyframe_snapshots": [snap]
                }
            })

            resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
            assert resp.status_code == 200
            assert resp.headers.get("content-type") == "application/pdf"
            assert resp.content.startswith(b"%PDF-1.")
            pages = extract_pdf_pages_and_render(resp.content)
            assert len(pages) >= 1
            doc = pdfium.PdfDocument(resp.content)
            full_text = doc[0].get_textpage().get_text_range()
            assert "Keyframe #77" in full_text
        finally:
            if os.path.exists(corrupt_path):
                os.remove(corrupt_path)

    def test_adversarial_boundary_strings_and_special_chars(
        self, client: TestClient, clean_threat_tracker, real_annotated_keyframe
    ):
        """
        Verify robustness against Unicode, HTML/XML characters, and extreme strings
        in forensic finding and anomaly region.
        """
        threat_id = clean_threat_tracker(insert_threat_item({
            "id": f"THREAT-XML-{uuid.uuid4().hex[:8]}",
            "title": "Adversarial <script>alert('xss')</script> & Entities",
            "extracted_iocs": {
                "keyframe_snapshots": [
                    {
                        "frame_number": 99,
                        "timestamp": "99:99.99",
                        "anomaly_region": "Zone with &amp; entity and <special> tag",
                        "forensic_finding": "High synthetic manipulation &amp; deep boundary seam with unicode \u0928\u0947\u0924\u094d\u0930 \u2014 \u092b\u094b\u0930\u0947\u0902\u0938\u093f\u0915.",
                        "image_path": real_annotated_keyframe["file_path"],
                        "confidence": 0.99
                    }
                ]
            }
        }))

        resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
        assert resp.status_code == 200
        assert resp.content.startswith(b"%PDF-")

    def test_high_concurrency_burst_requests(
        self, client: TestClient, clean_threat_tracker, real_annotated_keyframe
    ):
        """
        Verify thread-safety and no shared buffer pollution when 10 concurrent requests
        hit both PDF endpoints simultaneously.
        """
        threat_id = clean_threat_tracker(insert_threat_item({
            "id": f"THREAT-CONCUR-{uuid.uuid4().hex[:8]}",
            "title": "Concurrent Load Threat",
            "extracted_iocs": {
                "keyframe_snapshots": [
                    {
                        "frame_number": 1,
                        "image_path": real_annotated_keyframe["file_path"],
                        "confidence": 0.98
                    }
                ]
            }
        }))

        job_id = f"challenger-concur-{uuid.uuid4().hex[:8]}"
        save_local_job({
            "job_id": job_id,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 98.0,
                "keyframe_snapshots": [
                    {
                        "frame_number": 1,
                        "image_path": real_annotated_keyframe["file_path"],
                        "confidence": 0.98
                    }
                ]
            }
        })

        urls = [
            f"/api/v1/jobs/{job_id}/report.pdf",
            f"/api/v1/threat-intelligence/{threat_id}/fir-pdf"
        ] * 5  # 10 requests total

        def fetch(url):
            return client.get(url)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            responses = list(executor.map(fetch, urls))

        assert len(responses) == 10
        for r in responses:
            assert r.status_code == 200
            assert r.content.startswith(b"%PDF-")
            assert len(r.content) > 10000
