"""
Pipeline Orchestrator for Cyber Scam Feed.
Coordinates Tavily searches, NLP normalization, SQLite state caching,
JSON export, HTML dashboard compilation, and notification formatting.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from cyber_scam_feed.config import (
    DEFAULT_SEARCH_QUERIES,
    DEFAULT_FEED_JSON,
    DEFAULT_DASHBOARD_HTML,
    DEFAULT_DB_PATH
)
from cyber_scam_feed.tavily_engine import TavilySearchEngine
from cyber_scam_feed.nlp_extractor import parse_raw_tavily_result
from cyber_scam_feed.storage import ScamStorage
from cyber_scam_feed.dashboard import generate_html_dashboard
from cyber_scam_feed.notifications import AlertNotifier
from cyber_scam_feed.models import ScamReport, FeedSummary


class ScamFeedPipeline:
    def __init__(
        self,
        api_key: Optional[str] = None,
        db_path: Optional[Path] = None,
        feed_json_path: Optional[Path] = None,
        dashboard_html_path: Optional[Path] = None
    ):
        self.engine = TavilySearchEngine(api_key=api_key)
        self.storage = ScamStorage(db_path=db_path or DEFAULT_DB_PATH)
        self.feed_json_path = feed_json_path or DEFAULT_FEED_JSON
        self.dashboard_html_path = dashboard_html_path or DEFAULT_DASHBOARD_HTML

    def run_sync(
        self,
        queries: Optional[List[Dict[str, Any]]] = None,
        max_results_per_query: int = 5
    ) -> Dict[str, Any]:
        """
        Execute full intelligence ingestion sync cycle:
        1. Fetch live Tavily cyber scam search results
        2. Normalize entities & parse Modus Operandi
        3. Persist with zero duplicates in SQLite
        4. Update feed.json and dashboard.html
        """
        search_configs = queries or DEFAULT_SEARCH_QUERIES
        for cfg in search_configs:
            cfg["max_results"] = max_results_per_query

        raw_batches = self.engine.batch_search(search_configs)

        all_parsed_reports: List[ScamReport] = []
        for batch in raw_batches:
            category_hint = batch.get("category_hint", "Cyber Fraud")
            for result in batch.get("results", []):
                try:
                    report = parse_raw_tavily_result(result, category_hint=category_hint)
                    all_parsed_reports.append(report)
                except Exception as e:
                    print(f"[WARN] Error parsing result: {e}")

        # Persist to database with deduplication
        new_count, dup_count = self.storage.save_reports_batch(all_parsed_reports)

        # Retrieve all verified reports from storage
        summary = self.storage.get_summary()

        # Export feed.json
        with open(self.feed_json_path, "w", encoding="utf-8") as f:
            f.write(summary.to_json(indent=2))

        # Generate and save dashboard.html
        html_content = generate_html_dashboard(summary)
        with open(self.dashboard_html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        # Audit sync record
        self.storage.record_sync(
            new_count=new_count,
            total_count=summary.total_reports,
            status="SUCCESS",
            metadata={"queries_count": len(search_configs), "duplicates_filtered": dup_count}
        )

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "new_reports_ingested": new_count,
            "duplicate_reports_skipped": dup_count,
            "total_verified_reports": summary.total_reports,
            "critical_count": summary.critical_count,
            "high_count": summary.high_count,
            "feed_json": str(self.feed_json_path),
            "dashboard_html": str(self.dashboard_html_path)
        }
