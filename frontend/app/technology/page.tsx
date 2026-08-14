"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import ArchitectureFlowchart from "@/components/technology/ArchitectureFlowchart";
import DatasetSection from "@/components/technology/DatasetSection";
import BenchmarkReportsSection from "@/components/technology/BenchmarkReportsSection";
import { GlidingFilterTabs } from "@/components/atoms/GlidingFilterTabs";

type TechnologyTab = "pipeline" | "dataset" | "benchmarks";

const TECH_TABS = [
  { id: "pipeline", label: "Multi-Modal Pipeline" },
  { id: "dataset", label: "Datasets", count: 100 },
  { id: "benchmarks", label: "Benchmark Reports", count: 2 },
] as const;

export default function TechnologyPage() {
  const [activeTab, setActiveTab] = useState<TechnologyTab>("pipeline");

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-accent/30 selection:text-accent">
      <Navbar />

      {/* Main Content */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-6 space-y-6 animate-in fade-in duration-500 font-sans flex-1">
        
        {/* Top 3-Option Segmented Navigation Bar */}
        <div className="flex items-center justify-start border-b border-line pb-4">
          <GlidingFilterTabs
            tabs={TECH_TABS}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as TechnologyTab)}
            pillVariant="rounded-xl"
          />
        </div>

        {/* Tab 1: Multi-Modal Architecture Flowchart */}
        {activeTab === "pipeline" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <ArchitectureFlowchart />
          </div>
        )}

        {/* Tab 2: 100 Deepfakes Interactive Playable Dataset Grid */}
        {activeTab === "dataset" && (
          <DatasetSection />
        )}

        {/* Tab 3: Benchmark Reports PDF Dossiers */}
        {activeTab === "benchmarks" && (
          <BenchmarkReportsSection />
        )}

      </main>

      <Footer />
    </div>
  );
}
