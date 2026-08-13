"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 flex flex-col items-center justify-center p-6 text-center font-mono">
      <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Forensic Exception Intercepted</h2>
      <p className="text-xs text-neutral-400 max-w-md font-sans mb-6">
        {error?.message || "An unexpected error occurred in the forensic UI pipeline."}
      </p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
      >
        <RefreshCw className="w-4 h-4" /> Re-initialize Engine
      </button>
    </div>
  );
}
