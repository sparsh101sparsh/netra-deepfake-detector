# Dispatch for teamwork_preview_worker_m10

## Identity
- Role: Backend Forensics Worker (Dual-Branch Routing & Multi-Face Forensics)
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m10
- Parent Conversation ID: 723b76f6-32ae-4c03-9b1d-41af1fd93738

## Authoritative Requirements & Inputs
- Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-04T00:41:31Z).
- Read PROJECT.md at /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md.
- Read Explorer 1's report: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_1/handoff.md
- Read Explorer 2's report: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_2/handoff.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Ownership
You exclusively own:
- `backend/netra/pipeline/dual_branch_router.py` (new module)
- `backend/api/routes/detect.py` (endpoint wiring)
- `backend/netra/services/catalog_hook.py` (catalog integration updates if needed)
- `backend/media/images/` (directory creation for annotated output)
DO NOT modify frontend files or unrelated test files.

## Detailed Objectives
1. Implement `backend/netra/pipeline/dual_branch_router.py`:
   - Multi-face detection:
     - Tier 1: InsightFace `buffalo_l` (from `LivePortrait/src/utils/dependencies` and `LivePortrait/pretrained_weights/insightface/models/buffalo_l`).
     - Tier 2: Skin-color segmentation in YCrCb (`133 <= Cr <= 173`, `77 <= Cb <= 127`) with morphological operations and contour filtering.
   - Text density check via standalone RapidOCR ONNX (`char_count = len(full_text.strip())`).
   - Branch routing:
     - Branch A (Pure Face): `face_count >= 1` and `char_count < 30`.
     - Branch B (Document): `char_count >= 30` and `face_count == 0`.
     - Branch C (Hybrid): `face_count >= 1` and `char_count >= 30`.
     - Inconclusive fallback: `face_count == 0` and `char_count < 30`.
   - Multi-face extraction & scoring:
     - 15% margin cropping per face.
     - Pass crops to `SpatialSBIDetector` (`backend/netra/pipeline/detectors/spatial.py`).
     - Pass crops to `VisualAnomalyLocalizer` (`backend/netra/pipeline/visual_localizer.py`).
     - Compute neural metrics: `sbi_artifact_level`, `ocular_reflection_symmetry`, `eyewear_specular_score`, `lip_sync_laplacian_score`.
     - Score each face: `[{ face_id, bbox: [x, y, w, h], normalized_bbox: [nx, ny, nw, nh], fake_probability, verdict, flags, neural_metrics, anomaly_region, evidence_code }]`.
     - Composite face verdict: highest risk face ID, max fake probability, overall facial verdict.
   - Color-coded annotated preview:
     - 3px bounding box: Amber `#f59e0b` (BGR `(11, 158, 245)`) if `fake_probability >= 0.65`, Emerald `#10b981` (BGR `(129, 185, 16)`) if `fake_probability < 0.65`.
     - Dark `#0f172a` badge with high-contrast text (`FACE #i: SYNTHETIC (X%)` or `FACE #i: AUTHENTIC (X%)`).
     - Save to `backend/media/images/{scan_id}_annotated.jpg` and produce base64 data URI preview in response.
   - OCR & Scam Pipeline execution:
     - Integrate `extract_text_from_image`, `extract_iocs_from_text`, `ScamDetector`, and `cross_check_scam_with_tavily`.
   - Composite risk score:
     - `composite_risk_score = max(scam_risk, int(max_face_fake_prob * 100))`.
     - Set `composite_verdict` and `composite_risk_level`.
   - Threat catalog hook: Ensure `auto_catalog_scan` is invoked with proper media type.
2. In `backend/api/routes/detect.py`:
   - Route both `/detect/image-ocr` and `/detect/image` to the dual-branch router `process_image_forensics`.
   - Maintain 100% backward-compatible keys (`status`, `ocr_analysis`, `scam_analysis`, `extracted_iocs`, `recommendation`, `tavily_threat_intel`) so existing OCR tests pass without regression.
3. Verification:
   - Run verification scripts on `file-JXAGnmm9Vl.png` to ensure OCR scam detection passes with 100% accuracy.
   - Run verification on portrait image (`LivePortrait/assets/examples/source/s0.jpg` or similar) to ensure Branch A runs and returns facial analysis.
   - Run verification on synthetic hybrid image (face + text) to ensure Branch C returns both.
   - Run unit tests: `./venv/bin/pytest tests/test_master_backend_validation.py -v`.
   - Record all verification commands and outputs in `handoff.md`.

## 2026-09-04T00:49:47Z
You are teamwork_preview_worker_m10.
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m10
Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-04T00:41:31Z).
Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md.
Read your DISPATCH.md at /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m10/DISPATCH.md.
Read Explorer 1's report at /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_1/handoff.md and Explorer 2's report at /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_2/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You exclusively own:
- backend/netra/pipeline/dual_branch_router.py
- backend/api/routes/detect.py
- backend/netra/services/catalog_hook.py
- backend/media/images/

Implement Milestone 10: Backend Intelligent Dual-Branch Routing & Multi-Face Forensics Engine.
1. Create backend/netra/pipeline/dual_branch_router.py with multi-tier face detection (InsightFace buffalo_l + YCrCb skin contour fallback), RapidOCR standalone text density check, routing (Branch A: Pure Face, Branch B: Document, Branch C: Hybrid), 15% margin cropping, SpatialSBIDetector inference, VisualAnomalyLocalizer ocular/lip anomaly scoring, neural metrics (sbi_artifact_level, ocular_reflection_symmetry, eyewear_specular, lip_sync_laplacian), color-coded annotated preview image generation (amber/red #f59e0b/#ef4444 for synthetic, emerald #10b981 for authentic) saved to backend/media/images/ and returned as base64 data URI, and composite risk scoring max(scam_risk, int(max_fake_prob * 100)).
2. Update backend/api/routes/detect.py to route both /detect/image-ocr and /detect/image through the dual-branch router, preserving full backward compatibility.
3. Test your work with Python test scripts on document (file-JXAGnmm9Vl.png), portrait (s0.jpg), and hybrid images.
4. Run existing tests: ./venv/bin/pytest tests/test_master_backend_validation.py -v.
5. Write your complete handoff report to /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m10/handoff.md.
6. When done, send a message using send_message to your parent with the handoff path.
