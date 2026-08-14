"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface InstitutionalEyeScannerProps {
  className?: string;
  size?: number | string;
  isScanning?: boolean;
}

/**
 * InstitutionalEyeScanner — Premium Forensic AI Cyber Scanner
 * Built specifically to match NETRA's Beautiful UI design system:
 * - Ultra-refined obsidian/charcoal surfaces (#0C0C0E, #17191A, #18181B)
 * - 1.5px signature borders with subtle white/zinc specular highlights
 * - High-precision telemetry markings, concentric radar rings, and compass ticks
 * - Optical reticle & pupil aperture dilation
 * - Subtle dual-pulse laser sweep beam
 * - Soft ambient glow (balanced, zero cartoonish electric-cyan)
 */
export const InstitutionalEyeScanner: React.FC<InstitutionalEyeScannerProps> = ({
  className = "",
  size = "100%",
  isScanning = true,
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Obsidian Depth Radial Gradient */}
          <radialGradient
            id="obsidianBacking"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#18181B" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#17191A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0C0C0E" stopOpacity="0" />
          </radialGradient>

          {/* Precision Sclera Gradient */}
          <linearGradient id="scleraCavity" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#17191A" />
            <stop offset="50%" stopColor="#0C0C0E" />
            <stop offset="100%" stopColor="#18181B" />
          </linearGradient>

          {/* Iris Titanium / Muted Steel Gradient */}
          <radialGradient
            id="irisCoreGrad"
            cx="50%"
            cy="50%"
            r="50%"
            fx="40%"
            fy="40%"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#A1A1AA" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#27272A" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#17191A" stopOpacity="1" />
          </radialGradient>

          {/* Hairline Eyelid Rim Gradient */}
          <linearGradient id="hairlineEyelid" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="75%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>

          {/* Ambient Scanner Glow */}
          <filter id="softLaserGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="reticleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Eye Path Clip to contain internal scanning elements */}
          <clipPath id="eyeCavityClip">
            <path d="M 110 300 C 180 160, 420 160, 490 300 C 420 440, 180 440, 110 300 Z" />
          </clipPath>
        </defs>

        <style>{`
          .rotate-clockwise-slow {
            transform-origin: 300px 300px;
            animation: netraRotateSlow 28s linear infinite;
          }
          .rotate-counter-slow {
            transform-origin: 300px 300px;
            animation: netraRotateCounter 22s linear infinite;
          }
          .radar-beam-sweep {
            transform-origin: 300px 300px;
            animation: netraRadarSweep 4s linear infinite;
          }
          .pupil-breathe {
            transform-origin: 300px 300px;
            animation: netraPupilBreathe 4.5s ease-in-out infinite;
          }
          .laser-line-scan {
            animation: netraLaserScan 3.2s ease-in-out infinite;
          }
          .reticle-bracket {
            animation: netraBracketPulse 3s ease-in-out infinite;
          }
          .eyelid-ambient-pulse {
            animation: netraEyelidPulse 4s ease-in-out infinite;
          }

          @keyframes netraRotateSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes netraRotateCounter {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes netraRadarSweep {
            0% { transform: rotate(0deg); opacity: 0.8; }
            50% { transform: rotate(180deg); opacity: 0.4; }
            100% { transform: rotate(360deg); opacity: 0.8; }
          }
          @keyframes netraPupilBreathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.12); }
          }
          @keyframes netraLaserScan {
            0% { transform: translateY(-130px); opacity: 0; }
            15% { opacity: 0.9; }
            85% { opacity: 0.9; }
            100% { transform: translateY(130px); opacity: 0; }
          }
          @keyframes netraBracketPulse {
            0%, 100% { opacity: 0.4; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.02); }
          }
          @keyframes netraEyelidPulse {
            0%, 100% { stroke-opacity: 0.85; }
            50% { stroke-opacity: 1; }
          }
        `}</style>

        {/* ── Layer 1: Ambient Background Disc & Radar Grid ── */}
        <circle cx="300" cy="300" r="240" fill="url(#obsidianBacking)" />

        {/* Outer Circular Boundary with subtle dashed telemetry */}
        <circle
          cx="300"
          cy="300"
          r="236"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1.5"
        />
        <circle
          cx="300"
          cy="300"
          r="212"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          className="rotate-clockwise-slow"
        />
        <circle
          cx="300"
          cy="300"
          r="190"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />

        {/* ── Layer 2: 360-Degree Radar Compass Calibrations (48 Ticks) ── */}
        <g className="rotate-counter-slow" opacity="0.6">
          {Array.from({ length: 48 }).map((_, i) => {
            const angle = (i * 360) / 48;
            const isCardinal = i % 12 === 0;
            const isMajor = i % 4 === 0;
            const r1 = isCardinal ? 218 : isMajor ? 222 : 226;
            const r2 = 232;
            const strokeColor = isCardinal
              ? "#FFFFFF"
              : isMajor
              ? "rgba(255,255,255,0.5)"
              : "rgba(255,255,255,0.2)";
            const strokeWidth = isCardinal ? 2 : isMajor ? 1.5 : 1;

            return (
              <line
                key={i}
                x1="300"
                y1={300 - r1}
                x2="300"
                y2={300 - r2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                transform={`rotate(${angle}, 300, 300)`}
              />
            );
          })}
        </g>

        {/* Outer HUD Corner Crosshairs / Reticle brackets */}
        <g className="reticle-bracket" style={{ transformOrigin: "300px 300px" }}>
          {/* Top Left Bracket */}
          <path
            d="M 140 180 L 140 150 L 170 150"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Top Right Bracket */}
          <path
            d="M 460 180 L 460 150 L 430 150"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Bottom Left Bracket */}
          <path
            d="M 140 420 L 140 450 L 170 450"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Bottom Right Bracket */}
          <path
            d="M 460 420 L 460 450 L 430 450"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Technical Coordinate Typography Marks */}
        <text
          x="142"
          y="138"
          fill="rgba(255,255,255,0.45)"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="1.5"
        >
          SYS.RADAR // 360°
        </text>
        <text
          x="458"
          y="138"
          fill="rgba(255,255,255,0.45)"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="1.5"
          textAnchor="end"
        >
          AUTH.MATRIX // v5.2
        </text>
        <text
          x="142"
          y="472"
          fill="rgba(255,255,255,0.35)"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="1.5"
        >
          LOC: 28.6139° N
        </text>
        <text
          x="458"
          y="472"
          fill="rgba(255,255,255,0.35)"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="1.5"
          textAnchor="end"
        >
          77.2090° E
        </text>

        {/* Rotating Radar Sweep Beam */}
        {isScanning && (
          <g className="radar-beam-sweep">
            <path
              d="M 300 300 L 490 200 A 212 212 0 0 0 450 140 Z"
              fill="url(#radarBeamGrad)"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="radarBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </g>
        )}

        {/* ── Layer 3: Sclera (The Anatomical Eye Body) ── */}
        <g id="scleraGroup">
          {/* Subtle Outer Drop Glow for the eye silhouette */}
          <path
            d="M 110 300 C 180 160, 420 160, 490 300 C 420 440, 180 440, 110 300 Z"
            fill="url(#scleraCavity)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />

          {/* Sclera Internal Mask for scanning effects */}
          <g clipPath="url(#eyeCavityClip)">
            {/* Background Optical Graticule inside the eye */}
            <line
              x1="110"
              y1="300"
              x2="490"
              y2="300"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <line
              x1="300"
              y1="160"
              x2="300"
              y2="440"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            {/* Subtle Horizon Waveform Track */}
            <path
              d="M 130 300 Q 210 280 300 300 T 470 300"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* ── Iris & Pupil Aperture (Hardware-accelerated breath) ── */}
            <g className="pupil-breathe">
              {/* Outer Iris Track / Halo */}
              <circle
                cx="300"
                cy="300"
                r="78"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <circle
                cx="300"
                cy="300"
                r="64"
                fill="url(#irisCoreGrad)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
              />

              {/* Technical Iris Notch Rings (Segmented Aperture Blades) */}
              <circle
                cx="300"
                cy="300"
                r="52"
                stroke="#0C0C0E"
                strokeWidth="2.5"
                strokeDasharray="14 8"
              />

              {/* Core Pupil Cavity */}
              <circle cx="300" cy="300" r="34" fill="#09090B" />

              {/* Reticle Focus Ring */}
              <circle
                cx="300"
                cy="300"
                r="22"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.85"
              />

              {/* Pure High-Spec Central Glint */}
              <circle cx="300" cy="300" r="8" fill="#FFFFFF" />
              <circle cx="312" cy="288" r="3.5" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Vertical Optical Laser Scan Beam (Travelling) */}
            {isScanning && (
              <g className="laser-line-scan" style={{ transformOrigin: "300px 300px" }}>
                <line
                  x1="130"
                  y1="300"
                  x2="470"
                  y2="300"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter="url(#softLaserGlow)"
                />
                <line
                  x1="130"
                  y1="300"
                  x2="470"
                  y2="300"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="6"
                  filter="url(#softLaserGlow)"
                />
              </g>
            )}
          </g>
        </g>

        {/* ── Layer 4: Signature Eyelid Contours (Crisp 1.5px / 2px White Rim) ── */}
        <g className="eyelid-ambient-pulse">
          {/* Upper Eyelid Curve */}
          <path
            d="M 110 300 C 180 160, 420 160, 490 300"
            fill="none"
            stroke="url(#hairlineEyelid)"
            strokeWidth="2.8"
            strokeLinecap="round"
            filter="url(#softLaserGlow)"
          />

          {/* Lower Eyelid Curve */}
          <path
            d="M 110 300 C 180 440, 420 440, 490 300"
            fill="none"
            stroke="url(#hairlineEyelid)"
            strokeWidth="2.8"
            strokeLinecap="round"
            filter="url(#softLaserGlow)"
          />

          {/* Corner Pivot Dots (Canthus Nodes) */}
          <circle cx="110" cy="300" r="3.5" fill="#FFFFFF" />
          <circle cx="490" cy="300" r="3.5" fill="#FFFFFF" />
          <circle
            cx="110"
            cy="300"
            r="8"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle
            cx="490"
            cy="300"
            r="8"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </g>

        {/* ── Layer 5: Forensic HUD Callouts & Indicators ── */}
        <g opacity="0.8">
          {/* Target Acquisition Center Pointers */}
          <line
            x1="300"
            y1="190"
            x2="300"
            y2="204"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="300"
            y1="410"
            x2="300"
            y2="396"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="190"
            y1="300"
            x2="204"
            y2="300"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="410"
            y1="300"
            x2="396"
            y2="300"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Tiny Status Indicator Lamp (Emerald Verified Dot) */}
          <circle cx="410" cy="200" r="3" fill="#22C55E" />
          <circle
            cx="410"
            cy="200"
            r="6"
            stroke="rgba(34,197,94,0.4)"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
};

export default InstitutionalEyeScanner;
