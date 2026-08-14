# TASK ASSIGNMENT: Milestone 1 Reviewer 1

## Identity
- Role: teamwork_preview_reviewer
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_reviewer_1
- Parent: orchestrator_7
- Parent Conversation ID: c4f5bfee-3be1-47dc-be98-179731aeec71

## Scope & Objective
Perform high-reliability review of the Milestone 1 changes in `backend/api/routes/audio_detect.py` and `backend/api/routes/threat_intel.py`.

### Context & References:
- Authoritative User Request: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (Sections ## 2026-09-04T09:07:13Z and ## 2026-09-04T15:03:38+05:30)
- Master Plan: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md`
- Worker Handoff: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_3/handoff.md`

### Verification Checklist:
1. `backend/api/routes/audio_detect.py`:
   - Verify line 370 NameError fix (`file_bytes=contents`).
   - Verify physical acoustic metrics extraction in `PureSpectralAudioForensics.analyze_audio` (Wiener flatness, HF cutoff ratio, ZCR variance, RMS prosody variance).
   - Verify magic-byte codec identification (`RIFF` -> WAV, `OggS` -> OPUS, `ID3` -> MP3, `ftyp` -> AAC, WebM).
   - Verify SHA-256 media hashing on raw bytes.
   - Verify Pydantic response model parity (`sample_rate_hz=16000`, `codec`, `sha256_hash`, `acoustic_metrics`, `scorecard`).
   - Verify catalog auto-index synchronization (`auto_catalog_scan`).
2. `backend/api/routes/threat_intel.py`:
   - Verify modality routing in `/threat-intelligence/{threat_id}/fir-pdf` for `audio_clone`, `image_deepfake` (Branch A, B, C), and `video_deepfake`.
   - Verify ReportLab layout for audio clones (Acoustic telemetry, spectral flags table, voice clone scorecard, Tavily advisory, Helpline 1930 guidance).
   - Verify ReportLab layout for image deepfakes (Branch A multi-face table & neural metrics, Branch B document OCR text card & IOC table, Branch C composite).
   - CRITICAL USER DIRECTIVE: Confirm Section 63 BSA 2023 / Section 65B IEA 1872 certificates are completely removed from both files and all generated PDFs.
3. Run tests:
   - `PYTHONPATH=. /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/venv/bin/python -m pytest tests/test_fir_pdf_modalities.py -v`
   - `PYTHONPATH=. /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/venv/bin/python -m pytest tests/test_dual_branch_routing_m10.py -v`

### Handoff Requirements:
Write your report to `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_reviewer_1/handoff.md` with an explicit verdict: `APPROVE` or `REQUEST_CHANGES`, and notify parent via `send_message`.

## 2026-09-04T10:00:18Z
You are Milestone 1 Reviewer 1 (m1_reviewer_1).
Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_reviewer_1
Assignment spec: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_reviewer_1/DISPATCH.md
Read:
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_3/handoff.md
Review backend/api/routes/audio_detect.py and backend/api/routes/threat_intel.py.
Verify line 370 NameError fix, physical acoustic metrics, magic byte codec detection, SHA-256 hashing, Pydantic models, catalog indexing, ReportLab layouts for audio and image (Branch A, B, C), and strict removal of Section 63 BSA / Section 65B IEA certificates.
Run tests and deliver your verdict (APPROVE or REQUEST_CHANGES) in your handoff.md, then notify parent via send_message.

