from fastapi import APIRouter, HTTPException, WebSocket
from fastapi.responses import JSONResponse
import boto3, json, os, asyncio
from datetime import datetime

router = APIRouter()

DYNAMO_TABLE = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")

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
            result[key] = float(val["N"])
        elif "BOOL" in val:
            result[key] = val["BOOL"]
        elif "NULL" in val:
            result[key] = None
    return result


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """
    Poll job status from DynamoDB.
    Frontend calls this every 2 seconds until status == 'complete' or 'error'.
    """
    try:
        resp = get_dynamo_client().get_item(
            TableName=DYNAMO_TABLE,
            Key={"job_id": {"S": job_id}}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DynamoDB error: {str(e)}")

    item = resp.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    parsed = _parse_dynamo_item(item)
    status = parsed.get("status", "unknown")
    progress = int(parsed.get("progress", 0))
    current_stage = parsed.get("current_stage", "")

    result = None
    if status == "complete" and "result" in parsed:
        try:
            result = json.loads(parsed["result"])
        except Exception:
            result = None

    return {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "current_stage": current_stage,
        "result": result,
        "created_at": parsed.get("created_at"),
    }


@router.websocket("/ws/{job_id}")
async def websocket_progress(ws: WebSocket, job_id: str):
    """
    WebSocket endpoint — polls DynamoDB every 2s and pushes progress to browser.
    Should-Have: implement after polling works end-to-end.
    """
    await ws.accept()
    try:
        while True:
            resp = get_dynamo_client().get_item(
                TableName=DYNAMO_TABLE,
                Key={"job_id": {"S": job_id}}
            )
            item = resp.get("Item", {})
            parsed = _parse_dynamo_item(item)
            status = parsed.get("status", "unknown")
            progress = int(parsed.get("progress", 0))
            stage = parsed.get("current_stage", "")

            await ws.send_json({
                "job_id": job_id,
                "status": status,
                "progress": progress,
                "stage": stage
            })

            if status in ("complete", "error"):
                break
            await asyncio.sleep(2)
    except Exception:
        pass
    finally:
        await ws.close()


@router.get("/jobs/{job_id}/video-url")
async def get_video_presigned_url(job_id: str):
    """
    Returns a presigned S3 URL for the job's input video.
    Used by frontend Evidence Timeline click-to-seek feature.
    """
    s3 = boto3.client("s3", region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
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
        raise HTTPException(status_code=500, detail=f"Failed to generate URL: {str(e)}")


@router.get("/jobs/{job_id}/report.pdf")
async def get_report_pdf(job_id: str):
    """PDF report stub — returns 501 until Phase 7 implements PDF generation."""
    raise HTTPException(status_code=501, detail="PDF report generation coming in Phase 7")
