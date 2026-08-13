"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { NetraEyeScanner } from "@/components/NetraEyeScanner";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 flex flex-col items-center justify-center p-6 text-center font-mono select-none">
      <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
        <NetraEyeScanner size={40} />
      </div>
      
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">
        <AlertCircle className="w-4 h-4" /> 404 // Target Not Found
      </div>
      
      <h1 className="text-3xl font-extrabold text-white mb-3">
        Forensic Signal Lost
      </h1>
      
      <p className="text-neutral-400 text-xs max-w-md font-sans mb-8">
        The requested intelligence node or forensic report does not exist or has been relocated.
      </p>

      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Analyzer Hub
      </Link>
    </div>
  );
}
