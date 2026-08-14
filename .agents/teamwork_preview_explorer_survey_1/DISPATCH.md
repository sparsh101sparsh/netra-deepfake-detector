# Dispatch for Explorer Survey 1: Spatial Anomaly Localization Engine (R1)

## Assigned Role
teamwork_preview_explorer

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_1

## Objective
Investigate requirements, architecture, and environment for Requirement R1: Spatial Anomaly Localization Engine (`backend/netra/pipeline/visual_localizer.py`).

## Authoritative Files to Read First
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (read under header ## 2026-09-03T20:47:27Z)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md`

## Specific Areas to Investigate
1. Inspect `backend/netra/pipeline/` - does `visual_localizer.py` exist or need to be created? What pipeline components already exist?
2. Inspect installed vision & face landmark libraries in Python (e.g., OpenCV, MediaPipe, dlib, facenet, or custom landmark heuristics).
3. Investigate how facial landmark regions should be isolated:
   - Eyewear/spectacle specular glare plane (upper facial/eye region, reflection asymmetry/glare)
   - Iris/pupil reflection discontinuities (corneal reflection mismatch between left and right eyes)
   - Lip-sync blending boundaries (mouth/perioral boundary artifacts, blending discontinuities)
4. Coordinate format: exact 2D bounding box coordinates `(x, y, w, h)` (absolute vs normalized pixel coords).
5. Semantic anomaly descriptors to assign (e.g., "Specular Glare Discontinuity [Eyewear]", "Iris Reflection Inconsistency", "Lip-Sync Blending Artifact", etc.).
6. Frame anomaly score thresholding: how frames with generative anomaly score > 0.75 (or > 75%) are identified and prioritized.
7. Performance constraints: keyframe extraction & localization in <200ms per frame.

## Expected Output
Write your comprehensive report to `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_1/handoff.md`.
Include:
- Findings & Architecture overview
- Exact file paths & existing code structure
- Recommended implementation design for `backend/netra/pipeline/visual_localizer.py`
- Risks and dependencies
