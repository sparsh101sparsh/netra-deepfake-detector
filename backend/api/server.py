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

from .routes import detect, jobs, workers, scam, public_api, threat_intel, news_routes, community, bot_ingest, audio_detect
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

# Media Storage Mounting (videos, images, audio)
MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
os.makedirs(os.path.join(MEDIA_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(MEDIA_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(MEDIA_DIR, "audio"), exist_ok=True)
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
