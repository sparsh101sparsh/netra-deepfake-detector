"""
NETRA Database Engine (SQLite with Thread-Safe Connection Pool)
Handles Threat Catalog, API Keys, Geolocation Telemetry, and FIR Case Records.
"""

import sqlite3
import os
import json
import hashlib
import time
from typing import Dict, List, Optional, Any

DB_PATH = os.getenv("NETRA_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "netra.db"))

def get_db():
    db_path = os.getenv("NETRA_DB_PATH", DB_PATH)
    conn = sqlite3.connect(db_path, timeout=30.0, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=30000;")
    return conn

def init_db():
    db_path = os.getenv("NETRA_DB_PATH", DB_PATH)
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    cursor = conn.cursor()
    
    # 1. API Keys Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS api_keys (
        key_id TEXT PRIMARY KEY,
        api_key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        name TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'free',
        monthly_quota INTEGER NOT NULL DEFAULT 100,
        used_requests INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        last_used_at TEXT
    );
    """)
    
    # 2. Threat Catalog & Geolocation Telemetry Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS threat_catalog (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL, -- video_deepfake, image_deepfake, scam_text, audio_clone
        threat_category TEXT NOT NULL, -- DIGITAL_ARREST, ELECTRICITY_KYC, STOCK_FRAUD, JOB_SCAM, VOICE_CLONE, IMPERSONATION
        source_platform TEXT NOT NULL, -- WhatsApp, Telegram, SMS, Instagram, YouTube, Web
        fake_probability REAL NOT NULL,
        verdict TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        thumbnail_url TEXT,
        media_url TEXT,
        lat REAL,
        lng REAL,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'India',
        location_source TEXT, -- EXACT_GPS, ESTIMATED_TELECOM, USER_REPORTED
        device_model TEXT,
        software_used TEXT,
        extracted_iocs TEXT, -- JSON string of {phones: [], upis: [], urls: [], apks: []}
        fir_dossier TEXT, -- JSON string of legal sections, narrative, victim advice
        upvotes_count INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    );
    """)
    
    # 3. Community Posts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image TEXT,
        embed_url TEXT,
        author_id TEXT,
        author_name TEXT NOT NULL,
        author_email TEXT,
        author_avatar TEXT,
        author_avatar_index INTEGER DEFAULT 0,
        author_role TEXT,
        created_at TEXT NOT NULL,
        read_time TEXT NOT NULL,
        likes INTEGER NOT NULL DEFAULT 1,
        views INTEGER NOT NULL DEFAULT 1,
        tags TEXT
    );
    """)

    # Create Indexes for fast lookup
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_category ON threat_catalog(threat_category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_type ON threat_catalog(type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_created ON threat_catalog(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_city ON threat_catalog(city);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_community_category ON community_posts(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_community_created ON community_posts(created_at);")
    
    # Purge legacy mock seed records so catalog and community only show real user submissions
    cursor.execute("DELETE FROM threat_catalog WHERE id LIKE 'NETRA-SCAM-%' OR id LIKE 'THREAT-ADV-%' OR id LIKE 'THREAT-CONCUR-%' OR id LIKE 'TEST-%' OR id LIKE 'E2E-%' OR title LIKE '%Test%';")
    cursor.execute("DELETE FROM community_posts WHERE id LIKE 'post-%';")

    # Cloud Rehydration: If local SQLite is fresh/empty, restore records from AWS DynamoDB
    try:
        count = cursor.execute("SELECT count(*) FROM threat_catalog").fetchone()[0]
        if count == 0:
            import boto3
            table_name = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")
            region = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
            ak = os.getenv("AWS_ACCESS_KEY_ID")
            sk = os.getenv("AWS_SECRET_ACCESS_KEY")
            kwargs = {"region_name": region}
            if ak and sk:
                kwargs["aws_access_key_id"] = ak.strip()
                kwargs["aws_secret_access_key"] = sk.strip()
            dynamo = boto3.client("dynamodb", **kwargs)
            res = dynamo.scan(
                TableName=table_name,
                FilterExpression="begins_with(job_id, :prefix)",
                ExpressionAttributeValues={":prefix": {"S": "CATALOG#"}},
                Limit=50
            )
            for item in res.get("Items", []):
                payload_str = item.get("payload", {}).get("S")
                if payload_str:
                    p = json.loads(payload_str)
                    cursor.execute("""
                    INSERT OR IGNORE INTO threat_catalog (
                        id, title, type, threat_category, source_platform, fake_probability, verdict,
                        risk_level, thumbnail_url, media_url, lat, lng, city, state, country,
                        location_source, device_model, software_used, extracted_iocs, fir_dossier,
                        upvotes_count, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        p.get("id"), p.get("title"), p.get("type", "video_deepfake"),
                        p.get("threat_category", "IMPERSONATION"), p.get("source_platform", "Web"),
                        p.get("fake_probability", 0.8), p.get("verdict", "SUSPICIOUS"),
                        p.get("risk_level", "HIGH"), p.get("thumbnail_url"), p.get("media_url"),
                        p.get("lat"), p.get("lng"), p.get("city"), p.get("state"), p.get("country", "India"),
                        p.get("location_source"), p.get("device_model"), p.get("software_used"),
                        json.dumps(p.get("extracted_iocs", {})), json.dumps(p.get("fir_dossier", {})),
                        p.get("upvotes_count", 1), p.get("created_at")
                    ))
    except Exception:
        pass

    conn.commit()
    conn.close()

# API Key Management Functions
def create_api_key(name: str, tier: str = "developer", monthly_quota: int = -1) -> Dict[str, str]:
    import secrets
    import binascii

    entropy = secrets.token_hex(16)
    crc = binascii.crc32(entropy.encode("utf-8"))
    checksum = f"{crc:08x}"[:4]
    raw_token = f"netra_live_{entropy}_{checksum}"
    key_id = f"key_{secrets.token_hex(6)}"
    key_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    key_prefix = raw_token[:15] + "••••"
    created_at = time.strftime("%Y-%m-%d %H:%M:%S")
    
    conn = get_db()
    conn.execute(
        "INSERT INTO api_keys (key_id, api_key_hash, key_prefix, name, tier, monthly_quota, used_requests, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        (key_id, key_hash, key_prefix, name, tier, monthly_quota, created_at)
    )
    conn.commit()
    conn.close()
    
    return {
        "key_id": key_id,
        "raw_key": raw_token,
        "key_prefix": key_prefix,
        "name": name,
        "tier": tier,
        "monthly_quota": monthly_quota,
        "created_at": created_at
    }

def verify_and_consume_key(raw_token: str) -> Optional[Dict]:
    if not raw_token or not raw_token.strip():
        return None
    key_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    conn = get_db()
    row = conn.execute("SELECT * FROM api_keys WHERE api_key_hash = ?", (key_hash,)).fetchone()
    
    if not row:
        conn.close()
        return None
        
    key_data = dict(row)

    # If monthly_quota > 0, enforce quota limits; if <= 0 (e.g. -1), key is unlimited
    quota = key_data.get("monthly_quota", -1)
    if quota is not None and quota > 0 and key_data.get("used_requests", 0) >= quota:
        conn.close()
        return {"error": "QUOTA_EXCEEDED", "used": key_data["used_requests"], "quota": quota}

    # Increment usage counter
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "UPDATE api_keys SET used_requests = used_requests + 1, last_used_at = ? WHERE key_id = ?",
        (now, key_data["key_id"])
    )
    conn.commit()
    conn.close()
    return key_data

def list_api_keys() -> List[Dict]:
    conn = get_db()
    rows = conn.execute("SELECT key_id, key_prefix, name, tier, monthly_quota, used_requests, created_at, last_used_at FROM api_keys ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_api_key(key_id: str) -> bool:
    conn = get_db()
    cursor = conn.execute("DELETE FROM api_keys WHERE key_id = ?", (key_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

# Threat Catalog Functions
def insert_threat_item(item: Dict[str, Any]) -> str:
    title = item.get("title") or "Untitled Incident"
    media_type = item.get("type") or "scam_text"
    threat_category = item.get("threat_category") or "IMPERSONATION"
    source_platform = item.get("source_platform") or "Web"
    
    iocs_json = json.dumps(item.get("extracted_iocs", {})) if isinstance(item.get("extracted_iocs"), dict) else (item.get("extracted_iocs") or "{}")
    fir_json = json.dumps(item.get("fir_dossier", {})) if isinstance(item.get("fir_dossier"), dict) else (item.get("fir_dossier") or "{}")

    # Content-Hash Deduplication
    content_seed = f"{title}_{threat_category}_{media_type}_{iocs_json}"
    content_hash = hashlib.sha256(content_seed.encode("utf-8")).hexdigest()[:12].upper()
    item_id = item.get("id") or f"THREAT-{content_hash}"
    created_at = item.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    existing = conn.execute("SELECT id FROM threat_catalog WHERE id = ?", (item_id,)).fetchone()
    if existing:
        # Increment upvotes on repeat detections rather than creating duplicate spam
        conn.execute("UPDATE threat_catalog SET upvotes_count = upvotes_count + 1 WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return item_id

    # Strictly honest coordinates: None if missing, never fabricate New Delhi
    lat = item.get("lat")
    lng = item.get("lng")
    city = item.get("city")
    state = item.get("state")
    country = item.get("country") if item.get("country") is not None else ("India" if city else None)
    location_source = item.get("location_source") if (lat is not None and lng is not None) else None

    fake_probability = item.get("fake_probability") if item.get("fake_probability") is not None else 0.85
    verdict = item.get("verdict") if item.get("verdict") is not None else "SCAM"
    risk_level = item.get("risk_level") if item.get("risk_level") is not None else "HIGH"
    device_model = item.get("device_model")
    software_used = item.get("software_used")
    upvotes_count = item.get("upvotes_count") if item.get("upvotes_count") is not None else 1

    conn.execute("""
    INSERT OR REPLACE INTO threat_catalog (
        id, title, type, threat_category, source_platform, fake_probability, verdict,
        risk_level, thumbnail_url, media_url, lat, lng, city, state, country,
        location_source, device_model, software_used, extracted_iocs, fir_dossier,
        upvotes_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id, title, media_type,
        threat_category, source_platform,
        fake_probability, verdict,
        risk_level, item.get("thumbnail_url"), item.get("media_url"),
        lat, lng, city,
        state, country,
        location_source, device_model,
        software_used, iocs_json, fir_json,
        upvotes_count, created_at
    ))
    conn.commit()
    conn.close()

    # Cloud Persistence: Mirror to AWS DynamoDB so Render restarts never lose records
    try:
        table_name = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")
        region = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
        ak = os.getenv("AWS_ACCESS_KEY_ID")
        sk = os.getenv("AWS_SECRET_ACCESS_KEY")
        kwargs = {"region_name": region}
        if ak and sk:
            kwargs["aws_access_key_id"] = ak.strip()
            kwargs["aws_secret_access_key"] = sk.strip()
        import boto3
        dynamo = boto3.client("dynamodb", **kwargs)
        payload_data = dict(item)
        payload_data["id"] = item_id
        payload_data["created_at"] = created_at
        dynamo.put_item(
            TableName=table_name,
            Item={
                "job_id": {"S": f"CATALOG#{item_id}"},
                "status": {"S": "catalog_archived"},
                "payload": {"S": json.dumps(payload_data)},
                "created_at": {"S": created_at},
                "type": {"S": str(media_type)},
                "verdict": {"S": str(verdict)}
            }
        )
    except Exception:
        pass

    return item_id

def get_threat_catalog(
    search: Optional[str] = None,
    category: Optional[str] = None,
    media_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict]:
    conn = get_db()
    query = "SELECT * FROM threat_catalog WHERE 1=1"
    params = []
    
    if category and category.lower() != "all":
        query += " AND threat_category = ?"
        params.append(category)
        
    if media_type and media_type.lower() != "all":
        mt = media_type.strip().lower()
        if mt == "video":
            query += " AND type IN ('video', 'video_deepfake')"
        elif mt == "image":
            query += " AND type IN ('image', 'image_deepfake')"
        elif mt == "audio":
            query += " AND type IN ('audio', 'audio_clone')"
        elif mt == "text":
            query += " AND type IN ('text', 'scam_text')"
        else:
            query += " AND type = ?"
            params.append(media_type)
        
    if search:
        query += " AND (title LIKE ? OR city LIKE ? OR extracted_iocs LIKE ? OR software_used LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])
        
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    results = []
    for r in rows:
        d = dict(r)
        try: d["extracted_iocs"] = json.loads(d["extracted_iocs"])
        except: pass
        try: d["fir_dossier"] = json.loads(d["fir_dossier"])
        except: pass
        results.append(d)
        
    return results

def get_threat_by_id(threat_id: str) -> Optional[Dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM threat_catalog WHERE id = ?", (threat_id,)).fetchone()
    conn.close()
    if not row: return None
    d = dict(row)
    try: d["extracted_iocs"] = json.loads(d["extracted_iocs"])
    except: pass
    try: d["fir_dossier"] = json.loads(d["fir_dossier"])
    except: pass
    return d

def upvote_threat_item(threat_id: str) -> Optional[int]:
    conn = get_db()
    row = conn.execute("SELECT upvotes_count FROM threat_catalog WHERE id = ?", (threat_id,)).fetchone()
    if not row:
        conn.close()
        return None
    conn.execute("UPDATE threat_catalog SET upvotes_count = upvotes_count + 1 WHERE id = ?", (threat_id,))
    conn.commit()
    new_row = conn.execute("SELECT upvotes_count FROM threat_catalog WHERE id = ?", (threat_id,)).fetchone()
    conn.close()
    return new_row["upvotes_count"] if new_row else None

# Community Posts Functions
def _row_to_community_post(r: Dict[str, Any]) -> Dict[str, Any]:
    tags = []
    if r.get("tags"):
        try:
            tags = json.loads(r["tags"]) if isinstance(r["tags"], str) else r["tags"]
        except Exception:
            tags = [r["tags"]] if isinstance(r["tags"], str) else []
            
    return {
        "id": r["id"],
        "title": r["title"],
        "category": r["category"],
        "content": r["content"],
        "excerpt": r.get("excerpt") or "",
        "cover_image": r.get("cover_image"),
        "embed_url": r.get("embed_url"),
        "author": {
            "id": r.get("author_id"),
            "name": r.get("author_name") or "Anonymous Investigator",
            "email": r.get("author_email"),
            "avatar": r.get("author_avatar"),
            "avatar_index": r.get("author_avatar_index", 0),
            "role": r.get("author_role")
        },
        "created_at": r["created_at"],
        "read_time": r.get("read_time") or "3 min read",
        "likes": r.get("likes", 1),
        "views": r.get("views", 1),
        "tags": tags
    }

def insert_community_post(post: Dict[str, Any]) -> Dict[str, Any]:
    import uuid
    post_id = post.get("id") or f"post-{uuid.uuid4().hex[:8]}"
    created_at = post.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S")
    
    author = post.get("author", {})
    if not isinstance(author, dict):
        author = {}
        
    tags_json = json.dumps(post.get("tags", [])) if isinstance(post.get("tags"), list) else "[]"
    
    # Calculate read time if not provided
    read_time = post.get("read_time")
    if not read_time:
        words = len((post.get("content") or "").split())
        read_mins = max(1, round(words / 200))
        read_time = f"{read_mins} min read"
        
    excerpt = post.get("excerpt")
    if not excerpt and post.get("content"):
        plain = post["content"].replace("#", "").replace("*", "").replace(">", "").strip()
        excerpt = plain[:140] + ("..." if len(plain) > 140 else "")

    conn = get_db()
    conn.execute("""
    INSERT OR REPLACE INTO community_posts (
        id, title, category, content, excerpt, cover_image, embed_url,
        author_id, author_name, author_email, author_avatar, author_avatar_index, author_role,
        created_at, read_time, likes, views, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        post_id,
        post.get("title") or "Untitled Forensic Article",
        post.get("category") or "THREAT_INTEL",
        post.get("content") or "",
        excerpt,
        post.get("cover_image"),
        post.get("embed_url"),
        author.get("id"),
        author.get("name") or "Anonymous Investigator",
        author.get("email"),
        author.get("avatar"),
        author.get("avatar_index") if author.get("avatar_index") is not None else 0,
        author.get("role"),
        created_at,
        read_time,
        post.get("likes") if post.get("likes") is not None else 0,
        post.get("views") if post.get("views") is not None else 0,
        tags_json
    ))
    conn.commit()
    conn.close()
    
    return get_community_post_by_id(post_id) or {
        "id": post_id,
        "title": post.get("title"),
        "category": post.get("category"),
        "content": post.get("content"),
        "excerpt": excerpt,
        "cover_image": post.get("cover_image"),
        "embed_url": post.get("embed_url"),
        "author": author,
        "created_at": created_at,
        "read_time": read_time,
        "likes": post.get("likes") if post.get("likes") is not None else 0,
        "views": post.get("views") if post.get("views") is not None else 0,
        "tags": post.get("tags") or []
    }

def get_community_posts(
    category: Optional[str] = None,
    search: Optional[str] = None,
    author_id: Optional[str] = None,
    author_email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    conn = get_db()
    query = "SELECT * FROM community_posts WHERE 1=1"
    params = []
    
    if category and category.upper() != "ALL":
        query += " AND UPPER(category) = ?"
        params.append(category.upper())
        
    if author_id:
        query += " AND author_id = ?"
        params.append(author_id)
        
    if author_email:
        query += " AND LOWER(author_email) = ?"
        params.append(author_email.lower())
        
    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(content) LIKE ? OR LOWER(author_name) LIKE ?)"
        term = f"%{search.lower()}%"
        params.extend([term, term, term, term])
        
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    return [_row_to_community_post(dict(r)) for r in rows]

def get_community_post_by_id(post_id: str, increment_view: bool = False) -> Optional[Dict[str, Any]]:
    conn = get_db()
    row = conn.execute("SELECT * FROM community_posts WHERE id = ?", (post_id,)).fetchone()
    if not row:
        conn.close()
        return None
    if increment_view:
        conn.execute("UPDATE community_posts SET views = views + 1 WHERE id = ?", (post_id,))
        conn.commit()
        row = conn.execute("SELECT * FROM community_posts WHERE id = ?", (post_id,)).fetchone()
    conn.close()
    return _row_to_community_post(dict(row))

def like_community_post(post_id: str) -> Optional[int]:
    conn = get_db()
    row = conn.execute("SELECT likes FROM community_posts WHERE id = ?", (post_id,)).fetchone()
    if not row:
        conn.close()
        return None
    conn.execute("UPDATE community_posts SET likes = likes + 1 WHERE id = ?", (post_id,))
    conn.commit()
    new_row = conn.execute("SELECT likes FROM community_posts WHERE id = ?", (post_id,)).fetchone()
    conn.close()
    return new_row["likes"] if new_row else None

# Initialize on module load
init_db()
print("NETRA DB initialized successfully!")
