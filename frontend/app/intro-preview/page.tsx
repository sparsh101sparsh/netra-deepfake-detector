"use client";

/**
 * /app/intro-preview/page.tsx
 * Interactive showcase of the redesigned Landing Page Animation vs the old ones.
 * Users can view the new institutional design language animation separately before integrating.
 */

import React, { useState } from "react";
import { NetraArchitectureIntro } from "@/components/NetraArchitectureIntro";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { InstitutionalEyeScanner } from "@/components/InstitutionalEyeScanner";
import { NewInstitutionalIntro } from "@/components/layout/NewInstitutionalIntro";
import { ArrowLeft, Sparkles, Check, Play, RefreshCw } from "lucide-react";
import Link from "next/link";

// ── Option 1 (RECOMMENDED): Architecture of Truth (Final Production Intro) ──
function IntroNewRedesign() {
  const [key, setKey] = useState(0);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#060608] overflow-hidden">
      <NetraArchitectureIntro key={key} onSkip={() => setKey((k) => k + 1)} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          setKey((k) => k + 1);
        }}
        className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-lg bg-[#18181B]/80 hover:bg-[#27272A] border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5 backdrop-blur-md transition-colors shadow-sm"
      >
        <RefreshCw className="size-3" />
        <span>Replay</span>
      </button>
    </div>
  );
}

// ── Option 2: Old Cyan Outline Eye Animation (Legacy - As in user uploaded image) ──
function IntroLegacyCyan() {
  const [progress] = useState(72);
  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Ambient Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-transparent blur-3xl" />
      </div>

      <div className="flex flex-col items-center justify-center relative z-20 space-y-4">
        {/* Old Cyan Badge */}
        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-neutral-950/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.2)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-white">
            NETRA — <span className="text-cyan-400">Eyes that see through</span>
          </span>
        </div>

        {/* Eye Scanner */}
        <div className="w-[200px] h-[200px] flex items-center justify-center">
          <NetraEyeScanner size="100%" />
        </div>

        {/* Progress bar */}
        <div className="w-40 h-[2.5px] bg-neutral-950 rounded-full overflow-hidden border border-cyan-500/20 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-sky-300 shadow-[0_0_8px_#00f0ff] rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        Legacy Cyan Aesthetic (Disconnected)
      </div>
    </div>
  );
}

// ── Option 3: Minimal Dark Radar Card ──
function IntroMinimalRadarCard() {
  const [progress] = useState(65);
  return (
    <div className="relative w-full h-full bg-[#0C0C0E] flex items-center justify-center p-6 select-none overflow-hidden">
      <div className="relative z-10 p-8 rounded-3xl bg-[#17191A] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-sm w-full text-center space-y-6">
        <div className="w-32 h-32 mx-auto flex items-center justify-center">
          <InstitutionalEyeScanner size="100%" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-white">NETRA FORENSIC AI</h2>
          <p className="text-xs font-mono text-zinc-400">MIL-SPEC BIOMETRIC SCANNER</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-zinc-400">
            <span>CALIBRATING OPTICAL SENSORS</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#18181B] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const OPTIONS = [
  {
    key: "NEW",
    name: "Redesigned Institutional Forensic Intro",
    badge: "Recommended",
    desc: "100% aligned with Beautiful UI design system. Obsidian palette (#0C0C0E), titanium/silver eye vector with 360° compass telemetry, laser traversal sweep, and live system boot terminal.",
    component: IntroNewRedesign,
  },
  {
    key: "LEGACY",
    name: "Current / Legacy Animation",
    badge: "Current (Unmatched)",
    desc: "The bright electric-cyan neon eye with heavy outer cyan dotted orbit. Bright neon colors clash with the dark institutional palette of the main application.",
    component: IntroLegacyCyan,
  },
  {
    key: "CARD",
    name: "Minimalist Floating Radar Card",
    badge: "Alternative",
    desc: "A compact floating forensic dialog card containing the new Institutional eye vector and telemetry progress bar.",
    component: IntroMinimalRadarCard,
  },
];

export default function IntroPreviewPage() {
  const [selected, setSelected] = useState<string>("NEW");
  const [fullscreenMode, setFullscreenMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#F4F4F6] font-sans flex flex-col selection:bg-white/20">
      {/* Header */}
      <header className="p-4 sm:p-6 border-b border-white/10 bg-[#17191A]/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Landing Page Animation Lab
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Interactive Preview
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Compare the redesigned landing animation against the legacy version before integrating into the main page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFullscreenMode(!fullscreenMode)}
            className="px-3.5 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-white/10 text-xs font-semibold text-white transition-colors flex items-center gap-2"
          >
            <Play className="size-3.5 text-emerald-400" />
            <span>{fullscreenMode ? "Exit Fullscreen" : "Test Fullscreen Intro"}</span>
          </button>

          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Main Site</span>
          </Link>
        </div>
      </header>

      {/* Fullscreen Overlay Test Mode */}
      {fullscreenMode && (
        <div className="fixed inset-0 z-50 bg-[#0C0C0E]">
          <NewInstitutionalIntro
            durationMs={7000}
            onComplete={() => setFullscreenMode(false)}
          />
          <button
            onClick={() => setFullscreenMode(false)}
            className="absolute top-6 right-6 z-50 px-3.5 py-1.5 rounded-xl bg-[#18181B] border border-white/15 text-xs font-mono text-white hover:bg-[#27272A]"
          >
            Close Fullscreen [ESC]
          </button>
        </div>
      )}

      {/* Main 3-Way Comparative Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-[600px]">
        {OPTIONS.map((opt) => {
          const Comp = opt.component;
          const isSelected = selected === opt.key;

          return (
            <div key={opt.key} className="flex flex-col h-full bg-[#0C0C0E]">
              {/* Preview Window Box */}
              <div
                onClick={() => setSelected(opt.key)}
                className={`relative flex-1 min-h-[460px] p-2 cursor-pointer transition-all duration-200 ${
                  isSelected ? "ring-2 ring-inset ring-white/30" : "hover:brightness-105"
                }`}
              >
                <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-[#0C0C0E] shadow-inner relative">
                  <Comp />
                </div>

                {isSelected && (
                  <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <Check className="size-3 stroke-[3]" />
                    Active View
                  </div>
                )}
              </div>

              {/* Description & Selection Card */}
              <div
                onClick={() => setSelected(opt.key)}
                className={`p-5 border-t border-white/10 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#17191A] border-white/20"
                    : "bg-[#0C0C0E] hover:bg-[#17191A]/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {opt.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      opt.key === "NEW"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : opt.key === "LEGACY"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-white/10 text-zinc-300 border border-white/10"
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {opt.desc}
                </p>
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer Instructions Bar */}
      <footer className="p-4 sm:p-5 border-t border-white/10 bg-[#17191A] flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-zinc-400 font-mono flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PREVIEW URL: <strong className="text-white">http://localhost:3000/intro-preview</strong></span>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Ready to integrate? Tell me whenever you are satisfied with the direction.
        </div>
      </footer>
    </div>
  );
}
