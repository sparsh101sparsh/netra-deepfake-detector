"use client";

import React, { useState } from "react";
import { 
  FileText, Download, ExternalLink, ChevronDown
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
    id: "2520_videos",
    title: "3X Massive 2,520-Video Comprehensive Evaluation",
    shortTitle: "2,520 Video Ledger (74 Pages • 5.0 MB)",
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
  {
    id: "100_deepfakes",
    title: "100-Deepfake Video Benchmark Ledger",
    shortTitle: "100 Deepfakes Ledger (5 Pages • 270 KB)",
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
];

export default function BenchmarkReportsSection() {
  const [selectedReportId, setSelectedReportId] = useState<string>("2520_videos");

  const currentReport = REPORTS.find((r) => r.id === selectedReportId) || REPORTS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls Bar: Clean Dropdown on the Right, Title on the Left */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-card bg-surface border border-line shadow-card">
        {/* Left Side: Brand Indicator */}
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-accent" />
          <span className="text-xs font-semibold text-ink">Benchmark Dossier:</span>
          <span className="text-xs text-ink-2 font-medium">
            {currentReport.title}
          </span>
        </div>

        {/* Right Side: Dropdown Menu to Choose Between the 2 PDFs & Direct Download */}
        <div className="flex items-center gap-2.5 flex-wrap justify-start sm:justify-end">
          {/* Styled Select Dropdown */}
          <div className="relative inline-block">
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-control bg-field border border-line text-ink hover:border-accent/50 focus:outline-none focus:border-accent cursor-pointer transition-colors"
            >
              {REPORTS.map((r) => (
                <option key={r.id} value={r.id} className="bg-surface text-ink py-1">
                  {r.shortTitle}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-3 pointer-events-none" />
          </div>

          {/* Fullscreen Preview Action */}
          <a
            href={currentReport.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control bg-field border border-line hover:bg-hover-2 text-ink transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Fullscreen</span>
          </a>

          {/* Download Active Selected PDF Action */}
          <a
            href={currentReport.pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 transition-colors"
          >
            <Download size={12} />
            <span>Download ({currentReport.size})</span>
          </a>
        </div>
      </div>

      {/* Main Single Focus Tab: Full Embedded PDF Viewer */}
      <div className="w-full rounded-card overflow-hidden bg-surface border border-line shadow-card">
        {/* Fullscreen-height Embedded PDF Viewer */}
        <div className="w-full h-[850px] bg-neutral-900">
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
