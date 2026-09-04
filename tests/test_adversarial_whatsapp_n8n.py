"""
tests/test_adversarial_whatsapp_n8n.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Adversarial Stress Test Suite for:
1. Malformed and Boundary Meta Webhook GET/POST Handshake & Payload Processing
2. Bot Secret Authentication Enforcement, Header Tampering, and Replay Defense
3. 4-Modality Stress & Boundary Testing (Text, Image, Video, Audio, Unsupported)
4. Geolocation Non-Null Coordinates Invariant and True Media-Type Fidelity
5. Statutory Legal Citations (BNS 2023 Sec 318(4), IT Act 2000 Sec 66D, 1930 Helpline)
   and ZERO Repealed Citations (Sec 63 BSA / Sec 65B IEA)
6. Cross-Modality Gating & Session Isolation in WhatsApp State Machine
7. n8n Orchestrator Workflow Schema Strict Invariant Audit (Zero Twilio/Telegram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import io
import re
import json
import wave
import base64
import sqlite3
import asyncio
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

# Ensure backend path is on sys.path
import sys
BACKEND_PATH = str(Path(__file__).parent.parent / "backend")
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

# Set safe sandbox DB and media directories
os.environ.setdefault("NETRA_DB_PATH", "/tmp/netra_test.db")
os.environ.setdefault("NETRA_MEDIA_DIR", "/tmp/media")

from api.server import app
from api.routes.whatsapp_webhook import _user_sessions, _handle_user_message

client = TestClient(app)

WORKFLOW_PATH = Path(__file__).parent.parent / "n8n" / "netra_forensic_orchestrator_workflow.json"
BOT_SECRET = "netra_bot_secret_2026"
AUTH_HEADERS = {"X-Bot-Secret": BOT_SECRET}


# ── 1. MALFORMED WEBHOOK GET VERIFICATION HANDSHAKE ──────────────────────────

def test_meta_webhook_get_adversarial_parameters():
    """Adversarially probe Meta Webhook GET challenge verification."""
    # 1. Valid handshake
    valid_resp = client.get(
        "/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=netra_whatsapp_verify_token_2026&hub.challenge=CHALLENGE_ACCEPTED_999"
    )
    assert valid_resp.status_code == 200
    assert valid_resp.text == "CHALLENGE_ACCEPTED_999"

    # 2. Invalid hub.mode ("publish", "unsubscribe", empty)
    for bad_mode in ["publish", "unsubscribe", "none", "", "SUBSCRIBE"]:
        resp = client.get(
            f"/api/v1/whatsapp/webhook?hub.mode={bad_mode}&hub.verify_token=netra_whatsapp_verify_token_2026&hub.challenge=abc"
        )
        assert resp.status_code == 403, f"Failed on hub.mode={bad_mode}"

    # 3. Missing hub.mode
    resp_no_mode = client.get(
        "/api/v1/whatsapp/webhook?hub.verify_token=netra_whatsapp_verify_token_2026&hub.challenge=abc"
    )
    assert resp_no_mode.status_code == 403

    # 4. Invalid or tampered tokens
    adversarial_tokens = [
        "",
        "wrong_token",
        "netra_whatsapp_verify_token_2026_extra",
        "' OR '1'='1",
        "<script>alert(1)</script>",
        "../../etc/passwd",
        "null",
        "None"
    ]
    for bad_token in adversarial_tokens:
        resp = client.get(
            f"/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token={bad_token}&hub.challenge=abc"
        )
        assert resp.status_code == 403, f"Failed on token={bad_token}"

    # 5. Missing token
    resp_no_token = client.get("/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=abc")
    assert resp_no_token.status_code == 403

    # 6. Complex / long unicode challenge
    long_challenge = "CHALLENGE_" + "X" * 256 + "_🚀_₹1930"
    resp_long = client.get(
        f"/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=netra_whatsapp_verify_token_2026&hub.challenge={long_challenge}"
    )
    assert resp_long.status_code == 200
    assert resp_long.text == long_challenge


# ── 2. WEBHOOK POST REQUEST HANDLING & ERROR SHIELDING ───────────────────────

def test_meta_webhook_post_adversarial_payloads():
    """Verify HTTP POST /whatsapp/webhook rejects malformed inputs gracefully."""
    # 1. Non-JSON Content-Type
    resp_text = client.post(
        "/api/v1/whatsapp/webhook",
        content="hello world",
        headers={"Content-Type": "text/plain"}
    )
    assert resp_text.status_code == 415

    # 2. Malformed JSON syntax
    resp_malformed = client.post(
        "/api/v1/whatsapp/webhook",
        content="{invalid_json:",
        headers={"Content-Type": "application/json"}
    )
    assert resp_malformed.status_code == 400

    # 3. Empty JSON dictionary (should return 200 without throwing unhandled exception)
    resp_empty = client.post("/api/v1/whatsapp/webhook", json={})
    assert resp_empty.status_code == 200
    assert resp_empty.json() == {"status": "received"}

    # 4. Meta structure with empty entry
    resp_no_entries = client.post("/api/v1/whatsapp/webhook", json={"entry": []})
    assert resp_no_entries.status_code == 200

    # 5. Meta structure with missing changes/messages
    resp_no_msgs = client.post(
        "/api/v1/whatsapp/webhook",
        json={"entry": [{"changes": [{"value": {}}]}]}
    )
    assert resp_no_msgs.status_code == 200


# ── 3. AUTH ENFORCEMENT, TAMPERING & REPLAY ATTACK DEFENSE ────────────────────

def test_bot_secret_adversarial_auth():
    """Verify robust X-Bot-Secret authentication and tampering rejection."""
    endpoint_list = [
        ("/api/v1/ingest/bot", {"media_type": "text", "content": "Sample text", "sender_id": "919000000000"}),
        ("/api/v1/ingest/bot/confirm-report", {"report_token": "some_token"})
    ]

    for path, payload in endpoint_list:
        # Missing header
        r1 = client.post(path, json=payload)
        assert r1.status_code == 401, f"Missing header should return 401 on {path}"

        # Empty header
        r2 = client.post(path, json=payload, headers={"X-Bot-Secret": ""})
        assert r2.status_code == 401

        # Tampered headers
        for bad_secret in ["wrong_secret", "Bearer netra_bot_secret_2026", "admin", "' OR '1'='1"]:
            r3 = client.post(path, json=payload, headers={"X-Bot-Secret": bad_secret})
            assert r3.status_code == 401

        # Case-insensitive header name (FastAPI/Starlette specification)
        r4 = client.post(path, json=payload, headers={"x-bot-secret": BOT_SECRET})
        # Note: on /confirm-report with dummy token, it should pass auth (not 401) and return 404
        assert r4.status_code != 401


def test_bot_confirm_replay_attack_prevention():
    """Verify single-use report tokens: replay attack must return HTTP 404."""
    # Step 1: Ingest high scam text
    payload = {
        "media_type": "text",
        "content": "URGENT: Electricity connection will be cut off by 9:30 PM tonight. Call electricity officer at 9876543210 immediately to pay bill.",
        "sender_id": "919876543210"
    }
    ingest_resp = client.post("/api/v1/ingest/bot", json=payload, headers=AUTH_HEADERS)
    assert ingest_resp.status_code == 200
    token = ingest_resp.json()["report_token"]
    assert token is not None

    # Step 2: Confirm report first time (Expected: 200 reported)
    confirm_payload = {
        "report_token": token,
        "title": "Adversarial Replay Test Incident",
        "city": "Bengaluru",
        "state": "Karnataka"
    }
    r_first = client.post("/api/v1/ingest/bot/confirm-report", json=confirm_payload, headers=AUTH_HEADERS)
    assert r_first.status_code == 200
    assert r_first.json()["status"] == "reported"

    # Step 3: Replay attack (Re-submitting the same report token)
    r_replay = client.post("/api/v1/ingest/bot/confirm-report", json=confirm_payload, headers=AUTH_HEADERS)
    assert r_replay.status_code == 404
    assert "expired or invalid" in r_replay.json()["detail"].lower()


# ── 4. 4-MODALITY BOUNDARY STRESS & STATUTORY CITATIONS ───────────────────────

def test_text_modality_boundary_and_statutory_citations():
    """Adversarially test text modality edge cases, statutory citations, and negative checks."""
    # 1. Text too short (< 3 chars)
    r_short = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "text", "content": "hi", "sender_id": "919000000001"},
        headers=AUTH_HEADERS
    )
    assert r_short.status_code == 400
    assert "Text too short" in r_short.json()["detail"]

    # 2. Whitespace-only text
    r_spaces = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "text", "content": "     \n\t   ", "sender_id": "919000000001"},
        headers=AUTH_HEADERS
    )
    assert r_spaces.status_code == 400

    # 3. Benign / Legitimate text (Non-scam)
    benign_text = "Good morning! Can you please let me know the train timings from New Delhi to Bengaluru for tomorrow?"
    r_benign = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "text", "content": benign_text, "sender_id": "919000000001"},
        headers=AUTH_HEADERS
    )
    assert r_benign.status_code == 200
    d_benign = r_benign.json()
    assert d_benign["is_scam"] is False
    assert d_benign["risk_score"] < 40
    assert "SAFE" in d_benign["verdict"]

    # 4. Critical Scam Text (Electricity / KYC Extortion)
    scam_text = (
        "FINAL NOTICE: Dear consumer, your electric power connection will be permanently disconnected tonight at 9:30 PM "
        "due to overdue unpaid electricity bill. Contact Chief Officer at 9876543210 or update bill APK immediately to avoid disconnection."
    )
    r_scam = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "text", "content": scam_text, "sender_id": "919000000001"},
        headers=AUTH_HEADERS
    )
    assert r_scam.status_code == 200
    d_scam = r_scam.json()
    assert d_scam["is_scam"] is True
    assert d_scam["risk_score"] >= 70

    # STATUTORY CITATIONS AUDIT:
    reason = d_scam["analysis_reason"]
    assert "BNS 2023 Sec 318(4)" in reason, "Missing BNS 2023 Sec 318(4) citation"
    assert "IT Act 2000 Sec 66D" in reason, "Missing IT Act 2000 Sec 66D citation"
    assert "1930" in reason, "Missing 1930 helpline citation"

    # STRICT ABSENCE OF REPEALED CITATIONS:
    assert "Section 63 BSA" not in reason
    assert "63 BSA" not in reason
    assert "Section 65B" not in reason
    assert "65B" not in reason
    assert "Evidence Act" not in reason


def test_image_modality_corrupt_data_and_citations():
    """Verify Image modality resilience against corrupt data and statutory citations."""
    # 1. Corrupt base64 / invalid content
    r_corrupt = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "image", "content": "not_valid_base64!#%*", "sender_id": "919000000002"},
        headers=AUTH_HEADERS
    )
    assert r_corrupt.status_code == 200
    d_corrupt = r_corrupt.json()
    assert d_corrupt["status"] == "error"
    assert d_corrupt["can_report"] is False

    # 2. Empty content
    r_empty = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "image", "content": "", "sender_id": "919000000002"},
        headers=AUTH_HEADERS
    )
    assert r_empty.status_code == 200
    assert r_empty.json()["status"] == "error"

    # 3. Valid Base64 Image
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color="red").save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()
    r_valid = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "image", "content": f"data:image/png;base64,{img_b64}", "sender_id": "919000000002"},
        headers=AUTH_HEADERS
    )
    assert r_valid.status_code == 200
    d_valid = r_valid.json()
    assert d_valid["status"] == "success"
    assert d_valid["can_report"] is True
    assert d_valid["report_token"] is not None

    # Verify no repealed citations in image response
    assert "Section 63 BSA" not in d_valid["analysis_reason"]
    assert "Section 65B" not in d_valid["analysis_reason"]


def test_video_modality_corrupt_data_and_citations():
    """Verify Video modality resilience against corrupt inputs and statutory citations."""
    # 1. Corrupt data
    r_corrupt = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "video", "content": "bad_video_data_12345", "sender_id": "919000000003"},
        headers=AUTH_HEADERS
    )
    assert r_corrupt.status_code == 200
    assert r_corrupt.json()["status"] == "error"

    # 2. Valid video container stream bytes
    fake_mp4 = b'\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2mp41'
    r_valid = client.post(
        "/api/v1/ingest/bot",
        json={
            "media_type": "video",
            "content": f"data:video/mp4;base64,{base64.b64encode(fake_mp4).decode()}",
            "sender_id": "919000000003"
        },
        headers=AUTH_HEADERS
    )
    assert r_valid.status_code == 200
    d_vid = r_valid.json()
    assert d_vid["status"] == "success"
    assert d_vid["is_scam"] is True
    assert d_vid["scam_type"] == "video_face_swap"

    # Statutory Citations:
    reason = d_vid["analysis_reason"]
    assert "BNS 2023 Sec 318(4)" in reason
    assert "IT Act 2000 Sec 66D" in reason
    assert "1930" in reason

    # Repealed Citations Negative Check:
    assert "Section 63 BSA" not in reason
    assert "Section 65B" not in reason


def test_audio_modality_corrupt_data_and_citations():
    """Verify Audio modality resilience against corrupt inputs and statutory citations."""
    # 1. Corrupt data
    r_corrupt = client.post(
        "/api/v1/ingest/bot",
        json={"media_type": "audio", "content": "not_audio_bytes!", "sender_id": "919000000004"},
        headers=AUTH_HEADERS
    )
    assert r_corrupt.status_code == 200
    assert r_corrupt.json()["status"] == "error"

    # 2. Valid audio WAV stream
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        np.random.seed(42)
        sig = (np.random.uniform(-0.8, 0.8, 48000) * 16000).astype(np.int16)
        wf.writeframes(sig.tobytes())
    r_valid = client.post(
        "/api/v1/ingest/bot",
        json={
            "media_type": "audio",
            "content": f"data:audio/wav;base64,{base64.b64encode(buf.getvalue()).decode()}",
            "sender_id": "919000000004"
        },
        headers=AUTH_HEADERS
    )
    assert r_valid.status_code == 200
    d_aud = r_valid.json()
    assert d_aud["status"] == "success"
    assert d_aud["scam_type"] == "audio_voice_clone"

    # Statutory Citations:
    reason = d_aud["analysis_reason"]
    assert "BNS 2023 Sec 318(4)" in reason
    assert "IT Act 2000 Sec 66D" in reason
    assert "1930" in reason

    # Repealed Citations Negative Check:
    assert "Section 63 BSA" not in reason
    assert "Section 65B" not in reason


def test_unsupported_media_types():
    """Verify unsupported media types return graceful error responses without 500 crashes."""
    unsupported_types = ["pdf", "zip", "exe", "document", "spreadsheet", "unknown_modality"]
    for ut in unsupported_types:
        r = client.post(
            "/api/v1/ingest/bot",
            json={"media_type": ut, "content": "sample content", "sender_id": "919000000005"},
            headers=AUTH_HEADERS
        )
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "unsupported_media"
        assert d["can_report"] is False
        assert "Unsupported media type" in d["verdict"]


# ── 5. GEOLOCATION RADAR NON-NULL INVARIANT & TRUE MEDIA TYPE ────────────────

def test_geolocation_radar_non_null_invariants():
    """Verify coordinates are NEVER NULL when indexed into threat_catalog and radar."""
    cities_to_test = [
        ("Mumbai", "Maharashtra", 19.0760, 72.8777),
        ("Bengaluru", "Karnataka", 12.9716, 77.5946),
        ("Kolkata", "West Bengal", 22.5726, 88.3639),
        ("UnlistedRemoteVillageXYZ", None, 28.6139, 77.2090),  # Fallback New Delhi
    ]

    for city, state, exp_lat, exp_lng in cities_to_test:
        # Ingest text scam
        ing_resp = client.post(
            "/api/v1/ingest/bot",
            json={
                "media_type": "text",
                "content": f"Scam incident occurred in {city}. Urgent payment requested to UPI test@upi.",
                "sender_id": "919999900001"
            },
            headers=AUTH_HEADERS
        )
        assert ing_resp.status_code == 200
        token = ing_resp.json()["report_token"]

        conf_resp = client.post(
            "/api/v1/ingest/bot/confirm-report",
            json={
                "report_token": token,
                "title": f"Threat in {city}",
                "city": city,
                "state": state
            },
            headers=AUTH_HEADERS
        )
        assert conf_resp.status_code == 200
        conf_data = conf_resp.json()

        # Invariant 1: Coordinates must not be null
        assert conf_data["lat"] is not None
        assert conf_data["lng"] is not None
        assert abs(conf_data["lat"] - exp_lat) < 0.01
        assert abs(conf_data["lng"] - exp_lng) < 0.01

        # Invariant 2: Type must be scam_text
        assert conf_data["type"] == "scam_text"

        # Invariant 3: Verify SQLite database row directly
        from api.db import DB_PATH
        db_path = os.getenv("NETRA_DB_PATH", DB_PATH)
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        row = cur.execute(
            "SELECT id, type, lat, lng, fir_dossier FROM threat_catalog WHERE id = ?",
            (conf_data["catalog_id"],)
        ).fetchone()
        conn.close()

        assert row is not None
        assert row[1] == "scam_text"
        assert row[2] is not None and row[3] is not None
        # Verify FIR dossier in SQLite
        fir = json.loads(row[4])
        assert "BNS 2023 Sec 318(4)" in fir["statutory_citations"]
        assert "1930" in fir["emergency_helpline"]


# ── 6. WHATSAPP BOT STATE MACHINE & MODALITY GATING STRESS ───────────────────

def test_whatsapp_state_machine_cross_modality_gating():
    """Adversarially verify that state machine isolates sessions and strictly gates modalities."""
    async def _run_stress():
        user1 = "whatsapp:+919111111111"
        clean1 = "919111111111"
        user2 = "whatsapp:+919222222222"
        clean2 = "919222222222"

        with patch("api.routes.whatsapp_webhook.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True

            # 1. User 1 chooses Option 1 (AWAITING_TEXT)
            await _handle_user_message(sender=user1, channel="meta", text="1")
            assert _user_sessions.get(clean1) == "AWAITING_TEXT"

            # 2. User 2 chooses Option 3 (AWAITING_VIDEO) concurrently
            await _handle_user_message(sender=user2, channel="meta", text="3")
            assert _user_sessions.get(clean2) == "AWAITING_VIDEO"
            assert _user_sessions.get(clean1) == "AWAITING_TEXT"  # Session isolation preserved

            # 3. User 1 sends video while in AWAITING_TEXT -> Neglect & Reject with warning
            await _handle_user_message(sender=user1, channel="meta", text="", media_type="video", media_id="vid_123")
            last_msg_user1 = mock_send.call_args_list[-1][0][1]
            assert "You selected *Scan Text*" in last_msg_user1
            assert "Please send text only" in last_msg_user1
            assert _user_sessions.get(clean1) == "AWAITING_TEXT"  # State maintained!

            # 4. User 2 sends text while in AWAITING_VIDEO -> Neglect & Reject with warning
            await _handle_user_message(sender=user2, channel="meta", text="Here is some text", media_type="text")
            last_msg_user2 = mock_send.call_args_list[-1][0][1]
            assert "You selected *Scan Video*" in last_msg_user2
            assert "Please send a video file" in last_msg_user2
            assert _user_sessions.get(clean2) == "AWAITING_VIDEO"  # State maintained!

            # 5. User 1 sends "menu" -> State cleared
            await _handle_user_message(sender=user1, channel="meta", text="menu")
            assert clean1 not in _user_sessions
            assert _user_sessions.get(clean2) == "AWAITING_VIDEO"  # User 2 state unchanged

            # 6. User 2 sends "menu" -> State cleared
            await _handle_user_message(sender=user2, channel="meta", text="menu")
            assert clean2 not in _user_sessions

    asyncio.run(_run_stress())


# ── 7. N8N WORKFLOW SCHEMA INVARIANT & ZERO-LEAKAGE AUDIT ─────────────────────

def test_n8n_workflow_strict_zero_leakage_and_citations():
    """Audit n8n workflow JSON for zero Twilio/Telegram leakage and statutory compliance."""
    assert WORKFLOW_PATH.exists()
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        wf_content = f.read()

    # Invariant 1: Strictly zero Twilio references
    assert "twilio" not in wf_content.lower(), "Found Twilio reference in n8n workflow JSON!"

    # Invariant 2: Strictly zero Telegram references
    assert "telegram" not in wf_content.lower(), "Found Telegram reference in n8n workflow JSON!"

    # Invariant 3: Strictly zero repealed citations (Sec 63 BSA / Sec 65B IEA)
    assert "section 63 bsa" not in wf_content.lower()
    assert "63 bsa" not in wf_content.lower()
    assert "section 65b" not in wf_content.lower()
    assert "65b iea" not in wf_content.lower()
    assert "evidence act" not in wf_content.lower()

    # Invariant 4: Mandatory statutory citations & Helpline 1930
    assert "BNS 2023 Sec 318(4)" in wf_content
    assert "IT Act 2000 Sec 66D" in wf_content
    assert "1930" in wf_content

    # Invariant 5: Verify all 4 modalities exist in switch rules
    wf_data = json.loads(wf_content)
    nodes = {n["name"]: n for n in wf_data["nodes"]}
    router_rules = nodes["Modality Router"]["parameters"]["rules"]["rules"]
    assert [r["value2"] for r in router_rules] == ["text", "image", "video", "audio"]

    # Invariant 6: Verify X-Bot-Secret header injection on all backend HTTP nodes
    backend_nodes = [
        "NETRA AI Text Evaluator",
        "NETRA AI Image Evaluator",
        "NETRA AI Video Evaluator",
        "NETRA AI Audio Evaluator",
        "Index in Threat Catalog"
    ]
    for b_node_name in backend_nodes:
        b_node = nodes[b_node_name]
        headers = b_node["parameters"]["headerParameters"]["parameters"]
        h_map = {h["name"]: h["value"] for h in headers}
        assert "X-Bot-Secret" in h_map, f"Missing X-Bot-Secret in node {b_node_name}"
        assert "BOT_SECRET_KEY" in h_map["X-Bot-Secret"]
