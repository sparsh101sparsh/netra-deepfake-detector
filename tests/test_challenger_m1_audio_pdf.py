"""
Milestone 1 Empirical Challenger Test Suite
Validates:
1. POST /api/v1/detect/audio with diverse audio wave payloads (0.2s, silence, noise, 5s clip, <0.1s, varied codecs).
2. Complete acoustic telemetry response schema validation and physical invariants.
3. SQLite database persistence and physical upload storage in threat_catalog.
4. GET /threat-intelligence/{threat_id}/fir-pdf across all 5 modalities:
   - Audio Voice Clone
   - Image Pure Face (Branch A)
   - Image Document Scam (Branch B)
   - Image Hybrid (Branch C)
   - Video Deepfake
5. Rendering and text extraction via pypdfium2 verifying uncorrupted PDF streams.
6. Strict absence of "Section 63", "Section 65B", "65B", and "Section 63 BSA".
7. Adversarial resilience against corrupted payloads, boundary conditions, and missing metadata.
"""

import io
import os
import wave
import json
import sqlite3
import hashlib
import numpy as np
import pypdfium2
import pytest
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.db import get_db, insert_threat_item, get_threat_by_id

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def generate_wave_bytes(duration_sec: float, sample_rate: int = 16000, wave_type: str = "sine") -> bytes:
    """Generate in-memory WAV bytes with specific duration and acoustic signal."""
    num_samples = int(duration_sec * sample_rate)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)

    if wave_type == "sine":
        # 440 Hz standard tone
        audio = 0.5 * np.sin(2 * np.pi * 440 * t)
    elif wave_type == "silent":
        # Pure digital silence
        audio = np.zeros(num_samples, dtype=np.float32)
    elif wave_type == "noise":
        # Random Gaussian white noise (high Wiener flatness)
        audio = np.random.normal(0, 0.4, num_samples).clip(-1.0, 1.0)
    elif wave_type == "harmonic_complex":
        # Multi-tone complex with simulated vocoder artifacts
        audio = (
            0.35 * np.sin(2 * np.pi * 300 * t) +
            0.25 * np.sin(2 * np.pi * 600 * t) +
            0.15 * np.sin(2 * np.pi * 1200 * t) +
            0.10 * np.sin(2 * np.pi * 4800 * t)
        )
    else:
        audio = 0.4 * np.sin(2 * np.pi * 500 * t)

    int_samples = (audio * 32767).astype(np.int16)

    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_samples.tobytes())
    return bio.getvalue()


# ==============================================================================
# 1. AUDIO DETECTION ENDPOINT & TELEMETRY CHALLENGE
# ==============================================================================

@pytest.mark.parametrize("scenario,duration,wave_type,filename", [
    ("short_0_2s", 0.2, "sine", "short_voice_clip.wav"),
    ("silent_1_0s", 1.0, "silent", "pure_silence.wav"),
    ("high_noise_1_5s", 1.5, "noise", "noisy_channel.wav"),
    ("clip_5_0s", 5.0, "harmonic_complex", "long_speech_note.wav"),
    ("ultra_short_0_05s", 0.05, "sine", "transient_click.wav"),
])
def test_audio_detect_payload_variations(client, scenario, duration, wave_type, filename):
    """
    Challenge POST /api/v1/detect/audio across short, silent, noisy, and long waveforms.
    Asserts zero exceptions, complete telemetry, and valid numeric bounds.
    """
    wav_bytes = generate_wave_bytes(duration_sec=duration, wave_type=wave_type)
    expected_sha = hashlib.sha256(wav_bytes).hexdigest()

    resp = client.post(
        "/api/v1/detect/audio",
        files={"file": (filename, wav_bytes, "audio/wav")}
    )

    assert resp.status_code == 200, f"Scenario {scenario} failed with {resp.status_code}: {resp.text}"
    data = resp.json()

    # Telemetry schema assertions
    assert data["sample_rate_hz"] == 16000
    assert data["codec"] == "PCM 16-bit mono"
    assert data["sha256_hash"] == expected_sha
    assert isinstance(data["is_fake"], bool)
    assert 0.0 <= data["fake_probability"] <= 1.0
    assert 0 <= data["confidence"] <= 100
    assert data["verdict"] in ("AUTHENTIC_SPEECH", "VOICE_CLONE_DETECTED", "SUSPICIOUS_ACOUSTIC_SIGNATURE")
    assert data["risk_level"] in ("LOW", "HIGH", "CRITICAL")
    assert data["speech_duration_seconds"] > 0
    assert isinstance(data["flags"], list)
    assert data["processing_time_ms"] >= 0

    # Acoustic physical metrics verification
    metrics = data["acoustic_metrics"]
    assert metrics is not None, f"Scenario {scenario} missing acoustic_metrics"
    assert "wiener_flatness" in metrics
    assert "hf_cutoff_ratio" in metrics
    assert "zcr_variance" in metrics
    assert "rms_prosody_variance" in metrics

    # Verify no NaN or Inf in float values
    for k, v in metrics.items():
        assert not np.isnan(v), f"Metric {k} is NaN in scenario {scenario}"
        assert not np.isinf(v), f"Metric {k} is Inf in scenario {scenario}"
        assert v >= 0.0, f"Metric {k} is negative ({v}) in scenario {scenario}"

    # Scorecard verification
    scorecard = data["scorecard"]
    assert scorecard is not None, f"Scenario {scenario} missing scorecard"
    assert "spectral_score" in scorecard
    assert "temporal_inconsistency" in scorecard
    assert 0.0 <= scorecard["spectral_score"] <= 1.0
    assert 0.0 <= scorecard["temporal_inconsistency"] <= 1.0


def test_audio_detect_database_catalog_insertion(client):
    """
    Empirically verify that POST /api/v1/detect/audio inserts an entry into
    SQLite threat_catalog and stores the physical media file on disk.
    """
    wav_bytes = generate_wave_bytes(duration_sec=1.2, wave_type="harmonic_complex")
    sha_hash = hashlib.sha256(wav_bytes).hexdigest()
    test_filename = f"verify_db_insert_{sha_hash[:8]}.wav"

    resp = client.post(
        "/api/v1/detect/audio",
        files={"file": (test_filename, wav_bytes, "audio/wav")}
    )
    assert resp.status_code == 200
    res_data = resp.json()

    # Query SQLite database directly
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, type, threat_category, fake_probability, verdict, risk_level,
               media_url, extracted_iocs, fir_dossier
        FROM threat_catalog
        WHERE extracted_iocs LIKE ? OR title LIKE ?
        ORDER BY rowid DESC
        LIMIT 1
    """, (f"%{sha_hash}%", f"%{test_filename}%"))
    row = cursor.fetchone()
    conn.close()

    assert row is not None, f"Item with hash {sha_hash} was not found in SQLite threat_catalog!"

    row_dict = dict(row)
    item_id = row_dict["id"]
    assert item_id.startswith("SCAN-"), f"Expected SCAN- ID prefix, got {item_id}"
    assert row_dict["type"] == "audio_clone"
    assert row_dict["threat_category"] in ("VOICE_CLONE", "VERIFIED_AUTHENTIC")
    assert row_dict["verdict"] in ("AUTHENTIC_SPEECH", "VOICE_CLONE", "VOICE_CLONE_DETECTED", "SUSPICIOUS_ACOUSTIC_SIGNATURE", "AUTHENTIC")

    # Verify physical file persistence on disk
    media_url = row_dict["media_url"]
    assert media_url is not None
    assert "/api/v1/media/uploads/" in media_url

    # Check that the physical file actually exists in uploads directory
    disk_filename = os.path.basename(media_url)
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_path = os.path.join(repo_root, "backend", "media", "uploads", disk_filename)
    assert os.path.isfile(upload_path), f"Uploaded file not found on disk at {upload_path}"
    assert os.path.getsize(upload_path) == len(wav_bytes)

    # Verify extracted_iocs structure in DB
    iocs = json.loads(row_dict["extracted_iocs"]) if isinstance(row_dict["extracted_iocs"], str) else row_dict["extracted_iocs"]
    assert iocs["sample_rate_hz"] == 16000
    assert iocs["codec"] == "PCM 16-bit mono"
    assert iocs["sha256_hash"] == sha_hash
    assert "acoustic_metrics" in iocs
    assert "scorecard" in iocs


def test_audio_detect_codec_magic_bytes(client):
    """
    Challenge audio codec auto-detection with different headers and formats.
    """
    # 1. MP3 header payload
    mp3_dummy = b"ID3\x03\x00\x00\x00\x00\x00#TIT2\x00\x00\x00\x05\x00\x00\x00Test" + b"\xff\xfb\x90d\x00" * 50
    resp_mp3 = client.post("/api/v1/detect/audio", files={"file": ("voice_memo.mp3", mp3_dummy, "audio/mpeg")})
    assert resp_mp3.status_code == 200
    assert resp_mp3.json()["codec"] == "MP3"

    # 2. OPUS / OGG header payload
    ogg_dummy = b"OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00" + b"OpusHead\x01\x01\x00\x00\x80\xbb\x00\x00\x00\x00\x00" + b"\x00" * 100
    resp_ogg = client.post("/api/v1/detect/audio", files={"file": ("audio_note.ogg", ogg_dummy, "audio/ogg")})
    assert resp_ogg.status_code == 200
    assert resp_ogg.json()["codec"] == "OPUS"


def test_audio_detect_error_boundaries(client):
    """
    Verify rejection of empty or sub-64-byte payload with HTTP 400.
    """
    tiny_bytes = b"RIFF" + b"\x00" * 10
    resp = client.post("/api/v1/detect/audio", files={"file": ("corrupt.wav", tiny_bytes, "audio/wav")})
    assert resp.status_code == 400
    assert "empty or corrupted" in resp.json()["detail"].lower()


# ==============================================================================
# 2. FIR PDF GENERATION ACROSS ALL 5 MODALITIES
# ==============================================================================

MODALITIES_CONFIG = [
    {
        "modality_name": "Audio Voice Clone",
        "item": {
            "id": "CHALLENGE-AUD-01",
            "title": "Adversarial Deepfake Voice Note Impersonating Police Officer",
            "type": "audio_clone",
            "threat_category": "VOICE_CLONE",
            "source_platform": "WhatsApp Voice Note",
            "fake_probability": 0.93,
            "verdict": "VOICE_CLONE_DETECTED",
            "risk_level": "CRITICAL",
            "city": "Hyderabad",
            "state": "Telangana",
            "extracted_iocs": {
                "duration_seconds": 6.8,
                "sample_rate_hz": 16000,
                "codec": "PCM 16-bit mono",
                "sha256_hash": "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
                "acoustic_flags": ["vocoder_synthetic_artifacts", "vocoder_spectral_flatness_anomaly"],
                "acoustic_metrics": {
                    "wiener_flatness": 0.412,
                    "hf_cutoff_ratio": 0.015,
                    "zcr_variance": 0.00035,
                    "rms_prosody_variance": 0.138
                },
                "scorecard": {
                    "wav2vec2_score": 0.95,
                    "spectral_score": 0.93,
                    "temporal_inconsistency": 0.38
                },
                "tavily_threat_intel": {
                    "articles": [
                        {"title": "Cybercrime Advisory: Rise of AI Voice Clone Extortion in South India", "url": "https://cybercrime.gov.in/advisories/voice-clone"}
                    ]
                }
            },
            "fir_dossier": {
                "incident_summary": "Extortion call utilizing synthetic neural vocoder impersonating family member in judicial custody."
            }
        },
        "expected_substrings": [
            "CYBER CRIME INCIDENT REPORT",
            "Audio Voice Clone Forensic Inspection",
            "Wiener Spectral Flatness",
            "16,000 Hz",
            "Dial 1930",
            "Section 66D",
            "Section 318(4)"
        ]
    },
    {
        "modality_name": "Image Pure Face (Branch A)",
        "item": {
            "id": "CHALLENGE-IMG-FACE-01",
            "title": "Manipulated Political Portrait with Multi-Subject Synthesis",
            "type": "image_deepfake",
            "threat_category": "FACE_SWAP",
            "fake_probability": 0.96,
            "verdict": "DEEPFAKE",
            "risk_level": "CRITICAL",
            "city": "New Delhi",
            "state": "Delhi",
            "extracted_iocs": {
                "analysis_mode": "pure_face",
                "facial_analysis": {
                    "face_count": 2,
                    "max_fake_probability": 0.96,
                    "composite_face_verdict": "DEEPFAKE",
                    "faces": [
                        {
                            "face_id": "face_1",
                            "bbox": [100, 80, 220, 240],
                            "fake_probability": 0.96,
                            "verdict": "DEEPFAKE",
                            "risk_level": "CRITICAL",
                            "anomaly_region": "Eyewear / Specular Glare Plane",
                            "evidence_code": "EVD-EYE-SPECULAR-GLARE",
                            "neural_metrics": {
                                "sbi_artifact_level": 0.96,
                                "ocular_reflection_symmetry": 0.28,
                                "eyewear_specular_score": 72.4,
                                "lip_sync_laplacian_score": 15.6
                            }
                        },
                        {
                            "face_id": "face_2",
                            "bbox": [320, 90, 210, 230],
                            "fake_probability": 0.12,
                            "verdict": "AUTHENTIC",
                            "risk_level": "LOW",
                            "anomaly_region": "Natural Dermal Gradient",
                            "evidence_code": "EVD-NATURAL-SKIN",
                            "neural_metrics": {
                                "sbi_artifact_level": 0.12,
                                "ocular_reflection_symmetry": 0.88,
                                "eyewear_specular_score": 14.1,
                                "lip_sync_laplacian_score": 4.2
                            }
                        }
                    ]
                }
            }
        },
        "expected_substrings": [
            "CYBER CRIME INCIDENT REPORT",
            "Photographic Evidence",
            "Multi-Face Forensic Breakdown Scorecard",
            "Eyewear / Specular Glare Plane",
            "SpatialSBIDetector",
            "Section 66D",
            "Section 318(4)"
        ]
    },
    {
        "modality_name": "Image Document Scam (Branch B)",
        "item": {
            "id": "CHALLENGE-IMG-DOC-01",
            "title": "Fraudulent Electricity Disconnection Notice with Malicious Payment Links",
            "type": "image_deepfake",
            "threat_category": "ELECTRICITY_KYC",
            "fake_probability": 0.94,
            "verdict": "CONFIRMED ELECTRICITY BILL FRAUD",
            "risk_level": "CRITICAL",
            "city": "Lucknow",
            "state": "Uttar Pradesh",
            "extracted_iocs": {
                "analysis_mode": "document",
                "phones": ["+91 9839012345"],
                "upis": ["discom.bill@icici"],
                "urls": ["https://uppcl-bill-pay.xyz"],
                "apks": ["uppcl_update.apk"],
                "ocr_analysis": {
                    "engine": "RapidOCR (ONNX Engine)",
                    "lines_count": 9,
                    "processing_time_ms": 38,
                    "full_text": "URGENT ELECTRICITY DISCONNECTION NOTICE. YOUR POWER WILL BE CUT OFF TONIGHT AT 9:30 PM. CALL 9839012345 TO CLEAR BILL."
                },
                "scam_analysis": {
                    "is_scam": True,
                    "risk_score": 94,
                    "risk_level": "CRITICAL",
                    "scam_type": "electricity_disconnection_fraud",
                    "matched_rules": ["power_disconnection_threat", "urgent_payment_lure"]
                }
            }
        },
        "expected_substrings": [
            "CYBER CRIME INCIDENT REPORT",
            "Extracted Document OCR Text",
            "Indicators of Compromise",
            "+91 9839012345",
            "discom.bill@icici",
            "TAFCOP",
            "Section 66D",
            "Section 318(4)"
        ]
    },
    {
        "modality_name": "Image Hybrid (Branch C)",
        "item": {
            "id": "CHALLENGE-IMG-HYBRID-01",
            "title": "Composite Digital Arrest Warrant with Localized CBI Official Likeness",
            "type": "image_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "fake_probability": 0.97,
            "verdict": "CONFIRMED DIGITAL ARREST EXTORTION",
            "risk_level": "CRITICAL",
            "city": "Pune",
            "state": "Maharashtra",
            "extracted_iocs": {
                "analysis_mode": "hybrid",
                "phones": ["+91 9123987654"],
                "upis": ["cbi.hq.escrow@sbi"],
                "urls": ["https://cbi-digital-arrest-clearance.in"],
                "facial_analysis": {
                    "face_count": 1,
                    "max_fake_probability": 0.97,
                    "composite_face_verdict": "DEEPFAKE",
                    "faces": [
                        {
                            "face_id": "face_1",
                            "bbox": [90, 70, 190, 210],
                            "fake_probability": 0.97,
                            "verdict": "DEEPFAKE",
                            "risk_level": "CRITICAL",
                            "anomaly_region": "CBI Officer Uniform & Facial Boundary",
                            "evidence_code": "EVD-POLICE-UNIFORM-SEAM",
                            "neural_metrics": {
                                "sbi_artifact_level": 0.97,
                                "ocular_reflection_symmetry": 0.25,
                                "eyewear_specular_score": 68.0,
                                "lip_sync_laplacian_score": 10.5
                            }
                        }
                    ]
                },
                "ocr_analysis": {
                    "engine": "RapidOCR (ONNX Engine)",
                    "lines_count": 14,
                    "processing_time_ms": 52,
                    "full_text": "CENTRAL BUREAU OF INVESTIGATION SUMMONS. YOU ARE SUBJECT TO DIGITAL ARREST. PAY PENALTY TO AVOID IMMEDIATE PHYSICAL DETENTION."
                },
                "scam_analysis": {
                    "is_scam": True,
                    "risk_score": 97,
                    "risk_level": "CRITICAL",
                    "scam_type": "digital_arrest",
                    "matched_rules": ["cbi_impersonation", "digital_arrest_extortion"]
                }
            }
        },
        "expected_substrings": [
            "CYBER CRIME INCIDENT REPORT",
            "Multi-Modal Hybrid Forensics",
            "COMPOSITE HYBRID THREAT VERDICT",
            "Photographic Evidence",
            "Part II: Document Scam Intelligence",
            "+91 9123987654",
            "cbi.hq.escrow@sbi",
            "Section 66D",
            "Section 318(4)"
        ]
    },
    {
        "modality_name": "Video Deepfake",
        "item": {
            "id": "CHALLENGE-VID-01",
            "title": "High-Profile Cabinet Minister Deepfake Video Speech",
            "type": "video_deepfake",
            "threat_category": "IMPERSONATION",
            "fake_probability": 0.98,
            "verdict": "EDITED_VIDEO_FACE_SWAP",
            "risk_level": "CRITICAL",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "extracted_iocs": {
                "phones": ["+91 9840112233"],
                "upis": ["scam.relief.fund@hdfc"],
                "urls": ["https://viral-deepfake-relief.org"],
                "keyframe_snapshots": [
                    {
                        "frame_number": 64,
                        "timestamp": "00:02.13",
                        "anomaly_region": "Iris Glint Discontinuity & Temporal Jitter",
                        "anomaly_score": 0.98,
                        "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI",
                        "forensic_finding": "Ocular glint vector angle dissonant with studio key lighting."
                    }
                ]
            },
            "fir_dossier": {
                "incident_summary": "Synthetically fabricated video speech generated via diffusion face-swapping targeting democratic institutions."
            }
        },
        "expected_substrings": [
            "CYBER CRIME INCIDENT REPORT",
            "Executive Incident Summary",
            "Technical Indicators of Compromise",
            "Applicable Legal Provisions",
            "Section 66D",
            "Section 318(4)"
        ]
    }
]


@pytest.mark.parametrize("modality", MODALITIES_CONFIG, ids=[m["modality_name"] for m in MODALITIES_CONFIG])
def test_fir_pdf_generation_5_modalities(client, modality):
    """
    Challenge GET /threat-intelligence/{threat_id}/fir-pdf for all 5 modalities:
    1. Audio Voice Clone
    2. Image Pure Face (Branch A)
    3. Image Document Scam (Branch B)
    4. Image Hybrid (Branch C)
    5. Video Deepfake

    Verification Checklist:
    - Status code 200, Content-Type application/pdf, Content-Disposition header.
    - PDF byte stream is non-empty (>3KB) and starts with %PDF-1.
    - Render every page using pypdfium2, asserting non-corrupted rendering and positive dimensions.
    - Extract all text across pages and verify mandatory expected forensic headers.
    - CRITICAL MANDATE: Zero occurrences of "Section 63", "Section 65B", "65B", or "Section 63 BSA".
    """
    mod_name = modality["modality_name"]
    item_dict = modality["item"]
    expected_substrings = modality["expected_substrings"]

    # Insert item into catalog
    tid = insert_threat_item(item_dict)
    assert tid is not None

    # Fetch generated FIR PDF
    resp = client.get(f"/api/v1/threat-intelligence/{tid}/fir-pdf")
    assert resp.status_code == 200, f"Failed to generate PDF for {mod_name}: {resp.status_code}"
    assert resp.headers.get("content-type") == "application/pdf"
    assert f"NETRA_FIR_{tid}.pdf" in resp.headers.get("content-disposition", "")

    pdf_bytes = resp.content
    assert pdf_bytes.startswith(b"%PDF-1."), f"PDF header corrupt for {mod_name}"
    assert len(pdf_bytes) > 3000, f"PDF byte stream abnormally small ({len(pdf_bytes)} bytes) for {mod_name}"

    # Render with pypdfium2
    doc = pypdfium2.PdfDocument(pdf_bytes)
    page_count = len(doc)
    assert page_count >= 1, f"PDF has 0 pages for {mod_name}"

    extracted_pages_text = []
    for page_idx in range(page_count):
        page = doc[page_idx]
        # Empirical raster rendering verification (detects corrupted drawing commands)
        bitmap = page.render(scale=1.5)
        pil_img = bitmap.to_pil()
        assert pil_img.width > 500, f"Rendered page width too small ({pil_img.width}px) on page {page_idx}"
        assert pil_img.height > 500, f"Rendered page height too small ({pil_img.height}px) on page {page_idx}"

        text_page = page.get_textpage()
        page_text = text_page.get_text_range()
        extracted_pages_text.append(page_text)

    full_text = " ".join(" ".join(extracted_pages_text).split())

    # Verify presence of mandatory expected strings
    for expected in expected_substrings:
        assert expected in full_text, (
            f"[{mod_name}] Missing expected forensic text: '{expected}' in PDF!\n"
            f"Extracted Text Excerpt: {full_text[:400]}..."
        )

    # ==============================================================================
    # CRITICAL MANDATE: ABSOLUTE EXCLUSION OF SECTION 63 / 65B
    # ==============================================================================
    prohibited_citations = [
        "Section 63",
        "Section 65B",
        "65B",
        "Section 63 BSA",
        "BSA 2023 certificate",
        "Indian Evidence Act",
        "BSA Section 63",
        "IEA Section 65B"
    ]

    for prohibited in prohibited_citations:
        assert prohibited.lower() not in full_text.lower(), (
            f"VIOLATION: Prohibited legal citation '{prohibited}' found in generated FIR PDF for modality '{mod_name}'!\n"
            f"Offending text snippet: ...{full_text[max(0, full_text.lower().find(prohibited.lower())-50):full_text.lower().find(prohibited.lower())+100]}..."
        )


def test_fir_pdf_nonexistent_threat_returns_404(client):
    """Verify clean 404 response for unknown incident ID."""
    resp = client.get("/api/v1/threat-intelligence/NON-EXISTENT-THREAT-XYZ-999/fir-pdf")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_fir_pdf_adversarial_missing_iocs(client):
    """
    Stress-test PDF generation against sparse records with missing IOCs,
    None values, and empty structures. Must not crash or error with 500.
    """
    sparse_id = insert_threat_item({
        "id": "SPARSE-THREAT-01",
        "title": "Minimal Sparse Forensic Incident",
        "type": "audio_clone",
        "threat_category": "VOICE_CLONE",
        "fake_probability": 0.85,
        "verdict": "SUSPICIOUS",
        "risk_level": "HIGH",
        "extracted_iocs": None,
        "fir_dossier": None
    })

    resp = client.get(f"/api/v1/threat-intelligence/{sparse_id}/fir-pdf")
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF-1.")

    doc = pypdfium2.PdfDocument(resp.content)
    assert len(doc) >= 1
    full_text = " ".join([page.get_textpage().get_text_range() for page in doc])
    assert "Section 63" not in full_text
    assert "Section 65B" not in full_text
    assert "65B" not in full_text
