## 2026-09-03T23:06:27Z

Automate visual keyframe anomaly localization and embed tamper-evident bounding box snapshots into court-admissible forensic PDF reports across the NETRA deepfake detection platform.

Requirements:
R1. Spatial Anomaly Localization Engine (backend/netra/pipeline/visual_localizer.py):
- Extract keyframes flagged with high generative anomaly (>75%) from video processing pipeline.
- Implement spatial anomaly localization isolating facial landmark regions (eyewear/spectacle specular glare plane, iris/pupil reflection discontinuities, lip-sync blending boundaries).
- Calculate exact 2D bounding box coordinates (x, y, w, h) and assign semantic anomaly descriptors.

R2. Worker Pipeline Integration & Snapshot Generation (worker/worker.py):
- For top 2-3 flagged anomaly frames in any analyzed video:
  - Render amber tamper-evident bounding box (#f59e0b) with high-contrast forensic badge (ANOMALY DETECTED HERE).
  - Save keyframe snapshot images to cloud storage / local artifacts directory.
  - Return annotated snapshot references in final_result["frames"][i]["annotated_image_url"].

R3. Court-Ready Forensic PDF Report Enhancement (pdfReportGenerator.ts & threat_intel.py):
- In Section 1/2 of generated cybercrime FIR dossiers, embed the actual visual keyframe snapshot image side-by-side with forensic diagnostic metadata (timestamp, anomaly index, localized region, detector subsystem).
- Ensure generated PDFs comply with Section 65B of Indian Evidence Act, Section 66D of IT Act 2000, and Section 318(4) of BNS 2023.

R4. Automated Visual Verification & Benchmark Suite:
- Execute visual localization pipeline across a 20-video test subset from the 100 generated deepfake videos.
- Render generated PDF evidence pages to high-resolution PNG images (pypdfium2) for visual artifact auditing.

Acceptance Criteria:
- Bounding box overlays accurately target anomalous facial and eyewear regions without obstructing identity.
- Bounding boxes render with high-visibility amber accent borders (#f59e0b) and forensic badges.
- Generated PDF reports embed actual photographic keyframe crops alongside neural diagnostic text.
- All 20 benchmark deepfake test videos successfully generate annotated keyframe images, court-ready PDFs, and rendered page preview images.
- Zero unhandled exceptions during batch processing.
- Keyframe extraction and bounding box drawing completes in <200ms per frame.
