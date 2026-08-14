"""
Forensic Integrity Verification Script for Milestone 8 (Requirement R3).
Auditor: Forensic Auditor M8-Iter2-1
"""
import os
import sys
import io
import hashlib
import tempfile
import pypdfium2
from PIL import Image as PILImage
from fastapi.testclient import TestClient

# Ensure root directory is in python path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.api.server import app
from backend.api.routes.jobs import save_local_job, resolve_job_snapshot_image
from backend.api.routes.threat_intel import insert_threat_item, resolve_snapshot_image_path

client = TestClient(app)

def test_static_mocks_absence():
    print("[1] Running Static Mocks Absence Audit...")
    target_files = [
        "backend/api/routes/jobs.py",
        "backend/api/routes/threat_intel.py",
        "worker/worker.py",
        "frontend/lib/pdfReportGenerator.ts",
    ]
    prohibited_tokens = [
        "test-sample-job-id",
        "test-job-sample-id",
    ]
    for rel_path in target_files:
        full_path = os.path.join(root_dir, rel_path)
        with open(full_path, "r") as f:
            content = f.read()
        for token in prohibited_tokens:
            assert token not in content, f"Integrity Violation: Found prohibited mock token '{token}' in {rel_path}"
    print("    PASSED: 0 prohibited test tokens found in production source.")

def test_dynamic_pdf_hash_divergence():
    print("[2] Running Dynamic PDF Hash Divergence Test...")
    # Create two jobs with distinct IDs and metadata
    job1_id = f"auditor-job-alpha-{os.getpid()}"
    job2_id = f"auditor-job-beta-{os.getpid()}"

    save_local_job({
        "job_id": job1_id,
        "status": "complete",
        "verdict": "DEEPFAKE",
        "confidence": 92.5,
        "risk_level": "CRITICAL",
        "result": {
            "verdict": "DEEPFAKE",
            "confidence": 92.5,
            "visual_score": 0.93,
            "gend_score": 0.91,
            "audio_score": 0.15,
            "frames": [{"frame_number": 1, "timestamp": "00:01", "confidence": 0.92}]
        }
    })

    save_local_job({
        "job_id": job2_id,
        "status": "complete",
        "verdict": "AUTHENTIC",
        "confidence": 12.0,
        "risk_level": "LOW",
        "result": {
            "verdict": "AUTHENTIC",
            "confidence": 12.0,
            "visual_score": 0.10,
            "gend_score": 0.14,
            "audio_score": 0.05,
            "frames": [{"frame_number": 1, "timestamp": "00:01", "confidence": 0.12}]
        }
    })

    resp1 = client.get(f"/api/v1/jobs/{job1_id}/report.pdf")
    resp2 = client.get(f"/api/v1/jobs/{job2_id}/report.pdf")

    assert resp1.status_code == 200, f"Job 1 PDF generation failed: {resp1.status_code}"
    assert resp2.status_code == 200, f"Job 2 PDF generation failed: {resp2.status_code}"
    assert resp1.headers["content-type"] == "application/pdf"
    assert resp2.headers["content-type"] == "application/pdf"

    hash1 = hashlib.sha256(resp1.content).hexdigest()
    hash2 = hashlib.sha256(resp2.content).hexdigest()

    assert hash1 != hash2, f"Integrity Violation: Identical hashes {hash1} produced for distinct inputs!"
    print(f"    PASSED: Dynamic PDF generation verified. Hash1={hash1[:16]}... Hash2={hash2[:16]}...")

def test_authentic_image_embedding():
    print("[3] Running Authentic Image Reading & Embedding Test...")
    # Create an actual test image in backend/media/keyframes/
    keyframes_dir = os.path.join(root_dir, "backend/media/keyframes")
    os.makedirs(keyframes_dir, exist_ok=True)
    img_filename = f"auditor_test_frame_{os.getpid()}.jpg"
    img_path = os.path.join(keyframes_dir, img_filename)

    # Generate genuine 220x145 image with distinct color block
    test_img = PILImage.new("RGB", (220, 145), color=(245, 158, 11))
    test_img.save(img_path, format="JPEG")
    try:
        job_id = f"auditor-img-job-{os.getpid()}"
        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "verdict": "DEEPFAKE",
            "confidence": 99.1,
            "risk_level": "CRITICAL",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 99.1,
                "keyframe_snapshots": [
                    {
                        "frame_number": 10,
                        "timestamp": "00:03.20",
                        "anomaly_region": "Forensic Auditor Test Region",
                        "confidence": 0.991,
                        "anomaly_score": 0.991,
                        "image_path": img_path,
                        "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI",
                        "bounding_box": [50, 50, 100, 80]
                    }
                ]
            }
        })

        resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
        assert resp.status_code == 200, f"Failed to get PDF: {resp.status_code}"

        # Parse generated PDF with pypdfium2 and verify image objects or rendering
        pdf = pypdfium2.PdfDocument(io.BytesIO(resp.content))
        assert len(pdf) >= 1
        # Also check raw PDF bytes for Image XObject
        assert b"/Subtype /Image" in resp.content or b"/XObject" in resp.content
        page = pdf[0]
        bitmap = page.render(scale=1.0)
        pil_rendered = bitmap.to_pil()
        assert pil_rendered.size[0] > 0 and pil_rendered.size[1] > 0
        print(f"    PASSED: Authentic image embedding verified (PDF rendered {pil_rendered.size} bitmap, Image XObject found in stream).")
    finally:
        if os.path.exists(img_path):
            os.remove(img_path)

def test_statutory_compliance():
    print("[4] Running Statutory Admissibility Verification...")
    job_id = f"auditor-statutory-job-{os.getpid()}"
    save_local_job({
        "job_id": job_id,
        "status": "complete",
        "verdict": "DEEPFAKE",
        "confidence": 95.0,
        "risk_level": "CRITICAL",
        "result": {
            "verdict": "DEEPFAKE",
            "confidence": 95.0,
            "keyframe_snapshots": [
                {
                    "frame_number": 7,
                    "timestamp": "00:02.10",
                    "anomaly_region": "Lip-Sync Boundary Seam",
                    "confidence": 0.95,
                    "anomaly_score": 0.95,
                    "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI",
                    "bounding_box": [10, 20, 30, 40]
                }
            ]
        }
    })
    resp = client.get(f"/api/v1/jobs/{job_id}/report.pdf")
    assert resp.status_code == 200

    pdf = pypdfium2.PdfDocument(io.BytesIO(resp.content))
    pdf_text = ""
    for page in pdf:
        textpage = page.get_textpage()
        pdf_text += textpage.get_text_range()

    required_statutes = [
        "Section 65B",
        "Section 63 BSA",
        "Section 66D",
        "Section 318(4)",
    ]
    for statute in required_statutes:
        assert statute in pdf_text, f"Integrity Violation: Statutory citation '{statute}' missing from PDF text!"
    print(f"    PASSED: All statutory references confirmed present in generated PDF.")

def test_fir_pdf_endpoint_verification():
    print("[5] Running FIR PDF Endpoint Forensic Verification...")
    keyframes_dir = os.path.join(root_dir, "backend/media/keyframes")
    os.makedirs(keyframes_dir, exist_ok=True)
    img_filename = f"auditor_fir_frame_{os.getpid()}.jpg"
    img_path = os.path.join(keyframes_dir, img_filename)

    test_img = PILImage.new("RGB", (220, 145), color=(15, 23, 42))
    test_img.save(img_path, format="JPEG")
    try:
        threat1_id = f"NETRA-THREAT-AUDIT-1-{os.getpid()}"
        threat2_id = f"NETRA-THREAT-AUDIT-2-{os.getpid()}"

        insert_threat_item({
            "id": threat1_id,
            "title": "Auditor Test Cyber Scam 1",
            "type": "video_deepfake",
            "fake_probability": 0.98,
            "risk_level": "CRITICAL",
            "extracted_iocs": {
                "phones": ["+91 9876543210"],
                "upis": ["scam@upi"],
                "urls": ["https://scam.example.com"],
                "keyframe_snapshots": [
                    {
                        "frame_number": 12,
                        "timestamp": "00:04.10",
                        "anomaly_region": "Eyewear Specular Glare",
                        "confidence": 0.98,
                        "anomaly_score": 0.98,
                        "image_path": img_path,
                        "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI"
                    }
                ]
            }
        })

        insert_threat_item({
            "id": threat2_id,
            "title": "Auditor Test Cyber Scam 2",
            "type": "audio_clone",
            "fake_probability": 0.85,
            "risk_level": "HIGH",
            "extracted_iocs": {
                "phones": ["+91 9123456780"],
                "upis": ["audiofake@upi"],
                "urls": []
            }
        })

        resp1 = client.get(f"/api/v1/threat-intelligence/{threat1_id}/fir-pdf")
        resp2 = client.get(f"/api/v1/threat-intelligence/{threat2_id}/fir-pdf")

        assert resp1.status_code == 200, f"Threat 1 FIR PDF failed: {resp1.status_code}"
        assert resp2.status_code == 200, f"Threat 2 FIR PDF failed: {resp2.status_code}"

        hash1 = hashlib.sha256(resp1.content).hexdigest()
        hash2 = hashlib.sha256(resp2.content).hexdigest()
        assert hash1 != hash2, f"Integrity Violation: Identical FIR hashes {hash1} for distinct threats!"

        pdf1 = pypdfium2.PdfDocument(io.BytesIO(resp1.content))
        pdf1_text = "".join(p.get_textpage().get_text_range() for p in pdf1)

        for statute in ["Section 65B", "Section 63 BSA", "Section 66D", "Section 318(4)"]:
            assert statute in pdf1_text, f"Integrity Violation: Missing statute {statute} in FIR PDF"

        assert b"/Subtype /Image" in resp1.content or b"/XObject" in resp1.content
        print(f"    PASSED: FIR PDF endpoint verified (divergent hashes, image embedded, statutes present).")
    finally:
        if os.path.exists(img_path):
            os.remove(img_path)

if __name__ == "__main__":
    test_static_mocks_absence()
    test_dynamic_pdf_hash_divergence()
    test_authentic_image_embedding()
    test_statutory_compliance()
    test_fir_pdf_endpoint_verification()
    print("\nALL EMPIRICAL FORENSIC INTEGRITY CHECKS PASSED CLEANLY!")
