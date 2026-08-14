# Milestone 11: Adaptive Frontend UI Presentation — Investigation & Architectural Blueprint

## Executive Summary
This report investigates the adaptation of `frontend/components/sandbox/MultiModalForensicScanner.tsx` and its associated components to support the three analysis modes (`pure_face`, `document`, and `hybrid`) produced by NETRA's backend Intelligent Dual-Branch Router (`backend/netra/pipeline/dual_branch_router.py`). It provides a complete evidence chain, architectural analysis, concrete gap identification, and implementation specifications for interactive SVG/CSS bounding box overlays, per-face scorecard switcher, neural metrics gauges, court evidence PDF generation, and Tavily-augmented threat dossiers.

---

## 1. Observation

### 1.1 Backend Contract & Response Payload (`backend/netra/pipeline/dual_branch_router.py`)
`dual_branch_router.py` implements tri-branch classification and multi-face scoring:
- **Routing criteria** (`lines 527-539`):
  - **Branch A (Pure Face)**: `face_count >= 1` and `char_count < 30` -> `analysis_mode = "pure_face"`
  - **Branch B (Document)**: `char_count >= 30` and `face_count == 0` -> `analysis_mode = "document"`
  - **Branch C (Hybrid)**: `face_count >= 1` and `char_count >= 30` -> `analysis_mode = "hybrid"`
  - **Fallback (Inconclusive)**: `face_count == 0` and `char_count < 30` -> `analysis_mode = "inconclusive"`

- **Facial Analysis Schema** (`lines 363-387`, `571-582`):
  Each face in `facial_analysis["faces"]` contains:
  ```json
  {
    "face_id": "face_1",
    "bbox": [220, 145, 180, 220],
    "normalized_bbox": [0.275, 0.181, 0.225, 0.275],
    "fake_probability": 0.942,
    "verdict": "DEEPFAKE",
    "risk_level": "CRITICAL",
    "flags": ["ocular_reflection_asymmetry", "perioral_blending_inconsistency", "sbi_boundary_gradient"],
    "anomaly_region": "Eyewear Specular Glare Plane",
    "evidence_code": "EVD-EYEWEAR-GLARE-001",
    "forensic_badge": "FACE #1: SYNTHETIC (94%)",
    "border_color_hex": "#ef4444",
    "neural_metrics": {
      "sbi_artifact_level": 0.942,
      "ocular_reflection_symmetry": 0.125,
      "eyewear_specular_score": 88.4,
      "lip_sync_laplacian_score": 79.2
    }
  }
  ```

- **Top-level metadata & Previews** (`lines 470-484`, `756-778`):
  - `scan_id`: unique institutional ID (e.g. `SCAN-7B93FA1C`)
  - `composite_risk_score`: `int` (0-100), calculated as `max(scam_risk, int(max_face_fake_prob * 100))` in hybrid mode
  - `composite_risk_level`: `"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE"`
  - `composite_verdict`: Institutional summary string
  - `facial_analysis.annotated_preview_url`: `/api/v1/media/images/{scan_id}_annotated.jpg`
  - `facial_analysis.annotated_preview_base64`: `data:image/jpeg;base64,...`
  - `ocr_analysis`: `engine`, `full_text`, `lines_count`, `processing_time_ms`
  - `scam_analysis`: `is_scam`, `risk_score`, `risk_level`, `verdict`, `scam_type`, `matched_rules`, `analysis_reason`
  - `extracted_iocs`: `phones`, `upis`, `urls`, `apks`
  - `tavily_threat_intel`: `verified_threat`, `matches_count`, `articles: [{title, url, snippet}]`
  - `recommendation`: Contextual legal / protective guidance

- **Backend Route Integration** (`backend/api/routes/detect.py` lines 138-170):
  Both `POST /api/v1/detect/image-ocr` and `POST /api/v1/detect/image` invoke `process_image_forensics(...)` and return the unified response payload.

### 1.2 Frontend Component State (`frontend/components/sandbox/`)
Inspection of `MultiModalForensicScanner.tsx`, `FacialDeepfakeCard.tsx`, `OCRDossier.tsx`, and `index.ts`:

1. **`MultiModalForensicScanner.tsx` (Lines 593-623)**:
   ```tsx
   activeModality === "image" && imageOcrResult ? (
     (() => {
       const mode = imageOcrResult.analysis_mode;
       const isPureFace = mode === "pure_face";
       const isDocument = mode === "document";
       const isHybrid = mode === "hybrid";

       if (isPureFace) {
         return <FacialDeepfakeCard data={imageOcrResult} onReset={() => setImageOcrResult(null)} />;
       }
       if (isHybrid) {
         return <HybridDossier data={imageOcrResult} onReset={() => setImageOcrResult(null)} />;
       }
       return <OCRDossier data={imageOcrResult as OCRDossierResult} onReset={() => setImageOcrResult(null)} />;
     })()
   )
   ```

2. **`HybridDossier` (Lines 54-115)**:
   - Renders a composite threat header and two tabs: `🎭 Facial Deepfake Analysis` and `📄 Text Scam Intelligence`.
   - **Gap**: Tab buttons currently display static text without dynamic count badges (e.g. `(N Faces)` or `(M IOCs)`).

3. **`FacialDeepfakeCard.tsx` (Lines 136-164, 368-406)**:
   - `AnnotatedPreview` only renders a static `<img src={src} />`.
   - **Gap**: Lacks interactive SVG/CSS bounding box overlay on the image preview. Users cannot click directly on a detected face in the image to switch the active face scorecard.
   - Multi-face switcher (Lines 382-395) renders minimal numbered circles (`[1] [2]`) rather than rich status pills (`Face #1: 94% Synthetic (Critical)` / `Face #2: 4% Authentic (Safe)`).
   - **Gap**: Lacks a 1-click "Download Court Evidence PDF" action button. (Audio scan has `handleDownloadAudioPDF`, but image scans do not).

4. **`OCRDossier.tsx` (Lines 15-46, 54-118)**:
   - Displays risk meter, text preview, IOC chips with copy, and `TaskRows` safety checklist.
   - **Gap**: Does not render `tavily_threat_intel` news advisories when present in `data`, unlike text triage in `MultiModalForensicScanner.tsx`.

5. **Component Naming & Exports (`frontend/components/sandbox/index.ts`)**:
   - `PROJECT.md` §Interface Contracts line 128-129 specifies `FacialAnomalyCard.tsx` as the sub-component.
   - Currently, the file is named `FacialDeepfakeCard.tsx`.
   - Neither `FacialAnomalyCard` nor `FacialDeepfakeCard` is exported in `frontend/components/sandbox/index.ts`.

6. **Frontend Build & Styling Compliance**:
   - `npm run build` currently compiles cleanly with 0 TypeScript errors.
   - `frontend/scripts/test-ui-stress.ts` enforces `border-[1.5px]` signature border tokens and `h-full flex flex-col` column balancing.

---

## 2. Logic Chain

### Step 1: Modality Ingestion & API Dispatch
When a user uploads an image (`file`), `handleFileSelect` in `MultiModalForensicScanner.tsx` sends a `multipart/form-data` POST request to `/api/backend/api/v1/detect/image-ocr`.
The backend calls `process_image_forensics` which performs face detection and RapidOCR text density checking.

### Step 2: Routing Determinism
The backend returns `analysis_mode`:
- `"pure_face"` when `face_count >= 1` and `char_count < 30`.
- `"document"` when `face_count == 0` and `char_count >= 30`.
- `"hybrid"` when `face_count >= 1` and `char_count >= 30`.
- `"inconclusive"` when `face_count == 0` and `char_count < 30`.

### Step 3: Branch UI Routing in `MultiModalForensicScanner.tsx`
- In `pure_face` mode: MultiModalForensicScanner renders the Facial Anomaly Card. It displays all detected faces with bounding boxes, neural metrics gauges, and individual face switching.
- In `document` mode: MultiModalForensicScanner renders `OCRDossier` with full OCR text, detected IOCs (phones, UPIs, links, APKs), and scam category.
- In `hybrid` mode: MultiModalForensicScanner renders `HybridDossier` featuring:
  - Top composite risk banner showing `composite_risk_score`, `composite_risk_level`, and `composite_verdict`.
  - Segmented tab switch with dynamic badges:
    `[ 🎭 Facial Deepfake Analysis (N Faces) | 📄 Text Scam Intelligence (M IOCs) ]`.
  - Seamless switching between `FacialAnomalyCard` and `OCRDossier`.

### Step 4: Interactive Bounding Box Overlay Architecture
The backend provides `normalized_bbox: [x, y, w, h]` where each coordinate is normalized to `[0.0, 1.0]`.
To implement interactive bounding boxes:
- The image preview container is positioned `relative`.
- An absolute SVG overlay or set of absolute `<div>` elements with percentages:
  - `left: ${face.normalized_bbox[0] * 100}%`
  - `top: ${face.normalized_bbox[1] * 100}%`
  - `width: ${face.normalized_bbox[2] * 100}%`
  - `height: ${face.normalized_bbox[3] * 100}%`
- When a face box is clicked or hovered, `activeFaceIdx` updates immediately, highlighting both the bounding box with a glowing ring (`ring-2 ring-amber-400` or `ring-red-500`) and the active face scorecard below.

### Step 5: Informative Multi-Face Selector Pills
Instead of plain numbers `[1] [2]`, each face should be represented by an interactive pill button:
- Synthetic face: Amber or Red border/tint with `Face #1: 94% Synthetic` (critical/warning pill).
- Authentic face: Emerald border/tint with `Face #2: 4% Authentic` (active pill).
- Clicking any pill immediately switches the active scorecard and focuses the corresponding bounding box overlay.

### Step 6: Neural Metrics Gauges
Each face contains `neural_metrics`:
- `sbi_artifact_level` (0.0 to 1.0): Synthetic Boundary Inconsistency level (higher = fake).
- `ocular_reflection_symmetry` (0.0 to 1.0): Reflection symmetry between left and right iris (lower = fake, higher = authentic).
- `eyewear_specular_score` (0.0 to 100.0): Specular glare plane discontinuity on glasses.
- `lip_sync_laplacian_score` (0.0 to 100.0): Laplacian gradient edge discontinuity around the mouth.
These are rendered via `MetricBar` components with appropriate risk color transitions.

### Step 7: 1-Click Court Evidence PDF Generation
`frontend/lib/pdfReportGenerator.ts` provides `generateForensicPDF(data: PDFReportData)`.
Adding a "Download Court Evidence PDF" button to `FacialAnomalyCard` allows instant generation of an official cyber evidence PDF containing:
- Scan ID and SHA-256 evidence certificate header.
- Case reference, timestamp, and legal admissibility compliance (Sec 65B IEA / Sec 63 BSA / Sec 66D IT Act / Sec 318(4) BNS).
- Composite verdict and per-face scores (`gendScore`, `visualScore`).
- Embedded photographic keyframe crop / annotated preview.
- Neural metrics breakdown and landmark anomaly descriptions.

---

## 3. Caveats

1. **Aspect Ratio Preservation in Bounding Box Overlay**:
   The image tag inside `AnnotatedPreview` must either have a known aspect ratio or wrap inside an inline-block container that tightly encloses the rendered image, so that `normalized_bbox` percentages match the exact visual boundaries of the image without skewing due to object-contain letterboxing.
2. **Inconclusive Mode Fallback**:
   When an image has no detectable faces and <30 characters of text, the system routes to `inconclusive`. The UI should render `OCRDossier` with a neutral advisory rather than a blank screen or crash.
3. **Backward Compatibility**:
   Existing consumers and benchmark tests expect `OCRDossierResult` and `DualBranchResult` to be interoperable. The legacy accessors (`is_scam`, `risk_score`, `verdict`, `extracted_text`) must remain present on the payload and typed in frontend interfaces.
4. **Offline / Fast Fallback**:
   When running offline or in lightweight test environments without GPU acceleration, `MultiTierFaceDetector` gracefully uses YCrCb skin contours. The frontend receives valid `normalized_bbox` coordinates regardless of whether Tier 1 (InsightFace) or Tier 2 was utilized.

---

## 4. Conclusion & Concrete Adaptation Blueprint

To implement Milestone 11 cleanly and robustly, the following changes are specified:

### 4.1 Component Renaming & Barrel Export
1. Rename / alias `FacialDeepfakeCard.tsx` -> `FacialAnomalyCard.tsx`.
2. Keep `export { FacialAnomalyCard as FacialDeepfakeCard }` for full backward compatibility.
3. Update `frontend/components/sandbox/index.ts` to export:
   ```typescript
   export { FacialAnomalyCard, FacialDeepfakeCard } from "./FacialAnomalyCard";
   export type { FacialAnomalyCardProps, DualBranchResult, FaceEntry, NeuralMetrics, FacialAnalysis } from "./FacialAnomalyCard";
   ```

### 4.2 Interactive Bounding Box Overlay in `FacialAnomalyCard.tsx`
Enhance `AnnotatedPreview` with an interactive SVG/CSS bounding box overlay:
```tsx
function InteractiveAnnotatedPreview({
  facial,
  activeFaceIdx,
  onSelectFace,
}: {
  facial: FacialAnalysis;
  activeFaceIdx: number;
  onSelectFace: (idx: number) => void;
}) {
  const src = facial.annotated_preview_base64 || facial.annotated_preview_url;
  const faces = facial.faces || [];
  if (!src) return null;

  return (
    <div className="rounded-xl overflow-hidden border-[1.5px] border-line bg-canvas">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          Interactive Forensic Face Inspector
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          Click bounding box to switch face • {facial.face_count} face{facial.face_count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative w-full flex items-center justify-center bg-black/40 overflow-hidden">
        {/* Rendered Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Annotated forensic scan"
          className="w-full object-contain max-h-72 block"
        />

        {/* Interactive Bounding Box Overlays */}
        {faces.map((face, idx) => {
          if (!face.normalized_bbox || face.normalized_bbox.length !== 4) return null;
          const [normX, normY, normW, normH] = face.normalized_bbox;
          const isActive = idx === activeFaceIdx;
          const isDeepfake = face.verdict === "DEEPFAKE";
          const isSynthetic = face.verdict !== "AUTHENTIC";

          const borderColor = isDeepfake ? "#ef4444" : isSynthetic ? "#f59e0b" : "#10b981";

          return (
            <button
              key={face.face_id || idx}
              type="button"
              onClick={() => onSelectFace(idx)}
              className={cn(
                "absolute cursor-pointer transition-all duration-150 rounded-sm focus:outline-none",
                isActive
                  ? "ring-2 ring-white shadow-lg z-20"
                  : "hover:ring-1 hover:ring-white/80 opacity-80 hover:opacity-100 z-10"
              )}
              style={{
                left: `${normX * 100}%`,
                top: `${normY * 100}%`,
                width: `${normW * 100}%`,
                height: `${normH * 100}%`,
                border: `2px solid ${borderColor}`,
                backgroundColor: isActive ? `${borderColor}20` : "transparent",
              }}
              title={`Click to inspect Face #${idx + 1} (${face.verdict} - ${Math.round(face.fake_probability * 100)}%)`}
            />
          );
        })}
      </div>
    </div>
  );
}
```

### 4.3 Multi-Face Selector Pills in `FacialAnomalyCard.tsx`
Replace simple numbered circles with rich status pills:
```tsx
{faces.length > 1 && (
  <div className="space-y-2 pt-1 border-t border-line">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        Detected Subjects ({faces.length} Faces)
      </span>
      <span className="text-[10px] text-zinc-500 font-mono">
        Active: Face #{activeFaceIdx + 1}
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {faces.map((f, i) => {
        const isSynth = f.verdict !== "AUTHENTIC";
        const isDf = f.verdict === "DEEPFAKE";
        const prob = Math.round(f.fake_probability * 100);
        const isActive = i === activeFaceIdx;

        return (
          <button
            key={f.face_id || i}
            onClick={() => setActiveFaceIdx(i)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all border",
              isActive
                ? isDf
                  ? "bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-500"
                  : isSynth
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500"
                  : "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500"
                : "bg-surface border-line text-zinc-400 hover:border-zinc-500"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isDf ? "bg-red-500" : isSynth ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
            <span>Face #{i + 1}: {prob}% {isSynth ? "Synthetic" : "Authentic"}</span>
          </button>
        );
      })}
    </div>
  </div>
)}
```

### 4.4 1-Click Court Evidence PDF Download Integration
Add a dedicated button in the action bar of `FacialAnomalyCard.tsx`:
```tsx
const handleDownloadPDF = () => {
  const activeF = faces[activeFaceIdx] ?? faces[0];
  generateForensicPDF({
    id: data.scan_id || `IMG-${Date.now().toString(36).toUpperCase()}`,
    title: "Facial Deepfake & Photographic Manipulation Evidence Dossier",
    verdict: data.composite_verdict || (facial.composite_face_verdict === "DEEPFAKE" ? "CRITICAL FACIAL DEEPFAKE DETECTED" : "AUTHENTIC MEDIA"),
    confidence: facial.max_fake_probability,
    riskLevel: data.composite_risk_level || (facial.max_fake_probability >= 0.75 ? "CRITICAL" : "SAFE"),
    city: "Digital Image Forensics Lab",
    state: "National Jurisdiction",
    locationSource: "EXIF / Digital Container",
    scores: {
      visualScore: facial.max_fake_probability,
      gendScore: activeF?.neural_metrics?.sbi_artifact_level ?? facial.max_fake_probability,
    },
    summary: `Multi-face inspection resolved ${facial.face_count} face(s). Peak synthetic probability: ${Math.round(facial.max_fake_probability * 100)}%. Evidence: ${activeF?.evidence_code || "EVD-GEN-ANOMALY"} in ${activeF?.anomaly_region || "Facial Zone"}.`,
    keyframeSnapshots: faces.map((f, idx) => ({
      frame_number: idx + 1,
      timestamp: `Face #${idx + 1} (${f.face_id})`,
      anomaly_region: f.anomaly_region || "Facial ROI",
      anomaly_score: f.fake_probability,
      detector_subsystem: "SpatialSBIDetector + VisualAnomalyLocalizer",
      image_base64: facial.annotated_preview_base64 || undefined,
      bounding_box: f.bbox,
    })),
  });
};
```

### 4.5 Tavily Press Advisories in `OCRDossier.tsx`
Add rendering for `data.tavily_threat_intel` if verified threat articles are found:
```tsx
{data.tavily_threat_intel?.verified_threat && (
  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5" />
        Tavily Live Threat Cross-Check Advisory
      </span>
      <span className="text-[10px] text-zinc-400 font-mono">
        {data.tavily_threat_intel.matches_count} Verified Advisory Match(es)
      </span>
    </div>
    <div className="space-y-1.5">
      {data.tavily_threat_intel.articles?.slice(0, 3).map((art, idx) => (
        <a
          key={idx}
          href={art.url}
          target="_blank"
          rel="noreferrer"
          className="block p-2 rounded-lg bg-surface/80 border border-line hover:border-amber-500/40 transition-colors"
        >
          <div className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
            <span>{art.title}</span>
            <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>
          {art.snippet && (
            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {art.snippet}
            </div>
          )}
        </a>
      ))}
    </div>
  </div>
)}
```

### 4.6 Tab Counter Badges in `HybridDossier` (`MultiModalForensicScanner.tsx`)
Update the tab buttons:
```tsx
const faceCount = data.facial_analysis?.face_count ?? 0;
const totalIOCs =
  (data.extracted_iocs?.phones?.length ?? 0) +
  (data.extracted_iocs?.upis?.length ?? 0) +
  (data.extracted_iocs?.urls?.length ?? 0) +
  (data.extracted_iocs?.apks?.length ?? 0);

// Tab buttons:
<span>🎭 Facial Deepfake Analysis ({faceCount} Face{faceCount !== 1 ? "s" : ""})</span>
<span>📄 Text Scam Intelligence ({totalIOCs} IOC{totalIOCs !== 1 ? "s" : ""})</span>
```

---

## 5. Verification Method

### 5.1 Static Verification & Build
1. **Frontend TypeScript & Production Build**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend
   npm run build
   ```
   **Pass condition**: Exits with code 0 and zero compilation or type errors.

2. **Frontend UI Stress & Token Audit**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend
   npx ts-node scripts/test-ui-stress.ts
   ```
   **Pass condition**: Verifies 1.5px border tokens, split command center grid, and column height balancing.

### 5.2 Backend Routing Verification
```bash
cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
PYTHONPATH=. ./venv/bin/pytest tests/test_dual_branch_routing_m10.py -v
```
**Pass condition**: All 6 tests pass (`test_document_routing_branch_b`, `test_portrait_routing_branch_a`, `test_hybrid_routing_branch_c`, `test_multi_face_detection_and_scoring`, `test_inconclusive_routing_fallback`, `test_endpoint_backward_compatibility`).

### 5.3 Functional Media Verification Scenarios
1. **Pure Face**:
   - Upload photographic portrait (e.g. `s0.jpg`).
   - Expected UI: Displays `FacialAnomalyCard` with subject bounding box, SBI artifact level, ocular reflection symmetry, and "Download Court Evidence PDF" button. No OCR scam panes.
2. **Document**:
   - Upload KBC scam letter (`file-JXAGnmm9Vl.png`).
   - Expected UI: Displays `OCRDossier` with extracted text, phone `9714275760`, lottery scam category, and Tavily threat advisory. No facial deepfake card.
3. **Hybrid**:
   - Upload composite flyer containing face and scam text.
   - Expected UI: Displays top composite risk banner (`CRITICAL HYBRID THREAT`) with segmented tab buttons showing `(1 Face)` and `(N IOCs)`. Switching tabs toggles between `FacialAnomalyCard` and `OCRDossier`.
4. **Multi-Face**:
   - Upload image with 2 or more people.
   - Expected UI: Displays multiple bounding boxes and interactive pills (`Face #1`, `Face #2`). Clicking a bounding box on the image or pill activates that face's neural scorecard.
