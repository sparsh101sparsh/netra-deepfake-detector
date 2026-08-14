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
| 11 | Spatial Anomaly Localization Engine | Extract keyframes with anomaly >75%, isolate 3 facial landmark regions (eyewear specular glare, iris reflection discontinuity, lip-sync seam), output exact 2D bounding boxes `[x, y, w, h]` and descriptors, <200ms latency. | M6 | ORIGINAL_REQUEST (2026-09-03T20:47:27Z) §R1 |
| 12 | Worker Pipeline Integration & Snapshot Generation | Top 2-3 flagged frames in `worker.py`, amber `#f59e0b` bounding box + `ANOMALY DETECTED HERE` badge, save to `backend/media/keyframes/`, populate `annotated_image_url` and `keyframe_snapshots`. | M7 | ORIGINAL_REQUEST (2026-09-03T20:47:27Z) §R2 |
| 13 | Court-Ready Forensic PDF Report Enhancement | Embed keyframe snapshots side-by-side with diagnostic metadata in Section 2, implement `jobs/{job_id}/report.pdf`, update FIR PDF in `threat_intel.py` and `pdfReportGenerator.ts`, statutory compliance (Sec 65B, Sec 66D, Sec 318(4) BNS). | M8 | ORIGINAL_REQUEST (2026-09-03T20:47:27Z) §R3 |
| 14 | Automated Visual Verification & Benchmark Suite | Execute pipeline on 20 deepfake test video subset, render PDFs to high-res PNG via `pypdfium2`, assert zero unhandled exceptions and <200ms frame latency. | M9 | ORIGINAL_REQUEST (2026-09-03T20:47:27Z) §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database Purge & Storage Foundation | Clean DB, remove stale files, mount media serving, normalize catalog type query | none | COMPLETE |
| 2 | EXIF Geolocation & Auto-Population | Fix exif_engine (honest GPS), wire auto-population for video, image, audio, text | M1 | COMPLETE |
| 3 | Forensic Typst & ReportLab PDF Generator | Implement dual-engine client jsPDF + backend ReportLab FIR PDF | M1 | COMPLETE |
| 4 | Frontend Catalog UI, Previews, Rebranding & PDF Buttons | Overhaul `/reported` tabs, media players, lightbox, transcript, rebranding, 1-click PDF buttons | M2, M3 | COMPLETE |
| 5 | E2E Integration Testing & Forensic Integrity Audit | End-to-end verification, production deployment, and live cloud validation | M1, M2, M3, M4 | COMPLETE |
| 6 | Spatial Anomaly Localization Engine (R1) | Complete `backend/netra/pipeline/visual_localizer.py` with 3 landmark regions, BGR fix, >75% anomaly filter, descriptors, <200ms latency | none | COMPLETE |
| 7 | Worker Pipeline Integration & Snapshot Generation (R2) | Integrate into `worker/worker.py`, top 2-3 keyframes, amber `#f59e0b` box + badge, persistent storage under `backend/media/keyframes/`, `annotated_image_url` | M6 | COMPLETE |
| 8 | Court-Ready Forensic PDF Report Enhancement (R3) | Implement `jobs.py` ReportLab PDF endpoint, update `threat_intel.py` FIR PDF with side-by-side snapshot table, update `pdfReportGenerator.ts`, Sec 65B/66D/318(4) compliance | M7 | PLANNED |
| 9 | Visual Verification & 20-Video Benchmark Suite (R4) | Automated benchmark runner across 20 deepfake videos, `pypdfium2` PNG rendering, latency verification, zero-exception audit | M8 | PLANNED |

## Interface Contracts

### Visual Anomaly Localization Contract
- **Module**: `backend/netra/pipeline/visual_localizer.py`
- **Primary Method**: `VisualAnomalyLocalizer.localize_and_annotate(frame_bgr, anomaly_score=0.92, face_bbox=None, prefer_region=None)`
- **Returns**: `(annotated_frame_bgr: np.ndarray, metadata: dict)`
- **Metadata Fields**:
  - `bounding_box`: `[x, y, w, h]` (pixel coordinates)
  - `normalized_box`: `[x_norm, y_norm, w_norm, h_norm]`
  - `semantic_label`: e.g. `"Eyewear Specular Glare & Feature Discontinuity"`, `"Iris/Pupil Corneal Reflection Discontinuity"`, `"Lip-Sync Blending Boundary Artifact"`
  - `anomaly_score`: float (0.0 - 1.0)
  - `evidence_code`: `"EVD-EYE-SPECULAR-GLARE"` | `"EVD-IRIS-CORNEAL-DISCONTINUITY"` | `"EVD-LIP-SYNC-BOUNDARY-SEAM"`
  - `statutory_act`: e.g. `"Section 65B Indian Evidence Act & Section 66D IT Act 2000"`
  - `detector_subsystem`: e.g. `"GenD Foundation Model ViT-L/14 + Spatial SBI"`

### Worker Snapshot Storage & Schema Contract
- **Storage Path**: `backend/media/keyframes/{job_id}_frame_{frame_number}_annotated.jpg`
- **URL Path**: `/api/backend/api/v1/media/keyframes/{filename}` and `/api/v1/media/keyframes/{filename}`
- **`final_result["frames"][i]` Schema Addition**:
  - `annotated_image_url`: string URL or `None`
- **`final_result["keyframe_snapshots"]` Schema**:
  - Array of snapshot objects:
    - `frame_number`: int
    - `timestamp`: str
    - `anomaly_region`: str
    - `anomaly_score`: float
    - `image_path`: str (local disk path for backend PDF rendering)
    - `image_url`: str (API URL for frontend rendering)
    - `detector_subsystem`: str
    - `bounding_box`: `[x, y, w, h]`

### Court-Ready Forensic PDF Contract
- **Endpoints**:
  - `GET /api/v1/jobs/{job_id}/report.pdf`: Generates PDF report with custody, verdict, neural scores, and Section 2 side-by-side keyframe evidence.
  - `GET /api/v1/threat-intelligence/{threat_id}/fir-pdf`: Generates cybercrime FIR dossier with Section 2 side-by-side keyframe evidence.
- **Section 2 Table Layout**:
  - Left column: 220pt width image showing amber `#f59e0b` bounding box & `ANOMALY DETECTED HERE` badge.
  - Right column: 290pt width diagnostic table with Timestamp, Anomaly Index, Localized Region, Detector Subsystem, Forensic Finding, and Statutory Certification (Sec 65B IEA / Sec 63 BSA, Sec 66D IT Act, Sec 318(4) BNS).

## Code Layout
- `backend/netra/pipeline/visual_localizer.py`: Visual anomaly localization engine
- `worker/worker.py`: Deepfake analysis worker pipeline with snapshot generation
- `backend/api/routes/threat_intel.py`: Threat intelligence and FIR PDF dossier generator
- `backend/api/routes/jobs.py`: Analysis jobs router and PDF report generator
- `frontend/lib/pdfReportGenerator.ts`: Client-side jsPDF forensic report generator
- `backend/media/keyframes/`: Persistent storage directory for annotated keyframe snapshots
- `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`: 100 deepfake benchmark videos

