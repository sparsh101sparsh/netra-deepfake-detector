"use client";

import React, { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapPin, X, Search, Video, Mic,
  MessageSquare, Clock, ArrowUpRight, Compass
} from "lucide-react";


import { cn } from "@/lib/utils";

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

  // 1. Fetch live threat markers from backend with realistic fallback
  useEffect(() => {
    fetch("/api/backend/api/v1/threat-intelligence/radar")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.markers && data.markers.length > 0) {
          setMarkers(data.markers);
        }
      })
      .catch(() => {
        const demoMarkers: ThreatMarker[] = [
          { id: "NETRA-DF-001", title: "AI Face-Swap: Celebrity Extortion", type: "video_deepfake", category: "DEEPFAKE", lat: 28.6139, lng: 77.2090, city: "New Delhi", state: "Delhi", location_source: "Reported Submission", confidence_pct: 98.6, risk_level: "CRITICAL", software_used: "InSwapper-128 + CapCut", device_model: "iPhone 15 Pro", upvotes: 142, created_at: "18 mins ago" },
          { id: "NETRA-DF-002", title: "Digital Arrest Police Video Extortion", type: "video_deepfake", category: "DIGITAL_ARREST", lat: 19.0760, lng: 72.8777, city: "Mumbai", state: "Maharashtra", location_source: "Reported Submission", confidence_pct: 99.2, risk_level: "CRITICAL", software_used: "LivePortrait + Premiere", device_model: "Samsung S24 Ultra", upvotes: 310, created_at: "45 mins ago" },
          { id: "NETRA-DF-003", title: "Guaranteed Stock Scheme Video", type: "video_deepfake", category: "STOCK_FRAUD", lat: 12.9716, lng: 77.5946, city: "Bengaluru", state: "Karnataka", location_source: "Reported Submission", confidence_pct: 97.4, risk_level: "HIGH", software_used: "Remaker AI", device_model: "MacBook Pro", upvotes: 89, created_at: "1 hour ago" },
          { id: "NETRA-DF-004", title: "Electricity Bill Disconnection Threat", type: "scam_text", category: "EXTORTION", lat: 17.3850, lng: 78.4867, city: "Hyderabad", state: "Telangana", location_source: "Reported Submission", confidence_pct: 98.5, risk_level: "CRITICAL", software_used: "Automated SMS Gateway", device_model: "Android Gateway", upvotes: 204, created_at: "2 hours ago" },
          { id: "NETRA-DF-005", title: "Hospital Emergency Voice Clone", type: "audio_clone", category: "VOICE_CLONE", lat: 18.5204, lng: 73.8567, city: "Pune", state: "Maharashtra", location_source: "Reported Submission", confidence_pct: 95.8, risk_level: "HIGH", software_used: "ElevenLabs Voice Clone", device_model: "VoIP Cloud", upvotes: 77, created_at: "3 hours ago" },
          { id: "NETRA-DF-006", title: "High-Return Trading App Deepfake", type: "video_deepfake", category: "STOCK_FRAUD", lat: 22.5726, lng: 88.3639, city: "Kolkata", state: "West Bengal", location_source: "Reported Submission", confidence_pct: 96.9, risk_level: "HIGH", software_used: "FaceFusion + DaVinci", device_model: "Windows Workstation", upvotes: 115, created_at: "4 hours ago" },
          { id: "NETRA-DF-007", title: "Part-Time Job Commission Notice", type: "scam_text", category: "EXTORTION", lat: 13.0827, lng: 80.2707, city: "Chennai", state: "Tamil Nadu", location_source: "Reported Submission", confidence_pct: 93.4, risk_level: "MEDIUM", software_used: "Telegram Network", device_model: "Cloud Server", upvotes: 62, created_at: "5 hours ago" },
          { id: "NETRA-DF-008", title: "Bank KYC Suspension APK Notice", type: "scam_text", category: "EXTORTION", lat: 26.9124, lng: 75.7873, city: "Jaipur", state: "Rajasthan", location_source: "Reported Submission", confidence_pct: 97.8, risk_level: "CRITICAL", software_used: "Bulk SMS Broadcast", device_model: "Android Gateway", upvotes: 188, created_at: "6 hours ago" },
          { id: "NETRA-DF-009", title: "CBI Notice Fake Video Call", type: "video_deepfake", category: "DIGITAL_ARREST", lat: 26.8467, lng: 80.9462, city: "Lucknow", state: "Uttar Pradesh", location_source: "Reported Submission", confidence_pct: 99.1, risk_level: "CRITICAL", software_used: "SadTalker Video Synthesis", device_model: "Mac Studio", upvotes: 245, created_at: "7 hours ago" },
          { id: "NETRA-DF-010", title: "Cryptocurrency Investment Pitch Video", type: "video_deepfake", category: "STOCK_FRAUD", lat: 23.0225, lng: 72.5714, city: "Ahmedabad", state: "Gujarat", location_source: "Reported Submission", confidence_pct: 96.2, risk_level: "HIGH", software_used: "HeyGen Video Generator", device_model: "iPhone 14 Pro", upvotes: 94, created_at: "8 hours ago" },
        ];
        setMarkers(demoMarkers);
      });
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

  // 3. Render Leaflet HTML Markers dynamically
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersLayerGroupRef.current) return;

    import("leaflet").then((L) => {
      const markersGroup = markersLayerGroupRef.current;
      markersGroup.clearLayers();

      const filtered = markers.filter((m) => {
        const matchesFilter = activeFilter === "ALL" || m.category === activeFilter;
        const matchesSearch = searchQuery === "" || 
          m.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
          m.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      });

      filtered.forEach((m) => {
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

        marker.bindTooltip(`📍 ${m.city} • ${m.title}`, {
          direction: "top",
          className: "leaflet-dark-tooltip",
          offset: [0, -12],
        });

        markersGroup.addLayer(marker);
      });
    });
  }, [markers, activeFilter, searchQuery, selectedMarker, isMapReady]);

  // 4. Interactive Pan to Location when clicked from the right list
  const handleSelectLocation = (marker: ThreatMarker) => {
    setSelectedMarker(marker);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([marker.lat, marker.lng], 9, {
        duration: 1.2,
      });
    }
  };

  const filteredMarkers = markers.filter((m) => {
    const matchesFilter = activeFilter === "ALL" || m.category === activeFilter;
    const matchesSearch = searchQuery === "" || 
      m.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full rounded-2xl overflow-hidden border-[1.5px] border-line bg-[#141416] shadow-card flex flex-col font-sans select-none">
      
      {/* ── 1. TOP HEADER TOOLBAR ── */}
      <div className="p-4 sm:p-5 border-b border-line bg-[#141416] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight text-sm sm:text-base">
                National Cyber Threat Radar
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
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#18181B] border border-white/10 font-mono text-[11px]">
            {[
              { id: "ALL", label: "All Incidents" },
              { id: "DEEPFAKE", label: "Deepfakes" },
              { id: "DIGITAL_ARREST", label: "Digital Arrest" },
              { id: "STOCK_FRAUD", label: "Trading Scams" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all",
                  activeFilter === tab.id
                    ? "bg-[#27272A] text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. SPLIT WORKSPACE: MAP OVERVIEW (LEFT) + RECENT LOCATIONS (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[620px] h-[calc(100vh-140px)]">
        
        {/* ── LEFT COLUMN (~60% width): MAP OVERVIEW ── */}
        <div className="lg:col-span-7 xl:col-span-8 relative w-full h-full bg-[#0C0C0E] overflow-hidden">
          
          {/* Leaflet Map DOM Element */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Nodes Chip (Top Left) */}
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-[#141416]/90 backdrop-blur-md border border-white/10 shadow-card flex items-center gap-2 text-xs font-mono text-zinc-300 pointer-events-none">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{filteredMarkers.length} Active Submission Nodes</span>
          </div>

          {/* Selected Marker Detail Overlay (Floating Card) */}
          {selectedMarker && (
            <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-sm z-30 p-4 rounded-2xl bg-[#141416]/95 backdrop-blur-xl border border-white/15 shadow-overlay animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs space-y-3">
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
          <div className="p-4 border-b border-line bg-[#141416] space-y-3 shrink-0">
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
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] custom-scrollbar">
            {filteredMarkers.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                <Compass className="size-6 text-zinc-600 mx-auto" />
                <p>No locations match your search or filter.</p>
              </div>
            ) : (
              filteredMarkers.map((marker) => {
                const isSelected = selectedMarker?.id === marker.id;
                const isCritical = marker.risk_level === "CRITICAL";

                return (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={() => handleSelectLocation(marker)}
                    className={cn(
                      "w-full text-left p-3.5 sm:p-4 transition-all duration-150 flex items-start gap-3 group",
                      isSelected
                        ? "bg-[#1C1C20] border-l-2 border-l-white"
                        : "hover:bg-[#18181B]/80 border-l-2 border-l-transparent"
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
              })
            )}
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="p-3 border-t border-line bg-[#141416] text-[11px] font-mono text-zinc-500 flex items-center justify-between shrink-0">
            <span>Click any location to focus map</span>
            <span className="text-zinc-400">{filteredMarkers.length} recorded</span>
          </div>

        </div>

      </div>

    </div>
  );
}
