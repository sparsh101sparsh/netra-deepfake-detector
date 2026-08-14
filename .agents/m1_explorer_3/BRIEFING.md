# BRIEFING — 2026-09-04T09:16:30Z

## Mission
Formulate implementation plan for ReportLab layout for `type == 'image_deepfake'` in `/threat-intelligence/{threat_id}/fir-pdf` covering visual embedding, Branch A (Pure Face), Branch B (Document Scam), Branch C (Hybrid), and Statutory Certification (Sec 63 BSA 2023 / Sec 65B IEA 1872).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, analyst
- Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/m1_explorer_3
- Original parent: cc46082a-b586-4eb5-8c8b-07ac7b03df73
- Milestone: Milestone 1 (ReportLab Image Deepfake Layout)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code in backend source directly
- Investigate backend/api/routes/threat_intel.py (/fir-pdf) and related pipeline models/schemas
- Formulate precise implementation plan for type == 'image_deepfake' across Branch A (Face), Branch B (Document Scam), Branch C (Hybrid), visual embedding, and statutory certification
- Write handoff.md and notify parent

## Current Parent
- Conversation ID: cc46082a-b586-4eb5-8c8b-07ac7b03df73
- Updated: 2026-09-04T09:16:30Z

## Investigation State
- **Explored paths**:
  - `backend/api/routes/threat_intel.py` (FIR PDF ReportLab generator)
  - `backend/netra/pipeline/dual_branch_router.py` (Dual-branch routing, multi-face scoring, annotated previews)
  - `backend/netra/services/catalog_hook.py` (Auto-catalog ingestion & storage)
  - `backend/api/db.py` (threat_catalog schema and queries)
  - `tests/test_challenger_m8_pdf_empirical.py` & `tests/test_dual_branch_routing_m10.py`
- **Key findings**:
  - `threat_intel.py:download_fir_dossier` lacks type branching, only checking video keyframe snapshots.
  - Image evidence can be embedded as file paths from `MEDIA_DIR/images/{scan_id}_annotated.jpg` or `MEDIA_DIR/uploads/{scan_id}.*`, or decoded from base64 data URIs via `io.BytesIO`.
  - Branch A requires a Multi-Face table (520pt) + Neural Metrics table (SBI artifact level, ocular symmetry, eyewear specular, lip-sync).
  - Branch B requires OCR engine telemetry, monospace extracted text block, formatted IOC table (Phones, UPIs, URLs, APKs), and matched fraud rules.
  - Branch C requires composite risk score (`max(scam_risk, face_risk)`), composite verdict banner, and split visual + document sections.
  - Statutory certification requires formal schedule referencing Section 63 BSA 2023 / Section 65B IEA 1872, SHA-256 media hash non-repudiation, and Section 66D IT Act / Section 318(4) BNS citations.
- **Unexplored areas**: None for M1 Explorer 3 scope.

## Key Decisions Made
- Use side-by-side Table (`colWidths=[230, 290]`) with aspect-ratio scaled `RLImage` (max 220x155) on left and diagnostic card on right.
- Provide a robust fallback visual card with amber border `#f59e0b` and SHA-256 seal if the image file is missing or unreadable.
- Table column widths tuned precisely for A4 (520pt usable width) with Helvetica/Helvetica-Bold typography.
- Escape all strings via `sanitize_for_reportlab` to prevent XML parser crashes on unescaped `&`, `<`, `>`, or non-ASCII characters.
- Incorporate formal Schedule I: Certificate of Electronic Evidence under Section 63 BSA 2023 / Section 65B IEA 1872.

## Artifact Index
- DISPATCH.md — Task assignment and instructions
- BRIEFING.md — Working memory and situational awareness
- progress.md — Liveness heartbeat and step tracking
- handoff.md — Final deliverable report
