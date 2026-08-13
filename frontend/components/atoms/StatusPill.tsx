import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusPillTone =
  | "active"
  | "green"
  | "warning"
  | "orange"
  | "critical"
  | "red"
  | "info"
  | "accent"
  | "purple"
  | "neutral";

export type Tone = StatusPillTone;

export type StatusPillSize = "sm" | "md" | "lg";

const toneStyles: Record<StatusPillTone, string> = {
  active: "bg-green-tint text-green border-green/25",
  green: "bg-green-tint text-green border-green/25",
  warning: "bg-orange-tint text-orange border-orange/25",
  orange: "bg-orange-tint text-orange border-orange/25",
  critical: "bg-red-tint text-red border-red/25",
  red: "bg-red-tint text-red border-red/25",
  info: "bg-accent-tint text-accent-ink border-accent/25",
  accent: "bg-accent-tint text-accent-ink border-accent/25",
  purple: "bg-purple-tint text-purple border-purple/25",
  neutral: "bg-inset text-ink-2 border-line",
};

const sizeStyles: Record<StatusPillSize, string> = {
  sm: "h-5.5 px-2 text-[11.5px]",
  md: "h-6.5 px-2.5 text-[12.5px]",
  lg: "h-7.5 px-3 text-[13.5px]",
};

const dotColor: Record<StatusPillTone, string> = {
  active: "bg-green",
  green: "bg-green",
  warning: "bg-orange",
  orange: "bg-orange",
  critical: "bg-red",
  red: "bg-red",
  info: "bg-accent",
  accent: "bg-accent",
  purple: "bg-purple",
  neutral: "bg-ink-3",
};

export function statusPillVariants({
  tone = "neutral",
  size = "md",
  className = "",
}: {
  tone?: StatusPillTone;
  size?: StatusPillSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full font-medium leading-none select-none border-[1.5px] transition-colors duration-150",
    toneStyles[tone],
    sizeStyles[size],
    className
  );
}

export interface StatusPillProps {
  children: ReactNode;
  tone?: StatusPillTone;
  size?: StatusPillSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function StatusPill({
  tone = "neutral",
  size = "md",
  children,
  dot = true,
  pulse = false,
  icon,
  className,
}: StatusPillProps) {
  const resolvedTone = tone || "neutral";
  const resolvedDotClass = dotColor[resolvedTone] || "bg-ink-3";

  return (
    <span className={statusPillVariants({ tone: resolvedTone, size, className })}>
      {icon ? (
        <span className="shrink-0 inline-flex items-center justify-center">{icon}</span>
      ) : dot ? (
        <span className="relative flex size-1.5 shrink-0 items-center justify-center">
          {pulse && (
            <span
              className={cn(
                "absolute size-full rounded-full opacity-75 animate-ping",
                resolvedDotClass
              )}
            />
          )}
          <span className={cn("relative size-1.5 rounded-full", resolvedDotClass)} />
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export default StatusPill;
