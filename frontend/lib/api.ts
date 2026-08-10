// lib/api.ts — NETRA API client
// Extend the existing Vercel app — do NOT replace

const isBrowser = typeof window !== "undefined";
const API_BASE = "/api/backend";

export interface FrameEvidence {
  frame_number: number;
  timestamp: string;
  confidence: number;
  flags: string[];
  spatial_score: number;
}

export interface DetectionResult {
  verdict: string;
  confidence: number;
  visual_score: number;
  audio_score: number | null;
  clip_score: number | null;
  risk_level: string;
  frames: FrameEvidence[];
  audio_flags: string[];
  metadata_flags: string[];
  forensic_report: string;
  report_generated_by: string;
  manipulation_type: string;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "processing" | "complete" | "error";
  progress: number;
  current_stage: string;
  result: DetectionResult | null;
  created_at: string | null;
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
export async function pollJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);
  return res.json();
}

/** Get presigned S3 URL for video playback. */
export async function getVideoUrl(jobId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/video-url`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

/** WebSocket connection for real-time progress (Should-Have). */
export function connectWebSocket(
  jobId: string,
  onUpdate: (data: Partial<JobStatus>) => void
): WebSocket {
  const wsProtocol = isBrowser && window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsHost = isBrowser ? window.location.host : "localhost:8000";
  const wsUrl = `${wsProtocol}//${wsHost}${API_BASE}`;
  const ws = new WebSocket(`${wsUrl}/api/v1/ws/${jobId}`);
  ws.onmessage = (e) => {
    try {
      onUpdate(JSON.parse(e.data));
    } catch {
      // ignore parse errors
    }
  };
  return ws;
}
