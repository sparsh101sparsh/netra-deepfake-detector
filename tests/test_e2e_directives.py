"""
Project NETRA: Opaque-Box End-to-End Directive Verification Test Suite
======================================================================
Covers all 5 core directives using the 4-Tier Test Design Methodology:
  - Tier 1: Feature Coverage (Directives 1-5 Happy Path)
  - Tier 2: Boundary & Corner Cases
  - Tier 3: Cross-Feature Combinations
  - Tier 4: Real-World Scenarios

Constraints & Methodology:
  - Strictly opaque-box: derives expectations from requirements and interface contracts.
  - Does NOT mutate application source code.
  - Progressive testability: verifies completed features and checks contracts for upcoming milestones.
  - Fully self-contained: sets up its own state and cleans up after itself.
"""

import os
import sys
import json
import sqlite3
import pytest
from typing import Generator, List, Dict, Any

# Ensure project root and backend are on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.api.server import app
from backend.api.db import get_db, insert_threat_item, DB_PATH
from backend.netra.pipeline.exif_engine import ForensicMetadataExtractor, _convert_dms_to_decimal


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    """TestClient instance for NETRA backend API."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def e2e_tracker() -> Generator[Any, None, None]:
    """
    Fixture tracking test-created IDs in threat_catalog and cleaning them up during teardown.
    Ensures complete test isolation and zero database pollution.
    """
    created_ids: List[str] = []

    def record(item_id: str) -> str:
        created_ids.append(item_id)
        return item_id

    yield record

    if created_ids:
        try:
            conn = get_db()
            for cid in created_ids:
                conn.execute("DELETE FROM threat_catalog WHERE id = ?", (cid,))
            conn.commit()
            conn.close()
        except Exception:
            pass


# ==============================================================================
# TIER 1: FEATURE COVERAGE (DIRECTIVES 1 - 5 HAPPY PATH)
# ==============================================================================

class TestTier1FeatureCoverage:
    """Happy path verification for Directives 1 through 5."""

    def test_directive_1_clean_database_state(self, client: TestClient):
        """
        Directive 1: Clean Database State Verification
        - Verify zero dummy items ('NETRA-SCAM-0001..0010' or 'NETRA-DF-%') in threat_catalog.
        - Verify zero seed community posts ('post-%') in community_posts.
        - Verify stale root database 'threat_catalog.db' is purged.
        - Verify catalog and radar endpoints start clean and return HTTP 200.
        """
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Verify no dummy threat items
        dummy_threats = cursor.execute(
            "SELECT count(*) FROM threat_catalog WHERE id LIKE 'NETRA-SCAM-%' OR id LIKE 'NETRA-DF-%'"
        ).fetchone()[0]
        assert dummy_threats == 0, f"Expected 0 dummy threat items, found {dummy_threats}"

        # 2. Verify no seed community posts
        dummy_posts = cursor.execute(
            "SELECT count(*) FROM community_posts WHERE id LIKE 'post-%'"
        ).fetchone()[0]
        assert dummy_posts == 0, f"Expected 0 seed community posts, found {dummy_posts}"

        conn.close()

        # 3. Verify root stale database file is absent
        root_stale_db = os.path.join(PROJECT_ROOT, "threat_catalog.db")
        assert not os.path.exists(root_stale_db), f"Stale root db must not exist: {root_stale_db}"

        # 4. Verify catalog starts clean and responds with 200
        cat_resp = client.get("/api/v1/threat-intelligence/catalog")
        assert cat_resp.status_code == 200
        cat_data = cat_resp.json()
        assert cat_data.get("status") == "success"
        assert isinstance(cat_data.get("results"), list)

        # 5. Verify radar starts clean and responds with 200
        radar_resp = client.get("/api/v1/threat-intelligence/radar")
        assert radar_resp.status_code == 200
        radar_data = radar_resp.json()
        assert radar_data.get("status") == "success"
        assert isinstance(radar_data.get("markers"), list)

    def test_directive_2_catalog_media_type_query_filtering(self, client: TestClient, e2e_tracker):
        """
        Directive 2: Catalog UI & Backend Query Filtering by Media Types
        - Filter tabs: All | Video | Image | Audio | Text
        - Querying 'video' matches both 'video' and 'video_deepfake'.
        - Querying 'image' matches both 'image' and 'image_deepfake'.
        - Querying 'audio' matches both 'audio' and 'audio_clone'.
        - Querying 'text' matches both 'text' and 'scam_text'.
        - Preserves backward compatibility for exact type matches.
        """
        # Seed 4 distinct media items
        video_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T1-VIDEO-01",
            "title": "Deepfake Politician Speech",
            "type": "video_deepfake",
            "threat_category": "IMPERSONATION",
            "fake_probability": 0.98,
            "verdict": "DEEPFAKE",
            "risk_level": "CRITICAL",
            "media_url": "/api/v1/media/videos/speech.mp4"
        }))

        image_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T1-IMAGE-01",
            "title": "Tampered Cheque Photo",
            "type": "image_deepfake",
            "threat_category": "STOCK_FRAUD",
            "fake_probability": 0.91,
            "verdict": "ALTERED",
            "risk_level": "HIGH",
            "media_url": "/api/v1/media/images/cheque.jpg"
        }))

        audio_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T1-AUDIO-01",
            "title": "Voice Clone CFO Wire Request",
            "type": "audio_clone",
            "threat_category": "IMPERSONATION",
            "fake_probability": 0.94,
            "verdict": "SYNTHETIC_AUDIO",
            "risk_level": "CRITICAL",
            "media_url": "/api/v1/media/audio/cfo_voice.mp3"
        }))

        text_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T1-TEXT-01",
            "title": "Electricity Bill Threat SMS",
            "type": "scam_text",
            "threat_category": "ELECTRICITY_KYC",
            "fake_probability": 0.99,
            "verdict": "SCAM",
            "risk_level": "HIGH",
            "media_url": None
        }))

        # Query media_type=video (both ?media_type= and ?type=)
        for param in ["type=video", "media_type=video"]:
            resp = client.get(f"/api/v1/threat-intelligence/catalog?{param}")
            assert resp.status_code == 200
            ids = [it["id"] for it in resp.json().get("results", [])]
            assert video_id in ids, f"Expected {video_id} in {param} results"
            assert image_id not in ids
            assert audio_id not in ids
            assert text_id not in ids

        # Query media_type=image
        resp = client.get("/api/v1/threat-intelligence/catalog?type=image")
        assert resp.status_code == 200
        ids = [it["id"] for it in resp.json().get("results", [])]
        assert image_id in ids
        assert video_id not in ids

        # Query media_type=audio
        resp = client.get("/api/v1/threat-intelligence/catalog?type=audio")
        assert resp.status_code == 200
        ids = [it["id"] for it in resp.json().get("results", [])]
        assert audio_id in ids
        assert video_id not in ids

        # Query media_type=text
        resp = client.get("/api/v1/threat-intelligence/catalog?type=text")
        assert resp.status_code == 200
        ids = [it["id"] for it in resp.json().get("results", [])]
        assert text_id in ids
        assert video_id not in ids

        # Query media_type=all
        resp = client.get("/api/v1/threat-intelligence/catalog?type=all")
        assert resp.status_code == 200
        ids = [it["id"] for it in resp.json().get("results", [])]
        assert video_id in ids
        assert image_id in ids
        assert audio_id in ids
        assert text_id in ids

        # Backward compatibility: exact type match
        resp = client.get("/api/v1/threat-intelligence/catalog?type=video_deepfake")
        assert resp.status_code == 200
        ids = [it["id"] for it in resp.json().get("results", [])]
        assert video_id in ids

    def test_directive_2_media_url_and_static_serving(self, client: TestClient, e2e_tracker):
        """
        Directive 2: Playable Media Storage & Static Mount
        - Media items in catalog provide 'media_url'.
        - Backend serves static media assets under /api/v1/media/.
        """
        # Create a test media artifact in backend/media/videos
        media_dir = os.path.join(PROJECT_ROOT, "backend", "media", "videos")
        os.makedirs(media_dir, exist_ok=True)
        test_file = os.path.join(media_dir, "test_e2e_ping.mp4")
        with open(test_file, "wb") as f:
            f.write(b"NETRA_VIDEO_STREAM_BYTES_TEST")

        try:
            # Check static file retrieval through FastAPI client
            resp = client.get("/api/v1/media/videos/test_e2e_ping.mp4")
            assert resp.status_code == 200
            assert resp.content == b"NETRA_VIDEO_STREAM_BYTES_TEST"

            # Index item with this media_url
            item_id = e2e_tracker(insert_threat_item({
                "id": "E2E-T1-MEDIA-URL-01",
                "title": "Verifiable Media Stream",
                "type": "video_deepfake",
                "threat_category": "IMPERSONATION",
                "media_url": "/api/v1/media/videos/test_e2e_ping.mp4"
            }))

            # Fetch through catalog
            detail = client.get(f"/api/v1/threat-intelligence/{item_id}")
            assert detail.status_code == 200
            assert detail.json()["item"]["media_url"] == "/api/v1/media/videos/test_e2e_ping.mp4"
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_directive_3_rebranding_contracts(self):
        """
        Directive 3: Netra Radar & Navbar Rebranding String Verification
        - Navbar must link to 'Netra Radar' (not legacy 'Threat Radar').
        - LiveThreatRadar must display title 'Netra Cyber Threat Radar'.
        """
        # 1. Inspect Navbar.tsx
        navbar_path = os.path.join(PROJECT_ROOT, "frontend", "components", "layout", "Navbar.tsx")
        assert os.path.exists(navbar_path), f"Navbar component missing at {navbar_path}"
        with open(navbar_path, "r", encoding="utf-8") as f:
            navbar_content = f.read()

        assert "Netra Radar" in navbar_content, "Navbar must contain rebranded link label 'Netra Radar'"
        assert "label: \"Threat Radar\"" not in navbar_content, "Legacy label 'Threat Radar' must not exist in Navbar"

        # 2. Inspect LiveThreatRadar.tsx / Radar Page
        radar_component = os.path.join(PROJECT_ROOT, "frontend", "components", "LiveThreatRadar.tsx")
        radar_page = os.path.join(PROJECT_ROOT, "frontend", "app", "radar", "page.tsx")
        
        found_title = False
        for p in [radar_component, radar_page]:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "Netra Cyber Threat Radar" in content:
                        found_title = True
                        break
        assert found_title, "Radar view must display 'Netra Cyber Threat Radar'"

    def test_directive_3_radar_telemetry_endpoint(self, client: TestClient, e2e_tracker):
        """
        Directive 3: Netra Radar Telemetry Endpoint
        - GET /api/v1/threat-intelligence/radar returns 200.
        - Markers contain only items with non-null GPS coordinates.
        - Schema includes lat, lng, confidence_pct, risk_level, software_used.
        """
        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T1-RADAR-01",
            "title": "Radar Marker Test Target",
            "type": "video_deepfake",
            "threat_category": "IMPERSONATION",
            "fake_probability": 0.92,
            "risk_level": "CRITICAL",
            "lat": 19.0760,
            "lng": 72.8777,
            "city": "Mumbai",
            "state": "Maharashtra",
            "location_source": "EXACT_GPS",
            "software_used": "Synthetic Studio V2"
        }))

        resp = client.get("/api/v1/threat-intelligence/radar")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "success"
        markers = data.get("markers", [])
        
        target = next((m for m in markers if m["id"] == item_id), None)
        assert target is not None, f"Expected {item_id} in radar markers"
        assert target["lat"] == 19.0760
        assert target["lng"] == 72.8777
        assert target["city"] == "Mumbai"
        assert target["confidence_pct"] == 92.0
        assert target["risk_level"] == "CRITICAL"

    def test_directive_4_forensic_pdf_reports(self, client: TestClient, e2e_tracker):
        """
        Directive 4: Exportable Forensic PDF Report
        - FIR PDF endpoint GET /api/v1/threat-intelligence/{threat_id}/fir-pdf returns 200 with '%PDF-' header.
        - Job Forensic PDF endpoint GET /api/v1/jobs/{job_id}/report.pdf contract verification.
        """
        # 1. Verify FIR PDF generation
        threat_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T1-PDF-FIR-01",
            "title": "Digital Arrest Extortion Incident",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "fake_probability": 0.97,
            "city": "Bengaluru",
            "extracted_iocs": {"phones": ["+919876543210"], "upis": ["scammer@upi"]},
            "fir_dossier": {
                "incident_summary": "Extortion scam using deepfake video.",
                "applicable_laws": ["IT Act 2000 Section 66D", "BNS 2023 Section 318(4)"]
            }
        }))

        fir_resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
        assert fir_resp.status_code == 200, f"Expected 200, got {fir_resp.status_code}"
        assert fir_resp.headers.get("content-type") == "application/pdf"
        assert fir_resp.content.startswith(b"%PDF-"), "Response must start with standard PDF magic bytes '%PDF-'"
        assert f"NETRA_FIR_{threat_id}.pdf" in fir_resp.headers.get("content-disposition", "")

        # 2. Verify Job Forensic PDF Endpoint contract (GET /api/v1/jobs/{job_id}/report.pdf)
        from backend.api.routes.jobs import save_local_job
        save_local_job({
            "job_id": "test-job-sample-id",
            "status": "complete",
            "verdict": "DEEPFAKE",
            "confidence": 98.4,
            "risk_level": "CRITICAL",
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 98.4,
                "risk_level": "CRITICAL",
                "visual_score": 0.992,
                "gend_score": 0.984,
                "audio_score": 0.12,
                "keyframe_snapshots": [
                    {
                        "frame_number": 45,
                        "timestamp": "00:01.50",
                        "anomaly_region": "Eyewear Specular Glare Plane",
                        "confidence": 0.984,
                        "anomaly_score": 0.984,
                        "detector_subsystem": "GenD Foundation Model ViT-L/14 + Spatial SBI",
                        "bounding_box": [120, 80, 240, 110]
                    }
                ]
            }
        })
        job_pdf_resp = client.get("/api/v1/jobs/test-job-sample-id/report.pdf")
        # Under progressive testability: returns 200 when M3 implemented, or 501 stub prior to M3
        assert job_pdf_resp.status_code in (200, 501), f"Unexpected status {job_pdf_resp.status_code}"
        if job_pdf_resp.status_code == 200:
            assert job_pdf_resp.headers.get("content-type") == "application/pdf"
            assert job_pdf_resp.content.startswith(b"%PDF-")
        else:
            assert "PDF report generation" in job_pdf_resp.json().get("detail", "")

    def test_directive_5_auto_population_and_gps_indexing(self, client: TestClient, e2e_tracker):
        """
        Directive 5: Auto-Population of Catalog and EXIF GPS Telemetry
        - Submitting threat reports with media_url and GPS persists all forensic attributes.
        - Persisted item is retrievable via catalog and plots onto radar.
        """
        payload = {
            "title": "AI Cloned CEO Authorization Video",
            "type": "video_deepfake",
            "threat_category": "IMPERSONATION",
            "source_platform": "WhatsApp",
            "fake_probability": 0.96,
            "media_url": "/api/v1/media/videos/ceo_clone.mp4",
            "thumbnail_url": "/api/v1/media/images/ceo_thumb.jpg",
            "lat": 12.9716,
            "lng": 77.5946,
            "city": "Bengaluru",
            "state": "Karnataka",
            "device_model": "iPhone 15 Pro Max",
            "software_used": "FaceApp Synthetic Core",
            "extracted_iocs": {"phones": ["+919811223344"], "urls": ["https://evil-portal.net"]},
            "fir_dossier": {"incident_summary": "High-profile executive impersonation."}
        }

        resp = client.post("/api/v1/threat-intelligence/report", json=payload)
        assert resp.status_code == 200
        item_id = e2e_tracker(resp.json()["id"])

        # Verify auto-indexed fields in detail
        detail = client.get(f"/api/v1/threat-intelligence/{item_id}").json()["item"]
        assert detail["media_url"] == "/api/v1/media/videos/ceo_clone.mp4"
        assert detail["lat"] == 12.9716
        assert detail["lng"] == 77.5946
        # location_source is EXACT_GPS when set via EXIF or direct ingest
        assert detail["location_source"] in ("EXACT_GPS", None)

        # Verify plotted on radar
        radar = client.get("/api/v1/threat-intelligence/radar").json()["markers"]
        plotted = next((m for m in radar if m["id"] == item_id), None)
        assert plotted is not None
        assert plotted["lat"] == 12.9716


# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES
# ==============================================================================

class TestTier2BoundaryAndCornerCases:
    """Boundary conditions, malformed inputs, edge coordinates, and error handling."""

    def test_boundary_empty_catalog_search_and_pagination(self, client: TestClient):
        """
        Corner Case: Empty search strings, non-matching terms, and extreme pagination limits.
        """
        # Non-existent search keyword
        resp = client.get("/api/v1/threat-intelligence/catalog?search=NON_EXISTENT_QUERY_STRING_XYZ_999")
        assert resp.status_code == 200
        assert resp.json().get("results") == []
        assert resp.json().get("total_returned") == 0

        # Empty search string should not fail
        resp = client.get("/api/v1/threat-intelligence/catalog?search=")
        assert resp.status_code == 200

        # Large offset beyond dataset size
        resp = client.get("/api/v1/threat-intelligence/catalog?offset=999999")
        assert resp.status_code == 200
        assert resp.json().get("results") == []

        # Parameter validation boundaries
        resp_invalid_limit = client.get("/api/v1/threat-intelligence/catalog?limit=0")
        assert resp_invalid_limit.status_code == 422  # ge=1 validation

        resp_invalid_offset = client.get("/api/v1/threat-intelligence/catalog?offset=-5")
        assert resp_invalid_offset.status_code == 422  # ge=0 validation

    def test_boundary_unmatched_media_type_filter(self, client: TestClient):
        """
        Corner Case: Filtering by a completely unknown or invalid media type.
        """
        resp = client.get("/api/v1/threat-intelligence/catalog?type=unrecognized_modality_123")
        assert resp.status_code == 200
        assert resp.json().get("results") == []

    def test_boundary_null_island_gps_coordinates(self, client: TestClient, e2e_tracker):
        """
        Boundary Case: Coordinates at exactly (0.0, 0.0) — Null Island.
        - (0.0, 0.0) is a valid geographic coordinate.
        - Must be plotted onto radar (requires 'lat is not None', NOT truthy 'if lat:').
        """
        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T2-NULL-ISLAND",
            "title": "Null Island Boundary Test",
            "type": "video_deepfake",
            "lat": 0.0,
            "lng": 0.0,
            "location_source": "EXACT_GPS"
        }))

        radar_resp = client.get("/api/v1/threat-intelligence/radar")
        assert radar_resp.status_code == 200
        markers = radar_resp.json().get("markers", [])
        null_island_marker = next((m for m in markers if m["id"] == item_id), None)
        assert null_island_marker is not None, "Coordinate (0.0, 0.0) must be included in radar"
        assert null_island_marker["lat"] == 0.0
        assert null_island_marker["lng"] == 0.0

    def test_boundary_honest_null_coordinates_excluded(self, client: TestClient, e2e_tracker):
        """
        Corner Case: Missing EXIF GPS must result in honest NULL lat/lng.
        - Media without GPS must NOT plot onto Netra Radar.
        - Database must store NULL, never defaulting to New Delhi (28.6139, 77.2090).
        """
        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T2-NO-GPS",
            "title": "Ungeotagged Scam Sample",
            "type": "image_deepfake",
            "lat": None,
            "lng": None,
            "city": None,
            "location_source": None
        }))

        # 1. Verify in database: coordinates are honest NULL
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute("SELECT lat, lng, location_source FROM threat_catalog WHERE id = ?", (item_id,)).fetchone()
        conn.close()
        assert row[0] is None, f"Expected NULL lat, got {row[0]}"
        assert row[1] is None, f"Expected NULL lng, got {row[1]}"

        # 2. Verify radar excludes ungeotagged item
        radar_markers = client.get("/api/v1/threat-intelligence/radar").json().get("markers", [])
        ids = [m["id"] for m in radar_markers]
        assert item_id not in ids, "Item with null GPS must NOT be included in radar telemetry"

    def test_boundary_invalid_and_missing_ids(self, client: TestClient):
        """
        Corner Case: Non-existent IDs across detail, upvote, FIR PDF, and Job endpoints.
        """
        fake_id = "NON_EXISTENT_RANDOM_UUID_404"
        
        # Detail 404
        assert client.get(f"/api/v1/threat-intelligence/{fake_id}").status_code == 404
        
        # Upvote 404
        assert client.post(f"/api/v1/threat-intelligence/{fake_id}/upvote").status_code == 404
        
        # FIR PDF 404
        assert client.get(f"/api/v1/threat-intelligence/{fake_id}/fir-pdf").status_code == 404

        # Job PDF missing ID: 404 or handled 501 stub, never unhandled 500
        job_resp = client.get(f"/api/v1/jobs/{fake_id}/report.pdf")
        assert job_resp.status_code in (404, 501)


# ==============================================================================
# TIER 3: CROSS-FEATURE COMBINATIONS
# ==============================================================================

class TestTier3CrossFeatureCombinations:
    """End-to-end integration across analysis, cataloging, radar plotting, and forensic PDF."""

    def test_cross_feature_lifecycle_analysis_to_radar_to_pdf(self, client: TestClient, e2e_tracker):
        """
        Cross-Feature: Media ingested -> indexed in catalog -> plotted on radar -> downloadable PDF -> upvoted.
        """
        # Step 1: Ingest threat with media URL and GPS coordinates
        payload = {
            "title": "Kolkata Digital Arrest Police Impersonation",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "source_platform": "WhatsApp",
            "fake_probability": 0.95,
            "media_url": "/api/v1/media/videos/kolkata_case.mp4",
            "thumbnail_url": "/api/v1/media/images/kolkata_thumb.jpg",
            "lat": 22.5726,
            "lng": 88.3639,
            "city": "Kolkata",
            "state": "West Bengal",
            "device_model": "Samsung Galaxy S24 Ultra",
            "software_used": "HeyGen Video Avatar",
            "extracted_iocs": {"phones": ["+919830011223"], "upis": ["fakecop@sbi"]},
            "fir_dossier": {
                "incident_summary": "Victim extorted for Rs. 5 Lakhs under fake CBI arrest warrant.",
                "applicable_laws": ["IT Act 2000 Section 66D", "BNS 2023 Section 318(4)"],
                "recommended_action": "Freeze beneficiary account immediately."
            }
        }
        create_resp = client.post("/api/v1/threat-intelligence/report", json=payload)
        assert create_resp.status_code == 200
        threat_id = e2e_tracker(create_resp.json()["id"])

        # Step 2: Query catalog with media type filter 'video'
        cat_resp = client.get("/api/v1/threat-intelligence/catalog?type=video")
        assert cat_resp.status_code == 200
        items = cat_resp.json().get("results", [])
        matched = next((it for it in items if it["id"] == threat_id), None)
        assert matched is not None
        assert matched["media_url"] == "/api/v1/media/videos/kolkata_case.mp4"
        assert matched["city"] == "Kolkata"

        # Step 3: Query radar telemetry and verify geospatial plotting
        radar_resp = client.get("/api/v1/threat-intelligence/radar")
        assert radar_resp.status_code == 200
        markers = radar_resp.json().get("markers", [])
        marker = next((m for m in markers if m["id"] == threat_id), None)
        assert marker is not None
        assert marker["lat"] == 22.5726
        assert marker["lng"] == 88.3639
        assert marker["city"] == "Kolkata"
        initial_upvotes = marker["upvotes"]

        # Step 4: Download FIR Forensic PDF and verify integrity
        pdf_resp = client.get(f"/api/v1/threat-intelligence/{threat_id}/fir-pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers.get("content-type") == "application/pdf"
        assert pdf_resp.content.startswith(b"%PDF-")
        assert len(pdf_resp.content) > 1000

        # Step 5: Crowdsourced upvote increment
        upvote_resp = client.post(f"/api/v1/threat-intelligence/{threat_id}/upvote")
        assert upvote_resp.status_code == 200
        assert upvote_resp.json()["upvotes_count"] == initial_upvotes + 1

        # Step 6: Verify radar marker reflects updated upvote count
        radar_after = client.get("/api/v1/threat-intelligence/radar").json().get("markers", [])
        marker_after = next((m for m in radar_after if m["id"] == threat_id), None)
        assert marker_after["upvotes"] == initial_upvotes + 1

    def test_cross_feature_gps_isolation_between_radar_and_catalog(self, client: TestClient, e2e_tracker):
        """
        Cross-Feature: Dual-item coexistence.
        - Item Alpha: Verified GPS (Hyderabad).
        - Item Beta: No GPS (lat=None, lng=None).
        - Both items appear in the Threat Catalog.
        - Only Item Alpha appears on the Radar Map.
        """
        id_alpha = e2e_tracker(insert_threat_item({
            "id": "E2E-T3-GPS-ALPHA",
            "title": "Geotagged Incident Alpha",
            "type": "video_deepfake",
            "lat": 17.3850,
            "lng": 78.4867,
            "city": "Hyderabad",
            "location_source": "EXACT_GPS"
        }))

        id_beta = e2e_tracker(insert_threat_item({
            "id": "E2E-T3-NOGPS-BETA",
            "title": "Ungeotagged Incident Beta",
            "type": "video_deepfake",
            "lat": None,
            "lng": None,
            "city": None,
            "location_source": None
        }))

        # Catalog must return BOTH
        cat_items = client.get("/api/v1/threat-intelligence/catalog?type=video").json().get("results", [])
        cat_ids = [it["id"] for it in cat_items]
        assert id_alpha in cat_ids
        assert id_beta in cat_ids

        # Radar must return ONLY Alpha
        radar_markers = client.get("/api/v1/threat-intelligence/radar").json().get("markers", [])
        radar_ids = [m["id"] for m in radar_markers]
        assert id_alpha in radar_ids
        assert id_beta not in radar_ids

    def test_cross_feature_multi_modal_filter_matrix(self, client: TestClient, e2e_tracker):
        """
        Cross-Feature: Multi-modal filter matrix and combined keyword search.
        - Seeds video, image, audio, and text items with distinct markers.
        - Validates that filtering by each media type strictly isolates the modality.
        - Validates combined query: ?type=image&search=ExclusiveKeyword.
        """
        marker = "MATRIX987"
        id_v = e2e_tracker(insert_threat_item({"id": f"E2E-V-{marker}", "title": f"Video {marker}", "type": "video_deepfake"}))
        id_i = e2e_tracker(insert_threat_item({"id": f"E2E-I-{marker}", "title": f"Image {marker}", "type": "image_deepfake"}))
        id_a = e2e_tracker(insert_threat_item({"id": f"E2E-A-{marker}", "title": f"Audio {marker}", "type": "audio_clone"}))
        id_t = e2e_tracker(insert_threat_item({"id": f"E2E-T-{marker}", "title": f"Text {marker}", "type": "scam_text"}))

        # Modality isolation checks
        matrix = [
            ("video", id_v, [id_i, id_a, id_t]),
            ("image", id_i, [id_v, id_a, id_t]),
            ("audio", id_a, [id_v, id_i, id_t]),
            ("text", id_t, [id_v, id_i, id_a]),
        ]

        for mtype, expected_id, excluded_ids in matrix:
            res = client.get(f"/api/v1/threat-intelligence/catalog?type={mtype}&search={marker}")
            assert res.status_code == 200
            found_ids = [it["id"] for it in res.json().get("results", [])]
            assert expected_id in found_ids, f"Expected {expected_id} under type={mtype}"
            for ex in excluded_ids:
                assert ex not in found_ids, f"Excluded {ex} should not appear under type={mtype}"

        # Combined search: all types with search keyword
        res_all = client.get(f"/api/v1/threat-intelligence/catalog?type=all&search={marker}")
        assert res_all.status_code == 200
        found_all = [it["id"] for it in res_all.json().get("results", [])]
        assert len(found_all) == 4


# ==============================================================================
# TIER 4: REAL-WORLD SCENARIOS
# ==============================================================================

class TestTier4RealWorldScenarios:
    """Production threat scenarios spanning video, image, audio, and SMS vectors."""

    def test_scenario_1_video_deepfake_with_iso6709(self, client: TestClient, e2e_tracker):
        """
        Real-World Scenario 1: Video Deepfake with Apple ISO6709 GPS
        - An attacker uploads an MP4 video encoded on iOS containing metadata tag '+19.0760+072.8777/'.
        - Verifies ISO6709 string parsing extracts (19.076, 72.8777).
        - Verifies item indexed in threat catalog, plotted onto radar with 'EXACT_GPS', and FIR PDF generated.
        """
        extractor = ForensicMetadataExtractor()
        lat, lng = extractor._parse_iso6709("+19.0760+072.8777/")
        assert lat == 19.076, f"Expected 19.076, got {lat}"
        assert lng == 72.8777, f"Expected 72.8777, got {lng}"

        city = extractor._find_nearest_indian_city(lat, lng)
        assert city == "Mumbai"

        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T4-SCENARIO-VIDEO-ISO",
            "title": "Celebrity Deepfake Endorsement (ISO6709 Geotagged)",
            "type": "video_deepfake",
            "threat_category": "IMPERSONATION",
            "fake_probability": 0.98,
            "media_url": "/api/v1/media/videos/celebrity_endorsement.mp4",
            "lat": lat,
            "lng": lng,
            "city": city,
            "state": "Maharashtra",
            "location_source": "EXACT_GPS",
            "device_model": "Apple iPhone 15 Pro",
            "software_used": "Remaker AI Suite"
        }))

        # Catalog lookup
        cat = client.get(f"/api/v1/threat-intelligence/{item_id}").json()["item"]
        assert cat["media_url"] == "/api/v1/media/videos/celebrity_endorsement.mp4"
        assert cat["location_source"] == "EXACT_GPS"

        # Radar check
        radar = client.get("/api/v1/threat-intelligence/radar").json()["markers"]
        m = next((x for x in radar if x["id"] == item_id), None)
        assert m is not None
        assert m["city"] == "Mumbai"

        # FIR PDF check
        pdf = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
        assert pdf.status_code == 200
        assert pdf.content.startswith(b"%PDF-")

    def test_scenario_2_jpeg_scam_with_exif_gps_ifd(self, client: TestClient, e2e_tracker):
        """
        Real-World Scenario 2: JPEG Scam with EXIF GPS IFD tag 34853
        - A scam photo retains original camera EXIF tags with DMS coordinates (13°04'57.7"N, 80°16'14.5"E).
        - Verifies DMS to Decimal conversion yields Chennai coordinates (~13.0827, ~80.2707).
        - Verifies indexed as 'image_deepfake' and filtered under 'image'.
        """
        # 13 deg, 4 min, 57.72 sec -> 13.0827
        dms_lat = (13, 4, 57.72)
        dms_lng = (80, 16, 14.52)
        dec_lat = _convert_dms_to_decimal(dms_lat, 'N')
        dec_lng = _convert_dms_to_decimal(dms_lng, 'E')

        assert dec_lat is not None and abs(dec_lat - 13.0827) < 0.001
        assert dec_lng is not None and abs(dec_lng - 80.2707) < 0.001

        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T4-SCENARIO-JPEG-EXIF",
            "title": "Forged Government Seal Stamp Photo",
            "type": "image_deepfake",
            "threat_category": "IMPERSONATION",
            "fake_probability": 0.89,
            "media_url": "/api/v1/media/images/forged_seal.jpg",
            "lat": dec_lat,
            "lng": dec_lng,
            "city": "Chennai",
            "state": "Tamil Nadu",
            "location_source": "EXACT_GPS",
            "device_model": "Google Pixel 8 Pro",
            "software_used": "Photoshop 2024 Generative Fill"
        }))

        # Catalog filter by media_type=image
        resp = client.get("/api/v1/threat-intelligence/catalog?type=image")
        items = resp.json().get("results", [])
        matched = next((it for it in items if it["id"] == item_id), None)
        assert matched is not None
        assert matched["city"] == "Chennai"
        assert matched["media_url"] == "/api/v1/media/images/forged_seal.jpg"

    def test_scenario_3_social_media_image_without_gps(self, client: TestClient, e2e_tracker):
        """
        Real-World Scenario 3: Forwarded Social Media Image without GPS
        - Messaging apps strip EXIF metadata from shared screenshots.
        - Must NOT fabricate coordinates or default to New Delhi.
        - Persisted with honest lat=None, lng=None, location_source=None.
        - Does NOT plot onto radar, but accessible in catalog and generates FIR PDF.
        """
        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T4-SCENARIO-STRIPPED-IMG",
            "title": "WhatsApp Forwarded Fake Lottery Screenshot",
            "type": "image_deepfake",
            "threat_category": "STOCK_FRAUD",
            "fake_probability": 0.88,
            "media_url": "/api/v1/media/images/whatsapp_lottery.jpg",
            "lat": None,
            "lng": None,
            "city": None,
            "state": None,
            "location_source": None
        }))

        # Verify database record
        item = client.get(f"/api/v1/threat-intelligence/{item_id}").json()["item"]
        assert item["lat"] is None, "Stripped image must have honest None lat"
        assert item["lng"] is None, "Stripped image must have honest None lng"
        assert item["location_source"] is None

        # Verify excluded from radar
        radar = client.get("/api/v1/threat-intelligence/radar").json()["markers"]
        assert item_id not in [m["id"] for m in radar]

        # Verify FIR PDF dossier still generates successfully
        fir = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
        assert fir.status_code == 200
        assert fir.content.startswith(b"%PDF-")

    def test_scenario_4_voice_clone_audio_extortion(self, client: TestClient, e2e_tracker):
        """
        Real-World Scenario 4: Voice Clone Audio Extortion Call
        - An extortionist calls a family member using a voice clone of their child.
        - Type is 'audio_clone', category is 'VOICE_CLONE'.
        - Provides playable media URL for audio player.
        - Filterable via type=audio.
        - Extracted IOCs store attacker phone numbers; FIR PDF cites IT Act Section 66D.
        """
        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T4-SCENARIO-VOICE-CLONE",
            "title": "Voice Clone Virtual Kidnapping Extortion Call",
            "type": "audio_clone",
            "threat_category": "VOICE_CLONE",
            "source_platform": "Phone Call / WhatsApp Audio",
            "fake_probability": 0.97,
            "media_url": "/api/v1/media/audio/extortion_audio_sample.mp3",
            "extracted_iocs": {
                "phones": ["+919876500001", "+919876500002"],
                "upis": ["extortionist@paytm"]
            },
            "fir_dossier": {
                "incident_summary": "Synthesized voice clone demanded 2 Lakh ransom.",
                "applicable_laws": [
                    "Information Technology Act 2000 — Section 66D",
                    "Bharatiya Nyaya Sanhita 2023 — Section 308(2) (Extortion)"
                ]
            }
        }))

        # Catalog filter by audio
        cat_resp = client.get("/api/v1/threat-intelligence/catalog?type=audio")
        assert cat_resp.status_code == 200
        items = cat_resp.json().get("results", [])
        matched = next((it for it in items if it["id"] == item_id), None)
        assert matched is not None
        assert matched["media_url"] == "/api/v1/media/audio/extortion_audio_sample.mp3"
        assert matched["threat_category"] == "VOICE_CLONE"

        # Check IOCs in detail
        detail = client.get(f"/api/v1/threat-intelligence/{item_id}").json()["item"]
        assert "+919876500001" in detail["extracted_iocs"]["phones"]

        # Check FIR PDF generates cleanly
        fir_pdf = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
        assert fir_pdf.status_code == 200
        assert fir_pdf.content.startswith(b"%PDF-")

    def test_scenario_5_sms_smishing_electricity_scam(self, client: TestClient, e2e_tracker):
        """
        Real-World Scenario 5: Electricity Bill Disconnection Smishing SMS
        - Attacker sends mass SMS: 'Dear consumer, your electricity will be disconnected tonight at 9:30 PM...'
        - Categorized as 'ELECTRICITY_KYC' under type 'scam_text'.
        - Filterable by type=text and category=ELECTRICITY_KYC.
        - Generates FIR PDF dossier formatted for cybercrime.gov.in reporting.
        """
        item_id = e2e_tracker(insert_threat_item({
            "id": "E2E-T4-SCENARIO-ELECTRICITY-SMS",
            "title": "Urgent Electricity Power Bill Disconnection Warning",
            "type": "scam_text",
            "threat_category": "ELECTRICITY_KYC",
            "source_platform": "SMS",
            "fake_probability": 0.99,
            "media_url": None,
            "extracted_iocs": {
                "phones": ["+918800112233"],
                "urls": ["http://update-power-bill.in"]
            },
            "fir_dossier": {
                "incident_summary": "Fake electricity disconnection notice directing victim to malicious APK.",
                "applicable_laws": [
                    "Information Technology Act 2000 — Section 66D",
                    "Bharatiya Nyaya Sanhita 2023 — Section 318(4)"
                ]
            }
        }))

        # Filter by media_type=text
        resp_text = client.get("/api/v1/threat-intelligence/catalog?type=text")
        assert resp_text.status_code == 200
        matched_text = next((it for it in resp_text.json().get("results", []) if it["id"] == item_id), None)
        assert matched_text is not None

        # Filter by category=ELECTRICITY_KYC
        resp_cat = client.get("/api/v1/threat-intelligence/catalog?category=ELECTRICITY_KYC")
        assert resp_cat.status_code == 200
        matched_cat = next((it for it in resp_cat.json().get("results", []) if it["id"] == item_id), None)
        assert matched_cat is not None

        # FIR PDF generation
        pdf = client.get(f"/api/v1/threat-intelligence/{item_id}/fir-pdf")
        assert pdf.status_code == 200
        assert pdf.content.startswith(b"%PDF-")
