"""
tests/test_whatsapp_and_n8n_e2e.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
End-to-End Test Suite for:
1. NETRA WhatsApp Webhook (Twilio Sandbox & Meta Cloud API)
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
    assert "twilio_sandbox" in data["channels"]
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


def test_twilio_menu_and_state_machine():
    """Verify Twilio handler, menu trigger, and state transitions."""
    async def _run_test():
        test_sender = "whatsapp:+919888877777"
        clean_sender = "919888877777"

        # 1. Send 'menu'
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(sender=test_sender, channel="twilio", text="menu")
            assert mock_send.called
            sent_text = mock_send.call_args[0][1]
            assert "NETRA Institutional Threat Intelligence" in sent_text
            assert clean_sender not in _user_sessions

        # 2. Select '1' to enter AWAITING_TEXT state
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(sender=test_sender, channel="twilio", text="1")
            assert _user_sessions.get(clean_sender) == "AWAITING_TEXT"

        # 3. Test Modality Gating ('others neglect') - Send image while in AWAITING_TEXT
        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="twilio",
                text="",
                media_type="image",
                media_url="https://example.com/test.jpg"
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
                channel="twilio",
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
            await _handle_user_message(sender=test_sender, channel="twilio", text="/updates")
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
            await _handle_user_message(sender=test_sender, channel="twilio", text="2")
            assert _user_sessions.get(clean_sender) == "AWAITING_IMAGE"

        # 2. Upload Image (mock downloading 1x1 png bytes)
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        with patch("api.routes.whatsapp_webhook.download_twilio_media", new_callable=AsyncMock) as mock_dl, \
             patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_dl.return_value = png_bytes
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="twilio",
                text="",
                media_type="image",
                media_url="https://api.twilio.com/mock-image.png"
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
            await _handle_user_message(sender=test_sender, channel="twilio", text="3")
            assert _user_sessions.get(clean_sender) == "AWAITING_VIDEO"

        # 2. Upload Video
        fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
        with patch("api.routes.whatsapp_webhook.download_twilio_media", new_callable=AsyncMock) as mock_dl, \
             patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_dl.return_value = fake_mp4
            mock_send.return_value = True
            await _handle_user_message(
                sender=test_sender,
                channel="twilio",
                text="",
                media_type="video",
                media_url="https://api.twilio.com/mock-video.mp4"
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
