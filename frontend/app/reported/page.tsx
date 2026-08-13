"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Search, Filter, Download, ThumbsUp, MapPin, 
  Phone, CreditCard, Link2, ExternalLink, FileText, CheckCircle2, 
  AlertTriangle, Eye, Sparkles, RefreshCw, X, Shield, Globe, Database 
} from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { LiveCyberScamNewsFeed } from "@/components/LiveCyberScamNewsFeed";

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
  const [activeItem, setActiveItem] = useState<ThreatItem | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "news">("catalog");

  const fetchItems = () => {
    setLoading(true);
    let url = `/api/backend/api/v1/threat-intelligence/catalog?limit=50`;
    if (selectedCategory !== "ALL") url += `&category=${selectedCategory}`;
    if (selectedType !== "ALL") url += `&type=${selectedType}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items) {
          setItems(data.items);
        }
      })
      .catch((err) => console.error("Error fetching threat catalog:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedType]);

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
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, upvotes_count: data.upvotes_count } : it))
          );
          if (activeItem && activeItem.id === id) {
            setActiveItem((prev) => (prev ? { ...prev, upvotes_count: data.upvotes_count } : null));
          }
        }
      });
  };

  const categories = [
    { id: "ALL", label: "All Categories" },
    { id: "IMPERSONATION", label: "Impersonation" },
    { id: "DIGITAL_ARREST", label: "Digital Arrest" },
    { id: "ELECTRICITY_KYC", label: "Electricity & KYC" },
    { id: "STOCK_FRAUD", label: "Stock Fraud" },
    { id: "JOB_SCAM", label: "Job Scam" },
    { id: "VOICE_CLONE", label: "Voice Clone" },
    { id: "BANKING_PHISHING", label: "Banking Phishing" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-[#030712]/90 backdrop-blur-xl">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <NetraBrandLogo size={40} />
            <a href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors">
              NETRA
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-900 border border-neutral-800 text-cyan-400">v5.1</span>
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono font-medium text-neutral-400">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/radar" className="hover:text-white transition-colors">Threat Radar</a>
            <a href="/reported" className="text-white font-bold transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Threat Catalog
            </a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/developers" className="hover:text-white transition-colors">Developer API</a>
          </nav>

          <div className="flex items-center gap-3">
            <GoogleAuthButton />
          </div>
        </div>
      </header>

      {/* Main Content (Wide Layout) */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-10 space-y-8 animate-in fade-in duration-500 font-mono">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Cyber Intelligence Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Threat Intelligence & Scam News Archive
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1 max-w-2xl font-sans">
              Autonomously verified archive of AI deepfakes, extortion calls, and 24-hour live cyber scam news crawled across India.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800 text-xs">
              <button
                onClick={() => setActiveTab("catalog")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === "catalog"
                    ? "bg-neutral-850 text-white font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" /> Incident Catalog
              </button>
              <button
                onClick={() => setActiveTab("news")}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === "news"
                    ? "bg-cyan-600 text-white font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> 24h Scam News (Tavily)
              </button>
            </div>
          </div>
        </div>

        {/* View 1: 24-Hour Tavily Scam News Feed */}
        {activeTab === "news" ? (
          <LiveCyberScamNewsFeed />
        ) : (
          /* View 2: Incident Catalog */
          <div className="space-y-8">
            
            {/* Search & Filter Controls */}
            <div className="space-y-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by keyword, public figure, attacker phone number, UPI ID, or city..."
                  className="w-full pl-11 pr-28 py-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-neutral-500 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-xs font-bold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-all"
                >
                  Search
                </button>
              </form>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                      selectedCategory === cat.id
                        ? "bg-cyan-600 text-white font-bold shadow-sm"
                        : "bg-neutral-900/80 text-neutral-400 hover:text-white border border-neutral-800/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            {loading ? (
              <div className="p-16 text-center text-neutral-500 text-sm">
                Loading threat intelligence archive...
              </div>
            ) : items.length === 0 ? (
              <div className="p-16 text-center text-neutral-500 text-sm border border-neutral-800 rounded-3xl">
                No threat incidents match your search filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => {
                  const isHighRisk = item.risk_level === "CRITICAL" || item.risk_level === "HIGH";
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-500">{item.id}</span>
                          <span className={`px-2 py-0.5 rounded font-bold border ${
                            isHighRisk
                              ? "bg-red-950/80 text-red-400 border-red-500/40"
                              : "bg-yellow-950/80 text-yellow-400 border-yellow-500/40"
                          }`}>
                            {item.risk_level}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                          {item.title}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400 pt-1">
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            <span className="truncate">{item.city}, {item.state}</span>
                          </div>
                          <div className="text-right truncate">
                            <span className="text-cyan-400 font-bold">{Math.round(item.fake_probability * 100)}%</span> Conf.
                          </div>
                        </div>

                        {/* Extracted IOCs Snippet */}
                        {item.extracted_iocs && (
                          <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-850 space-y-1 text-[10px]">
                            {item.extracted_iocs.phones && item.extracted_iocs.phones.length > 0 && (
                              <div className="flex items-center gap-1 text-red-400 truncate">
                                <Phone className="w-3 h-3" />
                                <span>{item.extracted_iocs.phones.join(", ")}</span>
                              </div>
                            )}
                            {item.extracted_iocs.upis && item.extracted_iocs.upis.length > 0 && (
                              <div className="flex items-center gap-1 text-yellow-400 truncate">
                                <CreditCard className="w-3 h-3" />
                                <span>{item.extracted_iocs.upis.join(", ")}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-[11px]">
                        <button
                          onClick={(e) => handleUpvote(item.id, e)}
                          className="flex items-center gap-1 text-neutral-400 hover:text-cyan-400 transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{item.upvotes_count} victims</span>
                        </button>

                        <a
                          href={`/api/backend/api/v1/threat-intelligence/${item.id}/fir-pdf`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold"
                        >
                          <FileText className="w-3.5 h-3.5" /> FIR PDF &darr;
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#02050c] py-10 text-xs font-mono text-neutral-400 mt-16">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NetraBrandLogo size={28} />
            <span className="font-bold text-white tracking-wider">NETRA FORENSIC AI</span>
          </div>
          <div>
            24-Hour Autonomous Tavily Cyber Scam News & Threat Catalog
          </div>
          <div className="flex gap-6">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/radar" className="hover:text-white transition-colors">Threat Radar</a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/developers" className="hover:text-white transition-colors">Developer API</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
