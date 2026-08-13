"use client";

import React from "react";
import { CyberIcon, CyberIconType } from "./CyberIcons";

export type DfdIconName = CyberIconType;

interface DfdIconProps {
  name: DfdIconName;
  size?: number;
  className?: string;
  glow?: boolean;
}

export function DfdIcon({ name, size = 20, className = "", glow = false }: DfdIconProps) {
  return <CyberIcon name={name} size={size} className={className} glow={glow} />;
}
