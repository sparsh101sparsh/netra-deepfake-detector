"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Search, Download, ThumbsUp, MapPin, 
  Phone, CreditCard, FileText, X, Video, Mic, Image as ImageIcon,
  MessageSquare, Play, Volume2, ArrowUpRight
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GlidingFilterTabs } from "@/components/atoms/GlidingFilterTabs";
import { ResilientVideoPlayer } from "@/components/player/ResilientVideoPlayer";
import { generateForensicPDF } from "@/lib/pdfReportGenerator";
import { cn } from "@/lib/utils";

interface ThreatItem {
  id: string;
  title: string;
  type: string; // video_deepfake, image_deepfake, audio_clone, scam_text
  threat_category: string;
  source_platform: string;
  fake_probability: number;
  verdict: string;
  risk_level: string;
  media_url?: string;
  thumbnail_url?: string;
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
  const [selectedType, setSelectedType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ThreatItem | null>(null);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);

  const fetchItems = () => {
    setLoading(true);
    setError(null);
    let url = `/api/backend/api/v1/threat-intelligence/catalog?limit=50`;
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

  useEffect(() => { fetchItems(); }, [selectedType]);

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

  // Media Type Filter Tabs (Direct User Directive)
  const mediaTypeTabs = [
    { id: "ALL", label: "All" },
    { id: "video_deepfake", label: "Video" },
    { id: "image_deepfake", label: "Image" },
    { id: "audio_clone", label: "Audio" },
    { id: "scam_text", label: "Text" },
  ];

  const getMediaBadge = (type: string) => {
    switch (type) {
      case "video_deepfake":
        return { label: "Video Deepfake", icon: Video, color: "text-red-400 bg-red-500/10 border-red-500/20" };
      case "image_deepfake":
        return { label: "Image Deepfake", icon: ImageIcon, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "audio_clone":
        return { label: "Audio Clone", icon: Mic, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
      default:
        return { label: "Scam Text", icon: MessageSquare, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />

      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 flex-1 animate-in fade-in duration-300">
        <div className="space-y-6">
          {/* Header & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Threat Catalog
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time repository of verified synthetic media, deepfakes, voice clones, and fraud vectors.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Multi-Modal Repository</span>
            </div>
          </div>

          {/* Clean, Unified Search & Media-Type Filter Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Media Type Tabs: All | Video | Image | Audio | Text */}
            <GlidingFilterTabs
              tabs={mediaTypeTabs}
              activeId={selectedType}
              onChange={setSelectedType}
              pillVariant="rounded-xl"
            />

            {/* Instant Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incidents, cities, IOCs..."
                className="w-full text-xs text-white bg-[#17191A] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); fetchItems(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </form>
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
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-xs rounded-2xl bg-[#17191A] border border-white/[0.08] space-y-3">
              <ShieldAlert className="size-8 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No Verified Incidents Found</h4>
              <p className="text-zinc-400 max-w-md mx-auto">
                {error || "No verified forensic media records found in this category. Upload media through the Live Scanner to index new incidents."}
              </p>
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="mt-3 px-4 py-2 rounded-xl bg-accent text-page text-xs font-semibold hover:opacity-90 transition-all inline-block"
              >
                Go to Live Scanner
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => {
                const isCritical = item.risk_level === "CRITICAL" || item.risk_level === "HIGH";
                const badge = getMediaBadge(item.type);
                const BadgeIcon = badge.icon;

                return (
                  <article
                    key={item.id}
                    onClick={() => setActiveItem(item)}
                    className="group rounded-2xl bg-[#17191A] border border-white/[0.08] hover:border-white/20 p-5 shadow-card hover:shadow-overlay transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Media Badge + Risk Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border flex items-center gap-1.5", badge.color)}>
                          <BadgeIcon className="size-3" />
                          <span>{badge.label}</span>
                        </span>

                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                            isCritical
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          )}
                        >
                          {item.risk_level || "LOW"}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors leading-snug line-clamp-2">
                        {item.title}
                      </h3>

                      {/* Playable Media Preview or In-Place Active Player */}
                      {(item.media_url || item.thumbnail_url) && item.type === "video_deepfake" && (
                        <div
                          className="relative rounded-xl overflow-hidden bg-black/80 border border-white/10 aspect-video flex items-center justify-center group-hover:border-accent/40 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {playingCardId === item.id ? (
                            <div className="relative w-full h-full">
                              <ResilientVideoPlayer
                                primaryUrl={item.media_url ? (item.media_url.startsWith("http") ? item.media_url : `/api/backend${item.media_url}`) : undefined}
                                fallbackUrl={item.id ? `/api/backend/api/v1/jobs/${item.id}/stream` : (item.media_url ? `/api/backend${item.media_url}` : undefined)}
                                poster={item.thumbnail_url ? (item.thumbnail_url.startsWith("http") ? item.thumbnail_url : `/api/backend${item.thumbnail_url}`) : undefined}
                                autoPlay={true}
                                controls={true}
                                playsInline={true}
                                className="w-full h-full object-contain"
                              />
                              <button
                                type="button"
                                title="Close player"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlayingCardId(null);
                                }}
                                className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 flex items-center justify-center text-xs backdrop-blur-sm cursor-pointer transition-all"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              className="relative w-full h-full cursor-pointer group/thumb"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayingCardId(item.id);
                              }}
                            >
                              <video
                                src={item.media_url ? (item.media_url.startsWith("http") ? item.media_url : `/api/backend${item.media_url}`) : undefined}
                                poster={item.thumbnail_url ? (item.thumbnail_url.startsWith("http") ? item.thumbnail_url : `/api/backend${item.thumbnail_url}`) : undefined}
                                preload="metadata"
                                muted
                                playsInline
                                crossOrigin="anonymous"
                                className="w-full h-full object-cover opacity-80"
                                onError={(e) => {
                                  // If video stream fails to load, gracefully hide video element
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/thumb:bg-black/20 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-accent/25 border-2 border-accent flex items-center justify-center text-accent shadow-lg group-hover/thumb:scale-110 group-hover/thumb:bg-accent group-hover/thumb:text-black transition-all">
                                  <Play className="size-5 fill-current ml-0.5" />
                                </div>
                              </div>
                              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-white/10 pointer-events-none">
                                Click to play inline
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {item.media_url && item.type === "audio_clone" && (
                        <div className="p-3 rounded-xl bg-inset border border-line flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Volume2 className="size-4" />
                          </div>
                          <span className="text-xs font-mono text-zinc-300">Playable Audio Intercept</span>
                        </div>
                      )}

                      {/* Summary / Excerpt */}
                      {item.fir_dossier?.incident_summary && (
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                          {item.fir_dossier.incident_summary}
                        </p>
                      )}

                      {/* Location & Confidence Meta */}
                      <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="size-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{item.city || "Online"}, {item.state || "India"}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-zinc-300">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          <span>{Math.round(item.fake_probability * 100)}% Index</span>
                        </div>
                      </div>
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

        {/* Detail Slide-Over Modal with Playable Media & PDF Export */}
        {activeItem && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end animate-in fade-in duration-200"
            onClick={() => setActiveItem(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              className="relative w-full sm:w-[540px] max-h-[92vh] overflow-y-auto bg-surface border-l border-line shadow-overlay rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none p-6 space-y-5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="text-[10.5px] font-mono text-zinc-400 mb-1">{activeItem.id}</div>
                  <h3 className="text-lg font-bold text-white leading-snug">{activeItem.title}</h3>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-lg hover:bg-hover text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Playable Media Section */}
              {(activeItem.media_url || activeItem.thumbnail_url) && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                    Playable Evidence Intercept
                  </div>
                  {activeItem.type === "video_deepfake" && (
                    <div className="w-full rounded-xl aspect-video overflow-hidden border border-line bg-black">
                      <ResilientVideoPlayer
                        primaryUrl={activeItem.media_url ? (activeItem.media_url.startsWith("http") ? activeItem.media_url : `/api/backend${activeItem.media_url}`) : undefined}
                        fallbackUrl={activeItem.id ? `/api/backend/api/v1/jobs/${activeItem.id}/stream` : (activeItem.media_url ? `/api/backend${activeItem.media_url}` : undefined)}
                        poster={activeItem.thumbnail_url ? (activeItem.thumbnail_url.startsWith("http") ? activeItem.thumbnail_url : `/api/backend${activeItem.thumbnail_url}`) : undefined}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  {activeItem.type === "audio_clone" && activeItem.media_url && (
                    <div className="p-4 rounded-xl bg-inset border border-line space-y-2">
                      <audio 
                        src={activeItem.media_url.startsWith("http") ? activeItem.media_url : `/api/backend${activeItem.media_url}`} 
                        controls 
                        className="w-full" 
                      />
                    </div>
                  )}
                  {activeItem.type === "image_deepfake" && activeItem.media_url && (
                    <img
                      src={activeItem.media_url.startsWith("http") ? activeItem.media_url : `/api/backend${activeItem.media_url}`}
                      alt={activeItem.title}
                      className="w-full rounded-xl max-h-72 object-contain bg-black border border-line"
                    />
                  )}
                </div>
              )}

              {/* Incident Summary */}
              {activeItem.fir_dossier?.incident_summary && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                    Forensic Summary
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed bg-inset/50 p-4 rounded-xl border border-line">
                    {activeItem.fir_dossier.incident_summary}
                  </p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-inset border border-line text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block">Location</span>
                  <span className="text-zinc-200">{activeItem.city}, {activeItem.state}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Location Source</span>
                  <span className="text-accent">{activeItem.location_source || "EXIF_METADATA"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Device Model</span>
                  <span className="text-zinc-200">{activeItem.device_model || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Confidence</span>
                  <span className="text-emerald-400">{Math.round(activeItem.fake_probability * 100)}%</span>
                </div>
              </div>

              {/* 1-Click Download Forensic PDF Button */}
              <button
                type="button"
                onClick={() => generateForensicPDF({
                  id: activeItem.id,
                  title: activeItem.title,
                  verdict: activeItem.verdict || "SUSPICIOUS",
                  confidence: activeItem.fake_probability * 100,
                  riskLevel: activeItem.risk_level || "HIGH",
                  city: activeItem.city,
                  state: activeItem.state,
                  locationSource: activeItem.location_source,
                  deviceModel: activeItem.device_model,
                  softwareUsed: activeItem.software_used,
                  summary: activeItem.fir_dossier?.incident_summary,
                  iocs: activeItem.extracted_iocs,
                })}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-page text-sm font-semibold hover:opacity-90 transition-all shadow-md"
              >
                <Download className="w-4 h-4" /> Download Forensic Evidence PDF
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
