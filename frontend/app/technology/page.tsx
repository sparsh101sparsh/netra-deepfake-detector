"use client";

import React from "react";
import { 
  Cpu, Layers, Eye, Radio, Sparkles, CheckCircle2, 
  BarChart3, Activity, ShieldCheck, Zap, ArrowRight, Database, Terminal, Shield 
} from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

export default function TechnologyPage() {
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

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-mono font-medium text-neutral-400 bg-neutral-950/70 p-1.5 rounded-2xl border border-neutral-850">
            <a href="/" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white transition-all">
              <span>Scanner & Feed</span>
            </a>
            <a href="/radar" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white transition-all">
              <span>Threat Mapping</span>
            </a>
            <a href="/reported" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white transition-all">
              <span>Threat Catalog</span>
            </a>
            <a href="/technology" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-850 text-white font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)] border border-cyan-500/30 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Technology</span>
            </a>
            <a href="/developers" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white transition-all">
              <span>Developer API</span>
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <GoogleAuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-12 space-y-16 animate-in fade-in duration-500 font-mono">
        
        {/* Page Hero */}
        <div className="space-y-4 border-b border-neutral-800 pb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Forensic Architecture & Model Benchmarks
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-normal tracking-tight">
            GenD Foundation Backbone + Multi-Modal Pipeline
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base font-sans max-w-3xl leading-relaxed">
            NETRA integrates the state-of-the-art <strong>GenD ViT-L/14</strong> foundation vision detector (WACV 2026) with physical 2D-DCT frequency transforms, acoustic vocoder models, and hardware container forensics.
          </p>
        </div>

        {/* 1. Architectural Pipeline Diagram */}
        <div className="space-y-6">
          <div>
            <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Multi-Tier Architecture</span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">Four-Stage Multi-Modal Detection Pipeline</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Stage 1: GenD ViT-L */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-cyan-500/40 space-y-4 shadow-[0_0_25px_rgba(0,240,255,0.08)] relative">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                01
              </div>
              <h3 className="text-base font-bold text-white">GenD ViT-L/14 Vision Backbone</h3>
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
              <h3 className="text-base font-bold text-white">2D-DCT Spectral & Azimuthal Analysis</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Computes Discrete Cosine Transform power spectrum slope to uncover high-frequency noise drops and neural upsampling discrepancies invisible in raw RGB space.
              </p>
              <div className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-900">
                Modality: Radial Azimuthal Frequency Profile
              </div>
            </div>

            {/* Stage 3: Audio Vocoder */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                03
              </div>
              <h3 className="text-base font-bold text-white">Acoustic Vocoder & Mel-Spectra</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Demuxes audio streams to analyze harmonic formant continuity and identify ElevenLabs, Bark, and RVC synthetic neural vocoder phase shifts.
              </p>
              <div className="text-[10px] text-purple-400 pt-2 border-t border-neutral-900">
                Modality: 128-Band Log Mel-Spectrogram
              </div>
            </div>

            {/* Stage 4: EXIF Hardware */}
            <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                04
              </div>
              <h3 className="text-base font-bold text-white">Container Atoms & Hardware EXIF</h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                Parses MP4/MOV container atoms, codec chains, re-encoding generations, and GPS coordinates to verify physical camera sensor origin vs. CapCut/Premiere manipulation.
              </p>
              <div className="text-[10px] text-emerald-400 pt-2 border-t border-neutral-900">
                Provenance: Hardware Camera vs Editor Tags
              </div>
            </div>

          </div>
        </div>

        {/* 2. Benchmark Matrix Table */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Empirical Validation</span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                Cross-Dataset Generalization Benchmark Matrix
              </h2>
              <p className="text-xs text-neutral-400 font-sans mt-1">
                Comparative evaluation across 14 major academic & real-world benchmarks (FF++, DFDC, Celeb-DF, FakeAVCeleb, In-The-Wild).
              </p>
            </div>
            <a
              href="/#analyzer"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm self-start sm:self-auto"
            >
              Analyze Your Media &rarr;
            </a>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/50 text-neutral-400">
                    <th className="p-4 font-semibold">Detector / Architecture</th>
                    <th className="p-4 font-semibold">Mean Cross-Dataset AUROC</th>
                    <th className="p-4 font-semibold">Confidence Margin</th>
                    <th className="p-4 font-semibold">Detection Paradigm</th>
                    <th className="p-4 font-semibold">Role in NETRA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {benchmarkMatrix.map((row, idx) => (
                    <tr key={idx} className={idx === 0 ? "bg-cyan-950/20 font-semibold" : "hover:bg-neutral-900/30"}>
                      <td className="p-4 text-white flex items-center gap-2">
                        {idx === 0 && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                        {row.model}
                      </td>
                      <td className={`p-4 font-bold ${parseFloat(row.detectionRate) >= 95 ? "text-emerald-400" : parseFloat(row.detectionRate) >= 90 ? "text-cyan-400" : parseFloat(row.detectionRate) >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                        {row.detectionRate}
                      </td>
                      <td className="p-4 text-neutral-300">{row.meanFakeProb}</td>
                      <td className="p-4 text-neutral-400 font-sans">{row.architecture}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === "Primary System"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-500/40"
                            : row.status === "Integrated Backbone"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Deep Architectural Rationale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-neutral-950/70 border border-neutral-800 p-8 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Why GenD's 0.03% Parameter Hypersphere Tuning Works
            </h3>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Standard deepfake detectors overfit on generator-specific artifacts when training the full backbone. GenD (WACV 2026) keeps the 304M ViT-L vision encoder completely frozen and tunes only the <strong>LayerNorm affine parameters + linear classifier head (0.03% of total weights)</strong> on an L2-normalized hypersphere with contrastive alignment and uniformity loss, preventing feature collapse.
            </p>
          </div>

          <div className="bg-neutral-950/70 border border-cyan-500/30 p-8 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Why NETRA Multi-Modal Fusion Extends GenD (98.2%)
            </h3>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              While GenD excels at isolated facial swaps, real-world cybercrime involves <strong>AI voice clones, WhatsApp audio extortion, and heavily re-compressed videos</strong>. NETRA augments GenD's visual backbone with physical 2D-DCT frequency spectra, ElevenLabs vocoder detection, and automated FIR legal reports.
            </p>
          </div>

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
            GenD ViT-L/14 Foundation Backbone & Multi-Modal Fusion Engine
          </div>
          <div className="flex gap-6">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/radar" className="hover:text-white transition-colors">Threat Radar</a>
            <a href="/reported" className="hover:text-white transition-colors">Threat Catalog</a>
            <a href="/developers" className="hover:text-white transition-colors">Developer API</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
