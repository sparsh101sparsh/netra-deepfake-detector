"""
Notification Formatter & Dispatcher for WhatsApp.
Generates structured, high-visibility security alert payloads.
"""

from typing import Dict, Any, Optional
import urllib.request
import json

from cyber_scam_feed.models import ScamReport


class AlertNotifier:
    """Formats and dispatches cyber scam intelligence alerts."""

    @staticmethod
    def format_whatsapp(report: ScamReport) -> str:
        """Format an alert message for WhatsApp broadcast."""
        severity_badge = "🔴 *[CRITICAL CYBER ALERT]*" if report.severity == "CRITICAL" else "🟡 *[HIGH CYBER ALERT]*"
        return (
            f"{severity_badge}\n"
            f"*Topic:* {report.category}\n"
            f"*Incident:* {report.title}\n\n"
            f"*Modus Operandi:* {report.summary}\n\n"
            f"💸 *Estimated Loss:* {report.financial_loss_str}\n"
            f"📍 *Jurisdiction:* {report.location}\n"
            f"📰 *Reporting Outlets:* {report.source_display}\n"
            f"📅 *Reported On:* {report.published_date}\n\n"
            f"🔗 *Full Story:* {report.url}\n\n"
            f"_⚠️ Forward this alert to protect family, colleagues, and senior citizens._"
        )

    @staticmethod
    def send_whatsapp_webhook(report: ScamReport, webhook_url: str) -> bool:
        """Send formatted alert to WhatsApp Webhook."""
        text = AlertNotifier.format_whatsapp(report)
        payload = {
            "message": text,
            "report_id": report.id,
            "category": report.category,
            "severity": report.severity
        }
        try:
            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception:
            return False
