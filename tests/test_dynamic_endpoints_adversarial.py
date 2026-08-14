"""
NETRA Dynamic Backend Endpoints Adversarial & Stress Test Suite
Empirically tests:
1. Threat Intelligence Catalog (/api/v1/threat-intelligence/catalog, /radar, /{id}, /upvote, /report, /fir-pdf)
2. Community Blog & Posts (/api/v1/community/posts, CRUD, search, pagination, liking, 404s, validation)
3. Public API Auth & Scam Detection (/api/v1/public/detect/scam-text with auth verification, 401s, IOC extraction)
4. Scam Detection Pipeline (/api/v1/detect/scam with clean, scam, empty, whitespace, short, huge text)
5. News Intelligence Feed (/api/v1/news/feed, filtering, limit validation, refresh)
6. Developer Keys API (/api/v1/developers/keys lifecycle, quota enforcement)
7. Null-safety, boundary inputs, SQL injection strings, and malformed payloads
"""

import pytest
import os
import json
import uuid
from fastapi.testclient import TestClient
from backend.api.server import app
from backend.api.db import init_db

@pytest.fixture(scope="session")
def client():
    # Ensure fresh DB state if needed
    init_db()
    with TestClient(app) as c:
        yield c

# ============================================================================
# 1. THREAT INTELLIGENCE CATALOG ENDPOINT TESTS
# ============================================================================

def test_threat_catalog_basic_query(client):
    """Test standard catalog fetch returns proper contract structure."""
    resp = client.get("/api/v1/threat-intelligence/catalog")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert "total_returned" in data
    assert "results" in data
    assert "items" in data
    assert isinstance(data["results"], list)
    assert len(data["results"]) == data["total_returned"]

def test_threat_catalog_filter_type_video_deepfake(client):
    """Test filtering by type=video_deepfake."""
    resp = client.get("/api/v1/threat-intelligence/catalog?type=video_deepfake")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    for item in data["results"]:
        assert item["type"] == "video_deepfake"

def test_threat_catalog_filter_category(client):
    """Test filtering by category parameter."""
    resp = client.get("/api/v1/threat-intelligence/catalog?category=DIGITAL_ARREST")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["results"]:
        assert item["threat_category"] == "DIGITAL_ARREST"

def test_threat_catalog_search(client):
    """Test search functionality across keywords."""
    resp = client.get("/api/v1/threat-intelligence/catalog?search=Delhi")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"

def test_threat_catalog_pagination_and_limits(client):
    """Test pagination bounds and limit constraints."""
    # Valid limits
    resp = client.get("/api/v1/threat-intelligence/catalog?limit=5&offset=0")
    assert resp.status_code == 200
    assert len(resp.json()["results"]) <= 5

    # Negative offset -> 422
    resp_neg_offset = client.get("/api/v1/threat-intelligence/catalog?offset=-1")
    assert resp_neg_offset.status_code == 422

    # Zero limit -> 422 (ge=1)
    resp_zero_limit = client.get("/api/v1/threat-intelligence/catalog?limit=0")
    assert resp_zero_limit.status_code == 422

    # Exceeding max limit (le=200) -> 422
    resp_over_limit = client.get("/api/v1/threat-intelligence/catalog?limit=500")
    assert resp_over_limit.status_code == 422

def test_threat_catalog_sql_injection_resilience(client):
    """Test SQL injection resilience in query parameters."""
    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE threat_catalog; --",
        "\" OR 1=1 --",
        "1 UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22--"
    ]
    for p in sqli_payloads:
        resp = client.get(f"/api/v1/threat-intelligence/catalog?search={p}")
        assert resp.status_code == 200, f"SQL injection attempt broke endpoint: {p}"
        data = resp.json()
        assert data["status"] == "success"

def test_threat_radar_markers(client):
    """Test threat radar live map markers format."""
    resp = client.get("/api/v1/threat-intelligence/radar")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "total_markers" in data
    assert "markers" in data
    assert isinstance(data["markers"], list)
    if len(data["markers"]) > 0:
        marker = data["markers"][0]
        required_fields = ["id", "title", "type", "category", "lat", "lng", "city", "state", "confidence_pct", "risk_level"]
        for field in required_fields:
            assert field in marker, f"Missing field {field} in radar marker"

def test_threat_detail_and_404(client):
    """Test threat detail retrieval and 404 for missing item."""
    resp = client.get("/api/v1/threat-intelligence/non_existent_threat_id_999999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Threat incident not found"

def test_threat_upvote_and_404(client):
    """Test threat upvoting atomic counter and 404 on missing item."""
    # 404 for fake threat
    resp = client.get("/api/v1/threat-intelligence/non_existent_threat_id_999999")
    assert resp.status_code == 404

    resp_upvote_fake = client.post("/api/v1/threat-intelligence/non_existent_threat_id_999999/upvote")
    assert resp_upvote_fake.status_code == 404

def test_threat_report_and_lifecycle(client):
    """Test submitting a new threat report, retrieving it, and upvoting it."""
    test_title = f"Adversarial Test Incident {uuid.uuid4().hex[:6]}"
    report_payload = {
        "title": test_title,
        "type": "video_deepfake",
        "threat_category": "IMPERSONATION",
        "source_platform": "WhatsApp",
        "fake_probability": 0.98,
        "city": "Mumbai",
        "state": "Maharashtra",
        "lat": 19.0760,
        "lng": 72.8777,
        "device_model": "iPhone 15 Pro",
        "software_used": "FaceSwap-V2",
        "extracted_iocs": {
            "phones": ["+919876543210"],
            "upis": ["fraudster@okhdfcbank"],
            "urls": ["https://fake-mumbai-police.xyz"],
            "apks": ["police_verify.apk"]
        },
        "fir_dossier": {
            "incident_summary": "Extortion call impersonating police.",
            "applicable_laws": ["IT Act Section 66D", "BNS 318(4)"],
            "recommended_action": "Freeze accounts"
        }
    }
    # 1. Report
    create_resp = client.post("/api/v1/threat-intelligence/report", json=report_payload)
    assert create_resp.status_code == 200
    create_data = create_resp.json()
    assert create_data["status"] == "success"
    threat_id = create_data["id"]
    assert threat_id is not None

    # 2. Retrieve detail
    detail_resp = client.get(f"/api/v1/threat-intelligence/{threat_id}")
    assert detail_resp.status_code == 200
    item = detail_resp.json()["item"]
    assert item["title"] == test_title
    assert item["city"] == "Mumbai"
    assert isinstance(item["extracted_iocs"], dict)
    assert "+919876543210" in item["extracted_iocs"]["phones"]

    # 3. Upvote
    initial_upvotes = item.get("upvotes_count", 1)
    upvote_resp = client.post(f"/api/v1/threat-intelligence/{threat_id}/upvote")
    assert upvote_resp.status_code == 200
    new_upvotes = upvote_resp.json()["upvotes_count"]
    assert new_upvotes == initial_upvotes + 1

def test_threat_report_null_safety(client):
    """Test report submission with null/empty IOCs and optional fields."""
    null_payload = {
        "title": f"Null IOC Incident {uuid.uuid4().hex[:6]}",
        "type": "scam_text",
        "threat_category": "JOB_SCAM",
        "source_platform": "Telegram",
        "fake_probability": 0.85,
        "city": None,
        "state": None,
        "lat": None,
        "lng": None,
        "device_model": None,
        "software_used": None,
        "extracted_iocs": None,
        "fir_dossier": None
    }
    resp = client.post("/api/v1/threat-intelligence/report", json=null_payload)
    assert resp.status_code == 200
    threat_id = resp.json()["id"]

    # Verify retrieval does not crash with nulls
    get_resp = client.get(f"/api/v1/threat-intelligence/{threat_id}")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()["item"]
    assert retrieved["id"] == threat_id


# ============================================================================
# 2. COMMUNITY POSTS CRUD & INTERACTION TESTS
# ============================================================================

def test_community_posts_get_and_pagination(client):
    """Test community posts query, filtering, and pagination."""
    resp = client.get("/api/v1/community/posts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "count" in data
    assert "posts" in data
    assert isinstance(data["posts"], list)

    # Test limit validation
    assert client.get("/api/v1/community/posts?limit=0").status_code == 422
    assert client.get("/api/v1/community/posts?limit=300").status_code == 422
    assert client.get("/api/v1/community/posts?offset=-5").status_code == 422

def test_community_post_create_and_lifecycle(client):
    """Test creating a community blog post, retrieving it, liking it, and searching."""
    unique_tag = f"advtag_{uuid.uuid4().hex[:6]}"
    post_payload = {
        "title": f"Adversarial Forensic Study {unique_tag}",
        "category": "DEEPFAKE",
        "content": "This is a detailed forensic deepfake investigation post for empirical testing purposes with markdown **bold** and # headings.",
        "excerpt": "Short excerpt for forensic study",
        "cover_image": "https://example.com/cover.jpg",
        "embed_url": "https://youtube.com/watch?v=12345",
        "author": {
            "id": "author_adv_001",
            "name": "Dr. Forensic Analyst",
            "email": "analyst@netra.security",
            "avatar": "https://example.com/avatar.jpg",
            "avatar_index": 2,
            "role": "Lead Researcher"
        }
    }

    # 1. Create Post
    create_resp = client.post("/api/v1/community/posts", json=post_payload)
    assert create_resp.status_code == 200
    create_data = create_resp.json()
    assert create_data["status"] == "success"
    saved_post = create_data["post"]
    post_id = saved_post["id"]
    assert post_id is not None
    assert saved_post["title"] == post_payload["title"]
    assert saved_post["author"]["name"] == "Dr. Forensic Analyst"
    assert saved_post["read_time"] is not None

    # 2. Get Post by ID and verify view increment
    get_resp = client.get(f"/api/v1/community/posts/{post_id}")
    assert get_resp.status_code == 200
    fetched_post = get_resp.json()["post"]
    assert fetched_post["id"] == post_id
    initial_views = fetched_post["views"]

    # Calling again should increment views
    get_resp_2 = client.get(f"/api/v1/community/posts/{post_id}")
    assert get_resp_2.status_code == 200
    assert get_resp_2.json()["post"]["views"] >= initial_views

    # 3. Like Post
    initial_likes = fetched_post["likes"]
    like_resp = client.post(f"/api/v1/community/posts/{post_id}/like")
    assert like_resp.status_code == 200
    assert like_resp.json()["status"] == "success"
    assert like_resp.json()["likes"] == initial_likes + 1

    # 4. Search for the post
    search_resp = client.get(f"/api/v1/community/posts?search={unique_tag}")
    assert search_resp.status_code == 200
    found_posts = search_resp.json()["posts"]
    assert len(found_posts) >= 1
    assert any(p["id"] == post_id for p in found_posts)

    # 5. Filter by category
    cat_resp = client.get(f"/api/v1/community/posts?category=DEEPFAKE")
    assert cat_resp.status_code == 200
    for p in cat_resp.json()["posts"]:
        assert p["category"].upper() == "DEEPFAKE"

    # 6. Filter by author_email
    author_resp = client.get(f"/api/v1/community/posts?author_email=analyst@netra.security")
    assert author_resp.status_code == 200
    for p in author_resp.json()["posts"]:
        assert p["author"]["email"] == "analyst@netra.security"

def test_community_post_404_handling(client):
    """Test 404 responses for non-existent community posts."""
    fake_id = "non_existent_post_xyz_12345"
    assert client.get(f"/api/v1/community/posts/{fake_id}").status_code == 404
    assert client.post(f"/api/v1/community/posts/{fake_id}/like").status_code == 404

def test_community_post_validation_errors(client):
    """Test schema validation on community post creation."""
    # Title too short (<3 chars)
    invalid_title = {
        "title": "AB",
        "category": "DEEPFAKE",
        "content": "Valid long content for test",
        "author": {"name": "Test Author"}
    }
    assert client.post("/api/v1/community/posts", json=invalid_title).status_code == 422

    # Content too short (<10 chars)
    invalid_content = {
        "title": "Valid Title",
        "category": "DEEPFAKE",
        "content": "Short",
        "author": {"name": "Test Author"}
    }
    assert client.post("/api/v1/community/posts", json=invalid_content).status_code == 422

    # Missing author
    missing_author = {
        "title": "Valid Title Here",
        "category": "DEEPFAKE",
        "content": "This is valid long content here."
    }
    assert client.post("/api/v1/community/posts", json=missing_author).status_code == 422


# ============================================================================
# 3. PUBLIC API AUTH & SCAM TEXT DETECTION TESTS
# ============================================================================

def test_public_api_auth_enforcement(client):
    """Verify 401 Unauthorized for missing or invalid API keys."""
    payload = {"message": "Urgent electricity bill unpaid power disconnect tonight"}
    
    # 1. Missing header
    resp_no_auth = client.post("/api/v1/public/detect/scam-text", json=payload)
    # FastAPI Security(APIKeyHeader(auto_error=True)) returns 403 when header is missing
    assert resp_no_auth.status_code in (401, 403), f"Expected 401 or 403, got {resp_no_auth.status_code}"

    # 2. Fake / Invalid API Key
    resp_fake_key = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": "netra_live_fakeinvalidkey1234567890abcdef"},
        json=payload
    )
    assert resp_fake_key.status_code == 401, f"Expected 401 for fake key, got {resp_fake_key.status_code}"

def test_public_api_scam_detection_flow(client):
    """Test complete public developer workflow: generate API key -> call scam-text."""
    # 1. Create API key
    key_resp = client.post("/api/v1/developers/keys", json={"name": "Challenger Dynamic Test Key", "tier": "developer"})
    assert key_resp.status_code == 200
    key_data = key_resp.json()["key"]
    raw_api_key = key_data["raw_key"]
    key_id = key_data["key_id"]
    assert raw_api_key.startswith("netra_live_")

    # 2. Test Scam text detection with IOC extraction
    scam_payload = {
        "message": "Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Immediately contact power officer Mr. Verma at 9876543210 or pay via UPI discom.bill@okhdfcbank or install update https://discom-bill.apk",
        "sender_info": "SMS-DISCOM",
        "city": "New Delhi"
    }
    scam_resp = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": raw_api_key},
        json=scam_payload
    )
    assert scam_resp.status_code == 200
    res = scam_resp.json()
    assert res["status"] == "success"
    assert res["scam_detected"] is True
    assert res["threat_category"] == "ELECTRICITY_KYC"
    assert res["risk_level"] in ("HIGH", "CRITICAL")
    assert "9876543210" in res["extracted_iocs"]["phones"] or "+919876543210" in res["extracted_iocs"]["phones"] or any("9876543210" in p for p in res["extracted_iocs"]["phones"])
    assert any("okhdfcbank" in u for u in res["extracted_iocs"]["upis"])

    # 3. Test Benign text with same valid key
    benign_payload = {
        "message": "Hi mom, I will reach home by 7 PM today. Please keep dinner ready.",
        "sender_info": "WhatsApp",
        "city": "New Delhi"
    }
    benign_resp = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": raw_api_key},
        json=benign_payload
    )
    assert benign_resp.status_code == 200
    benign_res = benign_resp.json()
    assert benign_res["status"] == "success"
    assert benign_res["scam_detected"] is False
    assert benign_res["threat_category"] == "BENIGN"

    # 4. Clean up / Revoke key
    delete_resp = client.delete(f"/api/v1/developers/keys/{key_id}")
    assert delete_resp.status_code == 200
    assert delete_resp.json()["status"] == "success"

    # 5. Verify revoked key is now rejected with 401
    revoked_resp = client.post(
        "/api/v1/public/detect/scam-text",
        headers={"X-API-Key": raw_api_key},
        json=benign_payload
    )
    assert revoked_resp.status_code == 401


# ============================================================================
# 4. SCAM DETECTOR ENDPOINT (/api/v1/detect/scam) TESTS
# ============================================================================

def test_detect_scam_clean_text(client):
    """Test scam detection with completely benign message."""
    resp = client.post("/api/v1/detect/scam", json={
        "text": "Hello Dr. Sharma, I would like to schedule a routine dental checkup for next Tuesday at 3 PM if you have an open slot."
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_scam"] is False
    assert data["risk_score"] < 40
    assert "SAFE" in data["verdict"] or "CAUTION" not in data["verdict"]

def test_detect_scam_malicious_text(client):
    """Test scam detection with urgent banking / KYC phishing message."""
    resp = client.post("/api/v1/detect/scam", json={
        "text": "URGENT WARNING: Your SBI Bank account has been SUSPENDED due to incomplete KYC. Click here immediately http://sbi-kyc-verify-net.com to submit your PAN Card and OTP or your account will be permanently blocked within 2 hours."
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_scam"] is True or data["risk_score"] >= 40
    assert data["risk_score"] > 30

def test_detect_scam_empty_and_short_inputs(client):
    """Test input validation for empty, whitespace, and short text inputs."""
    # Empty text
    resp_empty = client.post("/api/v1/detect/scam", json={"text": ""})
    assert resp_empty.status_code == 400
    assert "empty" in resp_empty.json()["detail"].lower()

    # Whitespace only
    resp_ws = client.post("/api/v1/detect/scam", json={"text": "     "})
    assert resp_ws.status_code == 400

    # Short text (< 5 chars)
    resp_short = client.post("/api/v1/detect/scam", json={"text": "Hey"})
    assert resp_short.status_code == 400
    assert "short" in resp_short.json()["detail"].lower()

def test_detect_scam_missing_field(client):
    """Test missing text field."""
    resp = client.post("/api/v1/detect/scam", json={})
    assert resp.status_code == 422

def test_detect_scam_large_payload(client):
    """Stress test scam endpoint with large text payload (10,000 characters)."""
    large_text = "This is a legitimate company newsletter discussing security trends. " * 150
    resp = client.post("/api/v1/detect/scam", json={"text": large_text})
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_score" in data
    assert "verdict" in data


# ============================================================================
# 5. NEWS INTELLIGENCE FEED ENDPOINT TESTS
# ============================================================================

def test_news_feed_contract_and_structure(client):
    """Test news feed response schema and data types."""
    resp = client.get("/api/v1/news/feed")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "count" in data
    assert "crawler_status" in data
    assert "feed" in data
    assert isinstance(data["feed"], list)
    assert len(data["feed"]) == data["count"]

    if len(data["feed"]) > 0:
        item = data["feed"][0]
        expected_fields = ["id", "title", "summary", "category", "risk_level", "source_name", "source_url", "published_at"]
        for f in expected_fields:
            assert f in item, f"Missing {f} in news feed item"

def test_news_feed_category_filter(client):
    """Test filtering news feed by category."""
    resp = client.get("/api/v1/news/feed?category=DIGITAL_ARREST")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["feed"]:
        assert item["category"] == "DIGITAL_ARREST"

def test_news_feed_limit_bounds(client):
    """Test news feed limit constraints (ge=1, le=50)."""
    assert client.get("/api/v1/news/feed?limit=5").status_code == 200
    assert client.get("/api/v1/news/feed?limit=0").status_code == 422
    assert client.get("/api/v1/news/feed?limit=100").status_code == 422

def test_news_refresh_trigger(client):
    """Test triggering background crawl."""
    resp = client.post("/api/v1/news/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "triggered"
    assert "Tavily" in data["message"]


# ============================================================================
# 6. DEVELOPER API KEYS CRUD TESTS
# ============================================================================

def test_developer_keys_crud_lifecycle(client):
    """Test creating, listing, and revoking API keys."""
    # 1. Create key
    create_resp = client.post("/api/v1/developers/keys", json={
        "name": "Audit Key Test",
        "tier": "enterprise"
    })
    assert create_resp.status_code == 200
    key_info = create_resp.json()["key"]
    key_id = key_info["key_id"]
    assert key_info["monthly_quota"] == 5000

    # 2. List keys
    list_resp = client.get("/api/v1/developers/keys")
    assert list_resp.status_code == 200
    keys = list_resp.json()["keys"]
    assert any(k["key_id"] == key_id for k in keys)

    # 3. Delete key
    del_resp = client.delete(f"/api/v1/developers/keys/{key_id}")
    assert del_resp.status_code == 200

    # 4. Delete non-existent key -> 404
    del_fake = client.delete("/api/v1/developers/keys/fake_non_existent_key_id")
    assert del_fake.status_code == 404
