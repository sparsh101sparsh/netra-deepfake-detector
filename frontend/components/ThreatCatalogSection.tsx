"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Search, Filter, Download, ThumbsUp, MapPin, 
  Phone, CreditCard, Link2, ExternalLink, FileText, CheckCircle2, 
  AlertTriangle, Eye, Sparkles, RefreshCw, X, Shield, Globe, Database 
} from "lucide-react";
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

export function ThreatCatalogSection() {
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
  ];

  return (
    <div className="space-y-8 font-mono">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Threat Intelligence & IOC Ledger
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight">
            Threat Catalog & Live Scam Feeds
          </h2>
          <p className="text-neutral-400 text-xs font-sans mt-1">
            Live database of deepfakes, phishing IOCs, UPIs, and fraudulent scam patterns reported across India.
          </p>
        </div>

        {/* Tab Switcher: Threat Catalog vs Live News */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "catalog"
                ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Verified Catalog ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "news"
                ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Live 24h Scam Radar (Tavily AI)
          </button>
        </div>
      </div>

      {activeTab === "news" ? (
        <LiveCyberScamNewsFeed />
      ) : (
        <>
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by keyword, phone number, UPI ID, or politician name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    selectedCategory === cat.id
                      ? "bg-cyan-950/90 border border-cyan-400/80 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      : "bg-neutral-950/80 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Threat Catalog Items */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs">Loading verified threat telemetry...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-neutral-500 text-xs">
              No matching threat incidents found in the active registry.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((item) => {
                const isCrit = item.risk_level === "CRITICAL" || item.fake_probability > 0.85;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItem(item)}
                    className="p-5 rounded-3xl bg-neutral-950/80 border border-neutral-800 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer space-y-4 relative group shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                          {item.id} • {item.threat_category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCrit
                              ? "bg-red-950/80 text-red-400 border border-red-500/40"
                              : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                          }`}
                        >
                          {Math.round(item.fake_probability * 100)}% {item.risk_level}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-4 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          {item.city}, {item.state}
                        </span>
                        <span>{item.created_at?.slice(0, 16)}</span>
                      </div>

                      {/* IOCs snippet */}
                      {(item.extracted_iocs?.phones?.length || item.extracted_iocs?.upis?.length) ? (
                        <div className="pt-2 border-t border-neutral-900 flex flex-wrap gap-1.5 text-[10px]">
                          {item.extracted_iocs.phones?.slice(0, 2).map((ph) => (
                            <span key={ph} className="px-2 py-0.5 bg-neutral-900 text-red-300 rounded-md border border-neutral-800 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" /> {ph}
                            </span>
                          ))}
                          {item.extracted_iocs.upis?.slice(0, 2).map((upi) => (
                            <span key={upi} className="px-2 py-0.5 bg-neutral-900 text-amber-300 rounded-md border border-neutral-800 flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5" /> {upi}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
                      <button
                        onClick={(e) => handleUpvote(item.id, e)}
                        className="flex items-center gap-1.5 text-neutral-400 hover:text-cyan-300 transition-colors px-2.5 py-1 rounded-lg bg-neutral-900/60 border border-neutral-800"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{item.upvotes_count}</span>
                      </button>

                      <span className="text-cyan-400 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Inspect Dossier &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Incident Dossier Modal */}
          {activeItem && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <span className="text-xs uppercase text-cyan-400 font-bold">{activeItem.id} • {activeItem.threat_category}</span>
                    <h3 className="text-xl font-bold text-white mt-1">{activeItem.title}</h3>
                  </div>
                  <button onClick={() => setActiveItem(null)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400 text-[10px]">Confidence & Risk</span>
                    <div className="font-bold text-red-400 mt-1">{Math.round(activeItem.fake_probability * 100)}% ({activeItem.risk_level})</div>
                  </div>
                  <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400 text-[10px]">Location Origin</span>
                    <div className="font-bold text-white mt-1">{activeItem.city}, {activeItem.state}</div>
                  </div>
                  <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400 text-[10px]">Software Signature</span>
                    <div className="font-bold text-cyan-300 mt-1">{activeItem.software_used || "Unknown AI Model"}</div>
                  </div>
                </div>

                {/* Extracted IOCs */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-bold text-neutral-300">Extracted Threat IOCs</h4>
                  <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2 text-xs">
                    {activeItem.extracted_iocs?.phones?.length ? (
                      <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-red-400" /> Phone Numbers: <strong>{activeItem.extracted_iocs.phones.join(", ")}</strong></div>
                    ) : null}
                    {activeItem.extracted_iocs?.upis?.length ? (
                      <div className="flex items-center gap-2"><CreditCard className="w-3.5 h-3.5 text-amber-400" /> UPI Handles: <strong>{activeItem.extracted_iocs.upis.join(", ")}</strong></div>
                    ) : null}
                    {activeItem.extracted_iocs?.urls?.length ? (
                      <div className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-cyan-400" /> Scam Domains: <strong>{activeItem.extracted_iocs.urls.join(", ")}</strong></div>
                    ) : null}
                  </div>
                </div>

                {/* FIR Export Dossier */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase font-bold text-neutral-300">National Cyber Crime Reporting Dossier</h4>
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3 text-xs font-sans">
                    <p className="text-neutral-300 leading-relaxed">{activeItem.fir_dossier?.incident_summary || "Formal evidentiary package prepared for filing under IT Act 66D & 66E."}</p>
                    <a
                      href={`/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download Official FIR Police Package (.pdf)
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
