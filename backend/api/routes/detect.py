from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uuid, boto3, json, os
from datetime import datetime

router = APIRouter()

S3_BUCKET = os.getenv("S3_BUCKET_MEDIA", "netra-media-uploads")
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "")
DYNAMO_TABLE = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")
MAX_FILE_SIZE_MB = 100

s3 = boto3.client("s3", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
sqs = boto3.client("sqs", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
dynamodb = boto3.client("dynamodb", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))

ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/avi", "video/x-msvideo"}


@router.post("/detect/full")
async def detect_full(file: UploadFile = File(...)):
    """
    Accept video upload, stream to S3, dispatch to SQS worker.
    Returns job_id immediately (non-blocking).
    NEVER runs ML models here — this is the lightweight t3.micro API only.
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

    try:
        # 1. Upload to S3
        import io
        s3.upload_fileobj(io.BytesIO(contents), S3_BUCKET, s3_key)

        # 2. Write initial job record to DynamoDB
        dynamodb.put_item(
            TableName=DYNAMO_TABLE,
            Item={
                "job_id": {"S": job_id},
                "status": {"S": "queued"},
                "progress": {"N": "0"},
                "current_stage": {"S": "Queued for processing"},
                "s3_key": {"S": s3_key},
                "created_at": {"S": datetime.utcnow().isoformat()},
                "file_size_mb": {"N": str(round(size_mb, 2))},
            }
        )

        # 3. Send to SQS — GPU worker picks this up asynchronously
        # Standard SQS queue — do NOT use MessageDeduplicationId (FIFO-only param)
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                "job_id": job_id,
                "s3_key": s3_key,
                "created_at": datetime.utcnow().isoformat()
            })
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch job: {str(e)}")

    return {
        "job_id": job_id,
        "status": "queued",
        "estimated_duration_seconds": 30
    }


@router.get("/detect/health")
async def detect_health():
    return {"status": "ok", "service": "detect"}
