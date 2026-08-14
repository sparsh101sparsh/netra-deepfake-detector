# Project: NETRA — Threat Intelligence Catalog, Netra Radar, EXIF Geolocation & Forensic PDF

## Architecture
- **Backend API**: FastAPI application (`backend/api/server.py`) with SQLite database (`backend/api/netra.db`) for persistent threat catalog (`threat_catalog`), community posts (`community_posts`), and API keys (`api_keys`).
- **Media Pipeline & Storage**: Multi-modal forensic detection engines (`worker/worker.py`, `detectors/`, `ocr_scam_pipeline.py`, `exif_engine.py`) storing media under `backend/media/` mounted at `/api/v1/media`.
- **Forensic PDF Engine**: Server-side Typst compiler (`/opt/homebrew/bin/typst`) generating institutional, cryptographically authenticated PDF forensic reports via `backend/api/routes/jobs.py` and `backend/api/routes/threat_intel.py`.
- **Frontend SPA**: Next.js 14 (App Router) with Tailwind CSS, Lucide icons, Leaflet geospatial mapping, and Gliding filter tabs (`frontend/app/`). Proxies `/api/backend/*` to FastAPI port 8000.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Purge | Purge dummy items (`NETRA-SCAM-0001..0010`) and seed posts from `threat_catalog` and `community_posts` in `netra.db`. Remove stale root `threat_catalog.db`. Ensure clean start. | M1 | ORIGINAL_REQUEST §1 |
| 2 | Media Storage & Type Normalization | Mount `/api/v1/media` static directory in `server.py`, expand `ReportThreatRequest`, normalize `get_threat_catalog` queries so `media_type=video` matches `video_deepfake`, etc. | M1 | ORIGINAL_REQUEST §2, §5 |
| 3 | Honest EXIF GPS Extraction | Fix `exif_engine.py`: add Apple ISO6709 tag, remove hardcoded New Delhi fallback so unverified media has honest `lat=None, lng=None` and verified media gets `EXACT_GPS`. | M2 | ORIGINAL_REQUEST §5 |
| 4 | Multi-Modal Auto-Population | Auto-insert analyzed video, image, audio, and text into `threat_catalog` with playable media URLs, forensic scores, and EXIF coordinates. | M2 | ORIGINAL_REQUEST §5 |
| 5 | Forensic Typst PDF Engine | Implement `GET /api/v1/jobs/{job_id}/report.pdf` with Job ID, SHA-256, verdict, neural scorecard, metadata, and keyframe anomalies. Enhance FIR PDF endpoint. | M3 | ORIGINAL_REQUEST §4 |
| 6 | Catalog UI Overhaul (/reported) | Change filter tabs to Media Types: All \| Video \| Image \| Audio \| Text. Update `ThreatItem` interface. | M4 | ORIGINAL_REQUEST §2 |
| 7 | Playable Media Previews | Inline HTML5 video player, audio player, image lightbox, and clean transcript with copy button on catalog cards and modal. | M4 | ORIGINAL_REQUEST §2 |
| 8 | Rebranding & Radar Filter Fix | Update Navbar & Footer to "Netra Radar", title to "Netra Cyber Threat Radar", fix LiveThreatRadar "Deepfakes" category filter bug. | M4 | ORIGINAL_REQUEST §3 |
| 9 | 1-Click Forensic PDF Download Buttons | Add download buttons on `/analyze/[jobId]` and catalog slide-over modal linking to PDF endpoints. | M4 | ORIGINAL_REQUEST §4 |
| 10 | E2E Integration & Forensic Audit | End-to-end verification across all 5 directives: clean DB, upload with EXIF GPS, auto-population, catalog filters/previews, radar plotting, PDF download, and forensic integrity audit. | M5 | ORIGINAL_REQUEST §1-§5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database Purge & Storage Foundation | Clean DB, remove stale files, mount media serving, normalize catalog type query | none | COMPLETE |
| 2 | EXIF Geolocation & Auto-Population | Fix exif_engine (honest GPS), wire auto-population for video, image, audio, text | M1 | COMPLETE |
| 3 | Forensic Typst & ReportLab PDF Generator | Implement dual-engine client jsPDF + backend ReportLab FIR PDF | M1 | COMPLETE |
| 4 | Frontend Catalog UI, Previews, Rebranding & PDF Buttons | Overhaul `/reported` tabs, media players, lightbox, transcript, rebranding, 1-click PDF buttons | M2, M3 | COMPLETE |
| 5 | E2E Integration Testing & Forensic Integrity Audit | End-to-end verification, production deployment, and live cloud validation | M1, M2, M3, M4 | COMPLETE |

## Interface Contracts

### Media Serving & Catalog Storage
- **Media URL format**: `/api/backend/api/v1/media/{type}/{filename}` (proxied via Next.js to FastAPI `/api/v1/media/{type}/{filename}`)
- **Normalized Media Types**:
  - `video` <-> `type IN ('video', 'video_deepfake')`
  - `image` <-> `type IN ('image', 'image_deepfake')`
  - `audio` <-> `type IN ('audio', 'audio_clone')`
  - `text` <-> `type IN ('text', 'scam_text')`
- **Geolocation contract**:
  - `lat`, `lng`: Decimal float or `None`.
  - `location_source`: `"EXACT_GPS"` (when extracted from media EXIF/metadata) or `None`.
  - Radar endpoint `/api/v1/threat-intelligence/radar` plots items ONLY where `lat IS NOT NULL AND lng IS NOT NULL`.

### Forensic PDF Endpoint
- **URL**: `GET /api/v1/jobs/{job_id}/report.pdf`
- **Response**: `application/pdf`, filename `NETRA_Forensic_Report_{job_id}.pdf`
- **Contents**:
  - Header: Netra Forensic Seal & Institutional Banner
  - Custody: Job ID, media SHA-256 hash, timestamp, worker node
  - Verdict: Verdict (`DEEPFAKE`, `AUTHENTIC`, `SUSPICIOUS`), Risk Level (`CRITICAL`, `HIGH`, `LOW`), Confidence %
  - Scorecard: Spatial SBI score, GenD ViT-L, Wav2Vec2 Audio, CLIP Probe
  - Metadata: Container bitrate, duration, codec, EXIF location & device
  - Keyframe Anomalies: timestamp, frame index, anomaly flags

## Code Layout
- `backend/api/db.py`: SQLite initialization, migrations, CRUD helpers (`get_threat_catalog`, `insert_threat_item`)
- `backend/api/netra.db`: Primary SQLite database
- `backend/api/server.py`: FastAPI entrypoint, router mounts, static media mount
- `backend/api/routes/detect.py`: Multi-modal upload & analysis endpoints (video, image OCR, audio)
- `backend/api/routes/scam.py`: Text scam analysis endpoint
- `backend/api/routes/jobs.py`: Analysis job status and PDF report generation
- `backend/api/routes/threat_intel.py`: Threat catalog, radar telemetry, FIR PDF generation
- `backend/netra/pipeline/exif_engine.py`: EXIF GPS and container metadata extractor
- `frontend/app/reported/page.tsx`: Threat catalog page with filter tabs, cards, media previews, slide-over modal
- `frontend/app/analyze/[jobId]/page.tsx`: Video analysis results page with Download Forensic PDF button
- `frontend/app/radar/page.tsx`: Netra Cyber Threat Radar page
- `frontend/components/LiveThreatRadar.tsx`: Satellite radar map component
- `frontend/components/layout/Navbar.tsx`: Header navigation
- `frontend/components/layout/Footer.tsx`: Footer navigation
