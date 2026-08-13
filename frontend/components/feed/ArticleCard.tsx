"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Building2,
  Clock,
  MapPin,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  FileWarning,
  Smartphone,
  Zap,
  Mic,
  Eye,
  AlertTriangle,
  Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill, StatusPillTone } from "@/components/atoms/StatusPill";

export interface ScamNewsArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  risk_level: string;
  source_name: string;
  source_url: string;
  financial_loss?: string;
  affected_region?: string;
  modus_operandi?: string;
  published_at: string;
  thumbnail_url?: string;
  crawled_at?: string;
}

export interface ArticleCardProps {
  article: ScamNewsArticle;
  className?: string;
  compact?: boolean;
}

// Curated high-res fallback thumbnails matching Indian cyber threat topics
const CATEGORY_THUMBNAILS: Record<string, string> = {
  DIGITAL_ARREST: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80", // Law / Police
  DEEPFAKE_IMPERSONATION: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80", // AI Neural Face
  INVESTMENT_FRAUD: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80", // Financial Market Chart
  APK_TROJAN: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80", // Cyber Mobile Malware
  ELECTRICITY_KYC: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80", // SMS / Network Server
  VOICE_CLONE: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80", // Audio Waveform / Mic
  DEFAULT: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80", // Cyber Grid
};

function getCategoryIcon(category: string) {
  switch (category?.toUpperCase()) {
    case "DIGITAL_ARREST":
      return <ShieldAlert className="size-5 text-red" />;
    case "DEEPFAKE_IMPERSONATION":
      return <Eye className="size-5 text-accent-ink" />;
    case "INVESTMENT_FRAUD":
      return <TrendingDown className="size-5 text-orange" />;
    case "APK_TROJAN":
      return <Smartphone className="size-5 text-purple" />;
    case "ELECTRICITY_KYC":
      return <Zap className="size-5 text-orange" />;
    case "VOICE_CLONE":
      return <Mic className="size-5 text-accent-ink" />;
    default:
      return <FileWarning className="size-5 text-ink-2" />;
  }
}

function resolveRiskTone(riskLevel?: string): StatusPillTone {
  switch (riskLevel?.toUpperCase()) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "accent";
    case "LOW":
      return "green";
    default:
      return "neutral";
  }
}

function formatCategoryLabel(cat?: string): string {
  if (!cat) return "Threat Intel";
  return cat
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * ArticleCard component
 * High-density institutional threat intelligence card with thumbnail,
 * modus operandi details, risk pill, and external reference trigger.
 */
export function ArticleCard({ article, className, compact = false }: ArticleCardProps) {
  const [imgError, setImgError] = useState(false);

  const initialThumbnail =
    article.thumbnail_url ||
    CATEGORY_THUMBNAILS[article.category] ||
    CATEGORY_THUMBNAILS.DEFAULT;

  const riskTone = resolveRiskTone(article.risk_level);
  const externalUrl = article.source_url || "https://cybercrime.gov.in";

  return (
    <article
      className={cn(
        "group relative rounded-xl bg-surface border-[1.5px] border-line shadow-card",
        "hover:border-line-strong hover:bg-hover transition-all duration-200",
        "p-3.5 sm:p-4 flex flex-col gap-3",
        className
      )}
    >
      {/* Top row: Thumbnail + Core Content */}
      <div className="flex gap-3.5 items-start">
        {/* Thumbnail or Fallback Icon */}
        <div className="relative size-20 sm:size-22 rounded-lg bg-inset border-[1.5px] border-line shrink-0 overflow-hidden flex items-center justify-center">
          {!imgError && initialThumbnail ? (
            <img
              src={initialThumbnail}
              alt={article.title}
              onError={() => setImgError(true)}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center">
              {getCategoryIcon(article.category)}
            </div>
          )}

          {/* Category mini-badge on thumbnail */}
          <div className="absolute top-1 left-1 max-w-[calc(100%-8px)]">
            <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-page/90 backdrop-blur-md text-ink border border-line/80 truncate">
              {formatCategoryLabel(article.category)}
            </span>
          </div>
        </div>

        {/* Headline & Description */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Source and Time Stamp */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-3">
            <span className="font-medium text-ink-2 flex items-center gap-1 truncate max-w-[65%]">
              <Building2 className="size-3 text-accent-ink shrink-0" />
              <span className="truncate">{article.source_name || "Verified Cyber Intelligence"}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 text-ink-3 tabular-nums">
              <Clock className="size-3" />
              <span>{article.published_at}</span>
            </span>
          </div>

          {/* Headline */}
          <h4 className="text-sm font-semibold text-ink group-hover:text-accent-ink transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h4>

          {/* Summary / Modus Operandi */}
          <p className="text-xs text-ink-2 line-clamp-2 leading-relaxed">
            {article.modus_operandi || article.summary}
          </p>
        </div>
      </div>

      {/* Bottom Metadata & External Link Row */}
      <div className="pt-2.5 border-t border-line/80 flex items-center justify-between gap-2 text-[11.5px]">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Risk Level Status Pill */}
          <StatusPill tone={riskTone} size="sm" pulse={article.risk_level === "CRITICAL"}>
            {article.risk_level || "EVALUATING"}
          </StatusPill>

          {/* Financial Loss Badge */}
          {article.financial_loss && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-tint text-red border border-red/25 truncate max-w-[190px]">
              Loss: {article.financial_loss}
            </span>
          )}

          {/* Affected Region (if present and room allows) */}
          {article.affected_region && !compact && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-ink-3 truncate max-w-[160px]">
              <MapPin className="size-3 text-ink-3 shrink-0" />
              <span className="truncate">{article.affected_region}</span>
            </span>
          )}
        </div>

        {/* Read Original Article Link */}
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-ink-2 hover:text-accent-ink font-medium px-2.5 py-1 rounded-md bg-inset hover:bg-hover-2 border border-line transition-colors shrink-0 text-[11.5px] group/link"
          aria-label={`Read full article: ${article.title}`}
        >
          <span>Read Intel</span>
          <ArrowUpRight className="size-3 text-accent-ink group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </article>
  );
}

export default ArticleCard;
