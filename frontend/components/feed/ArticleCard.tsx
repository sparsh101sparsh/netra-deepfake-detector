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

function cleanArticleTitle(title: string): string {
  if (!title) return "";
  return title
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s*\|\s*.*$/i, "")
    .replace(/\s*-\s*(The\s+)?(Times\s+of\s+India|Indian\s+Express|Hindustan\s+Times|NDTV|The\s+Hindu|Economic\s+Times|LiveMint|Deccan\s+Herald|Outlook\s+India).*$/i, "")
    .trim();
}

function cleanRegion(region?: string): string {
  if (!region) return "";
  const trimmed = region.trim();
  const match = trimmed.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * ArticleCard component
 * Streamlined threat intelligence card with uncluttered typography,
 * unclipped thumbnail imagery, and clean metadata alignment.
 */
export function ArticleCard({ article, className, compact = false }: ArticleCardProps) {
  const [imgError, setImgError] = useState(false);

  // Prioritize authentic scraped news thumbnail; ignore any generic stock photos
  const rawThumbnail = (article.thumbnail_url || article.image_url || "").trim();
  const initialThumbnail = rawThumbnail.includes("unsplash.com") ? "" : rawThumbnail;

  const externalUrl = article.source_url || "#";
  const cleanedTitle = cleanArticleTitle(article.title);
  const cleanedCity = cleanRegion(article.affected_region);

  return (
    <article
      className={cn(
        "group relative py-3.5 px-4 sm:px-5 hover:bg-[#18181B]/70 transition-all duration-150",
        "flex flex-col gap-2.5",
        className
      )}
    >
      {/* Top row: Thumbnail + Content */}
      <div className="flex gap-3 items-start">
        {/* Clean Thumbnail Without Text Overlays */}
        <div className="relative size-18 sm:size-20 rounded-lg bg-[#18181B] border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
          {!imgError && initialThumbnail ? (
            <img
              src={initialThumbnail}
              alt={cleanedTitle}
              onError={() => setImgError(true)}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center text-zinc-400">
              {getCategoryIcon(article.category)}
            </div>
          )}
        </div>

        {/* Headline & Description */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Category, Source & Timestamp */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 flex-wrap">
            <span className="font-semibold text-accent uppercase tracking-wider text-[10px]">
              {formatCategoryLabel(article.category)}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium truncate max-w-[150px]">
              {article.source_name || "National Cyber Advisory"}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500 tabular-nums shrink-0">
              {formatIndianDate(article.published_at)}
            </span>
          </div>

          {/* Cleaned Headline */}
          <h4 className="text-[13.5px] sm:text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-2 leading-snug">
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-visible:outline-none hover:underline decoration-zinc-500 underline-offset-2"
            >
              {cleanedTitle}
            </a>
          </h4>

          {/* Summary */}
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {article.modus_operandi || article.summary}
          </p>
        </div>
      </div>

      {/* Bottom Row: Subtle Badges & Link */}
      <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-zinc-400">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Subtle Status Badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
              article.risk_level === "CRITICAL"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : article.risk_level === "HIGH"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                article.risk_level === "CRITICAL" ? "bg-red-400" : "bg-amber-400"
              )}
            />
            {article.risk_level || "ALERT"}
          </span>

          {/* Financial Loss */}
          {article.financial_loss && (
            <span className="text-[11px] font-medium text-zinc-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 truncate max-w-[190px]">
              Loss: {article.financial_loss}
            </span>
          )}

          {/* Affected Region */}
          {cleanedCity && !compact && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 truncate max-w-[140px]">
              <MapPin className="size-3 text-zinc-500 shrink-0" />
              <span className="truncate">{cleanedCity}</span>
            </span>
          )}
        </div>

        {/* Read Source Action */}
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-400 group-hover:text-accent transition-colors shrink-0"
          aria-label={`Read full story: ${cleanedTitle}`}
        >
          <span>Read Source</span>
          <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </article>
  );
}

export default ArticleCard;
