# NETRA v5.0 — Neural Evaluation & Tracking Research Architecture
## Multi-Modal Deepfake Detection Platform for Indian Media

[![Live Demo](https://img.shields.io/badge/Demo-netra--deepfake--detector.vercel.app-blue)](https://netra-deepfake-detector.vercel.app)
[![GPU Training](https://img.shields.io/badge/Training-Kaggle%20GPU%20(P100%20FREE)-orange)](https://kaggle.com/code/sparshsingh989/netra-spatial-training)
[![AWS Free Tier](https://img.shields.io/badge/Hosting-AWS%20Free%20Tier-yellow)](https://aws.amazon.com/free/)

> **NETRA** detects AI face swaps, voice clones, and video manipulations in Indian media.  
> Multi-modal detection → structured evidence → Amazon Bedrock forensic report.

---

## Architecture

```
User Upload (Vercel Frontend)
        │
        ▼
FastAPI API (EC2 t3.micro, FREE)
  ├── Upload to S3 (24h lifecycle)
  ├── Write to DynamoDB (job state)
  └── Dispatch to SQS queue
        │
        ▼
SQS Worker (EC2 g4dn.xlarge Spot ~$0.16/hr)
  ├── EfficientNet-B4 + SBI (visual detector)
  ├── CLIP Probe (generalisation detector)
  ├── Wav2Vec2 (audio detector)
  ├── MediaPipe/DLIB (auxiliary signals)
  └── Gated Fusion → EvidenceBundle
        │
        ▼
Amazon Bedrock (Claude 3.5 Sonnet)
  └── Structured JSON evidence → Forensic Report
        │
        ▼
Frontend Results (Vercel)
  ├── Confidence Meter
  ├── Detector Scorecards
  ├── Evidence Timeline (click-to-seek)
  └── Forensic Report (markdown)
```

## Model Training (Kaggle — FREE GPU)
Training runs on Kaggle free P100 GPU (16GB) instead of AWS SageMaker.

| Notebook | Status | URL |
|----------|--------|-----|
| EfficientNet-B4 Spatial | 🟢 Running | https://kaggle.com/code/sparshsingh989/netra-spatial-training |
| CLIP Probe | ⏳ Queued | https://kaggle.com/code/sparshsingh989/netra-clip-training |

**After training completes:**
1. Download `spatial_model_best.pth` from Kaggle notebook output
2. Upload to HuggingFace: `netra-ai/spatial-detector-v1`
3. Set `SPATIAL_HF_MODEL_ID=netra-ai/spatial-detector-v1` in EC2 worker `.env`

## Quick Start

### 1. Set up environment
```bash
cp .env.example .env
# Fill in AWS credentials and other keys
```

### 2. Bootstrap AWS infrastructure (free tier only)
```bash
cd infra
python3 bootstrap_aws.py
```

### 3. Download pretrained baseline models (Day 1 - immediate)
```bash
python3 scripts/fetch_pretrained_models.py ./models
```

### 4. Run locally (no GPU needed for API)
```bash
docker-compose up api
```

### 5. Deploy to EC2
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t netra-api backend/
docker tag netra-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/netra-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/netra-api:latest
```

## Budget
| Component | Cost |
|-----------|------|
| Model training (Kaggle) | **$0** |
| S3 / DynamoDB / SQS | **$0** (always-free) |
| Bedrock (700 analyses) | ~$13.27 |
| **Total** | **~$13.27 / $100 credit** |

## Team
Sparsh (ML Lead) · Sudiksha · Sumit · Shashwat · Ranjan
