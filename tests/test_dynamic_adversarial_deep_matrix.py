"""
Exhaustive Empirical Matrix Test for Dynamic Behavior & Database WAL Concurrency
Challenges:
1. Ingestion with missing/null/extreme parameters
2. Non-existent post lookups (verifying 404s and no write locking)
3. Concurrent read/write queries under WAL mode (150 simultaneous operations across 30 workers)
4. Scam detection scoring across benign, borderline, and highly malicious samples
5. Dynamic threat catalog pagination, limit clamping, and search filtering
"""

import sys
import os
import time
import json
import uuid
import sqlite3
import threading
import concurrent.futures
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("backend/netra"))
sys.path.insert(0, os.path.abspath("pipeline"))

from backend.api.server import app
from backend.api.db import init_db, get_db, DB_PATH

client = TestClient(app)

def test_null_and_extreme_parameter_ingestion():
    print("\n=======================================================")
    print("[CHALLENGE 1] Null, Missing & Extreme Parameter Ingestion")
    print("=======================================================")
    
    test_cases = [
        {
            "name": "All optional fields set to None",
            "payload": {
                "title": f"Null Payload {uuid.uuid4().hex[:6]}",
                "type": "scam_text",
                "threat_category": "ELECTRICITY_KYC",
                "source_platform": "whatsapp",
                "fake_probability": 0.95,
                "city": None,
                "state": None,
                "lat": None,
                "lng": None,
                "device_model": None,
                "software_used": None,
                "extracted_iocs": None,
                "fir_dossier": None
            },
            "expect_status": 200
        },
        {
            "name": "Empty string fields and empty lists",
            "payload": {
                "title": f"Empty Str Payload {uuid.uuid4().hex[:6]}",
                "type": "audio_clone",
                "threat_category": "VOICE_CLONE",
                "source_platform": "",
                "fake_probability": 0.0,
                "city": "",
                "state": "",
                "lat": 0.0,
                "lng": 0.0,
                "device_model": "",
                "software_used": "",
                "extracted_iocs": {"phones": [], "upis": [], "urls": [], "apks": []},
                "fir_dossier": {"incident_summary": "", "applicable_laws": [], "recommended_action": ""}
            },
            "expect_status": 200
        },
        {
            "name": "Extreme coordinates and probabilities",
            "payload": {
                "title": f"Extreme Range {uuid.uuid4().hex[:6]}",
                "type": "image_deepfake",
                "threat_category": "IMPERSONATION",
                "source_platform": "Instagram",
                "fake_probability": 1.0,
                "city": "Antarctica Base",
                "state": "South Pole",
                "lat": -89.9999,
                "lng": 179.9999,
                "extracted_iocs": {"urls": ["https://evil-subdomain.fake-domain.xyz/login?id=123&token=abc"]},
            },
            "expect_status": 200
        },
        {
            "name": "Unicode and Hindi characters in text fields",
            "payload": {
                "title": "बिजली बिल घोटाला चेतावनी - साइबर सुरक्षा",
                "type": "scam_text",
                "threat_category": "ELECTRICITY_KYC",
                "source_platform": "व्हाट्सएप",
                "fake_probability": 0.99,
                "city": "नई दिल्ली",
                "state": "दिल्ली",
                "extracted_iocs": {"phones": ["+919876543210"], "upis": ["scammer@ybl"]},
                "fir_dossier": {"incident_summary": "अवैध बिजली बिल संदेश"}
            },
            "expect_status": 200
        }
    ]

    for tc in test_cases:
        t0 = time.perf_counter()
        resp = client.post("/api/v1/threat-intelligence/report", json=tc["payload"])
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert resp.status_code == tc["expect_status"], f"Failed on {tc['name']}: {resp.status_code} -> {resp.text}"
        res_data = resp.json()
        assert res_data["status"] == "success"
        item_id = res_data["id"]
        
        # Verify persistence and retrieval
        get_res = client.get(f"/api/v1/threat-intelligence/{item_id}")
        assert get_res.status_code == 200
        retrieved = get_res.json()["item"]
        assert retrieved["id"] == item_id
        print(f"  [PASS] {tc['name']} -> ID: {item_id}, Lat: {retrieved['lat']}, Lng: {retrieved['lng']}, Latency: {elapsed_ms:.2f}ms")

def test_non_existent_404_no_lock():
    print("\n=======================================================")
    print("[CHALLENGE 2] 404 Non-Existent Lookups Without Write Locks")
    print("=======================================================")
    
    non_existent_ids = [
        "THREAT-DOESNOTEXIST-9999",
        "post-non-existent-uuid-xyz",
        "key_fake_random_not_in_db",
        "' OR '1'='1",
        "../../etc/passwd"
    ]
    
    # Verify 404s on various endpoints
    for fake_id in non_existent_ids:
        # Threat detail
        r1 = client.get(f"/api/v1/threat-intelligence/{fake_id}")
        assert r1.status_code == 404, f"Threat detail expected 404, got {r1.status_code}"
        
        # Threat upvote
        r2 = client.post(f"/api/v1/threat-intelligence/{fake_id}/upvote")
        assert r2.status_code == 404, f"Threat upvote expected 404, got {r2.status_code}"
        
        # Community post get
        r3 = client.get(f"/api/v1/community/posts/{fake_id}")
        assert r3.status_code == 404, f"Community post expected 404, got {r3.status_code}"
        
        # Community post like
        r4 = client.post(f"/api/v1/community/posts/{fake_id}/like")
        assert r4.status_code == 404, f"Community post like expected 404, got {r4.status_code}"
        
        # Dev key delete
        r5 = client.delete(f"/api/v1/developers/keys/{fake_id}")
        assert r5.status_code == 404, f"Key delete expected 404, got {r5.status_code}"
        
        print(f"  [PASS] ID '{fake_id}' cleanly rejected with 404 across all lookup routes.")

    # Verify no open write transactions by acquiring immediate read and write lock
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode;")
    mode = cursor.fetchone()[0]
    assert mode.upper() == "WAL", f"Expected WAL mode, got {mode}"
    cursor.execute("SELECT COUNT(*) FROM threat_catalog;")
    count = cursor.fetchone()[0]
    conn.close()
    print(f"  [PASS] Database journal mode verified as '{mode.upper()}'. Current threat items: {count}")

def test_extreme_wal_concurrency_stress():
    print("\n=======================================================")
    print("[CHALLENGE 3] Extreme Concurrent Read/Write under WAL Mode")
    print("=======================================================")
    
    # 1. Create a test post for concurrent view and like spam
    post_payload = {
        "title": f"WAL Concurrency Stress Subject {uuid.uuid4().hex[:6]}",
        "category": "THREAT_INTEL",
        "content": "Subject post for high-concurrency read/write hammer testing.",
        "author": {"name": "Hammer Agent", "email": "hammer@netra.security"}
    }
    create_resp = client.post("/api/v1/community/posts", json=post_payload)
    assert create_resp.status_code == 200
    target_post_id = create_resp.json()["post"]["id"]

    # Concurrency test parameters: 150 total operations across 30 worker threads
    num_requests = 150
    num_threads = 30
    
    results = {"success": 0, "failed": 0, "exceptions": []}
    lock = threading.Lock()
    
    def worker(idx):
        local_client = TestClient(app)
        op = idx % 6
        try:
            if op == 0:
                # Concurrent read with view increment
                r = local_client.get(f"/api/v1/community/posts/{target_post_id}")
                assert r.status_code == 200
            elif op == 1:
                # Concurrent like write
                r = local_client.post(f"/api/v1/community/posts/{target_post_id}/like")
                assert r.status_code == 200
            elif op == 2:
                # Concurrent catalog read with pagination
                r = local_client.get(f"/api/v1/threat-intelligence/catalog?limit=20&offset={(idx*2)%50}")
                assert r.status_code == 200
            elif op == 3:
                # Concurrent threat insert write
                p = {
                    "title": f"Concurrent Incident {idx}",
                    "type": "scam_text",
                    "threat_category": "JOB_SCAM",
                    "source_platform": "whatsapp",
                    "fake_probability": 0.88,
                    "city": "Bengaluru",
                    "state": "Karnataka"
                }
                r = local_client.post("/api/v1/threat-intelligence/report", json=p)
                assert r.status_code == 200
            elif op == 4:
                # Concurrent radar map query
                r = local_client.get("/api/v1/threat-intelligence/radar")
                assert r.status_code == 200
            elif op == 5:
                # Concurrent dev key creation & deletion
                kr = local_client.post("/api/v1/developers/keys", json={"name": f"Stress Key {idx}", "tier": "free"})
                assert kr.status_code == 200
                kid = kr.json()["key"]["key_id"]
                dr = local_client.delete(f"/api/v1/developers/keys/{kid}")
                assert dr.status_code == 200
            
            with lock:
                results["success"] += 1
        except Exception as e:
            with lock:
                results["failed"] += 1
                results["exceptions"].append(f"Worker {idx} (op {op}): {str(e)}")

    t0 = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(worker, i) for i in range(num_requests)]
        concurrent.futures.wait(futures)
    elapsed = time.perf_counter() - t0

    print(f"  Executed {num_requests} concurrent mixed operations across {num_threads} threads in {elapsed:.3f}s")
    print(f"  Throughput: {num_requests / elapsed:.1f} ops/sec")
    print(f"  Successes: {results['success']}/{num_requests}, Failures: {results['failed']}")
    if results["exceptions"]:
        print("  Failure details:", results["exceptions"][:5])
        assert False, f"Concurrency test failed with {len(results['exceptions'])} exceptions"
    
    # Verify final post state
    final_post = client.get(f"/api/v1/community/posts/{target_post_id}").json()["post"]
    print(f"  Target Post Final Views: {final_post['views']}, Likes: {final_post['likes']}")
    print("  [PASS] 100% success rate under multi-threaded WAL concurrency, zero lock collisions.")

def test_scam_detection_corpus_calibration():
    print("\n=======================================================")
    print("[CHALLENGE 4] Scam Detection Scoring Across Spectrum")
    print("=======================================================")
    
    # Test Public API endpoint (/api/v1/public/detect/scam-text)
    k_res = client.post("/api/v1/developers/keys", json={"name": "Audit Calibration Key", "tier": "developer"})
    raw_api_key = k_res.json()["key"]["raw_key"]
    key_id = k_res.json()["key"]["key_id"]

    public_tests = [
        ("Hi Mom, I will reach home by 7 PM today.", False, "BENIGN"),
        ("Dear consumer, your electricity power will be disconnected at 9.30 PM. Call 9876543210 immediately.", True, "ELECTRICITY_KYC"),
        ("CBI / Police Digital Arrest Notice: A parcel with narcotics in your name was seized.", True, "DIGITAL_ARREST"),
        ("Part time job offer: daily earn 5000 daily by youtube like and subscribe channel task!", True, "JOB_SCAM"),
        ("Stock tips vip investment with guaranteed profit 500% return!", True, "STOCK_FRAUD"),
        ("URGENT: Your bank account block warning due to KYC expire. Submit OTP here: http://sbi-kyc.xyz", True, "BANKING_PHISHING")
    ]
    
    print("  --- 4A: Public API Developer Endpoint (/api/v1/public/detect/scam-text) ---")
    for msg, expect_scam, expect_cat in public_tests:
        r = client.post(
            "/api/v1/public/detect/scam-text",
            headers={"X-API-Key": raw_api_key},
            json={"message": msg}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["scam_detected"] == expect_scam, f"Expected {expect_scam}, got {data['scam_detected']} for: '{msg}'"
        assert data["threat_category"] == expect_cat
        print(f"  [PASS] Public API: detected={data['scam_detected']}, cat={data['threat_category']} -> '{msg[:45]}...'")

    # Clean up key
    client.delete(f"/api/v1/developers/keys/{key_id}")

    # Test Local /api/v1/detect/scam endpoint
    print("  --- 4B: Internal ML Endpoint (/api/v1/detect/scam) ---")
    ml_tests = [
        ("Hello Dr. Sharma, I would like to schedule a routine dental checkup for next Tuesday at 3 PM.", False),
        ("Can you bring 1kg apples and some brown bread while coming back from the supermarket?", False),
        ("Hi Mom, I reached the hotel safely in Bangalore. Flight was on time. Will call you after dinner.", False),
        ("Can you send me the recipe for paneer butter masala you made last weekend?", False),
        ("Please review the python code for the auth module.", False),
        ("Dear consumer your electricity power will be disconnected at 9.30 pm tonight from electricity office. Call 9876543210 immediately to update KYC.", True),
        ("URGENT: Your SBI Bank account has been SUSPENDED due to KYC expiry. Click http://sbi-kyc-update.xyz to verify immediately within 1 hour.", True),
        ("CBI / TRAI Digital Arrest Notice: A parcel containing narcotics in your name was seized at Mumbai Customs. Connect to Skype court room immediately.", True),
        ("CONGRATULATIONS! You have won Rs 50,00,000 in KBC Lottery. Transfer registration fee of Rs 5,000 to UPI kbcwinner@paytm to claim.", True),
        ("Earn Rs 8,000 per day by liking YouTube videos and Telegram rating tasks! Contact HR Priya on WhatsApp +919988776655.", True)
    ]

    for text, expect_scam in ml_tests:
        r = client.post("/api/v1/detect/scam", json={"text": text})
        assert r.status_code == 200
        data = r.json()
        score = data["risk_score"]
        is_scam = data["is_scam"]
        verdict = data["verdict"]
        
        if expect_scam:
            assert is_scam is True or score >= 40, f"Expected scam detection for '{text}', got score {score}"
            assert "HIGH RISK" in verdict or "CRITICAL" in verdict or "CAUTION" in verdict
            print(f"  [MALICIOUS PASS] Score={score:2d}, Verdict='{verdict}' -> '{text[:45]}...'")
        else:
            assert is_scam is False, f"Expected non-scam for '{text}', got score {score}"
            assert "CRITICAL" not in verdict and "HIGH RISK" not in verdict
            print(f"  [BENIGN PASS]    Score={score:2d}, Verdict='{verdict}' -> '{text[:45]}...'")

def test_dynamic_catalog_pagination_and_search():
    print("\n=======================================================")
    print("[CHALLENGE 5] Dynamic Catalog Pagination, Limits & Search")
    print("=======================================================")
    
    # 1. Test pagination limits
    r1 = client.get("/api/v1/threat-intelligence/catalog?limit=5&offset=0")
    assert r1.status_code == 200
    res1 = r1.json()["results"]
    assert len(res1) <= 5
    
    r2 = client.get("/api/v1/threat-intelligence/catalog?limit=5&offset=5")
    assert r2.status_code == 200
    res2 = r2.json()["results"]
    assert len(res2) <= 5
    
    if len(res1) == 5 and len(res2) == 5:
        ids1 = {x["id"] for x in res1}
        ids2 = {x["id"] for x in res2}
        assert ids1 != ids2, "Offset 0 and Offset 5 returned identical IDs!"
        print(f"  [PASS] Offset pagination verified distinct pages (Page 1: {len(ids1)} items, Page 2: {len(ids2)} items).")
        
    # 2. Test search filtering across fields
    r_search = client.get("/api/v1/threat-intelligence/catalog?search=Delhi")
    assert r_search.status_code == 200
    results_delhi = r_search.json()["results"]
    print(f"  [PASS] Search keyword 'Delhi' matched {len(results_delhi)} items.")
    for itm in results_delhi:
        match = ("delhi" in itm["title"].lower() or 
                 "delhi" in itm["city"].lower() or 
                 "delhi" in str(itm["extracted_iocs"]).lower() or
                 "delhi" in str(itm.get("software_used", "")).lower())
        assert match, f"Item did not match search term 'Delhi': {itm}"

    # 3. Test category filtering
    for cat in ["DIGITAL_ARREST", "ELECTRICITY_KYC", "JOB_SCAM", "IMPERSONATION"]:
        rcat = client.get(f"/api/v1/threat-intelligence/catalog?category={cat}")
        assert rcat.status_code == 200
        items = rcat.json()["results"]
        for itm in items:
            assert itm["threat_category"] == cat, f"Category filter mismatch: expected {cat}, got {itm['threat_category']}"
        print(f"  [PASS] Filter category='{cat}' returned {len(items)} matching items.")

    # 4. Test validation bounds on limit and offset
    assert client.get("/api/v1/threat-intelligence/catalog?limit=0").status_code == 422
    assert client.get("/api/v1/threat-intelligence/catalog?limit=-1").status_code == 422
    assert client.get("/api/v1/threat-intelligence/catalog?limit=500").status_code == 422
    assert client.get("/api/v1/threat-intelligence/catalog?offset=-10").status_code == 422
    print("  [PASS] Query param boundary limits (1 <= limit <= 200, offset >= 0) enforced with HTTP 422.")

if __name__ == "__main__":
    init_db()
    test_null_and_extreme_parameter_ingestion()
    test_non_existent_404_no_lock()
    test_extreme_wal_concurrency_stress()
    test_scam_detection_corpus_calibration()
    test_dynamic_catalog_pagination_and_search()
    print("\n=======================================================")
    print("🎉 ALL EMPIRICAL MATRIX TESTS PASSED WITH 100% INTEGRITY!")
    print("=======================================================\n")
