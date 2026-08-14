"use client";

import React, { KeyboardEvent, ReactNode, useState, useRef, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md" | "lg";
  renderOption?: (option: T, isSelected: boolean) => ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  renderOption,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const selectedIndex = Math.max(0, options.indexOf(value));
  const [hoveredOption, setHoveredOption] = useState<T | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hoverHighlight, setHoverHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (hoveredOption && hoveredOption !== value) {
      const targetElement = optionRefs.current[hoveredOption];
      const container = containerRef.current;
      if (targetElement && container) {
        const cRect = container.getBoundingClientRect();
        const tRect = targetElement.getBoundingClientRect();
        setHoverHighlight({
          left: tRect.left - cRect.left,
          width: tRect.width,
        });
        return;
      }
    }
    setHoverHighlight(null);
  }, [hoveredOption, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (selectedIndex + 1) % options.length;
      onChange(options[nextIndex]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (selectedIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex]);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(options[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(options[options.length - 1]);
    }
  };

  const sizeClasses = {
    sm: "h-7 p-0.5 text-[12px]",
    md: "h-8.5 p-0.5 text-[12.5px]",
    lg: "h-10 p-1 text-[13.5px]",
  };

  const thumbPadding = size === "lg" ? 4 : 2;

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="horizontal"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHoveredOption(null)}
      className={cn(
        "relative inline-grid select-none items-center rounded-full bg-inset border-[1.5px] border-line focus-visible:ring-1 focus-visible:ring-accent",
        sizeClasses[size],
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {/* Gliding Hover Pill Indicator */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full bg-white/[0.08] z-0"
        style={{
          top: thumbPadding,
          bottom: thumbPadding,
          left: hoverHighlight?.left ?? 0,
          width: hoverHighlight?.width ?? 0,
          opacity: hoverHighlight ? 1 : 0,
          transition:
            "left 220ms cubic-bezier(0.23, 1, 0.32, 1), width 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease",
        }}
      />

      {/* Animated sliding thumb indicator for active selection */}
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-surface shadow-card border border-white/[0.08] pointer-events-none transition-transform duration-240"
        style={{
          top: thumbPadding,
          bottom: thumbPadding,
          width: `calc((100% - ${thumbPadding * 2}px) / ${options.length})`,
          left: thumbPadding,
          transform: `translateX(${selectedIndex * 100}%)`,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />

      {options.map((opt) => {
        const isSelected = opt === value;
        return (
          <button
            key={opt}
            ref={(el) => {
              optionRefs.current[opt] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={disabled}
            tabIndex={-1}
            onMouseEnter={() => setHoveredOption(opt)}
            onClick={() => onChange(opt)}
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full px-3 font-medium transition-colors duration-150 truncate focus-visible:outline-none",
              isSelected
                ? "text-ink font-semibold"
                : "text-ink-3 hover:text-ink-2"
            )}
          >
            {renderOption ? renderOption(opt, isSelected) : opt}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
