"use client";

import React from "react";
import { Database } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LiveThreatRadar } from "@/components/LiveThreatRadar";
import Link from "next/link";

export default function MappingPage() {
  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6 flex-1">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-surface border-[1.5px] border-line shadow-card">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">Live Map</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Threat Map
            </h1>
            <p className="text-sm text-ink-2 max-w-2xl font-sans leading-relaxed">
              Live geographic mapping of reported threats across regions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/reported" className="px-4 py-2 rounded-xl bg-surface border border-line text-ink-2 text-sm font-semibold hover:bg-page transition-all flex items-center gap-2">
              <Database className="w-4 h-4" /> Threats
            </Link>
          </div>
        </div>

        <div className="w-full h-[640px] rounded-2xl overflow-hidden border-[1.5px] border-line shadow-card bg-surface">
          <LiveThreatRadar />
        </div>

      </main>
      <Footer />
    </div>
  );
}
