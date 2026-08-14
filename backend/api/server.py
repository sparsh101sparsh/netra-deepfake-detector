import os
from dotenv import load_dotenv

# Ensure environment variables are loaded prior to route initialization
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(root_env): load_dotenv(root_env)
if os.path.exists(backend_env): load_dotenv(backend_env)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .routes import detect, jobs, scam, public_api, threat_intel, news_routes, community, bot_ingest
from netra.services.tavily_crawler import start_24h_background_worker

app = FastAPI(title="NETRA API", version="5.1", description="Multi-Modal Deepfake Detection & Threat Intelligence Platform")

@app.on_event("startup")
async def startup_event():
    start_24h_background_worker()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )

app.include_router(detect.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(scam.router, prefix="/api/v1")
app.include_router(threat_intel.router, prefix="/api/v1")
app.include_router(public_api.router, prefix="/api/v1/public")
app.include_router(news_routes.router, prefix="/api/v1")
app.include_router(community.router, prefix="/api/v1")
app.include_router(bot_ingest.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.0", "timestamp": datetime.utcnow().isoformat()}

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
