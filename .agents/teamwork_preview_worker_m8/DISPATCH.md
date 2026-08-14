# Dispatch for Worker M8: Court-Ready Forensic PDF Report Enhancement (R3)

## Assigned Role
teamwork_preview_worker

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8

## File Ownership
- `backend/api/routes/threat_intel.py`
- `backend/api/routes/jobs.py`
- `frontend/lib/pdfReportGenerator.ts`
- `frontend/app/analyze/[jobId]/page.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Files to Read First
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (read under header ## 2026-09-03T20:47:27Z)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md` (§ Interface Contracts § Court-Ready Forensic PDF Contract)
3. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_3/handoff.md`

## Implementation Tasks
1. **Backend Threat Intel FIR PDF (`backend/api/routes/threat_intel.py`)**:
   - In Section 2 (`Flagged Forensic Keyframe Visual Evidence`):
     - Robust image resolution: if `snap.get("image_path")` does not exist, resolve via `KEYFRAMES_DIR` using filename extracted from `snap.get("image_url")` or `snap.get("annotated_image_url")`.
     - In caption text, include:
       - Frame number & Timestamp (`Keyframe #{snap.get('frame_number')} @ {snap.get('timestamp')}`)
       - Anomaly Region (`snap.get('anomaly_region')`)
       - Neural Anomaly Index (`snap.get('anomaly_score')` or `snap.get('confidence')`)
       - Detector Subsystem (`snap.get('detector_subsystem', 'GenD Foundation Model ViT-L/14 + Spatial SBI')`)
       - Diagnostic Finding (Tamper-evident bounding box marks high-frequency synthetic latent boundary discontinuity certified under Section 65B Indian Evidence Act)
     - Fix duplicate section numbers:
       - Line 264: `3. Technical Indicators of Compromise (IOCs)`
       - Line 270: `4. Applicable Legal Provisions under Indian Law` (change from 3 to 4)
       - Line 280: `5. Recommended Law Enforcement Action` (change from 4 to 5)
     - Ensure statutory citations: Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023, Section 66D IT Act 2000, Section 318(4) BNS 2023, Section 66E IT Act 2000.
2. **Backend Analysis Jobs Report PDF (`backend/api/routes/jobs.py`)**:
   - Verify `GET /jobs/{job_id}/report.pdf` ReportLab endpoint.
   - In Section 2 caption text: add `<b>Detector Subsystem:</b> {snap.get('detector_subsystem', 'GenD Foundation Model ViT-L/14 + Spatial SBI')}<br/>`.
   - Ensure image resolution from `snap.get("image_path")` or `backend/media/keyframes/`.
   - Ensure statutory compliance citations (Section 65B, 66D, 318(4) BNS, 66E) and SHA-256 digital non-repudiation signature.
3. **Frontend PDF Generator (`frontend/lib/pdfReportGenerator.ts`)**:
   - Update `PDFReportData` interface: add `detector_subsystem?: string` to `keyframeSnapshots` item type.
   - In Section 2 visual keyframe snapshot block:
     Add line: `doc.text(\`• Detector Subsystem: \${snap.detector_subsystem || "GenD Foundation Model ViT-L/14 + Spatial SBI"}\`, textX, y + 27);`
     Adjust subsequent line vertical positions (`Statutory Legal Weight` at `y + 33`, `Forensic Finding` at `y + 39`, box height/spacing `48`).
4. **Frontend Analysis Page (`frontend/app/analyze/[jobId]/page.tsx`)**:
   - In `generateForensicPDF` onClick handler (line 696), pass `keyframeSnapshots`:
     ```typescript
     keyframeSnapshots: result.keyframe_snapshots || result.frames?.filter(f => f.annotated_image_url).map(f => ({
       frame_number: f.frame_number,
       timestamp: f.timestamp,
       anomaly_region: f.anomaly_region,
       anomaly_score: f.confidence,
       detector_subsystem: f.detector_subsystem,
       bounding_box: f.bounding_box,
     })),
     ```
5. **Verification**:
   - Run `./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "r3 or pdf"`
   - Generate sample PDFs from both endpoints and verify Section 2 side-by-side visual snapshot + diagnostic text table.

## Output Requirements
Document test commands and results in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m8/handoff.md`.
Notify parent via send_message when complete.
