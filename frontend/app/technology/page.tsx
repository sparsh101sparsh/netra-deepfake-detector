"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import ArchitectureFlowchart from "@/components/technology/ArchitectureFlowchart";

export default function TechnologyPage() {
  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-accent/30 selection:text-accent">
      <Navbar />

      {/* Main Content */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6 animate-in fade-in duration-500 font-sans flex-1">
        
        {/* End-to-End State Machine Flowchart */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" />
                End-to-End Deepfake Detection State Machine
              </h2>
              <p className="text-xs text-ink-2 mt-0.5">
                Drag any card across the dotted canvas; measured SVG cubic bezier curves follow automatically. Click cards to highlight active signal paths.
              </p>
            </div>
          </div>

          <ArchitectureFlowchart />
        </div>

      </main>

      <Footer />
    </div>
  );
}
