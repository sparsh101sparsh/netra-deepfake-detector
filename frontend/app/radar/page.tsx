"use client";

import React from "react";
import { Radio, MapPin, Shield, ArrowLeft, Database, Terminal } from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LiveThreatRadar } from "@/components/LiveThreatRadar";

export default function RadarPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-[#030712]/90 backdrop-blur-xl">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <NetraBrandLogo size={40} />
            <a href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors">
              NETRA
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-900 border border-neutral-800 text-cyan-400">v5.1</span>
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono font-medium text-neutral-400">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/radar" className="text-white font-bold transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Threat Radar
            </a>
            <a href="/reported" className="hover:text-white transition-colors">Threat Catalog</a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/developers" className="hover:text-white transition-colors">Developer API</a>
          </nav>

          <div className="flex items-center gap-3">
            <GoogleAuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-10 space-y-6 font-mono animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Geographic Forensic Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Live Threat Radar & EXIF Origin Map
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1 max-w-2xl font-sans">
              Interactive geographic mapping of deepfake uploads and scam campaigns based on extracted camera EXIF, container GPS atoms, and regional telecom signatures across India.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/reported"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-all flex items-center gap-2"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" /> View Threat Catalog
            </a>
          </div>
        </div>

        {/* Live Radar Map Component */}
        <div className="w-full">
          <LiveThreatRadar />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#02050c] py-10 text-xs font-mono text-neutral-400 mt-16">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NetraBrandLogo size={28} />
            <span className="font-bold text-white tracking-wider">NETRA FORENSIC AI</span>
          </div>
          <div>
            Geographic Threat Intelligence & Metadata Forensics
          </div>
          <div className="flex gap-6">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/reported" className="hover:text-white transition-colors">Threat Catalog</a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/developers" className="hover:text-white transition-colors">Developer API</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
