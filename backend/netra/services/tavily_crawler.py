"""
NETRA 24-Hour Tavily Cyber Scam & Deepfake News Intelligence Crawler
Fetches live Indian cybercrime incidents, police advisories, and deepfake scam news.
"""

import os
import json
import sqlite3
import logging
import threading
import time
from datetime import datetime
from typing import List, Dict, Any
import hashlib
import requests

logger = logging.getLogger("netra.tavily_crawler")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "threat_catalog.db")

def init_news_table():
    """Initializes the scam_news table in SQLite."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scam_news (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            category TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            source_name TEXT NOT NULL,
            source_url TEXT NOT NULL,
            financial_loss TEXT,
            affected_region TEXT,
            modus_operandi TEXT,
            published_at TEXT NOT NULL,
            crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def get_latest_scam_news(limit: int = 15) -> List[Dict[str, Any]]:
    """Fetches latest crawled cyber scam news from SQLite."""
    init_news_table()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scam_news ORDER BY published_at DESC, crawled_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def execute_tavily_crawl() -> Dict[str, Any]:
    """
    Executes a real-time live search query using Tavily API if key is set,
    or merges live intelligence into the SQLite store.
    """
    init_news_table()
    tavily_api_key = os.getenv("TAVILY_API_KEY", "")
    
    crawled_count = 0
    if tavily_api_key:
        try:
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": tavily_api_key,
                "query": "India cyber crime digital arrest deepfake scam news police advisory",
                "search_depth": "advanced",
                "max_results": 10,
                "include_domains": ["thehindu.com", "timesofindia.indiatimes.com", "financialexpress.com", "indianexpress.com", "ndtv.com"]
            }
            res = requests.post(url, json=payload, timeout=15)
            if res.status_code == 200:
                data = res.json()
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                for idx, r in enumerate(data.get("results", [])):
                    article_url = r.get("url", "")
                    url_hash = hashlib.sha256(article_url.encode("utf-8")).hexdigest()[:12].upper() if article_url else f"{idx}"
                    news_id = f"TAVILY-{url_hash}"
                    cursor.execute("""
                        INSERT OR REPLACE INTO scam_news 
                        (id, title, summary, category, risk_level, source_name, source_url, financial_loss, affected_region, modus_operandi, published_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        news_id,
                        r.get("title", "Cyber Crime Incident"),
                        r.get("content", "")[:300] + "...",
                        "DIGITAL_ARREST" if "arrest" in r.get("title", "").lower() else "DEEPFAKE_IMPERSONATION" if "deepfake" in r.get("title", "").lower() else "INVESTMENT_FRAUD",
                        "CRITICAL",
                        r.get("url", "News Source").split("//")[-1].split("/")[0],
                        r.get("url", "#"),
                        "Ongoing Investigation",
                        "India",
                        "Extracted via 24h Tavily Autonomous Cyber Threat Engine",
                        datetime.utcnow().strftime("%Y-%m-%d")
                    ))
                    crawled_count += 1
                conn.commit()
                conn.close()
        except Exception as e:
            logger.error("Tavily API crawl error: %s", str(e))

    return {
        "status": "success",
        "crawled_count": crawled_count,
        "synced_at": datetime.utcnow().isoformat(),
        "total_active_news": len(get_latest_scam_news(50))
    }

def start_24h_background_worker():
    """Starts a daemon thread that runs Tavily crawl every 24 hours."""
    def worker():
        while True:
            try:
                logger.info("Executing scheduled 24-hour Tavily cyber scam intelligence crawl...")
                execute_tavily_crawl()
            except Exception as e:
                logger.error("Background crawler error: %s", str(e))
            # Sleep 24 hours (86,400 seconds)
            time.sleep(86400)

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    logger.info("24-Hour Tavily Cyber Scam Background Crawler active.")

# Initialize database table on import
init_news_table()
