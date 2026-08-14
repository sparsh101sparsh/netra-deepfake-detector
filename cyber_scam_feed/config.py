"""
Configuration module for Tavily Cyber Scam Feed.
Supports automatic API key detection from environment or MCP config.
"""

import os
import json
from pathlib import Path

DEFAULT_MCP_CONFIG_PATH = Path.home() / ".gemini" / "config" / "mcp_config.json"


def get_tavily_api_key() -> str:
    """Retrieve Tavily API key from environment or local MCP configuration."""
    api_key = os.environ.get("TAVILY_API_KEY")
    if api_key:
        return api_key.strip()

    if DEFAULT_MCP_CONFIG_PATH.exists():
        try:
            with open(DEFAULT_MCP_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                tavily_env = (
                    data.get("mcpServers", {})
                    .get("tavily", {})
                    .get("env", {})
                )
                if "TAVILY_API_KEY" in tavily_env:
                    return tavily_env["TAVILY_API_KEY"].strip()
        except Exception:
            pass

    return "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"


# Default scam intelligence search queries targeting national and regional alerts
DEFAULT_SEARCH_QUERIES = [
    {
        "query": "supreme court CBI digital arrest scam nationwide probe",
        "category_hint": "Digital Arrest",
        "topic": "news"
    },
    {
        "query": "fake apk malware steal money judge bombay high court accessibility service",
        "category_hint": "Apk Trojan",
        "topic": "news"
    },
    {
        "query": "AI deepfake video Sudha Murty fraudulent stock trading scheme WhatsApp",
        "category_hint": "Deepfake Impersonation",
        "topic": "news"
    },
    {
        "query": "Pune police cyber syndicate senior citizens crore crypto fraud",
        "category_hint": "Investment Fraud",
        "topic": "news"
    },
    {
        "query": "cyber crime police bust online trading scam crore arrested",
        "category_hint": "Investment Fraud",
        "topic": "news"
    },
    {
        "query": "digital arrest fake customs parcel police Skype call scam",
        "category_hint": "Digital Arrest",
        "topic": "news"
    }
]

# Trusted Indian and international cyber reporting domains
TARGET_DOMAINS = [
    "indianexpress.com",
    "thehindu.com",
    "financialexpress.com",
    "timesofindia.indiatimes.com",
    "ndtv.com",
    "economictimes.indiatimes.com",
    "oneindia.com",
    "indianmasterminds.com",
    "punemirror.com",
    "deccanherald.com",
    "hindustantimes.com",
    "ani.in",
    "ptinews.com",
    "livemint.com"
]

DEFAULT_DB_PATH = Path(__file__).parent / "scam_feed.db"
DEFAULT_FEED_JSON = Path(__file__).parent / "feed.json"
DEFAULT_DASHBOARD_HTML = Path(__file__).parent / "dashboard.html"
DEFAULT_SYNC_INTERVAL_HOURS = 24
