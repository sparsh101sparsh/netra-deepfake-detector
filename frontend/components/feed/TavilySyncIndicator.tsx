"use client";

import React from "react";
import { RefreshCw, Radio, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
import { ShimmerSkeleton } from "@/components/atoms/Shimmer";

export interface TavilySyncIndicatorProps {
  isRefreshing?: boolean;
  onRefresh?: () => void;
  lastSyncedAt?: string | null;
  totalCount?: number;
  className?: string;
  compact?: boolean;
}

/**
 * Tavily Live Sync Indicator & Status Header
 * Displays autonomous 24h crawler telemetry, sync action button, and liveness pulse.
 */
export function TavilySyncIndicator({
  isRefreshing = false,
  onRefresh,
  lastSyncedAt,
  totalCount,
  className,
  compact = false,
}: TavilySyncIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 select-none text-xs",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#18181B] text-zinc-300 border border-white/10">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          Live Threat Feed
        </span>

        {typeof totalCount === "number" && totalCount > 0 && (
          <span className="text-[11px] text-zinc-400 font-medium">
            • {totalCount} Advisories
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-zinc-500 hidden sm:inline-flex items-center gap-1">
          Auto-syncs 24h
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh feed intelligence"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none"
            aria-label="Refresh threat intelligence feed"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-accent")} />
          </button>
        )}
      </div>
    </div>
  );
}

export interface FeedSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * High-density skeleton placeholder for news feed loading and category transitions
 */
export function FeedSkeleton({ count = 3, className }: FeedSkeletonProps) {
  return (
    <div className={cn("space-y-3 w-full", className)} role="status" aria-label="Loading threat intelligence feed">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-inset/40 border-[1.5px] border-line/60 p-3.5 space-y-3 animate-fade-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex gap-3 items-start">
            {/* Thumbnail skeleton */}
            <div className="size-20 sm:size-22 rounded-lg bg-inset border-[1.5px] border-line/40 shrink-0 overflow-hidden relative">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.06) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer-text 1.6s linear infinite",
                }}
              />
            </div>

            {/* Content skeleton */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-24 rounded bg-inset border border-line/40" />
                <div className="h-3.5 w-16 rounded bg-inset border border-line/40" />
              </div>
              <div className="h-4 w-full rounded bg-inset border border-line/40" />
              <div className="h-3.5 w-4/5 rounded bg-inset/70 border border-line/30" />
            </div>
          </div>

          <div className="pt-2 border-t border-line/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 rounded-full bg-inset border border-line/40" />
              <div className="h-5 w-24 rounded-full bg-inset border border-line/40" />
            </div>
            <div className="h-5 w-14 rounded-full bg-inset border border-line/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default TavilySyncIndicator;
