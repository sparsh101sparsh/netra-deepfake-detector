# Dispatch for Worker M9 (Automated Visual Verification & 20-Video Benchmark Suite R4)

## Assigned Role
teamwork_preview_worker

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m9

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
You are executing Milestone 9 (Requirement R4: Automated Visual Verification & 20-Video Benchmark Suite).
Read these files first:
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (specifically ## 2026-09-03T20:47:27Z §R4 and Acceptance Criteria)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md`
3. Benchmark dataset location: `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`

## Files You Own
- `tests/test_benchmark_20_videos.py` (or benchmark runner script under `tests/`)
- `PROJECT.md` (update milestone status table: M8 COMPLETE, M9 COMPLETE)
- Any media or output artifacts under `backend/media/keyframes/` and `tests/artifacts/`

## Requirements to Execute & Verify
1. **20-Video Deepfake Benchmark Execution**:
   - Select 20 real deepfake test videos from `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`.
   - Run the visual localization and worker analysis pipeline on each video.
   - Verify top 2-3 keyframe snapshots are localized, annotated with amber `#f59e0b` bounding box and `ANOMALY DETECTED HERE` badge, and saved to `backend/media/keyframes/`.
2. **Court-Ready PDF Generation & Rasterization**:
   - Generate official forensic PDF reports for each of the 20 benchmark runs.
   - Render the generated PDF evidence pages to high-resolution PNG images using `pypdfium2` (scale >= 2, ensuring dimensions >1000 x >1400 pixels).
   - Save rendered PNG preview images to an artifacts directory (e.g. `tests/artifacts/benchmark_rendered_pages/`).
3. **Acceptance Criteria Verification**:
   - **Zero unhandled exceptions** across batch processing of all 20 videos.
   - **Latency verification**: Keyframe extraction, spatial localization, and bounding box drawing completes in **<200ms per frame** (measure and record mean, median, min, max, and p99 latency).
   - **Visual integrity**: Verify bounding boxes render amber `#f59e0b` accent border, high-contrast forensic badge, and side-by-side diagnostic metadata table.
4. **Scope Document Update**:
   - Update `PROJECT.md` milestone table to reflect M8 COMPLETE and M9 COMPLETE.
5. **Run Verification Commands**:
   - Run your benchmark test suite: `PYTHONPATH=. ./venv/bin/pytest tests/test_benchmark_20_videos.py -v`
   - Run full regression suite:
     - `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -v`
     - `PYTHONPATH=. ./venv/bin/pytest tests/test_challenger_m8_pdf_empirical.py -v`
     - `PYTHONPATH=. ./venv/bin/pytest tests/test_challenger_m8_2_pdf_stress.py -v`
     - `PYTHONPATH=. ./venv/bin/pytest tests/test_e2e_directives.py -v`
   - In `frontend/`: `npx tsc --noEmit`
   - Document all measurements, latency tables, rendered image paths, and test outputs in `handoff.md`.

## 2026-09-03T22:56:01Z
You are Worker M9.
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m9
Read your dispatch instructions in: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m9/DISPATCH.md

MANDATORY: You must read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md and /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md before beginning.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
1. Execute the 20-video benchmark test suite across real deepfake videos from `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`.
2. Extract keyframes, run spatial anomaly localization, generate keyframe snapshots with amber `#f59e0b` border and `ANOMALY DETECTED HERE` badge, save to `backend/media/keyframes/`.
3. Generate court-ready forensic PDFs for each video run, and rasterize PDF pages to high-resolution PNG using `pypdfium2` (scale >= 2, >1000 x >1400 px) in `tests/artifacts/benchmark_rendered_pages/`.
4. Assert: 0 unhandled exceptions, latency < 200ms per frame (measure mean, p99, max), amber border #f59e0b, forensic badge, and side-by-side table.
5. Update `PROJECT.md` milestone status table: M8 COMPLETE, M9 COMPLETE.
6. Run all tests:
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_benchmark_20_videos.py -v`
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -v`
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_challenger_m8_pdf_empirical.py -v`
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_e2e_directives.py -v`
   - `cd frontend && npx tsc --noEmit`
Document all measurements, commands, latency metrics, and test outputs in `handoff.md`, and notify me via send_message.
