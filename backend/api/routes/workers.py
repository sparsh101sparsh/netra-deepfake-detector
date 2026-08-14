"""
NETRA Worker Presence & Fleet Telemetry Router
Exposes /api/v1/workers/status, /api/v1/workers/heartbeat, and worker fleet health endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import boto3
import os
import time
from datetime import datetime, timezone

router = APIRouter()

DYNAMO_TABLE_WORKERS = os.getenv("DYNAMO_TABLE_WORKERS", "netra-workers")
WORKER_HEARTBEAT_TIMEOUT_SEC = 60  # Workers inactive after 60s are marked offline

# In-memory worker fallback store (for local development, tests, and hybrid fallback)
_local_worker_registry: Dict[str, Dict[str, Any]] = {}


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


def register_local_worker(worker_data: Dict[str, Any]):
    """Register or update worker in local memory store."""
    wid = worker_data.get("worker_id")
    if wid:
        _local_worker_registry[wid] = dict(worker_data)


def get_all_registered_workers() -> List[Dict[str, Any]]:
    """Fetch workers from DynamoDB netra-workers table, merging with local registry."""
    workers_dict: Dict[str, Dict[str, Any]] = {}

    # 1. Populate from local memory store
    for wid, wdata in _local_worker_registry.items():
        workers_dict[wid] = dict(wdata)

    # 2. Query/Scan DynamoDB netra-workers table
    try:
        dynamo = get_dynamo_client()
        resp = dynamo.scan(TableName=DYNAMO_TABLE_WORKERS)
        for raw_item in resp.get("Items", []):
            parsed = _parse_dynamo_item(raw_item)
            wid = parsed.get("worker_id")
            if wid:
                workers_dict[wid] = parsed
    except Exception:
        # If DynamoDB scan fails (e.g. offline, sandbox policy, credentials), use local registry
        pass

    return list(workers_dict.values())


def evaluate_worker_activity(worker: Dict[str, Any], now_epoch: Optional[float] = None) -> Dict[str, Any]:
    """Calculate seconds since last heartbeat and evaluate active status."""
    if now_epoch is None:
        now_epoch = time.time()

    lh_epoch = worker.get("last_heartbeat_epoch")
    sec_diff = 9999

    if lh_epoch is not None:
        try:
            sec_diff = max(0, int(now_epoch - float(lh_epoch)))
        except (ValueError, TypeError):
            sec_diff = 9999
    elif worker.get("last_heartbeat"):
        try:
            dt_str = str(worker["last_heartbeat"]).replace("Z", "+00:00")
            dt = datetime.fromisoformat(dt_str)
            sec_diff = max(0, int(now_epoch - dt.timestamp()))
        except Exception:
            sec_diff = 9999

    is_active = (sec_diff <= WORKER_HEARTBEAT_TIMEOUT_SEC)
    raw_status = worker.get("status", "idle")
    effective_status = raw_status if is_active else "offline"

    # Resolve device display name
    device_type = worker.get("device_type", "cpu")
    device_name = worker.get("device_name")
    if not device_name:
        if "mps" in str(device_type).lower():
            device_name = "Apple Silicon (mps)"
        elif "cuda" in str(device_type).lower():
            device_name = "NVIDIA CUDA GPU"
        else:
            device_name = "CPU Host"

    # Resolve ISO timestamp
    last_hb_iso = worker.get("last_heartbeat")
    if not last_hb_iso and lh_epoch is not None:
        try:
            last_hb_iso = datetime.fromtimestamp(float(lh_epoch), tz=timezone.utc).isoformat()
        except Exception:
            last_hb_iso = None

    return {
        "worker_id": worker.get("worker_id", "unknown"),
        "status": effective_status,
        "raw_status": raw_status,
        "is_active": is_active,
        "device_type": device_type,
        "device_name": device_name,
        "active_job_id": worker.get("active_job_id"),
        "last_heartbeat": last_hb_iso,
        "last_heartbeat_epoch": lh_epoch,
        "seconds_since_heartbeat": sec_diff,
        "version": worker.get("version", "5.0"),
    }


def get_worker_presence_summary(assigned_worker_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates worker fleet presence and returns worker_telemetry dictionary
    matching the PROJECT.md interface contract.
    """
    now_epoch = time.time()
    raw_workers = get_all_registered_workers()
    evaluated_workers = [evaluate_worker_activity(w, now_epoch) for w in raw_workers]
    active_workers = [w for w in evaluated_workers if w["is_active"]]

    active_count = len(active_workers)
    worker_status = "active" if active_count > 0 else "offline"

    # Select target worker details
    target_worker = None
    if assigned_worker_id:
        for w in evaluated_workers:
            if w["worker_id"] == assigned_worker_id:
                target_worker = w
                break

    if not target_worker and active_workers:
        # Prefer the most recently active worker
        active_workers.sort(key=lambda x: x["seconds_since_heartbeat"])
        target_worker = active_workers[0]

    assigned_id = target_worker["worker_id"] if target_worker else assigned_worker_id
    worker_dev = target_worker["device_name"] if target_worker else None
    last_hb = target_worker["last_heartbeat"] if target_worker else None

    # Estimate wait seconds
    if worker_status == "active":
        estimated_wait = 30
    else:
        estimated_wait = None

    return {
        "worker_status": worker_status,
        "active_workers_count": active_count,
        "assigned_worker_id": assigned_id,
        "worker_device": worker_dev,
        "last_worker_heartbeat": last_hb,
        "estimated_wait_seconds": estimated_wait,
    }


class WorkerHeartbeatPayload(BaseModel):
    worker_id: str
    status: Optional[str] = "idle"
    device_type: Optional[str] = "cpu"
    device_name: Optional[str] = None
    active_job_id: Optional[str] = None
    version: Optional[str] = "5.0"


@router.get("/workers/status")
@router.get("/workers")
async def get_workers_fleet_status():
    """
    Returns worker fleet health, active count, total registered,
    and list of workers with device info and heartbeat timestamps.
    """
    now_epoch = time.time()
    raw_workers = get_all_registered_workers()
    evaluated_workers = [evaluate_worker_activity(w, now_epoch) for w in raw_workers]
    active_workers = [w for w in evaluated_workers if w["is_active"]]

    active_count = len(active_workers)
    total_count = len(evaluated_workers)
    fleet_status = "active" if active_count > 0 else "offline"

    workers_output = [
        {
            "worker_id": w["worker_id"],
            "status": w["status"],
            "device_type": w["device_type"],
            "device_name": w["device_name"],
            "active_job_id": w["active_job_id"],
            "last_heartbeat": w["last_heartbeat"],
            "seconds_since_heartbeat": w["seconds_since_heartbeat"],
        }
        for w in evaluated_workers
    ]

    return {
        "status": fleet_status,
        "active_workers_count": active_count,
        "total_registered": total_count,
        "workers": workers_output,
    }


@router.post("/workers/heartbeat")
@router.post("/workers/register")
async def post_worker_heartbeat(payload: WorkerHeartbeatPayload):
    """
    HTTP heartbeat registration endpoint for hybrid / cloud / local workers.
    Updates both local registry and DynamoDB netra-workers table.
    """
    now_epoch = int(time.time())
    now_iso = datetime.now(timezone.utc).isoformat()
    ttl_epoch = now_epoch + 120

    worker_record = {
        "worker_id": payload.worker_id,
        "status": payload.status or "idle",
        "device_type": payload.device_type or "cpu",
        "device_name": payload.device_name or "CPU Host",
        "active_job_id": payload.active_job_id,
        "last_heartbeat": now_iso,
        "last_heartbeat_epoch": now_epoch,
        "ttl": ttl_epoch,
        "version": payload.version or "5.0",
    }

    # 1. Update local registry
    register_local_worker(worker_record)

    # 2. Update DynamoDB
    try:
        dynamo = get_dynamo_client()
        dynamo.put_item(
            TableName=DYNAMO_TABLE_WORKERS,
            Item={
                "worker_id": {"S": payload.worker_id},
                "status": {"S": payload.status or "idle"},
                "device_type": {"S": payload.device_type or "cpu"},
                "device_name": {"S": payload.device_name or "CPU Host"},
                "active_job_id": {"S": payload.active_job_id} if payload.active_job_id else {"NULL": True},
                "last_heartbeat": {"S": now_iso},
                "last_heartbeat_epoch": {"N": str(now_epoch)},
                "ttl": {"N": str(ttl_epoch)},
                "version": {"S": payload.version or "5.0"},
            }
        )
    except Exception:
        pass

    return {
        "status": "ok",
        "worker_id": payload.worker_id,
        "heartbeat_recorded_at": now_iso,
    }


@router.get("/workers/{worker_id}")
async def get_single_worker(worker_id: str):
    """Fetch status for a specific worker by ID."""
    all_workers = get_all_registered_workers()
    target = None
    for w in all_workers:
        if w.get("worker_id") == worker_id:
            target = w
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Worker {worker_id} not found")

    evaluated = evaluate_worker_activity(target)
    return {
        "worker_id": evaluated["worker_id"],
        "status": evaluated["status"],
        "device_type": evaluated["device_type"],
        "device_name": evaluated["device_name"],
        "active_job_id": evaluated["active_job_id"],
        "last_heartbeat": evaluated["last_heartbeat"],
        "seconds_since_heartbeat": evaluated["seconds_since_heartbeat"],
        "version": evaluated["version"],
    }
