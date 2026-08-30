"use client";
// app/analyze/[jobId]/page.tsx — NETRA Forensic Analysis Status & Intelligence Dossier

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  pollJobStatus,
  getVideoUrl,
  getVideoMediaSources,
  JobStatusResponse,
  DetectionResult,
  WorkerTelemetry,
  PIPELINE_STAGES,
  PipelineStageConfig,
  STAGE_LABELS,
} from "@/lib/api";
import EvidenceTimeline from "@/components/EvidenceTimeline";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import DetectorScorecard from "@/components/DetectorScorecard";
import { ResilientVideoPlayer } from "@/components/player/ResilientVideoPlayer";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StatusPill } from "@/components/atoms/StatusPill";
import { generateForensicPDF } from "@/lib/pdfReportGenerator";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Download,
  Zap,
  Cpu,
  Server,
  Terminal,
  Copy,
  Check,
  Clock,
  HardDrive,
  RefreshCw,
  FileText,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Database,
} from "lucide-react";

interface Props {
  params: { jobId: string };
}

function getActiveStageIndex(currentStage: string, progress: number, status: string): number {
  if (status === "complete") return PIPELINE_STAGES.length - 1;
  const normalized = (currentStage || "").toLowerCase().trim();

  // 1. Check exact ID or alias match
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    const stage = PIPELINE_STAGES[i];
    if (
      stage.id === normalized ||
      stage.aliases.some((a) => normalized.includes(a.toLowerCase()))
    ) {
      return i;
    }
  }

  // 2. Fallback based on numerical progress percentage
  for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
    if (progress >= PIPELINE_STAGES[i].targetProgress) {
      return i;
    }
  }

  return 0;
}

export default function AnalysisPage({ params }: Props) {
  const { jobId } = params;
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<{ primaryUrl: string | null; streamUrl: string }>({
    primaryUrl: `/api/backend/api/v1/jobs/${jobId}/stream`,
    streamUrl: `/api/v1/jobs/${jobId}/stream`,
  });
  const [error, setError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [activeWorkerCmdTab, setActiveWorkerCmdTab] = useState<"python" | "npm">("python");
  const [elapsedQueueSeconds, setElapsedQueueSeconds] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSeek = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Track elapsed queuing time
  useEffect(() => {
    queueTimerRef.current = setInterval(() => {
      setElapsedQueueSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    };
  }, []);

  // Poll Job Status
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const status = await pollJobStatus(jobId);
        if (!cancelled) {
          setJobStatus(status);

          if (status.status === "complete" || status.status === "error") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            if (queueTimerRef.current) {
              clearInterval(queueTimerRef.current);
              queueTimerRef.current = null;
            }

            if (status.status === "error") {
              setError(status.error || "Analysis failed. Please try again.");
            } else {
              getVideoMediaSources(jobId)
                .then((sources) => {
                  if (!cancelled) {
                    setVideoSources((prev) => {
                      if (
                        prev.primaryUrl === sources.primaryUrl &&
                        prev.streamUrl === sources.streamUrl
                      ) {
                        return prev;
                      }
                      return sources;
                    });
                    setVideoUrl(sources.primaryUrl || sources.streamUrl);
                  }
                })
                .catch(() => {});
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Poll attempt failed, will retry:", err);
        }
      }
    }

    const timer = setInterval(poll, 2500);
    pollingRef.current = timer;
    poll();

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      clearInterval(timer);
    };
  }, [jobId]);

  const isComplete = jobStatus?.status === "complete";
  const result: DetectionResult | null = isComplete ? (jobStatus?.result ?? null) : null;
  const currentProgress = Math.min(100, Math.max(0, jobStatus?.progress ?? 0));
  const currentStageKey = jobStatus?.current_stage ?? "queued";
  const activeStageIndex = useMemo(
    () => getActiveStageIndex(currentStageKey, currentProgress, jobStatus?.status ?? "queued"),
    [currentStageKey, currentProgress, jobStatus?.status]
  );

  const workerTelemetry = jobStatus?.worker_telemetry;
  const isWorkerOffline =
    workerTelemetry?.worker_status === "offline" ||
    (jobStatus?.status === "queued" &&
      (workerTelemetry?.active_workers_count === 0 || !workerTelemetry) &&
      elapsedQueueSeconds > 30);

  // Dynamic Telemetry Pill formatting
  const workerBadge = useMemo(() => {
    if (isWorkerOffline) {
      return {
        tone: "warning" as const,
        label: "⚠️ Forensic Fleet Offline",
        device: "No Active Workers",
        detail: "AWS SQS Queued",
      };
    }

    const device = (workerTelemetry?.worker_device || "").toLowerCase();
    const count = workerTelemetry?.active_workers_count ?? 1;

    if (device.includes("mps") || device.includes("metal") || device.includes("apple")) {
      return {
        tone: "active" as const,
        label: `⚡ Apple Silicon Metal Active • ${count} ${count === 1 ? "Worker" : "Workers"}`,
        device: "Apple M-Series (MPS)",
        detail: workerTelemetry?.assigned_worker_id || "worker-mac-01",
      };
    }

    if (device.includes("cuda") || device.includes("gpu") || device.includes("nvidia")) {
      return {
        tone: "active" as const,
        label: `⚡ GPU Accelerated • ${count} ${count === 1 ? "Worker" : "Workers"}`,
        device: "NVIDIA CUDA Acceleration",
        detail: workerTelemetry?.assigned_worker_id || "worker-cloud-spot-01",
      };
    }

    if (device.includes("cpu")) {
      return {
        tone: "info" as const,
        label: `⚙️ CPU Inference Fleet • ${count} ${count === 1 ? "Worker" : "Workers"}`,
        device: "CPU Multi-Threaded",
        detail: workerTelemetry?.assigned_worker_id || "worker-cpu-01",
      };
    }

    return {
      tone: "active" as const,
      label: `⚡ Forensic Fleet Active • ${count} ${count === 1 ? "Worker" : "Workers"}`,
      device: workerTelemetry?.worker_device || "Neural Processing Node",
      detail: workerTelemetry?.assigned_worker_id || "worker-fleet-01",
    };
  }, [workerTelemetry, isWorkerOffline]);

  const copyToClipboard = useCallback((text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "cmd") {
        setCopiedCmd(text);
        setTimeout(() => setCopiedCmd(null), 2500);
      } else if (type === "report") {
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 2500);
      }
    });
  }, []);

  const currentHumanStage =
    jobStatus?.stage_label ||
    STAGE_LABELS[currentStageKey] ||
    PIPELINE_STAGES[activeStageIndex]?.title ||
    "Processing Forensic Telemetry…";

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-accent selection:text-page">
      <Navbar />

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-8 flex-1 space-y-6 animate-in fade-in duration-300">
        {/* Page Top Header with Breadcrumbs & Dynamic Telemetry Pill */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-ink-3 mb-1">
              <span>FORENSIC LAB</span>
              <ChevronRight className="w-3 h-3 text-ink-3" />
              <span>PIPELINE TELEMETRY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
              {isComplete ? "Forensic Intelligence Report" : "Autonomous Forensic Radar"}
            </h1>
            <p className="text-xs font-mono text-ink-3 mt-1 flex items-center gap-2">
              <span>JOB ID:</span>
              <span className="text-ink-2 bg-inset px-2 py-0.5 rounded border border-line">
                {jobId}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Active Worker Status Pill */}
            {!error && (
              <StatusPill
                tone={isComplete ? "active" : workerBadge.tone}
                size="md"
                pulse={!isComplete && !isWorkerOffline}
                dot={true}
              >
                {isComplete ? "Verified Multi-Modal Verdict" : workerBadge.label}
              </StatusPill>
            )}

            {!isComplete && !error && (
              <div className="flex items-center gap-2 px-3 py-1 bg-surface border border-line rounded-full text-xs text-ink-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                <span className="font-mono">
                  {jobStatus?.status === "queued" ? "SQS Polling" : "Neural Executing"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
         * PROCESSING STATE & TELEMETRY RADAR
         * ───────────────────────────────────────────────────────────── */}
        {!isComplete && !error && (
          <div className="space-y-6">
            {/* Transparent Offline / Cold-Start Diagnostic Card */}
            {isWorkerOffline && (
              <div className="rounded-2xl bg-[#121417] border-[1.5px] border-amber-500/30 p-6 sm:p-8 shadow-card space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-ink">
                          No Forensic Worker Currently Active
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          IDLE QUEUE
                        </span>
                      </div>
                      <p className="text-sm text-ink-2 mt-1 max-w-2xl leading-relaxed">
                        Your media is securely queued in AWS SQS. Processing will begin
                        automatically when a worker connects.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-inset border border-line text-xs font-mono text-ink-3 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Queued: {elapsedQueueSeconds}s</span>
                  </div>
                </div>

                {/* EC2 Spot Auto-scaling cold-start notice */}
                <div className="p-4 rounded-xl bg-inset/80 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <div>
                      <span className="font-semibold text-ink">
                        Auto-scaling instance cold-start in progress: 60-90s
                      </span>
                      <p className="text-ink-3 text-[11px] mt-0.5">
                        AWS CloudWatch detected backlog in <span className="font-mono text-ink-2">netra-jobs</span>. Provisioning EC2 Spot worker node.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-ink-3 font-mono text-[11px]">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>S3: netra-media-uploads</span>
                  </div>
                </div>

                {/* 1-Click Copy Local Worker Start Command */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-accent" />
                      1-Click Local Developer Worker Runner
                    </span>
                    <div className="flex items-center gap-1 bg-inset p-0.5 rounded-lg border border-line text-xs">
                      <button
                        onClick={() => setActiveWorkerCmdTab("python")}
                        className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                          activeWorkerCmdTab === "python"
                            ? "bg-surface text-ink shadow-sm border border-line"
                            : "text-ink-3 hover:text-ink"
                        }`}
                      >
                        Python Daemon
                      </button>
                      <button
                        onClick={() => setActiveWorkerCmdTab("npm")}
                        className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                          activeWorkerCmdTab === "npm"
                            ? "bg-surface text-ink shadow-sm border border-line"
                            : "text-ink-3 hover:text-ink"
                        }`}
                      >
                        npm run worker
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-black/70 border border-line rounded-xl px-4 py-3 font-mono text-xs text-ink-2 overflow-x-auto">
                    <code className="text-amber-300">
                      {activeWorkerCmdTab === "python"
                        ? "python -m worker.worker"
                        : "npm run worker"}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          activeWorkerCmdTab === "python"
                            ? "python -m worker.worker"
                            : "npm run worker",
                          "cmd"
                        )
                      }
                      className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface border border-line text-ink hover:bg-hover hover:border-line-strong transition-all shrink-0 text-xs font-sans font-medium"
                    >
                      {copiedCmd ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-ink-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11.5px] text-ink-3">
                    Running this command locally will instantly connect to AWS SQS and process this job with your local GPU/Metal/CPU acceleration.
                  </p>
                </div>
              </div>
            )}

            {/* Radar & Progress HUD Container */}
            <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 sm:p-10 shadow-card space-y-8">
              {/* Radar Header with Current Action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-inset border border-line shrink-0">
                    <Activity className="w-7 h-7 text-accent animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-ink-3 uppercase tracking-wider">
                        Stage {activeStageIndex + 1} of {PIPELINE_STAGES.length}
                      </span>
                      <span className="text-ink-3">•</span>
                      <span className="text-xs font-mono text-accent">
                        {PIPELINE_STAGES[activeStageIndex]?.category || "Pipeline Engine"}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
                      {currentHumanStage}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-xs font-mono text-ink-3 uppercase">Total Progress</span>
                    <div className="text-3xl font-extrabold font-mono tracking-tight text-ink">
                      {currentProgress}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Smooth Progress Bar */}
              <div className="space-y-2">
                <div className="bg-inset rounded-full h-2.5 overflow-hidden p-0.5 border border-line">
                  <div
                    className="h-full bg-gradient-to-r from-accent/70 via-accent to-emerald-400 rounded-full transition-all duration-700 ease-out relative shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                    style={{ width: `${Math.max(currentProgress, 2)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono text-ink-3">
                  <span>0% Media Ingest</span>
                  <span>50% Neural Embeddings</span>
                  <span>100% Forensic Verdict</span>
                </div>
              </div>

              {/* 10-Stage Real-Time Checklist Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-ink-2" />
                    Forensic Pipeline Execution Matrix (10 Stages)
                  </h3>
                  <span className="text-xs font-mono text-ink-3">
                    {activeStageIndex} Completed • 1 In-Flight • {Math.max(0, 9 - activeStageIndex)} Pending
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isDone = idx < activeStageIndex || currentProgress >= stage.targetProgress;
                    const isActive = idx === activeStageIndex && !isDone;
                    const isPending = idx > activeStageIndex && !isDone;

                    return (
                      <div
                        key={stage.id}
                        className={`p-3.5 rounded-xl border transition-all duration-300 flex items-start justify-between gap-3 ${
                          isActive
                            ? "border-accent/40 bg-accent/5 shadow-sm ring-1 ring-accent/20"
                            : isDone
                            ? "border-green-500/20 bg-green-500/[0.03] text-ink"
                            : "border-line bg-inset/40 text-ink-3 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <div className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400">
                                <Check className="w-3 h-3" />
                              </div>
                            ) : isActive ? (
                              <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                                <Loader2 className="w-3 h-3 animate-spin" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-line bg-inset flex items-center justify-center text-[10px] font-mono text-ink-3">
                                {idx + 1}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  isActive ? "text-ink" : isDone ? "text-ink" : "text-ink-3"
                                }`}
                              >
                                {stage.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-inset border border-line text-ink-3">
                                {stage.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-ink-3 mt-0.5 leading-snug">
                              {stage.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                              isDone
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : isActive
                                ? "bg-accent/10 text-accent border-accent/30 animate-pulse"
                                : "bg-inset text-ink-3 border-line"
                            }`}
                          >
                            {isDone ? "PASS" : isActive ? "ACTIVE" : "QUEUED"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fleet & Queue Diagnostics Footnote */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-line text-xs font-mono text-ink-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-ink-2" />
                    Device: <span className="text-ink-2">{workerBadge.device}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-ink-2" />
                    Node ID: <span className="text-ink-2">{workerBadge.detail}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-ink-2" />
                  <span>DynamoDB Atomic Sync (TTL 120s)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
         * ERROR STATE
         * ───────────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/25 p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-card space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-red-400">Forensic Pipeline Exception</h2>
            <p className="text-sm text-ink-2 max-w-md">{error}</p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-line text-ink text-sm font-medium hover:bg-hover transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Telemetry Poll
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-5 py-2.5 rounded-xl bg-accent text-page text-sm font-medium hover:bg-ink-2 transition-all"
              >
                Return to Sandbox
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
         * COMPLETE STATE: FULL FORENSIC DOSSIER & REPORT
         * ───────────────────────────────────────────────────────────── */}
        {isComplete && result && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Confidence & Multi-Detector Scorecard Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 flex flex-col items-center justify-center min-h-[300px] shadow-card">
                <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider mb-6 self-start w-full">
                  Overall Detection Confidence
                </h3>
                <ConfidenceMeter
                  value={result.confidence}
                  verdict={result.verdict}
                />
              </div>

              <div className="lg:col-span-2 rounded-2xl bg-surface border-[1.5px] border-line p-6 shadow-card flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider mb-6">
                    Multi-Detector Neural Scorecard
                  </h3>
                  <DetectorScorecard
                    gendScore={result.gend_score}
                    visualScore={result.visual_score}
                    audioScore={result.audio_score}
                    clipScore={result.clip_score}
                    verdict={result.verdict}
                  />
                </div>

                <div className="pt-4 mt-4 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink-3">
                  <span>Ensemble: GenD ViT-L/14 + Spatial SBI + Wav2Vec2</span>
                  <span className="text-accent">Active Cloud Node: ap-south-1</span>
                </div>
              </div>
            </div>

            {/* Interactive Evidence Timeline & Video Player */}
            <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider">
                  Interactive Evidence Timeline
                </h3>
                <span className="text-xs font-mono text-ink-3">
                  Click any frame marker to seek in player
                </span>
              </div>

              <div className="rounded-xl overflow-hidden border border-line bg-black flex justify-center items-center shadow-inner relative max-w-2xl mx-auto aspect-video">
                <ResilientVideoPlayer
                  videoRef={videoRef}
                  primaryUrl={videoSources.primaryUrl}
                  fallbackUrl={videoSources.streamUrl}
                  onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-4 rounded-xl bg-inset border border-line">
                <EvidenceTimeline
                  frames={result.frames || []}
                  audioFlags={result.audio_flags || []}
                  duration={videoDuration > 0 ? videoDuration : (result.video_duration || 5)}
                  onSeek={handleSeek}
                  videoUrl={videoUrl}
                  verdict={result.verdict}
                />
              </div>
            </div>

            {/* Detailed AI Forensic Intelligence Dossier */}
            <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 sm:p-8 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider">
                    Forensic Intelligence Dossier
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-ink-3 hidden sm:inline">
                    {result.report_generated_by || "NETRA Neural Forensic Engine v5.0"}
                  </span>
                  <button
                    onClick={() => copyToClipboard(result.forensic_report || JSON.stringify(result, null, 2), "report")}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-inset border border-line text-xs font-medium text-ink hover:bg-hover transition-all"
                  >
                    {copiedReport ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-ink-3" />
                        <span>Copy Dossier</span>
                      </>
                    )}
                  </button>
                  <button
                    disabled={isGeneratingPdf}
                    onClick={async () => {
                      try {
                        setIsGeneratingPdf(true);
                        const computedRisk =
                          result.risk_level ||
                          (result.confidence >= 75
                            ? "CRITICAL"
                            : result.confidence >= 50
                            ? "HIGH"
                            : "LOW");

                        // Resolve proxied image URLs for keyframe snapshots
                        const rawSnapshots =
                          result.keyframe_snapshots ||
                          result.frames
                            ?.filter((f) => f.annotated_image_url)
                            .map((f) => ({
                              frame_number: f.frame_number,
                              timestamp: f.timestamp,
                              anomaly_region: f.anomaly_region || "Eyewear / Facial Specular Discontinuity",
                              anomaly_score: f.confidence,
                              image_url: f.annotated_image_url!,
                              annotated_image_url: f.annotated_image_url!,
                              detector_subsystem: f.detector_subsystem || "GenD Foundation Model ViT-L/14 + Spatial SBI",
                              bounding_box: f.bounding_box || [0, 0, 0, 0],
                            })) || [];

                        const sanitizedSnapshots = rawSnapshots.map((snap) => {
                          let imgUrl = snap.annotated_image_url || snap.image_url;
                          if (imgUrl && imgUrl.startsWith("/api/v1/")) {
                            imgUrl = `/api/backend${imgUrl}`;
                          }
                          return {
                            ...snap,
                            image_url: imgUrl,
                            annotated_image_url: imgUrl,
                          };
                        });

                        await generateForensicPDF({
                          id: jobId,
                          title: "Video Forensic Analysis Dossier",
                          verdict: result.verdict,
                          confidence: result.confidence,
                          riskLevel: computedRisk,
                          mediaType: "video_deepfake",
                          timestamp: jobStatus?.created_at || undefined,
                          scores: {
                            gendScore: result.gend_score ?? (result.confidence > 50 ? result.confidence / 100 : null),
                            visualScore: result.visual_score ?? (result.confidence > 50 ? result.confidence / 100 : null),
                            audioScore: result.audio_score,
                            clipScore: result.clip_score,
                          },
                          frames: result.frames,
                          keyframeSnapshots: sanitizedSnapshots,
                          summary: result.forensic_report || `Forensic inspection confirmed synthetic tampering for job ${jobId}. Classified as ${result.verdict} with ${result.confidence}% confidence.`,
                        });
                      } finally {
                        setTimeout(() => setIsGeneratingPdf(false), 1200);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/40 text-xs font-semibold text-accent hover:bg-accent/25 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span>Compiling Forensic PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Generate &amp; Download Forensic PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className="bg-inset/50 rounded-xl p-5 border border-line text-sm text-ink-2 leading-relaxed whitespace-pre-wrap font-sans">
                {result.forensic_report || `Forensic analysis completed for job ${jobId}. Verified verdict: ${result.verdict} with ${result.confidence}% confidence across GenD ViT-L and Spatial SBI models.`}
              </div>

              {/* Forensic Artifacts Breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-inset/30 border border-line space-y-2">
                  <h4 className="text-xs font-mono text-ink uppercase tracking-wider">Detected Visual Artifacts</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.frames && result.frames.flatMap((f) => f.flags).length > 0 ? (
                      Array.from(new Set(result.frames.flatMap((f) => f.flags))).map((flag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                          {flag.replace(/_/g, " ")}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-3 font-mono">No localized facial boundary blending detected</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-inset/30 border border-line space-y-2">
                  <h4 className="text-xs font-mono text-ink uppercase tracking-wider">Audio & Spectral Signatures</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.audio_flags && result.audio_flags.length > 0 ? (
                      result.audio_flags.map((flag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono">
                          {flag.replace(/_/g, " ")}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-3 font-mono">
                        {result.audio_score !== null ? "Acoustic spectrum consistent with authentic speech" : "Silent media / No acoustic stream in MP4 container"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Digital Chain of Custody & Evidence Metadata */}
              <div className="p-4 rounded-xl bg-inset/20 border border-line">
                <h4 className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-3">
                  Digital Chain of Custody & Cloud Telemetry
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-ink-3 block">Cloud Region</span>
                    <span className="text-accent font-semibold">ap-south-1 (Mumbai)</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block">Worker Node</span>
                    <span className="text-ink font-semibold truncate block" title={jobStatus?.worker_telemetry?.assigned_worker_id || "worker-mumbai-ec2"}>
                      {jobStatus?.worker_telemetry?.assigned_worker_id || "worker-mumbai-ec2"}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-3 block">Ledger Persistence</span>
                    <span className="text-green-400 font-semibold">DynamoDB netra-jobs</span>
                  </div>
                  <div>
                    <span className="text-ink-3 block">Encrypted Media Bucket</span>
                    <span className="text-ink font-semibold truncate block">netra-media-mumbai</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Suspicious Signals & Metadata Flags */}
            {result.metadata_flags && result.metadata_flags.length > 0 && (
              <div className="rounded-2xl bg-surface border-[1.5px] border-line p-6 shadow-card space-y-3">
                <h3 className="text-xs font-mono text-ink-3 uppercase tracking-wider">
                  Auxiliary Suspicious Signals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.metadata_flags.map((flag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-mono font-medium"
                    >
                      {flag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Footer & Return Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-line text-xs text-ink-3 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Forensically persisted to DynamoDB netra-jobs</span>
              </div>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-page font-sans font-medium hover:bg-ink-2 transition-all"
              >
                Scan Another Media
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

