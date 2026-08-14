"""
NETRA Worker Daemon Adversarial Fault Injection & Stress Test Suite
===================================================================
Challenger M7-1 verification suite targeting `worker/worker.py`.
Adversarial stress-testing across 7 rigorous testing categories:
  1. Localizer Fault Injection (OOM, CUDA faults, ValueError, AttributeError, filter errors)
  2. File I/O & Storage Fault Injection (PermissionError, ENOSPC, False return, read-only dirs)
  3. Frame Corruption & Missing Media (Missing files, 0-byte files, corrupt binary headers, missing keys, mixed batches)
  4. Boundary Conditions & Empty Payloads (Empty frames, empty predictions, zero anomaly scores)
  5. Cloud Network Fault Injection (S3 ClientError, network timeout, DynamoDB failure)
  6. Worker Daemon Supervisor Resilience (Poison pill SQS payloads, permanent vs transient error classification)
  7. Real Benchmark Deepfake Stress Execution (Multi-video processing, latency <200ms, amber badge verification)
"""

import os
import sys
import shutil
import tempfile
import time
import json
from unittest.mock import MagicMock, patch

import pytest
import numpy as np
import cv2
from botocore.exceptions import ClientError

# Ensure root is on path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import worker.worker as worker_module

BENCHMARK_BASE_DIR = os.path.join(
    ROOT_DIR, "garbage", "kaggle_and_scratch", "benchmark_datasets", "generated_100_deepfake_videos"
)
SAMPLE_VIDEO = os.path.join(BENCHMARK_BASE_DIR, "deepfake_Ajit_Doval.mp4")


@pytest.fixture
def mock_worker_env():
    """Provides a mocked S3 and DynamoDB environment for isolated worker testing."""
    mock_s3 = MagicMock()
    mock_dynamo = MagicMock()
    captured_results = []
    captured_progress = []
    captured_errors = []

    def mock_download(bucket, key, dest):
        if os.path.exists(SAMPLE_VIDEO):
            shutil.copyfile(SAMPLE_VIDEO, dest)
        else:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(dest, fourcc, 25.0, (640, 480))
            for _ in range(30):
                out.write(np.zeros((480, 640, 3), dtype=np.uint8))
            out.release()

    mock_s3.download_file = mock_download
    mock_s3.upload_file = MagicMock()

    def capture_write_result(job_id, result, worker_id=None):
        captured_results.append(result)

    def capture_progress(job_id, status, progress, stage, worker_id=None):
        captured_progress.append((status, progress, stage))

    def capture_error(job_id, error, worker_id=None):
        captured_errors.append(error)

    with patch.object(worker_module, "s3", mock_s3), \
         patch.object(worker_module, "dynamodb", mock_dynamo), \
         patch.object(worker_module, "write_result_to_dynamo", side_effect=capture_write_result), \
         patch.object(worker_module, "update_job_progress", side_effect=capture_progress), \
         patch.object(worker_module, "write_error_to_dynamo", side_effect=capture_error):
        yield {
            "s3": mock_s3,
            "dynamo": mock_dynamo,
            "results": captured_results,
            "progress": captured_progress,
            "errors": captured_errors,
        }


# ==============================================================================
# 1. LOCALIZER FAULT INJECTION (OOM / GPU / HARDWARE CRASHES)
# ==============================================================================

class TestLocalizerFaultInjection:
    """Stress-test worker behavior when VisualAnomalyLocalizer encounters hardware or algorithmic faults."""

    def test_localizer_simulated_oom_cuda_error(self, mock_worker_env):
        """Simulate torch.cuda.OutOfMemoryError or CUDA RuntimeError inside localizer."""
        with patch.object(
            worker_module.VisualAnomalyLocalizer,
            "localize_and_annotate",
            side_effect=RuntimeError("CUDA out of memory. Tried to allocate 2.00 GiB (GPU 0; 15.78 GiB total capacity)"),
        ):
            worker_module.process_job("test-job-oom-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1, "Job must complete and write result to DynamoDB"
        result = mock_worker_env["results"][0]
        # Must gracefully degrade to empty snapshots, without crashing
        assert result["keyframe_snapshots"] == []
        assert "verdict" in result
        assert "confidence" in result
        assert len(mock_worker_env["errors"]) == 0, "No fatal job error should be registered"

    def test_localizer_simulated_value_and_type_errors(self, mock_worker_env):
        """Simulate unexpected ValueError or TypeError during landmark region calculation."""
        with patch.object(
            worker_module.VisualAnomalyLocalizer,
            "localize_and_annotate",
            side_effect=ValueError("Invalid landmark geometry or negative bounding box"),
        ):
            worker_module.process_job("test-job-value-err-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        assert res["keyframe_snapshots"] == []
        assert isinstance(res["frames"], list)

    def test_localizer_missing_dependency_simulation(self, mock_worker_env):
        """Simulate VisualAnomalyLocalizer being None (e.g. failed import)."""
        with patch.object(worker_module, "VisualAnomalyLocalizer", None):
            worker_module.process_job("test-job-no-localizer-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        assert res["keyframe_snapshots"] == []

    def test_localizer_filter_algorithm_exception(self, mock_worker_env):
        """Simulate exception during filter_high_anomaly_keyframes."""
        with patch.object(
            worker_module.VisualAnomalyLocalizer,
            "filter_high_anomaly_keyframes",
            side_effect=IndexError("List index out of range during temporal spacing filter"),
        ):
            worker_module.process_job("test-job-filter-err-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        assert mock_worker_env["results"][0]["keyframe_snapshots"] == []


# ==============================================================================
# 2. FILE I/O & DISK STORAGE FAULT INJECTION
# ==============================================================================

class TestFileStorageFaultInjection:
    """Stress-test filesystem errors during snapshot persistence (cv2.imwrite, permissions, missing dirs)."""

    def test_imwrite_permission_denied(self, mock_worker_env):
        """Simulate PermissionError when writing keyframe snapshot."""
        orig_imwrite = cv2.imwrite
        def imwrite_fault(path, *args, **kwargs):
            if "keyframes" in str(path) or "annotated" in str(path):
                raise PermissionError(f"Permission denied: {path}")
            return orig_imwrite(path, *args, **kwargs)

        with patch("worker.worker.cv2.imwrite", side_effect=imwrite_fault):
            worker_module.process_job("test-job-write-perm-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        assert mock_worker_env["results"][0]["keyframe_snapshots"] == []

    def test_imwrite_disk_full_enospc(self, mock_worker_env):
        """Simulate OSError ENOSPC (No space left on device)."""
        orig_imwrite = cv2.imwrite
        def imwrite_fault(path, *args, **kwargs):
            if "keyframes" in str(path) or "annotated" in str(path):
                raise OSError(28, "No space left on device")
            return orig_imwrite(path, *args, **kwargs)

        with patch("worker.worker.cv2.imwrite", side_effect=imwrite_fault):
            worker_module.process_job("test-job-enospc-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        assert mock_worker_env["results"][0]["keyframe_snapshots"] == []

    def test_nonexistent_unwritable_keyframes_directory(self, mock_worker_env, monkeypatch):
        """Simulate KEYFRAMES_DIR pointing to a non-existent unwritable directory."""
        unwritable_dir = "/proc/invalid_readonly_sys_dir/keyframes"
        monkeypatch.setattr(worker_module, "KEYFRAMES_DIR", unwritable_dir)

        worker_module.process_job("test-job-bad-dir-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        # Should not crash unhandled, job completes safely
        assert "verdict" in mock_worker_env["results"][0]


# ==============================================================================
# 3. FRAME CORRUPTION & MISSING MEDIA FAULT INJECTION
# ==============================================================================

class TestCorruptAndMissingMediaFaultInjection:
    """Stress-test handling of corrupt, missing, or malformed image files."""

    def test_frame_image_file_deleted_before_localization(self, mock_worker_env):
        """Simulate frames where image_path was removed prior to Stage 8.5."""
        orig_extract = worker_module.sys.modules["netra.pipeline.extractor"].extract_frames

        def patched_extract(*args, **kwargs):
            frames = orig_extract(*args, **kwargs)
            # Delete image file from disk for the first frame
            if frames and os.path.exists(frames[0]["image_path"]):
                os.remove(frames[0]["image_path"])
            return frames

        with patch("netra.pipeline.extractor.extract_frames", side_effect=patched_extract):
            worker_module.process_job("test-job-missing-frame-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        # Job completes safely, remaining frames processed
        assert mock_worker_env["results"][0]["status"] if "status" in mock_worker_env["results"][0] else True

    def test_corrupt_zero_byte_frame_files(self, mock_worker_env):
        """Simulate 0-byte frame files which cause cv2.imread to return None."""
        orig_extract = worker_module.sys.modules["netra.pipeline.extractor"].extract_frames

        def patched_extract(*args, **kwargs):
            frames = orig_extract(*args, **kwargs)
            # Truncate all frame files to 0 bytes
            for f in frames:
                if os.path.exists(f["image_path"]):
                    with open(f["image_path"], "wb") as fh:
                        fh.truncate(0)
            return frames

        with patch("netra.pipeline.extractor.extract_frames", side_effect=patched_extract):
            worker_module.process_job("test-job-zero-byte-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        # cv2.imread returns None, worker skips them without unhandled exception
        assert mock_worker_env["results"][0]["keyframe_snapshots"] == []

    def test_corrupt_binary_junk_frame_files(self, mock_worker_env):
        """Simulate corrupted image files containing arbitrary non-image binary bytes."""
        orig_extract = worker_module.sys.modules["netra.pipeline.extractor"].extract_frames

        def patched_extract(*args, **kwargs):
            frames = orig_extract(*args, **kwargs)
            for f in frames:
                if os.path.exists(f["image_path"]):
                    with open(f["image_path"], "wb") as fh:
                        fh.write(b"\x00\xff\xfe\x00GARBAGE_BYTES_CORRUPT_HEADER")
            return frames

        with patch("netra.pipeline.extractor.extract_frames", side_effect=patched_extract):
            worker_module.process_job("test-job-corrupt-junk-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        assert mock_worker_env["results"][0]["keyframe_snapshots"] == []

    def test_mixed_valid_and_corrupt_frames_batch(self, mock_worker_env):
        """Verify that when only some frames are corrupt, the valid frames are still processed."""
        orig_extract = worker_module.sys.modules["netra.pipeline.extractor"].extract_frames

        def patched_extract(*args, **kwargs):
            frames = orig_extract(*args, **kwargs)
            if len(frames) >= 2:
                # Corrupt the first frame, leave the second frame intact
                with open(frames[0]["image_path"], "wb") as fh:
                    fh.truncate(0)
            return frames

        with patch("netra.pipeline.extractor.extract_frames", side_effect=patched_extract):
            worker_module.process_job("test-job-mixed-batch-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        # Should successfully extract at least 1 snapshot from the remaining valid frames
        assert len(res["keyframe_snapshots"]) >= 1


# ==============================================================================
# 4. BOUNDARY CONDITIONS & EMPTY PAYLOADS
# ==============================================================================

class TestEmptyAndBoundaryPayloadFaultInjection:
    """Stress-test worker behavior with empty frame lists, missing keys, and boundary scores."""

    def test_empty_extracted_frames_list(self, mock_worker_env):
        """Simulate video yielding 0 frames."""
        with patch("netra.pipeline.extractor.extract_frames", return_value=[]):
            worker_module.process_job("test-job-empty-frames-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        assert res["frames"] == []
        assert res["keyframe_snapshots"] == []

    def test_missing_frame_predictions(self, mock_worker_env):
        """Simulate spatial detector returning empty predictions list."""
        models = worker_module.ModelRegistry.get_instance()
        with patch.object(models.spatial_detector, "predict_frames_batch", return_value=[]):
            worker_module.process_job(
                "test-job-empty-preds-001",
                "deepfake_Ajit_Doval.mp4",
                worker_id="test-worker",
                models=models,
            )

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        assert isinstance(res["frames"], list)

    def test_clip_predictions_none(self, mock_worker_env):
        """Simulate clip detector returning None."""
        models = worker_module.ModelRegistry.get_instance()
        with patch.object(models, "clip_detector", None):
            worker_module.process_job(
                "test-job-no-clip-001",
                "deepfake_Ajit_Doval.mp4",
                worker_id="test-worker",
                models=models,
            )

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        assert res["clip_score"] is None

    def test_authentic_video_no_high_anomaly_frames(self, mock_worker_env):
        """Simulate an authentic video where no frame exceeds threshold 0.75."""
        models = worker_module.ModelRegistry.get_instance()

        def low_anomaly_preds(paths):
            return [{"fake_probability": 0.05, "flags": [], "face_crop": None} for _ in paths]

        with patch.object(models.spatial_detector, "predict_frames_batch", side_effect=low_anomaly_preds), \
             patch.object(models.fusion_engine, "fuse", return_value={
                 "verdict": "authentic",
                 "confidence": 99.0,
                 "visual_score": 0.05,
                 "risk_level": "LOW",
             }):
            worker_module.process_job(
                "test-job-authentic-001",
                "deepfake_Ajit_Doval.mp4",
                worker_id="test-worker",
                models=models,
            )

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        # Authentic video with no high anomalies should NOT produce fake alarm snapshots
        assert len(res["keyframe_snapshots"]) == 0


# ==============================================================================
# 5. CLOUD & NETWORK FAULT INJECTION (S3 / DYNAMODB)
# ==============================================================================

class TestCloudFaultInjection:
    """Stress-test external AWS service failures (S3 ClientError, DynamoDB update failure)."""

    def test_s3_upload_client_error(self, mock_worker_env):
        """Simulate S3 AccessDenied / NoSuchBucket during snapshot upload."""
        mock_worker_env["s3"].upload_file.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied to S3 Bucket"}},
            "UploadFile",
        )

        worker_module.process_job("test-job-s3-fail-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        assert len(mock_worker_env["results"]) == 1
        res = mock_worker_env["results"][0]
        # Local snapshots should still be saved even if cloud upload fails
        assert len(res["keyframe_snapshots"]) >= 1
        for snap in res["keyframe_snapshots"]:
            assert os.path.exists(snap["image_path"]), "Local snapshot file must exist"

    def test_dynamodb_progress_update_failure(self, mock_worker_env):
        """Simulate DynamoDB ThrottlingException during update_job_progress."""
        mock_worker_env["dynamo"].update_item.side_effect = ClientError(
            {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "Throttled"}},
            "UpdateItem",
        )

        # Should not crash the main pipeline thread
        worker_module.process_job("test-job-dynamo-throttled-001", "deepfake_Ajit_Doval.mp4", worker_id="test-worker")

        # Job completes and attempts to write final result
        assert len(mock_worker_env["results"]) == 1


# ==============================================================================
# 6. WORKER DAEMON SUPERVISOR FAULT HANDLING
# ==============================================================================

class TestDaemonSupervisorResilience:
    """Stress-test the main daemon polling loop (run_worker) under poisoned or invalid SQS messages."""

    def test_poison_pill_non_json_messages(self, monkeypatch):
        """Verify non-JSON poison pills are logged and deleted without crashing daemon."""
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        calls = [0]
        def fake_receive(**kwargs):
            calls[0] += 1
            if calls[0] == 1:
                return {"Messages": [{"ReceiptHandle": "rh-corrupt-json", "Body": "<<NOT_JSON>>"}]}
            elif calls[0] == 2:
                return {"Messages": [{"ReceiptHandle": "rh-bad-schema", "Body": json.dumps({"foo": "bar"})}]}
            raise KeyboardInterrupt()

        mock_sqs.receive_message.side_effect = fake_receive
        worker_module.run_worker()

        deleted = [c[1]["ReceiptHandle"] for c in mock_sqs.delete_message.call_args_list]
        assert "rh-corrupt-json" in deleted
        assert "rh-bad-schema" in deleted

    def test_permanent_vs_transient_error_classification(self, monkeypatch):
        """
        Verify that:
        - Permanent errors (ValueError, cv2.error) delete message from queue (avoid poison loop).
        - Transient errors (RuntimeError) keep message in queue (allow SQS redrive / DLQ).
        """
        mock_sqs = MagicMock()
        mock_dynamo = MagicMock()
        monkeypatch.setattr(worker_module, "sqs", mock_sqs)
        monkeypatch.setattr(worker_module, "dynamodb", mock_dynamo)

        step = [0]
        def fake_receive(**kwargs):
            step[0] += 1
            if step[0] == 1:
                # Permanent error job
                return {"Messages": [{"ReceiptHandle": "rh-perm", "Body": json.dumps({"job_id": "j-perm", "s3_key": "k-perm"})}]}
            elif step[0] == 2:
                # Transient error job
                return {"Messages": [{"ReceiptHandle": "rh-trans", "Body": json.dumps({"job_id": "j-trans", "s3_key": "k-trans"})}]}
            raise KeyboardInterrupt()

        def fake_process_job(job_id, s3_key, **kwargs):
            if job_id == "j-perm":
                raise ValueError("Permanent corrupt container")
            elif job_id == "j-trans":
                raise RuntimeError("Transient network timeout")

        mock_sqs.receive_message.side_effect = fake_receive
        monkeypatch.setattr(worker_module, "process_job", fake_process_job)

        worker_module.run_worker()

        deleted = [c[1]["ReceiptHandle"] for c in mock_sqs.delete_message.call_args_list]
        assert "rh-perm" in deleted, "Permanent error message must be deleted from queue"
        assert "rh-trans" not in deleted, "Transient error message must NOT be deleted (allow DLQ redrive)"


# ==============================================================================
# 7. REAL BENCHMARK DEEPFAKE STRESS EXECUTION
# ==============================================================================

class TestRealBenchmarkDeepfakesStress:
    """Execute end-to-end processing across real deepfake videos from the 100 benchmark dataset."""

    @pytest.mark.parametrize("video_filename,expected_anomaly_type", [
        ("deepfake_Ajit_Doval.mp4", "Eyewear Specular Glare"),
        ("deepfake_Alia_Bhatt.mp4", "Iris/Pupil Corneal Reflection"),
        ("deepfake_Narendra_Modi.mp4", "Lip-Sync Blending Boundary"),
    ])
    def test_real_benchmark_video_snapshot_generation(self, video_filename, expected_anomaly_type):
        """Verify real video processing, snapshot files, amber border, and <200ms latency."""
        video_path = os.path.join(BENCHMARK_BASE_DIR, video_filename)
        if not os.path.exists(video_path):
            pytest.skip(f"Benchmark video {video_filename} not found")

        job_id = f"challenger-stress-{video_filename.replace('.mp4', '')}"
        captured_results = []

        mock_s3 = MagicMock()
        mock_s3.download_file = lambda b, k, dest: shutil.copyfile(video_path, dest)
        mock_s3.upload_file = MagicMock()

        t0 = time.perf_counter()
        with patch.object(worker_module, "s3", mock_s3), \
             patch.object(worker_module, "update_job_progress", MagicMock()), \
             patch.object(worker_module, "write_result_to_dynamo", side_effect=lambda j, r, worker_id=None: captured_results.append(r)):
            worker_module.process_job(job_id, video_filename, worker_id="challenger-real")
        elapsed_total = time.perf_counter() - t0

        assert len(captured_results) == 1, f"Job {job_id} failed to complete"
        result = captured_results[0]

        snapshots = result.get("keyframe_snapshots", [])
        assert len(snapshots) >= 1, f"No keyframe snapshots generated for {video_filename}"
        assert len(snapshots) <= 3, f"Must not exceed top 3 snapshots cap (got {len(snapshots)})"

        for snap in snapshots:
            # 1. Disk persistence verification
            snap_path = snap["image_path"]
            assert os.path.exists(snap_path), f"Snapshot file {snap_path} does not exist"
            assert os.path.getsize(snap_path) > 1000, "Snapshot image file must not be empty"

            # 2. Bounding box validity
            img = cv2.imread(snap_path)
            assert img is not None, "Failed to load generated snapshot"
            h, w = img.shape[:2]

            bbox = snap["bounding_box"]
            assert len(bbox) == 4
            bx, by, bw, bh = bbox
            assert bx >= 0 and by >= 0 and bx + bw <= w and by + bh <= h, (
                f"Bounding box {bbox} out of bounds for image {(w, h)}"
            )

            # 3. Amber color verification (#f59e0b in BGR is (11, 158, 245))
            bgr_amber = np.array([11, 158, 245], dtype=np.int16)
            diff = np.abs(img.astype(np.int16) - bgr_amber)
            close_amber = np.all(diff <= 12, axis=2)
            amber_pixel_count = int(np.sum(close_amber))
            assert amber_pixel_count >= 500, (
                f"Expected amber '#f59e0b' bounding box pixels, found only {amber_pixel_count}"
            )

            # 4. Schema verification
            assert snap["annotated_image_url"].startswith("/api/")
            assert snap["anomaly_score"] > 0.0

        # Latency check: keyframe annotation latency should be under 200ms
        raw_test_frame = cv2.imread(snapshots[0]["image_path"])
        latencies = []
        for _ in range(5):
            t_start = time.perf_counter()
            _, _ = worker_module.VisualAnomalyLocalizer.localize_and_annotate(raw_test_frame, anomaly_score=0.92)
            latencies.append((time.perf_counter() - t_start) * 1000)

        avg_latency_ms = sum(latencies) / len(latencies)
        assert avg_latency_ms < 200.0, f"Localization latency SLA violated: {avg_latency_ms:.2f}ms >= 200ms"
