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
  image_url?: string;
  crawled_at?: string;
}

export interface ArticleCardProps {
  article: ScamNewsArticle;
  className?: string;
  compact?: boolean;
}


function getCategoryIcon(category: string) {
  switch (category?.toUpperCase()) {
    case "DIGITAL_ARREST":
      return <ShieldAlert className="size-5 text-red" />;
    case "DEEPFAKE_IMPERSONATION":
      return <Eye className="size-5 text-zinc-300" />;
    case "INVESTMENT_FRAUD":
      return <TrendingDown className="size-5 text-orange" />;
    case "APK_TROJAN":
      return <Smartphone className="size-5 text-zinc-300" />;
    case "ELECTRICITY_KYC":
      return <Zap className="size-5 text-orange" />;
    case "VOICE_CLONE":
      return <Mic className="size-5 text-zinc-300" />;
    default:
      return <FileWarning className="size-5 text-zinc-400" />;
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

function formatIndianDate(dateStr?: string): string {
  if (!dateStr) return "";
  const s = dateStr.trim();
  // If already in dd/mm/yy or dd/mm/yyyy format
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const parts = s.split("/");
    const yy = parts[2].length === 4 ? parts[2].slice(-2) : parts[2];
    return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${yy}`;
  }
  // Try matching YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y.slice(-2)}`;
  }
  // Try standard Date parsing
  try {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const d = String(dt.getDate()).padStart(2, "0");
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const yy = String(dt.getFullYear()).slice(-2);
      return `${d}/${m}/${yy}`;
    }
  } catch {
    // fallback to original string
  }
  return s;
}

/**
 * ArticleCard component
 * High-density institutional threat intelligence card with thumbnail,
 * modus operandi details, risk pill, and external reference trigger.
 */
export function ArticleCard({ article, className, compact = false }: ArticleCardProps) {
  const [imgError, setImgError] = useState(false);

  // Prioritize authentic scraped news thumbnail; ignore any generic stock photos
  const rawThumbnail = (article.thumbnail_url || article.image_url || "").trim();
  const initialThumbnail = rawThumbnail.includes("unsplash.com") ? "" : rawThumbnail;

  const riskTone = resolveRiskTone(article.risk_level);
  const externalUrl = article.source_url || "https://cybercrime.gov.in";

  return (
    <article
      className={cn(
        "group relative py-4 px-5 sm:px-6 hover:bg-[#18181B]/80 transition-all duration-150",
        "flex flex-col gap-3",
        className
      )}
    >
      {/* Top row: Thumbnail + Core Content */}
      <div className="flex gap-3.5 items-start">
        {/* Thumbnail or Fallback Icon */}
        <div className="relative size-18 sm:size-20 rounded-lg bg-[#18181B] border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
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
            <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-[#0C0C0E]/90 backdrop-blur-md text-zinc-200 border border-white/10 truncate">
              {formatCategoryLabel(article.category)}
            </span>
          </div>
        </div>

        {/* Headline & Description */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Source and Time Stamp */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
            <span className="font-medium text-zinc-300 flex items-center gap-1 truncate max-w-[65%]">
              <Building2 className="size-3 text-zinc-400 shrink-0" />
              <span className="truncate">{article.source_name || "Verified Cyber Intelligence"}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 text-zinc-500 tabular-nums">
              <Clock className="size-3" />
              <span>{formatIndianDate(article.published_at)}</span>
            </span>
          </div>

          {/* Headline */}
          <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h4>

          {/* Summary / Modus Operandi */}
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {article.modus_operandi || article.summary}
          </p>
        </div>
      </div>

      {/* Bottom Metadata & External Link Row (Aligned cleanly across the sideline) */}
      <div className="flex items-center justify-between gap-2 text-[11.5px]">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Risk Level Status Pill */}
          <StatusPill tone={riskTone} size="sm" pulse={article.risk_level === "CRITICAL"}>
            {article.risk_level || "EVALUATING"}
          </StatusPill>

          {/* Financial Loss Badge (Clean Dark Neutral Capsule) */}
          {article.financial_loss && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#18181B] text-zinc-300 border border-white/10 truncate max-w-[210px]">
              Loss: {article.financial_loss}
            </span>
          )}

          {/* Affected Region (if present and room allows) */}
          {article.affected_region && !compact && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-zinc-500 truncate max-w-[160px]">
              <MapPin className="size-3 text-zinc-500 shrink-0" />
              <span className="truncate">{article.affected_region}</span>
            </span>
          )}
        </div>

        {/* Read Original Article Link - positioned cleanly at the sideline */}
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-zinc-400 group-hover:text-white font-medium px-2 py-1 rounded-md hover:bg-[#27272A] border border-transparent hover:border-white/10 transition-all shrink-0 text-[11.5px] group/link"
          aria-label={`Read full article: ${article.title}`}
        >
          <span>Read News</span>
          <ArrowUpRight className="size-3 text-zinc-400 group-hover/link:text-white group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </article>
  );
}

export default ArticleCard;
