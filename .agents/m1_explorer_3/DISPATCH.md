# TASK ASSIGNMENT: M1 Explorer 3 (ReportLab Image Deepfake & Document Layout)

## Identity
- Role: teamwork_preview_explorer
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3
- Parent: orchestrator_6

## Mission
Formulate the exact implementation plan for `backend/api/routes/threat_intel.py` (`/threat-intelligence/{threat_id}/fir-pdf`) when `item.get("type") == 'image_deepfake'`:
1. Visual Evidence Embedding:
   - Resolve local file path or base64 from `item.get("thumbnail_url")`, `item.get("media_url")`, or `iocs.get("annotated_preview_url")` / `annotated_preview_base64`.
   - Embed high-resolution visual evidence (`RLImage`) in ReportLab story with bounding box indicators.
2. Branch A (Pure Face): Multi-Face Breakdown Table (Face ID, Bounding Box, Fake Probability %, Verdict, Primary Anomaly Region, SBI Artifact Level, Ocular Symmetry).
3. Branch B (Document Scam): Formatted Extracted IOC Table (Phone Numbers, UPI IDs, Phishing URLs, Malicious APKs) + Matched Safety Rules.
4. Branch C (Hybrid): Both Facial Deepfake Evidence and Document Scam IOCs.
5. Statutory Certification under Section 63 BSA 2023 / Section 65B Indian Evidence Act 1872 with SHA-256 non-repudiation.

## Required Readings
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md
- backend/api/routes/threat_intel.py
- backend/netra/pipeline/dual_branch_router.py

## Deliverable
Write `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3/handoff.md` with exact ReportLab Flowables, Table styles, and image resolution logic.

## 2026-09-04T09:16:16Z
You are M1 Explorer 3 for Milestone 1 (ReportLab Image Deepfake Layout).
Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3
Task Spec: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3/DISPATCH.md
Authoritative User Request: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
PROJECT.md: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/PROJECT.md

Formulate implementation plan for backend/api/routes/threat_intel.py (/fir-pdf):
Design ReportLab layout for type == 'image_deepfake':
1. Visual evidence embedding (resolve thumbnail_url / media_url / annotated_preview).
2. Branch A (Pure Face): Multi-Face Breakdown table (BBoxes, fake probability %, verdict, anomaly region, neural metrics).
3. Branch B (Document Scam): Formatted extracted IOC table (Phones, UPIs, URLs, APKs) and matched fraud rules.
4. Branch C (Hybrid): Composite visual and text fraud sections.
5. Statutory Certification (Sec 63 BSA 2023 / Sec 65B IEA 1872).
Write complete handoff report to /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3/handoff.md and notify parent.
