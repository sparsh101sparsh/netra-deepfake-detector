# Dispatch for Worker M6: Spatial Anomaly Localization Engine (R1)

## Assigned Role
teamwork_preview_worker

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6

## File Ownership
- **Exclusively Owned File**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py`
- Do NOT modify any other files outside your exclusive ownership.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Files to Read First
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (read under header ## 2026-09-03T20:47:27Z)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md` (read § Interface Contracts § Visual Anomaly Localization Contract)
3. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_1/handoff.md` (read the entire implementation blueprint!)

## Implementation Requirements for `visual_localizer.py`
1. **Fix OpenCV BGR Color Bug**:
   - `AMBER_BGR = (11, 158, 245)` for hex `#f59e0b`.
   - `DARK_BG_BGR = (42, 23, 15)` for hex `#0f172a` (OpenCV uses BGR, not RGB).
2. **Three Landmark Regions Isolation**:
   - Implement dynamic detection/isolation for:
     1. Eyewear Specular Glare Plane (`EVD-EYE-SPECULAR-GLARE`): Upper ocular band, specular highlights on spectacle lenses, high-frequency edge variance.
     2. Iris/Pupil Corneal Reflection Discontinuity (`EVD-IRIS-CORNEAL-DISCONTINUITY`): Bilateral comparison of corneal reflection specular glints/positions between left and right eyes.
     3. Lip-Sync Blending Boundary Artifact (`EVD-LIP-SYNC-BOUNDARY-SEAM`): Perioral mouth boundary seam analysis, Laplacian variance, boundary gradient discontinuities.
   - Autonomous offline CV implementation: YCrCb skin segmentation, bilateral ocular symmetry, perioral Laplacian seams, with robust golden-ratio coordinate projections when upstream face bbox is not supplied. Zero external network downloads.
3. **Bounding Box Coordinates**:
   - Calculate exact 2D pixel bounding box `[x, y, w, h]` clamped to image bounds.
   - Calculate normalized coordinates `[x_norm, y_norm, w_norm, h_norm]`.
4. **Drawing and Badge Rendering**:
   - Render 3px amber `#f59e0b` (`(11, 158, 245)` BGR) border around anomalous region.
   - Render high-contrast dark badge `#0f172a` (`(42, 23, 15)` BGR) with amber border and white text `"ANOMALY DETECTED HERE"` positioned neatly above or inside the bounding box without obstructing facial identity.
5. **Keyframe Filtering & Ranking**:
   - Implement `filter_high_anomaly_keyframes(frames, threshold=0.75, min_frame_gap=10, max_keyframes=3)`:
     Extract frames with anomaly score > 0.75 (>75%), sort descending, enforce temporal spacing (at least `min_frame_gap` frames between selections).
   - If no frames exceed 0.75, provide graceful fallback for top suspicious frames if video is deepfake.
6. **Performance & Exception Shielding**:
   - Wrap internal logic in robust exception handling.
   - Ensure latency is < 200ms per frame (survey measured ~4-15ms).
7. **Verification**:
   - Run unit verification in python using `./venv/bin/python`.
   - Verify all 3 anomaly regions, bounding boxes, annotations, and keyframe filtering.

## Output Requirements
Document verified build and test results in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6/handoff.md`.
Use send_message to notify parent when complete.

## 2026-09-03T20:55:30Z
You are a Worker subagent (teamwork_preview_worker).
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (under header ## 2026-09-03T20:47:27Z) and /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6/DISPATCH.md.

Also read:
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_1/handoff.md (detailed architectural blueprint)

Your exclusive file ownership:
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py

Your mission:
Implement Requirement R1 in visual_localizer.py:
- Fix OpenCV BGR colors: AMBER_BGR = (11, 158, 245), DARK_BG_BGR = (42, 23, 15).
- Implement multi-region isolation for:
  1. Eyewear Specular Glare Plane (EVD-EYE-SPECULAR-GLARE)
  2. Iris/Pupil Corneal Reflection Discontinuity (EVD-IRIS-CORNEAL-DISCONTINUITY)
  3. Lip-Sync Blending Boundary Artifact (EVD-LIP-SYNC-BOUNDARY-SEAM)
- 100% offline classical CV (skin segmentation, bilateral ocular reflection asymmetry, perioral Laplacian seams, golden-ratio fallback).
- Exact 2D bounding boxes [x, y, w, h] and normalized coordinates.
- Amber 3px border and "ANOMALY DETECTED HERE" badge.
- filter_high_anomaly_keyframes method for >75% anomaly frames with temporal diversity.
- Execute unit tests using ./venv/bin/python to verify all regions and functionality.
- Write your final handoff report with verification commands and output to /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6/handoff.md.
Notify parent via send_message when complete.
