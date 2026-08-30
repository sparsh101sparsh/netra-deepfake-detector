import io
import os
import hashlib
import pypdfium2
import pytest
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.db import insert_threat_item

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_audio_clone_fir_pdf_generation(client):
    item_id = insert_threat_item({
        "id": "TEST-FIR-AUD-01",
        "title": "Extortion Voice Memo Impersonation",
        "type": "audio_clone",
        "threat_category": "VOICE_CLONE",
        "source_platform": "WhatsApp Voice Note",
        "fake_probability": 0.92,
        "verdict": "VOICE_CLONE_DETECTED",
        "risk_level": "CRITICAL",
        "city": "Mumbai",
        "state": "Maharashtra",
        "extracted_iocs": {
            "duration_seconds": 8.4,
            "sample_rate_hz": 16000,
            "codec": "PCM 16-bit mono",
            "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "acoustic_flags": ["vocoder_spectral_flatness_anomaly", "high_frequency_vocoder_cutoff"],
            "acoustic_metrics": {
                "wiener_flatness": 0.3842,
                "hf_cutoff_ratio": 0.0182,
                "rms_prosody_variance": 0.1420,
                "zcr_variance": 0.00042
            },
            "scorecard": {
                "wav2vec2_score": 0.94,
                "spectral_score": 0.91,
                "temporal_inconsistency": 0.42
            }
        },
        "fir_dossier": {
            "incident_summary": "Extortion voice note generated with neural vocoder synthesis targeting citizen bank accounts."
        }
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")
    assert len(resp.content) > 5000

    doc = pypdfium2.PdfDocument(resp.content)
    assert len(doc) >= 1
    raw_text = " ".join([page.get_textpage().get_text_range() for page in doc])
    full_text = " ".join(raw_text.split())

    assert "Audio Voice Clone Forensic Inspection" in full_text
    assert "Wiener Spectral Flatness" in full_text
    assert "16,000 Hz" in full_text
    # CRITICAL: Pure technical forensics — zero Indian law/police citations
    assert "Dial 1930" not in full_text
    assert "cybercrime.gov.in" not in full_text
    assert "Section 66D" not in full_text
    assert "Section 318(4)" not in full_text
    assert "Section 65B" not in full_text
    assert "Section 63 BSA" not in full_text
    assert "65B" not in full_text

def test_image_pure_face_branch_a_fir_pdf_generation(client):
    item_id = insert_threat_item({
        "id": "TEST-FIR-IMG-FACE-01",
        "title": "High-Risk Face Swap Photographic Forgery",
        "type": "image_deepfake",
        "threat_category": "FACE_SWAP",
        "fake_probability": 0.95,
        "verdict": "DEEPFAKE",
        "risk_level": "CRITICAL",
        "city": "New Delhi",
        "state": "Delhi",
        "extracted_iocs": {
            "analysis_mode": "pure_face",
            "facial_analysis": {
                "face_count": 1,
                "max_fake_probability": 0.95,
                "composite_face_verdict": "DEEPFAKE",
                "faces": [{
                    "face_id": "face_1",
                    "bbox": [120, 80, 240, 260],
                    "fake_probability": 0.95,
                    "verdict": "DEEPFAKE",
                    "risk_level": "CRITICAL",
                    "anomaly_region": "Eyewear / Specular Glare Plane",
                    "evidence_code": "EVD-EYE-SPECULAR-GLARE",
                    "forensic_badge": "FACE #1: SYNTHETIC (95%)",
                    "neural_metrics": {
                        "sbi_artifact_level": 0.952,
                        "ocular_reflection_symmetry": 0.312,
                        "eyewear_specular_score": 64.2,
                        "lip_sync_laplacian_score": 14.5
                    }
                }]
            }
        }
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")
    assert len(resp.content) > 5000

    doc = pypdfium2.PdfDocument(resp.content)
    raw_text = " ".join([page.get_textpage().get_text_range() for page in doc])
    full_text = " ".join(raw_text.split())

    assert "Photographic Evidence" in full_text
    assert "Multi-Face Forensic Breakdown Scorecard" in full_text
    assert "Eyewear / Specular Glare Plane" in full_text
    assert "SpatialSBIDetector" in full_text
    assert "Section 66D" not in full_text
    assert "Section 318(4)" not in full_text

    # CRITICAL: Absolutely no Section 65B or Section 63 BSA
    assert "Section 65B" not in full_text
    assert "Section 63 BSA" not in full_text
    assert "65B" not in full_text

def test_image_document_scam_branch_b_fir_pdf_generation(client):
    item_id = insert_threat_item({
        "id": "TEST-FIR-IMG-DOC-01",
        "title": "KBC Lottery Advance Fee Fraud Letter",
        "type": "image_deepfake",
        "threat_category": "LOTTERY_PRIZE_FRAUD",
        "fake_probability": 0.91,
        "verdict": "CONFIRMED LOTTERY SCAM",
        "risk_level": "CRITICAL",
        "city": "Patna",
        "state": "Bihar",
        "extracted_iocs": {
            "analysis_mode": "document",
            "phones": ["+91 9714275760"],
            "upis": ["kbc.winner@icici"],
            "urls": ["https://kbc-official-award.in"],
            "apks": ["kbc_reward.apk"],
            "ocr_analysis": {
                "engine": "RapidOCR (ONNX Engine)",
                "lines_count": 8,
                "processing_time_ms": 42,
                "full_text": "DEAR CUSTOMER YOUR SIM CARD WON 25 LAKHS LOTTERY IN KBC. CALL 9714275760."
            },
            "scam_analysis": {
                "is_scam": True,
                "risk_score": 91,
                "risk_level": "CRITICAL",
                "scam_type": "lottery_prize_fraud",
                "matched_rules": ["advance_fee_lottery_pattern", "urgent_call_action"]
            }
        }
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")
    assert len(resp.content) > 5000

    doc = pypdfium2.PdfDocument(resp.content)
    raw_text = " ".join([page.get_textpage().get_text_range() for page in doc])
    full_text = " ".join(raw_text.split())

    assert "Extracted Document OCR Text" in full_text
    assert "Indicators of Compromise" in full_text
    assert "+91 9714275760" in full_text
    assert "kbc.winner@icici" in full_text
    assert "TAFCOP" not in full_text
    assert "Section 66D" not in full_text

    # CRITICAL: Absolutely no Section 65B or Section 63 BSA
    assert "Section 65B" not in full_text
    assert "Section 63 BSA" not in full_text
    assert "65B" not in full_text

def test_image_hybrid_branch_c_fir_pdf_generation(client):
    item_id = insert_threat_item({
        "id": "TEST-FIR-IMG-HYBRID-01",
        "title": "Police Impersonation Arrest Warrant Notice",
        "type": "image_deepfake",
        "threat_category": "DIGITAL_ARREST_EXTORTION",
        "fake_probability": 0.94,
        "verdict": "CONFIRMED DIGITAL ARREST EXTORTION",
        "risk_level": "CRITICAL",
        "city": "Bengaluru",
        "state": "Karnataka",
        "extracted_iocs": {
            "analysis_mode": "hybrid",
            "phones": ["+91 9876543210"],
            "upis": ["cbi.verify@axisbank"],
            "urls": ["https://police-notice-verify.org"],
            "facial_analysis": {
                "face_count": 1,
                "max_fake_probability": 0.94,
                "composite_face_verdict": "DEEPFAKE",
                "faces": [{
                    "face_id": "face_1",
                    "bbox": [100, 100, 200, 200],
                    "fake_probability": 0.94,
                    "verdict": "DEEPFAKE",
                    "risk_level": "CRITICAL",
                    "anomaly_region": "Police Uniform & Specular Discontinuity",
                    "evidence_code": "EVD-UNIFORM-SEAM",
                    "neural_metrics": {
                        "sbi_artifact_level": 0.94,
                        "ocular_reflection_symmetry": 0.33,
                        "eyewear_specular_score": 61.0,
                        "lip_sync_laplacian_score": 11.2
                    }
                }]
            },
            "ocr_analysis": {
                "engine": "RapidOCR (ONNX Engine)",
                "lines_count": 12,
                "processing_time_ms": 50,
                "full_text": "CENTRAL BUREAU OF INVESTIGATION ARREST WARRANT. PAY BAIL TO 9876543210."
            },
            "scam_analysis": {
                "is_scam": True,
                "risk_score": 94,
                "risk_level": "CRITICAL",
                "scam_type": "digital_arrest",
                "matched_rules": ["police_cbi_threat", "immediate_arrest_threat"]
            }
        }
    })

    resp = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")
    assert len(resp.content) > 5000

    doc = pypdfium2.PdfDocument(resp.content)
    raw_text = " ".join([page.get_textpage().get_text_range() for page in doc])
    full_text = " ".join(raw_text.split())

    assert "Multi-Modal Hybrid Forensics" in full_text
    assert "COMPOSITE HYBRID THREAT VERDICT" in full_text
    assert "Photographic Evidence" in full_text
    assert "Part II: Document Scam Intelligence" in full_text
    assert "+91 9876543210" in full_text
    assert "cbi.verify@axisbank" in full_text

    # CRITICAL: Absolutely no Section 65B or Section 63 BSA
    assert "Section 65B" not in full_text
    assert "Section 63 BSA" not in full_text
    assert "65B" not in full_text
