"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react";

interface ResilientVideoPlayerProps {
  primaryUrl?: string | null;
  fallbackUrl?: string | null;
  poster?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null> | React.RefObject<HTMLVideoElement> | null;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  className?: string;
  controls?: boolean;
  playsInline?: boolean;
  autoPlay?: boolean;
}

export function ResilientVideoPlayer({
  primaryUrl,
  fallbackUrl,
  poster,
  videoRef: externalRef,
  onLoadedMetadata,
  onTimeUpdate,
  className = "w-full h-full object-contain",
  controls = true,
  playsInline = true,
  autoPlay = false,
}: ResilientVideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = externalRef || internalRef;

  // Ordered candidate sources to try
  const sources = useMemo(() => {
    const list: string[] = [];
    if (primaryUrl) list.push(primaryUrl);
    if (fallbackUrl && !list.includes(fallbackUrl)) list.push(fallbackUrl);
    return list;
  }, [primaryUrl, fallbackUrl]);

  const [sourceIndex, setSourceIndex] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Synchronize when sources or retryCount changes
  useEffect(() => {
    setSourceIndex(0);
    setHasError(sources.length === 0);
    setIsLoading(sources.length > 0);
  }, [primaryUrl, fallbackUrl, retryCount]);

  const currentSrc = sources[sourceIndex] || null;

  // Handle playback error: failover to next candidate source
  const handleError = useCallback(() => {
    const videoEl = activeRef.current;
    console.warn(
      "[NETRA VideoPlayer] Playback failed for source index",
      sourceIndex,
      currentSrc,
      "videoError:",
      videoEl?.error?.message || videoEl?.error?.code
    );

    if (sourceIndex + 1 < sources.length) {
      const nextSrc = sources[sourceIndex + 1];
      console.info("[NETRA VideoPlayer] Failing over to next source:", nextSrc);
      setSourceIndex((prev) => prev + 1);
      setIsLoading(true);
      setHasError(false);
      if (videoEl) {
        videoEl.load();
        if (autoPlay) {
          videoEl.play().catch(() => {});
        }
      }
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [sourceIndex, sources, currentSrc, autoPlay, activeRef]);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    if (autoPlay && activeRef.current) {
      activeRef.current.play().catch(() => {});
    }
  }, [autoPlay, activeRef]);

  const handleManualRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none group">
      {currentSrc && !hasError && (
        <video
          ref={activeRef as React.LegacyRef<HTMLVideoElement>}
          src={currentSrc}
          poster={poster}
          autoPlay={autoPlay}
          controls={controls}
          playsInline={playsInline}
          preload="auto"
          onLoadedMetadata={onLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={handleCanPlay}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onTimeUpdate={onTimeUpdate}
          onError={handleError}
          className={className}
        />
      )}

      {/* Loading Spinner Overlay */}
      {isLoading && !hasError && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      )}

      {/* Clean Playback Error State (No Gimmick / No Neural Proxy) */}
      {hasError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-sm font-medium text-white">Video Playback Unavailable</h4>
            <p className="text-xs text-zinc-400">
              The media recording could not be loaded or is currently unreachable.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleManualRetry}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>

            {(currentSrc || fallbackUrl || primaryUrl) && (
              <a
                href={fallbackUrl || currentSrc || primaryUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-white/5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
