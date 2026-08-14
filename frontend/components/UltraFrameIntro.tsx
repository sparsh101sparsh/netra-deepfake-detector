"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export interface UltraFrameIntroProps {
  onComplete?: () => void;
  showControls?: boolean;
  className?: string;
}

// 420 discrete frames = Exactly 7.00 seconds at 60 FPS
const TOTAL_FRAMES = 420;
const FPS = 60;

const GLYPH_CHARS = "0123456789ABCDEF∆∇∑∏µ∂∫≈≠≡≤≥§ØΨΩ";

// Smooth easing functions for geometric morphing
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const UltraFrameIntro: React.FC<UltraFrameIntroProps> = ({
  onComplete,
  showControls = false,
  className = "",
}) => {
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isZoomedOnKite, setIsZoomedOnKite] = useState<boolean>(false);
  const [isHoldingFinal, setIsHoldingFinal] = useState<boolean>(false);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  const timeSeconds = (currentFrame / FPS).toFixed(2);

  const clearHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    isHoldingRef.current = false;
    setIsHoldingFinal(false);
  };

  // Animation Loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null && !isHoldingRef.current) {
        const delta = time - lastTimeRef.current;
        const framesToAdvance = (delta / (1000 / FPS)) * playbackSpeed;

        setCurrentFrame((prev) => {
          const next = prev + framesToAdvance;
          if (next >= TOTAL_FRAMES) {
            // Hold for 0.75 seconds on the complete final frame
            isHoldingRef.current = true;
            setIsHoldingFinal(true);
            if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = setTimeout(() => {
              isHoldingRef.current = false;
              setIsHoldingFinal(false);
              setCurrentFrame(TOTAL_FRAMES);
              if (onComplete) onComplete();
            }, 750 / playbackSpeed);
            return TOTAL_FRAMES;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, [isPlaying, playbackSpeed, onComplete]);

  const stepForward = (count = 1) => {
    clearHold();
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.min(TOTAL_FRAMES, prev + count));
  };

  const stepBackward = (count = 1) => {
    clearHold();
    setIsPlaying(false);
    setCurrentFrame((prev) => Math.max(0, prev - count));
  };

  const jumpToPhase = (frame: number) => {
    clearHold();
    setIsPlaying(false);
    setCurrentFrame(frame);
  };

  const restart = () => {
    clearHold();
    setCurrentFrame(0);
    setIsPlaying(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 7.00s CINEMATIC PIPELINE (420 FRAMES @ 60 FPS) ──
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Lead vectors & Pulses (0.5s – 1.6s)
  const leadProgress = Math.min(1, Math.max(0, (currentFrame - 30) / 45));
  const leadLength = leadProgress * 63;
  const leadOpacity = currentFrame >= 145 ? Math.max(0, 1 - (currentFrame - 145) / 20) : currentFrame >= 30 ? 0.75 : 0;

  // Convergence pulses (Frames 65 to 98)
  const pulseT = Math.min(1, Math.max(0, (currentFrame - 65) / 33));
  const pulseOpacity =
    currentFrame >= 65 && currentFrame <= 100
      ? pulseT < 0.85
        ? 1
        : 1 - (pulseT - 0.85) / 0.15
      : 0;
  const pulse1Pos = { x: 100, y: 38 + (100 - 38) * pulseT };
  const pulse2Pos = { x: 46 + (100 - 46) * pulseT, y: 131 + (100 - 131) * pulseT };
  const pulse3Pos = { x: 154 + (100 - 154) * pulseT, y: 131 + (100 - 131) * pulseT };

  // 2. Shockwave ripple at pulse impact (Frames 90 to 145)
  const shockwaveT = Math.min(1, Math.max(0, (currentFrame - 90) / 55));
  const shockwaveRadius = shockwaveT * 95;
  const shockwaveOpacity = shockwaveT > 0 && shockwaveT < 1 ? Math.sin(shockwaveT * Math.PI) * 0.7 : 0;

  // 3. Node dissolution (Frames 75 to 110)
  const nodeDissolveT = Math.min(1, Math.max(0, (currentFrame - 75) / 35));
  const nodeScale = Math.max(0, 1 - nodeDissolveT);
  const nodeOpacity = Math.max(0, 1 - nodeDissolveT);

  // 4. TRIANGLE ➔ KITE VERTEX INTERPOLATION (Frames 95 to 155 = 60 continuous frames)
  const morphT = Math.min(1, Math.max(0, (currentFrame - 95) / 60));
  const easedMorph = easeInOutCubic(morphT);

  const topVertex = { x: 100, y: 38 + (56 - 38) * easedMorph };
  const rightVertex = { x: 154 + (148 - 154) * easedMorph, y: 131 + (100 - 131) * easedMorph };
  const bottomVertex = { x: 100, y: 131 + (144 - 131) * easedMorph };
  const leftVertex = { x: 46 + (52 - 46) * easedMorph, y: 131 + (100 - 131) * easedMorph };

  const outerPolygonPoints = `${topVertex.x},${topVertex.y} ${rightVertex.x},${rightVertex.y} ${bottomVertex.x},${bottomVertex.y} ${leftVertex.x},${leftVertex.y}`;
  const outerPolygonOpacity = currentFrame < 90 ? 0 : Math.min(1, (currentFrame - 90) / 15);
  const outerPolygonStrokeWidth = 1.4 + 1.6 * easedMorph;

  // 5. INTERNAL FACETS & DIAMOND ASSEMBLY (Frames 130 to 185)
  const innerT = Math.min(1, Math.max(0, (currentFrame - 130) / 50));
  const easedInner = easeOutBack(innerT);

  const innerTop = { x: 100, y: 100 + (74 - 100) * easedInner };
  const innerRight = { x: 100 + (122 - 100) * easedInner, y: 100 };
  const innerBottom = { x: 100, y: 100 + (126 - 100) * easedInner };
  const innerLeft = { x: 100 + (78 - 100) * easedInner, y: 100 };

  const innerPolygonPoints = `${innerTop.x},${innerTop.y} ${innerRight.x},${innerRight.y} ${innerBottom.x},${innerBottom.y} ${innerLeft.x},${innerLeft.y}`;
  const innerOpacity = currentFrame < 130 ? 0 : Math.min(1, (currentFrame - 130) / 20);

  const facetLineT = Math.min(1, Math.max(0, (currentFrame - 140) / 45));
  const facetOpacity = facetLineT;

  const axisT = Math.min(1, Math.max(0, (currentFrame - 150) / 40));
  const axisHalfWidth = (148 - 100) * axisT;

  const dotT = Math.min(1, Math.max(0, (currentFrame - 155) / 35));
  const dotRadius = dotT * 8;
  const dotGlow = dotT > 0.8 ? "drop-shadow(0 0 10px #ffffff)" : "none";

  // ── 6. TEXT REVEAL & MATRIX COMPUTATIONS ──
  // Wordmark NETRA (Frames 170 to 225)
  const wordmarkT = Math.min(1, Math.max(0, (currentFrame - 175) / 38));
  const wordmarkOpacity = Math.min(1, Math.max(0, (currentFrame - 170) / 22));
  // Optical focus blur: starts at 3.5px at the start of NETRA, smoothly resolving to 0px
  const blurProgress = Math.min(1, Math.max(0, (currentFrame - 170) / 32));
  const wordmarkBlur = (3.5 * Math.pow(1 - blurProgress, 2)).toFixed(2);
  const wordmarkLetterSpacing = (0.4 - (0.4 - 0.15) * wordmarkT).toFixed(2);
  const wordmarkY = (6 * (1 - wordmarkT)).toFixed(1);

  const scrambledWordmark = useMemo(() => {
    if (currentFrame >= 215) return "NETRA";
    if (currentFrame < 170) return "";
    const target = "NETRA";
    const seed = Math.floor(currentFrame * 4.3);
    return target
      .split("")
      .map((char, i) => {
        const charThreshold = 175 + i * 8;
        if (currentFrame >= charThreshold) return char;
        return GLYPH_CHARS[(seed + i * 7) % GLYPH_CHARS.length];
      })
      .join("");
  }, [currentFrame]);

  // Hairline directly connects from NETRA (Frames 215 to 255)
  const hairlineT = Math.min(1, Math.max(0, (currentFrame - 215) / 35));
  const hairlineHeight = (32 * hairlineT).toFixed(1);
  const hairlineOpacity = currentFrame < 215 ? 0 : Math.min(1, (currentFrame - 215) / 12);

  // ── 7. MOTTO LASER WIPES (Frames 260 to 420) ──
  // Phase 1: Sanskrit (Frames 260 to 335)
  const laser1T = Math.min(1, Math.max(0, (currentFrame - 260) / 40));
  const laser1X = (laser1T * 100).toFixed(1);
  const laser1Opacity =
    currentFrame >= 260 && currentFrame <= 315
      ? laser1T < 0.85
        ? 1
        : 1 - (laser1T - 0.85) / 0.15
      : 0;

  const sanskritRel = currentFrame - 260;
  let sanskritOpacity = 0;
  let sanskritBlur = 8;
  if (sanskritRel >= 0 && sanskritRel < 75) {
    if (sanskritRel <= 20) {
      const t = sanskritRel / 20;
      sanskritOpacity = t;
      sanskritBlur = 8 * (1 - t);
    } else if (sanskritRel <= 52) {
      sanskritOpacity = 1;
      sanskritBlur = 0;
    } else {
      const t = (sanskritRel - 52) / 23;
      sanskritOpacity = 1 - t;
      sanskritBlur = 6 * t;
    }
  }

  // Phase 2: English (Frames 340 to 420 — Final holding state)
  const laser2T = Math.min(1, Math.max(0, (currentFrame - 340) / 40));
  const laser2X = (laser2T * 100).toFixed(1);
  const laser2Opacity =
    currentFrame >= 340 && currentFrame <= 395
      ? laser2T < 0.85
        ? 1
        : 1 - (laser2T - 0.85) / 0.15
      : 0;

  const englishRel = currentFrame - 340;
  let englishOpacity = 0;
  let englishBlur = 8;
  if (englishRel >= 0) {
    if (englishRel <= 24) {
      const t = englishRel / 24;
      englishOpacity = t;
      englishBlur = 8 * (1 - t);
    } else {
      englishOpacity = 1;
      englishBlur = 0;
    }
  }

  const closingOpacity = Math.min(1, Math.max(0, (currentFrame - 380) / 30));

  return (
    <div className={`w-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* ── OPTIONAL TIMELINE CONTROL DECK (For developer scrubbing/preview) ── */}
      {showControls && (
        <div className="w-full max-w-5xl px-4 py-3 bg-[#0E1118]/95 backdrop-blur-xl border border-white/10 rounded-2xl mb-6 shadow-2xl space-y-3 z-30">
          {/* Row 1: Playback Controls & Frame Milestones */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={restart}
                title="Rewind to Frame 0"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              >
                <RotateCcw className="size-3.5" />
              </button>

              <button
                onClick={() => stepBackward(10)}
                title="Step -10 Frames"
                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
              >
                -10F
              </button>

              <button
                onClick={() => stepBackward(1)}
                title="Step -1 Frame"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              >
                <ChevronLeft className="size-3.5" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-1.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-md min-w-[90px] justify-center"
              >
                {isPlaying ? <Pause className="size-3.5 fill-black" /> : <Play className="size-3.5 fill-black" />}
                <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
              </button>

              <button
                onClick={() => stepForward(1)}
                title="Step +1 Frame"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              >
                <ChevronRight className="size-3.5" />
              </button>

              <button
                onClick={() => stepForward(10)}
                title="Step +10 Frames"
                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
              >
                +10F
              </button>
            </div>

            {/* Timecode & Active Phase Readout */}
            <div className="flex items-center gap-3 bg-[#060608] px-3.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs">
              <div className="flex items-center gap-2 text-cyan-400">
                <span className={`size-2 rounded-full ${isPlaying ? "bg-cyan-400 animate-pulse" : "bg-zinc-500"}`} />
                <span className="font-bold">
                  FRAME: {String(Math.floor(currentFrame)).padStart(4, "0")} / {TOTAL_FRAMES}
                </span>
              </div>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-300 font-semibold">{timeSeconds}s</span>
              <span className="text-zinc-600">|</span>
              <span className="text-amber-400 font-semibold flex items-center gap-2">
                {isHoldingFinal && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] uppercase animate-pulse">
                    HOLDING 0.75s
                  </span>
                )}
                {currentFrame < 65 && "PHASE 1: 3-NODE GRID"}
                {currentFrame >= 65 && currentFrame < 95 && "PHASE 2: PULSES CONVERGING"}
                {currentFrame >= 95 && currentFrame < 155 && "★ PHASE 3: FLUID KITE MORPH ★"}
                {currentFrame >= 155 && currentFrame < 170 && "PHASE 4: FACETS & BEACON"}
                {currentFrame >= 170 && currentFrame < 225 && "PHASE 5: NETRA LOCK-IN"}
                {currentFrame >= 225 && currentFrame < 260 && "PHASE 6: LUMINOUS HAIRLINE"}
                {currentFrame >= 260 && currentFrame < 340 && "PHASE 7: SANSKRIT LASER"}
                {currentFrame >= 340 && currentFrame < 420 && "PHASE 8: ARCHITECTURE OF TRUTH"}
                {currentFrame >= 420 && !isHoldingFinal && "✓ COMPLETED"}
              </span>
            </div>

            {/* Speed & Kite Morph Zoom Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#060608] p-1 rounded-xl border border-white/10 gap-1">
                {[0.25, 0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                      playbackSpeed === s ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsZoomedOnKite(!isZoomedOnKite)}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-mono transition-colors flex items-center gap-1.5 ${
                  isZoomedOnKite
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {isZoomedOnKite ? <ZoomOut className="size-3" /> : <ZoomIn className="size-3" />}
                <span>{isZoomedOnKite ? "Reset View" : "Zoom Kite Morph"}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Direct Jump Phase Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
            <span className="text-zinc-500 mr-1 text-[10px] uppercase font-bold">Jump To:</span>
            {[
              { label: "1. Triangle Grid (F0)", frame: 0 },
              { label: "2. Pulse Travel (F65)", frame: 65 },
              { label: "★ 3. KITE MORPH (F95) ★", frame: 95, highlight: true },
              { label: "4. Facet Lines (F140)", frame: 140 },
              { label: "5. NETRA Lock-In (F170)", frame: 170 },
              { label: "6. Hairline (F215)", frame: 215 },
              { label: "7. Sanskrit Wipe (F260)", frame: 260 },
              { label: "8. English Truth Motto (F340)", frame: 340, highlight: true },
            ].map((item) => (
              <button
                key={item.frame}
                onClick={() => jumpToPhase(item.frame)}
                className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${
                  item.highlight
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500/25 shadow-sm"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Row 3: 7.00s Timeline Slider (420 Frames @ 60 FPS) */}
          <div className="space-y-1 pt-1">
            <input
              type="range"
              min={0}
              max={TOTAL_FRAMES}
              step={1}
              value={Math.floor(currentFrame)}
              onChange={(e) => {
                clearHold();
                setIsPlaying(false);
                setCurrentFrame(Number(e.target.value));
              }}
              className="w-full h-2.5 bg-[#18181B] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/10"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-1">
              <span>0.0s (F0)</span>
              <span className="text-cyan-400">1.1s (Pulses)</span>
              <span className="text-amber-400 font-bold">1.6s–2.6s (Kite Morph)</span>
              <span className="text-purple-400">3.0s (Decrypt)</span>
              <span className="text-emerald-400 font-bold">6.0s–7.0s (Truth Motto)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── THE VIEWPORT STAGE ── */}
      <div
        className={`w-full relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 ${
          showControls
            ? `max-w-5xl bg-[#060608] rounded-3xl border border-white/15 p-6 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.9)] ${
                isZoomedOnKite ? "min-h-[550px]" : "min-h-[640px] sm:min-h-[720px]"
              }`
            : "min-h-screen h-full bg-[#060608] p-6 sm:p-12 border-0"
        }`}
      >
        {/* Subtle Ambient Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.85,
          }}
        />


        {/* STAGE RIG */}
        <div
          className={`relative z-20 flex flex-col items-center text-center max-w-2xl w-full transition-transform duration-500 ${
            isZoomedOnKite ? "scale-[1.6] -translate-y-4" : "scale-100"
          }`}
        >
          {/* ───────────────────────────────────────────────────────────── */}
          {/* ── THE METAMORPHIC VECTOR RIG (TRIANGLE ➔ KITE EMBLEM) ── */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="relative w-52 h-52 sm:w-64 sm:h-64 mb-4 flex items-center justify-center">
            {/* Shockwave ripple expanding when pulses hit center */}
            {shockwaveOpacity > 0 && (
              <div
                className="pointer-events-none absolute"
                style={{
                  width: `${shockwaveRadius * 2}px`,
                  height: `${shockwaveRadius * 2}px`,
                  borderRadius: "50%",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                  boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
                  opacity: shockwaveOpacity,
                }}
              />
            )}

            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
              {/* 3 Lead Vectors drawing inwards */}
              {leadOpacity > 0 && (
                <>
                  <line
                    x1="100"
                    y1="38"
                    x2="100"
                    y2="100"
                    stroke="#fff"
                    strokeWidth="1"
                    strokeDasharray="63"
                    strokeDashoffset={63 - leadLength}
                    opacity={leadOpacity}
                  />
                  <line
                    x1="46"
                    y1="131"
                    x2="100"
                    y2="100"
                    stroke="#fff"
                    strokeWidth="1"
                    strokeDasharray="63"
                    strokeDashoffset={63 - leadLength}
                    opacity={leadOpacity}
                  />
                  <line
                    x1="154"
                    y1="131"
                    x2="100"
                    y2="100"
                    stroke="#fff"
                    strokeWidth="1"
                    strokeDasharray="63"
                    strokeDashoffset={63 - leadLength}
                    opacity={leadOpacity}
                  />
                </>
              )}

              {/* 3 Node Glyphs (Visual pixel grid, Vocal EQ, Semantic token dashes) */}
              {nodeOpacity > 0 && (
                <g opacity={nodeOpacity} transform={`scale(${nodeScale})`} transform-origin="100 100">
                  {/* Node 1: Visual (Top) */}
                  <path d="M92,26 V18 H100" fill="none" stroke="#fff" strokeWidth="1.4" />
                  <path d="M108,26 V18 H100" fill="none" stroke="#fff" strokeWidth="1.4" />
                  <g transform="translate(100,38)" fill="#fff">
                    {[-11, -3, 5].map((x, xi) =>
                      [-11, -3, 5].map((y, yi) => (
                        <rect
                          key={`${xi}-${yi}`}
                          x={x}
                          y={y}
                          width="6"
                          height="6"
                          opacity={0.4 + 0.5 * Math.sin(currentFrame * 0.15 + xi + yi)}
                        />
                      ))
                    )}
                  </g>

                  {/* Node 2: Vocal (Bottom-Left) */}
                  <path d="M34,140 V148 H42" fill="none" stroke="#fff" strokeWidth="1.4" />
                  <path d="M50,140 V148 H58" fill="none" stroke="#fff" strokeWidth="1.4" />
                  <g transform="translate(46,131)" fill="#fff">
                    <rect x="-11" y={-6 * Math.abs(Math.sin(currentFrame * 0.15))} width="3.4" height={12 * Math.abs(Math.sin(currentFrame * 0.15))} />
                    <rect x="-5.5" y={-11 * Math.abs(Math.sin(currentFrame * 0.18 + 1))} width="3.4" height={22 * Math.abs(Math.sin(currentFrame * 0.18 + 1))} />
                    <rect x="0" y={-4 * Math.abs(Math.sin(currentFrame * 0.12 + 2))} width="3.4" height={8 * Math.abs(Math.sin(currentFrame * 0.12 + 2))} />
                    <rect x="5.5" y={-9 * Math.abs(Math.sin(currentFrame * 0.2 + 3))} width="3.4" height={18 * Math.abs(Math.sin(currentFrame * 0.2 + 3))} />
                    <rect x="11" y={-6 * Math.abs(Math.sin(currentFrame * 0.14 + 4))} width="3.4" height={12 * Math.abs(Math.sin(currentFrame * 0.14 + 4))} />
                  </g>

                  {/* Node 3: Semantic (Bottom-Right) */}
                  <path d="M142,140 V148 H150" fill="none" stroke="#fff" strokeWidth="1.4" />
                  <path d="M158,140 V148 H166" fill="none" stroke="#fff" strokeWidth="1.4" />
                  <g transform="translate(154,131)" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                    <line x1="-11" y1="-9" x2="6" y2="-9" opacity={0.5 + 0.4 * Math.sin(currentFrame * 0.1)} />
                    <line x1="-11" y1="-3" x2="11" y2="-3" opacity={0.6 + 0.3 * Math.sin(currentFrame * 0.15 + 1)} />
                    <line x1="-11" y1="3" x2="-1" y2="3" opacity={0.4 + 0.5 * Math.sin(currentFrame * 0.2 + 2)} />
                    <line x1="-11" y1="9" x2="9" y2="9" opacity={0.5 + 0.4 * Math.sin(currentFrame * 0.12 + 3)} />
                  </g>
                </g>
              )}

              {/* 3 Convergence pulses traveling towards center */}
              {pulseOpacity > 0 && (
                <>
                  <circle cx={pulse1Pos.x} cy={pulse1Pos.y} r="3" fill="#fff" opacity={pulseOpacity} />
                  <circle cx={pulse2Pos.x} cy={pulse2Pos.y} r="3" fill="#fff" opacity={pulseOpacity} />
                  <circle cx={pulse3Pos.x} cy={pulse3Pos.y} r="3" fill="#fff" opacity={pulseOpacity} />
                </>
              )}

              {/* ★ CONTINUOUSLY MORPHING OUTER KITE POLYGON ★ */}
              {outerPolygonOpacity > 0 && (
                <polygon
                  points={outerPolygonPoints}
                  stroke="#ffffff"
                  strokeWidth={outerPolygonStrokeWidth}
                  fill="none"
                  strokeLinejoin="miter"
                  opacity={outerPolygonOpacity}
                  style={{
                    filter: easedMorph > 0.8 ? "drop-shadow(0 0 8px rgba(255,255,255,0.4))" : "none",
                  }}
                />
              )}

              {/* ★ INNER KITE DIAMOND (Unfolds line by line from center) ★ */}
              {innerOpacity > 0 && (
                <polygon
                  points={innerPolygonPoints}
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinejoin="miter"
                  opacity={innerOpacity}
                />
              )}

              {/* ★ 8 INTERNAL FACET CONNECTOR LINES ★ */}
              {facetOpacity > 0 && (
                <g stroke="#ffffff" strokeWidth="1.2" opacity={facetOpacity}>
                  {/* Top vertex to Inner Left/Right */}
                  <line x1={topVertex.x} y1={topVertex.y} x2={innerLeft.x} y2={innerLeft.y} />
                  <line x1={topVertex.x} y1={topVertex.y} x2={innerRight.x} y2={innerRight.y} />

                  {/* Bottom vertex to Inner Left/Right */}
                  <line x1={bottomVertex.x} y1={bottomVertex.y} x2={innerLeft.x} y2={innerLeft.y} />
                  <line x1={bottomVertex.x} y1={bottomVertex.y} x2={innerRight.x} y2={innerRight.y} />

                  {/* Left vertex to Inner Top/Bottom */}
                  <line x1={leftVertex.x} y1={leftVertex.y} x2={innerTop.x} y2={innerTop.y} />
                  <line x1={leftVertex.x} y1={leftVertex.y} x2={innerBottom.x} y2={innerBottom.y} />

                  {/* Right vertex to Inner Top/Bottom */}
                  <line x1={rightVertex.x} y1={rightVertex.y} x2={innerTop.x} y2={innerTop.y} />
                  <line x1={rightVertex.x} y1={rightVertex.y} x2={innerBottom.x} y2={innerBottom.y} />
                </g>
              )}

              {/* ★ HORIZONTAL AXIS (Draws from center outwards) ★ */}
              {axisT > 0 && (
                <line
                  x1={100 - axisHalfWidth}
                  y1="100"
                  x2={100 + axisHalfWidth}
                  y2="100"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  opacity={axisT}
                />
              )}

              {/* ★ CENTER DOT (Dilates & blooms) ★ */}
              {dotRadius > 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r={dotRadius}
                  fill="#ffffff"
                  style={{ filter: dotGlow }}
                />
              )}
            </svg>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* ── TEXT REVEAL SECTION (Hidden in Morph Zoom mode) ── */}
          {/* ───────────────────────────────────────────────────────────── */}
          {!isZoomedOnKite && (
            <>
              {/* WORDMARK: NETRA (Live glyph scramble decryption) */}
              <div
                className="font-bold text-4xl sm:text-6xl text-white font-sans transition-all duration-75"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: `${wordmarkLetterSpacing}em`,
                  filter: parseFloat(wordmarkBlur) > 0 ? `blur(${wordmarkBlur}px)` : "none",
                  opacity: wordmarkOpacity,
                  transform: `translateY(${wordmarkY}px)`,
                }}
              >
                {scrambledWordmark}
              </div>

              {/* LUMINOUS VERTICAL HAIRLINE (Directly connecting NETRA to motto) */}
              <div
                className="w-[1.5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] mt-7 mb-5"
                style={{
                  height: `${hairlineHeight}px`,
                  opacity: hairlineOpacity,
                }}
              />

              {/* TRILINGUAL MOTTO WITH LASER WIPES */}
              <div className="relative w-full min-h-[4.2em] flex items-center justify-center text-center overflow-hidden">
                {/* Laser lines */}
                {laser1Opacity > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_2px_#fff,0_0_24px_4px_#38bdf8] pointer-events-none"
                    style={{ left: `${laser1X}%`, opacity: laser1Opacity }}
                  />
                )}
                {laser2Opacity > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_2px_#fff,0_0_24px_4px_#38bdf8] pointer-events-none"
                    style={{ left: `${laser2X}%`, opacity: laser2Opacity }}
                  />
                )}

                {/* Sanskrit */}
                <div
                  className="absolute inset-0 flex items-center justify-center font-medium text-2xl sm:text-3xl text-white"
                  style={{
                    fontFamily: "'Noto Sans Devanagari', sans-serif",
                    opacity: sanskritOpacity,
                    filter: `blur(${sanskritBlur}px)`,
                    pointerEvents: sanskritOpacity > 0 ? "auto" : "none",
                  }}
                >
                  मायातीतं सत्यस्य चक्षुः
                </div>

                {/* English — Final Holding State */}
                <div
                  className="absolute inset-0 flex items-center justify-center font-mono font-semibold text-xs sm:text-base tracking-[0.22em] text-[#94A3B8]"
                  style={{
                    opacity: englishOpacity,
                    filter: `blur(${englishBlur}px)`,
                    pointerEvents: englishOpacity > 0 ? "auto" : "none",
                  }}
                >
                  BEYOND ILLUSION. THE ARCHITECTURE OF TRUTH.
                </div>
              </div>

              {/* CLOSING BADGE */}
              <div
                className="font-mono text-xs font-medium tracking-[0.18em] text-[#64748B] mt-4"
                style={{ opacity: closingOpacity }}
              >
                DEFENDING INDIA&apos;S DIGITAL MEDIA INTEGRITY
              </div>

              {/* NOTE: SKIP INTRO button removed per user request */}
            </>
          )}

          {/* In Morph Zoom Mode, show real-time vertex coordinate table */}
          {isZoomedOnKite && (
            <div className="mt-6 p-4 rounded-xl bg-[#0E1118]/90 border border-white/10 font-mono text-[10px] text-zinc-400 grid grid-cols-2 gap-3 text-left w-full max-w-md">
              <div>
                <div className="text-white font-bold mb-1">OUTER KITE VERTICES:</div>
                <div>Top: ({topVertex.x}, {topVertex.y.toFixed(1)})</div>
                <div>Right: ({rightVertex.x.toFixed(1)}, {rightVertex.y.toFixed(1)})</div>
                <div>Bottom: ({bottomVertex.x}, {bottomVertex.y.toFixed(1)})</div>
                <div>Left: ({leftVertex.x.toFixed(1)}, {leftVertex.y.toFixed(1)})</div>
              </div>
              <div>
                <div className="text-amber-400 font-bold mb-1">MORPH PARAMETERS:</div>
                <div>Progress: {(easedMorph * 100).toFixed(1)}%</div>
                <div>Facet Opacity: {(facetOpacity * 100).toFixed(0)}%</div>
                <div>Inner Diamond: {(easedInner * 100).toFixed(0)}%</div>
                <div>Core Dot: {dotRadius.toFixed(1)}px</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UltraFrameIntro;
