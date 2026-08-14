"""
Milestone 1 Challenger 2: Empirical Concurrency, Stress, and Media Retrieval Suite

Covers:
1. Concurrency & WAL mode on backend/api/netra.db:
   - 100 concurrent reads on empty catalog & radar
   - High concurrent read/write stress (concurrent writers & concurrent readers)
   - Concurrent atomic upvotes on identical threat item
2. Direct insertion & query stress test:
   - Ingestion of items across all media types: video, video_deepfake, image,
     image_deepfake, audio, audio_clone, text, scam_text, custom fallback
   - Verification that media_type normalization filters precisely the expected subsets
   - Verifying media_url and thumbnail_url integrity (intact storage & retrieval)
   - Ingestion via POST /api/v1/threat-intelligence/report
3. Static media serving verification:
   - Video, image, and audio files served via /api/v1/media static mount
4. Complete post-test database cleanup:
   - Verify threat_catalog is 0, community_posts is 0, api_keys is preserved
   - PRAGMA integrity_check returns 'ok'
"""

import os
import sys
import time
import json
import sqlite3
import threading
import concurrent.futures
from typing import List, Dict, Any

import pytest
from fastapi.testclient import TestClient

# Path resolution
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.api.server import app, MEDIA_DIR
from backend.api.db import (
    get_db,
    init_db,
    insert_threat_item,
    get_threat_catalog,
    get_threat_by_id,
    upvote_threat_item,
    insert_community_post,
    get_community_posts,
    DB_PATH,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_database_lifecycle():
    """Ensure database starts clean and ends completely clean."""
    # Setup: ensure DB is initialized and clean
    init_db()
    conn = get_db()
    conn.execute("DELETE FROM threat_catalog;")
    conn.execute("DELETE FROM community_posts;")
    conn.close()

    yield

    # Teardown: purge any test records and verify 0 rows
    conn = get_db()
    conn.execute("DELETE FROM threat_catalog;")
    conn.execute("DELETE FROM community_posts;")
    conn.execute("VACUUM;")
    tc_count = conn.execute("SELECT count(*) FROM threat_catalog").fetchone()[0]
    cp_count = conn.execute("SELECT count(*) FROM community_posts").fetchone()[0]
    ak_count = conn.execute("SELECT count(*) FROM api_keys").fetchone()[0]
    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    conn.close()

    assert tc_count == 0, f"threat_catalog not clean: {tc_count} rows remain"
    assert cp_count == 0, f"community_posts not clean: {cp_count} rows remain"
    assert ak_count >= 1, f"api_keys table corrupted: {ak_count} rows"
    assert integrity == "ok", f"Database integrity check failed: {integrity}"


# ==============================================================================
# 1. CONCURRENCY & WAL MODE ON netra.db
# ==============================================================================

class TestConcurrencyAndWALMode:
    """Empirical concurrency stress testing on SQLite in WAL mode."""

    def test_sqlite_pragmas_wal_and_busy_timeout(self):
        """Verify SQLite configuration: journal_mode is WAL and busy_timeout >= 30000ms."""
        conn = get_db()
        journal_mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        busy_timeout = conn.execute("PRAGMA busy_timeout").fetchone()[0]
        conn.close()

        assert journal_mode.lower() == "wal", f"Expected WAL mode, got {journal_mode}"
        assert busy_timeout >= 30000, f"Expected busy_timeout >= 30000, got {busy_timeout}"

    def test_concurrent_reads_on_empty_catalog(self):
        """100 concurrent requests to catalog and radar on empty database without error."""
        results = []
        errors = []

        def worker_query(index: int):
            try:
                endpoint = "/api/v1/threat-intelligence/catalog" if index % 2 == 0 else "/api/v1/threat-intelligence/radar"
                resp = client.get(endpoint)
                results.append((endpoint, resp.status_code, resp.json()))
            except Exception as e:
                errors.append((index, str(e)))

        with concurrent.futures.ThreadPoolExecutor(max_workers=25) as executor:
            futures = [executor.submit(worker_query, i) for i in range(100)]
            concurrent.futures.wait(futures)

        assert len(errors) == 0, f"Concurrent reads produced exceptions: {errors}"
        assert len(results) == 100, f"Expected 100 completed queries, got {len(results)}"

        for endpoint, status, data in results:
            assert status == 200
            if "catalog" in endpoint:
                assert data["status"] == "success"
                assert data["total_returned"] == 0
                assert data["results"] == []
            else:
                assert data["status"] == "success"
                assert data["total_markers"] == 0
                assert data["markers"] == []

    def test_mixed_concurrent_reads_and_writes_stress(self):
        """
        Stress test: 40 concurrent threads inserting threat items and community posts
        while 40 concurrent threads query catalog and radar.
        Verifies no database locked exceptions, proper serialization, and data integrity.
        """
        write_successes = []
        read_successes = []
        errors = []

        def writer_task(thread_id: int):
            try:
                for i in range(5):
                    item_id = f"CHALLENGE-THREAT-{thread_id}-{i}"
                    inserted_id = insert_threat_item({
                        "id": item_id,
                        "title": f"Stress Threat {thread_id}-{i}",
                        "type": "video_deepfake" if i % 2 == 0 else "image_deepfake",
                        "threat_category": "IMPERSONATION",
                        "media_url": f"/api/v1/media/videos/clip_{thread_id}_{i}.mp4",
                        "thumbnail_url": f"/api/v1/media/images/thumb_{thread_id}_{i}.jpg",
                        "fake_probability": 0.92,
                        "lat": 28.6139 + (thread_id * 0.001),
                        "lng": 77.2090 + (i * 0.001),
                        "city": "New Delhi",
                    })
                    write_successes.append(inserted_id)

                    # Also insert a community post
                    post_id = f"stress-post-{thread_id}-{i}"
                    insert_community_post({
                        "id": post_id,
                        "title": f"Stress Post {thread_id}-{i}",
                        "category": "THREAT_INTEL",
                        "content": f"Automated stress test content {thread_id}-{i}",
                    })
            except Exception as e:
                errors.append(("writer", thread_id, str(e)))

        def reader_task(thread_id: int):
            try:
                for _ in range(10):
                    resp = client.get("/api/v1/threat-intelligence/catalog?limit=50")
                    assert resp.status_code == 200
                    radar_resp = client.get("/api/v1/threat-intelligence/radar")
                    assert radar_resp.status_code == 200
                    read_successes.append(thread_id)
            except Exception as e:
                errors.append(("reader", thread_id, str(e)))

        threads = []
        # Launch 20 writers (each doing 5 inserts = 100 items) + 20 readers
        for t in range(20):
            threads.append(threading.Thread(target=writer_task, args=(t,)))
            threads.append(threading.Thread(target=reader_task, args=(t,)))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Mixed concurrent load produced errors: {errors}"
        assert len(write_successes) == 100, f"Expected 100 writes, got {len(write_successes)}"
        assert len(read_successes) >= 150, f"Expected >=150 reads, got {len(read_successes)}"

        # Verify catalog count matches inserted items
        catalog_items = get_threat_catalog(limit=200)
        assert len(catalog_items) == 100, f"Expected 100 items in catalog, found {len(catalog_items)}"

    def test_concurrent_atomic_upvotes_on_same_item(self):
        """25 concurrent threads calling upvote_threat_item on the exact same item."""
        target_id = "CHALLENGE-UPVOTE-TARGET-01"
        insert_threat_item({
            "id": target_id,
            "title": "Upvote Target Incident",
            "type": "scam_text",
            "upvotes_count": 1,
        })

        upvote_errors = []

        def upvote_worker():
            try:
                new_val = upvote_threat_item(target_id)
                assert new_val is not None
            except Exception as e:
                upvote_errors.append(str(e))

        threads = [threading.Thread(target=upvote_worker) for _ in range(25)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(upvote_errors) == 0, f"Concurrent upvotes produced errors: {upvote_errors}"

        item = get_threat_by_id(target_id)
        assert item is not None
        # Starting count was 1, 25 upvotes performed -> expected total 26
        assert item["upvotes_count"] == 26, f"Expected upvotes_count=26, got {item['upvotes_count']}"


# ==============================================================================
# 2. DIRECT INSERTION & QUERY STRESS TEST ACROSS MEDIA TYPES
# ==============================================================================

class TestMediaInsertionAndQueryFiltering:
    """Stress tests media insertion, type normalization, and media_url integrity."""

    @pytest.fixture(autouse=True)
    def populate_test_catalog(self):
        """Seed a controlled set of 9 media items across all 4 categories plus custom."""
        items = [
            # Video items (2)
            {
                "id": "THREAT-VID-01",
                "title": "Deepfake Politician Speech",
                "type": "video_deepfake",
                "threat_category": "IMPERSONATION",
                "media_url": "/api/v1/media/videos/speech_df.mp4",
                "thumbnail_url": "/api/v1/media/videos/speech_thumb.jpg",
                "fake_probability": 0.98,
                "lat": 19.0760,
                "lng": 72.8777,
                "city": "Mumbai",
            },
            {
                "id": "THREAT-VID-02",
                "title": "Raw Surveillance Video",
                "type": "video",
                "threat_category": "DIGITAL_ARREST",
                "media_url": "/api/v1/media/videos/surveillance.mp4",
                "thumbnail_url": "/api/v1/media/videos/surveillance_thumb.jpg",
                "fake_probability": 0.85,
            },
            # Image items (2)
            {
                "id": "THREAT-IMG-01",
                "title": "Forged Aadhaar Document",
                "type": "image_deepfake",
                "threat_category": "ELECTRICITY_KYC",
                "media_url": "/api/v1/media/images/forged_aadhaar.png",
                "thumbnail_url": "/api/v1/media/images/forged_aadhaar_thumb.jpg",
                "fake_probability": 0.94,
                "lat": 28.7041,
                "lng": 77.1025,
                "city": "Delhi",
            },
            {
                "id": "THREAT-IMG-02",
                "title": "WhatsApp QR Code Scam",
                "type": "image",
                "threat_category": "STOCK_FRAUD",
                "media_url": "/api/v1/media/images/qr_scam.png",
                "thumbnail_url": None,
                "fake_probability": 0.90,
            },
            # Audio items (2)
            {
                "id": "THREAT-AUD-01",
                "title": "CEO Voice Clone Wire Transfer",
                "type": "audio_clone",
                "threat_category": "VOICE_CLONE",
                "media_url": "/api/v1/media/audio/ceo_voice.wav",
                "thumbnail_url": None,
                "fake_probability": 0.99,
            },
            {
                "id": "THREAT-AUD-02",
                "title": "Robocall Extortion Audio",
                "type": "audio",
                "threat_category": "DIGITAL_ARREST",
                "media_url": "/api/v1/media/audio/robocall.mp3",
                "thumbnail_url": None,
                "fake_probability": 0.88,
            },
            # Text items (2)
            {
                "id": "THREAT-TXT-01",
                "title": "Electricity Bill Disconnection Notice",
                "type": "scam_text",
                "threat_category": "ELECTRICITY_KYC",
                "media_url": None,
                "thumbnail_url": None,
                "fake_probability": 0.96,
            },
            {
                "id": "THREAT-TXT-02",
                "title": "Fake Job Offer WhatsApp Message",
                "type": "text",
                "threat_category": "JOB_SCAM",
                "media_url": None,
                "thumbnail_url": None,
                "fake_probability": 0.82,
            },
            # Custom fallback item (1)
            {
                "id": "THREAT-CUSTOM-01",
                "title": "Firmware Rootkit Payload",
                "type": "firmware_rootkit",
                "threat_category": "IMPERSONATION",
                "media_url": "/api/v1/media/bin/payload.bin",
                "thumbnail_url": None,
                "fake_probability": 0.75,
            },
        ]

        for it in items:
            insert_threat_item(it)

    def test_media_type_video_returns_exact_subset(self):
        """Query media_type=video returns exactly 2 items ('video' and 'video_deepfake')."""
        resp = client.get("/api/v1/threat-intelligence/catalog?media_type=video")
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]

        assert len(results) == 2
        returned_types = {r["type"] for r in results}
        assert returned_types == {"video", "video_deepfake"}
        returned_ids = {r["id"] for r in results}
        assert returned_ids == {"THREAT-VID-01", "THREAT-VID-02"}

    def test_media_type_image_returns_exact_subset(self):
        """Query media_type=image returns exactly 2 items ('image' and 'image_deepfake')."""
        resp = client.get("/api/v1/threat-intelligence/catalog?media_type=image")
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]

        assert len(results) == 2
        returned_types = {r["type"] for r in results}
        assert returned_types == {"image", "image_deepfake"}
        returned_ids = {r["id"] for r in results}
        assert returned_ids == {"THREAT-IMG-01", "THREAT-IMG-02"}

    def test_media_type_audio_returns_exact_subset(self):
        """Query media_type=audio returns exactly 2 items ('audio' and 'audio_clone')."""
        resp = client.get("/api/v1/threat-intelligence/catalog?media_type=audio")
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]

        assert len(results) == 2
        returned_types = {r["type"] for r in results}
        assert returned_types == {"audio", "audio_clone"}
        returned_ids = {r["id"] for r in results}
        assert returned_ids == {"THREAT-AUD-01", "THREAT-AUD-02"}

    def test_media_type_text_returns_exact_subset(self):
        """Query media_type=text returns exactly 2 items ('text' and 'scam_text')."""
        resp = client.get("/api/v1/threat-intelligence/catalog?media_type=text")
        assert resp.status_code == 200
        data = resp.json()
        results = data["results"]

        assert len(results) == 2
        returned_types = {r["type"] for r in results}
        assert returned_types == {"text", "scam_text"}
        returned_ids = {r["id"] for r in results}
        assert returned_ids == {"THREAT-TXT-01", "THREAT-TXT-02"}

    def test_media_type_all_and_omitted_returns_all_items(self):
        """Query media_type=all or omitted returns all 9 items."""
        resp_all = client.get("/api/v1/threat-intelligence/catalog?media_type=all")
        assert resp_all.status_code == 200
        assert resp_all.json()["total_returned"] == 9

        resp_omitted = client.get("/api/v1/threat-intelligence/catalog")
        assert resp_omitted.status_code == 200
        assert resp_omitted.json()["total_returned"] == 9

    def test_custom_type_exact_match_fallback(self):
        """Query media_type=firmware_rootkit falls back to exact match type = ?."""
        resp = client.get("/api/v1/threat-intelligence/catalog?media_type=firmware_rootkit")
        assert resp.status_code == 200
        results = resp.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == "THREAT-CUSTOM-01"
        assert results[0]["type"] == "firmware_rootkit"

    def test_case_insensitive_media_type_query(self):
        """Verify case insensitivity: VIDEO, Image, AUDIO, TeXt, ALL."""
        for mt, count in [("VIDEO", 2), ("Image", 2), ("AUDIO", 2), ("TeXt", 2), ("ALL", 9)]:
            resp = client.get(f"/api/v1/threat-intelligence/catalog?media_type={mt}")
            assert resp.status_code == 200, f"Failed for {mt}"
            assert resp.json()["total_returned"] == count, f"Expected {count} for {mt}, got {resp.json()['total_returned']}"

    def test_legacy_type_parameter_support(self):
        """Verify backward compatibility: GET ?type=video matches normalized video category."""
        resp = client.get("/api/v1/threat-intelligence/catalog?type=video")
        assert resp.status_code == 200
        assert resp.json()["total_returned"] == 2
        returned_types = {r["type"] for r in resp.json()["results"]}
        assert returned_types == {"video", "video_deepfake"}

    def test_media_url_and_thumbnail_url_verbatim_retrieval(self):
        """Verify media_url and thumbnail_url are stored and retrieved intact."""
        vid_item = get_threat_by_id("THREAT-VID-01")
        assert vid_item is not None
        assert vid_item["media_url"] == "/api/v1/media/videos/speech_df.mp4"
        assert vid_item["thumbnail_url"] == "/api/v1/media/videos/speech_thumb.jpg"

        img_item = get_threat_by_id("THREAT-IMG-01")
        assert img_item is not None
        assert img_item["media_url"] == "/api/v1/media/images/forged_aadhaar.png"
        assert img_item["thumbnail_url"] == "/api/v1/media/images/forged_aadhaar_thumb.jpg"

        aud_item = get_threat_by_id("THREAT-AUD-01")
        assert aud_item is not None
        assert aud_item["media_url"] == "/api/v1/media/audio/ceo_voice.wav"
        assert aud_item["thumbnail_url"] is None

        txt_item = get_threat_by_id("THREAT-TXT-01")
        assert txt_item is not None
        assert txt_item["media_url"] is None
        assert txt_item["thumbnail_url"] is None

    def test_api_report_endpoint_with_media_urls(self):
        """POST /api/v1/threat-intelligence/report accepts and persists media_url and thumbnail_url."""
        payload = {
            "title": "Crowdsourced Video Deepfake",
            "type": "video_deepfake",
            "threat_category": "IMPERSONATION",
            "source_platform": "WhatsApp",
            "fake_probability": 0.95,
            "media_url": "/api/v1/media/videos/crowdsourced_report.mp4?token=xyz123",
            "thumbnail_url": "/api/v1/media/videos/crowdsourced_thumb.jpg",
            "city": "Bengaluru",
            "state": "Karnataka",
            "lat": 12.9716,
            "lng": 77.5946,
        }

        resp = client.post("/api/v1/threat-intelligence/report", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        new_id = body["id"]

        # Fetch via API
        detail_resp = client.get(f"/api/v1/threat-intelligence/{new_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()["item"]

        assert detail["id"] == new_id
        assert detail["title"] == payload["title"]
        assert detail["media_url"] == payload["media_url"]
        assert detail["thumbnail_url"] == payload["thumbnail_url"]
        assert detail["city"] == "Bengaluru"
        assert detail["lat"] == 12.9716
        assert detail["lng"] == 77.5946

    def test_direct_insert_with_exact_gps_location_source(self):
        """Direct insertion with location_source='EXACT_GPS' stores and returns exact location_source."""
        item_id = insert_threat_item({
            "id": "THREAT-EXACT-GPS-01",
            "title": "Verified Drone Footage Threat",
            "type": "video_deepfake",
            "lat": 13.0827,
            "lng": 80.2707,
            "city": "Chennai",
            "location_source": "EXACT_GPS",
            "media_url": "/api/v1/media/videos/drone.mp4",
        })
        item = get_threat_by_id(item_id)
        assert item is not None
        assert item["location_source"] == "EXACT_GPS"
        assert item["lat"] == 13.0827
        assert item["lng"] == 80.2707

    def test_radar_filtering_only_items_with_coordinates(self):
        """GET /api/v1/threat-intelligence/radar returns only markers with lat and lng."""
        resp = client.get("/api/v1/threat-intelligence/radar")
        assert resp.status_code == 200
        markers = resp.json()["markers"]

        # In our seed set: THREAT-VID-01 (Mumbai) and THREAT-IMG-01 (Delhi) have lat/lng.
        assert len(markers) == 2
        for m in markers:
            assert m["lat"] is not None
            assert m["lng"] is not None
            assert m["id"] in {"THREAT-VID-01", "THREAT-IMG-01"}

    def test_content_hash_deduplication_increments_upvotes(self):
        """
        Deduplication stress test:
        1. Auto-generated content-hash deduplication increments upvotes without adding row.
        2. Explicit ID deduplication increments upvotes without adding row.
        """
        # --- 1. Auto content-hash deduplication ---
        dup_payload = {
            "title": "Duplicate Scam Broadcast",
            "type": "scam_text",
            "threat_category": "ELECTRICITY_KYC",
            "extracted_iocs": {"phones": ["+919876543210"]},
        }

        # First insert creates row with hash ID
        first_id = insert_threat_item(dup_payload)
        count_after_first = len(get_threat_catalog(limit=50))

        item_first = get_threat_by_id(first_id)
        assert item_first["upvotes_count"] == 1

        # Second insert with identical payload must NOT increase row count
        second_id = insert_threat_item(dup_payload)
        assert second_id == first_id, "Expected same generated content-hash ID"
        count_after_second = len(get_threat_catalog(limit=50))
        assert count_after_second == count_after_first, "Duplicate row was inserted"

        item_second = get_threat_by_id(second_id)
        assert item_second["upvotes_count"] == 2, "upvotes_count did not increment"

        # --- 2. Explicit ID deduplication ---
        explicit_id = "THREAT-VID-01"
        item_pre = get_threat_by_id(explicit_id)
        pre_upvotes = item_pre["upvotes_count"]

        re_insert_id = insert_threat_item({
            "id": explicit_id,
            "title": "Deepfake Politician Speech",
            "type": "video_deepfake",
        })
        assert re_insert_id == explicit_id
        item_post = get_threat_by_id(explicit_id)
        assert item_post["upvotes_count"] == pre_upvotes + 1



# ==============================================================================
# 3. STATIC MEDIA SERVING VERIFICATION
# ==============================================================================

class TestStaticMediaServing:
    """Empirical verification of /api/v1/media mounted static files."""

    def test_static_media_serving_videos_images_audio(self):
        """Serve real binary payloads from backend/media/videos, images, and audio."""
        test_files = [
            ("videos", "test_clip.mp4", b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"),
            ("images", "test_shot.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"),
            ("audio", "test_voice.wav", b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"),
        ]

        created_paths = []
        try:
            for subdir, filename, content in test_files:
                target_dir = os.path.join(MEDIA_DIR, subdir)
                os.makedirs(target_dir, exist_ok=True)
                file_path = os.path.join(target_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(content)
                created_paths.append(file_path)

                # Fetch via TestClient
                url = f"/api/v1/media/{subdir}/{filename}"
                resp = client.get(url)
                assert resp.status_code == 200, f"Failed to retrieve {url}: status {resp.status_code}"
                assert resp.content == content, f"Content mismatch for {url}"

            # 404 check for non-existent media
            resp_404 = client.get("/api/v1/media/videos/non_existent_file.mp4")
            assert resp_404.status_code == 404
        finally:
            for p in created_paths:
                if os.path.exists(p):
                    os.remove(p)
