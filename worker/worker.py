"""
NETRA SQS Autonomous Worker Daemon — Forensic Processing Engine
Polls the SQS queue, manages worker presence telemetry, prewarms neural models,
progressively reports DynamoDB stage telemetry, and handles signals gracefully.

Supported Hardware:
- NVIDIA CUDA GPU (e.g. AWS EC2 g4dn / g5)
- Apple Silicon GPU / Neural Engine (MPS)
- High-Performance Multi-Threaded Host CPU
"""
import asyncio
import json
import logging
import os
import platform
import signal
import sys
import tempfile
import threading
import time
import uuid
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

# Ensure root and backend directories are in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv(os.path.join(root_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("netra.worker")

# AWS & Environment Config
REGION = os.getenv("AWS_DEFAULT_REGION", "ap-south-1").split("#")[0].strip()
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "https://sqs.ap-south-1.amazonaws.com/131746731374/netra-jobs").split("#")[0].strip()
S3_BUCKET_MEDIA = os.getenv("S3_BUCKET_MEDIA", "netra-media-mumbai-131746731374").split("#")[0].strip()
S3_BUCKET_MODELS = os.getenv("S3_BUCKET_MODELS", "netra-models").split("#")[0].strip()
DYNAMO_TABLE_JOBS = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")
DYNAMO_TABLE_WORKERS = os.getenv("DYNAMO_TABLE_WORKERS", "netra-workers")
SPATIAL_MODEL_PATH = os.getenv("SPATIAL_MODEL_PATH", "/opt/netra/models/spatial/model.pth")
CLIP_PROBE_PATH = os.getenv("CLIP_PROBE_PATH", "/opt/netra/models/clip_probe/model.pth")
MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
KEYFRAMES_DIR = os.path.join(MEDIA_DIR, "keyframes")
os.makedirs(KEYFRAMES_DIR, exist_ok=True)

try:
    from netra.pipeline.visual_localizer import VisualAnomalyLocalizer
except ImportError:
    VisualAnomalyLocalizer = None


def get_boto3(service_name: str):
    """Factory for boto3 client with optional explicit credentials and region."""
    kwargs = {"region_name": REGION}
    ak = os.getenv("AWS_ACCESS_KEY_ID")
    sk = os.getenv("AWS_SECRET_ACCESS_KEY")
    if ak and sk:
        kwargs["aws_access_key_id"] = ak.strip()
        kwargs["aws_secret_access_key"] = sk.strip()
    return boto3.client(service_name, **kwargs)


sqs = get_boto3("sqs")
s3 = get_boto3("s3")
dynamodb = get_boto3("dynamodb")


def get_optimal_device():
    """
    Resolve best available PyTorch compute device: CUDA -> MPS -> CPU.
    Returns: (torch.device, device_type_str, device_name_str)
    """
    import torch

    if torch.cuda.is_available():
        dev = torch.device("cuda:0")
        name = torch.cuda.get_device_name(0)
        return dev, "cuda:0", name
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        dev = torch.device("mps")
        return dev, "mps", "Apple Silicon (MPS)"
    return torch.device("cpu"), "cpu", f"Host CPU ({platform.processor() or platform.machine()})"


def get_worker_id() -> str:
    """Generate or retrieve unique worker ID."""
    env_id = os.getenv("WORKER_ID")
    if env_id:
        return env_id.strip()
    hostname = platform.node() or "worker"
    clean_host = hostname.replace(" ", "-").replace(".", "-")[:20]
    return f"worker-{clean_host}-{uuid.uuid4().hex[:6]}"


# ==============================================================================
# SQS VISIBILITY HEARTBEAT
# ==============================================================================

class SQSVisibilityHeartbeat:
    """
    Background daemon thread / context manager calling
    change_message_visibility(VisibilityTimeout=60) every 25 seconds during job processing.
    """

    def __init__(
        self,
        receipt_handle: str,
        sqs_client=None,
        queue_url: str = SQS_QUEUE_URL,
        visibility_timeout: int = 60,
        interval: float = 25.0,
    ):
        self.receipt_handle = receipt_handle
        self.sqs = sqs_client or sqs
        self.queue_url = queue_url
        self.visibility_timeout = visibility_timeout
        self.interval = interval
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Start visibility extension background thread."""
        if self._thread is None or not self._thread.is_alive():
            self._stop_event.clear()
            self._thread = threading.Thread(
                target=self._heartbeat_loop,
                daemon=True,
                name="SQSVisibilityHeartbeat",
            )
            self._thread.start()

    def _heartbeat_loop(self):
        """Periodic heartbeat loop extending visibility timeout."""
        while not self._stop_event.wait(self.interval):
            try:
                self.sqs.change_message_visibility(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=self.receipt_handle,
                    VisibilityTimeout=self.visibility_timeout,
                )
                logger.debug(
                    f"Extended SQS visibility by {self.visibility_timeout}s for {self.receipt_handle}"
                )
            except ClientError as e:
                logger.warning(
                    f"SQS visibility heartbeat ClientError: {e.response.get('Error', {}).get('Code')}"
                )
            except Exception as e:
                logger.warning(f"Failed to extend SQS visibility timeout: {e}")

    def stop(self):
        """Stop visibility extension background thread."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def reset_visibility_zero(self):
        """Immediately reset visibility to 0 so other workers can pick up the message."""
        try:
            self.sqs.change_message_visibility(
                QueueUrl=self.queue_url,
                ReceiptHandle=self.receipt_handle,
                VisibilityTimeout=0,
            )
            logger.info(f"Reset visibility to 0 for {self.receipt_handle}")
        except Exception as e:
            logger.warning(f"Failed to reset visibility to 0: {e}")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()


# ==============================================================================
# WORKER LIVENESS & PRESENCE REGISTRY
# ==============================================================================

class WorkerLivenessRegistry:
    """
    Worker Presence & Heartbeat Registry.
    Pulses worker presence to DynamoDB table `netra-workers` every 15s with TTL = now + 120s.
    Records worker_id, status ("idle" | "busy" | "draining"), device_type, device_name,
    active_job_id, last_heartbeat, last_heartbeat_epoch, and ttl.
    """

    def __init__(
        self,
        worker_id: Optional[str] = None,
        dynamodb_client=None,
        table_name: str = DYNAMO_TABLE_WORKERS,
        pulse_interval: float = 15.0,
        ttl_seconds: int = 120,
    ):
        self.worker_id = worker_id or get_worker_id()
        self.dynamodb = dynamodb_client or dynamodb
        self.table_name = table_name
        self.pulse_interval = pulse_interval
        self.ttl_seconds = ttl_seconds

        device, dev_type, dev_name = get_optimal_device()
        self.device = device
        self.device_type = dev_type
        self.device_name = dev_name

        self.status = "idle"
        self.active_job_id: Optional[str] = None
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    def register(self):
        """Register worker in DynamoDB on initial boot."""
        now = datetime.now(timezone.utc)
        now_epoch = int(now.timestamp())
        item = {
            "worker_id": {"S": self.worker_id},
            "status": {"S": self.status},
            "device_type": {"S": self.device_type},
            "device_name": {"S": self.device_name},
            "last_heartbeat": {"S": now.isoformat()},
            "last_heartbeat_epoch": {"N": str(now_epoch)},
            "ttl": {"N": str(now_epoch + self.ttl_seconds)},
            "version": {"S": "5.1"},
        }
        if self.active_job_id:
            item["active_job_id"] = {"S": self.active_job_id}
        else:
            item["active_job_id"] = {"NULL": True}

        try:
            self.dynamodb.put_item(TableName=self.table_name, Item=item)
            logger.info(
                f"Worker {self.worker_id} registered successfully ({self.device_type} / {self.device_name})"
            )
        except Exception as e:
            logger.warning(f"Failed to register worker {self.worker_id} in DynamoDB: {e}")

    def pulse(self):
        """Pulse heartbeat update to DynamoDB."""
        now = datetime.now(timezone.utc)
        now_epoch = int(now.timestamp())
        ttl_epoch = now_epoch + self.ttl_seconds

        with self._lock:
            status = self.status
            active_job_id = self.active_job_id

        expr = "SET #s = :s, last_heartbeat = :lh, last_heartbeat_epoch = :e, #ttl = :ttl, active_job_id = :j"
        expr_names = {"#s": "status", "#ttl": "ttl"}
        expr_vals = {
            ":s": {"S": status},
            ":lh": {"S": now.isoformat()},
            ":e": {"N": str(now_epoch)},
            ":ttl": {"N": str(ttl_epoch)},
            ":j": {"S": active_job_id} if active_job_id else {"NULL": True},
        }

        try:
            self.dynamodb.update_item(
                TableName=self.table_name,
                Key={"worker_id": {"S": self.worker_id}},
                UpdateExpression=expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_vals,
            )
        except Exception as e:
            logger.warning(f"Worker {self.worker_id} heartbeat pulse failed: {e}")

    def _pulse_loop(self):
        """Continuous background pulse thread."""
        while not self._stop_event.wait(self.pulse_interval):
            self.pulse()

    def start_pulse_thread(self):
        """Start the background heartbeat thread."""
        if self._thread is None or not self._thread.is_alive():
            self._stop_event.clear()
            self._thread = threading.Thread(
                target=self._pulse_loop, daemon=True, name="WorkerHeartbeat"
            )
            self._thread.start()

    def set_busy(self, job_id: str):
        """Mark worker as busy processing job_id."""
        with self._lock:
            self.status = "busy"
            self.active_job_id = job_id
        self.pulse()

    def set_idle(self):
        """Mark worker as idle."""
        with self._lock:
            self.status = "idle"
            self.active_job_id = None
        self.pulse()

    def set_draining(self):
        """Set worker status to draining upon shutdown."""
        with self._lock:
            self.status = "draining"
            self.active_job_id = None

        now = datetime.now(timezone.utc)
        now_epoch = int(now.timestamp())
        try:
            self.dynamodb.update_item(
                TableName=self.table_name,
                Key={"worker_id": {"S": self.worker_id}},
                UpdateExpression="SET #s = :s, active_job_id = :j, drained_at = :d, last_heartbeat = :lh, last_heartbeat_epoch = :e",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":s": {"S": "draining"},
                    ":j": {"NULL": True},
                    ":d": {"S": now.isoformat()},
                    ":lh": {"S": now.isoformat()},
                    ":e": {"N": str(now_epoch)},
                },
            )
        except Exception as e:
            logger.warning(f"Worker {self.worker_id} draining update failed: {e}")

    def stop(self):
        """Stop background pulse thread and mark draining."""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self.set_draining()


# ==============================================================================
# SINGLETON MODEL REGISTRY & PREWARMING
# ==============================================================================

class ModelRegistry:
    """
    Singleton Model Registry & Prewarming.
    Preloads PyTorch detector suite once at daemon startup with CUDA -> MPS -> CPU fallback.
    Keeps weights resident across jobs (no per-job re-initialization).
    """

    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        device, dev_type, dev_name = get_optimal_device()
        self.device = device
        self.device_type = dev_type
        self.device_name = dev_name

        logger.info(
            f"ModelRegistry: Initializing and prewarming models on {self.device_type} ({self.device_name})..."
        )

        # 1. Spatial SBI Detector
        from netra.pipeline.detectors.spatial import SpatialSBIDetector, resolve_spatial_checkpoint_path

        resolved_spatial = resolve_spatial_checkpoint_path(
            SPATIAL_MODEL_PATH if (SPATIAL_MODEL_PATH and os.path.exists(SPATIAL_MODEL_PATH)) else None
        )
        self.spatial_detector = SpatialSBIDetector(model_path=resolved_spatial)

        # 2. Audio Deepfake Detector
        from netra.pipeline.detectors.audio import AudioDeepfakeDetector

        self.audio_detector = AudioDeepfakeDetector()

        # 3. CLIP Deepfake Probe
        from netra.pipeline.detectors.clip_probe import CLIPDeepfakeProbe

        # 3. CLIP Deepfake Probe (only load if custom probe weights provided)
        if CLIP_PROBE_PATH and os.path.exists(CLIP_PROBE_PATH):
            from netra.pipeline.detectors.clip_probe import CLIPDeepfakeProbe
            try:
                self.clip_detector = CLIPDeepfakeProbe(probe_path=CLIP_PROBE_PATH)
            except Exception as e:
                logger.warning(f"CLIPDeepfakeProbe initialization error: {e}")
                self.clip_detector = None
        else:
            self.clip_detector = None

        # 4. GenD ViT-L/14 Foundation Engine
        from netra.pipeline.gend_engine import GenDForensicEngine
        try:
            self.gend_engine = GenDForensicEngine()
            self.gend_engine._ensure_model_loaded()
        except Exception as e:
            logger.warning(f"GenD initialization warning: {e}")
            self.gend_engine = None

        # 5. Spectral Boundary & Frequency Analyzer
        from netra.pipeline.frequency_analyzer import SpectralBoundaryAnalyzer
        self.spectral_analyzer = SpectralBoundaryAnalyzer()

        # 6. Gated Fusion Engine
        from netra.pipeline.fusion import GatedFusionEngine

        self.fusion_engine = GatedFusionEngine()

        # 7. RapidOCR Text Extraction Engine
        try:
            from netra.services.ocr_scam_pipeline import get_rapid_ocr
            self.rapid_ocr = get_rapid_ocr()
            logger.info("ModelRegistry: RapidOCR prewarmed successfully.")
        except Exception as ocr_err:
            logger.warning(f"ModelRegistry: RapidOCR prewarming warning: {ocr_err}")
            self.rapid_ocr = None

        # 8. Deterministic Random Forest Scam Classifier
        try:
            from netra.pipeline.scam_detector import ScamDetector
            self.scam_detector = ScamDetector()
            logger.info("ModelRegistry: ScamDetector prewarmed successfully.")
        except Exception as scam_err:
            logger.warning(f"ModelRegistry: ScamDetector prewarming warning: {scam_err}")
            self.scam_detector = None

        logger.info("ModelRegistry: Prewarming complete. All models resident in memory.")

    @classmethod
    def get_instance(cls):
        """Retrieve singleton ModelRegistry instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance


# ==============================================================================
# PROGRESSIVE DYNAMODB TELEMETRY
# ==============================================================================

def update_job_progress(
    job_id: str,
    status: str,
    progress: int,
    stage: str,
    worker_id: Optional[str] = None,
):
    """Write progress update to DynamoDB so API can poll it."""
    try:
        expr = "SET #s = :s, progress = :p, current_stage = :cs, updated_at = :ua"
        names = {"#s": "status"}
        values = {
            ":s": {"S": status},
            ":p": {"N": str(progress)},
            ":cs": {"S": stage},
            ":ua": {"S": datetime.now(timezone.utc).isoformat()},
        }
        if worker_id:
            expr += ", assigned_worker_id = :w"
            values[":w"] = {"S": worker_id}

        dynamodb.update_item(
            TableName=DYNAMO_TABLE_JOBS,
            Key={"job_id": {"S": job_id}},
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
    except Exception as e:
        logger.error(f"Failed to update DynamoDB progress for job {job_id}: {e}")


def write_result_to_dynamo(
    job_id: str, result: dict, worker_id: Optional[str] = None
):
    """Write final complete result to DynamoDB."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        expr = "SET #s = :s, progress = :p, current_stage = :cs, #r = :r, completed_at = :ca, updated_at = :ua"
        names = {"#s": "status", "#r": "result"}
        values = {
            ":s": {"S": "complete"},
            ":p": {"N": "100"},
            ":cs": {"S": "Analysis complete"},
            ":r": {"S": json.dumps(result)},
            ":ca": {"S": now_str},
            ":ua": {"S": now_str},
        }
        if worker_id:
            expr += ", assigned_worker_id = :w"
            values[":w"] = {"S": worker_id}

        dynamodb.update_item(
            TableName=DYNAMO_TABLE_JOBS,
            Key={"job_id": {"S": job_id}},
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
    except Exception as e:
        logger.error(f"Failed to write complete result for job {job_id}: {e}")


def write_error_to_dynamo(
    job_id: str, error: str, worker_id: Optional[str] = None
):
    """Write error state to DynamoDB."""
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        expr = "SET #s = :s, progress = :p, current_stage = :cs, #e = :e, updated_at = :ua"
        names = {"#s": "status", "#e": "error"}
        values = {
            ":s": {"S": "error"},
            ":p": {"N": "0"},
            ":cs": {"S": f"Error: {error[:200]}"},
            ":e": {"S": error},
            ":ua": {"S": now_str},
        }
        if worker_id:
            expr += ", assigned_worker_id = :w"
            values[":w"] = {"S": worker_id}

        dynamodb.update_item(
            TableName=DYNAMO_TABLE_JOBS,
            Key={"job_id": {"S": job_id}},
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
    except Exception as e:
        logger.error(f"Failed to write error for job {job_id}: {e}")


def ensure_web_streamable(video_path: str, s3_client, bucket: str, s3_key: str):
    """
    Ensure video is encoded in browser-standard H.264 (avc1) with yuv420p and +faststart.
    If not, transcode with ffmpeg and overwrite S3 so browsers can stream it.
    """
    if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
        return

    try:
        probe_cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=codec_name,pix_fmt",
            "-of", "csv=p=0",
            video_path
        ]
        probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
        out = probe_res.stdout.strip()
        parts = out.split(",") if out else []
        codec = parts[0].strip().lower() if len(parts) > 0 else ""
        pix_fmt = parts[1].strip().lower() if len(parts) > 1 else ""

        needs_transcode = (codec != "h264" or pix_fmt != "yuv420p")

        if not needs_transcode:
            logger.info(f"Video {s3_key} is already browser-compatible H.264 ({codec}, {pix_fmt})")
            return

        logger.info(f"Video {s3_key} is '{codec}/{pix_fmt}', transcoding to H.264 (avc1, yuv420p, +faststart) for web playback...")
        h264_tmp = f"{video_path}.web.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            h264_tmp
        ]
        t_res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
        if t_res.returncode == 0 and os.path.exists(h264_tmp) and os.path.getsize(h264_tmp) > 0:
            os.replace(h264_tmp, video_path)
            logger.info(f"Transcoded {s3_key} successfully ({os.path.getsize(video_path)} bytes). Updating S3...")
            s3_client.upload_file(
                video_path,
                bucket,
                s3_key,
                ExtraArgs={
                    "ContentType": "video/mp4",
                    "ContentDisposition": "inline"
                }
            )
            logger.info(f"Successfully updated S3 object s3://{bucket}/{s3_key} with web-streamable H.264 video.")
        elif os.path.exists(h264_tmp):
            os.remove(h264_tmp)
    except Exception as e:
        logger.warning(f"ensure_web_streamable failed for {video_path}: {e}")


# ==============================================================================
# PIPELINE EXECUTION
# ==============================================================================

def process_job(
    job_id: str,
    s3_key: str,
    worker_id: Optional[str] = None,
    models: Optional[ModelRegistry] = None,
):
    """
    Full NETRA pipeline for one job with progressive 10-stage telemetry:
    1. 5%   (downloading): Download video from S3
    2. 15%  (extracting): Extract frames and audio
    3. 30%  (spatial_vit): Run Spatial SBI detector
    4. 50%  (clip_probe): Run CLIP generalisation probe
    5. 65%  (audio_analysis): Run Audio deepfake detector
    6. 75%  (metadata_aux): Run auxiliary signals and EXIF metadata
    7. 82%  (fusion): Multi-modal gated score fusion
    8. 87%  (evidence_bundle): Build structured evidence bundle
    9. 92%  (dossier): Consolidate forensic evidence dossier
    10. 98% (finalizing): Finalize results payload
    11. 100% (complete): Analysis complete, persist to DynamoDB
    """
    logger.info(f"Processing job {job_id} (s3_key: {s3_key})")
    if models is None:
        models = ModelRegistry.get_instance()

    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "input.mp4")
        audio_path = os.path.join(tmpdir, "audio.wav")
        frames_dir = os.path.join(tmpdir, "frames")
        os.makedirs(frames_dir, exist_ok=True)

        # === STAGE 1: Download video (5%) ===
        update_job_progress(
            job_id, "processing", 5, "Downloading video", worker_id=worker_id
        )
        s3.download_file(S3_BUCKET_MEDIA, s3_key, video_path)
        logger.info(
            f"Downloaded video: {os.path.getsize(video_path) / 1024:.1f} KB"
        )

        # Ensure video is encoded in browser-standard H.264 (avc1) with +faststart
        # If input is mpeg4, avi, mov, or non-yuv420p, transcode and re-upload to S3
        ensure_web_streamable(video_path, s3, S3_BUCKET_MEDIA, s3_key)

        # === STAGE 2: Extract frames + audio (15%) ===
        update_job_progress(
            job_id,
            "processing",
            15,
            "Extracting frames and audio",
            worker_id=worker_id,
        )
        from netra.pipeline.extractor import extract_audio, extract_frames

        frames = extract_frames(video_path, job_id, frames_dir)
        audio_path_result = extract_audio(video_path, audio_path)
        logger.info(
            f"Extracted {len(frames)} frames, audio extracted: {audio_path_result is not None}"
        )

        # Get video duration
        video_duration = 0.0
        if cv2 is not None:
            try:
                cap = cv2.VideoCapture(video_path)
                fps = cap.get(cv2.CAP_PROP_FPS) or 25
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                video_duration = (
                    (total_frames / fps) if (total_frames > 0 and fps > 0) else 0.0
                )
                cap.release()
            except Exception as e:
                logger.warning(f"Could not calculate video duration via cv2: {e}")

        # === STAGE 3: Run spatial detector (30%) ===
        update_job_progress(
            job_id,
            "processing",
            30,
            "Running spatial deepfake detector",
            worker_id=worker_id,
        )
        frame_paths = [f["image_path"] for f in frames]
        frame_predictions = models.spatial_detector.predict_frames_batch(
            frame_paths
        )

        # === STAGE 4: Run CLIP probe (50%) ===
        update_job_progress(
            job_id,
            "processing",
            50,
            "Running CLIP generalisation detector",
            worker_id=worker_id,
        )
        clip_predictions = None
        if models.clip_detector and getattr(
            models.clip_detector, "available", False
        ):
            try:
                clip_predictions = [
                    models.clip_detector.predict_frame(fp) for fp in frame_paths
                ]
            except Exception as e:
                logger.warning(f"CLIP probe inference error: {e}")
                clip_predictions = None

        # === STAGE 5: Run audio detector (65%) ===
        update_job_progress(
            job_id,
            "processing",
            65,
            "Running audio deepfake detector",
            worker_id=worker_id,
        )
        audio_result = None
        if audio_path_result and models.audio_detector:
            try:
                audio_result = models.audio_detector.predict_audio(
                    audio_path_result
                )
            except Exception as e:
                logger.warning(f"Audio detection error: {e}")
                audio_result = None

        # === STAGE 6: Auxiliary signals & metadata (75%) ===
        update_job_progress(
            job_id,
            "processing",
            75,
            "Analyzing metadata and auxiliary signals",
            worker_id=worker_id,
        )
        try:
            from netra.pipeline.auxiliary import run_all_auxiliary

            auxiliary_result = run_all_auxiliary(video_path, frames)
        except Exception as e:
            logger.warning(f"Auxiliary analysis error: {e}")
            auxiliary_result = {"metadata": {}, "all_flags": []}

        # === STAGE 7: Fusion (82%) ===
        update_job_progress(
            job_id, "processing", 82, "Fusing detector scores", worker_id=worker_id
        )
        all_spatial = [
            p.get("fake_probability", 0) or 0 for p in frame_predictions
        ]
        global_visual = sum(all_spatial) / max(len(all_spatial), 1)
        global_audio = (
            audio_result.get("fake_probability")
            if audio_result and audio_result.get("available")
            else None
        )
        global_clip = None
        if clip_predictions:
            clip_scores = [
                p.get("fake_probability")
                for p in clip_predictions
                if p.get("fake_probability") is not None
            ]
            global_clip = (
                sum(clip_scores) / len(clip_scores) if clip_scores else None
            )

        # GenD Foundation ViT-L/14 Analysis
        global_gend = None
        if models.gend_engine:
            try:
                face_crops = [
                    p["face_crop"]
                    for p in frame_predictions
                    if p.get("face_crop") is not None and getattr(p.get("face_crop"), "size", 0) > 0
                ]
                if face_crops:
                    gend_res = models.gend_engine.analyze_frame_crops(face_crops)
                else:
                    frame_paths = [f["image_path"] for f in frames if "image_path" in f]
                    gend_res = models.gend_engine.analyze_frames(frame_paths)
                global_gend = gend_res.get("gend_fake_probability") or gend_res.get("fake_probability")
                logger.info(f"GenD Foundation Analysis fake_probability: {global_gend} (used {len(face_crops)} face crops)")
            except Exception as e:
                logger.warning(f"GenD analysis failed: {e}")

        # Spectral Boundary & Frequency Seam Analysis
        global_spectral = None
        if getattr(models, "spectral_analyzer", None):
            try:
                face_crops = [
                    p["face_crop"]
                    for p in frame_predictions
                    if p.get("face_crop") is not None and getattr(p.get("face_crop"), "size", 0) > 0
                ]
                if face_crops:
                    spec_scores = [
                        models.spectral_analyzer.analyze_spectral_consistency(fc).get("frequency_fake_score", 0.25)
                        for fc in face_crops
                    ]
                    global_spectral = float(np.mean(spec_scores))
                    logger.info(f"Spectral Boundary Analysis fake_score: {global_spectral}")
            except Exception as e:
                logger.warning(f"Spectral boundary analysis failed: {e}")

        fusion_result = models.fusion_engine.fuse(
            visual_score=global_visual,
            audio_score=global_audio,
            clip_score=global_clip,
            gend_score=global_gend,
            spectral_score=global_spectral,
            aux_flags=auxiliary_result.get("all_flags", []),
        )

        # === STAGE 8: Build evidence bundle (87%) ===
        update_job_progress(
            job_id,
            "processing",
            87,
            "Building evidence bundle",
            worker_id=worker_id,
        )
        from netra.pipeline.evidence import build_evidence_bundle

        evidence = build_evidence_bundle(
            job_id=job_id,
            frames=frames,
            frame_predictions=frame_predictions,
            audio_result=audio_result,
            clip_predictions=clip_predictions,
            auxiliary_result=auxiliary_result,
            fusion_result=fusion_result,
            video_duration=video_duration,
        )

        # === STAGE 8.5: Visual Anomaly Localization & Keyframe Snapshot Generation (R2) ===
        keyframe_snapshots = []
        annotated_frames_map = {}

        if cv2 is not None and frames and VisualAnomalyLocalizer is not None:
            try:
                # 1. Build candidate frames with confidence scores
                frame_dict_by_num = {f["frame_number"]: f for f in frames}
                candidate_frames = []
                for i, f_info in enumerate(frames):
                    pred = frame_predictions[i] if (frame_predictions and i < len(frame_predictions)) else {}
                    clip_p = clip_predictions[i] if (clip_predictions and i < len(clip_predictions)) else {}
                    sp_score = float(pred.get("fake_probability", 0.0) or 0.0)
                    cp_score = float(clip_p.get("fake_probability", 0.0) or 0.0) if clip_p else 0.0
                    eff_score = max(sp_score, cp_score)
                    candidate_frames.append({
                        "frame_number": f_info["frame_number"],
                        "timestamp": f_info["timestamp"],
                        "timestamp_sec": f_info.get("timestamp_sec", 0.0),
                        "image_path": f_info["image_path"],
                        "confidence": eff_score,
                        "spatial_score": sp_score,
                        "clip_score": cp_score,
                        "flags": pred.get("flags", []),
                    })

                # 2. Extract top 2-3 anomaly candidates
                # Primary filter: threshold=0.75, min_frame_gap=10, max_keyframes=3
                selected = VisualAnomalyLocalizer.filter_high_anomaly_keyframes(
                    candidate_frames,
                    threshold=0.75,
                    min_frame_gap=10,
                    max_keyframes=3,
                    fallback_if_empty=True,
                )

                # Fallback: if video is flagged deepfake / non-authentic and selected is empty, take top frames
                if not selected and candidate_frames and fusion_result.get("verdict") != "authentic":
                    sorted_cands = sorted(candidate_frames, key=lambda x: x.get("confidence", 0.0), reverse=True)
                    selected = sorted_cands[:min(3, len(sorted_cands))]

                # Strictly cap at top 3 keyframes
                selected = selected[:3]

                # 3. Render amber bounding box (#f59e0b) + forensic badge and persist keyframe snapshots
                for cand in selected:
                    f_num = cand["frame_number"]
                    f_info = frame_dict_by_num.get(f_num)
                    if not f_info or not f_info.get("image_path") or not os.path.exists(f_info["image_path"]):
                        continue

                    raw_bgr = cv2.imread(f_info["image_path"])
                    if raw_bgr is None or raw_bgr.size == 0:
                        continue

                    cand_confidence = float(cand.get("confidence", 0.95))
                    annotated_bgr, meta = VisualAnomalyLocalizer.localize_and_annotate(
                        raw_bgr,
                        anomaly_score=cand_confidence,
                    )

                    # Persistent storage: backend/media/keyframes/{job_id}_frame_{num:06d}_annotated.jpg
                    snap_filename = f"{job_id}_frame_{f_num:06d}_annotated.jpg"
                    snap_filepath = os.path.join(KEYFRAMES_DIR, snap_filename)
                    cv2.imwrite(snap_filepath, annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    # Upload to S3 if available
                    try:
                        s3.upload_file(
                            snap_filepath,
                            S3_BUCKET_MEDIA,
                            f"{job_id}/keyframes/{snap_filename}",
                        )
                    except Exception as s3_err:
                        logger.debug(f"S3 keyframe upload skipped/failed for {snap_filename}: {s3_err}")

                    annotated_url = f"/api/backend/api/v1/media/keyframes/{snap_filename}"
                    snap_record = {
                        "frame_number": f_num,
                        "timestamp": cand.get("timestamp", f_info.get("timestamp", "00:00.00")),
                        "anomaly_region": meta.get("semantic_label", "Eyewear Specular Glare & Feature Discontinuity"),
                        "anomaly_score": round(float(meta.get("anomaly_score", cand_confidence)), 4),
                        "confidence": round(float(meta.get("anomaly_score", cand_confidence)), 4),
                        "image_path": snap_filepath,
                        "image_url": annotated_url,
                        "annotated_image_url": annotated_url,
                        "detector_subsystem": meta.get("detector_subsystem", "GenD Foundation Model ViT-L/14 + Spatial SBI"),
                        "bounding_box": meta.get("bounding_box", [0, 0, 0, 0]),
                        "normalized_box": meta.get("normalized_box"),
                        "evidence_code": meta.get("evidence_code", "EVD-ANOMALY"),
                        "statutory_act": meta.get("statutory_act", "Synthetic Facial Manipulation"),
                    }
                    keyframe_snapshots.append(snap_record)
                    annotated_frames_map[f_num] = snap_record

                logger.info(f"Generated {len(keyframe_snapshots)} visual anomaly keyframe snapshots for job {job_id}")

            except Exception as e:
                logger.error(f"Visual anomaly snapshot generation failed for job {job_id}: {e}", exc_info=True)
                keyframe_snapshots = []
                annotated_frames_map = {}

        # === STAGE 9: Consolidate forensic evidence dossier (92%) ===
        update_job_progress(
            job_id,
            "processing",
            92,
            "Consolidating forensic evidence dossier",
            worker_id=worker_id,
        )
        report_summary = (
            f"Forensic analysis completed for job {job_id}. Verdict: {fusion_result['verdict']} with {fusion_result['confidence']:.1f}% confidence. "
            f"Visual score: {fusion_result['visual_score']:.2f}, Risk level: {fusion_result['risk_level']}."
        )
        bedrock_result = {
            "full_report": report_summary,
            "generated_by": "NETRA Neural Forensic Engine v5.0",
        }

        # === STAGE 10: Finalizing results (98%) ===
        update_job_progress(
            job_id, "processing", 98, "Finalizing results", worker_id=worker_id
        )

        existing_frame_nums = {f.frame_number for f in evidence.suspicious_frames[:20]}
        frames_payload = [
            {
                "frame_number": f.frame_number,
                "timestamp": f.timestamp,
                "confidence": f.confidence,
                "flags": f.flags,
                "spatial_score": f.spatial_score,
                "annotated_image_url": (
                    annotated_frames_map[f.frame_number]["annotated_image_url"]
                    if f.frame_number in annotated_frames_map
                    else None
                ),
                "image_path": (
                    annotated_frames_map[f.frame_number]["image_path"]
                    if f.frame_number in annotated_frames_map
                    else None
                ),
                "bounding_box": (
                    annotated_frames_map[f.frame_number]["bounding_box"]
                    if f.frame_number in annotated_frames_map
                    else None
                ),
                "anomaly_region": (
                    annotated_frames_map[f.frame_number]["anomaly_region"]
                    if f.frame_number in annotated_frames_map
                    else None
                ),
                "detector_subsystem": (
                    annotated_frames_map[f.frame_number]["detector_subsystem"]
                    if f.frame_number in annotated_frames_map
                    else None
                ),
            }
            for f in evidence.suspicious_frames[:20]
        ]
        for snap in keyframe_snapshots:
            if snap["frame_number"] not in existing_frame_nums:
                frames_payload.insert(0, {
                    "frame_number": snap["frame_number"],
                    "timestamp": snap["timestamp"],
                    "confidence": snap["anomaly_score"],
                    "flags": ["high_visual_anomaly"],
                    "spatial_score": snap["anomaly_score"],
                    "annotated_image_url": snap["annotated_image_url"],
                    "image_path": snap["image_path"],
                    "bounding_box": snap["bounding_box"],
                    "anomaly_region": snap["anomaly_region"],
                    "detector_subsystem": snap["detector_subsystem"],
                })
                existing_frame_nums.add(snap["frame_number"])

        final_result = {
            "verdict": fusion_result["verdict"],
            "confidence": fusion_result["confidence"],
            "visual_score": fusion_result["visual_score"],
            "gend_score": global_gend,
            "audio_score": fusion_result.get("audio_score"),
            "clip_score": fusion_result.get("clip_score"),
            "risk_level": fusion_result["risk_level"],
            "frames": frames_payload,
            "keyframe_snapshots": keyframe_snapshots,
            "audio_flags": (
                evidence.audio_segments[0].flags
                if evidence.audio_segments
                else []
            ),
            "metadata_flags": evidence.metadata_flags,
            "metadata": auxiliary_result.get("metadata", {}),
            "forensic_report": bedrock_result.get("full_report", ""),
            "report_generated_by": bedrock_result.get(
                "generated_by", "NETRA Neural Forensic Engine v5.0"
            ),
            "manipulation_type": fusion_result["verdict"]
            .replace("_", " ")
            .title(),
        }

        # === 100% Complete ===
        write_result_to_dynamo(job_id, final_result, worker_id=worker_id)
        logger.info(
            f"Job {job_id} complete — verdict: {fusion_result['verdict']}, confidence: {fusion_result['confidence']:.1f}%"
        )

        # Auto-catalog completed video scan into threat catalog & radar
        try:
            from backend.netra.services.catalog_hook import auto_catalog_scan
            auto_catalog_scan(
                scan_type="video",
                result=final_result,
                file_path=video_path,
                explicit_job_id=f"JOB-{job_id[:8].upper()}",
                job_uuid=job_id
            )
        except Exception:
            try:
                from netra.services.catalog_hook import auto_catalog_scan
                auto_catalog_scan(
                    scan_type="video",
                    result=final_result,
                    file_path=video_path,
                    explicit_job_id=f"JOB-{job_id[:8].upper()}",
                    job_uuid=job_id
                )
            except Exception as cat_err:
                logger.debug(f"Worker auto_catalog_scan hook: {cat_err}")


def process_image_job(
    job_id: str,
    s3_key: str,
    worker_id: Optional[str] = None,
):
    """
    Autonomous worker execution for Image Forensics & Document OCR:
    1. 15% (image_download): Download image from S3 bucket
    2. 35% (image_visual_ocr): Scanning dual-branch visual & OCR streams
    3. 65% (image_facial_threat): Synthesizing facial anomaly maps & IOC threat cross-match
    4. 90% (image_dossier): Finalizing hybrid forensic dossier & uploading annotated preview
    5. 100% (complete): DynamoDB completion write & threat catalog indexing
    """
    logger.info(f"Processing image job {job_id} (s3_key: {s3_key})")

    # === STAGE 1: Download image from S3 (15%) ===
    update_job_progress(
        job_id,
        "processing",
        15,
        "Downloading media & verifying headers",
        worker_id=worker_id,
    )

    image_bytes = None
    with tempfile.TemporaryDirectory() as tmpdir:
        filename = os.path.basename(s3_key)
        local_path = os.path.join(tmpdir, filename)
        try:
            s3.download_file(S3_BUCKET_MEDIA, s3_key, local_path)
            with open(local_path, "rb") as f:
                image_bytes = f.read()
            logger.info(f"Downloaded image {s3_key}: {len(image_bytes) / 1024:.1f} KB")
        except Exception as dl_err:
            logger.warning(f"S3 download failed for {s3_key} ({dl_err}), checking local cache...")
            for candidate_dir in [
                os.path.join(MEDIA_DIR, "images"),
                os.path.join(MEDIA_DIR, "uploads"),
                MEDIA_DIR,
            ]:
                candidate = os.path.join(candidate_dir, filename)
                if os.path.exists(candidate):
                    with open(candidate, "rb") as f:
                        image_bytes = f.read()
                    logger.info(f"Resolved image from local cache: {candidate}")
                    break

        if not image_bytes:
            raise ValueError(f"Could not retrieve image payload for s3_key {s3_key}")

        # === STAGE 2: Scanning dual-branch visual & OCR streams (35%) ===
        update_job_progress(
            job_id,
            "processing",
            35,
            "Scanning dual-branch visual & OCR streams",
            worker_id=worker_id,
        )

        # === STAGE 3: Synthesizing facial anomaly maps & IOC threat cross-match (65%) ===
        update_job_progress(
            job_id,
            "processing",
            65,
            "Synthesizing facial anomaly maps & IOC threat cross-match",
            worker_id=worker_id,
        )

        from netra.pipeline.dual_branch_router import process_image_forensics
        result = process_image_forensics(
            image_bytes=image_bytes,
            filename=filename,
            skip_auto_catalog=True
        )

        # === STAGE 4: Finalizing hybrid forensic dossier & uploading annotated preview (90%) ===
        update_job_progress(
            job_id,
            "processing",
            90,
            "Finalizing hybrid forensic dossier",
            worker_id=worker_id,
        )

        # If an annotated preview image was generated, upload to S3
        preview_url = result.get("annotated_preview_url")
        if preview_url:
            preview_filename = os.path.basename(preview_url.split("?")[0])
            local_preview = os.path.join(MEDIA_DIR, "images", preview_filename)
            if os.path.exists(local_preview):
                s3_ann_key = f"images/{job_id}_annotated.jpg"
                try:
                    s3.upload_file(
                        local_preview,
                        S3_BUCKET_MEDIA,
                        s3_ann_key,
                        ExtraArgs={"ContentType": "image/jpeg"}
                    )
                    result["annotated_s3_key"] = s3_ann_key
                    result["annotated_s3_url"] = f"https://{S3_BUCKET_MEDIA}.s3.{REGION}.amazonaws.com/{s3_ann_key}"
                    logger.info(f"Uploaded annotated preview to S3: {s3_ann_key}")
                except Exception as s3_up_err:
                    logger.debug(f"S3 upload of annotated preview skipped: {s3_up_err}")

        # === STAGE 5: 100% Complete ===
        write_result_to_dynamo(job_id, result, worker_id=worker_id)
        logger.info(
            f"Image job {job_id} complete — verdict: {result.get('composite_verdict', 'COMPLETE')}, risk: {result.get('composite_risk_score', 0)}"
        )

        # Auto-catalog into threat radar
        try:
            from netra.services.catalog_hook import auto_catalog_scan
            auto_catalog_scan(
                scan_type="image",
                result=result,
                file_bytes=image_bytes,
                filename=filename,
                explicit_job_id=result.get("scan_id", f"JOB-{job_id[:8].upper()}"),
                job_uuid=job_id
            )
        except Exception as cat_err:
            logger.debug(f"Worker image auto-catalog scan hook: {cat_err}")


# ==============================================================================
# MAIN WORKER DAEMON LOOP
# ==============================================================================

def run_worker():
    """Main SQS polling loop. Runs continuously on GPU / MPS / CPU worker nodes."""
    logger.info("NETRA Worker Daemon initializing...")

    # Initialize worker presence registry immediately so UI detects active worker
    worker_registry = WorkerLivenessRegistry()
    worker_registry.status = "prewarming"
    worker_registry.register()
    worker_registry.start_pulse_thread()

    # Prewarm models once at daemon startup
    models = ModelRegistry.get_instance()
    worker_registry.status = "idle"
    worker_registry.pulse()

    # Signal handling for graceful termination
    shutdown_requested = threading.Event()
    current_visibility_heartbeat = [None]

    def handle_shutdown_signal(signum, frame):
        logger.info(
            f"Received termination signal ({signum}). Initiating graceful shutdown..."
        )
        shutdown_requested.set()
        # Reset visibility for active job if in flight
        if current_visibility_heartbeat[0] is not None:
            current_visibility_heartbeat[0].reset_visibility_zero()
            current_visibility_heartbeat[0].stop()
        worker_registry.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    logger.info(
        f"NETRA Worker {worker_registry.worker_id} started — polling SQS queue {SQS_QUEUE_URL}..."
    )

    while not shutdown_requested.is_set():
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,  # Long polling
                VisibilityTimeout=60,  # Initial 60s visibility
            )

            messages = response.get("Messages", [])
            if not messages:
                continue

            for message in messages:
                if shutdown_requested.is_set():
                    break

                receipt_handle = message.get("ReceiptHandle")
                raw_body = message.get("Body", "")

                try:
                    body = json.loads(raw_body)
                except Exception as e:
                    logger.warning(
                        f"Unparseable SQS message body ({e}): {raw_body}"
                    )
                    # Delete poisoned / unparseable message
                    if receipt_handle:
                        sqs.delete_message(
                            QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle
                        )
                    continue

                if not isinstance(body, dict):
                    logger.warning(f"Invalid non-dict SQS payload: {body}")
                    if receipt_handle:
                        sqs.delete_message(
                            QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle
                        )
                    continue

                job_id = body.get("job_id")
                s3_key = body.get("s3_key")

                if (
                    not job_id
                    or not isinstance(job_id, str)
                    or not job_id.strip()
                    or not s3_key
                    or not isinstance(s3_key, str)
                    or not s3_key.strip()
                ):
                    logger.warning(
                        f"Invalid SQS message (missing or empty job_id/s3_key): {body}"
                    )
                    if receipt_handle:
                        sqs.delete_message(
                            QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle
                        )
                    continue

                job_id = job_id.strip()
                s3_key = s3_key.strip()
                job_type = str(body.get("type", "")).strip().lower()
                if not job_type:
                    if s3_key.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp")) or "images/" in s3_key:
                        job_type = "image"
                    else:
                        job_type = "video"

                # Process job with visibility heartbeat and worker busy state
                worker_registry.set_busy(job_id)
                heartbeat = SQSVisibilityHeartbeat(
                    receipt_handle=receipt_handle,
                    visibility_timeout=60,
                    interval=25.0,
                )
                current_visibility_heartbeat[0] = heartbeat
                heartbeat.start()

                delete_message = False
                try:
                    if job_type == "image":
                        process_image_job(
                            job_id,
                            s3_key,
                            worker_id=worker_registry.worker_id,
                        )
                    else:
                        process_job(
                            job_id,
                            s3_key,
                            worker_id=worker_registry.worker_id,
                            models=models,
                        )
                    delete_message = True
                except (ValueError, getattr(cv2, "error", ValueError) if cv2 is not None else ValueError) as e:
                    # Permanent corrupt media error: write to DynamoDB and delete message to prevent poison pill loop
                    logger.error(
                        f"Permanent media error processing job {job_id}: {e}"
                    )
                    write_error_to_dynamo(
                        job_id, str(e), worker_id=worker_registry.worker_id
                    )
                    delete_message = True
                except Exception as e:
                    # Transient / unhandled error: write error state to DynamoDB, do NOT delete message (allow DLQ redrive)
                    logger.error(
                        f"Transient/unhandled error for job {job_id}: {e}",
                        exc_info=True,
                    )
                    write_error_to_dynamo(
                        job_id, str(e), worker_id=worker_registry.worker_id
                    )
                    delete_message = False
                finally:
                    heartbeat.stop()
                    current_visibility_heartbeat[0] = None
                    if delete_message and receipt_handle:
                        try:
                            sqs.delete_message(
                                QueueUrl=SQS_QUEUE_URL,
                                ReceiptHandle=receipt_handle,
                            )
                        except Exception as e:
                            logger.error(
                                f"Failed to delete SQS message {receipt_handle}: {e}"
                            )
                    worker_registry.set_idle()

        except KeyboardInterrupt:
            logger.info(
                "Worker daemon received KeyboardInterrupt, shutting down..."
            )
            break
        except Exception as e:
            logger.error(f"Worker polling loop error: {e}", exc_info=True)
            time.sleep(5)  # Brief pause before retrying

    worker_registry.stop()
    logger.info("NETRA Worker Daemon terminated cleanly.")


if __name__ == "__main__":
    run_worker()
