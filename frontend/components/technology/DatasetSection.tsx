"use client";

import React, { useMemo } from "react";
import { 
  Play, Pause, MapPin, Eye, ShieldAlert, 
  Download, Compass, Film, CheckCircle2, ChevronRight 
} from "lucide-react";
import mappingData from "@/public/dataset_100/video_location_metadata_mapping.json";

interface VideoMetadata {
  index: number;
  sorted_index?: number;
  filename: string;
  person_name?: string;
  is_female?: boolean;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  iso6709: string;
  description: string;
  netra_fused_prob?: number;
  confidence_pct?: number;
  risk_level?: string;
  spatial_effnet?: number;
}

export default function DatasetSection() {
  const videos: VideoMetadata[] = useMemo(() => {
    return (mappingData as VideoMetadata[]) || [];
  }, []);

  const sortedVideos = useMemo(() => {
    // Quality-first ordering: high-quality deepfakes first; women deepfakes at the very last
    const nonFemales = videos.filter((x) => !x.is_female);
    const females = videos.filter((x) => x.is_female);

    nonFemales.sort((a, b) => (b.netra_fused_prob ?? 0) - (a.netra_fused_prob ?? 0));
    females.sort((a, b) => (b.netra_fused_prob ?? 0) - (a.netra_fused_prob ?? 0));

    return [...nonFemales, ...females];
  }, [videos]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Dataset Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-card bg-surface border border-line flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-mono text-ink-3 uppercase tracking-wider">Total Video Corpus</div>
            <div className="text-xl font-bold text-ink mt-0.5">100 Sequences</div>
          </div>
          <Film className="size-5 text-accent/70" />
        </div>
        <div className="p-3 rounded-card bg-surface border border-line flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-mono text-ink-3 uppercase tracking-wider">Target Domain</div>
            <div className="text-xl font-bold text-ink mt-0.5">Indian Public Figures</div>
          </div>
          <Eye className="size-5 text-accent/70" />
        </div>
        <div className="p-3 rounded-card bg-surface border border-line flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-mono text-ink-3 uppercase tracking-wider">Geotag Coverage</div>
            <div className="text-xl font-bold text-ink mt-0.5">28 Indian Cities</div>
          </div>
          <MapPin className="size-5 text-accent/70" />
        </div>
        <div className="p-3 rounded-card bg-surface border border-line flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-mono text-ink-3 uppercase tracking-wider">Forensic Benchmark</div>
            <div className="text-xl font-bold text-ink mt-0.5">100% Detected</div>
          </div>
          <CheckCircle2 className="size-5 text-green" />
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedVideos.map((video, idx) => {
          const figureName = video.person_name || video.filename
            .replace(/^deepfake_/, "")
            .replace(/\.mp4$/, "")
            .replace(/_/g, " ");
          const baseName = video.filename.replace(/\.mp4$/, "");
          const posterUrl = `/dataset_100/thumbnails/${baseName}.jpg`;
          
          // Dual source fallback for video playback
          const primarySrc = `/dataset_100/videos/${video.filename}`;
          const fallbackSrc = `/api/videos/${video.filename}`;

          return (
            <div
              key={video.filename}
              className="group rounded-card overflow-hidden bg-surface border border-line hover:border-accent/40 transition-all duration-200 shadow-card flex flex-col"
            >
              {/* Video Player Container */}
              <div className="relative aspect-video bg-black/80 overflow-hidden flex items-center justify-center">
                <video
                  poster={posterUrl}
                  preload="metadata"
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={primarySrc} type="video/mp4" />
                  <source src={fallbackSrc} type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
                <div className="absolute top-2 left-2 z-10 pointer-events-none flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-accent">
                    #{(idx + 1).toString().padStart(3, "0")}
                  </span>
                  {video.is_female && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-purple-950/80 border border-purple-500/30 text-[9.5px] font-mono text-purple-300">
                      FEMALE
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-red-500/80 backdrop-blur-sm text-[9.5px] font-bold uppercase tracking-wider text-white">
                    SYNTHETIC
                  </span>
                </div>
              </div>

              {/* Video Card Details */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-ink truncate group-hover:text-accent transition-colors" title={figureName}>
                      {figureName}
                    </h4>
                    {video.netra_fused_prob && (
                      <span className="shrink-0 text-[10px] font-mono text-green font-semibold">
                        {(video.netra_fused_prob * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-3 mt-1">
                    <MapPin size={11} className="text-accent/80 shrink-0" />
                    <span className="truncate">{video.city}, {video.state}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-line-soft flex items-center justify-between text-[10px] font-mono text-ink-3">
                  <span title={video.iso6709}>
                    {video.latitude.toFixed(2)}° N, {video.longitude.toFixed(2)}° E
                  </span>
                  <a
                    href={primarySrc}
                    download={video.filename}
                    className="flex items-center gap-1 hover:text-accent transition-colors py-0.5 px-1 rounded hover:bg-field"
                    title="Download sequence"
                  >
                    <Download size={10} />
                    <span>MP4</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedVideos.length === 0 && (
        <div className="p-12 text-center rounded-card bg-surface border border-line text-ink-3">
          <Film className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No video sequences available in dataset.</p>
        </div>
      )}
    </div>
  );
}
