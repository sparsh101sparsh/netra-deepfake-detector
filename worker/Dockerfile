# ──────────────────────────────────────────────────────────────────────
# NETRA Forensic Worker Daemon — Production Docker Image
#
# Build CPU Image:
#   docker build -t netra-worker:latest .
#
# Build CUDA Image (for EC2 g4dn/g5 GPU instances):
#   docker build --build-arg BASE=nvidia/cuda:12.4.1-runtime-ubuntu22.04 -t netra-worker:gpu .
#
# Run locally:
#   docker run --env-file .env netra-worker:latest
# ──────────────────────────────────────────────────────────────────────

ARG BASE=python:3.11-slim-bookworm
FROM ${BASE} AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 libglib2.0-0 libmagic1 build-essential curl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /build
COPY backend/requirements.txt /build/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /build/requirements.txt

FROM deps AS app
WORKDIR /netra
COPY backend/ /netra/backend/
COPY worker/  /netra/worker/
COPY .env     /netra/.env

ENV PYTHONPATH="/netra:/netra/backend"
ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

ENTRYPOINT ["python", "-m", "worker.worker"]
