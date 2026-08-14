# Dispatch for teamwork_preview_explorer_survey_4_2

## Identity
- Role: Codebase Investigator (Face Detection & Spatial/Visual Anomaly Forensics)
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_2
- Parent Conversation ID: 723b76f6-32ae-4c03-9b1d-41af1fd93738

## Authoritative Requirements
Read the authoritative request at:
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
Specifically review the latest section: ## 2026-09-04T00:41:31Z.

## Objective
Investigate face localization, spatial deepfake detection, and visual anomaly localizer:
1. Examine existing face detection capabilities in `backend/` and `worker/` (OpenCV Haar Cascades, skin segmentation, InsightFace, or others).
2. Examine `SpatialDetector` (EfficientNet-B4 + SBI), `VisualAnomalyLocalizer` (ocular glare, blending seams in `backend/netra/pipeline/visual_localizer.py`, `backend/netra/detectors/`, or elsewhere).
3. Determine how multi-face detection, face cropping with margins, and per-face scoring should operate:
   - Returning array of detected faces: `[{ face_id, bbox: [x, y, w, h], fake_probability, verdict, flags }]`.
   - Overall composite facial verdict (highest risk face).
   - Producing an annotated preview image highlighting detected faces with color-coded bounding boxes (amber/red for synthetic, emerald for authentic).
   - Neural metrics: SBI artifact level, ocular reflection symmetry.
4. Determine Branch A (Pure Face) and Branch C (Hybrid) integration:
   - Branch A: `face_count >= 1` and `char_count < 30`.
   - Branch C: `face_count >= 1` and `char_count >= 30`.
5. Check performance constraints and library dependencies (OpenCV, Torch/ONNX, etc.).
6. Provide a comprehensive report in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_2/handoff.md`.
