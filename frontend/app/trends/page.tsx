"use client";

import React, { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity, ShieldAlert, Users, TrendingUp } from 'lucide-react';

const CITIES = [
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

export default function ScamTrendsPage() {
  const [markers, setMarkers] = useState<{id: number, lat: number, lng: number, opacity: number}[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const jitterLat = (Math.random() - 0.5) * 1.5;
      const jitterLng = (Math.random() - 0.5) * 1.5;
      
      const newMarker = {
        id: Date.now(),
        lat: city.lat + jitterLat,
        lng: city.lng + jitterLng,
        opacity: 1
      };
      
      setMarkers(prev => [newMarker, ...prev].slice(0, 8));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fadeInterval = setInterval(() => {
      setMarkers(prev => 
        prev.map(m => ({ ...m, opacity: Math.max(0, m.opacity - 0.05) })).filter(m => m.opacity > 0)
      );
    }, 100);
    return () => clearInterval(fadeInterval);
  }, []);

  const trends = [
    { title: "Voice Cloning Extortion", severity: "High", affected: "1.2M", description: "Scammers clone voices of family members requesting urgent UPI transfers.", growth: "+24%" },
    { title: "Deepfake Investment Gurus", severity: "Critical", affected: "3.4M", description: "Fake videos of public figures endorsing fraudulent crypto schemes.", growth: "+89%" },
    { title: "Election Misinformation", severity: "High", affected: "5M+", description: "AI-generated speeches of politicians circulating in local languages.", growth: "+15%" },
  ];

  return (
    <div className="flex flex-col gap-8 h-full animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Telemetry & Intelligence</h1>
          <p className="text-muted-foreground">Real-time visualization of intercepted AI-driven threats.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full border border-border">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse-soft" />
          <span className="text-xs font-medium text-muted-foreground">Live Telemetry Active</span>
        </div>
      </div>

      {/* MapLibre Map Container */}
      <div className="w-full h-[500px] rounded-xl overflow-hidden border border-border bg-card shadow-sm relative">
        <Map
          initialViewState={{ longitude: 78.9629, latitude: 20.5937, zoom: 4 }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          attributionControl={false}
          interactive={false}
        >
          {markers.map(marker => (
            <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat}>
              <div className="relative flex items-center justify-center" style={{ opacity: marker.opacity }}>
                <div className="absolute w-8 h-8 bg-destructive rounded-full animate-ping opacity-75"></div>
                <div className="relative w-3 h-3 bg-destructive rounded-full border-2 border-background shadow-sm"></div>
              </div>
            </Marker>
          ))}
        </Map>
        
        {/* Overlay HUD */}
        <div className="absolute top-4 left-4 p-4 z-10 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
            <ShieldAlert className="w-4 h-4 text-foreground" />
            <span className="font-semibold text-sm">Threat Radar</span>
          </div>
          <p className="text-xs text-muted-foreground flex justify-between gap-6 mb-1">
            <span>Region</span> <span className="font-medium text-foreground">IND</span>
          </p>
          <p className="text-xs text-muted-foreground flex justify-between gap-6">
            <span>Engine</span> <span className="font-medium text-foreground">MapLibre GL</span>
          </p>
        </div>
      </div>
      
      {/* Trends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trends.map((trend, i) => (
          <div key={i} className="card-premium p-6 group hover:border-muted-foreground/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">{trend.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                trend.severity === 'Critical' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 
                'bg-orange-500/10 text-orange-500 border border-orange-500/20'
              }`}>
                {trend.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground flex-1 mb-6">{trend.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{trend.affected} Reach</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>{trend.growth}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  )
}
