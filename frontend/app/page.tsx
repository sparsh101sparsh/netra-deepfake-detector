"use client";

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
  const [introStage, setIntroStage] = useState<'intro' | 'morphing' | 'ready'>('intro');
  const [introProgress, setIntroProgress] = useState(0);
  const [activeNavSection, setActiveNavSection] = useState<string>("analyzer");

  // Run Butter-Smooth 120fps Intro Timeline (Only once per session, re-plays on page refresh)
  useEffect(() => {
    const navEntries = typeof window !== 'undefined' && window.performance?.getEntriesByType?.('navigation');
    const isReload = navEntries && (navEntries[0] as any)?.type === 'reload';
    const hasSeenIntro = typeof window !== 'undefined' && sessionStorage.getItem('netra_intro_seen');

    if (hasSeenIntro && !isReload) {
      setIntroStage('ready');
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('netra_intro_seen', 'true');
    }

    // Start sub-pixel progress fill
    const raf = setTimeout(() => {
      setIntroProgress(100);
    }, 50);

    // After 10.4s (or ESC), trigger GPU morph
    const tMorph = setTimeout(() => {
      setIntroStage('morphing');
      setTimeout(() => {
        setIntroStage('ready');
      }, 1200); // 1200ms silky GPU spring morph
    }, 10400);

    // Keyboard shortcut (ESC) to fast-forward morph immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIntroStage('morphing');
        setTimeout(() => setIntroStage('ready'), 600);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(raf);
      clearTimeout(tMorph);
    };
  }, []);

  // ScrollSpy to track active section in single-page view
  useEffect(() => {
    const sectionIds = ["analyzer", "mapping", "reported", "technology", "developers"];
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveNavSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveNavSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isIntroActive = introStage === 'intro';
  const isMorphing = introStage === 'morphing';

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden font-mono flex flex-col justify-between">
      
      {/* 1. Fullscreen Intro Eye Overlay with Hardware-Accelerated 120fps Morphing */}
      {introStage !== 'ready' && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] select-none pointer-events-none ${
            isMorphing
              ? 'opacity-0 scale-[0.22] translate-x-[26vw] -translate-y-[8vh]'
              : 'opacity-100 scale-100 translate-x-0 translate-y-0'
          }`}
          style={{
            transition: 'transform 1200ms cubic-bezier(0.19, 1, 0.22, 1), opacity 900ms cubic-bezier(0.19, 1, 0.22, 1)',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Ambient Radial Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-transparent blur-3xl"></div>
          </div>

          <div className="flex flex-col items-center justify-center relative z-20">
            {/* Top Motto Header: NETRA — Eyes that see through */}
            <div className={`mb-3 sm:mb-6 text-center transition-all duration-700 ${
              isMorphing ? 'opacity-0 -translate-y-6 scale-90' : 'opacity-100 translate-y-0 scale-100'
            }`}>
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-neutral-950/90 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,240,255,0.25)] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-white">
                  NETRA — <span className="text-cyan-400">Eyes that see through</span>
                </span>
              </div>
            </div>

            {/* Master Eye Vector */}
            <div className="w-[min(75vw,75vh)] h-[min(75vw,75vh)] max-w-[520px] max-h-[520px] flex items-center justify-center">
              <NetraEyeScanner size="100%" />
            </div>

            {/* Silky Horizontal Progress Bar */}
            <div 
              className={`-mt-6 sm:-mt-10 w-44 sm:w-60 h-[2.5px] bg-neutral-950 rounded-full overflow-hidden border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.15)] relative transition-opacity duration-300 ${
                isMorphing ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-sky-300 shadow-[0_0_10px_#00f0ff] rounded-full"
                style={{
                  width: `${introProgress}%`,
                  transition: `width 10400ms cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
              />
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
                <a
                  key={nav.href}
                  href={nav.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    nav.active
                      ? "bg-neutral-850 text-white font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)] border border-cyan-500/30"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {nav.active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
                  <IconComp className={`w-3.5 h-3.5 ${nav.active ? "text-cyan-400" : "text-neutral-500"}`} />
                  <span>{nav.label}</span>
                </a>
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
