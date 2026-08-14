"use client";

import React, { useState } from "react";
import { 
  FileText, Download, ExternalLink, ShieldCheck, 
  CheckCircle2, Layers, Columns2, Square
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
  const [viewMode, setViewMode] = useState<"dual" | "single">("dual");
  const [activeReportId, setActiveReportId] = useState<string>("100_deepfakes");

  const report100 = REPORTS[0];
  const report2520 = REPORTS[1];
  const singleReport = REPORTS.find((r) => r.id === activeReportId) || REPORTS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-card bg-surface border border-line shadow-card">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="size-4 text-accent" />
          <span className="text-xs font-semibold text-ink">View Mode:</span>
          
          <div className="inline-flex rounded-control bg-field p-1 border border-line-soft">
            <button
              onClick={() => setViewMode("dual")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[5px] transition-all ${
                viewMode === "dual"
                  ? "bg-accent/20 text-accent font-semibold shadow-sm"
                  : "text-ink-3 hover:text-ink hover:bg-hover-2"
              }`}
            >
              <Columns2 size={12} />
              <span>Side-by-Side Dual View</span>
            </button>
            <button
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[5px] transition-all ${
                viewMode === "single"
                  ? "bg-accent/20 text-accent font-semibold shadow-sm"
                  : "text-ink-3 hover:text-ink hover:bg-hover-2"
              }`}
            >
              <Square size={12} />
              <span>Single Focus Tab</span>
            </button>
          </div>

          {viewMode === "single" && (
            <div className="inline-flex rounded-control bg-field p-1 border border-line-soft ml-2">
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
          )}
        </div>

        {/* Global Download Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={report100.pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-field border border-line hover:bg-hover-2 text-ink transition-colors"
          >
            <Download size={12} />
            <span>Download 100-Video PDF (270 KB)</span>
          </a>
          <a
            href={report2520.pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 transition-colors"
          >
            <Download size={12} />
            <span>Download 2,520-Video PDF (5.0 MB)</span>
          </a>
        </div>
      </div>

      {/* DUAL VIEW: Both PDFs Visible Side-by-Side */}
      {viewMode === "dual" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dossier 1: 100 Deepfakes Ledger */}
          <div className="rounded-card overflow-hidden bg-surface border border-line shadow-card flex flex-col">
            <div className="p-4 border-b border-line-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent font-semibold uppercase tracking-wider">
                  <ShieldCheck size={11} /> {report100.badge}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={report100.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-ink-3 hover:text-ink hover:bg-field transition-colors"
                    title="Open Fullscreen"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <a
                    href={report100.pdfUrl}
                    download
                    className="p-1 rounded text-ink-3 hover:text-accent hover:bg-field transition-colors"
                    title="Download PDF"
                  >
                    <Download size={13} />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-ink">{report100.title}</h3>
                <p className="text-[11.5px] text-ink-2 mt-0.5 line-clamp-2">{report100.subtitle}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">Corpus</div>
                  <div className="text-xs font-bold text-ink mt-0.5">{report100.stats.datasetSize}</div>
                </div>
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">NETRA</div>
                  <div className="text-xs font-bold text-green mt-0.5">{report100.stats.netraAccuracy}</div>
                </div>
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">MesoNet</div>
                  <div className="text-xs font-bold text-accent mt-0.5">{report100.stats.mesonetAccuracy}</div>
                </div>
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">AUC-ROC</div>
                  <div className="text-xs font-bold text-ink mt-0.5">{report100.stats.aucScore}</div>
                </div>
              </div>
            </div>

            <div className="w-full h-[780px] bg-neutral-900 border-t border-line">
              <iframe
                src={`${report100.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full h-full border-0"
                title={report100.title}
              />
            </div>
          </div>

          {/* Dossier 2: 2,520 Videos Massive Ledger */}
          <div className="rounded-card overflow-hidden bg-surface border border-line shadow-card flex flex-col">
            <div className="p-4 border-b border-line-soft space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent font-semibold uppercase tracking-wider">
                  <ShieldCheck size={11} /> {report2520.badge}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={report2520.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-ink-3 hover:text-ink hover:bg-field transition-colors"
                    title="Open Fullscreen"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <a
                    href={report2520.pdfUrl}
                    download
                    className="p-1 rounded text-ink-3 hover:text-accent hover:bg-field transition-colors"
                    title="Download PDF"
                  >
                    <Download size={13} />
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-ink">{report2520.title}</h3>
                <p className="text-[11.5px] text-ink-2 mt-0.5 line-clamp-2">{report2520.subtitle}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">Corpus</div>
                  <div className="text-xs font-bold text-ink mt-0.5">{report2520.stats.datasetSize}</div>
                </div>
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">NETRA</div>
                  <div className="text-xs font-bold text-green mt-0.5">{report2520.stats.netraAccuracy}</div>
                </div>
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">MesoNet</div>
                  <div className="text-xs font-bold text-accent mt-0.5">{report2520.stats.mesonetAccuracy}</div>
                </div>
                <div className="p-2 rounded bg-field border border-line-soft text-center">
                  <div className="text-[9.5px] font-mono text-ink-3 uppercase">AUC-ROC</div>
                  <div className="text-xs font-bold text-ink mt-0.5">{report2520.stats.aucScore}</div>
                </div>
              </div>
            </div>

            <div className="w-full h-[780px] bg-neutral-900 border-t border-line">
              <iframe
                src={`${report2520.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full h-full border-0"
                title={report2520.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* SINGLE FOCUS VIEW */}
      {viewMode === "single" && (
        <div className="w-full rounded-card overflow-hidden bg-surface border border-line shadow-card">
          <div className="p-5 border-b border-line-soft space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent font-semibold uppercase tracking-wider mb-1">
                  <ShieldCheck size={11} /> {singleReport.badge}
                </div>
                <h3 className="text-base font-bold text-ink">{singleReport.title}</h3>
                <p className="text-xs text-ink-2 mt-0.5">{singleReport.subtitle}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-ink-3">
                <span>{singleReport.pages} Pages</span>
                <span>&bull;</span>
                <span>{singleReport.size}</span>
                <span>&bull;</span>
                <span className="text-green flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={12} /> Verified
                </span>
              </div>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">{singleReport.summary}</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-2.5 rounded-control bg-field border border-line-soft">
                <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Corpus Size</div>
                <div className="text-base font-bold text-ink mt-0.5">{singleReport.stats.datasetSize}</div>
              </div>
              <div className="p-2.5 rounded-control bg-field border border-line-soft">
                <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">NETRA Accuracy</div>
                <div className="text-base font-bold text-green mt-0.5">{singleReport.stats.netraAccuracy}</div>
              </div>
              <div className="p-2.5 rounded-control bg-field border border-line-soft">
                <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">MesoNet Baseline</div>
                <div className="text-base font-bold text-accent mt-0.5">{singleReport.stats.mesonetAccuracy}</div>
              </div>
              <div className="p-2.5 rounded-control bg-field border border-line-soft">
                <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">AUC-ROC</div>
                <div className="text-base font-bold text-ink mt-0.5">{singleReport.stats.aucScore}</div>
              </div>
              <div className="p-2.5 rounded-control bg-field border border-line-soft">
                <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">False Positive Rate</div>
                <div className="text-base font-bold text-ink mt-0.5">{singleReport.stats.fpr}</div>
              </div>
            </div>
          </div>

          <div className="w-full h-[850px] bg-neutral-900 border-t border-line">
            <iframe
              src={`${singleReport.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-0"
              title={singleReport.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
