"use client";

import React, { KeyboardEvent, ReactNode } from "react";
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
      role="tablist"
      aria-orientation="horizontal"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-grid select-none items-center rounded-full bg-inset border-[1.5px] border-line focus-visible:ring-1 focus-visible:ring-accent",
        sizeClasses[size],
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {/* Animated sliding thumb indicator */}
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-surface shadow-card border border-white/[0.06] pointer-events-none transition-transform duration-200"
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
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={disabled}
            tabIndex={-1}
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
