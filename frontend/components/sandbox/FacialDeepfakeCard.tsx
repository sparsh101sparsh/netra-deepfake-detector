"use client";

import React, { useState } from "react";
import {
  Eye, Shield, ShieldAlert, AlertTriangle, RefreshCw,
  ChevronLeft, ChevronRight, Scan, Zap, CheckCircle2, XCircle, Activity
} from "lucide-react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
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

export interface FacialDeepfakeCardProps {
  data: DualBranchResult;
  onReset?: () => void;
  className?: string;
}

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
// Annotated Image Preview
// ─────────────────────────────────────────────────────────────────────────────

function AnnotatedPreview({ facial }: { facial: FacialAnalysis }) {
  const src =
    facial.annotated_preview_base64 ||
    facial.annotated_image_preview ||
    facial.annotated_preview_url ||
    facial.annotated_image_url;

  if (!src) return null;

  return (
    <div className="rounded-xl overflow-hidden border-[1.5px] border-line bg-canvas">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          Annotated Forensic Preview
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          {facial.face_count} face{facial.face_count !== 1 ? "s" : ""} detected
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Annotated forensic preview with face bounding boxes"
        className="w-full object-contain max-h-64"
      />
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
  const [x, y, w, h] = face.bbox;

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
            {face.face_id.replace("_", " ").toUpperCase()}
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
            <MetricBar label="Eyewear Specular Anomaly" value={metrics.eyewear_specular_score} danger />
          )}
          {metrics.lip_sync_laplacian_score !== undefined && (
            <MetricBar label="Lip-Sync Boundary Seam" value={metrics.lip_sync_laplacian_score} danger />
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
              {flag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function FacialDeepfakeCard({ data, onReset, className }: FacialDeepfakeCardProps) {
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
              Facial Deepfake Inspection
            </span>
            <span className="text-[11px] text-zinc-500">
              {facial.face_count} face{facial.face_count !== 1 ? "s" : ""} detected
              {data.scan_id && <span className="font-mono"> · {data.scan_id}</span>}
            </span>
          </div>
        </div>
        <StatusPill
          tone={riskTone(compositeVerdict)}
          size="sm"
          pulse={isDeepfake}
        >
          {pct(maxProb)}% SYNTHETIC
        </StatusPill>
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

      {/* ── Annotated Preview Image ── */}
      <AnnotatedPreview facial={facial} />

      {/* ── Multi-Face Switcher ── */}
      {faces.length > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Inspecting Face {activeFaceIdx + 1} of {faces.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveFaceIdx((i) => Math.max(0, i - 1))}
              disabled={activeFaceIdx === 0}
              className="w-7 h-7 rounded-lg border border-line bg-surface flex items-center justify-center hover:border-amber-500/40 disabled:opacity-40 transition-colors"
              aria-label="Previous face"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            {faces.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveFaceIdx(i)}
                className={cn(
                  "w-6 h-6 rounded-full text-[10px] font-bold font-mono border transition-all",
                  i === activeFaceIdx
                    ? "border-amber-500 bg-amber-500/20 text-amber-400"
                    : "border-line bg-surface text-zinc-500 hover:border-amber-500/40"
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setActiveFaceIdx((i) => Math.min(faces.length - 1, i + 1))}
              disabled={activeFaceIdx === faces.length - 1}
              className="w-7 h-7 rounded-lg border border-line bg-surface flex items-center justify-center hover:border-amber-500/40 disabled:opacity-40 transition-colors"
              aria-label="Next face"
            >
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
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
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Scan Another Image
        </Button>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Scan className="w-3 h-3" />
          <span>EfficientNet-B4 + SBI · NETRA Vision Engine</span>
        </div>
      </div>
    </div>
  );
}

export default FacialDeepfakeCard;
