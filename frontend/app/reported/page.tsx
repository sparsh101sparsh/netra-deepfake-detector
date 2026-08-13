"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Search, Filter, Download, ThumbsUp, MapPin, 
  Phone, CreditCard, Link2, ExternalLink, FileText, CheckCircle2, 
  AlertTriangle, Eye, RefreshCw, X, Shield, Globe, Database, ArrowUpRight 
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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

const DEMO_ITEMS: ThreatItem[] = [
  {
    id: "NETRA-CAT-001",
    title: "AI Face-Swap: Celebrity Extortion Campaign",
    type: "video_deepfake",
    threat_category: "IMPERSONATION",
    source_platform: "Instagram / WhatsApp",
    fake_probability: 0.986,
    verdict: "DEEPFAKE",
    risk_level: "CRITICAL",
    city: "New Delhi",
    state: "Delhi",
    location_source: "Reported Submission",
    device_model: "iPhone 15 Pro",
    software_used: "InSwapper + FaceFusion",
    extracted_iocs: {
      phones: ["+91 98101 23456"],
      urls: ["https://secure-kyc-update.in"],
      upis: ["pay-police@okaxis"]
    },
    fir_dossier: {
      incident_summary: "High-conviction face-swap video impersonating high-profile identity to demand urgent wire transfers.",
      applicable_laws: ["IT Act Sec 66D", "BNS Sec 318"],
      recommended_action: "Report to 1930 and freeze beneficiary UPI VPA."
    },
    upvotes_count: 142,
    created_at: "18 mins ago"
  },
  {
    id: "NETRA-CAT-002",
    title: "Digital Arrest Police Video Extortion Call",
    type: "video_deepfake",
    threat_category: "DIGITAL_ARREST",
    source_platform: "Skype / Telegram",
    fake_probability: 0.992,
    verdict: "DEEPFAKE",
    risk_level: "CRITICAL",
    city: "Mumbai",
    state: "Maharashtra",
    location_source: "Reported Submission",
    device_model: "Samsung S24 Ultra",
    software_used: "LivePortrait + Skype Overlay",
    extracted_iocs: {
      phones: ["+91 99200 88776"],
      urls: ["https://cbi-investigation-notice.org"],
      upis: ["cbi-escrow@sbi"]
    },
    fir_dossier: {
      incident_summary: "Victim subjected to 4-hour coercive Skype interrogation by actors in fake police uniform claiming customs drug parcel seizure.",
      applicable_laws: ["IT Act Sec 66C/D", "BNS Sec 308 Extortion"],
      recommended_action: "Block caller and file report on cybercrime.gov.in."
    },
    upvotes_count: 310,
    created_at: "45 mins ago"
  },
  {
    id: "NETRA-CAT-003",
    title: "Guaranteed Stock Trading App Deepfake",
    type: "video_deepfake",
    threat_category: "STOCK_FRAUD",
    source_platform: "Facebook / YouTube",
    fake_probability: 0.974,
    verdict: "DEEPFAKE",
    risk_level: "HIGH",
    city: "Bengaluru",
    state: "Karnataka",
    location_source: "Reported Submission",
    device_model: "MacBook Pro",
    software_used: "SadTalker + HeyGen",
    extracted_iocs: {
      urls: ["https://quant-wealth-india.cc"],
      apks: ["WealthQuant_v2.apk"]
    },
    fir_dossier: {
      incident_summary: "Deepfake video of business leaders promising 400% weekly return through unauthorized trading app APK.",
      applicable_laws: ["SEBI Act", "IT Act Sec 66D"],
      recommended_action: "Report domain to registrar and RBI Sachet."
    },
    upvotes_count: 89,
    created_at: "1 hour ago"
  },
  {
    id: "NETRA-CAT-004",
    title: "Electricity Bill Disconnection Threat SMS",
    type: "scam_text",
    threat_category: "ELECTRICITY_KYC",
    source_platform: "SMS Gateway",
    fake_probability: 0.985,
    verdict: "SCAM",
    risk_level: "CRITICAL",
    city: "Hyderabad",
    state: "Telangana",
    location_source: "Reported Submission",
    device_model: "Modem Pool",
    software_used: "SMS Phishing Gateway",
    extracted_iocs: {
      phones: ["+91 88765 43210"],
      urls: ["https://power-bill-update.in"]
    },
    fir_dossier: {
      incident_summary: "Automated SMS threatening electricity disconnection at 9:30 PM tonight unless bill is verified via link.",
      applicable_laws: ["IT Act Sec 66D"],
      recommended_action: "Report number to DoT Chakshu."
    },
    upvotes_count: 204,
    created_at: "2 hours ago"
  },
  {
    id: "NETRA-CAT-005",
    title: "Hospital Emergency Voice Clone Extortion",
    type: "audio_clone",
    threat_category: "VOICE_CLONE",
    source_platform: "WhatsApp Voice Note",
    fake_probability: 0.958,
    verdict: "AUDIO_CLONE",
    risk_level: "HIGH",
    city: "Pune",
    state: "Maharashtra",
    location_source: "Reported Submission",
    device_model: "VoIP Cloud",
    software_used: "ElevenLabs Voice Clone",
    extracted_iocs: {
      phones: ["+91 91234 56789"],
      upis: ["emergency-hospital@icici"]
    },
    fir_dossier: {
      incident_summary: "Synthesized distress audio replicating victim's child crying for emergency bail/hospital deposit.",
      applicable_laws: ["BNS Sec 318", "IT Act Sec 66D"],
      recommended_action: "Call family member directly on primary phone."
    },
    upvotes_count: 77,
    created_at: "3 hours ago"
  },
  {
    id: "NETRA-CAT-006",
    title: "Part-Time Review Scam & Telegram Bot Network",
    type: "scam_text",
    threat_category: "JOB_SCAM",
    source_platform: "Telegram / WhatsApp",
    fake_probability: 0.934,
    verdict: "SCAM",
    risk_level: "MEDIUM",
    city: "Chennai",
    state: "Tamil Nadu",
    location_source: "Reported Submission",
    device_model: "Cloud Server",
    software_used: "Telegram Network",
    extracted_iocs: {
      phones: ["+91 70000 11223"],
      urls: ["https://hotel-ratings-pay.net"]
    },
    fir_dossier: {
      incident_summary: "Offer to pay Rs. 150 per Google Maps rating, leading to prepaid task investment trap.",
      applicable_laws: ["IT Act Sec 66D"],
      recommended_action: "Do not send funds; report to 1930."
    },
    upvotes_count: 62,
    created_at: "5 hours ago"
  }
];

export default function ThreatCatalogPage() {
  const [items, setItems] = useState<ThreatItem[]>(DEMO_ITEMS);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<ThreatItem | null>(null);

  const fetchItems = () => {
    setLoading(true);
    let url = `/api/backend/api/v1/threat-intelligence/catalog?limit=50`;
    if (selectedCategory !== "ALL") url += `&category=${selectedCategory}`;
    if (selectedType !== "ALL") url += `&type=${selectedType}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          setItems(data.items);
        } else {
          // Filter demo items locally by category/search
          let filtered = DEMO_ITEMS;
          if (selectedCategory !== "ALL") {
            filtered = filtered.filter((i) => i.threat_category === selectedCategory);
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter((i) => 
              i.title.toLowerCase().includes(q) || 
              i.city.toLowerCase().includes(q) ||
              i.state.toLowerCase().includes(q)
            );
          }
          setItems(filtered);
        }
      })
      .catch(() => {
        let filtered = DEMO_ITEMS;
        if (selectedCategory !== "ALL") {
          filtered = filtered.filter((i) => i.threat_category === selectedCategory);
        }
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter((i) => 
            i.title.toLowerCase().includes(q) || 
            i.city.toLowerCase().includes(q) ||
            i.state.toLowerCase().includes(q)
          );
        }
        setItems(filtered);
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 border",
                      selectedCategory === cat.id
                        ? "bg-white text-[#0C0C0E] border-white font-semibold shadow-sm"
                        : "bg-[#141416] text-zinc-400 hover:text-white border-white/[0.08]"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full md:w-80 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search incidents, cities, IOCs..."
                  className="w-full text-xs text-white bg-[#141416] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
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
              <div className="p-16 text-center text-zinc-500 font-mono text-xs">Loading incident records…</div>
            ) : items.length === 0 ? (
              <div className="p-16 text-center text-zinc-400 text-xs rounded-2xl bg-[#141416] border border-white/[0.08]">
                No incidents match your current filter.
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
                      className="group rounded-2xl bg-[#141416] border border-white/[0.08] hover:border-white/20 p-5 shadow-card hover:shadow-overlay transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer"
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

