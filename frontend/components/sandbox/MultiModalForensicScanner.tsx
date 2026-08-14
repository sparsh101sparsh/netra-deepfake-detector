"use client";

import React, { useState, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { 
  Scan, RefreshCw, Sparkles, Phone, CreditCard, Link2, Box, 
  Check, Copy, ShieldAlert, FileText, Send, AlertTriangle, ArrowRight, Zap, Play, CheckCircle2 
} from "lucide-react";
import { CyberIcon, CyberIconType } from "@/components/CyberIcons";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { StatusPill, StatusPillTone } from "@/components/atoms/StatusPill";
import { Chip } from "@/components/atoms/Chip";
import { Button } from "@/components/atoms/Button";
import { StreamText } from "@/components/primitives/StreamText";
import { ThinkingState, ThinkingRow } from "@/components/primitives/ThinkingState";
import { LoadingState } from "@/components/primitives/LoadingState";
import { TaskRows, TaskRow } from "@/components/primitives/TaskRows";
import { DropZone, SandboxModality } from "./DropZone";
import { OCRDossier, OCRDossierResult } from "./OCRDossier";
import { cn } from "@/lib/utils";

export type ScannerModality = "video" | "image" | "audio" | "text";

const MODALITIES: readonly ScannerModality[] = ["video", "image", "audio", "text"];

export interface MultiModalScannerProps {
  onScanComplete?: (result: any) => void;
  className?: string;
}

export function MultiModalForensicScanner({ onScanComplete, className }: MultiModalScannerProps) {
  const router = useRouter();
  const [activeModality, setActiveModality] = useState<ScannerModality>("video");

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Image OCR Dossier State
  const [imageOcrResult, setImageOcrResult] = useState<OCRDossierResult | null>(null);

  // Text Threat Triage State
  const [rawText, setRawText] = useState("");
  const [textCity, setTextCity] = useState("");
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [textResult, setTextResult] = useState<{
    is_scam: boolean;
    risk_score: number;
    confidence: number;
    verdict: string;
    scam_type?: string | null;
    matched_rules: string[];
    analysis_reason?: string;
    llm_reason?: string | null;
    extracted_iocs: {
      phones: string[];
      upis: string[];
      urls: string[];
      apks: string[];
    };
  } | null>(null);
  const [copiedIocKey, setCopiedIocKey] = useState<string | null>(null);

  // Extract client-side IOCs helper
  const extractClientIOCs = (text: string) => {
    const phones = Array.from(new Set(text.match(/(?:(?:\+91[\-\s]?)?[6-9]\d{9})/g) || []));
    const upis = Array.from(new Set(text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || []));
    const urls = Array.from(new Set(text.match(/https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|t\.me\/[^\s<>"]+/g) || []));
    const apks = Array.from(new Set(text.match(/[\w\-]+\.apk/gi) || []));
    return { phones, upis, urls, apks };
  };

  // Handle File Upload for Video / Image / Audio
  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploadError(null);
      setImageOcrResult(null);
      setIsUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 12, 92));
      }, 140);

      const formData = new FormData();
      formData.append("file", file);

      // ── 1. IMAGE MODALITY: Route to PaddleOCR + Scam Engine ──
      if (activeModality === "image") {
        try {
          const res = await fetch("/api/backend/api/v1/detect/image-ocr", {
            method: "POST",
            body: formData,
          });

          clearInterval(progressInterval);
          setUploadProgress(100);

          if (res.ok) {
            const data: OCRDossierResult = await res.json();
            setImageOcrResult(data);
            onScanComplete?.(data);
            return;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `OCR endpoint returned status ${res.status}`);
        } catch (err: any) {
          clearInterval(progressInterval);
          console.warn("Image OCR error:", err);
          setUploadError(err?.message || "Image OCR forensic node unreachable. Please check backend server.");
          setImageOcrResult(null);
        } finally {
          setIsUploading(false);
        }
        return;
      }

      // ── 2. VIDEO / AUDIO MODALITY: Route to /detect/full ──
      try {
        const res = await fetch("/api/backend/api/v1/detect/full", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (res.ok) {
          const data = await res.json();
          if (data.job_id) {
            router.push(`/analyze/${data.job_id}`);
            return;
          }
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Detection engine returned status ${res.status}`);
      } catch (err: any) {
        clearInterval(progressInterval);
        console.warn("Video/Audio detection dispatch error:", err);
        setUploadError(err?.message || "Forensic pipeline node unreachable. Please ensure backend GPU worker is active.");
      } finally {
        setIsUploading(false);
      }
    },
    [activeModality, router, onScanComplete]
  );

  // ── 3. TEXT THREAT TRIAGE HANDLER ──
  const handleTextTriage = async () => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    setIsAnalyzingText(true);
    setTextResult(null);
    setUploadError(null);

    const iocs = extractClientIOCs(trimmed);

    try {
      const res = await fetch("/api/backend/api/v1/detect/scam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setTextResult({
          ...data,
          extracted_iocs: iocs,
        });
        onScanComplete?.(data);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Scam detection returned status ${res.status}`);
    } catch (err: any) {
      console.warn("Text scam detection error:", err);
      setUploadError(err?.message || "Scam detection engine unreachable. Ensure backend server is running.");
      setTextResult(null);
    } finally {
      setIsAnalyzingText(false);
    }
  };



  const handleCopyIoc = (val: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedIocKey(key);
      setTimeout(() => setCopiedIocKey(null), 2000);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border-[1.5px] border-line shadow-card p-5 sm:p-6 flex flex-col justify-between h-full font-sans gap-5",
        className
      )}
    >
      {/* ── 1. HEADER WITH MODE SWITCHER (SegmentedControl) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 sm:size-10 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-center text-white shrink-0 shadow-card">
            <CyberIcon name="eye" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base sm:text-lg text-ink tracking-tight">
              Forensic Detection Sandbox
            </h3>
            <p className="text-xs text-ink-2 mt-0.5 line-clamp-1">
              {activeModality === "image"
                ? "Text extraction and threat detection from screenshots & images"
                : activeModality === "text"
                ? "Scam message analysis and legal evidence report generation"
                : activeModality === "audio"
                ? "Voice clone and synthetic audio detection"
                : "Deepfake video and facial manipulation detection"}
            </p>
          </div>
        </div>

        {/* 4-Tab Mode Switcher using SegmentedControl */}
        <div className="self-start sm:self-auto">
          <SegmentedControl
            options={MODALITIES}
            value={activeModality}
            onChange={(val) => {
              setActiveModality(val);
              setUploadError(null);
              setImageOcrResult(null);
              setTextResult(null);
            }}
            size="md"
            renderOption={(opt, isSelected) => {
              const iconMap: Record<ScannerModality, CyberIconType> = {
                video: "video",
                image: "image",
                audio: "audio",
                text: "document",
              };
              return (
                <span className="inline-flex items-center gap-1.5 uppercase font-semibold text-[11.5px]">
                  <CyberIcon name={iconMap[opt]} size={13} />
                  <span>{opt}</span>
                </span>
              );
            }}
          />
        </div>
      </div>

      {/* ── 2. MAIN WORKSPACE (MODALITY-DEPENDENT) ── */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {activeModality === "text" ? (
          /* ── TEXT THREAT TRIAGE WORKSPACE ── */
          <div className="space-y-4 flex flex-col justify-center animate-in fade-in duration-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-ink flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-300" />
                  Paste suspicious SMS, WhatsApp message, or notice
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-ink-3">
                    {rawText.length} characters
                  </span>
                  <StatusPill tone="neutral" size="sm">
                    Smart Scan Active
                  </StatusPill>
                </div>
              </div>

              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste suspicious message, SMS, or notice text here..."
                className={cn(
                  "w-full rounded-xl bg-canvas border-[1.5px] border-line p-4",
                  "text-xs sm:text-sm text-ink placeholder:text-ink-3 leading-relaxed",
                  "focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all",
                  "shadow-inset-field"
                )}
              />
            </div>

            {/* Jurisdiction & Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-ink-2">
                <span className="font-medium">City or Region (optional):</span>
                <input
                  type="text"
                  value={textCity}
                  onChange={(e) => setTextCity(e.target.value)}
                  className="rounded-lg bg-canvas border-[1.5px] border-line px-2.5 py-1 text-xs text-ink font-medium focus:outline-none focus:border-white/30 w-36"
                  placeholder="e.g. New Delhi"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                loading={isAnalyzingText}
                leftIcon={<Zap className="w-3.5 h-3.5" />}
                onClick={handleTextTriage}
                disabled={!rawText.trim()}
              >
                Check for Scam
              </Button>
            </div>

            {/* Text Threat Result Dossier */}
            {textResult && (
              <div className="rounded-xl bg-[var(--surface)] border-[1.5px] border-[var(--border)] shadow-card p-4 space-y-3.5 text-xs animate-in fade-up duration-300">
                {/* Result Header */}
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono uppercase font-bold text-[11px] text-[var(--accent)]">
                      {textResult.scam_type || "SUSPICIOUS_MESSAGE"}
                    </span>
                    <span className="text-[11px] text-ink-3">• AI Verified</span>
                  </div>

                  <StatusPill
                    tone={textResult.risk_score >= 75 ? "critical" : textResult.risk_score >= 40 ? "orange" : "active"}
                    size="sm"
                    pulse={textResult.is_scam}
                  >
                    {textResult.risk_score}% Risk Level • {textResult.is_scam ? "SCAM DETECTED" : "SAFE"}
                  </StatusPill>
                </div>

                {/* Thinking Trace (Collapsible Reasoning Tree) */}
                <ThinkingState
                  variant="Reasoning"
                  isProcessing={false}
                  activeLabel="Analyzing message details"
                  doneLabel="Analysis complete"
                  rows={[
                    { primary: "Checking message urgency and pressure tactics", secondary: "Pattern check" },
                    { primary: "Extracting contact numbers, UPI handles & links", secondary: `${(textResult.extracted_iocs?.phones?.length || 0) + (textResult.extracted_iocs?.upis?.length || 0)} details` },
                    { primary: "Cross-referencing known reported scams", secondary: "Scam database" },
                    { primary: "Generating scam risk assessment", secondary: `${textResult.risk_score}% risk` },
                  ]}
                />

                <div className="space-y-1 pt-1 border-t border-line">
                  <div className="font-semibold text-xs text-ink">{textResult.verdict}</div>
                  {textResult.llm_reason && (
                    <div className="text-[12px] text-ink-2 leading-relaxed pt-1 bg-inset/60 p-3 rounded-lg border border-line">
                      <StreamText text={textResult.llm_reason} charsPerTick={3} tickMs={10} />
                    </div>
                  )}
                </div>

                {/* Extracted Details Chips */}
                {textResult.extracted_iocs && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-ink-2">Detected Scam Details (Phone, UPI, Links):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {textResult.extracted_iocs.phones?.map((p) => (
                        <button
                          key={`txt-phone-${p}`}
                          type="button"
                          onClick={() => handleCopyIoc(p, `txt-phone-${p}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-red-tint border-[1.5px] border-red/30 px-2 py-0.5 text-[11px] font-mono text-red hover:bg-red/20 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{p}</span>
                          {copiedIocKey === `txt-phone-${p}` ? (
                            <Check className="w-3 h-3 text-green" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          )}
                        </button>
                      ))}

                      {textResult.extracted_iocs.upis?.map((upi) => (
                        <button
                          key={`txt-upi-${upi}`}
                          type="button"
                          onClick={() => handleCopyIoc(upi, `txt-upi-${upi}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-orange-tint border-[1.5px] border-orange/30 px-2 py-0.5 text-[11px] font-mono text-orange hover:bg-orange/20 transition-colors"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>{upi}</span>
                          {copiedIocKey === `txt-upi-${upi}` ? (
                            <Check className="w-3 h-3 text-green" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          )}
                        </button>
                      ))}

                      {textResult.extracted_iocs.apks?.map((apk) => (
                        <button
                          key={`txt-apk-${apk}`}
                          type="button"
                          onClick={() => handleCopyIoc(apk, `txt-apk-${apk}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-purple-tint border-[1.5px] border-purple/30 px-2 py-0.5 text-[11px] font-mono text-purple hover:bg-purple/20 transition-colors"
                        >
                          <Box className="w-3 h-3" />
                          <span>{apk}</span>
                          {copiedIocKey === `txt-apk-${apk}` ? (
                            <Check className="w-3 h-3 text-green" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          )}
                        </button>
                      ))}

                      {textResult.extracted_iocs.urls?.map((url) => (
                        <button
                          key={`txt-url-${url}`}
                          type="button"
                          onClick={() => handleCopyIoc(url, `txt-url-${url}`)}
                          className="group inline-flex items-center gap-1.5 rounded-lg bg-accent-tint border-[1.5px] border-[var(--accent)]/30 px-2 py-0.5 text-[11px] font-mono text-[var(--accent-ink)] hover:bg-[var(--accent)]/20 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{url}</span>
                          {copiedIocKey === `txt-url-${url}` ? (
                            <Check className="w-3 h-3 text-green" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeModality === "image" && imageOcrResult ? (
          /* ── IMAGE OCR DOSSIER VIEW ── */
          <OCRDossier
            data={imageOcrResult}
            onReset={() => setImageOcrResult(null)}
          />
        ) : (
          /* ── VIDEO / AUDIO / IMAGE DROPZONE ── */
          <DropZone
            modality={activeModality as SandboxModality}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            error={uploadError}
            onFileSelect={handleFileSelect}
          />
        )}
      </div>
    </div>
  );
}

export default MultiModalForensicScanner;
