# Project NETRA: n8n Forensic Orchestration & Threat Pipeline

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Official n8n Automation Engine for Project NETRA Cyber Defense System.
Native Meta WhatsApp Cloud API Integration (Direct Ingestion & Outbound Dispatch).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Architecture Overview
n8n functions as NETRA's **Citizen Ingestion & Automated Threat Pipeline Orchestrator**:
1. **Direct Meta WhatsApp Cloud API Ingestion**:
   - Webhook Verification (`GET /webhook/netra-community-bot`): Validates `hub.mode == 'subscribe'` and echoes `hub.challenge` when `hub.verify_token` matches.
   - Message Ingestion (`POST /webhook/netra-community-bot`): Ingests native Meta notification envelopes (`entry[0].changes[0].value.messages[0]`) and direct flattened testing payloads.
2. **Payload Normalization & 4-Modality Routing**:
   - `Normalize WhatsApp Payload` Code node extracts `sender_id`, `media_type` (`text`, `image`, `video`, `audio`), `content`, and `message_id`.
   - `Modality Router` Switch node branches into 4 explicit evaluator pipelines:
     - **Text Evaluator**: Scam & phishing extortion detection.
     - **Image Evaluator**: RapidOCR text extraction, IOC hunting, and facial synthetic artifact scan.
     - **Video Evaluator**: Keyframe extraction and neural facial forgery detection.
     - **Audio Evaluator**: Acoustic spectral forensics and synthetic voice clone verification.
   - All evaluators post synchronously to NETRA's `POST /api/v1/ingest/bot` authenticated via `X-Bot-Secret`.
3. **Threat Severity Gating & Live Threat Catalog Registration**:
   - When risk score exceeds critical threshold (`risk_score >= 70` or `is_scam == true`), the workflow automatically invokes `POST /api/v1/ingest/bot/confirm-report`.
   - The incident is immediately indexed with a unique `THREAT-...` identifier in the **Threat Intelligence Catalog** and mapped to Indian geographic coordinates (`lat`, `lng`) on the **National Geolocation Radar**.
4. **Statutory Compliance & Forensic Citations**:
   - Responses format institutional cybercrime alerts containing statutory legal citations:
     - **BNS 2023 Sec 318(4)** (Cheating by Personation)
     - **IT Act 2000 Sec 66D** (Punishment for Cheating by Personation using Computer Resource)
     - **National Cyber Helpline 1930** & Citizen Reporting Portal (`cybercrime.gov.in`)
   - Strictly no references to repealed/superseded Sec 63 BSA or Sec 65B IEA.
5. **Outbound Meta WhatsApp Cloud API Dispatcher**:
   - Formatted forensic response dossiers are dispatched directly to the citizen's WhatsApp via Meta Graph API:
     `POST https://graph.facebook.com/v21.0/{phone_number_id}/messages`
6. **24-Hour Autonomous Threat Intelligence Sync & Broadcast**:
   - A schedule trigger runs every 24 hours:
     - Invokes `POST /api/v1/news/refresh` to trigger the autonomous Tavily cyber intelligence crawler.
     - Fetches top national fraud trends via `GET /api/v1/news/feed?limit=3`.
     - Formats a 24-hour Threat Bulletin with headlines, intelligence summaries, and Helpline 1930.
     - Broadcasts updates to registered subscribers via Meta WhatsApp Cloud API.

---

## 1-Click Import Workflow
The production workflow is exported in:
📂 `n8n/netra_forensic_orchestrator_workflow.json`

### Visual Canvas Topology:
- **Meta Webhook Verification** (GET trigger) ➔ **Verify Webhook Handshake** ➔ **Respond Verification Challenge**
- **Citizen Message Webhook** (POST trigger) ➔ **Normalize WhatsApp Payload** ➔ **Modality Router**
  - Output 0 (Text) ➔ **NETRA AI Text Evaluator** ➔ **Threat Severity Gate**
  - Output 1 (Image) ➔ **NETRA AI Image Evaluator** ➔ **Threat Severity Gate**
  - Output 2 (Video) ➔ **NETRA AI Video Evaluator** ➔ **Threat Severity Gate**
  - Output 3 (Audio) ➔ **NETRA AI Audio Evaluator** ➔ **Threat Severity Gate**
- **Threat Severity Gate** (IF node: `risk_score >= 70 || is_scam == true`):
  - TRUE ➔ **Index in Threat Catalog** ➔ **Format Forensic Response**
  - FALSE ➔ **Format Forensic Response**
- **Format Forensic Response** ➔ **Dispatch Meta WhatsApp Response** ➔ **Send Webhook Response**
- **24h Schedule Trigger** ➔ **Trigger 24h Threat Refresh** ➔ **Fetch 24h News Bulletin** ➔ **Format 24h Threat Bulletin** ➔ **Broadcast 24h Threat Bulletin**

---

## Running n8n Locally with Docker
To spin up a local instance pre-configured for NETRA:

```bash
docker compose -f n8n/docker-compose.n8n.yml up -d
```
Access the n8n UI at `http://localhost:5678`.

---

## Environment Variables
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NETRA_API_URL` | `https://netra-api-pmr7.onrender.com` | Base URL of deployed NETRA FastAPI service |
| `BOT_SECRET_KEY` | `netra_bot_secret_2026` | Cryptographic secret for `X-Bot-Secret` authorization |
| `META_WHATSAPP_PHONE_NUMBER_ID` | `1329851416876776` | Meta WhatsApp Cloud API registered Phone Number ID |
| `META_WHATSAPP_ACCESS_TOKEN` | *Configured in environment* | Meta System User Graph API Bearer Token |
| `META_WHATSAPP_VERIFY_TOKEN` | `netra_whatsapp_verify_token_2026` | Webhook verification handshake token |
| `WHATSAPP_BROADCAST_RECIPIENT` | `919876543210` | Default subscriber recipient for 24h threat intelligence bulletins |

---

## API Contract Reference

### Inbound Ingestion Request (`POST /api/v1/ingest/bot`)
```json
{
  "media_type": "text",
  "content": "URGENT: Your electricity connection will be disconnected tonight. Call 9876543210 immediately.",
  "sender_id": "919876543210",
  "source_platform": "whatsapp"
}
```
**Header:** `X-Bot-Secret: netra_bot_secret_2026`

**Response (200 OK):**
```json
{
  "status": "success",
  "media_type": "text",
  "is_scam": true,
  "risk_score": 92,
  "confidence": 0.95,
  "scam_type": "electricity_bill_phishing",
  "verdict": "CRITICAL CYBER THREAT DETECTED",
  "matched_rules": ["urgent disconnection threat", "unauthorized phone contact"],
  "extracted_iocs": {
    "urls": [],
    "phone_numbers": ["9876543210"],
    "upi_ids": []
  },
  "can_report": true,
  "report_token": "token_abc123",
  "analysis_reason": "High-risk extortion / phishing lure detected."
}
```

### Incident Confirmation (`POST /api/v1/ingest/bot/confirm-report`)
```json
{
  "report_token": "token_abc123",
  "title": "n8n Incident: electricity_bill_phishing",
  "city": "Bengaluru",
  "state": "Karnataka",
  "source_platform": "whatsapp"
}
```
**Header:** `X-Bot-Secret: netra_bot_secret_2026`

**Response (200 OK):**
```json
{
  "status": "reported",
  "catalog_id": "THREAT-20260905-A1B2",
  "radar_plotted": true,
  "lat": 12.9716,
  "lng": 77.5946,
  "message": "Incident successfully indexed into Threat Intelligence Catalog and National Geolocation Radar."
}
```

### Outbound Meta WhatsApp Message Dispatch
```http
POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "🚨 *NETRA CRIME ALERT: ELECTRICITY BILL PHISHING DETECTED*..."
  }
}
```

---

## Verification & Automated Testing
To validate the n8n workflow schema, node connections, expression variables, and end-to-end integration:

```bash
NETRA_DB_PATH="/tmp/netra_test.db" NETRA_MEDIA_DIR="/tmp/media" \
PYTHONPATH=./backend:/Users/iamsparsh00321/Desktop/netradecodesih/01_netra_project/netra/venv/lib/python3.14/site-packages \
/opt/homebrew/opt/python@3.14/bin/python3.14 -m pytest tests/test_n8n_workflow_schema.py tests/test_whatsapp_and_n8n_e2e.py -v
```