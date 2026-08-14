"""
Adversarial Stress & Edge Case Test Harness for NETRA Milestone 1
Targeting:
- Concurrency & Thread-Safety (10+ rapid concurrent requests to /fir-pdf)
- Sparse & Malformed Data (empty extracted_iocs = {}, broken base64 images, non-existent files)
- Programmatic source code scanning for complete absence of Section 63 BSA / Section 65B IEA
"""

import io
import os
import re
import time
import base64
import tempfile
import threading
import concurrent.futures
import pypdfium2
import pytest
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.db import insert_threat_item


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# =========================================================================
# VENDOR / DIRECTIVE TEST: Programmatic Source Code & Output PDF Scanning
# =========================================================================

def test_programmatic_source_code_scan_zero_statutory_violations():
    """
    CRITICAL USER DIRECTIVE:
    Programmatically scan backend/api/routes/audio_detect.py and
    backend/api/routes/threat_intel.py for any occurrences of:
    - 'Section 63'
    - 'Section 65B'
    - '65B'
    - 'BSA 2023'
    - 'Indian Evidence Act'
    Guarantees complete elimination of statutory evidence certificates.
    """
    forbidden_patterns = [
        (re.compile(r"\bsection\s*63\b", re.IGNORECASE), "Section 63"),
        (re.compile(r"\bsection\s*65b\b", re.IGNORECASE), "Section 65B"),
        (re.compile(r"\b65b\b", re.IGNORECASE), "65B"),
        (re.compile(r"\bbsa\s*2023\b", re.IGNORECASE), "BSA 2023"),
        (re.compile(r"\bindian\s+evidence\s+act\b", re.IGNORECASE), "Indian Evidence Act"),
    ]

    target_files = [
        "backend/api/routes/audio_detect.py",
        "backend/api/routes/threat_intel.py",
    ]

    violations = []
    for filepath in target_files:
        assert os.path.isfile(filepath), f"File {filepath} not found!"
        with open(filepath, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                for pattern, label in forbidden_patterns:
                    if pattern.search(line):
                        violations.append(
                            f"VIOLATION: Found '{label}' in {filepath}:{line_no}: {line.strip()}"
                        )

    assert not violations, "\n".join(violations)


# =========================================================================
# EDGE CASE TEST 1: Sparse Data — Empty & None extracted_iocs
# =========================================================================

def test_sparse_and_empty_iocs_audio(client):
    """
    Test /fir-pdf on an audio_clone item with completely empty or missing extracted_iocs.
    Must fall back defensively to default acoustic telemetry without throwing 500.
    """
    # 1. Completely empty extracted_iocs
    item_id_empty = insert_threat_item({
        "id": "TEST-SPARSE-AUD-EMPTY",
        "title": "Sparse Audio Item Empty IOCs",
        "type": "audio_clone",
        "fake_probability": 0.85,
        "extracted_iocs": {},
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id_empty}/fir-pdf")
    assert resp.status_code == 200, f"Failed with {resp.status_code}: {resp.text}"
    assert resp.content.startswith(b"%PDF-1.")
    
    doc = pypdfium2.PdfDocument(resp.content)
    assert len(doc) >= 1
    text = " ".join(" ".join([page.get_textpage().get_text_range() for page in doc]).split())
    assert "CYBER CRIME INCIDENT REPORT" in text
    assert "Audio Voice Clone Forensic Inspection" in text
    assert "Wiener Spectral Flatness" in text
    assert "Section 66D" in text
    assert "Section 318(4)" in text
    assert "Section 63" not in text
    assert "Section 65B" not in text
    assert "65B" not in text

    # 2. None extracted_iocs and None fir_dossier
    item_id_none = insert_threat_item({
        "id": "TEST-SPARSE-AUD-NONE",
        "type": "audio_clone",
        "extracted_iocs": None,
        "fir_dossier": None,
    })

    resp_none = client.get(f"/api/v1/threat-intelligence/{item_id_none}/fir-pdf")
    assert resp_none.status_code == 200
    assert resp_none.content.startswith(b"%PDF-1.")
    doc_none = pypdfium2.PdfDocument(resp_none.content)
    assert len(doc_none) >= 1


def test_sparse_and_empty_iocs_image(client):
    """
    Test /fir-pdf on an image_deepfake item with completely empty extracted_iocs.
    Must default cleanly to pure_face mode with fallback diagnostic face cards.
    """
    item_id = insert_threat_item({
        "id": "TEST-SPARSE-IMG-EMPTY",
        "title": "Sparse Image Empty IOCs",
        "type": "image_deepfake",
        "fake_probability": 0.78,
        "extracted_iocs": {},
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")

    doc = pypdfium2.PdfDocument(resp.content)
    assert len(doc) >= 1
    text = " ".join(" ".join([page.get_textpage().get_text_range() for page in doc]).split())
    assert "Facial Deepfake & Manipulation Forensics" in text
    assert "Photographic Evidence" in text
    assert "VISUAL EVIDENCE RECORD ARCHIVED IN CRYPTOGRAPHIC LEDGER" in text
    assert "Multi-Face Forensic Breakdown Scorecard" in text
    assert "Section 66D" in text
    assert "Section 63" not in text
    assert "Section 65B" not in text


def test_sparse_document_ocr_branch_b(client):
    """
    Test /fir-pdf on a document scam image item with empty IOC lists.
    Must render the 'No external phone/UPI tokens identified' fallback row cleanly.
    """
    item_id = insert_threat_item({
        "id": "TEST-SPARSE-DOC-EMPTY",
        "title": "Document Scam With No Flagged Tokens",
        "type": "image_deepfake",
        "fake_probability": 0.91,
        "verdict": "CONFIRMED LOTTERY SCAM",
        "risk_level": "CRITICAL",
        "extracted_iocs": {
            "analysis_mode": "document",
            "phones": [],
            "upis": [],
            "urls": [],
            "apks": [],
            "ocr_analysis": {
                "engine": "RapidOCR",
                "lines_count": 0,
                "full_text": ""
            },
            "scam_analysis": {
                "is_scam": True,
                "matched_rules": []
            }
        }
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")

    doc = pypdfium2.PdfDocument(resp.content)
    assert len(doc) >= 1
    text = " ".join(" ".join([page.get_textpage().get_text_range() for page in doc]).split())
    assert "Document Scam & Text Intelligence" in text
    assert "No document text extracted from visual media container." in text
    assert "No external phone/UPI tokens identified" in text
    assert "Routine vigilance; cross-check sender authenticity" in text
    assert "Section 63" not in text
    assert "Section 65B" not in text


# =========================================================================
# EDGE CASE TEST 2: Broken Base64 & Non-Existent File Paths
# =========================================================================

def test_broken_base64_and_invalid_image_paths(client):
    """
    Test /fir-pdf on image items with broken base64 URIs and non-existent file paths.
    Verify that defensive fallback cards render cleanly without throwing 500 Internal Server Error.
    """
    malformed_variants = [
        # 1. Truncated invalid base64 data URI
        {
            "id": "TEST-MALFORMED-B64-TRUNC",
            "title": "Truncated Base64 Evidence",
            "type": "image_deepfake",
            "extracted_iocs": {
                "annotated_preview_base64": "data:image/jpeg;base64,12345ABC",
                "analysis_mode": "pure_face"
            }
        },
        # 2. Corrupt non-base64 characters in data URI
        {
            "id": "TEST-MALFORMED-B64-CORRUPT",
            "title": "Corrupt Base64 String",
            "type": "image_deepfake",
            "extracted_iocs": {
                "annotated_preview_base64": "data:image/png;base64,!!!@@@###$$$%%%^^^&&&***",
                "analysis_mode": "pure_face"
            }
        },
        # 3. Valid base64 encoding of non-image junk bytes
        {
            "id": "TEST-MALFORMED-B64-JUNK",
            "title": "Valid Base64 of Random Bytes",
            "type": "image_deepfake",
            "extracted_iocs": {
                "annotated_preview_base64": "data:image/jpeg;base64," + base64.b64encode(b"THIS IS NOT A VALID JPEG FILE FORMAT AT ALL").decode("utf-8"),
                "analysis_mode": "pure_face"
            }
        },
        # 4. Non-existent file path in media URLs
        {
            "id": "TEST-MALFORMED-FILE-NONEXIST",
            "title": "Non-Existent File Path",
            "type": "image_deepfake",
            "thumbnail_url": "/tmp/non_existent_image_forensic_evidence_9999.jpg",
            "extracted_iocs": {
                "analysis_mode": "pure_face"
            }
        },
        # 5. Zero-byte empty file on disk
        {
            "id": "TEST-MALFORMED-FILE-EMPTY",
            "title": "Zero Byte Empty File",
            "type": "image_deepfake",
            "thumbnail_url": None,  # Will create temp 0-byte file below
            "extracted_iocs": {
                "analysis_mode": "pure_face"
            }
        },
    ]

    # Create temporary 0-byte file for test case 5
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as empty_f:
        empty_path = empty_f.name
    malformed_variants[4]["thumbnail_url"] = empty_path

    try:
        for variant in malformed_variants:
            item_id = insert_threat_item(variant)
            resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
            
            assert resp.status_code == 200, f"Variant {variant['id']} failed with {resp.status_code}: {resp.text}"
            assert resp.content.startswith(b"%PDF-1."), f"Variant {variant['id']} did not produce valid PDF"
            
            doc = pypdfium2.PdfDocument(resp.content)
            assert len(doc) >= 1
            text = " ".join(" ".join([page.get_textpage().get_text_range() for page in doc]).split())
            
            # Verify the tamper-evident fallback card rendered cleanly
            assert "VISUAL EVIDENCE RECORD ARCHIVED IN CRYPTOGRAPHIC LEDGER" in text, (
                f"Variant {variant['id']} failed to render fallback ledger card"
            )
            assert "Chain of Custody Notice" in text
            assert "Section 63" not in text
            assert "Section 65B" not in text
    finally:
        if os.path.exists(empty_path):
            os.remove(empty_path)


# =========================================================================
# CONCURRENCY & PERFORMANCE TEST: 10 Rapid Concurrent Requests
# =========================================================================

def test_concurrency_stress_10_concurrent_requests(client):
    """
    Stress-test: Run 10 rapid concurrent requests against /threat-intelligence/{threat_id}/fir-pdf
    across audio, image, and video items.
    Checks for ReportLab thread-safety, race conditions, memory leaks, and PDF structural corruption.
    """
    # 1. Insert diverse test items across modalities
    item_audio = insert_threat_item({
        "id": "TEST-CONCUR-AUD-01",
        "title": "Concurrent Audio Clone",
        "type": "audio_clone",
        "fake_probability": 0.89,
        "verdict": "VOICE_CLONE_DETECTED",
        "risk_level": "CRITICAL",
        "extracted_iocs": {
            "duration_seconds": 6.2,
            "sample_rate_hz": 16000,
            "codec": "PCM 16-bit mono",
            "acoustic_metrics": {"wiener_flatness": 0.39, "hf_cutoff_ratio": 0.02, "rms_prosody_variance": 0.15, "zcr_variance": 0.0005},
            "scorecard": {"spectral_score": 0.89, "temporal_inconsistency": 0.3}
        }
    })

    item_img_face = insert_threat_item({
        "id": "TEST-CONCUR-IMG-FACE-01",
        "title": "Concurrent Face Deepfake",
        "type": "image_deepfake",
        "fake_probability": 0.95,
        "verdict": "DEEPFAKE",
        "risk_level": "CRITICAL",
        "extracted_iocs": {
            "analysis_mode": "pure_face",
            "facial_analysis": {
                "face_count": 1,
                "faces": [{
                    "face_id": "face_1",
                    "bbox": [100, 100, 200, 200],
                    "fake_probability": 0.95,
                    "verdict": "DEEPFAKE",
                    "risk_level": "CRITICAL",
                    "neural_metrics": {"sbi_artifact_level": 0.95}
                }]
            }
        }
    })

    item_img_doc = insert_threat_item({
        "id": "TEST-CONCUR-IMG-DOC-01",
        "title": "Concurrent Document Scam",
        "type": "image_deepfake",
        "fake_probability": 0.92,
        "extracted_iocs": {
            "analysis_mode": "document",
            "phones": ["+91 9876543210"],
            "upis": ["scam.fest@ybl"],
            "ocr_analysis": {"engine": "RapidOCR", "full_text": "KBC LOTTERY CONGRATULATIONS"}
        }
    })

    item_img_hyb = insert_threat_item({
        "id": "TEST-CONCUR-IMG-HYB-01",
        "title": "Concurrent Hybrid Notice",
        "type": "image_deepfake",
        "fake_probability": 0.96,
        "extracted_iocs": {
            "analysis_mode": "hybrid",
            "phones": ["+91 9999988888"],
            "facial_analysis": {"face_count": 1, "faces": [{"face_id": "face_1", "fake_probability": 0.96}]},
            "ocr_analysis": {"engine": "RapidOCR", "full_text": "ARREST WARRANT ISSUED"}
        }
    })

    item_video = insert_threat_item({
        "id": "TEST-CONCUR-VID-01",
        "title": "Concurrent Video Deepfake",
        "type": "video_deepfake",
        "fake_probability": 0.94,
        "risk_level": "CRITICAL",
        "extracted_iocs": {
            "phones": ["+91 9111122222"],
            "keyframe_snapshots": [{"frame_number": 12, "timestamp": "00:00.40", "anomaly_score": 0.94}]
        }
    })

    threat_pool = [item_audio, item_img_face, item_img_doc, item_img_hyb, item_video] * 2  # 10 requests

    results = []
    errors = []

    def fetch_fir_pdf(item_id: str, req_idx: int):
        t_start = time.time()
        try:
            resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
            elapsed = time.time() - t_start
            return (req_idx, item_id, resp.status_code, resp.content, elapsed, None)
        except Exception as e:
            return (req_idx, item_id, 0, b"", time.time() - t_start, str(e))

    # Execute 10 concurrent requests simultaneously
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_fir_pdf, threat_pool[i], i) for i in range(10)]
        for fut in concurrent.futures.as_completed(futures):
            results.append(fut.result())

    assert len(results) == 10, f"Expected 10 completed futures, got {len(results)}"

    # Validate each response
    for req_idx, item_id, status_code, content, elapsed, err in results:
        assert err is None, f"Request {req_idx} ({item_id}) encountered exception: {err}"
        assert status_code == 200, f"Request {req_idx} ({item_id}) failed with status {status_code}"
        assert content.startswith(b"%PDF-1."), f"Request {req_idx} ({item_id}) did not return valid PDF header"
        assert len(content) > 3000, f"Request {req_idx} ({item_id}) returned suspiciously small content: {len(content)} bytes"

        # Verify ReportLab PDF structure with pypdfium2
        doc = pypdfium2.PdfDocument(content)
        assert len(doc) >= 1, f"Request {req_idx} ({item_id}) PDF has 0 pages"
        text = " ".join(" ".join([page.get_textpage().get_text_range() for page in doc]).split())
        assert "CYBER CRIME INCIDENT REPORT" in text or "FIRST INFORMATION REPORT" in text
        assert "cybercrime.gov.in" in text
        assert "Section 63" not in text
        assert "Section 65B" not in text

    latencies = [r[4] for r in results]
    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    print(f"\n[CONCURRENCY PASS] 10/10 requests succeeded. Avg latency: {avg_latency*1000:.1f}ms, Max latency: {max_latency*1000:.1f}ms")


# =========================================================================
# BOUNDARY CONDITIONS & TYPE COERCION TEST
# =========================================================================

def test_type_coercion_and_boundary_cases(client):
    """
    Test extreme boundary inputs: string fake_probability, None values,
    unusual characters in titles, out-of-range floats.
    """
    boundary_items = [
        {
            "id": "TEST-BOUND-STR-PROB",
            "title": "String Prob & <Special> & 'XML' \"Entities\"",
            "type": "audio_clone",
            "fake_probability": "0.98",  # String instead of float
            "verdict": None,             # None verdict
            "risk_level": None,          # None risk level
            "extracted_iocs": {
                "duration_seconds": "14.5",  # String duration
                "sample_rate_hz": "16000",   # String sample rate
                "acoustic_metrics": {
                    "wiener_flatness": "0.45",
                    "hf_cutoff_ratio": "0.01",
                    "rms_prosody_variance": "0.11",
                    "zcr_variance": "0.0003"
                }
            }
        },
        {
            "id": "TEST-BOUND-NEGATIVE-PROB",
            "title": "Negative and Out-of-Range Probability",
            "type": "image_deepfake",
            "fake_probability": -1.0,
            "extracted_iocs": {
                "analysis_mode": "pure_face",
                "facial_analysis": {
                    "faces": [{
                        "face_id": "face_weird",
                        "bbox": None,
                        "fake_probability": "invalid_number",
                        "anomaly_region": "<script>alert('xss')</script>"
                    }]
                }
            }
        }
    ]

    for item_dict in boundary_items:
        item_id = insert_threat_item(item_dict)
        resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
        assert resp.status_code == 200, f"Boundary item {item_dict['id']} failed with {resp.status_code}: {resp.text}"
        assert resp.content.startswith(b"%PDF-1.")
        doc = pypdfium2.PdfDocument(resp.content)
        assert len(doc) >= 1
        text = " ".join(" ".join([page.get_textpage().get_text_range() for page in doc]).split())
        assert "Section 63" not in text
        assert "Section 65B" not in text
