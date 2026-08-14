# TASK ASSIGNMENT: Milestone 1 Worker (m1_worker_3)

## Identity
- Role: teamwork_preview_worker
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_3
- Parent: orchestrator_7
- Parent Conversation ID: c4f5bfee-3be1-47dc-be98-179731aeec71

## Scope & Objective
Implement Milestone 1: Backend Audio Telemetry & FIR PDF Parity in `backend/api/routes/audio_detect.py` and `backend/api/routes/threat_intel.py`.

### 1. `backend/api/routes/audio_detect.py`:
- Fix line 231 NameError: `file_bytes=audio_bytes` -> `file_bytes=contents`.
- Enhance `PureSpectralAudioForensics.analyze_audio`:
  Extract and return physical `acoustic_metrics`:
  - `wiener_flatness`: float
  - `hf_cutoff_ratio`: float
  - `zcr_variance`: float
  - `rms_prosody_variance`: float
- Detect codec / container format via magic bytes on `contents`:
  - `RIFF` -> `PCM 16-bit mono` / `WAV`
  - `OggS` -> `OPUS Audio`
  - `ID3` or `\xff\xfb` -> `MP3`
  - `ftyp` -> `M4A/AAC`
  - Fallback based on content type or filename extension.
- Calculate SHA-256 cryptographic hash of `contents` (`hashlib.sha256(contents).hexdigest()`).
- Enhance Pydantic models:
  - Add `sample_rate_hz: int = 16000`
  - Add `codec: str`
  - Add `sha256_hash: str`
  - Add `acoustic_metrics: Optional[Dict[str, float]] = None`
  - Add `scorecard: Optional[Dict[str, float]] = None` (`wav2vec2_score`, `spectral_score`, `temporal_inconsistency`)
- Synchronize catalog auto-index call (`auto_catalog_scan`) so `threat_catalog.extracted_iocs` persists:
  - `duration_seconds`
  - `sample_rate_hz` (16000)
  - `codec`
  - `sha256_hash`
  - `acoustic_flags`
  - `acoustic_metrics`
  - `scorecard`
  - `tavily_threat_intel`

### 2. `backend/api/routes/threat_intel.py`:
- Update `/threat-intelligence/{threat_id}/fir-pdf` to inspect `media_type = item.get("type")`:
  - **Audio Clones (`media_type in ('audio_clone', 'audio')`)**:
    - Render ReportLab layout with:
      - Header: Institutional FIR Dossier banner (National Cyber Crime Reporting Portal / Netra AI).
      - Metadata: Incident ID, Date/Time, Status, Severity badge, Jurisdiction / Source.
      - Media Telemetry: Duration (seconds), Sample Rate (16,000 Hz), Codec, Media SHA-256 Hash.
      - Acoustic Forensics Table: Wiener Spectral Flatness, High-Frequency Cutoff Ratio, Zero Crossing Rate Variance, Temporal RMS Prosody Variance, with observed values, threshold normal ranges, and anomaly flags.
      - Voice Clone Scorecard Table: Wav2Vec2 Synthetic Probability, Spectral Anomaly Score, Composite Verdict.
      - Threat Intelligence Advisory: Tavily verified intelligence summary, matched articles, and statutory reporting advice (National Cybercrime Helpline 1930 & cybercrime.gov.in).
      - Statutory Offenses: Section 66D/66E IT Act 2000, Section 318(4) Bharatiya Nyaya Sanhita (BNS) 2023.
      - CRITICAL USER DIRECTIVE: NO Section 63 BSA 2023 / Section 65B IEA 1872 certificate schedule or wording! Remove any certificate schedule/footnotes completely.
  - **Image Deepfakes (`media_type in ('image_deepfake', 'image')`)**:
    - Support Branch A (Pure Face), Branch B (Document OCR), Branch C (Hybrid):
      - Visual Evidence: Embed detected face annotated crops or image preview (resolving base64 data URI or file path). If not available, render clean structured diagnostic placeholder.
      - Branch A: Multi-face breakdown table (`face_id`, `bbox`, `fake_probability`, `verdict`, `risk_level`, `anomaly_region`), neural metrics table (SBI artifact level, ocular reflection symmetry, eyewear specular score, lip-sync Laplacian score).
      - Branch B: Document OCR extracted text block (monospace card), IOC tables (Phones, UPI IDs, URLs, APKs), RapidOCR telemetry, matched scam rules.
      - Branch C: Composite layout with both facial authenticity and OCR scam analysis.
      - Statutory Offenses: Section 66D/66E IT Act 2000, Section 318(4) BNS 2023.
      - CRITICAL USER DIRECTIVE: NO Section 63 BSA 2023 / Section 65B IEA 1872 certificate schedule or wording!
  - **Video Deepfakes (`media_type in ('video_deepfake', 'video')`)**:
    - Keep existing keyframe anomaly localization layout working cleanly, but remove any Section 65B/63 certificate footnote or schedule per user directive.

### 3. Verification Commands:
- Execute python test script or pytest verifying:
  - `POST /api/v1/detect/audio` returns full telemetry and successfully indexes into catalog without NameError.
  - `GET /threat-intelligence/{threat_id}/fir-pdf` produces valid, uncorrupted PDF byte streams for audio, image (A, B, C), and video.
  - Assert that string "Section 63" and "Section 65B" DO NOT appear in generated PDF text.
  - Existing test suite passes with zero regressions.

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

## Handoff Requirements
Write your detailed handoff report to:
`/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_worker_3/handoff.md`
Include:
- Files modified
- Implementation details
- Test commands run and exact outputs
- Confirmation that Section 65B/63 certificates were removed
- Then send a completion message to parent.
