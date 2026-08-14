"""
NETRA — Tavily Cyber Scam Intelligence Crawler
Thin adapter layer that delegates entirely to the production cyber_scam_feed package.

The cyber_scam_feed package (34/34 adversarial tests passing) provides:
  - TavilySearchEngine    — multi-vector concurrent search, rate-limit backoff
  - NLP Entity Extractor  — Rs-loss parsing, location, MO, severity classification
  - ScamStorage           — WAL-mode SQLite, threading.Lock(), zero-duplicate guarantee
  - ScamFeedPipeline      — full orchestration end-to-end
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger("netra.tavily_crawler")

# Resolve the cyber_scam_feed package — works locally and on Render
# Local:  …/newantigravworkfolder/netra/backend/netra/services/ → parents[4] = newantigravworkfolder
# Render: …/netra/backend/netra/services/                       → parents[3] = netra repo root
_THIS = Path(__file__).resolve()
for _depth in [4, 3, 2]:
    _candidate = _THIS.parents[_depth]
    if (_candidate / "cyber_scam_feed" / "__init__.py").exists():
        _REPO_ROOT = _candidate
        break
else:
    _REPO_ROOT = _THIS.parents[3]  # fallback

if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

try:
    from cyber_scam_feed.storage import ScamStorage
    from cyber_scam_feed.pipeline import ScamFeedPipeline
    from cyber_scam_feed.config import DEFAULT_DB_PATH
    _ENGINE_OK = True
    logger.info("cyber_scam_feed production engine loaded successfully.")
except ImportError as e:
    _ENGINE_OK = False
    logger.warning(f"cyber_scam_feed not importable — empty feed. Error: {e}")

_storage = None

def _get_storage():
    global _storage
    if _storage is None:
        if not _ENGINE_OK:
            raise RuntimeError("cyber_scam_feed not available")
        _storage = ScamStorage(db_path=DEFAULT_DB_PATH)
    return _storage


def get_latest_scam_news(limit: int = 15) -> List[Dict[str, Any]]:
    """
    Returns latest verified cyber scam news from the production WAL-mode SQLite store.
    Field names remapped to match both old backend schema and new enriched ArticleCard fields.
    """
    if not _ENGINE_OK:
        return []
    try:
        storage = _get_storage()
        summary = storage.get_summary()
        reports = summary.reports[:limit]
        feed = []
        for r in reports:
            feed.append({
                "id":                 r.id,
                "title":              r.title,
                "summary":            r.summary or "",
                "category":           r.category or "CYBER_FRAUD",
                # Both key names for frontend compatibility
                "risk_level":         r.severity or "HIGH",
                "severity":           r.severity or "HIGH",
                "source_name":        r.source_display or "Verified Source",
                "source_url":         r.url or "",
                "url":                r.url or "",
                "financial_loss":     r.financial_loss_str or "",
                "financial_loss_str": r.financial_loss_str or "",
                "affected_region":    r.location or "India",
                "location":           r.location or "India",
                "modus_operandi":     "",
                "published_at":       r.published_date or "",
                "published_date":     r.published_date or "",
                "image_url":          r.image_url or "",
                "verified":           bool(r.verified),
            })
        return feed
    except Exception as e:
        logger.error(f"get_latest_scam_news error: {e}", exc_info=True)
        return []


def execute_tavily_crawl() -> Dict[str, Any]:
    """
    Triggers a live multi-vector Tavily crawl via ScamFeedPipeline.
    Runs in FastAPI BackgroundTasks. Requires TAVILY_API_KEY env variable or config fallback.
    """
    if not _ENGINE_OK:
        return {"status": "skipped", "reason": "cyber_scam_feed not available"}

    try:
        from cyber_scam_feed.config import get_tavily_api_key
        api_key = get_tavily_api_key()
    except Exception:
        api_key = os.getenv("TAVILY_API_KEY", "")

    if not api_key:
        logger.warning("TAVILY_API_KEY not set — live crawl skipped.")
        return {"status": "skipped", "reason": "TAVILY_API_KEY not configured"}

    try:
        pipeline = ScamFeedPipeline(api_key=api_key, db_path=DEFAULT_DB_PATH)
        result = pipeline.run_sync()
        logger.info(
            f"Tavily crawl complete: {result['new_reports_ingested']} new, "
            f"{result['duplicate_reports_skipped']} duplicates, "
            f"{result['total_verified_reports']} total."
        )
        return result
    except Exception as e:
        logger.error(f"execute_tavily_crawl error: {e}", exc_info=True)
        return {"status": "error", "reason": str(e)}


# ── 24h Background Crawler Thread ────────────────────────────────────────────
import threading

_bg_thread: "threading.Thread | None" = None

def start_24h_background_worker():
    """
    Launches a daemon thread that runs execute_tavily_crawl() on startup
    and then every 24 hours. Called by server.py lifespan on startup.
    Silently no-ops if TAVILY_API_KEY is not set.
    """
    global _bg_thread

    def _loop():
        import time
        # Initial crawl on startup
        try:
            execute_tavily_crawl()
        except Exception as e:
            logger.warning(f"Initial Tavily crawl failed: {e}")
        # Repeat every 24h
        while True:
            time.sleep(86400)
            try:
                execute_tavily_crawl()
            except Exception as e:
                logger.warning(f"Scheduled Tavily crawl failed: {e}")

    if _bg_thread is None or not _bg_thread.is_alive():
        _bg_thread = threading.Thread(target=_loop, daemon=True, name="tavily-24h-crawler")
        _bg_thread.start()
        logger.info("24h Tavily background crawler thread started.")
