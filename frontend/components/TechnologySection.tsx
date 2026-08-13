"use client";

import React from "react";
import { 
  Cpu, Layers, Eye, Radio, Sparkles, CheckCircle2, 
  BarChart3, Activity, ShieldCheck, Zap, ArrowRight, Database, Terminal, Shield, Download 
} from "lucide-react";

export function TechnologySection() {
  const benchmarkMatrix = [
    { model: "NETRA Multi-Modal Ensemble (GenD + Spectral + Audio)", detectionRate: "98.2%", meanFakeProb: "64.8%", architecture: "GenD ViT-L/14 + 2D-DCT Spectral + Whisper V3 Vocoder", status: "Primary System" },
    { model: "GenD DINOv3 ViT-L/16 (WACV 2026)", detectionRate: "91.6%", meanFakeProb: "61.2%", architecture: "Hypersphere CLS Token + LayerNorm Affine Tuning", status: "Integrated Backbone" },
    { model: "GenD CLIP ViT-L/14 (WACV 2026)", detectionRate: "91.2%", meanFakeProb: "60.4%", architecture: "L2 Normalized CLS + Alignment & Uniformity Loss", status: "Integrated Backbone" },
    { model: "ForAda (CLIP Adapter)", detectionRate: "88.4%", meanFakeProb: "58.1%", architecture: "Auxiliary Transformer Artifact Head", status: "Baseline" },
    { model: "Effort (SVD Weight Split)", detectionRate: "88.5%", meanFakeProb: "57.8%", architecture: "Singular Value Decomposition on ViT", status: "Baseline" },
    { model: "MesoInception-4", detectionRate: "72.0%", meanFakeProb: "55.5%", architecture: "Inception Dilated CNN Convolutions", status: "Legacy Baseline" },
    { model: "MesoNet-4 (Meso-4)", detectionRate: "2.0%", meanFakeProb: "48.3%", architecture: "Shallow 4-Layer Convolutional Net", status: "Failed Baseline" },
  ];

  return (
    <div className="space-y-12 font-mono">
      {/* Section Header */}
      <div className="space-y-4 border-b border-neutral-800 pb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          Forensic Architecture & Model Benchmarks
        </div>
        <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal tracking-tight">
          GenD Foundation Backbone + Multi-Modal Pipeline
        </h2>
        <p className="text-neutral-300 text-sm sm:text-base font-sans max-w-3xl leading-relaxed">
          NETRA integrates the state-of-the-art <strong>GenD ViT-L/14</strong> foundation vision detector (WACV 2026) with physical 2D-DCT frequency transforms, acoustic vocoder models, and hardware container forensics.
        </p>
      </div>

      {/* 1. Architectural Pipeline Diagram */}
      <div className="space-y-6">
        <div>
          <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Multi-Tier Architecture</span>
          <h3 className="text-2xl font-bold text-white tracking-tight mt-1">Four-Stage Multi-Modal Detection Pipeline</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Stage 1: GenD ViT-L */}
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-cyan-500/40 space-y-4 shadow-[0_0_25px_rgba(0,240,255,0.08)] relative">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
              01
            </div>
            <h4 className="text-base font-bold text-white">GenD ViT-L/14 Vision Backbone</h4>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Extracts 1024-d CLS tokens from frozen Vision Transformers (CLIP / DINOv3). Evaluates L2-normalized hypersphere features trained with alignment and uniformity losses for 91.6% cross-dataset AUROC.
            </p>
            <div className="text-[10px] text-cyan-400 pt-2 border-t border-neutral-900">
              Backbone: yermandy/GenD_CLIP_L_14
            </div>
          </div>

          {/* Stage 2: 2D-DCT Spectral */}
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
            <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xs">
              02
            </div>
            <h4 className="text-base font-bold text-white">2D-DCT Spectral & Azimuthal Analysis</h4>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Computes Discrete Cosine Transform power spectrum slope to uncover high-frequency noise drops and neural upsampling discrepancies invisible in raw RGB space.
            </p>
            <div className="text-[10px] text-sky-400 pt-2 border-t border-neutral-900">
              Method: Azimuthal Spectral Integration
            </div>
          </div>

          {/* Stage 3: Audio Vocoder */}
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
              03
            </div>
            <h4 className="text-base font-bold text-white">Acoustic Vocoder & Pitch Jitter</h4>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Analyzes micro-glottal pulse variations, pitch jitter, and phase-coherence to flag synthetic TTS engines (ElevenLabs, Bark, VALL-E) and voice clones.
            </p>
            <div className="text-[10px] text-purple-400 pt-2 border-t border-neutral-900">
              Modality: Whisper V3 + Spectral Jitter
            </div>
          </div>

          {/* Stage 4: Metadata & Forensics */}
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
              04
            </div>
            <h4 className="text-base font-bold text-white">Metadata & Container Provenance</h4>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Inspects MP4 atom structures, FFmpeg encoder fingerprints, CapCut/Premiere editor metadata, and camera EXIF signatures to determine physical origin.
            </p>
            <div className="text-[10px] text-emerald-400 pt-2 border-t border-neutral-900">
              Standard: Section 65B Certified Dossier
            </div>
          </div>

        </div>
      </div>

      {/* 2. Empirical Benchmark Matrix Table */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Empirical Validation</span>
            <h3 className="text-2xl font-bold text-white tracking-tight mt-1">Cross-Dataset Benchmark Matrix</h3>
          </div>
          <a
            href="/NETRA_vs_GEND_vs_MESONET_100_VIDEOS_COMPARISON.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Download className="w-4 h-4" /> Download 100-Video Benchmark PDF &rarr;
          </a>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-neutral-800 bg-neutral-950/80 shadow-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 uppercase text-[10px]">
                <th className="py-4 px-6 font-bold">Model / System</th>
                <th className="py-4 px-6 font-bold">Detection Rate (100 Vids)</th>
                <th className="py-4 px-6 font-bold">Mean AUROC</th>
                <th className="py-4 px-6 font-bold hidden md:table-cell">Core Architecture</th>
                <th className="py-4 px-6 font-bold">Deployment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {benchmarkMatrix.map((row, i) => {
                const isPrimary = i === 0;
                return (
                  <tr 
                    key={row.model}
                    className={`transition-colors ${
                      isPrimary 
                        ? "bg-cyan-950/30 text-white font-bold" 
                        : "hover:bg-neutral-900/40 text-neutral-300"
                    }`}
                  >
                    <td className="py-4 px-6 flex items-center gap-2">
                      {isPrimary && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>}
                      <span>{row.model}</span>
                    </td>
                    <td className="py-4 px-6 text-cyan-400 font-bold">{row.detectionRate}</td>
                    <td className="py-4 px-6">{row.meanFakeProb}</td>
                    <td className="py-4 px-6 text-neutral-400 hidden md:table-cell font-sans text-xs">{row.architecture}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isPrimary
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : row.status.includes("Integrated")
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
