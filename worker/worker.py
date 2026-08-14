"""
NETRA SQS Worker — GPU Process
Polls the SQS queue, runs the full ML pipeline, writes results to DynamoDB.
Runs on EC2 g4dn.xlarge Spot Instance (GPU).

DO NOT run ML models anywhere else — this is the only GPU process.
"""
import boto3
import json
import os
import asyncio
import logging
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("netra.worker")

import os, sys
from dotenv import load_dotenv

# Ensure root and backend directories are in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv(os.path.join(root_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env"))

# AWS Config
REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "https://sqs.us-east-1.amazonaws.com/131746731374/netra-jobs")
S3_BUCKET_MEDIA = os.getenv("S3_BUCKET_MEDIA", "netra-media-uploads")
S3_BUCKET_MODELS = os.getenv("S3_BUCKET_MODELS", "netra-models")
DYNAMO_TABLE = os.getenv("DYNAMO_TABLE_JOBS", "netra-jobs")
SPATIAL_MODEL_PATH = os.getenv("SPATIAL_MODEL_PATH", "/opt/netra/models/spatial/model.pth")
CLIP_PROBE_PATH = os.getenv("CLIP_PROBE_PATH", "/opt/netra/models/clip_probe/model.pth")

def get_boto3(service_name: str):
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


def update_job_progress(job_id: str, status: str, progress: int, stage: str):
    """Write progress update to DynamoDB so API can poll it."""
    try:
        dynamodb.update_item(
            TableName=DYNAMO_TABLE,
            Key={"job_id": {"S": job_id}},
            UpdateExpression="SET #s = :s, progress = :p, current_stage = :cs, updated_at = :ua",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": {"S": status},
                ":p": {"N": str(progress)},
                ":cs": {"S": stage},
                ":ua": {"S": datetime.utcnow().isoformat()},
            }
        )
    except Exception as e:
        logger.error(f"Failed to update DynamoDB: {e}")


def write_result_to_dynamo(job_id: str, result: dict):
    """Write final complete result to DynamoDB."""
    try:
        dynamodb.update_item(
            TableName=DYNAMO_TABLE,
            Key={"job_id": {"S": job_id}},
            UpdateExpression="SET #s = :s, progress = :p, current_stage = :cs, #r = :r, completed_at = :ca",
            ExpressionAttributeNames={"#s": "status", "#r": "result"},
            ExpressionAttributeValues={
                ":s": {"S": "complete"},
                ":p": {"N": "100"},
                ":cs": {"S": "Analysis complete"},
                ":r": {"S": json.dumps(result)},
                ":ca": {"S": datetime.utcnow().isoformat()},
            }
        )
    except Exception as e:
        logger.error(f"Failed to write result: {e}")


def write_error_to_dynamo(job_id: str, error: str):
    """Write error state to DynamoDB."""
    try:
        dynamodb.update_item(
            TableName=DYNAMO_TABLE,
            Key={"job_id": {"S": job_id}},
            UpdateExpression="SET #s = :s, progress = :p, current_stage = :cs, #e = :e",
            ExpressionAttributeNames={"#s": "status", "#e": "error"},
            ExpressionAttributeValues={
                ":s": {"S": "error"},
                ":p": {"N": "0"},
                ":cs": {"S": f"Error: {error[:200]}"},
                ":e": {"S": error},
            }
        )
    except Exception as e:
        logger.error(f"Failed to write error: {e}")


def process_job(job_id: str, s3_key: str):
    """
    Full NETRA pipeline for one job:
    1. Download video from S3
    2. Extract frames and audio
    3. Run all detectors
    4. Fuse results
    5. Generate Bedrock forensic report
    6. Write complete result to DynamoDB
    """
    logger.info(f"Processing job {job_id}")

    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "input.mp4")
        audio_path = os.path.join(tmpdir, "audio.wav")
        frames_dir = os.path.join(tmpdir, "frames")
        os.makedirs(frames_dir, exist_ok=True)

        try:
            # === STAGE 1: Download video ===
            update_job_progress(job_id, "processing", 5, "Downloading video")
            s3.download_file(S3_BUCKET_MEDIA, s3_key, video_path)
            logger.info(f"Downloaded video: {os.path.getsize(video_path) / 1024:.1f} KB")

            # === STAGE 2: Extract frames + audio (parallel) ===
            update_job_progress(job_id, "processing", 15, "Extracting frames and audio")
            from netra.pipeline.extractor import extract_frames, extract_audio
            frames = extract_frames(video_path, job_id, frames_dir)
            audio_path_result = extract_audio(video_path, audio_path)
            logger.info(f"Extracted {len(frames)} frames, audio: {audio_path_result is not None}")

            # Get video duration
            import cv2
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 25
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_duration = total_frames / fps
            cap.release()

            # === STAGE 3: Run visual detector (EfficientNet-B4) ===
            update_job_progress(job_id, "processing", 30, "Running spatial deepfake detector")
            from netra.pipeline.detectors.spatial import SpatialSBIDetector
            spatial_detector = SpatialSBIDetector(model_path=SPATIAL_MODEL_PATH if os.path.exists(SPATIAL_MODEL_PATH) else None)
            frame_paths = [f["image_path"] for f in frames]
            frame_predictions = spatial_detector.predict_frames_batch(frame_paths)

            # === STAGE 4: Run CLIP probe ===
            update_job_progress(job_id, "processing", 50, "Running CLIP generalisation detector")
            try:
                from netra.pipeline.detectors.clip_probe import CLIPDeepfakeProbe
                clip_detector = CLIPDeepfakeProbe(probe_path=CLIP_PROBE_PATH if os.path.exists(CLIP_PROBE_PATH) else None)
                clip_predictions = [clip_detector.predict_frame(fp) for fp in frame_paths]
            except Exception as e:
                logger.warning(f"CLIP probe failed: {e}")
                clip_predictions = None

            # === STAGE 5: Run audio detector ===
            update_job_progress(job_id, "processing", 65, "Running audio deepfake detector")
            audio_result = None
            if audio_path_result:
                try:
                    from netra.pipeline.detectors.audio import AudioDeepfakeDetector
                    audio_detector = AudioDeepfakeDetector()
                    audio_result = audio_detector.predict_audio(audio_path_result)
                except Exception as e:
                    logger.warning(f"Audio detection failed: {e}")

            # === STAGE 6: Auxiliary signals ===
            update_job_progress(job_id, "processing", 75, "Analyzing metadata and auxiliary signals")
            try:
                from netra.pipeline.auxiliary import run_all_auxiliary
                auxiliary_result = run_all_auxiliary(video_path, frames)
            except Exception as e:
                logger.warning(f"Auxiliary analysis failed: {e}")
                auxiliary_result = {"metadata": {}, "all_flags": []}

            # === STAGE 7: Fusion ===
            update_job_progress(job_id, "processing", 82, "Fusing detector scores")
            from netra.pipeline.fusion import GatedFusionEngine
            fusion = GatedFusionEngine()

            all_spatial = [p.get("fake_probability", 0) or 0 for p in frame_predictions]
            global_visual = sum(all_spatial) / max(len(all_spatial), 1)
            global_audio = audio_result.get("fake_probability") if audio_result and audio_result.get("available") else None
            global_clip = None
            if clip_predictions:
                clip_scores = [p.get("fake_probability") for p in clip_predictions if p.get("fake_probability") is not None]
                global_clip = sum(clip_scores) / len(clip_scores) if clip_scores else None

            fusion_result = fusion.fuse(
                visual_score=global_visual,
                audio_score=global_audio,
                clip_score=global_clip,
                aux_flags=auxiliary_result.get("all_flags", []),
            )

            # === STAGE 8: Build evidence bundle ===
            update_job_progress(job_id, "processing", 87, "Building evidence bundle")
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

            # === STAGE 9: Deterministic Forensic Evidence Dossier ===
            update_job_progress(job_id, "processing", 92, "Consolidating forensic evidence dossier")
            bedrock_result = {
                "full_report": f"Forensic analysis completed for job {job_id}. Verdict: {fusion_result['verdict']} with {fusion_result['confidence']:.1f}% confidence. Visual score: {fusion_result['visual_score']:.2f}, Risk level: {fusion_result['risk_level']}.",
                "generated_by": "NETRA Neural Forensic Engine v5.0 (Deterministic)"
            }

            # === STAGE 10: Compose final result ===
            update_job_progress(job_id, "processing", 98, "Finalizing results")

            final_result = {
                "verdict": fusion_result["verdict"],
                "confidence": fusion_result["confidence"],
                "visual_score": fusion_result["visual_score"],
                "audio_score": fusion_result.get("audio_score"),
                "clip_score": fusion_result.get("clip_score"),
                "risk_level": fusion_result["risk_level"],
                "frames": [
                    {
                        "frame_number": f.frame_number,
                        "timestamp": f.timestamp,
                        "confidence": f.confidence,
                        "flags": f.flags,
                        "spatial_score": f.spatial_score,
                    }
                    for f in evidence.suspicious_frames[:20]
                ],
                "audio_flags": evidence.audio_segments[0].flags if evidence.audio_segments else [],
                "metadata_flags": evidence.metadata_flags,
                "forensic_report": bedrock_result.get("full_report", ""),
                "report_generated_by": bedrock_result.get("generated_by", ""),
                "manipulation_type": fusion_result["verdict"].replace("_", " ").title(),
            }

            write_result_to_dynamo(job_id, final_result)
            logger.info(f"Job {job_id} complete — verdict: {fusion_result['verdict']}, confidence: {fusion_result['confidence']:.1f}%")

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            write_error_to_dynamo(job_id, str(e))


def run_worker():
    """Main SQS polling loop. Runs continuously on the GPU EC2 instance."""
    logger.info("NETRA Worker starting — polling SQS queue...")

    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=SQS_QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,  # Long polling
                VisibilityTimeout=300,  # 5 mins — job should complete in <2 mins
            )

            messages = response.get("Messages", [])
            if not messages:
                continue

            for message in messages:
                receipt_handle = message["ReceiptHandle"]
                body = json.loads(message["Body"])

                job_id = body.get("job_id")
                s3_key = body.get("s3_key")

                if not job_id or not s3_key:
                    logger.warning(f"Invalid SQS message: {body}")
                    sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle)
                    continue

                try:
                    process_job(job_id, s3_key)
                except Exception as e:
                    logger.error(f"Unhandled error for job {job_id}: {e}")
                    write_error_to_dynamo(job_id, str(e))
                finally:
                    # Always delete message from queue after processing
                    sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=receipt_handle)

        except KeyboardInterrupt:
            logger.info("Worker shutting down...")
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}", exc_info=True)
            import time
            time.sleep(5)  # Brief pause before retrying


if __name__ == "__main__":
    run_worker()
