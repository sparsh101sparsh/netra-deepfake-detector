# TASK ASSIGNMENT: M1 Explorer 1 (Audio Route Telemetry)

## Identity
- Role: teamwork_preview_explorer
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_1
- Parent: orchestrator_6

## Mission
Formulate the exact implementation plan for `backend/api/routes/audio_detect.py` to:
1. Fix line 231 bug (`file_bytes=audio_bytes` -> `file_bytes=contents`).
2. Enrich `AudioDetectResponse` and response dict with full telemetry:
   - `speech_duration_seconds`
   - `sample_rate_hz` (16000)
   - `codec` ("PCM 16-bit mono" or detected audio container)
   - `sha256_hash` (hex digest of uploaded audio bytes)
   - `acoustic_metrics` (wiener_flatness, hf_cutoff_ratio, zcr_variance, rms_prosody_variance)
   - `scorecard` (wav2vec2_score, spectral_score, temporal_inconsistency)
3. Ensure catalog auto-index hook stores all these fields in `extracted_iocs` of `threat_catalog`.

## Required Readings
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md
- backend/api/routes/audio_detect.py
- backend/netra/services/catalog_hook.py

## Deliverable
Write `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_1/handoff.md` with exact diff/code modifications, verification tests, and rationale.

## 2026-09-04T09:16:16Z
Formulate implementation plan for backend/api/routes/audio_detect.py:
1. Fix line 231 file_bytes=audio_bytes NameError bug (pass contents).
2. Add full acoustic telemetry to response and catalog item (duration, 16kHz SR, codec, sha256_hash, wiener_flatness, hf_cutoff_ratio, zcr_variance, rms_prosody_variance, multi-detector scorecard).
Write complete handoff report to /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_1/handoff.md and notify parent.

