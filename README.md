# 🛡️ NETRA (Neural Evaluation & Threat Research Architecture)

> **Enterprise-Grade Multi-Modal Forensic AI & Cybercrime Threat Intelligence Platform**  
> *Autonomous deepfake detection, RapidOCR document seam analysis, real-time threat radar, and automated FIR dossier generation.*

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=github-actions)](https://github.com/sparsh101sparsh/netra-deepfake-detector)
[![Test Suite](https://img.shields.io/badge/Tests-52%2F52%20Passing%20(100%25)-brightgreen?style=for-the-badge&logo=pytest)](tests/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](backend/api/server.py)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.3%20App%20Router-black?style=for-the-badge&logo=next.js&logoColor=white)](frontend/)
[![AWS](https://img.shields.io/badge/AWS-S3%20%7C%20SQS%20%7C%20DynamoDB-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](infra/bootstrap_aws.py)
[![Render Backend](https://img.shields.io/badge/Render-API%20Live-46E3B7?style=for-the-badge&logo=render)](https://netra-api-pmr7.onrender.com)
[![Vercel Frontend](https://img.shields.io/badge/Vercel-Web%20Live-black?style=for-the-badge&logo=vercel)](https://netra-deepfake-detector.vercel.app)

---

## 📑 Table of Contents

1. [Executive Overview](#-executive-overview)
2. [System Architecture](#-system-architecture)
3. [Cloud Infrastructure & Deployment Topology](#-cloud-infrastructure--deployment-topology)
4. [Multi-Modal Forensic Pipelines](#-multi-modal-forensic-pipelines)
   - [1. Asynchronous Video Forensics](#1-asynchronous-video-forensics-s3--sqs--dynamodb)
   - [2. Synchronous RapidOCR & Document Seam Extraction](#2-synchronous-rapidocr--document-seam-extraction)
   - [3. Text Scam Classifier & Cybercrime Rules Matrix](#3-text-scam-classifier--cybercrime-rules-matrix)
   - [4. Acoustic Voice Clone & Speech Forensics](#4-acoustic-voice-clone--speech-forensics)
   - [5. Native Meta WhatsApp Cloud API Ingestion](#5-native-meta-whatsapp-cloud-api-ingestion)
   - [6. 24/7 Autonomous Threat News Crawler (Tavily)](#6-247-autonomous-threat-news-crawler-tavily)
5. [Database Architecture & Data Integrity](#-database-architecture--data-integrity)
6. [Core Functions Reference](#-core-functions-reference)
7. [Comprehensive API Documentation](#-comprehensive-api-documentation)
8. [Frontend Architecture](#-frontend-architecture)
9. [Project Directory Structure](#-project-directory-structure)
10. [Installation & Setup](#-installation--setup)
11. [Environment Variables](#-environment-variables)
12. [Testing & QA Audit (52/52 Passing)](#-testing--qa-audit-5252-passing)
13. [Security, Invariants & Anti-Poisoning](#-security-invariants--anti-poisoning)
14. [Performance & Hardware Guidelines](#-performance--hardware-guidelines)
15. [Institutional Alignment (RBIH & I4C)](#-institutional-alignment-rbih--i4c)
16. [Engineering Roadmap](#-engineering-roadmap)
17. [Author, Deployments & License](#-author-deployments--license)

---

## 📌 Executive Overview

**NETRA** is an institutional-grade cyber-defense and media forensics platform engineered to combat the rapid surge of generative AI deepfakes and organized digital extortion targeting the Indian socio-economic ecosystem.

### Target Indian Cybercrime Typologies
- **Digital Arrest Extortion**: Scammers impersonating Police/CBI/TRAI officers using real-time video face-swaps, synthetic backgrounds, and forged arrest warrants over WhatsApp video calls.
- **Executive Voice Cloning (vishing)**: High-fidelity neural TTS models cloning CEOs, Managing Directors, or relatives to authorize fraudulent RTGS/NEFT wire transfers.
- **Video-KYC (V-CIP) Deepfakes**: Virtual camera injections and synthetic face-swaps designed to bypass banking customer onboarding and loan underwriting.
- **Document & Check Forgery**: Forged court summons, tampered bank cheques, and fake electricity disconnection notices distributed via messaging channels without machine-readable text.
- **Financial Phishing & UPI Fraud**: High-pressure phishing lures harvesting OTPs, banking credentials, and unauthorized UPI transfers.

### Core Capabilities
1. **Multi-Modal Late Decision Fusion**: Combines spatial CNN boundary seam detectors with Vision Transformer (ViT) diffusion latent analyzers, acoustic spectrogram processors, and OCR token miners into a unified forensic verdict.
2. **Deterministic & Explainable**: Frame-by-frame visual evidence, landmark tracking, ocular luminance symmetry, and acoustic phase consistency. Zero external LLM hallucination in the threat classification pipeline.
3. **Automated Statutory FIR Dossiers**: Automatically compiles court-admissible forensic evidence citing **Bharatiya Nyaya Sanhita (BNS) 2023 Section 318(4)** (*Cheating by Personation*), **Information Technology Act 2000 Section 66D**, and integrating **National Cyber Helpline 1930** and `cybercrime.gov.in`.
4. **Zero-Barrier Citizen Access**: Natively accessible to 535M+ Indian citizens via **Meta WhatsApp Cloud API (v21.0)** with no app installation or login required.

---

## 🏗️ System Architecture

NETRA employs an event-driven, decoupled architecture separating client ingestion, API gateway routing, cloud task brokering, asynchronous GPU forensics, and live geospatial threat mapping.

```mermaid
graph TD
    subgraph Clients["Client Layer"]
        WEB["Next.js 14 Web Command Center (Vercel)"]
        WA["Native Meta WhatsApp Cloud API v21.0"]
        DEV["Institutional / Banking REST API"]
    end

    subgraph Gateway["FastAPI Gateway (Render / Cloud)"]
        AUTH["API Key / Header Auth Guard"]
        ROUTERS["API Routers (/api/v1)"]
        DB_ENGINE["SQLite WAL / PostgreSQL Engine"]
    end

    subgraph AWS["AWS Cloud Infrastructure"]
        S3["Amazon S3: netra-media-uploads"]
        SQS["Amazon SQS: netra-jobs"]
        DYNAMO["Amazon DynamoDB: netra-jobs"]
    end

    subgraph Workers["Multi-Modal Forensic Pipeline"]
        ALIGN["RetinaFace 3D Landmark Aligner"]
        SPATIAL["Spatial Seam Detector (NPR ResNet-50)"]
        GEND["Generative AI Detector (GenD ViT-L/14)"]
        AUDIO["Wav2Vec 2.0 Speech & Acoustic Demuxer"]
        OCR["RapidOCR Text & Document Extractor"]
        SCAM["NLP Random Forest + Heuristic Matrix"]
        FUSION["Adaptive Multi-Modal Late Fusion Engine"]
    end

    subgraph External["External Threat Intelligence"]
        TAVILY["Tavily 24/7 Cyber Threat Crawler"]
    end

    WEB -->|HTTPS / REST| ROUTERS
    DEV -->|X-API-Key| AUTH --> ROUTERS
    WA -->|Meta Webhook| ROUTERS

    ROUTERS -->|Video Stream| S3
    ROUTERS -->|Job State| DYNAMO
    ROUTERS -->|Dispatch Task| SQS
    ROUTERS -->|Synchronous Image / Text / Audio| Workers
    ROUTERS -->|State & Catalog| DB_ENGINE

    SQS -->|Consume Tasks| ALIGN
    S3 -->|Read Media Stream| ALIGN
    ALIGN --> SPATIAL & GEND & AUDIO
    SPATIAL & GEND & AUDIO --> FUSION
    FUSION -->|Write Verdict| DYNAMO

    ROUTERS -->|24h Daemon| TAVILY
    TAVILY -->|Deduplicated Threat News| DB_ENGINE
```

---

## ☁️ Cloud Infrastructure & Deployment Topology

```mermaid
graph LR
    subgraph Frontend_Host["Vercel Production Edge"]
        WEB_UI["Next.js 14 App Router
netra-deepfake-detector.vercel.app"]
    end

    subgraph Render_Host["Render Cloud Infrastructure"]
        API_SVC["FastAPI Backend (Port 8000)
netra-api-pmr7.onrender.com"]
        PG_DB["Managed PostgreSQL
netra-postgres (netradb)"]
        TAVILY_DAEMON["24h Background Crawler Thread"]
    end

    subgraph AWS_Cloud["AWS US-East-1 / AP-South-1"]
        S3_BUCKET["S3: netra-media-uploads"]
        SQS_QUEUE["SQS: netra-jobs (Standard)"]
        SQS_DLQ["SQS: netra-jobs-dlq"]
        DYNAMO_TBL["DynamoDB: netra-jobs (Cloud Persistence)"]
        GPU_WORKER["EC2 GPU Forensic Worker Fleet"]
    end

    WEB_UI -->|Reverse Proxy / Next.js Rewrites| API_SVC
    API_SVC --> PG_DB
    API_SVC --> TAVILY_DAEMON
    API_SVC -->|Stream Media Payload| S3_BUCKET
    API_SVC -->|Enqueue Asynchronous Job| SQS_QUEUE
    API_SVC -->|Initialize Job Telemetry| DYNAMO_TBL
    SQS_QUEUE -->|Dead Letter Redrive| SQS_DLQ
    SQS_QUEUE -->|Long Poll (20s)| GPU_WORKER
    GPU_WORKER -->|Fetch Video Stream| S3_BUCKET
    GPU_WORKER -->|Write Completed Verdict| DYNAMO_TBL
```

---

## 🔬 Multi-Modal Forensic Pipelines

### 1. Asynchronous Video Forensics (S3 + SQS + DynamoDB)
Video files up to 100MB are streamed non-blocking to Amazon S3. The API immediately issues a UUID `job_id` and dispatches an SQS message. If queue dispatch fails, an automatic S3 cleanup rollback triggers to prevent orphaned storage billing.

- **RetinaFace 3D Landmark Aligner**: Tracks 68 facial points across frames to detect micro-expression lag, boundary jitter, and left vs. right ocular luminance symmetry.
- **Spatial Seam Detector (NPR ResNet-50)**: Detects pixel-level spatial blending boundaries where the synthetic face is merged into the background.
- **Generative AI Detector (GenD ViT-L/14)**: Vision Transformer analyzing 768-dim patch tokens across 24 self-attention layers to identify diffusion noise signatures.
- **Adaptive Late Fusion Engine**: Dynamically weights spatial, generative, and temporal confidence scores to output an explainable visual verdict.

### 2. Synchronous RapidOCR & Document Seam Extraction
Processes uploaded screenshots, fake arrest warrants, and tampered cheques without persistent disk storage:
- **RapidOCR Engine**: High-speed ONNX runtime extracting text from low-resolution mobile screenshots and compression-degraded documents.
- **Indian IOC Extractor**: Extracts high-priority financial identifiers: Indian mobile numbers (`+91 / 0`), UPI Virtual Payment Addresses (`...@okhdfcbank`, `...@sbi`, `...@paytm`), and phishing URLs.
- **Error Level Analysis (ELA)**: Identifies digital alterations in official seals, police stamps, and signature blocks.

### 3. Text Scam Classifier & Cybercrime Rules Matrix
Synchronous forensic engine combining TF-IDF vectorization, a pre-trained Random Forest classifier (`scam_rf_model.pkl`), and high-precision Indian cybercrime regular expression rules across 6 typologies:
1. *Digital Arrest / CBI / Police Impersonation*
2. *Electricity Disconnection / Immediate KYC Cancellation*
3. *VIP Stock Trading / SEBI Tip Syndicates*
4. *Malicious APK / Remote Access Trojans (AnyDesk, TeamViewer)*
5. *Banking Phishing / Account Block Lures*
6. *Task Scam / YouTube Video Rating Schemes*

### 4. Acoustic Voice Clone & Speech Forensics
Dedicated audio analysis engine accessible via `POST /api/v1/detect/audio` and WhatsApp voice notes:
- **Wav2Vec 2.0 Speech & Acoustic Demuxer**: Analyzes acoustic raw waveforms, identifying synthetic vocoder phase inconsistencies, robotic vocal tract artifacts, and unnatural pitch distributions characteristic of ElevenLabs or open-source neural TTS models.

### 5. Native Meta WhatsApp Cloud API Ingestion
Direct integration with the official **Meta WhatsApp Cloud API (v21.0)**:
- **Webhook Handshake**: Handles `GET` challenge verification (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- **Omni-Modality Inbound Parser**: Automatically detects and processes forwarded text messages, voice notes (`audio/ogg`), images (`image/jpeg`), and video clips (`video/mp4`).
- **Real-Time Tavily Cross-Check**: Suspicious phone numbers and UPI IDs are cross-referenced on the fly against active Indian police advisories.
- **Institutional Outbound Dispatch**: Replies with formatted forensic analysis, statutory citations (**BNS 2023 Sec 318(4)**, **IT Act Sec 66D**), and **Helpline 1930** guidance.

### 6. 24/7 Autonomous Threat News Crawler (Tavily)
An autonomous daemon thread running in the FastAPI backend periodically executes:
- Queries Tavily Search across Indian cybercrime vectors.
- Extracts financial damage in INR (e.g., *₹2.4 Crores*), affected Indian jurisdictions, and Modus Operandi.
- Deduplicates articles using SHA-256 URL hashing and persists records in SQLite WAL mode (`scam_feed.db`).
- Powers the public news feed on `GET /api/v1/news/feed`.

---

## 🗄️ Database Architecture & Data Integrity

NETRA supports dual-engine persistence: **SQLite in WAL mode** for edge development and **Render Managed PostgreSQL** + **AWS DynamoDB** for cloud production.

### Entity Relationship Diagram
```mermaid
erDiagram
    THREAT_CATALOG {
        string id PK "Content-hash or THREAT-UUID"
        string title "Incident title or clean summary"
        string type "video_deepfake, image_deepfake, scam_text, audio_clone"
        string threat_category "DIGITAL_ARREST, ELECTRICITY_KYC, etc."
        float fake_probability "Model confidence (0.0 - 1.0)"
        string verdict "SAFE, SUSPICIOUS, CRITICAL, AUTHENTIC"
        string risk_level "LOW, MEDIUM, HIGH, CRITICAL"
        float lat "Honest Latitude (NULL if unlocated)"
        float lng "Honest Longitude (NULL if unlocated)"
        string city "City name or NULL"
        string state "State name or NULL"
        string country "Default: India"
        string location_source "EXACT_GPS, ESTIMATED_TELECOM, ONLINE_UNMAPPED"
        string media_url "S3 media URI"
        string thumbnail_url "Thumbnail URI"
        json extracted_iocs "URLs, phone numbers, UPI handles"
        json fir_dossier "Legal sections, summary, victim guidance"
        int upvotes_count "Crowdsourced consensus / duplicates"
        string created_at "ISO-8601 Timestamp"
    }

    API_KEYS {
        string key_id PK "key_xxxxxx"
        string api_key_hash "SHA-256 hash of raw key"
        string key_prefix "netra_live_••••"
        string name "Application or Developer label"
        string tier "developer, enterprise"
        int monthly_quota "Allowed monthly requests"
        int used_requests "Current request counter"
        string created_at "ISO-8601 Timestamp"
    }

    COMMUNITY_POSTS {
        string id PK "post_xxxxxx"
        string title "Community investigation title"
        string category "SCAM_ANALYSIS, DEEPFAKE_ALERT"
        string content "Markdown body"
        string excerpt "Summary snippet"
        string author_name "Author display name"
        int likes "Upvote counter"
        int views "View counter"
        string created_at "ISO-8601 Timestamp"
    }

    THREAT_CATALOG ||--o{ API_KEYS : "Queried via REST"
```

### Zero-Fake-Data Invariants
1. **Honest `NULL` Coordinates**: If an incident lacks GPS EXIF data or Indian gazetteer NLP matches, `lat` and `lng` remain strictly `NULL`. The Live Threat Radar endpoint strictly displays geolocated coordinates (`WHERE lat IS NOT NULL`).
2. **No False Cataloging of Authentic Media**: Scans verified as `AUTHENTIC` or `SAFE` bypass insertion into the public Threat Catalog to avoid cluttering threat feeds with benign content.
3. **SHA-256 Content-Hash Deduplication**: Duplicate incident messages increment `upvotes_count` rather than creating redundant rows.

---

## 🔌 Comprehensive API Documentation

All endpoints are hosted under `/api/v1` (with system health on `/health`).

| Method | Path | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/health` | System health, version, and model readiness | None |
| `POST` | `/api/v1/detect/full` | Upload video for asynchronous forensic dispatch | None |
| `POST` | `/api/v1/detect/audio` | Synchronous acoustic voice clone & synthetic speech detection | None |
| `POST` | `/api/v1/detect/image-ocr` | Synchronous RapidOCR text, document seam & scam extraction | None |
| `POST` | `/api/v1/detect/scam` | Synchronous text scam classification with Tavily cross-check | None |
| `GET` | `/api/v1/jobs/{job_id}` | Poll asynchronous video detection status & forensic scores | None |
| `GET` | `/api/v1/jobs/{job_id}/stream` | Secure local/S3 video stream proxy with byte-range support | None |
| `GET` | `/api/v1/webhook/whatsapp` | Meta Cloud API Webhook handshake (`hub.challenge`) | `hub.verify_token` |
| `POST` | `/api/v1/webhook/whatsapp` | Meta Cloud API inbound message & media receiver | Meta Signature |
| `GET` | `/api/v1/whatsapp/status` | Diagnostic check for active WhatsApp credentials | None |
| `POST` | `/api/v1/ingest/bot` | Unified bot ingestion contract (Text, Image, Video, Audio) | `X-Bot-Secret` |
| `POST` | `/api/v1/ingest/bot/confirm-report` | Confirm verified threat report & index into catalog | None |
| `GET` | `/api/v1/threat-intelligence/catalog` | Paginated threat incident catalog with media filters | None |
| `GET` | `/api/v1/threat-intelligence/radar` | Geospatial radar markers (strictly geocoded items) | None |
| `GET` | `/api/v1/threat-intelligence/{id}` | Detailed threat telemetry & evidence dossier | None |
| `DELETE`| `/api/v1/threat-intelligence/{id}` | Delete threat incident from catalog & DynamoDB | None |
| `POST` | `/api/v1/threat-intelligence/report` | Submit verified threat incident to public catalog | None |
| `POST` | `/api/v1/threat-intelligence/{id}/upvote` | Increment crowd-verification upvote counter | None |
| `GET` | `/api/v1/threat-intelligence/{id}/fir-pdf`| Download formatted Police FIR Evidence PDF | None |
| `GET` | `/api/v1/threat-intelligence/{id}/media` | Stream threat incident media or presigned S3 redirect | None |
| `POST` | `/api/v1/threat-intelligence/sanitize` | Administrative purge of synthetic test & benchmark records | None |
| `GET` | `/api/v1/news/feed` | Latest autonomous Tavily cyber threat news feed | None |
| `POST` | `/api/v1/news/refresh` | Trigger immediate background Tavily threat crawl | None |
| `POST` | `/api/v1/developers/keys` | Create developer REST API key | None |
| `GET` | `/api/v1/developers/keys` | List active developer API keys | None |
| `DELETE`| `/api/v1/developers/keys/{id}` | Revoke developer API key | None |
| `POST` | `/api/v1/public/detect/scam-text` | Authenticated public scam text API | `X-API-Key` |
| `POST` | `/api/v1/public/detect/image` | Authenticated public image OCR scam API | `X-API-Key` |

---

## 🖥️ Frontend Architecture

The frontend is built with **Next.js 14 App Router**, featuring an institutional dark obsidian aesthetic (`#030712`, `#0B1A2E`, `#081525`), 1.5px signature borders, and layered elevation shadows.

```mermaid
flowchart TD
    subgraph Routes["Frontend Route Hierarchy (16 Pages)"]
        HOME["/ (Split Command Center)"]
        RADAR["/radar (Fullscreen Threat Radar)"]
        CATALOG["/reported (Threat Catalog & FIR Dossiers)"]
        SCAM["/scam (Scam Message & Phone Checker)"]
        TECH["/technology (Architecture Flowchart & Model Inspector)"]
        DEV["/developers (API Keys & Interactive Sandbox)"]
        COMM["/community & /community/write (Intelligence Blog)"]
        JOB["/analyze/[jobId] (Async Video Polling View)"]
        TRENDS["/trends (Trending Scam Vectors & News)"]
    end

    subgraph CoreComponents["Core UI Primitives"]
        NAV["Navbar (Sticky Glassmorphism)"]
        FOOT["Footer (System Telemetry & Legal)"]
        RADAR_MAP["LiveThreatRadar (MapLibre GL / OpenStreetMap)"]
        SCANNER["MultiModalForensicScanner (4-Tab Sandbox)"]
        FEED["LiveCyberScamNewsFeed (Tavily Stream)"]
        FLOWCHART["ArchitectureFlowchart (Interactive Pipeline)"]
    end

    HOME --> NAV & SCANNER & FEED & RADAR_MAP & FOOT
    RADAR --> RADAR_MAP
    CATALOG --> NAV & FOOT
    SCAM --> NAV & FOOT
    TECH --> NAV & FLOWCHART & FOOT
    DEV --> NAV & FOOT
    JOB --> NAV & FOOT
    TRENDS --> NAV & FEED & FOOT
```

---

## 📂 Project Directory Structure

```
netra/
├── backend/
│   ├── api/
│   │   ├── models/schemas.py          # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── audio_detect.py        # Synchronous audio voice clone detection
│   │   │   ├── bot_ingest.py          # Unified bot ingestion contract
│   │   │   ├── community.py           # Community forum CRUD & upvotes
│   │   │   ├── detect.py              # S3/SQS video dispatch & image OCR
│   │   │   ├── jobs.py                # DynamoDB job status & streaming
│   │   │   ├── news_routes.py         # Tavily 24/7 scam news feed
│   │   │   ├── public_api.py          # Authenticated developer endpoints
│   │   │   ├── scam.py                # Synchronous text scam classification
│   │   │   ├── threat_intel.py        # Threat catalog, radar, & FIR PDF
│   │   │   └── whatsapp_webhook.py    # Native Meta WhatsApp Cloud API v21.0
│   │   ├── auth.py                    # API key hash validation & quota limits
│   │   ├── db.py                      # SQLite WAL / PostgreSQL persistence
│   │   ├── geo_resolver.py            # Multi-tier Indian geographic resolver
│   │   └── server.py                  # FastAPI application entry point
│   ├── netra/
│   │   ├── pipeline/
│   │   │   ├── dual_branch_router.py  # Spatial CNN + ViT routing logic
│   │   │   ├── evidence.py            # Forensic signal consolidation
│   │   │   ├── indian_gazetteer.py    # Indian state/city gazetteer & EXIF GPS
│   │   │   ├── rapidocr_engine.py     # RapidOCR ONNX inference engine
│   │   │   ├── scam_detector.py       # Regex matrices + TF-IDF scam engine
│   │   │   └── spatial_detector.py    # NPR ResNet-50 spatial seam detector
│   │   └── services/
│   │       ├── catalog_hook.py        # Auto-catalog ingestion service
│   │       ├── ocr_scam_pipeline.py   # OCR text & IOC extraction pipeline
│   │       ├── tavily_crawler.py      # 24h background cyber news crawler
│   │       └── tavily_cross_check.py  # Real-time phone/UPI Tavily verifier
│   └── requirements.txt               # Python production dependencies
├── frontend/
│   ├── app/                           # Next.js 14 App Router pages (16 routes)
│   ├── components/
│   │   ├── atoms/                     # Gliding tabs, segmented controls
│   │   ├── layout/                    # Navbar, Footer, GoogleAuthModal
│   │   ├── sandbox/                   # MultiModalForensicScanner & DropZone
│   │   └── technology/                # ArchitectureFlowchart & ModelInspectorDrawer
│   ├── package.json                   # Next.js dependencies (MapLibre GL, Lucide)
│   └── tailwind.config.ts             # Obsidian design tokens
├── cyber_scam_feed/                   # Standalone Tavily cyber news engine
├── n8n/                               # Optional n8n orchestration workflow blueprint
├── infra/
│   └── bootstrap_aws.py               # AWS S3, SQS, DynamoDB provisioner
├── tests/                             # 52 automated tests (100% passing)
├── render.yaml                        # Render Blueprint (Web API + PostgreSQL)
└── README.md                          # Master documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python**: `>= 3.11` (Tested on Python 3.11 & 3.14)
- **Node.js**: `>= 18.17`
- **FFmpeg**: Required for frame and audio extraction (`brew install ffmpeg` or `apt install ffmpeg`)
- **AWS CLI**: Configured credentials for S3, SQS, and DynamoDB (Optional for cloud operations)

### 1. Clone the Repository
```bash
git clone https://github.com/sparsh101sparsh/netra-deepfake-detector.git
cd netra-deepfake-detector
```

### 2. Backend Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### 4. Running Local Development Servers

**Start the FastAPI Backend:**
```bash
source venv/bin/activate
PYTHONPATH=backend python -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

**Start the Next.js Frontend:**
```bash
cd frontend
npm run dev
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

## 🔐 Environment Variables

Create `.env` in `backend/.env` (and `frontend/.env.local`):

```ini
# ── AWS Cloud Infrastructure ───────────────────────────
AWS_DEFAULT_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_MEDIA=netra-media-uploads
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/your-account-id/netra-jobs
DYNAMO_TABLE_JOBS=netra-jobs

# ── Meta WhatsApp Cloud API (Native v21.0) ─────────────
META_WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
META_WHATSAPP_ACCESS_TOKEN=your_system_user_access_token
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verify_token

# ── External Intelligence & Authentication ─────────────
TAVILY_API_KEY=tvly-your_tavily_key
BOT_SECRET_KEY=your_internal_bot_secret_key

# ── Database (Optional PostgreSQL URL for Render) ──────
# DATABASE_URL=postgresql://user:password@host/netradb
```

---

## 🧪 Testing & QA Audit (52/52 Passing)

```bash
PYTHONPATH=backend pytest tests/
```

### Test Coverage Breakdown:
- `tests/test_whatsapp_document_and_media.py`: End-to-end verification of Meta WhatsApp Cloud API webhook, multi-modal payload routing, and dynamic biological metrics.
- `tests/test_master_backend_validation.py`: S3 upload, DynamoDB job tracking, SQS queue dispatch, bot ingest contracts, and zero fake coordinate verification.
- `tests/test_dynamic_endpoints_adversarial.py`: SQL injection probes (`UNION SELECT`, `' OR 1=1`), Path traversal (`../../etc/passwd`), boundary payloads, pagination constraints, and API key authentication.
- `tests/test_challenger_dynamic_stress_deep.py`: SQLite WAL high-concurrency read/write transactions.
- `tests/test_dynamic_adversarial_deep_matrix.py`: Extreme database locking stress tests.

---

## 🏛️ Institutional Alignment (RBIH & I4C)

NETRA is strategically designed to solve the critical gap in India's national fraud prevention infrastructure:

```
   UPSTREAM (The Attack Vector)                      DOWNSTREAM (The Money Trail)
┌──────────────────────────────────────┐          ┌───────────────────────────────┐
│              NETRA                   │          │       MuleHunter.ai           │
│  • Digital Arrest Video Calls        │   IOCs   │  • Suspect Account Detection  │
│  • Executive Voice Clones (APP Fraud)├─────────►│  • Layered Mule Transactions  │
│  • WhatsApp Phishing / Fake Warrants │  (UPI,   │  • Rapid Inter-Bank Freezes   │
│  • Video-KYC Synthetic Injection     │  Phones) │  • 1930 Triage Integration    │
└──────────────────────────────────────┘          └───────────────────────────────┘
           [ MEDIA LAYER ]                                [ LEDGER LAYER ]
```

1. **Reserve Bank Innovation Hub (RBIH)**: While RBIH’s **MuleHunter.ai** tracks illicit accounts downstream *after* money moves, NETRA intercepts the weaponized media upstream *before* the victim pays.
2. **I4C (Cyber Fraud Mitigation Centre - CFMC)**: Feeds extracted suspect phone numbers and UPI VPAs into the **National Suspect Registry**.
3. **Mandatory Video-KYC (V-CIP) Directives**: Meets the I4C directive requiring commercial banks and NBFCs to screen for deepfake injections during customer onboarding.

---

## ⚠️ Engineering Roadmap

- [x] **Dedicated Audio-Only Forensic Route**: Implemented via `POST /api/v1/detect/audio` with Wav2Vec 2.0 acoustic demuxer.
- [x] **BNS & IT Act Automated Legal Mapping**: Auto-tags detected scam vectors with **BNS 2023 Sec 318(4)** and **IT Act Sec 66D** in FIR PDF dossiers.
- [x] **Dynamic Image-Derived Biological Metrics**: Real-time ocular luminance symmetry and Laplacian sharpness variance calculation.
- [x] **Zero-Duplicate Catalog Ingestion**: SHA-256 content deduplication with honest `NULL` geolocation handling.
- [ ] **Real-Time WebRTC Video-KYC SDK**: Low-latency (<500ms) virtual webcam filter for bank onboarding streams.
- [ ] **STIX / TAXII Automated Feeds**: Direct machine-to-machine threat intelligence broadcasting to bank SIEM systems.

---

## 📜 Author, Deployments & License

> *मायातीतं सत्यस्य चक्षुः* — *Eye of truth beyond illusion.*

### Author & Architecture
- **Sparsh**: Lead Architect & Systems Engineering
- **GitHub**: [@sparsh101sparsh](https://github.com/sparsh101sparsh)
- **Repository**: [https://github.com/sparsh101sparsh/netra-deepfake-detector](https://github.com/sparsh101sparsh/netra-deepfake-detector)

### Production Deployments
- **Web Command Center**: [https://netra-deepfake-detector.vercel.app](https://netra-deepfake-detector.vercel.app)
- **FastAPI Core Engine**: [https://netra-api-pmr7.onrender.com](https://netra-api-pmr7.onrender.com)

**License**: Licensed under the [MIT License](LICENSE).