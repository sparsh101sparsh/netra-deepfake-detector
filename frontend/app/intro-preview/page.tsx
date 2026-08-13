"use client";

/**
 * /app/intro-preview/page.tsx
 * Side-by-side preview of all 3 landing page intro animations.
 * Pick one and we'll apply it to the main page.
 */

import React, { useState } from "react";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import Link from "next/link";

// ── Option A: Original Fullscreen Eye Scanner (10.4s, cyan, GPU spring morph into logo) ──
function IntroA() {
  const [progress] = useState(72); // mock progress for preview
  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Ambient Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-transparent blur-3xl" />
      </div>

      <div className="flex flex-col items-center justify-center relative z-20">
        {/* NETRA tagline badge */}
        <div className="mb-4 inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-neutral-950/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.2)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-white">
            NETRA — <span className="text-cyan-400">Eyes that see through</span>
          </span>
        </div>

        {/* Eye Scanner */}
        <div className="w-[220px] h-[220px] flex items-center justify-center">
          <NetraEyeScanner size="100%" />
        </div>

        {/* Progress bar */}
        <div className="-mt-4 w-40 h-[2.5px] bg-neutral-950 rounded-full overflow-hidden border border-cyan-500/20 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-sky-300 shadow-[0_0_8px_#00f0ff] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        10.4s · Morph into logo · ESC to skip
      </div>
    </div>
  );
}

// ── Option B: SplashIntro (Design System version — 2.5s, accent/cyan gradient, telemetry stream) ──
function IntroB() {
  const telemetry = "CALIBRATING WAVEFORM ANALYZER...";
  const progress = 68;
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "oklch(0.209 0.004 264.477)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] rounded-full bg-gradient-to-r from-cyan-500/15 via-sky-500/5 to-transparent blur-3xl" />
      </div>

      <div className="flex flex-col items-center justify-center relative z-20 space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#060d1b]/90 border border-[#1e3a5f] shadow-md backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-mono font-semibold tracking-widest uppercase text-white">
            NETRA — <span className="text-cyan-400">FORENSIC SUITE</span>
          </span>
        </div>

        {/* Eye Scanner */}
        <div className="w-[180px] h-[180px] flex items-center justify-center">
          <NetraEyeScanner size="100%" />
        </div>

        {/* Telemetry */}
        <div className="h-5 flex items-center font-mono text-[11px] text-cyan-400 tracking-wider">
          {telemetry}
        </div>

        {/* Progress bar */}
        <div className="w-52 h-[2px] bg-[#050b14] rounded-full overflow-hidden border border-[#1e3a5f]">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-white rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip */}
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          Press ESC or click to skip
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        2.5s · Fade out · Telemetry stream
      </div>
    </div>
  );
}

// ── Option C: Card-style intro (design system v2 — amber/navy, NetraBrandLogo, amber progress bar) ──
function IntroC() {
  const progress = 62;
  return (
    <div className="relative w-full h-full bg-[#030914] flex items-center justify-center overflow-hidden select-none">
      {/* Ambient blobs */}
      <div className="absolute w-64 h-64 rounded-full bg-amber-500/15 blur-3xl mix-blend-screen pointer-events-none animate-pulse" />
      <div className="absolute w-56 h-56 rounded-full bg-blue-600/15 blur-3xl mix-blend-screen pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 rounded-3xl bg-[#0B1A2E]/80 border border-[#1E3A5F] shadow-[0_24px_80px_rgba(15,23,42,0.5)] backdrop-blur-2xl max-w-xs w-full text-center space-y-5">
        {/* Brand logo */}
        <div className="relative inline-flex items-center justify-center">
          <NetraBrandLogo size={64} />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-white">NETRA FORENSIC AI</h1>
          <div className="inline-block px-3 py-0.5 rounded-full bg-[#112745] border border-[#1E3A5F] text-[10px] font-bold tracking-widest text-amber-400 uppercase">
            Eyes that see through
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Multi-Modal Detection & Cybercrime Triage
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>INITIALIZING NEURAL WEIGHTS</span>
            <span className="text-amber-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#112745] rounded-full overflow-hidden border border-[#1E3A5F]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip */}
        <button className="text-[10px] text-slate-400 font-semibold pt-1">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#112745] border border-[#1E3A5F] text-[10px] text-amber-400 font-mono">ESC</kbd> or click to skip →
        </button>
      </div>

      <div className="absolute bottom-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
        5s · Card fade · Amber/navy palette
      </div>
    </div>
  );
}

const OPTIONS = [
  {
    key: "A",
    name: "Fullscreen Eye Scanner",
    desc: "10.4s cinematic. Fullscreen cyan eye on pure black. GPU spring morphs into navbar logo on complete.",
    commit: "8b00639",
    component: IntroA,
  },
  {
    key: "B",
    name: "SplashIntro (Design System)",
    desc: "2.5s fast. Design-token surfaces (obsidian bg). Telemetry stream text. Accent gradient progress bar.",
    commit: "8c957e2 SplashIntro",
    component: IntroB,
  },
  {
    key: "C",
    name: "Card-Style (Amber/Navy)",
    desc: "5s. Centered glassmorphic card with NetraBrandLogo. Amber CTA palette. Amber-to-blue progress bar.",
    commit: "1571904",
    component: IntroC,
  },
];

export default function IntroPreviewPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Landing Page Animation Preview</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Pick the intro animation you want — then tell me and I'll apply it.</p>
        </div>
        <Link href="/" className="text-xs text-neutral-500 hover:text-white transition-colors">← Back to site</Link>
      </div>

      {/* 3-column preview grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 divide-x divide-neutral-800">
        {OPTIONS.map((opt) => {
          const Comp = opt.component;
          const isSelected = selected === opt.key;
          return (
            <div key={opt.key} className="flex flex-col">
              {/* Preview frame */}
              <div
                className={`relative flex-1 min-h-[420px] cursor-pointer transition-all duration-200 ${
                  isSelected ? "ring-2 ring-inset ring-cyan-400" : "hover:brightness-110"
                }`}
                onClick={() => setSelected(opt.key)}
              >
                <Comp />
                {isSelected && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-cyan-400 text-black text-[11px] font-bold uppercase tracking-wide">
                    Selected
                  </div>
                )}
              </div>

              {/* Info row */}
              <div
                className={`p-4 border-t cursor-pointer transition-all ${
                  isSelected
                    ? "border-cyan-400/40 bg-cyan-400/5"
                    : "border-neutral-800 hover:bg-neutral-900"
                }`}
                onClick={() => setSelected(opt.key)}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-white">
                    <span className="text-cyan-400 mr-1.5">Option {opt.key}.</span>
                    {opt.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-400 shrink-0">
                    {opt.key === "A" ? "Current" : opt.key === "B" ? "Alt 1" : "Alt 2"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{opt.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom action bar */}
      <div className="p-5 border-t border-neutral-800 flex items-center justify-between gap-4">
        <div className="text-sm text-neutral-400">
          {selected
            ? `Option ${selected} selected — tell me to apply it`
            : "Click any preview above to select"}
        </div>
        {selected && (
          <div className="text-sm font-mono text-cyan-400">
            → Just say "use Option {selected}" in chat
          </div>
        )}
      </div>
    </div>
  );
}
