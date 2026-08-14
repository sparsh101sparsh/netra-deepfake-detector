"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LiveCyberScamNewsFeed } from "@/components/feed";
import { MultiModalForensicScanner } from "@/components/sandbox";
import { UltraFrameIntro } from "@/components/UltraFrameIntro";

export default function ForensicHub() {
  // ── Architecture of Truth Intro Animation (7.00s sequence + 0.75s hold) ──
  const [introStage, setIntroStage] = useState<"intro" | "morphing" | "ready">("intro");

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

    // After 7.75s (7.00s animation + 0.75s hold), trigger GPU spring morph into page
    const tMorph = setTimeout(() => {
      setIntroStage("morphing");
      setTimeout(() => {
        setIntroStage("ready");
      }, 1200); // 1200ms silky GPU spring morph
    }, 7750);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIntroStage("morphing");
        setTimeout(() => setIntroStage("ready"), 600);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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

      {/* ── 1. Fullscreen Intro Overlay — Architecture of Truth ── */}
      {introStage !== "ready" && (
        <div
          onClick={handleSkipIntro}
          className={`fixed inset-0 z-50 overflow-hidden cursor-pointer ${
            isMorphing
              ? "opacity-0 scale-[0.22] translate-x-[26vw] -translate-y-[8vh] pointer-events-none"
              : "opacity-100 scale-100 translate-x-0 translate-y-0"
          }`}
          style={{
            transition:
              "transform 1200ms cubic-bezier(0.19, 1, 0.22, 1), opacity 900ms cubic-bezier(0.19, 1, 0.22, 1)",
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden" as any,
            transformStyle: "preserve-3d",
          }}
        >
          <UltraFrameIntro onComplete={handleSkipIntro} showControls={false} />
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
