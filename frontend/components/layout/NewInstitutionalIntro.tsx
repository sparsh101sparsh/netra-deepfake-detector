"use client";

import React, { useState, useEffect } from "react";
import { InstitutionalEyeScanner } from "@/components/InstitutionalEyeScanner";
import { Shield, Sparkles, Terminal, Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NewInstitutionalIntroProps {
  onComplete?: () => void;
  durationMs?: number;
  interactivePreview?: boolean;
}

/**
 * NewInstitutionalIntro — Redesigned Landing Page Animation
 * Seamlessly matches the site's dark design tokens:
 * - Neutral obsidian background (#0C0C0E) with subtle ambient depth
 * - Institutional HUD header with live telemetry readout
 * - Premium InstitutionalEyeScanner vector with 360° radar and aperture breathing
 * - Micro-segmented calibration steps and progress tracker
 * - Keyboard shortcuts (ESC to skip) and click skip
 */
export const NewInstitutionalIntro: React.FC<NewInstitutionalIntroProps> = ({
  onComplete,
  durationMs = 6000,
  interactivePreview = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [telemetryIndex, setTelemetryIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const TELEMETRY_STAGES = [
    { label: "SYS.INIT", text: "INITIALIZING FORENSIC MATRIX CORE..." },
    { label: "NET.RADAR", text: "SYNCHRONIZING 360° THREAT RADAR NODES..." },
    { label: "AI.MODELS", text: "LOADING RESNET-50 & VISION TRANSFORMER..." },
    { label: "OCR.ENGINE", text: "MOUNTING PADDLEOCR v2.8 DETECTION..." },
    { label: "GRID.LIVE", text: "FORENSIC GRID ACTIVE // READY" },
  ];

  useEffect(() => {
    // Start progress
    const pTimer = setTimeout(() => {
      setProgress(100);
    }, 80);

    // Step through telemetry messages
    const stepDuration = (durationMs - 600) / TELEMETRY_STAGES.length;
    const timers = TELEMETRY_STAGES.map((_, i) =>
      setTimeout(() => {
        setTelemetryIndex(i);
      }, i * stepDuration)
    );

    // Auto dismiss
    let fadeTimer: NodeJS.Timeout;
    let endTimer: NodeJS.Timeout;

    if (!interactivePreview) {
      fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, durationMs - 500);

      endTimer = setTimeout(() => {
        setIsDismissed(true);
        if (onComplete) onComplete();
      }, durationMs);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !interactivePreview) {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsDismissed(true);
          if (onComplete) onComplete();
        }, 300);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(pTimer);
      timers.forEach(clearTimeout);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (endTimer) clearTimeout(endTimer);
    };
  }, [durationMs, interactivePreview, onComplete]);

  if (isDismissed) return null;

  const handleSkip = () => {
    if (interactivePreview) return;
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDismissed(true);
      if (onComplete) onComplete();
    }, 250);
  };

  const currentStage = TELEMETRY_STAGES[telemetryIndex];

  return (
    <div
      onClick={handleSkip}
      className={cn(
        "relative w-full h-full flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden font-sans",
        "bg-[#0C0C0E] text-[#F4F4F6]",
        isFadingOut ? "opacity-0 scale-[0.98] pointer-events-none" : "opacity-100 scale-100",
        "transition-all duration-500 ease-out"
      )}
    >
      {/* Background Subtlety: Hairline Radial Mesh & Inset Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Soft centered ambient bloom - subtle white/silver glow matching design system */}
        <div className="w-[min(90vw,650px)] h-[min(90vw,650px)] rounded-full bg-white/[0.03] blur-[120px]" />
        {/* Micro dot grid background */}
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{ 
            backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 0)", 
            backgroundSize: "24px 24px" 
          }} 
        />
      </div>

      {/* ── TOP HUD HEADER: Institutional Title & Live Status ── */}
      <div className="relative z-10 w-full max-w-xl flex items-center justify-between text-xs pt-2">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="font-bold text-sm tracking-tight text-white">
            NETRA <span className="text-zinc-500 font-normal">| FORENSIC AI</span>
          </span>
        </div>

        {/* Security Classification Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181B] border border-white/10 text-[11px] font-mono text-zinc-400">
          <Shield className="size-3 text-zinc-300" />
          <span>MIL-SPEC AUTH</span>
        </div>
      </div>

      {/* ── CENTER AREA: Institutional Eye Scanner & Radar HUD ── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-6 sm:space-y-8">
        
        {/* Tactical Scanner Container with Signature Layered Border */}
        <div className="relative p-2 sm:p-4 rounded-3xl bg-[#17191A]/40 border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {/* Corner Framing Marks */}
          <div className="absolute top-2 left-2 size-2 border-t-2 border-l-2 border-white/30 rounded-tl" />
          <div className="absolute top-2 right-2 size-2 border-t-2 border-r-2 border-white/30 rounded-tr" />
          <div className="absolute bottom-2 left-2 size-2 border-b-2 border-l-2 border-white/30 rounded-bl" />
          <div className="absolute bottom-2 right-2 size-2 border-b-2 border-r-2 border-white/30 rounded-br" />

          {/* Master SVG Scanner */}
          <div className="w-[min(65vw,400px)] h-[min(65vw,400px)] flex items-center justify-center">
            <InstitutionalEyeScanner size="100%" />
          </div>
        </div>

        {/* Brand Tagline */}
        <div className="text-center space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Beyond Illusion. The Architecture of Truth.
          </h2>
          <p className="text-xs text-zinc-400 font-mono tracking-wide">
            मायातीतं सत्यस्य चक्षुः • Defending India&apos;s Digital Media Integrity
          </p>
        </div>
      </div>

      {/* ── BOTTOM HUD: Telemetry Stream & Precision Progress Meter ── */}
      <div className="relative z-10 w-full max-w-md space-y-3 pb-2">
        {/* Live Terminal Telemetry Step */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <Terminal className="size-3.5 text-zinc-500 shrink-0" />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white font-semibold">
              {currentStage.label}
            </span>
            <span className="truncate text-zinc-300 text-[11px]">
              {currentStage.text}
            </span>
          </div>
          <span className="text-zinc-400 text-xs font-bold pl-2">
            {progress}%
          </span>
        </div>

        {/* Precision Progress Bar (Hairline white & silver gradient) */}
        <div className="w-full h-[3px] bg-[#18181B] rounded-full overflow-hidden border border-white/10 relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-zinc-500 via-zinc-200 to-white shadow-[0_0_10px_rgba(255,255,255,0.7)] rounded-full transition-all duration-[6000ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footer Guidance */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
          <span>SECURE PROTOCOL // 256-BIT</span>
          {!interactivePreview && (
            <span className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#18181B] border border-white/10 text-zinc-400 font-mono text-[9px]">ESC</kbd> to skip
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewInstitutionalIntro;
