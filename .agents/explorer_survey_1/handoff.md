# SURVEY PHASE HANDOFF REPORT: DATABASE PURGE & MEDIA AUTO-POPULATION
**Agent:** Explorer 1 (Survey Phase: Database & Backend Architecture)  
**Date:** 2026-09-03T19:48:00Z  
**Target Directives:** Directive 1 (Database Purge) & Directive 5 (Auto-Population, Playable Media URLs & EXIF GPS Extraction)  
**Status:** COMPLETE  

---

## 1. Observation

### 1.1 Database Architecture & Physical Locations
1. **Primary Database Path**:
   - Defined in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/db.py:13`:
     ```python
     DB_PATH = os.getenv("NETRA_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "netra.db"))
     ```
   - Physical file: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/api/netra.db` (file size: 1,183,744 bytes).
2. **Auxiliary / Legacy Database Files**:
   - `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/threat_catalog.db`: 0-byte empty file in repo root.
   - `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/threat_catalog.db`: 12,288 bytes, legacy database containing an obsolete `scam_news` table.
   - `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/cyber_scam_feed/scam_feed.db`: 14 rows, active WAL SQLite database for Tavily 24h crawled news feed.
3. **Schema & Initialization (`backend/api/db.py:21-104`)**:
   - Initialized upon module load via `init_db()` at line 472.
   - Creates three tables:
     - `api_keys` (`key_id`, `api_key_hash`, `key_prefix`, `name`, `tier`, `monthly_quota`, `used_requests`, `created_at`, `last_used_at`)
     - `threat_catalog` (`id` PK, `title`, `type`, `threat_category`, `source_platform`, `fake_probability`, `verdict`, `risk_level`, `thumbnail_url`, `media_url`, `lat`, `lng`, `city`, `state`, `country`, `location_source`, `device_model`, `software_used`, `extracted_iocs`, `fir_dossier`, `upvotes_count`, `created_at`)
     - `community_posts` (`id` PK, `title`, `category`, `content`, `excerpt`, `cover_image`, `embed_url`, `author_id`, `author_name`, `author_email`, `author_avatar`, `author_avatar_index`, `author_role`, `created_at`, `read_time`, `likes`, `views`, `tags`)
   - `init_db()` contains **no seed logic**; it only issues `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

### 1.2 Seed Dummy Items (`NETRA-SCAM-0001..0010`) Status
1. **Historical Presence**:
   - Prior to commit `6d2d246` ("fix(data): sanitize and purge all fake test data..."), `backend/api/netra.db` contained 1,404 rows in `threat_catalog` (including `NETRA-DF-0001` through `NETRA-DF-1404` and `NETRA-SCAM-0001` through `NETRA-SCAM-0005`), plus 286 dummy posts in `community_posts`.
   - In git `HEAD:backend/api/netra.db`, `threat_catalog` had 1 row (`THREAT-7369E982`) and `community_posts` had 4 seed posts (`post-digital-arrest-analysis`, `post-voice-clone-extortion`, `post-electricity-kyc-smishing`, `post-legal-advisory-66d`).
2. **Current Working Tree State**:
   - Directly queried via Python `sqlite3`:
     - `threat_catalog`: 1 row (`id: 'THREAT-7369E982'`, title: "बिजली बिल घोटाला चेतावनी - साइबर सुरक्षा", created: 2026-09-03 02:51:08).
     - `community_posts`: 0 rows.
     - `api_keys`: 1 row (`key_8f99ea512fef`, 'Hackathon Master Demo Key').
   - `threat_catalog` currently still retains the residual item `THREAT-7369E982`.
   - `frontend/app/community/page.tsx:37` also checks `localStorage.getItem("netra_community_posts")` for cached browser posts.

### 1.3 Media Analysis Pipelines & Entry Points
1. **Video Modality**:
   - Sandbox upload: `POST /api/v1/detect/full` (`backend/api/routes/detect.py:42-129`).
   - File types allowed: `ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/avi", "video/x-msvideo"}`.
   - S3 key: `{job_id}/input.mp4`.
   - DynamoDB job status: `queued` -> polled via `GET /api/v1/jobs/{job_id}` (`backend/api/routes/jobs.py:117`).
   - Worker: `worker/worker.py` polls SQS, executes 10 stages: Frame extraction, Spatial SBI, CLIP probe, Audio Wav2Vec2, Auxiliary signals, Gated fusion, Evidence bundle, Dossier synthesis.
   - **Gaps Observed**:
     - `worker/worker.py:656-661` only calls `auxiliary.py` (ffprobe metadata, blinks, jitter). It does **not** call `ForensicMetadataExtractor` for EXIF GPS.
     - `worker/worker.py:810-815` writes final results to DynamoDB, but **never** calls `insert_threat_item()` in `db.py`.
     - `detect.py` does not save the video to a local directory when S3 is unavailable.
2. **Image Modality**:
   - Sandbox upload: `POST /api/v1/detect/image-ocr` (`backend/api/routes/detect.py:131-154`).
   - Dispatches to `backend/netra/services/ocr_scam_pipeline.py:133` (`run_image_ocr_and_scam_detection`).
   - Discards image bytes after OCR.
   - **Gaps Observed**:
     - Does **not** extract EXIF metadata or GPS coordinates.
     - Does **not** save the image file to disk.
     - Does **not** call `insert_threat_item()`.
   - Public API upload: `POST /api/v1/public/detect/image` (`backend/api/routes/public_api.py:140-199`).
     - Extracts EXIF via `metadata_extractor.analyze_media(tmp_path)` and runs GenD ViT-L.
     - Also does **not** call `insert_threat_item()`.
3. **Audio Modality**:
   - Frontend: `MultiModalForensicScanner.tsx:119-125` routes audio to `/api/backend/api/v1/detect/full`.
   - Backend: `detect.py:49` **rejects audio files with HTTP 415** because `ALLOWED_TYPES` does not include `audio/mpeg`, `audio/wav`, `audio/mp3`, `audio/ogg`, or `audio/m4a`.
   - Pipeline: `backend/netra/pipeline/detectors/audio.py` has full `AudioDeepfakeDetector` (`MelodyMachine/Deepfake-audio-detection-V2` + `SpectralAudioForensicsFallback`), but it is only invoked inside the video worker pipeline on extracted audio.
4. **Text Modality**:
   - Sandbox upload: `POST /api/v1/detect/scam` (`backend/api/routes/scam.py:25-73`). Runs `scam_detector_engine.detect()`. Returns `ScamResponse`.
   - **Gap Observed**: Does **not** call `insert_threat_item()`.
   - Public API: `POST /api/v1/public/detect/scam-text` (`backend/api/routes/public_api.py:24-132`). **Already** auto-inserts into `threat_catalog` when `scam_detected == True`.

### 1.4 EXIF Engine & Geolocation Telemetry (`backend/netra/pipeline/exif_engine.py`)
1. **Direct Empirical Execution Results**:
   - Executed on a synthesized MP4 video with ISO 6709 location tag `+12.9716+077.5946/` using ffprobe:
     - Extracted: `has_gps: True`, `lat: 12.9716`, `lng: 77.5946`, `city: Bengaluru`, `location_source: EXACT_GPS`.
   - Executed on a test JPEG with PIL EXIF GPS IFD tag 34853 (Mumbai 19.0760, 72.8777):
     - Extracted: `has_gps: True`, `lat: 19.076`, `lng: 72.8777`, `city: Mumbai`, `location_source: EXACT_GPS`.
2. **Deficiencies Discovered in `exif_engine.py`**:
   - **Fabricated Coordinates Defect**:
     In `exif_engine.py:114-121` (image) and `180-187` (video):
     ```python
     if not metadata["has_gps"]:
         fallback = self._get_fallback_location(fallback_city)
         metadata["lat"] = fallback["lat"]  # 28.6139 (New Delhi)
         metadata["lng"] = fallback["lng"]  # 77.2090
         metadata["location_source"] = "ESTIMATED_TELECOM"
     ```
     When media lacks GPS, it unconditionally sets New Delhi coordinates.
     In `db.py:206-212`, `lat` and `lng` are saved directly. This violates the "Honest NULL coordinates" invariant (`README.md:394`, `test_master_backend_validation.py:245`) and will flood Netra Radar with false New Delhi markers.
   - **Missing Apple iPhone Tag**:
     `_analyze_video` (line 168) only checks `tags.get("location")` and `tags.get("location-eng")`. Apple QuickTime / iPhone videos encode GPS in `com.apple.quicktime.location.ISO6709`.

### 1.5 Media URL & Storage Serving
1. **Serving Gap**:
   - In `backend/api/server.py`, no static directory is mounted (`app.mount(...)`).
   - In `backend/api/routes/threat_intel.py:21-35`, `ReportThreatRequest` omits `media_url` and `thumbnail_url` from its Pydantic model.
2. **Frontend Expectation (`frontend/app/reported/page.tsx:244-257, 341-361`)**:
   - Video: `<video src={item.media_url} controls playsInline />`
   - Audio: `<audio src={item.media_url} controls />`
   - Image: `<img src={item.media_url} alt={item.title} />`
   - Next.js rewrite in `frontend/next.config.js:14` proxies `/api/backend/:path*` -> `http://127.0.0.1:8000/:path*`.
   - Therefore, serving media under `/api/v1/media/...` or mounting `/media` with a corresponding Next.js rewrite enables instant playback.

---

## 2. Logic Chain

```
[Observation 1.1] Primary database is backend/api/netra.db; init_db() creates tables without seeds.
[Observation 1.2] Working tree netra.db currently contains 1 residual record ('THREAT-7369E982') in threat_catalog and 0 in community_posts.
        │
        ▼
[Logic Step 1] Complete Directive 1 purge requires executing `DELETE FROM threat_catalog; DELETE FROM community_posts; VACUUM;` on netra.db.
Empty root threat_catalog.db should be removed to eliminate confusion.

[Observation 1.3] Video analysis (detect.py / worker.py), image analysis (detect.py / ocr_scam_pipeline.py), and text analysis (scam.py) return verdicts to users but do NOT call insert_threat_item().
[Observation 1.3] Audio modality is rejected with HTTP 415 in detect.py because ALLOWED_TYPES lacks audio MIME types.
        │
        ▼
[Logic Step 2] To satisfy Directive 5 auto-population:
  - Video: Worker (or synchronous fallback) must invoke insert_threat_item() upon completing analysis with positive/suspicious verdict.
  - Image: detect_image_ocr must run EXIF extraction, save image to media store, and invoke insert_threat_item() if manipulated/scam.
  - Audio: detect_full (or dedicated endpoint) must allow audio MIME types, invoke AudioDeepfakeDetector, save audio to media store, and auto-insert into threat_catalog.
  - Text: detect_scam in scam.py must call insert_threat_item() when is_scam == True.

[Observation 1.4] ForensicMetadataExtractor successfully extracts exact GPS from images (EXIF 34853) and videos (ffprobe location tag), resolving coordinates to Indian metros.
[Observation 1.4] When has_gps == False, exif_engine.py falsely injects New Delhi (28.6139, 77.2090).
[Observation 1.1] threat_intel.py:58 fetch_threat_radar filters items where lat IS NOT NULL and lng IS NOT NULL.
        │
        ▼
[Logic Step 3] When has_gps is False and no user-reported city is provided, lat and lng MUST be set to None.
When has_gps is True, lat and lng are set to exact decimals with location_source = "EXACT_GPS".
This guarantees that only verified geolocated uploads plot onto Netra Radar.

[Observation 1.5] threat_catalog has media_url and thumbnail_url columns, and frontend reported/page.tsx already renders HTML5 video/audio/img elements using item.media_url.
[Observation 1.5] server.py has no StaticFiles mount, and ReportThreatRequest strips media_url.
        │
        ▼
[Logic Step 4] Mounting a persistent media directory (e.g. backend/media mounted at /api/v1/media) and adding media_url & thumbnail_url to ReportThreatRequest completes the end-to-end playable media loop.
```

---

## 3. Caveats
1. **AWS S3 / SQS Availability**:
   - In offline or local development environments where AWS credentials are not active or SQS is unreachable, video processing via `worker/worker.py` does not poll cloud queues. A synchronous local analysis fallback or local worker runner using the local media files is recommended.
2. **Audio EXIF GPS**:
   - Audio files (WAV/MP3) do not standardize EXIF GPS metadata. Geolocation for audio threats must rely on user-reported metadata or default to honest `None`.
3. **Client-side LocalStorage**:
   - `frontend/app/community/page.tsx` caches community articles in browser `localStorage`. Purging SQLite cleans the server database, but client browser caches should also be cleared by users or refreshed on frontend reload.

---

## 4. Conclusion & Actionable Implementation Blueprint

### 4.1 Directive 1: Database Purge Action Plan
1. **Database Clean Sweep**:
   - Run SQL script on `backend/api/netra.db`:
     ```sql
     DELETE FROM threat_catalog;
     DELETE FROM community_posts;
     VACUUM;
     ```
   - Delete stale 0-byte root file `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/threat_catalog.db`.
   - Preserve `api_keys` so developer API keys remain functional.

### 4.2 Directive 5: Auto-Population & EXIF GPS Action Plan
1. **Fix `backend/netra/pipeline/exif_engine.py`**:
   - Add Apple QuickTime GPS tag detection:
     `tags.get("com.apple.quicktime.location.ISO6709")`
   - Enforce honest coordinates: If `not metadata["has_gps"]` and `not fallback_city`, set `lat = None`, `lng = None`, `location_source = None`.
2. **Mount Media Storage in `backend/api/server.py`**:
   - Mount static directory:
     ```python
     from fastapi.staticfiles import StaticFiles
     MEDIA_DIR = os.getenv("NETRA_MEDIA_DIR", os.path.join(backend_dir, "media"))
     os.makedirs(os.path.join(MEDIA_DIR, "videos"), exist_ok=True)
     os.makedirs(os.path.join(MEDIA_DIR, "images"), exist_ok=True)
     os.makedirs(os.path.join(MEDIA_DIR, "audio"), exist_ok=True)
     app.mount("/api/v1/media", StaticFiles(directory=MEDIA_DIR), name="media")
     ```
3. **Update `ReportThreatRequest` in `backend/api/routes/threat_intel.py`**:
   - Add `media_url: Optional[str] = None` and `thumbnail_url: Optional[str] = None`.
4. **Wire Auto-Population Across All 4 Modalities**:
   - **Text** (`backend/api/routes/scam.py`):
     - After `scam_detector_engine.detect(text)`, if `is_scam`:
       Call `insert_threat_item({ ... })` with `type: "scam_text"`, honest NULL lat/lng, and IOCs.
   - **Image** (`backend/api/routes/detect.py:detect_image_ocr`):
     - Save image bytes to `MEDIA_DIR / "images" / f"{item_id}.png"`.
     - Run `ForensicMetadataExtractor.analyze_media(image_path)`.
     - If `result["scam_analysis"]["is_scam"]`:
       Call `insert_threat_item({ ... })` with `type: "image_deepfake"`, `media_url: f"/api/backend/api/v1/media/images/{item_id}.png"`, `lat`, `lng`, `location_source: "EXACT_GPS"` (if present), `device_model`, `software_used`.
   - **Video** (`worker/worker.py` and/or synchronous job handler):
     - Run `ForensicMetadataExtractor.analyze_media(video_path)` to get GPS (`has_gps`, `lat`, `lng`).
     - Save video file to `MEDIA_DIR / "videos" / f"{job_id}.mp4"`.
     - If `fusion_result["verdict"] != "AUTHENTIC"`:
       Call `insert_threat_item({ ... })` with `type: "video_deepfake"`, `media_url: f"/api/backend/api/v1/media/videos/{job_id}.mp4"`, `lat`, `lng` (or None), `verdict`, etc.
   - **Audio** (`backend/api/routes/detect.py`):
     - Add audio MIME types to `ALLOWED_TYPES`: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/ogg`, `audio/m4a`, `audio/aac`.
     - If audio file uploaded: route to audio detector (`AudioDeepfakeDetector`).
     - If fake voice detected: save to `MEDIA_DIR / "audio" / f"{id}.wav"` and call `insert_threat_item()` with `type: "audio_clone"`, `media_url`.

---

## 5. Verification Method

To independently verify these findings:
1. **Database Purge Inspection**:
   ```bash
   ./venv/bin/python -c "
   import sqlite3
   conn = sqlite3.connect('backend/api/netra.db')
   c = conn.cursor()
   print('Threats:', c.execute('SELECT count(*) FROM threat_catalog').fetchone()[0])
   print('Posts:', c.execute('SELECT count(*) FROM community_posts').fetchone()[0])
   "
   ```
2. **EXIF GPS Extraction Verification**:
   ```bash
   ./venv/bin/python -c "
   import sys; sys.path.insert(0, 'backend')
   from netra.pipeline.exif_engine import ForensicMetadataExtractor
   extractor = ForensicMetadataExtractor()
   # Test video or image
   res = extractor.analyze_media('/tmp/test_gps.mp4')
   assert res['has_gps'] is True
   assert res['location_source'] == 'EXACT_GPS'
   print('EXIF GPS extraction verified:', res['lat'], res['lng'], res['city'])
   "
   ```
3. **Test Suite Verification**:
   ```bash
   PYTHONPATH=. ./venv/bin/pytest tests/test_dynamic_endpoints_adversarial.py
   ```
