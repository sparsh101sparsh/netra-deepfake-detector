"use client";

import React from "react";
import { 
  Server, Shield, Cpu, Cloud, Database, Lock, 
  Terminal, ArrowRight, CheckCircle2, Zap, Radio, Layers, Sparkles
} from "lucide-react";

export const SystemTopologySection: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* 1. Core Architectural Pillars */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-accent uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-accent" />
          Zero-Trust System Philosophy
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1">
          Three Architectural Axioms
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Axiom 1 */}
          <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-3 relative group hover:border-line-strong transition-all">
            <div className="size-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              <Cpu size={20} />
            </div>
            <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
              1. Detectors Detect
            </h3>
            <p className="text-xs text-ink-2 font-sans leading-relaxed">
              Never rely on ungrounded generative AI to inspect raw video pixels or audio waveforms. Isolated ML specialist models (NETRA Spatial Scanner, NETRA Voice Clone Detector, NETRA Generative Scanner) independently evaluate physical, spectral, and semantic manipulation vectors.
            </p>
            <div className="text-[10px] font-mono text-accent pt-2 border-t border-line">
              Hard Evidence Formulation
            </div>
          </div>

          {/* Axiom 2 */}
          <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-3 relative group hover:border-line-strong transition-all">
            <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock size={20} />
            </div>
            <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
              2. Zero-Pixel Evidence Synthesis
            </h3>
            <p className="text-xs text-ink-2 font-sans leading-relaxed">
              Video media never leaves the private environment. Detectors extract mathematical evidence bundles (facial coordinates, anomaly bounding boxes, frequency scores) and hand off structured telemetry directly to the report compiler.
            </p>
            <div className="text-[10px] font-mono text-purple-400 pt-2 border-t border-line">
              Privacy-Preserving Telemetry
            </div>
          </div>

          {/* Axiom 3 */}
          <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-3 relative group hover:border-line-strong transition-all">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles size={20} />
            </div>
            <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
              3. AWS Decoupled Queues
            </h3>
            <p className="text-xs text-ink-2 font-sans leading-relaxed">
              FastAPI gateway immediately streams uploads to S3 and dispatches task messages to Amazon SQS. GPU workers consume tasks via 20-second long polling, guaranteeing zero request timeouts and high burst tolerance.
            </p>
            <div className="text-[10px] font-mono text-emerald-400 pt-2 border-t border-line">
              Cost-Optimized Spot Cloud
            </div>
          </div>
        </div>
      </div>

      {/* 2. 10-Stage State Machine Stepper */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-line shadow-card space-y-6">
        <div>
          <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider font-bold">
            Synchronous State Machine
          </span>
          <h3 className="text-lg font-bold text-ink tracking-tight mt-0.5">
            10-Stage GPU ML Worker Lifecycle
          </h3>
          <p className="text-xs text-ink-2 font-sans mt-1">
            Real-time execution status is broadcast to DynamoDB at every stage for instant client progress updates:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { step: "01", name: "Cloud Stream Ingest", pct: "5%", time: "80ms" },
            { step: "02", name: "Frame & Voice Demux", pct: "15%", time: "320ms" },
            { step: "03", name: "NETRA Face Alignment", pct: "30%", time: "220ms" },
            { step: "04", name: "NETRA Spatial Scanner", pct: "45%", time: "180ms" },
            { step: "05", name: "NETRA Generative Probe", pct: "55%", time: "260ms" },
            { step: "06", name: "NETRA Voice Clone DSP", pct: "68%", time: "140ms" },
            { step: "07", name: "Metadata & Jitter Verify", pct: "78%", time: "30ms" },
            { step: "08", name: "Multi-Modal Fusion", pct: "85%", time: "5ms" },
            { step: "09", name: "Forensic Report Dossier", pct: "95%", time: "20ms" },
            { step: "10", name: "Threat Radar & Delivery", pct: "100%", time: "40ms" },
          ].map((item) => (
            <div key={item.step} className="p-3 rounded-xl bg-inset border border-line text-left space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-accent font-bold">{item.step}</span>
                <span className="text-ink-3">{item.pct}</span>
              </div>
              <div className="text-xs font-semibold text-ink leading-snug truncate">
                {item.name}
              </div>
              <div className="text-[10px] font-mono text-ink-3 pt-1 border-t border-line/50">
                &sim;{item.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AWS Cloud Topology Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cloud Infrastructure Card */}
        <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Server size={18} className="text-accent" />
              AWS Cloud Topology (us-east-1)
            </h3>
            <span className="text-[10px] font-mono text-green px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30">
              Active Production
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono text-ink-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-inset border border-line/60">
              <span className="text-ink-3">Public Subnet (DMZ):</span>
              <span className="text-ink font-semibold">EC2 t3.micro (FastAPI + Docker)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-inset border border-line/60">
              <span className="text-ink-3">Private Compute Subnet:</span>
              <span className="text-accent font-semibold">EC2 g4dn.xlarge (NVIDIA T4 16GB)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-inset border border-line/60">
              <span className="text-ink-3">Decoupled Queue:</span>
              <span className="text-ink font-semibold">Amazon SQS (20s Long Poll + DLQ)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-inset border border-line/60">
              <span className="text-ink-3">Job State & Rate Limits:</span>
              <span className="text-ink font-semibold">Amazon DynamoDB (netra-jobs)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-inset border border-line/60">
              <span className="text-ink-3">Media & Model Weights:</span>
              <span className="text-ink font-semibold">Amazon S3 (24h Auto-Expiry Lifecycle)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-inset border border-line/60">
              <span className="text-ink-3">Forensic Synthesis:</span>
              <span className="text-pink-400 font-semibold">Deterministic Forensic Report Engine</span>
            </div>
          </div>
        </div>

        {/* Forensic Media Verification & Technical Standards */}
        <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              Forensic Verification & Technical Standards
            </h3>
            <span className="text-[10px] font-mono text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/30">
              Multi-Model Engine
            </span>
          </div>

          <p className="text-xs text-ink-2 font-sans leading-relaxed">
            NETRA is engineered to provide verifiable forensic evidence structured for enterprise verification and technical incident containment:
          </p>

          <div className="space-y-2 text-xs font-sans">
            <div className="p-2.5 rounded-lg bg-inset border border-line/60 text-ink-2">
              <span className="font-mono font-bold text-accent block text-[11px]">
                Multi-Model Vision & Boundary Telemetry
              </span>
              <span>
                NETRA Generative Scanner paired with NETRA Spatial Seam Scanner for boundary seam analysis.
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-inset border border-line/60 text-ink-2">
              <span className="font-mono font-bold text-accent block text-[11px]">
                Acoustic Prosody & Voice Clone Verification
              </span>
              <span>
                NETRA Voice Clone Detector and spectral prosody variance detecting synthetic voice clones.
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-inset border border-line/60 text-ink-2">
              <span className="font-mono font-bold text-accent block text-[11px]">
                Forensic Evidence Ledger
              </span>
              <span>
                Every generated forensic PDF report contains verifiable media fingerprints and timestamped audit trails.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
