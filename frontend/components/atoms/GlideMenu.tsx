"use client";

import React, { useRef, useState, useLayoutEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GlideMenuProps {
  children: ReactNode;
  className?: string;
  highlightClassName?: string;
  rowSelector?: string;
  direction?: "vertical" | "horizontal";
}

/**
 * GlideMenu — Authentic Beautiful-UI Sliding Highlight Menu
 * Provides the signature smooth gliding hover indicator behind interactive items.
 * Uses cubic-bezier(0.23, 1, 0.32, 1) transition with sub-pixel bounding box tracking.
 */
export function GlideMenu({
  children,
  className = "",
  highlightClassName = "rounded-lg bg-white/[0.08]",
  rowSelector = "[data-menu-row]",
  direction = "vertical",
}: GlideMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [visible, setVisible] = useState(false);

  const update = (target: unknown) => {
    const container = containerRef.current;
    if (!(target instanceof Element) || !container) return;

    const row = target.closest(rowSelector);
    if (!(row instanceof HTMLElement) || !container.contains(row)) return;

    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();

    setHighlight({
      top: rowRect.top - containerRect.top,
      left: rowRect.left - containerRect.left,
      width: rowRect.width,
      height: rowRect.height,
    });
    setVisible(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseOver={(e) => update(e.target)}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={(e) => update(e.target)}
      onBlurCapture={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setVisible(false);
        }
      }}
      className={cn("group/glide-menu relative", className)}
    >
      {/* Sliding Highlight Indicator */}
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute z-0", highlightClassName)}
        style={{
          top: highlight?.top ?? 0,
          left: highlight?.left ?? 0,
          width: highlight?.width ?? 0,
          height: highlight?.height ?? 0,
          opacity: highlight && visible ? 1 : 0,
          transition:
            "top 220ms cubic-bezier(0.23, 1, 0.32, 1), left 220ms cubic-bezier(0.23, 1, 0.32, 1), width 220ms cubic-bezier(0.23, 1, 0.32, 1), height 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease",
        }}
      />
      {children}
    </div>
  );
}

export default GlideMenu;
