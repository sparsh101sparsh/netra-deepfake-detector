# Comprehensive Media Forensics Survey: Image Forensics (Branch A, B, C) & Court-Admissible PDF Generation

**Author**: Explorer Survey Agent (`teamwork_preview_explorer`)  
**Target File**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image/handoff.md`  
**Working Directory**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image`  
**Date**: 2026-09-04T09:15:00Z  

---

## 1. Observation

### 1.1 Ingestion & Dual-Branch Routing Architecture

In `backend/api/routes/detect.py` (lines 138–170), two endpoints expose unified image forensics:
```python
@router.post("/detect/image-ocr")
@router.post("/detect/image")
async def detect_image_unified(request: Request, file: UploadFile = File(...)):
```
Both endpoints accept image uploads (JPEG, PNG, WebP, JPG, BMP up to 50MB) and delegate synchronously to `netra.pipeline.dual_branch_router.process_image_forensics`.

In `backend/netra/pipeline/dual_branch_router.py` (lines 518–543), pre-classification occurs via two fast local passes before executing heavy neural models:
1. **Multi-Tier Face Detection**:
   - Class `MultiTierFaceDetector` (lines 77–208) implements:
     - **Tier 1**: InsightFace `buffalo_l` (`det_10g` / RetinaFace ONNX at 640×640) loaded from LivePortrait repository candidates.
     - **Tier 2**: 100% offline skin locus contour segmentation in YCrCb color space (`cr in [133, 173]`, `cb in [77, 127]`, morphological closing/opening, contour aspect ratio `0.65 <= aspect <= 2.4`, Laplacian gradient variance `> 40.0`).
   - Yields integer face bounding boxes `[(x, y, w, h), ...]`, yielding `face_count = len(detected_boxes)`.
2. **Standalone RapidOCR Text Density Check**:
   - Function `check_text_density_rapidocr` (lines 213–241) executes standalone `RapidOCR` ONNX runtime without triggering multi-engine fallback cascades.
   - Yields `(char_count, standalone_text, standalone_lines, ocr_time_ms)`.
3. **Tri-Branch Routing Threshold**:
   - `CHAR_DENSITY_THRESHOLD = 30` (line 63).
   - **Branch A (Pure Face)**: `face_count >= 1 and char_count < 30` -> `analysis_mode = "pure_face"`
   - **Branch B (Document)**: `char_count >= 30 and face_count == 0` -> `analysis_mode = "document"`
   - **Branch C (Hybrid)**: `face_count >= 1 and char_count >= 30` -> `analysis_mode = "hybrid"`
   - **Inconclusive Fallback**: `face_count == 0 and char_count < 30` -> `analysis_mode = "inconclusive"`

---

### 1.2 Data Structures & Schemas by Modality Branch

The unified response schema returned by `process_image_forensics` (lines 756–805) contains top-level routing metadata, detailed branch sub-objects, and backward-compatibility keys:

```json
{
  "status": "success",
  "scan_id": "SCAN-XXXXXXXX",
  "filename": "uploaded_image.png",
  "analysis_mode": "pure_face | document | hybrid | inconclusive",
  "routing_decision": {
    "char_count": 0,
    "face_count": 1,
    "selected_branch": "Branch A (Pure Face / Portrait / Group Photo)",
    "thresholds": { "char_density_min": 30 }
  },
  "composite_risk_score": 85,
  "composite_risk_level": "CRITICAL | HIGH | MEDIUM | LOW | SAFE",
  "composite_verdict": "CRITICAL FACIAL DEEPFAKE DETECTED",
  "facial_analysis": { ... },
  "ocr_analysis": { ... },
  "scam_analysis": { ... },
  "extracted_iocs": { ... },
  "tavily_threat_intel": { ... },
  "recommendation": "...",
  "is_scam": true,
  "risk_score": 85,
  "risk_level": "CRITICAL",
  "verdict": "CRITICAL FACIAL DEEPFAKE DETECTED",
  "extracted_text": "...",
  "extracted_phones": [],
  "extracted_upis": [],
  "extracted_urls": [],
  "extracted_apks": []
}
```

#### Branch A: Pure Face / Portrait / Group Photo (`analysis_mode == "pure_face"`)
- `facial_analysis` (lines 571–581):
  - `face_count`: Total integer faces detected (`>= 1`).
  - `max_fake_probability`: Highest `fake_probability` across all detected faces (`0.0000 – 1.0000`).
  - `composite_face_verdict`: `"DEEPFAKE"` (`prob >= 0.75`), `"SUSPICIOUS"` (`prob >= 0.50`), or `"AUTHENTIC"` (`prob < 0.50`).
  - `highest_risk_face_id`: ID string of the most anomalous face (e.g. `"face_1"`).
  - `annotated_preview_url`: Relative URL `/api/v1/media/images/{scan_id}_annotated.jpg`.
  - `annotated_image_url`: Duplicate alias for `annotated_preview_url`.
  - `annotated_preview_base64`: Base64 JPEG data URI (`data:image/jpeg;base64,...`).
  - `annotated_image_preview`: Duplicate alias for `annotated_preview_base64`.
  - `faces`: Array of scored face dictionaries (lines 363–387):
    ```json
    {
      "face_id": "face_1",
      "bbox": [x, y, w, h],
      "normalized_bbox": [norm_x, norm_y, norm_w, norm_h],
      "fake_probability": 0.8842,
      "verdict": "DEEPFAKE",
      "risk_level": "CRITICAL",
      "flags": [
        "spatial_boundary_discontinuity",
        "ocular_reflection_asymmetry",
        "eyewear_specular_artifact"
      ],
      "anomaly_region": "Eyewear / Specular Glare Plane",
      "evidence_code": "EVD-EYE-SPECULAR-GLARE",
      "forensic_badge": "FACE #1: SYNTHETIC (88%)",
      "border_color_hex": "#ef4444",
      "neural_metrics": {
        "sbi_artifact_level": 0.8842,
        "ocular_reflection_symmetry": 0.4215,
        "eyewear_specular_score": 68.45,
        "lip_sync_laplacian_score": 14.20
      }
    }
    ```
- Face Crop logic (lines 280–286): Faces are cropped with **15% margin padding**:
  `pad_x = int(w * 0.15)`, `pad_y = int(h * 0.15)`.
- Neural Model: `SpatialSBIDetector` (lines 291–304) runs EfficientNet-B4 trained on Self-Blended Images (SBI) on normalized 224×224 crops.
- Visual Anomaly Localizer: `VisualAnomalyLocalizer.evaluate_primary_anomaly` (in `backend/netra/pipeline/visual_localizer.py`, lines 155–242) computes:
  - `AnomalyRegionType.EYEWEAR`: Spectacle glare & bridge variance (`ew_std * (specular_ratio * 3.5 + 0.12)`).
  - `AnomalyRegionType.IRIS`: Bilateral corneal glint asymmetry (`mean_diff * 1.6 + glint_asym * 35.0`).
  - `AnomalyRegionType.LIP_SYNC`: Perioral Laplacian variance & Sobel boundary seam (`lap_var * 0.35 + seam_grad * 0.85`).
- Annotated Preview Drawing (lines 396–484):
  - 3px bounding box stroke: Red `#ef4444` (`prob >= 0.85`), Amber `#f59e0b` (`prob >= 0.65`), Emerald `#10b981` (`prob < 0.65`).
  - Dark institutional badge background `#0f172a` with white text: `FACE #i: SYNTHETIC (X%)` or `FACE #i: AUTHENTIC (X%)`.

#### Branch B: Document Scam / OCR (`analysis_mode == "document"`)
- Handled by `run_image_ocr_and_scam_detection` in `backend/netra/services/ocr_scam_pipeline.py`:
  - `ocr_analysis` (lines 232–237):
    - `engine`: `"RapidOCR (ONNX Engine)"`, fallback to `"PaddleOCR v2.7"`, `"EasyOCR (PyTorch)"`, or `"PyTesseract"`.
    - `full_text`: Verbatim string of extracted document lines joined by spaces.
    - `lines_count`: Total lines detected.
    - `processing_time_ms`: Engine execution duration in milliseconds.
  - `extracted_iocs` (lines 55–67):
    - `phones`: Indian mobile regex `(?:(?:\+91[\-\s]?)?[6-9]\d{9})`
    - `upis`: Standard VPA handles `[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}`
    - `urls`: Phishing and suspicious links `https?://[^\s<>"]+|www\.[^\s<>"]+`
    - `apks`: Malicious application packages `[\w\-]+\.apk`
  - `scam_analysis` (lines 238–246):
    - `is_scam`: Boolean fraud verdict.
    - `risk_score`: 0–100 integer score (boosted to >=92 if `.apk` found, >=88 if UPI handle found with payment keywords).
    - `risk_level`: `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, or `"LOW"`.
    - `verdict`: Descriptive label (e.g. `"CRITICAL SCAM / FORGED MEDIA DETECTED"`).
    - `scam_type`: Category identifier (`"lottery_prize_fraud"`, `"digital_arrest_extortion"`, `"electricity_kyc_fraud"`, etc.).
    - `matched_rules`: Array of rule strings triggered by text patterns and heuristics.
    - `analysis_reason`: Forensic diagnostic narrative.
  - `tavily_threat_intel` from `backend/netra/services/tavily_cross_check.py` (lines 28–122):
    - `verified_threat`: Boolean match flag.
    - `query_used`: High-priority IOC query string (prioritizing phones, then UPIs, then extracted keywords).
    - `matches_count`: Integer count of matching news articles.
    - `articles`: Array of `{ "title": str, "url": str, "snippet": str, "published_date": str }`.
    - `intel_summary`: Human-readable threat correlation summary.
  - `facial_analysis` for Branch B is cleanly blanked (`face_count: 0`, `faces: []`, `max_fake_probability: 0.0`).

#### Branch C: Hybrid / Mixed Media (`analysis_mode == "hybrid"`)
- Triggered when `face_count >= 1 and char_count >= 30`.
- Executes **both** the full Multi-Face pipeline and the full OCR Scam pipeline.
- `composite_risk_score = max(scam_risk, int(max_face_fake_prob * 100))`.
- Contains populated `facial_analysis` (with `faces`, `annotated_preview_url`, `annotated_preview_base64`, `neural_metrics`) AND populated `ocr_analysis`, `scam_analysis`, `extracted_iocs`, and `tavily_threat_intel`.

---

### 1.3 Frontend UI Components & Export Gaps

1. **`frontend/components/sandbox/OCRDossier.tsx`**:
   - Displays extracted text pane with character count, detected IOC chips with 1-click clipboard copy (phone, UPI, APK, URL), Tavily live news advisory cards, and `TaskRows` safety checklist.
   - **Observed Gap**: Line 356–378 contains only "Report to Cybercrime Cell" and "Close". **There is currently NO 1-click Download Forensic PDF button or handler in `OCRDossier.tsx`**.
2. **`frontend/components/sandbox/FacialAnomalyCard.tsx`**:
   - Displays interactive bounding box preview where clicking on face overlays updates the active face, per-face scorecard switcher, metric bars for `sbi_artifact_level`, `ocular_reflection_symmetry`, `eyewear_specular_score`, `lip_sync_laplacian_score`, and evidence code tags.
   - Lines 382–408: Implements `handleDownloadPDF()` which calls `generateForensicPDF` from `@/lib/pdfReportGenerator`.
   - **Observed Gap**: The data passed is mapped into `keyframeSnapshots`, which the current generator treats as a video keyframe layout without a structured multi-face table or neural metric bars.
3. **`frontend/components/sandbox/MultiModalForensicScanner.tsx`**:
   - Lines 616–646: Adaptively routes based on `imageOcrResult.analysis_mode`:
     - `pure_face` -> `<FacialAnomalyCard />`
     - `hybrid` -> `<HybridDossier />` (segmented switcher between Facial Deepfake tab and Text Scam tab)
     - `document` / `inconclusive` -> `<OCRDossier />`
   - Lines 730–736: Audio results view contains a dedicated `handleDownloadAudioPDF` button calling `generateForensicPDF`.
   - **Observed Gap**: `HybridDossier` (lines 54–138) has no top-level "Download Composite Forensic PDF" button that bundles both the facial analysis and the OCR threat dossier.
4. **`frontend/app/reported/page.tsx`**:
   - Lines 476–495: Slide-over inspection modal contains a "Download Forensic Evidence PDF" button that invokes `generateForensicPDF`.
   - **Observed Gap**: It passes generic metadata (`activeItem.id`, `title`, `verdict`, `confidence`, `summary`, `iocs`). `generateForensicPDF` does not differentiate by `activeItem.type`, rendering video placeholder blocks instead of the specialized image or document reports.
5. **`frontend/lib/pdfReportGenerator.ts`**:
   - Implements `generateForensicPDF(data: PDFReportData)` using client-side `jsPDF`.
   - **Observed Gaps**:
     - `PDFReportData` lacks dedicated fields for image forensics (e.g. `mediaType?: "video" | "image" | "audio" | "text"`, `analysisMode?: "pure_face" | "document" | "hybrid"`, `faces?: FaceEntry[]`, `ocrText?: string`, `audioFlags?: string[]`, `audioDuration?: number`).
     - Hardcodes Section 1 as "Multi-Detector Neural Scorecard & Telemetry" with video detectors (GenD ViT-L/14, Spatial SBI, Wav2Vec2, 2D-DCT).
     - Does NOT render:
       - Multi-face breakdown tables (Face ID, BBox, Synthetic Probability, Anomaly Region, Evidence Code, Verdict).
       - Neural metrics breakdown (SBI artifact level, ocular reflection symmetry, eyewear specular score, lip-sync score).
       - Extracted document text log and formatted IOC table (Phones, UPIs, Malicious URLs/APKs).
       - Matched safety rules list.
       - Audio acoustic spectral flags, duration, and vocoder fingerprint metrics.

---

### 1.4 Backend FIR PDF Export Parity & Database Catalog

1. **`backend/api/routes/threat_intel.py` (`download_fir_dossier`)**:
   - Route `GET /threat-intelligence/{threat_id}/fir-pdf` (lines 211–449) generates an A4 PDF using Python `reportlab`.
   - Lines 324–387: Only queries `keyframe_snaps = iocs.get("keyframe_snapshots") or []`.
   - **Observed Gap**: For `type == "image_deepfake"` (whether Branch A, B, or C) or `type == "audio_clone"`, it omits face tables, bounding boxes, neural metrics, OCR text, and acoustic flags, generating only the generic FIR text and legal citations.
2. **`backend/netra/services/catalog_hook.py` (`auto_catalog_scan`)**:
   - Lines 58–63: Maps `image` scan results to catalog item with `type = "image_deepfake"`, extracting `composite_risk_score`, `composite_verdict`, `composite_risk_level`, and `scam_category`.
   - Lines 180–183: Sets `thumbnail_url` to `facial_analysis.annotated_preview_url` (or uploaded file).
   - Lines 196–200: Sets `extracted_iocs` to `{ "phones": ..., "upis": ..., "urls": ... }`.
   - **Observed Gap**: Does not preserve `facial_analysis["faces"]` or `ocr_analysis` inside `fir_dossier` or `extracted_iocs`, causing downstream retrieval by `/fir-pdf` to lose the granular per-face neural scores and OCR text log unless preserved.
3. **`backend/api/db.py` (`get_threat_catalog`)**:
   - Lines 386–400: Filters out IDs starting with `SCAN-`, `JOB-`, `TEST-`, etc.
   - Note: Because real uploads are indexed with `SCAN-` IDs by `auto_catalog_scan`, items indexed via live scanning are currently excluded from the catalog view in `/reported` and `/threat-intelligence/catalog`.

---

## 2. Logic Chain

1. **Decoupled Architecture**: The backend image analysis pipeline (`dual_branch_router.py`) correctly separates fast pre-classification from model inference. This prevents expensive deepfake model runs on pure text documents and prevents OCR failures on pure portraits.
2. **Rich Evidence Representation**: The data structures returned by `process_image_forensics` contain all required evidence for court-admissible forensic reporting:
   - For Face: Bounding boxes `[x, y, w, h]` and normalized coordinates `[nx, ny, nw, nh]`, SBI score, bilateral ocular asymmetry, eyewear specular glare, lip-sync seam, evidence codes (`EVD-EYE-SPECULAR-GLARE`, etc.), and statutory act citations.
   - For Document: OCR engine telemetry, character count, extracted text string, parsed IOC lists (phones, UPIs, URLs, APKs), matched safety rules, and Tavily threat advisories.
   - For Hybrid: Full composition with `max(scam_risk, face_risk)` composite risk score.
3. **Visualization Availability**: Visual evidence is immediately available in two formats:
   - File path on server: `backend/media/images/{scan_id}_annotated.jpg` served at `/api/v1/media/images/...`
   - Inline Data URI: `data:image/jpeg;base64,...` (`annotated_preview_base64`), eliminating asynchronous network dependencies for client-side PDF embedding.
4. **Disparity in PDF Generation**: Both PDF generators (`frontend/lib/pdfReportGenerator.ts` and `backend/api/routes/threat_intel.py`) were originally implemented focusing on Video deepfakes with temporal keyframe anomalies. They currently lack branches for:
   - Branch A (Pure Facial Deepfake): Multi-face evidence table, embedded photographic face crops/annotated preview, and neural metrics breakdown.
   - Branch B (Document Scam / OCR): Formatted OCR text log, categorized IOC table, matched safety rules, and Tavily advisories.
   - Branch C (Hybrid): Two-tier composite dossier displaying both facial deepfake evidence and document scam analysis.
   - Audio Clones: Acoustic spectral flags, duration, and Wav2Vec2 telemetry.
5. **UI Trigger Missing**: `OCRDossier.tsx` and `HybridDossier` lack the 1-click export trigger, while `FacialAnomalyCard.tsx` and `reported/page.tsx` call `generateForensicPDF` with data that gets flattened into the video layout.

---

## 3. Caveats

1. **InsightFace Execution Environment**: On environments where InsightFace / ONNX Runtime dependencies are missing or CPU-constrained, `MultiTierFaceDetector` falls back gracefully to Tier 2 (YCrCb skin locus contour segmentation). While Tier 2 detects face bounding boxes accurately for portraits, Tier 1 is faster and handles oblique angles better.
2. **Local vs Cloud Media Storage**: Annotated images are saved locally to `backend/media/images/`. In local development, `preview_url` resolves via FastAPI static mount. In production on serverless/ephemeral filesystems, the inline `annotated_preview_base64` is essential for zero-dependency PDF rendering.
3. **Catalog Filter Exclusion**: `backend/api/db.py` (line 386) and `frontend/app/reported/page.tsx` (line 74) contain hardcoded filters excluding IDs starting with `SCAN-` to prevent test mocks from showing. Implementation agents should ensure that legitimate user scans are assigned IDs that display properly or adjust the filter condition accordingly.
4. **Client-Side vs Backend PDF Engine**: Frontend uses `jsPDF` (TypeScript, run in-browser), while backend uses `reportlab` (Python, run on server). Both must be maintained in parallel to support both direct 1-click in-browser downloads and server-side `/threat-intelligence/{id}/fir-pdf` REST requests.

---

## 4. Conclusion & Implementation Roadmap

The NETRA Image Forensics engine already generates complete, highly granular data for Branch A (Face), Branch B (Document), and Branch C (Hybrid). The primary development work required is to build the specialized PDF generation templates and connect the 1-click export buttons.

### Recommended Implementation Tasks for Implementation Agents:

#### Task 1: Client-Side PDF Generator Overhaul (`frontend/lib/pdfReportGenerator.ts`)
- Expand `PDFReportData` to accept:
  - `mediaType?: "video" | "image" | "audio" | "text"`
  - `analysisMode?: "pure_face" | "document" | "hybrid" | "inconclusive"`
  - `faces?: FaceEntry[]`
  - `neuralMetrics?: NeuralMetrics`
  - `annotatedImageBase64?: string`
  - `ocrText?: string`
  - `ocrEngine?: string`
  - `matchedRules?: string[]`
  - `audioFlags?: string[]`
  - `audioDuration?: number`
- Implement 4 specialized PDF layout renderers:
  1. **Image Branch A (Pure Face)**:
     - Header & Case Meta with Sec 65B/63 BSA certificate badge.
     - Section 1: Photographic Annotated Visual Evidence (embeds `annotatedImageBase64` with tamper-evident border).
     - Section 2: Multi-Face Neural Metric Scorecard Table (Face ID, Coordinates, Synthetic Probability, Anomaly Zone, Evidence Code).
     - Section 3: Neural Metric Breakdown (SBI Artifact Level, Ocular Reflection Symmetry, Specular Glare Score, Lip-Sync Seam).
     - Section 4: Statutory Legal Provisions (Sec 65B IEA / Sec 63 BSA, Sec 66D IT Act, Sec 318(4) BNS).
  2. **Image Branch B (Document Scam / OCR)**:
     - Section 1: Extracted Document OCR Text Log (formatted monospace bounding box with character and line telemetry).
     - Section 2: Flagged Indicators of Compromise (Phones, UPI Handles, Malicious URLs, Suspicious APKs).
     - Section 3: Safety Checks & Matched Fraud Rules (e.g. Lottery prize fraud, urgency triggers).
     - Section 4: Tavily Live Threat Intelligence Advisories (headlines, URLs, snippets).
  3. **Image Branch C (Hybrid)**:
     - Combines both Section 1/2 (Facial Deepfake Analysis) and Section 3/4 (Document Scam Intelligence) with a unified composite risk header.
  4. **Audio Voice Clone**:
     - Speech duration, sample rate, codec.
     - Acoustic spectral flags (pitch discontinuity, vocoder phase distortion, synthetic harmonic artifacts).
     - Wav2Vec2 voice clone score and Tavily advisory matches.

#### Task 2: Frontend 1-Click Download Button Wiring
- **`OCRDossier.tsx`**: Add a 1-click "Download Court Evidence PDF" button to the footer alongside the Cybercrime reporting link, passing `data` into `generateForensicPDF`.
- **`FacialAnomalyCard.tsx`**: Update existing `handleDownloadPDF` to pass `analysisMode: "pure_face"`, `faces: facial.faces`, and `annotatedImageBase64: facial.annotated_preview_base64`.
- **`MultiModalForensicScanner.tsx`**:
  - In `HybridDossier`, add a top-level composite PDF export button that passes both `facial_analysis` and `ocr_analysis`.
  - In Audio result card, update `handleDownloadAudioPDF` to pass `mediaType: "audio"` with duration and acoustic spectral flags.
- **`reported/page.tsx`**: Update modal PDF download handler to pass `mediaType: activeItem.type` and full extracted IOCs.

#### Task 3: Backend ReportLab FIR PDF Exporter (`backend/api/routes/threat_intel.py`)
- In `download_fir_dossier`, inspect `item.get("type")`:
  - If `type == "image_deepfake"`:
    - Render image preview or face bounding box table from `iocs` or `fir_dossier`.
    - If document text is present in `item.get("extracted_text")` or `iocs`, render Section 3 as Extracted Document Text and IOC Table.
  - If `type == "audio_clone"`:
    - Render acoustic spectral flags and audio duration.
  - Maintain full compliance with Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023.

#### Task 4: Catalog Metadata Hook Enhancement (`backend/netra/services/catalog_hook.py`)
- In `auto_catalog_scan`, ensure `faces` and `ocr_analysis` are preserved in `catalog_entry["fir_dossier"]` so server-side PDF generation has access to the full neural breakdown.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Backend Dual-Branch Routing & Data Models**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
   PYTHONPATH=. venv/bin/pytest tests/test_dual_branch_routing_m10.py -v
   ```
   *Expected Output*: 6/6 tests pass (`test_document_routing_branch_b`, `test_portrait_routing_branch_a`, `test_hybrid_routing_branch_c`, `test_multi_face_detection_and_scoring`, `test_inconclusive_routing_fallback`, `test_endpoint_backward_compatibility`).

2. **Verify Frontend Build & Types**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend
   npm run build
   ```
   *Expected Output*: Next.js build succeeds with 0 errors across all 15 routes.

3. **Inspect Implementation Target Files**:
   - `backend/netra/pipeline/dual_branch_router.py`: Verify lines 548–789 for exact data keys.
   - `frontend/lib/pdfReportGenerator.ts`: Verify lines 6–52 for `PDFReportData` interface.
   - `frontend/components/sandbox/OCRDossier.tsx`: Verify lines 356–378 for missing export button.
   - `frontend/components/sandbox/FacialAnomalyCard.tsx`: Verify lines 382–408 for existing export button call.
   - `backend/api/routes/threat_intel.py`: Verify lines 211–449 for ReportLab FIR PDF implementation.
