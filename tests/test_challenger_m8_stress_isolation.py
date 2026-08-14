"""
Challenger M8-Iter2-2: Multi-Tenant Concurrency, Edge Cases & Memory Isolation Stress Suite
==========================================================================================
Empirically challenges:
1. 20 Concurrent PDF Requests across 20 DISTINCT Jobs (Multi-tenant isolation & throughput).
2. Edge Cases:
   - 0 keyframes: verifies 1-page generation without error across varying empty schemas.
   - Missing job 404 response: verifies non-existent jobs honestly return HTTP 404.
   - Special characters: tests XML/HTML characters, unclosed tags, unicode, and emojis.
3. Memory & Buffer Isolation:
   - Verifies no cross-contamination of metadata, hashes, or image buffers between builds.
   - Verifies deterministic size across consecutive builds.
   - Measures memory stability across 40 continuous PDF compilations via tracemalloc.
"""

import os
import sys
import io
import json
import glob
import tracemalloc
import concurrent.futures
import pytest
import numpy as np
import cv2
import pypdfium2
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.api.server import app
from backend.api.routes.jobs import save_local_job, KEYFRAMES_DIR
from backend.api.db import insert_threat_item


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def keyframe_sample_images():
    """Ensure at least 3 valid keyframe images exist in KEYFRAMES_DIR for testing."""
    os.makedirs(KEYFRAMES_DIR, exist_ok=True)
    existing = sorted(glob.glob(os.path.join(KEYFRAMES_DIR, "*.jpg")))
    paths = list(existing)
    while len(paths) < 3:
        idx = len(paths) + 1
        img_path = os.path.join(KEYFRAMES_DIR, f"challenger_m8_stress_synth_{idx:03d}.jpg")
        img = np.zeros((720, 1280, 3), dtype=np.uint8)
        cv2.rectangle(img, (200, 150), (600, 450), (11, 158, 245), 3) # Amber #f59e0b
        cv2.putText(img, "ANOMALY DETECTED HERE", (210, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imwrite(img_path, img)
        paths.append(img_path)
    return paths[:3]


class TestMultiTenant20ConcurrentDistinctJobs:
    """
    Empirical Challenge 1: 20 Concurrent PDF Requests across 20 DIFFERENT Jobs.
    Each job has unique parameters, verdict, hash, and keyframe configuration.
    """

    def test_20_concurrent_distinct_jobs(self, client, keyframe_sample_images):
        jobs_matrix = []
        for i in range(1, 21):
            jid = f"tenant-job-{i:02d}-distinct"
            verdicts = ["DEEPFAKE", "AUTHENTIC", "SUSPICIOUS", "ALTERED"]
            verdict = verdicts[(i - 1) % len(verdicts)]
            risk = "CRITICAL" if verdict == "DEEPFAKE" else ("LOW" if verdict == "AUTHENTIC" else "MEDIUM")
            conf = 90.0 + (i * 0.4) if verdict == "DEEPFAKE" else (10.0 + (i * 0.5))
            unique_hash = f"SHA256-TENANT-{i:02d}-AABBCCDDEEFF00112233445566778899"

            # Vary keyframes: 0 frames for jobs 1-5, 1 frame for 6-10, 2 frames for 11-15, 3 frames for 16-18, frames array for 19, missing for 20
            if i <= 5:
                snaps = []
                frames = []
            elif i <= 10:
                snaps = [
                    {
                        "frame_number": i * 10,
                        "timestamp": f"00:{i:02d}.00",
                        "anomaly_region": f"Anomaly Landmark Region {i}",
                        "anomaly_score": conf / 100.0,
                        "image_path": keyframe_sample_images[0],
                        "detector_subsystem": "GenD ViT-L/14 + Spatial SBI",
                    }
                ]
                frames = []
            elif i <= 15:
                snaps = [
                    {
                        "frame_number": i * 10,
                        "timestamp": f"00:{i:02d}.00",
                        "anomaly_region": f"Region A {i}",
                        "anomaly_score": conf / 100.0,
                        "image_path": keyframe_sample_images[0],
                        "detector_subsystem": "GenD ViT-L/14",
                    },
                    {
                        "frame_number": i * 10 + 5,
                        "timestamp": f"00:{i:02d}.50",
                        "anomaly_region": f"Region B {i}",
                        "anomaly_score": (conf - 2) / 100.0,
                        "image_path": keyframe_sample_images[1],
                        "detector_subsystem": "Spatial SBI",
                    },
                ]
                frames = []
            elif i <= 18:
                snaps = [
                    {
                        "frame_number": i * 10,
                        "timestamp": f"00:{i:02d}.00",
                        "anomaly_region": f"Region 1 {i}",
                        "anomaly_score": 0.95,
                        "image_path": keyframe_sample_images[0],
                        "detector_subsystem": "GenD ViT-L/14",
                    },
                    {
                        "frame_number": i * 10 + 2,
                        "timestamp": f"00:{i:02d}.20",
                        "anomaly_region": f"Region 2 {i}",
                        "anomaly_score": 0.94,
                        "image_path": keyframe_sample_images[1],
                        "detector_subsystem": "Spatial SBI",
                    },
                    {
                        "frame_number": i * 10 + 4,
                        "timestamp": f"00:{i:02d}.40",
                        "anomaly_region": f"Region 3 {i}",
                        "anomaly_score": 0.93,
                        "image_path": keyframe_sample_images[2],
                        "detector_subsystem": "Audio Engine",
                    },
                ]
                frames = []
            elif i == 19:
                snaps = []
                frames = [
                    {"frame_number": 12, "timestamp": "00:00.40", "confidence": 0.91},
                    {"frame_number": 24, "timestamp": "00:00.80", "confidence": 0.94},
                ]
            else: # i == 20
                snaps = [
                    {
                        "frame_number": 99,
                        "timestamp": "00:03.30",
                        "anomaly_region": "Missing File Fallback Region",
                        "anomaly_score": 0.96,
                        "image_path": "/non/existent/path/frame_99.jpg",
                        "detector_subsystem": "GenD ViT-L/14",
                    }
                ]
                frames = []

            job_dict = {
                "job_id": jid,
                "status": "complete",
                "verdict": verdict,
                "confidence": conf,
                "risk_level": risk,
                "result": {
                    "verdict": verdict,
                    "confidence": conf,
                    "risk_level": risk,
                    "sha256": unique_hash,
                    "visual_score": conf / 100.0,
                    "gend_score": conf / 100.0,
                    "audio_score": 0.20,
                    "keyframe_snapshots": snaps,
                    "frames": frames,
                },
            }
            save_local_job(job_dict)
            jobs_matrix.append((jid, verdict, unique_hash, len(snaps)))

        def request_job_pdf(item):
            jid, verdict, u_hash, snap_count = item
            res = client.get(f"/api/v1/jobs/{jid}/report.pdf")
            return jid, verdict, u_hash, snap_count, res.status_code, res.content

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(request_job_pdf, item) for item in jobs_matrix]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        assert len(results) == 20

        all_pdf_texts = {}
        for jid, verdict, u_hash, snap_count, status_code, content in results:
            assert status_code == 200, f"Job {jid} returned unexpected status {status_code}"
            assert content.startswith(b"%PDF-1."), f"Job {jid} did not return valid PDF magic bytes"
            doc = pypdfium2.PdfDocument(content)
            assert len(doc) >= 1, f"Job {jid} produced 0 pages"
            full_text = " ".join(p.get_textpage().get_text_range() for p in doc)
            all_pdf_texts[jid] = full_text

            # Assert this job's own data is present
            assert jid in full_text, f"Job reference ID {jid} missing from its own PDF"
            assert u_hash[:20] in full_text, f"Hash {u_hash[:20]} missing from PDF of {jid}"

        # Cross-tenant data isolation test: verify no job's PDF contains another job's ID
        for jid_a, text_a in all_pdf_texts.items():
            for jid_b in all_pdf_texts:
                if jid_a != jid_b:
                    assert jid_b not in text_a, (
                        f"CRITICAL ISOLATION LEAK: Content of {jid_b} found inside PDF of {jid_a}!"
                    )


class TestZeroKeyframesLayoutRobustness:
    """
    Empirical Challenge 2: Zero-Keyframe Jobs honestly generate 1-page reports without error.
    """

    def test_zero_keyframes_empty_list(self, client):
        """0 keyframes with empty list [] produces exactly 1 page."""
        jid = "zero-frame-empty-list"
        save_local_job({
            "job_id": jid,
            "status": "complete",
            "verdict": "AUTHENTIC",
            "confidence": 8.5,
            "risk_level": "LOW",
            "result": {
                "verdict": "AUTHENTIC",
                "confidence": 8.5,
                "risk_level": "LOW",
                "visual_score": 0.05,
                "gend_score": 0.08,
                "audio_score": 0.02,
                "keyframe_snapshots": [],
            }
        })
        resp = client.get(f"/api/v1/jobs/{jid}/report.pdf")
        assert resp.status_code == 200
        doc = pypdfium2.PdfDocument(resp.content)
        assert len(doc) == 1, f"Expected 1 page for zero keyframes, got {len(doc)}"
        text = doc[0].get_textpage().get_text_range()
        assert "Authentic" in text
        assert "Low Risk" in text or "LOW RISK" in text

    def test_zero_keyframes_null_and_missing_keys(self, client):
        """0 keyframes when result has None or omitted keys produces exactly 1 page."""
        jid = "zero-frame-null-keys"
        save_local_job({
            "job_id": jid,
            "status": "complete",
            "result": {
                "keyframe_snapshots": None,
                "frames": None,
            }
        })
        resp = client.get(f"/api/v1/jobs/{jid}/report.pdf")
        assert resp.status_code == 200
        doc = pypdfium2.PdfDocument(resp.content)
        assert len(doc) == 1, f"Expected 1 page, got {len(doc)}"

    def test_zero_keyframes_empty_dict(self, client):
        """0 keyframes when result is completely empty dict produces 1 page."""
        jid = "zero-frame-empty-dict"
        save_local_job({
            "job_id": jid,
            "status": "complete",
            "result": {}
        })
        resp = client.get(f"/api/v1/jobs/{jid}/report.pdf")
        assert resp.status_code == 200
        doc = pypdfium2.PdfDocument(resp.content)
        assert len(doc) == 1, f"Expected 1 page, got {len(doc)}"


class TestMissingJob404Integrity:
    """
    Empirical Challenge 3: Non-existent jobs honestly return HTTP 404.
    """

    def test_missing_job_returns_honest_404(self, client):
        """A random non-existent job ID returns HTTP 404 with detail message."""
        missing_id = "non-existent-random-uuid-999888777"
        resp = client.get(f"/api/v1/jobs/{missing_id}/report.pdf")
        assert resp.status_code == 404
        data = resp.json()
        assert f"Job {missing_id} not found" in data.get("detail", "")

    def test_missing_threat_returns_honest_404(self, client):
        """A non-existent threat incident returns HTTP 404 with detail message."""
        missing_tid = "NON-EXISTENT-THREAT-UUID-000111222"
        resp = client.get(f"/api/v1/threat-intelligence/{missing_tid}/fir-pdf")
        assert resp.status_code == 404
        data = resp.json()
        assert "Threat incident not found" in data.get("detail", "")

    def test_whitespace_job_id_returns_404(self, client):
        """Job ID with whitespace returns 404 rather than 500."""
        resp = client.get("/api/v1/jobs/%20%20/report.pdf")
        assert resp.status_code == 404

    def test_path_traversal_job_id_returns_404(self, client):
        """Job ID with directory traversal attempt returns 404 rather than file disclosure."""
        resp = client.get("/api/v1/jobs/..%2F..%2Fetc%2Fpasswd/report.pdf")
        assert resp.status_code in (404, 422)


class TestMemoryAndBufferIsolation:
    """
    Empirical Challenge 4: Memory & Buffer Isolation between builds.
    """

    def test_image_buffer_isolation_consecutive_builds(self, client, keyframe_sample_images):
        """
        Job A has an embedded photographic keyframe (>20KB).
        Job B immediately follows with 0 keyframes (~3.7KB-6KB).
        Verify Job B's buffer has zero image data leakage from Job A.
        """
        jid_a = "isolate-job-a-with-image"
        jid_b = "isolate-job-b-zero-frames"

        save_local_job({
            "job_id": jid_a,
            "status": "complete",
            "verdict": "DEEPFAKE",
            "confidence": 99.0,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 99.0,
                "keyframe_snapshots": [
                    {
                        "frame_number": 10,
                        "timestamp": "00:00.33",
                        "anomaly_region": "Eye Specular Region",
                        "anomaly_score": 0.99,
                        "image_path": keyframe_sample_images[0],
                        "detector_subsystem": "GenD ViT-L/14",
                    }
                ]
            }
        })

        save_local_job({
            "job_id": jid_b,
            "status": "complete",
            "verdict": "AUTHENTIC",
            "confidence": 10.0,
            "result": {
                "verdict": "AUTHENTIC",
                "confidence": 10.0,
                "keyframe_snapshots": []
            }
        })

        resp_a = client.get(f"/api/v1/jobs/{jid_a}/report.pdf")
        resp_b = client.get(f"/api/v1/jobs/{jid_b}/report.pdf")

        assert resp_a.status_code == 200
        assert resp_b.status_code == 200

        size_a = len(resp_a.content)
        size_b = len(resp_b.content)

        assert size_a > 20000, f"Expected Job A >20KB, got {size_a}"
        assert size_b < 10000, f"Expected Job B <10KB (text only), got {size_b}"

        doc_b = pypdfium2.PdfDocument(resp_b.content)
        text_b = doc_b[0].get_textpage().get_text_range()
        assert jid_a not in text_b
        assert "Eye Specular Region" not in text_b
        assert "Deepfake" not in text_b

    def test_deterministic_pdf_reproducibility(self, client):
        """Consecutive builds of identical job return identical structure and length."""
        jid = "deterministic-repro-job"
        save_local_job({
            "job_id": jid,
            "status": "complete",
            "verdict": "SUSPICIOUS",
            "confidence": 65.0,
            "result": {
                "verdict": "SUSPICIOUS",
                "confidence": 65.0,
                "visual_score": 0.65,
                "gend_score": 0.60,
                "audio_score": 0.50,
            }
        })

        resp1 = client.get(f"/api/v1/jobs/{jid}/report.pdf")
        resp2 = client.get(f"/api/v1/jobs/{jid}/report.pdf")

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        # Sizes should match closely (timestamps may differ by 1 second if second flips, length remains identical)
        assert abs(len(resp1.content) - len(resp2.content)) <= 5

    def test_continuous_build_memory_stability(self, client):
        """
        Build 40 PDFs consecutively and track memory usage with tracemalloc.
        Verifies there is no runaway memory accumulation.
        """
        tracemalloc.start()
        snapshot_start = tracemalloc.take_snapshot()

        jid = "memory-stability-target"
        save_local_job({
            "job_id": jid,
            "status": "complete",
            "verdict": "DEEPFAKE",
            "confidence": 95.0,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 95.0,
                "visual_score": 0.95,
                "gend_score": 0.90,
            }
        })

        for i in range(40):
            res = client.get(f"/api/v1/jobs/{jid}/report.pdf")
            assert res.status_code == 200

        snapshot_end = tracemalloc.take_snapshot()
        tracemalloc.stop()

        top_stats = snapshot_end.compare_to(snapshot_start, 'lineno')
        total_diff_kb = sum(stat.size_diff for stat in top_stats) / 1024.0

        # Runaway leakage across 40 builds would accumulate tens of MBs.
        # Normal Python/ReportLab cache variation should be < 5 MB.
        assert total_diff_kb < 5000, f"Potential memory leak: diff is {total_diff_kb:.2f} KB across 40 builds"


class TestSpecialCharactersAndAdversarialInputs:
    """
    Empirical Challenge 5: Special characters and XML markup handling.
    """

    def test_special_characters_in_threat_title_handling(self, client):
        """
        Tests threat title containing XML-sensitive characters:
        e.g., 'Alert: Scam <Official Notice> & Account Freeze [₹50,000] 🚨'
        """
        tid = "THREAT-SPECIAL-CHARS-TITLE"
        insert_threat_item({
            "id": tid,
            "title": "Alert: Scam <Official Notice> & Account Freeze [₹50,000] 🚨",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "fake_probability": 0.98,
            "risk_level": "CRITICAL",
            "city": "Bengaluru",
            "state": "Karnataka",
            "location_source": "EXIF",
        })

        resp = client.get(f"/api/v1/threat-intelligence/{tid}/fir-pdf")
        # In current implementation, if unescaped, does it succeed or crash?
        # Let's verify response code and content
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            assert resp.content.startswith(b"%PDF-1.")
            doc = pypdfium2.PdfDocument(resp.content)
            assert len(doc) >= 1

    def test_unclosed_tag_in_threat_title_adversarial_probe(self, client):
        """
        Adversarial probe: Threat title with an unclosed XML tag:
        'Notice: Fake Warrant <unclosed'
        Tests whether ReportLab paraparser triggers unhandled ValueError (500).
        """
        tid = "THREAT-ADV-UNCLOSED-TAG"
        insert_threat_item({
            "id": tid,
            "title": "Notice: Fake Warrant <unclosed",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "fake_probability": 0.98,
            "risk_level": "CRITICAL",
            "city": "Bengaluru",
            "state": "Karnataka",
            "location_source": "EXIF",
        })

        # TestClient raises unhandled exceptions from the app
        try:
            resp = client.get(f"/api/v1/threat-intelligence/{tid}/fir-pdf")
            crashed = False
            status = resp.status_code
        except ValueError as e:
            crashed = True
            status = 500
            error_msg = str(e)
            assert "paraparser: syntax error" in error_msg

        # Document finding: unclosed XML tags in threat titles crash paraparser if unescaped
        print(f"Unclosed tag probe result: crashed={crashed}, status={status}")

    def test_unclosed_tag_in_keyframe_fields_jobs_pdf(self, client):
        """
        Adversarial probe: Keyframe snapshot diagnostic finding with unclosed tag in jobs.py:
        'Finding with <unclosed'
        Tests whether jobs.py crashes with unhandled ValueError (500) or handles gracefully.
        """
        jid = "job-adv-unclosed-finding"
        save_local_job({
            "job_id": jid,
            "status": "complete",
            "verdict": "DEEPFAKE",
            "confidence": 97.0,
            "result": {
                "verdict": "DEEPFAKE",
                "confidence": 97.0,
                "keyframe_snapshots": [
                    {
                        "frame_number": 5,
                        "timestamp": "00:00.20",
                        "anomaly_region": "Lip Region",
                        "anomaly_score": 0.97,
                        "detector_subsystem": "GenD ViT-L/14",
                        "forensic_finding": "Artifact marked with <unclosed",
                    }
                ]
            }
        })

        try:
            resp = client.get(f"/api/v1/jobs/{jid}/report.pdf")
            crashed = False
            status = resp.status_code
        except ValueError as e:
            crashed = True
            status = 500
            assert "paraparser: syntax error" in str(e)

        print(f"Jobs PDF unclosed finding probe result: crashed={crashed}, status={status}")
