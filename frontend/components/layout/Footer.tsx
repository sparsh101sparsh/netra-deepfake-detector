"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  PhoneCall, ExternalLink, ShieldAlert, Globe, 
  Scan, Terminal, Cpu, Database, Copy, Check, 
  Layers, ArrowUpRight, MessageSquareWarning, 
  Video, Mic, FileText, CheckCircle2, Shield
} from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GlideMenu } from "@/components/atoms/GlideMenu";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {

  const forensicEngines = [
    { label: "Live Multi-Modal Scanner", href: "/", badge: "Core", external: false },
    { label: "Scam Message Checker", href: "/scam", badge: "SMS/App", external: false },
    { label: "Text Extraction & Notice OCR", href: "/", badge: "Vision", external: false },
    { label: "Face Manipulation Check", href: "/", badge: "Video", external: false },
    { label: "Voice Synthesis Detection", href: "/", badge: "Audio", external: false },
  ];

  const threatIntelligence = [
    { label: "Live Threat Radar (Map)", href: "/radar", badge: "Geospatial", external: false },
    { label: "Reported Threat Catalog", href: "/reported", badge: "Database", external: false },
    { label: "Threat Trends & Analytics", href: "/trends", badge: "Live", external: false },
    { label: "Live Scam Feed (Tavily AI)", href: "/#feed", badge: "24H Sync", external: false },
    { label: "Global Threat Intelligence", href: "/#feed", badge: "Sync", external: false },
  ];

  const developersAndSafety = [
    { label: "REST API Documentation", href: "/developers", badge: "FastAPI", external: false },
    { label: "Model Architecture & Benchmarks", href: "/technology", badge: "Telemetry", external: false },
    { label: "Digital Forensics Standards", href: "/technology", badge: "Forensics", external: false },
    { label: "Multi-Modal Safety Benchmarks", href: "/technology", badge: "Benchmarks", external: false },
  ];

  return (
    <footer
      className={cn(
        "w-full py-6 sm:py-8 select-none font-sans",
        className
      )}
      aria-label="Platform Footer"
    >
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* ── UNIFIED BEAUTIFUL-UI FORENSIC MATRIX CARD ── */}
        <div className="rounded-2xl bg-surface border-[1.5px] border-line shadow-card overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
            
            {/* ── COL 1 (Brand & Mission): 4 columns ── */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <NetraBrandLogo size={32} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tracking-tight text-ink font-sans">
                        NETRA
                      </span>
                    </div>
                    <div className="text-[11px] font-sans text-ink-3 tracking-wide">
                      मायातीतं सत्यस्य चक्षुः
                    </div>
                  </div>
                </div>

                <p className="text-xs text-ink-2 leading-relaxed max-w-sm">
                  Defending India&apos;s digital media integrity with real-time multi-modal AI detection for deepfakes, synthetic voice clones, and deceptive scam communications.
                </p>
              </div>

              {/* Live Telemetry Dot */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-ink-3">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>FastAPI Backend Online • Real-Time Protection</span>
              </div>
            </div>

            {/* ── COL 2: FORENSIC CAPABILITIES (3 columns) ── */}
            <div className="lg:col-span-3 space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-line">
                <div className="size-7 rounded-lg bg-inset border border-line flex items-center justify-center text-ink shrink-0">
                  <Scan className="size-3.5" />
                </div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-semibold">
                  Forensic Capabilities
                </h4>
              </div>

              <GlideMenu
                className="flex flex-col gap-0.5 text-xs w-full"
                highlightClassName="inset-x-0 rounded-lg bg-white/[0.08]"
                rowSelector="[data-menu-row]"
              >
                {forensicEngines.map((item) => (
                  <div key={item.label} data-menu-row className="relative z-10 w-full">
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex w-full items-center justify-between py-1.5 px-2 rounded-lg text-ink-2 hover:text-ink transition-colors duration-150"
                      >
                        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-150 font-medium truncate pr-2">
                          <span className="truncate">{item.label}</span>
                          <ExternalLink className="size-2.5 opacity-60 shrink-0" />
                        </span>
                        <span className="w-[74px] shrink-0 text-center text-[10px] font-mono py-0.5 rounded bg-inset border border-line text-ink-3 group-hover:text-ink group-hover:border-line-hover transition-colors">
                          {item.badge}
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="group flex w-full items-center justify-between py-1.5 px-2 rounded-lg text-ink-2 hover:text-ink transition-colors duration-150"
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform duration-150 font-medium truncate pr-2">
                          {item.label}
                        </span>
                        <span className="w-[74px] shrink-0 text-center text-[10px] font-mono py-0.5 rounded bg-inset border border-line text-ink-3 group-hover:text-ink group-hover:border-line-hover transition-colors">
                          {item.badge}
                        </span>
                      </Link>
                    )}
                  </div>
                ))}
              </GlideMenu>
            </div>

            {/* ── COL 3: THREAT INTELLIGENCE (3 columns) ── */}
            <div className="lg:col-span-3 space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-line">
                <div className="size-7 rounded-lg bg-inset border border-line flex items-center justify-center text-ink shrink-0">
                  <Globe className="size-3.5" />
                </div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-semibold">
                  Threat Intelligence
                </h4>
              </div>

              <GlideMenu
                className="flex flex-col gap-0.5 text-xs w-full"
                highlightClassName="inset-x-0 rounded-lg bg-white/[0.08]"
                rowSelector="[data-menu-row]"
              >
                {threatIntelligence.map((item) => (
                  <div key={item.label} data-menu-row className="relative z-10 w-full">
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex w-full items-center justify-between py-1.5 px-2 rounded-lg text-ink-2 hover:text-ink transition-colors duration-150"
                      >
                        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-150 font-medium truncate pr-2">
                          <span className="truncate">{item.label}</span>
                          <ExternalLink className="size-2.5 opacity-60 shrink-0" />
                        </span>
                        <span className="w-[74px] shrink-0 text-center text-[10px] font-mono py-0.5 rounded bg-inset border border-line text-ink-3 group-hover:text-ink group-hover:border-line-hover transition-colors">
                          {item.badge}
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="group flex w-full items-center justify-between py-1.5 px-2 rounded-lg text-ink-2 hover:text-ink transition-colors duration-150"
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform duration-150 font-medium truncate pr-2">
                          {item.label}
                        </span>
                        <span className="w-[74px] shrink-0 text-center text-[10px] font-mono py-0.5 rounded bg-inset border border-line text-ink-3 group-hover:text-ink group-hover:border-line-hover transition-colors">
                          {item.badge}
                        </span>
                      </Link>
                    )}
                  </div>
                ))}
              </GlideMenu>
            </div>

            {/* ── COL 4: DEVELOPERS & SAFETY (2 columns) ── */}
            <div className="lg:col-span-2 space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-line">
                <div className="size-7 rounded-lg bg-inset border border-line flex items-center justify-center text-ink shrink-0">
                  <Terminal className="size-3.5" />
                </div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-semibold">
                  Developers & Safety
                </h4>
              </div>

              <GlideMenu
                className="flex flex-col gap-0.5 text-xs w-full"
                highlightClassName="inset-x-0 rounded-lg bg-white/[0.08]"
                rowSelector="[data-menu-row]"
              >
                {developersAndSafety.map((item) => (
                  <div key={item.label} data-menu-row className="relative z-10 w-full">
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex w-full items-center justify-between py-1.5 px-2 rounded-lg text-ink-2 hover:text-ink transition-colors duration-150"
                      >
                        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-150 font-medium truncate pr-2">
                          <span className="truncate">{item.label}</span>
                          <ExternalLink className="size-2.5 opacity-60 shrink-0" />
                        </span>
                        <span className="w-[74px] shrink-0 text-center text-[10px] font-mono py-0.5 rounded bg-inset border border-line text-ink-3 group-hover:text-ink group-hover:border-line-hover transition-colors">
                          {item.badge}
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="group flex w-full items-center justify-between py-1.5 px-2 rounded-lg text-ink-2 hover:text-ink transition-colors duration-150"
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform duration-150 font-medium truncate pr-2">
                          {item.label}
                        </span>
                        <span className="w-[74px] shrink-0 text-center text-[10px] font-mono py-0.5 rounded bg-inset border border-line text-ink-3 group-hover:text-ink group-hover:border-line-hover transition-colors">
                          {item.badge}
                        </span>
                      </Link>
                    )}
                  </div>
                ))}
              </GlideMenu>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
