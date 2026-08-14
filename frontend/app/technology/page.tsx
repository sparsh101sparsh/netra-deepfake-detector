"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import ArchitectureFlowchart from "@/components/technology/ArchitectureFlowchart";
import DatasetSection from "@/components/technology/DatasetSection";
import BenchmarkReportsSection from "@/components/technology/BenchmarkReportsSection";
import { Cpu, Film, FileText } from "lucide-react";

type TechnologyTab = "pipeline" | "dataset" | "benchmarks";

export default function TechnologyPage() {
  const [activeTab, setActiveTab] = useState<TechnologyTab>("pipeline");

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-accent/30 selection:text-accent">
      <Navbar />

      {/* Main Content */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-6 space-y-6 animate-in fade-in duration-500 font-sans flex-1">
        
        {/* Top 3-Option Segmented Navigation Bar */}
        <div className="flex items-center justify-start border-b border-line pb-4">
          <div className="inline-flex rounded-control bg-surface p-1 border border-line shadow-card">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-control transition-all ${
                activeTab === "pipeline"
                  ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                  : "text-ink-2 hover:text-ink hover:bg-hover"
              }`}
            >
              <Cpu className="size-3.5" />
              <span>Multi-Modal Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab("dataset")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-control transition-all ${
                activeTab === "dataset"
                  ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                  : "text-ink-2 hover:text-ink hover:bg-hover"
              }`}
            >
              <Film className="size-3.5" />
              <span>Datasets</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-accent/20 text-accent">
                100
              </span>
            </button>

            <button
              onClick={() => setActiveTab("benchmarks")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-control transition-all ${
                activeTab === "benchmarks"
                  ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                  : "text-ink-2 hover:text-ink hover:bg-hover"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Benchmark Reports</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-green/20 text-green">
                2 Dossiers
              </span>
            </button>
          </div>
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
