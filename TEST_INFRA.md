# TEST_INFRA: Opaque-Box E2E Test Suite Architecture & Methodology

**Project:** NETRA (Threat Intelligence Catalog, Netra Radar, EXIF Geolocation, Visual Localization & Forensic PDF)  
**Target Suites:**  
1. `tests/test_e2e_directives.py` (Directives 1–5: Catalog, Radar, EXIF GPS, FIR PDF, DB Purge)  
2. `tests/test_visual_forensics_e2e.py` (Requirements R1–R4: Visual Keyframe Anomaly Localization & Forensic PDF Generation)  
**Framework:** `pytest` with `FastAPI TestClient`, `OpenCV`, `ReportLab`, and `pypdfium2`  
**Integrity Mode:** Opaque-box specification-driven verification  

---

## 1. Executive Summary

Project NETRA provides multi-modal deepfake detection, cyber threat intelligence tracking, and court-admissible forensic reporting. The test infrastructure delivers automated, regression-proof end-to-end verification across two major system capabilities:

### Suite 1: Directives 1 to 5 (`tests/test_e2e_directives.py`)
1. **Directive 1: Database Purge**: Verifies clean database initialization (0 dummy items `NETRA-SCAM-0001..0010`, 0 seed community posts, deletion of root `threat_catalog.db`).
2. **Directive 2: Catalog UI & Query Filtering**: Verifies category filter tabs normalized by Media Types (`video`, `image`, `audio`, `text`, `all`), backward-compatible exact matching, and media previews under `/api/v1/media/`.
3. **Directive 3: Netra Radar & Navbar Rebranding**: Verifies frontend rebranding contracts ("Netra Radar" and "Netra Cyber Threat Radar") and backend telemetry marker streams (`/api/v1/threat-intelligence/radar`).
4. **Directive 4: Exportable Forensic PDF Report**: Verifies 1-click downloadable forensic reports returning HTTP 200 with standard PDF magic bytes `%PDF-`.
5. **Directive 5: Auto-Population & EXIF Geolocation**: Verifies multi-modal auto-indexing with `media_url` and honest coordinates (extracting true GPS coordinates while ensuring ungeotagged media retains honest `NULL` coordinates and is excluded from the radar map).

### Suite 2: Visual Localization & Forensic PDF (Requirements R1 to R4) (`tests/test_visual_forensics_e2e.py`)
1. **R1: Spatial Anomaly Localization Engine (`backend/netra/pipeline/visual_localizer.py`)**: Verifies keyframe extraction for scores >75%, isolation of 3 facial landmark regions (eyewear specular glare, iris reflection discontinuity, lip-sync blending boundaries), exact 2D bounding boxes `[x, y, w, h]`, signature amber `#f59e0b` (`(11, 158, 245)` BGR) 3px outline, high-contrast forensic badge (`ANOMALY DETECTED HERE`), and sub-200ms processing latency.
2. **R2: Worker Pipeline Integration & Snapshot Generation (`worker/worker.py`)**: Verifies top 2–3 keyframe selection with temporal diversity, persistent snapshot storage under `backend/media/keyframes/`, `annotated_image_url` population in `final_result["frames"]`, and `keyframe_snapshots` schema integrity.
3. **R3: Court-Ready Forensic PDF Report Enhancement (`threat_intel.py` & `jobs.py`)**: Verifies Section 2 side-by-side keyframe table (220pt image left, 290pt diagnostic table right) and statutory compliance certifications (Section 65B Indian Evidence Act / Section 63 BSA 2023, Section 66D IT Act 2000, Section 318(4) BNS 2023, Section 66E IT Act).
4. **R4: Automated Visual Verification & Benchmark Suite**: Verifies pipeline execution across 20 curated benchmark deepfake videos from `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`, high-resolution PNG rendering via `pypdfium2` (scale=2, >=1000x1400 px), and 100% zero-exception audit.

---

## 2. 4-Tier Test Design Methodology

Both test suites strictly adhere to the 4-Tier test architecture to guarantee complete test coverage:

```
+-------------------------------------------------------------------------+
|                  TIER 4: REAL-WORLD ADVERSARIAL WORKLOADS               |
|   Suite 1: iOS ISO6709 Video, EXIF IFD Photo, Stripped WhatsApp, Voice   |
|   Suite 2: 20-Video Deepfake Batch Run, High-Res PyPDFium2 PNG Rendering |
+-------------------------------------------------------------------------+
|                  TIER 3: COMBINATORIAL & PIPELINE FLOW                  |
|   Suite 1: Ingest -> Catalog Query -> Radar Telemetry -> FIR PDF Dossier |
|   Suite 2: Video -> Extraction -> Scoring -> Localize -> Snapshot -> PDF |
+-------------------------------------------------------------------------+
|                  TIER 2: BOUNDARY & CORNER CASES                        |
|   Suite 1: Null Island [0,0] vs NULL GPS, Unmatched Types, Pagination   |
|   Suite 2: Aspect Ratios (9:16, 21:9, 4K), 75% Boundary, Zero/All High  |
+-------------------------------------------------------------------------+
|                  TIER 1: CORE FEATURE COVERAGE                          |
|   Suite 1: Directives 1-5 Happy Path Contract Assertions                |
|   Suite 2: R1 Localizer, R2 Snapshots, R3 Court PDF, R4 Engine Contracts|
+-------------------------------------------------------------------------+
```

---

## 3. Test Suite Inventory

### Suite 1: `tests/test_e2e_directives.py` (20 Tests)
- `TestTier1FeatureCoverage`:
  - `test_directive_1_clean_database_state`: Confirms 0 dummy records and clean table initial state.
  - `test_directive_2_catalog_media_type_query_filtering`: Tests type mapping and backward compatibility.
  - `test_directive_2_media_url_and_static_serving`: Tests `/api/v1/media/` static file serving.
  - `test_directive_3_rebranding_contracts`: Static inspection of Navbar and Radar titles.
  - `test_directive_3_radar_telemetry_endpoint`: Validates radar marker schema.
  - `test_directive_4_forensic_pdf_reports`: Validates FIR PDF generation and magic bytes `%PDF-`.
  - `test_directive_5_auto_population_and_gps_indexing`: Tests submission and marker plotting.
- `TestTier2BoundaryAndCornerCases`:
  - `test_boundary_empty_catalog_search_and_pagination`: Empty queries and pagination boundaries.
  - `test_boundary_unmatched_media_type_filter`: Unknown modalities returning empty results.
  - `test_boundary_null_island_gps_coordinates`: Asserts `(0.0, 0.0)` correctly plots on radar.
  - `test_boundary_honest_null_coordinates_excluded`: Verifies absence of New Delhi centroid fallbacks.
  - `test_boundary_invalid_and_missing_ids`: Graceful 404 responses for non-existent IDs.
- `TestTier3CrossFeatureCombinations`:
  - `test_cross_feature_lifecycle_analysis_to_radar_to_pdf`: Full lifecycle from ingest to PDF and upvote.
  - `test_cross_feature_gps_isolation_between_radar_and_catalog`: Geotagged vs ungeotagged coexistence.
  - `test_cross_feature_multi_modal_filter_matrix`: 4-modality filter matrix isolation.
- `TestTier4RealWorldScenarios`:
  - `test_scenario_1_video_deepfake_with_iso6709`: Apple ISO6709 video atom parsing.
  - `test_scenario_2_jpeg_scam_with_exif_gps_ifd`: EXIF IFD tag 34853 GPS DMS conversion.
  - `test_scenario_3_social_media_image_without_gps`: Stripped metadata handling.
  - `test_scenario_4_voice_clone_audio_extortion`: Voice clone call extortion dossier.
  - `test_scenario_5_sms_smishing_electricity_scam`: Electricity disconnection notice smishing.

### Suite 2: `tests/test_visual_forensics_e2e.py` (48 Tests)
- `TestTier1FeatureCoverage`:
  - `test_r1_visual_anomaly_localization_contract`: Validates 2D coordinates `[x, y, w, h]`, descriptors, and evidence codes.
  - `test_r1_amber_border_and_badge_visual_styling`: Verifies `#f59e0b` (BGR: 11, 158, 245) pixels and `ANOMALY DETECTED HERE` badge.
  - `test_r1_three_facial_landmark_regions_geometry`: Verifies eyewear, iris, and lip-sync bounding geometry.
  - `test_r1_keyframe_extraction_score_threshold_75`: Strict >0.75 anomaly filtering test.
  - `test_r1_localization_latency_sla_under_200ms`: Execution speed benchmark asserting < 200 ms.
  - `test_r2_worker_snapshot_storage_and_schema_contract`: Validates keyframe snapshot schema and storage path.
  - `test_r2_worker_top_keyframe_cap_and_temporal_diversity`: Validates top 2-3 frame cap and temporal frame separation.
  - `test_r3_court_ready_forensic_pdf_section_2_table_contract`: Validates Section 2 side-by-side Table flowable.
  - `test_r3_backend_fir_pdf_endpoint_contract`: Validates endpoint `GET /api/v1/threat-intelligence/{id}/fir-pdf`.
  - `test_r3_jobs_report_pdf_endpoint_contract`: Progressive testability check on `/jobs/{id}/report.pdf`.
  - `test_r4_pypdfium2_png_rendering_engine`: High-res rendering with pypdfium2 scale=2.
- `TestTier2BoundaryAndCornerCases`:
  - `test_boundary_extreme_aspect_ratios` (4 params): 9:16 vertical, 21:9 ultrawide, 64x64 tiny, 4K UHD.
  - `test_boundary_empty_and_solid_color_frames` (4 params): Black, white, green, and gray solid frames.
  - `test_boundary_no_face_detected_golden_ratio_fallback`: Face-less portrait fallback positioning.
  - `test_boundary_anomaly_threshold_precision`: 0.7499 vs 0.7500 vs 0.7501 boundary precision.
  - `test_boundary_zero_frames_above_threshold`: Clean authentic media returning 0 keyframes and fallback handling.
  - `test_boundary_all_frames_above_threshold_cap`: 30 high-anomaly frames capped at top 2-3.
  - `test_boundary_corrupt_or_invalid_frame_input`: None and empty ndarray input validation raising ValueError.
- `TestTier3CombinatorialPipelineFlow`:
  - `test_combinatorial_end_to_end_pipeline_flow`: Real video frame -> localizer -> JPG artifact -> ReportLab PDF -> pypdfium2 PNG.
  - `test_combinatorial_threat_catalog_fir_pdf_embedding`: Compares PDF binary stream size with and without snapshot.
  - `test_combinatorial_snapshot_schema_url_and_disk_parity`: Asserts path and URL parity between disk and API.
- `TestTier4RealWorld20VideoWorkload`:
  - `test_20_video_workload_sample` (20 params): Parametrized test across 20 Indian public figures deepfake videos:
    - 5 Eyewear / Specular Glare: `deepfake_Ajit_Doval.mp4`, `deepfake_Arvind_Kejriwal.mp4`, `deepfake_Nirmala_Sitharaman.mp4`, `deepfake_Peyush_Bansal.mp4`, `deepfake_S_Jaishankar.mp4`.
    - 5 Iris / Pupil Reflection: `deepfake_Alia_Bhatt.mp4`, `deepfake_Deepika_Padukone.mp4`, `deepfake_Gautam_Adani.mp4`, `deepfake_MS_Dhoni.mp4`, `deepfake_Shah_Rukh_Khan.mp4`.
    - 5 Lip-Sync Blending: `deepfake_Narendra_Modi.mp4`, `deepfake_Amitabh_Bachchan.mp4`, `deepfake_Rahul_Gandhi.mp4`, `deepfake_Shashi_Tharoor.mp4`, `deepfake_Rajinikanth.mp4`.
    - 5 Facial Landmark Contour: `deepfake_Amit_Shah.mp4`, `deepfake_Mukesh_Ambani.mp4`, `deepfake_Ritesh_Agarwal.mp4`, `deepfake_S_Somanath.mp4`, `deepfake_Virat_Kohli.mp4`.
  - `test_20_video_batch_audit_summary`: Aggregated latency benchmark asserting mean latency < 50ms and 100% completion.

---

## 4. Execution Guide

Execute the test suites via pytest using the local virtual environment:

```bash
# 1. Run the Visual Forensics & Forensic PDF E2E Suite (48 tests)
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -v

# 2. Run by specific Tier
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "TestTier1FeatureCoverage" -v
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "TestTier2BoundaryAndCornerCases" -v
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "TestTier3CombinatorialPipelineFlow" -v
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "TestTier4RealWorld20VideoWorkload" -v

# 3. Run the Directives 1-5 E2E Suite (20 tests)
PYTHONPATH=. ./venv/bin/pytest tests/test_e2e_directives.py -v

# 4. Run the Full Test Harness (68 tests)
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py tests/test_e2e_directives.py -v
```
