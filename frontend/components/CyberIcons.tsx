"use client";

import React from "react";

export type CyberIconType =
  | "video"
  | "image"
  | "audio"
  | "document"
  | "shield"
  | "chip"
  | "radar"
  | "eye"
  | "lightning"
  | "check"
  | "fingerprint"
  | "spectrogram"
  | "glyph";

interface CyberIconProps {
  name: CyberIconType;
  size?: number;
  className?: string;
  glow?: boolean;
}

export function CyberIcon({ name, size = 20, className = "", glow = false }: CyberIconProps) {
  const glowStyle = glow
    ? { filter: "drop-shadow(0 0 8px rgba(0, 240, 255, 0.45))" }
    : {};

  const renderPath = () => {
    switch (name) {
      case "video":
        return (
          <>
            <path
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.8" />
          </>
        );

      case "image":
        return (
          <>
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="8.5" cy="8.5" r="1.75" fill="currentColor" />
            <path
              d="M21 15l-5-5L5 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case "audio":
        return (
          <>
            <path
              d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case "document":
        return (
          <>
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case "shield":
        return (
          <>
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case "chip":
        return (
          <>
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
            <path
              d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );

      case "radar":
        return (
          <>
            <path
              d="M12 22a10 10 0 100-20 10 10 0 000 20z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M12 18a6 6 0 100-12 6 6 0 000 12z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <path
              d="M12 12L19 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );

      case "eye":
        return (
          <>
            <path
              d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </>
        );

      case "lightning":
        return (
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.2"
          />
        );

      case "check":
        return (
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case "spectrogram":
        return (
          <path
            d="M3 10v4M7 6v12M11 3v18M15 8v8M19 11v2M23 7v10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );

      case "fingerprint":
        return (
          <>
            <path
              d="M12 2a10 10 0 00-7.07 17.07M12 6a6 6 0 00-4.24 10.24M12 10a2 2 0 00-1.41 3.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M12 2a10 10 0 017.07 17.07M12 6a6 6 0 014.24 10.24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );

      case "glyph":
      default:
        return (
          <>
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path
              d="M12 3v3M12 18v3M3 12h3M18 12h3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 select-none ${className}`}
      style={glowStyle}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderPath()}
    </svg>
  );
}
