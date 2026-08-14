# Empirical Challenge Report: Snapshot Artifacts & Forensic Metadata (Requirement R2)

**Challenger**: Challenger M7-2 (`teamwork_preview_challenger_m7_2`)  
**Target Work Product**: `worker/worker.py` (Milestone M7, Requirement R2)  
**Verdict**: **APPROVE**  
**Date**: 2026-09-03T21:26:00Z  

---

## 1. Observation

### 1.1 Test Suite Execution
An independent empirical challenge suite was constructed and executed at `tests/test_challenger_m7_2_snapshots.py`:
- Command: `HF_HUB_OFFLINE=1 MPLCONFIGDIR=/tmp/matplotlib PYTHONPATH=.:backend ./venv/bin/pytest tests/test_challenger_m7_2_snapshots.py -v`
- Result: **12 passed in 9.76s**
- Baseline Worker unit tests: `HF_HUB_OFFLINE=1 MPLCONFIGDIR=/tmp/matplotlib PYTHONPATH=.:backend ./venv/bin/pytest tests/test_worker_daemon_unit.py -v`
  - Result: **13 passed in 5.59s**
- Visual Forensics R2 contract tests: `HF_HUB_OFFLINE=1 MPLCONFIGDIR=/tmp/matplotlib PYTHONPATH=.:backend ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "test_r2" -v`
  - Result: **2 passed in 2.02s**

### 1.2 Real Deepfake Benchmark Execution
The full `worker.process_job` pipeline was executed across 20 real benchmark deepfake videos located in `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`:
- Videos evaluated: `deepfake_Ajit_Doval.mp4`, `deepfake_Arvind_Kejriwal.mp4`, `deepfake_Nirmala_Sitharaman.mp4`, `deepfake_Peyush_Bansal.mp4`, `deepfake_S_Jaishankar.mp4`, `deepfake_Alia_Bhatt.mp4`, `deepfake_Deepika_Padukone.mp4`, `deepfake_Gautam_Adani.mp4`, `deepfake_MS_Dhoni.mp4`, `deepfake_Shah_Rukh_Khan.mp4`, `deepfake_Narendra_Modi.mp4`, `deepfake_Amitabh_Bachchan.mp4`, `deepfake_Rahul_Gandhi.mp4`, `deepfake_Shashi_Tharoor.mp4`, `deepfake_Rajinikanth.mp4`, `deepfake_Amit_Shah.mp4`, `deepfake_Mukesh_Ambani.mp4`, `deepfake_Ritesh_Agarwal.mp4`, `deepfake_S_Somanath.mp4`, `deepfake_Virat_Kohli.mp4`.
- **Results**:
  - 20/20 jobs completed with status `complete` and zero unhandled exceptions.
  - Snapshot count distribution:
    - 7 videos generated **3 snapshots** (e.g. Arvind Kejriwal, Peyush Bansal, S Jaishankar, Alia Bhatt, Shashi Tharoor, Amit Shah, S Somanath).
    - 11 videos generated **2 snapshots** (e.g. Ajit Doval, Nirmala Sitharaman, Deepika Padukone, MS Dhoni, Shah Rukh Khan, Narendra Modi, Rahul Gandhi, Rajinikanth, Mukesh Ambani, Ritesh Agarwal, Virat Kohli).
    - 2 videos generated **1 snapshot** (Gautam Adani [score: 1.0], Amitabh Bachchan [score: 0.9964]), where only 1 extracted temporal frame exceeded the anomaly threshold (>0.75), while other extracted frames were near-zero (0.0004).

### 1.3 Snapshot File Inspection (`backend/media/keyframes/`)
Physical inspection of 64 persistent JPEG snapshot files generated in `backend/media/keyframes/` revealed:
- **Existence & Validity**: 64/64 files exist on disk, decodable via OpenCV and PIL with valid JPEG magic bytes (`FF D8 FF`).
- **File Size**: All files exceed 10 KB, ranging from **89,673 bytes to 123,062 bytes** (average ~105 KB).
- **Amber Border Pixels (`#f59e0b`)**: In OpenCV BGR format, `#f59e0b` corresponds to `(11, 158, 245)`. Allowing for DCT compression tolerance (±14), every inspected snapshot contains **>1,000 amber pixels** defining the 3px perimeter border and badge border.
- **Forensic Badge Rendering**: The badge background `#0f172a` (BGR: 42, 23, 15) contains >300 dark pixels. The text `"ANOMALY DETECTED HERE"` is rendered in crisp white (`(255, 255, 255)`), with >100 white text pixels per snapshot. Text is untruncated and positioned above the bounding box (or clamped inside if near top).
- **Facial Identity Preservation**: Bounding boxes are rendered as hollow 3px stroke outlines (`thickness=3`). The interior face crop exhibits high natural texture variance (>50.0), proving identity features are neither occluded, blacked out, nor blurred.

### 1.4 Schema Validation
Audited returned `final_result` payloads:
- `final_result["keyframe_snapshots"]`:
  - Contains all 13 required fields: `frame_number` (int), `timestamp` (str), `anomaly_region` (str), `anomaly_score` (float), `confidence` (float), `image_path` (str), `image_url` (str), `annotated_image_url` (str), `detector_subsystem` (str), `bounding_box` ([x, y, w, h] ints), `normalized_box` ([x_n, y_n, w_n, h_n] floats in [0, 1]), `evidence_code` (str starting with `EVD-`), `statutory_act` (citing Section 65B Indian Evidence Act).
  - Parity: `snap["image_url"] == snap["annotated_image_url"]`.
  - Local disk path `snap["image_path"]` resolves directly to existing file.
- `final_result["frames"]`:
  - Frames matching snapshots have `annotated_image_url` populated. Non-snapshot frames retain `None`.
  - Every snapshot is represented in `final_result["frames"]`.

### 1.5 Performance and Fault Tolerance
- **Latency SLA**: Keyframe localization and annotation averaged **~18-35 ms per frame** across 1080p and 4K resolutions, strictly below the **<200 ms SLA**.
- **Exception Shielding**: Simulated GPU faults (`RuntimeError("Simulated GPU Fault")`) and S3 connection drops in Stage 8.5 logged detailed error diagnostics and gracefully fell back to `keyframe_snapshots = []`, allowing the worker job to complete cleanly without uncaught exceptions.

---

## 2. Logic Chain

1. **Premise 1**: Requirement R2 mandates selecting the top 2-3 flagged anomaly frames in analyzed videos, rendering amber `#f59e0b` bounding boxes with `"ANOMALY DETECTED HERE"` badges, persisting snapshots under `backend/media/keyframes/`, and populating `annotated_image_url` and `keyframe_snapshots`.
   - **Observation Ref**: Sections 1.1, 1.2, 1.3, 1.4.
   - **Inference 1**: `worker/worker.py` (Stage 8.5) and `backend/netra/pipeline/visual_localizer.py` faithfully implement the required pipeline stage.

2. **Premise 2**: In 2 out of 20 benchmark videos (`deepfake_Gautam_Adani.mp4` and `deepfake_Amitabh_Bachchan.mp4`), exactly 1 frame scored >0.75 (scores: 1.0 and 0.9964), while remaining frames scored 0.0004.
   - **Observation Ref**: Section 1.2.
   - **Inference 2**: Generating an anomaly bounding box with `"ANOMALY DETECTED HERE"` on an authentic frame (score 0.0004) to artificially satisfy an invariant of >= 2 snapshots would violate forensic integrity under Section 65B of the Indian Evidence Act. Downstream consumers (`jobs.py`, `threat_intel.py`) iterate over `keyframe_snapshots or []` and support 1, 2, or 3 snapshots without issue. Therefore, capping at 3 while returning all qualified anomaly frames (1 to 3) is forensically valid.

3. **Premise 3**: All 64 snapshot files exist on disk, are valid JPEGs > 10 KB, contain amber `#f59e0b` (BGR 11, 158, 245) borders, render `"ANOMALY DETECTED HERE"` badges, and preserve facial identity without obscuring features.
   - **Observation Ref**: Section 1.3.
   - **Inference 3**: Artifact persistence, visual styling, and forensic readability criteria are 100% met.

4. **Premise 4**: Schema fields in `final_result["keyframe_snapshots"]` and `final_result["frames"]` are complete, strongly-typed, and match disk files.
   - **Observation Ref**: Section 1.4.
   - **Inference 4**: Schema contract compliance is 100% verified.

5. **Premise 5**: Processing latency is <50 ms per frame (<200 ms SLA), and worker shields against S3/GPU exceptions.
   - **Observation Ref**: Section 1.5.
   - **Inference 5**: Operational performance and reliability requirements are satisfied.

---

## 3. Caveats

- In the local development sandbox, S3 upload logs a debug warning and gracefully falls back to local disk storage (`backend/media/keyframes/`), which is the intended design for local testing.
- A downstream bug was observed in `backend/api/routes/jobs.py:351` (`get_job_status` was not awaited), but this is strictly part of Milestone M8 (R3 PDF generation) and does not affect the M7 worker snapshot generation engine.

---

## 4. Conclusion

**Verdict**: **APPROVE**

`worker/worker.py` and `backend/netra/pipeline/visual_localizer.py` fully satisfy Requirement R2 and all dispatch criteria. Keyframe snapshots are reliably generated, persisted to disk with amber `#f59e0b` borders and forensic badges, verified across 20 real benchmark videos, adhere to the schema contract, and exhibit zero unhandled runtime exceptions.

---

## 5. Verification Method

To independently verify this evaluation, run the following commands from the project root:

1. **Run Challenger Empirical Test Suite (12 tests)**:
   ```bash
   HF_HUB_OFFLINE=1 MPLCONFIGDIR=/tmp/matplotlib PYTHONPATH=.:backend ./venv/bin/pytest tests/test_challenger_m7_2_snapshots.py -v
   ```
2. **Run Worker Unit Tests (13 tests)**:
   ```bash
   HF_HUB_OFFLINE=1 MPLCONFIGDIR=/tmp/matplotlib PYTHONPATH=.:backend ./venv/bin/pytest tests/test_worker_daemon_unit.py -v
   ```
3. **Run Visual Forensics R2 Contract Tests (2 tests)**:
   ```bash
   HF_HUB_OFFLINE=1 MPLCONFIGDIR=/tmp/matplotlib PYTHONPATH=.:backend ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "test_r2" -v
   ```
4. **Inspect Generated Keyframe Snapshots**:
   ```bash
   ls -lh backend/media/keyframes/
   ```
