"""
backend/api/geo_resolver.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NETRA Geolocation & Radar Resolution Helper
Provides guaranteed, non-null Indian coordinate resolution for Threat Catalog
indexing and National Geolocation Radar plotting.
If coordinates cannot be resolved from citizen-reported city/state or NLP text,
falls back to National Cyber Crime HQ / New Delhi (28.6139, 77.2090).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from typing import Dict, Any, Optional
import logging

try:
    from netra.pipeline.indian_gazetteer import (
        INDIAN_CITIES_GAZETTEER,
        _KEYWORDS_MAP,
        extract_indian_location_from_text,
    )
except ImportError:
    from backend.netra.pipeline.indian_gazetteer import (
        INDIAN_CITIES_GAZETTEER,
        _KEYWORDS_MAP,
        extract_indian_location_from_text,
    )

logger = logging.getLogger("netra.geo_resolver")

# National Cyber Crime Reporting Portal & Netra Command HQ (New Delhi)
FALLBACK_LAT = 28.6139
FALLBACK_LNG = 77.2090
FALLBACK_CITY = "New Delhi"
FALLBACK_STATE = "Delhi"

MODALITY_TO_THREAT_TYPE = {
    "text": "scam_text",
    "image": "image_deepfake",
    "video": "video_deepfake",
    "audio": "audio_clone",
    "scam_text": "scam_text",
    "image_deepfake": "image_deepfake",
    "video_deepfake": "video_deepfake",
    "audio_clone": "audio_clone",
}


def resolve_threat_type(media_type: Optional[str]) -> str:
    """
    Maps inbound media type to institutional Threat Catalog type:
    text -> scam_text
    image -> image_deepfake
    video -> video_deepfake
    audio -> audio_clone
    """
    if not media_type:
        return "scam_text"
    return MODALITY_TO_THREAT_TYPE.get(str(media_type).lower().strip(), "scam_text")


def resolve_incident_geolocation(
    city: Optional[str] = None,
    state: Optional[str] = None,
    text_corpus: Optional[str] = None
) -> Dict[str, Any]:
    """
    Resolves non-null geographic coordinates for incident indexing.
    Guarantees lat and lng are NEVER None.
    
    Order of precedence:
    1. Direct gazetteer match on reported city
    2. NLP extraction on reported city or combined city/state
    3. NLP extraction on state or text corpus
    4. National Cyber Crime HQ (New Delhi: 28.6139, 77.2090) fallback
    """
    # 1. Check reported city against gazetteer keywords and aliases
    if city and isinstance(city, str) and city.strip():
        city_clean = city.strip()
        city_lower = city_clean.lower()
        primary_key = _KEYWORDS_MAP.get(city_lower)
        if primary_key and primary_key in INDIAN_CITIES_GAZETTEER:
            entry = INDIAN_CITIES_GAZETTEER[primary_key]
            return {
                "lat": float(entry["lat"]),
                "lng": float(entry["lng"]),
                "city": entry["city"],
                "state": state.strip() if (state and state.strip()) else entry["state"],
                "country": "India",
                "location_source": "USER_REPORTED",
                "radar_plotted": True,
            }

        # Try NLP extraction on city token
        nlp_city = extract_indian_location_from_text(city_clean)
        if nlp_city and nlp_city.get("lat") is not None and nlp_city.get("lng") is not None:
            return {
                "lat": float(nlp_city["lat"]),
                "lng": float(nlp_city["lng"]),
                "city": nlp_city["city"],
                "state": state.strip() if (state and state.strip()) else nlp_city["state"],
                "country": "India",
                "location_source": "USER_REPORTED",
                "radar_plotted": True,
            }

    # 2. Check reported state against gazetteer
    if state and isinstance(state, str) and state.strip():
        state_clean = state.strip()
        primary_key = _KEYWORDS_MAP.get(state_clean.lower())
        if primary_key and primary_key in INDIAN_CITIES_GAZETTEER:
            entry = INDIAN_CITIES_GAZETTEER[primary_key]
            return {
                "lat": float(entry["lat"]),
                "lng": float(entry["lng"]),
                "city": city.strip() if (city and city.strip()) else entry["city"],
                "state": entry["state"],
                "country": "India",
                "location_source": "USER_REPORTED",
                "radar_plotted": True,
            }

        nlp_state = extract_indian_location_from_text(state_clean)
        if nlp_state and nlp_state.get("lat") is not None and nlp_state.get("lng") is not None:
            return {
                "lat": float(nlp_state["lat"]),
                "lng": float(nlp_state["lng"]),
                "city": city.strip() if (city and city.strip()) else nlp_state["city"],
                "state": nlp_state["state"],
                "country": "India",
                "location_source": "USER_REPORTED",
                "radar_plotted": True,
            }

    # 3. Try NLP extraction from text corpus (message body or transcript)
    if text_corpus and isinstance(text_corpus, str) and text_corpus.strip():
        nlp_text = extract_indian_location_from_text(text_corpus)
        if nlp_text and nlp_text.get("lat") is not None and nlp_text.get("lng") is not None:
            return {
                "lat": float(nlp_text["lat"]),
                "lng": float(nlp_text["lng"]),
                "city": city.strip() if (city and city.strip()) else nlp_text["city"],
                "state": state.strip() if (state and state.strip()) else nlp_text["state"],
                "country": "India",
                "location_source": "EXTRACTED_ENTITY",
                "radar_plotted": True,
            }

    # 4. Fallback to National Cyber Crime HQ / New Delhi
    return {
        "lat": FALLBACK_LAT,
        "lng": FALLBACK_LNG,
        "city": city.strip() if (city and city.strip()) else FALLBACK_CITY,
        "state": state.strip() if (state and state.strip()) else FALLBACK_STATE,
        "country": "India",
        "location_source": "USER_REPORTED" if (city and city.strip()) else "FALLBACK_HQ",
        "radar_plotted": True,
    }
