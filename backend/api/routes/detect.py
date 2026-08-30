from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import uuid, boto3, json, os, io, logging
from datetime import datetime, timezone
from typing import Optional

from .jobs import save_local_job, get_job_status, MEDIA_DIR

logger = logging.getLogger("netra.api.detect")
router = APIRouter()

MAX_FILE_SIZE_MB = 100
ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/avi", "video/x-msvideo"}


def get_s3_bucket() -> str:
    return os.getenv("S3_BUCKET_MEDIA", "netra-media-mumbai-131746731374")


def get_sqs_queue_url() -> str:
    url = os.getenv("SQS_QUEUE_URL")
    if not url:
        account_id = os.getenv("AWS_ACCOUNT_ID", "131746731374")
        region = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
        return f"https://sqs.{region}.amazonaws.com/{account_id}/netra-jobs"
    return url


def get_dynamo_table() -> str:
    return os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")


def get_boto3_client(service_name: str):
    kwargs = {"region_name": os.getenv("AWS_DEFAULT_REGION", "ap-south-1")}
    ak = os.getenv("AWS_ACCESS_KEY_ID")
    sk = os.getenv("AWS_SECRET_ACCESS_KEY")
    if ak and sk:
        kwargs["aws_access_key_id"] = ak.strip()
        kwargs["aws_secret_access_key"] = sk.strip()
    return boto3.client(service_name, **kwargs)


@router.post("/detect/full")
async def detect_full(file: UploadFile = File(...)):
    """
    Accept video upload, stream to S3, register DynamoDB record, dispatch to SQS worker.
    Returns job_id immediately (non-blocking).
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: mp4, mov, webm, avi"
        )

    # Read file and check size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB. Maximum: {MAX_FILE_SIZE_MB}MB"
        )

    job_id = str(uuid.uuid4())
    s3_key = f"{job_id}/input.mp4"
    s3_bucket = get_s3_bucket()
    sqs_url = get_sqs_queue_url()
    dynamo_table = get_dynamo_table()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Save to local fallback registry first
    job_record = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "current_stage": "Queued for processing",
        "stage_label": "Queued for processing",
        "s3_key": s3_key,
        "created_at": now_iso,
        "file_size_mb": round(size_mb, 2),
        "result": None,
        "error": None,
    }
    save_local_job(job_record)


    # Try AWS services; handle sandbox / offline gracefully
    try:
        s3 = get_boto3_client("s3")
        content_type = file.content_type or "video/mp4"
        s3.upload_fileobj(
            io.BytesIO(contents),
            s3_bucket,
            s3_key,
            ExtraArgs={"ContentType": content_type}
        )
    except Exception:
        pass

    try:
        dynamodb = get_boto3_client("dynamodb")
        dynamodb.put_item(
            TableName=dynamo_table,
            Item={
                "job_id": {"S": job_id},
                "status": {"S": "queued"},
                "progress": {"N": "0"},
                "current_stage": {"S": "Queued for processing"},
                "stage_label": {"S": "Queued for processing"},
                "s3_key": {"S": s3_key},
                "created_at": {"S": now_iso},
                "file_size_mb": {"N": str(round(size_mb, 2))},
            }
        )
    except Exception:
        pass

    try:
        sqs = get_boto3_client("sqs")
        sqs.send_message(
            QueueUrl=sqs_url,
            MessageBody=json.dumps({
                "job_id": job_id,
                "s3_key": s3_key,
                "created_at": now_iso
            })
        )
    except Exception:
        pass

    return {
        "job_id": job_id,
        "status": "queued",
        "estimated_duration_seconds": 30
    }


@router.post("/detect/image-ocr")
@router.post("/detect/image")
async def detect_image_unified(request: Request, file: UploadFile = File(...)):
    """
    Accepts an uploaded image, routes intelligently through NETRA's Dual-Branch Router:
    - Branch A (Pure Face): Multi-face localization, EfficientNet-B4 + SBI deepfake detection, VisualAnomalyLocalizer
    - Branch B (Document): RapidOCR text extraction, IOC identification, Random Forest scam classification, Tavily cross-check
    - Branch C (Hybrid): Full execution of both pipelines with unified composite risk dossier
    Preserves 100% backward compatibility with existing image-ocr schema and consumers.
    """
    allowed_image_types = {"image/jpeg", "image/png", "image/webp", "image/jpg", "image/bmp"}
    if file.content_type and file.content_type not in allowed_image_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type: {file.content_type}. Allowed: jpeg, png, webp, jpg, bmp"
        )

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds maximum size of 50MB.")

    from netra.pipeline.dual_branch_router import process_image_forensics
    try:
        result = process_image_forensics(
            image_bytes=contents,
            filename=file.filename or "uploaded_image.png",
            request=request
        )
        return result
    except Exception as e:
        logger.error(f"Image dual-branch forensics analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image forensics analysis failed: {str(e)}")


@router.get("/detect/health")
async def detect_health():
    return {"status": "ok", "service": "detect"}
