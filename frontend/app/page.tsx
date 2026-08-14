"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LiveCyberScamNewsFeed } from "@/components/feed";
import { MultiModalForensicScanner } from "@/components/sandbox";
import { UltraFrameIntro } from "@/components/UltraFrameIntro";

export default function ForensicHub() {
  // ── Architecture of Truth Intro Animation (7.00s sequence + 0.75s hold) ──
  const [isIntroActive, setIsIntroActive] = useState<boolean>(true);

  useEffect(() => {
    const navEntries =
      typeof window !== "undefined" && window.performance?.getEntriesByType?.("navigation");
    const isReload = navEntries && (navEntries[0] as any)?.type === "reload";
    const hasSeenIntro =
      typeof window !== "undefined" && sessionStorage.getItem("netra_intro_seen");

    if (hasSeenIntro && !isReload) {
      setIsIntroActive(false);
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("netra_intro_seen", "true");
    }

    // After 7.75s (7.00s animation + 0.75s hold), instantly dismiss intro
    const tIntro = setTimeout(() => {
      setIsIntroActive(false);
    }, 7750);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsIntroActive(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(tIntro);
    };
  }, []);

  const handleFinishIntro = () => {
    setIsIntroActive(false);
  };

  return (
    <div className="min-h-screen bg-page text-ink relative overflow-x-hidden font-sans flex flex-col justify-between selection:bg-accent/20 selection:text-accent">

      {/* ── 1. Fullscreen Intro Overlay — Architecture of Truth (Instantly disappears when complete) ── */}
      {isIntroActive && (
        <div
          onClick={handleFinishIntro}
          className="fixed inset-0 z-50 overflow-hidden cursor-pointer w-screen h-screen"
        >
          <UltraFrameIntro onComplete={handleFinishIntro} showControls={false} className="w-full h-full" />
        </div>
      )}

      {/* ── 2. Sticky Navbar ── */}
      <div className={isIntroActive ? "opacity-0 pointer-events-none" : "opacity-100"}>
        <Navbar />
      </div>

      {/* ── 3. Main Split Command Center (Feed on Left + Forensic Scanner on Right) ── */}
      <main className={`flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 min-h-0 ${isIntroActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}>

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
      <div className={isIntroActive ? "opacity-0 pointer-events-none" : "opacity-100"}>
        <Footer />
      </div>
    </div>
  );
}
