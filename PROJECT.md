# Project: NETRA — Multi-Modal Forensic Detection Platform

## Architecture
- **Backend API**: FastAPI application (`backend/api/server.py`) with SQLite database (`backend/api/netra.db`) for persistent threat catalog (`threat_catalog`), community posts (`community_posts`), and API keys (`api_keys`).
- **Media Pipeline & Storage**: Multi-modal forensic detection engines (`worker/worker.py`, `detectors/`, `ocr_scam_pipeline.py`, `exif_engine.py`, `backend/netra/pipeline/dual_branch_router.py`) storing media under `backend/media/` mounted at `/api/v1/media`.
- **Forensic PDF Engine**: Server-side ReportLab & client-side jsPDF generating institutional, cryptographically authenticated PDF forensic reports via `backend/api/routes/jobs.py` and `backend/api/routes/threat_intel.py`.
- **Dual-Branch Image Routing Engine**: Fast pre-classification routing uploaded images into:
  - Branch A (Pure Face): `face_count >= 1` and `char_count < 30`. Runs multi-face cropping, `SpatialDetector` (EfficientNet-B4 + SBI), and `VisualAnomalyLocalizer`.
  - Branch B (Document / Scam Letter): `char_count >= 30` and `face_count == 0`. Runs RapidOCR, IOC regex extractors, Random Forest scam classification, and Tavily threat cross-check.
  - Branch C (Hybrid / Mixed Media): `face_count >= 1` and `char_count >= 30`. Runs both pipelines and computes composite risk score `max(scam_risk, int(max_face_fake_prob * 100))`.
- **Frontend SPA**: Next.js 14 (App Router) with Tailwind CSS, Lucide icons, Leaflet geospatial mapping, and adaptive `MultiModalForensicScanner.tsx` dynamically switching between `FacialAnomalyCard`, `OCRDossier`, and segmented hybrid view.

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
| 13 | Court-Ready Forensic PDF Report Enhancement | Embed keyframe snapshots side-by-side with diagnostic metadata in Section 2, implement `jobs.py` ReportLab PDF endpoint, update `threat_intel.py` FIR PDF with side-by-side snapshot table, update `pdfReportGenerator.ts`, Sec 66D/318(4) compliance. | M8 | ORIGINAL_REQUEST (2026-09-03T20:47:27Z) §R3 |
| 14 | Automated Visual Verification & Benchmark Suite | Execute pipeline on 20 deepfake test video subset, render PDFs to high-res PNG via `pypdfium2`, assert zero unhandled exceptions and <200ms frame latency. | M9 | ORIGINAL_REQUEST (2026-09-03T20:47:27Z) §R4 |
| 15 | Fast Pre-Classification & Dual-Branch Routing | Fast face detection + RapidOCR text density check (<30 vs >=30 chars), route to Branch A (Pure Face), Branch B (Document), or Branch C (Hybrid), unified on `/api/v1/detect/image-ocr` and `/api/v1/detect/image`. | M10 | ORIGINAL_REQUEST (2026-09-04T00:41:31Z) §R1 |
| 16 | Multi-Face Extraction & Forensic Scoring | Detect all human faces `[x, y, w, h]`, 15% margin cropping, `SpatialSBIDetector` (EfficientNet-B4 + SBI) inference, `VisualAnomalyLocalizer` ocular/lip-sync analysis, per-face scoring `[{ face_id, bbox, fake_probability, verdict, flags, neural_metrics }]`, composite facial verdict. | M10 | ORIGINAL_REQUEST (2026-09-04T00:41:31Z) §R2 |
| 17 | Color-Coded Annotated Preview Generation | Generate annotated preview highlighting detected faces with color-coded bounding boxes (amber `#f59e0b` / red `#ef4444` for synthetic, emerald `#10b981` for authentic) + forensic institutional badges, returned as static URL and base64 preview. | M10 | ORIGINAL_REQUEST (2026-09-04T00:41:31Z) §R2 |
| 18 | Adaptive Frontend UI Presentation | In `MultiModalForensicScanner.tsx`: render `FacialAnomalyCard` for Pure Face with annotated preview, interactive bounding boxes, per-face switcher, and neural metrics gauges; render `OCRDossier` for Document; render composite verdict banner + segmented toggle for Hybrid. | M11 | ORIGINAL_REQUEST (2026-09-04T00:41:31Z) §R3 |
| 19 | E2E Dual-Track & Non-Regression Hardening | Comprehensive verification: document image (`file-JXAGnmm9Vl.png` KBC scam) 100% accurate, portrait image runs face deepfake without text error, hybrid flyer runs both pipelines, multi-face scores all faces, `npm run build` succeeds with 0 errors. | M12 | ORIGINAL_REQUEST (2026-09-04T00:41:31Z) §R4 |

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
| 8 | Court-Ready Forensic PDF Report Enhancement (R3) | Implement `jobs.py` ReportLab PDF endpoint, update `threat_intel.py` FIR PDF with side-by-side snapshot table, update `pdfReportGenerator.ts`, Sec 66D/318(4) compliance | M7 | COMPLETE |
| 9 | Visual Verification & 20-Video Benchmark Suite (R4) | Automated benchmark runner across 20 deepfake videos, `pypdfium2` PNG rendering, latency verification, zero-exception audit | M8 | COMPLETE |
| 10 | Backend Intelligent Dual-Branch Routing & Multi-Face Forensics | Implement `dual_branch_router.py`, multi-face detection (InsightFace + YCrCb skin contour fallback), 15% margin cropping, `SpatialSBIDetector`, `VisualAnomalyLocalizer`, neural metrics, color-coded preview generation, update `backend/api/routes/detect.py` for `/detect/image-ocr` and `/detect/image` | M6, M7 | PLANNED |
| 11 | Adaptive Frontend UI Presentation (MultiModalForensicScanner) | Implement `FacialAnomalyCard.tsx`, update `MultiModalForensicScanner.tsx` for Pure Face, Document, and Hybrid views, segmented tab toggle, composite badge, verify `npm run build` | M10 | PLANNED |
| 12 | E2E Dual-Track & Non-Regression Hardening | Verify document scam detection (`file-JXAGnmm9Vl.png`), portrait deepfake detection, multi-face detection, hybrid media, negative edge cases, full test suite pass, 0 TS build errors | M10, M11 | PLANNED |

## Interface Contracts

### Dual-Branch Image Routing Contract
- **Module**: `backend/netra/pipeline/dual_branch_router.py`
- **Primary Function**: `process_image_forensics(image_bytes: bytes, filename: str, request: Request = None) -> Dict[str, Any]`
- **Response Schema**:
  ```json
  {
    "status": "success",
    "filename": "uploaded_image.png",
    "analysis_mode": "pure_face" | "document" | "hybrid" | "inconclusive",
    "routing_decision": {
      "char_count": int,
      "face_count": int,
      "selected_branch": "Branch A (Pure Face)" | "Branch B (Document)" | "Branch C (Hybrid)",
      "thresholds": { "char_density_min": 30 }
    },
    "composite_risk_score": int (0-100),
    "composite_risk_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE",
    "composite_verdict": str,
    
    "facial_analysis": {
      "face_count": int,
      "max_fake_probability": float (0.0 - 1.0),
      "composite_face_verdict": "DEEPFAKE" | "SUSPICIOUS" | "AUTHENTIC",
      "highest_risk_face_id": str,
      "annotated_preview_url": str,
      "annotated_preview_base64": str,
      "faces": [
        {
          "face_id": str,
          "bbox": [int, int, int, int],
          "normalized_bbox": [float, float, float, float],
          "fake_probability": float (0.0 - 1.0),
          "verdict": "DEEPFAKE" | "SUSPICIOUS" | "AUTHENTIC",
          "risk_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE",
          "flags": [str],
          "anomaly_region": str,
          "evidence_code": str,
          "neural_metrics": {
            "sbi_artifact_level": float,
            "ocular_reflection_symmetry": float,
            "eyewear_specular_score": float,
            "lip_sync_laplacian_score": float
          }
        }
      ]
    },
    
    "ocr_analysis": {
      "engine": str,
      "full_text": str,
      "lines_count": int,
      "processing_time_ms": int
    },
    "scam_analysis": {
      "is_scam": bool,
      "risk_score": int,
      "risk_level": str,
      "verdict": str,
      "scam_type": str,
      "matched_rules": [str],
      "analysis_reason": str
    },
    "extracted_iocs": {
      "phones": [str],
      "upis": [str],
      "urls": [str],
      "apks": [str]
    },
    "tavily_threat_intel": dict | null,
    "recommendation": str
  }
  ```

### Frontend Adaptive UI Contract
- **Component**: `frontend/components/sandbox/MultiModalForensicScanner.tsx`
- **Sub-Component**: `frontend/components/sandbox/FacialAnomalyCard.tsx`
- **Display Modes**:
  - `pure_face`: Displays `FacialAnomalyCard` with annotated image preview, interactive SVG/CSS bounding boxes, per-face selector pills (`Face #1 (98% Fake)`, `Face #2 (4% Authentic)`), neural metrics gauges (SBI artifact level, ocular reflection symmetry), forensic flags, and 1-click Court Evidence PDF download button.
  - `document`: Displays `OCRDossier` with extracted text, detected IOCs, scam category, Tavily press advisories, and recommendations.
  - `hybrid`: Displays top composite verdict banner (`composite_verdict`, `composite_risk_score`, `max(scam_risk, facial_risk)`) + segmented tab switch: `[ 🎭 Facial Deepfake Analysis (N Faces) | 📄 Text Scam Intelligence (M IOCs) ]`.

## Code Layout
- `backend/netra/pipeline/dual_branch_router.py`: Intelligent dual-branch routing & multi-face forensics engine
- `backend/api/routes/detect.py`: Internal/sandbox detect routes (`/api/v1/detect/image-ocr` and `/api/v1/detect/image`)
- `backend/netra/services/ocr_scam_pipeline.py`: OCR text extraction, IOC regexes, scam pipeline
- `backend/netra/pipeline/detectors/spatial.py`: `SpatialSBIDetector` (EfficientNet-B4 + SBI)
- `backend/netra/pipeline/visual_localizer.py`: `VisualAnomalyLocalizer` (ocular glare, lip seams, color-coded badges)
- `backend/netra/services/catalog_hook.py`: Auto-population into SQLite threat catalog
- `frontend/components/sandbox/MultiModalForensicScanner.tsx`: Primary sandbox multi-modal interface
- `frontend/components/sandbox/FacialAnomalyCard.tsx`: Dedicated facial anomaly inspection card
- `frontend/components/sandbox/OCRDossier.tsx`: OCR threat dossier component
- `frontend/components/sandbox/index.ts`: Barrel exports for sandbox components
- `frontend/lib/pdfReportGenerator.ts`: Client-side jsPDF forensic report generator
- `backend/media/images/`: Persistent storage directory for annotated image scans
