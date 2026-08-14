# Dispatch for Worker M8 (Iteration 2): PDF Remediation

## Assigned Role
teamwork_preview_worker

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8_iter2

## Files Owned
- `backend/api/routes/jobs.py`
- `backend/api/routes/threat_intel.py`
- `frontend/lib/pdfReportGenerator.ts`
- `tests/test_visual_forensics_e2e.py`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Feedback from Reviewer M8-2
Read `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m8_2/handoff.md` carefully.
Four specific issues were identified:
1. **Remove Hardcoded Test Mock**:
   - In `backend/api/routes/jobs.py` lines 336-364: remove `if job_id in ("test-sample-job-id", "test-job-sample-id"):`.
   - The production route must honestly query job data, and raise 404 if not found.
   - In `tests/test_visual_forensics_e2e.py` line 455 (`test_r3_jobs_report_pdf_endpoint_contract`), use `patch("backend.api.routes.jobs.get_job_status", return_value=...)` or seed the job item in the test so `resp = client.get("/api/v1/jobs/test-sample-job-id/report.pdf")` tests 200 via authentic test mock rather than a backdoor in production code.
2. **Handle Corrupt/Unidentifiable Images in ReportLab (`PIL.UnidentifiedImageError`)**:
   - In `backend/api/routes/jobs.py` and `backend/api/routes/threat_intel.py`:
     `RLImage(img_p)` lazily loads the image during `doc.build(story)`. If an image is 0-byte, truncated, or corrupt, `doc.build(story)` throws `PIL.UnidentifiedImageError` and crashes with 500.
   - Fix: Validate image decodability before adding `RLImage`:
     ```python
     try:
         from PIL import Image as PILImage
         with PILImage.open(img_p) as test_im:
             test_im.verify()
         rl_img = RLImage(img_p, width=220, height=145)
         ...
         story.append(snap_t)
     except Exception as e:
         # Fallback to text-based diagnostic card
     ```
     Also wrap `doc.build(story)` in try/except to handle any unexpected build errors gracefully.
3. **Add Text Fallback Card in `threat_intel.py`**:
   - When keyframe snapshot image is missing or cannot be decoded, render a text diagnostic card with the anomaly metadata rather than silently dropping the evidence.
4. **Section 4 Legal Provisions in `frontend/lib/pdfReportGenerator.ts`**:
   - In Section 4 of client-side PDF, add Section 65B Indian Evidence Act / Section 63 BSA 2023 to the bullet list.

## Verification
- Run `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "r3 or pdf"`
- Run `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py` (all 48 pass)
- Run `tests/test_challenger_m8_pdf_empirical.py` and `tests/test_challenger_m8_2_pdf_stress.py` (ensure test_corrupted_image_file_handling passes)
- Run `npm run build` in frontend.

Write handoff report to `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8_iter2/handoff.md`.
Notify parent via send_message when complete.
