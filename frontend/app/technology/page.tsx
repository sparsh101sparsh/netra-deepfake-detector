"use client";

import React from "react";
import { 
  Cpu, Layers, Eye, Radio, Sparkles, CheckCircle2, 
  BarChart3, Activity, ShieldCheck, Zap, ArrowRight, Database, Terminal, Shield 
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GlideMenu } from "@/components/atoms/GlideMenu";
import { cn } from "@/lib/utils";

export default function TechnologyPage() {
  const benchmarkMatrix = [
    { model: "NETRA Multi-Modal Ensemble", detectionRate: "98.2%", meanFakeProb: "64.8%", architecture: "Vision Transformer + Spectral Analysis + Audio Vocoder", status: "Primary System" },
    { model: "Vision Model V3", detectionRate: "91.6%", meanFakeProb: "61.2%", architecture: "Transformer Architecture + Parameter Tuning", status: "Integrated Backbone" },
    { model: "Vision Model CLIP", detectionRate: "91.2%", meanFakeProb: "60.4%", architecture: "Feature Alignment Model", status: "Integrated Backbone" },
    { model: "Adapter Module", detectionRate: "88.4%", meanFakeProb: "58.1%", architecture: "Auxiliary Transformer Head", status: "Baseline" },
    { model: "Weight Split Model", detectionRate: "88.5%", meanFakeProb: "57.8%", architecture: "Matrix Decomposition on Vision Transformer", status: "Baseline" },
    { model: "MesoInception", detectionRate: "72.0%", meanFakeProb: "55.5%", architecture: "Deep Convolutional Network", status: "Legacy Baseline" },
    { model: "MesoNet", detectionRate: "2.0%", meanFakeProb: "48.3%", architecture: "Shallow Convolutional Network", status: "Failed Baseline" },
  ];

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-accent/30 selection:text-accent">
      <Navbar />

      {/* Main Content */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-12 space-y-16 animate-in fade-in duration-500 font-sans flex-1">
        
        {/* Page Hero */}
        <div className="space-y-4 border-b border-line pb-8">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-accent uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            Architecture & Model Benchmarks
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Foundation Vision & Multi-Modal Pipeline
          </h1>
          <p className="text-ink-2 text-sm sm:text-base font-sans max-w-3xl leading-relaxed">
            NETRA integrates state-of-the-art vision models with frequency analysis, acoustic vocoder models, and video container verification.
          </p>
        </div>

        {/* 1. Architectural Pipeline Diagram */}
        <div className="space-y-6">
          <div>
            <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider font-bold">Multi-Tier Architecture</span>
            <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1">Four-Stage Detection Pipeline</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Stage 1: Vision Backbone */}
            <div className="p-6 rounded-2xl bg-surface border-[1.5px] border-line shadow-card space-y-4 relative">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/40 flex items-center justify-center text-accent font-bold font-mono text-xs">
                01
              </div>
              <h3 className="text-base font-bold text-ink">Vision Backbone</h3>
              <p className="text-xs text-ink-2 font-sans leading-relaxed">
                Extracts features from frozen vision models. Evaluates features trained with contrastive alignment for high accuracy.
              </p>
              <div className="text-[10px] text-accent pt-2 border-t border-line font-mono">
                Backbone: Vision Model
              </div>
            </div>

            {/* Stage 2: Spectral Analysis */}
            <div className="p-6 rounded-2xl bg-surface border-[1.5px] border-line shadow-card space-y-4">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/40 flex items-center justify-center text-accent font-bold font-mono text-xs">
                02
              </div>
              <h3 className="text-base font-bold text-ink">Spectral Analysis</h3>
              <p className="text-xs text-ink-2 font-sans leading-relaxed">
                Computes frequency spectrum to uncover noise patterns and generation anomalies invisible in standard video.
              </p>
              <div className="text-[10px] text-ink-3 pt-2 border-t border-line font-mono">
                Modality: Frequency Profile
              </div>
            </div>

            {/* Stage 3: Audio Vocoder */}
            <div className="p-6 rounded-2xl bg-surface border-[1.5px] border-line shadow-card space-y-4">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/40 flex items-center justify-center text-accent font-bold font-mono text-xs">
                03
              </div>
              <h3 className="text-base font-bold text-ink">Acoustic Analysis</h3>
              <p className="text-xs text-ink-2 font-sans leading-relaxed">
                Analyzes audio streams to identify harmonic continuity and synthetic voice generation patterns.
              </p>
              <div className="text-[10px] text-accent pt-2 border-t border-line font-mono">
                Modality: Audio Spectrogram
              </div>
            </div>

            {/* Stage 4: Hardware Verification */}
            <div className="p-6 rounded-2xl bg-surface border-[1.5px] border-line shadow-card space-y-4">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/40 flex items-center justify-center text-accent font-bold font-mono text-xs">
                04
              </div>
              <h3 className="text-base font-bold text-ink">Hardware Verification</h3>
              <p className="text-xs text-ink-2 font-sans leading-relaxed">
                Parses container metadata, codec chains, and generation markers to verify physical camera origin versus manipulation.
              </p>
              <div className="text-[10px] text-accent pt-2 border-t border-line font-mono">
                Provenance: Camera vs Editor
              </div>
            </div>

          </div>
        </div>

        {/* 2. Benchmark Matrix Table */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider font-bold">Empirical Validation</span>
              <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1">
                Generalization Benchmark
              </h2>
              <p className="text-xs text-ink-2 font-sans mt-1">
                Comparative evaluation across major academic and real-world benchmarks.
              </p>
            </div>
            <a
              href="/#analyzer"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-accent text-white hover:bg-accent/80 transition-all shadow-sm self-start sm:self-auto"
            >
              Analyze Media &rarr;
            </a>
          </div>

          <div className="bg-surface border-[1.5px] border-line rounded-2xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <GlideMenu
                className="w-full"
                highlightClassName="inset-x-0 bg-white/[0.04] rounded-none"
                rowSelector="[data-menu-row]"
              >
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-inset text-ink-2">
                      <th className="p-4 font-semibold">Detector / Architecture</th>
                      <th className="p-4 font-semibold">Detection Rate</th>
                      <th className="p-4 font-semibold">Confidence Margin</th>
                      <th className="p-4 font-semibold">Architecture Summary</th>
                      <th className="p-4 font-semibold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {benchmarkMatrix.map((row, idx) => (
                      <tr
                        key={idx}
                        data-menu-row
                        className={cn(
                          "relative z-10 transition-colors duration-150",
                          idx === 0 ? "bg-accent/5 font-semibold" : ""
                        )}
                      >
                        <td className="p-4 text-ink flex items-center gap-2">
                          {idx === 0 && <span className="w-2 h-2 rounded-full bg-accent"></span>}
                          {row.model}
                        </td>
                        <td className={`p-4 font-mono font-bold ${parseFloat(row.detectionRate) >= 95 ? "text-green-500" : parseFloat(row.detectionRate) >= 90 ? "text-accent" : parseFloat(row.detectionRate) >= 70 ? "text-yellow-500" : "text-red-500"}`}>
                          {row.detectionRate}
                        </td>
                        <td className="p-4 font-mono text-ink-2">{row.meanFakeProb}</td>
                        <td className="p-4 text-ink-2 font-sans">{row.architecture}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === "Primary System"
                              ? "bg-accent/10 text-accent border border-accent/40"
                              : row.status === "Integrated Backbone"
                              ? "bg-green-500/10 text-green-600 border border-green-500/40 dark:text-green-400"
                              : "bg-inset text-ink-2 border border-line"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlideMenu>
            </div>
          </div>
        </div>

        {/* 3. Deep Architectural Rationale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-surface border-[1.5px] border-line p-8 rounded-2xl shadow-card space-y-4">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Efficient Tuning
            </h3>
            <p className="text-xs text-ink-2 font-sans leading-relaxed">
              Standard detectors overfit on specific artifacts. Our model keeps the vision encoder frozen and tunes only minimal parameters with contrastive alignment, preventing feature collapse while maintaining robustness.
            </p>
          </div>

          <div className="bg-surface border-[1.5px] border-accent/40 p-8 rounded-2xl shadow-card space-y-4">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2 text-accent">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Multi-Modal Fusion
            </h3>
            <p className="text-xs text-ink-2 font-sans leading-relaxed">
              While vision models excel at facial manipulation, real-world cybercrime involves AI voice clones and heavily re-compressed media. NETRA augments visual analysis with frequency spectra and audio generation detection.
            </p>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
