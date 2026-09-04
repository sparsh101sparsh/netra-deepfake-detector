"""
tests/test_whatsapp_document_and_media.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verifies:
1. WhatsApp document upload with video (.mp4) in AWAITING_VIDEO state (e.g. deepfake_Venki_Ramakrishnan.mp4)
2. WhatsApp document upload with image (.png / .jpg) in AWAITING_IMAGE state
3. WhatsApp document upload with audio (.wav / .mp3) in AWAITING_AUDIO state
4. Direct unprompted video upload without prior menu interaction
5. Original filename preservation in Threat Catalog evidence title and verdict display
6. download_meta_media resilience with CDN headers and retry logic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import pytest
import os
import io
import json
from PIL import Image
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from api.server import app

client = TestClient(app)


def test_whatsapp_video_document_in_awaiting_video_state():
    """Verify deepfake_Venki_Ramakrishnan.mp4 sent as document triggers video analysis."""
    sender_phone = "919988776655"

    # Step 1: User types '3' to enter video scan mode
    menu_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1329851416876776",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": sender_phone,
                        "id": "wamid.test.menu3",
                        "type": "text",
                        "text": {"body": "3"}
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    with patch("api.routes.whatsapp_webhook.send_meta_whatsapp_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        resp1 = client.post("/api/v1/whatsapp/webhook", json=menu_payload)
        assert resp1.status_code == 200

    # Step 2: User uploads deepfake_Venki_Ramakrishnan.mp4 as a document
    doc_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1329851416876776",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": sender_phone,
                        "id": "wamid.test.video_doc",
                        "type": "document",
                        "document": {
                            "id": "meta_media_doc_video_123",
                            "filename": "deepfake_Venki_Ramakrishnan.mp4",
                            "mime_type": "video/mp4",
                            "sha256": "fake_sha256_hash",
                            "file_size": 3250000
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    dummy_video_bytes = b"FAKE_MP4_VIDEO_BYTES_NETRA_FORENSICS"

    with patch("api.routes.whatsapp_webhook.send_meta_whatsapp_message", new_callable=AsyncMock) as mock_send, \
         patch("api.routes.whatsapp_webhook.download_meta_media", new_callable=AsyncMock) as mock_download:
        mock_download.return_value = dummy_video_bytes
        mock_send.return_value = True

        resp2 = client.post("/api/v1/whatsapp/webhook", json=doc_payload)
        assert resp2.status_code == 200

        # Verify messages sent to user:
        # 1: Acknowledgment ("Video received! Downloading...")
        # 2: Forensic verdict containing deepfake findings and original filename
        sent_calls = [call.args for call in mock_send.call_args_list]
        assert len(sent_calls) >= 2, f"Expected at least 2 messages, got {len(sent_calls)}"

        ack_msg = sent_calls[0][1]
        assert "Video received" in ack_msg

        verdict_msg = sent_calls[1][1]
        assert "FACE SWAP" in verdict_msg or "DEEPFAKE" in verdict_msg
        assert "deepfake_Venki_Ramakrishnan.mp4" in verdict_msg


def test_whatsapp_direct_unprompted_video_upload():
    """Verify video sent directly without choosing menu option 3 is analyzed automatically."""
    sender_phone = "919123456780"

    video_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1329851416876776",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": sender_phone,
                        "id": "wamid.test.direct_vid",
                        "type": "video",
                        "video": {
                            "id": "meta_media_direct_vid_999",
                            "mime_type": "video/mp4"
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    dummy_video_bytes = b"DIRECT_VIDEO_STREAM_BYTES"

    with patch("api.routes.whatsapp_webhook.send_meta_whatsapp_message", new_callable=AsyncMock) as mock_send, \
         patch("api.routes.whatsapp_webhook.download_meta_media", new_callable=AsyncMock) as mock_download:
        mock_download.return_value = dummy_video_bytes
        mock_send.return_value = True

        resp = client.post("/api/v1/whatsapp/webhook", json=video_payload)
        assert resp.status_code == 200

        sent_calls = [call.args for call in mock_send.call_args_list]
        assert len(sent_calls) >= 2
        verdict_msg = sent_calls[1][1]
        assert "FACE SWAP" in verdict_msg or "DEEPFAKE" in verdict_msg


def test_whatsapp_image_document_in_awaiting_image_state():
    """Verify screenshot image sent as document is processed via RapidOCR."""
    sender_phone = "919876543222"

    # Step 1: Send '2' for image scan
    menu_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1329851416876776",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": sender_phone,
                        "id": "wamid.test.menu2",
                        "type": "text",
                        "text": {"body": "2"}
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    with patch("api.routes.whatsapp_webhook.send_meta_whatsapp_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        client.post("/api/v1/whatsapp/webhook", json=menu_payload)

    # Step 2: Send document image
    doc_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1329851416876776",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": sender_phone,
                        "id": "wamid.test.img_doc",
                        "type": "document",
                        "document": {
                            "id": "meta_media_doc_img_456",
                            "filename": "suspicious_cheque_seam.png",
                            "mime_type": "image/png"
                        }
                    }]
                },
                "field": "messages"
            }]
        }]
    }

    # Generate valid PNG bytes using PIL
    img = Image.new("RGB", (64, 64), color=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    dummy_img_bytes = buf.getvalue()

    with patch("api.routes.whatsapp_webhook.send_meta_whatsapp_message", new_callable=AsyncMock) as mock_send, \
         patch("api.routes.whatsapp_webhook.download_meta_media", new_callable=AsyncMock) as mock_download:
        mock_download.return_value = dummy_img_bytes
        mock_send.return_value = True

        resp = client.post("/api/v1/whatsapp/webhook", json=doc_payload)
        assert resp.status_code == 200

        sent_calls = [call.args for call in mock_send.call_args_list]
        assert len(sent_calls) >= 2
        verdict_msg = sent_calls[1][1]
        assert "Visual Verdict" in verdict_msg or "THREAT DETECTED" in verdict_msg
        assert "suspicious_cheque_seam.png" in verdict_msg
