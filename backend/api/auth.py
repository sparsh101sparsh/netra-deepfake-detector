import os
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from .db import verify_and_consume_key

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify the API key exists in SQLite / DB and enforce rate limits."""
    res = verify_and_consume_key(api_key)
    
    if not res:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key. Please provide a valid X-API-Key header generated from the Developer Portal."
        )
        
    if isinstance(res, dict) and res.get("error") == "QUOTA_EXCEEDED":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"API Quota Exceeded. Used {res['used']} / {res['quota']} requests this billing period."
        )
        
    return res

