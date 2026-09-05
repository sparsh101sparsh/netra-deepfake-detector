"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Scan, RefreshCw, Sparkles, Phone, CreditCard, Link2, Box, 
  Check, Copy, ShieldAlert, FileText, Send, AlertTriangle, ArrowRight, Zap, Play, CheckCircle2,
  Mic, Volume2, Globe, ExternalLink, Download, Eye
} from "lucide-react";
import { CyberIcon, CyberIconType } from "@/components/CyberIcons";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { StatusPill, StatusPillTone } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
import { StreamText } from "@/components/primitives/StreamText";
import { ThinkingState } from "@/components/primitives/ThinkingState";
import { DropZone, SandboxModality } from "./DropZone";
import { OCRDossier, OCRDossierResult } from "./OCRDossier";
import { FacialAnomalyCard, FacialDeepfakeCard, DualBranchResult } from "./FacialAnomalyCard";
import { generateForensicPDF } from "@/lib/pdfReportGenerator";
import { cn } from "@/lib/utils";

export type ScannerModality = "video" | "image" | "audio" | "text";

const MODALITIES: readonly ScannerModality[] = ["video", "image", "audio", "text"];

export interface AudioDossierResult {
  is_fake: boolean;
  fake_probability: number;
  confidence: number;
  verdict: string;
  risk_level: string;
  speech_duration_seconds: number;
  flags: string[];
  processing_time_ms: number;
  source_platform: string;
  tavily_threat_intel?: {
    verified_threat: boolean;
    query_used?: string;
    matches_count: number;
    articles: Array<{ title: string; url: string; snippet?: string }>;
    intel_summary: string;
  } | null;
}

export interface MultiModalScannerProps {
  onScanComplete?: (result: any) => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HybridDossier: Shown when analysis_mode === "hybrid"
// Renders both Facial Deepfake Inspection + OCR Scam Dossier in a segmented tab view
// ─────────────────────────────────────────────────────────────────────────────
function HybridDossier({
  data,
  onReset,
  clientPreviewUrl,
}: {
  data: DualBranchResult;
  onReset: () => void;
  clientPreviewUrl?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"face" | "text">("face");
  const faceCount = data.facial_analysis?.face_count ?? (data.facial_analysis?.faces?.length ?? 0);
  const totalIOCs =
    (data.extracted_iocs?.phones?.length ?? 0) +
    (data.extracted_iocs?.upis?.length ?? 0) +
    (data.extracted_iocs?.urls?.length ?? 0) +
    (data.extracted_iocs?.apks?.length ?? 0);

  const hasFacialData = faceCount > 0;
  const hasTextData =
    (data.ocr_analysis?.lines_count ?? 0) > 0 ||
    (data.scam_analysis?.risk_score ?? 0) > 0 ||
    totalIOCs > 0;

  const compositeScore = data.composite_risk_score ?? 0;
  const compositeLevel = data.composite_risk_level ?? "LOW";
  const scoreTone = compositeScore >= 75 ? "critical" : compositeScore >= 40 ? "orange" : "active";

  const handleExportPDF = () => {
    generateForensicPDF({
      id: data.scan_id || `HYB-${Date.now().toString(36).toUpperCase()}`,
      title: "Hybrid Multi-Vector Forensic Investigation Dossier",
      verdict: data.composite_verdict || "HYBRID FACIAL DEEPFAKE & DOCUMENT SCAM DETECTED",
      confidence: compositeScore,
      riskLevel: compositeLevel,
      mediaType: "image_hybrid",
      city: (data as any)?.city || "New Delhi",
      state: (data as any)?.state || "Delhi",
      lat: (data as any)?.lat ?? 28.6139,
      lng: (data as any)?.lng ?? 77.2090,
      locationSource: (data as any)?.location_source || "MULTI_VECTOR_HYBRID_ANALYSIS",
      facialAnalysis: {
        faceCount: data.facial_analysis?.face_count,
        compositeVerdict: data.facial_analysis?.composite_face_verdict,
        maxFakeProbability: data.facial_analysis?.max_fake_probability,
        annotatedPreviewBase64: data.facial_analysis?.annotated_preview_base64 || undefined,
        annotatedPreviewUrl: data.facial_analysis?.annotated_preview_url || undefined,
        faces: data.facial_analysis?.faces?.map((f, idx) => ({
          faceId: f.face_id || `face_${idx + 1}`,
          fakeProbability: f.fake_probability,
          verdict: f.verdict,
          bbox: f.bbox,
          anomalyRegion: f.anomaly_region,
          evidenceCode: f.evidence_code,
        })),
      },
      ocrAnalysis: {
        engine: data.ocr_analysis?.engine,
        fullText: data.ocr_analysis?.full_text,
        linesCount: data.ocr_analysis?.lines_count,
      },
      scamAnalysis: {
        isScam: data.scam_analysis?.is_scam,
        riskScore: data.scam_analysis?.risk_score,
        riskLevel: data.scam_analysis?.risk_level,
        matchedRules: data.scam_analysis?.matched_rules,
        analysisReason: data.scam_analysis?.analysis_reason,
      },
      iocs: {
        phones: data.extracted_iocs?.phones,
        upis: data.extracted_iocs?.upis,
        urls: data.extracted_iocs?.urls,
        apks: data.extracted_iocs?.apks,
      },
      tavilyMatches: data.tavily_threat_intel?.articles,
      summary: `Composite risk: ${compositeScore}% (${compositeLevel}). Analyzed ${faceCount} face(s) and ${totalIOCs} IOC(s).`,
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Unified Hero Verdict Header ── */}
      <div className="rounded-xl border border-line bg-surface/60 p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg border border-line bg-inset flex items-center justify-center shrink-0 text-ink-2">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-ink">
                {data.composite_verdict || "Hybrid Multi-Vector Threat Detected"}
              </h3>
              <div className="text-[10.5px] text-ink-3 font-mono mt-0.5">
                Dual-Branch Pipeline: {faceCount} Subject(s) · {totalIOCs} Threat IOC(s)
                {data.scan_id && <span> · {data.scan_id}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-line bg-inset text-ink-2 font-medium">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  compositeScore >= 75 ? "bg-red-400" : "bg-zinc-400"
                )}
              />
              {compositeScore}% Risk · {compositeLevel}
            </span>
          </div>
        </div>

        {data.recommendation && (
          <p className="text-[11px] text-ink-3 leading-relaxed pt-2 border-t border-line/50">
            {data.recommendation}
          </p>
        )}
      </div>

      {/* ── Segmented Tab Switcher ── */}
      <div className="flex items-center gap-1 bg-inset/80 rounded-xl p-1 border border-line">
        <button
          type="button"
          onClick={() => setActiveTab("face")}
          className={cn(
            "flex-1 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "face"
              ? "bg-surface text-ink border border-line shadow-sm"
              : "text-ink-3 hover:text-ink"
          )}
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-ink-2" />
            <span>Facial Deepfake Analysis</span>
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/5 text-ink-3">
            {faceCount} Face{faceCount !== 1 ? "s" : ""}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("text")}
          className={cn(
            "flex-1 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "text"
              ? "bg-surface text-ink border border-line shadow-sm"
              : "text-ink-3 hover:text-ink"
          )}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-ink-2" />
            <span>Text Scam Intelligence</span>
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/5 text-ink-3">
            {totalIOCs} IOC{totalIOCs !== 1 ? "s" : ""}
          </span>
        </button>
      </div>

      {/* ── Active Tab Content (Embedded) ── */}
      {activeTab === "face" && hasFacialData && (
        <FacialAnomalyCard
          data={data}
          embedded={true}
          clientPreviewUrl={clientPreviewUrl}
        />
      )}
      {activeTab === "text" && hasTextData && (
        <OCRDossier
          data={data as OCRDossierResult}
          embedded={true}
        />
      )}

      {/* ── Single Unified Action Footer ── */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Scan Another Image
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportPDF}
          className="gap-1.5 text-xs font-mono"
        >
          <Download className="w-3.5 h-3.5 text-accent" />
          Download Court Evidence PDF
        </Button>
      </div>
    </div>
  );
}

async function optimizeImageForUpload(file: File, maxDim = 1280, quality = 0.88): Promise<File | Blob> {
  if (typeof window === "undefined" || !file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 800 * 1024) {
        resolve(file);
        return;
      }
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimized = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(optimized);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function MultiModalForensicScanner({ onScanComplete, className }: MultiModalScannerProps) {
  const router = useRouter();
  const [activeModality, setActiveModality] = useState<ScannerModality>("video");

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const [clientPreviewUrl, setClientPreviewUrl] = useState<string | null>(null);

  // Result States for Non-Redirecting Modalities
  const [imageOcrResult, setImageOcrResult] = useState<DualBranchResult | null>(null);
  const [audioResult, setAudioResult] = useState<AudioDossierResult | null>(null);

  // Text Threat Triage State
  const [rawText, setRawText] = useState("");
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [textResult, setTextResult] = useState<{
    is_scam: boolean;
    risk_score: number;
    confidence: number;
    verdict: string;
    scam_type?: string | null;
    matched_rules: string[];
    analysis_reason?: string;
    llm_reason?: string | null;
    extracted_iocs: {
      phones: string[];
      upis: string[];
      urls: string[];
      apks: string[];
    };
    tavily_threat_intel?: {
      verified_threat: boolean;
      matches_count: number;
      articles: Array<{ title: string; url: string; snippet?: string }>;
      intel_summary: string;
    } | null;
  } | null>(null);
  const [copiedIocKey, setCopiedIocKey] = useState<string | null>(null);

  // Extract client-side IOCs helper
  const extractClientIOCs = (text: string) => {
    const phones = Array.from(new Set(text.match(/(?:(?:\+91[\-\s]?)?[6-9]\d{9})/g) || []));
    const upis = Array.from(new Set(text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || []));
    const urls = Array.from(new Set(text.match(/https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|t\.me\/[^\s<>"]+/g) || []));
    const apks = Array.from(new Set(text.match(/[\w\-]+\.apk/gi) || []));
    return { phones, upis, urls, apks };
  };

  // Handle File Upload for Video / Image / Audio
  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploadError(null);
      setImageOcrResult(null);
      setAudioResult(null);
      setIsUploading(true);
      setUploadProgress(0);
      setLastSelectedFile(file);

      if (file.type.startsWith("image/")) {
        try {
          const url = URL.createObjectURL(file);
          setClientPreviewUrl(url);
        } catch {}
      }

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 88) return prev + 12;
          if (prev < 98) return prev + 1;
          return 98;
        });
      }, 150);

      const formData = new FormData();
      formData.append("file", file);

      // ── 1. IMAGE MODALITY: Route to PaddleOCR + Scam Engine ──
      if (activeModality === "image") {
        try {
          const optimizedFile = await optimizeImageForUpload(file);
          const uploadFormData = new FormData();
          uploadFormData.append("file", optimizedFile);

          const endpoints = [
            "/api/backend/api/v1/detect/image-ocr",
            "/api/v1/detect/image-ocr"
          ];

          let res: Response | null = null;
          let lastStatus = 0;
          let lastErr = "";

          for (let attempt = 0; attempt < 2; attempt++) {
            for (const ep of endpoints) {
              try {
                const r = await fetch(ep, {
                  method: "POST",
                  body: uploadFormData,
                });
                if (r.ok) {
                  res = r;
                  break;
                }
                lastStatus = r.status;
                if (r.status === 502 || r.status === 503 || r.status === 504) {
                  // Cold start: wait 1.2s and retry
                  await new Promise((resolve) => setTimeout(resolve, 1200));
                }
              } catch (fetchErr: any) {
                lastErr = fetchErr?.message || "";
              }
            }
            if (res && res.ok) break;
          }

          if (res && res.ok) {
            const initialData = await res.json();

            // Handle asynchronous queued job polling via AWS /jobs/{job_id}
            if (
              initialData.job_id &&
              (initialData.status === "queued" ||
                initialData.status === "processing" ||
                (!initialData.analysis_mode && !initialData.composite_verdict))
            ) {
              const jobId = initialData.job_id;
              let isDone = false;
              let pollAttempts = 0;
              const maxPolls = 60; // 60 * 1.5s = 90s max

              while (!isDone && pollAttempts < maxPolls) {
                pollAttempts++;
                await new Promise((resolve) => setTimeout(resolve, 1500));

                let jobRes: Response | null = null;
                const pollEndpoints = [
                  `/api/backend/api/v1/jobs/${jobId}`,
                  `/api/v1/jobs/${jobId}`,
                ];
                for (const pEp of pollEndpoints) {
                  try {
                    const pr = await fetch(pEp);
                    if (pr.ok) {
                      jobRes = pr;
                      break;
                    }
                  } catch {}
                }

                if (jobRes && jobRes.ok) {
                  const jobData = await jobRes.json();
                  if (typeof jobData.progress === "number") {
                    setUploadProgress(Math.min(99, Math.max(15, jobData.progress)));
                  }
                  if (jobData.status === "complete") {
                    setUploadProgress(100);
                    clearInterval(progressInterval);
                    const finalResult = (jobData.result || jobData) as DualBranchResult;
                    setImageOcrResult(finalResult);
                    onScanComplete?.(finalResult);
                    isDone = true;
                    return;
                  } else if (jobData.status === "error") {
                    throw new Error(jobData.error || "Image forensic analysis failed.");
                  }
                }
              }

              if (!isDone) {
                throw new Error("Forensic job timed out. Please try again.");
              }
            } else {
              // Direct synchronous / completed response
              clearInterval(progressInterval);
              setUploadProgress(100);
              const data = initialData as DualBranchResult;
              setImageOcrResult(data);
              onScanComplete?.(data);
              return;
            }
          }

          let errMsg = lastStatus ? `OCR endpoint returned status ${lastStatus}` : (lastErr || "Forensic node unreachable");
          if (res) {
            try {
              const errData = await res.json();
              errMsg = errData.detail || errData.message || errMsg;
            } catch {
              try {
                const txt = await res.text();
                if (txt && txt.length < 200 && !txt.includes("<html")) errMsg = txt;
              } catch {}
            }
          }
          throw new Error(errMsg);
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

      // ── 2. AUDIO MODALITY: Route to Dedicated /detect/audio ──
      if (activeModality === "audio") {
        try {
          const res = await fetch("/api/backend/api/v1/detect/audio", {
            method: "POST",
            body: formData,
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          if (res.ok) {
            const data: AudioDossierResult = await res.json();
            setAudioResult(data);
            onScanComplete?.(data);
            return;
          }
          let errMsg = `Audio detection returned status ${res.status}`;
          try {
            const errData = await res.json();
            errMsg = errData.detail || errData.message || errMsg;
          } catch {
            try {
              const txt = await res.text();
              if (txt && txt.length < 200 && !txt.includes("<html")) errMsg = txt;
            } catch {}
          }
          throw new Error(errMsg);
        } catch (err: any) {
          clearInterval(progressInterval);
          console.warn("Audio detection error:", err);
          setUploadError(err?.message || "Audio voice clone analyzer failed. Verify audio file format.");
          setAudioResult(null);
        } finally {
          setIsUploading(false);
        }
        return;
      }

      // ── 3. VIDEO MODALITY: Route to /detect/full (GPU Queue) ──
      try {
        const candidateEndpoints = [
          "/api/backend/api/v1/detect/full",
          "/api/v1/detect/full",
          `${process.env.NEXT_PUBLIC_API_URL || "https://netra-api-pmr7.onrender.com"}/api/v1/detect/full`
        ];

        let res: Response | null = null;
        let lastStatus = 0;
        let lastErr = "";

        for (const ep of candidateEndpoints) {
          try {
            const r = await fetch(ep, {
              method: "POST",
              body: formData,
            });
            if (r.ok) {
              res = r;
              break;
            }
            lastStatus = r.status;
            if (r.status === 502 || r.status === 503 || r.status === 504) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (fetchErr: any) {
            lastErr = fetchErr?.message || "";
          }
        }

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (res && res.ok) {
          const data = await res.json();
          if (data.job_id) {
            setIsUploading(false);
            if (typeof window !== "undefined") {
              window.location.href = `/analyze/${data.job_id}`;
            } else {
              router.push(`/analyze/${data.job_id}`);
            }
            return;
          }
        }

        let errMsg = lastStatus ? `Detection engine returned status ${lastStatus}` : (lastErr || "Forensic pipeline node unreachable");
        if (res) {
          try {
            const errData = await res.json();
            errMsg = errData.detail || errData.message || errMsg;
          } catch {
            try {
              const txt = await res.text();
              if (txt && txt.length < 200 && !txt.includes("<html")) errMsg = txt;
            } catch {}
          }
        }
        throw new Error(errMsg);
      } catch (err: any) {
        clearInterval(progressInterval);
        console.warn("Video detection dispatch error:", err);
        setUploadError(err?.message || "Forensic pipeline node unreachable. Please ensure backend GPU worker is active.");
      } finally {
        setIsUploading(false);
      }
    },
    [activeModality, router, onScanComplete]
  );

  // ── 4. TEXT THREAT TRIAGE HANDLER ──
  const handleTextTriage = async () => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    setIsAnalyzingText(true);
    setTextResult(null);
    setUploadError(null);

    const iocs = extractClientIOCs(trimmed);

    try {
      const res = await fetch("/api/backend/api/v1/detect/scam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`Scam classifier returned ${res.status}`);
      }

      const data = await res.json();
      setTextResult({
        is_scam: data.is_scam,
        risk_score: data.risk_score,
        confidence: data.confidence,
        verdict: data.verdict,
        scam_type: data.scam_type,
        matched_rules: data.matched_rules || [],
        analysis_reason: data.analysis_reason || data.reason,
        llm_reason: data.llm_reason || data.reason,
        extracted_iocs: iocs,
        tavily_threat_intel: data.tavily_threat_intel,
      });

      onScanComplete?.(data);
    } catch (err: any) {
      console.warn("Text analysis failed:", err);
      setUploadError(err?.message || "Text classification node unreachable. Please retry.");
    } finally {
      setIsAnalyzingText(false);
    }
  };

  const handleCopyIoc = (val: string, key: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedIocKey(key);
    setTimeout(() => setCopiedIocKey(null), 1800);
  };

  const handleDownloadAudioPDF = () => {
    if (!audioResult) return;
    generateForensicPDF({
      id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      title: "Audio Deepfake & Voice Clone Verification Certificate",
      verdict: audioResult.verdict,
      confidence: audioResult.confidence,
      riskLevel: audioResult.risk_level,
      mediaType: "audio_clone",
      city: (audioResult as any)?.city || "Mumbai",
      state: (audioResult as any)?.state || "Maharashtra",
      lat: (audioResult as any)?.lat ?? 19.0760,
      lng: (audioResult as any)?.lng ?? 72.8777,
      locationSource: (audioResult as any)?.location_source || "TELECOM_NETWORK",
      scores: {
        audioScore: audioResult.fake_probability,
      },
      audioAnalysis: {
        speechDurationSeconds: audioResult.speech_duration_seconds,
        sampleRate: 16000,
        codec: "Opus/OGG 16kHz",
        spectralFlags: audioResult.flags,
        wav2vec2Score: audioResult.fake_probability,
        sourcePlatform: audioResult.source_platform,
      },
      summary: `Audio recording duration: ${audioResult.speech_duration_seconds}s. Acoustic spectral flags: ${audioResult.flags.join(", ")}.`,
      tavilyMatches: audioResult.tavily_threat_intel?.articles,
    });
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border-[1.5px] border-line p-5 sm:p-6",
        "flex flex-col justify-between shadow-card relative",
        className
      )}
    >
      {/* ── 1. HEADER & MODALITY SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border-[1.5px] border-accent/40 flex items-center justify-center text-accent">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink tracking-tight flex items-center gap-2">
              Multi-Modal Forensic Sandbox
            </h2>
            <p className="text-xs text-ink-3">
              Deepfake video, audio voice notes, image OCR, and text fraud verification
            </p>
          </div>
        </div>

        {/* Segmented Modality Selector */}
        <div className="self-start sm:self-auto">
          <SegmentedControl
            options={MODALITIES}
            value={activeModality}
            onChange={(mod) => {
              setActiveModality(mod);
              setUploadError(null);
              setImageOcrResult(null);
              setAudioResult(null);
              setClientPreviewUrl(null);
            }}
            renderOption={(opt) => {
              const iconMap: Record<ScannerModality, CyberIconType> = {
                video: "video",
                image: "image",
                audio: "audio",
                text: "document",
              };
              return (
                <span className="inline-flex items-center gap-1.5 uppercase font-semibold text-[11.5px]">
                  <CyberIcon name={iconMap[opt]} size={13} />
                  <span>{opt}</span>
                </span>
              );
            }}
          />
        </div>
      </div>

      {/* ── 2. MAIN WORKSPACE ── */}
      <div className="flex-1 flex flex-col justify-center space-y-4 pt-4">
        {activeModality === "text" ? (
          /* ── TEXT THREAT TRIAGE WORKSPACE ── */
          <div className="space-y-4 flex flex-col justify-center animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-ink flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-300" />
                  Paste suspicious SMS, WhatsApp message, or notice
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-ink-3">
                    {rawText.length} characters
                  </span>
                  <StatusPill tone="neutral" size="sm">
                    Tavily Sync Active
                  </StatusPill>
                </div>
              </div>

              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste suspicious message, WhatsApp forward, or threat notice here..."
                className={cn(
                  "w-full rounded-xl bg-canvas border-[1.5px] border-line p-4",
                  "text-xs sm:text-sm text-ink placeholder:text-ink-3 leading-relaxed",
                  "focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all",
                  "shadow-inset-field"
                )}
              />
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <div className="flex items-center gap-2">
                {rawText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRawText("");
                      setTextResult(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!rawText.trim() || isAnalyzingText}
                  onClick={handleTextTriage}
                  className="w-full sm:w-auto"
                >
                  {isAnalyzingText ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning ML & Tavily...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Analyze Threat
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* ── TEXT SCAN RESULTS & TAVILY INTEL ── */}
            {textResult && (
              <div className="rounded-xl bg-canvas border-[1.5px] border-line p-4 space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono uppercase font-bold text-[11px] text-accent">
                      {textResult.scam_type || "SUSPICIOUS_MESSAGE"}
                    </span>
                    <span className="text-[11px] text-ink-3">• AI Verified</span>
                  </div>

                  <StatusPill
                    tone={textResult.risk_score >= 75 ? "critical" : textResult.risk_score >= 40 ? "orange" : "active"}
                    size="sm"
                    pulse={textResult.is_scam}
                  >
                    {textResult.risk_score}% Risk • {textResult.is_scam ? "SCAM DETECTED" : "SAFE"}
                  </StatusPill>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="font-semibold text-xs text-ink">{textResult.verdict}</div>
                  {textResult.llm_reason && (
                    <div className="text-[12px] text-ink-2 leading-relaxed pt-1 bg-inset/60 p-3 rounded-lg border border-line">
                      <StreamText text={textResult.llm_reason} charsPerTick={3} tickMs={10} />
                    </div>
                  )}
                </div>

                {/* Tavily Live Threat Intelligence Cross-Check Alert */}
                {textResult.tavily_threat_intel?.verified_threat && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Tavily Live Threat Cross-Check Match
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {textResult.tavily_threat_intel.matches_count} Active Advisory
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {textResult.tavily_threat_intel.articles?.map((art, idx) => (
                        <a
                          key={idx}
                          href={art.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-2 rounded-lg bg-surface/80 border border-line hover:border-amber-500/40 transition-colors"
                        >
                          <div className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
                            <span>{art.title}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400 flex-shrink-0" />
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

                {/* Extracted Details Chips */}
                {textResult.extracted_iocs && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-ink-2">Extracted IOC Tokens:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {textResult.extracted_iocs.phones?.map((p) => (
                        <button
                          key={`txt-phone-${p}`}
                          type="button"
                          onClick={() => handleCopyIoc(p, `txt-phone-${p}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-red-tint border-[1.5px] border-red/30 px-2 py-0.5 text-[11px] font-mono text-red hover:bg-red/20 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{p}</span>
                          {copiedIocKey === `txt-phone-${p}` ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3 opacity-50" />}
                        </button>
                      ))}

                      {textResult.extracted_iocs.upis?.map((upi) => (
                        <button
                          key={`txt-upi-${upi}`}
                          type="button"
                          onClick={() => handleCopyIoc(upi, `txt-upi-${upi}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-orange-tint border-[1.5px] border-orange/30 px-2 py-0.5 text-[11px] font-mono text-orange hover:bg-orange/20 transition-colors"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>{upi}</span>
                          {copiedIocKey === `txt-upi-${upi}` ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3 opacity-50" />}
                        </button>
                      ))}

                      {textResult.extracted_iocs.urls?.map((url) => (
                        <button
                          key={`txt-url-${url}`}
                          type="button"
                          onClick={() => handleCopyIoc(url, `txt-url-${url}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-accent-tint border-[1.5px] border-accent/30 px-2 py-0.5 text-[11px] font-mono text-accent hover:bg-accent/20 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{url}</span>
                          {copiedIocKey === `txt-url-${url}` ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3 opacity-50" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeModality === "image" && imageOcrResult ? (
          /* ── IMAGE: ADAPTIVE DUAL-BRANCH VIEW ── */
          (() => {
            const mode = imageOcrResult.analysis_mode;
            const isPureFace = mode === "pure_face";
            const isDocument = mode === "document";
            const isHybrid = mode === "hybrid";

            const handleResetImage = () => {
              setImageOcrResult(null);
              setClientPreviewUrl(null);
            };

            if (isPureFace) {
              // Branch A: Facial anomaly & deepfake inspection card only
              return (
                <FacialAnomalyCard
                  data={imageOcrResult}
                  clientPreviewUrl={clientPreviewUrl}
                  onReset={handleResetImage}
                />
              );
            }

            if (isHybrid) {
              // Branch C: Hybrid — both detectors fired, show clean tabbed view
              return (
                <HybridDossier
                  data={imageOcrResult}
                  clientPreviewUrl={clientPreviewUrl}
                  onReset={handleResetImage}
                />
              );
            }

            // Branch B (document) or inconclusive — OCR Scam Dossier
            return (
              <OCRDossier
                data={imageOcrResult as OCRDossierResult}
                onReset={handleResetImage}
              />
            );
          })()
        ) : activeModality === "audio" && audioResult ? (
          /* ── DEDICATED AUDIO DEEPFAKE DOSSIER VIEW ── */
          <div className="rounded-xl bg-canvas border-[1.5px] border-line p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono uppercase font-bold text-xs text-ink block">
                    {audioResult.verdict.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {audioResult.source_platform} • {audioResult.speech_duration_seconds}s Audio
                  </span>
                </div>
              </div>

              <StatusPill
                tone={audioResult.is_fake ? "critical" : "active"}
                size="sm"
                pulse={audioResult.is_fake}
              >
                {audioResult.confidence}% Voice Clone Anomaly
              </StatusPill>
            </div>

            {/* Neural Acoustic Flags */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-ink-2">Acoustic Spectral Forensics:</span>
              <div className="flex flex-wrap gap-1.5">
                {audioResult.flags.map((flag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-md bg-inset border border-line px-2 py-0.5 text-[10.5px] font-mono text-ink-2"
                  >
                    <Mic className="w-3 h-3 text-accent" />
                    {flag}
                  </span>
                ))}
              </div>
            </div>


            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAudioResult(null)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Scan Another Voice Note
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadAudioPDF}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Court Evidence PDF
              </Button>
            </div>
          </div>
        ) : (
          /* ── VIDEO / AUDIO / IMAGE DROPZONE ── */
          <DropZone
            modality={activeModality as SandboxModality}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            error={uploadError}
            onFileSelect={handleFileSelect}
            onClearError={() => setUploadError(null)}
            onRetry={lastSelectedFile ? () => handleFileSelect(lastSelectedFile) : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default MultiModalForensicScanner;
