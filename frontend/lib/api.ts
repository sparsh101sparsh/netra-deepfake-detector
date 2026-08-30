// lib/api.ts — NETRA API client
// Extend the existing Vercel app — do NOT replace

const isBrowser = typeof window !== "undefined";
const API_BASE = "/api/backend";

export interface KeyframeSnapshot {
  frame_number: number;
  timestamp: string;
  anomaly_region: string;
  anomaly_score: number;
  confidence?: number;
  image_path?: string;
  image_url: string;
  annotated_image_url?: string;
  detector_subsystem: string;
  bounding_box: [number, number, number, number];
  normalized_box?: [number, number, number, number];
  evidence_code?: string;
  statutory_act?: string;
}

export interface FrameEvidence {
  frame_number: number;
  timestamp: string;
  confidence: number;
  flags: string[];
  spatial_score: number;
  clip_score?: number | null;
  annotated_image_url?: string;
  image_path?: string;
  bounding_box?: [number, number, number, number];
  anomaly_region?: string;
  detector_subsystem?: string;
}

export interface DetectionResult {
  verdict: string;
  confidence: number;
  visual_score: number;
  gend_score?: number | null;
  audio_score: number | null;
  clip_score: number | null;
  risk_level: string;
  frames: FrameEvidence[];
  keyframe_snapshots?: KeyframeSnapshot[];
  audio_flags: string[];
  metadata_flags: string[];
  forensic_report: string;
  executive_summary?: string | null;
  report_generated_by?: string;
  manipulation_type?: string;
  video_duration?: number;
  frames_analyzed?: number;
}

export interface WorkerTelemetry {
  worker_status: "active" | "offline" | "degraded";
  active_workers_count: number;
  assigned_worker_id?: string | null;
  worker_device?: string | null;
  last_worker_heartbeat?: string | null;
  estimated_wait_seconds?: number | null;
  stage_label?: string;
  queue_length?: number;
  queue_age_seconds?: number;
}

export interface JobStatusResponse {
  job_id: string;
  status: "queued" | "processing" | "complete" | "error";
  progress: number;
  current_stage: string;
  stage_label?: string | null;
  worker_telemetry?: WorkerTelemetry | null;
  result: DetectionResult | null;
  error?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
}

/** Legacy type alias for JobStatusResponse */
export type JobStatus = JobStatusResponse;

export interface PipelineStageConfig {
  id: string;
  title: string;
  category: string;
  description: string;
  targetProgress: number;
  aliases: string[];
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: "downloading",
    title: "Media Ingestion",
    category: "I/O Stream",
    description: "Retrieving media file from secure Amazon S3 bucket",
    targetProgress: 5,
    aliases: ["downloading", "Downloading video", "download", "ingestion"],
  },
  {
    id: "extracting",
    title: "Frame & Audio Splitting",
    category: "FFmpeg Extractor",
    description: "Extracting video frames and 16kHz mono audio track",
    targetProgress: 15,
    aliases: ["extracting", "Extracting frames and audio", "extract", "ffmpeg"],
  },
  {
    id: "spatial_vit",
    title: "Spatial SBI / ViT Forensics",
    category: "Visual Neural",
    description: "Scanning face crops with Spatial SBI & Vision Transformer detector",
    targetProgress: 30,
    aliases: ["spatial_vit", "Running spatial deepfake detector", "spatial", "sbi", "vit"],
  },
  {
    id: "clip_probe",
    title: "CLIP Zero-Shot Embeddings",
    category: "Semantic Hypersphere",
    description: "Evaluating hypersphere CLIP embeddings for synthetic AI signatures",
    targetProgress: 50,
    aliases: ["clip_probe", "Running CLIP generalisation detector", "clip", "gend"],
  },
  {
    id: "audio_analysis",
    title: "Voice Cloning & Vocoder Forensics",
    category: "Acoustic Neural",
    description: "Wav2Vec2 vocal spectral profiling & synthetic voice clone detection",
    targetProgress: 65,
    aliases: ["audio_analysis", "Running audio deepfake detector", "audio", "wav2vec2"],
  },
  {
    id: "metadata_aux",
    title: "Metadata & Auxiliary Signal Audit",
    category: "Container Analysis",
    description: "Auditing EXIF metadata, container atom headers & noise variance",
    targetProgress: 75,
    aliases: ["metadata_aux", "Analyzing metadata and auxiliary signals", "metadata", "auxiliary"],
  },
  {
    id: "fusion",
    title: "Multi-Modal Gated Fusion",
    category: "Fusion Arbiter",
    description: "Gated cross-modal confidence weighting & probability arbitration",
    targetProgress: 82,
    aliases: ["fusion", "Fusing detector scores", "fuse", "gated_fusion"],
  },
  {
    id: "evidence_bundle",
    title: "Evidence Bundle Compilation",
    category: "Forensic Matrix",
    description: "Structuring chronological forensic evidence & timestamp anomalies",
    targetProgress: 87,
    aliases: ["evidence_bundle", "Building evidence bundle", "evidence"],
  },
  {
    id: "dossier",
    title: "Forensic Intelligence Dossier",
    category: "Dossier Engine",
    description: "Synthesizing deterministic multi-signal forensic dossier",
    targetProgress: 92,
    aliases: ["dossier", "Consolidating forensic evidence dossier", "Synthesizing forensic dossier", "Generating forensic report"],
  },
  {
    id: "complete",
    title: "Verdict Finalization",
    category: "Cryptographic Audit",
    description: "Validating cryptographic integrity & persisting audit verdict",
    targetProgress: 100,
    aliases: ["complete", "Finalizing results", "Analysis complete", "done"],
  },
];

export const STAGE_LABELS: Record<string, string> = {
  queued: "Queued for processing…",
  downloading: "Retrieving media file from secure Amazon S3…",
  extracting: "Extracting video frames and 16kHz audio track…",
  spatial_vit: "Running Spatial SBI & ViT facial manipulation scan…",
  clip_probe: "Scanning CLIP hypersphere AI generation signatures…",
  audio_analysis: "Analyzing Wav2Vec2 voice clone frequencies…",
  metadata_aux: "Inspecting EXIF metadata & container artifacts…",
  fusion: "Running Gated Multi-Modal Decision Fusion…",
  evidence_bundle: "Structuring chronological forensic evidence bundle…",
  dossier: "Synthesizing forensic intelligence dossier…",
  complete: "Analysis complete — report ready",
  // Legacy human strings from worker
  "Downloading video": "Retrieving media file from secure Amazon S3…",
  "Extracting frames and audio": "Extracting video frames and 16kHz audio track…",
  "Running spatial deepfake detector": "Running Spatial SBI & ViT facial manipulation scan…",
  "Running CLIP generalisation detector": "Scanning CLIP hypersphere AI generation signatures…",
  "Running audio deepfake detector": "Analyzing Wav2Vec2 voice clone frequencies…",
  "Analyzing metadata and auxiliary signals": "Inspecting EXIF metadata & container artifacts…",
  "Fusing detector scores": "Running Gated Multi-Modal Decision Fusion…",
  "Building evidence bundle": "Structuring chronological forensic evidence bundle…",
  "Consolidating forensic evidence dossier": "Synthesizing forensic intelligence dossier…",
  "Synthesizing forensic dossier": "Synthesizing forensic intelligence dossier…",
  "Generating forensic report": "Synthesizing forensic intelligence dossier…",
  "Finalizing results": "Finalizing verdict and persisting audit report…",
  "Analysis complete": "Analysis complete — report ready",
};

export interface WorkerNodeInfo {
  worker_id: string;
  status: "idle" | "busy" | "offline" | "processing" | "draining";
  device_type: string;
  device_name?: string;
  active_job_id?: string | null;
  last_heartbeat: string;
  seconds_since_heartbeat?: number;
}

export interface WorkerFleetStatusResponse {
  status: "active" | "offline" | "degraded";
  active_workers_count: number;
  total_registered?: number;
  workers: WorkerNodeInfo[];
}

/** Upload video and get job_id. Returns immediately (non-blocking). */
export async function uploadVideo(file: File): Promise<{ job_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/detect/full`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }

  return res.json();
}

/** Poll job status from DynamoDB via API. */
export async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);
  return res.json();
}

/** Query the global worker fleet presence. */
export async function getWorkerFleetStatus(): Promise<WorkerFleetStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/workers/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface VideoMediaSources {
  primaryUrl: string | null;
  streamUrl: string;
}

/** Get S3 presigned URL and streaming proxy URL for resilient video playback. */
export async function getVideoMediaSources(jobId: string): Promise<VideoMediaSources> {
  const fallbackStream = `${API_BASE}/api/v1/jobs/${jobId}/stream`;
  try {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/video-url`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return { primaryUrl: fallbackStream, streamUrl: fallbackStream };
    }
    const data = await res.json();
    const stream = data.stream_url ? `${API_BASE}${data.stream_url}` : fallbackStream;
    // Prioritize streaming proxy over private S3 URLs that throw 403 Forbidden
    const isPrivateS3 = data.url && data.url.includes(".s3.amazonaws.com");
    const primary = isPrivateS3 ? stream : (data.url || stream);
    return { primaryUrl: primary, streamUrl: stream };
  } catch {
    return { primaryUrl: fallbackStream, streamUrl: fallbackStream };
  }
}

/** Get presigned S3 URL for video playback. */
export async function getVideoUrl(jobId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/video-url`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

/** WebSocket connection for real-time progress.
 *  IMPORTANT: Next.js rewrites (/api/backend → backend) do NOT proxy WebSocket connections.
 *  We must connect directly to the backend API URL derived from NEXT_PUBLIC_API_URL.
 */
export function connectWebSocket(
  jobId: string,
  onUpdate: (data: Partial<JobStatusResponse>) => void
): WebSocket {
  // Derive the backend base URL: NEXT_PUBLIC_API_URL is the HTTP(S) backend root.
  // In production this is https://netra-api-pmr7.onrender.com
  // In dev this is http://127.0.0.1:8000
  const backendHttpUrl = isBrowser
    ? (process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== "undefined" && window.location.hostname.includes("render.com")
          ? "https://netra-api-pmr7.onrender.com"
          : `${window.location.protocol}//${window.location.hostname}:8000`))
    : "http://localhost:8000";
  // Convert http(s): → ws(s): for native WebSocket protocol
  const wsBaseUrl = backendHttpUrl.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBaseUrl}/api/v1/ws/${jobId}`);
  ws.onmessage = (e) => {
    try {
      onUpdate(JSON.parse(e.data));
    } catch {
      // ignore parse errors
    }
  };
  return ws;
}
