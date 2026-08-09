"use client";
/**
 * frontend/app/page.tsx — NETRA v5.0 Upload Page
 * SpaceX Design Language implementation
 */

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API_URL = "/api/backend";
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
const ALLOWED_EXTENSIONS = "mp4, mov, webm, avi";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`FILE TOO LARGE. MAXIMUM IS ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`UNSUPPORTED FORMAT. PLEASE UPLOAD ${ALLOWED_EXTENSIONS.toUpperCase()}.`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Animate progress bar during upload
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 5, 90));
      }, 300);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_URL}/api/v1/detect/full`, {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (res.status === 413) { setError("FILE TOO LARGE (SERVER LIMIT: 100MB)."); return; }
        if (res.status === 429) { setError("RATE LIMIT EXCEEDED. MAX 10 UPLOADS/HOUR."); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.detail ?? `UPLOAD FAILED (HTTP ${res.status})`);
          return;
        }

        const { job_id } = await res.json();
        router.push(`/analyze/${job_id}`);
      } catch {
        clearInterval(progressInterval);
        setError(`COULD NOT REACH NETRA API AT ${API_URL}. IS THE BACKEND RUNNING?`);
      } finally {
        setIsUploading(false);
      }
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col uppercase">

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-3 px-4 py-2 border border-white/20 text-white text-xs mb-6 font-bold tracking-widest">
            <span className="w-2 h-2 bg-white animate-pulse" />
            SYSTEM ARMED: EFFICIENTNET-B4 + CLIP + WAV2VEC2
          </div>

          <h1 className="spacex-title text-4xl md:text-6xl text-white leading-tight">
            DEEPFAKE DETECTION
          </h1>

          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-10 font-medium tracking-widest">
            NETRA ANALYZES FACE SWAPS, VOICE CLONES, AND AI-GENERATED CONTENT 
            IN INDIAN MEDIA USING 3 INDEPENDENT AI DETECTORS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10">
            <button 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="spacex-btn w-full sm:w-auto"
            >
              ANALYZE VIDEO/AUDIO
            </button>
            <a 
              href="/scam"
              className="spacex-btn w-full sm:w-auto"
            >
              CHECK TEXT FOR SCAMS
            </a>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          className={`relative w-full max-w-2xl border transition-all duration-200 cursor-pointer group ${
            isDragging
              ? "border-white bg-white/10 scale-[1.02]"
              : isUploading
              ? "border-white/50 bg-white/5"
              : "border-white/30 bg-transparent hover:border-white hover:bg-white/5"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            {isUploading ? (
              <div className="w-full space-y-6">
                <p className="text-white font-bold tracking-widest text-lg animate-pulse">UPLOADING SECURE PAYLOAD...</p>
                <div className="w-full bg-white/10 h-1 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-gray-400 tracking-widest">{uploadProgress}% COMPLETE</p>
              </div>
            ) : (
              <>
                <p className="text-2xl font-black text-white mb-2 tracking-widest">
                  {isDragging ? "DROP MEDIA HERE" : "INITIATE UPLOAD"}
                </p>
                <p className="text-sm font-bold text-gray-500 mb-8 tracking-widest">OR CLICK TO BROWSE LOCAL FILES</p>
                <span className="spacex-btn text-sm">
                  SELECT MEDIA
                </span>
                <p className="text-xs font-bold text-gray-600 mt-8 tracking-widest">
                  SUPPORTED: {ALLOWED_EXTENSIONS} | MAX {MAX_FILE_SIZE_MB}MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 w-full max-w-2xl border border-red-500 bg-red-500/10 px-6 py-4 text-sm font-bold tracking-widest text-red-500 text-center uppercase">
            ERROR: {error}
          </div>
        )}

        {/* How it works */}
        <div className="mt-24 w-full max-w-4xl border-t border-white/20 pt-12">
          <p className="text-xs text-gray-400 font-bold text-center mb-10 tracking-widest">PIPELINE ARCHITECTURE</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-0 border border-white/20">
            {[
              { step: "01", title: "UPLOAD", desc: "ENCRYPTED S3 TRANSFER" },
              { step: "02", title: "DETECT", desc: "3 INDEPENDENT AI MODELS" },
              { step: "03", title: "FUSE", desc: "WEIGHTED GATED FUSION" },
              { step: "04", title: "REPORT", desc: "CLAUDE 3.5 FORENSICS" },
            ].map((step, i) => (
              <div key={i} className="border-b sm:border-b-0 sm:border-r border-white/20 last:border-0 p-8 text-center sm:text-left">
                <p className="text-xs text-gray-500 font-black mb-4">{step.step}</p>
                <p className="text-lg font-black text-white mb-2 tracking-widest">{step.title}</p>
                <p className="text-xs font-bold text-gray-400 tracking-widest leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 px-6 py-6 text-center text-xs font-bold text-gray-500 tracking-widest">
        NETRA V5.0 | EFFICIENTNET-B4 + CLIP VIT-L/14 + WAV2VEC2 | CLAUDE 3.5 SONNET | INDIAN MEDIA FORENSICS
      </footer>
    </div>
  );
}
