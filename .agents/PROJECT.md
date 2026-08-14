# Project: NETRA Institutional Forensic PDF Analysis Reports

## Architecture
- **Media Forensics Ingestion**:
  - Images routed through `dual_branch_router.py` into Branch A (pure face), Branch B (document OCR), Branch C (hybrid).
  - Audio routed through `audio_detect.py` using `PureSpectralAudioForensics` + `AudioDeepfakeDetector` (Wav2Vec2) + Tavily voice clone intelligence.
- **Reporting Channels**:
  - **Client-Side Engine**: `frontend/lib/pdfReportGenerator.ts` using `jsPDF` for instant, offline-capable 1-click downloads with base64 embedded crops.
  - **Backend Server-Side Exporter**: `backend/api/routes/threat_intel.py` using `ReportLab` for official FIR/investigation dossiers under `/threat-intelligence/{id}/fir-pdf`.
- **Statutory Framework**:
  - Offense classification under Section 66D/66E IT Act 2000 and Section 318(4) Bharatiya Nyaya Sanhita (BNS) 2023.
  - Cryptographic verification via SHA-256 media hashing.
  - NOTE: All Section 63 BSA 2023 / Section 65B IEA 1872 certificate schedules have been removed per user directive.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Backend Audio Route Fix & Telemetry | Fix `file_bytes=audio_bytes` bug in `audio_detect.py:231`, add full acoustic telemetry (duration, 16kHz SR, codec, SHA-256, Wiener flatness, HF cutoff ratio, ZCR, RMS prosody) | M1 | Survey |
| 2 | Backend FIR PDF Server-Side Parity | Update `threat_intel.py` (`/fir-pdf`) with specialized ReportLab layouts for `type == 'audio_clone'` and `type == 'image_deepfake'`, stripping any 65B/63 certificate boilerplate | M1 | Survey |
| 3 | Client-Side Forensic PDF Generator | Enhance `frontend/lib/pdfReportGenerator.ts` to support image (Branch A, B, C) and audio clones with dedicated tables, zero network blocking base64 embedding, and clean institutional header/footer | M2 | Survey |
| 4 | OCR Dossier 1-Click Export | Add institutional 1-click download button in `OCRDossier.tsx` exporting document scam PDF with extracted text, IOC tables (phones, UPIs, URLs), and Tavily advisory | M3 | Survey |
| 5 | Facial Anomaly Card Export Parity | Fix 0-1 vs 0-100 anomaly index scaling bug in `FacialAnomalyCard.tsx`, pass multi-face breakdown, neural metrics, and annotated preview base64 | M3 | Survey |
| 6 | Multi-Modal Scanner Audio & Hybrid Export | Wire 1-click audio clone PDF export and composite hybrid PDF export in `MultiModalForensicScanner.tsx` with full telemetry | M3 | Survey |
| 7 | Catalog Modal 1-Click Export Parity | Update `reported/page.tsx` to inspect item modality (`type`) and route to specialized PDF generator with full parameters or backend FIR PDF | M3 | Survey |
| 8 | E2E Forensic Integrity & Verification | Verify generated PDFs across Image A, B, C, and Audio for valid byte streams, visual crops, zero TS errors, absence of 65B/63 certificates, and regression tests | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Backend Audio Telemetry & FIR PDF Parity | `audio_detect.py`, `threat_intel.py` | None | IN_PROGRESS |
| 2 | M2: Client-Side Forensic PDF Generator Engine | `frontend/lib/pdfReportGenerator.ts` | None | PLANNED |
| 3 | M3: UI 1-Click Export Touchpoints & Parity | `OCRDossier.tsx`, `FacialAnomalyCard.tsx`, `MultiModalForensicScanner.tsx`, `reported/page.tsx` | M1, M2 | PLANNED |
| 4 | M4: Dual Track E2E Verification & Adversarial Hardening | E2E test scripts, verification suites, visual artifact checks | M1, M2, M3 | PLANNED |

## Interface Contracts

### Backend ↔ Frontend Audio Telemetry Contract
```typescript
interface AudioDetectResponse {
  is_fake: boolean;
  fake_probability: number;
  confidence: number;
  verdict: string;
  risk_level: string;
  speech_duration_seconds: number;
  sample_rate_hz?: number; // 16000
  codec?: string;          // "PCM 16-bit mono" | "OPUS" | "AAC"
  sha256_hash?: string;
  acoustic_metrics?: {
    wiener_flatness?: number;
    hf_cutoff_ratio?: number;
    zcr_variance?: number;
    rms_prosody_variance?: number;
  };
  scorecard?: {
    wav2vec2_score?: number;
    spectral_score?: number;
    temporal_inconsistency?: number;
  };
  flags: string[];
  processing_time_ms: number;
  source_platform: string;
  tavily_threat_intel?: {
    verified_threat: boolean;
    query_used?: string;
    matches_count?: number;
    articles?: Array<{ title: string; url?: string; snippet?: string; published_date?: string }>;
    intel_summary?: string;
  };
}
```

### Client-Side `generateForensicPDF` Interface Contract
```typescript
export interface PDFReportData {
  id: string;
  title?: string;
  verdict: string;
  confidence: number; // 0-100 scale
  riskLevel: string;
  mediaType?: 'video' | 'image_pure_face' | 'image_document' | 'image_hybrid' | 'audio_clone' | string;
  timestamp?: string;
  city?: string;
  state?: string;
  locationSource?: string;
  deviceModel?: string;
  softwareUsed?: string;
  sha256_hash?: string;

  // Video / Generic Scores
  scores?: {
    gendScore?: number | null;
    visualScore?: number | null;
    audioScore?: number | null;
    clipScore?: number | null;
  };

  // Image Branch A: Pure Face / Multi-Face Forensics
  facialAnalysis?: {
    faceCount: number;
    maxFakeProbability: number;
    compositeVerdict: string;
    annotatedPreviewBase64?: string;
    faces: Array<{
      face_id: string;
      bbox: [number, number, number, number];
      fake_probability: number;
      verdict: string;
      risk_level: string;
      flags: string[];
      anomaly_region?: string;
      forensic_badge?: string;
      neural_metrics?: {
        sbi_artifact_level?: number;
        ocular_reflection_symmetry?: number;
        eyewear_specular_score?: number;
        lip_sync_laplacian_score?: number;
      };
    }>;
  };

  // Image Branch B: Document OCR / Scam Intelligence
  ocrAnalysis?: {
    engine?: string;
    fullText?: string;
    linesCount?: number;
    processingTimeMs?: number;
  };
  scamAnalysis?: {
    isScam?: boolean;
    riskScore?: number;
    riskLevel?: string;
    verdict?: string;
    scamType?: string;
    matchedRules?: string[];
    analysisReason?: string;
  };
  iocs?: {
    phones?: string[];
    upis?: string[];
    urls?: string[];
    apks?: string[];
  };

  // Audio Voice Clone Forensics
  audioAnalysis?: {
    durationSeconds: number;
    sampleRateHz?: number;
    codec?: string;
    acousticFlags?: string[];
    acousticMetrics?: {
      wienerFlatness?: number;
      hfCutoffRatio?: number;
      zcrVariance?: number;
      rmsProsodyVariance?: number;
    };
    scorecard?: {
      wav2vec2Score?: number;
      spectralScore?: number;
    };
  };

  // Intelligence & News Cross-Check
  tavilyMatches?: Array<{
    title: string;
    url?: string;
    snippet?: string;
    publishedDate?: string;
  }>;

  // Snapshots & Frames
  keyframeSnapshots?: Array<{
    frame_number: number;
    timestamp: string;
    anomaly_region?: string;
    anomaly_score?: number;
    detector_subsystem?: string;
    image_base64?: string;
  }>;
  frames?: Array<{
    frame_number: number;
    timestamp: string;
    confidence: number;
    flags?: string[];
  }>;
}
```

## Code Layout
- Backend:
  - `backend/api/routes/audio_detect.py`: Audio detection route & telemetry
  - `backend/api/routes/threat_intel.py`: Threat catalog & ReportLab FIR PDF generation
  - `backend/netra/pipeline/dual_branch_router.py`: Image routing & multi-face scoring
- Frontend:
  - `frontend/lib/pdfReportGenerator.ts`: Client-side jsPDF generator
  - `frontend/components/sandbox/OCRDossier.tsx`: OCR threat dossier & PDF export button
  - `frontend/components/sandbox/FacialAnomalyCard.tsx`: Facial anomaly card & PDF export
  - `frontend/components/sandbox/MultiModalForensicScanner.tsx`: Scanner results & export hooks
  - `frontend/app/reported/page.tsx`: Catalog modal & 1-click exports
