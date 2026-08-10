from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from netra.pipeline.scam_detector import scam_detector_engine
from typing import Dict, Any, List, Optional
import time

router = APIRouter()

class ScamRequest(BaseModel):
    text: str

class ScamResponse(BaseModel):
    is_scam: bool
    risk_score: int
    confidence: int
    verdict: str
    scam_type: Optional[str] = None
    matched_rules: List[str] = []
    analysis_method: str
    processing_time_ms: int
    llm_reason: Optional[str] = None

@router.post("/detect/scam", response_model=ScamResponse)
async def detect_scam(request: ScamRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) < 5:
        raise HTTPException(status_code=400, detail="Text too short to analyze.")

    t0 = time.time()
    try:
        raw = scam_detector_engine.detect(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    elapsed_ms = int((time.time() - t0) * 1000)

    score = raw.get("risk_score", 0)
    is_scam = raw.get("is_scam", False)
    confidence = raw.get("confidence", 0)
    matched = raw.get("matched_rules", [])
    method = raw.get("analysis_method", "rule_engine")

    # Determine verdict label
    if score >= 70:
        verdict = "CRITICAL — Almost Certainly a Scam"
    elif score >= 40:
        verdict = "HIGH RISK — Likely Scam"
    elif score >= 15:
        verdict = "CAUTION — Suspicious Patterns Found"
    else:
        verdict = "SAFE — No Suspicious Patterns"

    # Map reason → llm_reason for frontend
    llm_reason = raw.get("llm_reason") or raw.get("reason")
    if llm_reason in ("No suspicious patterns detected.", None):
        llm_reason = None

    return ScamResponse(
        is_scam=is_scam,
        risk_score=score,
        confidence=confidence,
        verdict=verdict,
        scam_type=raw.get("scam_type") or None,
        matched_rules=matched,
        analysis_method=method,
        processing_time_ms=elapsed_ms,
        llm_reason=llm_reason,
    )
