import os
import time
import hashlib
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from netra.pipeline.scam_detector import scam_detector_engine
from netra.services.ocr_scam_pipeline import extract_iocs_from_text, run_image_ocr_and_scam_detection
from ..db import insert_threat_item

router = APIRouter()

DEFAULT_BOT_SECRET = "netra_bot_secret_2026"

def verify_bot_secret(x_bot_secret: Optional[str] = Header(None)):
    expected_secret = os.getenv("BOT_SECRET_KEY", DEFAULT_BOT_SECRET)
    if not x_bot_secret or x_bot_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Bot-Secret header."
        )
    return True

class BotIngestRequest(BaseModel):
    media_type: str = Field(..., description="text | image | audio | video")
    content: str = Field(..., description="Text message content or base64/url for image")
    sender_id: str = Field(..., description="User WhatsApp or Telegram identifier")
    source_platform: str = Field(default="whatsapp", description="whatsapp | telegram")

class BotIngestResponse(BaseModel):
    status: str
    is_scam: bool
    risk_score: int
    confidence: int
    verdict: str
    scam_type: Optional[str] = None
    matched_rules: List[str] = []
    extracted_iocs: Dict[str, Any] = {}
    analysis_reason: str
    processing_time_ms: int
    can_report: bool = True
    report_token: Optional[str] = None

class BotConfirmReportRequest(BaseModel):
    report_token: str
    title: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    source_platform: str = "whatsapp"
    sender_id: Optional[str] = None

# In-memory transient cache for confirmed reporting (expires naturally)
PENDING_REPORTS: Dict[str, Dict[str, Any]] = {}

@router.post("/ingest/bot", response_model=BotIngestResponse)
async def ingest_bot_message(
    payload: BotIngestRequest,
    authenticated: bool = Header(None, alias="X-Bot-Secret")
):
    """
    Unified Ingest Contract for n8n WhatsApp and Telegram Bot automations.
    Analyzes user message without auto-contaminating the threat catalog.
    """
    expected_secret = os.getenv("BOT_SECRET_KEY", DEFAULT_BOT_SECRET)
    if payload.media_type not in ("text", "image"):
        return BotIngestResponse(
            status="unsupported_media",
            is_scam=False,
            risk_score=0,
            confidence=0,
            verdict="Media type not supported synchronously. Send text or screenshots.",
            scam_type=None,
            matched_rules=[],
            extracted_iocs={},
            analysis_reason="Asynchronous video/audio analysis requires direct upload via web sandbox.",
            processing_time_ms=0,
            can_report=False
        )

    t0 = time.time()
    extracted_iocs = {}
    
    if payload.media_type == "text":
        text = payload.content.strip()
        if len(text) < 5:
            raise HTTPException(status_code=400, detail="Text too short to evaluate.")
        
        raw = scam_detector_engine.detect(text)
        extracted_iocs = extract_iocs_from_text(text)
        
    elif payload.media_type == "image":
        # Process OCR image
        return BotIngestResponse(
            status="error",
            is_scam=False,
            risk_score=0,
            confidence=0,
            verdict="Image file processing requires binary multipart endpoint.",
            scam_type=None,
            matched_rules=[],
            extracted_iocs={},
            analysis_reason="Please send text or forward screenshot text.",
            processing_time_ms=0,
            can_report=False
        )

    elapsed_ms = int((time.time() - t0) * 1000)
    score = raw.get("risk_score", 0)
    is_scam = raw.get("is_scam", False)
    confidence = raw.get("confidence", 0)
    matched = raw.get("matched_rules", [])
    scam_type = raw.get("scam_type") or "suspicious_message"
    reason = raw.get("analysis_reason") or raw.get("reason") or "No patterns detected."

    # Determine verdict label
    if is_scam:
        if score >= 70:
            verdict = "CRITICAL — Almost Certainly a Scam"
        elif score >= 40:
            verdict = "HIGH RISK — Likely Scam"
        else:
            verdict = "CAUTION — Suspicious Patterns Found"
    else:
        verdict = "SAFE — No Suspicious Patterns Detected"

    # Generate a report token so the user can reply YES in n8n to report
    report_token = hashlib.sha256(f"{payload.sender_id}_{time.time()}_{text[:20]}".encode()).hexdigest()[:16]
    PENDING_REPORTS[report_token] = {
        "text": text,
        "is_scam": is_scam,
        "risk_score": score,
        "scam_type": scam_type,
        "verdict": verdict,
        "extracted_iocs": extracted_iocs,
        "source_platform": payload.source_platform,
        "created_at": time.time()
    }

    return BotIngestResponse(
        status="success",
        is_scam=is_scam,
        risk_score=score,
        confidence=confidence,
        verdict=verdict,
        scam_type=scam_type,
        matched_rules=matched,
        extracted_iocs=extracted_iocs,
        analysis_reason=reason,
        processing_time_ms=elapsed_ms,
        can_report=is_scam,
        report_token=report_token if is_scam else None
    )

@router.post("/ingest/bot/confirm-report")
async def confirm_bot_report(
    payload: BotConfirmReportRequest,
    authenticated: bool = Header(None, alias="X-Bot-Secret")
):
    """
    Called by n8n when user explicitly replies 'YES' to submit threat to NETRA catalog.
    Prevents unvetted automated catalog poisoning.
    """
    token_data = PENDING_REPORTS.get(payload.report_token)
    if not token_data:
        raise HTTPException(status_code=404, detail="Report token expired or invalid.")

    # Insert verified report into catalog
    category_map = {
        "digital_arrest": "DIGITAL_ARREST",
        "electricity_kyc": "ELECTRICITY_KYC",
        "stock_trading_fraud": "STOCK_FRAUD",
        "job_scam": "JOB_SCAM",
        "banking_upi_phishing": "BANKING_PHISHING",
        "apk_malware": "APK_TROJAN"
    }
    cat = category_map.get(token_data.get("scam_type", "").lower(), "SCAM_ANALYSIS")

    item_data = {
        "title": payload.title or f"Reported {cat.replace('_', ' ')} Incident",
        "type": "scam_text",
        "threat_category": cat,
        "source_platform": payload.source_platform.capitalize(),
        "fake_probability": token_data["risk_score"] / 100.0,
        "verdict": token_data["verdict"],
        "risk_level": "HIGH" if token_data["risk_score"] >= 70 else "MEDIUM",
        "extracted_iocs": token_data["extracted_iocs"],
        "city": payload.city,
        "state": payload.state,
        "location_source": "USER_REPORTED" if payload.city else None
    }

    item_id = insert_threat_item(item_data)
    # Remove from pending
    PENDING_REPORTS.pop(payload.report_token, None)

    return {
        "status": "reported",
        "catalog_id": item_id,
        "message": "Threat successfully indexed into Project NETRA Threat Intelligence Catalog."
    }
