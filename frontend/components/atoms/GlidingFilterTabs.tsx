"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

export interface FilterTabItem {
  id: string;
  label: string;
  count?: number;
}

export interface GlidingFilterTabsProps {
  tabs: readonly FilterTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  pillVariant?: "pill" | "rounded-xl";
}

/**
 * GlidingFilterTabs — Beautiful UI Horizontal Filter Tabs
 * Features an intelligent dual-state gliding pill:
 * - Hover state glides smoothly behind the target item with cubic-bezier(0.23, 1, 0.32, 1)
 * - Active selected state provides prominent high-contrast pill styling
 * - Seamlessly glides across items on mouse hover and resets on mouse leave
 */
export function GlidingFilterTabs({
  tabs,
  activeId,
  onChange,
  className = "",
  pillVariant = "rounded-xl",
}: GlidingFilterTabsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    top: number;
    height: number;
  } | null>(null);

  // Position indicator over hovered tab (or active tab if not hovering)
  useLayoutEffect(() => {
    const targetId = hoveredId ?? activeId;
    const targetEl = itemRefs.current[targetId];
    const container = containerRef.current;

    if (targetEl && container) {
      const cRect = container.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();

      setIndicatorStyle({
        left: tRect.left - cRect.left,
        top: tRect.top - cRect.top,
        width: tRect.width,
        height: tRect.height,
      });
    }
  }, [hoveredId, activeId, tabs]);

  const isHoveringOther = hoveredId !== null && hoveredId !== activeId;

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setHoveredId(null)}
      className={cn(
        "relative flex items-center gap-1.5 p-1 rounded-2xl bg-[#17191A] border border-white/[0.08] shadow-card overflow-x-auto custom-scrollbar select-none",
        className
      )}
    >
      {/* Gliding Pill Indicator */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-0",
          pillVariant === "pill" ? "rounded-full" : "rounded-xl",
          isHoveringOther
            ? "bg-white/[0.12] border border-white/10"
            : "bg-white text-black shadow-sm"
        )}
        style={{
          left: indicatorStyle?.left ?? 0,
          top: indicatorStyle?.top ?? 0,
          width: indicatorStyle?.width ?? 0,
          height: indicatorStyle?.height ?? 0,
          opacity: indicatorStyle ? 1 : 0,
          transition:
            "left 240ms cubic-bezier(0.23, 1, 0.32, 1), top 240ms cubic-bezier(0.23, 1, 0.32, 1), width 240ms cubic-bezier(0.23, 1, 0.32, 1), height 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease, background-color 160ms ease",
        }}
      />

      {/* Tabs */}
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const isHovered = hoveredId === tab.id;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              itemRefs.current[tab.id] = el;
            }}
            type="button"
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => setHoveredId(tab.id)}
            className={cn(
              "relative z-10 px-3.5 py-1.5 text-xs font-mono font-medium transition-colors duration-150 shrink-0 focus-visible:outline-none",
              pillVariant === "pill" ? "rounded-full" : "rounded-xl",
              isActive && !isHoveringOther
                ? "text-[#0C0C0E] font-bold"
                : isActive && isHoveringOther
                ? "text-white font-semibold"
                : isHovered
                ? "text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-current">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default GlidingFilterTabs;
