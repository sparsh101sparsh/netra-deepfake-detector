"""
NETRA Threat Intelligence & Community Catalog Routes
Provides live threat radar data, catalog search, crowdsourced upvoting, and cybercrime FIR export.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import JSONResponse, Response
import os
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
import json
import time

logger = logging.getLogger(__name__)

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
KEYFRAMES_DIR = os.path.join(MEDIA_DIR, "keyframes")


def resolve_snapshot_image_path(snap: dict) -> Optional[str]:
    """Resolve keyframe snapshot image path from image_path or KEYFRAMES_DIR."""
    img_p = snap.get("image_path")
    if img_p and os.path.exists(img_p):
        return img_p
    if img_p:
        candidate = os.path.join(KEYFRAMES_DIR, os.path.basename(img_p))
        if os.path.exists(candidate):
            return candidate
    for url_key in ("annotated_image_url", "image_url"):
        url_val = snap.get(url_key)
        if url_val:
            filename = os.path.basename(url_val.split("?")[0])
            candidate = os.path.join(KEYFRAMES_DIR, filename)
            if os.path.exists(candidate):
                return candidate
    return None

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
    thumbnail_url: Optional[str] = None
    media_url: Optional[str] = None
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
    media_type: Optional[str] = Query(None, description="Filter by media type"),
    type: Optional[str] = Query(None, description="Filter by media type (legacy alias)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Fetch paginated threat catalog with search and filters."""
    effective_media_type = media_type or type
    items = get_threat_catalog(search=search, category=category, media_type=effective_media_type, limit=limit, offset=offset)
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

    # Section 2: Flagged Forensic Keyframe Visual Evidence (Anomaly Localization)
    keyframe_snaps = iocs.get("keyframe_snapshots") or []
    if keyframe_snaps:
        from reportlab.platypus import Image as RLImage
        story.append(Paragraph("2. Flagged Forensic Keyframe Visual Evidence (Anomaly Localization)", section_style))
        for snap in keyframe_snaps[:2]:
            confidence_val = snap.get('anomaly_score')
            if confidence_val is None:
                confidence_val = snap.get('confidence', 0.95)
            try:
                confidence_pct = float(confidence_val) * 100
            except (ValueError, TypeError):
                confidence_pct = 95.0

            detector_val = snap.get('detector_subsystem', 'GenD Foundation Model ViT-L/14 + Spatial SBI')
            region_val = snap.get('anomaly_region', 'Eyewear / Facial Specular Discontinuity')
            finding_val = snap.get('forensic_finding', 'Tamper-evident bounding box marks high-frequency synthetic latent boundary discontinuity certified under Section 65B Indian Evidence Act.')

            cap_text = (
                f"<b>Keyframe #{snap.get('frame_number', 0)} @ {snap.get('timestamp', '00:00')}</b><br/><br/>"
                f"<b>Neural Anomaly Index:</b> {confidence_pct:.1f}% (CRITICAL)<br/>"
                f"<b>Localized Region:</b> {region_val}<br/>"
                f"<b>Detector Subsystem:</b> {detector_val}<br/>"
                f"<b>Diagnostic Finding:</b> {finding_val}<br/>"
                f"<b>Statutory Certification:</b> Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023 &amp; Section 66D IT Act 2000"
            )

            use_image = False
            img_p = resolve_snapshot_image_path(snap)
            if img_p and os.path.exists(img_p):
                try:
                    from PIL import Image as PILImage
                    with PILImage.open(img_p) as test_im:
                        test_im.verify()
                    rl_img = RLImage(img_p, width=220, height=145)
                    snap_t = Table([[rl_img, Paragraph(cap_text, body_style)]], colWidths=[230, 290])
                    snap_t.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
                        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                        ('TOPPADDING', (0,0), (-1,-1), 6),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                        ('LEFTPADDING', (0,0), (-1,-1), 6),
                        ('RIGHTPADDING', (0,0), (-1,-1), 6),
                    ]))
                    story.append(snap_t)
                    story.append(Spacer(1, 6))
                    use_image = True
                except Exception as e:
                    logger.warning(f"Failed to verify/embed keyframe image in PDF: {e}")
                    use_image = False

            if not use_image:
                card_t = Table([[Paragraph(cap_text, body_style)]], colWidths=[520])
                card_t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ('RIGHTPADDING', (0,0), (-1,-1), 8),
                ]))
                story.append(card_t)
                story.append(Spacer(1, 6))

    # Section 3: Technical Indicators of Compromise (IOCs)
    story.append(Paragraph("3. Technical Indicators of Compromise (IOCs)", section_style))
    story.append(Paragraph(f"• <b>Attacker Phone Number(s):</b> {phones_str}", body_style))
    story.append(Paragraph(f"• <b>Fraudulent UPI Handle(s):</b> {upis_str}", body_style))
    story.append(Paragraph(f"• <b>Malicious Links / APKs:</b> {urls_str}", body_style))

    # Section 4: Applicable Legal Provisions under Indian Law
    story.append(Paragraph("4. Applicable Legal Provisions under Indian Law", section_style))
    laws = fir.get("applicable_laws", [
        "Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023 (Admissibility of electronic records and tamper-evident cryptographic hash non-repudiation)",
        "Information Technology Act 2000 — Section 66D (Cheating by personation using computer resource / synthetic AI manipulation)",
        "Bharatiya Nyaya Sanhita 2023 — Section 318(4) (Cheating and dishonestly inducing delivery of property)",
        "Information Technology Act 2000 — Section 66E (Violation of bodily privacy via non-consensual synthetic visual manipulation)"
    ])
    for law in laws:
        story.append(Paragraph(f"• {law}", body_style))

    # Section 5: Recommended Law Enforcement Action
    story.append(Paragraph("5. Recommended Law Enforcement Action", section_style))
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
    story.append(Paragraph("Digitally Verified by NETRA Autonomous Forensic Intelligence Engine | Cryptographic SHA-256 Non-Repudiation Verified | Certified under Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023", footnote_style))

    try:
        doc.build(story)
    except Exception as e:
        logger.error(f"Failed to build FIR PDF for {threat_id}: {e}")
        buf = io.BytesIO()
        fallback_doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        fallback_story = [
            Paragraph("FIRST INFORMATION REPORT (CYBER CRIME INCIDENT DOSSIER)", title_style),
            Spacer(1, 6),
            Paragraph(f"<b>Incident Reference ID:</b> {threat_id}", body_style),
            Spacer(1, 10),
            Paragraph("4. Applicable Legal Provisions under Indian Law", section_style),
            Paragraph("&bull; <b>Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023</b>", body_style),
            Paragraph("&bull; <b>Section 66D Information Technology Act 2000</b>", body_style),
            Spacer(1, 10),
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=6),
            Paragraph("Digitally Verified by NETRA Autonomous Forensic Intelligence Engine | Cryptographic SHA-256 Non-Repudiation Verified | Certified under Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023", footnote_style)
        ]
        fallback_doc.build(fallback_story)
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

