import os, sys
from dotenv import load_dotenv

# Ensure backend directory is in sys.path regardless of execution working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Ensure environment variables are loaded prior to route initialization
root_env = os.path.join(os.path.dirname(backend_dir), ".env")
backend_env = os.path.join(backend_dir, ".env")
if os.path.exists(root_env): load_dotenv(root_env)
if os.path.exists(backend_env): load_dotenv(backend_env)

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone

from .routes import detect, jobs, workers, scam, public_api, threat_intel, news_routes, community, bot_ingest, audio_detect, whatsapp_webhook
from netra.services.tavily_crawler import start_24h_background_worker

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_24h_background_worker()
    
    # Background model pre-warming daemon thread (non-blocking)
    import threading
    def _warmup_models():
        try:
            from netra.pipeline.rapidocr_engine import get_rapid_ocr
            get_rapid_ocr()
        except Exception:
            pass
        try:
            from netra.services.scam_detector import scam_detector_engine
            scam_detector_engine.predict_scam("Sample verification ping")
        except Exception:
            pass
    threading.Thread(target=_warmup_models, daemon=True, name="netra-prewarm").start()

    yield

app = FastAPI(
    title="NETRA API",
    version="5.1",
    description="Multi-Modal Deepfake Detection & Threat Intelligence Platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )

app.include_router(detect.router, prefix="/api/v1")
app.include_router(audio_detect.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(workers.router, prefix="/api/v1")
app.include_router(scam.router, prefix="/api/v1")
app.include_router(threat_intel.router, prefix="/api/v1")
app.include_router(public_api.router, prefix="/api/v1/public")
app.include_router(news_routes.router, prefix="/api/v1")
app.include_router(community.router, prefix="/api/v1")
app.include_router(bot_ingest.router, prefix="/api/v1")
app.include_router(whatsapp_webhook.router, prefix="/api/v1")
app.include_router(whatsapp_webhook.router, prefix="")


# Media Storage Mounting (videos, images, audio)
MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
KEYFRAMES_DIR = os.path.join(MEDIA_DIR, "keyframes")
os.makedirs(os.path.join(MEDIA_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(MEDIA_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(MEDIA_DIR, "audio"), exist_ok=True)
os.makedirs(KEYFRAMES_DIR, exist_ok=True)

@app.api_route("/api/v1/media/keyframes/{filename}", methods=["GET", "HEAD"])
async def get_media_keyframe(filename: str, request: Request):
    """
    Serves forensic keyframe JPEG images. Checks local media cache first;
    if absent (e.g. cloud container), proxies directly from S3 bucket netra-media-mumbai.
    """
    from fastapi.responses import FileResponse, Response
    local_path = os.path.join(KEYFRAMES_DIR, filename)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return FileResponse(local_path, media_type="image/jpeg")

    # Extract job_id from filename pattern: {job_id}_frame_{num}_annotated.jpg
    job_id = filename.split("_frame_")[0] if "_frame_" in filename else ""
    candidate_keys = []
    if job_id:
        candidate_keys.append(f"{job_id}/keyframes/{filename}")
    candidate_keys.extend([
        f"keyframes/{filename}",
        filename,
    ])

    try:
        from .routes.detect import get_boto3_client, get_s3_bucket
        s3 = get_boto3_client("s3")
        bucket = get_s3_bucket()

        found_key = None
        for key in candidate_keys:
            try:
                s3.head_object(Bucket=bucket, Key=key)
                found_key = key
                break
            except Exception:
                continue

        if not found_key:
            return Response(status_code=404, content="Keyframe not found in storage", media_type="text/plain")

        if request.method == "HEAD":
            head = s3.head_object(Bucket=bucket, Key=found_key)
            return Response(
                status_code=200,
                headers={
                    "Content-Type": "image/jpeg",
                    "Content-Length": str(head.get("ContentLength", 0)),
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
                media_type="image/jpeg"
            )

        obj = s3.get_object(Bucket=bucket, Key=found_key)
        img_bytes = obj["Body"].read()

        # Cache on disk
        try:
            with open(local_path, "wb") as f:
                f.write(img_bytes)
        except Exception:
            pass

        return Response(
            content=img_bytes,
            status_code=200,
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=86400",
            },
            media_type="image/jpeg"
        )
    except Exception as err:
        return Response(status_code=404, content=f"Keyframe retrieval failed: {err}", media_type="text/plain")

app.mount("/api/v1/media", StaticFiles(directory=MEDIA_DIR), name="media")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.0", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    return """
    <!DOCTYPE html>
    <html>
    <head><title>NETRA - Privacy Policy</title><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:0 20px;color:#333;}</style></head>
    <body>
        <h1>NETRA AI - Privacy Policy</h1>
        <p><strong>Last Updated:</strong> September 2026</p>
        <p>NETRA ("we", "our") is an AI forensic media integrity defense and threat intelligence system. This Privacy Policy explains how we process information when you interact with the NETRA WhatsApp Bot and API services.</p>
        <h2>1. Information We Collect</h2>
        <p>We receive incoming media (audio, video, images, or text) submitted voluntarily by users for synthetic media and deepfake detection analysis.</p>
        <h2>2. Use of Information</h2>
        <p>Submitted media is strictly evaluated using automated forensic models to determine authenticity and detect synthetic manipulations or fraudulent indicators.</p>
        <h2>3. Data Retention and Protection</h2>
        <p>Data submitted for forensic analysis is retained only as long as necessary to provide detection reports and populate aggregated threat intelligence metrics. We do not sell or monetize personal user data.</p>
        <h2>4. Contact</h2>
        <p>For inquiries regarding this policy, contact support@netra.gov.in.</p>
    </body>
    </html>
    """

@app.get("/terms", response_class=HTMLResponse)
async def terms_of_service():
    return """
    <!DOCTYPE html>
    <html>
    <head><title>NETRA - Terms of Service</title><meta charset="utf-8"><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6;padding:0 20px;color:#333;}</style></head>
    <body>
        <h1>NETRA AI - Terms of Service</h1>
        <p>NETRA provides AI-driven digital forensics and scam text scanning services for informational and media integrity validation purposes.</p>
    </body>
    </html>
    """


@app.get("/")
async def root():
    return {
        "service": "NETRA Global Threat Intelligence & Deepfake API",
        "version": "5.0",
        "docs": "/docs",
        "endpoints": [
            "/api/v1/threat-intelligence/radar",
            "/api/v1/threat-intelligence/catalog",
            "/api/v1/public/detect/scam-text",
            "/api/v1/public/detect/image"
        ]
    }
