"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Radio,
  Zap,
  Layers,
  Globe,
  Database,
  Terminal,
  Cpu,
  ArrowRight,
  Sparkles,
  Activity,
  Scan,
  Lock,
  FileCheck2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Navbar, Footer, SplashIntro } from "@/components/layout";
import { LiveCyberScamNewsFeed } from "@/components/feed";
import { MultiModalForensicScanner } from "@/components/sandbox";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/utils";

interface TelemetryMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  change?: string;
  tone: "active" | "accent" | "orange" | "purple" | "neutral";
  icon: React.ElementType;
}

const TELEMETRY_METRICS: TelemetryMetric[] = [
  {
    id: "threats",
    label: "Active Threat Signals",
    value: "1,428+",
    detail: "Autonomous Tavily Scraper",
    change: "+18 last hr",
    tone: "active",
    icon: Radio,
  },
  {
    id: "latency",
    label: "Forensic Triage Latency",
    value: "42 ms",
    detail: "Sub-Second Ingestion",
    change: "Real-time",
    tone: "accent",
    icon: Zap,
  },
  {
    id: "accuracy",
    label: "Evidence Confidence",
    value: "99.4%",
    detail: "Multi-Modal Consensus",
    change: "Sec 65B Ready",
    tone: "purple",
    icon: Shield,
  },
  {
    id: "engines",
    label: "Neural Modalities",
    value: "4 / 4 Online",
    detail: "Video • Image • Audio • Text",
    change: "PaddleOCR v2.8",
    tone: "orange",
    icon: Layers,
  },
];

export default function ForensicHub() {
  const [activeSection, setActiveSection] = useState<string>("scanner");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink-primary)] font-sans flex flex-col selection:bg-accent-tint selection:text-accent-ink relative">
      {/* 1. Cinematic Splash Intro (~2.5s with ESC/Click skip & session cache) */}
      <SplashIntro autoDismissMs={2400} />

      {/* 2. Glassmorphic Sticky Header Navigation with Google Auth & Telemetry */}
      <Navbar
        activeSection={activeSection}
        onNavigateSection={(sectionId) => setActiveSection(sectionId)}
      />

      {/* 3. Main Command Center Body */}
      <main className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 lg:space-y-8 min-h-0">
        
        {/* ── Command Center Header Bar & Live Diagnostics ── */}
        <section
          aria-label="Command Center Status & Telemetry"
          className="rounded-2xl bg-surface border-[1.5px] border-line p-5 sm:p-6 lg:p-7 shadow-card space-y-6"
        >
          {/* Top Classification Badges & Quick Links */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <StatusPill tone="neutral" size="sm">
                <span>CLASSIFICATION: UNRESTRICTED FORENSIC</span>
              </StatusPill>
              <StatusPill tone="active" size="sm" pulse>
                <span>ENGINE: ACTIVE</span>
              </StatusPill>
              <StatusPill tone="accent" size="sm">
                <span>PADDLEOCR: v2.8</span>
              </StatusPill>
              <StatusPill tone="purple" size="sm">
                <span>FEED: 24H AUTONOMOUS</span>
              </StatusPill>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/radar">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Globe className="size-3.5 text-accent" />}
                  className="font-mono text-xs"
                >
                  Threat Radar
                </Button>
              </Link>
              <Link href="/reported">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Database className="size-3.5 text-accent" />}
                  className="font-mono text-xs"
                >
                  Threat Catalog
                </Button>
              </Link>
              <Link href="/technology">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Cpu className="size-3.5 text-accent" />}
                  className="font-mono text-xs"
                >
                  Architecture
                </Button>
              </Link>
              <Link href="/developers">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Terminal className="size-3.5 text-accent" />}
                  className="font-mono text-xs"
                >
                  Developer API
                </Button>
              </Link>
            </div>
          </div>

          {/* Institutional Title & Description */}
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div className="space-y-2 max-w-4xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-inset border-[1.5px] border-line text-[11px] font-mono text-accent">
                <span className="size-1.5 rounded-full bg-accent animate-ping" />
                <span className="font-semibold uppercase tracking-wider">NETRA FORENSIC AI COMMAND CENTER</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink font-sans">
                Autonomous Multi-Modal Deepfake & Cyber Threat Triage Grid
              </h1>
              <p className="text-xs sm:text-sm text-ink-2 font-sans leading-relaxed max-w-3xl">
                Decompose suspicious Video, Image, Audio waveforms, and text payloads with PaddleOCR text dossier extraction and neural classifiers. Simultaneously monitor autonomous 24-hour cyber scam threat intelligence scraped from verified investigative feeds.
              </p>
            </div>

            <div className="hidden 2xl:flex items-center gap-3 shrink-0">
              <div className="p-3 rounded-xl bg-inset border-[1.5px] border-line text-xs font-mono space-y-1">
                <div className="text-ink-3">EVIDENCE INTEGRITY</div>
                <div className="font-bold text-accent flex items-center gap-1.5">
                  <FileCheck2 className="size-4" />
                  <span>SHA-256 HASH VERIFIED</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Panel Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {TELEMETRY_METRICS.map((metric) => {
              const IconComp = metric.icon;
              return (
                <div
                  key={metric.id}
                  className="p-3.5 rounded-xl bg-inset/70 hover:bg-inset border-[1.5px] border-line transition-all duration-150 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-mono text-ink-2 tracking-wide font-medium">
                      {metric.label}
                    </span>
                    <div className={cn(
                      "p-1.5 rounded-lg border-[1.5px]",
                      metric.tone === "active" && "bg-green-tint text-green border-green/30",
                      metric.tone === "accent" && "bg-accent-tint text-accent-ink border-accent/30",
                      metric.tone === "purple" && "bg-purple-tint text-purple border-purple/30",
                      metric.tone === "orange" && "bg-orange-tint text-orange border-orange/30",
                      metric.tone === "neutral" && "bg-inset text-ink border-line"
                    )}>
                      <IconComp className="size-3.5" />
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-ink">
                      {metric.value}
                    </span>
                    {metric.change && (
                      <span className={cn(
                        "text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border-[1.5px]",
                        metric.tone === "active" && "bg-green-tint text-green border-green/25",
                        metric.tone === "accent" && "bg-accent-tint text-accent-ink border-accent/25",
                        metric.tone === "purple" && "bg-purple-tint text-purple border-purple/25",
                        metric.tone === "orange" && "bg-orange-tint text-orange border-orange/25"
                      )}>
                        {metric.change}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-ink-3 font-mono">
                    {metric.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Equal-Height Split Command Center Grid ── */}
        <section
          aria-label="Forensic Scanner & Live Scam Feed Split Grid"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch flex-1 min-h-0"
        >
          {/* Left Column (6 Cols): 24-Hour Autonomous Cyber Scam Feed */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <LiveCyberScamNewsFeed
              compact={false}
              className="h-full flex flex-col shadow-card"
            />
          </div>

          {/* Right Column (6 Cols): Multi-Modal Forensic Sandbox */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <MultiModalForensicScanner
              className="h-full flex flex-col shadow-card"
            />
          </div>
        </section>
      </main>

      {/* 4. Institutional Certified Footer with Real-time Diagnostics */}
      <Footer />
    </div>
  );
}
