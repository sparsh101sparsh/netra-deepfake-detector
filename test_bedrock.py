import boto3
import json
import os

try:
    bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 10,
        "messages": [{"role": "user", "content": "Hello, are you there?"}]
    })
    
    print("Invoking Claude 3.5 Sonnet on Bedrock...")
    resp = bedrock.invoke_model(
        modelId="amazon.nova-pro-v1:0",
        contentType="application/json",
        accept="application/json",
        body=body,
    )
    result = json.loads(resp["body"].read())
    print("Success! Response:", result["content"][0]["text"])

except Exception as e:
    print("\n❌ Failed to invoke Bedrock:")
    print(str(e))
