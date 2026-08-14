"""
Multi-Channel Notification Formatter & Dispatcher for Telegram & WhatsApp.
Generates structured, high-visibility security alert payloads.
"""

from typing import Dict, Any, Optional
import urllib.request
import json
import html

from cyber_scam_feed.models import ScamReport


class AlertNotifier:
    """Formats and dispatches cyber scam intelligence alerts."""

    @staticmethod
    def format_telegram(report: ScamReport) -> str:
        """Format an alert message for Telegram Bot broadcast (HTML format)."""
        severity_emoji = "🚨" if report.severity == "CRITICAL" else "⚠️"
        category_emoji = {
            "Digital Arrest": "🛑",
            "Apk Trojan": "📱",
            "Deepfake Impersonation": "🎭",
            "Investment Fraud": "📉"
        }.get(report.category, "🛡️")

        escaped_severity = html.escape(str(report.severity))
        escaped_category = html.escape(str(report.category))
        escaped_title = html.escape(str(report.title))
        escaped_summary = html.escape(str(report.summary))
        escaped_loss = html.escape(str(report.financial_loss_str))
        escaped_location = html.escape(str(report.location))
        escaped_sources = html.escape(str(report.source_display))
        escaped_date = html.escape(str(report.published_date))
        escaped_url = html.escape(str(report.url), quote=True)

        lines = [
            f"{severity_emoji} <b>LIVE CYBER SCAM ALERT — {escaped_severity}</b>",
            "",
            f"<b>{category_emoji} Category:</b> {escaped_category}",
            f"<b>📌 Title:</b> {escaped_title}",
            "",
            f"<b>⚙️ Modus Operandi:</b> {escaped_summary}",
            "",
            f"<b>💰 Financial Loss:</b> <code>{escaped_loss}</code>",
            f"<b>📍 Location:</b> {escaped_location}",
            f"<b>📰 Sources:</b> {escaped_sources}",
            f"<b>🗓 Date:</b> {escaped_date}",
            "",
            f"🔗 <a href='{escaped_url}'>Read Verified Advisory / News</a>",
            "",
            "<i>📡 Verified by National Cyber Scam Intelligence Feed (Tavily Powered)</i>"
        ]
        return "\n".join(lines)

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
    def send_telegram(report: ScamReport, bot_token: str, chat_id: str) -> bool:
        """Send formatted alert to Telegram Chat via Bot API."""
        endpoint = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        text = AlertNotifier.format_telegram(report)
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": False
        }
        try:
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception:
            return False

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
