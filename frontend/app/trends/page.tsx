"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Map, { Marker } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Approximate coordinates for major Indian cities
const CITIES = [
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

export default function ScamTrendsPage() {
  const [markers, setMarkers] = useState<{id: number, lat: number, lng: number, opacity: number}[]>([]);

  // Generate a new random scam report marker every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random city and add some jitter
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const jitterLat = (Math.random() - 0.5) * 1.5;
      const jitterLng = (Math.random() - 0.5) * 1.5;
      
      const newMarker = {
        id: Date.now(),
        lat: city.lat + jitterLat,
        lng: city.lng + jitterLng,
        opacity: 1
      };
      
      setMarkers(prev => {
        // Keep only last 10 markers to prevent clutter
        const newMarkers = [newMarker, ...prev].slice(0, 10);
        return newMarkers;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Fade out markers over time
  useEffect(() => {
    const fadeInterval = setInterval(() => {
      setMarkers(prev => 
        prev.map(m => ({ ...m, opacity: Math.max(0, m.opacity - 0.05) })).filter(m => m.opacity > 0)
      );
    }, 100);
    return () => clearInterval(fadeInterval);
  }, []);

  const trends = [
    { title: "Voice Cloning on WhatsApp", severity: "High", affected: "1.2M", description: "Scammers clone voices of family members requesting urgent UPI transfers." },
    { title: "Deepfake Investment Gurus", severity: "Critical", affected: "3.4M", description: "Fake videos of Elon Musk & Ratan Tata endorsing crypto scams." },
    { title: "Election Misinformation", severity: "High", affected: "5M+", description: "AI-generated speeches of politicians circulating in local languages." },
  ];

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h1 className="text-4xl font-bold text-gradient mb-2">Live Geo-Map Telemetry</h1>
        <p className="text-slate-400 text-lg">Real-time visualization of intercepted AI-driven deepfake and scam threats across India.</p>
      </div>

      {/* MapLibre Map Container */}
      <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl relative">
        <Map
          initialViewState={{
            longitude: 78.9629,
            latitude: 20.5937,
            zoom: 3.8
          }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          attributionControl={false}
          interactive={false} // Disable panning/zooming for clean display
        >
          {markers.map(marker => (
            <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat}>
              <div 
                className="relative flex items-center justify-center"
                style={{ opacity: marker.opacity }}
              >
                <div className="absolute w-8 h-8 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-3 h-3 bg-red-500 rounded-full border-2 border-[#09090b]"></div>
              </div>
            </Marker>
          ))}
        </Map>
        
        {/* Overlay HUD */}
        <div className="absolute top-4 left-4 glass-panel p-4 z-10 rounded-xl bg-[#09090b]/80 backdrop-blur-md border border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-mono text-sm tracking-wider uppercase font-bold">Live Uplink Active</span>
          </div>
          <p className="text-slate-300 font-mono text-xs">MONITORING REGION: IND</p>
          <p className="text-slate-300 font-mono text-xs">ENGINE: MapLibre GL + WebGL</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trends.map((trend, i) => (
          <div key={i} className="glass-card p-6 flex flex-col gap-4 border border-slate-700/30 bg-[#09090b]/40 backdrop-blur-md rounded-2xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-white">{trend.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${trend.severity === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                {trend.severity}
              </span>
            </div>
            <p className="text-slate-300 flex-1">{trend.description}</p>
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-sm">
              <span className="text-slate-400">Estimated Reach:</span>
              <span className="font-mono text-blue-400">{trend.affected} Users</span>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  )
}
