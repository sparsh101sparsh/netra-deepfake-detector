"""
Adversarial Verification & Evidence Gathering Script
Executes targeted tests for each endpoint and logs exact responses.
"""

import sys
import os
import json
import uuid

# Add paths
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("backend/netra"))

from fastapi.testclient import TestClient
from backend.api.server import app
from backend.api.db import init_db, get_db

client = TestClient(app)

def audit_threat_catalog():
    print("\n--- 1. Testing /api/v1/threat-intelligence/catalog ---")
    
    # 1.1 Standard catalog
    r = client.get("/api/v1/threat-intelligence/catalog?limit=3")
    print(f"Status: {r.status_code}, Returned items count: {len(r.json().get('results', []))}")
    assert r.status_code == 200
    
    # 1.2 Type filter
    r = client.get("/api/v1/threat-intelligence/catalog?type=video_deepfake")
    print(f"Filter type=video_deepfake status: {r.status_code}, count: {len(r.json().get('results', []))}")
    assert r.status_code == 200
    
    # 1.3 Search filter
    r = client.get("/api/v1/threat-intelligence/catalog?search=Delhi")
    print(f"Search 'Delhi' status: {r.status_code}, count: {len(r.json().get('results', []))}")
    assert r.status_code == 200
    
    # 1.4 Radar
    r = client.get("/api/v1/threat-intelligence/radar")
    print(f"Radar status: {r.status_code}, markers: {len(r.json().get('markers', []))}")
    assert r.status_code == 200
    
    # 1.5 404 on missing
    r = client.get("/api/v1/threat-intelligence/NON_EXISTENT_ID")
    print(f"404 check status: {r.status_code}, response: {r.json()}")
    assert r.status_code == 404

def audit_public_api_auth():
    print("\n--- 2. Testing /api/v1/public/detect/scam-text ---")
    
    # 2.1 No API Key
    r = client.post("/api/v1/public/detect/scam-text", json={"message": "test"})
    print(f"No API key status: {r.status_code}")
    assert r.status_code in (401, 403)
    
    # 2.2 Fake API Key
    r = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": "netra_live_fake_key_123"},
        json={"message": "test"}
    )
    print(f"Fake API key status: {r.status_code}, response: {r.json()}")
    assert r.status_code == 401

def audit_scam_detection():
    print("\n--- 3. Testing /api/v1/detect/scam ---")
    
    # 3.1 Benign
    r = client.post("/api/v1/detect/scam", json={"text": "Meeting at 5 PM for coffee"})
    print(f"Benign text status: {r.status_code}, response: {r.json()}")
    assert r.status_code == 200
    
    # 3.2 Malicious Electricity Scam
    r = client.post("/api/v1/detect/scam", json={
        "text": "Your electricity power bill is unpaid. Power disconnected tonight at 9:30 PM. Call 9876543210 immediately."
    })
    print(f"Electricity scam status: {r.status_code}, response: {r.json()}")
    assert r.status_code == 200
    
    # 3.3 Empty input
    r = client.post("/api/v1/detect/scam", json={"text": ""})
    print(f"Empty text status: {r.status_code}, response: {r.json()}")
    assert r.status_code == 400

def audit_news_feed():
    print("\n--- 4. Testing /api/v1/news/feed ---")
    r = client.get("/api/v1/news/feed?limit=5")
    print(f"News feed status: {r.status_code}, count: {r.json().get('count')}")
    assert r.status_code == 200
    assert "feed" in r.json()

if __name__ == "__main__":
    init_db()
    audit_threat_catalog()
    audit_public_api_auth()
    audit_scam_detection()
    audit_news_feed()
    print("\n=== ISOLATED AUDIT COMPLETED SUCCESSFULLY ===")
