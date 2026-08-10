"use client";
/**
 * frontend/app/page.tsx — NETRA Unified Hub
 * Premium SaaS Design Language implementation (Linear/Vercel aesthetic)
 */

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Shield, AlertCircle, Activity, FileWarning, Fingerprint, Video, Image as ImageIcon } from 'lucide-react';

const API_URL = "/api/backend";
const MAX_FILE_SIZE_MB = 100;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = "mp4, mov, webm, avi, jpg, png, webp";

export default function UnifiedHub() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [activeScams] = useState([
    { 
      id: 'scam-001', 
      name: 'modiji_swapped_video.mov', 
      type: 'Deepfake', 
      reports: 12450, 
      status: 'Verified',
      mediaType: 'video'
    },
    { 
      id: 'scam-002', 
      name: 'SBI_KYC_Update_Link.jpg', 
      type: 'Phishing', 
      reports: 8320, 
      status: 'Verified',
      mediaType: 'image'
    },
    { 
      id: 'scam-003', 
      name: 'TRAI_Disconnection_Notice.mp4', 
      type: 'Scam', 
      reports: 4105, 
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
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Security Analyzer</h1>
          <p className="text-muted-foreground">Upload suspected media for forensic analysis and deepfake detection.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full border border-border">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-soft"></div>
          <span className="text-xs font-medium text-muted-foreground">System Online</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Terminal */}
        <div className="lg:col-span-2 card-premium p-1 flex flex-col">
          <div 
            className={`flex-1 relative flex flex-col items-center justify-center p-12 min-h-[400px] rounded-lg border-2 border-dashed transition-all duration-300 ${
              isDragging ? "border-foreground bg-secondary/50 scale-[0.99]" : "border-border bg-background/50 hover:border-muted-foreground/50 hover:bg-secondary/20"
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
                <div className="w-16 h-16 bg-secondary rounded-2xl mx-auto flex items-center justify-center border border-border">
                  <Activity className="w-8 h-8 text-foreground animate-pulse" />
                </div>
                <div>
                  <p className="text-foreground font-medium mb-2">Uploading payload...</p>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-foreground transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{uploadProgress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary rounded-2xl mx-auto flex items-center justify-center border border-border mb-6 group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {isDragging ? "Drop to analyze" : "Click or drag media here"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  Our multi-modal engine will automatically classify deepfakes, voice clones, and phishing attempts.
                </p>
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> MP4, MOV, WEBM</span>
                  <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> JPG, PNG</span>
                  <span className="flex items-center gap-1.5"><FileWarning className="w-4 h-4" /> Max 100MB</span>
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
              <Shield className="w-4 h-4 text-muted-foreground" />
              Active Threats
            </h3>
            <span className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground">Live</span>
          </div>
          
          <div className="flex-1 p-4 space-y-3">
            {activeScams.map((scam, i) => (
              <div key={scam.id} className="p-4 rounded-xl border border-border bg-background hover:bg-secondary/50 transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {scam.mediaType === 'video' ? <Video className="w-4 h-4 text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm font-medium truncate max-w-[140px]" title={scam.name}>{scam.name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                    scam.type === 'Deepfake' ? 'bg-destructive/20 text-destructive' : 
                    scam.type === 'Phishing' ? 'bg-orange-500/20 text-orange-400' : 
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {scam.type}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="w-3 h-3" />
                    <span>{scam.reports.toLocaleString()} reports</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${scam.status === 'Verified' ? 'bg-destructive' : 'bg-yellow-500 animate-pulse'}`}></div>
                    <span>{scam.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-border bg-secondary/30">
            <button className="btn-secondary w-full py-2">View Telemetry</button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
