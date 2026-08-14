# Original User Request

## 2026-09-03T19:39:34Z

Complete production implementation of NETRA Threat Intelligence Catalog, Netra Radar, EXIF Geolocation, and Forensic PDF Generator based on the user's annotated directives:

1. Database Purge:
- Remove seed dummy items (NETRA-SCAM-0001..0010) and seed community posts from SQLite database (threat_catalog and community_posts).
- Catalog and radar must start clean with real uploads.

2. Catalog UI Overhaul (/reported):
- Change category filter tabs to Media Types: All | Video | Image | Audio | Text
- Add playable media previews: inline HTML5 video player for video deepfakes, audio player for voice clones, image lightbox for image deepfakes, and clean transcript for scam texts.

3. Netra Radar & Navbar Rebranding:
- Update Navbar link from 'Threat Radar' to 'Netra Radar'
- Update LiveThreatRadar page title to 'Netra Cyber Threat Radar'

4. Exportable Forensic PDF Report:
- Implement a 1-click Download Forensic PDF report button on both /analyze/[jobId] and the catalog modal.
- Includes Job ID, SHA-256 hash, verdict, scorecard, metadata, and keyframe anomalies.

5. Auto-Population & EXIF Extraction:
- Auto-insert analyzed media (video, image, audio, text) into threat_catalog with playable media URL and forensic results.
- Extract EXIF GPS coordinates from video/image and populate lat/lng in threat_catalog so they plot onto Netra Radar.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

## 2026-09-03T20:47:27Z

Automate visual keyframe anomaly localization and embed tamper-evident bounding box snapshots into court-admissible forensic PDF reports across the NETRA deepfake detection platform.

Working directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
Integrity mode: development

## Requirements

### R1. Spatial Anomaly Localization Engine (`backend/netra/pipeline/visual_localizer.py`)
- Extract keyframes flagged with high generative anomaly (>75%) from the video processing pipeline.
- Implement spatial anomaly localization isolating facial landmark regions (eyewear/spectacle specular glare plane, iris/pupil reflection discontinuities, lip-sync blending boundaries).
- Calculate exact 2D bounding box coordinates `(x, y, w, h)` and assign semantic anomaly descriptors.

### R2. Worker Pipeline Integration & Snapshot Generation (`worker/worker.py`)
- For the top 2-3 flagged anomaly frames in any analyzed video:
  - Render an amber tamper-evident bounding box (`#f59e0b`) with a high-contrast forensic badge (`ANOMALY DETECTED HERE`).
  - Save keyframe snapshot images to cloud storage / local artifacts directory.
  - Return annotated snapshot references in `final_result["frames"][i]["annotated_image_url"]`.

### R3. Court-Ready Forensic PDF Report Enhancement (`pdfReportGenerator.ts` & `threat_intel.py`)
- In Section 1/2 of generated cybercrime FIR dossiers, embed the actual visual keyframe snapshot image side-by-side with forensic diagnostic metadata (timestamp, anomaly index, localized region, detector subsystem).
- Ensure generated PDFs comply with Section 65B of the Indian Evidence Act, Section 66D of the IT Act 2000, and Section 318(4) of BNS 2023.

### R4. Automated Visual Verification & Benchmark Suite
- Execute the visual localization pipeline across a 20-video test subset from the 100 generated deepfake videos.
- Render generated PDF evidence pages to high-resolution PNG images (`pypdfium2`) for visual artifact auditing.

## Acceptance Criteria

### Visual & Forensic Integrity
- [ ] Bounding box overlays accurately target anomalous facial and eyewear regions without obstructing identity.
- [ ] Bounding boxes render with high-visibility amber accent borders (`#f59e0b`) and forensic badges.
- [ ] Generated PDF reports embed actual photographic keyframe crops alongside neural diagnostic text.

### Benchmark & Performance
- [ ] All 20 benchmark deepfake test videos successfully generate annotated keyframe images, court-ready PDFs, and rendered page preview images.
- [ ] Zero unhandled exceptions during batch processing.
- [ ] Keyframe extraction and bounding box drawing completes in <200ms per frame.

