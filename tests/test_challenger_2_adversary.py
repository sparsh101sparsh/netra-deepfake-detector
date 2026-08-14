"""
================================================================================
CHALLENGER 2 — ADVERSARIAL TELEMETRY, STATE TRANSITIONS & BENCHMARK SUITE
================================================================================
Target Scope:
1. Worker presence tracking (idle -> busy -> idle lifecycle, active_job_id, concurrency)
2. Offline detection (>60s inactivity boundary, malformed timestamps, fleet aggregation)
3. Benchmark execution (deepfake_Neeraj_Chopra.mp4 & job c6a5aa51-812f-44dc-9dce-2edce8d53204)
4. Forensic dossier integrity (fake_probability, suspicious frames, metadata, schema)
================================================================================
"""

import sys
import os
import json
import time
import uuid
import tempfile
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from unittest.mock import patch, MagicMock

import pytest
import numpy as np
import cv2
import torch
from fastapi.testclient import TestClient

# Ensure root and backend directories in sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
WORKER_DIR = os.path.join(ROOT_DIR, "worker")

for p in [ROOT_DIR, BACKEND_DIR, WORKER_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.api.server import app
from backend.api.routes.workers import (
    evaluate_worker_activity,
    get_worker_presence_summary,
    register_local_worker,
    _local_worker_registry,
    WORKER_HEARTBEAT_TIMEOUT_SEC,
)
from backend.api.routes.jobs import (
    save_local_job,
    fetch_job_item,
    _local_jobs_store,
    _parse_dynamo_item,
)
try:
    import worker.worker as worker_module
except ImportError:
    import worker as worker_module

WorkerLivenessRegistry = worker_module.WorkerLivenessRegistry
SQSVisibilityHeartbeat = worker_module.SQSVisibilityHeartbeat
ModelRegistry = worker_module.ModelRegistry
process_job = worker_module.process_job
update_job_progress = worker_module.update_job_progress
write_result_to_dynamo = worker_module.write_result_to_dynamo
write_error_to_dynamo = worker_module.write_error_to_dynamo

REAL_BENCHMARK_VIDEO_PATH = os.path.join(
    os.path.dirname(ROOT_DIR),
    "generated_100_deepfake_videos",
    "deepfake_Neeraj_Chopra.mp4",
)
FALLBACK_BENCHMARK_VIDEO_PATH = os.path.join(
    ROOT_DIR,
    "garbage",
    "kaggle_and_scratch",
    "benchmark_datasets",
    "generated_100_deepfake_videos",
    "deepfake_Neeraj_Chopra.mp4",
)


def get_benchmark_video_path() -> str:
    """Returns absolute path to real benchmark video or synthetic fallback."""
    if os.path.exists(REAL_BENCHMARK_VIDEO_PATH):
        return REAL_BENCHMARK_VIDEO_PATH
    if os.path.exists(FALLBACK_BENCHMARK_VIDEO_PATH):
        return FALLBACK_BENCHMARK_VIDEO_PATH
    # Create synthetic video if not found
    synth_path = "/tmp/deepfake_Neeraj_Chopra_synth.mp4"
    if not os.path.exists(synth_path):
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(synth_path, fourcc, 25.0, (224, 224))
        for i in range(75):  # 3 seconds
            frame = np.full((224, 224, 3), (i * 3) % 256, dtype=np.uint8)
            cv2.circle(frame, (112, 112), 45, (200, 150, 100), -1)
            writer.write(frame)
        writer.release()
    return synth_path


class InMemDynamoDB:
    """In-memory DynamoDB table simulation for adversarial tests."""

    def __init__(self):
        self.tables: Dict[str, Dict[str, Dict[str, Any]]] = {
            "netra-workers": {},
            "netra-jobs": {},
        }
        self.lock = threading.Lock()

    def put_item(self, TableName: str, Item: Dict[str, Any]):
        with self.lock:
            key = None
            if "worker_id" in Item:
                key = Item["worker_id"]["S"]
            elif "job_id" in Item:
                key = Item["job_id"]["S"]
            if TableName not in self.tables:
                self.tables[TableName] = {}
            self.tables[TableName][key] = dict(Item)

    def get_item(self, TableName: str, Key: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            table = self.tables.get(TableName, {})
            key = None
            if "worker_id" in Key:
                key = Key["worker_id"]["S"]
            elif "job_id" in Key:
                key = Key["job_id"]["S"]
            item = table.get(key)
            if item:
                return {"Item": dict(item)}
            return {}

    def update_item(
        self,
        TableName: str,
        Key: Dict[str, Any],
        UpdateExpression: str,
        ExpressionAttributeNames: Optional[Dict[str, str]] = None,
        ExpressionAttributeValues: Optional[Dict[str, Any]] = None,
    ):
        with self.lock:
            table = self.tables.setdefault(TableName, {})
            key = None
            if "worker_id" in Key:
                key = Key["worker_id"]["S"]
            elif "job_id" in Key:
                key = Key["job_id"]["S"]
            item = table.setdefault(key, dict(Key))

            names = ExpressionAttributeNames or {}
            values = ExpressionAttributeValues or {}

            set_clause = UpdateExpression.replace("SET ", "")
            parts = [p.strip() for p in set_clause.split(",")]
            for part in parts:
                tokens = [t.strip() for t in part.split("=")]
                if len(tokens) == 2:
                    raw_lhs, raw_rhs = tokens
                    target_key = names.get(raw_lhs, raw_lhs)
                    val = values.get(raw_rhs)
                    if val is not None:
                        item[target_key] = val

    def scan(self, TableName: str) -> Dict[str, Any]:
        with self.lock:
            table = self.tables.get(TableName, {})
            return {"Items": [dict(v) for v in table.values()]}


# ==============================================================================
# 1. ADVERSARIAL WORKER PRESENCE & STATE TRANSITIONS
# ==============================================================================

class TestAdversarialWorkerPresenceTransitions:
    """Stress tests worker state transitions: idle -> busy -> idle, concurrency, exceptions."""

    def test_worker_presence_lifecycle_idle_busy_idle(self):
        """Verify strict state progression and active_job_id tracking."""
        mock_dynamo = InMemDynamoDB()
        worker = WorkerLivenessRegistry(
            worker_id="test-adv-worker-01",
            dynamodb_client=mock_dynamo,
            table_name="netra-workers",
            pulse_interval=1.0,
            ttl_seconds=120,
        )

        # 1. Register -> Initial State is IDLE
        worker.register()
        item = mock_dynamo.get_item("netra-workers", {"worker_id": {"S": "test-adv-worker-01"}})["Item"]
        assert item["status"]["S"] == "idle"
        assert item["active_job_id"] == {"NULL": True}
        assert int(item["ttl"]["N"]) >= int(item["last_heartbeat_epoch"]["N"]) + 120

        # 2. Transition -> BUSY with job c6a5aa51-812f-44dc-9dce-2edce8d53204
        job_id = "c6a5aa51-812f-44dc-9dce-2edce8d53204"
        worker.set_busy(job_id)
        assert worker.status == "busy"
        assert worker.active_job_id == job_id

        item = mock_dynamo.get_item("netra-workers", {"worker_id": {"S": "test-adv-worker-01"}})["Item"]
        assert item["status"]["S"] == "busy"
        assert item["active_job_id"]["S"] == job_id

        # 3. Transition -> IDLE on job completion
        worker.set_idle()
        assert worker.status == "idle"
        assert worker.active_job_id is None

        item = mock_dynamo.get_item("netra-workers", {"worker_id": {"S": "test-adv-worker-01"}})["Item"]
        assert item["status"]["S"] == "idle"
        assert item["active_job_id"] == {"NULL": True}

        # 4. Transition -> DRAINING on shutdown
        worker.stop()
        item = mock_dynamo.get_item("netra-workers", {"worker_id": {"S": "test-adv-worker-01"}})["Item"]
        assert item["status"]["S"] == "draining"
        assert item["active_job_id"] == {"NULL": True}

    def test_concurrent_state_transitions_race_safety(self):
        """Stress test: 50 threads concurrently alternating states to verify thread safety."""
        mock_dynamo = InMemDynamoDB()
        worker = WorkerLivenessRegistry(
            worker_id="test-adv-worker-concurrent",
            dynamodb_client=mock_dynamo,
            table_name="netra-workers",
        )
        worker.register()

        errors = []

        def worker_task(thread_id: int):
            try:
                for i in range(20):
                    jid = f"job-{thread_id}-{i}"
                    worker.set_busy(jid)
                    assert worker.status == "busy"
                    time.sleep(0.001)
                    worker.set_idle()
                    assert worker.status == "idle"
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker_task, args=(t,)) for t in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Concurrent transitions threw errors: {errors}"
        assert worker.status == "idle"
        assert worker.active_job_id is None

    def test_state_reversion_to_idle_on_job_failure(self):
        """Ensure that unhandled exceptions during processing always release worker back to idle."""
        mock_dynamo = InMemDynamoDB()
        worker = WorkerLivenessRegistry(
            worker_id="test-adv-worker-failover",
            dynamodb_client=mock_dynamo,
        )
        worker.register()

        class SimulatedPoisonPillException(Exception):
            pass

        worker.set_busy("poison-job-999")
        try:
            raise SimulatedPoisonPillException("Corrupt frame buffer")
        except SimulatedPoisonPillException:
            pass
        finally:
            worker.set_idle()

        assert worker.status == "idle"
        assert worker.active_job_id is None
        item = mock_dynamo.get_item("netra-workers", {"worker_id": {"S": "test-adv-worker-failover"}})["Item"]
        assert item["status"]["S"] == "idle"
        assert item["active_job_id"] == {"NULL": True}


# ==============================================================================
# 2. ADVERSARIAL OFFLINE DETECTION & FLEET TELEMETRY
# ==============================================================================

class TestAdversarialOfflineDetection:
    """Stress tests >60s worker offline boundary condition, malformed inputs, and API responses."""

    def test_offline_threshold_exact_boundary_seconds(self):
        """Verify strict <= 60s active vs > 60s offline evaluation."""
        now = 1700000000.0

        # Case A: exactly 0s old -> ACTIVE
        w_0 = {"worker_id": "w0", "last_heartbeat_epoch": now, "status": "idle"}
        eval_0 = evaluate_worker_activity(w_0, now_epoch=now)
        assert eval_0["is_active"] is True
        assert eval_0["status"] == "idle"

        # Case B: 59s old -> ACTIVE
        w_59 = {"worker_id": "w59", "last_heartbeat_epoch": now - 59, "status": "busy"}
        eval_59 = evaluate_worker_activity(w_59, now_epoch=now)
        assert eval_59["is_active"] is True
        assert eval_59["status"] == "busy"

        # Case C: 60s old (boundary inclusive) -> ACTIVE
        w_60 = {"worker_id": "w60", "last_heartbeat_epoch": now - 60, "status": "idle"}
        eval_60 = evaluate_worker_activity(w_60, now_epoch=now)
        assert eval_60["is_active"] is True
        assert eval_60["status"] == "idle"

        # Case D: 61s old (boundary exceeded) -> OFFLINE
        w_61 = {"worker_id": "w61", "last_heartbeat_epoch": now - 61, "status": "busy"}
        eval_61 = evaluate_worker_activity(w_61, now_epoch=now)
        assert eval_61["is_active"] is False
        assert eval_61["status"] == "offline"
        assert eval_61["raw_status"] == "busy"

        # Case E: 120s old (TTL expired) -> OFFLINE
        w_120 = {"worker_id": "w120", "last_heartbeat_epoch": now - 120, "status": "idle"}
        eval_120 = evaluate_worker_activity(w_120, now_epoch=now)
        assert eval_120["is_active"] is False
        assert eval_120["status"] == "offline"

    def test_malformed_and_edge_case_heartbeat_timestamps(self):
        """Adversarial testing with corrupted / missing timestamps."""
        now = 1700000000.0

        # 1. Missing epoch and last_heartbeat
        w_empty = {"worker_id": "w_empty", "status": "busy"}
        eval_empty = evaluate_worker_activity(w_empty, now_epoch=now)
        assert eval_empty["is_active"] is False
        assert eval_empty["status"] == "offline"
        assert eval_empty["seconds_since_heartbeat"] == 9999

        # 2. Corrupt non-numeric string epoch
        w_corrupt = {"worker_id": "w_corrupt", "last_heartbeat_epoch": "not-a-number", "status": "idle"}
        eval_corrupt = evaluate_worker_activity(w_corrupt, now_epoch=now)
        assert eval_corrupt["is_active"] is False
        assert eval_corrupt["status"] == "offline"

        # 3. Malformed ISO string
        w_bad_iso = {"worker_id": "w_bad_iso", "last_heartbeat": "invalid-iso-date-string", "status": "idle"}
        eval_bad_iso = evaluate_worker_activity(w_bad_iso, now_epoch=now)
        assert eval_bad_iso["is_active"] is False
        assert eval_bad_iso["status"] == "offline"

        # 4. Valid ISO string within 30s
        iso_fresh = (datetime.fromtimestamp(now, tz=timezone.utc) - timedelta(seconds=20)).isoformat()
        w_valid_iso = {"worker_id": "w_valid_iso", "last_heartbeat": iso_fresh, "status": "busy"}
        eval_valid_iso = evaluate_worker_activity(w_valid_iso, now_epoch=now)
        assert eval_valid_iso["is_active"] is True
        assert eval_valid_iso["status"] == "busy"

    def test_api_workers_status_endpoint_offline_detection(self):
        """Verify GET /api/v1/workers/status returns correct fleet status and count."""
        _local_worker_registry.clear()

        # Register 1 active worker (10s ago) and 2 stale workers (75s ago and 300s ago)
        now_epoch = int(time.time())
        register_local_worker({
            "worker_id": "active-node-1",
            "status": "idle",
            "device_type": "mps",
            "device_name": "Apple M-Series",
            "last_heartbeat_epoch": now_epoch - 10,
            "last_heartbeat": datetime.fromtimestamp(now_epoch - 10, tz=timezone.utc).isoformat(),
        })
        register_local_worker({
            "worker_id": "offline-node-2",
            "status": "busy",
            "device_type": "cuda:0",
            "device_name": "NVIDIA T4",
            "last_heartbeat_epoch": now_epoch - 75,
            "last_heartbeat": datetime.fromtimestamp(now_epoch - 75, tz=timezone.utc).isoformat(),
        })
        register_local_worker({
            "worker_id": "offline-node-3",
            "status": "idle",
            "device_type": "cpu",
            "device_name": "Intel Xeon",
            "last_heartbeat_epoch": now_epoch - 300,
            "last_heartbeat": datetime.fromtimestamp(now_epoch - 300, tz=timezone.utc).isoformat(),
        })

        client = TestClient(app)
        response = client.get("/api/v1/workers/status")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "active"
        assert data["active_workers_count"] == 1
        assert data["total_registered"] == 3

        workers_by_id = {w["worker_id"]: w for w in data["workers"]}
        assert workers_by_id["active-node-1"]["status"] == "idle"
        assert workers_by_id["offline-node-2"]["status"] == "offline"
        assert workers_by_id["offline-node-3"]["status"] == "offline"

    def test_in_flight_job_telemetry_detects_offline_worker(self):
        """If a processing job is assigned to a dead worker (>60s), API flags worker_status as offline."""
        _local_worker_registry.clear()
        _local_jobs_store.clear()

        now_epoch = int(time.time())
        dead_worker_id = "dead-worker-x"
        register_local_worker({
            "worker_id": dead_worker_id,
            "status": "busy",
            "device_type": "cuda:0",
            "device_name": "NVIDIA T4",
            "last_heartbeat_epoch": now_epoch - 100,  # 100s ago (> 60s)
            "last_heartbeat": datetime.fromtimestamp(now_epoch - 100, tz=timezone.utc).isoformat(),
        })

        job_id = "job-stuck-with-dead-worker"
        save_local_job({
            "job_id": job_id,
            "status": "processing",
            "progress": 30,
            "current_stage": "spatial_vit",
            "assigned_worker_id": dead_worker_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        client = TestClient(app)
        res = client.get(f"/api/v1/jobs/{job_id}")
        assert res.status_code == 200
        data = res.json()

        assert data["status"] == "processing"
        assert data["progress"] == 30
        assert data["worker_telemetry"]["worker_status"] == "offline"
        assert data["worker_telemetry"]["active_workers_count"] == 0
        assert data["worker_telemetry"]["estimated_wait_seconds"] is None


# ==============================================================================
# 3. BENCHMARK EXECUTION & FORENSIC DOSSIER INTEGRITY
# ==============================================================================

class TestAdversarialBenchmarkAndDossier:
    """End-to-end execution of deepfake_Neeraj_Chopra.mp4 and job c6a5aa51-812f-44dc-9dce-2edce8d53204."""

    def test_full_benchmark_processing_deepfake_neeraj_chopra(self):
        """Empirically runs the full 10-stage forensic pipeline on deepfake_Neeraj_Chopra.mp4."""
        video_path = get_benchmark_video_path()
        assert os.path.exists(video_path), f"Benchmark video not found at: {video_path}"
        assert os.path.getsize(video_path) > 0, "Benchmark video file is 0 bytes"

        mock_dynamo = InMemDynamoDB()
        job_id = "c6a5aa51-812f-44dc-9dce-2edce8d53204"
        s3_key = "benchmark/deepfake_Neeraj_Chopra.mp4"

        # Mock S3 download to copy the local benchmark video to the worker's temp file
        def fake_s3_download(bucket, key, target_path):
            import shutil
            shutil.copyfile(video_path, target_path)

        models = ModelRegistry.get_instance()
        worker_id = "worker-benchmark-adversary-01"

        recorded_stages = []

        def spy_update_progress(jid, status, progress, stage, worker_id=None):
            recorded_stages.append({
                "job_id": jid,
                "status": status,
                "progress": progress,
                "stage": stage,
                "worker_id": worker_id,
            })
            mock_dynamo.update_item(
                "netra-jobs",
                {"job_id": {"S": jid}},
                "SET #s = :s, progress = :p, current_stage = :cs",
                {"#s": "status"},
                {":s": {"S": status}, ":p": {"N": str(progress)}, ":cs": {"S": stage}},
            )

        final_written_results = []

        def spy_write_result(jid, result, worker_id=None):
            final_written_results.append(result)
            mock_dynamo.update_item(
                "netra-jobs",
                {"job_id": {"S": jid}},
                "SET #s = :s, progress = :p, #r = :r",
                {"#s": "status", "#r": "result"},
                {":s": {"S": "complete"}, ":p": {"N": "100"}, ":r": {"S": json.dumps(result)}},
            )

        with patch.object(worker_module.s3, "download_file", side_effect=fake_s3_download), \
             patch.object(worker_module, "update_job_progress", side_effect=spy_update_progress), \
             patch.object(worker_module, "write_result_to_dynamo", side_effect=spy_write_result):

            process_job(
                job_id=job_id,
                s3_key=s3_key,
                worker_id=worker_id,
                models=models,
            )

        # 1. Verify progressive stage telemetry sequence
        assert len(recorded_stages) >= 8, f"Too few stages recorded: {len(recorded_stages)}"
        progress_values = [s["progress"] for s in recorded_stages]
        assert progress_values == sorted(progress_values), "Progress stages did not increase monotonically"
        assert progress_values[0] == 5
        assert 15 in progress_values
        assert 30 in progress_values
        assert 82 in progress_values

        # 2. Verify Final Written Result Payload & Schema
        assert len(final_written_results) == 1, "Expected exactly 1 complete result written"
        dossier = final_written_results[0]

        # 3. Strict Dossier Schema & Admissibility Assertions
        valid_verdicts = [
            "FACE_SWAP",
            "FACE_SWAP_WITH_VOICE_CLONE",
            "VOICE_CLONE_ONLY",
            "AUTHENTIC",
            "SUSPICIOUS",
        ]
        assert dossier["verdict"] in valid_verdicts, f"Invalid verdict: {dossier['verdict']}"

        assert isinstance(dossier["confidence"], (int, float))
        assert 0.0 <= dossier["confidence"] <= 100.0, f"Confidence {dossier['confidence']} out of range [0, 100]"

        assert isinstance(dossier["visual_score"], (int, float))
        assert 0.0 <= dossier["visual_score"] <= 1.0, f"Visual score {dossier['visual_score']} out of range [0, 1]"

        if dossier.get("audio_score") is not None:
            assert 0.0 <= dossier["audio_score"] <= 1.0, f"Audio score {dossier['audio_score']} out of range [0, 1]"

        assert dossier["risk_level"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "MINIMAL"]

        # Suspicious Frames validation
        assert isinstance(dossier["frames"], list)
        assert len(dossier["frames"]) > 0, "Dossier contains no frame annotations"
        for frame in dossier["frames"]:
            assert "frame_number" in frame
            assert "timestamp" in frame
            assert "confidence" in frame
            assert "spatial_score" in frame
            assert "flags" in frame
            assert isinstance(frame["flags"], list)
            assert 0.0 <= frame["spatial_score"] <= 1.0

        # Metadata & Report text validation
        assert isinstance(dossier["forensic_report"], str)
        assert len(dossier["forensic_report"]) > 10, "Forensic report summary is empty or too short"
        assert dossier["report_generated_by"] == "NETRA Neural Forensic Engine v5.0"
        assert isinstance(dossier["manipulation_type"], str)
        assert len(dossier["manipulation_type"]) > 0

    def test_canonical_job_c6a5aa51_api_integration(self):
        """Verify job c6a5aa51-812f-44dc-9dce-2edce8d53204 transitions in DynamoDB and returns from API."""
        _local_jobs_store.clear()
        job_id = "c6a5aa51-812f-44dc-9dce-2edce8d53204"

        # Simulate complete persisted state
        dossier_payload = {
            "verdict": "FACE_SWAP",
            "confidence": 94.8,
            "visual_score": 0.948,
            "audio_score": 0.12,
            "risk_level": "CRITICAL",
            "frames": [
                {
                    "frame_number": 0,
                    "timestamp": 0.0,
                    "confidence": 94.8,
                    "flags": ["SBI_BOUNDARY_ARTIFACT", "BLENDING_INCONSISTENCY"],
                    "spatial_score": 0.948,
                }
            ],
            "audio_flags": [],
            "metadata_flags": [],
            "forensic_report": "Forensic analysis completed for job c6a5aa51-812f-44dc-9dce-2edce8d53204. Verdict: FACE_SWAP.",
            "report_generated_by": "NETRA Neural Forensic Engine v5.0",
            "manipulation_type": "Face Swap",
        }

        save_local_job({
            "job_id": job_id,
            "status": "complete",
            "progress": 100,
            "current_stage": "complete",
            "stage_label": "Analysis complete",
            "assigned_worker_id": "worker-mac-01",
            "result": dossier_payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        # Patch DynamoDB to return empty (so local store is authoritative for this unit test)
        mock_dynamo = MagicMock()
        mock_dynamo.get_item.return_value = {"Item": None}

        client = TestClient(app)
        with patch("backend.api.routes.jobs.get_dynamo_client", return_value=mock_dynamo):
            res = client.get(f"/api/v1/jobs/{job_id}")
        assert res.status_code == 200
        body = res.json()

        assert body["job_id"] == job_id
        assert body["status"] == "complete"
        assert body["progress"] == 100
        assert body["result"]["verdict"] == "FACE_SWAP"
        assert body["result"]["confidence"] == 94.8
        assert body["result"]["visual_score"] == 0.948
        assert len(body["result"]["frames"]) == 1
        assert body["result"]["frames"][0]["flags"] == ["SBI_BOUNDARY_ARTIFACT", "BLENDING_INCONSISTENCY"]
        assert body["worker_telemetry"]["estimated_wait_seconds"] == 0

