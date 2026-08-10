"use client";
// app/analyze/[jobId]/page.tsx
// Main results page — polls job status, shows all components
// Premium UI Redesign Applied

import { useEffect, useState, useRef, useCallback } from "react";
import { pollJobStatus, getVideoUrl, JobStatus, DetectionResult } from "@/lib/api";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import DetectorScorecard from "@/components/DetectorScorecard";
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface Props {
  params: { jobId: string };
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  "Downloading video": "Fetching your media from secure storage...",
  "Extracting frames and audio": "Splitting payload into analysis vectors...",
  "Running spatial deepfake detector": "EfficientNet-B4 scanning for facial manipulation...",
  "Running CLIP generalisation detector": "CLIP probe searching for AI-generation fingerprints...",
  "Running audio deepfake detector": "Wav2Vec2 analyzing audio frequency anomalies...",
  "Analyzing metadata and auxiliary signals": "Cross-referencing telemetry and structural data...",
  "Fusing detector scores": "Synthesizing evidence streams...",
  "Building evidence bundle": "Compiling forensic package...",
  "Generating forensic report via Amazon Bedrock": "AI forensic investigator writing final report...",
  "Finalizing results": "Almost complete...",
};

export default function AnalysisPage({ params }: Props) {
  const { jobId } = params;
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSeek = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const status = await pollJobStatus(jobId);
        if (!cancelled) {
          setJobStatus(status);

          if (status.status === "complete") {
            const url = await getVideoUrl(jobId);
            if (!cancelled) setVideoUrl(url);
            if (pollingRef.current) clearInterval(pollingRef.current);
          } else if (status.status === "error") {
            setError(status.current_stage || "Analysis failed. Please try again.");
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Network error");
      }
    }

    poll(); 
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId]);

  const result = jobStatus?.result;
  const isComplete = jobStatus?.status === "complete" && result;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analysis Report</h1>
          <p className="text-muted-foreground font-mono text-xs mt-1">ID: {jobId}</p>
        </div>
        {!isComplete && !error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full border border-border">
            <Loader2 className="w-4 h-4 text-foreground animate-spin" />
            <span className="text-xs font-medium">Processing Payload</span>
          </div>
        )}
      </div>

      <main className="w-full space-y-6">
        
        {/* Processing state */}
        {!isComplete && !error && (
          <div className="card-premium p-10 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center mb-8">
              <Loader2 className="w-12 h-12 text-muted-foreground animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-2">
                {jobStatus?.current_stage || "Initializing..."}
              </h2>
              <p className="text-muted-foreground">
                {STAGE_DESCRIPTIONS[jobStatus?.current_stage || ""] || "Stand by for analysis."}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-lg mb-8">
              <div className="bg-secondary rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-500"
                  style={{ width: `${jobStatus?.progress || 0}%` }}
                />
              </div>
              <p className="text-right text-xs text-muted-foreground">{jobStatus?.progress || 0}% Complete</p>
            </div>

            {/* Stage indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl">
              {Object.keys(STAGE_DESCRIPTIONS).map((stage) => {
                const progress = jobStatus?.progress || 0;
                const stageIndex = Object.keys(STAGE_DESCRIPTIONS).indexOf(stage);
                const totalStages = Object.keys(STAGE_DESCRIPTIONS).length;
                const stageProgress = (stageIndex / totalStages) * 100;
                const isDone = progress > stageProgress + 8;
                const isActive = jobStatus?.current_stage === stage;

                return (
                  <div
                    key={stage}
                    className={`text-xs px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all duration-300 ${
                      isActive
                        ? "border-border bg-secondary text-foreground shadow-sm"
                        : isDone
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    {isDone ? <ShieldCheck className="w-3.5 h-3.5" /> : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50" />}
                    {stage}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="card-premium border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Analysis Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button onClick={() => window.location.href = '/'} className="btn-secondary">
              Return to Hub
            </button>
          </div>
        )}

        {/* RESULTS */}
        {isComplete && result && (
          <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
            
            {/* Top verdict banner */}
            <div
              className={`rounded-2xl p-8 text-center border relative overflow-hidden ${
                result.confidence > 70
                  ? "border-destructive/40 bg-destructive/10"
                  : result.confidence > 30
                  ? "border-orange-500/40 bg-orange-500/10"
                  : "border-emerald-500/40 bg-emerald-500/10"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex flex-col items-center">
                {result.confidence > 70 ? (
                  <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                ) : result.confidence > 30 ? (
                  <AlertTriangle className="w-16 h-16 text-orange-500 mb-4" />
                ) : (
                  <ShieldCheck className="w-16 h-16 text-emerald-500 mb-4" />
                )}
                <h2
                  className={`text-3xl font-bold tracking-tight mb-2 ${
                    result.confidence > 70
                      ? "text-destructive"
                      : result.confidence > 30
                      ? "text-orange-500"
                      : "text-emerald-500"
                  }`}
                >
                  {result.manipulation_type || result.verdict.replace(/_/g, " ")} DETECTED
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
                  Risk Level: <span className="text-foreground capitalize">{result.risk_level}</span>
                </p>
              </div>
            </div>

            {/* 3-column grid: Confidence + Detectors */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Confidence meter */}
              <div className="card-premium p-6 flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-sm font-semibold text-muted-foreground mb-6 self-start w-full">CONFIDENCE RATING</h3>
                <ConfidenceMeter value={result.confidence} />
              </div>

              {/* Detector scorecards */}
              <div className="lg:col-span-2 card-premium p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-6">DETECTOR BREAKDOWN</h3>
                <DetectorScorecard
                  visualScore={result.visual_score}
                  audioScore={result.audio_score}
                  clipScore={result.clip_score}
                  verdict={result.verdict}
                />
              </div>
            </div>

            {/* Video + Evidence Timeline */}
            <div className="card-premium p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-6">EVIDENCE TIMELINE</h3>

              {videoUrl && (
                <div className="rounded-xl overflow-hidden border border-border bg-black mb-6 w-full flex justify-center">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="max-h-[400px] w-auto"
                  />
                </div>
              )}

              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <EvidenceTimeline
                  frames={result.frames || []}
                  audioFlags={result.audio_flags || []}
                  duration={30} 
                  onSeek={handleSeek}
                  videoUrl={videoUrl}
                />
              </div>
            </div>

            {/* Forensic Report */}
            {result.forensic_report && (
              <div className="card-premium p-8">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                  <h3 className="text-sm font-semibold">FORENSIC ANALYSIS REPORT</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full border border-border">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse-soft"></div>
                    <span className="text-xs text-muted-foreground font-mono">{result.report_generated_by || "AI Analyst"}</span>
                  </div>
                </div>
                <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {result.forensic_report}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata flags */}
            {result.metadata_flags && result.metadata_flags.length > 0 && (
              <div className="card-premium p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">METADATA ANOMALIES</h3>
                <div className="flex flex-wrap gap-2">
                  {result.metadata_flags.map((flag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-md text-xs font-medium shadow-sm">
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
