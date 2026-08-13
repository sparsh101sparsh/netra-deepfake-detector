"use client";

import React from "react";
import Link from "next/link";
import { 
  Shield, Terminal, Activity, FileCheck2, 
  ExternalLink, Lock, CheckCircle2, Cpu, Globe, Database, Scan
} from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { StatusPill } from "@/components/atoms/StatusPill";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const telemetryBadges = [
    { label: "API Latency", value: "24ms", tone: "active" as const },
    { label: "PaddleOCR", value: "v2.8 ACTIVE", tone: "active" as const },
    { label: "Tavily Stream", value: "CONNECTED", tone: "active" as const },
    { label: "Compliance", value: "Sec 65B IT Act", tone: "accent" as const },
    { label: "Cryptography", value: "AES-256-GCM", tone: "neutral" as const },
  ];

  return (
    <footer
      className={cn(
        "w-full bg-[var(--page)] border-t border-[var(--line)] py-12 text-ink font-sans select-none",
        className
      )}
      aria-label="Institutional Footer"
    >
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
        
        {/* Top Telemetry Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-canvas border-[1.5px] border-line shadow-card">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-mono font-semibold text-ink uppercase tracking-wider">
              System Telemetry & Live Diagnostics
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {telemetryBadges.map((badge, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-inset border-[1.5px] border-line text-[11px]"
              >
                <span className="text-ink-3">{badge.label}:</span>
                <span className={cn(
                  "font-semibold",
                  badge.tone === "active" && "text-green",
                  badge.tone === "accent" && "text-accent",
                  badge.tone === "neutral" && "text-ink"
                )}>
                  {badge.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Column Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Col 1: Brand Statement & Insignia */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <NetraBrandLogo size={34} />
              <div>
                <span className="text-base font-bold tracking-tight text-ink font-sans">
                  NETRA FORENSIC AI
                </span>
                <div className="text-[11px] font-mono text-accent">
                  Eyes That See Through • Institutional Cyber Suite
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-2 font-sans leading-relaxed max-w-md">
              Autonomous multi-modal artificial intelligence engine engineered for deepfake forensic decomposition, audio waveform artifact detection, and 24-hour real-time cyber threat intelligence triage.
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-ink-3">
              <Shield className="size-3.5 text-accent" />
              <span>Certified Cyber Forensics & Evidence Preservation Framework</span>
            </div>
          </div>

          {/* Col 2: Forensic AI Engines */}
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
              Forensic Engines
            </div>
            <ul className="space-y-2 text-xs text-ink-2">
              <li>
                <Link href="/" className="hover:text-ink transition-colors flex items-center gap-1.5">
                  <Scan className="size-3 text-accent" />
                  <span>Multi-Modal Sandbox</span>
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-ink transition-colors flex items-center gap-1.5">
                  <FileCheck2 className="size-3 text-green" />
                  <span>PaddleOCR Dossier</span>
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-ink transition-colors">
                  Audio Spectral Analysis
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-ink transition-colors">
                  Video Temporal Artifacts
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Intelligence & Catalog */}
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
              Threat Intelligence
            </div>
            <ul className="space-y-2 text-xs text-ink-2">
              <li>
                <Link href="/radar" className="hover:text-ink transition-colors flex items-center gap-1.5">
                  <Globe className="size-3 text-accent" />
                  <span>Threat Radar 3D</span>
                </Link>
              </li>
              <li>
                <Link href="/reported" className="hover:text-ink transition-colors flex items-center gap-1.5">
                  <Database className="size-3 text-amber-400" />
                  <span>Scam Threat Catalog</span>
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-ink transition-colors">
                  24H Tavily News Stream
                </Link>
              </li>
              <li>
                <Link href="/technology" className="hover:text-ink transition-colors">
                  Model Architecture
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Developers & Legal */}
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-ink">
              Developers & Compliance
            </div>
            <ul className="space-y-2 text-xs text-ink-2">
              <li>
                <Link href="/developers" className="hover:text-ink transition-colors flex items-center gap-1.5">
                  <Terminal className="size-3 text-accent" />
                  <span>REST API Documentation</span>
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-ink transition-colors">
                  Python SDK & CLI
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-ink transition-colors">
                  Section 65B Audit Certificate
                </Link>
              </li>
              <li>
                <Link href="/technology" className="hover:text-ink transition-colors">
                  Chain of Custody Whitepaper
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Legal Disclaimer & Bottom Copyright Bar */}
        <div className="pt-6 border-t border-line flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-3">
          <p className="text-[11px] leading-relaxed max-w-2xl text-center md:text-left">
            Institutional Notice: NETRA forensic dossiers are generated in strict adherence to Section 65B of the Indian Evidence Act (1872 / BSA 2023) for digital evidence preservation and evidentiary integrity.
          </p>

          <div className="flex items-center gap-4 shrink-0 text-[11px]">
            <span>© 2026 NETRA Cyber AI</span>
            <span>•</span>
            <span className="text-green">All Systems Nominal</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
