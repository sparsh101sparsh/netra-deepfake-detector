# Dispatch for Worker M8 (Iteration 2 Remediation)

## Assigned Role
teamwork_preview_worker

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8_iter3

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
You are remediating Milestone 8 (Requirement R3: Court-Ready Forensic PDF Report Enhancement) based on Explorer reports and Reviewer M8-2's feedback.
Read these files first:
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md`
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md`
3. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m8_2/handoff.md`
4. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_m8_iter2_1/handoff.md`
5. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_m8_iter2_2/handoff.md`
6. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_m8_iter2_3/handoff.md`

## Files You Exclusively Own
- `backend/api/routes/jobs.py`
- `backend/api/routes/threat_intel.py`
- `frontend/lib/pdfReportGenerator.ts`
- `frontend/lib/api.ts`
- `frontend/app/analyze/[jobId]/page.tsx`
- `worker/worker.py`
- `tests/test_e2e_directives.py`

## Action Items
1. **ReportLab Image Validation Hardening**:
   - In `backend/api/routes/jobs.py` (around line 482) and `backend/api/routes/threat_intel.py` (around line 287):
     - Use `if img_p and os.path.isfile(img_p) and os.path.getsize(img_p) > 0:`
     - Pass `lazy=0` to `RLImage`: `rl_img = RLImage(img_p, width=220, height=145, lazy=0)`.
     - Ensure the 520pt text evidence card fallback handles any failure cleanly.
2. **Statutory & Layout Alignment in `frontend/lib/pdfReportGenerator.ts`**:
   - Header subtitle: Include Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023.
   - Footer digital seal: Include certification under Section 65B / Section 63 BSA.
   - Eliminate section number collisions (dynamic section indexing).
   - Expand `generateForensicPDF` to be `async`, support resolving image URL to base64, and render an amber `#f59e0b` forensic fallback box if image fetch is unavailable or fails.
3. **Type Safety & Payload Enrichment**:
   - In `frontend/lib/api.ts`, declare `KeyframeSnapshot` interface and add `keyframe_snapshots?: KeyframeSnapshot[]` to `DetectionResult`.
   - In `frontend/app/analyze/[jobId]/page.tsx`, pass `keyframeSnapshots` cleanly without `any` casts.
   - In `worker/worker.py`, include `"detector_subsystem": snap["detector_subsystem"]` in `frames_payload`.
4. **Test Fixture Seeding in `tests/test_e2e_directives.py`**:
   - In `test_directive_4_forensic_pdf_reports` (line 346), call `save_local_job({"job_id": "test-job-sample-id", ...})` so that test suite passes honestly against production code without route mocks.
5. **Run Verification Commands**:
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -v`
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_challenger_m8_pdf_empirical.py -v`
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_challenger_m8_2_pdf_stress.py -v`
   - `PYTHONPATH=. ./venv/bin/pytest tests/test_e2e_directives.py -v`
   - In `frontend/`: `npx tsc --noEmit`
   - Document all commands and results in your `handoff.md`.

## 2026-09-04T04:14:45Z
You are Worker M8 (Iteration 2 Remediation).
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8_iter3
Read your dispatch instructions in: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8_iter3/DISPATCH.md
MANDATORY: You must read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md and /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md before beginning.
Also read the 3 Explorer reports and Reviewer M8-2 handoff.
Execute the 4-step remediation plan outlined in your DISPATCH.md.
