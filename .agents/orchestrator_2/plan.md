# Operational Plan: Visual Keyframe Anomaly Localization & Forensic PDF Snapshots

## Objective
Implement end-to-end automated visual keyframe anomaly localization, amber tamper-evident bounding box snapshot generation, court-admissible forensic PDF report embedding, and 20-video verification benchmark suite.

## Phase 0: Discovery & Survey
- [ ] Spawn 3 Explorers in parallel:
  - **Explorer 1 (Pipeline & Localization)**: Investigate `backend/netra/pipeline/`, facial landmark detection capabilities, OpenCV/MediaPipe/dlib/facenet tools available in environment, `visual_localizer.py` structure, anomaly score extraction (>75%), specular glare, iris reflection, lip-sync blending detection, and coordinate mapping.
  - **Explorer 2 (Worker & Artifact Storage)**: Investigate `worker/worker.py`, how video frames are processed, where frames are stored (`backend/media/`, static routes), top 2-3 anomaly frame selection, amber bounding box `#f59e0b` rendering, badge `ANOMALY DETECTED HERE` rendering, and URL assignment in `final_result["frames"][i]["annotated_image_url"]`.
  - **Explorer 3 (Forensic PDF & Verification Benchmark)**: Investigate `pdfReportGenerator.ts`, `backend/api/routes/threat_intel.py`, `backend/api/routes/jobs.py`, Typst/ReportLab engines, Section 65B Indian Evidence Act, Section 66D IT Act, Section 318(4) BNS compliance, test deepfake video locations (100 generated deepfakes), 20-video test subset, and `pypdfium2` rendering.
- [ ] Synthesize explorer findings into `PROJECT.md` Feature Inventory & Architecture.

## Phase 1: Test Suite & Infrastructure Setup (Dual Track)
- [ ] Dispatch Test Writer / E2E Testing Orchestrator to create benchmark test harness, validation assertions, and performance profiling (<200ms per frame).

## Phase 2: Implementation Milestones
- [ ] **Milestone 1**: Spatial Anomaly Localization Engine (`backend/netra/pipeline/visual_localizer.py`)
- [ ] **Milestone 2**: Worker Pipeline Integration & Snapshot Generation (`worker/worker.py` & media storage)
- [ ] **Milestone 3**: Court-Ready Forensic PDF Report Enhancement (`pdfReportGenerator.ts`, `threat_intel.py`, Typst/ReportLab)
- [ ] **Milestone 4**: 20-Video Benchmark Suite Execution & High-Res PNG Audit (`pypdfium2`)

## Phase 3: Final Verification & Audit Gate
- [ ] Reviewers (2) + Challengers (2) + Forensic Auditor (1)
- [ ] Verify zero unhandled exceptions, <200ms per frame, visual integrity, court compliance.
- [ ] Send completion report to Sentinel.
