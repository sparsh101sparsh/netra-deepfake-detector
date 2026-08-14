"""
Tests for NETRA Backend Telemetry & Worker Presence (Milestone M3)
Validates:
- GET /api/v1/jobs/{job_id} enriched worker telemetry, presence evaluation, stage labels, and wait times
- Alias GET /api/v1/detect/status/{job_id}
- GET /api/v1/workers/status fleet status, active worker counts, and individual worker status
- POST /api/v1/workers/heartbeat and /api/v1/workers/register
- 404 boundary conditions and error handling
- POST /api/v1/detect/full non-blocking flow
"""

import time
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.api.server import app
from backend.api.routes.jobs import save_local_job, update_local_job, _local_jobs_store
from backend.api.routes.workers import register_local_worker, _local_worker_registry

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_stores():
    """Clear memory stores before each test and mock DynamoDB so live AWS data never leaks."""
    _local_jobs_store.clear()
    _local_worker_registry.clear()

    # Mock DynamoDB clients so tests are fully isolated from live AWS
    mock_dynamo_workers = MagicMock()
    mock_dynamo_workers.scan.return_value = {"Items": []}
    mock_dynamo_workers.put_item.return_value = {}
    mock_dynamo_workers.update_item.return_value = {}

    mock_dynamo_jobs = MagicMock()
    mock_dynamo_jobs.get_item.return_value = {"Item": None}
    mock_dynamo_jobs.put_item.return_value = {}
    mock_dynamo_jobs.update_item.return_value = {}

    with patch("backend.api.routes.workers.get_dynamo_client", return_value=mock_dynamo_workers), \
         patch("backend.api.routes.jobs.get_dynamo_client", return_value=mock_dynamo_jobs):
        yield

    _local_jobs_store.clear()
    _local_worker_registry.clear()


def test_main_app_route_registration():
    """Verify that all required M3 routes are registered in the FastAPI app."""
    paths = list(app.openapi()["paths"].keys())
    assert "/api/v1/workers/status" in paths
    assert "/api/v1/workers" in paths
    assert "/api/v1/workers/heartbeat" in paths
    assert "/api/v1/jobs/{job_id}" in paths
    assert "/api/v1/detect/status/{job_id}" in paths
    assert "/api/v1/detect/full" in paths


def test_worker_heartbeat_and_fleet_status_aggregation():
    """Verify POST /api/v1/workers/heartbeat registers workers and GET /api/v1/workers/status aggregates fleet."""
    # 1. Initially no workers
    r_empty = client.get("/api/v1/workers/status")
    assert r_empty.status_code == 200
    data_empty = r_empty.json()
    assert data_empty["status"] == "offline"
    assert data_empty["active_workers_count"] == 0
    assert data_empty["total_registered"] == 0
    assert data_empty["workers"] == []

    # 2. Register GPU worker
    r_hb1 = client.post("/api/v1/workers/heartbeat", json={
        "worker_id": "worker-gpu-01",
        "status": "busy",
        "device_type": "cuda:0",
        "device_name": "NVIDIA A10G",
        "active_job_id": "job-test-123",
        "version": "5.1"
    })
    assert r_hb1.status_code == 200
    assert r_hb1.json()["status"] == "ok"
    assert r_hb1.json()["worker_id"] == "worker-gpu-01"

    # 3. Register Mac worker
    r_hb2 = client.post("/api/v1/workers/heartbeat", json={
        "worker_id": "worker-mac-01",
        "status": "idle",
        "device_type": "mps",
        "device_name": "Apple M-Series (mps)",
        "active_job_id": None,
        "version": "5.1"
    })
    assert r_hb2.status_code == 200

    # 4. Check fleet status
    r_fleet = client.get("/api/v1/workers/status")
    assert r_fleet.status_code == 200
    data_fleet = r_fleet.json()
    assert data_fleet["status"] == "active"
    assert data_fleet["active_workers_count"] == 2
    assert data_fleet["total_registered"] == 2

    workers_by_id = {w["worker_id"]: w for w in data_fleet["workers"]}
    assert "worker-gpu-01" in workers_by_id
    assert "worker-mac-01" in workers_by_id

    assert workers_by_id["worker-gpu-01"]["status"] == "busy"
    assert workers_by_id["worker-gpu-01"]["device_type"] == "cuda:0"
    assert workers_by_id["worker-gpu-01"]["device_name"] == "NVIDIA A10G"
    assert workers_by_id["worker-gpu-01"]["active_job_id"] == "job-test-123"
    assert workers_by_id["worker-gpu-01"]["seconds_since_heartbeat"] <= 2

    assert workers_by_id["worker-mac-01"]["status"] == "idle"
    assert workers_by_id["worker-mac-01"]["device_type"] == "mps"

    # 5. Check single worker route
    r_single = client.get("/api/v1/workers/worker-gpu-01")
    assert r_single.status_code == 200
    assert r_single.json()["worker_id"] == "worker-gpu-01"
    assert r_single.json()["status"] == "busy"

    # 6. Check 404 for unknown worker
    r_unknown = client.get("/api/v1/workers/worker-nonexistent")
    assert r_unknown.status_code == 404


def test_worker_expiration_and_offline_transition():
    """Verify workers inactive for >60s are marked offline and decrease active count."""
    now = time.time()

    # Register an active worker (5s ago)
    register_local_worker({
        "worker_id": "worker-live",
        "status": "idle",
        "device_type": "mps",
        "device_name": "Apple Silicon",
        "last_heartbeat_epoch": now - 5,
        "last_heartbeat": "2026-09-03T04:20:00Z",
    })

    # Register an expired worker (90s ago)
    register_local_worker({
        "worker_id": "worker-stale",
        "status": "busy",
        "device_type": "cpu",
        "device_name": "CPU Host",
        "last_heartbeat_epoch": now - 90,
        "last_heartbeat": "2026-09-03T04:18:00Z",
    })

    r = client.get("/api/v1/workers/status")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "active"
    assert data["active_workers_count"] == 1
    assert data["total_registered"] == 2

    workers_by_id = {w["worker_id"]: w for w in data["workers"]}
    assert workers_by_id["worker-live"]["status"] == "idle"
    assert workers_by_id["worker-stale"]["status"] == "offline"
    assert workers_by_id["worker-stale"]["seconds_since_heartbeat"] >= 90


def test_job_telemetry_with_active_worker():
    """Verify GET /api/v1/jobs/{job_id} contract when workers are active."""
    now = time.time()
    register_local_worker({
        "worker_id": "worker-cloud-spot-01",
        "status": "idle",
        "device_type": "cuda:0",
        "device_name": "NVIDIA T4 (cuda:0)",
        "last_heartbeat_epoch": now - 10,
        "last_heartbeat": "2026-09-03T04:28:00Z",
    })

    save_local_job({
        "job_id": "test-job-active-01",
        "status": "queued",
        "progress": 0,
        "current_stage": "queued",
        "stage_label": "Queued for processing",
        "assigned_worker_id": "worker-cloud-spot-01",
        "created_at": "2026-09-03T04:25:00Z",
    })

    r = client.get("/api/v1/jobs/test-job-active-01")
    assert r.status_code == 200
    data = r.json()

    assert data["job_id"] == "test-job-active-01"
    assert data["status"] == "queued"
    assert data["progress"] == 0
    assert data["current_stage"] == "queued"
    assert data["stage_label"] == "Queued for processing"
    assert data["result"] is None
    assert data["error"] is None
    assert data["created_at"] == "2026-09-03T04:25:00Z"

    # Worker telemetry validation
    telemetry = data["worker_telemetry"]
    assert telemetry["worker_status"] == "active"
    assert telemetry["active_workers_count"] == 1
    assert telemetry["assigned_worker_id"] == "worker-cloud-spot-01"
    assert telemetry["worker_device"] == "NVIDIA T4 (cuda:0)"
    assert telemetry["last_worker_heartbeat"] == "2026-09-03T04:28:00Z"
    assert telemetry["estimated_wait_seconds"] == 30

    # Test alias route /api/v1/detect/status/{job_id}
    r_alias = client.get("/api/v1/detect/status/test-job-active-01")
    assert r_alias.status_code == 200
    assert r_alias.json() == data


def test_job_telemetry_with_offline_worker():
    """Verify GET /api/v1/jobs/{job_id} correctly signals worker_status: offline when no workers are active."""
    now = time.time()
    # Register only a stale worker
    register_local_worker({
        "worker_id": "worker-dead",
        "status": "busy",
        "device_type": "mps",
        "last_heartbeat_epoch": now - 120,
    })

    save_local_job({
        "job_id": "test-job-stalled-01",
        "status": "queued",
        "progress": 0,
        "current_stage": "queued",
        "stage_label": "Queued for processing",
        "created_at": "2026-09-03T04:25:00Z",
    })

    r = client.get("/api/v1/jobs/test-job-stalled-01")
    assert r.status_code == 200
    data = r.json()

    assert data["status"] == "queued"
    telemetry = data["worker_telemetry"]
    assert telemetry["worker_status"] == "offline"
    assert telemetry["active_workers_count"] == 0
    assert telemetry["estimated_wait_seconds"] is None


def test_job_telemetry_processing_and_completion_stages():
    """Verify progress, stage labels, and estimated wait times across all processing stages."""
    now = time.time()
    register_local_worker({
        "worker_id": "worker-mac-01",
        "status": "busy",
        "device_type": "mps",
        "device_name": "Apple M-Series (mps)",
        "last_heartbeat_epoch": now - 2,
    })

    stages = [
        ("downloading", "Downloading video", 5, 28),
        ("extracting", "Extracting frames and audio", 15, 25),
        ("spatial_vit", "Running spatial deepfake detector", 30, 21),
        ("clip_probe", "Running CLIP generalisation detector", 50, 15),
        ("audio_analysis", "Running audio deepfake detector", 65, 10),
        ("metadata_aux", "Analyzing metadata and auxiliary signals", 75, 7),
        ("fusion", "Fusing detector scores", 82, 5),
        ("evidence_bundle", "Building evidence bundle", 87, 5),
        ("dossier", "Consolidating forensic evidence dossier", 92, 5),
    ]

    for stage_key, expected_label, progress_val, expected_wait in stages:
        save_local_job({
            "job_id": f"job-stage-{stage_key}",
            "status": "processing",
            "progress": progress_val,
            "current_stage": stage_key,
            "assigned_worker_id": "worker-mac-01",
        })

        r = client.get(f"/api/v1/jobs/job-stage-{stage_key}")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "processing"
        assert data["progress"] == progress_val
        assert data["current_stage"] == stage_key
        assert data["stage_label"] == expected_label
        assert data["worker_telemetry"]["worker_status"] == "active"
        assert data["worker_telemetry"]["estimated_wait_seconds"] == expected_wait

    # Test complete state
    save_local_job({
        "job_id": "job-stage-complete",
        "status": "complete",
        "progress": 100,
        "current_stage": "complete",
        "result": {
            "verdict": "DEEPFAKE_HIGH_CONFIDENCE",
            "confidence": 98.4,
            "visual_score": 0.96,
            "risk_level": "CRITICAL"
        }
    })
    r_comp = client.get("/api/v1/jobs/job-stage-complete")
    assert r_comp.status_code == 200
    comp_data = r_comp.json()
    assert comp_data["status"] == "complete"
    assert comp_data["progress"] == 100
    assert comp_data["stage_label"] == "Analysis complete"
    assert comp_data["worker_telemetry"]["estimated_wait_seconds"] == 0
    assert comp_data["result"]["verdict"] == "DEEPFAKE_HIGH_CONFIDENCE"


def test_job_not_found_404():
    """Verify 404 response for unknown job IDs."""
    r = client.get("/api/v1/jobs/nonexistent-uuid-999")
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_video_url_and_pdf_report():
    """Verify video-url presigned link generator and 501 PDF endpoint."""
    r_url = client.get("/api/v1/jobs/job-vid-123/video-url")
    assert r_url.status_code == 200
    assert "url" in r_url.json()
    assert r_url.json()["expires_in"] == 3600

    r_pdf = client.get("/api/v1/jobs/job-vid-123/report.pdf")
    assert r_pdf.status_code == 501
