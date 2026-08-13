"use client";

import React, { useState, useEffect } from "react";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { Sparkles, ArrowRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SplashIntroProps {
  onComplete?: () => void;
  autoDismissMs?: number;
  skipSessionCheck?: boolean;
}

/**
 * SplashIntro — Fast, Polished Cinematic Introduction (~2.5s).
 * Features hardware-accelerated eye radar scanner, telemetry sequence,
 * smooth progress line, and instant ESC / click-to-skip functionality.
 */
export const SplashIntro: React.FC<SplashIntroProps> = ({
  onComplete,
  autoDismissMs = 2500,
  skipSessionCheck = false,
}) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [telemetryStep, setTelemetryStep] = useState(0);

  const telemetryMessages = [
    "INITIALIZING FORENSIC MATRIX...",
    "MOUNTING PADDLEOCR ENGINE v2.8...",
    "CALIBRATING WAVEFORM ANALYZER...",
    "FORENSIC GRID ACTIVE",
  ];

  useEffect(() => {
    // Check if intro was already seen this session (unless reload or override)
    if (!skipSessionCheck && typeof window !== "undefined") {
      const navEntries = window.performance?.getEntriesByType?.("navigation");
      const isReload = navEntries && (navEntries[0] as any)?.type === "reload";
      const hasSeen = sessionStorage.getItem("netra_splash_seen");

      if (hasSeen && !isReload) {
        setIsDone(true);
        if (onComplete) onComplete();
        return;
      }

      sessionStorage.setItem("netra_splash_seen", "true");
    }

    // Start progress line fill immediately
    const pTimer = setTimeout(() => {
      setProgress(100);
    }, 40);

    // Step through telemetry messages
    const stepInterval = (autoDismissMs - 600) / telemetryMessages.length;
    const stepTimers = telemetryMessages.map((_, i) =>
      setTimeout(() => {
        setTelemetryStep(i);
      }, i * stepInterval)
    );

    // ESC or Click skip handler
    const handleDismiss = () => {
      setIsRevealing(true);
      setTimeout(() => {
        setIsDone(true);
        if (onComplete) onComplete();
      }, 350);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Master completion timer
    const tFade = setTimeout(() => {
      setIsRevealing(true);
    }, autoDismissMs - 400);

    const tEnd = setTimeout(() => {
      setIsDone(true);
      if (onComplete) onComplete();
    }, autoDismissMs);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(pTimer);
      clearTimeout(tFade);
      clearTimeout(tEnd);
      stepTimers.forEach(clearTimeout);
    };
  }, [autoDismissMs, onComplete, skipSessionCheck]);

  if (isDone) return null;

  const handleSkip = () => {
    setIsRevealing(true);
    setTimeout(() => {
      setIsDone(true);
      if (onComplete) onComplete();
    }, 250);
  };

  return (
    <div
      onClick={handleSkip}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--page)] overflow-hidden select-none cursor-pointer transition-all duration-500 ease-out",
        isRevealing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      )}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Background Ambient Radial Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[min(90vw,650px)] h-[min(90vw,650px)] rounded-full bg-gradient-to-r from-accent/15 via-sky-500/5 to-transparent blur-3xl" />
      </div>

      {/* Center Container: Eye Scanner + Telemetry + Progress Bar */}
      <div className="flex flex-col items-center justify-center relative z-20 space-y-4 sm:space-y-6">
        
        {/* Top Header Motto Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-canvas/90 border-[1.5px] border-line shadow-card backdrop-blur-md animate-fade-in">
          <span className="size-1.5 rounded-full bg-accent animate-ping" />
          <span className="text-[11px] sm:text-xs font-mono font-semibold tracking-widest uppercase text-ink">
            NETRA — <span className="text-accent">FORENSIC SUITE</span>
          </span>
        </div>

        {/* Master Eye Scanner Vector */}
        <div className="w-[min(70vw,70vh)] h-[min(70vw,70vh)] max-w-[420px] max-h-[420px] flex items-center justify-center animate-fade-in">
          <NetraEyeScanner size="100%" />
        </div>

        {/* Real-Time Telemetry Stream Text */}
        <div className="h-5 flex items-center justify-center font-mono text-[11px] text-accent tracking-wider font-medium">
          <span>{telemetryMessages[telemetryStep]}</span>
        </div>

        {/* Horizontal Precision Progress Bar */}
        <div className="w-48 sm:w-64 h-[2px] bg-inset rounded-full overflow-hidden border border-line shadow-hairline relative">
          <div
            className="h-full bg-gradient-to-r from-accent via-sky-400 to-white shadow-[0_0_8px_var(--accent)] rounded-full"
            style={{
              width: `${progress}%`,
              transition: `width ${autoDismissMs - 400}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          />
        </div>

        {/* Skip Hint */}
        <div className="pt-2 text-[10px] font-mono text-ink-3 uppercase tracking-widest flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
          <span>Press ESC or Click anywhere to skip</span>
        </div>
      </div>
    </div>
  );
};

export default SplashIntro;
