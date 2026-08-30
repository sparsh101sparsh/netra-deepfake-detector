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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone

from .routes import detect, jobs, workers, scam, public_api, threat_intel, news_routes, community, bot_ingest, audio_detect, whatsapp_webhook
from netra.services.tavily_crawler import start_24h_background_worker

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_24h_background_worker()
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
