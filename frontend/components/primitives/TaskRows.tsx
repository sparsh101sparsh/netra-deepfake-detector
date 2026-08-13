"use client";

import React, { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TaskDetail {
  label: string;
  meta: string;
}

export interface TaskRow {
  key: string;
  label: string;
  amount: string;
  status: "done" | "running" | "failed" | "pending";
  step?: number;
  details: TaskDetail[];
}

export interface TaskRowsLabels {
  completed: string;
  failed: string;
}

const DEFAULT_LABELS: TaskRowsLabels = {
  completed: "Completed",
  failed: "Failed",
};

const DEFAULT_TASK_ROWS: TaskRow[] = [
  {
    key: "ocr",
    label: "Multilingual PaddleOCR Scan",
    amount: "14 text spans",
    status: "done",
    details: [
      { label: "Detected Hindi & English script", meta: "100%" },
      { label: "Flagged fraudulent banking keywords", meta: "3 alerts" },
    ],
  },
  {
    key: "neural",
    label: "GenD ViT-L/14 Spatial Analysis",
    amount: "768-dim vector",
    status: "running",
    step: 2,
    details: [
      { label: "Computing boundary blur gradient", meta: "0.912" },
      { label: "Temporal eye-blink inconsistency", meta: "High" },
    ],
  },
  {
    key: "tavily",
    label: "Tavily Cyber Threat Intelligence",
    amount: "2 matches",
    status: "done",
    details: [
      { label: "Cross-correlated with CERT-In feed", meta: "Matched" },
      { label: "Verified telegram scam syndicate ID", meta: "Active" },
    ],
  },
];

function SpinnerRing({ active, children }: { active?: boolean; children?: ReactNode }) {
  const size = 22, stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className={cn("absolute inset-0", active && "animate-spin")}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {active && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.3} ${c * 0.7}`}
          />
        )}
      </svg>
      <span className="relative text-[10px] font-semibold tabular-nums text-ink">{children}</span>
    </span>
  );
}

function StatusBadge({ tone, children }: { tone: "red" | "green"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full text-white",
        tone === "red" ? "bg-red" : "bg-green"
      )}
      style={{ animation: "pop-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both" }}
    >
      {children}
    </span>
  );
}

export interface TaskRowsProps {
  variant?: "Capsules" | "List";
  rows?: TaskRow[];
  labels?: Partial<TaskRowsLabels>;
  className?: string;
  onToggleRow?: (key: string, open: boolean) => void;
}

export function TaskRows({
  variant = "Capsules",
  rows = DEFAULT_TASK_ROWS,
  labels,
  className,
  onToggleRow,
}: TaskRowsProps) {
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const copy = { ...DEFAULT_LABELS, ...labels };

  const isList = variant === "List";

  const renderBadge = (row: TaskRow) => {
    if (row.status === "done") {
      return (
        <StatusBadge tone="green">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </StatusBadge>
      );
    }
    if (row.status === "failed") {
      return (
        <StatusBadge tone="red">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </StatusBadge>
      );
    }
    if (row.status === "running") {
      return <SpinnerRing active>{row.step}</SpinnerRing>;
    }
    return <SpinnerRing>{row.step}</SpinnerRing>;
  };

  const renderPill = (row: TaskRow) => {
    if (row.status === "done") {
      return (
        <span className="inline-flex h-5 items-center rounded-full bg-green-tint border-[1.5px] border-green/20 px-2 text-[11px] font-medium text-green">
          {copy.completed}
        </span>
      );
    }
    if (row.status === "failed") {
      return (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-red-tint border-[1.5px] border-red/20 px-2 text-[11px] font-medium text-red">
          {copy.failed}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col select-none",
        isList
          ? "gap-0 overflow-hidden rounded-card bg-surface border-[1.5px] border-line shadow-card"
          : "gap-2",
        className
      )}
    >
      {rows.map((row, i) => {
        const isOpen = openRows[row.key] ?? false;
        return (
          <div
            key={row.key}
            className={cn(
              "self-stretch overflow-hidden transition-[border-radius,background-color] duration-200 hover:bg-inset/70",
              isList
                ? "border-b border-line last:border-0"
                : "bg-surface border-[1.5px] border-line shadow-card rounded-card"
            )}
            style={{
              animation: `fade-up 400ms cubic-bezier(0.23, 1, 0.32, 1) ${i * 60}ms both`,
            }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                const nextState = !isOpen;
                setOpenRows((prev) => ({ ...prev, [row.key]: nextState }));
                onToggleRow?.(row.key, nextState);
              }}
              className="flex h-10 w-full items-center gap-2.5 px-3 text-left focus-visible:outline-none"
            >
              <span className="flex size-5.5 shrink-0 items-center justify-center">
                {renderBadge(row)}
              </span>

              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {row.label}
              </span>

              <span className="text-[12px] text-ink-2 tabular-nums font-mono">{row.amount}</span>

              {renderPill(row)}

              <span
                aria-hidden="true"
                className="-mr-1 flex size-6 shrink-0 items-center justify-center text-ink-3"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {/* Expandable Task Detail Trace */}
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                opacity: isOpen ? 1 : 0,
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            >
              <div className="overflow-hidden">
                <div className="mb-2 grid grid-cols-[20px_1fr] gap-2 px-3 pt-1">
                  <span aria-hidden="true" className="mx-auto h-full w-px bg-line" />
                  <div className="flex flex-col gap-1">
                    {row.details.map((d, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span className="text-ink-2 truncate">{d.label}</span>
                        <span className="font-mono text-[11.5px] text-ink-3 tabular-nums ml-2 shrink-0">
                          {d.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TaskRows;
