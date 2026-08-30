import os
import sys
import json
import boto3

def load_env(env_path):
    env = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    v = v.strip()
                    if " #" in v:
                        v = v.split(" #", 1)[0].strip()
                    v = v.strip("\"'")
                    env[k.strip()] = v
    return env

def main():
    env_path = "/home/ubuntu/netra/.env" if os.path.exists("/home/ubuntu/netra/.env") else ".env"
    env = load_env(env_path)

    region = env.get("AWS_DEFAULT_REGION", "ap-south-1")
    ak = env.get("AWS_ACCESS_KEY_ID")
    sk = env.get("AWS_SECRET_ACCESS_KEY")
    table_name = env.get("DYNAMO_TABLE_JOBS", "netra-jobs")

    print(f"Connecting to DynamoDB table '{table_name}' in region '{region}'...")
    dynamo = boto3.client(
        "dynamodb",
        region_name=region,
        aws_access_key_id=ak,
        aws_secret_access_key=sk
    )

    paginator = dynamo.get_paginator("scan")
    items = []
    for page in paginator.paginate(
        TableName=table_name,
        FilterExpression="begins_with(job_id, :prefix)",
        ExpressionAttributeValues={":prefix": {"S": "CATALOG#"}}
    ):
        items.extend(page.get("Items", []))

    print(f"Found {len(items)} items in DynamoDB matching prefix 'CATALOG#':")
    
    test_keywords = [
        "TEST-", "DEMO-", "E2E-", "FIR-STRESS-", "CHALLENGE-THREAT-",
        "Concurrent Threat", "Load Threat", "Edge Case Coords",
        "Adversarial Image Test", "Concurrency Burst Threat",
        "Notice: Fake Warrant", "Alert: Scam <Official Notice>",
        "Meeting at 5 PM for coffee", "Your electricity power bill is unpaid",
        "Congratulations! You won Rs 10 Crore", "Hey mom, I bought the groceries",
        "Dear customer, your SBI YONO", "Your electricity will be disconnected",
        "Hello, please find the meeting agenda", "noise.opus",
        "Reported Electricity Kyc", "Reported Digital Arrest",
        "three_faces_test", "two_faces_test", "numerical_audit",
        "blank.jpg", "scenario_1", "scenario_2", "scenario_3", "scenario_4",
        "s0.jpg"
    ]

    to_delete = []
    to_keep = []

    for it in items:
        job_id = it.get("job_id", {}).get("S", "")
        payload_str = it.get("payload", {}).get("S", "")
        p = {}
        if payload_str:
            try:
                p = json.loads(payload_str)
            except Exception:
                pass
        
        item_id = p.get("id", job_id.replace("CATALOG#", ""))
        title = p.get("title", "")

        is_test = False
        for kw in test_keywords:
            if kw.lower() in item_id.lower() or kw.lower() in title.lower():
                is_test = True
                break
        
        if is_test:
            to_delete.append((job_id, item_id, title))
        else:
            to_keep.append((job_id, item_id, title))

    print("\n--- TO KEEP (Genuine scans) ---")
    for jid, iid, title in to_keep:
        print(f"  KEEP: {jid} | {iid} | {title}")

    print(f"\n--- TO DELETE ({len(to_delete)} test/demo/stress items) ---")
    for jid, iid, title in to_delete:
        print(f"  DELETE: {jid} | {iid} | {title}")

    if len(sys.argv) > 1 and sys.argv[-1] == "--execute":
        print(f"\nDeleting {len(to_delete)} items from DynamoDB...")
        for jid, iid, title in to_delete:
            dynamo.delete_item(
                TableName=table_name,
                Key={"job_id": {"S": jid}}
            )
            print(f"  Deleted: {jid}")
        print("DynamoDB cleanup complete!")
    else:
        print("\nDry run only. Run with --execute to actually delete from DynamoDB.")

if __name__ == "__main__":
    main()
