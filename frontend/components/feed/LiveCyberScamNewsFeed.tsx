"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  ShieldAlert,
  AlertCircle,
  Layers,
  Filter,
  RefreshCw,
  SearchX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArticleCard, ScamNewsArticle } from "./ArticleCard";
import { TavilySyncIndicator, FeedSkeleton } from "./TavilySyncIndicator";
import { Button } from "@/components/atoms/Button";
import { GlideMenu } from "@/components/atoms/GlideMenu";

export interface LiveCyberScamNewsFeedProps {
  compact?: boolean;
  className?: string;
  limit?: number;
  initialCategory?: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All Threats", shortLabel: "All" },
  { id: "DIGITAL_ARREST", label: "Digital Arrest", shortLabel: "Digital Arrest" },
  { id: "DEEPFAKE_IMPERSONATION", label: "Deepfakes", shortLabel: "Deepfakes" },
  { id: "INVESTMENT_FRAUD", label: "Investment Fraud", shortLabel: "Investment" },
  { id: "APK_TROJAN", label: "APK Malware", shortLabel: "APK Trojan" },
  { id: "ELECTRICITY_KYC", label: "Electricity KYC", shortLabel: "Electricity KYC" },
  { id: "VOICE_CLONE", label: "Voice Clones", shortLabel: "Voice Clone" },
] as const;

/**
 * LiveCyberScamNewsFeed Component
 *
 * Institutional 24-Hour Autonomous Threat Intelligence Feed.
 * Connects directly to FastAPI backend (`/api/backend/api/v1/news/feed` & `/api/backend/api/v1/news/refresh`).
 */
export function LiveCyberScamNewsFeed({
  compact = false,
  className,
  limit = 20,
  initialCategory = "ALL",
}: LiveCyberScamNewsFeedProps) {
  const [articles, setArticles] = useState<ScamNewsArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore client-side cache after mount to ensure 100% hydration fidelity
  useEffect(() => {
    try {
      const cached = localStorage.getItem("netra_news_feed_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setArticles(parsed);
          setIsLoading(false);
        }
      }
    } catch {}
  }, []);

  const fetchNews = useCallback(
    async (category: string = "ALL", isRetry = false) => {
      if (!isRetry) {
        // Keep existing articles visible while revalidating
        setError(null);
      }

      const params = new URLSearchParams({ limit: String(limit) });
      if (category !== "ALL") {
        params.append("category", category);
      }

      const endpoints = [
        `/api/backend/api/v1/news/feed?${params.toString()}`,
        `${process.env.NEXT_PUBLIC_API_URL || "https://netra-api-pmr7.onrender.com"}/api/v1/news/feed?${params.toString()}`
      ];

      let fetchedData = null;
      let lastErr = null;

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.feed) && data.feed.length > 0) {
              fetchedData = data.feed;
              break;
            }
          }
        } catch (e: any) {
          lastErr = e;
        }
      }

      if (fetchedData) {
        setArticles(fetchedData);
        setError(null);
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        try {
          localStorage.setItem("netra_news_feed_cache", JSON.stringify(fetchedData));
        } catch {}
      } else if (!isRetry) {
        // Auto-retry once after 1.5 seconds before showing error
        setTimeout(() => fetchNews(category, true), 1500);
        return;
      } else {
        // If still failing after retry, only show error if we have no cached articles
        setArticles((prev) => {
          if (prev.length === 0) {
            setError("News intelligence gateway temporarily waking up. Retrying connection...");
          }
          return prev;
        });
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [limit]
  );

  useEffect(() => {
    fetchNews(activeCategory);
  }, [activeCategory, fetchNews]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/backend/api/v1/news/refresh", { method: "POST" });
    } catch (e) {
      console.warn("Background crawl trigger notice:", e);
    }
    // Re-fetch news after triggering refresh
    setTimeout(() => {
      fetchNews(activeCategory);
    }, 1200);
  };

  return (
    <div
      className={cn(
        "bg-[var(--surface)] border-[1.5px] border-[var(--border)] shadow-card rounded-2xl flex flex-col h-full overflow-hidden",
        className
      )}
    >
      {/* 1. Header Section */}
      <div className="p-5 sm:p-6 pb-4 border-b border-line shrink-0 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 sm:size-10 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-center text-white shrink-0 shadow-card">
              <Newspaper className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-semibold text-ink text-base sm:text-lg tracking-tight truncate">
                  Live Cyber Scam Feed
                </h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm sm:text-base font-bold bg-white/10 border border-white/20 text-white shadow-sm">
                  (Powered By Tavily)
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5 line-clamp-1">
                Real-time alerts and reports aggregated from national cybercrime warnings.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Tavily Crawler Telemetry & Live Sync Row */}
        <TavilySyncIndicator
          isRefreshing={isRefreshing}
          onRefresh={handleManualRefresh}
          lastSyncedAt={lastSyncedAt}
          totalCount={articles.length}
          compact={compact}
        />
      </div>

      {/* 3. Continuous Unified News Stream (Flush with card border for scrollbar) */}
      <div
        className={cn(
          "flex-1 overflow-y-auto min-h-[380px] custom-scrollbar",
          compact ? "max-h-[500px]" : "max-h-[620px]"
        )}
      >
        {isLoading ? (
          <FeedSkeleton count={compact ? 3 : 4} />
        ) : articles.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2.5 rounded-xl bg-inset/30 border border-dashed border-line my-4">
            <div className="size-10 rounded-full bg-inset flex items-center justify-center text-ink-3">
              <SearchX className="size-5" />
            </div>
            <p className="text-sm font-medium text-ink">No verified threat advisories</p>
            <p className="text-xs text-ink-3 max-w-xs">
              {error || "No verified threat advisories recorded within the active 24-hour window."}
            </p>
            {error && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNews(activeCategory)}
                className="mt-2 text-xs"
              >
                <RefreshCw className="size-3 mr-1.5" />
                Retry Feed Connection
              </Button>
            )}
          </div>
        ) : (
          <GlideMenu
            className="flex flex-col divide-y divide-white/[0.06]"
            highlightClassName="inset-x-0 bg-white/[0.06] rounded-none"
            rowSelector="[data-menu-row]"
          >
            {articles.map((article, idx) => (
              <div
                key={article.id || idx}
                data-menu-row
                className="relative z-10"
                style={{ animation: `fade-up 300ms cubic-bezier(0.23, 1, 0.32, 1) ${Math.min(idx * 50, 300)}ms both` }}
              >
                <ArticleCard article={article} compact={compact} />
              </div>
            ))}
          </GlideMenu>
        )}
      </div>
    </div>
  );
}

export default LiveCyberScamNewsFeed;
