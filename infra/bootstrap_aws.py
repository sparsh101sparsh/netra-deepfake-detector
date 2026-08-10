#!/usr/bin/env python3
"""
NETRA AWS Infrastructure Bootstrap
Creates all required AWS resources in one idempotent run.
Run on Day 1 BEFORE any other phase.

Uses ONLY always-free tier resources:
- S3 (5GB free), DynamoDB (25GB free), SQS (1M msgs/month free), ECR (500MB free)

GPU training is handled by Kaggle (FREE) — not SageMaker.
"""
import boto3
import json
import os
import sys
import time

REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

s3 = boto3.client("s3", region_name=REGION)
dynamodb = boto3.client("dynamodb", region_name=REGION)
sqs = boto3.client("sqs", region_name=REGION)
ecr = boto3.client("ecr", region_name=REGION)

def create_s3_bucket(bucket_name: str, lifecycle_days: int = None):
    """Create S3 bucket with optional lifecycle rule."""
    try:
        if REGION == "us-east-1":
            s3.create_bucket(Bucket=bucket_name)
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": REGION}
            )
        print(f"  ✅ S3 bucket created: {bucket_name}")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        print(f"  ✅ S3 bucket already exists: {bucket_name}")
    except Exception as e:
        print(f"  ❌ S3 bucket failed: {e}")
        return

    if lifecycle_days:
        try:
            s3.put_bucket_lifecycle_configuration(
                Bucket=bucket_name,
                LifecycleConfiguration={
                    "Rules": [{
                        "ID": f"auto-delete-{lifecycle_days}d",
                        "Status": "Enabled",
                        "Expiration": {"Days": lifecycle_days}
                    }]
                }
            )
            print(f"  ✅ Lifecycle rule: auto-delete after {lifecycle_days} days")
        except Exception as e:
            print(f"  ⚠️  Lifecycle rule failed: {e}")


def create_dynamodb_table(table_name: str):
    """Create DynamoDB table with on-demand billing (always-free)."""
    try:
        dynamodb.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "job_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "job_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",  # 25GB + 200M req/month free
        )
        print(f"  ✅ DynamoDB table created: {table_name}")
        time.sleep(3)  # Give it a moment to become active
    except dynamodb.exceptions.ResourceInUseException:
        print(f"  ✅ DynamoDB table already exists: {table_name}")
    except Exception as e:
        print(f"  ❌ DynamoDB table failed: {e}")


def create_sqs_queue(queue_name: str):
    """Create standard SQS queue with DLQ for failed messages."""
    try:
        # Create DLQ first
        dlq_name = f"{queue_name}-dlq"
        dlq_resp = sqs.create_queue(
            QueueName=dlq_name,
            Attributes={"MessageRetentionPeriod": "1209600"}  # 14 days
        )
        dlq_url = dlq_resp["QueueUrl"]

        # Get DLQ ARN
        dlq_attrs = sqs.get_queue_attributes(QueueUrl=dlq_url, AttributeNames=["QueueArn"])
        dlq_arn = dlq_attrs["Attributes"]["QueueArn"]

        # Create main queue with DLQ redrive
        resp = sqs.create_queue(
            QueueName=queue_name,
            Attributes={
                "VisibilityTimeout": "300",
                "MessageRetentionPeriod": "86400",  # 1 day
                "RedrivePolicy": json.dumps({
                    "deadLetterTargetArn": dlq_arn,
                    "maxReceiveCount": "3"  # 3 failures → DLQ
                })
            }
        )
        print(f"  ✅ SQS queue created: {queue_name}")
        print(f"  ✅ SQS DLQ created: {dlq_name}")
        return resp["QueueUrl"]
    except sqs.exceptions.QueueAlreadyExists:
        resp = sqs.get_queue_url(QueueName=queue_name)
        print(f"  ✅ SQS queue already exists: {queue_name}")
        return resp["QueueUrl"]
    except Exception as e:
        print(f"  ❌ SQS queue failed: {e}")
        return None


def create_ecr_repo(repo_name: str):
    """Create ECR repository for Docker images."""
    try:
        ecr.create_repository(repositoryName=repo_name)
        print(f"  ✅ ECR repo created: {repo_name}")
    except ecr.exceptions.RepositoryAlreadyExistsException:
        print(f"  ✅ ECR repo already exists: {repo_name}")
    except Exception as e:
        print(f"  ❌ ECR repo failed: {e}")


def bootstrap():
    print("=" * 60)
    print("NETRA AWS Infrastructure Bootstrap")
    print(f"Region: {REGION}")
    print("=" * 60)

    # S3 Buckets
    print("\n📦 Creating S3 Buckets...")
    create_s3_bucket("netra-media-uploads", lifecycle_days=1)    # 24h auto-delete
    create_s3_bucket("netra-models")                              # Permanent
    create_s3_bucket("netra-datasets")                            # Permanent
    create_s3_bucket("netra-reports", lifecycle_days=7)           # 7-day reports

    # DynamoDB
    print("\n🗄️  Creating DynamoDB Tables...")
    create_dynamodb_table("netra-jobs")
    create_dynamodb_table("netra-rate-limits")
    create_dynamodb_table("netra-api-keys")

    # SQS
    print("\n📬 Creating SQS Queues...")
    queue_url = create_sqs_queue("netra-jobs")
    if queue_url:
        print(f"  Queue URL: {queue_url}")
        print(f"  ⚠️  Add to .env: SQS_QUEUE_URL={queue_url}")

    # ECR
    print("\n🐳 Creating ECR Repositories...")
    create_ecr_repo("netra-api")
    create_ecr_repo("netra-worker")

    print("\n" + "=" * 60)
    print("✅ Bootstrap complete!")
    print("\nNext steps:")
    print("1. Copy SQS_QUEUE_URL to your .env file")
    print("2. Run: python scripts/fetch_pretrained_models.py")
    print("3. Push Kaggle training notebooks (see training/ directory)")
    print("4. Deploy backend API to EC2 t3.micro")
    print("=" * 60)


if __name__ == "__main__":
    bootstrap()
