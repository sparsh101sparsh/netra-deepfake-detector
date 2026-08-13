import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "neutral" | "accent" | "orange" | "red" | "green" | "purple" | "cyan";

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  icon?: ReactNode;
  dot?: boolean;
  onRemove?: () => void;
  mono?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const toneStyles: Record<ChipTone, string> = {
  neutral: "bg-[#18181B] text-zinc-300 border-white/10 hover:border-white/20",
  accent: "bg-[#27272A] text-white border-white/10 hover:border-white/20",
  cyan: "bg-[#27272A] text-white border-white/10 hover:border-white/20",
  orange: "bg-orange-tint text-orange border-orange/25 hover:border-orange/40",
  red: "bg-red-tint text-red border-red/25 hover:border-red/40",
  green: "bg-green-tint text-green border-green/25 hover:border-green/40",
  purple: "bg-[#27272A] text-zinc-200 border-white/10 hover:border-white/20",
};

const dotColors: Record<ChipTone, string> = {
  neutral: "bg-zinc-500",
  accent: "bg-white",
  cyan: "bg-white",
  orange: "bg-orange",
  red: "bg-red",
  green: "bg-green",
  purple: "bg-zinc-300",
};

export function Chip({
  children,
  tone = "neutral",
  icon,
  dot = false,
  onRemove,
  mono = true,
  size = "md",
  className,
}: ChipProps) {
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[11px] gap-1" : "px-2 py-1 text-[12px] gap-1.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border-[1.5px] font-medium leading-none select-none transition-colors duration-150",
        mono && "font-mono",
        toneStyles[tone],
        sizeClass,
        className
      )}
    >
      {icon ? (
        <span className="shrink-0 inline-flex items-center justify-center">{icon}</span>
      ) : dot ? (
        <span className={cn("size-1.5 rounded-full shrink-0", dotColors[tone])} />
      ) : null}

      <span className="truncate">{children}</span>

      {onRemove && (
        <button
          type="button"
          aria-label="Remove chip"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 flex size-3.5 items-center justify-center rounded hover:bg-black/20 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

export default Chip;
