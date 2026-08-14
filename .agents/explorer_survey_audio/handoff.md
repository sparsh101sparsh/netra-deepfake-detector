# Audio Forensics Architecture & Media Modeling Survey Report

**Author**: Explorer Survey Agent (`explorer_survey_audio`)  
**Mission**: Map the NETRA codebase architecture, media forensics data modeling, multi-detector scorecards, and court-admissible PDF generation for Audio Voice Clone analysis.  
**Specification**: Section `## 2026-09-04T09:07:13Z` of `ORIGINAL_REQUEST.md` & `DISPATCH.md`.  
**Delivery Path**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_audio/handoff.md`  

---

## 1. Observation

### 1.1 Audio Detection Routes & Backend Endpoints
Direct filesystem examination confirms the following backend routing and processing structure:

1. **Dedicated Audio Route (`backend/api/routes/audio_detect.py`)**:
   - **Mounted at**: `POST /api/v1/detect/audio` in `backend/api/server.py` line 46:
     ```python
     app.include_router(audio_detect.router, prefix="/api/v1")
     ```
   - **Allowed file types**: `.wav`, `.mp3`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.webm` (line 23).
   - **Payload ceiling**: 25 MB (`len(contents) > 25 * 1024 * 1024`, line 174).
   - **Current Return Model (`AudioDetectResponse`)** (lines 26–37):
     ```python
     class AudioDetectResponse(BaseModel):
         is_fake: bool
         fake_probability: float
         confidence: int
         verdict: str
         risk_level: str
         speech_duration_seconds: float
         flags: List[str]
         processing_time_ms: int
         source_platform: str
         tavily_threat_intel: Optional[Dict[str, Any]] = None
     ```
   - **Audio Byte Decoding (`decode_audio_bytes_pure`)** (lines 119–161):
     - Uses Python standard library `wave` module for WAV files: extracts `sr` (sample rate), `n_channels`, `sampwidth`, reads PCM bytes, normalizes `int16` (`/ 32768.0`) or `int32` (`/ 2147483648.0`), downmixes multi-channel to mono via `.mean(axis=1)`, and resamples to 16 kHz using linear interpolation (`np.interp`).
     - Fallback for non-WAV streams (e.g. OPUS, OGG, MP3): reads raw byte slice (`input_bytes[:16000*8]`), casts `np.int8` normalized by 128.0, assuming nominal 16 kHz.
   - **CRITICAL BUG OBSERVED at Line 231 of `backend/api/routes/audio_detect.py`**:
     ```python
     auto_catalog_scan(
         scan_type="audio",
         result={...},
         file_bytes=audio_bytes, # <-- BUG: NameError! Variable 'audio_bytes' is undefined!
         filename=file.filename or "uploaded_audio.wav",
         request=request
     )
     ```
     At line 172, raw uploaded data is assigned to `contents = await file.read()`. The variable `audio_bytes` does not exist in scope. When `detect_audio` completes, this invocation raises `NameError: name 'audio_bytes' is not defined`, which is caught silently by line 235 (`except Exception as e: logger.warning(f"Audio catalog auto-index failed: {e}")`). As a direct consequence, **audio scans currently fail to auto-index into the `threat_catalog` and `media/uploads/` directory**.

2. **Video Ingestion Audio Separation (`worker/worker.py` & `backend/netra/pipeline/extractor.py`)**:
   - In `backend/netra/pipeline/extractor.py` lines 162–204:
     - `extract_audio(video_path, output_path)` invokes FFmpeg:
       ```bash
       ffmpeg -y -i <video_path> -ac 1 -ar 16000 -vn <output_path.wav>
       ```
     - Extracts mono 16 kHz WAV stream with 60-second timeout.
   - In `worker/worker.py` lines 637–653:
     - Stage 5 ("audio_analysis" at 65% progress) executes:
       ```python
       audio_result = models.audio_detector.predict_audio(audio_path_result)
       ```
     - Results are fed into `build_evidence_bundle` (`evidence.py` lines 134–148) and `GatedFusionEngine` (`fusion.py` lines 76–88).

---

### 1.2 Audio Forensics Engines & Acoustic Signal Processing

Two distinct audio forensics engines currently exist in the codebase:

1. **`PureSpectralAudioForensics` (`backend/api/routes/audio_detect.py`, lines 39–116)**:
   - Pure NumPy implementation (zero PyTorch or GPU dependencies).
   - STFT Analysis Configuration:
     - Sampling rate: `sr = 16000` Hz.
     - Frame length: 25 ms (`int(0.025 * sr) = 400` samples).
     - Hop length: 10 ms (`int(0.010 * sr) = 160` samples).
     - Window function: Hanning window (`np.hanning(400)`).
     - FFT points: `n_fft = 512`, producing 257 positive frequency bins spanning 0–8000 Hz (`np.fft.rfftfreq(512, d=1.0/16000)`).
   - Exact Acoustic Metrics Computed:
     - **High-Frequency Energy Ratio (`hf_ratio`)**: Energy in bins $\ge 4000\text{ Hz}$ divided by total power spectrum energy.
       - Threshold: `hf_ratio < 0.02` or `hf_ratio > 0.45`.
       - Penalty: $+0.25$ fake probability.
       - Emitted Flag: `"high_frequency_vocoder_cutoff"`.
     - **Spectral Flatness / Wiener Entropy (`flatness`)**: Geometric mean of power spectrum divided by arithmetic mean ($\exp(\frac{1}{N}\sum \ln P_k) / \frac{1}{N}\sum P_k$).
       - Threshold: `flatness > 0.35` ($+0.30$ score, emits `"vocoder_spectral_flatness_anomaly"`) or `flatness > 0.25` ($+0.15$ score).
     - **Zero Crossing Rate (ZCR) Variance (`zcr_var`) & Mean (`zcr_mean`)**: Frame-by-frame zero-crossing rate variance.
       - Threshold: `zcr_var < 0.001` and `zcr_mean > 0.05`.
       - Penalty: $+0.15$ fake probability.
       - Emitted Flag: `"unnatural_pitch_coherence"`.
     - **Temporal RMS Energy Variance / Micro-Prosody (`rms_var`)**: Ratio of standard deviation to mean of frame RMS energy.
       - Threshold: `rms_var < 0.20` on clips $> 2.0\text{ seconds}$.
       - Penalty: $+0.20$ fake probability.
       - Emitted Flag: `"synthetic_prosody_flatness"`.
     - **Composite Metric**: Baseline $0.15$ authentic score. If cumulative anomaly score $> 0.65$, prepends `"vocoder_synthetic_artifacts"`.

2. **`AudioDeepfakeDetector` (`backend/netra/pipeline/detectors/audio.py`, lines 162–512)**:
   - **Primary Pretrained Model**: `MelodyMachine/Deepfake-audio-detection-V2` (`Wav2Vec2ForSequenceClassification`).
     - Local directory check: `models/audio_pretrained` (contains `config.json` defining `id2label: {0: "fake", 1: "real"}`).
     - Remote HF check: downloads `MelodyMachine/Deepfake-audio-detection-V2` if internet connection exists.
     - Fallback: `SpectralAudioForensicsFallback` (lines 68–160).
   - **Waveform Speech Detection Gate (lines 269–352)**:
     - Analyzes raw PCM waveform *prior* to neural inference.
     - Computes: RMS energy, peak amplitude, 20ms ZCR variance, high-frequency energy ratio ($>1\text{ kHz}$), and temporal active frame fraction (`active_frame_fraction` above `SPEECH_FLOOR = 0.005`).
     - If human speech is absent: returns immediately with `fake_probability = 0.0`, `flags = ["no_deepfake_models_run"]`, `has_speech = False`, skipping neural model.
   - **Temporal Segmentation**: Slices audio into 5-second chunks (`16000 * 5` samples), running chunk inference and logging start/end seconds and scores.
   - **Dual-Model Cross-Validation & Calibration (lines 386–405)**:
     - Compares neural `global_score` with physical `spectral_score`:
       - If `global_score > 0.70` and `spectral_score <= 0.35` (common when laptop mic reverberation causes out-of-domain Wav2Vec2 false positives): recalibrates as $0.25 \times \text{global} + 0.75 \times \text{spectral}$.
       - If `global_score <= 0.30`: retains `global_score`.
       - Otherwise: blends $50/50$.
     - Temporal inconsistency check: if $\max(\text{scores}) - \min(\text{scores}) > 0.35$, emits `"temporal_audio_inconsistency"`.

---

### 1.3 Tavily Voice Clone Threat Intelligence Integration
- Located in `backend/netra/services/tavily_cross_check.py`:
  - `cross_check_scam_with_tavily(text, iocs, timeout_sec)`:
  - Invoked from `backend/api/routes/audio_detect.py` line 208 with:
    ```python
    tavily_intel = cross_check_scam_with_tavily(
        text="deepfake voice clone impersonation scam police India",
        timeout_sec=2.5
    )
    ```
  - Constructed query: `query = "deepfake voice clone impersonation scam police India cyber crime scam police advisory India"`.
  - Non-blocking HTTP POST to `https://api.tavily.com/search` with `topic="news"`, `max_results=3`.
  - Returns structure:
    ```json
    {
      "verified_threat": true,
      "query_used": "...",
      "matches_count": 2,
      "articles": [
        {
          "title": "Delhi Police issues advisory on AI voice cloning extortion",
          "url": "https://...",
          "snippet": "...",
          "published_date": "2026-..."
        }
      ],
      "intel_summary": "Tavily matched 2 active cyber alert(s) across Indian press relating to this vector."
    }
    ```

---

### 1.4 Frontend UI Components (`MultiModalForensicScanner.tsx` & `reported/page.tsx`)

1. **`MultiModalForensicScanner.tsx` (`frontend/components/sandbox/MultiModalForensicScanner.tsx`)**:
   - `activeModality === "audio"` sends files via `multipart/form-data` to `/api/backend/api/v1/detect/audio` (lines 236–260).
   - Audio results view (lines 647–738):
     - Renders header with verdict (e.g. `VOICE CLONE DETECTED`), source platform, and duration (`4.2s Audio`).
     - Renders status pill with confidence (`85% Voice Clone Anomaly`).
     - Renders acoustic spectral tags with `Mic` icon (`flags.map(...)`).
     - Renders Tavily Live Voice Clone News Advisories if `verified_threat` is true.
     - **Observed Deficiencies**:
       - **No Audio Player**: The scan result card has **zero `<audio>` playback player**; the user cannot listen back to the uploaded voice note in the results state!
       - **No Telemetry Breakdown**: Does not show sample rate (16 kHz), codec, bit depth, Wiener entropy value, HF cutoff frequency, or pitch variance.
       - **Incomplete PDF Dispatch**: `handleDownloadAudioPDF()` (lines 347–364) passes generic parameters to `generateForensicPDF()`.

2. **`reported/page.tsx` (`frontend/app/reported/page.tsx`)**:
   - Filter tab: `{ id: "audio_clone", label: "Audio" }` (line 128).
   - Media badge: `case "audio_clone": return { label: "Audio Clone", icon: Mic, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };` (lines 138–140).
   - Catalog Grid Card (lines 332–339):
     - Renders a static placeholder box: `<div className="p-3 rounded-xl bg-inset border border-line flex items-center gap-3"><Volume2 /> Playable Audio Intercept</div>`.
     - **Does NOT render an inline HTML5 audio player** on the catalog card itself (unlike video which has `ResilientVideoPlayer`).
   - Detail Slide-Over Modal (lines 424–432):
     - Contains an `<audio src={...} controls className="w-full" />` player when `activeItem.media_url` is populated.
     - "Download Forensic Evidence PDF" button (lines 476–495) invokes client-side `generateForensicPDF()`, but passes generic parameters without `mediaType: 'audio'`, without acoustic spectral metrics, and **without a button to download the backend ReportLab FIR PDF** from `/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`.

---

### 1.5 PDF Report Generators & Legal Standards

1. **Client-Side Generator (`frontend/lib/pdfReportGenerator.ts`)**:
   - Employs `jsPDF`.
   - Hardcoded for video deepfakes:
     - Section 1 is a fixed 4-row scorecard: GenD Foundation (ViT-L/14), Spatial SBI (EfficientNet-B4), Audio Deepfake (Wav2Vec2), Auxiliary Spectral Forensics (2D-DCT).
     - Section 3 renders video keyframe bounding box crops (`keyframeSnapshots`).
     - Section 4 renders sampled video frames table (`frames`).
   - **Zero branching for `type === "audio_clone"` or `type === "image_deepfake"`**. An audio scan produces a video report template with blank keyframe boxes.

2. **Backend FIR Exporter (`backend/api/routes/threat_intel.py`, lines 211–448)**:
   - Endpoint: `GET /threat-intelligence/{threat_id}/fir-pdf`.
   - Uses `ReportLab` (`SimpleDocTemplate`).
   - Section 2 is hardcoded: `"2. Flagged Forensic Keyframe Visual Evidence (Anomaly Localization)"` looking for `iocs.get("keyframe_snapshots")`.
   - If missing, it builds a fallback generic card.
   - **Zero specialized formatting for `item["type"] == "audio_clone"`**: lacks audio duration telemetry, sample rate/codec verification, vocoder spectral flatness metrics, Wav2Vec2 vs DSP scorecard, and specialized Indian Evidence Act Section 65B audio certificate clauses.

3. **Statutory Legal Compliance Baseline (from `backend/api/routes/jobs.py` and `threat_intel.py`)**:
   - Section 65B Indian Evidence Act 1872 / Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023: Conditions for admissibility of electronic records (tamper-evident hash non-repudiation).
   - Information Technology Act 2000 — Section 66D: Cheating by personation using computer resource / synthetic voice cloning.
   - Bharatiya Nyaya Sanhita 2023 — Section 318(4): Cheating and dishonestly inducing delivery of property.
   - National Cyber Crime Reporting Portal (`cybercrime.gov.in`) and 1930 Helpline directives.

---

## 2. Logic Chain

```
Observation 1.1: Audio route /api/v1/detect/audio processes files via PureSpectralAudioForensics and optional Wav2Vec2.
      │
      ├─► Finding 1: Line 231 has `file_bytes=audio_bytes` (NameError).
      │   Consequence: Audio scans crash during auto-cataloging and never write to media/uploads/.
      │
      ├─► Finding 2: Response model AudioDetectResponse lacks container/codec, sample rate,
      │   bit depth, SHA-256 hash, and raw acoustic metrics (Wiener entropy, HF cutoff ratio).
      │   Consequence: Downstream consumers (UI, PDF generators) lack essential forensic evidence.
      ▼
Observation 1.4 & 1.5: MultiModalForensicScanner and reported/page.tsx render audio results.
      │
      ├─► Finding 3: MultiModalForensicScanner results card lacks an HTML5 audio player.
      │   Consequence: User cannot review audio waveform or listen to the voice note.
      │
      ├─► Finding 4: reported/page.tsx card grid displays a static box with no inline player.
      │   Consequence: Violates directive for playable previews on catalog cards.
      │
      ├─► Finding 5: Both frontend pdfReportGenerator.ts and backend threat_intel.py fir-pdf
      │   contain hardcoded video templates (GenD, SBI, visual keyframe crops).
      │   Consequence: Downloading an audio FIR PDF generates video keyframe placeholders.
      ▼
Conclusion: Comprehensive audio forensics data model and dual-channel PDF generator
overhaul required to establish complete parity, valid auto-cataloging, and court admissibility.
```

---

## 3. Caveats

1. **Pure Python vs FFmpeg / Librosa in API Container**:
   - `decode_audio_bytes_pure` in `audio_detect.py` handles uncompressed PCM WAV natively using Python's standard `wave` library.
   - For compressed formats (`.mp3`, `.ogg`, `.opus`, `.m4a`), the fallback uses raw byte sampling unless FFmpeg or PyAV is available.
   - In production environments where FFmpeg is installed, calling `ffmpeg` (or `soundfile`) yields exact decoded PCM, sample rate, and codec headers.
2. **Local vs Remote Model Checkpoints**:
   - If `MelodyMachine/Deepfake-audio-detection-V2` weights cannot be fetched due to network restrictions, `AudioDeepfakeDetector` and `audio_detect.py` gracefully fall back to `PureSpectralAudioForensics`. Both branches must be accounted for in the scorecard data structure.
3. **Database Purge Rule**:
   - `backend/api/db.py` contains exclusion rules (`id NOT LIKE 'SCAN-%' AND title NOT LIKE '%Analysis:%'`). Audio catalog entries must use clean prefixes (e.g. `AUD-...` or `CASE-AUD-...`) and descriptive incident titles so they are not filtered out.

---

## 4. Conclusion & Complete Architecture Specification

To satisfy all user requirements and legal standards across backend, frontend, and court-admissible PDF generation, the following architectural data models and component designs must be implemented:

### 4.1 Enhanced Audio Forensics Media Data Model

The response models in `backend/api/routes/audio_detect.py` and `frontend/components/sandbox/MultiModalForensicScanner.tsx` must be upgraded to include comprehensive acoustic telemetry:

```typescript
export interface AudioForensicTelemetry {
  duration_seconds: number;
  sample_rate_hz: number;
  channels: number; // 1 = mono, 2 = stereo
  bit_depth: number; // e.g. 16, 24, 32
  codec: string; // "PCM", "OPUS", "AAC", "MP3"
  file_format: string;
  sha256_hash: string; // Cryptographic chain of custody
  active_speech_ratio: number; // 0.0 - 1.0 (VAD speech fraction)
  rms_energy: number;
  peak_amplitude: number;
}

export interface AcousticSpectralMetrics {
  spectral_flatness_wiener: number; // Wiener entropy: >0.35 indicates neural vocoder
  hf_energy_ratio_4khz: number; // Energy >4kHz: <0.02 or >0.45 indicates vocoder cutoff/hiss
  zcr_variance: number; // Pitch jitter / vocal fold modulation variance
  rms_prosody_variance: number; // Unnatural micro-prosody flatness: <0.20
  vocoder_phase_distortion_index: number; // Phase harmonic discontinuity index (0-100)
}

export interface AudioDetectorScorecard {
  wav2vec2_score: number | null; // MelodyMachine neural classification
  spectral_dsp_score: number; // PureSpectralAudioForensics Wiener/STFT score
  hf_cutoff_score: number; // Frequency boundary anomaly
  prosody_flatness_score: number; // Prosodic dynamics anomaly
  f0_jitter_score: number; // Pitch discontinuity anomaly
}

export interface AudioDossierResult {
  is_fake: boolean;
  fake_probability: number;
  confidence: number;
  verdict: "VOICE_CLONE_DETECTED" | "SUSPICIOUS_ACOUSTIC_SIGNATURE" | "AUTHENTIC_SPEECH";
  risk_level: "CRITICAL" | "HIGH" | "LOW";
  speech_duration_seconds: number;
  flags: string[];
  processing_time_ms: number;
  source_platform: string;
  telemetry: AudioForensicTelemetry;
  acoustic_metrics: AcousticSpectralMetrics;
  scorecard: AudioDetectorScorecard;
  media_url?: string;
  tavily_threat_intel?: {
    verified_threat: boolean;
    query_used?: string;
    matches_count: number;
    articles: Array<{ title: string; url: string; snippet?: string; published_date?: string }>;
    intel_summary: string;
  } | null;
}
```

---

### 4.2 Fix for Auto-Catalog Ingestion Hook in `backend/api/routes/audio_detect.py`

In `backend/api/routes/audio_detect.py`, line 231 must be corrected from `file_bytes=audio_bytes` to `file_bytes=contents`:
```python
# Correction in backend/api/routes/audio_detect.py (line 231)
auto_catalog_scan(
    scan_type="audio",
    result={
        "fake_probability": score,
        "verdict": verdict,
        "risk_level": risk_level,
        "extracted_iocs": {
            "duration_seconds": round(duration, 2),
            "sample_rate": sr,
            "codec": ext.replace(".", "").upper(),
            "sha256": sha256_hash,
            "acoustic_flags": flags,
            "acoustic_metrics": acoustic_metrics,
            "scorecard": scorecard,
        },
        "incident_summary": f"Voice recording ({round(duration, 1)}s, {ext.upper()}) analyzed for synthetic vocoder phase and spectral flatness anomalies. Verdict: {verdict} ({confidence}% Anomaly Index)."
    },
    file_bytes=contents,  # FIXED: was undefined audio_bytes
    filename=filename,
    request=request,
    explicit_job_id=f"AUD-{uuid.uuid4().hex[:8].upper()}"  # Prevents SCAN-% purge filter in db.py
)
```

---

### 4.3 Frontend UI Enhancements

1. **`MultiModalForensicScanner.tsx` (Audio Results Card)**:
   - **Playable Audio Player**: Embed `<audio src={mediaUrl || audioBlobUrl} controls className="w-full h-10 rounded-lg bg-surface border border-line" />` directly in the header of the result card.
   - **Acoustic Scorecard Matrix**: Render a 4-bar diagnostic meter:
     - Wav2Vec2 Neural Latent Prob ($0\text{--}100\%$)
     - Spectral Flatness / Wiener Entropy ($0\text{--}100\%$)
     - High-Frequency Cutoff Rolloff ($0\text{--}100\%$)
     - Prosodic Dynamic Variance ($0\text{--}100\%$)
   - **Audio Telemetry Badge Grid**: Duration, Sample Rate (16 kHz), Channels (Mono), Codec (e.g. WAV/OPUS), SHA-256 Checksum prefix.
   - **1-Click Download Button**: Calls updated `generateForensicPDF` with full audio payload.

2. **`reported/page.tsx` (Catalog Grid & Slide-Over Modal)**:
   - **Playable Audio in Grid Card**: Replace static placeholder box with an inline `<audio controls className="w-full h-9" />` player or mini-player widget so catalog visitors can play voice clone intercepts without opening the modal.
   - **Dual PDF Export in Detail Modal**:
     - Button 1: "Download Court Evidence PDF" (Client-side jsPDF).
     - Button 2: "Download Cybercrime FIR PDF" (`/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`).

---

### 4.4 Dual-Engine Forensic PDF Architecture (Audio Voice Clone Specification)

Both `frontend/lib/pdfReportGenerator.ts` (jsPDF) and `backend/api/routes/threat_intel.py` (ReportLab) must implement a dedicated branch for `type === "audio_clone"` / `mediaType === "audio"` adhering to Section 65B Indian Evidence Act 1872 / Section 63 BSA 2023:

```
┌────────────────────────────────────────────────────────────────────────┐
│ NETRA FORENSIC AI — OFFICIAL CYBER EVIDENCE DOSSIER (AUDIO CLONE)     │
│ Statutory Certificate under Sec 65B Indian Evidence Act / Sec 63 BSA   │
├────────────────────────────────────────────────────────────────────────┤
│ Case Reference ID: AUD-XXXXX       | Date: YYYY-MM-DD HH:MM:SS UTC    │
│ Official Verdict: VOICE CLONE DETECTED (CRITICAL RISK, 92% Anomaly)    │
│ SHA-256 Non-Repudiation Hash: 7b83f...a291                             │
│ Origin / Network Intercept: National Telecom Intercept / Carrier Node  │
├────────────────────────────────────────────────────────────────────────┤
│ 1. AUDIO CONTAINER & ACOUSTIC TELEMETRY                                │
│ • Duration: 6.42s          • Sample Rate: 16,000 Hz   • Channels: Mono │
│ • Codec: OGG / OPUS        • Bit Depth: 16-bit PCM    • VAD: 88.4%     │
│ • Peak Amplitude: -1.2 dB  • RMS Energy: 0.0421       • Format: Voice  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. MULTI-DETECTOR VOICE CLONE SCORECARD & LATENT TELEMETRY            │
│ Detector Subsystem                     Score    Diagnostic Telemetry   │
│ ─────────────────────────────────────  ─────    ─────────────────────  │
│ Wav2Vec2 Pretrained Neural Model        91%     MelodyMachine V2       │
│ Physical Acoustic Wiener Entropy DSP    88%     Flat noise floor       │
│ High-Frequency Vocoder Roll-off         84%     Steep cutoff >4kHz     │
│ Micro-Prosody Dynamics Variance         79%     Monotone F0 flatness   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ACOUSTIC SPECTRAL FORENSIC ANOMALY BREAKDOWN                        │
│ • [FLAGGED] vocoder_spectral_flatness_anomaly (Wiener Entropy = 0.382) │
│ • [FLAGGED] high_frequency_vocoder_cutoff (HF Ratio = 0.014 < 0.02)   │
│ • [FLAGGED] synthetic_prosody_flatness (RMS Variance = 0.142 < 0.20)  │
├────────────────────────────────────────────────────────────────────────┤
│ 4. TAVILY LIVE VOICE CLONE SCAM ADVISORIES (ACTIVE POLICE BULLETINS)  │
│ • Delhi Police Cyber Advisory on AI Voice Cloning Extortion            │
│   Source: https://cybercrime.gov.in/advisories/voice-clone-2026        │
├────────────────────────────────────────────────────────────────────────┤
│ 5. STATUTORY LEGAL PROVISIONS (INDIAN CYBER LAW)                       │
│ • Sec 65B Indian Evidence Act 1872 / Sec 63 BSA 2023: Non-repudiation  │
│ • IT Act 2000 Sec 66D: Cheating by personation using computer resource │
│ • BNS 2023 Sec 318(4): Cheating and dishonestly inducing property      │
│ • Reporting Guidance: Escalation to Cyber Crime Helpline 1930 / I4C    │
├────────────────────────────────────────────────────────────────────────┤
│ [SEAL] Digitally Verified by NETRA Autonomous Forensic Engine          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Method

To verify the findings and confirm subsequent implementations independently:

1. **Verify Line 231 NameError in `audio_detect.py`**:
   - Inspect lines 215–235 of `backend/api/routes/audio_detect.py`.
   - Run Python syntax/import test:
     ```bash
     python3 -c "from backend.api.routes import audio_detect; print('Import succeeded')"
     ```
   - Search for variable declaration:
     ```bash
     rg -n "audio_bytes" backend/api/routes/audio_detect.py
     ```
     Confirms `audio_bytes` is referenced only at line 231 without prior definition.

2. **Verify Speech Detection Gate & Models**:
   - Inspect `backend/netra/pipeline/detectors/audio.py` lines 269–352 and 386–405.
   - Run detector unit test via Python:
     ```bash
     python3 -c "from backend.netra.pipeline.detectors.audio import SpectralAudioForensicsFallback; import numpy as np; score, flags = SpectralAudioForensicsFallback.analyze_audio(np.random.randn(32000).astype(np.float32), 16000); print(f'Score: {score}, Flags: {flags}')"
     ```

3. **Verify Catalog Query Filtering**:
   - Inspect `backend/api/db.py` lines 366–379 and 385–401.
   - Query catalog for `media_type=audio`:
     ```bash
     python3 -c "from backend.api.db import get_threat_catalog; items = get_threat_catalog(media_type='audio'); print(f'Audio items count: {len(items)}')"
     ```

4. **Verify Frontend UI & PDF Generator Compilation**:
   - Check `MultiModalForensicScanner.tsx` lines 347–364 and lines 647–738.
   - Check `reported/page.tsx` lines 332–339 and 424–432.
   - Check `frontend/lib/pdfReportGenerator.ts` lines 142–168.
   - Execute TypeScript compiler check:
     ```bash
     cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend && npm run build
     ```
