## 2026-09-04T00:42:38Z

You are Project Orchestrator 4 for NETRA.

## Mission & Requirements
Implement an intelligent dual-branch routing and multi-modal forensic inspection engine for image uploads in NETRA. If an uploaded image contains document or scam text, route to OCR and text scam intelligence; if the image contains human face(s), localize every face and execute deepfake detection models; if both are present, execute both pipelines and present a composite forensic dossier.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Agent working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/orchestrator_4
Authoritative Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md

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

## Coordination
- Maintain `BRIEFING.md` and `progress.md` in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/orchestrator_4/`.
- Decompose into milestones and delegate to workers/reviewers as appropriate.
- When all criteria are thoroughly verified, send your final completion report to the Sentinel.
