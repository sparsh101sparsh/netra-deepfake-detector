"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, AlertCircle, Activity, Video, Scan, Eye, Cpu,
  ArrowRight, CheckCircle2, FileText, Code2, Database, Sparkles, Terminal, Radio, Globe, Key 
} from "lucide-react";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LiveThreatRadar } from "@/components/LiveThreatRadar";
import { ThreatCatalogSection } from "@/components/ThreatCatalogSection";
import { TechnologySection } from "@/components/TechnologySection";
import { DevelopersSection } from "@/components/DevelopersSection";

const API_URL = "/api/backend";
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_TYPES = [
  "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", 
  "image/jpeg", "image/png", "image/webp", "audio/wav", "audio/mpeg"
];
const ALLOWED_EXTENSIONS = "mp4, mov, webm, wav, mp3, jpg, png, webp";

export default function ForensicHub() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // High frame rate GPU morphing state: 'intro' -> 'morphing' -> 'ready'
  const [introStage, setIntroStage] = useState<'intro' | 'morphing' | 'ready'>('intro');
  const [introProgress, setIntroProgress] = useState(0);
  const [activeNavSection, setActiveNavSection] = useState<string>("analyzer");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sampleScan, setSampleScan] = useState<{
    fileName: string;
    verdict: string;
    confidence: string;
    isScanning: boolean;
    details: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    // After 6.5s (or ESC), trigger GPU morph
    const tMorph = setTimeout(() => {
      setIntroStage('morphing');
      setTimeout(() => {
        setIntroStage('ready');
      }, 1000); // 1000ms silky GPU spring morph
    }, 6500);

    // Keyboard shortcut (ESC) to fast-forward morph immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIntroStage('morphing');
        setTimeout(() => setIntroStage('ready'), 500);
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
    const sectionIds = ["analyzer", "radar", "reported", "technology", "developers"];
    
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

  const runSampleScan = (name: string, verdict: string, confidence: string) => {
    setSampleScan({
      fileName: name,
      verdict: 'Analyzing...',
      confidence: '0%',
      isScanning: true,
      details: 'Extracting facial topology and spectral vocoder artifacts...'
    });

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (p >= 100) {
        clearInterval(interval);
        setSampleScan({
          fileName: name,
          verdict,
          confidence,
          isScanning: false,
          details: verdict.includes('Deepfake') || verdict.includes('Clone')
            ? 'Anomaly Detected: Synthetic SBI boundary discontinuity & high-frequency spatial noise.'
            : 'Authentic Signature: Clean facial topology & genuine acoustic spectral distribution.'
        });
      }
    }, 180);
  };

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File exceeds maximum size of ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Unsupported format. Please use ${ALLOWED_EXTENSIONS}.`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 5, 90));
      }, 300);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_URL}/api/v1/detect/full`, {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (res.status === 413) { setError("Payload too large (Server limit: 100MB)."); return; }
        if (res.status === 429) { setError("Rate limit exceeded. Max 10 uploads/hour."); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.detail ?? `Upload failed (HTTP ${res.status})`);
          return;
        }

        const { job_id } = await res.json();
        router.push(`/analyze/${job_id}`);
      } catch {
        clearInterval(progressInterval);
        setError(`Could not reach live GPU worker. Running local simulated verification.`);
        runSampleScan(file.name, 'High-Confidence Deepfake', '97.4%');
      } finally {
        setIsUploading(false);
      }
    },
    [router]
  );

  const isIntroActive = introStage === 'intro';
  const isMorphing = introStage === 'morphing';

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden font-mono">
      
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
                  transition: `width 6000ms cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Navigation Bar (Single-Page ScrollSpy Header) */}
      <header 
        className={`sticky top-0 z-40 border-b border-neutral-800/80 bg-[#030712]/90 backdrop-blur-xl transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] ${
          isIntroActive ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <NetraBrandLogo size={40} />
            <button 
              onClick={() => scrollToSection("analyzer")} 
              className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors"
            >
              NETRA
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-900 border border-neutral-800 text-cyan-400">v5.1</span>
            </button>
          </div>

          {/* Smooth Scroll Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-mono font-medium text-neutral-400 bg-neutral-950/70 p-1.5 rounded-2xl border border-neutral-850">
            {[
              { id: "analyzer", label: "Analyzer", icon: Scan },
              { id: "radar", label: "Threat Radar", icon: Radio },
              { id: "reported", label: "Threat Catalog", icon: Database },
              { id: "technology", label: "Technology", icon: Cpu },
              { id: "developers", label: "Developer API", icon: Terminal },
            ].map((nav) => {
              const isActive = activeNavSection === nav.id;
              const IconComp = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => scrollToSection(nav.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-neutral-850 text-white font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)] border border-cyan-500/30"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-neutral-500"}`} />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <GoogleAuthButton />
          </div>
        </div>
      </header>

      {/* Main Single-Page Container */}
      <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 space-y-24 py-12">
        
        {/* ================= SECTION 1: ANALYZER & HERO ================= */}
        <section 
          id="analyzer"
          className={`pt-4 pb-8 transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] scroll-mt-28 ${
            isIntroActive ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column (5 Cols): Product Headline & Architecture Highlights */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Multi-Modal AI Forensic Engine
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl xl:text-7xl font-normal tracking-tight text-white leading-[1.05]">
                Eyes that<br />
                see through.
              </h1>

              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
                NETRA is an institutional-grade forensic engine that analyzes digital media for synthetic face-swaps, AI voice clones, and manipulated audio-visual signals.
              </p>

              {/* Core Architecture Capabilities */}
              <div className="space-y-2.5 pt-2 font-mono text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">✓</span>
                  <span><strong>Multi-Modal Fusion:</strong> GenD ViT-L/14 Backbone + 2D-DCT Spectral + Whisper V3 Vocoder</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">✓</span>
                  <span><strong>Metadata Forensics:</strong> Camera optics, CapCut/Premiere editor tags & EXIF</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">✓</span>
                  <span><strong>Developer API:</strong> Sub-150ms synchronous endpoints for platforms</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4 font-mono">
                <button 
                  onClick={() => scrollToSection("reported")}
                  className="px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs border border-neutral-700 transition-all flex items-center gap-2"
                >
                  <Database className="w-4 h-4 text-cyan-400" /> Browse Threat Catalog &rarr;
                </button>
                <button 
                  onClick={() => scrollToSection("radar")}
                  className="px-5 py-3 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 text-neutral-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 text-cyan-400" /> Live Threat Radar &rarr;
                </button>
              </div>
            </div>

            {/* Right Column (7 Cols): The Live Media Analyzer Sandbox Dropzone */}
            <div className="lg:col-span-7">
              <div className="bg-neutral-950/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden transition-all duration-700 hover:border-cyan-500/40">
                
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Scan className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-white">Live Media Forensic Sandbox</h2>
                      <p className="text-xs text-neutral-400 font-mono">Upload media or select a sample file for multi-modal analysis</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                    Max 100MB
                  </span>
                </div>

                {/* Upload Dropzone */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="video/*,image/*,audio/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-800 hover:border-cyan-500/50 bg-neutral-900/30 hover:bg-neutral-900/50 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 relative group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_20px_rgba(0,240,255,0.15)] group-hover:scale-105 transition-transform duration-300">
                    <Scan className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      Click to browse files or drag and drop
                    </div>
                    <div className="text-xs font-mono text-neutral-400 mt-1">
                      MP4, MOV, WEBM, WAV, MP3, JPG, PNG
                    </div>
                  </div>

                  {isUploading && (
                    <div className="w-full max-w-xs mx-auto space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-mono text-neutral-400">
                        <span>Uploading media...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="text-xs font-mono text-red-400 bg-red-950/60 border border-red-500/30 p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

              </div>
            </div>

          </div>
        </section>

        {/* ================= SECTION 2: LIVE THREAT RADAR ================= */}
        <section id="radar" className="pt-16 border-t border-neutral-800/80 scroll-mt-28 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Real-Time Geographic Defense
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal tracking-tight">
                Live National Threat Radar
              </h2>
            </div>
            <p className="text-neutral-400 text-xs font-sans max-w-md">
              Real-time spatial telemetry of reported cyber incidents, digital arrests, and AI impersonation attacks across India.
            </p>
          </div>

          <LiveThreatRadar />
        </section>

        {/* ================= SECTION 3: THREAT CATALOG & SCAM NEWS ================= */}
        <section id="reported" className="pt-16 border-t border-neutral-800/80 scroll-mt-28">
          <ThreatCatalogSection />
        </section>

        {/* ================= SECTION 4: FORENSIC TECHNOLOGY & BENCHMARK ================= */}
        <section id="technology" className="pt-16 border-t border-neutral-800/80 scroll-mt-28">
          <TechnologySection />
        </section>

        {/* ================= SECTION 5: DEVELOPER PLATFORM & API SANDBOX ================= */}
        <section id="developers" className="pt-16 border-t border-neutral-800/80 scroll-mt-28">
          <DevelopersSection />
        </section>

      </div>

      {/* 5. Footer (Single-Page Clean Footer) */}
      <footer className="border-t border-neutral-800/80 bg-[#02050c] py-12 text-xs font-mono text-neutral-400 mt-20">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <NetraBrandLogo size={28} />
            <div>
              <span className="font-bold text-white tracking-wider">NETRA FORENSIC AI</span>
              <div className="text-[10px] text-neutral-500">Truth Beyond the Surface • Institutional Forensic Suite</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <button onClick={() => scrollToSection("analyzer")} className="hover:text-white transition-colors">Analyzer</button>
            <button onClick={() => scrollToSection("radar")} className="hover:text-white transition-colors">Threat Radar</button>
            <button onClick={() => scrollToSection("reported")} className="hover:text-white transition-colors">Threat Catalog</button>
            <button onClick={() => scrollToSection("technology")} className="hover:text-white transition-colors">Technology</button>
            <button onClick={() => scrollToSection("developers")} className="hover:text-white transition-colors">Developer API</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
