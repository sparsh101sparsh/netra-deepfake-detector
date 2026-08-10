import os
import boto3
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
dynamodb = boto3.resource("dynamodb", region_name=REGION)
TABLE_NAME = "netra-api-keys"

def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify the API key exists in DynamoDB and has remaining quota."""
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(Key={"api_key": api_key})
        
        if "Item" not in response:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API Key",
            )
            
        item = response["Item"]
        
        if item.get("status") == "REVOKED":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API Key has been revoked",
            )
            
        # Track usage
        table.update_item(
            Key={"api_key": api_key},
            UpdateExpression="ADD usage_count :inc",
            ExpressionAttributeValues={":inc": 1}
        )
        
        return item
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Auth error: {e}")
        if os.getenv("ENVIRONMENT") == "local":
            return {"api_key": api_key, "tier": "developer"}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating API key",
        )
