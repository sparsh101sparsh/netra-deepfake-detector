"use client";

import React, { useEffect, useState } from "react";
import { Shimmer } from "@/components/atoms/Shimmer";
import { cn } from "@/lib/utils";

const chevronDelays = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbitDelays = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

export type LoadingVariant = "Drive" | "Dots" | "Orbit" | "Radar";

export interface LoadingStateProps {
  label?: string;
  variant?: LoadingVariant;
  elapsedSeconds?: number;
  autoElapsed?: boolean;
  className?: string;
}

export function LoadingState({
  label = "Forensic Neural Analysis in progress",
  variant = "Drive",
  elapsedSeconds,
  autoElapsed = true,
  className,
}: LoadingStateProps) {
  const [internalTicks, setInternalTicks] = useState(0);

  useEffect(() => {
    if (!autoElapsed) return;
    const interval = setInterval(() => {
      setInternalTicks((prev) => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [autoElapsed]);

  const displayedSeconds =
    elapsedSeconds !== undefined
      ? elapsedSeconds
      : (internalTicks / 10);

  const formattedTime =
    displayedSeconds < 60
      ? `${displayedSeconds.toFixed(1)}s`
      : `${Math.floor(displayedSeconds / 60)}m ${(displayedSeconds % 60).toFixed(1)}s`;

  const isDots = variant === "Dots";
  const isOrbit = variant === "Orbit";
  const delays = isOrbit ? orbitDelays : chevronDelays;
  const cycleDur = isOrbit ? 950 : 650;

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex items-center gap-3 select-none", className)}
    >
      {/* 3x3 Pixel Grid Wavefront Loader */}
      <span
        aria-hidden="true"
        className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[2px]"
      >
        {delays.map((delay, index) => (
          <span
            key={index}
            className={cn(
              "size-[4px] bg-accent",
              isDots ? "rounded-full" : "rounded-[1px]"
            )}
            style={{
              opacity: delay === null ? 0.08 : 0.15,
              animation:
                delay === null
                  ? "none"
                  : `pixel-on ${cycleDur}ms ease-in-out ${delay}ms infinite`,
            }}
          />
        ))}
      </span>

      {/* Shimmering Forensic Status Label */}
      <Shimmer className="text-[13px] font-medium whitespace-nowrap">
        {label}
      </Shimmer>

      {/* Elapsed Counter in Monospace Tabular Figures */}
      <span className="font-mono text-[11.5px] text-ink-3 tabular-nums">
        {formattedTime}
      </span>
    </div>
  );
}

export default LoadingState;
