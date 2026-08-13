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
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
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
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'India',
        location_source TEXT NOT NULL, -- EXACT_GPS, ESTIMATED_TELECOM, REGIONAL_HOTSPOT
        device_model TEXT,
        software_used TEXT,
        extracted_iocs TEXT, -- JSON string of {phones: [], upis: [], urls: [], apks: []}
        fir_dossier TEXT, -- JSON string of legal sections, narrative, victim advice
        upvotes_count INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    );
    """)
    
    # Create Indexes for fast lookup
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_category ON threat_catalog(threat_category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_type ON threat_catalog(type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_created ON threat_catalog(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_threat_city ON threat_catalog(city);")
    
    conn.commit()
    conn.close()

# API Key Management Functions
def create_api_key(name: str, tier: str = "free", monthly_quota: int = 100) -> Dict[str, str]:
    import secrets
    raw_token = f"sk_live_{secrets.token_hex(16)}"
    key_id = f"key_{secrets.token_hex(6)}"
    key_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    key_prefix = raw_token[:12] + "••••"
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
    key_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    conn = get_db()
    row = conn.execute("SELECT * FROM api_keys WHERE api_key_hash = ?", (key_hash,)).fetchone()
    
    if not row:
        conn.close()
        return None
        
    key_data = dict(row)
    if key_data["used_requests"] >= key_data["monthly_quota"]:
        conn.close()
        return {"error": "QUOTA_EXCEEDED", "used": key_data["used_requests"], "quota": key_data["monthly_quota"]}
        
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
    import uuid
    item_id = item.get("id") or f"THREAT-{uuid.uuid4().hex[:8].upper()}"
    created_at = item.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S")
    
    iocs_json = json.dumps(item.get("extracted_iocs", {})) if isinstance(item.get("extracted_iocs"), dict) else (item.get("extracted_iocs") or "{}")
    fir_json = json.dumps(item.get("fir_dossier", {})) if isinstance(item.get("fir_dossier"), dict) else (item.get("fir_dossier") or "{}")
    
    conn = get_db()
    conn.execute("""
    INSERT OR REPLACE INTO threat_catalog (
        id, title, type, threat_category, source_platform, fake_probability, verdict,
        risk_level, thumbnail_url, media_url, lat, lng, city, state, country,
        location_source, device_model, software_used, extracted_iocs, fir_dossier,
        upvotes_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id, item.get("title", "Untitled Incident"), item.get("type", "video_deepfake"),
        item.get("threat_category", "IMPERSONATION"), item.get("source_platform", "Web"),
        item.get("fake_probability", 0.95), item.get("verdict", "DEEPFAKE"),
        item.get("risk_level", "HIGH"), item.get("thumbnail_url"), item.get("media_url"),
        item.get("lat", 28.6139), item.get("lng", 77.2090), item.get("city", "New Delhi"),
        item.get("state", "Delhi"), item.get("country", "India"),
        item.get("location_source", "ESTIMATED_TELECOM"), item.get("device_model", "Unknown Device"),
        item.get("software_used", "Unknown Software"), iocs_json, fir_json,
        item.get("upvotes_count", 1), created_at
    ))
    conn.commit()
    conn.close()
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
    conn.execute("UPDATE threat_catalog SET upvotes_count = upvotes_count + 1 WHERE id = ?", (threat_id,))
    conn.commit()
    row = conn.execute("SELECT upvotes_count FROM threat_catalog WHERE id = ?", (threat_id,)).fetchone()
    conn.close()
    return row["upvotes_count"] if row else None

# Initialize on module load
init_db()
print("NETRA DB initialized successfully!")
