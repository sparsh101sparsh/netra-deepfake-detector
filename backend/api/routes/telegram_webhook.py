"""
backend/api/routes/telegram_webhook.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 8 — Telegram Bot Webhook

Setup Instructions:
  1. Create bot via https://t.me/BotFather → copy token to .env as TELEGRAM_BOT_TOKEN
  2. Set webhook URL:
     curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
          -H "Content-Type: application/json" \
          -d '{"url": "https://<EC2-IP>/api/v1/telegram/webhook"}'
  3. Verify: curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

Supported commands:
  /start   — welcome message
  /help    — usage instructions
  /status  <job_id> — check a running job
  Send a video file → automatically analyses it
  Send a YouTube URL → downloads and analyses (yt-dlp, max 100MB/~10min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
import os
import asyncio
from fastapi import APIRouter, Request, HTTPException
import httpx

from netra.bot_utils import (
    download_file, submit_to_api, poll_for_result,
    format_result_telegram, format_progress_message
)

router = APIRouter()

TELEGRAM_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_API     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
MAX_FILE_SIZE_MB = 100


async def send_message(chat_id: int, text: str, parse_mode: str = "Markdown") -> None:
    """Send a Telegram message."""
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json={
            "chat_id":    chat_id,
            "text":       text,
            "parse_mode": parse_mode,
        })


async def get_file_url(file_id: str) -> str:
    """Resolve Telegram file_id → direct download URL."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{TELEGRAM_API}/getFile", params={"file_id": file_id})
        file_path = r.json()["result"]["file_path"]
    return f"https://api.telegram.org/file/bot{TELEGRAM_TOKEN}/{file_path}"


async def handle_video(chat_id: int, file_id: str, file_size: int) -> None:
    """Download video from Telegram CDN → NETRA API → return result."""
    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        await send_message(chat_id,
            f"❌ File too large ({file_size//1024//1024}MB). Maximum is {MAX_FILE_SIZE_MB}MB.\n"
            "Please send a shorter clip.")
        return

    await send_message(chat_id, "⏳ Downloading video from Telegram...")

    url = await get_file_url(file_id)
    video_bytes, err = await download_file(url)
    if err:
        await send_message(chat_id, f"❌ Download failed: {err}")
        return

    await send_message(chat_id, "⬆️ Uploading to NETRA for analysis...")

    job_id, err = await submit_to_api(video_bytes, "telegram_video.mp4")
    if err:
        await send_message(chat_id, f"❌ Analysis failed: {err}")
        return

    await send_message(chat_id,
        f"✅ Analysis started!\n*Job ID:* `{job_id}`\n\n"
        "I'll update you when done (usually 20–40 seconds)...")

    # Poll in background and send result
    result, err = await poll_for_result(job_id)
    if err:
        await send_message(chat_id, f"⚠️ {err}")
    elif result:
        await send_message(chat_id, format_result_telegram(result, job_id))
    else:
        await send_message(chat_id, "⚠️ Analysis produced no result. Try again.")


async def handle_youtube_url(chat_id: int, url: str) -> None:
    """Download YouTube video via yt-dlp → NETRA API."""
    import tempfile
    import subprocess
    import os

    await send_message(chat_id, f"⬇️ Downloading YouTube video (max 100MB, ~10min clip)...")

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
                await send_message(chat_id, "❌ Could not download this YouTube video. Try uploading the file directly.")
                return
        except Exception as e:
            await send_message(chat_id, f"❌ Download error: {e}")
            return

        with open(outpath, "rb") as f:
            video_bytes = f.read()

    await send_message(chat_id, f"⬆️ Downloaded ({len(video_bytes)//1024//1024}MB). Submitting to NETRA...")
    job_id, err = await submit_to_api(video_bytes, "youtube_video.mp4")
    if err:
        await send_message(chat_id, f"❌ {err}")
        return

    await send_message(chat_id, f"✅ Job ID: `{job_id}` — analysing now...")
    result, err = await poll_for_result(job_id)
    if err:
        await send_message(chat_id, f"⚠️ {err}")
    elif result:
        await send_message(chat_id, format_result_telegram(result, job_id))


@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Receive Telegram webhook updates."""
    if not TELEGRAM_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    try:
        update = await request.json()
    except Exception:
        return {"ok": True}

    msg  = update.get("message", {})
    chat = msg.get("chat", {})
    chat_id = chat.get("id")

    if not chat_id:
        return {"ok": True}

    text   = msg.get("text", "")
    video  = msg.get("video") or msg.get("document")  # .mp4 sent as document

    # ── Command routing ──────────────────────────────────────────────────────
    if text.startswith("/start"):
        await send_message(chat_id,
            "👁️ *NETRA Deepfake Detector*\n\n"
            "Send me a video file or a YouTube URL and I'll tell you if it's real or fake.\n\n"
            "• Max file size: 100MB\n"
            "• Supported: mp4, mov, webm\n"
            "• Typical analysis time: 20–40 seconds\n\n"
            "Commands:\n"
            "/help — instructions\n"
            "/status <job\\_id> — check a running job"
        )

    elif text.startswith("/help"):
        await send_message(chat_id,
            "📖 *NETRA Help*\n\n"
            "1. Send a video file directly\n"
            "2. Or paste a YouTube URL\n\n"
            "The bot will:\n"
            "• Upload to NETRA's AWS pipeline\n"
            "• Run visual + audio deepfake detection\n"
            "• Generate a forensic report via Amazon Bedrock\n"
            "• Return a verdict (AUTHENTIC / SUSPICIOUS / FACE\\_SWAP / VOICE\\_CLONE)"
        )

    elif text.startswith("/status "):
        job_id = text.split(" ", 1)[1].strip()
        async with httpx.AsyncClient(timeout=10) as client:
            API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")
            r = await client.get(f"{API_URL}/api/v1/jobs/{job_id}")
            if r.status_code == 200:
                data = r.json()
                await send_message(chat_id,
                    f"*Job:* `{job_id[:8]}...`\n"
                    f"*Status:* `{data.get('status')}`\n"
                    f"*Progress:* `{data.get('progress', 0)}%`\n"
                    f"*Stage:* _{data.get('current_stage', '')}_"
                )
            else:
                await send_message(chat_id, f"❌ Job not found: `{job_id[:8]}...`")

    elif text and ("youtube.com" in text or "youtu.be" in text):
        asyncio.create_task(handle_youtube_url(chat_id, text.strip()))

    elif video:
        file_id   = video.get("file_id", "")
        file_size = video.get("file_size", 0)
        asyncio.create_task(handle_video(chat_id, file_id, file_size))

    else:
        await send_message(chat_id,
            "👆 Please send a video file or a YouTube URL.\n"
            "Type /help for instructions.")

    return {"ok": True}
