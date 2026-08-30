"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapPin, X, Search, Video, Mic,
  MessageSquare, Clock, ArrowUpRight, Compass
} from "lucide-react";


import { cn } from "@/lib/utils";
import { GlidingFilterTabs } from "@/components/atoms/GlidingFilterTabs";
import { GlideMenu } from "@/components/atoms/GlideMenu";

export interface ThreatMarker {
  id: string;
  title: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  location_source: string;
  confidence_pct: number;
  risk_level: string;
  software_used: string;
  device_model: string;
  upvotes: number;
  created_at: string;
}

export function LiveThreatRadar() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<any>(null);

  const [markers, setMarkers] = useState<ThreatMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<ThreatMarker | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRadarData = () => {
    setIsLoading(true);
    setFetchError(null);
    fetch("/api/backend/api/v1/threat-intelligence/radar")
      .then((res) => {
        if (!res.ok) throw new Error("Threat radar service unreachable");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.markers)) {
          const rawMarkers: ThreatMarker[] = data.markers;
          // Filter out synthetic unit-test fixture artifacts, stress tests, and demo markers
          const cleanMarkers = rawMarkers.filter((m) => {
            const id = (m.id || "").toUpperCase();
            const title = (m.title || "").toLowerCase();
            if (
              id.startsWith("TEST-") ||
              id.startsWith("DEMO-") ||
              id.startsWith("E2E-") ||
              id.startsWith("FIR-STRESS-") ||
              id.startsWith("CHALLENGE-") ||
              id.startsWith("THREAT-CONCUR-") ||
              id.startsWith("THREAT-ADV-") ||
              id.startsWith("THREAT-SPECIAL-") ||
              id.startsWith("THREAT-7546") ||
              id.startsWith("THREAT-D38F") ||
              id.startsWith("THREAT-A471") ||
              id.startsWith("THREAT-9F10") ||
              id.startsWith("THREAT-ADE2") ||
              id.startsWith("THREAT-74AF") ||
              id.startsWith("THREAT-1D18") ||
              id.startsWith("THREAT-F988") ||
              id.startsWith("THREAT-2509") ||
              id.startsWith("THREAT-CC00") ||
              id.startsWith("THREAT-AF34") ||
              id.startsWith("THREAT-02FE") ||
              id.startsWith("THREAT-A753") ||
              id.startsWith("THREAT-B119") ||
              id.startsWith("THREAT-10C4") ||
              id.startsWith("THREAT-2380") ||
              id.startsWith("THREAT-8097") ||
              id.startsWith("THREAT-D82F") ||
              id.startsWith("THREAT-1294") ||
              id.startsWith("THREAT-F9B0") ||
              id.startsWith("THREAT-EEF0") ||
              id.startsWith("THREAT-B359") ||
              id.startsWith("THREAT-C0B8") ||
              id.startsWith("THREAT-66BC") ||
              id.startsWith("THREAT-9285") ||
              id.startsWith("THREAT-4BD6") ||
              id.startsWith("THREAT-0235") ||
              id.startsWith("THREAT-E1B0") ||
              id.startsWith("THREAT-E0C4")
            ) {
              return false;
            }
            if (
              title.includes("[test_fixture]") ||
              title.includes("adversarial benchmark mock") ||
              title.includes("stress threat") ||
              title.includes("concurrent threat") ||
              title.includes("load threat") ||
              title.includes("edge case coords") ||
              title.includes("adversarial image test") ||
              title.includes("concurrency burst") ||
              title.includes("notice: fake warrant") ||
              title.includes("alert: scam <official notice>") ||
              title.includes("reported electricity kyc") ||
              title.includes("reported digital arrest") ||
              title.includes("meeting at 5 pm") ||
              title.includes("electricity power bill is unpaid") ||
              title.includes("congratulations! you won") ||
              title.includes("hey mom, i bought") ||
              title.includes("dear customer, your sbi yono") ||
              title.includes("electricity will be disconnected") ||
              title.includes("hello, please find the meeting agenda") ||
              title.includes("noise.opus") ||
              title.includes("three_faces_test") ||
              title.includes("two_faces_test") ||
              title.includes("numerical_audit") ||
              title.includes("blank.jpg") ||
              title.includes("s0.jpg") ||
              title.includes("scenario_1") ||
              title.includes("scenario_2") ||
              title.includes("scenario_3") ||
              title.includes("scenario_4")
            ) {
              return false;
            }
            return true;
          });
          const sortedMarkers = [...cleanMarkers].sort((a, b) => {
            const tA = new Date((a.created_at || "").replace(" ", "T")).getTime() || 0;
            const tB = new Date((b.created_at || "").replace(" ", "T")).getTime() || 0;
            return tB - tA;
          });
          setMarkers(sortedMarkers);
        } else {
          setMarkers([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("LiveThreatRadar fetch error:", err);
        setMarkers([]);
        setFetchError("Threat radar node offline; unable to stream live geospatial telemetry.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

  // 2. Initialize Real Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map centered over India
      const map = L.map(mapContainerRef.current, {
        center: [22.3511148, 78.6677428],
        zoom: 5,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "bottomleft" }).addTo(map);

      // Satellite Imagery Tile Layer (ArcGIS World Imagery — 100% Watermark-Free)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          subdomains: ["a", "b", "c", "d"],
          maxZoom: 19,
        }
      ).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
      setIsMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Filter & Search Helper Functions (Null-Safe & Modality Aware)
  const matchesRadarFilter = (m: ThreatMarker, filter: string): boolean => {
    if (filter === "ALL") return true;
    const cat = (m.category || "").toUpperCase();
    const typ = (m.type || "").toLowerCase();
    if (filter === "DEEPFAKE") {
      return typ.includes("deepfake") || cat.includes("SWAP") || cat.includes("DEEPFAKE") || cat.includes("IMPERSONATION");
    }
    if (filter === "VOICE") {
      return typ.includes("audio") || cat.includes("VOICE") || cat.includes("AUDIO");
    }
    if (filter === "ARREST") {
      return cat.includes("ARREST");
    }
    if (filter === "KYC") {
      return cat.includes("KYC") || cat.includes("ELECTRIC");
    }
    if (filter === "RECRUIT") {
      return cat.includes("JOB") || cat.includes("RECRUIT");
    }
    if (filter === "INVESTMENT") {
      return cat.includes("STOCK") || cat.includes("INVEST") || cat.includes("FRAUD");
    }
    return cat === filter;
  };

  const matchesRadarSearch = (m: ThreatMarker, query: string): boolean => {
    if (!query || !query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      (m.city || "").toLowerCase().includes(q) ||
      (m.state || "").toLowerCase().includes(q) ||
      (m.title || "").toLowerCase().includes(q) ||
      (m.id || "").toLowerCase().includes(q) ||
      (m.software_used || "").toLowerCase().includes(q)
    );
  };

  // 3. Auto Latest-First Sorted & Filtered Markers (No UI sort element required)
  const filteredMarkers = useMemo(() => {
    return markers
      .filter((m) => matchesRadarFilter(m, activeFilter) && matchesRadarSearch(m, searchQuery))
      .sort((a, b) => {
        const tA = new Date((a.created_at || "").replace(" ", "T")).getTime() || 0;
        const tB = new Date((b.created_at || "").replace(" ", "T")).getTime() || 0;
        return tB - tA;
      });
  }, [markers, activeFilter, searchQuery]);

  // 4. Render Leaflet HTML Markers dynamically
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersLayerGroupRef.current) return;

    import("leaflet").then((L) => {
      const markersGroup = markersLayerGroupRef.current;
      markersGroup.clearLayers();

      filteredMarkers.forEach((m) => {
        if (typeof m.lat !== "number" || typeof m.lng !== "number" || isNaN(m.lat) || isNaN(m.lng)) return;
        const isCritical = m.risk_level === "CRITICAL";
        const isSelected = selectedMarker?.id === m.id;

        const pulseColor = isCritical ? "#f43f5e" : "#f59e0b";
        const coreColor = isCritical ? "#fb7185" : "#fbbf24";

        const customIcon = L.divIcon({
          className: "custom-leaflet-pin",
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="
                position: absolute;
                width: ${isSelected ? "36px" : "24px"};
                height: ${isSelected ? "36px" : "24px"};
                border-radius: 9999px;
                background: ${pulseColor};
                opacity: 0.35;
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                position: relative;
                width: ${isSelected ? "16px" : "12px"};
                height: ${isSelected ? "16px" : "12px"};
                border-radius: 9999px;
                background: ${coreColor};
                border: 2px solid #ffffff;
                box-shadow: 0 0 12px ${coreColor};
                transition: transform 0.2s;
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([m.lat, m.lng], { icon: customIcon });

        marker.on("click", () => {
          setSelectedMarker(m);
        });

        marker.bindTooltip(`📍 ${m.city || "Detected Geolocation"} • ${m.title || "Threat"}`, {
          direction: "top",
          className: "leaflet-dark-tooltip",
          offset: [0, -12],
        });

        markersGroup.addLayer(marker);
      });
    });
  }, [filteredMarkers, selectedMarker, isMapReady]);

  // 5. Interactive Pan to Location when clicked from the right list
  const handleSelectLocation = (marker: ThreatMarker) => {
    setSelectedMarker(marker);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([marker.lat, marker.lng], 9, {
        duration: 1.2,
      });
    }
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border-[1.5px] border-line bg-[#17191A] shadow-card flex flex-col font-sans select-none">
      
      {/* ── 1. TOP HEADER TOOLBAR ── */}
      <div className="p-4 sm:p-5 border-b border-line bg-[#17191A] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight text-sm sm:text-base">
                Netra Cyber Threat Radar
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Map
              </span>
            </div>
            <p className="text-xs text-zinc-400 -mt-0.5">
              Geospatial mapping of submitted deepfake media & verified scam incident locations.
            </p>
          </div>
        </div>

        {/* Right Toolbar: Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <GlidingFilterTabs
            tabs={[
              { id: "ALL", label: "All Incidents" },
              { id: "DEEPFAKE", label: "Deepfakes" },
              { id: "DIGITAL_ARREST", label: "Digital Arrest" },
              { id: "STOCK_FRAUD", label: "Trading Scams" },
            ]}
            activeId={activeFilter}
            onChange={setActiveFilter}
            pillVariant="pill"
            className="p-0.5 rounded-lg bg-[#18181B] border border-white/10"
          />
        </div>
      </div>

      {/* ── 2. SPLIT WORKSPACE: MAP OVERVIEW (LEFT) + RECENT LOCATIONS (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[620px] h-[calc(100vh-140px)]">
        
        {/* ── LEFT COLUMN (~60% width): MAP OVERVIEW ── */}
        <div className="lg:col-span-7 xl:col-span-8 relative w-full h-full bg-[#0C0C0E] overflow-hidden">
          
          {/* Leaflet Map DOM Element */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Nodes Chip (Top Left) */}
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-[#17191A]/90 backdrop-blur-md border border-white/10 shadow-card flex items-center gap-2 text-xs font-mono text-zinc-300 pointer-events-none">
            <span className={cn("size-2 rounded-full", isLoading ? "bg-amber-400 animate-ping" : filteredMarkers.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
            <span>{isLoading ? "Synchronizing Telemetry..." : `${filteredMarkers.length} Active Submission Nodes`}</span>
          </div>

          {/* Institutional Zero-Marker / Offline Overlay */}
          {!isLoading && filteredMarkers.length === 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 pointer-events-auto">
              <div className="max-w-md p-6 rounded-2xl bg-[#17191A]/95 border border-white/10 shadow-overlay text-center space-y-3">
                <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Compass className="size-5" />
                </div>
                <h4 className="text-sm font-semibold text-white">No Geo-Telemetry Recorded</h4>
                <p className="text-xs text-zinc-400">
                  No verified geo-telemetry coordinates recorded in this category.
                </p>
                {fetchError && (
                  <p className="text-[11px] font-mono text-rose-400 pt-1">
                    {fetchError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={fetchRadarData}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium transition-colors"
                >
                  Retry Stream Connection
                </button>
              </div>
            </div>
          )}

          {/* Selected Marker Detail Overlay (Floating Card) */}
          {selectedMarker && (
            <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-sm z-30 p-4 rounded-2xl bg-[#17191A]/95 backdrop-blur-xl border border-white/15 shadow-overlay animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono">
                    <MapPin className="size-3 text-white shrink-0" />
                    <span className="font-semibold text-white truncate">{selectedMarker.city}, {selectedMarker.state}</span>
                  </div>
                  <h4 className="font-semibold text-white text-xs mt-1 truncate">
                    {selectedMarker.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMarker(null)}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[#18181B] border border-white/10">
                  <span className="text-zinc-400 text-[10px]">Detection Verdict</span>
                  <div className="font-semibold text-rose-400 mt-0.5">
                    {selectedMarker.confidence_pct}% ({selectedMarker.risk_level})
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#18181B] border border-white/10">
                  <span className="text-zinc-400 text-[10px]">Submitted</span>
                  <div className="font-medium text-zinc-200 mt-0.5 truncate">
                    {selectedMarker.created_at}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 leading-snug">
                <span className="text-zinc-500">Tool / Pattern:</span> {selectedMarker.software_used}
              </div>

              <div className="pt-1">
                <a
                  href="/reported"
                  className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-zinc-100 text-[#0C0C0E] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>View in Threat Catalog</span>
                  <ArrowUpRight className="size-3 text-[#0C0C0E]" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (~40% width): RECENT LOCATIONS FEED ── */}
        <div className="lg:col-span-5 xl:col-span-4 border-t lg:border-t-0 lg:border-l border-line flex flex-col h-full bg-[#111113] overflow-hidden">
          
          {/* Feed Header */}
          <div className="p-4 border-b border-line bg-[#17191A] space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>Recent Locations</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#18181B] border border-white/10 text-zinc-300">
                    {filteredMarkers.length}
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Submissions and incident locations detected by NETRA
                </p>
              </div>
            </div>

            {/* Location Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, state, or threat..."
                className="w-full rounded-xl bg-[#18181B] border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Continuous Vertical Scroll Stream */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-[#18181B] border border-white/5 space-y-2 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-3.5 w-24 bg-white/10 rounded" />
                      <div className="h-3.5 w-16 bg-white/10 rounded" />
                    </div>
                    <div className="h-3 w-44 bg-white/10 rounded" />
                    <div className="flex justify-between items-center pt-1">
                      <div className="h-2.5 w-28 bg-white/5 rounded" />
                      <div className="h-2.5 w-14 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMarkers.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                <Compass className="size-6 text-zinc-600 mx-auto" />
                <p className="text-zinc-300 font-medium">No verified incident coordinates</p>
                <p className="text-zinc-500 text-[11px]">
                  {fetchError || "No verified threat telemetry records match your active search or category filters."}
                </p>
                {fetchError && (
                  <button
                    type="button"
                    onClick={fetchRadarData}
                    className="mt-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            ) : (
              <GlideMenu
                className="flex flex-col divide-y divide-white/[0.06]"
                highlightClassName="inset-x-0 bg-white/[0.06] rounded-none border-l-2 border-l-white"
                rowSelector="[data-menu-row]"
              >
                {filteredMarkers.map((marker) => {
                  const isSelected = selectedMarker?.id === marker.id;
                  const isCritical = marker.risk_level === "CRITICAL";

                  return (
                    <button
                      key={marker.id}
                      data-menu-row
                      type="button"
                      onClick={() => handleSelectLocation(marker)}
                      className={cn(
                        "relative z-10 w-full text-left p-3.5 sm:p-4 transition-colors duration-150 flex items-start gap-3 group border-l-2",
                        isSelected
                          ? "bg-[#1C1C20] border-l-white"
                          : "border-l-transparent"
                      )}
                    >
                      {/* Location Icon Container */}
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors border",
                        isSelected
                          ? "bg-white text-[#0C0C0E] border-white"
                          : "bg-[#18181B] text-zinc-400 group-hover:text-white border-white/10"
                      )}>
                        {marker.type === "video_deepfake" ? (
                          <Video className="size-3.5" />
                        ) : marker.type === "audio_clone" ? (
                          <Mic className="size-3.5" />
                        ) : (
                          <MessageSquare className="size-3.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                            <MapPin className="size-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{marker.city}, {marker.state}</span>
                          </div>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase shrink-0 border",
                            isCritical
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          )}>
                            {marker.risk_level}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-snug line-clamp-1 group-hover:text-white transition-colors">
                          {marker.title}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-zinc-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-zinc-400" />
                            <span>Submitted {marker.created_at}</span>
                          </span>
                          <span className="text-zinc-400 text-[10px] group-hover:text-zinc-300 flex items-center gap-0.5">
                            <span>Focus Map</span>
                            <span>↗</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </GlideMenu>
            )}
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="p-3 border-t border-line bg-[#17191A] text-[11px] font-mono text-zinc-500 flex items-center justify-between shrink-0">
            <span>Click any location to focus map</span>
            <span className="text-zinc-400">{filteredMarkers.length} recorded</span>
          </div>

        </div>

      </div>

    </div>
  );
}
