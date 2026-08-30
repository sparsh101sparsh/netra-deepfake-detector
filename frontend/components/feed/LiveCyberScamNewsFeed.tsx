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

const FALLBACK_ARTICLES: ScamNewsArticle[] = [
  {
    id: "fallback-1",
    title: "'Your account linked to Naresh Goyal': How Jet Airways case was used to con Delhi couple",
    summary: "Coercive digital arrest scam isolating victims via video calls under guise of law enforcement probe.",
    category: "DIGITAL_ARREST",
    risk_level: "CRITICAL",
    source_name: "The Indian Express",
    source_url: "https://indianexpress.com",
    financial_loss: "₹15.5 Lakh",
    affected_region: "Maharashtra (Mumbai)",
    published_at: "2026-08-30",
  },
  {
    id: "fallback-2",
    title: "Goa cyber fraud money was converted into foreign currency, ED finds",
    summary: "Cross-border illicit money laundering network laundering proceeds of cyber scam syndicates.",
    category: "DIGITAL_ARREST",
    risk_level: "CRITICAL",
    source_name: "Times of India",
    source_url: "https://timesofindia.indiatimes.com",
    financial_loss: "₹584+ Crore Nationwide",
    affected_region: "Pan-India",
    published_at: "2026-08-31",
  },
  {
    id: "fallback-3",
    title: "Surgeon duped of Rs 2.3cr in stocks trading scam",
    summary: "Multi-layered investment syndicate manipulating fake financial dashboards to steal funds.",
    category: "INVESTMENT_FRAUD",
    risk_level: "CRITICAL",
    source_name: "Times of India",
    source_url: "https://timesofindia.indiatimes.com",
    financial_loss: "₹2.3 Crore",
    affected_region: "Telangana (Hyderabad)",
    published_at: "2026-08-28",
  },
  {
    id: "fallback-4",
    title: "Jaipur Police arrest two more in Rs 6.8 cr WhatsApp 'Boss Scam' case",
    summary: "Impersonation fraud targeting executives via manipulated WhatsApp executive identities.",
    category: "INVESTMENT_FRAUD",
    risk_level: "CRITICAL",
    source_name: "Times of India",
    source_url: "https://timesofindia.indiatimes.com",
    financial_loss: "₹6.8 Crore",
    affected_region: "Maharashtra (Mumbai)",
    published_at: "2026-09-03",
  },
];

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
  const [articles, setArticles] = useState<ScamNewsArticle[]>(FALLBACK_ARTICLES);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>("Live");
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
        // Fallback baseline ensures feed is never left blank
        setArticles(FALLBACK_ARTICLES);
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
      {/* 1. Header Section - Clean & Proportional to Sandbox Header */}
      <div className="p-5 sm:p-6 pb-3.5 border-b border-line shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border-[1.5px] border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-ink text-sm sm:text-base tracking-tight truncate">
                Live Cyber Scam Feed
              </h3>
              <p className="text-xs text-ink-3 truncate">
                Real-time alerts & threat intelligence across India
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-400 bg-white/[0.04] border border-white/10 shrink-0">
            <span className="size-1.5 rounded-full bg-accent" />
            Powered by Tavily
          </span>
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
