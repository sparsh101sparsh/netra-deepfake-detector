"""
NETRA Central Catalog Ingestion Hook
Automatically indexes completed forensic scans (Video, Image, Audio, Text)
into the Threat Catalog and Geolocation Radar with multi-tier location resolution,
playable media URLs, and FIR legal citations.
"""

import os
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pathlib import Path

try:
    from backend.netra.pipeline.indian_gazetteer import (
        extract_indian_location_from_text,
        extract_media_exif_geolocation
    )
    from backend.api.db import insert_threat_item
except ImportError:
    from netra.pipeline.indian_gazetteer import (
        extract_indian_location_from_text,
        extract_media_exif_geolocation
    )
    from api.db import insert_threat_item

logger = logging.getLogger("netra.catalog_hook")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(ROOT_DIR, "media"))
UPLOADS_DIR = os.path.join(MEDIA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def auto_catalog_scan(
    scan_type: str, # "video", "image", "audio", "text"
    result: Dict[str, Any],
    file_bytes: Optional[bytes] = None,
    file_path: Optional[str] = None,
    filename: Optional[str] = None,
    raw_text: Optional[str] = None,
    request: Optional[Any] = None,
    explicit_job_id: Optional[str] = None
) -> str:
    """
    Unified auto-ingestion hook across all 4 modalities.
    Guarantees every completed scan enters the catalog and radar in chronological order.
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    item_id = explicit_job_id or f"SCAN-{uuid.uuid4().hex[:8].upper()}"

    # ── 1. Determine Risk, Verdict, and Fake Probability ──────────────────────
    fake_prob = 0.50
    verdict = "INCONCLUSIVE"
    risk_level = "MEDIUM"

    if scan_type == "text":
        is_scam = result.get("is_scam", False)
        risk_score = result.get("risk_score", 0)
        fake_prob = round(float(risk_score) / 100.0, 2)
        verdict = result.get("verdict", "CONFIRMED_FRAUD" if is_scam else "AUTHENTIC")
        risk_level = "CRITICAL" if fake_prob >= 0.75 else ("HIGH" if fake_prob >= 0.50 else "LOW")
    elif scan_type == "image":
        is_scam = result.get("is_scam", False)
        risk_score = result.get("composite_risk_score", result.get("risk_score", 0))
        fake_prob = round(float(risk_score) / 100.0, 2)
        verdict = result.get("composite_verdict") or result.get("verdict") or ("CONFIRMED_FRAUD" if is_scam else "AUTHENTIC")
        risk_level = result.get("composite_risk_level") or result.get("risk_level") or ("CRITICAL" if fake_prob >= 0.75 else ("HIGH" if fake_prob >= 0.50 else "LOW"))
    elif scan_type == "audio":
        fake_prob = round(float(result.get("fake_probability", 0.5)), 2)
        verdict = result.get("verdict", "VOICE_CLONE" if fake_prob >= 0.60 else "AUTHENTIC")
        risk_level = result.get("risk_level", "HIGH" if fake_prob >= 0.60 else "LOW")
    elif scan_type == "video":
        conf = float(result.get("confidence", 50))
        fake_prob = round(conf / 100.0, 2) if conf > 1.0 else round(conf, 2)
        verdict = result.get("verdict", "EDITED_VIDEO")
        risk_level = result.get("risk_level", "HIGH" if fake_prob >= 0.55 else "LOW")

    # ── 2. Determine Media Type & Threat Category ─────────────────────────────
    type_map = {
        "video": "video_deepfake",
        "image": "image_deepfake",
        "audio": "audio_clone",
        "text": "scam_text"
    }
    media_type = type_map.get(scan_type, "video_deepfake")

    scam_category = result.get("scam_type") or result.get("threat_category")
    if not scam_category:
        if result.get("analysis_mode") == "hybrid":
            scam_category = "HYBRID_SCAM_DEEPFAKE"
        elif result.get("analysis_mode") == "pure_face":
            scam_category = "FACE_SWAP" if fake_prob >= 0.50 else "AUTHENTIC_PORTRAIT"
        elif verdict in ("AUTHENTIC", "VERIFIED_AUTHENTIC", "AUTHENTIC / LOW RISK MEDIA"):
            scam_category = "VERIFIED_AUTHENTIC"
        elif media_type == "audio_clone":
            scam_category = "VOICE_CLONE"
        elif media_type == "video_deepfake":
            scam_category = "FACE_SWAP" if "FACE_SWAP" in verdict else "IMPERSONATION"
        else:
            scam_category = "DIGITAL_ARREST"

    # ── 3. 4-Tier Geolocation Resolution ──────────────────────────────────────
    lat, lng, city, state, loc_source = None, None, None, None, "ONLINE_UNMAPPED"
    device_model = "Direct Web Upload"
    software_used = "NETRA Multi-Modal V5"

    # Tier 1: EXIF GPS from Image or Video
    target_media = file_bytes or file_path
    if target_media:
        exif_geo = extract_media_exif_geolocation(target_media)
        if exif_geo:
            device_model = exif_geo.get("device_model") or device_model
            software_used = exif_geo.get("software_used") or software_used
            if exif_geo.get("lat") is not None and exif_geo.get("lng") is not None:
                lat = exif_geo["lat"]
                lng = exif_geo["lng"]
                city = exif_geo["city"]
                state = exif_geo["state"]
                loc_source = "EXACT_GPS"

    # Tier 2: NLP Gazetteer Extraction from Text / OCR / Transcript
    if lat is None:
        text_corpus = ""
        if raw_text:
            text_corpus += " " + raw_text
        if result.get("extracted_text"):
            text_corpus += " " + str(result.get("extracted_text"))
        if result.get("reason"):
            text_corpus += " " + str(result.get("reason"))
        if result.get("incident_summary"):
            text_corpus += " " + str(result.get("incident_summary"))

        nlp_loc = extract_indian_location_from_text(text_corpus)
        if nlp_loc:
            lat = nlp_loc["lat"]
            lng = nlp_loc["lng"]
            city = nlp_loc["city"]
            state = nlp_loc["state"]
            loc_source = "EXTRACTED_ENTITY"

    # Tier 3: Client IP Geolocation via Cloudflare or Request IP
    if lat is None and request:
        try:
            cf_city = request.headers.get("cf-ipcity")
            cf_country = request.headers.get("cf-ipcountry", "IN")
            if cf_city and cf_country == "IN":
                city_match = extract_indian_location_from_text(cf_city)
                if city_match:
                    lat = city_match["lat"]
                    lng = city_match["lng"]
                    city = city_match["city"]
                    state = city_match["state"]
                    loc_source = "ESTIMATED_TELECOM"
        except Exception:
            pass

    # Tier 4: National Cyber Command Hub Fallback
    if lat is None:
        lat = 28.6139
        lng = 77.2090
        city = "New Delhi (National Cyber Command Hub)"
        state = "Delhi"
        loc_source = "NATIONAL_CYBER_COMMAND"

    # ── 4. Playable Media URL & Thumbnail Setup ───────────────────────────────
    media_url = None
    thumbnail_url = None

    if scan_type == "video":
        if explicit_job_id:
            media_url = f"/api/v1/threat-intelligence/{item_id}/media"
            # If thumbnail keyframe exists
            kf_dir = os.path.join(MEDIA_DIR, "keyframes")
            cand = os.path.join(kf_dir, f"{explicit_job_id}_frame_000000_annotated.jpg")
            if os.path.exists(cand):
                thumbnail_url = f"/api/v1/media/keyframes/{os.path.basename(cand)}"
        elif result.get("media_url"):
            media_url = result["media_url"]
    elif scan_type == "image" and file_bytes:
        ext = Path(filename or "sample.png").suffix or ".png"
        img_filename = f"{item_id}{ext}"
        saved_path = os.path.join(UPLOADS_DIR, img_filename)
        with open(saved_path, "wb") as f:
            f.write(file_bytes)
        media_url = f"/api/v1/media/uploads/{img_filename}"
        if result.get("facial_analysis") and result["facial_analysis"].get("annotated_preview_url"):
            thumbnail_url = result["facial_analysis"]["annotated_preview_url"]
        else:
            thumbnail_url = media_url
    elif scan_type == "audio" and file_bytes:
        ext = Path(filename or "sample.wav").suffix or ".wav"
        aud_filename = f"{item_id}{ext}"
        saved_path = os.path.join(UPLOADS_DIR, aud_filename)
        with open(saved_path, "wb") as f:
            f.write(file_bytes)
        media_url = f"/api/v1/media/uploads/{aud_filename}"

    # ── 5. Standardize Title & Summary ────────────────────────────────────────
    title_sub = filename or (raw_text[:40] + "..." if raw_text else "Direct Upload")
    clean_title = f"{scan_type.capitalize()} Analysis: {title_sub} ({verdict.replace('_', ' ')})"

    iocs = result.get("extracted_iocs") or {
        "phones": result.get("extracted_phones", []),
        "upis": result.get("extracted_upis", []),
        "urls": result.get("extracted_urls", []),
    }

    summary = (
        result.get("analysis_reason")
        or result.get("reason")
        or result.get("forensic_report")
        or f"Forensic scan of {scan_type} media verified by NETRA multi-modal detection engine."
    )

    catalog_entry = {
        "id": item_id,
        "title": clean_title,
        "type": media_type,
        "threat_category": scam_category,
        "source_platform": "Web Upload",
        "fake_probability": fake_prob,
        "verdict": verdict,
        "risk_level": risk_level,
        "thumbnail_url": thumbnail_url,
        "media_url": media_url,
        "lat": lat,
        "lng": lng,
        "city": city,
        "state": state,
        "country": "India",
        "location_source": loc_source,
        "device_model": device_model,
        "software_used": software_used,
        "extracted_iocs": iocs,
        "fir_dossier": {
            "incident_summary": summary,
            "applicable_laws": ["Synthetic Fraud Artifact Quarantine", "Communication Channel Isolation"],
            "recommended_action": "Incident telemetry registered in NETRA threat ledger."
        },
        "upvotes_count": 1,
        "created_at": now_str
    }

    insert_threat_item(catalog_entry)
    logger.info(f"Auto-cataloged {item_id} [{media_type}] in {city}, {state} (lat={lat}, lng={lng})")
    return item_id
