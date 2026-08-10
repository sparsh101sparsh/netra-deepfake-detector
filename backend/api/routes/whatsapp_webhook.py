"""
backend/api/routes/whatsapp_webhook.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 9 — WhatsApp Bot (Twilio Sandbox)

Setup Instructions:
  1. Create a Twilio account → https://www.twilio.com/try-twilio
  2. Join the WhatsApp sandbox:
       https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
  3. Set the sandbox webhook URL in Twilio console:
       https://<EC2-IP>/api/v1/whatsapp/webhook
  4. Copy these into .env:
       TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       TWILIO_AUTH_TOKEN=<auth_token>
       TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

Supported interactions:
  User sends:  "hi" / "help"   → welcome message
  User sends:  video file       → automatic analysis + plain-text result
  User sends:  YouTube URL      → yt-dlp download + analysis
  User sends:  "status <job_id>"→ job progress check

WhatsApp vs Telegram differences:
  - WhatsApp does NOT support Markdown formatting → plain text only
  - All responses go through Twilio REST API (not Telegram Bot API)
  - Media downloads require Twilio Basic Auth (account_sid + auth_token)
  - Twilio sends form-encoded POST bodies (not JSON)
  - Twilio requires HTTP 200 response within 10 seconds → background tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
import os
import asyncio
from fastapi import APIRouter, Request, HTTPException, Form
from fastapi.responses import PlainTextResponse
from typing import Optional
import httpx

from netra.bot_utils import (
    download_file, submit_to_api, poll_for_result,
    format_result_whatsapp, format_progress_message
)

router = APIRouter()

TWILIO_SID    = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_KEY    = os.getenv("TWILIO_API_KEY_SID", "")
TWILIO_SECRET = os.getenv("TWILIO_API_KEY_SECRET", "")
TWILIO_FROM   = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
TWILIO_API    = "https://api.twilio.com/2010-04-01"

MAX_FILE_SIZE_MB = 100


# ─── Twilio messaging helper ───────────────────────────────────────────────────

async def send_whatsapp(to: str, body: str) -> None:
    """
    Send a WhatsApp message via Twilio REST API.
    Uses API Key SID + Secret for auth (more secure than Auth Token).
    Plain text only — WhatsApp does not support Markdown.
    """
    if not TWILIO_SID or not TWILIO_KEY or not TWILIO_SECRET:
        print("[WARN] Twilio credentials not configured — message not sent")
        return

    url = f"{TWILIO_API}/Accounts/{TWILIO_SID}/Messages.json"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                url,
                auth=(TWILIO_KEY, TWILIO_SECRET),  # API Key SID : API Key Secret
                data={
                    "From": TWILIO_FROM,
                    "To": to,
                    "Body": body,
                }
            )
    except Exception as e:
        print(f"[ERROR] Twilio send failed → {to}: {e}")


# ─── Video handler ─────────────────────────────────────────────────────────────

async def handle_video(to: str, media_url: str) -> None:
    """
    Download video from Twilio CDN → NETRA API → send WhatsApp result.
    Uses Twilio Basic Auth for the media download URL.
    """
    await send_whatsapp(to, f"⬇️ Downloading your video (max {MAX_FILE_SIZE_MB}MB)...")

    # Twilio media URLs require Basic Auth with account credentials
    video_bytes, err = await download_file(media_url, token="")
    if err:
        # Retry with Twilio Basic Auth embedded in headers
        try:
            async with httpx.AsyncClient(
                timeout=60,
                auth=(TWILIO_KEY, TWILIO_SECRET),  # Twilio API Key auth for media download
                follow_redirects=True
            ) as client:
                r = await client.get(media_url)
                if r.status_code == 200:
                    content = r.content
                    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
                        await send_whatsapp(to, f"❌ File too large. Please send a video under {MAX_FILE_SIZE_MB}MB.")
                        return
                    video_bytes = content
                    err = ""
                else:
                    await send_whatsapp(to, f"❌ Could not download video (HTTP {r.status_code}).")
                    return
        except Exception as ex:
            await send_whatsapp(to, f"❌ Download error: {ex}")
            return

    if err:
        await send_whatsapp(to, f"❌ {err}")
        return

    await send_whatsapp(to, "⬆️ Uploading to NETRA for analysis...")

    job_id, err = await submit_to_api(video_bytes, "whatsapp_video.mp4")
    if err:
        await send_whatsapp(to, f"❌ {err}")
        return

    await send_whatsapp(to,
        f"✅ Analysis started!\n"
        f"Job ID: {job_id}\n\n"
        "I'll send you the result when done (usually 20-40 seconds)..."
    )

    result, err = await poll_for_result(job_id)
    if err:
        await send_whatsapp(to, f"⚠️ {err}")
    elif result:
        await send_whatsapp(to, format_result_whatsapp(result, job_id))
    else:
        await send_whatsapp(to, "⚠️ Analysis produced no result. Please try again.")


# ─── YouTube URL handler ───────────────────────────────────────────────────────

async def handle_youtube_url(to: str, url: str) -> None:
    """Download YouTube video via yt-dlp → NETRA API → send WhatsApp result."""
    import tempfile
    import subprocess

    await send_whatsapp(to, f"⬇️ Downloading YouTube video (max 100MB, ~10 min clip)...")

    with tempfile.TemporaryDirectory() as tmpdir:
        outpath = os.path.join(tmpdir, "video.mp4")
        try:
            result = subprocess.run(
                [
                    "yt-dlp", url,
                    "-o", outpath,
                    "--format", "mp4",
                    "--max-filesize", "100m",
                    "--no-playlist",
                    "--quiet",
                ],
                timeout=120,
                capture_output=True,
            )
            if result.returncode != 0 or not os.path.exists(outpath):
                await send_whatsapp(to, "❌ Could not download this YouTube video. Try uploading the file directly.")
                return
        except Exception as e:
            await send_whatsapp(to, f"❌ Download error: {e}")
            return

        with open(outpath, "rb") as f:
            video_bytes = f.read()

    await send_whatsapp(to, f"⬆️ Downloaded ({len(video_bytes) // 1024 // 1024}MB). Submitting to NETRA...")
    job_id, err = await submit_to_api(video_bytes, "youtube_video.mp4")
    if err:
        await send_whatsapp(to, f"❌ {err}")
        return

    await send_whatsapp(to, f"✅ Job ID: {job_id} — analysing now...")
    result, err = await poll_for_result(job_id)
    if err:
        await send_whatsapp(to, f"⚠️ {err}")
    elif result:
        await send_whatsapp(to, format_result_whatsapp(result, job_id))


# ─── Webhook endpoint ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    From:        Optional[str] = Form(None),
    Body:        Optional[str] = Form(None),
    NumMedia:    Optional[str] = Form(None),
    MediaUrl0:   Optional[str] = Form(None),
    MediaContentType0: Optional[str] = Form(None),
):
    """
    Receive Twilio WhatsApp webhook.

    Twilio sends form-encoded POST — NOT JSON.
    Must return HTTP 200 within 10 seconds → use asyncio.create_task for long work.
    """
    if not TWILIO_SID:
        raise HTTPException(status_code=503, detail="WhatsApp bot not configured")

    if not From:
        return PlainTextResponse("ok")

    to         = From         # Reply to the sender
    body       = (Body or "").strip().lower()
    num_media  = int(NumMedia or 0)

    # ── Command routing ────────────────────────────────────────────────────────

    if any(word in body for word in ("hi", "hello", "hey", "start", "help")):
        asyncio.create_task(send_whatsapp(to,
            "👁️ NETRA Deepfake Detector\n\n"
            "Send me a video file or a YouTube URL and I'll tell you if it's real or fake.\n\n"
            "• Max file size: 100MB\n"
            "• Supported formats: mp4, mov, webm\n"
            "• Typical analysis time: 20-40 seconds\n\n"
            "Commands:\n"
            "• Send video → auto analysis\n"
            "• Send YouTube URL → auto analysis\n"
            "• 'status <job_id>' → check running job\n\n"
            "Powered by AWS (EfficientNet + Wav2Vec2 + Amazon Bedrock)"
        ))

    elif body.startswith("status "):
        job_id = body.split("status ", 1)[1].strip()
        try:
            API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(f"{API_URL}/api/v1/jobs/{job_id}")
                if r.status_code == 200:
                    data = r.json()
                    asyncio.create_task(send_whatsapp(to,
                        f"Job: {job_id[:8]}...\n"
                        f"Status: {data.get('status')}\n"
                        f"Progress: {data.get('progress', 0)}%\n"
                        f"Stage: {data.get('current_stage', '')}"
                    ))
                else:
                    asyncio.create_task(send_whatsapp(to, f"❌ Job not found: {job_id[:8]}..."))
        except Exception as e:
            asyncio.create_task(send_whatsapp(to, f"❌ Could not check job: {e}"))

    elif "youtube.com" in body or "youtu.be" in body:
        asyncio.create_task(handle_youtube_url(to, body))

    elif num_media > 0 and MediaUrl0:
        content_type = (MediaContentType0 or "").lower()
        is_video = (
            "video" in content_type or
            any(ext in MediaUrl0 for ext in [".mp4", ".mov", ".webm", ".avi"])
        )
        if is_video:
            asyncio.create_task(handle_video(to, MediaUrl0))
        else:
            asyncio.create_task(send_whatsapp(to,
                "⚠️ I only analyse video files.\n"
                "Please send an mp4, mov, or webm file.\n"
                "Or send a YouTube URL."
            ))
    else:
        asyncio.create_task(send_whatsapp(to,
            "👆 Please send a video file or a YouTube URL.\n"
            "Type 'help' for instructions."
        ))

    # Twilio requires a 200 response immediately
    return PlainTextResponse("ok", status_code=200)
