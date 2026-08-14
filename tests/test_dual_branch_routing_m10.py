"""
Milestone 10: Backend Intelligent Dual-Branch Routing & Multi-Face Forensics Verification Suite
Tests:
1. Document Image (file-JXAGnmm9Vl.png) -> Branch B (Document)
2. Portrait Image (s0.jpg) -> Branch A (Pure Face)
3. Hybrid Image (Face + Scam Text) -> Branch C (Hybrid)
4. Multi-Face Image (2+ faces) -> Multi-face localization and individual scoring
5. Inconclusive Image (No face, <30 chars) -> Fallback routing
6. API Endpoints: /api/v1/detect/image-ocr and /api/v1/detect/image (backward compatibility)
7. Threat Catalog Auto-Ingestion Hook
"""

import os
import io
import cv2
import pytest
import numpy as np
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.netra.pipeline.dual_branch_router import (
    process_image_forensics,
    MultiTierFaceDetector,
    check_text_density_rapidocr,
    score_individual_faces,
    generate_annotated_preview
)

DOC_PATH = "/Users/iamsparsh00321/Downloads/file-JXAGnmm9Vl.png"
FACE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "LivePortrait", "assets", "examples", "source", "s0.jpg"))

client = TestClient(app)


def test_document_routing_branch_b():
    """Verify document image (file-JXAGnmm9Vl.png) routes to Branch B and detects KBC lottery scam."""
    assert os.path.exists(DOC_PATH), f"Document test image missing at {DOC_PATH}"
    with open(DOC_PATH, "rb") as f:
        doc_bytes = f.read()

    result = process_image_forensics(doc_bytes, "file-JXAGnmm9Vl.png")

    assert result["status"] == "success"
    assert result["analysis_mode"] == "document"
    assert result["routing_decision"]["selected_branch"] == "Branch B (Document / Scam Letter)"
    assert result["routing_decision"]["face_count"] == 0
    assert result["routing_decision"]["char_count"] >= 30

    # Scam verification
    assert result["scam_analysis"]["is_scam"] is True
    assert result["scam_analysis"]["risk_score"] >= 90
    assert result["composite_risk_score"] >= 90
    assert result["scam_analysis"]["scam_type"] == "lottery_prize_fraud"
    assert "9714275760" in result["extracted_iocs"]["phones"]

    # Facial analysis should reflect 0 faces
    assert result["facial_analysis"]["face_count"] == 0
    assert result["facial_analysis"]["faces"] == []


def test_portrait_routing_branch_a():
    """Verify portrait image (s0.jpg) routes to Branch A and extracts facial forensics."""
    assert os.path.exists(FACE_PATH), f"Portrait test image missing at {FACE_PATH}"
    with open(FACE_PATH, "rb") as f:
        face_bytes = f.read()

    result = process_image_forensics(face_bytes, "s0.jpg")

    assert result["status"] == "success"
    assert result["analysis_mode"] == "pure_face"
    assert result["routing_decision"]["selected_branch"] == "Branch A (Pure Face / Portrait / Group Photo)"
    assert result["routing_decision"]["face_count"] >= 1
    assert result["routing_decision"]["char_count"] < 30

    # Facial analysis verification
    facial = result["facial_analysis"]
    assert facial["face_count"] >= 1
    assert len(facial["faces"]) >= 1
    assert facial["max_fake_probability"] is not None
    assert facial["highest_risk_face_id"] == "face_1"
    assert facial["composite_face_verdict"] in ("AUTHENTIC", "SUSPICIOUS", "DEEPFAKE")

    # Annotated preview verification
    assert facial["annotated_preview_url"].startswith("/api/v1/media/images/")
    assert facial["annotated_preview_base64"].startswith("data:image/jpeg;base64,")

    # Neural metrics verification on first face
    first_face = facial["faces"][0]
    assert len(first_face["bbox"]) == 4
    assert len(first_face["normalized_bbox"]) == 4
    assert "sbi_artifact_level" in first_face["neural_metrics"]
    assert "ocular_reflection_symmetry" in first_face["neural_metrics"]
    assert "eyewear_specular_score" in first_face["neural_metrics"]
    assert "lip_sync_laplacian_score" in first_face["neural_metrics"]
    assert first_face["forensic_badge"].startswith("FACE #1:")
    assert first_face["border_color_hex"] in ("#10b981", "#f59e0b", "#ef4444")


def test_hybrid_routing_branch_c():
    """Verify hybrid image (Face + Scam Text) routes to Branch C and returns both pipelines."""
    assert os.path.exists(FACE_PATH), f"Portrait test image missing at {FACE_PATH}"
    pil_img = Image.open(FACE_PATH).convert("RGB")
    draw = ImageDraw.Draw(pil_img)
    scam_text = (
        "URGENT KBC LOTTERY PRIZE 25,00,000 RS\n"
        "Contact WhatsApp Manager: 9714275760 immediately.\n"
        "Pay 25000 fee to kbc@sbi to claim prize money."
    )
    draw.rectangle([(20, 20), (500, 100)], fill=(255, 255, 255))
    draw.text((25, 25), scam_text, fill=(0, 0, 0))

    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    hybrid_bytes = buf.getvalue()

    result = process_image_forensics(hybrid_bytes, "hybrid_scam.jpg")

    assert result["status"] == "success"
    assert result["analysis_mode"] == "hybrid"
    assert result["routing_decision"]["selected_branch"] == "Branch C (Hybrid / Mixed Media)"
    assert result["routing_decision"]["face_count"] >= 1
    assert result["routing_decision"]["char_count"] >= 30

    # Both pipelines must be populated
    assert result["facial_analysis"]["face_count"] >= 1
    assert result["scam_analysis"]["is_scam"] is True
    assert "9714275760" in result["extracted_iocs"]["phones"]

    # Composite risk score is max(scam_risk, int(max_fake_prob * 100))
    expected_composite = max(
        result["scam_analysis"]["risk_score"],
        int(result["facial_analysis"]["max_fake_probability"] * 100)
    )
    assert result["composite_risk_score"] == expected_composite
    assert "HYBRID" in result["composite_verdict"]


def test_multi_face_detection_and_scoring():
    """Verify multi-face image localizes and individually scores all detected faces."""
    assert os.path.exists(FACE_PATH), f"Portrait test image missing at {FACE_PATH}"
    s0 = cv2.imread(FACE_PATH)
    h, w = s0.shape[:2]
    canvas = np.zeros((h, w * 2, 3), dtype=np.uint8)
    canvas[:, :w] = s0
    canvas[:, w:] = cv2.flip(s0, 1)

    _, buf = cv2.imencode(".jpg", canvas)
    multi_face_bytes = buf.tobytes()

    result = process_image_forensics(multi_face_bytes, "two_faces.jpg")

    assert result["facial_analysis"]["face_count"] >= 2
    faces = result["facial_analysis"]["faces"]
    assert len(faces) >= 2
    assert faces[0]["face_id"] == "face_1"
    assert faces[1]["face_id"] == "face_2"
    assert result["facial_analysis"]["highest_risk_face_id"] in ("face_1", "face_2")


def test_inconclusive_routing_fallback():
    """Verify blank / noise image with no faces and <30 chars routes to Fallback."""
    blank = np.zeros((300, 300, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", blank)
    blank_bytes = buf.tobytes()

    result = process_image_forensics(blank_bytes, "blank.jpg")

    assert result["analysis_mode"] == "inconclusive"
    assert result["routing_decision"]["face_count"] == 0
    assert result["routing_decision"]["char_count"] < 30
    assert result["composite_risk_score"] == 10
    assert result["composite_risk_level"] == "LOW"


def test_endpoint_backward_compatibility():
    """Verify /detect/image-ocr and /detect/image endpoints return full backward-compatible contracts."""
    with open(DOC_PATH, "rb") as f:
        r_ocr = client.post("/api/v1/detect/image-ocr", files={"file": ("doc.png", f, "image/png")})

    assert r_ocr.status_code == 200
    data_ocr = r_ocr.json()

    # Legacy contract keys
    assert "status" in data_ocr
    assert "ocr_analysis" in data_ocr
    assert "scam_analysis" in data_ocr
    assert "extracted_iocs" in data_ocr
    assert "recommendation" in data_ocr
    assert "tavily_threat_intel" in data_ocr
    assert "is_scam" in data_ocr
    assert "risk_score" in data_ocr
    assert "verdict" in data_ocr

    # New Milestone 10 keys
    assert "analysis_mode" in data_ocr
    assert "routing_decision" in data_ocr
    assert "composite_risk_score" in data_ocr
    assert "composite_risk_level" in data_ocr
    assert "composite_verdict" in data_ocr
    assert "facial_analysis" in data_ocr

    # Test /detect/image endpoint
    with open(FACE_PATH, "rb") as f:
        r_img = client.post("/api/v1/detect/image", files={"file": ("face.jpg", f, "image/jpeg")})

    assert r_img.status_code == 200
    data_img = r_img.json()
    assert data_img["analysis_mode"] == "pure_face"
    assert data_img["facial_analysis"]["face_count"] >= 1
