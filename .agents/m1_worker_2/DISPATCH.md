# TASK ASSIGNMENT: Milestone 1 Worker (Replacement)

## Identity
- Role: teamwork_preview_worker
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_2
- Parent: orchestrator_6

## Context & Interruption Point
Previous worker encountered a platform network timeout.
You are resuming Milestone 1 from the beginning of implementation:
1. `backend/api/routes/audio_detect.py`:
   - Fix line 231 NameError (`file_bytes=audio_bytes` -> `file_bytes=contents`).
   - Enhance `PureSpectralAudioForensics` to extract and return `acoustic_metrics` (Wiener flatness, HF ratio, ZCR variance, RMS prosody variance).
   - Detect codec / container format via magic bytes (`RIFF` -> WAV PCM, `OggS` -> OGG/Opus, `ID3`/`\xff\xfb` -> MP3, `fyp` -> M4A/AAC).
   - Calculate SHA-256 hash of `contents`.
   - Enhance `AudioDetectResponse` and response dict with `speech_duration_seconds`, `sample_rate_hz` (16000), `codec`, `sha256_hash`, `acoustic_metrics`, and `scorecard` (wav2vec2_score, spectral_score, temporal_inconsistency).
   - Synchronize catalog auto-index payload so `threat_catalog.extracted_iocs` persists duration, sample rate, codec, sha256_hash, acoustic_flags, acoustic_metrics, scorecard, and tavily_intel.
2. `backend/api/routes/threat_intel.py`:
   - Update `/threat-intelligence/{threat_id}/fir-pdf` to inspect `media_type = item.get("type")`:
     - When `media_type in ('audio_clone', 'audio')`: render specialized ReportLab layout with technical telemetry (duration, 16kHz SR, codec, SHA-256 in monospace), acoustic spectral flags table (Wiener flatness, HF cutoff, pitch coherence, synthetic prosody), multi-detector voice clone scorecard, Tavily threat advisory & Cybercrime Helpline 1930 / cybercrime.gov.in guidance, and Section 63 BSA 2023 / Section 65B IEA 1872 statutory certificate.
     - When `media_type in ('image_deepfake', 'image')`: render specialized ReportLab layout with visual evidence embedding (resolving Base64 data URI or local image path in `media/images/` or `media/uploads/` or fallback card), Branch A Multi-Face Breakdown table + Neural Biomarkers table, Branch B Document OCR extracted text monospace card + Formatted IOC table (phones, UPIs, URLs, APKs), Branch C Composite layout, and Section 63 BSA 2023 / Section 65B IEA 1872 statutory certificate.
     - Keep video deepfake layout intact for `video_deepfake` / `video`.
3. Verification:
   - Run tests confirming:
     - `POST /api/v1/detect/audio` succeeds, returns new telemetry, and successfully auto-indexes without NameError.
     - `GET /threat-intelligence/{threat_id}/fir-pdf` returns a valid, non-empty, uncorrupted PDF byte stream for audio items, image items (Branch A, B, C), and video items.

## Mandatory Files to Read First
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_1/handoff.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_2/handoff.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3/handoff.md

## Exclusive Write Ownership
- `backend/api/routes/audio_detect.py`
- `backend/api/routes/threat_intel.py`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-04T09:34:20Z
You are the replacement Worker for Milestone 1 (Backend Audio Telemetry & FIR PDF Parity).
Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_2
Task Spec: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_2/DISPATCH.md
Authoritative User Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
PROJECT.md: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md

Explorer Blueprints:
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_1/handoff.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_2/handoff.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3/handoff.md

Exclusive Write Ownership:
- backend/api/routes/audio_detect.py
- backend/api/routes/threat_intel.py

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. backend/api/routes/audio_detect.py: Fix line 231 NameError (pass contents), add acoustic metrics & telemetry, SHA-256 hash, codec detection, and catalog auto-indexing synchronization.
2. backend/api/routes/threat_intel.py: Update /threat-intelligence/{threat_id}/fir-pdf to support type == 'audio_clone' and type == 'image_deepfake' with complete ReportLab layouts, visual evidence embedding, multi-face / OCR tables, helpline guidance, and Section 63 BSA 2023 / Section 65B IEA 1872 certificate.
3. Run verification tests on both endpoints and document results.

Write handoff report to /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_2/handoff.md and notify parent when complete.

## 2026-09-04T09:36:11Z
CRITICAL USER DIRECTIVE:
"Section 63 BSA 2023 / Section 65B IEA 1872 certificate -remove this from the whole project"
1. In `backend/api/routes/threat_intel.py` (and any other backend routes touched):
   - Completely REMOVE the Section 63 BSA 2023 / Section 65B IEA 1872 certificate schedule, paragraphs, and footnote certificates from the ReportLab FIR PDF generators (`/fir-pdf`) for all media types (audio, image, video).
   - Do NOT add any Section 63 BSA or Section 65B certificate schedule or wording.
   - Keep only IT Act 2000 Sec 66D/66E and BNS 2023 Sec 318(4) where penal sections are referenced.
2. In your test assertions, verify that neither "Section 63" nor "Section 65B" appears in the generated PDF text or certificates.
