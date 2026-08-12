"""
NETRA Backend Main Application Entrypoint
Exposes the root FastAPI application with all routers registered including
worker presence and forensic job telemetry.
"""

import os
import sys
from dotenv import load_dotenv

# Ensure root and backend directories are in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Ensure environment variables are loaded
root_env = os.path.join(root_dir, ".env")
backend_env = os.path.join(backend_dir, ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)
if os.path.exists(backend_env):
    load_dotenv(backend_env)

try:
    from backend.api.server import app
except ImportError:
    from api.server import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
