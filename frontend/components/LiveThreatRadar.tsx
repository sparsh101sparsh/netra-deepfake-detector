"use client";

import React, { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { 
  Radio, MapPin, ShieldAlert, Sparkles, X, 
  ChevronRight, Layers, FileText, CheckCircle2, Globe 
} from "lucide-react";

interface ThreatMarker {
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
  const [mapTheme, setMapTheme] = useState<"voyager" | "satellite" | "osm">("voyager");
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Fetch live threat markers from backend with fallback
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
          { id: "NETRA-DF-001", title: "AI Face-Swap: Narendra Modi", type: "video_deepfake", category: "IMPERSONATION", lat: 28.6139, lng: 77.2090, city: "New Delhi", state: "Delhi", location_source: "EXACT_GPS", confidence_pct: 98.6, risk_level: "CRITICAL", software_used: "InSwapper-128 + CapCut", device_model: "iPhone 15 Pro", upvotes: 142, created_at: "2026-09-01 02:45" },
          { id: "NETRA-DF-002", title: "Digital Arrest Police Extortion", type: "video_deepfake", category: "DIGITAL_ARREST", lat: 19.0760, lng: 72.8777, city: "Mumbai", state: "Maharashtra", location_source: "EXACT_GPS", confidence_pct: 99.2, risk_level: "CRITICAL", software_used: "LivePortrait + Premiere", device_model: "Samsung S24 Ultra", upvotes: 310, created_at: "2026-09-01 01:20" },
          { id: "NETRA-DF-003", title: "Crypto Gurus Deepfake: Mukesh Ambani", type: "video_deepfake", category: "STOCK_FRAUD", lat: 12.9716, lng: 77.5946, city: "Bengaluru", state: "Karnataka", location_source: "ESTIMATED_TELECOM", confidence_pct: 97.4, risk_level: "HIGH", software_used: "Remaker AI", device_model: "MacBook Pro", upvotes: 89, created_at: "2026-08-31 23:10" },
          { id: "NETRA-DF-004", title: "Electricity Bill Disconnection Threat", type: "scam_text", category: "ELECTRICITY_KYC", lat: 17.3850, lng: 78.4867, city: "Hyderabad", state: "Telangana", location_source: "EXACT_GPS", confidence_pct: 98.5, risk_level: "CRITICAL", software_used: "Automated SMS Broadcast", device_model: "Android Gateway", upvotes: 204, created_at: "2026-08-31 22:40" },
          { id: "NETRA-DF-005", title: "Emergency Hospital Voice Clone", type: "audio_clone", category: "VOICE_CLONE", lat: 18.5204, lng: 73.8567, city: "Pune", state: "Maharashtra", location_source: "ESTIMATED_TELECOM", confidence_pct: 95.8, risk_level: "HIGH", software_used: "ElevenLabs TTS Clone", device_model: "VoIP Cloud", upvotes: 77, created_at: "2026-08-31 21:15" },
          { id: "NETRA-DF-006", title: "AI Stock Trading Scheme", type: "video_deepfake", category: "STOCK_FRAUD", lat: 22.5726, lng: 88.3639, city: "Kolkata", state: "West Bengal", location_source: "EXACT_GPS", confidence_pct: 96.9, risk_level: "HIGH", software_used: "InSwapper-256", device_model: "Windows PC", upvotes: 115, created_at: "2026-08-31 20:30" },
          { id: "NETRA-DF-007", title: "Part-Time Review Scam", type: "scam_text", category: "JOB_SCAM", lat: 13.0827, lng: 80.2707, city: "Chennai", state: "Tamil Nadu", location_source: "ESTIMATED_TELECOM", confidence_pct: 93.4, risk_level: "MEDIUM", software_used: "Telegram Bot Network", device_model: "Cloud Server", upvotes: 62, created_at: "2026-08-31 19:45" },
          { id: "NETRA-DF-008", title: "KYC Suspension SMS Phishing", type: "scam_text", category: "ELECTRICITY_KYC", lat: 26.9124, lng: 75.7873, city: "Jaipur", state: "Rajasthan", location_source: "EXACT_GPS", confidence_pct: 97.8, risk_level: "CRITICAL", software_used: "Bulk SMS Gateway", device_model: "Modem Pool", upvotes: 188, created_at: "2026-08-31 18:20" },
          { id: "NETRA-DF-009", title: "CBI Notice Video Extortion", type: "video_deepfake", category: "DIGITAL_ARREST", lat: 26.8467, lng: 80.9462, city: "Lucknow", state: "Uttar Pradesh", location_source: "EXACT_GPS", confidence_pct: 99.1, risk_level: "CRITICAL", software_used: "SadTalker + DaVinci", device_model: "Mac Studio", upvotes: 245, created_at: "2026-08-31 17:10" },
          { id: "NETRA-DF-010", title: "AI Investment Fund Pitch", type: "video_deepfake", category: "STOCK_FRAUD", lat: 23.0225, lng: 72.5714, city: "Ahmedabad", state: "Gujarat", location_source: "ESTIMATED_TELECOM", confidence_pct: 96.2, risk_level: "HIGH", software_used: "HeyGen + Premiere", device_model: "iPhone 14 Pro", upvotes: 94, created_at: "2026-08-31 16:00" },
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

      // Clean existing map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize map centered over India (lat: 22.0, lng: 79.0, zoom: 5)
      const map = L.map(mapContainerRef.current, {
        center: [22.3511148, 78.6677428],
        zoom: 5,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Tile URLs - 100% Watermark-Free & High-Performance
      const tileUrls = {
        street: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      };

      const tileLayer = L.tileLayer(tileUrls[mapTheme], {
        subdomains: ["a", "b", "c", "d"],
        maxZoom: 19,
      }).addTo(map);

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
  }, [mapTheme]);

  // 3. Render Leaflet HTML Markers dynamically
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markersLayerGroupRef.current) return;

    import("leaflet").then((L) => {
      const markersGroup = markersLayerGroupRef.current;
      markersGroup.clearLayers();

      const filtered = activeFilter === "ALL"
        ? markers
        : markers.filter((m) => m.category === activeFilter || m.type === activeFilter);

      filtered.forEach((m) => {
        const isExact = m.location_source === "EXACT_GPS";
        const color = isExact ? "#ef4444" : "#00f0ff";
        const isSelected = selectedMarker?.id === m.id;

        const customIcon = L.divIcon({
          className: "custom-leaflet-pin",
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;">
              <div style="position: absolute; width: ${isSelected ? '32px' : '22px'}; height: ${isSelected ? '32px' : '22px'}; border-radius: 50%; background-color: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: ${isSelected ? '14px' : '10px'}; height: ${isSelected ? '14px' : '10px'}; border-radius: 50%; background-color: ${isSelected ? '#facc15' : color}; border: 2px solid #030712; box-shadow: 0 0 10px ${color};"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([m.lat, m.lng], { icon: customIcon });
        marker.on("click", () => {
          setSelectedMarker(m);
        });

        // Hover Tooltip
        marker.bindTooltip(`📍 ${m.city} (${m.confidence_pct}%)`, {
          direction: "top",
          className: "leaflet-cyber-tooltip",
          offset: [0, -12],
        });

        markersGroup.addLayer(marker);
      });
    });
  }, [markers, activeFilter, selectedMarker, isMapReady]);

  return (
    <div className="w-full relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950/90 shadow-[0_0_50px_rgba(0,0,0,0.8)] font-mono select-none">
      
      {/* Top Controls Header */}
      <div className="p-5 border-b border-neutral-800/80 bg-neutral-900/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight text-sm sm:text-base">Real-Time Threat Radar (India Map)</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                LIVE OSM & CARTO
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              Live geographic mapping of deepfake uploads and scam campaigns across Indian cities
            </p>
          </div>
        </div>

        {/* Category Filter Tabs & Map Theme Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Mode */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px]">
            {(["street", "satellite", "osm"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setMapTheme(theme)}
                className={`px-2.5 py-1 rounded-lg uppercase font-bold transition-all ${
                  mapTheme === theme ? "bg-neutral-800 text-cyan-400" : "text-neutral-500 hover:text-white"
                }`}
              >
                {theme}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px]">
            {["ALL", "IMPERSONATION", "DIGITAL_ARREST", "ELECTRICITY_KYC", "STOCK_FRAUD"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeFilter === cat 
                    ? "bg-cyan-600 font-bold text-white shadow-sm" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real Interactive Leaflet Map Container */}
      <div className="w-full h-[660px] relative bg-[#090d16]">
        
        {/* Leaflet Map DOM Target */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Telemetry Stats HUD (Top Left) */}
        <div className="absolute top-5 left-5 z-20 p-4 rounded-2xl bg-neutral-950/90 backdrop-blur-2xl border border-neutral-800 shadow-2xl max-w-xs space-y-2.5 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Telemetry Nodes</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              {markers.length} PINPOINTS
            </span>
          </div>

          <div className="flex justify-between items-center text-neutral-300 text-xs">
            <span className="text-neutral-400">Active Incident Feed</span>
            <strong className="text-white">{markers.length} Recorded</strong>
          </div>

          <div className="flex justify-between items-center text-neutral-300 text-xs">
            <span className="text-neutral-400">Highest Frequency</span>
            <strong className="text-red-400">New Delhi (NCR)</strong>
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center gap-4 text-[10px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Exact GPS EXIF
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Regional Hub
            </div>
          </div>
        </div>

        {/* Selected Marker Inspection Card (Bottom Left Floating Card) */}
        {selectedMarker && (
          <div className="absolute bottom-5 left-5 z-30 max-w-md w-full p-5 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl border border-cyan-500/50 shadow-[0_0_40px_rgba(0,0,0,0.95)] animate-in fade-in slide-in-from-bottom-4 duration-300 text-xs space-y-3">
            
            <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  {selectedMarker.id} • {selectedMarker.category}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">{selectedMarker.title}</h4>
              </div>
              <button 
                onClick={() => setSelectedMarker(null)} 
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Location Origin</span>
                <div className="font-bold text-white flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedMarker.city}, {selectedMarker.state}
                </div>
                <span className="text-[9px] text-neutral-400">Source: {selectedMarker.location_source}</span>
              </div>

              <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Verdict & Risk</span>
                <div className="font-bold text-red-400 mt-0.5">
                  {selectedMarker.confidence_pct}% ({selectedMarker.risk_level})
                </div>
                <span className="text-[9px] text-neutral-400">SBI + 2D-DCT Ensemble</span>
              </div>
            </div>

            <div className="space-y-1 text-[10px] text-neutral-300 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
              <div><strong className="text-neutral-400">Hardware Captured:</strong> {selectedMarker.device_model}</div>
              <div><strong className="text-neutral-400">Software Used:</strong> {selectedMarker.software_used}</div>
              <div><strong className="text-neutral-400">Victim Confirmations:</strong> {selectedMarker.upvotes} reports</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href="/reported"
                className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center justify-center gap-1.5"
              >
                Inspect in Threat Catalog <ChevronRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={`/api/backend/api/v1/threat-intelligence/${selectedMarker.id}/fir-pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40 transition-all flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> FIR PDF &darr;
              </a>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
