"""
NETRA Job Status & Telemetry Router
Exposes /api/v1/jobs/{job_id}, /api/v1/detect/status/{job_id}, and WebSocket progress streams
enriched with real-time worker fleet presence and forensic stage telemetry.
"""

from fastapi import APIRouter, HTTPException, WebSocket
from fastapi.responses import JSONResponse
import boto3
import json
import os
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from .workers import get_worker_presence_summary

router = APIRouter()

DYNAMO_TABLE = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")

# In-memory job registry for local fallback and offline/test workflows
_local_jobs_store: Dict[str, Dict[str, Any]] = {}

STAGE_LABELS = {
    "queued": "Queued for processing",
    "Queued for processing": "Queued for processing",
    "downloading": "Downloading video",
    "extracting": "Extracting frames and audio",
    "spatial_vit": "Running spatial deepfake detector",
    "clip_probe": "Running CLIP generalisation detector",
    "audio_analysis": "Running audio deepfake detector",
    "metadata_aux": "Analyzing metadata and auxiliary signals",
    "fusion": "Fusing detector scores",
    "evidence_bundle": "Building evidence bundle",
    "dossier": "Consolidating forensic evidence dossier",
    "complete": "Analysis complete",
    "Analysis complete": "Analysis complete",
    "error": "Processing failed",
}


def get_dynamo_client():
    kwargs = {"region_name": os.getenv("AWS_DEFAULT_REGION", "us-east-1")}
    ak = os.getenv("AWS_ACCESS_KEY_ID")
    sk = os.getenv("AWS_SECRET_ACCESS_KEY")
    if ak and sk:
        kwargs["aws_access_key_id"] = ak.strip()
        kwargs["aws_secret_access_key"] = sk.strip()
    return boto3.client("dynamodb", **kwargs)


def _parse_dynamo_item(item: dict) -> dict:
    """Convert DynamoDB type-annotated dict to plain Python dict."""
    result = {}
    for key, val in item.items():
        if "S" in val:
            result[key] = val["S"]
        elif "N" in val:
            val_str = val["N"]
            try:
                result[key] = float(val_str) if "." in val_str else int(val_str)
            except ValueError:
                result[key] = val_str
        elif "BOOL" in val:
            result[key] = val["BOOL"]
        elif "NULL" in val:
            result[key] = None
        elif "M" in val:
            result[key] = _parse_dynamo_item(val["M"])
        elif "L" in val:
            result[key] = val["L"]
    return result


def save_local_job(job_data: Dict[str, Any]):
    """Persist job data to in-memory fallback registry."""
    jid = job_data.get("job_id")
    if jid:
        _local_jobs_store[jid] = dict(job_data)


def get_local_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve job data from in-memory fallback registry."""
    return _local_jobs_store.get(job_id)


def update_local_job(job_id: str, updates: Dict[str, Any]):
    """Update fields in local fallback registry."""
    if job_id in _local_jobs_store:
        _local_jobs_store[job_id].update(updates)


def fetch_job_item(job_id: str) -> Optional[Dict[str, Any]]:
    """Fetch job item from DynamoDB table, falling back to local store."""
    item = None

    try:
        dynamo = get_dynamo_client()
        resp = dynamo.get_item(
            TableName=DYNAMO_TABLE,
            Key={"job_id": {"S": job_id}}
        )
        raw_item = resp.get("Item")
        if raw_item:
            item = _parse_dynamo_item(raw_item)
    except Exception:
        pass

    if not item:
        item = get_local_job(job_id)

    return item


@router.get("/jobs/{job_id}")
@router.get("/detect/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Poll job status and telemetry from DynamoDB / local registry.
    Returns enriched response with worker_telemetry matching PROJECT.md interface contract.
    """
    parsed = fetch_job_item(job_id)
    if not parsed:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    status = parsed.get("status", "unknown")
    try:
        progress = int(float(parsed.get("progress", 0)))
    except (ValueError, TypeError):
        progress = 0

    current_stage = parsed.get("current_stage", "queued")
    stage_label = parsed.get("stage_label") or STAGE_LABELS.get(current_stage, current_stage)
    assigned_worker_id = parsed.get("assigned_worker_id")

    # Evaluate real-time worker presence & fleet health
    worker_telemetry = get_worker_presence_summary(assigned_worker_id=assigned_worker_id)

    # Adjust wait estimate according to progress and status
    if status == "complete":
        worker_telemetry["estimated_wait_seconds"] = 0
    elif status == "error":
        worker_telemetry["estimated_wait_seconds"] = None
    elif status == "processing":
        if worker_telemetry["worker_status"] == "active":
            remaining_pct = max(0, 100 - progress)
            worker_telemetry["estimated_wait_seconds"] = max(5, int(remaining_pct * 0.3))
        else:
            worker_telemetry["estimated_wait_seconds"] = None
    elif status == "queued":
        if worker_telemetry["worker_status"] == "active":
            worker_telemetry["estimated_wait_seconds"] = 30
        else:
            worker_telemetry["estimated_wait_seconds"] = None

    # Parse result if complete
    result = None
    if "result" in parsed and parsed["result"] is not None:
        if isinstance(parsed["result"], dict):
            result = parsed["result"]
        elif isinstance(parsed["result"], str):
            try:
                result = json.loads(parsed["result"])
            except Exception:
                result = parsed["result"]

    error = parsed.get("error")

    return {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "current_stage": current_stage,
        "stage_label": stage_label,
        "worker_telemetry": worker_telemetry,
        "result": result,
        "error": error,
        "created_at": parsed.get("created_at"),
        "updated_at": parsed.get("updated_at"),
        "completed_at": parsed.get("completed_at"),
    }


@router.websocket("/ws/{job_id}")
async def websocket_progress(ws: WebSocket, job_id: str):
    """
    WebSocket endpoint — polls status every 2s and pushes enriched telemetry to browser.
    """
    await ws.accept()
    try:
        while True:
            parsed = fetch_job_item(job_id)
            if not parsed:
                await ws.send_json({"job_id": job_id, "error": "Job not found"})
                break

            status = parsed.get("status", "unknown")
            try:
                progress = int(float(parsed.get("progress", 0)))
            except (ValueError, TypeError):
                progress = 0

            current_stage = parsed.get("current_stage", "queued")
            stage_label = parsed.get("stage_label") or STAGE_LABELS.get(current_stage, current_stage)
            assigned_worker_id = parsed.get("assigned_worker_id")
            worker_telemetry = get_worker_presence_summary(assigned_worker_id=assigned_worker_id)

            await ws.send_json({
                "job_id": job_id,
                "status": status,
                "progress": progress,
                "stage": current_stage,
                "stage_label": stage_label,
                "worker_telemetry": worker_telemetry,
            })

            if status in ("complete", "error"):
                break
            await asyncio.sleep(2)
    except Exception:
        pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass


@router.get("/jobs/{job_id}/video-url")
async def get_video_presigned_url(job_id: str):
    """
    Returns a presigned S3 URL for the job's input video.
    Used by frontend Evidence Timeline click-to-seek feature.
    """
    from .detect import get_boto3_client as get_s3_client  # reuse detect's cred-injecting helper
    s3 = get_s3_client("s3")
    s3_bucket = os.getenv("S3_BUCKET_MEDIA", "netra-media-uploads")
    s3_key = f"{job_id}/input.mp4"

    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": s3_bucket, "Key": s3_key},
            ExpiresIn=3600  # 1 hour
        )
        return {"url": url, "expires_in": 3600}
    except Exception as e:
        # Fallback local URL if S3 presigned generation fails in dev/offline mode
        return {"url": f"/media/{job_id}/input.mp4", "expires_in": 3600}


@router.get("/jobs/{job_id}/report.pdf")
async def get_report_pdf(job_id: str):
    """PDF report stub — returns 501 until Phase 7 implements PDF generation."""
    raise HTTPException(status_code=501, detail="PDF report generation coming in Phase 7")
