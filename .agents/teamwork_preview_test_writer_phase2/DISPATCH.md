# Dispatch for E2E Test Writer: Visual Localization & Forensic PDF

## Assigned Role
teamwork_preview_test_writer

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_test_writer_phase2

## Objective
Design and implement a comprehensive, requirement-driven, opaque-box E2E test suite for NETRA's Visual Keyframe Anomaly Localization and Forensic PDF Generation (Requirements R1-R4).
Publish `TEST_INFRA.md` and `TEST_READY.md` at project root (`/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/`) when complete.

## Authoritative Files to Read First
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (read under header ## 2026-09-03T20:47:27Z)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md`
3. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_1/handoff.md`
4. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_2/handoff.md`
5. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_3/handoff.md`

## Test Scope & Tier Requirements
Design tests across 4 tiers:
- **Tier 1 - Feature Coverage**:
  - R1: Keyframe extraction (>75% score), isolation of 3 landmark regions (eyewear specular glare, iris reflection discontinuity, lip-sync blending seam), 2D bounding boxes `[x, y, w, h]`, semantic anomaly descriptors.
  - R2: Top 2-3 flagged frames, amber `#f59e0b` (`(11, 158, 245)` BGR) border, badge `ANOMALY DETECTED HERE`, persistent snapshot storage in `backend/media/keyframes/`, `annotated_image_url` and `keyframe_snapshots` schema.
  - R3: Side-by-side keyframe snapshot + diagnostic metadata in PDF Section 2, statutory compliance (Sec 65B Indian Evidence Act / Sec 63 BSA, Sec 66D IT Act, Sec 318(4) BNS), backend report endpoint.
  - R4: Execution across 20-video test subset, `pypdfium2` PNG rendering, zero unhandled exceptions, latency < 200ms per frame.
- **Tier 2 - Boundary & Corner Cases**:
  - Extreme aspect ratios, empty/solid color frames, no face detected fallback, exactly 75% boundary threshold, video with 0 frames >75%, video with all frames >75%.
- **Tier 3 - Combinatorial & Pipeline Flow**:
  - Video -> Frame Extraction -> Spatial SBIDetector -> VisualAnomalyLocalizer -> Snapshot Artifacts -> ReportLab PDF -> pypdfium2 PNG rendering.
- **Tier 4 - Real-World 20-Video Test Workload**:
  - Run localization & PDF generation on the 20 deepfake test videos located at `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`.

## Test File to Create
- `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/tests/test_visual_forensics_e2e.py`
- Run command: `./venv/bin/python -m pytest tests/test_visual_forensics_e2e.py -v` (or `./venv/bin/pytest`)

## Completion Artifacts
1. `TEST_INFRA.md` at project root
2. `TEST_READY.md` at project root
3. Handoff report in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_test_writer_phase2/handoff.md`

## 2026-09-03T20:55:30Z

You are an E2E Test Writer subagent (teamwork_preview_test_writer).
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_test_writer_phase2

MANDATORY FIRST STEP:
Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (under header ## 2026-09-03T20:47:27Z) and /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_test_writer_phase2/DISPATCH.md.

Also read:
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_1/handoff.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_2/handoff.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_3/handoff.md

Your mission:
Design and implement the E2E test suite for NETRA's Visual Keyframe Anomaly Localization and Forensic PDF Generation across Tiers 1-4.
Create /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/tests/test_visual_forensics_e2e.py.
Publish:
1. /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/TEST_INFRA.md
2. /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/TEST_READY.md
Write your report to /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_test_writer_phase2/handoff.md and notify parent via send_message when done.

