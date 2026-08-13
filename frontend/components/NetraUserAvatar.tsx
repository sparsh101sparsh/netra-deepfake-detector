"use client";

import React from "react";
import { 
  Eye, Shield, Atom, Cpu, Radio, 
  Dna, Sparkles, Navigation, Disc, KeyRound 
} from "lucide-react";

export interface AvatarTheme {
  id: string;
  name: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  Icon: React.ElementType;
}

export const NETRA_AVATARS: AvatarTheme[] = [
  {
    id: "sentinel-eye",
    name: "Sentinel Eye",
    bgGradient: "from-cyan-950 via-slate-900 to-cyan-900",
    borderColor: "border-cyan-400",
    textColor: "text-cyan-300",
    glowColor: "rgba(0,240,255,0.4)",
    Icon: Eye,
  },
  {
    id: "cyber-shield",
    name: "Cyber Shield",
    bgGradient: "from-emerald-950 via-slate-900 to-emerald-900",
    borderColor: "border-emerald-400",
    textColor: "text-emerald-300",
    glowColor: "rgba(52,211,153,0.4)",
    Icon: Shield,
  },
  {
    id: "quantum-core",
    name: "Quantum Core",
    bgGradient: "from-purple-950 via-slate-900 to-purple-900",
    borderColor: "border-purple-400",
    textColor: "text-purple-300",
    glowColor: "rgba(192,132,252,0.4)",
    Icon: Atom,
  },
  {
    id: "neural-node",
    name: "Neural Node",
    bgGradient: "from-blue-950 via-slate-900 to-blue-900",
    borderColor: "border-blue-400",
    textColor: "text-blue-300",
    glowColor: "rgba(96,165,250,0.4)",
    Icon: Cpu,
  },
  {
    id: "radar-beacon",
    name: "Radar Beacon",
    bgGradient: "from-amber-950 via-slate-900 to-amber-900",
    borderColor: "border-amber-400",
    textColor: "text-amber-300",
    glowColor: "rgba(251,191,36,0.4)",
    Icon: Radio,
  },
  {
    id: "bio-matrix",
    name: "Bio Matrix",
    bgGradient: "from-lime-950 via-slate-900 to-lime-900",
    borderColor: "border-lime-400",
    textColor: "text-lime-300",
    glowColor: "rgba(163,230,53,0.4)",
    Icon: Dna,
  },
  {
    id: "holo-prism",
    name: "Holo Prism",
    bgGradient: "from-rose-950 via-slate-900 to-rose-900",
    borderColor: "border-rose-400",
    textColor: "text-rose-300",
    glowColor: "rgba(251,113,133,0.4)",
    Icon: Sparkles,
  },
  {
    id: "cyber-falcon",
    name: "Cyber Falcon",
    bgGradient: "from-sky-950 via-slate-900 to-sky-900",
    borderColor: "border-sky-400",
    textColor: "text-sky-300",
    glowColor: "rgba(56,189,248,0.4)",
    Icon: Navigation,
  },
  {
    id: "vortex-pulse",
    name: "Vortex Pulse",
    bgGradient: "from-indigo-950 via-slate-900 to-indigo-900",
    borderColor: "border-indigo-400",
    textColor: "text-indigo-300",
    glowColor: "rgba(129,140,248,0.4)",
    Icon: Disc,
  },
  {
    id: "cipher-key",
    name: "Cipher Key",
    bgGradient: "from-teal-950 via-slate-900 to-teal-900",
    borderColor: "border-teal-400",
    textColor: "text-teal-300",
    glowColor: "rgba(45,212,191,0.4)",
    Icon: KeyRound,
  },
];

export function getAvatarByIndex(index: number): AvatarTheme {
  const safeIndex = Math.abs(index) % NETRA_AVATARS.length;
  return NETRA_AVATARS[safeIndex];
}

export function getAvatarByEmailOrName(seed: string): AvatarTheme {
  if (!seed) return NETRA_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return getAvatarByIndex(hash);
}

export interface NetraUserAvatarProps {
  avatarIndex?: number;
  seed?: string;
  size?: number; // pixel size e.g. 24, 32, 40
  showGlow?: boolean;
  className?: string;
}

export const NetraUserAvatar: React.FC<NetraUserAvatarProps> = ({
  avatarIndex,
  seed = "",
  size = 32,
  showGlow = true,
  className = "",
}) => {
  const avatar = typeof avatarIndex === "number" 
    ? getAvatarByIndex(avatarIndex) 
    : getAvatarByEmailOrName(seed);

  const IconComp = avatar.Icon;
  const iconSize = Math.max(12, Math.round(size * 0.52));

  return (
    <div
      className={`relative rounded-full flex items-center justify-center bg-gradient-to-br ${avatar.bgGradient} border ${avatar.borderColor} ${avatar.textColor} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: showGlow ? `0 0 10px ${avatar.glowColor}` : "none",
        flexShrink: 0,
      }}
      title={avatar.name}
    >
      <IconComp size={iconSize} strokeWidth={2.2} />
    </div>
  );
};
