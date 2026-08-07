"use client";
/**
 * frontend/app/page.tsx — NETRA v5.0 Upload Page
 * Premium drag-and-drop UI for deepfake detection
 */

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
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
        setError(`File too large. Maximum is ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Unsupported format. Please upload ${ALLOWED_EXTENSIONS}.`);
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

        if (res.status === 413) { setError("File too large (server limit: 100MB)."); return; }
        if (res.status === 429) { setError("Rate limit exceeded. Max 10 uploads/hour."); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.detail ?? `Upload failed (HTTP ${res.status})`);
          return;
        }

        const { job_id } = await res.json();
        router.push(`/analyze/${job_id}`);
      } catch {
        clearInterval(progressInterval);
        setError(`Could not reach NETRA API at ${API_URL}. Is the backend running?`);
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">N</div>
            <span className="font-bold text-white text-lg tracking-tight">NETRA</span>
            <span className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">v5.0</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Kaggle GPU Training Active
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Multi-Modal Deepfake Detection · Indian Media · EfficientNet-B4 + CLIP + Wav2Vec2
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Is This Video{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Real?
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            NETRA analyzes face swaps, voice clones, and AI-generated content
            in Indian media using 3 independent AI detectors.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          className={`relative w-full max-w-xl rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group ${
            isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
              : isUploading
              ? "border-purple-400/50 bg-purple-500/5"
              : "border-gray-700 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-900"
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

          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            {isUploading ? (
              <div className="w-full space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-purple-300 font-medium">Uploading to secure storage...</p>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{uploadProgress}% · Max 100MB</p>
              </div>
            ) : (
              <>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  isDragging ? "bg-blue-500/30" : "bg-gray-800 group-hover:bg-gray-750"
                }`}>
                  <svg className={`w-7 h-7 transition-colors ${isDragging ? "text-blue-400" : "text-gray-400 group-hover:text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <p className="text-lg font-semibold text-white mb-1">
                  {isDragging ? "Drop video here" : "Drop video to analyze"}
                </p>
                <p className="text-sm text-gray-500 mb-4">or click to choose a file</p>
                <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Choose Video
                </span>
                <p className="text-xs text-gray-600 mt-4">
                  {ALLOWED_EXTENSIONS} · Max {MAX_FILE_SIZE_MB}MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 w-full max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
            ❌ {error}
          </div>
        )}

        {/* How it works */}
        <div className="mt-16 w-full max-w-2xl">
          <p className="text-xs text-gray-600 text-center mb-6 uppercase tracking-wider">How NETRA Works</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "📤", title: "Upload", desc: "Your video is encrypted and stored on AWS S3" },
              { icon: "🔍", title: "Detect", desc: "3 AI models analyze faces, audio, and metadata" },
              { icon: "🔗", title: "Fuse", desc: "Scores are combined with gated weighted fusion" },
              { icon: "📋", title: "Report", desc: "Claude 3.5 Sonnet writes a forensic analysis" },
            ].map((step, i) => (
              <div key={i} className="rounded-xl bg-gray-900/50 border border-gray-800 p-4 text-center">
                <div className="text-2xl mb-2">{step.icon}</div>
                <p className="text-sm font-semibold text-white mb-1">{step.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 px-6 py-4 text-center text-xs text-gray-600">
        NETRA v5.0 · EfficientNet-B4 + CLIP ViT-L/14 + Wav2Vec2 · Amazon Bedrock Claude 3.5 Sonnet
        · Built for Indian media forensics
      </footer>
    </div>
  );
}
