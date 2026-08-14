"use client";

import React, { useState } from "react";
import { 
  FileText, Download, ExternalLink, ShieldCheck, 
  BarChart3, CheckCircle2, Layers, Sparkles, AlertCircle 
} from "lucide-react";

interface ReportConfig {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  pages: number;
  size: string;
  pdfUrl: string;
  badge: string;
  summary: string;
  stats: {
    datasetSize: string;
    netraAccuracy: string;
    mesonetAccuracy: string;
    aucScore: string;
    fpr: string;
  };
}

const REPORTS: ReportConfig[] = [
  {
    id: "100_deepfakes",
    title: "100-Deepfake Video Benchmark Ledger",
    shortTitle: "100 Deepfakes Ledger",
    subtitle: "Official Verification Ledger: NETRA Merged Architecture vs. MesoNet Baselines",
    pages: 5,
    size: "270 KB",
    pdfUrl: "/benchmarks/NETRA_vs_MesoNet_100_Deepfakes_Benchmark_Report.pdf",
    badge: "Target Corpus (100 Videos)",
    summary: "Complete per-sample forensic detection ledger across all 100 generated face-swapped videos targeting prominent Indian public figures, military leaders, and artists. Compares NETRA against Meso-4 and MesoInception-4 across every video sequence.",
    stats: {
      datasetSize: "100 Sequences",
      netraAccuracy: "100.0%",
      mesonetAccuracy: "74.0%",
      aucScore: "0.998",
      fpr: "0.0%",
    },
  },
  {
    id: "2520_videos",
    title: "3X Massive 2,520-Video Comprehensive Evaluation",
    shortTitle: "2,520 Video Ledger",
    subtitle: "Exhaustive Forensic Evaluation across 6 Synthesis Categories & Compression Regimes",
    pages: 74,
    size: "5.0 MB",
    pdfUrl: "/benchmarks/NETRA_vs_MesoNet_2520_Videos_Benchmark_Report.pdf",
    badge: "Scale Ledger (2,520 Videos)",
    summary: "Large-scale cross-architecture forensic evaluation spanning 2,520 video sequences across pristine, compressed, and adversarial classes. Benchmarks temporal artifact stability, boundary gradients, and spectral frequency distributions against academic baselines.",
    stats: {
      datasetSize: "2,520 Sequences",
      netraAccuracy: "99.4%",
      mesonetAccuracy: "68.2%",
      aucScore: "0.994",
      fpr: "0.6%",
    },
  },
];

export default function BenchmarkReportsSection() {
  const [activeReportId, setActiveReportId] = useState<string>("100_deepfakes");

  const currentReport = REPORTS.find((r) => r.id === activeReportId) || REPORTS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Report Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-card bg-surface border border-line shadow-card">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-accent" />
          <span className="text-xs font-semibold text-ink">Benchmark Dossier:</span>
          <div className="inline-flex rounded-control bg-field p-1 border border-line-soft">
            {REPORTS.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReportId(r.id)}
                className={`px-3 py-1 text-xs font-medium rounded-[5px] transition-all ${
                  activeReportId === r.id
                    ? "bg-accent/20 text-accent font-semibold shadow-sm"
                    : "text-ink-3 hover:text-ink hover:bg-hover-2"
                }`}
              >
                {r.shortTitle}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={currentReport.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control bg-field border border-line hover:bg-hover-2 text-ink transition-colors"
          >
            <ExternalLink size={12} />
            <span>Open Fullscreen</span>
          </a>
          <a
            href={currentReport.pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 transition-colors"
          >
            <Download size={12} />
            <span>Download PDF ({currentReport.size})</span>
          </a>
        </div>
      </div>

      {/* Report Summary & Metrics Cards */}
      <div className="p-5 rounded-card bg-surface border border-line shadow-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-line-soft pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck size={11} /> {currentReport.badge}
            </div>
            <h3 className="text-base font-bold text-ink">{currentReport.title}</h3>
            <p className="text-xs text-ink-2 mt-0.5">{currentReport.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-ink-3">
            <span>{currentReport.pages} Pages</span>
            <span>&bull;</span>
            <span>{currentReport.size}</span>
            <span>&bull;</span>
            <span className="text-green flex items-center gap-1 font-semibold">
              <CheckCircle2 size={12} /> Verified
            </span>
          </div>
        </div>

        <p className="text-xs text-ink-2 leading-relaxed">
          {currentReport.summary}
        </p>

        {/* Key Forensic Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-2.5 rounded-control bg-field border border-line-soft">
            <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Corpus Size</div>
            <div className="text-base font-bold text-ink mt-0.5">{currentReport.stats.datasetSize}</div>
          </div>
          <div className="p-2.5 rounded-control bg-field border border-line-soft">
            <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">NETRA Accuracy</div>
            <div className="text-base font-bold text-green mt-0.5">{currentReport.stats.netraAccuracy}</div>
          </div>
          <div className="p-2.5 rounded-control bg-field border border-line-soft">
            <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">MesoNet Baseline</div>
            <div className="text-base font-bold text-accent mt-0.5">{currentReport.stats.mesonetAccuracy}</div>
          </div>
          <div className="p-2.5 rounded-control bg-field border border-line-soft">
            <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">AUC-ROC</div>
            <div className="text-base font-bold text-ink mt-0.5">{currentReport.stats.aucScore}</div>
          </div>
          <div className="p-2.5 rounded-control bg-field border border-line-soft">
            <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">False Positive Rate</div>
            <div className="text-base font-bold text-ink mt-0.5">{currentReport.stats.fpr}</div>
          </div>
        </div>
      </div>

      {/* Embedded High-Fidelity PDF Viewer */}
      <div className="w-full rounded-card overflow-hidden bg-surface border border-line shadow-card">
        <div className="flex items-center justify-between px-4 py-2.5 bg-field border-b border-line text-xs font-mono text-ink-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent" />
            <span className="text-ink font-semibold">{currentReport.title}</span>
          </div>
          <span>Embedded PDF Preview</span>
        </div>
        <div className="w-full h-[750px] bg-neutral-900">
          <iframe
            src={`${currentReport.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full border-0"
            title={currentReport.title}
          />
        </div>
      </div>
    </div>
  );
}
