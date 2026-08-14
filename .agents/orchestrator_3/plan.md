# Plan: Orchestrator 3

## Objectives
1. Execute Milestone 8 (R3): Court-Ready Forensic PDF Report Enhancement
2. Execute Milestone 9 (R4): Automated Visual Verification & 20-Video Benchmark Suite
3. Ensure all gates pass with 100% unanimous approval and clean forensic audit
4. Send final completion report to Sentinel (`2b845db4-2f0b-4640-88aa-be7a67527533`)

## Milestone 8 Strategy
1. **Investigation**:
   - Spawn Explorers (or directly dispatch Worker if requirements and previous milestones are already precisely mapped in PROJECT.md).
   - Per Project pattern 2B:
     a. Spawn 3 Explorers (or 1-3) to inspect `threat_intel.py`, `jobs.py`, `pdfReportGenerator.ts`, and `analyze/[jobId]/page.tsx`.
     b. Worker M8 implements the exact changes:
        - Section 2 keyframe snapshots in `threat_intel.py` (resolving from disk `backend/media/keyframes/`, side-by-side with diagnostic table).
        - Fix duplicate Section 3 numbering in `threat_intel.py`.
        - Verify `GET /api/v1/jobs/{job_id}/report.pdf` endpoint in `backend/api/routes/jobs.py` (ReportLab / Typst integration).
        - Update `frontend/lib/pdfReportGenerator.ts` to include `detector_subsystem` and handle `keyframeSnapshots`.
        - Update `frontend/app/analyze/[jobId]/page.tsx` to pass `keyframeSnapshots` to `generateForensicPDF`.
        - Verify statutory compliance text: Section 65B Indian Evidence Act / Section 63 BSA, Section 66D IT Act 2000, Section 318(4) BNS 2023.
     c. Spawn Reviewers (2)
     d. Spawn Challengers (2)
     e. Spawn Forensic Auditor (1)
     f. Gate evaluation.

## Milestone 9 Strategy
1. Execute benchmark suite across 20 deepfake test videos from `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`.
2. Generate keyframe snapshots, court-ready PDFs, and render PDF pages to high-res PNG via `pypdfium2`.
3. Assert latency <200ms per frame, zero unhandled exceptions, and visual integrity (amber border `#f59e0b`, badge, side-by-side table).
4. Gate: Reviewers (2) + Challengers (2) + Forensic Auditor (1).
5. Gate evaluation.

## Completion
Deliver comprehensive final report to Sentinel via `send_message`.
