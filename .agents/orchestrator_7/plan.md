# Execution Plan — orchestrator_7

## Project Objective
Deliver full institutional, court-admissible forensic PDF analysis reports across NETRA for:
- Audio Voice Clone (acoustic metrics, spectral flags, duration, Wav2Vec2 score, Tavily cross-check)
- Image Manipulation (Branch A Pure Face with multi-face table, Branch B Document OCR with IOCs & scam analysis, Branch C Hybrid with composite dossier)
Strictly eliminate any Section 63 BSA 2023 / Section 65B IEA 1872 certificate schedules per user directive.

## Milestone Plan

### Milestone 1: Backend Audio Telemetry & FIR PDF Parity
- Files: `backend/api/routes/audio_detect.py`, `backend/api/routes/threat_intel.py`
- Scope:
  1. Fix line 231 NameError (`file_bytes` -> `audio_bytes`) and add audio telemetry (duration, 16kHz SR, codec detection, SHA-256 hash, Wiener flatness, HF cutoff, ZCR variance, RMS prosody variance, Tavily threat intel).
  2. Implement ReportLab FIR PDF layouts for `type == 'audio_clone'` and `type == 'image_deepfake'` (Branch A, B, C) in `/threat-intelligence/{id}/fir-pdf`.
  3. Ensure zero presence of Section 63 BSA / Section 65B IEA certificate text.
  4. Run tests and verify uncorrupted PDF output.
- Gate: Worker -> 2 Reviewers -> 2 Challengers -> Forensic Auditor.

### Milestone 2: Client-Side Forensic PDF Generator Engine
- Files: `frontend/lib/pdfReportGenerator.ts`
- Scope:
  1. Expand `PDFReportData` interface and jsPDF layout routines.
  2. Add dedicated sections:
     - Pure Face: Multi-face table, bounding boxes, neural metrics (SBI, ocular reflection, specular glare).
     - Document OCR: Extracted text preview, IOC tables (Phones, UPIs, URLs), matched safety rules, Tavily advisory.
     - Audio Voice Clone: Speech duration, sample rate, codec, acoustic spectral flags, Wav2Vec2/spectral scorecard.
     - Hybrid: Integrated dual-section layout.
  3. Strict removal of Section 63 BSA / Section 65B IEA certificates.
  4. Ensure zero external network blocking (base64 image embedding, fallback handling).
- Gate: Worker -> 2 Reviewers -> 2 Challengers -> Forensic Auditor.

### Milestone 3: UI 1-Click Export Touchpoints & Parity
- Files:
  - `frontend/components/sandbox/OCRDossier.tsx` (Add 1-click Download Forensic PDF button)
  - `frontend/components/sandbox/FacialAnomalyCard.tsx` (Fix 0-1 vs 0-100 anomaly scale bug, pass multi-face details & base64 preview)
  - `frontend/components/sandbox/MultiModalForensicScanner.tsx` (Wire Audio & Hybrid PDF export with full telemetry)
  - `frontend/app/reported/page.tsx` (Inspect modality `type` and route to specialized PDF generator or backend FIR PDF)
- Gate: Worker -> 2 Reviewers -> 2 Challengers -> Forensic Auditor.

### Milestone 4: Dual Track E2E Verification & Adversarial Hardening
- Test Suites:
  - Frontend `npm run build` succeeds with zero TypeScript errors.
  - Backend test suites pass (`pytest`).
  - Generate sample PDFs for all modalities (Audio, Pure Face, OCR Document, Hybrid) from both frontend and backend.
  - Verify PDFs are uncorrupted, valid byte streams, and visually complete.
  - Adversarial audit confirming no 65B/63 certificates exist anywhere in generated PDFs or code.
- Gate: Worker -> Reviewers -> Challengers -> Final Forensic Auditor.
