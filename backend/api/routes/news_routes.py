"""
NETRA Cyber Scam & Deepfake News Intelligence API Routes
Powered by 24h Tavily Autonomous Search Engine.
"""

from fastapi import APIRouter, Query, BackgroundTasks
from typing import Optional, List, Dict, Any
from netra.services.tavily_crawler import get_latest_scam_news, execute_tavily_crawl

router = APIRouter(prefix="/news", tags=["Cyber Scam Intelligence News"])

@router.get("/feed")
async def get_cyber_scam_news_feed(
    limit: int = Query(15, ge=1, le=50),
    category: Optional[str] = Query(None)
):
    """
    Returns latest 24h cyber scam, digital arrest, and deepfake intelligence news.
    """
    news_items = get_latest_scam_news(limit=limit)
    if category and category.upper() != "ALL":
        news_items = [n for n in news_items if n.get("category") == category.upper()]

    return {
        "status": "success",
        "count": len(news_items),
        "crawler_status": "24H_TAVILY_ACTIVE",
        "feed": news_items
    }

@router.post("/refresh")
async def trigger_instant_crawl(background_tasks: BackgroundTasks):
    """
    Triggers an immediate live Tavily crawl in the background.
    """
    background_tasks.add_task(execute_tavily_crawl)
    return {
        "status": "triggered",
        "message": "Tavily 24-hour cyber intelligence crawler triggered in background."
    }
