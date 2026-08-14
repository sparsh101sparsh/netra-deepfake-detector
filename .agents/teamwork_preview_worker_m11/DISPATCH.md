# Dispatch: Worker M11 — Adaptive Frontend UI Presentation

## Mission
Implement the adaptive frontend UI presentation in `frontend/components/sandbox/` according to the architectural blueprint in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_m11_1/handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements:
1. **Component Aliasing & Exports**:
   - Create / update `frontend/components/sandbox/FacialAnomalyCard.tsx` (or alias with `FacialDeepfakeCard.tsx`) so that both `FacialAnomalyCard` and `FacialDeepfakeCard` are exported from `frontend/components/sandbox/index.ts`.
   - Ensure props type `FacialAnomalyCardProps`, `DualBranchResult`, `FaceEntry`, etc. are cleanly exported.
2. **Interactive Bounding Box Overlays**:
   - In `FacialAnomalyCard.tsx`, enhance the preview image with an interactive SVG / CSS bounding box overlay using `normalized_bbox: [x, y, w, h]` (percentages: `left: normX * 100%`, `top: normY * 100%`, `width: normW * 100%`, `height: normH * 100%`).
   - Clicking a bounding box must switch `activeFaceIdx` to that face and highlight the box with an active ring.
   - Border colors: red for `DEEPFAKE` (`#ef4444`), amber for other synthetic (`#f59e0b`), emerald for `AUTHENTIC` (`#10b981`).
3. **Informative Multi-Face Selector Pills**:
   - In `FacialAnomalyCard.tsx`, render rich pill buttons for multi-face selection showing: `Face #X: Y% Synthetic` or `Face #X: Y% Authentic` with status indicator dot and active ring styling.
4. **1-Click Court Evidence PDF Download**:
   - Add a 1-click "Download Court Evidence PDF" button using `generateForensicPDF` from `frontend/lib/pdfReportGenerator.ts`.
5. **Tavily Press Advisories in OCRDossier**:
   - In `frontend/components/sandbox/OCRDossier.tsx`, render `data.tavily_threat_intel` news advisories if `verified_threat` is true.
6. **Tab Counter Badges in HybridDossier**:
   - In `frontend/components/sandbox/MultiModalForensicScanner.tsx`, update the `HybridDossier` tab buttons with dynamic counts: `(N Faces)` and `(M IOCs)`.

## Verification:
- Run `npm run build` in `frontend/` to verify 0 TypeScript compilation errors.
- Run `PYTHONPATH=. ./venv/bin/pytest tests/test_dual_branch_routing_m10.py -v` in project root to verify backend non-regression.
- Record verification outputs in your handoff.md.

## Working Directory & Handoff
Working directory: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m11`
Write handoff report to: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m11/handoff.md`.
