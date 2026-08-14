# Review & Handoff Report: Milestone 7 / Requirement R2 Review

**Verdict**: **APPROVE**
**Reviewer Role**: `teamwork_preview_reviewer` (Reviewer M7-1 Replacement)
**Working Directory**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_reviewer_m7_1_rep`

---

## 1. Observation

### Implementation Inspection (`worker/worker.py`)
1. **Directory Setup (Lines 62–70)**:
   ```python
   MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
   KEYFRAMES_DIR = os.path.join(MEDIA_DIR, "keyframes")
   os.makedirs(KEYFRAMES_DIR, exist_ok=True)

   try:
       from netra.pipeline.visual_localizer import VisualAnomalyLocalizer
   except ImportError:
       VisualAnomalyLocalizer = None
   ```
   Directly establishes `backend/media/keyframes/` as persistent storage outside worker temporary directories.

2. **Stage 8.5 Keyframe Anomaly Extraction & Rendering (Lines 763–864)**:
   - Evaluates frame candidates combining spatial and CLIP probe predictions:
     `eff_score = max(sp_score, cp_score)`.
   - Filters candidate frames with temporal spacing and top anomaly threshold:
     ```python
     selected = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
         candidate_frames,
         threshold=0.75,
         min_frame_gap=10,
         max_keyframes=3,
         fallback_if_empty=True,
     )
     ```
   - Fallback logic for non-authentic videos when no single frame crossed 0.75:
     ```python
     if not selected and candidate_frames and fusion_result.get("verdict") != "authentic":
         sorted_cands = sorted(candidate_frames, key=lambda x: x.get("confidence", 0.0), reverse=True)
         selected = sorted_cands[:min(3, len(sorted_cands))]
     selected = selected[:3]
     ```
   - Renders bounding box and badge using `VisualAnomalyLocalizer.localize_and_annotate(raw_bgr, anomaly_score=cand_confidence)`:
     - 3px amber stroke `#f59e0b` (BGR `(11, 158, 245)`).
     - Institutional dark badge `#0f172a` with border and white text `"ANOMALY DETECTED HERE"`.
   - Persists snapshot to `KEYFRAMES_DIR` via `cv2.imwrite(snap_filepath, annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])`.
   - Safe non-blocking S3 upload attempt wrapped in `try...except Exception as s3_err`.
   - Stage 8.5 wrapped in outer `try...except Exception as e` resetting `keyframe_snapshots = []` and logging `exc_info=True`.

3. **Final Result Schema Assembly (Lines 887–957)**:
   - `frames_payload` populates `annotated_image_url`, `image_path`, `bounding_box`, and `anomaly_region` for annotated frames, while non-annotated frames retain `None`.
   - Prepends snapshot keyframes into `frames_payload` if not already present in `existing_frame_nums`.
   - `final_result["keyframe_snapshots"]` includes `frame_number`, `timestamp`, `anomaly_region`, `anomaly_score`, `confidence`, `image_path`, `image_url`, `annotated_image_url`, `detector_subsystem`, `bounding_box`, `normalized_box`, `evidence_code`, and `statutory_act`.

### Independent Verification & Test Execution
1. **Unit Test Execution**:
   - Command: `PYTHONPATH=. ./venv/bin/pytest tests/test_worker_daemon_unit.py -v`
   - Result: `13 passed in 214.78s (0:03:34)` (Exit code 0).
2. **Visual Forensics E2E & Boundary Suite**:
   - Command: `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "r2" -v`
   - Result: `15 passed, 33 deselected in 2.46s` (Exit code 0).
3. **End-to-End Real Video Snapshot Generation & Persistence**:
   - Executed `process_job("test-reviewer-m7-verify-001", "deepfake_Ajit_Doval.mp4")` against the real video file:
     - Generated 2 keyframe snapshots at frames 120 and 0 (temporal spacing of 120 frames, strictly adhering to min gap of 10).
     - Verified existence of generated image file on disk.
     - Pixel color analysis on `test-reviewer-m7-verify-001_frame_000120_annotated.jpg`:
       - Verified 2,592 amber border pixels within tolerance of `#f59e0b` (BGR `11, 158, 245`).
       - Verified 5,141 dark background pixels within tolerance of `#0f172a` (BGR `42, 23, 15`).
4. **Adversarial Exception Injection**:
   - Injected `RuntimeError("Simulated GPU Out Of Memory")` into `VisualAnomalyLocalizer.localize_and_annotate`.
   - Verified that `process_job` caught the error, logged the full traceback, gracefully set `keyframe_snapshots = []` and `annotated_image_url = None`, and successfully finalized the job with `verdict: AUTHENTIC, confidence: 28.5%` and status `"complete"` written to DynamoDB.

---

## 2. Logic Chain

1. **Integrity & Authenticity Audit**:
   - *Observation*: Inspected `worker/worker.py` and test suites for hardcoded results, facades, or test bypasses.
   - *Inference*: No hardcoded outputs, synthetic stubs, or bypasses were found. Real OpenCV operations and model inferences are invoked, creating verifiable disk artifacts. Integrity audit passes with zero violations.

2. **Storage Persistence & Lifecycle**:
   - *Observation*: `process_job` runs inside `with tempfile.TemporaryDirectory() as tmpdir:`. Snapshots are written to `KEYFRAMES_DIR = os.path.join(MEDIA_DIR, "keyframes")`.
   - *Inference*: Since `KEYFRAMES_DIR` is outside `tmpdir`, all generated keyframes persist after the temporary processing directory is dismantled.

3. **Keyframe Selection & Temporal Diversity**:
   - *Observation*: `VisualAnomalyLocalizer.filter_high_anomaly_keyframes` is invoked with `min_frame_gap=10` and `max_keyframes=3`.
   - *Inference*: Ensures the top 2-3 most anomalous frames are selected without temporal clustering on adjacent frames.

4. **Schema Compliance (`PROJECT.md`)**:
   - *Observation*: `final_result["keyframe_snapshots"]` contains all required attributes (`frame_number`, `timestamp`, `anomaly_region`, `anomaly_score`, `image_path`, `image_url`, `detector_subsystem`, `bounding_box`), and `final_result["frames"][i]["annotated_image_url"]` is populated.
   - *Inference*: Matches § Worker Snapshot Storage & Schema Contract in `PROJECT.md` exactly.

5. **Exception Shielding**:
   - *Observation*: Injected fatal exception during snapshot rendering; observed error catch, traceback log, and clean job finalization.
   - *Inference*: Snapshot generation errors cannot crash or stall the worker daemon or mark an analysis job as failed.

---

## 3. Caveats

- **S3 Connectivity in Development**: In environments without active AWS credentials or internet access to S3, `s3.upload_file` is skipped with a debug log. Local disk storage under `backend/media/keyframes/` serves as the primary ground truth.
- **Pytest execution time**: Running the entire unit test suite `test_worker_daemon_unit.py` on MPS / Apple Silicon took ~3.5 minutes due to torch model initialization and weight loading.

---

## 4. Conclusion

The implementation of Milestone 7 / Requirement R2 in `worker/worker.py` satisfies all correctness, quality, architectural, and adversarial criteria:
- Keyframes are correctly prioritized with temporal gap enforcement.
- Amber `#f59e0b` tamper-evident bounding box and forensic badge are rendered.
- Snapshots persist in `backend/media/keyframes/`.
- Schema strictly complies with `PROJECT.md`.
- Unhandled exceptions are fully shielded.

**Final Verdict**: **APPROVE**.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Worker Unit Test Suite**:
   ```bash
   PYTHONPATH=. ./venv/bin/pytest tests/test_worker_daemon_unit.py -v
   ```
   *Expected*: 13 passed tests.

2. **Visual Forensics E2E & Boundary Tests**:
   ```bash
   PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "r2" -v
   ```
   *Expected*: 15 passed tests.

3. **Real Video Snapshot & Pixel Color Verification**:
   ```bash
   PYTHONPATH=. ./venv/bin/python -c "
   import os, shutil, cv2, numpy as np
   from unittest.mock import MagicMock, patch
   from worker.worker import process_job

   job_id = 'verify-m7-002'
   video_path = 'garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/deepfake_Ajit_Doval.mp4'
   captured = []
   mock_s3 = MagicMock()
   mock_s3.download_file = lambda b, k, dest: shutil.copyfile(video_path, dest)

   with patch('worker.worker.s3', mock_s3), \
        patch('worker.worker.update_job_progress', MagicMock()), \
        patch('worker.worker.write_result_to_dynamo', side_effect=lambda j, r, worker_id=None: captured.append(r)):
       process_job(job_id, 'deepfake_Ajit_Doval.mp4', worker_id='worker-v')

   assert len(captured) == 1
   res = captured[0]
   assert len(res['keyframe_snapshots']) >= 1
   for snap in res['keyframe_snapshots']:
       assert os.path.exists(snap['image_path'])
       img = cv2.imread(snap['image_path'])
       amber_target = np.array([11, 158, 245], dtype=np.int32)
       dist = np.linalg.norm(img.astype(np.int32) - amber_target, axis=2)
       assert np.count_nonzero(dist < 15) > 500
       os.remove(snap['image_path'])
   print('VERIFICATION COMPLETE: ALL CHECKS PASSED')
   "
   ```
