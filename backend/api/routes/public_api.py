from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
import uuid, boto3, json, os
from datetime import datetime
from ..auth import verify_api_key

router = APIRouter()

S3_BUCKET = os.getenv("S3_BUCKET_MEDIA", "netra-media-uploads")
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "")
DYNAMO_TABLE = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")
MAX_FILE_SIZE_MB = 100

s3 = boto3.client("s3", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
sqs = boto3.client("sqs", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
dynamodb = boto3.client("dynamodb", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))

ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/avi", "video/x-msvideo"}

@router.post("/analyze")
async def analyze_media(
    file: UploadFile = File(...),
    api_key_data: dict = Depends(verify_api_key)
):
    """
    Public Developer API to submit media for deepfake analysis.
    Requires X-API-Key header.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: mp4, mov, webm, avi"
        )

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
        import io
        s3.upload_fileobj(io.BytesIO(contents), S3_BUCKET, s3_key)

        dynamodb.put_item(
            TableName=DYNAMO_TABLE,
            Item={
                "job_id": {"S": job_id},
                "status": {"S": "queued"},
                "progress": {"N": "0"},
                "current_stage": {"S": "Queued for processing via Developer API"},
                "s3_key": {"S": s3_key},
                "created_at": {"S": datetime.utcnow().isoformat()},
                "file_size_mb": {"N": str(round(size_mb, 2))},
                "api_key": {"S": api_key_data.get("api_key", "unknown")},
            }
        )

        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                "job_id": job_id,
                "s3_key": s3_key,
                "created_at": datetime.utcnow().isoformat(),
                "source": "developer_api"
            })
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch job: {str(e)}")

    return {
        "job_id": job_id,
        "status": "queued",
        "message": "Media successfully submitted for analysis. Poll the job status endpoint with this job_id.",
        "developer_tier": api_key_data.get("tier", "unknown")
    }
