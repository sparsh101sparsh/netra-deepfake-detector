"use client";
// components/ConfidenceMeter.tsx
// Animated circular gauge (speedometer style)
// Green (0-30) → Yellow (30-60) → Orange (60-80) → Red (80-100)

import { useEffect, useState } from "react";

interface ConfidenceMeterProps {
  value: number;  // 0-100
  label?: string;
  size?: number;  // diameter in pixels
  animate?: boolean;
  verdict?: string; // e.g. "AUTHENTIC", "FACE_SWAP", etc.
}

function getColor(value: number, verdict?: string): string {
  if (verdict === "AUTHENTIC" || value < 30) return "#10b981"; // emerald - authentic
  if (value < 55) return "#f59e0b"; // amber - suspicious / anomaly
  if (value < 75) return "#f97316"; // orange - likely altered
  return "#ef4444";                 // red - confirmed deepfake
}

function getVerdictLabel(value: number, verdict?: string): string {
  if (verdict === "AUTHENTIC") return "AUTHENTIC MEDIA";
  if (verdict) return verdict.replace(/_/g, " ");
  if (value < 30) return "AUTHENTIC";
  if (value < 55) return "SUSPICIOUS";
  if (value < 75) return "LIKELY ALTERED";
  return "CONFIRMED FAKE";
}

export default function ConfidenceMeter({
  value,
  label,
  size = 160,
  animate = true,
  verdict,
}: ConfidenceMeterProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }
    // Animate from 0 to value over 1.2 seconds
    let start: number | null = null;
    const duration = 1200;
    const startVal = 0;
    const endVal = value;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value, animate]);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  // We use 270° of the circle (3/4), like a speedometer
  const arcLength = (3 / 4) * circumference;
  const dashOffset = arcLength - (displayValue / 100) * arcLength;

  const isAuthentic = verdict === "AUTHENTIC";
  const color = getColor(displayValue, verdict);
  const badgeText = getVerdictLabel(displayValue, verdict);
  const displayLabel = label || (isAuthentic ? "AUTHENTIC SCORE" : "ANOMALY INDEX");

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-[225deg]">
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={12}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.05s linear, stroke 0.3s ease",
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color }}
          >
            {isAuthentic ? `${Math.max(100 - displayValue, 90)}%` : `${displayValue}%`}
          </span>
          <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mt-0.5">{displayLabel}</span>
        </div>
      </div>

      {/* Verdict badge */}
      <span
        className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider"
        style={{
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {badgeText}
      </span>
    </div>
  );
}
