"use client";

import React, { useState } from "react";
import { 
  Phone, CreditCard, Link2, Box, Copy, Check, ShieldAlert, 
  FileText, Sparkles, X, AlertCircle, ArrowUpRight 
} from "lucide-react";
import { CyberIcon } from "@/components/CyberIcons";
import { StatusPill, StatusPillTone } from "@/components/atoms/StatusPill";
import { Chip } from "@/components/atoms/Chip";
import { Button } from "@/components/atoms/Button";
import { TaskRows, TaskRow } from "@/components/primitives/TaskRows";
import { cn } from "@/lib/utils";

export interface ExtractedIOCs {
  phones?: string[];
  upis?: string[];
  urls?: string[];
  apks?: string[];
}

export interface OCRAnalysisData {
  engine?: string;
  full_text?: string;
  lines_count?: number;
  processing_time_ms?: number;
}

export interface ScamAnalysisData {
  is_scam?: boolean;
  risk_score?: number;
  risk_level?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE" | string;
  verdict?: string;
  scam_type?: string;
  matched_rules?: string[];
  analysis_reason?: string;
}

export interface OCRDossierResult {
  status?: string;
  filename?: string;
  ocr_analysis?: OCRAnalysisData;
  scam_analysis?: ScamAnalysisData;
  extracted_iocs?: ExtractedIOCs;
  recommendation?: string;
}

export interface OCRDossierProps {
  data: OCRDossierResult;
  onReset?: () => void;
  className?: string;
}

export function OCRDossier({ data, onReset, className }: OCRDossierProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ocr = data.ocr_analysis || {};
  const scam = data.scam_analysis || {};
  const iocs = data.extracted_iocs || {};

  const riskScore = Math.min(100, Math.max(0, scam.risk_score ?? 0));
  const riskLevel = scam.risk_level?.toUpperCase() || (riskScore >= 75 ? "CRITICAL" : riskScore >= 40 ? "HIGH" : riskScore >= 20 ? "MEDIUM" : "LOW");
  
  const getStatusTone = (): StatusPillTone => {
    if (riskLevel === "CRITICAL" || riskScore >= 75) return "critical";
    if (riskLevel === "HIGH" || riskScore >= 40) return "orange";
    if (riskLevel === "MEDIUM" || riskScore >= 20) return "warning";
    return "active";
  };

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const phoneCount = iocs.phones?.length || 0;
  const upiCount = iocs.upis?.length || 0;
  const urlCount = iocs.urls?.length || 0;
  const apkCount = iocs.apks?.length || 0;
  const totalIOCs = phoneCount + upiCount + urlCount + apkCount;

  // Build forensic TaskRows checklist from genuine matched rules
  const matchedRules = scam.matched_rules || [];
  const taskRows: TaskRow[] = [
    {
      key: "ocr_extraction",
      label: "Image Text Scanning",
      amount: `${ocr.lines_count || 1} lines`,
      status: "done",
      details: [
        { label: "Scan Time", meta: `${ocr.processing_time_ms || 120}ms` },
        { label: "Characters Detected", meta: `${ocr.full_text?.length || 0} chars` },
      ],
    },
    {
      key: "ioc_triage",
      label: "Contact, Payment & Link Detection",
      amount: `${totalIOCs} details found`,
      status: totalIOCs > 0 && scam.is_scam ? "failed" : "done",
      details: matchedRules.length > 0
        ? matchedRules.map((rule, idx) => ({ label: `Safety Rule #${idx + 1}`, meta: rule }))
        : [{ label: "Status", meta: totalIOCs > 0 ? "Suspicious details found" : "Clean — no suspect details found" }],
    },
    {
      key: "threat_scoring",
      label: "Overall Scam Risk Assessment",
      amount: `${riskScore}%`,
      status: scam.is_scam ? "failed" : "done",
      details: [
        { label: "Category", meta: scam.scam_type || "SUSPICIOUS_IMAGE" },
        { label: "Summary", meta: scam.verdict || "Analysis complete" },
      ],
    },
  ];

  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--surface)] border-[1.5px] border-[var(--border)] shadow-card p-5 sm:p-6 flex flex-col gap-5 font-sans animate-in fade-up duration-300",
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] border-[1.5px] border-[var(--border)] text-[var(--accent)] shadow-card">
            <CyberIcon name="chip" size={20} glow />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)]">
                Text Scanner
              </span>
              <span className="text-[11px] text-ink-3 font-mono">• {data.filename || "Uploaded Screenshot"}</span>
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-ink tracking-tight mt-0.5">
              {scam.verdict || "Image Analysis Complete"}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <StatusPill tone={getStatusTone()} size="md" pulse={scam.is_scam}>
            {riskScore}% Risk • {riskLevel}
          </StatusPill>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 hover:bg-[var(--hover)] hover:text-ink transition-colors border border-transparent hover:border-[var(--line)]"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Probability Score Bar */}
      <div className="space-y-1.5 rounded-xl bg-[var(--inset)]/60 border-[1.5px] border-[var(--line)] p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent)]" />
            Scam Risk Level
          </span>
          <span className="font-mono font-semibold text-ink tabular-nums">{riskScore}/100</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--canvas)] border border-[var(--line)]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              riskScore >= 75
                ? "bg-gradient-to-r from-orange to-red"
                : riskScore >= 40
                ? "bg-gradient-to-r from-yellow-500 to-orange"
                : "bg-gradient-to-r from-emerald-500 to-green"
            )}
            style={{ width: `${riskScore}%` }}
          />
        </div>
        {scam.analysis_reason && (
          <p className="text-[11.5px] text-ink-2 pt-1 leading-relaxed">
            {scam.analysis_reason}
          </p>
        )}
      </div>

      {/* Extracted OCR Text Pane */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-ink-3" />
            Extracted Document Text
          </span>
          <span className="font-mono text-[11px] text-ink-3">
            {ocr.full_text?.length || 0} characters
          </span>
        </div>
        <div className="relative rounded-xl bg-[var(--canvas)] border-[1.5px] border-[var(--line)] p-3.5 text-xs text-[var(--accent-ink)] font-mono leading-relaxed max-h-32 overflow-y-auto select-text">
          {ocr.full_text || "No text extracted from document."}
        </div>
      </div>

      {/* Structured Details Chips with 1-Click Copy */}
      {totalIOCs > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange" />
              Detected Scam Details (Phone, UPI, Links)
            </span>
            <span className="font-mono text-[11px] text-ink-3">Click to copy</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {iocs.phones?.map((phone) => (
              <button
                key={`phone-${phone}`}
                type="button"
                onClick={() => handleCopy(phone, `phone-${phone}`)}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-red-tint border-[1.5px] border-red/30 px-2.5 py-1 text-xs font-mono text-red hover:bg-red/20 transition-colors"
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span>{phone}</span>
                {copiedKey === `phone-${phone}` ? (
                  <Check className="w-3 h-3 text-green shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            ))}

            {iocs.upis?.map((upi) => (
              <button
                key={`upi-${upi}`}
                type="button"
                onClick={() => handleCopy(upi, `upi-${upi}`)}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-orange-tint border-[1.5px] border-orange/30 px-2.5 py-1 text-xs font-mono text-orange hover:bg-orange/20 transition-colors"
              >
                <CreditCard className="w-3 h-3 shrink-0" />
                <span>{upi}</span>
                {copiedKey === `upi-${upi}` ? (
                  <Check className="w-3 h-3 text-green shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            ))}

            {iocs.apks?.map((apk) => (
              <button
                key={`apk-${apk}`}
                type="button"
                onClick={() => handleCopy(apk, `apk-${apk}`)}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-purple-tint border-[1.5px] border-purple/30 px-2.5 py-1 text-xs font-mono text-purple hover:bg-purple/20 transition-colors"
              >
                <Box className="w-3 h-3 shrink-0" />
                <span>{apk}</span>
                {copiedKey === `apk-${apk}` ? (
                  <Check className="w-3 h-3 text-green shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            ))}

            {iocs.urls?.map((url) => (
              <button
                key={`url-${url}`}
                type="button"
                onClick={() => handleCopy(url, `url-${url}`)}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-accent-tint border-[1.5px] border-[var(--accent)]/30 px-2.5 py-1 text-xs font-mono text-[var(--accent-ink)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                <Link2 className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[200px]">{url}</span>
                {copiedKey === `url-${url}` ? (
                  <Check className="w-3 h-3 text-green shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Safety Rules (TaskRows primitive) */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-ink-2">
          Safety Checks & Detection Steps
        </span>
        <TaskRows variant="List" rows={taskRows} />
      </div>

      {/* Actionable Recommendation Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[var(--line)] text-xs text-ink-2">
        <span className="text-[11.5px]">
          {data.recommendation || "Verified by NETRA AI security checks."}
        </span>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {scam.is_scam && (
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-red px-3 py-1 text-xs font-semibold text-white hover:brightness-110 shadow-btn transition-all"
            >
              <span>Report to Cybercrime Cell</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
          {onReset && (
            <Button variant="secondary" size="xs" onClick={onReset}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OCRDossier;
