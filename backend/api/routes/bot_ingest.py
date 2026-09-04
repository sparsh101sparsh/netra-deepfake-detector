"""
backend/api/routes/bot_ingest.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unified Bot & n8n Ingestion Contract
Designed specifically for n8n workflow automations and WhatsApp bot relays.
Analyzes citizen messages (Text, Images/Screenshots) with cryptographic
token verification, fraud classification, IOC extraction, and Threat Catalog
indexing without unvetted database contamination.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import time
import base64
import hashlib
import logging
from typing import Optional, Dict, Any, List
import httpx
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from netra.pipeline.scam_detector import scam_detector_engine
from netra.services.ocr_scam_pipeline import extract_iocs_from_text, run_image_ocr_and_scam_detection
from ..db import insert_threat_item

logger = logging.getLogger("netra.n8n_ingest")
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
    media_type: str = Field(..., description="text | image | video | audio")
    content: str = Field(..., description="Text message content, or base64 string / URL for media")
    sender_id: str = Field(..., description="Citizen WhatsApp identifier or phone number")
    source_platform: str = Field(default="whatsapp", description="whatsapp | n8n | web")


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
    catalog_id: Optional[str] = None


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
    x_bot_secret: Optional[str] = Header(None, alias="X-Bot-Secret")
):
    """
    Unified Ingestion Endpoint for n8n and WhatsApp bot automations.
    Analyzes submitted message/screenshot synchronously with sub-second latency.
    """
    expected_secret = os.getenv("BOT_SECRET_KEY", DEFAULT_BOT_SECRET)
    t0 = time.time()
    extracted_iocs = {}
    matched_rules = []
    catalog_id = None

    if payload.media_type == "text":
        text = payload.content.strip()
        if len(text) < 3:
            raise HTTPException(status_code=400, detail="Text too short to evaluate.")

        raw = scam_detector_engine.detect(text)
        extracted_iocs = extract_iocs_from_text(text)
        score = raw.get("risk_score", 0)
        is_scam = raw.get("is_scam", False)
        confidence = raw.get("confidence", 85)
        matched_rules = raw.get("matched_rules", [])
        scam_type = raw.get("scam_type") or "suspicious_message"
        reason = raw.get("analysis_reason") or raw.get("reason") or "No malicious markers detected."

    elif payload.media_type == "image":
        # Decode base64 or download image URL
        img_bytes = None
        content_str = payload.content.strip()

        if content_str.startswith("http://") or content_str.startswith("https://"):
            try:
                import requests
                resp = requests.get(content_str, timeout=20.0)
                if resp.status_code == 200:
                    img_bytes = resp.content
            except Exception as e:
                logger.error(f"Failed to fetch image URL in n8n ingest: {e}")
        elif content_str.startswith("data:image"):
            try:
                base64_data = content_str.split(",", 1)[1]
                img_bytes = base64.b64decode(base64_data)
            except Exception as e:
                logger.error(f"Failed to decode base64 data URI: {e}")
        else:
            try:
                img_bytes = base64.b64decode(content_str)
            except Exception:
                pass

        if not img_bytes:
            return BotIngestResponse(
                status="error",
                is_scam=False,
                risk_score=0,
                confidence=0,
                verdict="Could not retrieve image bytes. Provide valid image URL or base64.",
                scam_type=None,
                matched_rules=[],
                extracted_iocs={},
                analysis_reason="Failed to decode image input.",
                processing_time_ms=int((time.time() - t0) * 1000),
                can_report=False
            )

        ocr_res = run_image_ocr_and_scam_detection(img_bytes, filename="n8n_ingest.jpg")
        is_scam = ocr_res.get("is_scam", False)
        score = ocr_res.get("risk_score", 0)
        confidence = ocr_res.get("confidence", 80)
        matched_rules = ocr_res.get("matched_rules", [])
        scam_type = ocr_res.get("scam_type", "forged_screenshot")
        reason = ocr_res.get("verdict_label", "Visual OCR completed.")
        extracted_iocs = ocr_res.get("extracted_iocs", {})

    else:
        return BotIngestResponse(
            status="unsupported_media",
            is_scam=False,
            risk_score=0,
            confidence=0,
            verdict="Synchronous n8n ingest supports 'text' and 'image'. Use video endpoints for video.",
            scam_type=None,
            matched_rules=[],
            extracted_iocs={},
            analysis_reason="Unsupported media type for synchronous evaluation.",
            processing_time_ms=0,
            can_report=False
        )

    elapsed_ms = int((time.time() - t0) * 1000)

    # Determine verdict label
    if is_scam:
        if score >= 70:
            verdict = "CRITICAL — Confirmed Scam / Cyber Extortion"
        elif score >= 40:
            verdict = "HIGH RISK — Suspicious Phishing Pattern"
        else:
            verdict = "CAUTION — Deceptive Patterns Found"
    else:
        verdict = "SAFE — No Fraud Patterns Detected"

    # Generate a report token so n8n can confirm and index into catalog
    report_token = hashlib.sha256(f"{payload.sender_id}_{time.time()}_{payload.content[:20]}".encode()).hexdigest()[:16]
    PENDING_REPORTS[report_token] = {
        "text": payload.content[:500],
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
        matched_rules=matched_rules,
        extracted_iocs=extracted_iocs,
        analysis_reason=reason,
        processing_time_ms=elapsed_ms,
        can_report=is_scam,
        report_token=report_token if is_scam else None,
        catalog_id=catalog_id
    )


@router.post("/ingest/bot/confirm-report")
async def confirm_bot_report(
    payload: BotConfirmReportRequest,
    x_bot_secret: Optional[str] = Header(None, alias="X-Bot-Secret")
):
    """
    Called by n8n when user confirms submission or when automated workflow
    auto-submits high-risk threats to the NETRA Threat Catalog.
    """
    token_data = PENDING_REPORTS.get(payload.report_token)
    if not token_data:
        raise HTTPException(status_code=404, detail="Report token expired or invalid.")

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
    PENDING_REPORTS.pop(payload.report_token, None)

    return {
        "status": "reported",
        "catalog_id": item_id,
        "message": "Threat successfully indexed into Project NETRA Threat Intelligence Catalog."
    }
