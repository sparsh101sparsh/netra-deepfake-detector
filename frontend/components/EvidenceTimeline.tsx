"use client";
// components/EvidenceTimeline.tsx
// Professional Interactive Evidence Timeline & Forensic Inspector
// Inspired by Remotion Player, Frame.io, and modern multi-track annotation platforms
// Color-coded:
//   🟢 Baseline / Verified Clean
//   🟡 Visual Anomaly / Specular Glare (lighting, glasses, motion)
//   🟠 Compression / Lens Noise
//   🔴 Synthetic Seam / Generative Artifact (confirmed fakes only)

import { useState, useRef, useCallback } from "react";
import { FrameEvidence } from "@/lib/api";
import { Activity, Eye, Sparkles } from "lucide-react";

export type AnomalyType = "BASELINE" | "VISUAL_ANOMALY" | "COMPRESSION_ARTIFACT" | "SYNTHETIC_SEAM";

export interface TimelineSegment {
  startTime: number;
  endTime: number;
  type: AnomalyType;
  label: string;
  confidence: number;
  flags: string[];
  frameNumber?: number;
  timestamp?: string;
}

interface EvidenceTimelineProps {
  frames: FrameEvidence[];
  audioFlags?: string[];
  duration: number; // in seconds
  onSeek?: (seconds: number) => void;
  videoUrl?: string | null;
  verdict?: string; // e.g. "AUTHENTIC", "FACE_SWAP"
}

function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(ts) || 0;
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

export default function EvidenceTimeline({
  frames = [],
  duration,
  onSeek,
  verdict = "AUTHENTIC",
}: EvidenceTimelineProps) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<TimelineSegment | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const isAuthenticVerdict = verdict === "AUTHENTIC";
  const effectiveDuration = Math.max(duration > 0 ? duration : 5, 1);

  // Build segments with proper forensic naming (NO "Confirmed Fake" on real videos)
  const segments: TimelineSegment[] = frames.map((frame) => {
    const t = parseTimestampToSeconds(frame.timestamp);
    const segLen = Math.min(Math.max(0.2, effectiveDuration * 0.05), 1.0);

    let type: AnomalyType = "BASELINE";
    let label = "Natural Baseline";

    if (isAuthenticVerdict) {
      if (frame.confidence > 0.65) {
        type = "VISUAL_ANOMALY";
        label = "Specular / Lighting Glare";
      } else if (frame.confidence > 0.40) {
        type = "COMPRESSION_ARTIFACT";
        label = "Compression / Lens Noise";
      }
    } else {
      if (frame.confidence > 0.75) {
        type = "SYNTHETIC_SEAM";
        label = "Generative Boundary Artifact";
      } else if (frame.confidence > 0.45) {
        type = "VISUAL_ANOMALY";
        label = "Neural Morphing Anomaly";
      }
    }

    return {
      startTime: Math.max(0, t - segLen / 2),
      endTime: Math.min(effectiveDuration, t + segLen / 2),
      type,
      label,
      confidence: frame.confidence,
      flags: frame.flags || [],
      frameNumber: frame.frame_number,
      timestamp: frame.timestamp,
    };
  });

  const anomalySegments = segments.filter((s) => s.type !== "BASELINE");

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetSec = ratio * effectiveDuration;
      setCurrentTime(targetSec);
      onSeek?.(targetSec);
    },
    [effectiveDuration, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoveredTime(ratio * effectiveDuration);
    },
    [effectiveDuration]
  );

  const handleMouseLeave = () => {
    setHoveredTime(null);
  };

  const jumpToTime = (sec: number, seg?: TimelineSegment) => {
    setCurrentTime(sec);
    if (seg) setSelectedSegment(seg);
    onSeek?.(sec);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header Controls & Forensic Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <span className="text-xs font-mono font-semibold text-ink uppercase tracking-wider">
            Multi-Track Forensic Inspector
          </span>
          <span className="text-ink-3 text-xs">•</span>
          <span className="text-xs font-mono text-ink-3">
            {effectiveDuration.toFixed(1)}s Span
          </span>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Clean Baseline
          </span>
          <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {isAuthenticVerdict ? "Specular / Glare" : "Visual Anomaly"}
          </span>
          {!isAuthenticVerdict && (
            <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Synthetic Seam
            </span>
          )}
        </div>
      </div>

      {/* Main Scrubber Ribbon Container */}
      <div className="relative pt-2 pb-1">
        {/* Floating Hover Time Indicator */}
        {hoveredTime !== null && (
          <div
            className="absolute top-0 transform -translate-x-1/2 pointer-events-none z-20"
            style={{ left: `${(hoveredTime / effectiveDuration) * 100}%` }}
          >
            <span className="px-1.5 py-0.5 rounded bg-black/90 border border-line text-[10px] font-mono text-amber-300 shadow-lg">
              {formatSeconds(hoveredTime)}
            </span>
          </div>
        )}

        {/* Multi-Track Bar */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative h-12 rounded-xl bg-inset border border-line overflow-hidden cursor-pointer group shadow-inner transition-all hover:border-line-hover"
        >
          {/* Subtle Grid Lines (every 10%) */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-15">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-full w-px bg-white" />
            ))}
          </div>

          {/* Track 1: Baseline Fill */}
          <div className="absolute inset-0 bg-emerald-500/10" />

          {/* Track 2: Forensic Anomaly Blocks */}
          {anomalySegments.map((seg, idx) => {
            const leftPct = (seg.startTime / effectiveDuration) * 100;
            const widthPct = Math.max(1.8, ((seg.endTime - seg.startTime) / effectiveDuration) * 100);
            const isSelected = selectedSegment === seg;

            let bgColor = "bg-amber-400/80 hover:bg-amber-300";
            let borderColor = "border-amber-400";
            if (seg.type === "SYNTHETIC_SEAM") {
              bgColor = "bg-red-500/85 hover:bg-red-400";
              borderColor = "border-red-400";
            } else if (seg.type === "COMPRESSION_ARTIFACT") {
              bgColor = "bg-sky-400/70 hover:bg-sky-300";
              borderColor = "border-sky-400";
            }

            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToTime(seg.startTime, seg);
                }}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                className={`absolute top-1 bottom-1 rounded-md transition-all border ${bgColor} ${borderColor} ${
                  isSelected ? "ring-2 ring-white z-10 scale-y-105" : "opacity-90"
                }`}
                title={`[${seg.timestamp}] ${seg.label} — ${(seg.confidence * 100).toFixed(0)}%`}
              />
            );
          })}

          {/* Current Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none shadow-[0_0_8px_white]"
            style={{ left: `${(currentTime / effectiveDuration) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white -ml-1 -top-1 absolute shadow-sm" />
          </div>
        </div>

        {/* Time Axis Markers */}
        <div className="flex justify-between items-center text-[10px] font-mono text-ink-3 pt-1.5 px-1">
          <span>0:00.0</span>
          <span>{formatSeconds(effectiveDuration * 0.25)}</span>
          <span>{formatSeconds(effectiveDuration * 0.50)}</span>
          <span>{formatSeconds(effectiveDuration * 0.75)}</span>
          <span>{formatSeconds(effectiveDuration)}</span>
        </div>
      </div>

      {/* Flagged Forensic Keyframe Dossier Pills */}
      {frames && frames.length > 0 && (
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-accent" />
              Forensic Keyframe Dossier ({frames.length} sampled frames)
            </span>
            <span className="text-[11px] font-mono text-ink-3">
              Click pill to seek frame in player
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {frames.map((f, idx) => {
              const t = parseTimestampToSeconds(f.timestamp);
              const isHigh = f.confidence > 0.70;

              // Categorize label based on verdict
              const anomalyTag = isAuthenticVerdict
                ? (isHigh ? "Specular Reflection" : "Camera Noise")
                : (isHigh ? "Synthetic Seam" : "Neural Artifact");

              return (
                <button
                  key={idx}
                  onClick={() => jumpToTime(t)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left font-mono transition-all hover:scale-[1.01] ${
                    isAuthenticVerdict
                      ? "bg-inset/60 border-line hover:border-amber-400/40 text-ink"
                      : isHigh
                      ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400"
                      : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-400"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-ink">
                        Frame #{f.frame_number}
                      </div>
                      <div className="text-[10px] text-ink-3 truncate">
                        {anomalyTag} @ {f.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                      isAuthenticVerdict
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : isHigh
                        ? "bg-red-500/20 text-red-300 border-red-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }`}>
                      {(f.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Segment Drill-Down Dossier */}
      {selectedSegment && (
        <div className="p-3.5 rounded-xl bg-inset/90 border border-line animate-in fade-in slide-in-from-top-1 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Detailed Frame Telemetry @ {selectedSegment.timestamp}
            </span>
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-ink-3 hover:text-ink text-[11px]"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1 text-ink-2">
            <div>
              <span className="text-ink-3 block">Classification</span>
              <span className="text-ink font-medium">{selectedSegment.label}</span>
            </div>
            <div>
              <span className="text-ink-3 block">Neural Activation</span>
              <span className="text-accent font-medium">{(selectedSegment.confidence * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-ink-3 block">Timestamp Span</span>
              <span>{formatSeconds(selectedSegment.startTime)} – {formatSeconds(selectedSegment.endTime)}</span>
            </div>
            <div>
              <span className="text-ink-3 block">Frame ID</span>
              <span>#{selectedSegment.frameNumber ?? "N/A"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
