"use client";
/**
 * frontend/app/page.tsx — NETRA Unified Hub
 * SpaceX Design Language implementation
 */

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

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
      type: 'DEEPFAKE', 
      reports: 12450, 
      status: 'VERIFIED',
      thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80',
      mediaType: 'video'
    },
    { 
      id: 'scam-002', 
      name: 'SBI_KYC_Update_Link.jpg', 
      type: 'PHISHING', 
      reports: 8320, 
      status: 'VERIFIED',
      thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=80',
      mediaType: 'image'
    },
    { 
      id: 'scam-003', 
      name: 'TRAI_Disconnection_Notice.mp4', 
      type: 'SCAM', 
      reports: 4105, 
      status: 'ANALYZING',
      thumbnail: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=400&q=80',
      mediaType: 'video'
    }
  ]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`PAYLOAD EXCEEDS MAXIMUM ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`UNSUPPORTED FORMAT: USE ${ALLOWED_EXTENSIONS.toUpperCase()}.`);
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

        if (res.status === 413) { setError("PAYLOAD TOO LARGE (SERVER LIMIT: 100MB)."); return; }
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
        setError(`COULD NOT REACH ORBITAL COMMAND AT ${API_URL}. SYSTEM OFFLINE?`);
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
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Section: Upload and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Terminal */}
        <div className="spacex-panel p-8 flex flex-col min-h-[500px]">
          <div className="flex items-center gap-3 text-xs font-bold tracking-widest text-gray-400 mb-6 uppercase">
            <div className="w-2 h-2 bg-green-500 animate-pulse rounded-full"></div>
            SYSTEM ARMED: MULTI-MODAL DETECTION
          </div>
          
          <h1 className="spacex-title text-3xl md:text-5xl text-white leading-tight mb-4">
            INITIATE SCAN
          </h1>
          <p className="text-sm text-gray-400 font-medium tracking-widest mb-8 uppercase leading-relaxed max-w-md">
            UPLOAD SUSPECTED MEDIA (VIDEO/IMAGE) FOR FORENSIC ANALYSIS. 
            SYSTEM AUTOMATICALLY CLASSIFIES DEEPFAKES AND SCAMS.
          </p>

          <div
            className={`flex-1 relative flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 ${
              isDragging ? "border-white bg-white/5 scale-[1.02]" : "border-white/20 bg-transparent hover:border-white/50"
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
              <div className="w-full px-12 text-center space-y-6">
                <p className="text-white font-bold tracking-widest text-xl animate-pulse">UPLOADING SECURE PAYLOAD...</p>
                <div className="w-full bg-white/10 h-1 overflow-hidden">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-sm font-bold text-gray-400 tracking-widest">{uploadProgress}% COMPLETE</p>
              </div>
            ) : (
              <div className="text-center px-4">
                <svg className="w-12 h-12 mx-auto text-gray-500 mb-6 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-2xl font-black text-white mb-2 tracking-widest uppercase">
                  {isDragging ? "DROP PAYLOAD" : "SELECT MEDIA"}
                </p>
                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-4">
                  SUPPORTED: {ALLOWED_EXTENSIONS}
                </p>
                <p className="text-xs font-bold text-gray-600 tracking-widest uppercase mt-1">
                  MAX {MAX_FILE_SIZE_MB}MB
                </p>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 border border-red-500 bg-red-500/10 px-4 py-3 text-xs font-bold tracking-widest text-red-500 uppercase text-center">
              ERROR: {error}
            </div>
          )}
        </div>

        {/* Geo Mapping Panel */}
        <div className="spacex-panel p-8 flex flex-col min-h-[500px] relative">
          <div className="flex justify-between items-center mb-6 z-10 relative">
            <h2 className="text-sm font-black tracking-[0.2em] text-white uppercase">Live Telemetry</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 animate-pulse-slow"></span>
              <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Scam Hotspots</span>
            </div>
          </div>
          
          <div className="flex-1 border border-white/10 relative overflow-hidden bg-[#050505] flex items-center justify-center">
            {/* Mocked Radar / Map Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at center, transparent 0%, #000 100%), repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)'
            }}></div>
            
            {/* SVG Dot Map Representation */}
            <svg viewBox="0 0 800 400" className="w-full h-full opacity-60">
              {/* Very rough abstract map dots - randomly scattered for effect */}
              {Array.from({length: 150}).map((_, i) => (
                <circle 
                  key={i} 
                  cx={100 + Math.random() * 600} 
                  cy={50 + Math.random() * 300} 
                  r="1.5" 
                  fill="rgba(255,255,255,0.3)" 
                />
              ))}
              
              {/* Active Hotspots */}
              <circle cx="350" cy="200" r="4" fill="#ff0000" className="animate-pulse-slow" />
              <circle cx="350" cy="200" r="15" fill="none" stroke="#ff0000" strokeWidth="1" className="animate-ping" style={{ animationDuration: '3s' }} />
              
              <circle cx="420" cy="280" r="3" fill="#ff9900" className="animate-pulse-slow" style={{ animationDelay: '1s' }} />
              <circle cx="420" cy="280" r="10" fill="none" stroke="#ff9900" strokeWidth="1" className="animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
              
              <circle cx="280" cy="150" r="3" fill="#ffffff" className="animate-pulse-slow" style={{ animationDelay: '2s' }} />
            </svg>
            
            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] text-gray-500 font-bold tracking-widest uppercase z-10 relative">
              <span>LAT: 28.6139° N / LNG: 77.2090° E</span>
              <span>12,405 ACTIVE NODES</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Scams Leaderboard */}
      <div className="spacex-panel p-8">
        <div className="flex justify-between items-end border-b border-white/20 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-black tracking-[0.2em] text-white uppercase mb-1">Top Scams Currently</h2>
            <p className="text-xs text-gray-400 tracking-widest uppercase">Auto-updating daily from crowdsourced reports</p>
          </div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase animate-pulse">
            LIVE SYNC
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeScams.map((scam, i) => (
            <div key={scam.id} className="border border-white/10 flex flex-col hover:border-white/30 transition-colors group bg-black/50">
              
              {/* Media Thumbnail */}
              <div className="relative w-full h-40 bg-gray-900 border-b border-white/10 overflow-hidden">
                <img src={scam.thumbnail} alt={scam.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                {scam.mediaType === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-black/50 border border-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-4 h-4 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                   <span className="text-[10px] font-bold text-gray-400 bg-black/80 px-2 py-1">#{i + 1}</span>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-black tracking-widest px-2 py-1 ${
                    scam.type === 'DEEPFAKE' ? 'bg-red-500 text-black' : 
                    scam.type === 'PHISHING' ? 'bg-orange-500 text-black' : 
                    'bg-white text-black'
                  }`}>
                    {scam.type}
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-white tracking-wider mb-2 truncate" title={scam.name}>
                  {scam.name}
                </h3>
                
                <div className="flex justify-between items-end mt-auto pt-4">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-1">REPORT COUNT</p>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-2xl font-black text-white group-hover:text-red-500 transition-colors">{scam.reports.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold tracking-widest ${scam.status === 'VERIFIED' ? 'text-red-500' : 'text-yellow-500'}`}>
                    [{scam.status}]
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
