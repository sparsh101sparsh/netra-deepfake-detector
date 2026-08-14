"use client";
// components/EvidenceTimeline.tsx
// THE KILLER FEATURE — Interactive evidence timeline with click-to-seek
// Color-coded: 🟢 Safe | 🟡 Suspicious | 🔴 Confirmed Fake | 🟠 Audio Anomaly

import { useState, useRef, useCallback } from "react";
import { FrameEvidence } from "@/lib/api";

interface TimelineSegment {
  startTime: number;
  endTime: number;
  type: "SAFE" | "SUSPICIOUS" | "CONFIRMED_FAKE" | "AUDIO_ANOMALY";
  confidence: number;
  flags: string[];
  frameNumber?: number;
  timestamp?: string;
}

interface EvidenceTimelineProps {
  frames: FrameEvidence[];
  audioFlags?: string[];
  duration: number;  // video duration in seconds
  onSeek?: (seconds: number) => void;
  videoUrl?: string | null;
}

function parseTimestampToSeconds(ts: string): number {
  // Format: "00:07.84" or "MM:SS.ms"
  const parts = ts.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(ts) || 0;
}

function buildSegments(
  frames: FrameEvidence[],
  duration: number,
  audioFlags: string[]
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  const effectiveDuration = Math.max(1, duration);

  // Overlay suspicious/fake segments from frame evidence
  const segDuration = Math.min(Math.max(0.3, effectiveDuration * 0.06), 1.5);

  for (const frame of frames) {
    const t = parseTimestampToSeconds(frame.timestamp);

    const type: TimelineSegment["type"] =
      frame.confidence > 0.75 ? "CONFIRMED_FAKE" :
      frame.confidence > 0.45 ? "SUSPICIOUS" : "SAFE";

    segments.push({
      startTime: Math.max(0, t - (segDuration / 3)),
      endTime: Math.min(effectiveDuration, t + segDuration),
      type,
      confidence: frame.confidence,
      flags: frame.flags,
      frameNumber: frame.frame_number,
      timestamp: frame.timestamp,
    });
  }

  return segments;
}

const SEGMENT_COLORS = {
  SAFE: "bg-emerald-500/60",
  SUSPICIOUS: "bg-yellow-400/80",
  CONFIRMED_FAKE: "bg-red-500",
  AUDIO_ANOMALY: "bg-orange-400",
};

const SEGMENT_COLORS_SELECTED = {
  SAFE: "bg-emerald-400",
  SUSPICIOUS: "bg-yellow-300",
  CONFIRMED_FAKE: "bg-red-400",
  AUDIO_ANOMALY: "bg-orange-300",
};

export default function EvidenceTimeline({
  frames,
  audioFlags = [],
  duration,
  onSeek,
  videoUrl,
}: EvidenceTimelineProps) {
  const [selectedSegment, setSelectedSegment] = useState<TimelineSegment | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const segments = buildSegments(frames, duration, audioFlags);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const seekTo = ratio * duration;
      onSeek?.(seekTo);
    },
    [duration, onSeek]
  );

  const handleSegmentClick = useCallback(
    (e: React.MouseEvent, seg: TimelineSegment) => {
      e.stopPropagation();
      setSelectedSegment(seg);
      if (seg.startTime !== undefined) {
        onSeek?.(seg.startTime);
      }
    },
    [onSeek]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Safe
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> Suspicious
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Confirmed Fake
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Audio Anomaly
        </span>
      </div>

      {/* Timeline bar */}
      <div
        ref={timelineRef}
        className="relative h-10 bg-gray-800 rounded-lg cursor-pointer overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
        onClick={handleTimelineClick}
        title="Click to seek"
      >
        {duration > 0 &&
          segments
            .filter((s) => s.type !== "SAFE")
            .map((seg, i) => {
              const left = (seg.startTime / duration) * 100;
              const width = Math.max(2, ((seg.endTime - seg.startTime) / duration) * 100);
              const isSelected = selectedSegment === seg;
              return (
                <div
                  key={i}
                  className={`absolute top-0 h-full transition-all duration-150 ${
                    isSelected
                      ? SEGMENT_COLORS_SELECTED[seg.type]
                      : SEGMENT_COLORS[seg.type]
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={(e) => handleSegmentClick(e, seg)}
                  title={`${seg.timestamp || ""} — ${(seg.confidence * 100).toFixed(0)}% confidence`}
                />
              );
            })}

        {/* Time labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-gray-500 pointer-events-none">
          <span>0:00</span>
          {duration > 0 && (
            <>
              <span>{Math.floor(duration / 2 / 60)}:{String(Math.floor(duration / 2 % 60)).padStart(2, "0")}</span>
              <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
            </>
          )}
        </div>
      </div>

      {/* Flagged Frame Chips (Quick Seek) */}
      {frames && frames.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-2">
            Flagged Forensic Keyframes ({frames.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {frames.map((f, idx) => {
              const t = parseTimestampToSeconds(f.timestamp);
              const isHighFake = f.confidence > 0.75;
              return (
                <button
                  key={idx}
                  onClick={() => onSeek?.(t)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all hover:scale-[1.02] ${
                    isHighFake
                      ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                  }`}
                  title={`Jump to frame ${f.frame_number}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span>#{f.frame_number} @ {f.timestamp}</span>
                  <span className="font-bold">{(f.confidence * 100).toFixed(0)}%</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
