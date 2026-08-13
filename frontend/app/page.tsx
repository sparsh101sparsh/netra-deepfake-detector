"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LiveCyberScamNewsFeed } from "@/components/feed";
import { MultiModalForensicScanner } from "@/components/sandbox";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";

export default function ForensicHub() {
  // ── Original 10.4s Master Cinematic Eye Scanner Animation ──
  const [introStage, setIntroStage] = useState<"intro" | "morphing" | "ready">("intro");
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    const navEntries =
      typeof window !== "undefined" && window.performance?.getEntriesByType?.("navigation");
    const isReload = navEntries && (navEntries[0] as any)?.type === "reload";
    const hasSeenIntro =
      typeof window !== "undefined" && sessionStorage.getItem("netra_intro_seen");

    if (hasSeenIntro && !isReload) {
      setIntroStage("ready");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("netra_intro_seen", "true");
    }

    // Start sub-pixel progress fill
    const raf = setTimeout(() => {
      setIntroProgress(100);
    }, 50);

    // After 10.4s (or ESC/click), trigger GPU morph
    const tMorph = setTimeout(() => {
      setIntroStage("morphing");
      setTimeout(() => {
        setIntroStage("ready");
      }, 1200); // 1200ms silky GPU spring morph
    }, 10400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIntroStage("morphing");
        setTimeout(() => setIntroStage("ready"), 600);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(raf);
      clearTimeout(tMorph);
    };
  }, []);

  const isIntroActive = introStage === "intro";
  const isMorphing = introStage === "morphing";

  const handleSkipIntro = () => {
    setIntroStage("morphing");
    setTimeout(() => setIntroStage("ready"), 600);
  };

  return (
    <div className="min-h-screen bg-page text-ink relative overflow-x-hidden font-sans flex flex-col justify-between selection:bg-accent/20 selection:text-accent">

      {/* ── 1. Fullscreen Intro Eye Overlay with Hardware-Accelerated 120fps Morphing ── */}
      {introStage !== "ready" && (
        <div
          onClick={handleSkipIntro}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] select-none cursor-pointer overflow-hidden ${
            isMorphing
              ? "opacity-0 scale-[0.22] translate-x-[26vw] -translate-y-[8vh] pointer-events-none"
              : "opacity-100 scale-100 translate-x-0 translate-y-0"
          }`}
          style={{
            transition:
              "transform 1200ms cubic-bezier(0.19, 1, 0.22, 1), opacity 900ms cubic-bezier(0.19, 1, 0.22, 1)",
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Ambient Multi-Layer Radial Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[min(90vw,700px)] h-[min(90vw,700px)] rounded-full bg-gradient-to-r from-accent/10 via-sky-500/10 to-transparent blur-[120px]" />
          </div>

          <div className="flex flex-col items-center justify-center relative z-20 space-y-2 sm:space-y-4">
            {/* Top Motto Header: Pure Large Text Without Borders */}
            <div
              className={`text-center transition-all duration-700 ${
                isMorphing ? "opacity-0 -translate-y-6 scale-90" : "opacity-100 translate-y-0 scale-100"
              }`}
            >
              <div className="text-xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                NETRA: <span className="text-accent">Eyes that see through</span>
              </div>
            </div>

            {/* Master Eye Vector with Dashed Outer Scanning Orbit */}
            <div className="w-[min(72vw,72vh)] h-[min(72vw,72vh)] max-w-[500px] max-h-[500px] flex items-center justify-center">
              <NetraEyeScanner size="100%" />
            </div>

            {/* Precision Loading Bar */}
            <div
              className={`-mt-4 sm:-mt-6 flex flex-col items-center w-60 sm:w-80 transition-opacity duration-300 ${
                isMorphing ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="w-full h-[3px] bg-inset rounded-full overflow-hidden border border-line shadow-hairline relative">
                <div
                  className="h-full bg-gradient-to-r from-accent via-sky-400 to-white shadow-[0_0_12px_rgba(245,158,11,0.5)] rounded-full"
                  style={{
                    width: `${introProgress}%`,
                    transition: `width 10400ms cubic-bezier(0.16, 1, 0.3, 1)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Sticky Navbar (fades in after intro) ── */}
      <div
        style={{
          opacity: isIntroActive ? 0 : 1,
          transform: isIntroActive ? "translateY(-16px)" : "translateY(0)",
          transition: "opacity 1s cubic-bezier(0.19,1,0.22,1), transform 1s cubic-bezier(0.19,1,0.22,1)",
          willChange: "transform, opacity",
        }}
      >
        <Navbar />
      </div>

      {/* ── 3. Main Split Command Center (Feed on Left + Forensic Scanner on Right) ── */}
      <main
        className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 min-h-0"
        style={{
          opacity: isIntroActive ? 0 : 1,
          transition: "opacity 0.8s ease 0.2s",
        }}
      >
        <section
          aria-label="Forensic Scanner & Live Scam Feed"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch flex-1 min-h-[680px]"
        >
          {/* Left: Live Scam Feed */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <LiveCyberScamNewsFeed compact={false} className="h-full flex flex-col" />
          </div>

          {/* Right: Forensic Scanner */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <MultiModalForensicScanner className="h-full flex flex-col" />
          </div>
        </section>
      </main>

      {/* ── 4. Footer at bottom of page ── */}
      <div
        style={{
          opacity: isIntroActive ? 0 : 1,
          transition: "opacity 0.8s ease 0.3s",
        }}
      >
        <Footer />
      </div>
    </div>
  );
}
