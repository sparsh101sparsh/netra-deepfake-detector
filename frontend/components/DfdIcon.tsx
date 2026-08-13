"use client";

import React from "react";

export type DfdIconName =
  | "video"
  | "image"
  | "audio"
  | "document"
  | "shield"
  | "chip"
  | "radar"
  | "face"
  | "lightning"
  | "api"
  | "eye"
  | "fingerprint"
  | "spectrogram"
  | "matrix"
  | "alert"
  | "check"
  | "glyph";

const ICON_MAP: Record<DfdIconName, string> = {
  video: "/icons/dfd/dfd-media-video.svg",
  image: "/icons/dfd/dfd-media-image.svg",
  audio: "/icons/dfd/dfd-voice-audio.svg",
  document: "/icons/dfd/dfd-document-file.svg",
  shield: "/icons/dfd/dfd-shield-protection.svg",
  chip: "/icons/dfd/dfd-neural-chip.svg",
  radar: "/icons/dfd/dfd-radar-pulse.svg",
  face: "/icons/dfd/dfd-facial-scan.svg",
  lightning: "/icons/dfd/dfd-lightning-fast.svg",
  api: "/icons/dfd/dfd-api-terminal.svg",
  eye: "/icons/dfd/dfd-eye-lens.svg",
  fingerprint: "/icons/dfd/dfd-fingerprint-auth.svg",
  spectrogram: "/icons/dfd/dfd-spectrogram-bars.svg",
  matrix: "/icons/dfd/dfd-grid-matrix.svg",
  alert: "/icons/dfd/dfd-alert-warning.svg",
  check: "/icons/dfd/dfd-check-circle.svg",
  glyph: "/icons/dfd/dfd-brand-glyph.svg",
};

interface DfdIconProps {
  name: DfdIconName;
  size?: number;
  className?: string;
  glow?: boolean;
}

export function DfdIcon({ name, size = 20, className = "", glow = false }: DfdIconProps) {
  const src = ICON_MAP[name] || ICON_MAP.shield;

  return (
    <span
      className={`inline-flex items-center justify-center select-none shrink-0 ${glow ? "drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={`${name} icon`}
        width={size}
        height={size}
        className="w-full h-full object-contain filter invert brightness-200"
      />
    </span>
  );
}
