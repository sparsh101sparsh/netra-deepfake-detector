"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ToolDetailLine = { text: string; tone?: "add" | "del" | "ctx" };

export interface ToolStep {
  icon?: "think" | "write" | "run" | "read" | "scan" | string;
  label: string;
  chip: string;
  mono?: boolean;
  detailMono?: boolean;
  detail: ToolDetailLine[];
}

export interface ToolDiff {
  file: string;
  add: number;
  del: number;
}

export interface ToolDiffLine {
  text: string;
  tone: "add" | "del" | "ctx";
}

export interface ToolChipsLabels {
  header: string;
  more: string;
}

const DEFAULT_LABELS: ToolChipsLabels = {
  header: "4 forensic tool invocations",
  more: "+2 more",
};

const DEFAULT_STEPS: ToolStep[] = [
  {
    icon: "scan",
    label: "Frequency Analysis",
    chip: "dct_residual_matrix.npy",
    mono: true,
    detailMono: false,
    detail: [
      { text: "Spectral peak at 44.1kHz artifact boundary" },
      { text: "Confidence: 0.941 artifact probability" },
    ],
  },
  {
    icon: "write",
    label: "Generate Dossier",
    chip: "forensic_report.json",
    mono: true,
    detailMono: true,
    detail: [
      { text: '+ "verdict": "DEEPFAKE_SUSPECT"', tone: "add" },
      { text: '+ "evidence_flags": ["frequency_anomaly", "spatial_blur"]', tone: "add" },
    ],
  },
  {
    icon: "run",
    label: "Cross-Correlate Intelligence",
    chip: "tavily_search_api",
    mono: true,
    detailMono: false,
    detail: [
      { text: "✓ Matched 3 active cyber scam campaigns" },
      { text: "✓ Telephony IOC registered in SEBI blacklist" },
    ],
  },
  {
    icon: "read",
    label: "PaddleOCR Extraction",
    chip: "frame_0042_ocr.txt",
    mono: true,
    detailMono: true,
    detail: [
      { text: "Detected: 'Urgent KYC Suspension Alert'" },
      { text: "Detected UPI: 'paytmqr.28100@paytm'" },
    ],
  },
];

const DEFAULT_DIFFS: ToolDiff[] = [
  { file: "ioc_dossier.json", add: 24, del: 2 },
  { file: "risk_assessment.ts", add: 58, del: 12 },
  { file: "tavily_news_feed.json", add: 6, del: 0 },
];

const DEFAULT_DIFF_LINES: Record<string, ToolDiffLine[]> = {
  "ioc_dossier.json": [
    { text: "  \"upi_handles\": [", tone: "ctx" },
    { text: "    \"verified_merchant@axis\",", tone: "del" },
    { text: "    \"fraud_suspect_99@upi\",", tone: "add" },
    { text: "    \"urgent_kyc_portal@icici\"", tone: "add" },
    { text: "  ],", tone: "ctx" },
  ],
  "risk_assessment.ts": [
    { text: "const baselineScore = evaluateRisk(payload);", tone: "ctx" },
    { text: "const finalScore = baselineScore;", tone: "del" },
    { text: "const finalScore = crossReferenceTavilyFeed(", tone: "add" },
    { text: "  baselineScore, iocMatches", tone: "add" },
    { text: ");", tone: "add" },
  ],
  "tavily_news_feed.json": [
    { text: "+ { \"title\": \"New AI Voice Clone Scam Alert\", \"risk\": \"CRITICAL\" }", tone: "add" },
  ],
};

const STEP_MS = 600;

export interface ToolChipsProps {
  steps?: ToolStep[];
  diffs?: ToolDiff[];
  diffLines?: Record<string, ToolDiffLine[]>;
  labels?: Partial<ToolChipsLabels>;
  animateSequence?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  onToggleRow?: (label: string, open: boolean) => void;
}

export function ToolChips({
  steps = DEFAULT_STEPS,
  diffs = DEFAULT_DIFFS,
  diffLines = DEFAULT_DIFF_LINES,
  labels,
  animateSequence = false,
  className,
  onOpenChange,
  onToggleRow,
}: ToolChipsProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };
  const [stepCount, setStepCount] = useState(animateSequence ? 0 : steps.length + 1);
  const [open, setOpen] = useState(true);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{
    file: string;
    x: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const total = steps.length + 1;

  useEffect(() => {
    if (!animateSequence || stepCount >= total) return;
    const t = setTimeout(() => setStepCount((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [animateSequence, stepCount, total]);

  const toggleRow = (label: string) => {
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      onToggleRow?.(label, next.has(label));
      return next;
    });
  };

  const openPreview = (file: string) => (event: React.SyntheticEvent) => {
    const target = event.currentTarget as Element;
    const chipContainer = target.closest("[data-diffchip]");
    if (!chipContainer) return;
    const rect = chipContainer.getBoundingClientRect();
    const previewHeight = 38 + (diffLines[file]?.length ?? 0) * 20;
    const fitsBelow = rect.bottom + 6 + previewHeight <= window.innerHeight - 12;

    setPreview({
      file,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      ...(fitsBelow
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  };

  const closePreview = (file: string) => () => {
    setPreview((current) => (current?.file === file ? null : current));
  };

  const renderIcon = (icon?: string) => {
    switch (icon) {
      case "write":
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
          </svg>
        );
      case "run":
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17l6-5-6-5M12 19h8" />
          </svg>
        );
      case "read":
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        );
      case "scan":
      default:
        return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        );
    }
  };

  return (
    <div className={cn("w-full select-none", className)}>
      {/* Header bar */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((curr) => {
            onOpenChange?.(!curr);
            return !curr;
          })
        }}
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-control px-1.5 py-1 text-[12.5px] text-ink-2 transition-colors hover:bg-hover active:bg-hover-2"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="tabular-nums font-medium">{copy.header}</span>
      </button>

      {/* Tool Call Rows */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="-mx-1 overflow-hidden px-1.5 pb-1">
          <div className="mt-1.5 flex flex-col gap-1">
            {steps.slice(0, stepCount).map((row) => {
              const isRowOpen = openRows.has(row.label);
              return (
                <div key={row.label} style={{ animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" }}>
                  <button
                    type="button"
                    aria-expanded={isRowOpen}
                    onClick={() => toggleRow(row.label)}
                    className="group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] min-w-0 items-center gap-2 rounded-control px-[3px] text-left transition-colors duration-100 hover:bg-hover active:bg-hover-2"
                  >
                    <span className="relative flex size-4 shrink-0 items-center justify-center text-ink-3">
                      <span
                        className={cn(
                          "transition-opacity duration-100",
                          isRowOpen && "opacity-0"
                        )}
                      >
                        {renderIcon(row.icon)}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                          "absolute transition-[opacity,transform] duration-150",
                          isRowOpen ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
                        )}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>

                    <span className="shrink-0 text-[12.5px] font-medium text-ink">{row.label}</span>

                    <span
                      className={cn(
                        "inline-flex h-5 min-w-0 flex-1 cursor-pointer items-center truncate rounded-chip bg-field px-1.5 text-[11.5px] text-ink-2 border-[1.5px] border-line/60 transition-colors hover:bg-hover hover:text-ink",
                        row.mono && "font-mono"
                      )}
                    >
                      {row.chip}
                    </span>
                  </button>

                  {/* Expanded Detail Panel */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-300"
                    style={{
                      gridTemplateRows: isRowOpen ? "1fr" : "0fr",
                      opacity: isRowOpen ? 1 : 0,
                      transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-line py-0.5 pl-3.5">
                        {row.detail.map((line, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "truncate text-[11.5px] leading-[1.6]",
                              row.detailMono && "font-mono",
                              line.tone === "add" ? "text-green" : line.tone === "del" ? "text-red" : "text-ink-2"
                            )}
                          >
                            {line.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Artifact File-Diff Chips */}
          {diffs.length > 0 && stepCount >= total && (
            <div className="mt-2.5 flex max-w-full flex-wrap gap-1.5 border-t border-line pt-2.5">
              {diffs.map((d, i) => (
                <span
                  key={d.file}
                  data-diffchip
                  className="relative"
                  onMouseEnter={openPreview(d.file)}
                  onMouseLeave={closePreview(d.file)}
                >
                  <button
                    type="button"
                    aria-expanded={preview?.file === d.file}
                    aria-label={`Show diff for ${d.file}`}
                    onFocus={openPreview(d.file)}
                    onBlur={closePreview(d.file)}
                    className="inline-flex h-6.5 max-w-full items-center gap-1.5 rounded-chip bg-surface px-2 font-mono text-[11.5px] text-ink border-[1.5px] border-line shadow-btn transition-colors hover:bg-hover"
                    style={{
                      animation: `pop-in 250ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both`,
                    }}
                  >
                    <span className="min-w-0 truncate">{d.file}</span>
                    <span className="shrink-0 text-green tabular-nums">+{d.add}</span>
                    {d.del > 0 && <span className="shrink-0 text-red tabular-nums">−{d.del}</span>}
                  </button>
                </span>
              ))}
              <span className="inline-flex h-6.5 items-center rounded-chip px-1.5 font-mono text-[11.5px] text-ink-3">
                {copy.more}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Diff Preview Portal */}
      {preview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-50 w-72 overflow-hidden rounded-card bg-surface border-[1.5px] border-line shadow-overlay"
          style={{
            left: preview.x,
            top: preview.top,
            bottom: preview.bottom,
            animation: "pop-in 160ms cubic-bezier(0.23, 1, 0.32, 1) both",
            transformOrigin: preview.top === undefined ? "bottom left" : "top left",
          }}
        >
          <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5 font-mono text-[11px] bg-inset/50">
            <span className="min-w-0 truncate text-ink font-semibold">{preview.file}</span>
            <span className="shrink-0 tabular-nums">
              <span className="text-green">+{diffs.find((d) => d.file === preview.file)?.add}</span>
              {(diffs.find((d) => d.file === preview.file)?.del ?? 0) > 0 && (
                <span className="text-red"> −{diffs.find((d) => d.file === preview.file)?.del}</span>
              )}
            </span>
          </div>
          <div className="py-1 font-mono text-[11px] leading-[1.8]">
            {(diffLines[preview.file] ?? []).map((line, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2 px-2.5 whitespace-pre",
                  line.tone === "add"
                    ? "bg-green-tint text-green"
                    : line.tone === "del"
                    ? "bg-red-tint text-red"
                    : "text-ink-2"
                )}
              >
                <span className="w-3 shrink-0 select-none">
                  {line.tone === "add" ? "+" : line.tone === "del" ? "−" : " "}
                </span>
                <span className="min-w-0 truncate">{line.text}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ToolChips;
