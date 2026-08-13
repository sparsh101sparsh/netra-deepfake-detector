"use client";

import React, { useState, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity, ShieldAlert, Users, TrendingUp } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

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
    { title: "Voice Cloning Extortion", severity: "High", affected: "1.2M", description: "Scammers clone voices of family members requesting urgent transfers.", growth: "+24%" },
    { title: "Fake Investment Videos", severity: "Critical", affected: "3.4M", description: "Fake videos of public figures endorsing fraudulent schemes.", growth: "+89%" },
    { title: "Election Misinformation", severity: "High", affected: "5M+", description: "AI-generated speeches of politicians circulating in local languages.", growth: "+15%" },
  ];

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">Threat Trends</h1>
            <p className="text-ink-2">Real-time visualization of reported threats across the country.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-line">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">Live Activity</span>
          </div>
        </div>

        <div className="w-full h-[500px] rounded-2xl overflow-hidden border-[1.5px] border-line bg-surface shadow-card relative">
          <Map
            initialViewState={{ longitude: 78.9629, latitude: 20.5937, zoom: 4 }}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            attributionControl={false}
            interactive={false}
          >
            {markers.map(marker => (
              <Marker key={marker.id} longitude={marker.lng} latitude={marker.lat}>
                <div className="relative flex items-center justify-center" style={{ opacity: marker.opacity }}>
                  <div className="absolute w-8 h-8 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-3 h-3 bg-red-500 rounded-full border-2 border-page shadow-sm"></div>
                </div>
              </Marker>
            ))}
          </Map>
          
          <div className="absolute top-4 left-4 p-4 z-10 rounded-2xl bg-surface/80 backdrop-blur-md border-[1.5px] border-line shadow-card">
            <div className="flex items-center gap-2 mb-3 border-b border-line pb-2">
              <ShieldAlert className="w-4 h-4 text-ink" />
              <span className="font-semibold text-sm text-ink">Threat Activity</span>
            </div>
            <p className="text-[11px] font-mono text-ink-3 flex justify-between gap-6 mb-1">
              <span className="uppercase tracking-wider">Region</span> <span className="font-medium text-ink">IND</span>
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trends.map((trend, i) => (
            <div key={i} className="rounded-2xl bg-surface border-[1.5px] border-line shadow-card p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-ink">{trend.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider ${
                  trend.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                  'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                }`}>
                  {trend.severity}
                </span>
              </div>
              <p className="text-sm text-ink-2 flex-1 mb-6">{trend.description}</p>
              <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 uppercase tracking-wider pt-4 border-t border-line">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{trend.affected} Impacted</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{trend.growth}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
      </main>
      <Footer />
    </div>
  )
}
