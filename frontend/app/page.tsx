"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, AlertCircle, Activity, Video, Scan, Eye, Cpu,
  ArrowRight, CheckCircle2, FileText, Code2, Database, Sparkles, Terminal, Radio, Globe, Key, Newspaper 
} from "lucide-react";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LiveThreatRadar } from "@/components/LiveThreatRadar";
import { MultiModalForensicScanner } from "@/components/MultiModalForensicScanner";
import { LiveCyberScamNewsFeed } from "@/components/LiveCyberScamNewsFeed";
import { ThreatCatalogSection } from "@/components/ThreatCatalogSection";
import { TechnologySection } from "@/components/TechnologySection";
import { DevelopersSection } from "@/components/DevelopersSection";

export default function ForensicHub() {
  const router = useRouter();
  
  // High frame rate GPU morphing state: 'intro' -> 'morphing' -> 'ready'
  const [introStage, setIntroStage] = useState<'intro' | 'morphing' | 'ready'>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('netra_intro_seen')) {
      return 'ready';
    }
    return 'intro';
  });
  const [introProgress, setIntroProgress] = useState(0);
  const [telemetryStatus, setTelemetryStatus] = useState("INITIALIZING NEURAL SENSORS");

  // Synchronized Intro Timeline (Smooth 0 to 100% calibration, then silky morph)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenIntro = sessionStorage.getItem('netra_intro_seen');
      if (hasSeenIntro) {
        setIntroStage('ready');
        return;
      }
      sessionStorage.setItem('netra_intro_seen', 'true');
    }

    const startTime = Date.now();
    const duration = 3600; // 3.6s total calibration duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setIntroProgress(pct);

      if (pct < 25) {
        setTelemetryStatus("INITIALIZING MULTI-MODAL FORENSIC PIPELINE...");
      } else if (pct < 50) {
        setTelemetryStatus("CALIBRATING 2D-DCT FREQUENCY SPECTRAL SENSORS...");
      } else if (pct < 75) {
        setTelemetryStatus("SYNCHRONIZING TAVILY LIVE CYBER INTEL FEED...");
      } else if (pct < 95) {
        setTelemetryStatus("LOADING OCR & NEURAL SCAM CLASSIFIER...");
      } else {
        setTelemetryStatus("FORENSIC NEURAL SUITE ONLINE");
      }

      if (pct >= 100) {
        clearInterval(interval);
        // Pause 300ms at 100%, then trigger morph
        setTimeout(() => {
          setIntroStage('morphing');
          setTimeout(() => {
            setIntroStage('ready');
          }, 700);
        }, 300);
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearInterval(interval);
        setIntroStage('morphing');
        setTimeout(() => setIntroStage('ready'), 250);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const skipIntro = () => {
    setIntroStage('morphing');
    setTimeout(() => setIntroStage('ready'), 250);
  };

  const isIntroActive = introStage === 'intro';
  const isMorphing = introStage === 'morphing';

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden font-mono flex flex-col justify-between">
      
      {/* 1. Fullscreen Intro Eye Overlay with Hardware-Accelerated Morphing */}
      {introStage !== 'ready' && (
        <div
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#000000] select-none ${
            isMorphing
              ? 'opacity-0 scale-[0.85] pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
          style={{
            transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform, opacity',
          }}
        >
          {/* Skip Button */}
          <button
            onClick={skipIntro}
            className="absolute top-6 right-6 z-30 px-3.5 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer font-mono"
          >
            Skip Intro [ESC]
          </button>

          {/* Ambient Radial Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-transparent blur-3xl"></div>
          </div>

          <div className="flex flex-col items-center justify-center relative z-20 px-4">
            {/* Top Motto Header: NETRA — Eyes that see through */}
            <div className={`mb-3 sm:mb-6 text-center transition-all duration-500 ${
              isMorphing ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
            }`}>
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-neutral-950/90 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,240,255,0.25)] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-white">
                  NETRA — <span className="text-cyan-400">Eyes that see through</span>
                </span>
              </div>
            </div>

            {/* Master Eye Vector */}
            <div className="w-[min(70vw,70vh)] h-[min(70vw,70vh)] max-w-[480px] max-h-[480px] flex items-center justify-center">
              <NetraEyeScanner size="100%" />
            </div>

            {/* Horizontal Progress Bar & Live Telemetry Milestone */}
            <div className="mt-2 flex flex-col items-center space-y-3 w-64 sm:w-80">
              <div className="w-full h-[3px] bg-neutral-900 rounded-full overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-sky-300 shadow-[0_0_12px_#00f0ff] rounded-full transition-all duration-75 ease-out"
                  style={{ width: `${introProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[10px] text-neutral-400 font-mono tracking-wider">
                <span className="text-cyan-400 truncate max-w-[200px]">{telemetryStatus}</span>
                <span className="text-white font-bold">{introProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Navigation Bar */}
      <header 
        className={`sticky top-0 z-40 border-b border-neutral-800/80 bg-[#030712]/90 backdrop-blur-xl transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] ${
          isIntroActive ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <NetraBrandLogo size={40} />
            <a 
              href="/" 
              className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors"
            >
              NETRA
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-900 border border-neutral-800 text-cyan-400">v5.1</span>
            </a>
          </div>

          {/* Navigation Links to Separate Pages */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-mono font-medium text-neutral-400 bg-neutral-950/70 p-1.5 rounded-2xl border border-neutral-850">
            {[
              { href: "/", label: "Scanner & Feed", icon: Scan, active: true },
              { href: "/radar", label: "Threat Mapping", icon: Globe, active: false },
              { href: "/reported", label: "Threat Catalog", icon: Database, active: false },
              { href: "/technology", label: "Technology", icon: Cpu, active: false },
              { href: "/developers", label: "Developer API", icon: Terminal, active: false },
            ].map((nav) => {
              const IconComp = nav.icon;
              return (
                <Link
                  key={nav.href}
                  href={nav.href}
                  onClick={(e) => {
                    if (nav.href === "/") {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    nav.active
                      ? "bg-neutral-850 text-white font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)] border border-cyan-500/30"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {nav.active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
                  <IconComp className={`w-3.5 h-3.5 ${nav.active ? "text-cyan-400" : "text-neutral-500"}`} />
                  <span>{nav.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <GoogleAuthButton />
          </div>
        </div>
      </header>

      {/* Main Single Command Center (Split Grid: Live Feed on Left, Multi-Modal Scanner on Right) */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 flex-1">
        <div 
          className={`transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] ${
            isIntroActive ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* LEFT BOX: 24-Hour Live Autonomous Cyber Scam Feed (Tavily) */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <LiveCyberScamNewsFeed compact={true} />
            </div>

            {/* RIGHT BOX: Complete Drag and Drop Multi-Modal Scanner (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <MultiModalForensicScanner />
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#02050c] py-10 text-xs font-mono text-neutral-400 mt-16">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <NetraBrandLogo size={28} />
            <div>
              <span className="font-bold text-white tracking-wider">NETRA FORENSIC AI</span>
              <div className="text-[10px] text-neutral-500">Eyes that see through • Institutional Forensic Suite</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a href="/" className="text-white font-bold transition-colors">Scanner & Feed</a>
            <a href="/radar" className="hover:text-white transition-colors">Threat Mapping</a>
            <a href="/reported" className="hover:text-white transition-colors">Threat Catalog</a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/developers" className="hover:text-white transition-colors">Developer API</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
