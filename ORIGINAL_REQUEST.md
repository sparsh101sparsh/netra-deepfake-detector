# Original User Request

## 2026-09-03T19:39:34Z

Complete production implementation of NETRA Threat Intelligence Catalog, Netra Radar, EXIF Geolocation, and Forensic PDF Generator based on the user's annotated directives:

1. Database Purge:
- Remove seed dummy items (NETRA-SCAM-0001..0010) and seed community posts from SQLite database (threat_catalog and community_posts).
- Catalog and radar must start clean with real uploads.

2. Catalog UI Overhaul (/reported):
- Change category filter tabs to Media Types: All | Video | Image | Audio | Text
- Add playable media previews: inline HTML5 video player for video deepfakes, audio player for voice clones, image lightbox for image deepfakes, and clean transcript for scam texts.

3. Netra Radar & Navbar Rebranding:
- Update Navbar link from 'Threat Radar' to 'Netra Radar'
- Update LiveThreatRadar page title to 'Netra Cyber Threat Radar'

4. Exportable Forensic PDF Report:
- Implement a 1-click Download Forensic PDF report button on both /analyze/[jobId] and the catalog modal.
- Includes Job ID, SHA-256 hash, verdict, scorecard, metadata, and keyframe anomalies.

5. Auto-Population & EXIF Extraction:
- Auto-insert analyzed media (video, image, audio, text) into threat_catalog with playable media URL and forensic results.
- Extract EXIF GPS coordinates from video/image and populate lat/lng in threat_catalog so they plot onto Netra Radar.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

## 2026-09-03T20:47:27Z

Automate visual keyframe anomaly localization and embed tamper-evident bounding box snapshots into court-admissible forensic PDF reports across the NETRA deepfake detection platform.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

## Requirements

### R1. Spatial Anomaly Localization Engine (`backend/netra/pipeline/visual_localizer.py`)
- Extract keyframes flagged with high generative anomaly (>75%) from the video processing pipeline.
- Implement spatial anomaly localization isolating facial landmark regions (eyewear/spectacle specular glare plane, iris/pupil reflection discontinuities, lip-sync blending boundaries).
- Calculate exact 2D bounding box coordinates `(x, y, w, h)` and assign semantic anomaly descriptors.

### R2. Worker Pipeline Integration & Snapshot Generation (`worker/worker.py`)
- For the top 2-3 flagged anomaly frames in any analyzed video:
  - Render an amber tamper-evident bounding box (`#f59e0b`) with a high-contrast forensic badge (`ANOMALY DETECTED HERE`).
  - Save keyframe snapshot images to cloud storage / local artifacts directory.
  - Return annotated snapshot references in `final_result["frames"][i]["annotated_image_url"]`.

### R3. Court-Ready Forensic PDF Report Enhancement (`pdfReportGenerator.ts` & `threat_intel.py`)
- In Section 1/2 of generated cybercrime FIR dossiers, embed the actual visual keyframe snapshot image side-by-side with forensic diagnostic metadata (timestamp, anomaly index, localized region, detector subsystem).
- Ensure generated PDFs comply with Section 66D of the IT Act 2000 and Section 318(4) of BNS 2023.

### R4. Automated Visual Verification & Benchmark Suite
- Execute the visual localization pipeline across a 20-video test subset from the 100 generated deepfake videos.
- Render generated PDF evidence pages to high-resolution PNG images (`pypdfium2`) for visual artifact auditing.

## Acceptance Criteria

### Visual & Forensic Integrity
- [ ] Bounding box overlays accurately target anomalous facial and eyewear regions without obstructing identity.
- [ ] Bounding boxes render with high-visibility amber accent borders (`#f59e0b`) and forensic badges.
- [ ] Generated PDF reports embed actual photographic keyframe crops alongside neural diagnostic text.

### Benchmark & Performance
- [ ] All 20 benchmark deepfake test videos successfully generate annotated keyframe images, court-ready PDFs, and rendered page preview images.
- [ ] Zero unhandled exceptions during batch processing.
- [ ] Keyframe extraction and bounding box drawing completes in <200ms per frame.

## 2026-09-04T00:41:31Z

Implement an intelligent dual-branch routing and multi-modal forensic inspection engine for image uploads in NETRA. If an uploaded image contains document or scam text, route to OCR and text scam intelligence; if the image contains human face(s), localize every face and execute deepfake detection models; if both are present, execute both pipelines and present a composite forensic dossier.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

## Requirements

### R1. Intelligent Dual-Branch Image Routing Engine (Backend)
- In the backend image ingestion pipeline (`/api/v1/detect/image-ocr` or unified `/api/v1/detect/image`), implement fast pre-classification:
  1. Face Detection Check: detect all human face bounding boxes `[x, y, w, h]` using OpenCV Haar Cascades / skin segmentation / InsightFace.
  2. OCR Text Density Check: run RapidOCR to extract text lines and character count.
- Route intelligently based on visual and textual composition:
  - **Branch A (Pure Face / Portrait / Group Photo)**: `face_count >= 1` and `char_count < 30`. Crop each detected face with margin, pass each through the `SpatialDetector` (EfficientNet-B4 + SBI) and `VisualAnomalyLocalizer` (ocular glare, blending seams). Return per-face bounding boxes, deepfake probabilities, and annotated visual evidence preview.
  - **Branch B (Document / Scam Letter)**: `char_count >= 30` and `face_count == 0`. Execute OCR scam detection, IOC extraction (phones, UPIs, APKs), and Tavily cross-check.
  - **Branch C (Hybrid / Mixed Media)**: `face_count >= 1` and `char_count >= 30`. Execute both pipelines and return a composite risk score (maximum of scam risk and face forgery score).

### R2. Multi-Face Extraction & Forensic Scoring
- If multiple faces are present in the image (e.g. 2+ people in a frame), locate and score every face individually:
  - Return an array of detected faces: `[{ face_id, bbox: [x, y, w, h], fake_probability, verdict, flags }]`.
  - Include an overall composite facial verdict (highest risk face).
  - Produce an annotated preview image highlighting detected faces in color-coded bounding boxes (amber/red for synthetic, emerald for authentic).

### R3. Adaptive Frontend UI Presentation (`MultiModalForensicScanner.tsx`)
- In `frontend/components/sandbox/MultiModalForensicScanner.tsx`, adapt the image inspection view dynamically based on the returned analysis mode:
  - If **Pure Face**: Render a **Facial Anomaly Inspection Card** with the annotated image, bounding box overlays, per-face scorecard switcher, and neural metrics (SBI artifact level, ocular reflection symmetry).
  - If **Document**: Render the **OCR Threat Dossier** with extracted text, detected IOCs, and scam category.
  - If **Hybrid**: Render a segmented toggle or split view showing both the **Text Scam Intelligence** and **Facial Deepfake Analysis** tabs with a unified composite verdict badge.

### R4. Verification & Non-Regression
- Ensure existing OCR scam detection for document images (such as `file-JXAGnmm9Vl.png` KBC lottery scam) continues to function with 100% accuracy.
- Ensure pure portrait / selfie photos trigger the facial deepfake branch and correctly return facial bounding boxes and deepfake probabilities.
- Ensure hybrid images (e.g. flyer with text and face) return both text and facial intelligence.
- `npm run build` in `frontend/` succeeds with 0 errors. Backend unit tests pass.

## Acceptance Criteria

### Routing & Model Execution
- [ ] Document image with no faces triggers OCR text scam engine and returns scam classification without running face deepfake models.
- [ ] Photographic portrait image with human face(s) and minimal text triggers facial localization and EfficientNet-B4 / SBI deepfake scoring without erroring on missing text.
- [ ] Mixed image with both text and faces triggers both detectors and returns both `scam_analysis` and `facial_analysis` in the response.
- [ ] For images with multiple faces, all detected faces are listed in the response with individual bounding boxes and deepfake scores.

### Frontend UI Experience
- [ ] Uploading a face image renders the facial deepfake inspection card with bounding boxes and neural scorecard.
- [ ] Uploading a scam document renders the OCR scam dossier.
- [ ] Uploading a hybrid image displays both text and facial forensics.
- [ ] No blank screens, NaN scores, or broken layouts.

### Build & Integrity
- [ ] Frontend `npm run build` succeeds with zero TypeScript compilation errors.
- [ ] Backend starts cleanly and passes all test assertions on test images.


## 2026-09-04T09:07:13Z

Build institutional, court-admissible forensic PDF analysis reports for Audio voice clone and Image manipulation/document fraud across the NETRA platform.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

Research agents should thoroughly examine how media forensics data is modeled for images (pure face, document OCR, hybrid) and audio (voice cloning, acoustic spectral flags, duration, Wav2Vec2 scores). Implementation agents will then implement the tailored forensic PDF dossiers both in the client-side generator (frontend/lib/pdfReportGenerator.ts) and the backend FIR PDF exporter (backend/api/routes/threat_intel.py), wiring up 1-click downloads in OCRDossier, FacialAnomalyCard, and MultiModalForensicScanner.

## Requirements

### R1. Specialized Forensic PDF Report Generation for Image & Document Fraud
- Design and implement court-admissible PDF generation specifically tailored for Image analysis:
  - **Branch A (Pure Facial Deepfake)**: Multi-face breakdown table, bounding box crops / annotated face previews, neural metrics (SBI artifact level, ocular reflection symmetry, specular glare plane), and statutory certification under Sec 66D IT Act / Sec 318(4) BNS.
  - **Branch B (Document Scam / OCR)**: Extracted text log, flagged IOCs (phone numbers, UPI IDs, malicious links, phishing domains), OCR engine telemetry, matched safety rules, and Tavily threat advisory cross-references.
  - **Branch C (Hybrid / Multi-Modal Image)**: Integrated two-section report featuring both facial authenticity scoring and extracted text fraud analysis.
- Ensure 1-click export from `OCRDossier.tsx`, `FacialAnomalyCard.tsx`, and `/reported` catalog items.

### R2. Specialized Forensic PDF Report Generation for Audio Voice Clones
- Design and implement court-admissible PDF generation specifically tailored for Audio analysis:
  - Speech duration, sample rate, and codec verification.
  - Acoustic spectral forensic flags (pitch discontinuity, vocoder phase distortion, synthetic harmonic artifacts).
  - Multi-detector voice clone scorecard (Wav2Vec2, spectral features).
  - Tavily voice clone advisory cross-references and cybercrime reporting guidance.
- Ensure 1-click export from `MultiModalForensicScanner.tsx` audio results card and `/reported` catalog items.

### R3. Backend Endpoint & Client-Side Generation Parity
- Ensure robust generation across both channels:
  - **Client-Side (`frontend/lib/pdfReportGenerator.ts`)**: jsPDF generation with polished typography, dark-mode/institutional styling, embedded keyframe crops, and zero external network blocking.
  - **Backend Server-Side (`backend/api/routes/threat_intel.py`)**: ReportLab generation with customized layouts for `type == 'audio_clone'` and `type == 'image_deepfake'` matching Section 66D IT Act / Section 318(4) BNS.

## Acceptance Criteria

### Forensic & Visual Quality
- [ ] Image manipulation PDFs embed photographic crops / bounding box annotations alongside neural scores.
- [ ] Document OCR PDFs embed formatted tables of extracted IOCs (Phones, UPIs, URLs) and matched fraud rules.
- [ ] Audio clone PDFs present acoustic spectral flags, duration telemetry, and vocoder fingerprint metrics.
- [ ] Download buttons in `OCRDossier`, `FacialAnomalyCard`, `MultiModalForensicScanner` (Audio), and `reported/page.tsx` generate the correct, non-generic PDF.

### Build & Execution Stability
- [ ] `npm run build` in `frontend/` succeeds with 0 TypeScript compilation errors.
- [ ] Both frontend client-side export and backend `/threat-intelligence/{id}/fir-pdf` produce valid, uncorrupted PDFs for audio and image items.

## 2026-09-04T15:03:38+05:30

Statutory certificate removal:
- Confirmed complete exclusion of Section 63 BSA / Section 65B IEA across all modules and tests.

## 2026-09-04T16:30:00+05:30

Perform an exhaustive, autonomous security audit and vulnerability analysis of the NETRA deepfake & cyber threat intelligence platform inspired by CyberStrike's multi-agent methodology engine and OWASP standards, producing a prioritized vulnerability matrix, architectural impact analysis, and concrete defensive remediation diffs.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

**Reference repository:**
- CyberStrike: `/tmp/cyberstrike_inspect` (source: `https://github.com/CyberStrikeus/CyberStrike`) — Study the multi-agent orchestration patterns (`packages/cyberstrike/src/agent/prompt/`), methodology state machine (`packages/cyberstrike/src/agent/prompt/cyberstrike.txt`), and vulnerability assessment taxonomies.

## Requirements

### R1. Attack Surface Discovery & Endpoint Security Mapping
- Inspect and map 100% of NETRA's exposed attack surfaces across `backend/api/server.py`, `backend/api/routes/` (`jobs.py`, `threat_intel.py`, `detect.py`, `developers.py`), `worker/worker.py`, and `frontend/lib/api.ts`.
- Document all public, authenticated, and internal endpoints, HTTP methods, expected input formats, file upload handlers, and background queue workers.

### R2. Comprehensive Code-Level Vulnerability & Risk Analysis
- Execute systematic vulnerability analysis following OWASP WSTG and OWASP API Security Top 10:
  - **Authentication & Authorization**: JWT validation, token verification, session persistence, role enforcement, and object-level authorization (BOLA/IDOR) on threat incident dossiers.
  - **Input Validation & Sanitization**: File upload validation (content-type verification, extension validation, magic-byte inspection, path traversal protection in media handlers), ffmpeg/OpenCV pipeline input safety, and parameterized query enforcement in `netra.db`.
  - **Rate Limiting & DoS Resilience**: Resource-consumption bounds on CPU/GPU-intensive inference endpoints (`/detect/video`, `/detect/audio`, `/detect/image-ocr`, and `/fir-pdf` generation).
  - **CORS, Security Headers & Information Disclosure**: CORS origin restrictions, exception handling shields (preventing stack trace leakage to clients), and safe error responses.
  - **LLM Prompt Defense & Output Sanitization**: Defensive evaluation of prompt injection risks in Tavily query formulation, OCR scam analysis prompts, and classification rationale synthesis.

### R3. Cloud & Infrastructure Configuration Audit
- Audit AWS credential handling, S3 bucket configurations, presigned URL expiration, and environment variable shielding across production and development configs (`.env`, `render.yaml`, `worker/`).
- Verify IMDSv2 enforcement and ensure zero secret or credential exposure in logs or client-facing responses.

### R4. Prioritized Vulnerability Matrix & Defensive Remediation Diffs
- Synthesize all findings into an executive-grade Security Audit Dossier (`SECURITY_AUDIT_REPORT.md`) containing:
  - Vulnerability rating according to CVSS v3.1 and OWASP Risk Rating Methodology.
  - Technical analysis of vulnerability mechanics and realistic impact assessment.
  - Affected source code references with exact file paths and line numbers.
  - Concrete, drop-in remediation code diffs ready for review and implementation.

### R5. Publication-Ready Executive PDF Report (`SECURITY_AUDIT_REPORT.pdf`)
- In addition to the markdown `SECURITY_AUDIT_REPORT.md`, generate a publication-ready, executive-grade PDF document: `SECURITY_AUDIT_REPORT.pdf` (via an automated generator script such as `generate_security_audit_pdf.py` using ReportLab).
- The PDF report must include:
  1. Executive Summary & Security Posture Score
  2. Attack Surface Topology & Inventory Table
  3. Prioritized Vulnerability Matrix (CVSS v3.1, OWASP API Top 10)
  4. Deep Dive Analysis of Core Findings (with affected code files and line numbers)
  5. Cloud & Infrastructure Secrets Audit
  6. Prioritized Remediation Action Plan & Verified Fixes
  7. Cryptographic SHA-256 Non-Repudiation Footer on every page (strictly NO Section 65B/63 BSA citations).

## Acceptance Criteria

### Coverage & Depth
- [ ] 100% of backend API routes and worker entry points are audited against the OWASP Top 10 checklist.
- [ ] File upload handlers (`/detect/video`, `/detect/audio`, `/detect/image-ocr`) are verified for robust validation (magic bytes, size limits, path sanitization).
- [ ] Prompt handling in OCR scam detection and threat intelligence synthesis is audited for injection resilience.
- [ ] No hardcoded credentials, secret keys, or sensitive tokens found in codebase or commit history.

### Actionability & Integrity
- [ ] Every identified finding includes a clear technical explanation, impact analysis, and CVSS v3.1 rating.
- [ ] Concrete, reviewable remediation diffs are generated for each identified issue.
- [ ] Publication-ready `SECURITY_AUDIT_REPORT.pdf` generated with executive styling and SHA-256 footer (strictly no Sec 65B/63 BSA citations).
- [ ] Zero regression or damage to existing 137 passing tests and frontend build stability.

