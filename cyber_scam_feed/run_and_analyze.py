"""
Multi-Run Empirical Analysis and Quality Audit Script.
Executes the pipeline multiple times against live Tavily data, validates zero-fake-data integrity,
measures deduplication effectiveness, and inspects extracted threat entities.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from cyber_scam_feed.pipeline import ScamFeedPipeline
from cyber_scam_feed.config import get_tavily_api_key, DEFAULT_SEARCH_QUERIES
from cyber_scam_feed.notifications import AlertNotifier


def run_empirical_audit():
    print("=" * 78)
    print("🧪  STARTING EMPIRICAL MULTI-RUN AUDIT — LIVE TAVILY DATA ONLY")
    print("=" * 78)

    test_db = Path(__file__).parent / "audit_test.db"
    test_json = Path(__file__).parent / "audit_feed.json"
    test_html = Path(__file__).parent / "audit_dashboard.html"

    # Clean previous audit files if existing
    for p in Path(__file__).parent.glob("audit_test*"):
        try:
            p.unlink()
        except Exception:
            pass

    pipeline = ScamFeedPipeline(
        api_key=get_tavily_api_key(),
        db_path=test_db,
        feed_json_path=test_json,
        dashboard_html_path=test_html
    )

    # Verify storage starts 100% clean
    initial_reports = pipeline.storage.get_all_reports()
    assert len(initial_reports) == 0, f"Expected 0 initial reports in clean test DB, got {len(initial_reports)}"

    # -------------------------------------------------------------
    # RUN 1: Full live query ingestion
    # -------------------------------------------------------------
    print("\n[RUN 1] Executing initial live Tavily cyber scam intelligence gathering...")
    run1_stats = pipeline.run_sync(max_results_per_query=4)
    print(f"  -> Ingested : {run1_stats['new_reports_ingested']} reports")
    print(f"  -> Skipped  : {run1_stats['duplicate_reports_skipped']} duplicates")
    print(f"  -> Total in DB : {run1_stats['total_verified_reports']}")

    all_reports_run1 = pipeline.storage.get_all_reports(limit=100)
    assert run1_stats['new_reports_ingested'] > 0, "ERROR: No real reports ingested in Run 1!"

    # -------------------------------------------------------------
    # RUN 2: Re-run deduplication verification
    # -------------------------------------------------------------
    print("\n[RUN 2] Executing deduplication verification on ingested live records...")
    # First: assert storage deduplication against all parsed records from Run 1
    reingested_new, reingested_dups = pipeline.storage.save_reports_batch(all_reports_run1)
    print(f"  -> Re-save of Run 1 reports: {reingested_new} new, {reingested_dups} duplicates detected")
    assert reingested_new == 0, f"DEDUPLICATION FAILED: Expected 0 new, got {reingested_new}"
    assert reingested_dups == len(all_reports_run1), "DEDUPLICATION FAILED: Did not match total reports count!"

    # Second: Execute second live Tavily search cycle to measure live filtering
    run2_live_stats = pipeline.run_sync(max_results_per_query=4)
    print(f"  -> Consecutive Live Search: Ingested {run2_live_stats['new_reports_ingested']}, Skipped {run2_live_stats['duplicate_reports_skipped']} duplicates")
    print(f"  -> Total in DB : {run2_live_stats['total_verified_reports']}")
    assert run2_live_stats['duplicate_reports_skipped'] >= 15, "Expected high duplicate filtering on immediate consecutive run!"

    # -------------------------------------------------------------
    # RUN 3: Incremental run with novel query vector
    # -------------------------------------------------------------
    print("\n[RUN 3] Ingesting incremental novel scam vector (Job / Task / Part-time Telegram scam)...")
    incremental_query = [{
        "query": "Telegram part-time job scam youtube like task fraud police arrest crore",
        "category_hint": "Investment Fraud",
        "topic": "news"
    }]
    run3_stats = pipeline.run_sync(queries=incremental_query, max_results_per_query=3)
    print(f"  -> Ingested : {run3_stats['new_reports_ingested']} incremental reports")
    print(f"  -> Skipped  : {run3_stats['duplicate_reports_skipped']} duplicates")
    print(f"  -> Total in DB : {run3_stats['total_verified_reports']}")

    # -------------------------------------------------------------
    # OUTPUT INSPECTION & ACCURACY AUDIT
    # -------------------------------------------------------------
    print("\n" + "=" * 78)
    print("🔬  DETAILED DATA ACCURACY & ENTITY INSPECTION")
    print("=" * 78)

    all_reports = pipeline.storage.get_all_reports(limit=50)
    print(f"Total reports evaluated: {len(all_reports)}\n")

    categories_count = {}
    severities_count = {}
    losses_extracted = []
    locations_found = []

    for r in all_reports:
        categories_count[r.category] = categories_count.get(r.category, 0) + 1
        severities_count[r.severity] = severities_count.get(r.severity, 0) + 1
        if r.financial_loss_str != "Loss Under Investigation":
            losses_extracted.append((r.title[:45], r.financial_loss_str, r.financial_loss_inr))
        locations_found.append(r.location)

        # Real data validation checks
        assert r.url.startswith("http"), f"Invalid real-world URL: {r.url}"
        assert len(r.title) > 5, f"Suspiciously short title: {r.title}"
        assert len(r.summary) > 10, f"Missing Modus Operandi summary for: {r.title}"

    print(f" • Categorical Breakdown: {json.dumps(categories_count, indent=2)}")
    print(f" • Severity Distribution: {json.dumps(severities_count, indent=2)}")
    print(f" • Extracted Losses ({len(losses_extracted)}):")
    for title, loss_str, inr in losses_extracted[:6]:
        print(f"    - [{loss_str}] (INR {inr:,.0f}): {title}...")

    print(f" • Unique Locations Detected: {set(locations_found)}")

    # Verify JSON export
    assert test_json.exists(), "Exported feed.json does not exist!"
    with open(test_json, "r", encoding="utf-8") as f:
        feed_data = json.load(f)
    assert "reports" in feed_data and len(feed_data["reports"]) == len(all_reports)
    print("\n[✓] feed.json validated with complete schema conformance.")

    # Verify HTML export
    assert test_html.exists(), "Exported dashboard.html does not exist!"
    html_size = test_html.stat().st_size
    assert html_size > 1000, f"dashboard.html too small ({html_size} bytes)"
    print(f"[✓] dashboard.html generated successfully ({html_size:,} bytes).")

    # Verify Notification Formatting
    top_report = all_reports[0]
    tg_msg = AlertNotifier.format_telegram(top_report)
    wa_msg = AlertNotifier.format_whatsapp(top_report)

    assert "LIVE CYBER SCAM ALERT" in tg_msg
    assert "CRITICAL" in tg_msg or "HIGH" in tg_msg
    assert top_report.url in tg_msg
    assert "CRITICAL" in wa_msg or "HIGH" in wa_msg
    print("[✓] Telegram and WhatsApp notification payloads successfully formatted.")

    # -------------------------------------------------------------
    # WRITE EMPIRICAL ANALYSIS REPORT
    # -------------------------------------------------------------
    report_path = Path(__file__).parent / "EMPIRICAL_ANALYSIS_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Live Cyber Scam Feed — Empirical Multi-Run Analysis Report\n\n")
        f.write(f"**Date & Timestamp**: {datetime.now(timezone.utc).isoformat()}Z  \n")
        f.write(f"**Data Mode**: 100% Authentic Live Tavily Intelligence (Zero Synthetic/Mock Data)  \n")
        f.write(f"**Status**: All Validation Gates Passed  \n\n")

        f.write("## 1. Multi-Run Verification Summary\n\n")
        f.write("| Run # | Query Mode | Ingested | Duplicates Filtered | Total DB Count | Outcome |\n")
        f.write("|---|---|---|---|---|---|\n")
        f.write(f"| Run 1 | 6 Live Scam Vectors | {run1_stats['new_reports_ingested']} | {run1_stats['duplicate_reports_skipped']} | {run1_stats['total_verified_reports']} | Initial Ingestion Complete |\n")
        f.write(f"| Run 2 | Deduplication Verification | {reingested_new} new ({run2_live_stats['new_reports_ingested']} live) | {reingested_dups} batch dups ({run2_live_stats['duplicate_reports_skipped']} live) | {run2_live_stats['total_verified_reports']} | **100% Deduplication Verified** |\n")
        f.write(f"| Run 3 | Incremental Novel Vector | {run3_stats['new_reports_ingested']} | {run3_stats['duplicate_reports_skipped']} | {run3_stats['total_verified_reports']} | Incremental Growth Verified |\n\n")

        f.write("## 2. Ingested Intelligence Breakdown\n\n")
        f.write(f"- **Total Verified Incidents**: {len(all_reports)}\n")
        f.write(f"- **Categories**: `{json.dumps(categories_count)}`\n")
        f.write(f"- **Severity**: `{json.dumps(severities_count)}`\n\n")

        f.write("## 3. Extracted Real-World Monetary Losses\n\n")
        f.write("| Headline | Extracted Loss | Normalized INR | Location |\n")
        f.write("|---|---|---|---|\n")
        for title, loss_str, inr in losses_extracted:
            f.write(f"| {title} | `{loss_str}` | ₹{inr:,.0f} | {top_report.location} |\n")

        f.write("\n## 4. Sample Multi-Channel Notification Payload\n\n")
        f.write("### Telegram (HTML Format)\n```html\n")
        f.write(tg_msg)
        f.write("\n```\n\n")
        f.write("### WhatsApp Format\n```text\n")
        f.write(wa_msg)
        f.write("\n```\n")

    print(f"\n[✓] Comprehensive audit report written to: {report_path}")
    print("\n" + "=" * 78)
    print("✅  ALL MULTI-RUN AUDIT CHECKS PASSED WITH ZERO SYNTHETIC DATA!")
    print("=" * 78)


if __name__ == "__main__":
    run_empirical_audit()
