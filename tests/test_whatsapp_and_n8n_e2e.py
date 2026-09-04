"""
tests/test_whatsapp_and_n8n_e2e.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
End-to-End Test Suite for:
1. NETRA WhatsApp Webhook (Meta Cloud API Native)
2. State Machine & Strict Modality Gating
3. 24h Scam Intelligence Bulletin (/updates)
4. n8n Ingestion Contract (POST /api/v1/ingest/bot & confirm-report)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

import sys
from pathlib import Path
BACKEND_PATH = str(Path(__file__).parent.parent / "backend")
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

from api.server import app
from api.routes.whatsapp_webhook import _user_sessions, _handle_user_message

client = TestClient(app)


def test_whatsapp_status_endpoint():
    """Verify diagnostic status endpoint."""
    resp = client.get("/api/v1/whatsapp/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert "channels" in data
    assert "meta_cloud_api" in data["channels"]
    assert data["channels"]["meta_cloud_api"]["status"] == "active"
    assert "supported_commands" in data


def test_meta_webhook_verification_handshake():
    """Verify Meta Webhook GET challenge validation."""
    # Valid handshake
    resp = client.get("/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=netra_whatsapp_verify_token_2026&hub.challenge=CHALLENGE_ACCEPTED_123")
    assert resp.status_code == 200
    assert resp.text == "CHALLENGE_ACCEPTED_123"

    # Invalid token
    resp_invalid = client.get("/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test")
    assert resp_invalid.status_code == 403


def test_meta_menu_and_state_machine():
    """Verify Meta handler, menu trigger, and state transitions."""
    async def _run_test():
        test_sender = "whatsapp:+919888877777"
        clean_sender = "919888877777"

        # 1. Send 'menu'
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(sender=test_sender, channel="meta", text="menu")
            assert mock_send.called
            sent_text = mock_send.call_args[0][1]
            assert "NETRA Institutional Threat Intelligence" in sent_text
            assert clean_sender not in _user_sessions

        # 2. Select '1' to enter AWAITING_TEXT state
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(sender=test_sender, channel="meta", text="1")
            assert _user_sessions.get(clean_sender) == "AWAITING_TEXT"

        # 3. Test Modality Gating ('others neglect') - Send image while in AWAITING_TEXT
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="meta",
                text="",
                media_type="image",
                media_id="mock_meta_img_id"
            )
            sent_text = mock_send.call_args[0][1]
            assert "You selected *Scan Text*" in sent_text
            assert "Please send text only" in sent_text
            # Still awaiting text
            assert _user_sessions.get(clean_sender) == "AWAITING_TEXT"

        # 4. Send actual scam text while in AWAITING_TEXT
        scam_msg = "URGENT: Your electricity connection will be disconnected tonight by 9:30 PM. Call electricity officer at 9876543210 immediately."
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="meta",
                text=scam_msg,
                media_type="text"
            )
            # Session state popped
            assert clean_sender not in _user_sessions
            # Verified alert sent
            assert mock_send.called
            found_alert = False
            for call in mock_send.call_args_list:
                text_body = call[0][1]
                if "NETRA CRIME ALERT" in text_body or "FRAUD" in text_body:
                    found_alert = True
                    assert "Statutory Violations" in text_body
                    break
            assert found_alert

    asyncio.run(_run_test())


def test_scam_updates_command():
    """Verify /updates command fetches bulletin."""
    async def _run():
        test_sender = "whatsapp:+919999988888"
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(sender=test_sender, channel="meta", text="/updates")
            assert mock_send.called
            sent_text = mock_send.call_args[0][1]
            assert "NETRA 24h National Cyber Threat Bulletin" in sent_text

    asyncio.run(_run())


def test_n8n_bot_ingest_and_confirm_workflow():
    """Verify complete n8n contract: ingest -> analyze -> confirm report."""
    headers = {"X-Bot-Secret": "netra_bot_secret_2026"}

    # 1. Ingest scam text via n8n
    payload = {
        "media_type": "text",
        "content": "Dear customer, your bank account is suspended due to pending KYC. Update PAN at http://sbi-kyc-update.com or call 9123456789.",
        "sender_id": "whatsapp:+919876543210",
        "source_platform": "whatsapp"
    }
    resp = client.post("/api/v1/ingest/bot", json=payload, headers=headers)
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["is_scam"] is True
    assert data["risk_score"] >= 70
    assert data["can_report"] is True
    assert data["report_token"] is not None

    # 2. Confirm report via n8n (indexes into Threat Catalog)
    report_token = data["report_token"]
    confirm_payload = {
        "report_token": report_token,
        "title": "n8n Automated Test Ingest",
        "city": "Bengaluru",
        "state": "Karnataka",
        "source_platform": "whatsapp"
    }
    confirm_resp = client.post("/api/v1/ingest/bot/confirm-report", json=confirm_payload, headers=headers)
    assert confirm_resp.status_code == 200, f"Error: {confirm_resp.text}"
    confirm_data = confirm_resp.json()
    assert confirm_data["status"] == "reported"
    assert confirm_data["catalog_id"].startswith("THREAT-")


def test_image_and_video_whatsapp_scans():
    async def _run():
        test_sender = "whatsapp:+919876500001"
        clean_sender = "919876500001"

        # --- Test Image Flow ---
        # 1. Choose Option 2
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            await _handle_user_message(sender=test_sender, channel="meta", text="2")
            assert _user_sessions.get(clean_sender) == "AWAITING_IMAGE"

        # 2. Upload Image (mock downloading 1x1 png bytes via Meta Cloud API media_id)
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        with patch("api.routes.whatsapp_webhook.download_meta_media", new_callable=AsyncMock) as mock_dl, \
             patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_dl.return_value = png_bytes
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="meta",
                text="",
                media_type="image",
                media_id="meta_img_media_123"
            )
            assert clean_sender not in _user_sessions
            assert mock_send.called
            # Verify response mentions catalog and verdict
            found = False
            for call in mock_send.call_args_list:
                msg = call[0][1]
                if "Threat Catalog ID" in msg or "Forensic Ledger" in msg or "NETRA" in msg:
                    found = True
                    break
            assert found

        # --- Test Video Flow ---
        # 1. Choose Option 3
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            await _handle_user_message(sender=test_sender, channel="meta", text="3")
            assert _user_sessions.get(clean_sender) == "AWAITING_VIDEO"

        # 2. Upload Video via Meta Cloud API media_id
        fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
        with patch("api.routes.whatsapp_webhook.download_meta_media", new_callable=AsyncMock) as mock_dl, \
             patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_dl.return_value = fake_mp4
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="meta",
                text="",
                media_type="video",
                media_id="meta_vid_media_456"
            )
            assert clean_sender not in _user_sessions
            assert mock_send.called
            found_video_catalog = False
            for call in mock_send.call_args_list:
                msg = call[0][1]
                if "threat-intelligence" in msg and "media" in msg:
                    found_video_catalog = True
                    break
            assert found_video_catalog

    asyncio.run(_run())


def test_tavily_search_command():
    """Verify /search command queries Tavily intelligence store."""
    async def _run():
        test_sender = "919999900000"
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(sender=test_sender, channel="meta", text="/search digital arrest")
            assert mock_send.called
            found = False
            for call in mock_send.call_args_list:
                msg = call[0][1]
                if "Tavily Live Threat Intelligence" in msg or "Tavily" in msg:
                    found = True
                    break
            assert found

    asyncio.run(_run())


def test_bot_secret_auth_enforcement_on_ingest_and_confirm():
    """Verify HTTP 401 Unauthorized is returned when X-Bot-Secret is missing or invalid."""
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


def test_4_modality_ingestion_and_statutory_citations():
    """Verify 4 modalities (text, image, video, audio) ingest and format statutory citations."""
    import base64
    import io
    import wave
    import numpy as np
    from PIL import Image

    headers = {"X-Bot-Secret": "netra_bot_secret_2026"}

    # 1. Text Modality
    r_text = client.post("/api/v1/ingest/bot", json={
        "media_type": "text",
        "content": "URGENT: Your electricity connection will be suspended tonight at 9:30 PM. Call officer at 9876543210 immediately.",
        "sender_id": "919876543210"
    }, headers=headers)
    assert r_text.status_code == 200
    d_text = r_text.json()
    assert d_text["status"] == "success"
    assert d_text["is_scam"] is True
    assert "BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D" in d_text["analysis_reason"]
    assert "1930" in d_text["analysis_reason"]
    assert "Section 63 BSA" not in d_text["analysis_reason"]
    assert "Section 65B" not in d_text["analysis_reason"]

    # 2. Image Modality
    buf_img = io.BytesIO()
    Image.new("RGB", (32, 32), color="blue").save(buf_img, format="PNG")
    img_b64 = base64.b64encode(buf_img.getvalue()).decode()
    r_img = client.post("/api/v1/ingest/bot", json={
        "media_type": "image",
        "content": f"data:image/png;base64,{img_b64}",
        "sender_id": "919876543210"
    }, headers=headers)
    assert r_img.status_code == 200
    assert r_img.json()["status"] == "success"
    assert r_img.json()["report_token"] is not None

    # 3. Video Modality
    fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
    r_vid = client.post("/api/v1/ingest/bot", json={
        "media_type": "video",
        "content": f"data:video/mp4;base64,{base64.b64encode(fake_mp4).decode()}",
        "sender_id": "919876543210"
    }, headers=headers)
    assert r_vid.status_code == 200
    d_vid = r_vid.json()
    assert d_vid["status"] == "success"
    assert d_vid["is_scam"] is True
    assert d_vid["scam_type"] == "video_face_swap"
    assert "BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D" in d_vid["analysis_reason"]

    # 4. Audio Modality
    buf_aud = io.BytesIO()
    with wave.open(buf_aud, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        np.random.seed(42)
        sig = (np.random.uniform(-0.8, 0.8, 48000) * 16000).astype(np.int16)
        wf.writeframes(sig.tobytes())
    r_aud = client.post("/api/v1/ingest/bot", json={
        "media_type": "audio",
        "content": f"data:audio/wav;base64,{base64.b64encode(buf_aud.getvalue()).decode()}",
        "sender_id": "919876543210"
    }, headers=headers)
    assert r_aud.status_code == 200
    d_aud = r_aud.json()
    assert d_aud["status"] == "success"
    assert d_aud["scam_type"] == "audio_voice_clone"
    assert "BNS 2023 Sec 318(4) & IT Act 2000 Sec 66D" in d_aud["analysis_reason"]


def test_bot_confirm_radar_indexing_and_media_typing():
    """Verify threat confirmation populates non-null lat/lng and preserves true media type."""
    import os
    import sqlite3
    import base64

    headers = {"X-Bot-Secret": "netra_bot_secret_2026"}

    # 1. Ingest Video & Confirm with Bengaluru
    fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
    vid_tok = client.post("/api/v1/ingest/bot", json={
        "media_type": "video",
        "content": f"data:video/mp4;base64,{base64.b64encode(fake_mp4).decode()}",
        "sender_id": "919876543210"
    }, headers=headers).json()["report_token"]

    conf_vid = client.post("/api/v1/ingest/bot/confirm-report", json={
        "report_token": vid_tok,
        "title": "Confirmed Deepfake Video Threat",
        "city": "Bengaluru",
        "state": "Karnataka"
    }, headers=headers).json()
    assert conf_vid["status"] == "reported"
    assert conf_vid["catalog_id"].startswith("THREAT-")
    assert conf_vid["lat"] == 12.9716
    assert conf_vid["lng"] == 77.5946
    assert conf_vid["radar_plotted"] is True

    # 2. Ingest Audio & Confirm with unlisted city -> Fallback New Delhi coordinates
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
    aud_tok = client.post("/api/v1/ingest/bot", json={
        "media_type": "audio",
        "content": f"data:audio/wav;base64,{base64.b64encode(buf.getvalue()).decode()}",
        "sender_id": "919876543210"
    }, headers=headers).json()["report_token"]

    conf_aud = client.post("/api/v1/ingest/bot/confirm-report", json={
        "report_token": aud_tok,
        "title": "Confirmed Audio Clone Threat",
        "city": "UnknownVillage"
    }, headers=headers).json()
    assert conf_aud["status"] == "reported"
    assert conf_aud["lat"] == 28.6139
    assert conf_aud["lng"] == 77.2090

    # 3. Verify SQLite DB schema constraints
    from api.db import DB_PATH
    db_path = os.getenv("NETRA_DB_PATH", DB_PATH)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    row_vid = cur.execute("SELECT id, type, lat, lng FROM threat_catalog WHERE id = ?", (conf_vid["catalog_id"],)).fetchone()
    row_aud = cur.execute("SELECT id, type, lat, lng FROM threat_catalog WHERE id = ?", (conf_aud["catalog_id"],)).fetchone()

    assert row_vid[1] == "video_deepfake"
    assert row_vid[2] is not None and row_vid[3] is not None
    assert row_aud[1] == "audio_clone"
    assert row_aud[2] is not None and row_aud[3] is not None
    conn.close()

    # 4. Check Geolocation Radar Markers
    radar_resp = client.get("/api/v1/threat-intelligence/radar")
    assert radar_resp.status_code == 200
    markers = radar_resp.json().get("markers", [])
    marker_ids = [m["id"] for m in markers]
    assert conf_vid["catalog_id"] in marker_ids

