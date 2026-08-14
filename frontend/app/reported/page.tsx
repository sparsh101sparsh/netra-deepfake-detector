"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Search, Filter, Download, ThumbsUp, MapPin, 
  Phone, CreditCard, Link2, ExternalLink, FileText, CheckCircle2, 
  AlertTriangle, Eye, RefreshCw, X, Shield, Globe, Database, ArrowUpRight 
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GlidingFilterTabs } from "@/components/atoms/GlidingFilterTabs";
import { cn } from "@/lib/utils";

interface ThreatItem {
  id: string;
  title: string;
  type: string;
  threat_category: string;
  source_platform: string;
  fake_probability: number;
  verdict: string;
  risk_level: string;
  city: string;
  state: string;
  location_source: string;
  device_model: string;
  software_used: string;
  extracted_iocs: {
    phones?: string[];
    upis?: string[];
    urls?: string[];
    apks?: string[];
  };
  fir_dossier?: {
    incident_summary?: string;
    applicable_laws?: string[];
    recommended_action?: string;
  };
  upvotes_count: number;
  created_at: string;
}

export default function ThreatCatalogPage() {
  const [items, setItems] = useState<ThreatItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ThreatItem | null>(null);

  const fetchItems = () => {
    setLoading(true);
    setError(null);
    let url = `/api/backend/api/v1/threat-intelligence/catalog?limit=50`;
    if (selectedCategory !== "ALL") url += `&category=${selectedCategory}`;
    if (selectedType !== "ALL") url += `&media_type=${selectedType}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Catalog server returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const fetchedItems = data?.results || data?.items || [];
        setItems(fetchedItems);
      })
      .catch((err) => {
        console.warn("Threat catalog fetch error:", err);
        setError("Threat catalog node unreachable. Please check network connection or retry.");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, [selectedCategory, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`/api/backend/api/v1/threat-intelligence/${id}/upvote`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setItems((prev) => prev.map((it) => it.id === id ? { ...it, upvotes_count: data.upvotes_count } : it));
          if (activeItem?.id === id) setActiveItem((prev) => prev ? { ...prev, upvotes_count: data.upvotes_count } : null);
        }
      });
  };

  const categories = [
    { id: "ALL", label: "All" },
    { id: "IMPERSONATION", label: "Impersonation" },
    { id: "DIGITAL_ARREST", label: "Digital Arrest" },
    { id: "ELECTRICITY_KYC", label: "Electricity & KYC" },
    { id: "STOCK_FRAUD", label: "Stock Fraud" },
    { id: "JOB_SCAM", label: "Job Scam" },
    { id: "VOICE_CLONE", label: "Voice Clone" },
    { id: "BANKING_PHISHING", label: "Phishing" },
  ];

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />

      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 flex-1 animate-in fade-in duration-300">
        <div className="space-y-6">
            {/* Clean, Unified Search & Category Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Category Pills */}
              <GlidingFilterTabs
                tabs={categories}
                activeId={selectedCategory}
                onChange={setSelectedCategory}
                pillVariant="rounded-xl"
              />

              {/* Instant Search Bar */}
              <div className="relative w-full md:w-80 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search incidents, cities, IOCs..."
                  className="w-full text-xs text-white bg-[#17191A] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="rounded-2xl bg-[#17191A] border border-white/[0.08] p-5 space-y-4 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-white/10 rounded-full" />
                      <div className="h-4 w-16 bg-white/10 rounded-full" />
                    </div>
                    <div className="h-5 w-4/5 bg-white/10 rounded" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-full bg-white/5 rounded" />
                      <div className="h-3 w-3/4 bg-white/5 rounded" />
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                      <div className="h-3 w-24 bg-white/5 rounded" />
                      <div className="h-3 w-20 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-16 text-center text-xs rounded-2xl bg-[#17191A] border border-white/[0.08] space-y-3">
                <ShieldAlert className="size-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Incident Dossiers Found</h4>
                <p className="text-zinc-400 max-w-md mx-auto">
                  {error || "No verified incident dossiers match the selected threat filters."}
                </p>
                {error && (
                  <button
                    type="button"
                    onClick={fetchItems}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    Retry Catalog Query
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => {
                  const isCritical = item.risk_level === "CRITICAL";
                  const isHigh = item.risk_level === "HIGH";
                  
                  // Check if any IOCs exist to avoid empty boxes
                  const hasPhone = Boolean(item.extracted_iocs?.phones?.length);
                  const hasUpi = Boolean(item.extracted_iocs?.upis?.length);
                  const hasUrl = Boolean(item.extracted_iocs?.urls?.length);
                  const hasAnyIoc = hasPhone || hasUpi || hasUrl;

                  return (
                    <article
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className="group rounded-2xl bg-[#17191A] border border-white/[0.08] hover:border-white/20 p-5 shadow-card hover:shadow-overlay transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer"
                    >
                      {/* Top Row: Category Tag + Severity Pill */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/5 border border-white/10 text-zinc-300">
                            {item.threat_category.replace("_", " ")}
                          </span>

                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                              isCritical
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : isHigh
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-zinc-800 text-zinc-300 border-white/10"
                            )}
                          >
                            {item.risk_level}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-white group-hover:text-zinc-200 transition-colors leading-snug line-clamp-2">
                          {item.title}
                        </h3>

                        {/* Summary / Excerpt if available */}
                        {item.fir_dossier?.incident_summary && (
                          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                            {item.fir_dossier.incident_summary}
                          </p>
                        )}

                        {/* Location & Confidence Meta */}
                        <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="size-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{item.city}, {item.state}</span>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-zinc-300">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            <span>{Math.round(item.fake_probability * 100)}% Conviction</span>
                          </div>
                        </div>

                        {/* Compact Indicator Chips (Rendered ONLY if IOCs actually exist) */}
                        {hasAnyIoc && (
                          <div className="pt-2 flex flex-wrap items-center gap-1.5">
                            {hasPhone && item.extracted_iocs.phones?.slice(0, 1).map((ph) => (
                              <span key={ph} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-rose-300">
                                <Phone className="size-2.5" />
                                <span>{ph}</span>
                              </span>
                            ))}
                            {hasUpi && item.extracted_iocs.upis?.slice(0, 1).map((upi) => (
                              <span key={upi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-amber-300">
                                <CreditCard className="size-2.5" />
                                <span>{upi}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Row: Reports count + Dossier Action */}
                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={(e) => handleUpvote(item.id, e)}
                          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors font-mono text-[11px]"
                        >
                          <ThumbsUp className="size-3" />
                          <span>{item.upvotes_count} Reports</span>
                        </button>

                        <div className="flex items-center gap-1 text-white text-[11px] font-medium group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect Dossier</span>
                          <ArrowUpRight className="size-3 text-zinc-400 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

        {/* Detail Slide-over */}
        {activeItem && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end"
            onClick={() => setActiveItem(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full sm:w-[480px] max-h-[90vh] overflow-y-auto bg-canvas border-l border-line shadow-overlay rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10.5px] font-mono text-ink-3 mb-1">{activeItem.id}</div>
                  <h3 className="text-base font-semibold text-ink leading-snug">{activeItem.title}</h3>
                </div>
                <button onClick={() => setActiveItem(null)} className="p-1.5 rounded-lg hover:bg-hover text-ink-3 hover:text-ink transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeItem.fir_dossier?.incident_summary && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Summary</div>
                  <p className="text-sm text-ink-2 leading-relaxed">{activeItem.fir_dossier.incident_summary}</p>
                </div>
              )}

              {activeItem.fir_dossier?.applicable_laws?.length ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Applicable Laws</div>
                  <div className="flex flex-wrap gap-2">
                    {activeItem.fir_dossier.applicable_laws.map((law, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-inset border border-line text-xs text-ink-2">{law}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <a
                href={`/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
              >
                <FileText className="w-4 h-4" /> Download Evidence PDF
              </a>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

