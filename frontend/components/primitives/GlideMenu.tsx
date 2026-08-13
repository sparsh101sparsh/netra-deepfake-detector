"use client";

import React, { useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GlideMenuProps {
  children: ReactNode;
  className?: string;
  highlightClassName?: string;
  rowSelector?: string;
  orientation?: "vertical" | "horizontal";
}

/**
 * GlideMenu — Glassmorphic navigation wrapper with sliding pill hover physics.
 * Smoothly tracks hovered/focused rows using hardware-accelerated transforms.
 */
export function GlideMenu({
  children,
  className,
  highlightClassName = "rounded-control bg-hover border-[1.5px] border-line/40",
  rowSelector = "[data-menu-row]",
  orientation = "vertical",
}: GlideMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [visible, setVisible] = useState(false);

  const moveTo = (target: EventTarget | null) => {
    const container = containerRef.current;
    if (!(target instanceof Element) || !container) return;
    const row = target.closest(rowSelector);
    if (!(row instanceof HTMLElement) || !container.contains(row)) return;

    const containerRect = container.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();

    setBox({
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
      onMouseOver={(e) => moveTo(e.target)}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={(e) => moveTo(e.target)}
      onBlurCapture={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
          setVisible(false);
        }
      }}
      className={cn("group/glide-menu relative", className)}
    >
      {/* Gliding pill highlight */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute transition-[top,left,width,height,opacity] shadow-sm",
          highlightClassName
        )}
        style={{
          top: box?.top ?? 0,
          left: orientation === "horizontal" ? box?.left ?? 0 : undefined,
          width: orientation === "horizontal" ? box?.width ?? 0 : undefined,
          right: orientation === "vertical" ? 0 : undefined,
          height: box?.height ?? 0,
          opacity: box && visible ? 1 : 0,
          transitionDuration: "220ms",
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
      {children}
    </div>
  );
}

export default GlideMenu;
