"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StreamTextProps {
  text: string;
  charsPerTick?: number;
  tickMs?: number;
  blurTail?: number;
  caret?: boolean;
  className?: string;
  onProgress?: () => void;
  onDone?: () => void;
}

/**
 * 60fps Character-by-character StreamText primitive.
 * Fast token flow with soft blur-tail mask and terminal caret.
 */
export function StreamText({
  text,
  charsPerTick = 2,
  tickMs = 9,
  blurTail = 6,
  caret = true,
  className,
  onProgress,
  onDone,
}: StreamTextProps) {
  const [count, setCount] = useState(0);
  const onProgressRef = useRef(onProgress);
  const onDoneRef = useRef(onDone);
  onProgressRef.current = onProgress;
  onDoneRef.current = onDone;

  useEffect(() => {
    setCount(0);
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + charsPerTick, text.length);
      setCount(i);
      onProgressRef.current?.();
      if (i >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [text, charsPerTick, tickMs]);

  const streaming = count < text.length;
  const shown = text.slice(0, count);
  const split = streaming ? Math.max(0, shown.length - blurTail) : shown.length;

  return (
    <span className={cn("inline", className)}>
      {shown.slice(0, split)}
      {split < shown.length && (
        <span className="stream-tail">{shown.slice(split)}</span>
      )}
      {caret && (
        <span
          aria-hidden="true"
          className={cn("stream-caret", streaming && "is-streaming")}
        />
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT (Compound Primitive with Citations & Actions)
 * ───────────────────────────────────────────────────────── */

export type StreamingToken = { text: string; cite?: boolean };

export interface StreamingSource {
  name: string;
  domain: string;
  href: string;
  badge?: string;
}

export interface StreamingLabels {
  sources: string;
  followUps: string;
}

const DEFAULT_LABELS: StreamingLabels = {
  sources: "Threat Sources",
  followUps: "Forensic Follow-ups",
};

export interface StreamingTextProps {
  content?: StreamingToken[];
  sources?: StreamingSource[];
  followUps?: string[];
  labels?: Partial<StreamingLabels>;
  loop?: boolean;
  fill?: boolean;
  className?: string;
  onDone?: () => void;
  onFollowUp?: (text: string, index: number) => void;
}

export function StreamingText({
  content = [
    { text: "Multimodal forensic analysis detects 94.2% likelihood of deepfake manipulation." },
    { text: "Synthetic GAN frequency residuals identified across frames 12-48." },
    { text: "", cite: true },
    { text: "Cross-correlated telephony IOC matches an active cyber scam campaign." },
  ],
  sources = [
    { name: "CERT-In Advisory", domain: "cert-in.org.in", href: "https://www.cert-in.org.in/" },
    { name: "RBI Fraud Alert", domain: "rbi.org.in", href: "https://rbi.org.in/" },
  ],
  followUps = [
    "Extract audio vocal tract formant anomalies",
    "Trace fraudulent UPI gateway handle",
  ],
  labels,
  loop = false,
  fill = true,
  className,
  onDone,
  onFollowUp,
}: StreamingTextProps) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [tokenCount, setTokenCount] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDone = tokenCount >= content.length;

  useEffect(() => {
    if (isDone && !loop) {
      onDone?.();
      return;
    }
    const timer = setTimeout(
      () => setTokenCount((c) => (c >= content.length ? (loop ? 0 : c) : c + 1)),
      isDone ? 3000 : 50
    );
    return () => clearTimeout(timer);
  }, [tokenCount, isDone, loop, content.length, onDone]);

  const handleCopy = () => {
    const rawText = content.map((c) => c.text).filter(Boolean).join(" ");
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn(fill ? "w-full" : "max-w-md", "flex flex-col gap-2", className)}>
      {/* Streamed Body Text */}
      <p className="text-[13px] leading-relaxed text-ink font-sans">
        {content.slice(0, tokenCount).map((token, i) =>
          token.cite ? (
            <span
              key={i}
              className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-accent-tint border border-accent/20 text-accent-ink font-mono text-[11px] align-baseline"
            >
              <span className="size-1.5 rounded-full bg-accent" />
              <span>{sources[0]?.domain || "source"}</span>
            </span>
          ) : (
            <span key={i} className="inline">
              {token.text}{" "}
            </span>
          )
        )}
        {!isDone && (
          <span
            className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full bg-accent animate-pulse"
          />
        )}
      </p>

      {/* Action Icons & Sources Toggle Bar */}
      <div
        className={cn(
          "flex items-center gap-1 transition-opacity duration-300 pt-1",
          isDone ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          type="button"
          aria-label="Copy text"
          onClick={handleCopy}
          className="flex size-6.5 items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink transition-colors"
        >
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {sources.length > 0 && (
          <button
            type="button"
            aria-expanded={sourcesOpen}
            onClick={() => setSourcesOpen((c) => !c)}
            className="ml-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:bg-hover hover:text-ink transition-colors border-[1.5px] border-line/60"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            <span>{sources.length} {l.sources}</span>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="transition-transform duration-200"
              style={{ transform: sourcesOpen ? "rotate(180deg)" : "rotate(0)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Expandable Sources Dropdown */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: isDone && sourcesOpen ? "1fr" : "0fr",
          opacity: isDone && sourcesOpen ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-1 flex flex-col gap-1 rounded-card bg-inset border-[1.5px] border-line p-1.5">
            {sources.map((source) => (
              <a
                key={source.domain}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md px-2 py-1 text-[12px] text-ink-2 hover:bg-hover hover:text-ink transition-colors"
              >
                <span className="size-1.5 rounded-full bg-accent shrink-0" />
                <span className="font-medium">{source.name}</span>
                <span className="ml-auto font-mono text-[11px] text-ink-3">{source.domain}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Follow-up Prompts */}
      {followUps.length > 0 && (
        <div
          className={cn(
            "mt-1 flex flex-col gap-1 transition-opacity duration-300",
            isDone ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
            {l.followUps}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {followUps.map((prompt, i) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onFollowUp?.(prompt, i)}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface border-[1.5px] border-line px-2.5 py-1 text-[12px] text-ink-2 hover:bg-hover hover:text-ink hover:border-line-strong transition-colors"
              >
                <span>{prompt}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StreamText;
