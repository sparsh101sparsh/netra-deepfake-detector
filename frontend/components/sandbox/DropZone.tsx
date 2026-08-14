"use client";

import React, { useRef, useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, AlertTriangle, FileCheck, RefreshCw } from "lucide-react";
import { CyberIcon, CyberIconType } from "@/components/CyberIcons";
import { Chip } from "@/components/atoms/Chip";
import { StatusPill } from "@/components/atoms/StatusPill";
import { cn } from "@/lib/utils";

export type SandboxModality = "video" | "image" | "audio";

export interface ModalityConfig {
  label: string;
  iconName: CyberIconType;
  acceptMimes: string[];
  acceptExtensions: string[];
  maxSizeMb: number;
  title: string;
  subtitle: string;
  engineBadge: string;
}

export const MODALITY_CONFIGS: Record<SandboxModality, ModalityConfig> = {
  video: {
    label: "Video Deepfake",
    iconName: "video",
    acceptMimes: ["video/mp4", "video/quicktime", "video/webm", "video/avi", "video/x-msvideo"],
    acceptExtensions: [".mp4", ".mov", ".webm", ".avi"],
    maxSizeMb: 100,
    title: "Drop video or browse files",
    subtitle: "Checks for deepfake faces, artificial editing, and voice-lip mismatch.",
    engineBadge: "AI Video Analysis Engine",
  },
  image: {
    label: "Image / Screenshot",
    iconName: "image",
    acceptMimes: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/bmp"],
    acceptExtensions: [".png", ".jpg", ".webp", ".jpeg"],
    maxSizeMb: 50,
    title: "Drop screenshot or browse files",
    subtitle: "Reads text to find scam messages, fake official notices, and fraud payment links.",
    engineBadge: "Text & Image Analysis Engine",
  },
  audio: {
    label: "Audio / Voice Clone",
    iconName: "audio",
    acceptMimes: ["audio/wav", "audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/opus"],
    acceptExtensions: [".wav", ".mp3", ".m4a", ".ogg", ".opus"],
    maxSizeMb: 50,
    title: "Drop WhatsApp voice note, audio or browse",
    subtitle: "Detects AI voice cloning, neural vocoder pitch flattening, and synthetic audio spoofing.",
    engineBadge: "Neural Vocoder Engine",
  },
};

export interface DropZoneProps {
  modality: SandboxModality;
  isUploading?: boolean;
  uploadProgress?: number;
  onFileSelect: (file: File) => void;
  error?: string | null;
  className?: string;
}

export function DropZone({
  modality,
  isUploading = false,
  uploadProgress = 0,
  onFileSelect,
  error: externalError,
  className,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileThumbnail, setFileThumbnail] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: string } | null>(null);

  const config = MODALITY_CONFIGS[modality];
  const activeError = externalError || validationError;

  const generateThumbnail = (file: File) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFileThumbnail(url);
    } else if (file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|webm|avi)$/i)) {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        const videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;

        video.onloadeddata = () => {
          video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(video.videoWidth || 320, 640);
            canvas.height = Math.min(video.videoHeight || 180, 360);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              setFileThumbnail(canvas.toDataURL("image/jpeg", 0.85));
            }
          } catch {
            // Cross-origin or canvas error fallback
          } finally {
            URL.revokeObjectURL(videoUrl);
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(videoUrl);
        };
      } catch {
        setFileThumbnail(null);
      }
    } else {
      setFileThumbnail(null);
    }
  };

  const validateAndDispatch = (file: File) => {
    setValidationError(null);

    // Validate size
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > config.maxSizeMb) {
      setValidationError(
        `File too large (${sizeMb.toFixed(1)}MB). Maximum allowed for ${config.label} is ${config.maxSizeMb}MB.`
      );
      return;
    }

    // Validate type / extension
    const fileName = file.name.toLowerCase();
    const hasValidExt = config.acceptExtensions.some((ext) => fileName.endsWith(ext));
    const hasValidMime = config.acceptMimes.includes(file.type);

    if (!hasValidExt && !hasValidMime && file.type !== "") {
      setValidationError(
        `Unsupported file type (${file.type || fileName.split(".").pop()}). Allowed formats: ${config.acceptExtensions.join(", ")}`
      );
      return;
    }

    setCurrentFile({
      name: file.name,
      size: `${sizeMb.toFixed(1)} MB`,
    });
    generateThumbnail(file);

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndDispatch(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndDispatch(e.target.files[0]);
      // Reset input value so re-selecting same file triggers change
      e.target.value = "";
    }
  };

  const triggerBrowse = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("w-full flex flex-col gap-3 font-sans", className)}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={config.acceptExtensions.join(",")}
        onChange={handleFileInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={triggerBrowse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerBrowse();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center text-center select-none cursor-pointer",
          "border-[1.5px] border-dashed rounded-xl p-8 sm:p-10 transition-all duration-200",
          "bg-canvas/50 hover:bg-hover/40",
          isDragOver
            ? "border-white/40 bg-hover/60 scale-[0.99] shadow-card"
            : "border-line hover:border-white/20",
          isUploading && "pointer-events-none opacity-90"
        )}
      >
        {/* Modality Icon Badge */}
        <div className="relative mb-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
              "bg-[#18181B] border border-white/10 shadow-card text-white",
              isDragOver && "scale-110 border-white/30 shadow-card"
            )}
          >
            <CyberIcon name={config.iconName} size={28} />
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#18181B] border border-white/10 text-zinc-400">
            <UploadCloud className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Primary Title */}
        <div className="space-y-1.5 max-w-lg">
          <div className="text-base sm:text-lg font-semibold text-ink tracking-tight">
            {config.title}
          </div>
          <p className="text-xs text-ink-2 leading-relaxed">
            {config.subtitle}
          </p>
        </div>

        {/* Accepted Format Chips & Size Badge */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {config.acceptExtensions.map((ext) => (
            <Chip key={ext} tone="neutral" size="sm" mono className="text-[11px]">
              {ext}
            </Chip>
          ))}
          <Chip tone="neutral" size="sm" mono className="text-[11px] text-white bg-[#27272A] border-white/10">
            Max {config.maxSizeMb}MB
          </Chip>
        </div>



        {/* Upload / In-Flight Processing Bar with Real Thumbnail Preview */}
        {isUploading && (
          <div className="mt-6 w-full max-w-md rounded-xl bg-surface border-[1.5px] border-line p-3.5 shadow-card animate-in fade-in duration-200 space-y-3">
            <div className="flex items-center gap-3">
              {fileThumbnail ? (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-line bg-black/60">
                  <img
                    src={fileThumbnail}
                    alt="File thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.5 rounded bg-black/80 text-white font-semibold uppercase">
                    {modality}
                  </span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-inset border border-line text-ink-2">
                  <CyberIcon name={config.iconName} size={20} />
                </div>
              )}

              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold text-ink truncate">
                  {currentFile?.name || "Processing selected file..."}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-ink-3 font-mono">
                    {currentFile?.size || ""}
                  </span>
                  <span className="text-[11px] text-accent flex items-center gap-1 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {modality === "video"
                      ? "NETRA AI is scanning video frames for deepfakes..."
                      : modality === "image"
                      ? "NETRA AI is analyzing image & text..."
                      : "NETRA AI is analyzing voice recording..."}
                  </span>
                </div>
              </div>

              <span className="font-mono text-xs font-bold text-ink tabular-nums">
                {uploadProgress}%
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset border border-line">
              <div
                className="h-full bg-gradient-to-r from-accent to-sky-400 transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Pill */}
      {activeError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-tint border-[1.5px] border-red/30 px-3.5 py-2.5 text-xs text-red animate-in fade-up duration-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1 font-medium">{activeError}</span>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-[11px] font-bold text-red underline hover:no-underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default DropZone;
