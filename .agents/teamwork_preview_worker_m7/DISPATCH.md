# Dispatch for Worker M7: Worker Pipeline Integration & Snapshot Generation (R2)

## Assigned Role
teamwork_preview_worker

## Working Directory
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m7

## File Ownership
- **Exclusively Owned File**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/worker/worker.py`
- Do NOT modify files owned by other milestones without explicit reason.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Authoritative Files to Read First
1. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md` (read under header ## 2026-09-03T20:47:27Z)
2. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md` (§ Interface Contracts § Worker Snapshot Storage & Schema Contract)
3. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_2/handoff.md` (detailed worker integration blueprint)
4. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py` (verified localization engine)
5. `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/worker/worker.py`

## Implementation Tasks in `worker/worker.py`
1. **Persistent Keyframes Directory**:
   - Define and ensure `keyframes_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "media", "keyframes")` or `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/media/keyframes/`.
   - Ensure directory is created: `os.makedirs(keyframes_dir, exist_ok=True)`.
2. **Top 2-3 Anomaly Frame Selection**:
   - In `process_job` (around Stage 9/10):
   - Access `frames` (from `extract_frames`) and `evidence.suspicious_frames` / `frame_predictions`.
   - Identify candidate frames where anomaly score > 0.75 (or fallback to top suspicious frames if none > 0.75 and video is flagged deepfake).
   - Use `VisualAnomalyLocalizer.filter_high_anomaly_keyframes` or equivalent ranking with temporal gap to select the top 2-3 distinct keyframes.
3. **Amber Bounding Box & Badge Rendering**:
   - For each selected keyframe:
     - Read the frame from its temporary `image_path` using `cv2.imread`.
     - Call `VisualAnomalyLocalizer.localize_and_annotate(frame_bgr, anomaly_score, face_bbox)`.
     - Save the annotated image to persistent storage:
       `filename = f"{job_id}_frame_{frame_number}_annotated.jpg"`
       `out_path = os.path.join(keyframes_dir, filename)`
       `cv2.imwrite(out_path, annotated_frame)`
4. **Populate Result Schema**:
   - `annotated_url = f"/api/backend/api/v1/media/keyframes/{filename}"` (and ensure `/api/v1/media/keyframes/{filename}` resolution).
   - In `final_result["frames"]`:
     - For each frame matching a generated snapshot, set `f["annotated_image_url"] = annotated_url`.
     - For other frames, set `f["annotated_image_url"] = None`.
   - Populate `final_result["keyframe_snapshots"]`:
     ```python
     final_result["keyframe_snapshots"] = [
         {
             "frame_number": snap_frame_number,
             "timestamp": snap_timestamp,
             "anomaly_region": meta["semantic_label"],
             "anomaly_score": round(float(meta["anomaly_score"]), 4),
             "image_path": out_path,
             "image_url": annotated_url,
             "detector_subsystem": meta.get("detector_subsystem", "GenD Foundation Model ViT-L/14 + Spatial SBI"),
             "bounding_box": meta["bounding_box"],
             "normalized_box": meta.get("normalized_box"),
             "evidence_code": meta.get("evidence_code", "EVD-ANOMALY"),
             "statutory_act": meta.get("statutory_act", "Section 65B Indian Evidence Act"),
         },
         ...
     ]
     ```
5. **Zero Unhandled Exceptions Shielding**:
   - Wrap the entire keyframe snapshot generation stage in a try/except block that logs errors with traceback and ensures the video analysis job completes successfully even if image annotation encounters an unexpected issue.
6. **Verification**:
   - Execute verification tests with `./venv/bin/pytest tests/test_visual_forensics_e2e.py -k "r2 or worker"` and run a direct test job through `worker.py`.

## Output Requirements
Document all verification commands and passing results in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_worker_m7/handoff.md`.
Notify parent via send_message when complete.
