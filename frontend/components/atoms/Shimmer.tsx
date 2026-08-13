import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerProps {
  children: ReactNode;
  className?: string;
  duration?: string;
}

/** Shimmering text label — signals active AI / forensic computation */
export function Shimmer({
  children,
  className,
  duration = "1.8s",
}: ShimmerProps) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--ink-3) 30%, var(--ink) 50%, var(--ink-3) 70%)",
        backgroundSize: "200% 100%",
        animation: `shimmer-text ${duration} linear infinite`,
      }}
    >
      {children}
    </span>
  );
}

export interface ShimmerSkeletonProps {
  lines?: number;
  className?: string;
  lineHeight?: string;
  rounded?: string;
}

/** Multi-line skeleton block loader with smooth linear shimmer sweep */
export function ShimmerSkeleton({
  lines = 3,
  className,
  lineHeight = "h-4",
  rounded = "rounded-md",
}: ShimmerSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2.5 w-full", className)} role="status" aria-label="Loading skeleton">
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1 && lines > 1;
        return (
          <div
            key={index}
            className={cn(
              "w-full overflow-hidden bg-inset border-[1.5px] border-line/50 relative",
              lineHeight,
              rounded,
              isLast && "w-3/4"
            )}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.08) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.6s linear infinite",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default Shimmer;
