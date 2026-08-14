"use client";

import React, { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity, ShieldAlert, Users, TrendingUp, Compass, MapPin, Database } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface RadarMarker {
  id: string;
  title: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  risk_level: string;
  confidence_pct: number;
  software_used: string;
  upvotes: number;
  created_at: string;
}

interface CategoryTrend {
  category: string;
  title: string;
  count: number;
  risk_level: string;
  description: string;
  topCities: string[];
}

export default function ScamTrendsPage() {
  const [markers, setMarkers] = useState<RadarMarker[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendsData = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/backend/api/v1/threat-intelligence/radar').then(r => r.ok ? r.json() : { markers: [] }),
      fetch('/api/backend/api/v1/threat-intelligence/catalog?limit=100').then(r => r.ok ? r.json() : { results: [] })
    ])
      .then(([radarData, catalogData]) => {
        const rawMarkers: RadarMarker[] = radarData?.markers || [];
        setMarkers(rawMarkers);

        const catalogItems = catalogData?.results || catalogData?.items || [];
        
        // Group by threat_category to derive dynamic trends
        const groupMap: Record<string, { count: number; items: any[]; cities: Set<string> }> = {};
        catalogItems.forEach((item: any) => {
          const cat = item.threat_category || "THREAT_INTEL";
          if (!groupMap[cat]) {
            groupMap[cat] = { count: 0, items: [], cities: new Set() };
          }
          groupMap[cat].count += 1;
          groupMap[cat].items.push(item);
          if (item.city) groupMap[cat].cities.add(item.city);
        });

        const derivedTrends: CategoryTrend[] = Object.entries(groupMap).map(([cat, data]) => {
          const first = data.items[0] || {};
          const isCritical = data.items.some((it: any) => it.risk_level === 'CRITICAL');
          return {
            category: cat,
            title: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            count: data.count,
            risk_level: isCritical ? 'CRITICAL' : 'HIGH',
            description: first.fir_dossier?.incident_summary || `Observed vector across ${data.cities.size} metropolitan regions.`,
            topCities: Array.from(data.cities).slice(0, 3)
          };
        });

        setCategoryTrends(derivedTrends);
      })
      .catch((err) => {
        console.warn("Trends fetch error:", err);
        setError("Threat trends telemetry node unreachable. Check connection and retry.");
        setMarkers([]);
        setCategoryTrends([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrendsData();
  }, []);

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">Threat Trends</h1>
            <p className="text-ink-2">Live telemetry visualization of reported threats across verified geographical nodes.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-line">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">
              {loading ? "Streaming Telemetry..." : `${markers.length} Active Nodes`}
            </span>
          </div>
        </div>

        {/* Live Map Box */}
        <div className="w-full h-[500px] rounded-2xl overflow-hidden border-[1.5px] border-line bg-surface shadow-card relative">
          <Map
            initialViewState={{ longitude: 78.9629, latitude: 20.5937, zoom: 4.2 }}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            attributionControl={false}
            interactive={true}
          >
            {markers.map(marker => {
              const isCritical = marker.risk_level === 'CRITICAL';
              return (
                <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat}>
                  <div className="relative flex items-center justify-center group cursor-pointer">
                    <div className={`absolute w-7 h-7 rounded-full animate-ping opacity-60 ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <div className={`relative w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${isCritical ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                  </div>
                </Marker>
              );
            })}
          </Map>
          
          <div className="absolute top-4 left-4 p-4 z-10 rounded-2xl bg-[#17191A]/90 backdrop-blur-md border-[1.5px] border-line shadow-card text-xs space-y-1.5">
            <div className="flex items-center gap-2 mb-2 border-b border-line pb-2">
              <ShieldAlert className="w-4 h-4 text-ink" />
              <span className="font-semibold text-ink">Geospatial Threat Ledger</span>
            </div>
            <p className="text-[11px] font-mono text-ink-3 flex justify-between gap-6">
              <span className="uppercase tracking-wider">Region</span> <span className="font-medium text-ink">India (National)</span>
            </p>
            <p className="text-[11px] font-mono text-ink-3 flex justify-between gap-6">
              <span className="uppercase tracking-wider">Nodes Recorded</span> <span className="font-medium text-emerald-400">{markers.length} Coordinates</span>
            </p>
          </div>

          {!loading && markers.length === 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <div className="max-w-md p-6 rounded-2xl bg-[#17191A]/95 border border-white/10 shadow-overlay text-center space-y-3">
                <Compass className="size-8 text-zinc-500 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Threat Locations Recorded</h4>
                <p className="text-xs text-zinc-400">
                  {error || "No verified geo-telemetry coordinates recorded in the active ledger."}
                </p>
                {error && (
                  <button
                    type="button"
                    onClick={fetchTrendsData}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium transition-colors"
                  >
                    Retry Stream Connection
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Dynamic Category Trend Dossiers */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-surface border-[1.5px] border-line shadow-card p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-32 bg-white/10 rounded" />
                  <div className="h-4 w-16 bg-white/10 rounded-full" />
                </div>
                <div className="h-3 w-full bg-white/5 rounded" />
                <div className="h-3 w-3/4 bg-white/5 rounded" />
                <div className="pt-4 border-t border-line flex justify-between">
                  <div className="h-3 w-20 bg-white/5 rounded" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : categoryTrends.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 rounded-2xl bg-surface border-[1.5px] border-line space-y-2">
            <Database className="size-6 text-zinc-600 mx-auto" />
            <p className="font-semibold text-white">No Category Trend Aggregations</p>
            <p className="text-zinc-500">
              {error || "No verified incident records available to compute regional trend density."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryTrends.map((trend, i) => (
              <div key={i} className="rounded-2xl bg-surface border-[1.5px] border-line shadow-card p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-ink text-sm sm:text-base">{trend.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold ${
                      trend.risk_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {trend.risk_level}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 leading-relaxed line-clamp-3 mb-3">{trend.description}</p>
                  {trend.topCities.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 pt-1">
                      <MapPin className="size-3 text-zinc-500 shrink-0" />
                      <span>{trend.topCities.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 uppercase tracking-wider pt-4 border-t border-line">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{trend.count} {trend.count === 1 ? 'Incident' : 'Incidents'} Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Active Ledger</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
      </main>
      <Footer />
    </div>
  );
}
