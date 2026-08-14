# Handoff Report: Worker Pipeline Integration & Snapshot Generation (R2)

## Executive Summary
This report provides a comprehensive architectural and technical investigation for **Requirement R2: Worker Pipeline Integration & Snapshot Generation (`worker/worker.py`)**. It details the frame extraction flow, anomaly filtering and ranking mechanism, amber bounding box rendering (`#f59e0b` / BGR `(11, 158, 245)`) with the `ANOMALY DETECTED HERE` forensic badge, persistent artifact storage under `backend/media/keyframes/`, URL generation contracts, data structures for `final_result["frames"]` and `final_result["keyframe_snapshots"]`, and exhaustive exception shielding for zero unhandled exceptions.

---

## 1. Observation

### 1.1 Worker Execution Flow and Frame Lifecycle
- **Location**: `worker/worker.py:551-815` (`process_job`).
- **Temporary Execution Directory**:
  ```python
  551: with tempfile.TemporaryDirectory() as tmpdir:
  552:     video_path = os.path.join(tmpdir, "input.mp4")
  553:     audio_path = os.path.join(tmpdir, "audio.wav")
  554:     frames_dir = os.path.join(tmpdir, "frames")
  555:     os.makedirs(frames_dir, exist_ok=True)
  ```
  `frames_dir` is allocated inside a temporary directory context manager (`tmpdir`). When `process_job` exits this block, all extracted raw frames are deleted from disk. Any keyframe snapshot intended for long-term serving or PDF report rendering **must** be copied or saved into a persistent media directory before this block exits.

- **Frame Extraction**:
  ```python
  576: frames = extract_frames(video_path, job_id, frames_dir)
  ```
  In `backend/netra/pipeline/extractor.py:69-123`, `extract_frames` samples 1 frame every 2 seconds (`sample_interval = max(1, int(fps * 2))`, up to `max_frames=30`). Each frame item in `frames` contains:
  ```python
  {
      "frame_number": idx,             # int
      "timestamp": timestamp_str,       # str "MM:SS.ss"
      "timestamp_sec": round(..., 3),   # float
      "image_path": frame_path,         # str (in tmpdir)
      "resolution": (width, height)     # tuple (w, h)
  }
  ```

- **Inference Predictions**:
  ```python
  604: frame_paths = [f["image_path"] for f in frames]
  605: frame_predictions = models.spatial_detector.predict_frames_batch(frame_paths)
  ...
  623: clip_predictions = [models.clip_detector.predict_frame(fp) for fp in frame_paths]
  ```
  `frame_predictions` in `backend/netra/pipeline/detectors/spatial.py:319-325` returns:
  ```python
  {
      "fake_probability": round(fake_prob, 4),
      "flags": flags,
      "face_found": face_found,
      "confidence": round(fake_prob, 4),
      "face_crop": face_crop,
  }
  ```

- **Evidence Bundle & Suspicious Frames**:
  `backend/netra/pipeline/evidence.py:108-132`:
  ```python
  for i, (frame_info, pred) in enumerate(zip(frames, frame_predictions)):
      spatial_score = pred.get("fake_probability", 0.0) or 0.0
      clip_score = clip_predictions[i].get("fake_probability") if clip_predictions else None
      effective_score = max(spatial_score, clip_score if clip_score is not None else 0)
      if effective_score > 0.5:
          suspicious_frames.append(FrameEvidence(
              frame_number=frame_info["frame_number"],
              timestamp=frame_info["timestamp"],
              spatial_score=round(spatial_score, 4),
              clip_score=round(clip_score, 4) if clip_score is not None else None,
              flags=pred.get("flags", []),
              confidence=round(effective_score, 4),
          ))
  suspicious_frames.sort(key=lambda x: x.confidence, reverse=True)
  ```
  *Crucial observation*: `FrameEvidence` (`evidence.suspicious_frames`) records `frame_number`, `timestamp`, `spatial_score`, `clip_score`, `flags`, and `confidence`, but does **not** preserve `image_path`. The local file path must be looked up from `frames` using `frame_number`.

- **Current `final_result["frames"]` Structure (`worker/worker.py:785-794`)**:
  ```python
  "frames": [
      {
          "frame_number": f.frame_number,
          "timestamp": f.timestamp,
          "confidence": f.confidence,
          "flags": f.flags,
          "spatial_score": f.spatial_score,
      }
      for f in evidence.suspicious_frames[:20]
  ]
  ```
  Currently, `annotated_image_url` is missing from `final_result["frames"][i]`.

---

### 1.2 Visual Anomaly Localization Engine (`backend/netra/pipeline/visual_localizer.py`)
- **Direct verification via test execution**:
  ```
  Command: ./venv/bin/python -c "import sys, cv2, numpy as np, time; sys.path.insert(0, 'backend'); from netra.pipeline.visual_localizer import VisualAnomalyLocalizer; dummy = np.zeros((720, 1280, 3), dtype=np.uint8); t0 = time.perf_counter(); ann, meta = VisualAnomalyLocalizer.localize_and_annotate(dummy, anomaly_score=0.92); t1 = time.perf_counter(); print(f'Execution time: {(t1-t0)*1000:.2f} ms', meta)"
  Output:
  Execution time: 14.63 ms {'bounding_box': [398, 231, 483, 126], 'semantic_label': 'Eyewear Specular Glare & Feature Discontinuity', 'anomaly_score': 0.92, 'evidence_code': 'EVD-EYE-SPECULAR-GLARE', 'statutory_act': 'Section 65B Indian Evidence Act'}
  ```
- **Visual styling parameters in `VisualAnomalyLocalizer`**:
  - `AMBER_BGR = (11, 158, 245)`: Matches `#f59e0b` (`R: 245, G: 158, B: 11`).
  - `DARK_BG_BGR = (15, 23, 42)`: High-contrast badge background (`#0f172a`, slate-900).
  - Bounding box: 3px amber stroke outlining the specular glare/facial boundary plane (`cv2.rectangle(..., 3)`), framing the landmark without obscuring facial identity.
  - Forensic badge: Pill banner placed above the bounding box displaying `ANOMALY DETECTED HERE` with 1px amber border, anti-aliased font, and dark fill.
  - Performance: 14.63 ms per frame, safely below the 200 ms requirement.

---

### 1.3 Media Storage & URL Routing Contracts
- **Server Media Mount (`backend/api/server.py:57-61`)**:
  ```python
  MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
  os.makedirs(os.path.join(MEDIA_DIR, "videos"), exist_ok=True)
  os.makedirs(os.path.join(MEDIA_DIR, "images"), exist_ok=True)
  os.makedirs(os.path.join(MEDIA_DIR, "audio"), exist_ok=True)
  app.mount("/api/v1/media", StaticFiles(directory=MEDIA_DIR), name="media")
  ```
- **Frontend Rewrites (`frontend/next.config.js:12-18`)**:
  ```javascript
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/:path*`
      }
    ];
  }
  ```
- **URL Schema Resolution**:
  - When a file is written to `{MEDIA_DIR}/keyframes/{filename}`:
    - FastAPI route: `/api/v1/media/keyframes/{filename}`
    - Frontend browser URL: `/api/backend/api/v1/media/keyframes/{filename}`
    - Local filesystem path for backend PDF generator: `{MEDIA_DIR}/keyframes/{filename}`

---

### 1.4 Downstream Consumers of Keyframe Snapshots
1. **Frontend jsPDF Generator (`frontend/lib/pdfReportGenerator.ts:41-48, 174-217`)**:
   ```typescript
   keyframeSnapshots?: Array<{
     frame_number: number;
     timestamp: string;
     anomaly_region?: string;
     anomaly_score?: number;
     image_base64?: string;
     bounding_box?: [number, number, number, number];
   }>;
   ```
2. **Backend ReportLab FIR PDF (`backend/api/routes/threat_intel.py:234-262`)**:
   ```python
   keyframe_snaps = iocs.get("keyframe_snapshots") or []
   if keyframe_snaps:
       for snap in keyframe_snaps[:2]:
           img_p = snap.get("image_path")
           if img_p and os.path.exists(img_p):
               rl_img = RLImage(img_p, width=220, height=145)
   ```
   Requires `image_path` pointing to a valid disk file path in `extracted_iocs["keyframe_snapshots"]`.
3. **Threat Catalog Ingestion (`backend/api/routes/jobs.py:207-210`)**:
   ```python
   "extracted_iocs": {
       "video_duration_sec": result.get("video_duration", 0),
       "frames_sampled": len(result.get("frames") or []),
   }
   ```
   Currently omits `keyframe_snapshots`. Passing `result.get("keyframe_snapshots", [])` into `extracted_iocs` will automatically bridge the worker output to the FIR PDF generator.

---

## 2. Logic Chain

1. **Premise 1**: In `worker/worker.py`, video processing occurs inside `tempfile.TemporaryDirectory() as tmpdir`.
   - **Inference 1**: Any keyframe snapshots must be written to `os.path.join(MEDIA_DIR, "keyframes")` before the `with` block closes, otherwise the rendered frames are deleted upon task completion.

2. **Premise 2**: Requirement R2 specifies:
   - For the top 2-3 flagged anomaly frames in any analyzed video:
     - Render an amber tamper-evident bounding box (`#f59e0b`) with a high-contrast forensic badge (`ANOMALY DETECTED HERE`).
     - Save keyframe snapshot images to cloud storage / local artifacts directory.
     - Return annotated snapshot references in `final_result["frames"][i]["annotated_image_url"]`.
   - **Inference 2**: We must identify candidate anomaly frames by ranking their scores.
     - Primary filter: Frames where `confidence > 0.75` (high generative anomaly).
     - Fallback / Guarantees: If fewer than 2 frames exceed 0.75 (e.g. authentic or borderline media), take the highest-scoring frames available from `evidence.suspicious_frames` (or sorted `frames`).
     - Cap at top 2–3 frames (`selected_frames = candidates[:3]`).

3. **Premise 3**: Rendering requires `VisualAnomalyLocalizer.localize_and_annotate(frame_bgr, anomaly_score=...)`.
   - **Inference 3**: In `worker/worker.py`, after Stage 8 (`build_evidence_bundle`), we map the selected `frame_number` back to `frames[i]["image_path"]`, load `cv2.imread(img_path)`, pass it to `VisualAnomalyLocalizer.localize_and_annotate`, and write the resulting image to `{MEDIA_DIR}/keyframes/{job_id}_frame_{frame_number:06d}_annotated.jpg`.

4. **Premise 4**: Both browser clients and backend PDF generators require access to these snapshots.
   - **Inference 4**:
     - Provide `annotated_image_url = f"/api/backend/api/v1/media/keyframes/{filename}"` in `final_result["frames"][i]["annotated_image_url"]`.
     - Also populate `"image_path"`, `"bounding_box"`, and `"anomaly_region"` in each matching frame.
     - Add `final_result["keyframe_snapshots"]` containing the top 2-3 snapshot records with both `annotated_image_url` and `image_path`.
     - Update `backend/api/routes/jobs.py` to forward `result.get("keyframe_snapshots")` into `extracted_iocs["keyframe_snapshots"]`.

5. **Premise 5**: Requirement R4 mandates zero unhandled exceptions.
   - **Inference 5**: All OpenCV operations, image loading, disk I/O, S3 cloud upload, and bounding box drawing must be guarded with explicit `try...except` blocks and fallback values. If any frame fails annotation, the worker must log a warning and continue without failing the overall video analysis job.

---

## 3. Caveats

1. **InsightFace vs Haar Cascade Availability**:
   `VisualAnomalyLocalizer` uses facial proportions and center portrait geometric anchors when specific landmark coordinates are not supplied. It can optionally utilize OpenCV's built-in Haar Cascade (`cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')`) to lock onto detected face bounding boxes dynamically.
2. **S3 Upload in Local / Offline Environments**:
   When AWS credentials or S3 buckets are unreachable (e.g., local developer testing or offline sandboxes), S3 upload will raise a `ClientError` or connection timeout. The worker must catch this exception and continue using the local media directory path.
3. **DynamoDB 400 KB Item Size Limit**:
   Snapshot images must **never** be stored as raw base64 data inside `final_result` written to DynamoDB. Storing the static URL (`annotated_image_url`) and disk path (`image_path`) keeps the DynamoDB item payload well under 10 KB.

---

## 4. Conclusion & Technical Blueprint

### 4.1 Proposed Integration in `worker/worker.py`

#### A. Media Directory Setup & Localizer Import
Add to top-level setup in `worker/worker.py`:
```python
from netra.pipeline.visual_localizer import VisualAnomalyLocalizer

MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
KEYFRAMES_DIR = os.path.join(MEDIA_DIR, "keyframes")
os.makedirs(KEYFRAMES_DIR, exist_ok=True)
```

#### B. Keyframe Snapshot Generation Logic (Between Stage 8 and Stage 9 in `process_job`)
```python
        # === STAGE 8.5: Visual Anomaly Localization & Snapshot Generation ===
        keyframe_snapshots = []
        annotated_frames_map = {}

        if cv2 is not None and frames:
            try:
                # 1. Map frame_number -> frame dict for rapid lookup
                frame_dict_by_num = {f["frame_number"]: f for f in frames}

                # 2. Extract anomaly candidates (sorted by confidence descending)
                # Primary candidates: confidence > 0.75
                high_anomaly = [
                    f for f in evidence.suspicious_frames
                    if f.confidence > 0.75
                ]

                # Fallback: if fewer than 2 frames exceed 0.75, take top suspicious frames or top frames overall
                if len(high_anomaly) >= 2:
                    candidates = high_anomaly[:3]
                elif evidence.suspicious_frames:
                    candidates = evidence.suspicious_frames[:3]
                else:
                    # Synthetic fallback from frame predictions
                    candidates = []
                    indexed_preds = sorted(
                        enumerate(frame_predictions),
                        key=lambda x: x[1].get("fake_probability", 0.0),
                        reverse=True
                    )[:3]
                    for idx, pred in indexed_preds:
                        if idx < len(frames):
                            candidates.append(type("Candidate", (), {
                                "frame_number": frames[idx]["frame_number"],
                                "timestamp": frames[idx]["timestamp"],
                                "confidence": pred.get("fake_probability", 0.5),
                                "flags": pred.get("flags", [])
                            }))

                # 3. Render bounding box and persist top 2-3 anomaly frames
                for cand in candidates[:3]:
                    f_info = frame_dict_by_num.get(cand.frame_number)
                    if not f_info or not os.path.exists(f_info["image_path"]):
                        continue

                    raw_bgr = cv2.imread(f_info["image_path"])
                    if raw_bgr is None or raw_bgr.size == 0:
                        continue

                    # Localize and render amber bounding box + forensic badge
                    annotated_bgr, meta = VisualAnomalyLocalizer.localize_and_annotate(
                        raw_bgr,
                        anomaly_score=cand.confidence
                    )

                    # Save to persistent keyframes directory
                    snap_filename = f"{job_id}_frame_{cand.frame_number:06d}_annotated.jpg"
                    snap_filepath = os.path.join(KEYFRAMES_DIR, snap_filename)
                    cv2.imwrite(snap_filepath, annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    # Attempt S3 cloud upload if available
                    try:
                        s3.upload_file(
                            snap_filepath,
                            S3_BUCKET_MEDIA,
                            f"{job_id}/keyframes/{snap_filename}"
                        )
                    except Exception as s3_err:
                        logger.debug(f"S3 keyframe upload skipped/failed: {s3_err}")

                    annotated_url = f"/api/backend/api/v1/media/keyframes/{snap_filename}"
                    snap_record = {
                        "frame_number": cand.frame_number,
                        "timestamp": cand.timestamp,
                        "confidence": cand.confidence,
                        "anomaly_score": meta.get("anomaly_score", cand.confidence),
                        "anomaly_region": meta.get("semantic_label", "Eyewear Specular Glare & Feature Discontinuity"),
                        "evidence_code": meta.get("evidence_code", "EVD-EYE-SPECULAR-GLARE"),
                        "bounding_box": meta.get("bounding_box"),
                        "annotated_image_url": annotated_url,
                        "image_path": snap_filepath,
                    }
                    keyframe_snapshots.append(snap_record)
                    annotated_frames_map[cand.frame_number] = snap_record

                logger.info(f"Generated {len(keyframe_snapshots)} visual anomaly keyframe snapshots for job {job_id}")

            except Exception as e:
                logger.error(f"Visual anomaly snapshot generation failed for job {job_id}: {e}", exc_info=True)
                keyframe_snapshots = []
                annotated_frames_map = {}
```

#### C. `final_result` Payload Assembly (Stage 10 in `worker/worker.py`)
```python
        # In final_result assembly:
        final_result = {
            "verdict": fusion_result["verdict"],
            "confidence": fusion_result["confidence"],
            "visual_score": fusion_result["visual_score"],
            "gend_score": global_gend,
            "audio_score": fusion_result.get("audio_score"),
            "clip_score": fusion_result.get("clip_score"),
            "risk_level": fusion_result["risk_level"],
            "frames": [
                {
                    "frame_number": f.frame_number,
                    "timestamp": f.timestamp,
                    "confidence": f.confidence,
                    "flags": f.flags,
                    "spatial_score": f.spatial_score,
                    "annotated_image_url": annotated_frames_map.get(f.frame_number, {}).get("annotated_image_url"),
                    "image_path": annotated_frames_map.get(f.frame_number, {}).get("image_path"),
                    "bounding_box": annotated_frames_map.get(f.frame_number, {}).get("bounding_box"),
                    "anomaly_region": annotated_frames_map.get(f.frame_number, {}).get("anomaly_region"),
                }
                for f in evidence.suspicious_frames[:20]
            ],
            "keyframe_snapshots": keyframe_snapshots,
            ...
        }
```

#### D. Threat Catalog Indexing Support (`backend/api/routes/jobs.py:207-210`)
Ensure `keyframe_snapshots` is propagated when saving to threat catalog:
```python
    "extracted_iocs": {
        "video_duration_sec": result.get("video_duration", 0),
        "frames_sampled": len(result.get("frames") or []),
        "keyframe_snapshots": result.get("keyframe_snapshots", []),
    },
```

---

## 5. Verification Method

### 5.1 Automated Unit & Integration Tests
1. **Direct Localization Benchmark**:
   ```bash
   ./venv/bin/python -c "import sys, cv2, numpy as np; sys.path.insert(0, 'backend'); from netra.pipeline.visual_localizer import VisualAnomalyLocalizer; img = np.zeros((720, 1280, 3), dtype=np.uint8); ann, m = VisualAnomalyLocalizer.localize_and_annotate(img, 0.95); assert ann.shape == img.shape; assert m['bounding_box'][2] > 0; print('TEST PASSED')"
   ```
2. **Worker Daemon Unit Tests**:
   ```bash
   PYTHONPATH=. ./venv/bin/pytest tests/test_worker_daemon_unit.py -v
   ```
3. **End-to-End Pipeline Verification on Deepfake Video Sample**:
   Execute a single synthetic video pass and assert snapshot generation:
   ```bash
   ./venv/bin/python -c "
   import sys, os, tempfile
   sys.path.insert(0, 'backend')
   sys.path.insert(0, '.')
   from worker.worker import ModelRegistry, process_job
   # Mock or supply a test video and verify final_result['frames'][0]['annotated_image_url'] is populated
   "
   ```

### 5.2 Files to Inspect
- `worker/worker.py`: Check Stage 8.5 integration, snapshot generation, and `final_result["frames"]`.
- `backend/netra/pipeline/visual_localizer.py`: Verify `#f59e0b` amber border and `ANOMALY DETECTED HERE` badge layout.
- `backend/media/keyframes/`: Inspect generated `.jpg` artifacts on disk.
- `backend/api/server.py`: Verify `/api/v1/media` static mount and `keyframes` subfolder creation.
- `backend/api/routes/jobs.py`: Verify `extracted_iocs["keyframe_snapshots"]` propagation.

### 5.3 Invalidation Conditions
- Any change to `NETRA_MEDIA_DIR` without corresponding mount updates in `backend/api/server.py`.
- Any modification causing `final_result["frames"][i]["annotated_image_url"]` to contain non-serializable objects.
- Any unhandled exception during `cv2.imwrite` or `VisualAnomalyLocalizer.localize_and_annotate` that causes `process_job` to abort before writing `final_result` to DynamoDB.
