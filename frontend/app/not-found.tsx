"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border-[1.5px] border-accent/40 flex items-center justify-center text-accent mb-6 shadow-[0_0_20px_rgba(var(--accent),0.2)]">
          <NetraEyeScanner size={40} />
        </div>
        
        <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-accent uppercase tracking-wider mb-2">
          404
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-3">
          Page Not Found
        </h1>
        
        <p className="text-ink-2 text-sm max-w-md font-sans mb-8">
          The page you're looking for doesn't exist.
        </p>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back Home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
