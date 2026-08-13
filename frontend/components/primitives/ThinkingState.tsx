"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, ReactNode } from "react";
import { Shimmer } from "@/components/atoms/Shimmer";
import { cn } from "@/lib/utils";

export interface ThinkingRow {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
  status?: "pending" | "running" | "done" | "warning" | "error";
}

export interface ThinkingStateProps {
  variant?: "Steps" | "Reasoning" | "Search" | "Coding" | "Forensic";
  activeLabel?: string;
  doneLabel?: string;
  rows?: ThinkingRow[];
  query?: string;
  isProcessing?: boolean;
  initiallyExpanded?: boolean;
  onSettled?: () => void;
  className?: string;
}

const DEFAULT_FORENSIC_ROWS: ThinkingRow[] = [
  { primary: "Extracting 2D-DCT spatial-frequency residuals", secondary: "Layer 0-4" },
  { primary: "Computing GenD ViT-L/14 facial boundary embedding", secondary: "dim=768" },
  { primary: "Cross-correlating PaddleOCR text with RBI/SEBI alert lists", secondary: "98.4% match" },
  { primary: "Synthesizing multimodal deepfake confidence vector", secondary: "Verifying" },
];

export function ThinkingState({
  variant = "Forensic",
  activeLabel,
  doneLabel,
  rows = DEFAULT_FORENSIC_ROWS,
  query,
  isProcessing = true,
  initiallyExpanded = true,
  onSettled,
  className,
}: ThinkingStateProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  const defaultActiveLabel =
    variant === "Forensic"
      ? "Running multimodal neural inspection"
      : variant === "Search"
      ? "Querying threat intelligence database"
      : variant === "Coding"
      ? "Executing sandbox verification routines"
      : variant === "Reasoning"
      ? "Synthesizing forensic evidence"
      : "Analyzing forensic signals";

  const defaultDoneLabel =
    variant === "Forensic"
      ? "Multimodal forensic inspection settled"
      : variant === "Search"
      ? "Threat intelligence search complete"
      : variant === "Coding"
      ? "Sandbox verification routines executed"
      : "Forensic reasoning complete";

  const resolvedActive = activeLabel || defaultActiveLabel;
  const resolvedDone = doneLabel || defaultDoneLabel;

  useLayoutEffect(() => {
    if (traceRef.current) {
      setLineHeight(traceRef.current.offsetHeight);
    }
  }, [rows, expanded, isProcessing]);

  useEffect(() => {
    if (!isProcessing && onSettled) {
      onSettled();
    }
  }, [isProcessing, onSettled]);

  return (
    <div className={cn("flex w-full flex-col select-none", className)}>
      {/* Header Bar */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-control px-2 py-1 transition-colors duration-100 hover:bg-hover active:bg-hover-2 text-left"
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {isProcessing ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="var(--accent)"
              className="animate-pulse"
            >
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="var(--green)"
            >
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          )}
        </span>

        <span role="status" className="contents">
          {isProcessing ? (
            <Shimmer className="text-[13px] font-medium whitespace-nowrap">
              {resolvedActive}…
            </Shimmer>
          ) : (
            <span className="text-[13px] font-medium whitespace-nowrap text-ink-2">
              {resolvedDone}
            </span>
          )}
        </span>

        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-3)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Collapsible Reasoning & Steps Trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1.5 ml-1 pl-4">
            {/* Vertical timeline spine */}
            <span
              aria-hidden="true"
              className="absolute left-[3px] w-px bg-line"
              style={{
                top: -4,
                height: lineHeight ? lineHeight : 0,
                transition: "height 400ms cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            />

            <div ref={traceRef} className="flex flex-col gap-1.5 py-1">
              {query && (
                <div className="flex h-6 items-center gap-2 px-1 text-[12.5px] text-ink-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="shrink-0 text-ink-3"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  <span className="truncate">{query}</span>
                </div>
              )}

              {rows.map((row, i) => (
                <div
                  key={row.primary + i}
                  className="flex min-h-6 items-center gap-2 rounded-md px-1.5 py-0.5 text-[12.5px] text-left transition-colors hover:bg-hover/60"
                  style={{
                    animation: `fade-up 300ms cubic-bezier(0.23, 1, 0.32, 1) ${i * 60}ms both`,
                  }}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      row.status === "error"
                        ? "bg-red"
                        : row.status === "warning"
                        ? "bg-orange"
                        : row.status === "done"
                        ? "bg-green"
                        : "bg-accent"
                    )}
                  />
                  <span className="text-ink font-medium truncate">{row.primary}</span>
                  {row.secondary && (
                    <span
                      className={cn(
                        "text-[11.5px] text-ink-3 ml-auto shrink-0",
                        row.mono && "font-mono"
                      )}
                    >
                      {row.secondary}
                    </span>
                  )}
                  {row.add !== undefined && (
                    <span className="shrink-0 font-mono text-[11px] tabular-nums">
                      <span className="text-green">+{row.add}</span>{" "}
                      {row.del !== undefined && <span className="text-red">−{row.del}</span>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThinkingState;
