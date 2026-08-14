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
  const [hoveredOption, setHoveredOption] = useState<T | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const targetOption = hoveredOption ?? value;

  useLayoutEffect(() => {
    const updatePosition = () => {
      const targetElement = optionRefs.current[targetOption];
      const container = containerRef.current;
      if (targetElement && container) {
        const isDirect = targetElement.offsetParent === container;
        const left = isDirect
          ? targetElement.offsetLeft
          : targetElement.getBoundingClientRect().left - container.getBoundingClientRect().left;
        const top = isDirect
          ? targetElement.offsetTop
          : targetElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
        const width = isDirect
          ? targetElement.offsetWidth
          : targetElement.getBoundingClientRect().width;
        const height = isDirect
          ? targetElement.offsetHeight
          : targetElement.getBoundingClientRect().height;

        setIndicatorStyle({ left, top, width, height });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [targetOption, value, options]);

  const selectedIndex = Math.max(0, options.indexOf(value));
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
    sm: "h-7 p-0.5 text-[11.5px]",
    md: "h-8.5 p-0.5 text-[12px]",
    lg: "h-10 p-1 text-[13px]",
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="horizontal"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHoveredOption(null)}
      className={cn(
        "relative inline-grid select-none items-center rounded-full bg-[#17191A] border border-white/10 shadow-card",
        sizeClasses[size],
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {/* Gliding Blue Indicator Pill with Beautiful-UI bezier curve */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full z-0 bg-[#0084ff] shadow-sm shadow-[#0084ff]/20"
        style={{
          left: indicatorStyle?.left ?? 0,
          top: indicatorStyle?.top ?? 0,
          width: indicatorStyle?.width ?? 0,
          height: indicatorStyle?.height ?? 0,
          opacity: indicatorStyle ? 1 : 0,
          transition:
            "left 240ms cubic-bezier(0.23, 1, 0.32, 1), top 240ms cubic-bezier(0.23, 1, 0.32, 1), width 240ms cubic-bezier(0.23, 1, 0.32, 1), height 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease",
        }}
      />

      {options.map((opt) => {
        const isSelected = opt === value;
        const hasPill = opt === targetOption;

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
              "relative z-10 flex h-full items-center justify-center rounded-full px-3 font-semibold transition-colors duration-150 truncate focus-visible:outline-none cursor-pointer",
              hasPill
                ? "text-white"
                : "text-zinc-400 hover:text-white"
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
