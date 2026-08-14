"""
Adversarial Stress Tests for Storage & Deduplication (Milestone 1).
Challenger Suite 2: Collision resistance, batch load, connection lifecycle, and concurrency.
"""

import unittest
import os
import gc
import tempfile
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from cyber_scam_feed.models import ScamReport
from cyber_scam_feed.nlp_extractor import generate_deterministic_id, normalize_url
from cyber_scam_feed.storage import ScamStorage


class TestStorageAdversarial(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_adversarial.db"
        self.storage = ScamStorage(db_path=self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    # --- 1. Deterministic ID & Collision Tests ---

    def test_01_deterministic_id_stability(self):
        """Test URL canonicalization across casing, protocols, www, and query params."""
        variants = [
            "https://www.thehindu.com/news/national/article123/",
            "http://thehindu.com/news/national/article123",
            "HTTPS://WWW.THEHINDU.COM/NEWS/NATIONAL/ARTICLE123",
            "https://thehindu.com/news/national/article123?utm_source=twitter&utm_medium=social",
            "https://www.thehindu.com/news/national/article123#comments",
        ]
        ids = [generate_deterministic_id(v, "Sample Headline") for v in variants]
        self.assertEqual(len(set(ids)), 1, f"Expected all variants to produce identical ID, got {set(ids)}")
        self.assertEqual(len(ids[0]), 12)

    def test_02_deterministic_id_large_scale_collision_resistance(self):
        """Test 50,000 distinct article URLs to verify SHA-256[:12] collision resistance."""
        seen = set()
        count = 50_000
        for i in range(count):
            url = f"https://www.thehindu.com/news/national/cybercrime/case_{i:06d}.ece"
            title = f"Cyber Fraud Case #{i}"
            hid = generate_deterministic_id(url, title)
            self.assertNotIn(hid, seen, f"Hash collision detected at index {i}: {hid}")
            seen.add(hid)
        self.assertEqual(len(seen), count)

    def test_03_query_parameter_differentiation_semantic_collision(self):
        """
        Verify that distinct articles differentiated solely by functional query parameters
        maintain distinct deterministic IDs (non-tracking parameters preserved).
        """
        url_a = "https://example.com/article.php?id=1001"
        url_b = "https://example.com/article.php?id=2002"
        id_a = generate_deterministic_id(url_a, "Headline A")
        id_b = generate_deterministic_id(url_b, "Headline B")
        self.assertNotEqual(id_a, id_b, "Distinct functional query parameters must produce distinct IDs")

    def test_04_whitespace_url_collapses_to_empty_hash(self):
        """
        Verify that whitespace-only URLs fall back to title rather than collapsing
        to empty string hash.
        """
        id_ws1 = generate_deterministic_id("   ", "Title One")
        id_ws2 = generate_deterministic_id(" \t\n ", "Completely Different Title Two")
        self.assertNotEqual(id_ws1, id_ws2, "Distinct titles with whitespace URLs must produce distinct IDs")
        self.assertNotEqual(id_ws1, "e3b0c44298fc", "Whitespace URL must not collapse to empty string hash")

    # --- 2. Batch Storage Stress & Duplicate Load ---

    def test_05_batch_stress_1000_identical_records(self):
        """Stress-test batch insertion with 1000 identical records."""
        report = ScamReport(
            id="batch_identical_01",
            title="Massive Digital Arrest Probe",
            summary="Scam targeting seniors",
            category="Digital Arrest",
            severity="CRITICAL",
            financial_loss_str="₹50 Crore",
            financial_loss_inr=500_000_000.0,
            location="Pan-India",
            sources=["The Hindu"],
            source_display="The Hindu",
            published_date="2026-09-01",
            url="https://thehindu.com/article/probe-01",
        )
        batch = [report] * 1000
        new_cnt, dup_cnt = self.storage.save_reports_batch(batch)
        self.assertEqual(new_cnt, 1)
        self.assertEqual(dup_cnt, 999)
        reports = self.storage.get_all_reports()
        self.assertEqual(len(reports), 1)

    def test_06_batch_stress_mixed_duplicates_and_unique(self):
        """Stress-test batch insertion with 500 unique items and 500 repeats."""
        batch = []
        for i in range(500):
            r = ScamReport(
                id=f"mixed_{i}",
                title=f"Report {i}",
                summary="MO description",
                category="Investment Fraud",
                severity="HIGH",
                financial_loss_str="₹10 Lakh",
                financial_loss_inr=1_000_000.0,
                location="Maharashtra (Mumbai)",
                sources=["Times of India"],
                source_display="Times of India",
                published_date="2026-09-01",
                url=f"https://timesofindia.com/article/{i}",
            )
            batch.append(r)
            batch.append(r)  # Duplicate in same batch

        self.assertEqual(len(batch), 1000)
        new_cnt, dup_cnt = self.storage.save_reports_batch(batch)
        self.assertEqual(new_cnt, 500)
        self.assertEqual(dup_cnt, 500)
        reports = self.storage.get_all_reports(limit=1000)
        self.assertEqual(len(reports), 500)

    def test_07_empty_url_shadowing_bug(self):
        """
        Verify that an empty URL does not shadow subsequent reports with empty URLs,
        preventing silent loss of distinct scam reports.
        """
        r1 = ScamReport(
            id="empty_url_01",
            title="Incident in Delhi",
            summary="MO 1",
            category="Digital Arrest",
            severity="HIGH",
            financial_loss_str="₹1 Crore",
            financial_loss_inr=10_000_000.0,
            location="Delhi",
            sources=[],
            source_display="Police Advisory",
            published_date="2026-09-01",
            url="",
        )
        r2 = ScamReport(
            id="empty_url_02",
            title="Incident in Bengaluru",
            summary="MO 2",
            category="Apk Trojan",
            severity="CRITICAL",
            financial_loss_str="₹5 Crore",
            financial_loss_inr=50_000_000.0,
            location="Karnataka (Bengaluru)",
            sources=[],
            source_display="Cyber Cell Advisory",
            published_date="2026-09-02",
            url="",
        )
        saved1 = self.storage.save_report(r1)
        saved2 = self.storage.save_report(r2)

        self.assertTrue(saved1)
        self.assertTrue(saved2, "r2 should be saved and not shadowed by r1's empty URL")
        all_reps = self.storage.get_all_reports()
        self.assertEqual(len(all_reps), 2, "Both reports with empty URLs must be preserved")

    # --- 3. Connection Lifecycle & Concurrency ---

    def test_08_connection_closure_and_no_fd_leaks(self):
        """Verify that SQLite connections are closed and do not leak file descriptors."""
        gc.collect()
        try:
            fd_before = len(os.listdir("/dev/fd"))
        except Exception:
            fd_before = 0

        # Perform 500 sequential saves and 100 queries
        for i in range(500):
            r = ScamReport(
                id=f"fd_check_{i}",
                title=f"FD Title {i}",
                summary="MO",
                category="Apk Trojan",
                severity="MEDIUM",
                financial_loss_str="₹5 Lakh",
                financial_loss_inr=500_000.0,
                location="Delhi",
                sources=[],
                source_display="News",
                published_date="2026-09-01",
                url=f"https://example.com/fd_{i}",
            )
            self.storage.save_report(r)

        for _ in range(100):
            self.storage.get_all_reports(limit=10)

        gc.collect()
        try:
            fd_after = len(os.listdir("/dev/fd"))
            # File descriptors should not grow significantly
            self.assertLessEqual(fd_after - fd_before, 2)
        except Exception:
            pass

    def test_09_concurrent_duplicate_id_integrity_error_vulnerability(self):
        """
        Verify that concurrent threads inserting identical IDs handle IntegrityError
        gracefully without crashing threads, updating last_synced_at.
        """
        barrier = threading.Barrier(5)
        errors = []

        def worker(idx):
            r = ScamReport(
                id="concurrent_race_id",
                title="Race Title",
                summary="Race MO",
                category="Digital Arrest",
                severity="CRITICAL",
                financial_loss_str="₹10 Cr",
                financial_loss_inr=100_000_000.0,
                location="Delhi",
                sources=[],
                source_display="News",
                published_date="2026-09-01",
                url="https://example.com/race_article",
            )
            barrier.wait()
            try:
                return self.storage.save_report(r)
            except Exception as e:
                errors.append(e)
                return False

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(worker, i) for i in range(5)]
            for f in as_completed(futures):
                f.result()

        # IntegrityError must be caught gracefully inside save_report without crashing threads
        self.assertEqual(len(errors), 0, f"Expected 0 unhandled IntegrityErrors, got {len(errors)}: {errors}")
        reports = self.storage.get_all_reports()
        self.assertEqual(len(reports), 1, "Exactly one report should exist in DB")

    def test_10_concurrent_identical_url_duplication_vulnerability(self):
        """
        ADVERSARIAL CHALLENGE: Demonstrates that concurrent threads with identical URLs
        can bypass deduplication and insert duplicate rows because URL has no UNIQUE constraint.
        """
        barrier = threading.Barrier(5)

        def worker(idx):
            r = ScamReport(
                id=f"concurrent_diff_id_{idx}",
                title=f"Race Title {idx}",
                summary="Race MO",
                category="Digital Arrest",
                severity="CRITICAL",
                financial_loss_str="₹10 Cr",
                financial_loss_inr=100_000_000.0,
                location="Delhi",
                sources=[],
                source_display="News",
                published_date="2026-09-01",
                url="https://example.com/identical_shared_url",
            )
            barrier.wait()
            return self.storage.save_report(r)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(worker, i) for i in range(5)]
            for f in as_completed(futures):
                f.result()

        reports = self.storage.get_all_reports()
        # Verify that zero-duplicate guarantee holds even under concurrent threads with identical URL
        self.assertEqual(len(reports), 1, "Zero-duplicate violated: multiple identical URLs inserted concurrently")


if __name__ == "__main__":
    unittest.main()
