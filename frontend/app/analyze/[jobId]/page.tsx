"use client";
// app/analyze/[jobId]/page.tsx — Analysis results page

import { useEffect, useState, useRef, useCallback } from "react";
import { pollJobStatus, getVideoUrl, JobStatus, DetectionResult } from "@/lib/api";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import DetectorScorecard from "@/components/DetectorScorecard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface Props {
  params: { jobId: string };
}

// Human-readable stage labels — no technical jargon
const STAGE_LABELS: Record<string, string> = {
  "Downloading video": "Retrieving your file…",
  "Extracting frames and audio": "Breaking down video and audio tracks…",
  "Running spatial deepfake detector": "Checking for facial manipulation…",
  "Running CLIP generalisation detector": "Scanning for AI generation signatures…",
  "Running audio deepfake detector": "Analyzing voice and audio patterns…",
  "Analyzing metadata and auxiliary signals": "Checking file metadata…",
  "Fusing detector scores": "Combining analysis results…",
  "Building evidence bundle": "Preparing evidence package…",
  "Synthesizing forensic dossier": "Writing detailed report…",
  "Generating forensic report": "Writing detailed report…",
  "Finalizing results": "Almost done…",
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
          if (status.status === "complete" || status.status === "error") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (status.status === "error") {
              setError("Analysis failed. Please try again.");
            } else {
              const url = await getVideoUrl(jobId);
              if (!cancelled) setVideoUrl(url);
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError("Could not reach the analysis server. Please try again.");
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }

    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId]);

  const isComplete = jobStatus?.status === "complete";
  const result: DetectionResult | null = isComplete ? (jobStatus?.result ?? null) : null;


  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      <Navbar />

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-8 flex-1 space-y-6 animate-in fade-in duration-300">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Analysis Report
            </h1>
            <p className="text-xs font-mono text-ink-3 mt-1">ID: {jobId}</p>
          </div>
          {!isComplete && !error && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-line rounded-full">
              <Loader2 className="w-4 h-4 text-ink-3 animate-spin" />
              <span className="text-xs font-medium text-ink-2">Analyzing…</span>
            </div>
          )}
        </div>

        {/* Processing State */}
        {!isComplete && !error && (
          <div className="rounded-2xl bg-surface border-[1.5px] border-line p-10 flex flex-col items-center justify-center min-h-[400px] shadow-card">
            <div className="text-center mb-8">
              <Loader2 className="w-12 h-12 text-ink-3 animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-ink mb-2">
                {STAGE_LABELS[jobStatus?.current_stage || ""] || jobStatus?.current_stage || "Starting…"}
              </h2>
              <p className="text-sm text-ink-2">
                Analysis is running in the background
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-lg mb-8">
              <div className="bg-inset rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${jobStatus?.progress || 0}%` }}
                />
              </div>
              <p className="text-right text-xs text-ink-3">{jobStatus?.progress || 0}% complete</p>
            </div>

            {/* Stage grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full max-w-3xl">
              {Object.keys(STAGE_LABELS).map((stage) => {
                const progress = jobStatus?.progress || 0;
                const stageIndex = Object.keys(STAGE_LABELS).indexOf(stage);
                const totalStages = Object.keys(STAGE_LABELS).length;
                const stageProgress = (stageIndex / totalStages) * 100;
                const isDone = progress > stageProgress + 8;
                const isActive = jobStatus?.current_stage === stage;

                return (
                  <div
                    key={stage}
                    className={`text-xs px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all duration-300 ${
                      isActive
                        ? "border-accent/40 bg-accent/5 text-ink"
                        : isDone
                        ? "border-green-500/20 bg-green-500/5 text-green-400"
                        : "border-transparent text-ink-3"
                    }`}
                  >
                    {isDone ? (
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-line shrink-0" />
                    )}
                    {STAGE_LABELS[stage] || stage}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/25 p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Analysis Failed</h2>
            <p className="text-sm text-ink-2 mb-6">{error}</p>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-5 py-2 rounded-xl bg-surface border border-line text-ink text-sm font-medium hover:bg-hover transition-all"
            >
              Return to Scanner
            </button>
          </div>
        )}

        {/* Results */}
        {isComplete && result && (
          <div className="space-y-5 animate-in fade-in duration-500">

            {/* Verdict Banner */}
            <div
              className={`rounded-2xl p-8 text-center border relative overflow-hidden ${
                result.confidence > 70
                  ? "border-red-500/30 bg-red-500/8"
                  : result.confidence > 30
                  ? "border-amber-500/30 bg-amber-500/8"
                  : "border-green-500/30 bg-green-500/8"
              }`}
            >
              <div className="flex flex-col items-center">
                {result.confidence > 70 ? (
                  <ShieldAlert className="w-14 h-14 text-red-400 mb-4" />
                ) : result.confidence > 30 ? (
                  <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
                ) : (
                  <ShieldCheck className="w-14 h-14 text-green-400 mb-4" />
                )}
                <h2
                  className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${
                    result.confidence > 70 ? "text-red-400" : result.confidence > 30 ? "text-amber-400" : "text-green-400"
                  }`}
                >
                  {result.confidence > 70 ? "Likely AI-Generated" : result.confidence > 30 ? "Possibly Altered" : "Appears Authentic"}
                </h2>
                <p className="text-sm text-ink-2">
                  Risk level:{" "}
                  <span className="text-ink font-medium capitalize">{result.risk_level?.toLowerCase()}</span>
                </p>
              </div>
            </div>

            {/* Confidence + Detectors */}
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 flex flex-col items-center justify-center min-h-[280px] shadow-card">
                <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider mb-6 self-start w-full">
                  Detection Confidence
                </h3>
                <ConfidenceMeter value={result.confidence} />
              </div>

              <div className="lg:col-span-2 rounded-2xl bg-surface border-[1.5px] border-line p-6 shadow-card">
                <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider mb-6">
                  Detector Results
                </h3>
                <DetectorScorecard
                  visualScore={result.visual_score}
                  audioScore={result.audio_score}
                  clipScore={result.clip_score}
                  verdict={result.verdict}
                />
              </div>
            </div>

            {/* Video + Timeline */}
            <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 shadow-card">
              <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider mb-5">
                Evidence Timeline
              </h3>

              {videoUrl && (
                <div className="rounded-xl overflow-hidden border border-line bg-black mb-5 w-full flex justify-center">
                  <video ref={videoRef} src={videoUrl} controls className="max-h-[400px] w-auto" />
                </div>
              )}

              <div className="p-4 rounded-xl bg-inset border border-line">
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
              <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 sm:p-8 shadow-card">
                <div className="flex items-center justify-between mb-5 border-b border-line pb-4">
                  <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider">Detailed Report</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-inset rounded-full border border-line">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <span className="text-xs text-ink-3">AI Analysis</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-sm text-ink-2">
                  {result.forensic_report}
                </p>
              </div>
            )}

            {/* Metadata Flags */}
            {result.metadata_flags && result.metadata_flags.length > 0 && (
              <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 shadow-card">
                <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider mb-4">
                  Suspicious Signals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.metadata_flags.map((flag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-medium"
                    >
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
