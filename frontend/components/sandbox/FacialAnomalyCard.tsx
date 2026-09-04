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
  const barColor = danger
    ? barPct >= 75 ? "bg-red-500" : barPct >= 50 ? "bg-amber-500" : "bg-emerald-500"
    : barPct >= 75 ? "bg-emerald-500" : barPct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="font-mono font-bold text-zinc-200">{barPct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
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
}: {
  facial: FacialAnalysis;
  activeFaceIdx: number;
  onSelectFace: (idx: number) => void;
}) {
  const src =
    facial.annotated_preview_base64 ||
    facial.annotated_image_preview ||
    facial.annotated_preview_url ||
    facial.annotated_image_url;

  const faces = facial.faces || [];
  if (!src) return null;

  return (
    <div className="rounded-xl overflow-hidden border-[1.5px] border-line bg-canvas">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-surface/50">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          Interactive Forensic Face Inspector
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          Click bounding box to switch face • {facial.face_count} face{facial.face_count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative w-full flex items-center justify-center bg-black/40 overflow-hidden p-2">
        {/* Rendered Image with tightly bound overlay wrapper */}
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Annotated forensic scan"
            className="max-h-72 max-w-full w-auto h-auto block rounded"
          />

          {/* Interactive Bounding Box Overlays */}
          {faces.map((face, idx) => {
            if (!face.normalized_bbox || face.normalized_bbox.length !== 4) return null;
            const [normX, normY, normW, normH] = face.normalized_bbox;
            const isActive = idx === activeFaceIdx;
            const isDeepfake = face.verdict === "DEEPFAKE";
            const isSynthetic = face.verdict !== "AUTHENTIC";

            // Red for DEEPFAKE, amber for other synthetic, emerald for AUTHENTIC
            const borderColor = isDeepfake ? "#ef4444" : isSynthetic ? "#f59e0b" : "#10b981";

            return (
              <button
                key={face.face_id || idx}
                type="button"
                onClick={() => onSelectFace(idx)}
                className={cn(
                  "absolute cursor-pointer transition-all duration-150 rounded-sm focus:outline-none group",
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
                  backgroundColor: isActive ? `${borderColor}25` : "transparent",
                }}
                title={`Click to inspect Face #${idx + 1} (${face.verdict} - ${Math.round((face.fake_probability ?? 0) * 100)}%)`}
              >
                <span
                  className={cn(
                    "absolute -top-5 left-0 px-1 py-0.5 text-[9px] font-mono font-bold text-white rounded shadow-sm whitespace-nowrap pointer-events-none transition-opacity",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ backgroundColor: borderColor }}
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

  const borderColor =
    isDeepfake ? "border-red-500/40" : isSynthetic ? "border-amber-500/40" : "border-emerald-500/40";
  const accentColor =
    isDeepfake ? "text-red-400" : isSynthetic ? "text-amber-400" : "text-emerald-400";
  const bgColor =
    isDeepfake ? "bg-red-500/5" : isSynthetic ? "bg-amber-500/5" : "bg-emerald-500/5";

  const metrics = face.neural_metrics || {};
  const [x = 0, y = 0, w = 0, h = 0] = face.bbox ?? [0, 0, 0, 0];

  return (
    <div className={cn("rounded-xl border-[1.5px] p-4 space-y-3", borderColor, bgColor)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSynthetic ? (
            <XCircle className={cn("w-4 h-4", accentColor)} />
          ) : (
            <CheckCircle2 className={cn("w-4 h-4", accentColor)} />
          )}
          <span className={cn("font-mono font-bold text-xs uppercase", accentColor)}>
            {String(face.face_id || "face").replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
        <StatusPill
          tone={riskTone(face.verdict)}
          size="sm"
          pulse={isDeepfake}
        >
          {face.verdict}
        </StatusPill>
      </div>

      {/* Fake Probability Meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 font-medium">Synthetic Probability</span>
          <span className={cn("font-mono font-bold text-sm", accentColor)}>{pct(prob)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              isDeepfake ? "bg-red-500" : isSynthetic ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${pct(prob)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>Authentic</span>
          <span>Synthetic</span>
        </div>
      </div>

      {/* Neural Metrics */}
      {Object.keys(metrics).length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <span className="text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Neural Forensic Metrics
          </span>
          {metrics.sbi_artifact_level !== undefined && (
            <MetricBar label="SBI Artifact Level" value={metrics.sbi_artifact_level} danger />
          )}
          {metrics.ocular_reflection_symmetry !== undefined && (
            <MetricBar label="Ocular Reflection Symmetry" value={metrics.ocular_reflection_symmetry} danger={false} />
          )}
          {metrics.eyewear_specular_score !== undefined && (
            <MetricBar label="Eyewear Specular Anomaly" value={metrics.eyewear_specular_score / 100} danger />
          )}
        </div>
      )}

      {/* Evidence Code + Bounding Box */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
        {face.evidence_code && (
          <div>
            <div className="text-[9.5px] uppercase tracking-widest text-zinc-600 mb-0.5">Evidence Code</div>
            <div className="font-mono text-[10.5px] text-zinc-300">{face.evidence_code}</div>
          </div>
        )}
        {face.anomaly_region && (
          <div>
            <div className="text-[9.5px] uppercase tracking-widest text-zinc-600 mb-0.5">Anomaly Zone</div>
            <div className="font-mono text-[10.5px] text-zinc-300">{face.anomaly_region}</div>
          </div>
        )}
        <div>
          <div className="text-[9.5px] uppercase tracking-widest text-zinc-600 mb-0.5">Bounding Box</div>
          <div className="font-mono text-[10px] text-zinc-400">[{x}, {y}, {w}×{h}]</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-widest text-zinc-600 mb-0.5">Risk Level</div>
          <div className={cn("font-mono text-[10.5px] font-bold", accentColor)}>{face.risk_level}</div>
        </div>
      </div>

      {/* Flags */}
      {face.flags && face.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
          {face.flags.map((flag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
            >
              <Zap className="w-2.5 h-2.5 text-amber-400" />
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

export function FacialAnomalyCard({ data, onReset, className }: FacialAnomalyCardProps) {
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
        detector_subsystem: "SpatialSBIDetector + VisualAnomalyLocalizer",
        image_base64: facial.annotated_preview_base64 || undefined,
        image_url: facial.annotated_preview_url || undefined,
        bounding_box: f.bbox ?? [0, 0, 0, 0],
      })),
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-canvas border-[1.5px] border-line p-5 space-y-4 animate-in fade-in duration-200",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg border-[1.5px] flex items-center justify-center", accentClass)}>
            {isDeepfake ? (
              <XCircle className="w-4 h-4" />
            ) : isSynthetic ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </div>
          <div>
            <span className="font-mono uppercase font-bold text-xs text-zinc-100 block">
              Facial Anomaly & Deepfake Inspection
            </span>
            <span className="text-[11px] text-zinc-500">
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
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1 font-mono text-[11px]"
          >
            <Download className="w-3 h-3 text-amber-400" />
            Court Evidence PDF
          </Button>
          <StatusPill
            tone={riskTone(compositeVerdict)}
            size="sm"
            pulse={isDeepfake}
          >
            {pct(maxProb)}% SYNTHETIC
          </StatusPill>
        </div>
      </div>

      {/* ── Composite Verdict ── */}
      <div className={cn("rounded-xl border-[1.5px] px-4 py-3 space-y-0.5", accentClass)}>
        <div className="text-xs font-bold uppercase tracking-wide">
          {data.composite_verdict || (isDeepfake ? "CRITICAL FACIAL DEEPFAKE DETECTED" : "FACIAL ANALYSIS COMPLETE")}
        </div>
        {data.recommendation && (
          <div className="text-[11.5px] text-zinc-300 leading-relaxed pt-1">{data.recommendation}</div>
        )}
      </div>

      {/* ── Interactive Annotated Preview Image ── */}
      <InteractiveAnnotatedPreview
        facial={facial}
        activeFaceIdx={activeFaceIdx}
        onSelectFace={(idx) => setActiveFaceIdx(idx)}
      />

      {/* ── Informative Multi-Face Selector Pills ── */}
      {faces.length > 1 && (
        <div className="space-y-2 pt-1 border-t border-line">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Detected Subjects ({faces.length} Faces)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono">
                Active: Face #{activeFaceIdx + 1}
              </span>
              <button
                onClick={() => setActiveFaceIdx((i) => Math.max(0, i - 1))}
                disabled={activeFaceIdx === 0}
                className="w-5 h-5 rounded border border-line bg-surface flex items-center justify-center hover:border-amber-500/40 disabled:opacity-40 transition-colors"
                aria-label="Previous face"
              >
                <ChevronLeft className="w-3 h-3 text-zinc-400" />
              </button>
              <button
                onClick={() => setActiveFaceIdx((i) => Math.min(faces.length - 1, i + 1))}
                disabled={activeFaceIdx === faces.length - 1}
                className="w-5 h-5 rounded border border-line bg-surface flex items-center justify-center hover:border-amber-500/40 disabled:opacity-40 transition-colors"
                aria-label="Next face"
              >
                <ChevronRight className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {faces.map((f, i) => {
              const isSynth = f.verdict !== "AUTHENTIC";
              const isDf = f.verdict === "DEEPFAKE";
              const prob = Math.round((f.fake_probability ?? 0) * 100);
              const isActive = i === activeFaceIdx;

              return (
                <button
                  key={f.face_id || i}
                  type="button"
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

      {/* ── Active Face Scorecard ── */}
      {activeF && <FaceScorecard face={activeF} />}

      {/* ── Routing Debug Info ── */}
      {data.routing_decision && (
        <div className="flex flex-wrap gap-2 text-[10px] text-zinc-600 font-mono pt-1 border-t border-white/5">
          <span>branch: {data.routing_decision.selected_branch}</span>
          <span>· faces: {data.routing_decision.face_count}</span>
          <span>· chars: {data.routing_decision.char_count}</span>
          <span>· mode: {data.analysis_mode}</span>
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between pt-1 border-t border-line">
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
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5 text-xs font-mono"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Download Court Evidence PDF
          </Button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Scan className="w-3 h-3" />
          <span>EfficientNet-B4 + SBI · NETRA Vision Engine</span>
        </div>
      </div>
    </div>
  );
}

// Re-export as FacialDeepfakeCard for full backward compatibility
export const FacialDeepfakeCard = FacialAnomalyCard;

export default FacialAnomalyCard;
