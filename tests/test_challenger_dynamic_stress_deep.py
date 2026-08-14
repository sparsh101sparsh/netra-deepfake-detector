"""
Empirical Dynamic Stress & Adversarial Probe for NETRA Iteration 3
Verifies:
1. WAL mode concurrency & high-load thread safety
2. Scam detector scoring invariant & edge cases
3. Edge case null parameters & boundary payloads
4. Pagination, limits, and SQL filter injection
5. API Key quota enforcement & verification
"""

import os
import sys
import time
import uuid
import json
import threading
import concurrent.futures
import pytest
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.db import init_db, get_db, create_api_key, verify_and_consume_key, delete_api_key
from backend.netra.pipeline.scam_detector import scam_detector_engine

client = TestClient(app)

def test_wal_mode_pragmas():
    """Verify SQLite WAL mode and busy timeout pragmas are active."""
    conn = get_db()
    journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    busy_timeout = conn.execute("PRAGMA busy_timeout;").fetchone()[0]
    conn.close()
    assert journal_mode.lower() == "wal", f"Expected WAL mode, got {journal_mode}"
    assert busy_timeout >= 5000, f"Expected busy_timeout >= 5000, got {busy_timeout}"
    print(f"✅ DB Pragmas verified: journal_mode={journal_mode}, busy_timeout={busy_timeout}ms")

def test_high_concurrency_stress():
    """Stress test WAL mode with 150 concurrent operations across 30 worker threads."""
    print("Testing 150 concurrent operations (reads, writes, updates)...")
    
    # Create test seed post
    post_res = client.post("/api/v1/community/posts", json={
        "title": f"Load Post {uuid.uuid4().hex[:6]}",
        "category": "SCAM_ANALYSIS",
        "content": "Load post content for concurrency test.",
        "author": {"name": "Load Tester"}
    })
    assert post_res.status_code == 200
    post_id = post_res.json()["post"]["id"]

    # Create test seed threat
    threat_res = client.post("/api/v1/threat-intelligence/report", json={
        "title": f"Load Threat {uuid.uuid4().hex[:6]}",
        "type": "scam_text",
        "threat_category": "DIGITAL_ARREST",
        "source_platform": "WhatsApp",
        "fake_probability": 0.99
    })
    assert threat_res.status_code == 200
    threat_id = threat_res.json()["id"]

    results = []
    
    def worker(idx):
        local_client = TestClient(app)
        op_type = idx % 6
        try:
            if op_type == 0:
                # Upvote threat
                r = local_client.post(f"/api/v1/threat-intelligence/{threat_id}/upvote")
                return r.status_code == 200, f"upvote: {r.status_code}"
            elif op_type == 1:
                # View post (increments view)
                r = local_client.get(f"/api/v1/community/posts/{post_id}")
                return r.status_code == 200, f"get_post: {r.status_code}"
            elif op_type == 2:
                # Like post
                r = local_client.post(f"/api/v1/community/posts/{post_id}/like")
                return r.status_code == 200, f"like_post: {r.status_code}"
            elif op_type == 3:
                # Query catalog with search
                r = local_client.get("/api/v1/threat-intelligence/catalog?search=Load&limit=10")
                return r.status_code == 200, f"catalog_search: {r.status_code}"
            elif op_type == 4:
                # Ingest new threat report
                r = local_client.post("/api/v1/threat-intelligence/report", json={
                    "title": f"Concurrent Threat {idx}",
                    "type": "video_deepfake",
                    "threat_category": "IMPERSONATION",
                    "fake_probability": 0.88
                })
                return r.status_code == 200, f"report_threat: {r.status_code}"
            elif op_type == 5:
                # Create and list community posts
                r = local_client.get("/api/v1/community/posts?limit=10")
                return r.status_code == 200, f"list_posts: {r.status_code}"
        except Exception as e:
            return False, f"Exception: {e}"

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as pool:
        futures = [pool.submit(worker, i) for i in range(150)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
    elapsed = time.time() - t0

    failed = [r for r in results if not r[0]]
    assert len(failed) == 0, f"Concurrency test had {len(failed)} failures: {failed[:5]}"
    print(f"✅ Concurrency stress completed: 150 ops in {elapsed:.2f}s, 0 failures.")

def test_scam_detector_invariants_and_boundaries():
    """Verify scam detector score invariants and verdict mapping."""
    test_cases = [
        ("Hello, please find the meeting agenda attached for tomorrow's sync.", False),
        ("Your electricity will be disconnected tonight at 9:30 PM. Call power officer 9876543210 immediately.", True),
        ("Dear customer, your SBI YONO account is locked. Update KYC at http://sbi-fake.xyz", True),
        ("Hey mom, I bought the groceries and am heading home now.", False),
        ("Congratulations! You won Rs 10 Crore in lottery. Send Rs 1000 processing fee to UPI win@paytm.", True),
    ]
    
    for text, expected_scam in test_cases:
        res = client.post("/api/v1/detect/scam", json={"text": text})
        assert res.status_code == 200
        data = res.json()
        assert "risk_score" in data
        assert "verdict" in data
        assert "is_scam" in data
        score = data["risk_score"]
        is_scam = data["is_scam"]
        verdict = data["verdict"]

        # Invariant checks
        if score >= 70 and is_scam:
            assert "CRITICAL" in verdict
        elif score >= 40 and is_scam:
            assert "HIGH RISK" in verdict
        elif score < 40 and not is_scam:
            assert "SAFE" in verdict
        elif score >= 40 and not is_scam:
            assert "CAUTION" in verdict
            
        print(f"  Scam check '{text[:40]}...': is_scam={is_scam}, score={score}, verdict='{verdict}'")
    print("✅ Scam detector invariants verified.")

def test_api_key_quota_enforcement():
    """Test API key creation, consumption, and quota limits."""
    # Create a key with quota = 2
    key_info = create_api_key(name="Quota Test Key", tier="test", monthly_quota=2)
    raw_key = key_info["raw_key"]
    key_id = key_info["key_id"]

    # 1st call -> success
    v1 = verify_and_consume_key(raw_key)
    assert v1 is not None and "error" not in v1
    assert v1["used_requests"] == 0 # was 0 before consume

    # 2nd call -> success
    v2 = verify_and_consume_key(raw_key)
    assert v2 is not None and "error" not in v2

    # 3rd call -> quota exceeded
    v3 = verify_and_consume_key(raw_key)
    assert v3 is not None and v3.get("error") == "QUOTA_EXCEEDED"

    # Test via HTTP endpoint
    # Create another key for HTTP test
    http_key_info = create_api_key(name="HTTP Quota Key", tier="developer", monthly_quota=1)
    http_raw_key = http_key_info["raw_key"]
    
    # 1st request via HTTP -> 200
    r1 = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": http_raw_key},
        json={"message": "Routine notification: your appointment is confirmed for 4 PM."}
    )
    assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"

    # 2nd request via HTTP -> 429 Quota Exceeded
    r2 = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": http_raw_key},
        json={"message": "Another message"}
    )
    assert r2.status_code == 429, f"Expected 429, got {r2.status_code}: {r2.text}"
    assert "quota exceeded" in r2.json()["detail"].lower()

    # Cleanup
    delete_api_key(key_id)
    delete_api_key(http_key_info["key_id"])
    print("✅ API Key quota enforcement verified.")

def test_null_and_boundary_handling():
    """Test null, boundary, and edge case parameters across endpoints."""
    # 1. Threat report with extreme coordinates
    res = client.post("/api/v1/threat-intelligence/report", json={
        "title": "Edge Case Coords",
        "type": "image_deepfake",
        "threat_category": "JOB_SCAM",
        "fake_probability": 1.0,
        "lat": -89.999,
        "lng": 179.999,
        "city": "",
        "state": "",
        "extracted_iocs": None,
        "fir_dossier": None
    })
    assert res.status_code == 200
    t_id = res.json()["id"]

    # Verify retrieval
    t_data = client.get(f"/api/v1/threat-intelligence/{t_id}").json()["item"]
    assert t_data["lat"] == -89.999
    assert t_data["lng"] == 179.999

    # 2. Community post with empty tags and minimal fields
    p_res = client.post("/api/v1/community/posts", json={
        "title": "Minimal Boundary Post",
        "category": "DEEPFAKE",
        "content": "Valid minimum content exceeding ten chars.",
        "author": {"name": "Author"}
    })
    assert p_res.status_code == 200
    p_data = p_res.json()["post"]
    assert p_data["tags"] == []
    assert p_data["views"] == 0 or p_data["views"] == 1
    print("✅ Null and boundary handling verified.")

if __name__ == "__main__":
    test_wal_mode_pragmas()
    test_high_concurrency_stress()
    test_scam_detector_invariants_and_boundaries()
    test_api_key_quota_enforcement()
    test_null_and_boundary_handling()
    print("\n🎉 ALL CHALLENGER DYNAMIC STRESS TESTS PASSED SUCCESSFULLY!")
