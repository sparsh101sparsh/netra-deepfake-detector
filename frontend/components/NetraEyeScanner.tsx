"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface NetraEyeScannerProps {
  className?: string;
  size?: number | string;
  isDragging?: boolean;
  isScanning?: boolean;
  intensity?: "subtle" | "normal" | "high";
  showReticle?: boolean;
}

/**
 * NetraEyeScanner — High-Performance 60fps Forensic Eye & Radar Component.
 * Optimized replacement for legacy 2,968-line keyframe bloat.
 * Uses GPU-accelerated CSS transforms and lightweight SVG primitives.
 */
export const NetraEyeScanner: React.FC<NetraEyeScannerProps> = ({
  className = "",
  size = "100%",
  isDragging = false,
  isScanning = true,
  intensity = "normal",
  showReticle = true,
}) => {
  // Pre-generate precision radial tick marks (24 points at 15-degree intervals)
  const ticks = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 360) / 24;
      const isMajor = i % 6 === 0;
      const rad = (angle * Math.PI) / 180;
      const rInner = isMajor ? 168 : 172;
      const rOuter = 180;
      const x1 = 200 + rInner * Math.cos(rad);
      const y1 = 200 + rInner * Math.sin(rad);
      const x2 = 200 + rOuter * Math.cos(rad);
      const y2 = 200 + rOuter * Math.sin(rad);
      return { id: i, x1, y1, x2, y2, isMajor, angle };
    });
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-transform duration-300 ease-out",
        isDragging && "scale-105",
        className
      )}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
        maxWidth: "100%",
        maxHeight: "100%",
        aspectRatio: "1 / 1",
      }}
      aria-label="NETRA Forensic Scanner Visualizer"
      role="img"
    >
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Obsidian Base Gradient */}
          <radialGradient id="eyeBgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#081525" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#040a14" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#02050b" stopOpacity="1" />
          </radialGradient>

          {/* Cyan Forensic Signal Gradient */}
          <linearGradient id="cyanSignalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Lens Iris Gradient */}
          <radialGradient id="irisGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#0284c7" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#082f49" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>

          {/* Sweeping Radar Radar Gradient */}
          <radialGradient id="radarSweepGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.28" />
            <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.12" />
            <stop offset="85%" stopColor="#0284c7" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Forensic Glow Filter */}
          <filter id="forensicGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="deepBlurFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" result="blur" />
          </filter>
        </defs>

        {/* 1. Ambient Background Glow Disc */}
        <circle
          cx="200"
          cy="200"
          r="160"
          fill="url(#irisGlowGrad)"
          className="opacity-40 animate-pulse"
          style={{ animationDuration: "3.5s" }}
        />

        {/* 2. Outer Deep Surface Base */}
        <circle
          cx="200"
          cy="200"
          r="182"
          fill="url(#eyeBgGrad)"
          stroke="oklch(0.356 0.007 264.474 / 0.45)"
          strokeWidth="1.5"
        />

        {/* 3. Precision Degree Ticks Dial */}
        <g className="opacity-60">
          {ticks.map((t) => (
            <line
              key={t.id}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isMajor ? "#38bdf8" : "oklch(0.541 0.01 264.484)"}
              strokeWidth={t.isMajor ? "1.8" : "1"}
              strokeLinecap="round"
              className={t.isMajor ? "opacity-90" : "opacity-40"}
            />
          ))}
        </g>

        {/* 4. Outer Rotating Track 1 (Clockwise) */}
        <circle
          cx="200"
          cy="200"
          r="162"
          fill="none"
          stroke="#00f0ff"
          strokeWidth="1.5"
          strokeDasharray="14 18 4 18 36 24"
          className="opacity-40"
          style={{
            transformOrigin: "200px 200px",
            animation: "radar-sweep 24s linear infinite",
          }}
        />

        {/* 5. Outer Rotating Track 2 (Counter-Clockwise) */}
        <circle
          cx="200"
          cy="200"
          r="146"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeDasharray="6 24 18 12 40 16"
          className="opacity-30"
          style={{
            transformOrigin: "200px 200px",
            animation: "radar-sweep 18s linear infinite reverse",
          }}
        />

        {/* 6. Sweeping Radar Beam */}
        {isScanning && (
          <g
            style={{
              transformOrigin: "200px 200px",
              animation: "radar-sweep 3.6s linear infinite",
            }}
          >
            <path
              d="M 200 200 L 340 130 A 155 155 0 0 0 200 45 Z"
              fill="url(#radarSweepGradient)"
            />
            <line
              x1="200"
              y1="200"
              x2="340"
              y2="130"
              stroke="#00f0ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="opacity-80"
            />
          </g>
        )}

        {/* 7. Reticle Crosshairs & Guides */}
        {showReticle && (
          <g className="opacity-30">
            {/* North / South / East / West tick marks */}
            <line x1="200" y1="20" x2="200" y2="46" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="200" y1="354" x2="200" y2="380" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="20" y1="200" x2="46" y2="200" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="354" y1="200" x2="380" y2="200" stroke="#00f0ff" strokeWidth="1.5" />

            {/* Corner Reticle Brackets */}
            <path d="M 80 100 L 80 80 L 100 80" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <path d="M 320 100 L 320 80 L 300 80" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <path d="M 80 300 L 80 320 L 100 320" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <path d="M 320 300 L 320 320 L 300 320" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          </g>
        )}

        {/* 8. Mid Eye Chamber Background */}
        <circle
          cx="200"
          cy="200"
          r="120"
          fill="#030712"
          stroke="oklch(0.356 0.007 264.474 / 0.8)"
          strokeWidth="1.5"
        />

        {/* 9. Central Cyber Eyelid Contour (Upper & Lower Curves) */}
        <g filter="url(#forensicGlowFilter)">
          {/* Eyelid Background Lens */}
          <path
            d="M 70 200 C 115 110, 285 110, 330 200 C 285 290, 115 290, 70 200 Z"
            fill="#050e1c"
            stroke="url(#cyanSignalGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Inner Iris Reticle Ring */}
          <circle
            cx="200"
            cy="200"
            r="60"
            fill="#081b33"
            stroke="#00f0ff"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="opacity-80"
          />

          {/* Iris Core Glow Disc */}
          <circle
            cx="200"
            cy="200"
            r="44"
            fill="url(#irisGlowGrad)"
            className="opacity-90"
          />

          {/* Inner Aperture Blades */}
          <circle
            cx="200"
            cy="200"
            r="28"
            fill="#020611"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />

          {/* Deep Pupil */}
          <circle
            cx="200"
            cy="200"
            r="16"
            fill="#000000"
          />

          {/* Glowing Luminous Pupil Core */}
          <circle
            cx="200"
            cy="200"
            r="7"
            fill="#00f0ff"
            className="animate-pulse"
            style={{ animationDuration: "1.8s" }}
          />
          <circle cx="204" cy="196" r="3.5" fill="#ffffff" />
        </g>

        {/* 10. Satellite Telemetry Blips / Detection Nodes */}
        <g className="animate-pulse" style={{ animationDuration: "2.4s" }}>
          <circle cx="286" cy="154" r="3.5" fill="#00f0ff" />
          <circle cx="286" cy="154" r="7" stroke="#00f0ff" strokeWidth="1" opacity="0.6" />
          
          <circle cx="120" cy="245" r="2.5" fill="#38bdf8" />
          <circle cx="120" cy="245" r="5" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
};

export default NetraEyeScanner;
