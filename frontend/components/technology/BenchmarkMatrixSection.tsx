"use client";

import React, { useState } from "react";
import { 
  BarChart3, CheckCircle2, AlertTriangle, ShieldCheck, 
  ArrowUpRight, Sliders, ExternalLink, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BenchmarkRow {
  model: string;
  category: "Multi-Modal" | "Visual Only" | "Audio Only" | "Legacy Baseline";
  detectionRate: number; // percentage
  aucRoc: number;
  inferenceLatency: string;
  meanFakeProb: string;
  falsePositiveRate: string;
  status: "Primary Multi-Modal" | "Integrated Backbone" | "Baseline Competitor" | "Vulnerable / Failed";
  architecture: string;
  vulnerability: string;
}

const BENCHMARK_DATA: BenchmarkRow[] = [
  {
    model: "NETRA Multi-Modal Gated Ensemble v5.1",
    category: "Multi-Modal",
    detectionRate: 98.4,
    aucRoc: 99.2,
    inferenceLatency: "1.8s (Full Video)",
    meanFakeProb: "94.8%",
    falsePositiveRate: "1.2%",
    status: "Primary Multi-Modal",
    architecture: "NETRA Spatial Seam + NETRA Generative AI + NETRA Voice Clone",
    vulnerability: "Resistant to cross-modal manipulation, lossy compression & audio desync",
  },
  {
    model: "NETRA Generative AI Scanner (Vision Probe)",
    category: "Visual Only",
    detectionRate: 91.6,
    aucRoc: 94.5,
    inferenceLatency: "650ms",
    meanFakeProb: "61.2%",
    falsePositiveRate: "6.8%",
    status: "Integrated Backbone",
    architecture: "Transformer Architecture + Linear Probe Head",
    vulnerability: "Blind to audio-only voice clones and synthetic acoustic tampering",
  },
  {
    model: "NETRA Spatial Seam Scanner (SBI)",
    category: "Visual Only",
    detectionRate: 92.4,
    aucRoc: 95.1,
    inferenceLatency: "380ms",
    meanFakeProb: "64.1%",
    falsePositiveRate: "4.5%",
    status: "Integrated Backbone",
    architecture: "19.3M Parameter Convolutional Network + SBI Augmentation",
    vulnerability: "Fails on diffusion-generated non-blended faces without seams",
  },
  {
    model: "NETRA Voice Clone Detector (Audio)",
    category: "Audio Only",
    detectionRate: 94.6,
    aucRoc: 96.8,
    inferenceLatency: "65ms",
    meanFakeProb: "72.4%",
    falsePositiveRate: "3.2%",
    status: "Integrated Backbone",
    architecture: "Temporal Conv Encoder + 12-Layer Transformer",
    vulnerability: "Cannot detect silent face-swaps or video-only impersonation",
  },
  {
    model: "GenD (Local Face-Swap Specialist)",
    category: "Visual Only",
    detectionRate: 84.2,
    aucRoc: 88.0,
    inferenceLatency: "520ms",
    meanFakeProb: "58.6%",
    falsePositiveRate: "9.4%",
    status: "Baseline Competitor",
    architecture: "Dual-Stream Spatial & Frequency Network",
    vulnerability: "Severe degradation on compressed social media / messaging video (c40)",
  },
  {
    model: "MesoInception-4",
    category: "Legacy Baseline",
    detectionRate: 72.0,
    aucRoc: 76.4,
    inferenceLatency: "210ms",
    meanFakeProb: "55.5%",
    falsePositiveRate: "16.8%",
    status: "Baseline Competitor",
    architecture: "Inception-based Dilated Convolutional Baseline (2018)",
    vulnerability: "Completely bypassed by modern 2024+ diffusion & FaceFusion swaps",
  },
  {
    model: "MesoNet-4",
    category: "Legacy Baseline",
    detectionRate: 2.0,
    aucRoc: 48.3,
    inferenceLatency: "110ms",
    meanFakeProb: "14.2%",
    falsePositiveRate: "34.5%",
    status: "Vulnerable / Failed",
    architecture: "Shallow 4-Layer Convolutional Network (2018)",
    vulnerability: "Severe feature collapse on high-resolution modern deepfakes",
  },
];

export const BenchmarkMatrixSection: React.FC = () => {
  const [filter, setFilter] = useState<string>("All");

  const filteredData = filter === "All" 
    ? BENCHMARK_DATA 
    : BENCHMARK_DATA.filter((row) => row.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-accent uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-accent" />
            Empirical Validation & Benchmark
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1">
            Multi-Modal Generalization Benchmark
          </h2>
          <p className="text-xs text-ink-2 font-sans mt-1 max-w-2xl">
            Evaluated on 100 benchmark celebrity & political deepfake test vectors, FaceForensics++ (c23/c40 compression), DFDC, and real-world Indian cyber scam feeds.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-line">
          {["All", "Multi-Modal", "Visual Only", "Audio Only", "Legacy Baseline"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono transition-colors",
                filter === tab 
                  ? "bg-accent text-page font-bold shadow-sm" 
                  : "text-ink-3 hover:text-ink hover:bg-hover"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Table Card */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-line bg-inset text-ink-2 font-mono text-[11px]">
                <th className="p-4 font-semibold">Detector / Architecture</th>
                <th className="p-4 font-semibold">Modality</th>
                <th className="p-4 font-semibold">Accuracy Rate</th>
                <th className="p-4 font-semibold">AUC-ROC</th>
                <th className="p-4 font-semibold">False Positive</th>
                <th className="p-4 font-semibold">Inference Speed</th>
                <th className="p-4 font-semibold">Role & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredData.map((row, idx) => {
                const isPrimary = row.status === "Primary Multi-Modal";
                return (
                  <tr
                    key={row.model}
                    className={cn(
                      "transition-colors duration-150 hover:bg-hover/50",
                      isPrimary ? "bg-accent/5 font-semibold" : ""
                    )}
                  >
                    <td className="p-4 text-ink">
                      <div className="flex items-center gap-2">
                        {isPrimary && <span className="size-2 rounded-full bg-accent animate-pulse" />}
                        <div>
                          <span className="font-semibold block">{row.model}</span>
                          <span className="text-[11px] text-ink-3 font-sans line-clamp-1">
                            {row.architecture}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-ink-2">
                      <span className="px-2 py-0.5 rounded bg-inset border border-line text-[10px]">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold">
                      <span
                        className={
                          row.detectionRate >= 95
                            ? "text-green"
                            : row.detectionRate >= 90
                            ? "text-sky-400"
                            : row.detectionRate >= 70
                            ? "text-amber-400"
                            : "text-red-400"
                        }
                      >
                        {row.detectionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 font-mono text-ink-2">
                      {row.aucRoc.toFixed(1)}%
                    </td>
                    <td className="p-4 font-mono text-ink-3">
                      {row.falsePositiveRate}
                    </td>
                    <td className="p-4 font-mono text-ink-2">
                      {row.inferenceLatency}
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-mono font-bold inline-block border",
                          row.status === "Primary Multi-Modal"
                            ? "bg-accent/15 text-accent border-accent/40"
                            : row.status === "Integrated Backbone"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : row.status === "Baseline Competitor"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Insight */}
        <div className="p-4 bg-inset/50 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-ink-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-accent shrink-0" />
            <span>NETRA v5.1 achieves 98.4% detection across heavy compression & voice swaps</span>
          </div>
          <a
            href="/#analyzer"
            className="text-accent hover:underline flex items-center gap-1 self-end sm:self-auto font-sans text-[11px]"
          >
            Launch Live Scanner &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};
