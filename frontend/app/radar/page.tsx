"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LiveThreatRadar } from "@/components/LiveThreatRadar";

export default function RadarPage() {
  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />

      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 flex-1 flex flex-col animate-in fade-in duration-300">
        {/* Split Radar: Map Overview (Left) + Recent Locations (Right) */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <LiveThreatRadar />
        </div>
      </main>
    </div>
  );
}
