"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, RefreshCw, ShieldCheck, ExternalLink } from "lucide-react";

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

  const [activeSrc, setActiveSrc] = useState<string | null>(primaryUrl || fallbackUrl || null);
  const [streamMode, setStreamMode] = useState<"primary" | "fallback" | "error">("primary");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  // Sync state when primaryUrl or fallbackUrl prop updates
  useEffect(() => {
    if (primaryUrl) {
      setActiveSrc(primaryUrl);
      setStreamMode("primary");
      setErrorMessage(null);
      setIsLoading(true);
    } else if (fallbackUrl) {
      setActiveSrc(fallbackUrl);
      setStreamMode("fallback");
      setErrorMessage(null);
      setIsLoading(true);
    }
  }, [primaryUrl, fallbackUrl, retryKey]);

  // Handle media error on the video element
  const handleError = useCallback(
    () => {
      const videoEl = activeRef.current;
      const mediaError = videoEl?.error;
      console.warn(
        `[NETRA VideoPlayer] Playback issue on mode "${streamMode}":`,
        mediaError?.message || "Unknown error",
        "code:", mediaError?.code
      );

      if (streamMode === "primary" && fallbackUrl && fallbackUrl !== activeSrc) {
        console.info("[NETRA VideoPlayer] Automatically failing over to backend streaming proxy:", fallbackUrl);
        setStreamMode("fallback");
        setActiveSrc(fallbackUrl);
        setIsLoading(true);
        setErrorMessage(null);
      } else {
        setStreamMode("error");
        setIsLoading(false);
        setErrorMessage("Direct video playback encountered a network or format error.");
      }
    },
    [streamMode, fallbackUrl, activeSrc, activeRef]
  );

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    setErrorMessage(null);
  }, []);

  const handleManualRetry = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setStreamMode("primary");
    setActiveSrc(primaryUrl || fallbackUrl || null);
    setRetryKey((prev) => prev + 1);

    if (activeRef.current) {
      activeRef.current.load();
      activeRef.current.play().catch(() => {});
    }
  }, [primaryUrl, fallbackUrl, activeRef]);

  const handleSwitchToFallback = useCallback(() => {
    if (fallbackUrl) {
      setStreamMode("fallback");
      setActiveSrc(fallbackUrl);
      setIsLoading(true);
      setErrorMessage(null);
      if (activeRef.current) {
        activeRef.current.load();
        activeRef.current.play().catch(() => {});
      }
    }
  }, [fallbackUrl, activeRef]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none group">
      {activeSrc && (
        <video
          key={`${activeSrc}-${retryKey}`}
          ref={activeRef as React.LegacyRef<HTMLVideoElement>}
          src={activeSrc}
          poster={poster}
          autoPlay={autoPlay}
          controls={controls}
          playsInline={playsInline}
          crossOrigin="anonymous"
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={() => setIsLoading(false)}
          onTimeUpdate={onTimeUpdate}
          onError={handleError}
          className={className}
        />
      )}

      {/* Stream Protocol Indicator Badge (Top Right) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none z-10 transition-opacity duration-300">
        {streamMode === "primary" && !isLoading && !errorMessage && (
          <div className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>DIRECT S3 STREAM</span>
          </div>
        )}
        {streamMode === "fallback" && !errorMessage && (
          <div className="px-2 py-0.5 rounded-md bg-accent/20 border border-accent/40 text-[10px] font-mono text-accent flex items-center gap-1 backdrop-blur-md">
            <ShieldCheck className="w-3 h-3 text-accent" />
            <span>NEURAL PROXY ACTIVE</span>
          </div>
        )}
      </div>

      {/* Fallback Warning Toast Bar if using proxy */}
      {streamMode === "fallback" && !errorMessage && !isLoading && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface/90 border border-accent/40 text-[11px] font-mono text-ink-2 shadow-lg backdrop-blur-md flex items-center gap-2 pointer-events-none z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span>Secured via HTTP 206 Neural Streaming Proxy</span>
        </div>
      )}

      {/* Interactive Error Recovery Overlay */}
      {streamMode === "error" && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 space-y-3 animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-sm font-semibold text-ink">Video Playback Interrupted</h4>
            <p className="text-xs text-ink-3">
              {errorMessage || "Unable to stream video using current protocol."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={handleManualRetry}
              className="px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Playback</span>
            </button>

            {fallbackUrl && (
              <button
                onClick={handleSwitchToFallback}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-line text-ink-2 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                <span>Use Neural Proxy</span>
              </button>
            )}

            {(activeSrc || fallbackUrl) && (
              <a
                href={fallbackUrl || activeSrc || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-line text-ink-3 hover:text-ink-2 text-xs flex items-center gap-1.5 transition-all"
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
