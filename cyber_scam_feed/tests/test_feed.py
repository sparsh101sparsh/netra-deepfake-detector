"""
Unit tests for Cyber Scam Feed modules.
Tests NLP entity extraction, regex word boundaries, date normalization,
Telegram HTML escaping, deduplication, JSON serialization, and Tavily payload.
"""

import unittest
import json
import re
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from cyber_scam_feed.models import ScamReport, FeedSummary
from cyber_scam_feed.nlp_extractor import (
    extract_category,
    extract_financial_loss,
    extract_location,
    extract_severity,
    extract_publisher,
    generate_deterministic_id,
    normalize_published_date,
    parse_raw_tavily_result
)
from cyber_scam_feed.storage import ScamStorage
from cyber_scam_feed.notifications import AlertNotifier
from cyber_scam_feed.tavily_engine import TavilySearchEngine
from cyber_scam_feed.config import TARGET_DOMAINS


class TestCyberScamFeed(unittest.TestCase):

    def test_financial_loss_extraction(self):
        text1 = "Supreme Court gives CBI charge of Rs 150 crore digital arrest probe nationwide"
        loss_str1, val1 = extract_financial_loss(text1)
        self.assertIn("150", loss_str1)
        self.assertEqual(val1, 1_500_000_000.0)

        text2 = "Judge duped of Rs 6,00,000 in fake APK download scam"
        loss_str2, val2 = extract_financial_loss(text2)
        self.assertIn("6,00,000", loss_str2)
        self.assertEqual(val2, 600_000.0)

        text3 = "Pune police bust cyber syndicate stealing ₹11 Crore from elderly victims"
        loss_str3, val3 = extract_financial_loss(text3)
        self.assertIn("11", loss_str3)
        self.assertEqual(val3, 110_000_000.0)

        # Lakh extraction
        text4 = "Victim lost Rs 25 lakh in online trading syndicate"
        loss_str4, val4 = extract_financial_loss(text4)
        self.assertIn("25", loss_str4)
        self.assertEqual(val4, 2_500_000.0)

        # Word boundary verification: "crimes" must NOT match as "cr"
        text5 = "Police arrested 10 criminals for cyber crimes"
        loss_str5, val5 = extract_financial_loss(text5)
        self.assertEqual(loss_str5, "Loss Under Investigation")
        self.assertEqual(val5, 0.0)

        # Word boundary verification: "crowd" must NOT match as "cr"
        text6 = "A group of 5 crowd members gathered outside the court"
        loss_str6, val6 = extract_financial_loss(text6)
        self.assertEqual(loss_str6, "Loss Under Investigation")
        self.assertEqual(val6, 0.0)

        # Word boundary verification: "cr" at word boundary DOES match
        text7 = "Cyber fraudsters siphon off Rs 10 cr in massive digital arrest"
        loss_str7, val7 = extract_financial_loss(text7)
        self.assertEqual(val7, 100_000_000.0)
        self.assertIn("10", loss_str7)

    def test_category_classification(self):
        self.assertEqual(
            extract_category("Fake Skype video calls claiming illegal narcotics parcel customs digital arrest"),
            "Digital Arrest"
        )
        self.assertEqual(
            extract_category("WhatsApp APK sideloading with accessibility service keystroke capture"),
            "Apk Trojan"
        )
        self.assertEqual(
            extract_category("AI deepfake video of Sudha Murty promoting fraudulent VIP stock scheme"),
            "Deepfake Impersonation"
        )
        self.assertEqual(
            extract_category("Fake crypto trading dashboard promising guaranteed returns senior citizens"),
            "Investment Fraud"
        )

        # Verify category hints with variations
        self.assertEqual(extract_category("Generic report", hint="Fake APK Trojan"), "Apk Trojan")
        self.assertEqual(extract_category("Generic report", hint="Investment & Crypto Fraud"), "Investment Fraud")
        self.assertEqual(extract_category("Generic report", hint="AI Deepfake Impersonation"), "Deepfake Impersonation")
        self.assertEqual(extract_category("Generic report", hint="Digital Arrest"), "Digital Arrest")

    def test_location_extraction(self):
        self.assertEqual(extract_location("Bombay High Court judge in Mumbai"), "Maharashtra (Mumbai)")
        self.assertEqual(extract_location("Pune cyber cell and Thane police bust gang"), "Maharashtra (Pune, Thane)")
        self.assertEqual(extract_location("Bengaluru woman loses life savings in deepfake scam"), "Karnataka (Bengaluru)")
        self.assertEqual(extract_location("Supreme Court directs nationwide probe across all states"), "Pan-India (NCR, Mumbai, ...)")

    def test_severity_calculation(self):
        self.assertEqual(extract_severity("Digital Arrest", 150_000_000.0, "CBI probe nationwide"), "CRITICAL")
        self.assertEqual(extract_severity("Apk Trojan", 600_000.0, "Bombay High Court judge targeted"), "CRITICAL")
        self.assertEqual(extract_severity("Deepfake Impersonation", 300_000.0, "Stock fraud"), "HIGH")

    def test_date_normalization(self):
        # RFC-2822 formats
        rfc_date = "Sat, 09 Mar 2026 12:00:00 GMT"
        self.assertEqual(normalize_published_date(rfc_date), "2026-03-09")

        rfc_date_tz = "Thu, 03 Sep 2026 06:34:33 +0530"
        self.assertEqual(normalize_published_date(rfc_date_tz), "2026-09-03")

        # ISO-8601 formats
        iso_z = "2026-09-03T01:04:33Z"
        self.assertEqual(normalize_published_date(iso_z), "2026-09-03")

        iso_offset = "2026-09-03T06:34:33+05:30"
        self.assertEqual(normalize_published_date(iso_offset), "2026-09-03")

        iso_simple = "2026-09-01"
        self.assertEqual(normalize_published_date(iso_simple), "2026-09-01")

        # Missing or invalid input fallback to today's YYYY-MM-DD
        today_pattern = r"^\d{4}-\d{2}-\d{2}$"
        self.assertRegex(normalize_published_date(None), today_pattern)
        self.assertRegex(normalize_published_date(""), today_pattern)
        self.assertRegex(normalize_published_date("not-a-valid-date"), today_pattern)

        # Integration test in parse_raw_tavily_result
        raw_result = {
            "title": "Test Scam Article",
            "url": "https://thehindu.com/test-article",
            "content": "Digital arrest scam involving Rs 5 crore loss.",
            "published_date": "Sat, 09 Mar 2026 14:30:00 GMT"
        }
        report = parse_raw_tavily_result(raw_result, category_hint="Digital Arrest")
        self.assertEqual(report.published_date, "2026-03-09")
        self.assertNotEqual(report.published_date, "Sat, 09 Ma")

    def test_deterministic_id(self):
        # Normalization removes scheme, query params, trailing slashes
        id1 = generate_deterministic_id("https://www.thehindu.com/news/national/article123/", "Test Title")
        id2 = generate_deterministic_id("http://thehindu.com/news/national/article123?utm_source=twitter", "Test Title")
        self.assertEqual(id1, id2)
        self.assertEqual(len(id1), 12)

    def test_deduplication_storage(self):
        test_db = Path(__file__).parent / "test_store.db"
        if test_db.exists():
            test_db.unlink()

        storage = ScamStorage(db_path=test_db)
        report1 = ScamReport(
            id="test-hash-01",
            title="Test Digital Arrest Case",
            summary="Test summary of scam",
            category="Digital Arrest",
            severity="CRITICAL",
            financial_loss_str="₹10 Crore",
            financial_loss_inr=100_000_000.0,
            location="Pan-India",
            sources=["Financial Express"],
            source_display="Financial Express",
            published_date="2026-09-01",
            url="https://example.com/scam-news",
            verified=True
        )

        # First insert -> True
        self.assertTrue(storage.save_report(report1))
        # Second insert of identical ID -> False (deduplicated)
        self.assertFalse(storage.save_report(report1))

        # Second report with different ID but SAME URL -> False (deduplicated by URL)
        report1_diff_id = ScamReport(
            id="test-hash-different",
            title="Test Digital Arrest Duplicate",
            summary="Different summary",
            category="Digital Arrest",
            severity="CRITICAL",
            financial_loss_str="₹10 Crore",
            financial_loss_inr=100_000_000.0,
            location="Pan-India",
            sources=["Financial Express"],
            source_display="Financial Express",
            published_date="2026-09-01",
            url="https://example.com/scam-news",
            verified=True
        )
        self.assertFalse(storage.save_report(report1_diff_id))

        # Batch insert
        report2 = ScamReport(
            id="test-hash-02",
            title="Another Unique Incident",
            summary="Another summary",
            category="Apk Trojan",
            severity="HIGH",
            financial_loss_str="₹25 Lakh",
            financial_loss_inr=2_500_000.0,
            location="Maharashtra (Mumbai)",
            sources=["Times of India"],
            source_display="Times of India",
            published_date="2026-09-02",
            url="https://example.com/another-news",
            verified=True
        )
        new_cnt, dup_cnt = storage.save_reports_batch([report1, report2])
        self.assertEqual(new_cnt, 1)  # Only report2 was new
        self.assertEqual(dup_cnt, 1)  # report1 was duplicate

        reports = storage.get_all_reports()
        self.assertEqual(len(reports), 2)

        summary = storage.get_summary()
        self.assertEqual(summary.total_reports, 2)
        self.assertEqual(summary.critical_count, 1)
        self.assertEqual(summary.high_count, 1)

        if test_db.exists():
            test_db.unlink()

    def test_notification_formatting(self):
        report = ScamReport(
            id="test-hash-02",
            title="Digital Arrest Scam",
            summary="Fake police calls",
            category="Digital Arrest",
            severity="CRITICAL",
            financial_loss_str="₹5 Crore",
            financial_loss_inr=50_000_000.0,
            location="Pan-India",
            sources=["The Hindu"],
            source_display="The Hindu",
            published_date="2026-09-01",
            url="https://thehindu.com/test",
            verified=True
        )
        tg = AlertNotifier.format_telegram(report)
        self.assertIn("CRITICAL", tg)
        self.assertIn("Digital Arrest", tg)
        self.assertIn("₹5 Crore", tg)

        wa = AlertNotifier.format_whatsapp(report)
        self.assertIn("CRITICAL", wa)
        self.assertIn("https://thehindu.com/test", wa)

    def test_telegram_html_escaping(self):
        """Verify HTML entities are properly escaped to prevent Telegram parse errors."""
        report = ScamReport(
            id="test-hash-escape",
            title="Scammers steal > ₹50 Cr & target <Judges>",
            summary="Fake CBI app uses <script>alert('pwn')</script> & exploits accessibility",
            category="Apk Trojan",
            severity="CRITICAL",
            financial_loss_str="> ₹50 Crore",
            financial_loss_inr=500_000_000.0,
            location="Delhi <NCR> & Mumbai",
            sources=["NDTV & PTI"],
            source_display="NDTV & PTI",
            published_date="2026-09-03",
            url="https://example.com/article?id=123&track=yes",
            verified=True
        )
        tg = AlertNotifier.format_telegram(report)

        # Should NOT contain raw unescaped <Judges> or <script>
        self.assertNotIn("<Judges>", tg)
        self.assertNotIn("<script>", tg)
        self.assertNotIn("<NCR>", tg)

        # Should contain escaped equivalents
        self.assertIn("&lt;Judges&gt;", tg)
        self.assertIn("&gt; ₹50 Cr", tg)
        self.assertIn("&lt;script&gt;", tg)
        self.assertIn("NDTV &amp; PTI", tg)
        self.assertIn("&lt;NCR&gt;", tg)
        self.assertIn("https://example.com/article?id=123&amp;track=yes", tg)

    @patch("urllib.request.urlopen")
    def test_tavily_engine_include_domains_payload(self, mock_urlopen):
        """Verify that Tavily search request payload includes include_domains."""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({"results": []}).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        engine = TavilySearchEngine(api_key="tvly-mock-key")
        engine.search("cyber scam probe")

        # Inspect the Request object passed to urlopen
        self.assertTrue(mock_urlopen.called)
        req_arg = mock_urlopen.call_args[0][0]
        sent_payload = json.loads(req_arg.data.decode("utf-8"))

        self.assertIn("include_domains", sent_payload)
        self.assertEqual(sent_payload["include_domains"], TARGET_DOMAINS)
        self.assertEqual(sent_payload["query"], "cyber scam probe")

        # Test custom include_domains override
        custom_domains = ["customnews.com", "securityalert.in"]
        engine.search("cyber scam probe", include_domains=custom_domains)
        sent_payload2 = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        self.assertEqual(sent_payload2["include_domains"], custom_domains)


if __name__ == "__main__":
    unittest.main()

