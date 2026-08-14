# TASK ASSIGNMENT: Explorer Survey (Image Forensics)

## Identity
- Role: teamwork_preview_explorer
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image
- Parent: orchestrator_6

## Mission
Survey and map the full codebase architecture and media forensics data models for IMAGE analysis (Branch A: pure facial deepfake, Branch B: document scam / OCR, Branch C: hybrid multi-modal).

## Required Readings
- Authoritative User Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md (specifically Section ## 2026-09-04T09:07:13Z and Section ## 2026-09-04T00:41:31Z)
- Image detection routes: backend/api/routes/ (e.g. detect.py, threat_intel.py, or similar)
- Image pipeline & detectors: backend/netra/pipeline/, backend/netra/detectors/
- Visual anomaly localization: backend/netra/pipeline/visual_localizer.py
- Frontend UI components: frontend/components/sandbox/OCRDossier.tsx, frontend/components/sandbox/FacialAnomalyCard.tsx, frontend/components/sandbox/MultiModalForensicScanner.tsx, and frontend/app/reported/page.tsx

## Investigation Deliverables
Write a comprehensive report to `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image/handoff.md` detailing:
1. Exact data structures returned by the backend for Image Branch A, Branch B, and Branch C (fields, nested objects, scores, bounding boxes, crops, IOCs, rules).
2. How annotated images and crops are generated, stored, and formatted (URLs, base64 data URLs, dimensions).
3. How OCR data (text, IOCs, confidence, rapidocr telemetry) and threat advisories (Tavily) are represented.
4. Current implementation in OCRDossier.tsx, FacialAnomalyCard.tsx, and MultiModalForensicScanner.tsx: what props/data they hold and how export is currently hooked up (or missing).
5. Catalog representation: how `/threat-intelligence/catalog` and `/reported` represent image items (pure face vs document vs hybrid).
6. Exact dependencies and features required for Section 65B/63 BSA compliant image forensic reports.

## 2026-09-04T09:09:02Z

You are an Explorer surveying the NETRA codebase for Image Forensics.
Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image
Your DISPATCH specification: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image/DISPATCH.md
Authoritative User Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md

Read ORIGINAL_REQUEST.md and DISPATCH.md first. Then thoroughly investigate:
1. Media forensics data modeling for Images:
   - Branch A: Pure Face / Portrait / Group Photo (face bounding boxes [x,y,w,h], crops, EfficientNet-B4, SBI artifact level, ocular reflection symmetry, specular glare plane).
   - Branch B: Document Scam / OCR (RapidOCR text density, extracted text log, flagged IOCs: phones, UPI IDs, URLs/domains, OCR engine telemetry, safety rules, Tavily threat advisory).
   - Branch C: Hybrid / Mixed Media (composite risk score, both facial and text fraud intelligence).
2. Look into:
   - backend/api/routes/ (image detection endpoints, threat intel routes)
   - backend/netra/pipeline/ (routing engine, visual localizer, spatial detector)
   - frontend/components/sandbox/OCRDossier.tsx, FacialAnomalyCard.tsx, MultiModalForensicScanner.tsx, frontend/app/reported/page.tsx
3. Write your complete findings to:
   /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_image/handoff.md
Follow the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification).
Send a message back to parent when done with the path to your handoff.md.
