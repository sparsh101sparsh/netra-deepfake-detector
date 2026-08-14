# Project: NETRA Data Purity, Sanitization & Verification

## Architecture
- **Frontend**: Next.js 14 App Router (`frontend/app/`), React 18, Tailwind CSS, Lucide Icons, MapLibre GL / Leaflet.
- **Backend**: FastAPI 0.111+ (`backend/api/server.py`), Uvicorn, Python 3.11.
- **Database & Persistence**: SQLite (`backend/api/netra.db`) with tables: `threat_catalog` (505 real indexed items), `api_keys` (13 active keys), `community_posts` (44 persisted posts), `scam_news` (crawled by Tavily). AWS S3 + SQS + DynamoDB for async video jobs.
- **Inference Engines**: Multi-modal ML pipelines (PaddleOCR/EasyOCR, Scikit-Learn TF-IDF Random Forest, GenD CLIP, Bedrock Claude 3.5 Sonnet / Nova Pro).
- **Data Flow**:
  - Frontend queries `/api/backend/api/v1/*` -> Next.js proxy rewrite -> FastAPI on port 8000 -> SQLite DB / live ML models.
  - Zero hardcoded fallback arrays; genuine dynamic data or transparent institutional empty/loading/error states.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Backend Threat Intel Contract Fix | Harmonize catalog endpoint response (`results` & `items` alias) and query param (`media_type` & `type` alias) in `threat_intel.py` | M1 | Survey |
| 2 | Backend Community SQLite Persistence | Replace in-memory `COMMUNITY_POSTS` list with dynamic SQLite persistence in `netra.db` | M1 | Survey |
| 3 | Backend Coordinate Jitter Removal | Eliminate `np.random.rand()` and `random.random()` synthetic coordinate jitter in `public_api.py` and `exif_engine.py` | M1 | Survey |
| 4 | Backend Auth Bypass Removal | Remove `sk_test_`/`sk_live_` mock bypass in `auth.py`, enforcing 100% SHA-256 database key verification | M1 | Survey |
| 5 | Backend Typst Path & Gend Lazy Loading | Make Typst executable lookup cross-platform in `threat_intel.py`, lazy-load GenD weights in `gend_engine.py` | M1 | Survey |
| 6 | Frontend LiveThreatRadar Sanitization | Remove `demoMarkers` (10 items) fallback; fetch live geo-telemetry or render zero-marker state | M2 | Survey |
| 7 | Frontend LiveCyberScamNewsFeed Sanitization | Remove `FALLBACK_ARTICLES` (6 items); bind strictly to Tavily crawler feed or render institutional zero-state | M2 | Survey |
| 8 | Frontend /reported Catalog Sanitization | Remove `DEMO_ITEMS` (6 items); read `data.results || data.items`; render institutional empty state | M2 | Survey |
| 9 | Frontend /community Sanitization | Remove `SEED_POSTS` (3 items); fetch real posts from backend SQLite DB or render clean empty state | M2 | Survey |
| 10 | Frontend /scam Score Sanitization | Remove `Math.random()` synthetic risk scores (55-95) and dummy reasoning; show transparent error banner on failure | M2 | Survey |
| 11 | Frontend /trends Sanitization | Remove `Math.random()` coordinate jitter interval and hardcoded percentages; bind to live threat radar | M2 | Survey |
| 12 | Frontend MultiModalForensicScanner Sanitization | Remove `runSimulatedNeuralScan` fake timer, dummy OCR, and synthesized text verdicts; trigger real API endpoints | M2 | Survey |
| 13 | Frontend Developer Portal & Modals Sanitization | Remove hardcoded default API key and fallback post creation in `CommunityEditorModal.tsx` | M2 | Survey |
| 14 | Frontend Offline Font Build Fix | Fix `frontend/app/layout.tsx` `next/font/google` offline build error by using CSS font variables | M3 | Survey |
| 15 | Institutional Empty/Loading/Error States | Implement shimmer skeletons, institutional zero-records cards, transparent node unreachable banners, null-safety | M3 | Survey |
| 16 | Build & Runtime Verification | Verify `npm run build` succeeds with 0 errors, FastAPI runs cleanly, all routes verified | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Remediation & Persistence | SQLite community table, catalog contract aliases, auth bypass removal, coordinate purity | none | DONE |
| M2 | Frontend Fake Data & Fallback Purge | Remove `demoMarkers`, `FALLBACK_ARTICLES`, `DEMO_ITEMS`, `SEED_POSTS`, `Math.random()`, fake neural scans | M1 | DONE |
| M3 | Frontend Build Fix & State Polish | `layout.tsx` font fix, shimmer loading states, institutional zero states, error banners | M2 | DONE |
| M4 | Verification & Quality Gate | `npm run build`, `tsc --noEmit`, backend import & runtime testing, gate checks | M3 | DONE |

## Interface Contracts
### `GET /api/v1/threat-intelligence/catalog`
- Query parameters: `search: Optional[str]`, `category: Optional[str]`, `media_type: Optional[str]` (aliased to `type`), `limit: int`, `offset: int`
- Response: `{"status": "success", "total_returned": int, "results": List[ThreatItem], "items": List[ThreatItem]}`

### `GET /api/v1/threat-intelligence/radar`
- Response: `{"status": "success", "total_markers": int, "markers": List[ThreatMarker]}`

### `GET /api/v1/news/feed`
- Response: `{"status": "success", "count": int, "crawler_status": str, "feed": List[ScamNewsArticle]}`

### `GET /api/v1/community/posts`
- Response: `{"status": "success", "count": int, "posts": List[CommunityPost]}`

### `POST /api/v1/community/posts`
- Request JSON: `{ "title": str, "category": str, "content": str, "excerpt"?: str, "cover_image"?: str, "embed_url"?: str, "author": { "name": str, "email": str, "avatar"?: str, "role"?: str } }`
- Response: `{"status": "success", "message": str, "post": CommunityPost}`

### `POST /api/v1/detect/scam`
- Request JSON: `{"text": str}`
- Response: `{"is_scam": bool, "risk_score": int, "confidence": int, "verdict": str, "scam_type": Optional[str], "matched_rules": List[str], "analysis_method": str, "processing_time_ms": int, "llm_reason": Optional[str]}`

## Code Layout
- `frontend/app/` — Next.js 14 routes (`layout.tsx`, `page.tsx`, `radar/`, `reported/`, `community/`, `scam/`, `trends/`, `developers/`, `technology/`, `analyze/`)
- `frontend/components/` — UI components (`LiveThreatRadar.tsx`, `ThreatCatalogSection.tsx`, `feed/LiveCyberScamNewsFeed.tsx`, `sandbox/MultiModalForensicScanner.tsx`, `community/`, etc.)
- `backend/api/` — FastAPI server (`server.py`), DB management (`db.py`), auth (`auth.py`), routes (`routes/threat_intel.py`, `routes/community.py`, `routes/scam.py`, `routes/detect.py`, `routes/public_api.py`, `routes/news_routes.py`)
- `backend/netra/` — Forensic engines (`pipeline/`, `services/tavily_crawler.py`, `services/ocr_scam_pipeline.py`)
