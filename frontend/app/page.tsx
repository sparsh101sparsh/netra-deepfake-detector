"use client";
/**
 * frontend/app/page.tsx — NETRA Unified Hub
 * Premium SpaceX/Vercel SaaS Design Language with Full Landing Page Entry Animation
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle, Activity, FileWarning, Fingerprint, Video, Image as ImageIcon, Sparkles, Scan, Eye, Play } from 'lucide-react';
import { NetraEyeScanner } from "@/components/NetraEyeScanner";
import { NetraSplashIntro } from "@/components/NetraSplashIntro";

const API_URL = "/api/backend";
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = "mp4, mov, webm, avi, jpg, png, webp";

export default function UnifiedHub() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEntryAnimation, setShowEntryAnimation] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcut (ESC) to skip intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEntryAnimation(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [activeScams] = useState([
    { 
      id: 'scam-001', 
      name: 'modiji_swapped_video.mov', 
      type: 'Deepfake', 
      reports: 14, 
      status: 'Verified',
      mediaType: 'video'
    },
    { 
      id: 'scam-002', 
      name: 'SBI_KYC_Update_Link.jpg', 
      type: 'Phishing', 
      reports: 8, 
      status: 'Verified',
      mediaType: 'image'
    },
    { 
      id: 'scam-003', 
      name: 'TRAI_Disconnection_Notice.mp4', 
      type: 'Scam', 
      reports: 3, 
      status: 'Analyzing',
      mediaType: 'video'
    }
  ]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File exceeds maximum size of ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Unsupported format. Please use ${ALLOWED_EXTENSIONS}.`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

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

        if (res.status === 413) { setError("Payload too large (Server limit: 100MB)."); return; }
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
        setError(`Could not reach the analysis server. System may be offline.`);
      } finally {
        setIsUploading(false);
      }
    },
    [router]
  );

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <>
      {/* 1. Cinematic Full-Screen Entry Splash Animation (5.2s duration) */}
      {showEntryAnimation && (
        <NetraSplashIntro onComplete={() => setShowEntryAnimation(false)} />
      )}

      {/* 2. Main Landing Page Hub */}
      <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                NETRA v5.1 • BIOMETRIC SCANNER
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Security Analyzer &amp; Forensic Eye</h1>
            <p className="text-muted-foreground">Upload suspected media for real-time spatial artifact detection and deepfake analysis.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEntryAnimation(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-all"
            >
              <Play className="w-3 h-3 fill-sky-400" />
              Replay Intro
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full border border-border">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-soft"></div>
              <span className="text-xs font-medium text-muted-foreground">Forensic Node Online</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Upload Terminal with Live Animated Eye Scanner */}
          <div className="lg:col-span-2 card-premium p-1 flex flex-col">
            <div 
              className={`flex-1 relative flex flex-col items-center justify-center p-8 md:p-12 min-h-[460px] rounded-lg border-2 border-dashed transition-all duration-300 ${
                isDragging 
                  ? "border-sky-400 bg-sky-500/10 scale-[0.99] shadow-[0_0_40px_rgba(56,189,248,0.2)]" 
                  : "border-border bg-background/50 hover:border-sky-500/40 hover:bg-secondary/20"
              } cursor-pointer group`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="w-full max-w-sm text-center space-y-6">
                  <div className="mx-auto flex items-center justify-center">
                    <NetraEyeScanner size={180} status="scanning" isDragging={true} />
                  </div>
                  <div>
                    <p className="text-foreground font-medium mb-2 flex items-center justify-center gap-2">
                      <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
                      <span>Analyzing Spatial &amp; Biometric Signals...</span>
                    </p>
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 rounded-full" 
                        style={{ width: `${uploadProgress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 font-mono">{uploadProgress}% complete &bull; Running EfficientNet-B4 + SBI</p>
                  </div>
                </div>
              ) : (
                <div className="text-center flex flex-col items-center">
                  <div className="mb-4 group-hover:scale-105 transition-transform duration-300">
                    <NetraEyeScanner size={170} isDragging={isDragging} />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">
                    {isDragging ? "Release to Scan Media" : "Click or Drag Media to Scan"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    NETRA evaluates spatial boundary artifacts, liveness micro-saccades, voice cloning acoustics, and semantic scam indicators.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border">
                      <Video className="w-3.5 h-3.5 text-sky-400" /> MP4, MOV, WEBM
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> JPG, PNG, WEBP
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/80 border border-border">
                      <FileWarning className="w-3.5 h-3.5 text-amber-400" /> Max 100MB
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1 text-sky-400/80"><Scan className="w-3 h-3" /> Spatial Artifacts</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-emerald-400/80"><Eye className="w-3 h-3" /> Liveness Detection</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-purple-400/80"><Sparkles className="w-3 h-3" /> Bedrock AI</span>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="m-4 mt-0 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-destructive">Upload Failed</h4>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Threat Intelligence Sidebar */}
          <div className="card-premium flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                Active Threats
              </h3>
              <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono">Live Feed</span>
            </div>
            
            <div className="flex-1 p-4 space-y-3">
              {activeScams.map((scam) => (
                <div key={scam.id} className="p-4 rounded-xl border border-border bg-background hover:bg-secondary/50 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {scam.mediaType === 'video' ? <Video className="w-4 h-4 text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm font-medium truncate max-w-[140px]" title={scam.name}>{scam.name}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase font-mono ${
                      scam.type === 'Deepfake' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 
                      scam.type === 'Phishing' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {scam.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                      <Fingerprint className="w-3 h-3 text-sky-400" />
                      <span>{scam.reports.toLocaleString()} reports</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${scam.status === 'Verified' ? 'bg-destructive shadow-[0_0_6px_#ef4444]' : 'bg-yellow-500 animate-pulse'}`}></div>
                      <span>{scam.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-border bg-secondary/30">
              <button 
                onClick={() => router.push('/trends')}
                className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                View Geo-Telemetry Radar
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
