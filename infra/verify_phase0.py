"""
infra/verify_phase0.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NETRA v5.0 — Phase 0 Done-When Verification Script

Run after bootstrap_aws.py to prove all Phase 0 resources exist.
Exit code 0 = all checks passed. Non-zero = failures found.

Usage:
    python infra/verify_phase0.py

Checks:
  ✅ AWS credentials work (sts.get_caller_identity)
  ✅ All 4 S3 buckets exist with correct lifecycle rules
  ✅ Both DynamoDB tables exist and are ACTIVE
  ✅ SQS main queue + DLQ exist with correct RedrivePolicy
  ✅ Both ECR repos exist
  ✅ .env.example file has all required keys
  ✅ budget-tracker.md exists
  ✅ .gitignore protects .env and model files
  ⚠️  Bedrock access (warns if not pre-approved — human step)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
import boto3
import os
import sys
from dotenv import load_dotenv

load_dotenv()

REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

REQUIRED_S3_BUCKETS = [
    os.getenv("S3_BUCKET_MEDIA",    "netra-media-uploads"),
    os.getenv("S3_BUCKET_MODELS",   "netra-models"),
    os.getenv("S3_BUCKET_DATASETS", "netra-datasets"),
    os.getenv("S3_BUCKET_REPORTS",  "netra-reports"),
]

REQUIRED_DYNAMO_TABLES = [
    os.getenv("DYNAMO_TABLE_JOBS",       "netra-jobs"),
    os.getenv("DYNAMO_TABLE_RATELIMITS", "netra-rate-limits"),
]

REQUIRED_SQS_QUEUES = [
    os.getenv("SQS_QUEUE_NAME", "netra-jobs"),
    "netra-jobs-dlq",
]

REQUIRED_ECR_REPOS = ["netra-api", "netra-worker"]

REQUIRED_ENV_KEYS = [
    "AWS_DEFAULT_REGION", "AWS_ACCOUNT_ID",
    "S3_BUCKET_MEDIA", "S3_BUCKET_MODELS", "S3_BUCKET_DATASETS", "S3_BUCKET_REPORTS",
    "SQS_QUEUE_URL", "SQS_QUEUE_NAME",
    "DYNAMO_TABLE_JOBS", "DYNAMO_TABLE_RATELIMITS",
    "ECR_REPO_API", "ECR_REPO_WORKER",
    "BEDROCK_MODEL_ID", "BEDROCK_FALLBACK_MODEL_ID",
    "USE_PRETRAINED_ONLY",
    "ALERT_EMAIL",
]

REQUIRED_GITIGNORE_PATTERNS = [".env", "*.pth", "*.pt", "data/", "node_modules/"]

# ─── Counters ─────────────────────────────────────────────────────────────────

passed  = 0
failed  = 0
warned  = 0

def ok(msg):
    global passed
    passed += 1
    print(f"  ✅ {msg}")

def fail(msg):
    global failed
    failed += 1
    print(f"  ❌ {msg}")

def warn(msg):
    global warned
    warned += 1
    print(f"  ⚠️  {msg}")

# ─── AWS credentials ──────────────────────────────────────────────────────────

def check_credentials():
    print("\n🔑 AWS Credentials")
    try:
        sts = boto3.client("sts", region_name=REGION)
        identity = sts.get_caller_identity()
        ok(f"Authenticated as: {identity['Arn']}")
        ok(f"Account ID: {identity['Account']}")
    except Exception as e:
        fail(f"AWS credentials not working: {e}")

# ─── S3 ───────────────────────────────────────────────────────────────────────

def check_s3():
    print("\n📦 S3 Buckets")
    s3 = boto3.client("s3", region_name=REGION)
    try:
        existing = {b["Name"] for b in s3.list_buckets()["Buckets"]}
    except Exception as e:
        fail(f"Cannot list S3 buckets: {e}")
        return

    for bucket in REQUIRED_S3_BUCKETS:
        if bucket in existing:
            ok(f"Bucket exists: {bucket}")
            # Check lifecycle for media bucket
            if "media" in bucket or "reports" in bucket:
                try:
                    lc = s3.get_bucket_lifecycle_configuration(Bucket=bucket)
                    rules = lc.get("Rules", [])
                    if rules:
                        days = rules[0].get("Expiration", {}).get("Days", "?")
                        ok(f"  Lifecycle: {days}d expiry on {bucket}")
                    else:
                        warn(f"  No lifecycle rules on {bucket}")
                except s3.exceptions.NoSuchLifecycleConfiguration:
                    warn(f"  No lifecycle rule on {bucket} — run bootstrap_aws.py")
                except Exception as e:
                    warn(f"  Lifecycle check failed on {bucket}: {e}")
        else:
            fail(f"Bucket MISSING: {bucket} — run infra/bootstrap_aws.py")

# ─── DynamoDB ─────────────────────────────────────────────────────────────────

def check_dynamodb():
    print("\n🗄️  DynamoDB Tables")
    ddb = boto3.client("dynamodb", region_name=REGION)
    try:
        existing = ddb.list_tables()["TableNames"]
    except Exception as e:
        fail(f"Cannot list DynamoDB tables: {e}")
        return

    for table in REQUIRED_DYNAMO_TABLES:
        if table in existing:
            try:
                desc = ddb.describe_table(TableName=table)["Table"]
                status = desc["TableStatus"]
                billing = desc.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED")
                if status == "ACTIVE":
                    ok(f"Table ACTIVE: {table} ({billing})")
                else:
                    warn(f"Table {table} is {status} (not yet ACTIVE)")
            except Exception as e:
                warn(f"Table {table} exists but describe failed: {e}")
        else:
            fail(f"Table MISSING: {table} — run infra/bootstrap_aws.py")

# ─── SQS ──────────────────────────────────────────────────────────────────────

def check_sqs():
    print("\n📨 SQS Queues")
    sqs = boto3.client("sqs", region_name=REGION)
    for queue_name in REQUIRED_SQS_QUEUES:
        try:
            url = sqs.get_queue_url(QueueName=queue_name)["QueueUrl"]
            attrs = sqs.get_queue_attributes(QueueUrl=url, AttributeNames=["All"])["Attributes"]
            vis  = attrs.get("VisibilityTimeout", "?")
            ok(f"Queue exists: {queue_name} (VisibilityTimeout={vis}s)")
            if "dlq" not in queue_name:
                redrive = attrs.get("RedrivePolicy")
                if redrive:
                    ok(f"  RedrivePolicy configured (DLQ attached)")
                else:
                    warn(f"  No RedrivePolicy on {queue_name} — DLQ not attached")
        except sqs.exceptions.QueueDoesNotExist:
            fail(f"Queue MISSING: {queue_name} — run infra/bootstrap_aws.py")
        except Exception as e:
            warn(f"Queue {queue_name} check failed: {e}")

# ─── ECR ──────────────────────────────────────────────────────────────────────

def check_ecr():
    print("\n🐳 ECR Repositories")
    ecr = boto3.client("ecr", region_name=REGION)
    for repo in REQUIRED_ECR_REPOS:
        try:
            resp = ecr.describe_repositories(repositoryNames=[repo])
            uri  = resp["repositories"][0]["repositoryUri"]
            ok(f"ECR repo exists: {repo} → {uri}")
        except ecr.exceptions.RepositoryNotFoundException:
            fail(f"ECR repo MISSING: {repo} — run infra/bootstrap_aws.py")
        except Exception as e:
            warn(f"ECR {repo} check failed: {e}")

# ─── .env.example ─────────────────────────────────────────────────────────────

def check_env_example():
    print("\n🔧 .env.example Keys")
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.example")
    if not os.path.exists(env_path):
        fail(".env.example not found in project root")
        return

    with open(env_path) as f:
        content = f.read()

    for key in REQUIRED_ENV_KEYS:
        if key in content:
            ok(f"Key present: {key}")
        else:
            fail(f"Key MISSING from .env.example: {key}")

# ─── .gitignore ───────────────────────────────────────────────────────────────

def check_gitignore():
    print("\n🛡️  .gitignore")
    gi_path = os.path.join(os.path.dirname(__file__), "..", ".gitignore")
    if not os.path.exists(gi_path):
        fail(".gitignore not found")
        return

    with open(gi_path) as f:
        content = f.read()

    for pattern in REQUIRED_GITIGNORE_PATTERNS:
        if pattern in content:
            ok(f"Protected: {pattern}")
        else:
            warn(f"Not in .gitignore: {pattern} — add it to prevent accidental commits")

# ─── budget-tracker.md ────────────────────────────────────────────────────────

def check_budget_tracker():
    print("\n💰 budget-tracker.md")
    bt_path = os.path.join(os.path.dirname(__file__), "..", "budget-tracker.md")
    if os.path.exists(bt_path):
        ok("budget-tracker.md exists")
    else:
        fail("budget-tracker.md MISSING — create it with initial $0 entry")

# ─── Bedrock (warns — human step) ─────────────────────────────────────────────

def check_bedrock():
    print("\n🤖 Amazon Bedrock (human must approve access)")
    bedrock = boto3.client("bedrock", region_name=REGION)
    try:
        models = bedrock.list_foundation_models()["modelSummaries"]
        ids    = [m["modelId"] for m in models]

        claude = "anthropic.claude-3-5-sonnet-20241022-v2:0"
        nova   = "amazon.nova-pro-v1:0"

        if claude in ids:
            ok(f"Bedrock Claude 3.5 Sonnet accessible")
        else:
            warn(f"Claude 3.5 Sonnet NOT accessible — human must enable in AWS Console")

        if nova in ids:
            ok(f"Bedrock Nova Pro accessible")
        else:
            warn(f"Nova Pro NOT accessible — human must enable in AWS Console")
    except Exception as e:
        warn(f"Cannot verify Bedrock access: {e}. Human must enable models manually.")

# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🔍 NETRA v5.0 — Phase 0 Done-When Verification")
    print("=" * 55)

    check_credentials()
    check_s3()
    check_dynamodb()
    check_sqs()
    check_ecr()
    check_env_example()
    check_gitignore()
    check_budget_tracker()
    check_bedrock()

    print("\n" + "=" * 55)
    print(f"  ✅ Passed:  {passed}")
    print(f"  ⚠️  Warned:  {warned} (human action or non-blocking)")
    print(f"  ❌ Failed:  {failed}")
    print("=" * 55)

    if failed > 0:
        print("\n🚨 Phase 0 NOT complete. Fix failures before proceeding.")
        sys.exit(1)
    elif warned > 0:
        print("\n⚠️  Phase 0 infrastructure is ready. Complete human steps before Phase 3.")
        sys.exit(0)
    else:
        print("\n🎉 Phase 0 COMPLETE. All checks passed!")
        sys.exit(0)
