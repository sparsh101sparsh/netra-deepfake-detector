# BRIEFING — 2026-09-04T00:49:00Z

## Mission
Investigate face localization, spatial deepfake detection (EfficientNet-B4 + SBI), and visual anomaly localizer in NETRA backend/worker for image dual-branch routing (Branch A Pure Face, Branch C Hybrid), multi-face scoring, and annotated preview generation.

## 🔒 My Identity
- Archetype: explorer
- Roles: Codebase Investigator (Face Detection & Spatial/Visual Anomaly Forensics)
- Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_2
- Original parent: 723b76f6-32ae-4c03-9b1d-41af1fd93738
- Milestone: Intelligent Dual-Branch Routing & Multi-Face Deepfake Forensics Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes in source code
- Produce self-contained handoff.md with 5 components (Observation, Logic Chain, Caveats, Conclusion, Verification Method)
- Adhere to Teamwork protocol, send message to parent on completion

## Current Parent
- Conversation ID: 723b76f6-32ae-4c03-9b1d-41af1fd93738
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `backend/netra/pipeline/face_aligner.py` (Haar cascades, single face selection, margin padding)
  - `backend/netra/pipeline/detectors/spatial.py` (SpatialSBIDetector, EfficientNet-B4 + SBI, spatial_model_best.pth)
  - `backend/netra/pipeline/visual_localizer.py` (VisualAnomalyLocalizer, skin segmentation, ocular/glare/lip metrics, amber/green badges)
  - `backend/api/routes/detect.py` & `backend/api/routes/public_api.py` (Image detection endpoints)
  - `backend/netra/services/ocr_scam_pipeline.py` (RapidOCR, IOC extraction, ScamDetector)
  - `worker/worker.py` (Keyframe extraction & visual localization)
  - `frontend/components/sandbox/MultiModalForensicScanner.tsx` & `OCRDossier.tsx` (Client ingestion and rendering)
- **Key findings**:
  - `spatial_model_best.pth` (68MB) is verified present in repo root and loaded on MPS device.
  - In OpenCV 5.0.0.93 wheel, `cv2.CascadeClassifier` is missing, but embedded `insightface` with `buffalo_l` ONNX models in `LivePortrait/pretrained_weights/insightface` is 100% operational (~102ms), and classical YCrCb skin contour segmentation is fully operational (~14ms).
  - RapidOCR is operational via `rapidocr_onnxruntime` (~44ms).
  - Total pure face pipeline execution is ~128ms (<200ms requirement).
  - Multi-face detection, margin cropping, per-face scoring, composite risk scoring, and color-coded bounding box annotation are fully feasible and designed.
- **Unexplored areas**: None. All 6 tasks investigated and verified empirically.

## Key Decisions Made
- Recommend tiered multi-face detector: InsightFace ONNX -> Morphological YCrCb skin contour segmentation.
- Recommend standalone RapidOCR density check without cascading into slow fallbacks on pure face photos.
- Defined complete JSON response contract and visual annotation protocol.

## Artifact Index
- handoff.md — Comprehensive forensic investigation report
- progress.md — Heartbeat and status log
