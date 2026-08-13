"use client";

import React from "react";
import { Zap, Play, ArrowRight, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { CyberIcon, CyberIconType } from "@/components/CyberIcons";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Chip } from "@/components/atoms/Chip";
import { OCRDossierResult } from "./OCRDossier";
import { cn } from "@/lib/utils";

export interface BenchmarkPreset {
  id: string;
  modality: "video" | "image" | "audio" | "text";
  title: string;
  subtitle: string;
  category: string;
  threatScore: number;
  confidence: string;
  verdict: string;
  tag: string;
  videoFileName?: string;
  audioFileName?: string;
  ocrData?: OCRDossierResult;
  textContent?: {
    text: string;
    city?: string;
  };
}

export const BENCHMARK_PRESETS: BenchmarkPreset[] = [
  // ── VIDEO PRESETS ──
  {
    id: "video_sudha_murty",
    modality: "video",
    title: "Sudha Murty Stock Deepfake",
    subtitle: "AI Face Swap & GAN Residual Artifacts",
    category: "DEEPFAKE_IMPERSONATION",
    threatScore: 98,
    confidence: "98.2%",
    verdict: "CRITICAL DEEPFAKE",
    tag: "InSwapper / RoOP",
    videoFileName: "Sudha_Murty_Stock_Deepfake.mp4",
  },
  {
    id: "video_cbi_arrest",
    modality: "video",
    title: "CBI Digital Arrest Video",
    subtitle: "Neural Lip-Sync in Police Uniform",
    category: "DIGITAL_ARREST",
    threatScore: 99,
    confidence: "99.1%",
    verdict: "CRITICAL DEEPFAKE",
    tag: "SadTalker / LivePortrait",
    videoFileName: "CBI_Digital_Arrest_Video.mp4",
  },
  {
    id: "video_authentic_news",
    modality: "video",
    title: "Authentic News Anchor",
    subtitle: "Continuous Camera Sensor Noise",
    category: "AUTHENTIC_MEDIA",
    threatScore: 4,
    confidence: "96.4%",
    verdict: "AUTHENTIC VIDEO",
    tag: "Broadcast Feed",
    videoFileName: "Authentic_News_Anchor.mp4",
  },

  // ── IMAGE OCR PRESETS ──
  {
    id: "image_electricity_kyc",
    modality: "image",
    title: "WhatsApp Electricity KYC Screenshot",
    subtitle: "PaddleOCR Extraction + Fraud UPI & APK",
    category: "ELECTRICITY_KYC",
    threatScore: 96,
    confidence: "96.0%",
    verdict: "CRITICAL SCAM / PHISHING SCREENSHOT",
    tag: "PaddleOCR + Threat ML",
    ocrData: {
      status: "success",
      filename: "WhatsApp_Electricity_KYC_Screenshot.png",
      ocr_analysis: {
        engine: "PaddleOCR v2.7",
        full_text: "URGENT NOTICE: ELECTRICITY POWER BILL. Your connection will be disconnected at 9:30 PM tonight. Call Officer Ramesh at 9876543210 or install bses-update.apk. Pay UPI: electricity.officer@okhdfcbank",
        lines_count: 4,
        processing_time_ms: 118,
      },
      scam_analysis: {
        is_scam: true,
        risk_score: 96,
        risk_level: "CRITICAL",
        verdict: "CRITICAL SCAM SCREENSHOT (PADDLEOCR + THREAT ENGINE)",
        scam_type: "ELECTRICITY_KYC_EXTORTION",
        matched_rules: [
          "Urgent disconnection deadline coercion (9:30 PM)",
          "Malicious APK sideloading attachment (bses-update.apk)",
          "Fraudulent unverified UPI gateway handle (electricity.officer@okhdfcbank)",
        ],
        analysis_reason: "High-urgency utility scam extracting net banking credentials via malicious APK download and unverified UPI gateway.",
      },
      extracted_iocs: {
        phones: ["9876543210"],
        upis: ["electricity.officer@okhdfcbank"],
        apks: ["bses-update.apk"],
        urls: [],
      },
      recommendation: "Immediate Section 65B FIR recommended. Block phone 9876543210 and revoke UPI VPA.",
    },
  },
  {
    id: "image_cbi_warrant",
    modality: "image",
    title: "Digital Arrest CBI Warrant Notice",
    subtitle: "Forged Legal Seal & Customs Extortion",
    category: "DIGITAL_ARREST",
    threatScore: 99,
    confidence: "99.0%",
    verdict: "FORGED LEGAL WARRANT / EXTORTION SCAM",
    tag: "PaddleOCR Forgery Scan",
    ocrData: {
      status: "success",
      filename: "Digital_Arrest_CBI_Warrant_Notice.jpg",
      ocr_analysis: {
        engine: "PaddleOCR v2.7",
        full_text: "CENTRAL BUREAU OF INVESTIGATION - NON-BAILABLE ARREST NOTICE. Parcel #IND-991 seized at Mumbai Customs with narcotics. Contact Skype @cbi_officer99 or transfer bail deposit ₹5,00,000 to CBI Escrow account immediately.",
        lines_count: 5,
        processing_time_ms: 135,
      },
      scam_analysis: {
        is_scam: true,
        risk_score: 99,
        risk_level: "CRITICAL",
        verdict: "CRITICAL DIGITAL ARREST EXTORTION WARRANT",
        scam_type: "DIGITAL_ARREST_EXTORTION",
        matched_rules: [
          "Impersonation of law enforcement agency (CBI / Customs)",
          "Digital arrest extortion via video calling / Skype handle",
          "Demanding financial transfer to fictitious bail deposit",
        ],
        analysis_reason: "Classic Digital Arrest intimidation tactic leveraging forged government emblems to demand immediate wire transfer.",
      },
      extracted_iocs: {
        phones: ["9811002233"],
        upis: ["cbi.bail.settlement@paytm"],
        apks: [],
        urls: ["https://cbi-verification-portal.fake"],
      },
      recommendation: "High-priority national alert. Submit intelligence to National Cyber Crime Reporting Portal (I4C).",
    },
  },
  {
    id: "image_authentic_bank",
    modality: "image",
    title: "Authentic Bank Statement",
    subtitle: "Legitimate HDFC Banking Document",
    category: "AUTHENTIC_MEDIA",
    threatScore: 4,
    confidence: "98.5%",
    verdict: "AUTHENTIC DOCUMENT / CLEAN OCR",
    tag: "PaddleOCR Clean",
    ocrData: {
      status: "success",
      filename: "Authentic_Bank_Statement.jpg",
      ocr_analysis: {
        engine: "PaddleOCR v2.7",
        full_text: "HDFC BANK OFFICIAL MONTHLY STATEMENT - Account ending in 4910. Total balance ₹42,500. Branch: Connaught Place, New Delhi. Verified digital cryptographic signature present.",
        lines_count: 3,
        processing_time_ms: 92,
      },
      scam_analysis: {
        is_scam: false,
        risk_score: 4,
        risk_level: "LOW",
        verdict: "AUTHENTIC DOCUMENT / VERIFIED CLEAN",
        scam_type: "CLEAN_FINANCIAL_DOC",
        matched_rules: [],
        analysis_reason: "Document contains standard legitimate banking syntax without coercion or unauthorized exfiltration triggers.",
      },
      extracted_iocs: {
        phones: [],
        upis: [],
        apks: [],
        urls: ["https://www.hdfcbank.com"],
      },
      recommendation: "Standard legitimate document signature. No threat detected.",
    },
  },

  // ── AUDIO PRESETS ──
  {
    id: "audio_child_emergency",
    modality: "audio",
    title: "Child Hospital Emergency Clone",
    subtitle: "ElevenLabs Neural Vocoder Synthesis",
    category: "VOICE_CLONE",
    threatScore: 98,
    confidence: "98.8%",
    verdict: "SYNTHETIC VOICE CLONE",
    tag: "ElevenLabs v2",
    audioFileName: "Child_Hospital_Emergency_Clone.wav",
  },
  {
    id: "audio_bank_manager",
    modality: "audio",
    title: "Bank Manager Bail Extortion Call",
    subtitle: "RVC Pitch Conversion & Vocoder Artifacts",
    category: "VOICE_CLONE",
    threatScore: 96,
    confidence: "96.2%",
    verdict: "AI VOICE CLONE",
    tag: "RVC v2 Model",
    audioFileName: "Bank_Manager_Bail_Call.mp3",
  },
  {
    id: "audio_real_speech",
    modality: "audio",
    title: "Real Human Speech Sample",
    subtitle: "Organic Micro-Glottal Variance",
    category: "AUTHENTIC_MEDIA",
    threatScore: 5,
    confidence: "95.1%",
    verdict: "AUTHENTIC VOICE",
    tag: "Natural Speech",
    audioFileName: "Real_Human_Speech_Sample.wav",
  },

  // ── TEXT PRESETS ──
  {
    id: "text_electricity_sms",
    modality: "text",
    title: "Electricity Disconnection SMS",
    subtitle: "Phishing Text with APK Sideload & Contact",
    category: "ELECTRICITY_KYC",
    threatScore: 98,
    confidence: "98.5%",
    verdict: "CRITICAL PHISHING PAYLOAD",
    tag: "SMS Phishing",
    textContent: {
      text: "Dear customer, your electricity power will be disconnected at 9:30 PM tonight due to pending bill from previous month. Immediately call officer Sharma at 9876543210 or install bses-update.apk to avoid black-out.",
      city: "New Delhi",
    },
  },
  {
    id: "text_digital_arrest",
    modality: "text",
    title: "Digital Arrest Customs Alert",
    subtitle: "Narcotics Parcel Coercion & Skype Call",
    category: "DIGITAL_ARREST",
    threatScore: 99,
    confidence: "99.2%",
    verdict: "CRITICAL EXTORTION THREAT",
    tag: "WhatsApp Syndicate",
    textContent: {
      text: "CBI Customs Department: Parcel #IND-9821 addressed to your Aadhaar containing illegal MDMA contraband intercepted at Mumbai Air Cargo. Join Skype video interrogation room @cbi_officer99 immediately or non-bailable warrant will be issued in 30 minutes.",
      city: "Mumbai",
    },
  },
  {
    id: "text_sebi_stock",
    modality: "text",
    title: "SEBI Guaranteed Stock Advisory",
    subtitle: "Pump & Dump Telegram Channel Invite",
    category: "INVESTMENT_FRAUD",
    threatScore: 94,
    confidence: "94.0%",
    verdict: "HIGH-RISK INVESTMENT FRAUD",
    tag: "Telegram Blast",
    textContent: {
      text: "SEBI VIP Insider Stock Alert: Buy shares of TARGET-CO today at ₹42 for guaranteed 500% profit in 48 hours. Exclusive institutional allocation group link: https://t.me/sebi_vip_signals",
      city: "Bengaluru",
    },
  },
];

export interface BenchmarkPresetsProps {
  currentModality: "video" | "image" | "audio" | "text";
  onSelectPreset: (preset: BenchmarkPreset) => void;
  className?: string;
}

export function BenchmarkPresets({
  currentModality,
  onSelectPreset,
  className,
}: BenchmarkPresetsProps) {
  const filteredPresets = BENCHMARK_PRESETS.filter(
    (p) => p.modality === currentModality
  );

  return (
    <div className={cn("space-y-3 font-sans", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
          1-Click Benchmark Presets ({currentModality.toUpperCase()})
        </span>
        <span className="text-[11px] text-ink-3">Instant Hardware Verification</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {filteredPresets.map((preset) => {
          const isCritical = preset.threatScore >= 75;
          const isSafe = preset.threatScore < 20;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={cn(
                "group relative flex flex-col justify-between gap-3 p-3.5 rounded-xl text-left select-none",
                "bg-[var(--inset)]/40 hover:bg-[var(--hover)]/60 border-[1.5px] border-[var(--line)] hover:border-[var(--brand-cyan)]/60",
                "shadow-card transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-medium text-ink-3 uppercase truncate">
                    {preset.tag}
                  </span>
                  <StatusPill
                    tone={isCritical ? "critical" : isSafe ? "active" : "warning"}
                    size="sm"
                    className="text-[10px] px-1.5 h-4.5 shrink-0"
                  >
                    {preset.confidence}
                  </StatusPill>
                </div>

                <div className="font-semibold text-xs text-ink group-hover:text-[var(--accent-ink)] transition-colors line-clamp-1">
                  {preset.title}
                </div>

                <p className="text-[11px] text-ink-3 leading-tight line-clamp-1">
                  {preset.subtitle}
                </p>
              </div>

              <div className="flex items-center justify-between w-full pt-2 border-t border-[var(--line)]/60 text-[11px]">
                <span className="font-mono text-[10.5px] text-ink-2 truncate">
                  {preset.verdict}
                </span>
                <span className="font-medium text-[var(--accent)] group-hover:text-[var(--accent-ink)] flex items-center gap-1 shrink-0 ml-1">
                  <span>Run</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BenchmarkPresets;
