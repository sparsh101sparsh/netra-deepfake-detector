"use client";

import React from "react";
import { 
  Server, Shield, Cpu, Cloud, Database, Lock, 
  Terminal, ArrowRight, CheckCircle2, Zap, Radio, Layers
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
              Never ask a generalist LLM to inspect raw video pixels or audio waveforms. Isolated ML specialist models (EfficientNet-B4, Wav2Vec2, CLIP) independently evaluate physical, spectral, and semantic manipulation vectors.
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
              2. Zero-Pixel LLM Synthesis
            </h3>
            <p className="text-xs text-ink-2 font-sans leading-relaxed">
              Amazon Bedrock consumes strictly validated Pydantic JSON evidence packs containing timestamps, bounding boxes, and confidence margins. Media pixels never leave the private AWS VPC, preventing data leakage.
            </p>
            <div className="text-[10px] font-mono text-purple-400 pt-2 border-t border-line">
              Privacy-Preserving Telemetry
            </div>
          </div>

          {/* Axiom 3 */}
          <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-3 relative group hover:border-line-strong transition-all">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud size={20} />
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
            { step: "01", name: "S3 Stream Download", pct: "5%", time: "80ms" },
            { step: "02", name: "FFmpeg 1 FPS Demux", pct: "15%", time: "320ms" },
            { step: "03", name: "InsightFace 3D Align", pct: "30%", time: "220ms" },
            { step: "04", name: "EfficientNet SBI", pct: "45%", time: "180ms" },
            { step: "05", name: "CLIP ViT-L/14 Probe", pct: "55%", time: "260ms" },
            { step: "06", name: "Wav2Vec2 Voice DSP", pct: "68%", time: "140ms" },
            { step: "07", name: "Auxiliary EXIF & Jitter", pct: "78%", time: "30ms" },
            { step: "08", name: "Gated Fusion Arbitrator", pct: "85%", time: "5ms" },
            { step: "09", name: "Bedrock Legal Dossier", pct: "95%", time: "1.2s" },
            { step: "10", name: "DynamoDB & SQS ACK", pct: "100%", time: "40ms" },
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
              <span className="text-pink-400 font-semibold">Amazon Bedrock (Claude 3.5 Sonnet)</span>
            </div>
          </div>
        </div>

        {/* Legal & Court Admissibility */}
        <div className="p-6 rounded-2xl bg-surface border border-line shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              Indian Law Enforcement & Court Admissibility
            </h3>
            <span className="text-[10px] font-mono text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/30">
              IT Act & BNS Ready
            </span>
          </div>

          <p className="text-xs text-ink-2 font-sans leading-relaxed">
            NETRA is engineered to provide forensic evidence structured specifically for submission under the Indian legal framework:
          </p>

          <div className="space-y-2 text-xs font-sans">
            <div className="p-2.5 rounded-lg bg-inset border border-line/60 text-ink-2">
              <span className="font-mono font-bold text-accent block text-[11px]">
                Section 66D — Information Technology Act, 2000
              </span>
              <span>
                Punishment for cheating by personation by using computer resource (up to 3 years imprisonment + fine).
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-inset border border-line/60 text-ink-2">
              <span className="font-mono font-bold text-accent block text-[11px]">
                Section 318(4) — Bharatiya Nyaya Sanhita (BNS), 2023
              </span>
              <span>
                Cheating and dishonestly inducing delivery of property via synthetic media deception.
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-inset border border-line/60 text-ink-2">
              <span className="font-mono font-bold text-accent block text-[11px]">
                Section 65B Certificate — Indian Evidence Act
              </span>
              <span>
                Every generated forensic PDF report contains cryptographic SHA-256 hashes and timestamped audit trails required for court admissibility.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
