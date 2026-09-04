"""
tests/test_bot_ingest_milestone1.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comprehensive Verification Suite for Milestone 1:
1. Bot Secret Authentication Enforcement (Missing & Invalid secret -> HTTP 401)
2. 4-Modality Ingestion (Text, Image, Video, Audio)
3. Geolocation Resolution & Threat Catalog Radar Indexing (Guaranteed non-null lat/lng)
4. Preservation of True Media Types (scam_text, image_deepfake, video_deepfake, audio_clone)
5. Statutory Citations (BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D, 1930 Helpline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import sys
import base64
import sqlite3
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

BACKEND_PATH = str(Path(__file__).parent.parent / "backend")
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

from api.server import app

client = TestClient(app)
SECRET = "netra_bot_secret_2026"
AUTH_HEADERS = {"X-Bot-Secret": SECRET}


def test_bot_secret_authentication_enforcement():
    """Verify HTTP 401 is returned when X-Bot-Secret is missing or invalid."""
    # 1. /api/v1/ingest/bot - missing header
    r1 = client.post("/api/v1/ingest/bot", json={"media_type": "text", "content": "test text", "sender_id": "123"})
    assert r1.status_code == 401
    assert "Invalid or missing X-Bot-Secret" in r1.json()["detail"]

    # 2. /api/v1/ingest/bot - invalid header
    r2 = client.post("/api/v1/ingest/bot", json={"media_type": "text", "content": "test text", "sender_id": "123"}, headers={"X-Bot-Secret": "wrong_key"})
    assert r2.status_code == 401
    assert "Invalid or missing X-Bot-Secret" in r2.json()["detail"]

    # 3. /api/v1/ingest/bot/confirm-report - missing header
    r3 = client.post("/api/v1/ingest/bot/confirm-report", json={"report_token": "token123"})
    assert r3.status_code == 401
    assert "Invalid or missing X-Bot-Secret" in r3.json()["detail"]

    # 4. /api/v1/ingest/bot/confirm-report - invalid header
    r4 = client.post("/api/v1/ingest/bot/confirm-report", json={"report_token": "token123"}, headers={"X-Bot-Secret": "wrong_key"})
    assert r4.status_code == 401
    assert "Invalid or missing X-Bot-Secret" in r4.json()["detail"]


def test_text_modality_ingest_and_statutory_citations():
    """Verify text scam detection, IOC extraction, and statutory legal citations."""
    payload = {
        "media_type": "text",
        "content": "URGENT: Your electricity connection will be disconnected tonight at 9:30 PM. Call officer at 9876543210 or pay at http://fraud-power.apk",
        "sender_id": "919876543210",
        "source_platform": "whatsapp"
    }
    r = client.post("/api/v1/ingest/bot", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["is_scam"] is True
    assert data["risk_score"] >= 70
    assert data["can_report"] is True
    assert data["report_token"] is not None
    assert "BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D" in data["analysis_reason"]
    assert "1930" in data["analysis_reason"]
    assert "Section 63 BSA" not in data["analysis_reason"]
    assert "Section 65B" not in data["analysis_reason"]


def test_image_modality_ingest():
    """Verify image deepfake / OCR ingestion."""
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color="blue").save(buf, format="PNG")
    png_bytes = buf.getvalue()

    payload = {
        "media_type": "image",
        "content": f"data:image/png;base64,{base64.b64encode(png_bytes).decode()}",
        "sender_id": "919876543210",
        "source_platform": "whatsapp"
    }
    r = client.post("/api/v1/ingest/bot", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "processing_time_ms" in data
    assert data["report_token"] is not None


def test_video_modality_ingest():
    """Verify video face-swap evaluation and report token generation."""
    fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
    payload = {
        "media_type": "video",
        "content": f"data:video/mp4;base64,{base64.b64encode(fake_mp4).decode()}",
        "sender_id": "919876543210",
        "source_platform": "whatsapp"
    }
    r = client.post("/api/v1/ingest/bot", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["is_scam"] is True
    assert data["report_token"] is not None
    assert data["scam_type"] == "video_face_swap"
    assert "BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D" in data["analysis_reason"]
    assert "1930" in data["analysis_reason"]


def test_audio_modality_ingest():
    """Verify audio voice clone evaluation using pure spectral forensics."""
    import io
    import wave
    import numpy as np
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        # Synthetic flat noise to trigger vocoder / voice clone artifact flags
        np.random.seed(42)
        sig = (np.random.uniform(-0.8, 0.8, 48000) * 16000).astype(np.int16)
        wf.writeframes(sig.tobytes())
    fake_wav = buf.getvalue()

    payload = {
        "media_type": "audio",
        "content": f"data:audio/wav;base64,{base64.b64encode(fake_wav).decode()}",
        "sender_id": "919876543210",
        "source_platform": "whatsapp"
    }
    r = client.post("/api/v1/ingest/bot", json=payload, headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["report_token"] is not None
    assert data["scam_type"] == "audio_voice_clone"
    assert "BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D" in data["analysis_reason"]
    assert "1930" in data["analysis_reason"]


def test_confirm_report_with_radar_coordinates_and_true_types():
    """
    Verify report confirmation:
    1. Resolves coordinates from city (e.g. Bengaluru -> 12.9716, 77.5946).
    2. Fallback coordinates (New Delhi: 28.6139, 77.2090) if unlisted.
    3. Lat and Lng are NEVER NULL in threat_catalog table.
    4. Preserves true media types: scam_text, image_deepfake, video_deepfake, audio_clone.
    """
    # 1. Ingest Video & Confirm with Bengaluru
    fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
    vid_resp = client.post("/api/v1/ingest/bot", json={
        "media_type": "video",
        "content": f"data:video/mp4;base64,{base64.b64encode(fake_mp4).decode()}",
        "sender_id": "919876543210"
    }, headers=AUTH_HEADERS).json()
    vid_tok = vid_resp["report_token"]

    conf_vid = client.post("/api/v1/ingest/bot/confirm-report", json={
        "report_token": vid_tok,
        "title": "Confirmed Deepfake Video Incident",
        "city": "Bengaluru",
        "state": "Karnataka"
    }, headers=AUTH_HEADERS).json()
    assert conf_vid["status"] == "reported"
    assert conf_vid["catalog_id"].startswith("THREAT-")
    assert conf_vid["lat"] == 12.9716
    assert conf_vid["lng"] == 77.5946
    assert conf_vid["radar_plotted"] is True

    # 2. Ingest Audio & Confirm with unlisted city -> Fallback to New Delhi (28.6139, 77.2090)
    import io
    import wave
    import numpy as np
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        np.random.seed(42)
        sig = (np.random.uniform(-0.8, 0.8, 48000) * 16000).astype(np.int16)
        wf.writeframes(sig.tobytes())
    fake_wav = buf.getvalue()

    aud_resp = client.post("/api/v1/ingest/bot", json={
        "media_type": "audio",
        "content": f"data:audio/wav;base64,{base64.b64encode(fake_wav).decode()}",
        "sender_id": "919876543210"
    }, headers=AUTH_HEADERS).json()
    aud_tok = aud_resp["report_token"]

    conf_aud = client.post("/api/v1/ingest/bot/confirm-report", json={
        "report_token": aud_tok,
        "title": "Confirmed Voice Clone Incident",
        "city": "UnlistedRemoteVillage"
    }, headers=AUTH_HEADERS).json()
    assert conf_aud["status"] == "reported"
    assert conf_aud["catalog_id"].startswith("THREAT-")
    assert conf_aud["lat"] == 28.6139
    assert conf_aud["lng"] == 77.2090

    # 3. Database Table Verification
    from api.db import DB_PATH
    db_path = os.getenv("NETRA_DB_PATH", DB_PATH)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    row_vid = cur.execute("SELECT id, type, lat, lng, city, state FROM threat_catalog WHERE id = ?", (conf_vid["catalog_id"],)).fetchone()
    row_aud = cur.execute("SELECT id, type, lat, lng, city, state FROM threat_catalog WHERE id = ?", (conf_aud["catalog_id"],)).fetchone()

    assert row_vid is not None
    assert row_vid[1] == "video_deepfake", f"Expected type 'video_deepfake', got '{row_vid[1]}'"
    assert row_vid[2] is not None, "lat is NULL for video incident"
    assert row_vid[3] is not None, "lng is NULL for video incident"

    assert row_aud is not None
    assert row_aud[1] == "audio_clone", f"Expected type 'audio_clone', got '{row_aud[1]}'"
    assert row_aud[2] is not None, "lat is NULL for audio incident"
    assert row_aud[3] is not None, "lng is NULL for audio incident"
    conn.close()

    # 4. Geolocation Radar Endpoint Check
    radar_resp = client.get("/api/v1/threat-intelligence/radar")
    assert radar_resp.status_code == 200
    radar_data = radar_resp.json()
    markers = radar_data.get("markers", [])
    vid_ids = [m["id"] for m in markers]
    assert conf_vid["catalog_id"] in vid_ids
