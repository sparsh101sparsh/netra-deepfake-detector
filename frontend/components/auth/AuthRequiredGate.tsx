"use client";

import React from "react";
import Link from "next/link";
import { Lock, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { cn } from "@/lib/utils";

interface AuthRequiredGateProps {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: React.ElementType;
  onSignInClick: () => void;
  className?: string;
}

/**
 * AuthRequiredGate — Institutional Forensic Access Barrier.
 * Displayed when an unauthenticated user visits protected pages like Community or Developers.
 */
export const AuthRequiredGate: React.FC<AuthRequiredGateProps> = ({
  title,
  subtitle,
  badge = "RESTRICTED ACCESS",
  icon: Icon = Lock,
  onSignInClick,
  className = "",
}) => {
  return (
    <div className={cn("w-full max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center select-none", className)}>
      {/* Outer Glow Card */}
      <div className="relative rounded-3xl bg-[var(--surface)] border-[1.5px] border-[var(--line)] p-8 sm:p-12 shadow-card overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Shield & Lock Emblem */}
        <div className="relative mx-auto size-20 sm:size-24 rounded-2xl bg-amber-500/10 border-[1.5px] border-amber-500/30 flex items-center justify-center mb-6 shadow-inner-highlight">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent" />
          <Icon className="size-10 sm:size-12 text-amber-400 relative z-10 animate-pulse" />
          <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-amber-400 border-2 border-[var(--surface)]" />
        </div>

        {/* Access Badge */}
        <div className="flex justify-center mb-4">
          <StatusPill tone="warning" size="sm">
            {badge}
          </StatusPill>
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] mb-3">
          {title}
        </h2>

        {/* Subtitle / Explanatory Description */}
        <p className="text-sm sm:text-base text-[var(--ink-2)] max-w-lg mx-auto leading-relaxed mb-8">
          {subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
          <Button
            variant="primary"
            size="lg"
            onClick={onSignInClick}
            className="w-full sm:w-auto flex-1 shadow-glow-accent"
          >
            <Lock className="size-4 mr-2" />
            Sign In with Google
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="size-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>

        {/* Technical Trust Footnote */}
        <div className="mt-8 pt-6 border-t border-[var(--line)] flex items-center justify-center gap-2 text-xs text-[var(--ink-3)] font-mono">
          <Shield className="size-3.5 text-amber-500/70" />
          <span>Section 65B Certified Forensic Infrastructure // End-to-End Encryption</span>
        </div>
      </div>
    </div>
  );
};
