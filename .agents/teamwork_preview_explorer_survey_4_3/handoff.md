# Handoff Report — Frontend MultiModalForensicScanner & UI Architecture Survey

## 1. Observation

### 1.1 Existing Component Hierarchy & File Structure
- **Root Entry Point**: In `frontend/app/page.tsx` line 7:
  ```typescript
  import { MultiModalForensicScanner } from "@/components/sandbox";
  ```
  and line 148:
  ```tsx
  <MultiModalForensicScanner className="h-full flex flex-col" />
  ```
- **Re-export Barrel**: `frontend/components/sandbox/index.ts` lines 1-12 exports:
  - `MultiModalForensicScanner` from `./MultiModalForensicScanner`
  - `DropZone`, `MODALITY_CONFIGS` from `./DropZone`
  - `OCRDossier` from `./OCRDossier`
  - `BenchmarkPresets`, `BENCHMARK_PRESETS` from `./BenchmarkPresets`
  - A compatibility re-export exists at `frontend/components/MultiModalForensicScanner.tsx` re-exporting `./sandbox/MultiModalForensicScanner`.

### 1.2 Current Image Upload & Endpoint Trigger Flow
- In `frontend/components/sandbox/MultiModalForensicScanner.tsx` lines 116-144:
  ```typescript
  // ── 1. IMAGE MODALITY: Route to PaddleOCR + Scam Engine ──
  if (activeModality === "image") {
    try {
      const res = await fetch("/api/backend/api/v1/detect/image-ocr", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.ok) {
        const data: OCRDossierResult = await res.json();
        setImageOcrResult(data);
        onScanComplete?.(data);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `OCR endpoint returned status ${res.status}`);
    } catch (err: any) {
      clearInterval(progressInterval);
      console.warn("Image OCR error:", err);
      setUploadError(err?.message || "Image OCR forensic node unreachable. Please check backend server.");
      setImageOcrResult(null);
    } finally {
      setIsUploading(false);
    }
    return;
  }
  ```
- In `frontend/next.config.js` lines 13-16:
  ```javascript
  {
    source: '/api/backend/:path*',
    destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/:path*`
  }
  ```
  This proxies `/api/backend/api/v1/detect/image-ocr` directly to the FastAPI server at `http://127.0.0.1:8000/api/v1/detect/image-ocr`.
- In `frontend/components/sandbox/MultiModalForensicScanner.tsx` lines 527-532:
  ```tsx
  ) : activeModality === "image" && imageOcrResult ? (
    /* ── IMAGE OCR DOSSIER VIEW ── */
    <OCRDossier
      data={imageOcrResult}
      onReset={() => setImageOcrResult(null)}
    />
  ) :
  ```
  The image inspection view is currently 100% hardcoded to render `OCRDossier`, with zero facial anomaly rendering, zero bounding box overlays, zero per-face switcher, and no neural metrics for face deepfake detection.

### 1.3 DropZone Subtitle & Copy Alignment
- In `frontend/components/sandbox/DropZone.tsx` lines 35-43:
  ```typescript
  image: {
    label: "Image / Screenshot",
    iconName: "image",
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/bmp"],
    acceptExtensions: [".png", ".jpg", ".webp", ".jpeg"],
    maxSizeMb: 50,
    title: "Drop screenshot or browse files",
    subtitle: "Reads text to find scam messages, fake official notices, and fraud payment links.",
    engineBadge: "Text & Image Analysis Engine",
  },
  ```
  The subtitle specifically references reading text for scam messages; with dual-branch routing, this needs to reflect facial deepfake inspection as well as document scam detection.

### 1.4 PDF Report Generation Support
- In `frontend/lib/pdfReportGenerator.ts` lines 41-52 and 215-240:
  ```typescript
  keyframeSnapshots?: Array<{
    frame_number: number;
    timestamp: string;
    anomaly_region?: string;
    anomaly_score?: number;
    detector_subsystem?: string;
    image_base64?: string;
    image_url?: string;
    annotated_image_url?: string;
    bounding_box?: [number, number, number, number];
  }>;
  ```
  `generateForensicPDF` already supports embedding visual keyframe snapshots, bounding boxes, anomaly regions, detector subsystems, scores, and Tavily matches into court-admissible Section 65B/66D PDF dossiers.

### 1.5 Frontend Build Status
- Ran `npm run build` in `frontend/`:
  Command exited with code `0`. All 16 routes (`/`, `/analyze/[jobId]`, `/community`, `/developers`, `/radar`, `/reported`, `/scam`, etc.) compiled successfully without any TypeScript or bundling errors.

---

## 2. Logic Chain

### 2.1 Backend Contract & Response Payload Analysis
1. From requirement **R1** and **R2** in `ORIGINAL_REQUEST.md`:
   - Fast pre-classification routes uploaded images into three operational modes:
     - **Branch A (`pure_face`)**: `face_count >= 1` and `char_count < 30`. Runs `SpatialDetector` (EfficientNet-B4 + SBI) and `VisualAnomalyLocalizer` (ocular glare, blending seams). Returns per-face bounding boxes, deepfake probabilities, and annotated visual evidence preview.
     - **Branch B (`document`)**: `char_count >= 30` and `face_count == 0`. Runs OCR scam detection, IOC extraction, and Tavily cross-check.
     - **Branch C (`hybrid`)**: `face_count >= 1` and `char_count >= 30`. Runs both pipelines and returns a composite risk score: `max(scam_risk, facial_forgery_score)`.
   - In addition, an edge case exists: `face_count == 0` and `char_count < 30` (e.g. scenic or blurry image with neither face nor text), which should resolve to `"inconclusive"` or `"clean_media"` rather than failing or returning NaN.

2. To support this cleanly without breaking existing tests (e.g., `tests/test_master_backend_validation.py` line 281), the backend response schema returned from `/api/v1/detect/image-ocr` (or unified `/api/v1/detect/image`) should be structured as:
   ```typescript
   export interface DetectedFace {
     face_id: number | string;
     bbox: [number, number, number, number]; // [x, y, w, h] pixel coordinates
     normalized_bbox?: [number, number, number, number]; // [0..1] relative coordinates
     fake_probability: number; // 0.0 - 1.0 (or 0-100)
     verdict: string; // "AUTHENTIC" | "SUSPICIOUS" | "DEEPFAKE"
     risk_level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
     flags: string[]; // ["EVD-EYE-SPECULAR-GLARE", "EVD-LIP-SYNC-BOUNDARY-SEAM", etc.]
     neural_metrics?: {
       sbi_artifact_level?: number; // 0.0 - 1.0
       ocular_reflection_symmetry?: number; // 0.0 - 1.0
       boundary_discontinuity?: number; // 0.0 - 1.0
       corneal_specular_glare?: number; // 0.0 - 1.0
     };
     crop_image_url?: string;
   }

   export interface FacialAnalysisData {
     face_count: number;
     overall_verdict: string;
     max_fake_probability: number;
     annotated_image_url?: string;
     faces: DetectedFace[];
     processing_time_ms?: number;
   }

   export interface ImageAnalysisResult {
     status: string;
     filename?: string;
     analysis_mode: "pure_face" | "document" | "hybrid" | "inconclusive";
     face_count?: number;
     char_count?: number;
     composite_risk_score: number; // 0-100
     composite_risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
     composite_verdict: string;
     facial_analysis?: FacialAnalysisData;
     ocr_analysis?: OCRAnalysisData;
     scam_analysis?: ScamAnalysisData;
     extracted_iocs?: ExtractedIOCs;
     recommendation?: string;
     tavily_threat_intel?: any;
   }
   ```

### 2.2 Dynamic UI Presentation Strategy in `MultiModalForensicScanner.tsx`
1. **Modular Architecture via `FacialAnomalyCard.tsx`**:
   - Rather than inflating `MultiModalForensicScanner.tsx` (already 641 lines) into a monolithic file, implement a dedicated component:
     `frontend/components/sandbox/FacialAnomalyCard.tsx`
   - This component will encapsulate:
     - The annotated image display with fallback to client-side blob URL preview (`URL.createObjectURL(file)`).
     - Interactive SVG/CSS bounding box overlays matching detected faces `[x, y, w, h]`, styled in amber/red (`#f59e0b` / `#ef4444`) for synthetic and emerald (`#10b981`) for authentic.
     - Per-face switcher: tabs/pills to select individual faces if `face_count > 1` (e.g. `[Face #1: 98% Fake | Face #2: 4% Authentic]`).
     - Neural metrics scorecard for the active selected face:
       - SBI Artifact Level progress bar & score
       - Ocular Reflection Symmetry percentage & index
       - Spatial SBI Detector (EfficientNet-B4) probability
       - Forensic flags & evidence chips
     - 1-click Court Evidence PDF download button via `generateForensicPDF`.

2. **Adaptive Mode Switching**:
   In `MultiModalForensicScanner.tsx`:
   - Detect returned mode:
     ```typescript
     const mode = imageResult.analysis_mode || 
       (imageResult.facial_analysis?.faces?.length && (imageResult.ocr_analysis?.full_text?.length || 0) >= 30 
         ? "hybrid" 
         : imageResult.facial_analysis?.faces?.length 
         ? "pure_face" 
         : "document");
     ```
   - **When mode is `"pure_face"`**:
     Render `<FacialAnomalyCard data={imageResult} imageUrl={uploadedImagePreview} onReset={handleResetImage} />`.
   - **When mode is `"document"`**:
     Render `<OCRDossier data={imageResult} onReset={handleResetImage} />`.
   - **When mode is `"hybrid"`**:
     Render a unified container with:
     1. **Top Composite Verdict Banner**:
        - Unified composite verdict badge (`imageResult.composite_verdict` and `imageResult.composite_risk_score`).
        - Explanatory alert: "Hybrid Media Detected: Visual facial deepfake analysis and textual OCR scam detection both completed."
     2. **Segmented Control Toggle**:
        - `[ 🎭 Facial Deepfake Analysis (${face_count} Faces) | 📄 Text Scam Intelligence (${ioc_count} IOCs) ]`
        - Controlled by `const [activeHybridTab, setActiveHybridTab] = useState<"face" | "text">("face");`
        - If `"face"`: renders `<FacialAnomalyCard>`.
        - If `"text"`: renders `<OCRDossier>`.
   - **When mode is `"inconclusive"`**:
     Render an informative fallback card stating: "No human faces or actionable document text detected in uploaded image. Please ensure image contains clear facial subjects or legible text." with a reset button.

3. **Client-Side Image Overlay Resilience**:
   - In `handleFileSelect(file: File)`:
     Capture `const blobUrl = URL.createObjectURL(file); setUploadedImagePreview(blobUrl);`.
   - If the backend returns `annotated_image_url` (static URL or data URI), display it.
   - If `annotated_image_url` is unavailable or null, the frontend automatically falls back to `uploadedImagePreview` and renders responsive CSS bounding box overlays based on the returned `bbox` or `normalized_bbox` coordinates.

---

## 3. Caveats
- **Bounding Box Coordinate Formats**: Backend OpenCV code conventionally returns pixel boxes `[x, y, w, h]`. If image dimensions change during upload/resizing, normalized coordinates `[0..1]` are more robust for responsive CSS overlay scaling. The frontend should gracefully handle both raw pixel `[x, y, w, h]` and normalized coordinates.
- **Backend Endpoint Alias**: The frontend currently calls `/api/backend/api/v1/detect/image-ocr`. If the backend introduces `/api/v1/detect/image`, both endpoints should be supported by having `/api/v1/detect/image-ocr` delegate to the dual-branch router for backwards compatibility.
- **Image Size Limit**: DropZone enforces a 50MB maximum size (`maxSizeMb: 50`), which matches backend `detect.py` line 153 (`len(contents) > 50 * 1024 * 1024`).

---

## 4. Conclusion
1. **Frontend State & Ingestion**:
   - `MultiModalForensicScanner.tsx` is ready to be enhanced with state:
     - `imageResult: ImageAnalysisResult | null`
     - `uploadedImagePreview: string | null`
     - `selectedFaceIndex: number`
     - `activeHybridTab: "face" | "text"`
2. **Component Separation**:
   - Creating `frontend/components/sandbox/FacialAnomalyCard.tsx` cleanly fulfills the Pure Face requirement (annotated image preview, bounding box overlays, per-face switcher, and neural metrics for SBI and ocular reflection symmetry).
   - Reusing `frontend/components/sandbox/OCRDossier.tsx` preserves 100% of existing document OCR and scam detection workflows.
   - Wrapping both with a unified composite verdict badge and a segmented tab toggle fulfills the Hybrid mode requirement.
3. **Build Integrity**:
   - The frontend currently builds with 0 errors (`npm run build` verified). All type contracts can be co-located or exported from `frontend/components/sandbox/index.ts` and `frontend/lib/api.ts`.

---

## 5. Verification Method

### 5.1 Independent Commands to Verify
1. **Frontend Production Build**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend
   npm run build
   ```
   *Expected outcome*: Exit code 0, 16/16 routes statically optimized or server-rendered, zero TypeScript compilation errors.

2. **Frontend UI Stress & Design Token Audit**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend
   node scripts/test-ui-stress.mjs
   ```

### 5.2 Key Files to Inspect
- `frontend/components/sandbox/MultiModalForensicScanner.tsx`
- `frontend/components/sandbox/OCRDossier.tsx`
- `frontend/components/sandbox/DropZone.tsx`
- `frontend/components/sandbox/index.ts`
- `frontend/lib/pdfReportGenerator.ts`

### 5.3 Invalidation Conditions
- If the backend returns a breaking response schema where `analysis_mode` is missing and fields are named differently without backwards compatibility, the client fallback logic must guard against undefined properties to prevent blank screen crashes.
