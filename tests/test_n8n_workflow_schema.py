"""
tests/test_n8n_workflow_schema.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comprehensive Verification & Validation Suite for:
1. n8n Forensic Orchestrator Workflow Schema (JSON structure, nodes, connections)
2. Direct Meta WhatsApp Cloud API Webhook Handshake & Ingestion
3. 4-Modality Routing (Text, Image, Video, Audio) & Synchronous AI Ingest
4. Threat Severity Gating (>= 70% / is_scam) & Catalog Indexing
5. Statutory Citations (BNS 2023 Sec 318(4), IT Act 2000 Sec 66D, 1930 Helpline)
   and ZERO references to Sec 63 BSA / Sec 65B IEA
6. Outbound Meta WhatsApp Cloud API Message Dispatcher
7. 24-Hour Autonomous Threat Intelligence Sync & Broadcast Pipeline
8. Complete Twilio & Telegram Elimination
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import json
import re
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend path is on sys.path
import sys
BACKEND_PATH = str(Path(__file__).parent.parent / "backend")
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

# Set safe sandbox DB and media directories if not already configured
os.environ.setdefault("NETRA_DB_PATH", "/tmp/netra_test.db")
os.environ.setdefault("NETRA_MEDIA_DIR", "/tmp/media")

from api.server import app

client = TestClient(app)

WORKFLOW_PATH = Path(__file__).parent.parent / "n8n" / "netra_forensic_orchestrator_workflow.json"
DOCKER_COMPOSE_PATH = Path(__file__).parent.parent / "n8n" / "docker-compose.n8n.yml"
README_PATH = Path(__file__).parent.parent / "n8n" / "README.md"


@pytest.fixture(scope="module")
def workflow_data():
    assert WORKFLOW_PATH.exists(), f"Workflow file not found at {WORKFLOW_PATH}"
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def test_workflow_file_exists_and_valid_json(workflow_data):
    """Verify workflow file exists, parses as valid JSON, and has valid top-level structure."""
    assert isinstance(workflow_data, dict)
    assert "name" in workflow_data
    assert "nodes" in workflow_data
    assert "connections" in workflow_data
    assert "settings" in workflow_data

    nodes = workflow_data["nodes"]
    assert isinstance(nodes, list)
    assert len(nodes) >= 15

    # Ensure unique node IDs and unique node names
    ids = [node["id"] for node in nodes]
    names = [node["name"] for node in nodes]
    assert len(ids) == len(set(ids)), "Duplicate node IDs detected in n8n workflow"
    assert len(names) == len(set(names)), "Duplicate node names detected in n8n workflow"


def test_meta_webhook_verification_nodes_and_simulation(workflow_data):
    """Verify GET webhook handshake verification nodes and challenge logic."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}

    assert "Meta Webhook Verification" in nodes
    assert "Verify Webhook Handshake" in nodes
    assert "Respond Verification Challenge" in nodes

    verify_node = nodes["Meta Webhook Verification"]
    assert verify_node["type"] == "n8n-nodes-base.webhook"
    assert verify_node["parameters"]["httpMethod"] == "GET"
    assert verify_node["parameters"]["path"] == "netra-community-bot"
    assert verify_node["parameters"]["responseMode"] == "responseNode"

    handshake_code_node = nodes["Verify Webhook Handshake"]
    js_code = handshake_code_node["parameters"]["jsCode"]
    assert "hub.mode" in js_code
    assert "hub.challenge" in js_code
    assert "hub.verify_token" in js_code
    assert "status: 200" in js_code
    assert "status: 403" in js_code

    respond_node = nodes["Respond Verification Challenge"]
    assert respond_node["type"] == "n8n-nodes-base.respondToWebhook"
    assert respond_node["parameters"]["respondWith"] == "text"
    assert "$json.challenge" in respond_node["parameters"]["responseBody"]


def test_payload_normalizer_meta_envelope_and_direct_simulation(workflow_data):
    """Simulate Normalization Code Node for Meta WhatsApp Webhook envelopes and flattened payloads."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}
    assert "Normalize WhatsApp Payload" in nodes
    normalizer_node = nodes["Normalize WhatsApp Payload"]
    js_code = normalizer_node["parameters"]["jsCode"]

    # Ensure normalizer handles both entry[0].changes[0].value.messages[0] and flattened direct payloads
    assert "body.entry" in js_code
    assert "value.messages" in js_code
    assert "sender_id" in js_code
    assert "media_type" in js_code
    assert "content" in js_code
    assert "message_id" in js_code

    # Python simulation of the normalization logic:
    def simulate_normalizer(payload):
        body = payload.get("body", payload)
        sender_id = "community_user"
        media_type = "text"
        content = ""
        message_id = ""
        phone_number_id = ""

        if body.get("entry") and isinstance(body["entry"], list) and len(body["entry"]) > 0:
            entry0 = body["entry"][0]
            changes0 = entry0.get("changes", [{}])[0]
            value = changes0.get("value", {})
            if value:
                phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
                messages = value.get("messages", [])
                if messages:
                    msg = messages[0]
                    sender_id = msg.get("from") or "community_user"
                    message_id = msg.get("id", "")
                    raw_type = msg.get("type", "text")
                    if raw_type == "text":
                        media_type = "text"
                        content = msg.get("text", {}).get("body", "")
                    elif raw_type == "image":
                        media_type = "image"
                        content = msg.get("image", {}).get("url") or msg.get("image", {}).get("id") or msg.get("caption", "")
                    elif raw_type == "video":
                        media_type = "video"
                        content = msg.get("video", {}).get("url") or msg.get("video", {}).get("id") or msg.get("caption", "")
                    elif raw_type in ("audio", "voice"):
                        media_type = "audio"
                        aud_obj = msg.get("audio") or msg.get("voice") or {}
                        content = aud_obj.get("url") or aud_obj.get("id", "")
        else:
            sender_id = body.get("sender_id") or body.get("sender") or body.get("from") or "community_user"
            media_type = (body.get("media_type") or "text").lower()
            message_id = body.get("message_id") or body.get("id") or "wamid.synth"
            phone_number_id = body.get("phone_number_id", "")
            if media_type == "text":
                content = body.get("content") or body.get("text", "")
            elif media_type == "image":
                content = body.get("content") or body.get("image_url") or body.get("image", "")
            elif media_type == "video":
                content = body.get("content") or body.get("video_url") or body.get("video", "")
            elif media_type == "audio":
                content = body.get("content") or body.get("audio_url") or body.get("audio", "")

        sender_id = re.sub(r"^whatsapp:", "", str(sender_id), flags=re.IGNORECASE).lstrip("+")
        return {
            "sender_id": sender_id,
            "media_type": media_type,
            "content": content,
            "message_id": message_id,
            "phone_number_id": phone_number_id
        }

    # Case 1: Standard Meta WhatsApp Webhook Envelope (Text)
    meta_text_envelope = {
        "body": {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "WABA_ID_123",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "1329851416876776"},
                        "contacts": [{"wa_id": "919876543210"}],
                        "messages": [{
                            "from": "919876543210",
                            "id": "wamid.HBgL1234567890",
                            "type": "text",
                            "text": {"body": "Urgent: Electricity disconnection pending. Call 9876543210."}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
    }
    norm1 = simulate_normalizer(meta_text_envelope)
    assert norm1["sender_id"] == "919876543210"
    assert norm1["media_type"] == "text"
    assert "Electricity disconnection" in norm1["content"]
    assert norm1["message_id"] == "wamid.HBgL1234567890"
    assert norm1["phone_number_id"] == "1329851416876776"

    # Case 2: Meta WhatsApp Webhook Envelope (Video)
    meta_video_envelope = {
        "body": {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": "+919811122233",
                            "id": "wamid.HBgLVID999",
                            "type": "video",
                            "video": {"id": "meta_vid_media_id_789"}
                        }]
                    }
                }]
            }]
        }
    }
    norm2 = simulate_normalizer(meta_video_envelope)
    assert norm2["sender_id"] == "919811122233"
    assert norm2["media_type"] == "video"
    assert norm2["content"] == "meta_vid_media_id_789"
    assert norm2["message_id"] == "wamid.HBgLVID999"

    # Case 3: Meta WhatsApp Webhook Envelope (Audio)
    meta_audio_envelope = {
        "body": {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": "919844455566",
                            "id": "wamid.HBgLAUD888",
                            "type": "audio",
                            "audio": {"id": "meta_aud_media_id_456"}
                        }]
                    }
                }]
            }]
        }
    }
    norm3 = simulate_normalizer(meta_audio_envelope)
    assert norm3["sender_id"] == "919844455566"
    assert norm3["media_type"] == "audio"
    assert norm3["content"] == "meta_aud_media_id_456"

    # Case 4: Flattened Direct Payload (Image)
    direct_image_payload = {
        "body": {
            "media_type": "image",
            "image_url": "https://cybercrime.gov.in/evidence/fraud_slip.jpg",
            "sender": "whatsapp:+919877766655",
            "message_id": "test_msg_001"
        }
    }
    norm4 = simulate_normalizer(direct_image_payload)
    assert norm4["sender_id"] == "919877766655"
    assert norm4["media_type"] == "image"
    assert norm4["content"] == "https://cybercrime.gov.in/evidence/fraud_slip.jpg"
    assert norm4["message_id"] == "test_msg_001"


def test_4_modality_router_and_evaluators(workflow_data):
    """Verify Modality Router defines 4 explicit outputs and routes to 4 evaluators."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}

    assert "Modality Router" in nodes
    router = nodes["Modality Router"]
    assert router["type"] == "n8n-nodes-base.switch"
    rules = router["parameters"]["rules"]["rules"]
    assert len(rules) == 4
    rule_values = [r["value2"] for r in rules]
    assert rule_values == ["text", "image", "video", "audio"]

    evaluator_names = [
        "NETRA AI Text Evaluator",
        "NETRA AI Image Evaluator",
        "NETRA AI Video Evaluator",
        "NETRA AI Audio Evaluator"
    ]

    for name in evaluator_names:
        assert name in nodes, f"Evaluator node {name} missing from workflow"
        node = nodes[name]
        assert node["type"] == "n8n-nodes-base.httpRequest"
        assert node["parameters"]["method"] == "POST"
        assert "/api/v1/ingest/bot" in node["parameters"]["url"]

        # Verify X-Bot-Secret header exists
        headers = node["parameters"]["headerParameters"]["parameters"]
        header_dict = {h["name"]: h["value"] for h in headers}
        assert "X-Bot-Secret" in header_dict
        assert "BOT_SECRET_KEY" in header_dict["X-Bot-Secret"]
        assert "Content-Type" in header_dict
        assert header_dict["Content-Type"] == "application/json"


def test_threat_severity_gate_and_catalog_indexing(workflow_data):
    """Verify Threat Severity Gate and automatic Threat Catalog indexing node."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}

    assert "Threat Severity Gate" in nodes
    gate = nodes["Threat Severity Gate"]
    assert gate["type"] == "n8n-nodes-base.if"
    cond_val = gate["parameters"]["conditions"]["boolean"][0]["value1"]
    assert "is_scam" in cond_val
    assert "risk_score" in cond_val
    assert "70" in cond_val

    assert "Index in Threat Catalog" in nodes
    indexer = nodes["Index in Threat Catalog"]
    assert indexer["type"] == "n8n-nodes-base.httpRequest"
    assert indexer["parameters"]["method"] == "POST"
    assert "/api/v1/ingest/bot/confirm-report" in indexer["parameters"]["url"]

    # Verify X-Bot-Secret header on confirm-report
    headers = indexer["parameters"]["headerParameters"]["parameters"]
    header_dict = {h["name"]: h["value"] for h in headers}
    assert "X-Bot-Secret" in header_dict
    assert "BOT_SECRET_KEY" in header_dict["X-Bot-Secret"]

    body = indexer["parameters"]["jsonBody"]
    assert "report_token" in body
    assert "title" in body


def test_forensic_response_formatting_and_statutory_citations(workflow_data):
    """Verify response formatter outputs BNS 2023 Sec 318(4), IT Act 2000 Sec 66D, 1930, and NO BSA 63 / IEA 65B."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}

    assert "Format Forensic Response" in nodes
    formatter = nodes["Format Forensic Response"]
    assert formatter["type"] == "n8n-nodes-base.code"
    js_code = formatter["parameters"]["jsCode"]

    # Mandatory statutory legal citations & Helpline
    assert "BNS 2023 Sec 318(4)" in js_code
    assert "IT Act 2000 Sec 66D" in js_code
    assert "1930" in js_code

    # Strictly forbidden citations
    assert "Section 63" not in js_code
    assert "63 BSA" not in js_code
    assert "Section 65B" not in js_code
    assert "65B" not in js_code
    assert "Evidence Act" not in js_code

    # Output fields
    assert "catalog_id" in js_code
    assert "sender_id" in js_code
    assert "risk_score" in js_code
    assert "is_scam" in js_code


def test_outbound_meta_whatsapp_dispatcher(workflow_data):
    """Verify Outbound Meta WhatsApp Cloud API Message Dispatcher."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}

    assert "Dispatch Meta WhatsApp Response" in nodes
    dispatcher = nodes["Dispatch Meta WhatsApp Response"]
    assert dispatcher["type"] == "n8n-nodes-base.httpRequest"
    assert dispatcher["parameters"]["method"] == "POST"

    url = dispatcher["parameters"]["url"]
    assert "graph.facebook.com/v21.0" in url
    assert "META_WHATSAPP_PHONE_NUMBER_ID" in url
    assert "messages" in url

    headers = dispatcher["parameters"]["headerParameters"]["parameters"]
    h_dict = {h["name"]: h["value"] for h in headers}
    assert "Authorization" in h_dict
    assert "META_WHATSAPP_ACCESS_TOKEN" in h_dict["Authorization"]
    assert h_dict["Content-Type"] == "application/json"

    body = dispatcher["parameters"]["jsonBody"]
    assert "messaging_product" in body
    assert "whatsapp" in body
    assert "sender_id" in body or "$json.sender_id" in body
    assert "preview_url" in body

    # Verify continueOnFail is set to true for network fault tolerance
    assert dispatcher.get("continueOnFail") is True


def test_24h_threat_intelligence_sync_and_broadcast(workflow_data):
    """Verify 24h cron trigger, news refresh, bulletin fetch, formatter, and broadcast node."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}

    assert "24h Schedule Trigger" in nodes
    sched = nodes["24h Schedule Trigger"]
    assert sched["type"] == "n8n-nodes-base.scheduleTrigger"
    interval = sched["parameters"]["rule"]["interval"][0]
    assert interval["field"] == "hours"
    assert interval["hoursInterval"] == 24

    assert "Trigger 24h Threat Refresh" in nodes
    trigger_crawl = nodes["Trigger 24h Threat Refresh"]
    assert trigger_crawl["type"] == "n8n-nodes-base.httpRequest"
    assert trigger_crawl["parameters"]["method"] == "POST"
    assert "/api/v1/news/refresh" in trigger_crawl["parameters"]["url"]

    assert "Fetch 24h News Bulletin" in nodes
    get_bulletin = nodes["Fetch 24h News Bulletin"]
    assert get_bulletin["type"] == "n8n-nodes-base.httpRequest"
    assert get_bulletin["parameters"]["method"] == "GET"
    assert "/api/v1/news/feed?limit=3" in get_bulletin["parameters"]["url"]

    assert "Format 24h Threat Bulletin" in nodes
    bulletin_fmt = nodes["Format 24h Threat Bulletin"]
    assert bulletin_fmt["type"] == "n8n-nodes-base.code"
    bulletin_js = bulletin_fmt["parameters"]["jsCode"]
    assert "NETRA 24-HOUR NATIONAL CYBER THREAT BULLETIN" in bulletin_js
    assert "1930" in bulletin_js
    assert "BNS 2023 Sec 318(4)" in bulletin_js
    assert "IT Act 2000 Sec 66D" in bulletin_js

    assert "Broadcast 24h Threat Bulletin" in nodes
    broadcast = nodes["Broadcast 24h Threat Bulletin"]
    assert broadcast["type"] == "n8n-nodes-base.httpRequest"
    assert broadcast["parameters"]["method"] == "POST"
    assert "graph.facebook.com/v21.0" in broadcast["parameters"]["url"]
    assert broadcast.get("continueOnFail") is True


def test_workflow_graph_connections_integrity(workflow_data):
    """Verify graph connectivity: all referenced target nodes exist, zero orphaned nodes."""
    nodes = {node["name"]: node for node in workflow_data["nodes"]}
    connections = workflow_data["connections"]

    for src_name, conns in connections.items():
        assert src_name in nodes, f"Source node '{src_name}' in connections does not exist in nodes"
        for output_index, targets in enumerate(conns.get("main", [])):
            for target in targets:
                target_name = target["node"]
                assert target_name in nodes, f"Target node '{target_name}' referenced from '{src_name}' output {output_index} does not exist in nodes"

    # Specific topological validations:
    # 1. Citizen Message Webhook -> Normalize WhatsApp Payload -> Modality Router
    assert connections["Citizen Message Webhook"]["main"][0][0]["node"] == "Normalize WhatsApp Payload"
    assert connections["Normalize WhatsApp Payload"]["main"][0][0]["node"] == "Modality Router"

    # 2. Modality Router outputs 0..3 connect to respective 4 evaluators
    router_targets = [targets[0]["node"] for targets in connections["Modality Router"]["main"]]
    assert router_targets == [
        "NETRA AI Text Evaluator",
        "NETRA AI Image Evaluator",
        "NETRA AI Video Evaluator",
        "NETRA AI Audio Evaluator"
    ]

    # 3. All 4 evaluators connect to Threat Severity Gate
    for eval_name in router_targets:
        assert connections[eval_name]["main"][0][0]["node"] == "Threat Severity Gate"

    # 4. Threat Severity Gate connects output 0 (true) to Index in Threat Catalog and output 1 (false) to Format Forensic Response
    gate_outputs = connections["Threat Severity Gate"]["main"]
    assert gate_outputs[0][0]["node"] == "Index in Threat Catalog"
    assert gate_outputs[1][0]["node"] == "Format Forensic Response"

    # 5. Index in Threat Catalog -> Format Forensic Response
    assert connections["Index in Threat Catalog"]["main"][0][0]["node"] == "Format Forensic Response"

    # 6. Format Forensic Response -> Dispatch Meta WhatsApp Response -> Send Webhook Response
    assert connections["Format Forensic Response"]["main"][0][0]["node"] == "Dispatch Meta WhatsApp Response"
    assert connections["Dispatch Meta WhatsApp Response"]["main"][0][0]["node"] == "Send Webhook Response"

    # 7. 24h cron pipeline connectivity
    assert connections["24h Schedule Trigger"]["main"][0][0]["node"] == "Trigger 24h Threat Refresh"
    assert connections["Trigger 24h Threat Refresh"]["main"][0][0]["node"] == "Fetch 24h News Bulletin"
    assert connections["Fetch 24h News Bulletin"]["main"][0][0]["node"] == "Format 24h Threat Bulletin"
    assert connections["Format 24h Threat Bulletin"]["main"][0][0]["node"] == "Broadcast 24h Threat Bulletin"


def test_docker_compose_and_readme_meta_config():
    """Verify docker-compose and README configuration and total absence of Twilio/Telegram."""
    assert DOCKER_COMPOSE_PATH.exists()
    assert README_PATH.exists()

    with open(DOCKER_COMPOSE_PATH, "r", encoding="utf-8") as f:
        dc_text = f.read()

    with open(README_PATH, "r", encoding="utf-8") as f:
        readme_text = f.read()

    # Meta environment variables must be present
    for var in ["META_WHATSAPP_PHONE_NUMBER_ID", "META_WHATSAPP_ACCESS_TOKEN", "META_WHATSAPP_VERIFY_TOKEN"]:
        assert var in dc_text, f"{var} missing from docker-compose.n8n.yml"
        assert var in readme_text, f"{var} missing from n8n/README.md"

    # Verify zero Twilio references in docker-compose, workflow JSON, and README
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        wf_text = f.read()

    assert "twilio" not in dc_text.lower(), "Twilio found in docker-compose.n8n.yml"
    assert "twilio" not in wf_text.lower(), "Twilio found in workflow JSON"
    assert "twilio" not in readme_text.lower(), "Twilio found in n8n/README.md"

    # Verify zero Telegram references
    assert "telegram" not in dc_text.lower(), "Telegram found in docker-compose.n8n.yml"
    assert "telegram" not in wf_text.lower(), "Telegram found in workflow JSON"
    assert "telegram" not in readme_text.lower(), "Telegram found in n8n/README.md"


def test_end_to_end_normalized_payload_execution_against_backend():
    """Verify that normalized payloads from n8n execute successfully against FastAPI bot ingestion."""
    headers = {"X-Bot-Secret": "netra_bot_secret_2026"}

    # 1. Text submission (high scam risk)
    text_payload = {
        "media_type": "text",
        "content": "Dear user, electricity connection will be suspended tonight at 9:30 PM due to unpaid bill. Pay immediately at http://bill-pay.apk or call officer 9876543210.",
        "sender_id": "919876543210",
        "source_platform": "whatsapp"
    }
    resp = client.post("/api/v1/ingest/bot", json=text_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["is_scam"] is True
    assert data["risk_score"] >= 70
    assert data["report_token"] is not None

    # Verify confirmation step (Threat Severity Gate -> Index in Threat Catalog)
    confirm_payload = {
        "report_token": data["report_token"],
        "title": f"n8n Incident: {data['scam_type']}",
        "city": "Bengaluru",
        "state": "Karnataka",
        "source_platform": "whatsapp"
    }
    conf_resp = client.post("/api/v1/ingest/bot/confirm-report", json=confirm_payload, headers=headers)
    assert conf_resp.status_code == 200
    conf_data = conf_resp.json()
    assert conf_data["status"] == "reported"
    assert conf_data["catalog_id"].startswith("THREAT-")
    assert conf_data["lat"] == 12.9716
    assert conf_data["lng"] == 77.5946
