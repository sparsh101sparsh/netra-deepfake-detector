"""
SQLite Storage & Deduplication Engine for Cyber Scam Feed.
Ensures persistent storage, zero-duplicate guarantee, and 24h synchronization audit trails.
"""

import sqlite3
import json
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone

from cyber_scam_feed.models import ScamReport, FeedSummary
from cyber_scam_feed.config import DEFAULT_DB_PATH


class ScamStorage:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = str(db_path or DEFAULT_DB_PATH)
        self._lock = threading.Lock()
        self._init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        """Create tables and indexes if they do not exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scam_reports (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    summary TEXT,
                    category TEXT,
                    severity TEXT,
                    financial_loss_str TEXT,
                    financial_loss_inr REAL,
                    location TEXT,
                    source_display TEXT,
                    sources_json TEXT,
                    published_date TEXT,
                    url TEXT,
                    image_url TEXT,
                    raw_content TEXT,
                    verified INTEGER DEFAULT 1,
                    created_at TEXT,
                    last_synced_at TEXT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sync_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    synced_at TEXT NOT NULL,
                    new_reports_count INTEGER NOT NULL,
                    total_reports_count INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    metadata_json TEXT
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_category ON scam_reports(category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_severity ON scam_reports(severity)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON scam_reports(created_at)")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_scam_reports_url ON scam_reports(url) WHERE url IS NOT NULL AND url != ''")
            conn.commit()

    def save_report(self, report: ScamReport) -> bool:
        """
        Insert report if unique.
        Returns:
            True if newly inserted, False if duplicate already present.
        """
        with self._lock:
            now = datetime.now(timezone.utc).isoformat()
            clean_url = report.url.strip() if report.url else ""
            with self._get_connection() as conn:
                cursor = conn.cursor()
                if clean_url:
                    cursor.execute("SELECT id FROM scam_reports WHERE id = ? OR url = ?", (report.id, clean_url))
                else:
                    cursor.execute("SELECT id FROM scam_reports WHERE id = ?", (report.id,))
                existing = cursor.fetchone()
                if existing:
                    # Already exists - update last_synced_at only
                    cursor.execute("UPDATE scam_reports SET last_synced_at = ? WHERE id = ?", (now, existing["id"]))
                    conn.commit()
                    return False

                try:
                    cursor.execute("""
                        INSERT INTO scam_reports (
                            id, title, summary, category, severity,
                            financial_loss_str, financial_loss_inr, location,
                            source_display, sources_json, published_date,
                            url, image_url, raw_content, verified,
                            created_at, last_synced_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        report.id, report.title, report.summary, report.category, report.severity,
                        report.financial_loss_str, report.financial_loss_inr, report.location,
                        report.source_display, json.dumps(report.sources), report.published_date,
                        clean_url if clean_url else report.url, report.image_url, report.raw_content, 1 if report.verified else 0,
                        report.created_at, now
                    ))
                    conn.commit()
                    return True
                except sqlite3.IntegrityError:
                    # Concurrent race condition: another thread inserted duplicate record
                    if clean_url:
                        cursor.execute("SELECT id FROM scam_reports WHERE id = ? OR url = ?", (report.id, clean_url))
                    else:
                        cursor.execute("SELECT id FROM scam_reports WHERE id = ?", (report.id,))
                    conflicting = cursor.fetchone()
                    target_id = conflicting["id"] if conflicting else report.id
                    cursor.execute("UPDATE scam_reports SET last_synced_at = ? WHERE id = ?", (now, target_id))
                    conn.commit()
                    return False

    def save_reports_batch(self, reports: List[ScamReport]) -> Tuple[int, int]:
        """
        Batch save reports with deduplication.
        Returns: (newly_inserted_count, duplicate_count)
        """
        new_count = 0
        duplicate_count = 0
        for r in reports:
            if self.save_report(r):
                new_count += 1
            else:
                duplicate_count += 1
        return new_count, duplicate_count

    def get_all_reports(
        self,
        limit: int = 50,
        category: Optional[str] = None,
        severity: Optional[str] = None
    ) -> List[ScamReport]:
        """Fetch saved scam reports sorted by severity and recency."""
        query = "SELECT * FROM scam_reports WHERE 1=1"
        params: List[Any] = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if severity:
            query += " AND severity = ?"
            params.append(severity)

        query += " ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, created_at DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            reports = []
            for row in rows:
                sources = []
                try:
                    sources = json.loads(row["sources_json"])
                except Exception:
                    pass

                reports.append(ScamReport(
                    id=row["id"],
                    title=row["title"],
                    summary=row["summary"],
                    category=row["category"],
                    severity=row["severity"],
                    financial_loss_str=row["financial_loss_str"],
                    financial_loss_inr=row["financial_loss_inr"],
                    location=row["location"],
                    sources=sources,
                    source_display=row["source_display"],
                    published_date=row["published_date"],
                    url=row["url"],
                    image_url=row["image_url"],
                    raw_content=row["raw_content"] or "",
                    verified=bool(row["verified"]),
                    created_at=row["created_at"]
                ))
            return reports

    def record_sync(
        self,
        new_count: int,
        total_count: int,
        status: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Audit record of sync operation."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sync_history (synced_at, new_reports_count, total_reports_count, status, metadata_json)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.now(timezone.utc).isoformat(),
                new_count,
                total_count,
                status,
                json.dumps(metadata or {})
            ))
            conn.commit()

    def get_summary(self) -> FeedSummary:
        """Produce aggregated feed summary stats."""
        reports = self.get_all_reports(limit=100)
        critical = sum(1 for r in reports if r.severity == "CRITICAL")
        high = sum(1 for r in reports if r.severity == "HIGH")
        total_loss = sum(r.financial_loss_inr for r in reports)

        return FeedSummary(
            total_reports=len(reports),
            critical_count=critical,
            high_count=high,
            total_loss_inr=total_loss,
            reports=reports
        )
