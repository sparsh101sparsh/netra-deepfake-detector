"use client";

import React, { useState } from "react";
import {
  Eye, Shield, ShieldAlert, AlertTriangle, RefreshCw,
  ChevronLeft, ChevronRight, Scan, Zap, CheckCircle2, XCircle, Activity,
  Download
} from "lucide-react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
import { generateForensicPDF } from "@/lib/pdfReportGenerator";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NeuralMetrics {
  sbi_artifact_level?: number;
  ocular_reflection_symmetry?: number;
  eyewear_specular_score?: number;
  lip_sync_laplacian_score?: number;
}

export interface FaceEntry {
  face_id: string;
  bbox: [number, number, number, number];
  normalized_bbox?: [number, number, number, number];
  fake_probability: number;
  verdict: "DEEPFAKE" | "SUSPICIOUS" | "AUTHENTIC" | string;
  risk_level: "CRITICAL" | "HIGH" | "SAFE" | string;
  flags: string[];
  anomaly_region?: string;
  evidence_code?: string;
  forensic_badge?: string;
  border_color_hex?: string;
  neural_metrics?: NeuralMetrics;
}

export interface FacialAnalysis {
  face_count: number;
  max_fake_probability: number;
  composite_face_verdict: "DEEPFAKE" | "SUSPICIOUS" | "AUTHENTIC" | "NO_FACES_DETECTED" | string;
  highest_risk_face_id?: string | null;
  annotated_preview_url?: string | null;
  annotated_preview_base64?: string | null;
  annotated_image_url?: string | null;
  annotated_image_preview?: string | null;
  faces: FaceEntry[];
}

export interface DualBranchResult {
  status?: string;
  scan_id?: string;
  filename?: string;
  analysis_mode?: "pure_face" | "document" | "hybrid" | "inconclusive" | string;
  routing_decision?: {
    char_count: number;
    face_count: number;
    selected_branch: string;
  };
  composite_risk_score?: number;
  composite_risk_level?: string;
  composite_verdict?: string;
  facial_analysis?: FacialAnalysis;
  ocr_analysis?: {
    engine?: string;
    full_text?: string;
    lines_count?: number;
    processing_time_ms?: number;
  };
  translation_analysis?: {
    has_indic_script?: boolean;
    detected_script?: string;
    detected_lang_code?: string;
    original_text?: string;
    translated_text?: string;
    translation_engine?: string;
    scam_terms_identified?: string[];
  };
  scam_analysis?: {
    is_scam?: boolean;
    risk_score?: number;
    risk_level?: string;
    verdict?: string;
    scam_type?: string;
    matched_rules?: string[];
    analysis_reason?: string;
  };
  extracted_iocs?: {
    phones?: string[];
    upis?: string[];
    urls?: string[];
    apks?: string[];
  };
  recommendation?: string;
  tavily_threat_intel?: any;
}

export interface FacialAnomalyCardProps {
  data: DualBranchResult;
  onReset?: () => void;
  className?: string;
  embedded?: boolean;
  clientPreviewUrl?: string | null;
}

export type FacialDeepfakeCardProps = FacialAnomalyCardProps;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pct(n: number | undefined): number {
  if (n === undefined || n === null) return 0;
  return Math.round(n * 100);
}

function riskTone(verdict: string): "critical" | "orange" | "active" | "neutral" {
  const v = verdict?.toUpperCase() ?? "";
  if (v === "DEEPFAKE" || v === "CRITICAL") return "critical";
  if (v === "SUSPICIOUS" || v === "HIGH") return "orange";
  if (v === "AUTHENTIC" || v === "SAFE") return "active";
  return "neutral";
}

function MetricBar({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const barPct = Math.min(100, Math.max(0, Math.round(value * 100)));
  const isHighDanger = danger && barPct >= 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="font-mono text-zinc-300 font-semibold">{barPct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 border border-line/40 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isHighDanger ? "bg-red-400/80" : "bg-zinc-400"
          )}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Annotated Image Preview with Normalized Bounding Box Overlays
// ─────────────────────────────────────────────────────────────────────────────

function InteractiveAnnotatedPreview({
  facial,
  activeFaceIdx,
  onSelectFace,
  clientPreviewUrl,
}: {
  facial: FacialAnalysis;
  activeFaceIdx: number;
  onSelectFace: (idx: number) => void;
  clientPreviewUrl?: string | null;
}) {
  const initialSrc =
    facial.annotated_preview_url ||
    facial.annotated_preview_base64 ||
    clientPreviewUrl ||
    facial.annotated_image_url ||
    facial.annotated_image_preview ||
    null;

  const [activeSrc, setActiveSrc] = useState<string | null>(initialSrc);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setActiveSrc(initialSrc);
    setHasError(false);
  }, [initialSrc]);

  const handleImgError = () => {
    if (clientPreviewUrl && activeSrc !== clientPreviewUrl) {
      setActiveSrc(clientPreviewUrl);
    } else {
      setHasError(true);
    }
  };

  const faces = facial.faces || [];
  if (!activeSrc || hasError) {
    return (
      <div className="rounded-xl overflow-hidden border border-line bg-inset/40 p-4 text-center space-y-1">
        <span className="text-xs text-ink-2 font-semibold flex items-center justify-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-accent" />
          Face ROI Detection Matrix
        </span>
        <p className="text-[11px] text-ink-3 font-mono">
          Biometric features verified across {facial.face_count} detected subject(s).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border-[1.5px] border-line bg-canvas">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-line bg-inset/40">
        <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-ink-3" />
          Interactive Forensic Face Inspector
        </span>
        <span className="text-[10.5px] font-mono text-ink-3">
          {facial.face_count} face{facial.face_count !== 1 ? "s" : ""} detected
        </span>
      </div>

      <div className="relative w-full flex items-center justify-center bg-black/60 overflow-hidden p-2.5 min-h-[160px]">
        {/* Rendered Image with tightly bound overlay wrapper */}
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeSrc}
            alt="Annotated forensic scan"
            onError={handleImgError}
            className="max-h-72 sm:max-h-80 max-w-full w-auto h-auto block rounded-lg object-contain shadow-md"
          />

          {/* Interactive Bounding Box Overlays */}
          {faces.map((face, idx) => {
            if (!face.normalized_bbox || face.normalized_bbox.length !== 4) return null;
            const [normX, normY, normW, normH] = face.normalized_bbox;
            const isActive = idx === activeFaceIdx;
            const isDeepfake = face.verdict === "DEEPFAKE";

            // Clean, minimal forensic boundary
            const borderColor = isActive
              ? "rgba(255, 255, 255, 0.9)"
              : isDeepfake
              ? "rgba(239, 68, 68, 0.7)"
              : "rgba(255, 255, 255, 0.4)";

            return (
              <button
                key={face.face_id || idx}
                type="button"
                onClick={() => onSelectFace(idx)}
                className={cn(
                  "absolute cursor-pointer transition-all duration-150 rounded-sm focus:outline-none group",
                  isActive
                    ? "ring-1 ring-white/80 shadow-md z-20"
                    : "hover:ring-1 hover:ring-white/50 opacity-80 hover:opacity-100 z-10"
                )}
                style={{
                  left: `${normX * 100}%`,
                  top: `${normY * 100}%`,
                  width: `${normW * 100}%`,
                  height: `${normH * 100}%`,
                  border: `1.5px solid ${borderColor}`,
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                }}
                title={`Click to inspect Face #${idx + 1} (${face.verdict} - ${Math.round((face.fake_probability ?? 0) * 100)}%)`}
              >
                <span
                  className={cn(
                    "absolute -top-5 left-0 px-1.5 py-0.5 text-[9px] font-mono text-white rounded bg-black/85 border border-white/20 shadow-sm whitespace-nowrap pointer-events-none transition-opacity",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  Face #{idx + 1}: {Math.round((face.fake_probability ?? 0) * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-Face Scorecard
// ─────────────────────────────────────────────────────────────────────────────

function FaceScorecard({ face }: { face: FaceEntry }) {
  const prob = face.fake_probability ?? 0;
  const isSynthetic = face.verdict !== "AUTHENTIC";
  const isDeepfake = face.verdict === "DEEPFAKE";

  const metrics = face.neural_metrics || {};
  const [x = 0, y = 0, w = 0, h = 0] = face.bbox ?? [0, 0, 0, 0];

  return (
    <div className="rounded-xl border-[1.5px] border-line bg-surface/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-ink-3" />
          <span className="font-mono font-bold text-xs uppercase text-ink">
            {String(face.face_id || "face").replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-line bg-inset text-ink-2">
          {face.verdict}
        </span>
      </div>

      {/* Fake Probability Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-3 font-medium">Synthetic Manipulation Probability</span>
          <span className="font-mono font-bold text-ink">{pct(prob)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-canvas border border-line/60 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              isDeepfake && prob >= 0.75 ? "bg-red-400/90" : "bg-zinc-300"
            )}
            style={{ width: `${pct(prob)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-ink-3 font-mono">
          <span>0% Authentic</span>
          <span>100% Synthetic</span>
        </div>
      </div>

      {/* Neural Metrics */}
      {Object.keys(metrics).length > 0 && (
        <div className="space-y-2 pt-2 border-t border-line/50">
          <span className="text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-ink-3" />
            Neural Forensic Telemetry
          </span>
          {metrics.sbi_artifact_level !== undefined && (
            <MetricBar label="NETRA Spatial Seam (SBI Artifact Level)" value={metrics.sbi_artifact_level} danger />
          )}
          {metrics.ocular_reflection_symmetry !== undefined && (
            <MetricBar label="Ocular Reflection Symmetry" value={metrics.ocular_reflection_symmetry} danger={false} />
          )}
          {metrics.eyewear_specular_score !== undefined && (
            <MetricBar label="Eyewear Specular Coherence" value={metrics.eyewear_specular_score / 100} danger={false} />
          )}
        </div>
      )}

      {/* Evidence Code + Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-line/50">
        {face.evidence_code && (
          <div>
            <div className="text-[9.5px] uppercase tracking-widest text-ink-3 mb-0.5">Evidence Code</div>
            <div className="font-mono text-[10.5px] text-ink truncate">{face.evidence_code}</div>
          </div>
        )}
        {face.anomaly_region && (
          <div>
            <div className="text-[9.5px] uppercase tracking-widest text-ink-3 mb-0.5">Anomaly Zone</div>
            <div className="font-mono text-[10.5px] text-ink truncate">{face.anomaly_region}</div>
          </div>
        )}
        <div>
          <div className="text-[9.5px] uppercase tracking-widest text-ink-3 mb-0.5">Bounding Box</div>
          <div className="font-mono text-[10px] text-ink-3">[{x}, {y}, {w}×{h}]</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-widest text-ink-3 mb-0.5">Risk Level</div>
          <div className="font-mono text-[10.5px] font-bold text-ink-2">{face.risk_level}</div>
        </div>
      </div>

      {/* Flags */}
      {face.flags && face.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line/50">
          {face.flags.map((flag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-canvas border border-line px-2 py-0.5 text-[10px] font-mono text-ink-2"
            >
              <Zap className="w-2.5 h-2.5 text-ink-3" />
              {typeof flag === "string" ? flag.replace(/_/g, " ") : String(flag)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: FacialAnomalyCard
// ─────────────────────────────────────────────────────────────────────────────

export function FacialAnomalyCard({ data, onReset, className, embedded, clientPreviewUrl }: FacialAnomalyCardProps) {
  const facial = data.facial_analysis;
  const [activeFaceIdx, setActiveFaceIdx] = useState(0);

  if (!facial || facial.face_count === 0) return null;

  const faces = facial.faces || [];
  const activeF = faces[activeFaceIdx] ?? faces[0];
  const compositeVerdict = facial.composite_face_verdict ?? "AUTHENTIC";
  const maxProb = facial.max_fake_probability ?? 0;
  const isSynthetic = compositeVerdict !== "AUTHENTIC" && compositeVerdict !== "NO_FACES_DETECTED";
  const isDeepfake = compositeVerdict === "DEEPFAKE";

  const accentClass = isDeepfake
    ? "text-red-400 border-red-500/30 bg-red-500/5"
    : isSynthetic
    ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
    : "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";

  // 1-Click Court Evidence PDF Download
  const handleDownloadPDF = async () => {
    const rawProb = facial.max_fake_probability ?? 0;
    await generateForensicPDF({
      id: data.scan_id || `IMG-${Date.now().toString(36).toUpperCase()}`,
      title: "Facial Deepfake & Photographic Manipulation Evidence Dossier",
      verdict: data.composite_verdict || (facial.composite_face_verdict === "DEEPFAKE" ? "CRITICAL FACIAL DEEPFAKE DETECTED" : "AUTHENTIC MEDIA"),
      confidence: Math.round(rawProb <= 1 ? rawProb * 100 : rawProb),
      riskLevel: data.composite_risk_level || (rawProb >= 0.75 ? "CRITICAL" : "SAFE"),
      mediaType: "image_pure_face",
      city: (data as any)?.city || "Mumbai",
      state: (data as any)?.state || "Maharashtra",
      lat: (data as any)?.lat ?? 19.0760,
      lng: (data as any)?.lng ?? 72.8777,
      locationSource: (data as any)?.location_source || "EXIF / Digital Container",
      scores: {
        visualScore: rawProb,
        gendScore: activeF?.neural_metrics?.sbi_artifact_level ?? rawProb,
      },
      summary: `Multi-face inspection resolved ${facial.face_count} face(s). Peak synthetic probability: ${Math.round(rawProb * 100)}%. Evidence: ${activeF?.evidence_code || "EVD-GEN-ANOMALY"} in ${activeF?.anomaly_region || "Facial Zone"}.`,
      facialAnalysis: {
        faceCount: facial.face_count,
        compositeVerdict: facial.composite_face_verdict,
        maxFakeProbability: rawProb,
        annotatedPreviewBase64: facial.annotated_preview_base64 || undefined,
        annotatedPreviewUrl: facial.annotated_preview_url || undefined,
        faces: faces.map((f, idx) => ({
          faceId: f.face_id || `face_${idx + 1}`,
          fakeProbability: f.fake_probability,
          verdict: f.verdict,
          bbox: f.bbox,
          anomalyRegion: f.anomaly_region,
          evidenceCode: f.evidence_code,
          neuralMetrics: {
            sbiArtifactLevel: f.neural_metrics?.sbi_artifact_level,
            ocularSymmetry: f.neural_metrics?.ocular_reflection_symmetry,
            eyewearGlareArtifact: f.neural_metrics?.eyewear_specular_score,
          },
        })),
      },
      keyframeSnapshots: faces.map((f, idx) => ({
        frame_number: idx + 1,
        timestamp: `Face #${idx + 1} (${f.face_id || `face_${idx + 1}`})`,
        anomaly_region: f.anomaly_region || "Facial ROI",
        anomaly_score: f.fake_probability ?? 0,
        detector_subsystem: "NETRA Spatial Seam Scanner + Visual Anomaly Localizer",
        image_base64: facial.annotated_preview_base64 || undefined,
        image_url: facial.annotated_preview_url || undefined,
        bounding_box: f.bbox ?? [0, 0, 0, 0],
      })),
    });
  };

  // ── Render in Embedded Mode (inside HybridDossier tab) ──
  if (embedded) {
    return (
      <div className={cn("space-y-4 animate-in fade-in duration-200", className)}>
        {/* Interactive Annotated Preview Image */}
        <InteractiveAnnotatedPreview
          facial={facial}
          activeFaceIdx={activeFaceIdx}
          onSelectFace={(idx) => setActiveFaceIdx(idx)}
          clientPreviewUrl={clientPreviewUrl}
        />

        {/* Multi-Face Selector Pills */}
        {faces.length > 1 && (
          <div className="space-y-2 pt-1 border-t border-line/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider font-mono">
                Detected Subjects ({faces.length} Faces)
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-3 font-mono">
                  Active: Face #{activeFaceIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveFaceIdx((i) => Math.max(0, i - 1))}
                  disabled={activeFaceIdx === 0}
                  className="w-5 h-5 rounded border border-line bg-surface flex items-center justify-center hover:border-white/30 disabled:opacity-40 transition-colors"
                  aria-label="Previous face"
                >
                  <ChevronLeft className="w-3 h-3 text-ink-2" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFaceIdx((i) => Math.min(faces.length - 1, i + 1))}
                  disabled={activeFaceIdx === faces.length - 1}
                  className="w-5 h-5 rounded border border-line bg-surface flex items-center justify-center hover:border-white/30 disabled:opacity-40 transition-colors"
                  aria-label="Next face"
                >
                  <ChevronRight className="w-3 h-3 text-ink-2" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {faces.map((f, i) => {
                const isSynth = f.verdict !== "AUTHENTIC";
                const prob = Math.round((f.fake_probability ?? 0) * 100);
                const isActive = i === activeFaceIdx;

                return (
                  <button
                    key={f.face_id || i}
                    type="button"
                    onClick={() => setActiveFaceIdx(i)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition-all border",
                      isActive
                        ? "bg-surface text-ink border-white/30 font-semibold shadow-sm"
                        : "bg-transparent border-transparent text-ink-3 hover:text-ink hover:bg-white/5"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isActive ? "bg-white" : "bg-ink-3"
                      )}
                    />
                    <span>Face #{i + 1}: {prob}% {isSynth ? "Synthetic" : "Authentic"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Face Scorecard */}
        {activeF && <FaceScorecard face={activeF} />}
      </div>
    );
  }

  // ── Render in Standalone Mode (pure_face branch) ──
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border-[1.5px] border-line p-5 sm:p-6 space-y-4 shadow-card animate-in fade-in duration-200",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg border-[1.5px] border-line bg-inset flex items-center justify-center text-ink-2">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-mono uppercase font-bold text-xs text-ink block">
              Facial Anomaly & Deepfake Inspection
            </span>
            <span className="text-[11px] text-ink-3">
              {facial.face_count} face{facial.face_count !== 1 ? "s" : ""} detected
              {data.scan_id && <span className="font-mono"> · {data.scan_id}</span>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={handleDownloadPDF}
            className="gap-1 font-mono text-[11px]"
          >
            <Download className="w-3 h-3 text-ink-2" />
            Evidence PDF
          </Button>
          <StatusPill
            tone={riskTone(compositeVerdict)}
            size="sm"
            pulse={false}
          >
            {pct(maxProb)}% SYNTHETIC
          </StatusPill>
        </div>
      </div>

      {/* ── Composite Verdict ── */}
      <div className="rounded-xl border-[1.5px] border-line bg-surface/60 px-4 py-2.5 space-y-0.5">
        <div className="text-xs font-bold uppercase tracking-wide text-ink">
          {data.composite_verdict || (isDeepfake ? "CRITICAL FACIAL DEEPFAKE DETECTED" : "FACIAL ANALYSIS COMPLETE")}
        </div>
        {data.recommendation && (
          <div className="text-[11px] text-ink-3 leading-relaxed pt-1">{data.recommendation}</div>
        )}
      </div>

      {/* ── Interactive Annotated Preview Image ── */}
      <InteractiveAnnotatedPreview
        facial={facial}
        activeFaceIdx={activeFaceIdx}
        onSelectFace={(idx) => setActiveFaceIdx(idx)}
        clientPreviewUrl={clientPreviewUrl}
      />

      {/* ── Multi-Face Selector Pills ── */}
      {faces.length > 1 && (
        <div className="space-y-2 pt-1 border-t border-line">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider font-mono">
              Detected Subjects ({faces.length} Faces)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-3 font-mono">
                Active: Face #{activeFaceIdx + 1}
              </span>
              <button
                type="button"
                onClick={() => setActiveFaceIdx((i) => Math.max(0, i - 1))}
                disabled={activeFaceIdx === 0}
                className="w-5 h-5 rounded border border-line bg-surface flex items-center justify-center hover:border-white/30 disabled:opacity-40 transition-colors"
                aria-label="Previous face"
              >
                <ChevronLeft className="w-3 h-3 text-ink-2" />
              </button>
              <button
                type="button"
                onClick={() => setActiveFaceIdx((i) => Math.min(faces.length - 1, i + 1))}
                disabled={activeFaceIdx === faces.length - 1}
                className="w-5 h-5 rounded border border-line bg-surface flex items-center justify-center hover:border-white/30 disabled:opacity-40 transition-colors"
                aria-label="Next face"
              >
                <ChevronRight className="w-3 h-3 text-ink-2" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {faces.map((f, i) => {
              const isSynth = f.verdict !== "AUTHENTIC";
              const prob = Math.round((f.fake_probability ?? 0) * 100);
              const isActive = i === activeFaceIdx;

              return (
                <button
                  key={f.face_id || i}
                  type="button"
                  onClick={() => setActiveFaceIdx(i)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition-all border",
                    isActive
                      ? "bg-surface text-ink border-white/30 font-semibold shadow-sm"
                      : "bg-transparent border-transparent text-ink-3 hover:text-ink hover:bg-white/5"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isActive ? "bg-white" : "bg-ink-3"
                    )}
                  />
                  <span>Face #{i + 1}: {prob}% {isSynth ? "Synthetic" : "Authentic"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Face Scorecard ── */}
      {activeF && <FaceScorecard face={activeF} />}

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between pt-2 border-t border-line">
        <div className="flex items-center gap-2">
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Scan Another Image
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs font-mono"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            Download Court Evidence PDF
          </Button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-3 font-mono">
          <Scan className="w-3 h-3" />
          <span>NETRA Vision Engine</span>
        </div>
      </div>
    </div>
  );
}

// Re-export as FacialDeepfakeCard for full backward compatibility
export const FacialDeepfakeCard = FacialAnomalyCard;

export default FacialAnomalyCard;
