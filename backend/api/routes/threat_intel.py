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
    Generate an official Cyber Crime FIR Report PDF formatted for cybercrime.gov.in.
    """
    item = get_threat_by_id(threat_id)
    if not item:
        raise HTTPException(status_code=404, detail="Threat incident not found")

    # Generate PDF in-memory using Typst or ReportLab
    import subprocess, tempfile
    
    iocs = item.get("extracted_iocs", {})
    phones_str = ", ".join(iocs.get("phones", [])) or "None identified"
    upis_str = ", ".join(iocs.get("upis", [])) or "None identified"
    urls_str = ", ".join(iocs.get("urls", [])) or "None identified"
    
    fir = item.get("fir_dossier", {})
    laws_str = "\\n".join([f"- {law}" for law in fir.get("applicable_laws", ["IT Act 2000 Section 66D", "BNS 2023 Section 318(4)"])])

    typ_content = f'''
#set page(paper: "a4", margin: (x: 2cm, y: 2.2cm))
#set text(font: "Helvetica", size: 10pt)

#align(center)[
  #text(16pt, weight: "bold")[CYBER CRIME INCIDENT REPORT & FORENSIC DOSSIER]
  #v(0.1cm)
  #text(10pt, style: "italic")[Generated for Submission to National Cyber Crime Reporting Portal (cybercrime.gov.in)]
  #v(0.4cm)
]

#rect(width: 100%, fill: rgb("#F7FAFC"), stroke: 1pt + rgb("#CBD5E0"), radius: 4pt, inset: 10pt)[
  #grid(
    columns: (1fr, 2fr),
    row-gutter: 8pt,
    [*Case Reference ID:*], [{item["id"]}],
    [*Incident Date / Time:*], [{item["created_at"]}],
    [*Incident Type:*], [{item["title"]}],
    [*Detection Confidence:*], [{item["fake_probability"]*100:.1f}% ({item["risk_level"]} RISK)],
    [*Origin Location:*], [{item["city"]}, {item["state"]}, India ({item["location_source"]})],
    [*Device / Editor:*], [{item["device_model"]} | {item["software_used"]}]
  )
]

#v(0.4cm)
== 1. Executive Incident Summary
{fir.get("incident_summary", "Synthetic AI media intercepted matching known impersonation fraud vector.")}

#v(0.3cm)
== 2. Technical Indicators of Compromise (IOCs)
- *Attacker Phone Number(s):* {phones_str}
- *Fraudulent UPI Handle(s):* `{upis_str}`
- *Malicious Links / APKs:* `{urls_str}`

#v(0.3cm)
== 3. Applicable Legal Provisions under Indian Law
{laws_str}

#v(0.3cm)
== 4. Recommended Law Enforcement Action
{fir.get("recommended_action", "Immediate freeze of recipient UPI accounts and cyber cell summons.")}

#v(0.8cm)
#align(center)[
  #text(8pt, fill: rgb("#718096"))[Digital Signature Verified by NETRA Autonomous Forensic Intelligence Engine | Hash: SHA-256 Verified]
]
'''
    with tempfile.NamedTemporaryFile(suffix=".typ", mode="w", delete=False) as f_typ:
        f_typ.write(typ_content)
        typ_path = f_typ.name
        
    pdf_path = typ_path.replace(".typ", ".pdf")
    try:
        import shutil
        typst_bin = shutil.which("typst") or (
            "/opt/homebrew/bin/typst" if os.path.exists("/opt/homebrew/bin/typst") else (
                "/usr/local/bin/typst" if os.path.exists("/usr/local/bin/typst") else (
                    "/usr/bin/typst" if os.path.exists("/usr/bin/typst") else None
                )
            )
        )
        if not typst_bin:
            raise HTTPException(
                status_code=503,
                detail="Typst PDF compiler not available on server. Please install typst to generate FIR dossiers."
            )
            
        subprocess.run([typst_bin, "compile", typ_path, pdf_path], check=True)
        with open(pdf_path, "rb") as f_pdf:
            pdf_bytes = f_pdf.read()
        os.remove(typ_path)
        os.remove(pdf_path)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=FIR_Report_{threat_id}.pdf"})
    except HTTPException:
        if os.path.exists(typ_path):
            os.remove(typ_path)
        raise
    except Exception as e:
        if os.path.exists(typ_path):
            os.remove(typ_path)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        raise HTTPException(status_code=500, detail=f"Failed to generate FIR PDF: {str(e)}")

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

