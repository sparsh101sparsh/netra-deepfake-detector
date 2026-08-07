"use client";
// app/analyze/[jobId]/page.tsx
// Main results page — polls job status, shows all components

import { useEffect, useState, useRef, useCallback } from "react";
import { pollJobStatus, getVideoUrl, JobStatus, DetectionResult } from "@/lib/api";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import DetectorScorecard from "@/components/DetectorScorecard";

interface Props {
  params: { jobId: string };
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  "Downloading video": "Fetching your video from secure storage...",
  "Extracting frames and audio": "Splitting video into analysis frames...",
  "Running spatial deepfake detector": "EfficientNet-B4 scanning for face swap artifacts...",
  "Running CLIP generalisation detector": "CLIP probe searching for AI-generation fingerprints...",
  "Running audio deepfake detector": "Wav2Vec2 analyzing voice patterns...",
  "Analyzing metadata and auxiliary signals": "Checking blink patterns, landmarks & metadata...",
  "Fusing detector scores": "Combining all evidence streams...",
  "Building evidence bundle": "Packaging forensic evidence...",
  "Generating forensic report via Amazon Bedrock": "Claude 3.5 Sonnet writing forensic analysis...",
  "Finalizing results": "Almost done...",
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

  // Poll until complete or error
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const status = await pollJobStatus(jobId);
        if (!cancelled) {
          setJobStatus(status);

          if (status.status === "complete") {
            // Fetch video URL for playback
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

    poll(); // Immediate first poll
    pollingRef.current = setInterval(poll, 2000); // Then every 2 seconds

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId]);

  const result = jobStatus?.result;
  const isComplete = jobStatus?.status === "complete" && result;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">NETRA Analysis</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{jobId}</p>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← New Analysis
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Processing state */}
        {!isComplete && !error && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-400 font-medium">
                  {jobStatus?.current_stage || "Queued..."}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {STAGE_DESCRIPTIONS[jobStatus?.current_stage || ""] || "Processing your video..."}
              </p>
            </div>

            {/* Progress bar */}
            <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${jobStatus?.progress || 0}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-500">{jobStatus?.progress || 0}%</p>

            {/* Stage indicators */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                    className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                      isActive
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : isDone
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                        : "border-gray-800 text-gray-600"
                    }`}
                  >
                    {isDone ? "✓ " : isActive ? "⟳ " : "○ "}
                    {stage}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-center">
            <p className="text-red-400 font-semibold text-lg mb-2">Analysis Failed</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <a
              href="/"
              className="mt-4 inline-block px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Try Again
            </a>
          </div>
        )}

        {/* RESULTS */}
        {isComplete && result && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top verdict banner */}
            <div
              className={`rounded-2xl p-6 text-center border ${
                result.confidence > 70
                  ? "border-red-500/40 bg-red-500/10"
                  : result.confidence > 30
                  ? "border-yellow-500/40 bg-yellow-500/10"
                  : "border-emerald-500/40 bg-emerald-500/10"
              }`}
            >
              <p className="text-4xl font-black mb-2">
                {result.confidence > 70 ? "🚨" : result.confidence > 30 ? "⚠️" : "✅"}
              </p>
              <h2
                className={`text-2xl font-bold mb-1 ${
                  result.confidence > 70
                    ? "text-red-400"
                    : result.confidence > 30
                    ? "text-yellow-400"
                    : "text-emerald-400"
                }`}
              >
                {result.manipulation_type || result.verdict.replace(/_/g, " ")} DETECTED
              </h2>
              <p className="text-gray-400">
                Risk Level: <span className="font-semibold text-white">{result.risk_level}</span>
              </p>
            </div>

            {/* 3-column grid: Confidence + Detectors + Video */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Confidence meter */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 flex items-center justify-center">
                <ConfidenceMeter value={result.confidence} />
              </div>

              {/* Detector scorecards */}
              <div className="md:col-span-2 bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4">DETECTOR BREAKDOWN</h3>
                <DetectorScorecard
                  visualScore={result.visual_score}
                  audioScore={result.audio_score}
                  clipScore={result.clip_score}
                  verdict={result.verdict}
                />
              </div>
            </div>

            {/* Video + Evidence Timeline */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">EVIDENCE TIMELINE</h3>

              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg bg-black mb-4 max-h-64"
                />
              )}

              <EvidenceTimeline
                frames={result.frames || []}
                audioFlags={result.audio_flags || []}
                duration={30}  // Approximate — will be updated with real duration
                onSeek={handleSeek}
                videoUrl={videoUrl}
              />
            </div>

            {/* Forensic Report */}
            {result.forensic_report && (
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-400">FORENSIC ANALYSIS REPORT</h3>
                  <span className="text-xs text-gray-600">{result.report_generated_by}</span>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300 leading-relaxed">
                    {result.forensic_report}
                  </pre>
                </div>
              </div>
            )}

            {/* Metadata flags */}
            {result.metadata_flags && result.metadata_flags.length > 0 && (
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">METADATA ANOMALIES</h3>
                <div className="flex flex-wrap gap-2">
                  {result.metadata_flags.map((flag, i) => (
                    <span key={i} className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-full text-xs">
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
