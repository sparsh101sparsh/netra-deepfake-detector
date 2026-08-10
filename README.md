# NETRA v5.1 — Neural Evaluation & Tracking Research Architecture

## Multi-Modal Deepfake Detection & Scam Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Demo-netra--deepfake--detector.vercel.app-blue)](https://netra-deepfake-detector.vercel.app)
[![AWS Infrastructure](https://img.shields.io/badge/Hosting-AWS-yellow)](https://aws.amazon.com)

**NETRA** is an enterprise-grade platform built to detect AI face swaps, voice clones, and digital scams in Indian media. Our system runs a highly optimized multi-modal ML pipeline to generate structured evidence, which is then synthesized by **Moonshot's Kimi Model** into professional forensic reports.

---

## Architecture Overview

Our architecture utilizes a tiered, cloud-first approach ensuring rapid response times and high availability:

```
User Upload (SpaceX SaaS Frontend)
        │
        ▼
FastAPI Gateway (EC2 t3.micro)
  ├── Uploads media to S3
  ├── Writes job state to DynamoDB
  └── Dispatches task to SQS queue
        │
        ▼
GPU ML Worker (EC2 g4dn.xlarge)
  ├── EfficientNet-B4 (Spatial/Visual artifacts)
  ├── Wav2Vec2 (Audio/Voice clone detection)
  ├── CLIP ViT-L/14 (Semantic MLP probe)
  └── OCR / Transcription Extraction
        │
        ▼
Moonshot Kimi Model (Evidence Synthesis)
  └── Gated fusion JSON → Forensic Markdown Report
        │
        ▼
Frontend Real-Time Updates (Vercel)
  ├── Live Telemetry Geo-Map
  ├── Top Scams Deduplication Leaderboard
  ├── Evidence Timeline (temporal artifacts)
  └── Forensic Report
```

## Quick Start

### 1. Environment Setup
Create a `.env` file from the example template and fill in your AWS credentials, Moonshot API key, and Hugging Face token.
```bash
cp .env.example .env
```

### 2. Bootstrap AWS Infrastructure
Run the bootstrap script to provision S3 buckets, DynamoDB tables, and SQS queues.
```bash
cd infra
python3 bootstrap_aws.py
```

### 3. Model Preparation
Download the pre-trained weights for our spatial and audio models.
```bash
python3 scripts/fetch_pretrained_models.py ./models
```
*Note: To upload your locally fine-tuned models to Hugging Face Hub, use our provided script `python3 scripts/upload_model_to_hf.py`.*

### 4. Run the API Locally
```bash
docker-compose up api
```

### 5. Deploy the Worker Node
Build and push the worker container to Amazon ECR, then deploy to your `g4dn.xlarge` instance.
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t netra-worker -f worker/Dockerfile.gpu .
docker tag netra-worker:latest <account>.dkr.ecr.us-east-1.amazonaws.com/netra-worker:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/netra-worker:latest
```

## Community & Team
Built by Sparsh, Sudiksha, Sumit, Shashwat, and Ranjan. 
We aim to protect the Indian digital ecosystem from sophisticated AI-generated scams.
