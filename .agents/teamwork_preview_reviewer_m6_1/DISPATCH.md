# Dispatch for Reviewer M6-1

## Assigned Role
teamwork_preview_reviewer

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m6_1

## Objective
Independently review the implementation of Milestone 6 / Requirement R1 in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py`.
Verify correctness, code quality, edge cases, interface compliance with `PROJECT.md`, and run tests.

## Authoritative Files to Read First
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (read under header ## 2026-09-03T20:47:27Z)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md` (§ Interface Contracts § Visual Anomaly Localization Contract)
3. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6/handoff.md`
4. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py`

## Review Tasks
1. Inspect `backend/netra/pipeline/visual_localizer.py`. Verify:
   - OpenCV colors: `AMBER_BGR = (11, 158, 245)` for `#f59e0b`, `DARK_BG_BGR = (42, 23, 15)` for `#0f172a`.
   - All 3 facial landmark regions isolated: eyewear specular glare (`EVD-EYE-SPECULAR-GLARE`), iris/pupil reflection discontinuity (`EVD-IRIS-CORNEAL-DISCONTINUITY`), lip-sync blending boundaries (`EVD-LIP-SYNC-BOUNDARY-SEAM`).
   - Coordinate format: exact 2D pixel `[x, y, w, h]` and normalized coordinates.
   - Forensic badge: 3px amber border and high-contrast badge `"ANOMALY DETECTED HERE"` without identity obstruction.
   - `filter_high_anomaly_keyframes` logic for >75% anomaly frames with temporal separation and fallback.
2. Execute tests in `./venv/bin/python` to verify code compiles, runs, and satisfies latency < 200ms per frame.
3. Determine verdict: `APPROVE` or `REQUEST_CHANGES`.

Write your handoff report to `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m6_1/handoff.md`.
Notify parent via send_message.

## 2026-09-03T20:59:04Z

You are Reviewer M6-1 (teamwork_preview_reviewer).
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m6_1

MANDATORY FIRST STEP:
Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (under header ## 2026-09-03T20:47:27Z) and /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m6_1/DISPATCH.md.

Review /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py and /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m6/handoff.md.
Run tests in ./venv/bin/python to verify code execution, correctness, and performance.
Record your verdict (APPROVE or REQUEST_CHANGES) in /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m6_1/handoff.md and send_message to parent when complete.
