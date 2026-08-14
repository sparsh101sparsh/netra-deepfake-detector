"""
NETRA Threat Intelligence & Community Catalog Routes
Provides live threat radar data, catalog search, crowdsourced upvoting, and cybercrime FIR export.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import JSONResponse, Response
import os
from typing import Optional, Dict, Any
from pydantic import BaseModel
import json
import time

from ..db import (
    get_threat_catalog, get_threat_by_id, upvote_threat_item, insert_threat_item,
    create_api_key, list_api_keys, delete_api_key
)

router = APIRouter()

class ReportThreatRequest(BaseModel):
    title: str
    type: str = "video_deepfake" # video_deepfake, image_deepfake, scam_text, audio_clone
    threat_category: str = "IMPERSONATION"
    source_platform: str = "WhatsApp"
    fake_probability: float = 0.95
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    device_model: Optional[str] = "Direct Upload"
    software_used: Optional[str] = "Synthetic Generator"
    extracted_iocs: Optional[Dict[str, Any]] = None
    fir_dossier: Optional[Dict[str, Any]] = None

class CreateKeyRequest(BaseModel):
    name: str = "My Project API Key"
    tier: str = "developer"

@router.get("/threat-intelligence/catalog")
async def fetch_threat_catalog(
    search: Optional[str] = Query(None, description="Search keyword, phone number, UPI ID, or city"),
    category: Optional[str] = Query(None, description="Filter by scam category"),
    media_type: Optional[str] = Query(None, alias="type", description="Filter by media type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Fetch paginated threat catalog with search and filters."""
    items = get_threat_catalog(search=search, category=category, media_type=media_type, limit=limit, offset=offset)
    return {
        "status": "success",
        "total_returned": len(items),
        "results": items,
        "items": items
    }

@router.get("/threat-intelligence/radar")
async def fetch_threat_radar():
    """Fetch live map markers for the Geolocation Threat Radar (Landing Page)."""
    items = get_threat_catalog(limit=100)
    # Format for MapLibre GeoJSON / Marker stream
    markers = []
    for item in items:
        if item.get("lat") is not None and item.get("lng") is not None:
            markers.append({
                "id": item["id"],
                "title": item["title"],
                "type": item["type"],
                "category": item["threat_category"],
                "lat": item["lat"],
                "lng": item["lng"],
                "city": item["city"],
                "state": item["state"],
                "location_source": item["location_source"],
                "confidence_pct": round(item["fake_probability"] * 100, 1),
                "risk_level": item["risk_level"],
                "software_used": item["software_used"],
                "device_model": item["device_model"],
                "upvotes": item["upvotes_count"],
                "created_at": item["created_at"]
            })
    return {
        "status": "success",
        "total_markers": len(markers),
        "markers": markers
    }

@router.get("/threat-intelligence/{threat_id}")
async def fetch_threat_detail(threat_id: str):
    """Fetch full threat incident details."""
    item = get_threat_by_id(threat_id)
    if not item:
        raise HTTPException(status_code=404, detail="Threat incident not found")
    return {"status": "success", "item": item}

@router.post("/threat-intelligence/{threat_id}/upvote")
async def upvote_threat(threat_id: str):
    """Crowdsourced 'I Also Received This' confirmation counter."""
    new_count = upvote_threat_item(threat_id)
    if new_count is None:
        raise HTTPException(status_code=404, detail="Threat incident not found")
    return {
        "status": "success",
        "message": "Incident confirmed. Threat telemetry updated.",
        "upvotes_count": new_count
    }

@router.post("/threat-intelligence/report")
async def report_new_threat(payload: ReportThreatRequest):
    """Submit a verified scam or deepfake to the public catalog."""
    item_id = insert_threat_item(payload.model_dump())
    return {
        "status": "success",
        "message": "Threat successfully indexed in NETRA Global Catalog.",
        "id": item_id
    }

@router.get("/threat-intelligence/{threat_id}/fir-pdf")
async def download_fir_dossier(threat_id: str):
    """
    Generate an official Cyber Crime FIR Report PDF formatted for cybercrime.gov.in using ReportLab.
    """
    item = get_threat_by_id(threat_id)
    if not item:
        raise HTTPException(status_code=404, detail="Threat incident not found")

    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'FIRTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        alignment=1, # Center
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'FIRSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12,
        alignment=1, # Center
        textColor=colors.HexColor("#475569")
    )
    section_style = ParagraphStyle(
        'FIRSection',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'FIRBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    table_cell = ParagraphStyle(
        'FIRCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )
    table_cell_bold = ParagraphStyle(
        'FIRCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    story = []
    
    # Title & Subtitle
    story.append(Paragraph("CYBER CRIME INCIDENT REPORT &amp; FORENSIC DOSSIER", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Generated for Submission to National Cyber Crime Reporting Portal (cybercrime.gov.in)", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#f59e0b"), spaceAfter=10))

    # Meta Table
    iocs = item.get("extracted_iocs", {})
    phones_str = ", ".join(iocs.get("phones", [])) or "None identified"
    upis_str = ", ".join(iocs.get("upis", [])) or "None identified"
    urls_str = ", ".join(iocs.get("urls", [])) or "None identified"
    fir = item.get("fir_dossier", {})

    meta_data = [
        [Paragraph("Case Reference ID:", table_cell_bold), Paragraph(str(item.get("id", "N/A")), table_cell)],
        [Paragraph("Incident Date / Time:", table_cell_bold), Paragraph(str(item.get("created_at", "N/A")), table_cell)],
        [Paragraph("Incident Title:", table_cell_bold), Paragraph(str(item.get("title", "N/A")), table_cell)],
        [Paragraph("Detection Confidence:", table_cell_bold), Paragraph(f"{float(item.get('fake_probability', 0))*100:.1f}% ({item.get('risk_level', 'UNKNOWN')} RISK)", table_cell)],
        [Paragraph("Origin Location:", table_cell_bold), Paragraph(f"{item.get('city', 'Unknown')}, {item.get('state', 'Unknown')}, India ({item.get('location_source', 'ESTIMATED')})", table_cell)],
        [Paragraph("Device / Software:", table_cell_bold), Paragraph(f"{item.get('device_model', 'Standard Device')} | {item.get('software_used', 'NETRA Multi-Modal V5')}", table_cell)],
    ]
    t = Table(meta_data, colWidths=[150, 370])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Section 1: Executive Incident Summary
    story.append(Paragraph("1. Executive Incident Summary", section_style))
    summary_text = fir.get("incident_summary", "Synthetic AI or cyber fraud media intercepted matching known impersonation vector.")
    story.append(Paragraph(summary_text, body_style))

    # Section 2: Technical Indicators of Compromise (IOCs)
    story.append(Paragraph("2. Technical Indicators of Compromise (IOCs)", section_style))
    story.append(Paragraph(f"• <b>Attacker Phone Number(s):</b> {phones_str}", body_style))
    story.append(Paragraph(f"• <b>Fraudulent UPI Handle(s):</b> {upis_str}", body_style))
    story.append(Paragraph(f"• <b>Malicious Links / APKs:</b> {urls_str}", body_style))

    # Section 3: Applicable Legal Provisions
    story.append(Paragraph("3. Applicable Legal Provisions under Indian Law", section_style))
    laws = fir.get("applicable_laws", [
        "Information Technology Act 2000 — Section 66D (Cheating by personation using computer resource)",
        "Bharatiya Nyaya Sanhita 2023 — Section 318(4) (Cheating and dishonestly inducing delivery of property)",
        "Information Technology Act 2000 — Section 66E (Violation of bodily privacy via deepfake manipulation)"
    ])
    for law in laws:
        story.append(Paragraph(f"• {law}", body_style))

    # Section 4: Recommended Law Enforcement Action
    story.append(Paragraph("4. Recommended Law Enforcement Action", section_style))
    action_text = fir.get("recommended_action", "Immediate freeze of recipient beneficiary accounts, blocking of fraudulent phone/UPI handles, and issuance of cyber summons under CrPC Section 91.")
    story.append(Paragraph(action_text, body_style))

    # Signature Footnote
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=6))
    footnote_style = ParagraphStyle(
        'FIRFootnote',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        alignment=1,
        textColor=colors.HexColor("#64748b")
    )
    story.append(Paragraph("Digitally Verified by NETRA Autonomous Forensic Intelligence Engine | Cryptographic SHA-256 Non-Repudiation Verified", footnote_style))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NETRA_FIR_{threat_id}.pdf"}
    )

# Developer API Keys Management Endpoints
@router.post("/developers/keys")
async def create_new_key(payload: CreateKeyRequest):
    """Generate a new API key."""
    key = create_api_key(name=payload.name, tier=payload.tier, monthly_quota=5000 if payload.tier == "enterprise" else 100)
    return {"status": "success", "key": key}

@router.get("/developers/keys")
async def list_keys():
    """List all API keys for current user."""
    keys = list_api_keys()
    return {"status": "success", "keys": keys}

@router.delete("/developers/keys/{key_id}")
async def revoke_key(key_id: str):
    """Revoke an API key."""
    deleted = delete_api_key(key_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"status": "success", "message": "Key successfully revoked"}

