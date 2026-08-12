# 🤖 NETRA Bot Integration Guide: WhatsApp & Telegram

This comprehensive guide walks you through setting up and creating both the **Telegram Bot** and **WhatsApp Bot** for NETRA deepfake detection and threat analysis.

---

## 🏗️ Architecture Flow

```
[ Telegram / WhatsApp User ]
             │  (Sends Video, Audio, or Text Scam)
             ▼
[ Messaging Platform Webhook ]
             │  (HTTPS POST to NETRA API Gateway)
             ▼
[ FastAPI Webhook Endpoint ]
  • Telegram: POST /api/v1/telegram/webhook
  • WhatsApp: POST /api/v1/whatsapp/webhook
             │
             ▼
[ NETRA Pipeline & SQS / Worker ]
  • Media Ingestion (S3 / Local Temp Storage)
  • ML Detector Inference (EfficientNet-B4 + Wav2Vec2 + CLIP)
  • Gated Multi-Modal Fusion Engine
             │
             ▼
[ Bot Response Formatter ]
  • Telegram: Formats with rich Markdown V2, emojis, telemetry breakdown
  • WhatsApp: Formats with clean plain text (Unicode bold `*text*`)
```

---

## 1. 📱 Telegram Bot Setup & Development

Telegram uses a standard HTTP REST API with Webhooks or Long Polling.

### Step 1: Create Bot via BotFather
1. Open Telegram and search for [`@BotFather`](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts:
   * **Name**: `NETRA Deepfake Scanner`
   * **Username**: `netra_deepfake_detector_bot` (must end with `bot`).
3. BotFather will provide an **API HTTP Token**, format:
   ```
   1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```
4. Copy this token to your `netra/.env`:
   ```bash
   TELEGRAM_BOT_TOKEN="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   ```

### Step 2: Configure Telegram Commands
In `@BotFather`, send `/setcommands` and paste:
```
start - Launch NETRA deepfake bot
help - How to use the scanner
status - Check job analysis status (<job_id>)
scam - Check message for phishing / fraud
```

### Step 3: Register Webhook
Telegram requires an `HTTPS` endpoint. When your server (e.g., EC2, Ngrok, or Domain) is running:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://<YOUR_DOMAIN_OR_NGROK>/api/v1/telegram/webhook"}'
```

Verify webhook registration:
```bash
curl "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

### Step 4: Existing Code Reference
* **Telegram Route**: [`netra/backend/api/routes/telegram_webhook.py`](file:///Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/routes/telegram_webhook.py)
* **Features supported**:
  * Direct `.mp4`, `.mov`, `.avi` video uploads (up to 100MB).
  * Direct audio messages (`.ogg`, `.mp3`, `.wav`).
  * YouTube links (`yt-dlp` extraction).
  * Markdown-formatted forensic verdict reports.

---

## 2. 💬 WhatsApp Bot Setup (via Twilio)

WhatsApp Business API requires a BSP (Business Solution Provider) like **Twilio** for webhook handling.

### Step 1: Create Twilio Account & Sandbox
1. Sign up at [Twilio Console](https://www.twilio.com/).
2. Go to **Messaging > Try it out > Send a WhatsApp message**.
3. Follow the instructions to connect your personal WhatsApp to the Twilio Sandbox (e.g., sending `join <sandbox-keyword>` to `+1 415 523 8886`).

### Step 2: Get Credentials
Copy your API credentials from Twilio Console into `netra/.env`:
```bash
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
# Optional API Key:
TWILIO_API_KEY_SID="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_API_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

### Step 3: Configure Twilio Inbound Webhook URL
1. In Twilio Console, navigate to:  
   **Messaging > Settings > WhatsApp sandbox settings**.
2. Set **"WHEN A MESSAGE COMES IN"** to:
   ```
   https://<YOUR_DOMAIN_OR_NGROK>/api/v1/whatsapp/webhook
   ```
   *(Ensure HTTP Method is set to `HTTP POST`)*.

### Step 4: Existing Code Reference
* **WhatsApp Route**: [`netra/backend/api/routes/whatsapp_webhook.py`](file:///Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/routes/whatsapp_webhook.py)
* **Key Differences for WhatsApp**:
  * Twilio delivers payloads as `application/x-www-form-urlencoded` POST requests.
  * Media downloads require Twilio Basic Authentication (`Account SID` + `Auth Token`).
  * Twilio requires an HTTP 200 within 10 seconds; processing runs asynchronously in background tasks.
  * Text responses use WhatsApp native formatting (`*bold*`, `_italic_`, `~strike~`, ```monospace```).

---

## 3. 🛠️ Local Development & Testing with Ngrok

To test webhooks locally without deploying to AWS:

1. **Install Ngrok**:
   ```bash
   brew install ngrok
   ```

2. **Start FastAPI Backend**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
   ./venv/bin/uvicorn backend.api.server:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Expose Local Server via HTTPS**:
   ```bash
   ngrok http 8000
   ```
   Copy the `https://xxxx.ngrok-free.app` forwarding address.

4. **Point Webhooks to Ngrok URL**:
   * **Telegram**:
     ```bash
     curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
          -H "Content-Type: application/json" \
          -d '{"url": "https://xxxx.ngrok-free.app/api/v1/telegram/webhook"}'
     ```
   * **WhatsApp**: Paste `https://xxxx.ngrok-free.app/api/v1/whatsapp/webhook` into the Twilio Sandbox settings.

---

## 4. 📝 Supported User Commands & Responses

| Action | Telegram Input | WhatsApp Input | Output |
| :--- | :--- | :--- | :--- |
| **Welcome / Help** | `/start` or `/help` | `hi` or `help` | Interactive instructions guide |
| **Video Deepfake Scan** | Send video file or forward | Send video attachment | Full forensic verdict & timeline score |
| **Scam Text Analysis** | Send suspicious SMS/text | Send suspicious SMS/text | TF-IDF + RF Scam likelihood & advisory |
| **Job Polling** | `/status <job_id>` | `status <job_id>` | Real-time progress update (0-100%) |

---

## 5. 📂 Core Implementation Files in Repository

* [`netra/backend/api/routes/telegram_webhook.py`](file:///Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/routes/telegram_webhook.py) — Telegram Webhook handler
* [`netra/backend/api/routes/whatsapp_webhook.py`](file:///Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/routes/whatsapp_webhook.py) — WhatsApp Webhook handler
* [`netra/backend/netra/bot_utils.py`](file:///Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/bot_utils.py) — Shared CDN media downloader, 100MB validator, message formatters
* [`netra/backend/api/server.py`](file:///Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/server.py) — FastAPI Router registry
