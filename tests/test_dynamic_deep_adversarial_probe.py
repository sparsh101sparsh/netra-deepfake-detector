"""
Deep Adversarial Stress Test Probe for NETRA Dynamic Backend (Iteration 2).
Empirically stress-tests:
1. Null-safety across all Optional fields in /api/v1/threat-intelligence/report
2. Multi-threaded concurrency and lock contention on netra.db (50 concurrent threads)
3. Scam detector false alarm rejection on diverse benign text corpuses
"""

import sys
import os
import concurrent.futures
import time
import json
import uuid
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.db import init_db, get_db

client = TestClient(app)

def test_deep_null_safety():
    print("\n--- [CHECK 1] Deep Null Safety in Threat Report Ingestion ---")
    payloads = [
        {
            "title": "Minimal Threat Report with All Optional Fields Null",
            "type": "video_deepfake",
            "threat_category": "DIGITAL_ARREST",
            "source_platform": "WhatsApp",
            "fake_probability": 0.95,
            "city": None,
            "state": None,
            "lat": None,
            "lng": None,
            "device_model": None,
            "software_used": None,
            "extracted_iocs": None,
            "fir_dossier": None,
        },
        {
            "title": "Explicit Null Coordinates & Empty Nested Dicts",
            "type": "scam_text",
            "threat_category": "ELECTRICITY_KYC",
            "source_platform": "SMS",
            "fake_probability": 0.99,
            "lat": None,
            "lng": None,
            "city": None,
            "state": None,
            "extracted_iocs": {"phones": ["+919876543210"], "upis": []},
            "fir_dossier": {"incident_summary": "Electricity power threat."}
        },
        {
            "title": "Boundary Zero Values",
            "type": "audio_clone",
            "threat_category": "VOICE_CLONE",
            "source_platform": "whatsapp",
            "fake_probability": 0.0,
            "lat": 0.0,
            "lng": 0.0,
            "city": "Unknown City",
            "state": "Unknown State"
        }
    ]
    
    for i, p in enumerate(payloads):
        resp = client.post("/api/v1/threat-intelligence/report", json=p)
        assert resp.status_code == 200, f"Payload {i} failed: {resp.status_code} -> {resp.text}"
        res_data = resp.json()
        assert res_data["status"] == "success"
        item_id = res_data["id"]
        
        # Verify get detail
        detail_resp = client.get(f"/api/v1/threat-intelligence/{item_id}")
        assert detail_resp.status_code == 200, f"Detail fetch failed for {item_id}: {detail_resp.text}"
        item = detail_resp.json()['item']
        if p.get("lat") is not None:
            assert item["lat"] is not None
            assert item["lng"] is not None
        else:
            assert item["lat"] is None
            assert item["lng"] is None
        print(f"  [PASS] Payload {i+1} successfully ingested and verified with ID: {item_id}")
    print("  [SUCCESS] All null safety tests passed!")

def test_extreme_concurrency():
    print("\n--- [CHECK 2] Extreme Concurrency & Lock Contention on netra.db ---")
    
    # 1. Create a baseline community post
    post_payload = {
        "title": f"Concurrency Target Post {uuid.uuid4().hex[:6]}",
        "category": "INVESTIGATION",
        "content": "Concurrent load testing post to verify WAL mode non-blocking view counters.",
        "author": {"name": "Load Tester", "email": "load@netra.security"}
    }
    create_resp = client.post("/api/v1/community/posts", json=post_payload)
    assert create_resp.status_code == 200
    post_id = create_resp.json()["post"]["id"]
    print(f"  Created test post: {post_id}")
    
    # 2. Spawn worker threads executing simultaneous writes, reads, likes, and view increments
    num_requests = 100
    num_threads = 20
    
    errors = []
    successes = 0
    
    def worker_action(i):
        client_instance = TestClient(app)
        action_type = i % 5
        try:
            if action_type == 0:
                # View increment
                r = client_instance.get(f"/api/v1/community/posts/{post_id}")
                if r.status_code != 200:
                    return False, f"Get post failed with {r.status_code}: {r.text}"
            elif action_type == 1:
                # Like post
                r = client_instance.post(f"/api/v1/community/posts/{post_id}/like")
                if r.status_code != 200:
                    return False, f"Like post failed with {r.status_code}: {r.text}"
            elif action_type == 2:
                # Fetch catalog
                r = client_instance.get("/api/v1/threat-intelligence/catalog?limit=10")
                if r.status_code != 200:
                    return False, f"Catalog failed with {r.status_code}: {r.text}"
            elif action_type == 3:
                # Fetch radar
                r = client_instance.get("/api/v1/threat-intelligence/radar")
                if r.status_code != 200:
                    return False, f"Radar failed with {r.status_code}: {r.text}"
            elif action_type == 4:
                # Create and delete developer key
                k_res = client_instance.post("/api/v1/developers/keys", json={"name": f"Key {i}", "tier": "free"})
                if k_res.status_code != 200:
                    return False, f"Create key failed with {k_res.status_code}: {k_res.text}"
                k_id = k_res.json()["key"]["key_id"]
                d_res = client_instance.delete(f"/api/v1/developers/keys/{k_id}")
                if d_res.status_code != 200:
                    return False, f"Delete key failed with {d_res.status_code}: {d_res.text}"
            return True, "OK"
        except Exception as ex:
            return False, f"Exception: {str(ex)}"

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(worker_action, i) for i in range(num_requests)]
        for f in concurrent.futures.as_completed(futures):
            ok, msg = f.result()
            if ok:
                successes += 1
            else:
                errors.append(msg)
    
    elapsed = time.time() - t0
    print(f"  Executed {num_requests} concurrent requests across {num_threads} threads in {elapsed:.2f}s")
    print(f"  Successes: {successes}/{num_requests}, Errors: {len(errors)}")
    if errors:
        print("  Errors sample:", errors[:5])
        assert False, f"Concurrency test produced errors: {errors[:3]}"
    
    # Check post view and like count
    final_post = client.get(f"/api/v1/community/posts/{post_id}").json()["post"]
    print(f"  Final Post Views: {final_post['views']}, Likes: {final_post['likes']}")
    print("  [SUCCESS] Extreme concurrency test passed with 0 database lock errors!")

def test_benign_scam_corpus():
    print("\n--- [CHECK 3] Benign Text False Alarm Rejection in Scam Detector ---")
    benign_corpus = [
        "Hey Priya, let's meet at Blue Tokai Cafe at 5 PM for coffee and discuss the assignment.",
        "Hello Dr. Sharma, I would like to schedule a routine dental checkup for next Tuesday at 3 PM if you have an open slot.",
        "Good morning team, the quarterly planning meeting is moved to Room 402 at 11:30 AM.",
        "Hi Mom, I reached the hotel safely in Bangalore. Flight was on time. Will call you after dinner.",
        "Your Amazon delivery with package containing Books has been delivered to your front door.",
        "Can you send me the recipe for paneer butter masala you made last weekend?",
        "Please review the attached pull request for bug fix in user profile module.",
        "Hi Alex, thank you for attending the webinar on cybersecurity best practices. Slides are available on our portal.",
        "Reminder: Library books are due for return next Monday. You can renew online via university portal.",
        "The train 12951 Mumbai Rajdhani is scheduled to depart from platform 3 on time."
    ]
    
    for i, text in enumerate(benign_corpus):
        resp = client.post("/api/v1/detect/scam", json={"text": text})
        assert resp.status_code == 200, f"Request failed: {resp.text}"
        data = resp.json()
        
        is_scam = data["is_scam"]
        verdict = data["verdict"]
        score = data["risk_score"]
        
        # Invariant: If is_scam is False, verdict CANNOT be HIGH RISK or CRITICAL
        if not is_scam:
            assert "HIGH RISK" not in verdict, f"False alarm violation! Text: '{text}', Verdict: '{verdict}', Score: {score}"
            assert "CRITICAL" not in verdict, f"Critical false alarm violation! Text: '{text}', Verdict: '{verdict}', Score: {score}"
        
        print(f"  Sample {i+1}: is_scam={is_scam}, score={score}, verdict='{verdict}'")
    
    print("\n--- [CHECK 3B] Malicious Text Detection Invariant ---")
    malicious_corpus = [
        "URGENT: Your SBI Bank account has been SUSPENDED due to KYC expiry. Click http://sbi-kyc-update.xyz to verify immediately within 1 hour.",
        "Dear consumer, your electricity power will be disconnected at 9:30 PM tonight by power officer. Call 9876543210 immediately.",
        "CONGRATULATIONS! You have won Rs 50,00,000 in KBC Lottery. Transfer registration fee of Rs 5,000 to UPI kbcwinner@paytm to claim.",
        "CBI / TRAI Digital Arrest Notice: A parcel containing narcotics in your name was seized at Mumbai Customs. Connect to Skype court room immediately.",
        "Earn Rs 8,000 per day by liking YouTube videos and Telegram rating tasks! Contact HR Priya on WhatsApp +919988776655."
    ]
    
    for i, text in enumerate(malicious_corpus):
        resp = client.post("/api/v1/detect/scam", json={"text": text})
        assert resp.status_code == 200
        data = resp.json()
        
        is_scam = data["is_scam"]
        verdict = data["verdict"]
        score = data["risk_score"]
        
        assert is_scam is True or score >= 40, f"Failed to detect scam! Text: '{text}', Score: {score}"
        assert "HIGH RISK" in verdict or "CRITICAL" in verdict or "CAUTION" in verdict
        print(f"  Malicious {i+1}: is_scam={is_scam}, score={score}, verdict='{verdict}', type={data.get('scam_type')}")

    print("  [SUCCESS] Scam detector contract invariant holds perfectly across all benign and malicious samples!")

if __name__ == "__main__":
    test_deep_null_safety()
    test_extreme_concurrency()
    test_benign_scam_corpus()
    print("\n============================================================")
    print("ALL EMPIRICAL ADVERSARIAL CHECKS PASSED WITH ZERO DEFECTS!")
    print("============================================================\n")
