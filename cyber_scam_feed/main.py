"""
Main CLI entrypoint for Live Cyber Scam Feed (Powered By Tavily).
Provides rich terminal reporting, sync automation, format exports, and alert previews.
"""

import sys
import os
import argparse
import time
from pathlib import Path

# Ensure package is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from cyber_scam_feed.pipeline import ScamFeedPipeline
from cyber_scam_feed.storage import ScamStorage
from cyber_scam_feed.notifications import AlertNotifier
from cyber_scam_feed.config import get_tavily_api_key, DEFAULT_FEED_JSON, DEFAULT_DASHBOARD_HTML


def print_banner():
    print("=" * 76)
    print("🛡️   LIVE CYBER SCAM FEED (POWERED BY TAVILY)")
    print("     Real-Time Threat Intelligence & Multi-Channel Alert Dispatcher")
    print("=" * 76)


def run_pipeline_once(pipeline: ScamFeedPipeline, limit_per_query: int = 5):
    print("\n[+] Initiating live cybercrime intelligence search via Tavily API...")
    stats = pipeline.run_sync(max_results_per_query=limit_per_query)

    print("\n" + "=" * 76)
    print("📊  SYNC EXECUTION SUMMARY")
    print("=" * 76)
    print(f" • New Ingested Reports : {stats['new_reports_ingested']}")
    print(f" • Duplicates Filtered  : {stats['duplicate_reports_skipped']}")
    print(f" • Total Active Reports : {stats['total_verified_reports']}")
    print(f" • Critical Threats     : {stats['critical_count']}")
    print(f" • High Threats         : {stats['high_count']}")
    print(f" • JSON Feed Artifact   : {stats['feed_json']}")
    print(f" • HTML Dashboard       : {stats['dashboard_html']}")
    print("=" * 76)


def display_reports(storage: ScamStorage, limit: int = 10):
    reports = storage.get_all_reports(limit=limit)
    if not reports:
        print("[!] No reports found in database. Run with --run first.")
        return

    print(f"\n[+] DISPLAYING TOP {len(reports)} VERIFIED CYBER SCAM INCIDENTS:\n")
    for idx, r in enumerate(reports, 1):
        sev_symbol = "🔴" if r.severity == "CRITICAL" else "🟡"
        print(f"[{idx}] {sev_symbol} [{r.category}] {r.title}")
        print(f"    Source  : {r.source_display} | Date: {r.published_date}")
        print(f"    Loss    : {r.financial_loss_str} | Location: {r.location}")
        print(f"    MO      : {r.summary}")
        print(f"    Link    : {r.url}")
        print("-" * 76)


def show_alert_previews(storage: ScamStorage):
    reports = storage.get_all_reports(limit=1)
    if not reports:
        print("[!] No reports available to preview. Run --run first.")
        return

    report = reports[0]
    print("\n" + "=" * 76)
    print("📲  TELEGRAM BOT MESSAGE PREVIEW (HTML Mode)")
    print("=" * 76)
    print(AlertNotifier.format_telegram(report))

    print("\n" + "=" * 76)
    print("💬  WHATSAPP BOT MESSAGE PREVIEW")
    print("=" * 76)
    print(AlertNotifier.format_whatsapp(report))
    print("=" * 76)


def main():
    parser = argparse.ArgumentParser(
        description="Live Cyber Scam Feed — Real-Time Tavily Cybercrime Intelligence Pipeline"
    )
    parser.add_argument("--run", action="store_true", help="Execute single intelligence sync from Tavily")
    parser.add_argument("--sync", action="store_true", help="Run 24h continuous synchronization loop")
    parser.add_argument("--interval-hours", type=float, default=24.0, help="Sync loop interval in hours")
    parser.add_argument("--list", action="store_true", help="List verified reports from database")
    parser.add_argument("--limit", type=int, default=10, help="Number of reports to display/fetch")
    parser.add_argument("--previews", action="store_true", help="Display Telegram and WhatsApp formatted alert messages")
    parser.add_argument("--export-json", type=str, help="Custom export path for feed.json")
    parser.add_argument("--export-html", type=str, help="Custom export path for dashboard.html")
    parser.add_argument("--query", type=str, help="Run custom scam search query")

    args = parser.parse_args()

    print_banner()

    api_key = get_tavily_api_key()
    if not api_key:
        print("[ERROR] Tavily API key could not be resolved. Set TAVILY_API_KEY environment variable.")
        sys.exit(1)

    json_path = Path(args.export_json) if args.export_json else DEFAULT_FEED_JSON
    html_path = Path(args.export_html) if args.export_html else DEFAULT_DASHBOARD_HTML

    pipeline = ScamFeedPipeline(
        api_key=api_key,
        feed_json_path=json_path,
        dashboard_html_path=html_path
    )

    if args.query:
        print(f"[+] Querying custom scam vector: '{args.query}'")
        res = pipeline.engine.search(args.query, search_depth="advanced", max_results=args.limit)
        results = res.get("results", [])
        print(f"[+] Retrieved {len(results)} live results for '{args.query}'")
        for r in results:
            print(f" • {r.get('title')}")
            print(f"   {r.get('url')}\n")
        return

    if args.run:
        run_pipeline_once(pipeline, limit_per_query=args.limit)
        display_reports(pipeline.storage, limit=args.limit)

    if args.previews:
        show_alert_previews(pipeline.storage)

    if args.list:
        display_reports(pipeline.storage, limit=args.limit)

    if args.sync:
        interval_secs = args.interval_hours * 3600
        print(f"[+] Starting continuous synchronization cycle (every {args.interval_hours} hours)...")
        while True:
            try:
                run_pipeline_once(pipeline, limit_per_query=args.limit)
                print(f"[+] Sleeping for {args.interval_hours} hours until next sync cycle...")
                time.sleep(interval_secs)
            except KeyboardInterrupt:
                print("\n[+] Sync cycle gracefully stopped by user.")
                break

    if not (args.run or args.sync or args.list or args.previews or args.query):
        # Default behavior: run once and display
        run_pipeline_once(pipeline, limit_per_query=args.limit)
        display_reports(pipeline.storage, limit=args.limit)
        show_alert_previews(pipeline.storage)


if __name__ == "__main__":
    main()
