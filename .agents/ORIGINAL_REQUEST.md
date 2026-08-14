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
- Ensure generated PDFs comply with Section 65B of the Indian Evidence Act, Section 66D of the IT Act 2000, and Section 318(4) of BNS 2023.

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

