# Project NETRA: n8n Forensic Orchestration & Threat Pipeline

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Official n8n Automation Engine for Project NETRA Cyber Defense System.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Architecture Overview
n8n functions as NETRA's **Citizen Ingestion & Automated Threat Pipeline Orchestrator**:
1. **Multi-Channel Ingestion Trigger**: Receives incoming citizen scam reports, SMS forwards, and WhatsApp screenshot submissions via Webhook (`/webhook/netra-community-bot`).
2. **Synchronous NETRA AI Ingest**: Forwards submissions securely to NETRA's dedicated bot endpoint (`POST /api/v1/ingest/bot`) authenticated via header `X-Bot-Secret`.
3. **Automated Threat Ledgering**: When scam probability exceeds critical threshold (risk >= 70%), n8n automatically executes `POST /api/v1/ingest/bot/confirm-report` to record the incident into the **Threat Intelligence Catalog** and **National Geolocation Radar**.
4. **24-Hour Autonomous Threat Crawl**: A cron trigger runs every 24 hours to invoke `POST /api/v1/news/refresh`, aggregating recent cybercrime trends and broadcasting alerts to subscribed users.

---

## 1-Click Import Workflow
The production workflow is exported in:
📂 `n8n/netra_forensic_orchestrator_workflow.json`

### Steps to Import:
1. Open your n8n workspace (e.g. `http://localhost:5678` or cloud n8n).
2. Click **Workflows** → **Add Workflow** → **Import from File...**
3. Select `n8n/netra_forensic_orchestrator_workflow.json`.
4. The visual canvas will render:
   - **Citizen Message Webhook** (POST trigger)
   - **Modality Router** (Switch node: Text vs Image)
   - **NETRA AI Text Engine** (HTTP Request)
   - **NETRA RapidOCR & Seam Engine** (HTTP Request)
   - **High Threat Gate** (IF node)
   - **Index in Threat Catalog** (HTTP Request)
   - **Format Forensic Response** (Code node)
   - **Send Webhook Response** (RespondToWebhook node)
   - **24h Schedule Trigger** (Daily cron for intelligence refresh)
5. Click **Publish** / **Activate**.

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

---

## API Contract Reference
### Ingestion Endpoint (`POST /api/v1/ingest/bot`)
```json
{
  "media_type": "text",
  "content": "URGENT: Your electricity connection will be disconnected tonight. Call 9876543210 immediately.",
  "sender_id": "+919876543210",
  "source_platform": "whatsapp"
}
```
**Response (200 OK):**
```json
{
  "status": "success",
  "is_scam": true,
  "risk_score": 92,
  "verdict": "CRITICAL — Confirmed Scam / Cyber Extortion",
  "scam_type": "electricity_kyc",
  "matched_rules": ["urgent disconnection threat", "unauthorized phone contact"],
  "extracted_iocs": {
    "phones": ["9876543210"]
  },
  "report_token": "a1b2c3d4e5f6..."
}
```\n