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
    reason: Optional[str] = None
    analysis_reason: Optional[str] = None
    llm_reason: Optional[str] = None
    tavily_threat_intel: Optional[Dict[str, Any]] = None

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
    method = raw.get("analysis_method", "random_forest_ml + heuristic_rule_matrix")
    reason = raw.get("reason") or raw.get("analysis_reason")

    # Determine verdict label
    if is_scam:
        if score >= 70:
            verdict = "CRITICAL — Almost Certainly a Scam"
        elif score >= 40:
            verdict = "HIGH RISK — Likely Scam"
        else:
            verdict = "CAUTION — Suspicious Patterns Found"
    else:
        if score >= 40:
            verdict = "CAUTION — Low Risk / Inconclusive"
        else:
            verdict = "SAFE — No Suspicious Patterns"

    # Auto-index text analysis into Threat Catalog
    try:
        from ..db import insert_threat_item
        import uuid
        txt_id = f"TXT-{uuid.uuid4().hex[:8].upper()}"
        preview = text[:80] + ("..." if len(text) > 80 else "")
        insert_threat_item({
            "id": txt_id,
            "title": f"Scam Text Intercept: \"{preview}\"",
            "type": "scam_text",
            "threat_category": raw.get("scam_type") or ("PHISHING" if is_scam else "VERIFIED_AUTHENTIC"),
            "source_platform": "SMS / Messaging Sandbox",
            "fake_probability": round(score / 100.0, 2),
            "verdict": verdict,
            "risk_level": "CRITICAL" if score >= 70 else ("HIGH" if score >= 40 else "LOW"),
            "lat": 28.7041,
            "lng": 77.1025,
            "city": "Cyber Ingest Node",
            "state": "National Threat Stream",
            "location_source": "TELECOM_SIGNATURE",
            "device_model": "Mobile Messaging Gateway",
            "software_used": method,
            "extracted_iocs": {
                "rules": matched,
            },
            "fir_dossier": {
                "incident_summary": reason or "Text evaluated for social engineering and financial fraud signals.",
                "applicable_laws": ["IT Act 2000 Section 66D", "BNS 2023 Section 318(4)"],
                "recommended_action": "Blacklist originating sender ID with telecom operators."
            }
        })
    except Exception:
        pass

    # Real-time Tavily Cyber Threat Intelligence Cross-Check
    tavily_intel = None
    try:
        from netra.services.tavily_cross_check import cross_check_scam_with_tavily
        tavily_intel = cross_check_scam_with_tavily(text=text)
    except Exception:
        pass

    return ScamResponse(
        is_scam=is_scam,
        risk_score=score,
        confidence=confidence,
        verdict=verdict,
        scam_type=raw.get("scam_type") or None,
        matched_rules=matched,
        analysis_method=method,
        processing_time_ms=elapsed_ms,
        reason=reason,
        analysis_reason=reason,
        llm_reason=reason,
        tavily_threat_intel=tavily_intel,
    )
