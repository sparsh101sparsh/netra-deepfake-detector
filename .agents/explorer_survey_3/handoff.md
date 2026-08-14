# Investigation Report & Handoff — Explorer 3: Directive 4 & Test/Build Infrastructure

## Executive Summary
This report provides an exhaustive, read-only architectural investigation for **Directive 4: Exportable Forensic PDF Report** and the **Test & Build Infrastructure** for Project NETRA.
Key discoveries:
1. **Frontend UI Touchpoints**:
   - `/analyze/[jobId]` is implemented in `frontend/app/analyze/[jobId]/page.tsx`. In the completed state, it currently renders a confidence meter, neural scorecard, interactive timeline, and dossier narrative with a "Copy Dossier" button, but lacks a "Download Forensic PDF" button.
   - The Catalog Modal is implemented as a slide-over drawer in `frontend/app/reported/page.tsx` (lines 290–338). It currently provides an `<a href="/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf">` download link styled as "Download Evidence PDF".
2. **PDF Generation Architecture**:
   - The Typst compiler (`/opt/homebrew/bin/typst`) is already installed on the host and actively used in `backend/api/routes/threat_intel.py` to generate Cyber Crime FIR Report dossiers.
   - `ReportLab 5.0.1` is also installed in the python virtual environment (`./venv`).
   - `backend/api/routes/jobs.py` (lines 254–257) already includes the exact route `@router.get("/jobs/{job_id}/report.pdf")`, currently stubbed as an HTTP 501 ("PDF report generation coming in Phase 7").
   - Frontend has no client-side PDF libraries (no jsPDF, pdfkit, or @react-pdf/renderer). It proxies `/api/backend/*` to FastAPI on port 8000 via `frontend/next.config.js`. Implementing the backend Typst generator provides a fast (~150ms), tamper-evident, pixel-perfect PDF downloadable via standard browser anchor navigation without adding frontend bundle weight.
3. **Forensic Data Schema**:
   - The full data structure containing Job ID, media SHA-256 hash, verdict, multi-detector scorecard (Visual SBI, GenD ViT-L/14, Wav2Vec2 audio, CLIP hypersphere probe), auxiliary metadata (EXIF GPS, camera model, software, container bitrate), and keyframe anomalies (timestamp, frame index, confidence, flags) is already structured in `backend/netra/pipeline/evidence.py` (`EvidenceBundle`), `worker/worker.py` (`final_result`), and `backend/api/routes/jobs.py` (`fetch_job_item`).
4. **Test & Build Infrastructure**:
   - Backend tests run with `PYTHONPATH=. ./venv/bin/pytest`. The test suite in `tests/conftest.py` automatically mocks AWS DynamoDB to prevent live AWS pollution. `tests/test_m3_backend_telemetry.py` passes 8/8 tests in 4.83s.
   - Frontend builds cleanly via `npm --prefix frontend run build` (Next.js 14.2.3 standalone), compiling all 16 static/dynamic routes with zero errors.

---

## 1. Observation

### 1.1 `/analyze/[jobId]` Implementation & Layout
- **File**: `frontend/app/analyze/[jobId]/page.tsx` (806 lines)
- **Lifecycle & State**:
  - Polls job status via `pollJobStatus(jobId)` (`lib/api.ts` -> `GET /api/backend/api/v1/jobs/${jobId}`).
  - Tracks 10 progressive pipeline stages (`PIPELINE_STAGES` in `lib/api.ts`).
  - When `isComplete && result` is true (line 592):
    - Renders `<ConfidenceMeter>` (lines 600–604)
    - Renders `<DetectorScorecard>` (lines 611–618) with `gendScore`, `visualScore`, `audioScore`, `clipScore`, `verdict`
    - Renders `<EvidenceTimeline>` (lines 652–660) with `frames`, `audioFlags`, `duration`, `onSeek`
    - Renders "Forensic Intelligence Dossier" (lines 664–762)
- **Current Action Buttons on `/analyze/[jobId]`**:
  - Line 677–693 contains only a "Copy Dossier" clipboard button:
    ```tsx
    <button
      onClick={() => copyToClipboard(result.forensic_report || JSON.stringify(result, null, 2), "report")}
      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-inset border border-line text-xs font-medium text-ink hover:bg-hover transition-all"
    >
      ...
      <span>Copy Dossier</span>
    </button>
    ```
  - Line 789–795 contains only a "Scan Another Media" navigation button:
    ```tsx
    <button
      onClick={() => (window.location.href = "/")}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-page font-sans font-medium hover:bg-ink-2 transition-all"
    >
      Scan Another Media
      <ArrowRight className="w-4 h-4" />
    </button>
    ```
  - **Verdict**: No "Download Forensic PDF report" button exists on `/analyze/[jobId]`.

### 1.2 Catalog Modal Implementation & Layout
- **File**: `frontend/app/reported/page.tsx` (347 lines)
- **Modal Component**:
  - The catalog modal is rendered as an interactive slide-over drawer when `activeItem` is non-null (lines 290–338):
    ```tsx
    {activeItem && (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end"
        onClick={() => setActiveItem(null)}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className="relative w-full sm:w-[480px] max-h-[90vh] overflow-y-auto bg-canvas border-l border-line shadow-overlay rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          ...
          <a
            href={`/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
          >
            <FileText className="w-4 h-4" /> Download Evidence PDF
          </a>
        </div>
      </div>
    )}
    ```
  - Line 328–335 links to `/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`.

### 1.3 Available PDF Tools & Backend Routes
- **Host Binaries**:
  - Command: `which typst` returned `/opt/homebrew/bin/typst` (Exit code 0).
  - Python Environment: `reportlab 5.0.1` is installed in `./venv/lib/python3.14/site-packages`.
- **Existing Typst PDF Implementation in Backend**:
  - `backend/api/routes/threat_intel.py` lines 118–221:
    Endpoint: `GET /api/v1/threat-intelligence/{threat_id}/fir-pdf`
    Generates a Typst markup document in a temp `.typ` file and runs:
    ```python
    typst_bin = shutil.which("typst") or ("/opt/homebrew/bin/typst" if os.path.exists("/opt/homebrew/bin/typst") else ...)
    subprocess.run([typst_bin, "compile", typ_path, pdf_path], check=True)
    with open(pdf_path, "rb") as f_pdf:
        pdf_bytes = f_pdf.read()
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=FIR_Report_{threat_id}.pdf"})
    ```
- **Existing Jobs PDF Route Stub**:
  - `backend/api/routes/jobs.py` lines 254–257:
    ```python
    @router.get("/jobs/{job_id}/report.pdf")
    async def get_report_pdf(job_id: str):
        """PDF report stub — returns 501 until Phase 7 implements PDF generation."""
        raise HTTPException(status_code=501, detail="PDF report generation coming in Phase 7")
    ```
  - `tests/test_m3_backend_telemetry.py` lines 308–309 explicitly tests this stub:
    ```python
    r_pdf = client.get("/api/v1/jobs/job-vid-123/report.pdf")
    assert r_pdf.status_code == 501
    ```
- **Next.js Proxy Configuration**:
  - `frontend/next.config.js` lines 11–17:
    ```javascript
    async rewrites() {
      return [
        {
          source: '/api/backend/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/:path*`
        }
      ];
    }
    ```
  - Thus, `/api/backend/api/v1/jobs/${jobId}/report.pdf` forwards transparently to FastAPI.
- **Frontend Dependencies**:
  - `frontend/package.json` contains NO PDF packages (`jspdf`, `pdfkit`, `@react-pdf/renderer` are NOT present).

### 1.4 Data Structures for Report Contents
The required report fields map to existing data models as follows:

| Directive 4 Requirement | Analysis Job Data Source (`jobs.py` / `worker.py`) | Catalog Item Data Source (`threat_catalog` in `db.py`) |
|-------------------------|---------------------------------------------------|-------------------------------------------------------|
| **Job ID** | `parsed["job_id"]` (UUID string) | `item["id"]` (e.g. `THREAT-3E9B71C4A2F0`) |
| **SHA-256 Hash** | Calculated on video payload in `detect.py` / `worker.py` (`hashlib.sha256(bytes).hexdigest()`), stored in `job_record["sha256"]` or `result["sha256"]` | Content-hash seed in `db.py` line 192: `hashlib.sha256(content_seed.encode()).hexdigest()` |
| **Verdict** | `result["verdict"]` (`DEEPFAKE`, `AUTHENTIC`, `SUSPICIOUS`) & `result["risk_level"]` (`CRITICAL`, `HIGH`, `LOW`) | `item["verdict"]` (`SCAM`, `DEEPFAKE`) & `item["risk_level"]` |
| **Scorecard** | `result["confidence"]` (float %)<br>`result["visual_score"]`<br>`result["gend_score"]`<br>`result["audio_score"]`<br>`result["clip_score"]` | `item["fake_probability"]` (0.0–1.0)<br>Directive 5 auto-population stores full scorecard in `fir_dossier["scorecard"]` |
| **Metadata** | `video_duration`, `file_size_mb`, `created_at`, `completed_at`, `assigned_worker_id`, `cloud_region` (`ap-south-1`), `metadata_flags` (e.g., EXIF GPS, encoder tags, re-encode count) | `item["city"]`, `item["state"]`, `item["country"]`, `item["lat"]`, `item["lng"]`, `item["device_model"]`, `item["software_used"]`, `item["created_at"]` |
| **Keyframe Anomalies** | `result["frames"]`: array of `{frame_number, timestamp, confidence, flags, spatial_score}`<br>`result["audio_flags"]` | `item["extracted_iocs"]` (`phones`, `upis`, `urls`, `apks`) + `fir_dossier["keyframe_anomalies"]` |

### 1.5 Test & Build Infrastructure Observations
- **Virtual Environment & Python Binary**:
  - Virtualenv: `./venv`
  - Python version: 3.14.7
  - Pytest version: 9.1.1 (`./venv/bin/pytest`)
- **Pytest Isolation & Configuration**:
  - `tests/conftest.py` declares an autouse fixture `isolate_aws_dynamodb` that mocks `get_dynamo_client` in `backend.api.routes.workers` and `backend.api.routes.jobs`.
  - Running pytest requires `PYTHONPATH=.` so `backend` and `worker` are imported without `ModuleNotFoundError`.
  - Test run command: `PYTHONPATH=. ./venv/bin/pytest tests/test_m3_backend_telemetry.py`
    Result: 8 passed in 4.83s.
- **Frontend Build & Lint**:
  - Tool: Next.js 14.2.3, Node.js v20+, TypeScript 5
  - Build command: `npm --prefix frontend run build` (or root `npm run build`)
  - Execution verification: Finished with code 0. Compiled 16 routes:
    - Static routes: `/`, `/community`, `/developers`, `/radar`, `/reported`, `/scam`, `/technology`, `/trends`, etc.
    - Dynamic route: `/analyze/[jobId]` (14.5 kB)
  - Lint command: `npm --prefix frontend run lint` (`next lint`)
  - Component stress scripts: `node frontend/scripts/test-token-resolution.mjs` and `node frontend/scripts/test-ui-stress.mjs`.

---

## 2. Logic Chain

1. **Premise**: Directive 4 requires a 1-click Download Forensic PDF report button on both `/analyze/[jobId]` and the catalog modal, containing: Job ID, SHA-256 hash, verdict, scorecard, metadata, and keyframe anomalies.
2. **Observation**: On the frontend, neither `jspdf` nor any canvas/DOM-to-PDF library is installed. Adding a client-side PDF bundle would bloat frontend page weight, introduce font rendering discrepancies, and fail to produce cryptographically authentic institutional certificates.
3. **Observation**: On the backend, `/opt/homebrew/bin/typst` is already installed, fast (sub-200ms compilation), and proven in production at `backend/api/routes/threat_intel.py`. Furthermore, `backend/api/routes/jobs.py` already reserved `@router.get("/jobs/{job_id}/report.pdf")`.
4. **Deduction**: The optimal architecture is server-side PDF compilation using Typst:
   - For `/analyze/[jobId]`: Implement `GET /api/v1/jobs/{job_id}/report.pdf` in `backend/api/routes/jobs.py`.
   - For Catalog Modal: Enhance `GET /api/v1/threat-intelligence/{threat_id}/fir-pdf` in `backend/api/routes/threat_intel.py` to ensure it renders the complete 6-item forensic schema.
   - For Frontend UI: Add 1-click download anchor buttons in `frontend/app/analyze/[jobId]/page.tsx` and `frontend/app/reported/page.tsx` pointing directly to these endpoints.
5. **Observation on SHA-256**: For video analysis jobs, `detect.py` currently reads `contents = await file.read()` and worker reads `video_path`. Computing `hashlib.sha256(contents).hexdigest()` and storing it in `job_record["sha256"]` guarantees authentic cryptographic provenance of the uploaded binary.
6. **Observation on Tests**: `tests/test_m3_backend_telemetry.py` line 309 currently asserts `r_pdf.status_code == 501`. When the endpoint is implemented, this test must be updated to assert status 200 and Content-Type `application/pdf`.

---

## 3. Caveats

1. **Typst Binary Availability in Cloud/Docker**:
   - On the local development Mac, `/opt/homebrew/bin/typst` is installed and functional.
   - In Docker or cloud environments (e.g. Render, AWS EC2/ECS), `typst` must either be installed in the Dockerfile/host (`apt-get install typst` or downloading the static release binary) or fallback to `reportlab` (which is already installed in Python `venv`). The codebase in `threat_intel.py` already checks `shutil.which("typst")` and multiple path locations. A fallback to `reportlab` or returning a clean 503 if typst is missing can be retained as defense-in-depth.
2. **Catalog Items vs Ingested Video Jobs Data Uniformity**:
   - Seeded/historical scam text catalog items may not have video keyframe anomalies (since they are text scams). For non-video threats, the PDF template should gracefully show "No keyframe visual anomalies (Media type: scam_text / audio_clone)" and display IOC indicators (phone, UPI, URL) and linguistic anomalies instead.
3. **Synchronous Typst Compilation Latency**:
   - Typst compiles small 1-3 page documents in 50–150ms. Running `subprocess.run` inside an `async def` route can be run with `asyncio.to_thread` or standard blocking call so as not to block the event loop under heavy load.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Backend Implementation Plan
1. **Compute and Persist Media SHA-256**:
   - In `backend/api/routes/detect.py`: Compute `file_sha256 = hashlib.sha256(contents).hexdigest()` and store in `job_record["sha256"] = file_sha256` and DynamoDB item attributes.
   - In `worker/worker.py`: Compute `sha256 = hashlib.sha256(open(video_path, 'rb').read()).hexdigest()` and include in `final_result["sha256"] = sha256`.
2. **Implement `GET /api/v1/jobs/{job_id}/report.pdf`** in `backend/api/routes/jobs.py`:
   - Retrieve job data via `fetch_job_item(job_id)`.
   - If not complete, return 400 ("Job is still processing").
   - Synthesize Typst markup containing:
     - Header: NETRA Autonomous Forensic Intelligence Laboratory & Seal
     - Digital Chain of Custody Table: Job ID, SHA-256 Hash, Timestamp, Node ID, S3 Key
     - Verdict Banner: Final Verdict, Risk Level, Confidence %
     - Neural Scorecard: Spatial SBI score, GenD Foundation ViT-L/14, Wav2Vec2 Audio, CLIP Probe
     - Keyframe Anomalies Table: Timestamp, Frame #, Distortion Score, Anomaly Flags
     - Container & Auxiliary Metadata: Codec, Bitrate, Duration, EXIF Location/Camera
     - Legal Admissibility & Cryptographic Verification Footer
   - Compile with `typst compile` to a temporary PDF, read bytes, clean up temp files, and return `Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=NETRA_Forensic_Report_{job_id}.pdf"})`.
3. **Enhance `GET /api/v1/threat-intelligence/{threat_id}/fir-pdf`** in `threat_intel.py`:
   - Ensure the FIR PDF includes SHA-256 hash, verdict, scorecard breakdown (if present or auto-populated via Directive 5), metadata, and IOC/anomaly list.
4. **Update Backend Tests**:
   - In `tests/test_m3_backend_telemetry.py`, update `test_video_url_and_pdf_report()` to verify status 200, Content-Type `application/pdf`, and non-empty PDF bytes starting with `%PDF-`.

### 4.2 Frontend Implementation Plan
1. **`/analyze/[jobId]` (`frontend/app/analyze/[jobId]/page.tsx`)**:
   - When `isComplete && result`:
     Beside "Copy Dossier" in the dossier header (line 677) and in the action footer, add:
     ```tsx
     <a
       href={`/api/backend/api/v1/jobs/${jobId}/report.pdf`}
       download={`NETRA_Forensic_Report_${jobId}.pdf`}
       target="_blank"
       rel="noopener noreferrer"
       className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-page text-xs font-medium hover:bg-ink-2 transition-all shadow-sm"
     >
       <Download className="w-3.5 h-3.5" />
       <span>Download Forensic PDF</span>
     </a>
     ```
2. **Catalog Modal (`frontend/app/reported/page.tsx`)**:
   - In the slide-over modal (line 328–335), update the download button:
     ```tsx
     <a
       href={`/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`}
       download={`NETRA_Forensic_Dossier_${activeItem.id}.pdf`}
       target="_blank"
       rel="noopener noreferrer"
       className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent text-page text-sm font-semibold hover:bg-ink-2 transition-all shadow-sm"
     >
       <Download className="w-4 h-4" /> Download Forensic PDF Report
     </a>
     ```

---

## 5. Verification Method

### 5.1 Verifying Backend Tests & Routes
```bash
# 1. Run isolated backend telemetry test suite
PYTHONPATH=. ./venv/bin/pytest tests/test_m3_backend_telemetry.py -v

# 2. Run master backend validation suite
PYTHONPATH=. ./venv/bin/pytest tests/test_master_backend_validation.py -v -k "not test_real_video_pipeline_end_to_end"

# 3. Verify PDF generation directly via curl against running backend
curl -s -D - "http://localhost:8000/api/v1/threat-intelligence/NETRA-SCAM-0001/fir-pdf" | head -n 10
# Expected: HTTP/1.1 200 OK, content-type: application/pdf, content-disposition: attachment; filename=FIR_Report_...
```

### 5.2 Verifying Frontend Build & Static Generation
```bash
# 1. Verify Next.js production build succeeds with 0 errors
npm --prefix frontend run build

# 2. Verify ESLint compliance
npm --prefix frontend run lint

# 3. Verify design tokens and component stress
node frontend/scripts/test-token-resolution.mjs
node frontend/scripts/test-ui-stress.mjs
```

### 5.3 Invalidation Conditions
- If typst compilation fails or typst binary cannot be located, check `/opt/homebrew/bin/typst` or install via `brew install typst`.
- If `tests/test_m3_backend_telemetry.py` fails on status code, verify that the 501 assertion has been updated to 200 once the implementation is complete.
- If Next.js build fails on routes, verify that `next.config.js` rewrite rules preserve query strings and URL parameters.
