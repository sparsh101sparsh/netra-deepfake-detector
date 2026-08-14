"""
Tavily Search Engine Client for Cyber Scam Intelligence.
Uses Python's standard library for zero-dependency portability and high performance.
"""

import json
import time
import urllib.request
import urllib.error
import ssl
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from cyber_scam_feed.config import get_tavily_api_key, TARGET_DOMAINS

TAVILY_API_ENDPOINT = "https://api.tavily.com/search"


class TavilySearchEngine:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_tavily_api_key()
        if not self.api_key:
            raise ValueError("Tavily API key not found in environment or config.")
        self.ssl_context = ssl.create_default_context()

    def search(
        self,
        query: str,
        search_depth: str = "advanced",
        topic: str = "news",
        max_results: int = 5,
        include_images: bool = True,
        time_range: Optional[str] = "week",
        include_domains: Optional[List[str]] = None,
        retries: int = 3,
        backoff_sec: float = 2.0
    ) -> Dict[str, Any]:
        """Execute a single Tavily search request with retry logic."""
        domains = include_domains if include_domains is not None else TARGET_DOMAINS
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": search_depth,
            "topic": topic,
            "max_results": max_results,
            "include_images": include_images,
            "include_domains": domains,
        }
        if time_range:
            payload["time_range"] = time_range

        data = json.dumps(payload).encode("utf-8")

        for attempt in range(1, retries + 1):
            try:
                req = urllib.request.Request(
                    TAVILY_API_ENDPOINT,
                    data=data,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "TavilyCyberScamFeed/1.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=25, context=self.ssl_context) as resp:
                    if resp.status == 200:
                        body = resp.read().decode("utf-8")
                        return json.loads(body)
                    else:
                        raise RuntimeError(f"Tavily returned HTTP status {resp.status}")
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    # Rate limit encountered, back off
                    time.sleep(backoff_sec * attempt * 1.5)
                elif attempt == retries:
                    raise
                else:
                    time.sleep(backoff_sec * attempt)
            except Exception as e:
                if attempt == retries:
                    return {"results": [], "error": str(e), "query": query}
                time.sleep(backoff_sec * attempt)

        return {"results": [], "query": query}

    def batch_search(
        self,
        query_configs: List[Dict[str, Any]],
        max_workers: int = 3
    ) -> List[Dict[str, Any]]:
        """Run multiple search queries in parallel using ThreadPoolExecutor."""
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_query = {
                executor.submit(
                    self.search,
                    cfg["query"],
                    cfg.get("search_depth", "advanced"),
                    cfg.get("topic", "news"),
                    cfg.get("max_results", 5),
                    cfg.get("include_images", True),
                    cfg.get("time_range"),
                    cfg.get("include_domains", TARGET_DOMAINS)
                ): cfg
                for cfg in query_configs
            }

            for future in as_completed(future_to_query):
                cfg = future_to_query[future]
                try:
                    res = future.result()
                    res["category_hint"] = cfg.get("category_hint", "Cyber Fraud")
                    results.append(res)
                except Exception as exc:
                    results.append({
                        "results": [],
                        "error": str(exc),
                        "query": cfg["query"],
                        "category_hint": cfg.get("category_hint", "Cyber Fraud")
                    })

        return results
