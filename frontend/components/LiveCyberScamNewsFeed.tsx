"use client";

import React, { useState, useEffect } from "react";
import { 
  Radio, Globe, ExternalLink, RefreshCw, AlertTriangle, 
  ShieldAlert, Sparkles, Building2, MapPin, DollarSign, BookOpen, Layers 
} from "lucide-react";

interface ScamNewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  risk_level: string;
  source_name: string;
  source_url: string;
  financial_loss: string;
  affected_region: string;
  modus_operandi: string;
  published_at: string;
  crawled_at: string;
}

export function LiveCyberScamNewsFeed() {
  const [news, setNews] = useState<ScamNewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchNews = (category: string = "ALL") => {
    setIsLoading(true);
    const url = category === "ALL" 
      ? "/api/backend/api/v1/news/feed?limit=20" 
      : `/api/backend/api/v1/news/feed?limit=20&category=${category}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.feed) {
          setNews(data.feed);
        }
      })
      .catch((err) => console.error("News feed fetch error:", err))
      .finally(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchNews(activeCategory);
  }, [activeCategory]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetch("/api/backend/api/v1/news/refresh", { method: "POST" })
      .then(() => {
        setTimeout(() => fetchNews(activeCategory), 1500);
      })
      .catch(() => setIsRefreshing(false));
  };

  const categories = [
    "ALL",
    "DIGITAL_ARREST",
    "DEEPFAKE_IMPERSONATION",
    "INVESTMENT_FRAUD",
    "APK_TROJAN",
    "ELECTRICITY_KYC",
    "VOICE_CLONE"
  ];

  return (
    <div className="w-full space-y-6 font-mono">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight text-base sm:text-lg">
                24-Hour Autonomous Cyber Scam & Deepfake Intelligence Feed
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                TAVILY CRAWLER ACTIVE
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Continuously aggregated pan-India cyber crime incidents, MHA I4C warnings, and law enforcement actions
            </p>
          </div>
        </div>

        {/* Live Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="self-start md:self-auto px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white flex items-center gap-2 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Crawling Tavily..." : "Force Sync"}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeCategory === cat
                ? "bg-cyan-600 border-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
            }`}
          >
            {cat.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* News Intelligence Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-500 text-xs">
          Loading 24-hour cyber scam intelligence feed...
        </div>
      ) : news.length === 0 ? (
        <div className="p-12 text-center text-neutral-500 text-xs border border-neutral-800 rounded-2xl">
          No news reports matching this category in the last 24 hours.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => {
            const isCritical = item.risk_level === "CRITICAL";
            
            return (
              <div
                key={item.id}
                className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group shadow-lg"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded font-bold bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {item.category.replace(/_/g, " ")}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold border ${
                      isCritical 
                        ? "bg-red-950/80 text-red-400 border-red-500/40" 
                        : "bg-yellow-950/80 text-yellow-400 border-yellow-500/40"
                    }`}>
                      {item.risk_level} SEVERITY
                    </span>
                  </div>

                  {/* Headline */}
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                    {item.title}
                  </h4>

                  {/* Summary */}
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Modus Operandi Callout */}
                  <div className="bg-neutral-900/60 p-3 rounded-2xl border border-neutral-850 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[10px] uppercase tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5" /> Modus Operandi
                    </div>
                    <p className="text-neutral-300 font-sans text-[11px] leading-relaxed">
                      {item.modus_operandi}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400 pt-1">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-neutral-500" />
                      <span className="truncate">{item.affected_region}</span>
                    </div>
                    <div className="flex items-center gap-1 truncate text-red-400 font-semibold">
                      <DollarSign className="w-3 h-3" />
                      <span className="truncate">{item.financial_loss}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 text-[10px]">{item.source_name} • {item.published_at}</span>
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                  >
                    Source Report <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
