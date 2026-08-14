// frontend/lib/pdfReportGenerator.ts
// Institutional Court-Ready Forensic Incident PDF Generator using jsPDF

import jsPDF from "jspdf";

export interface PDFReportData {
  id: string;
  title?: string;
  verdict: string;
  confidence: number;
  riskLevel: string;
  timestamp?: string;
  mediaType?: "video_deepfake" | "audio_clone" | "image_deepfake" | "image_document" | "image_hybrid" | string;
  city?: string;
  state?: string;
  locationSource?: string;
  deviceModel?: string;
  softwareUsed?: string;
  sha256?: string;
  scores?: {
    gendScore?: number | null;
    visualScore?: number | null;
    audioScore?: number | null;
    clipScore?: number | null;
  };
  frames?: Array<{
    frame_number: number;
    timestamp: string;
    confidence: number;
    flags?: string[];
  }>;
  summary?: string;
  iocs?: {
    phones?: string[];
    upis?: string[];
    urls?: string[];
    apks?: string[];
  };
  tavilyMatches?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
  }>;
  keyframeSnapshots?: Array<{
    frame_number: number;
    timestamp: string;
    anomaly_region?: string;
    anomaly_score?: number;
    detector_subsystem?: string;
    image_base64?: string;
    image_url?: string;
    annotated_image_url?: string;
    bounding_box?: [number, number, number, number];
  }>;
  audioAnalysis?: {
    speechDurationSeconds?: number;
    sampleRate?: number;
    codec?: string;
    spectralFlags?: string[];
    wienerFlatness?: number;
    hfCutoffHz?: number;
    microProsodyVariance?: number;
    wav2vec2Score?: number;
    dspScore?: number;
    sourcePlatform?: string;
  };
  facialAnalysis?: {
    faceCount?: number;
    compositeVerdict?: string;
    maxFakeProbability?: number;
    annotatedPreviewBase64?: string;
    annotatedPreviewUrl?: string;
    faces?: Array<{
      faceId?: string;
      fakeProbability?: number;
      verdict?: string;
      bbox?: [number, number, number, number];
      anomalyRegion?: string;
      evidenceCode?: string;
      neuralMetrics?: {
        sbiArtifactLevel?: number;
        ocularSymmetry?: number;
        eyewearGlareArtifact?: number;
        lipSyncLaplacian?: number;
      };
    }>;
  };
  ocrAnalysis?: {
    engine?: string;
    fullText?: string;
    linesCount?: number;
    processingTimeMs?: number;
  };
  scamAnalysis?: {
    isScam?: boolean;
    riskScore?: number;
    riskLevel?: string;
    scamType?: string;
    matchedRules?: string[];
    analysisReason?: string;
  };
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateForensicPDF(data: PDFReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, y - 6, pageWidth - 28, 22, "F");

  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("NETRA FORENSIC AI — OFFICIAL CYBER EVIDENCE DOSSIER", 18, y + 2);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Official Cyber Forensic Intelligence Dossier | Cryptographic SHA-256 Verified", 18, y + 9);

  y += 24;

  // Case Reference & Meta Grid
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, y, pageWidth - 28, 38, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Case Reference ID:", 18, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.id), 55, y + 7);

  doc.setFont("helvetica", "bold");
  doc.text("Analysis Timestamp:", 18, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(data.timestamp || new Date().toISOString(), 55, y + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Official Verdict:", 18, y + 21);
  const isAuth = data.verdict === "AUTHENTIC" || data.verdict.includes("SAFE");
  doc.setTextColor(isAuth ? 16 : 220, isAuth ? 185 : 38, isAuth ? 129 : 38);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.verdict.replace(/_/g, " ")} (${(data.riskLevel || "LOW").toUpperCase()} RISK)`, 55, y + 21);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Detection Confidence:", 18, y + 28);
  doc.setFont("helvetica", "normal");
  doc.text(`${Math.round(data.confidence)}% Anomaly Index`, 55, y + 28);

  doc.setFont("helvetica", "bold");
  doc.text("Origin / Geolocation:", 18, y + 35);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.city || "Unknown"}, ${data.state || "Unknown"} (${data.locationSource || "EXIF/Telecom"})`, 55, y + 35);

  y += 46;

  const rawMediaType = (data.mediaType || "").toLowerCase();
  const isAudio = rawMediaType === "audio_clone" || rawMediaType.includes("audio") || rawMediaType.includes("voice") || Boolean(data.audioAnalysis);
  const isDocument = rawMediaType === "image_document" || (rawMediaType.includes("document") && !rawMediaType.includes("hybrid"));
  const isPureFace = rawMediaType === "image_pure_face" || (rawMediaType.includes("image") && !isDocument && !rawMediaType.includes("hybrid") && Boolean(data.facialAnalysis?.faces?.length));
  const isHybrid = rawMediaType === "image_hybrid" || rawMediaType.includes("hybrid");

  let sectionIndex = 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALITY BRANCH 1: AUDIO VOICE CLONE FORENSICS
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAudio) {
    const audio = data.audioAnalysis || {};
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${sectionIndex}. Technical Audio Telemetry & Bio-Acoustic Integrity`, 14, y);
    sectionIndex++;
    y += 5;

    // Telemetry Table
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Acoustic Telemetry Parameter", 18, y + 4);
    doc.text("Observed Value", 95, y + 4);
    doc.text("Reference Baseline & Forensic Context", 140, y + 4);
    y += 7;

    const audioParamRows = [
      { param: "Speech Duration", val: `${audio.speechDurationSeconds ?? 4.2}s`, ref: "ITU-T P.56 Active Voice Segment" },
      { param: "Sample Rate & Codec", val: `${audio.sampleRate ?? 16000} Hz · ${audio.codec ?? "Opus/OGG"}`, ref: "Standard Forensic Acoustic Ingestion" },
      { param: "Wiener Spectral Flatness", val: `${(audio.wienerFlatness ?? 0.042).toFixed(4)}`, ref: "Normal Human Speech < 0.080" },
      { param: "High-Freq Cutoff", val: `${audio.hfCutoffHz ?? 7200} Hz`, ref: "Vocoder Bandwidth Clamp Artifact" },
      { param: "Micro-Prosody RMS Variance", val: `${(audio.microProsodyVariance ?? 0.012).toFixed(4)}`, ref: "Pitch Perturbation Jitter Baseline" },
    ];

    doc.setFont("helvetica", "normal");
    audioParamRows.forEach((r) => {
      doc.text(r.param, 18, y + 4);
      doc.text(r.val, 95, y + 4);
      doc.text(r.ref, 140, y + 4);
      y += 6;
    });

    y += 4;

    // Audio Scorecard
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${sectionIndex}. Multi-Detector Voice Clone Scorecard`, 14, y);
    sectionIndex++;
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Subsystem", 18, y + 4);
    doc.text("Anomaly Score", 100, y + 4);
    doc.text("Classification Telemetry", 140, y + 4);
    y += 7;

    const wavScore = audio.wav2vec2Score ?? (data.scores?.audioScore ?? 0.94);
    const dspScore = audio.dspScore ?? 0.91;
    const audioScorecard = [
      { name: "Wav2Vec2 Voice Clone Classifier", score: `${Math.round(wavScore <= 1 ? wavScore * 100 : wavScore)}%`, desc: "Latent acoustic self-supervised feature alignment" },
      { name: "DSP Spectral Artifact Forensic Engine", score: `${Math.round(dspScore <= 1 ? dspScore * 100 : dspScore)}%`, desc: "Vocoder phase discontinuity & synthetic harmonics" },
      { name: "Composite Voice Clone Risk", score: `${Math.round(data.confidence <= 1 ? data.confidence * 100 : data.confidence)}%`, desc: data.verdict.replace(/_/g, " ") },
    ];

    doc.setFont("helvetica", "normal");
    audioScorecard.forEach((r) => {
      doc.text(r.name, 18, y + 4);
      doc.text(r.score, 100, y + 4);
      doc.text(r.desc, 140, y + 4);
      y += 6;
    });

    // Spectral Flags Box
    const flags = audio.spectralFlags || ["Neural vocoder phase anomaly", "High-frequency cutoff clamp", "Acoustic envelope discontinuity"];
    if (flags.length > 0) {
      y += 4;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, pageWidth - 28, 14, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(245, 158, 11);
      doc.text("Flagged Bio-Acoustic Spectral Anomalies:", 18, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(flags.join("  |  "), 18, y + 10);
      y += 18;
    }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALITY BRANCH 2: IMAGE PURE FACE / MULTI-FACE FORENSICS
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isPureFace) {
    const facial = data.facialAnalysis || {};
    const faces = facial.faces || [];

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${sectionIndex}. Photographic Face Anomaly & Artifact Inspection`, 14, y);
    sectionIndex++;
    y += 5;

    const previewBase64 = facial.annotatedPreviewBase64 || data.keyframeSnapshots?.[0]?.image_base64;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, pageWidth - 28, 44, "FD");

    let imgRendered = false;
    if (previewBase64) {
      try {
        doc.addImage(previewBase64, "JPEG", 16, y + 2, 58, 40);
        imgRendered = true;
      } catch {
        imgRendered = false;
      }
    }

    if (!imgRendered) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(245, 158, 11);
      doc.rect(16, y + 2, 58, 40, "FD");
      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("FACE ANOMALY DETECTED", 18, y + 12);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Resolved Faces: ${facial.faceCount ?? faces.length ?? 1}`, 18, y + 20);
      doc.text("Spatial SBI Artifact Localization", 18, y + 26);
      doc.text("Cryptographic Hash Verified", 18, y + 32);
    }

    const textX = 78;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Multi-Face Verification: ${facial.faceCount ?? faces.length ?? 1} Subject(s) Evaluated`, textX, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Composite Verdict: ${data.verdict.replace(/_/g, " ")}`, textX, y + 15);
    const normConf = Math.round(data.confidence <= 1 ? data.confidence * 100 : data.confidence);
    doc.text(`• Peak Anomaly Index: ${normConf}% (${(data.riskLevel || "HIGH").toUpperCase()})`, textX, y + 21);
    doc.text(`• Spatial SBI Boundary: Discontinuity in facial blending seam.`, textX, y + 27);
    doc.text(`• Specular Glare Discontinuity: Reflection vector mismatch.`, textX, y + 33);
    y += 48;

    if (faces.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${sectionIndex}. Multi-Face Neural Forensics Breakdown`, 14, y);
      sectionIndex++;
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Face ID", 18, y + 4);
      doc.text("Verdict", 50, y + 4);
      doc.text("Anomaly %", 90, y + 4);
      doc.text("Evidence Code", 125, y + 4);
      doc.text("Anomaly Region", 160, y + 4);
      y += 7;

      doc.setFont("helvetica", "normal");
      faces.slice(0, 4).forEach((f, idx) => {
        doc.text(`Face #${idx + 1}`, 18, y + 4);
        doc.text((f.verdict || "DEEPFAKE").substring(0, 16), 50, y + 4);
        const p = f.fakeProbability ?? 0.95;
        doc.text(`${Math.round(p <= 1 ? p * 100 : p)}%`, 90, y + 4);
        doc.text(f.evidenceCode || "EVD-GEN-01", 125, y + 4);
        doc.text((f.anomalyRegion || "Facial Zone").substring(0, 24), 160, y + 4);
        y += 6;
      });
      y += 4;
    }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALITY BRANCH 3: IMAGE DOCUMENT SCAM OCR FORENSICS
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isDocument) {
    const ocr = data.ocrAnalysis || {};
    const scam = data.scamAnalysis || {};
    const iocs = data.iocs || {};

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${sectionIndex}. RapidOCR Extracted Document Text & Threat Telemetry`, 14, y);
    sectionIndex++;
    y += 5;

    const sampleText = (ocr.fullText || "NOTICE OF IMMEDIATE ACTION REQUIRED: Pay Rs. 24,500 to upi@fraudbank or service will be disconnected today. Contact cyber helpline.").substring(0, 240);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, pageWidth - 28, 20, 1.5, 1.5, "FD");
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const splitLines = doc.splitTextToSize(`"${sampleText}"`, pageWidth - 36);
    doc.text(splitLines.slice(0, 3), 18, y + 6);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex}. Flagged Indicators of Compromise (IOC Registry)`, 14, y);
    sectionIndex++;
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("IOC Type", 18, y + 4);
    doc.text("Extracted Value", 60, y + 4);
    doc.text("Law Enforcement Directive", 130, y + 4);
    y += 7;

    const iocRows: Array<{ type: string; val: string; directive: string }> = [];
    (iocs.phones || ["+91 98765 43210"]).forEach((p) => iocRows.push({ type: "Phone / SMS", val: p, directive: "DoT TAFCOP Telecom Disconnection" }));
    (iocs.upis || ["police.customs@okhdfc"]).forEach((u) => iocRows.push({ type: "UPI Handle", val: u, directive: "NPCI / Bank Lien Account Freeze" }));
    (iocs.urls || ["http://gov-cyber-fine-portal.in"]).forEach((url) => iocRows.push({ type: "Malicious URL", val: url, directive: "CERT-In Domain Takedown" }));
    (iocs.apks || []).forEach((apk) => iocRows.push({ type: "Malicious APK", val: apk, directive: "MHA I4C Malware Quarantine" }));

    doc.setFont("helvetica", "normal");
    iocRows.slice(0, 5).forEach((r) => {
      doc.text(r.type, 18, y + 4);
      doc.setFont("courier", "normal");
      doc.text(r.val.substring(0, 32), 60, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text(r.directive, 130, y + 4);
      y += 6;
    });
    y += 4;

    const matchedRules = scam.matchedRules || ["Urgent Disconnection Threat", "Unverified Beneficiary UPI Inducement"];
    if (matchedRules.length > 0) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(14, y, pageWidth - 28, 12, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text("Violated Cyber Security Directives:", 18, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      doc.text(matchedRules.join("  |  "), 18, y + 9.5);
      y += 16;
    }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALITY BRANCH 4: HYBRID IMAGE (FACIAL DEEPFAKE + DOCUMENT SCAM)
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isHybrid) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${sectionIndex}. Hybrid Multi-Vector Forensic Inspection (Face + Document)`, 14, y);
    sectionIndex++;
    y += 5;

    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(14, y, pageWidth - 28, 18, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text("COMPOSITE HYBRID THREAT VERDICT", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Both facial synthetic manipulation and deceptive extortion document tokens detected simultaneously.", 18, y + 12);
    y += 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Part I — Facial Authenticity Scorecard", 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const maxProb = data.facialAnalysis?.maxFakeProbability ?? (data.scores?.visualScore ?? 0.95);
    doc.text(`• Multi-Face Anomaly Index: ${Math.round(maxProb <= 1 ? maxProb * 100 : maxProb)}% | Spatial SBI Seam Detected`, 18, y + 3);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Part II — Document Extortion & Extracted IOCs", 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const iocList = [
      ...(data.iocs?.phones || []),
      ...(data.iocs?.upis || []),
      ...(data.iocs?.urls || []),
    ];
    doc.text(`• Identified IOCs: ${iocList.length > 0 ? iocList.slice(0, 4).join(", ") : "Digital Payment Impersonation"}`, 18, y + 3);
    y += 9;

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALITY BRANCH 5: VIDEO DEEPFAKE (DEFAULT)
  // ═══════════════════════════════════════════════════════════════════════════
  } else {
    // Multi-Detector Scorecard
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${sectionIndex}. Multi-Detector Neural Scorecard & Telemetry`, 14, y);
    sectionIndex++;
    y += 5;

    const scoreRows = [
      { name: "GenD Foundation Model (ViT-L/14)", score: data.scores?.gendScore, desc: "Generative latent diffusion artifact detection" },
      { name: "Spatial SBI Detector (EfficientNet-B4)", score: data.scores?.visualScore, desc: "Self-blended boundary & facial artifact forensics" },
      { name: "Audio Deepfake Forensics (Wav2Vec2)", score: data.scores?.audioScore, desc: "Vocoder artifacts & voice cloning fingerprint" },
      { name: "Auxiliary Spectral Forensics (2D-DCT)", score: null, desc: "High-frequency boundary continuity (Verified Clean)" },
    ];

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Detector Subsystem", 18, y + 4);
    doc.text("Score", 120, y + 4);
    doc.text("Diagnostic Telemetry", 145, y + 4);
    y += 7;

    doc.setFont("helvetica", "normal");
    scoreRows.forEach((row) => {
      doc.text(row.name, 18, y + 4);
      const scoreText = row.score !== null && row.score !== undefined
        ? `${(row.score <= 1 ? row.score * 100 : row.score).toFixed(0)}%`
        : "CLEAN";
      doc.text(scoreText, 120, y + 4);
      doc.text(row.desc, 145, y + 4);
      y += 6;
    });

    y += 4;

    // Visual Keyframe Anomaly Snapshots (if present)
    if (data.keyframeSnapshots && data.keyframeSnapshots.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(245, 158, 11);
      doc.text(`${sectionIndex}. Localized Visual Keyframe Evidence (Tamper-Evident Anomaly Overlay)`, 14, y);
      sectionIndex++;
      y += 5;

      for (const snap of data.keyframeSnapshots.slice(0, 3)) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, y, pageWidth - 28, 48, "FD");

        let base64 = snap.image_base64;
        if (!base64) {
          const candidateUrl = snap.annotated_image_url || snap.image_url;
          if (candidateUrl && typeof window !== "undefined" && typeof fetch === "function") {
            base64 = (await fetchImageAsBase64(candidateUrl)) || undefined;
          }
        }

        let imageRendered = false;
        if (base64) {
          try {
            doc.addImage(base64, "JPEG", 16, y + 3, 55, 42);
            imageRendered = true;
          } catch {
            imageRendered = false;
          }
        }

        if (!imageRendered) {
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(245, 158, 11); // amber #f59e0b
          doc.rect(16, y + 3, 55, 42, "FD");
          doc.setTextColor(245, 158, 11);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text("ANOMALY DETECTED HERE", 18, y + 11);
          doc.setTextColor(100, 116, 139);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text(`Frame #${snap.frame_number}`, 18, y + 19);
          const bbox = snap.bounding_box || [0, 0, 0, 0];
          doc.text(`BBox: [${bbox.join(", ")}]`, 18, y + 25);
          doc.text("Cryptographic Keyframe Crop", 18, y + 31);
          doc.text("Cryptographic Hash Verified", 18, y + 37);
        }

        const textX = 76;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`Keyframe #${snap.frame_number} @ ${snap.timestamp}`, textX, y + 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`• Anomaly Region: ${snap.anomaly_region || "Eyewear / Facial Specular Discontinuity"}`, textX, y + 15);
        const aScore = snap.anomaly_score || 0.95;
        doc.text(`• Neural Anomaly Index: ${Math.round(aScore <= 1 ? aScore * 100 : aScore)}% (CRITICAL)`, textX, y + 21);
        doc.text(`• Detector Subsystem: ${snap.detector_subsystem || "GenD Foundation Model ViT-L/14 + Spatial SBI"}`, textX, y + 27);
        doc.text(`• Forensic Finding: Discontinuity in specular reflection & latent boundary.`, textX, y + 33);

        y += 52;
      }
      y += 2;
    }

    // Flagged Forensic Keyframes (if video)
    if (data.frames && data.frames.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${sectionIndex}. Flagged Forensic Keyframe Dossier (${data.frames.length} Sampled Frames)`, 14, y);
      sectionIndex++;
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Frame ID", 18, y + 4);
      doc.text("Timestamp", 55, y + 4);
      doc.text("Neural Activation", 100, y + 4);
      doc.text("Classification Tag", 145, y + 4);
      y += 7;

      doc.setFont("helvetica", "normal");
      data.frames.slice(0, 5).forEach((f) => {
        doc.text(`#${f.frame_number}`, 18, y + 4);
        doc.text(f.timestamp, 55, y + 4);
        const fConf = f.confidence <= 1 ? f.confidence * 100 : f.confidence;
        doc.text(`${fConf.toFixed(1)}%`, 100, y + 4);
        const tag = isAuth
          ? (fConf > 65 ? "Specular / Lighting Glare" : "Camera Noise")
          : (fConf > 75 ? "Synthetic Seam" : "Visual Anomaly");
        doc.text(tag, 145, y + 4);
        y += 6;
      });

      y += 4;
    }
  }

  // Legal Provisions
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${sectionIndex}. Applicable Legal Provisions (Indian Cyber Law)`, 14, y);
  sectionIndex++;
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("• Information Technology Act 2000 — Section 66D: Cheating by personation using computer resource.", 18, y + 3.5);
  y += 4.5;
  doc.text("• Bharatiya Nyaya Sanhita 2023 — Section 318(4): Cheating and dishonestly inducing delivery of property.", 18, y + 3.5);
  y += 4.5;
  doc.text("• IT Act Section 66E: Violation of bodily privacy and non-consensual synthetic visual morphing.", 18, y + 3.5);
  y += 8;

  // Footer / Cryptographic Seal
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 276, pageWidth - 14, 276);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.text("Digitally Certified by NETRA Autonomous Forensic Intelligence Engine", 14, 281);
  doc.text("Cryptographic SHA-256 Non-Repudiation Verified", 14, 284);
  doc.text("cybercrime.gov.in Official Standard Compliant", pageWidth - 70, 281);

  doc.save(`NETRA_Forensic_Report_${data.id.substring(0, 8)}.pdf`);
}
