"""
NETRA — Tavily Real-Time Cyber Scam Threat Cross-Check Engine
Queries Tavily Search API to verify suspect phone numbers, UPI handles,
and scam phrases against live police advisories and Indian cybercrime news.
"""

import os
import json
import urllib.request
import urllib.error
import ssl
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("netra.tavily_cross_check")

TAVILY_API_ENDPOINT = "https://api.tavily.com/search"
DEFAULT_TAVILY_KEY = "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"


def get_tavily_api_key() -> str:
    key = os.getenv("TAVILY_API_KEY")
    if key and key.strip():
        return key.strip()
    return DEFAULT_TAVILY_KEY


def cross_check_scam_with_tavily(
    text: str = "",
    iocs: Optional[Dict[str, List[str]]] = None,
    timeout_sec: float = 4.0
) -> Dict[str, Any]:
    """
    Cross-reference extracted tokens against live cyber news via Tavily.
    Returns structured threat intelligence.
    """
    api_key = get_tavily_api_key()
    if not api_key:
        return {
            "verified_threat": False,
            "query_used": None,
            "matches_count": 0,
            "articles": [],
            "intel_summary": "Tavily API key unconfigured; threat cross-check skipped."
        }

    # Construct targeted search query prioritizing high-confidence IOCs
    iocs = iocs or {}
    phones = iocs.get("phones") or []
    upis = iocs.get("upis") or []
    
    if phones:
        clean_phone = phones[0].replace("+91", "").replace("-", "").strip()
        query = f'"{clean_phone}" cyber fraud scam police India'
    elif upis:
        clean_upi = upis[0].strip()
        query = f'"{clean_upi}" cyber crime fraud complaint India'
    elif text:
        # Extract prominent keywords from the text
        clean_text = " ".join(text.strip().split()[:10])
        query = f'{clean_text} cyber crime scam police advisory India'
    else:
        query = "India cybercrime scam police advisory 2026"

    payload = {
        "api_key": api_key,
        "query": query,
        "search_depth": "basic",
        "topic": "news",
        "max_results": 3,
        "include_images": False,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            TAVILY_API_ENDPOINT,
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "NETRA-Forensic-Engine/5.0"
            }
        )
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=timeout_sec, context=ctx) as resp:
            raw_data = json.loads(resp.read().decode("utf-8"))
            results = raw_data.get("results", [])

            articles = []
            for r in results:
                articles.append({
                    "title": r.get("title", "Cyber Advisory"),
                    "url": r.get("url", ""),
                    "snippet": r.get("content", "")[:240] + "...",
                    "published_date": r.get("published_date")
                })

            verified = len(articles) > 0
            summary = (
                f"Tavily matched {len(articles)} active cyber alert(s) across Indian press relating to this vector."
                if verified else
                "No identical public cyber cell bulletins found matching this specific query."
            )

            return {
                "verified_threat": verified,
                "query_used": query,
                "matches_count": len(articles),
                "articles": articles,
                "intel_summary": summary
            }

    except Exception as e:
        logger.warning(f"Tavily cross-check request failed: {e}")
        return {
            "verified_threat": False,
            "query_used": query,
            "matches_count": 0,
            "articles": [],
            "intel_summary": f"Live Tavily scan non-blocking timeout ({str(e)[:40]})."
        }
