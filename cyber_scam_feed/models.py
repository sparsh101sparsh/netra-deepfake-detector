"""
Data models for the Live Cyber Scam Feed.
Pure Python dataclasses with full JSON serialization and deserialization.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json


@dataclass
class ScamReport:
    id: str
    title: str
    summary: str
    category: str
    severity: str
    financial_loss_str: str
    financial_loss_inr: float
    location: str
    sources: List[str]
    source_display: str
    published_date: str
    url: str
    image_url: str = ""
    raw_content: str = ""
    verified: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScamReport":
        return cls(
            id=data.get("id", ""),
            title=data.get("title", ""),
            summary=data.get("summary", ""),
            category=data.get("category", "Cyber Fraud"),
            severity=data.get("severity", "MEDIUM"),
            financial_loss_str=data.get("financial_loss_str", "Undisclosed"),
            financial_loss_inr=float(data.get("financial_loss_inr", 0.0)),
            location=data.get("location", "Pan-India"),
            sources=data.get("sources", []),
            source_display=data.get("source_display", "Cyber Intelligence"),
            published_date=data.get("published_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
            url=data.get("url", ""),
            image_url=data.get("image_url", ""),
            raw_content=data.get("raw_content", ""),
            verified=bool(data.get("verified", True)),
            created_at=data.get("created_at", datetime.now(timezone.utc).isoformat())
        )


@dataclass
class FeedSummary:
    title: str = "Live Cyber Scam Feed (Powered By Tavily)"
    subtitle: str = "Real-time alerts and reports aggregated from national cybercrime warnings."
    sync_interval: str = "Syncs every 24h automatically"
    sync_channels: str = "Daily intelligence sent to WhatsApp bot"
    total_reports: int = 0
    critical_count: int = 0
    high_count: int = 0
    total_loss_inr: float = 0.0
    last_synced_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reports: List[ScamReport] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["reports"] = [r.to_dict() if isinstance(r, ScamReport) else r for r in self.reports]
        return d

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)
