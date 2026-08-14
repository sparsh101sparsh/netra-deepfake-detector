# TASK ASSIGNMENT: Explorer Survey (PDF Engines & UI Parity)

## Identity
- Role: teamwork_preview_explorer
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_pdf
- Parent: orchestrator_6

## Mission
Survey and map the client-side and backend PDF generation architectures, statutory certification standards (Section 65B IEA / Section 63 BSA 2023), and UI export touchpoints.

## Required Readings
- Authoritative User Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (specifically Section ## 2026-09-04T09:07:13Z)
- Client-side PDF generator: frontend/lib/pdfReportGenerator.ts
- Backend FIR PDF endpoint: backend/api/routes/threat_intel.py (`/threat-intelligence/{id}/fir-pdf`)
- UI Export components:
  - frontend/components/sandbox/OCRDossier.tsx
  - frontend/components/sandbox/FacialAnomalyCard.tsx
  - frontend/components/sandbox/MultiModalForensicScanner.tsx
  - frontend/app/reported/page.tsx (and catalog modal/actions)

## Investigation Deliverables
Write a comprehensive report to `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_pdf/handoff.md` detailing:
1. Current implementation of `pdfReportGenerator.ts`: how it works, what functions exist (e.g. generateFIRPDF, etc.), styling, fonts, tables, image embedding mechanisms, and how it handles video vs what is needed for image branches (A, B, C) and audio clones.
2. Current backend implementation of `/threat-intelligence/{id}/fir-pdf` in `backend/api/routes/threat_intel.py`: ReportLab document setup, styles, tables, elements, how it currently renders reports and what custom layouts are required for `type == 'audio_clone'` and `type == 'image_deepfake'`.
3. Statutory legal framework requirements: Section 65B Indian Evidence Act / Section 63 BSA 2023, Section 66D IT Act 2000, Section 318(4) BNS 2023. What legal text, hash verification (SHA-256), timestamp, device/system telemetry, and examiner signature blocks are legally required in court-admissible dossiers.
4. Export touchpoints audit: Check each button in OCRDossier, FacialAnomalyCard, MultiModalForensicScanner, and reported/page.tsx — what handler does it call, what parameters does it pass, and what gaps exist.
5. Technical strategy for zero external network blocking and robust image embedding in jsPDF (converting canvas/data URLs/blobs safely).
28: 
## 2026-09-04T09:09:03Z

User Request:
Survey the NETRA codebase for PDF Generation Engines, Statutory Standards & UI Parity.
Authoritative User Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
Thoroughly investigate:
1. Client-Side PDF Generator:
   - frontend/lib/pdfReportGenerator.ts: jsPDF implementation, styling, sections, layout, video support vs requirements for Image (Branch A, B, C) and Audio voice clones.
   - Embedded image handling (crops, annotated previews, keyframes, base64 data URLs), zero external network blocking, institutional theme.
2. Backend Server-Side PDF Exporter:
   - backend/api/routes/threat_intel.py: ReportLab generation in /threat-intelligence/{id}/fir-pdf.
   - Customized layouts needed for type == 'audio_clone' and type == 'image_deepfake'.
3. Legal / Statutory Certification Standards:
   - Section 65B Indian Evidence Act / Section 63 BSA (Bharatiya Sakshya Adhiniyam) 2023 certificate wording, SHA-256 hash validation, examiner seal/signature, timestamp, device/server telemetry, Section 66D IT Act, Section 318(4) BNS 2023.
4. UI 1-Click Export touchpoints:
   - frontend/components/sandbox/OCRDossier.tsx
   - frontend/components/sandbox/FacialAnomalyCard.tsx
   - frontend/components/sandbox/MultiModalForensicScanner.tsx
   - frontend/app/reported/page.tsx
5. Write your complete findings to:
   /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_pdf/handoff.md
Follow the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification).
Send a message back to parent when done with the path to your handoff.md.
