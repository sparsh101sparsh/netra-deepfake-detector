from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid, boto3, json, asyncio, os, time
from datetime import datetime
from .models.schemas import JobStatus, DetectResponse
from .routes import detect, jobs

app = FastAPI(title="NETRA API", version="5.0", description="Multi-Modal Deepfake Detection Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://netra-deepfake-detector.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")

# Mount WhatsApp Twilio Webhook
from .routes import whatsapp_webhook
app.include_router(whatsapp_webhook.router, prefix="/api/whatsapp")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "5.0", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
async def root():
    return {"service": "NETRA API", "version": "5.0", "docs": "/docs"}
