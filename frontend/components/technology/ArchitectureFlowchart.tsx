"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { 
  Upload, Layers, Eye, Cpu, Sparkles, Radio, Activity, 
  Shield, Terminal, Database, ShieldCheck, Sliders, 
  RotateCcw, ZoomIn, ZoomOut, Check, ChevronDown, Info,
  CheckCircle2, AlertTriangle, ArrowRight, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
 * NETRA ARCHITECTURE FLOWCHART
 * Inspired by beautiful-ui primitives/Flowchart.tsx:
 * - Dotted editor canvas background
 * - Draggable nodes with measured SVG cubic bezier curves
 * - Kind pill badges above cards
 * - Real condition dropdowns (Menu pattern with animated hover box)
 * - Edge highlighting and deep model inspection integration
 * ───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
 * BEAUTIFUL UI DESIGN SYSTEM CONSTANTS
 * Hues, color-mix helper, and layout metrics
 * ───────────────────────────────────────────────────────── */
const PURPLE = "#9a5cff";
const AMBER = "#f09a2f";
const CYAN = "#06b6d4";
const SKY = "#0ea5e9";
const ROSE = "#f43f5e";
const VIOLET = "#a855f7";
const EMERALD = "#10b981";
const BLUE = "#3b82f6";

const mix = (hue: string, pct: number, base = "var(--surface)") =>
  `color-mix(in srgb, ${hue} ${pct}%, ${base})`;

const PAD_Y = 28;
const ROW_GAP = 68;
const PILL_OFFSET = 30; // kind pill + gap above a card

export interface FlowNode {
  id: string;
  modelId: string;
  row: number;
  x: number; // 0–1 horizontal center fraction
  w: number;
  kind?: { label: string; hue: string };
  hue: string;
  title: string;
  caption?: string;
  tag?: string;
  latency?: string;
  icon: React.ElementType;
  condition?: boolean; // renders the interactive Gated Fusion condition card
}

export const ARCHITECTURE_NODES: FlowNode[] = [
  // Row 0: Ingestion Trigger
  {
    id: "ingestion",
    modelId: "ingestion",
    row: 0,
    x: 0.5,
    w: 360,
    kind: { label: "Trigger", hue: PURPLE },
    hue: PURPLE,
    title: "Multi-Modal Ingestion Gateway",
    caption: "Web Dropzone (MP4/MOV/PNG) & Twilio WhatsApp/Telegram Webhooks",
    tag: "FastAPI Ingress",
    latency: "< 120 ms",
    icon: Upload,
  },

  // Row 1: Async Task Distribution & Decoding
  {
    id: "queue_ffmpeg",
    modelId: "queue_ffmpeg",
    row: 1,
    x: 0.5,
    w: 380,
    kind: { label: "Task Queue & Demux", hue: CYAN },
    hue: CYAN,
    title: "Amazon SQS & FFmpeg Preprocessing",
    caption: "Decoupled async SQS queue; FFmpeg extracts 1 FPS frames & 16kHz WAV audio",
    tag: "SQS + FFmpeg",
    latency: "~450 ms",
    icon: Layers,
  },

  // Row 2: Alignment & Stream Splitting
  {
    id: "insightface",
    modelId: "insightface",
    row: 2,
    x: 0.28,
    w: 330,
    kind: { label: "Computer Vision", hue: SKY },
    hue: SKY,
    title: "InsightFace (RetinaFace-ResNet50)",
    caption: "68/106 3D facial landmarks, affine transformation & 224×224 RGB crop",
    tag: "CUDA 12 ONNX",
    latency: "18 ms/f",
    icon: Eye,
  },
  {
    id: "audio_demux",
    modelId: "audio_demux",
    row: 2,
    x: 0.72,
    w: 330,
    kind: { label: "Acoustic Demux", hue: EMERALD },
    hue: EMERALD,
    title: "16kHz Mono Audio Resampler",
    caption: "16-bit linear PCM audio stream buffer preparation for spectral DSP",
    tag: "Acoustic Stream",
    latency: "42 ms",
    icon: Radio,
  },

  // Row 3: Parallel Specialist Detectors
  {
    id: "efficientnet_sbi",
    modelId: "efficientnet_sbi",
    row: 3,
    x: 0.12,
    w: 280,
    kind: { label: "Visual SBI", hue: ROSE },
    hue: ROSE,
    title: "EfficientNet-B4 + SBI",
    caption: "19.3M params CNN scanning blending seams & frequency boundaries",
    tag: "P_visual (W: 0.50)",
    latency: "14 ms/batch",
    icon: Cpu,
  },
  {
    id: "clip_probe",
    modelId: "clip_probe",
    row: 3,
    x: 0.37,
    w: 280,
    kind: { label: "CLIP Probe", hue: VIOLET },
    hue: VIOLET,
    title: "OpenAI CLIP ViT-L/14 Probe",
    caption: "24-layer ViT, 768-d CLS token + 3-layer MLP for Sora/Midjourney artifacts",
    tag: "P_clip (W: 0.15)",
    latency: "22 ms/batch",
    icon: Sparkles,
  },
  {
    id: "wav2vec",
    modelId: "wav2vec",
    row: 3,
    x: 0.63,
    w: 280,
    kind: { label: "Wav2Vec Audio", hue: EMERALD },
    hue: EMERALD,
    title: "Wav2Vec 2.0 + Librosa DSP",
    caption: "MelodyMachine Deepfake-V2 + 40-MFCC & F0 pitch jitter analysis",
    tag: "P_audio (W: 0.35)",
    latency: "65 ms",
    icon: Activity,
  },
  {
    id: "aux_engine",
    modelId: "aux_engine",
    row: 3,
    x: 0.88,
    w: 280,
    kind: { label: "Auxiliary Forensics", hue: CYAN },
    hue: CYAN,
    title: "EXIF, Codec & Jitter Engine",
    caption: "MP4 atom parser, inter-frame lighting jitter & A/V sync temporal lag",
    tag: "Delta_aux (0-0.10)",
    latency: "8 ms",
    icon: Shield,
  },

  // Row 4: Scam Intelligence & Gated Fusion Condition
  {
    id: "scam_nlp",
    modelId: "scam_nlp",
    row: 4,
    x: 0.22,
    w: 320,
    kind: { label: "Scam NLP", hue: AMBER },
    hue: AMBER,
    title: "OCR + Whisper + Random Forest",
    caption: "Tesseract onscreen scan + Whisper speech transcription + 5000 TF-IDF n-grams",
    tag: "Cyber Scam NLP",
    latency: "180 ms",
    icon: Terminal,
  },
  {
    id: "gated_fusion",
    modelId: "gated_fusion",
    row: 4,
    x: 0.68,
    w: 480,
    kind: { label: "If / Else", hue: AMBER },
    hue: AMBER,
    title: "Mathematical Gated Fusion Engine",
    caption: "Dynamic weighting algorithm conditioned on modality presence",
    icon: Sliders,
    condition: true,
  },

  // Row 5: Structured Evidence & LLM Synthesis
  {
    id: "evidence_pack",
    modelId: "evidence_pack",
    row: 5,
    x: 0.32,
    w: 340,
    kind: { label: "Telemetry", hue: BLUE },
    hue: BLUE,
    title: "Zero-Pixel Evidence Bundle",
    caption: "Structured JSON telemetry: frame timestamps, anomaly bounding boxes & confidence",
    tag: "Pydantic v2 JSON",
    latency: "< 5 ms",
    icon: Database,
  },
  {
    id: "bedrock_claude",
    modelId: "bedrock_claude",
    row: 5,
    x: 0.72,
    w: 360,
    kind: { label: "LLM Synthesis", hue: PURPLE },
    hue: PURPLE,
    title: "Amazon Bedrock (Claude 3.5 Sonnet)",
    caption: "Synthesizes 4-section technical forensic dossier with multi-modal anomaly telemetry",
    tag: "Bedrock API",
    latency: "1.4 s",
    icon: Sparkles,
  },

  // Row 6: Final Verdict & Multichannel Outpost
  {
    id: "verdict_delivery",
    modelId: "verdict_delivery",
    row: 6,
    x: 0.5,
    w: 400,
    kind: { label: "Verdict Dossier", hue: EMERALD },
    hue: EMERALD,
    title: "Verdict Dossier & Live Radar",
    caption: "Updates India Cyber Threat Radar, delivers WhatsApp verdict & generates signed PDF",
    tag: "Final Delivery",
    latency: "< 250 ms",
    icon: ShieldCheck,
  },
];

export const ARCHITECTURE_EDGES = [
  { from: "ingestion", to: "queue_ffmpeg" },
  { from: "queue_ffmpeg", to: "insightface" },
  { from: "queue_ffmpeg", to: "audio_demux" },
  { from: "insightface", to: "efficientnet_sbi" },
  { from: "insightface", to: "clip_probe" },
  { from: "audio_demux", to: "wav2vec" },
  { from: "audio_demux", to: "aux_engine" },
  { from: "insightface", to: "scam_nlp" },
  { from: "efficientnet_sbi", to: "gated_fusion" },
  { from: "clip_probe", to: "gated_fusion" },
  { from: "wav2vec", to: "gated_fusion" },
  { from: "aux_engine", to: "gated_fusion" },
  { from: "scam_nlp", to: "gated_fusion" },
  { from: "gated_fusion", to: "evidence_pack" },
  { from: "evidence_pack", to: "bedrock_claude" },
  { from: "bedrock_claude", to: "verdict_delivery" },
];

const EST_H: Record<string, number> = {
  ingestion: 92,
  queue_ffmpeg: 92,
  insightface: 92,
  audio_demux: 92,
  efficientnet_sbi: 92,
  clip_probe: 92,
  wav2vec: 92,
  aux_engine: 92,
  scam_nlp: 92,
  gated_fusion: 140,
  evidence_pack: 92,
  bedrock_claude: 92,
  verdict_delivery: 92,
};

/* ── Beautiful UI Primitives & Micro-Icons ── */
function Handle() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" className="shrink-0 cursor-grab text-ink-3/70">
      {[3, 8, 13].flatMap((y) => [
        <circle key={`l${y}`} cx="3" cy={y} r="1.1" fill="currentColor" />,
        <circle key={`r${y}`} cx="7.5" cy={y} r="1.1" fill="currentColor" />,
      ])}
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-3">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ── Dropdown menu matching Beautiful UI PromptBar pattern ── */
function Menu({
  items,
  value,
  width,
  align,
  onPick,
}: {
  items: { name: string; tag?: string }[];
  value: string;
  width: string;
  align: "left" | "right";
  onPick: (name: string) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  const valueIndex = items.findIndex((item) => item.name === value);
  useLayoutEffect(() => {
    const row = rowRefs.current[hovered ?? valueIndex];
    if (row) setBox({ top: row.offsetTop, height: row.offsetHeight });
  }, [hovered, valueIndex]);

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      className={`absolute bottom-full z-20 mb-1.5 rounded-[10px] bg-surface p-1 shadow-raised ${width}
        ${align === "right" ? "right-0" : "left-0"}`}
      style={{
        animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
        transformOrigin: align === "right" ? "bottom right" : "bottom left",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
        style={{
          top: box?.top ?? 0,
          height: box?.height ?? 0,
          opacity: box && hovered !== null ? 1 : 0,
          transition: "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
        }}
      />
      {items.map((item, i) => (
        <button
          key={item.name}
          type="button"
          ref={(el) => {
            rowRefs.current[i] = el;
          }}
          onMouseEnter={() => setHovered(i)}
          onClick={() => onPick(item.name)}
          className="relative z-10 flex h-7.5 w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{item.name}</span>
          {item.tag && <span className="shrink-0 text-[11px] text-ink-3">{item.tag}</span>}
          <span className={`shrink-0 text-ink ${item.name === value ? "" : "invisible"}`}>
            <Check size={13} strokeWidth={2.5} />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Source chip and Select chip inside the condition card ── */
function SourceChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span
      data-ui
      className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] bg-surface px-1.5 text-[12px] font-medium text-ink shadow-btn"
    >
      <span className="text-ink-2">
        <Icon size={12} />
      </span>
      {label}
    </span>
  );
}

function SelectChip({
  id,
  value,
  dot,
  dotColor = AMBER,
  items,
  width,
  align = "left",
  open,
  onToggle,
  onPick,
}: {
  id: string;
  value: string;
  dot?: boolean;
  dotColor?: string;
  items: { name: string; tag?: string }[];
  width: string;
  align?: "left" | "right";
  open: boolean;
  onToggle: (id: string) => void;
  onPick: (id: string, name: string) => void;
}) {
  return (
    <span data-ui className="relative inline-flex min-w-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className={`inline-flex h-6 min-w-0 cursor-pointer items-center gap-1 rounded-[6px] px-1.5
          text-[12px] font-medium text-ink transition-colors duration-100
          ${open ? "bg-hover-2" : "bg-field hover:bg-hover-2"}`}
      >
        {dot && <span className="size-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />}
        <span className="min-w-0 truncate">{value}</span>
        <Chevron />
      </button>
      {open && (
        <Menu
          items={items}
          value={value}
          width={width}
          align={align}
          onPick={(name) => onPick(id, name)}
        />
      )}
    </span>
  );
}

/* ── Interactive Condition Body ── */
function ConditionBody() {
  const [modality, setModality] = useState("Audio Track Present");
  const [visualCondition, setVisualCondition] = useState("SBI Score > 0.65");
  const [acousticCondition, setAcousticCondition] = useState("Pitch Jitter Flatline");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-ui]")) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const toggle = (id: string) => setOpen((current) => (current === id ? null : id));
  const pick = (id: string, name: string) => {
    if (id === "modality") setModality(name);
    else if (id === "visual") setVisualCondition(name);
    else if (id === "acoustic") setAcousticCondition(name);
    setOpen(null);
  };

  const isAudioPresent = modality === "Audio Track Present";
  const isHighVisual = visualCondition.includes("> 0.65");
  const isSyntheticAudio = acousticCondition.includes("Flatline") || acousticCondition.includes("Vocoder");

  let simulatedScore = 0.50 * (isHighVisual ? 0.88 : 0.20) + 0.35 * (isSyntheticAudio ? 0.94 : 0.15) + 0.15 * 0.40 + 0.04;
  if (modality === "Silent Video Only") {
    simulatedScore = 0.75 * (isHighVisual ? 0.88 : 0.20) + 0.25 * 0.40 + 0.04;
  } else if (modality === "Voice Note Only") {
    simulatedScore = (isSyntheticAudio ? 0.85 * 0.94 : 0.85 * 0.15) + 0.15 * 0.70;
  }
  simulatedScore = Math.min(0.99, simulatedScore);

  const verdict = simulatedScore > 0.65 
    ? { label: "CONFIRMED DEEPFAKE", color: "text-red bg-red-tint" }
    : simulatedScore >= 0.35 
    ? { label: "SUSPICIOUS MEDIA", color: "text-orange bg-orange-tint" }
    : { label: "AUTHENTIC MEDIA", color: "text-green bg-green-tint" };

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      {/* Condition Row 1: If Stream */}
      <div className="flex min-w-0 items-center gap-1.5">
        <Handle />
        <span className="w-7 text-[12.5px] text-ink-2">If</span>
        <SourceChip icon={Radio} label="stream" />
        <SelectChip
          id="modality"
          value={modality}
          dot={true}
          dotColor={CYAN}
          items={[
            { name: "Audio Track Present", tag: "Wv=0.50, Wa=0.35, Wc=0.15" },
            { name: "Silent Video Only", tag: "Wv=0.75, Wc=0.25" },
            { name: "Voice Note Only", tag: "Wa=0.85, Wnlp=0.15" },
          ]}
          width="w-64"
          open={open === "modality"}
          onToggle={toggle}
          onPick={pick}
        />
        <span className="text-[12.5px] text-ink-2">is active</span>
      </div>

      {/* Condition Row 2: And Visual */}
      <div className="flex min-w-0 items-center gap-1.5">
        <Handle />
        <span className="w-7 text-[12.5px] text-ink-2">and</span>
        <SourceChip icon={Eye} label="visual" />
        <SelectChip
          id="visual"
          value={visualCondition}
          dot={true}
          dotColor={ROSE}
          items={[
            { name: "SBI Score > 0.65", tag: "Seam Confirmed" },
            { name: "SBI Score: 0.35 - 0.65", tag: "Boundary Warning" },
            { name: "SBI Score < 0.35", tag: "Clean Organic" },
          ]}
          width="w-56"
          open={open === "visual"}
          onToggle={toggle}
          onPick={pick}
        />
        <span className="text-[12.5px] text-ink-2">detected</span>
      </div>

      {/* Condition Row 3: And Audio (conditional) */}
      {isAudioPresent && (
        <div className="flex min-w-0 items-center gap-1.5">
          <Handle />
          <span className="w-7 text-[12.5px] text-ink-2">and</span>
          <SourceChip icon={Activity} label="audio" />
          <SelectChip
            id="acoustic"
            value={acousticCondition}
            dot={true}
            dotColor={EMERALD}
            items={[
              { name: "Pitch Jitter Flatline", tag: "Synthetic Voice" },
              { name: "Vocoder Artifacts", tag: "Neural Resynthesis" },
              { name: "Natural Intonation", tag: "Organic Speech" },
            ]}
            width="w-56"
            open={open === "acoustic"}
            onToggle={toggle}
            onPick={pick}
          />
        </div>
      )}

      {/* Outcome Metric Banner */}
      <div className="mt-1 pt-2 border-t border-line-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-3">Arbitrated Result:</span>
          <span className="text-[12px] font-semibold text-ink">
            P_final = {(simulatedScore * 100).toFixed(1)}%
          </span>
          <span className={`px-2 py-0.5 rounded-[4px] text-[10.5px] font-medium ${verdict.color}`}>
            {verdict.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Standard Step Node Body matching Beautiful UI ── */
function StepBody({ node }: { node: FlowNode }) {
  const Icon = node.icon;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-[8px]"
        style={{
          background: mix(node.hue, 12),
          color: node.hue,
          boxShadow: `0 0 0 1px ${mix(node.hue, 20)}`,
        }}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-1.5">
          <span className="block truncate text-[13px] font-semibold text-ink leading-tight">
            {node.title}
          </span>
          {node.tag && (
            <span className="shrink-0 text-[10.5px] text-ink-3 font-medium px-1.5 py-0.5 rounded-[4px] bg-field border border-line-soft">
              {node.tag}
            </span>
          )}
        </div>
        {node.caption && (
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-2 line-clamp-2">
            {node.caption}
          </span>
        )}
        {node.latency && (
          <div className="mt-1.5 flex items-center justify-between border-t border-line-soft pt-1.5 text-[10.5px] text-ink-3">
            <span className="flex items-center gap-1 font-medium">
              <Zap size={10} className="text-ink-3" />
              {node.latency}
            </span>
            <span className="text-ink-3 flex items-center gap-1 font-medium">
              <span className="size-1.5 rounded-full bg-ink-3" />
              Online
            </span>
          </div>
        )}
      </span>
    </div>
  );
}

/* ── Main Architecture Flowchart Component ── */
interface ArchitectureFlowchartProps {
  onSelectModel?: (modelId: string) => void;
}

export default function ArchitectureFlowchart({ onSelectModel }: ArchitectureFlowchartProps = {}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>(EST_H);
  const [selected, setSelected] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [zoom, setZoom] = useState(1);

  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    baseDx: number;
    baseDy: number;
    moved: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const measure = () => {
      setWidth(canvas.clientWidth);
      setHeights((prev) => {
        const next = { ...prev };
        let changed = false;
        nodeRefs.current.forEach((el, id) => {
          const h = el.offsetHeight;
          if (h && Math.abs(h - (next[id] ?? 0)) > 0.5) {
            next[id] = h;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    nodeRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const rows = Array.from(new Set(ARCHITECTURE_NODES.map((n) => n.row))).sort((a, b) => a - b);
  const rowH = rows.map((r) =>
    Math.max(...ARCHITECTURE_NODES.filter((n) => n.row === r).map((n) => heights[n.id] ?? 92))
  );
  const rowY: number[] = [];
  rows.forEach((_, i) => {
    rowY[i] = i === 0 ? PAD_Y : rowY[i - 1] + rowH[i - 1] + ROW_GAP;
  });
  const canvasH = (rowY[rows.length - 1] ?? 0) + (rowH[rows.length - 1] ?? 92) + PAD_Y + 40;

  const cw = Math.max(width, 1100);

  const place = (n: FlowNode) => {
    const w = Math.min(n.w, cw * 0.94);
    const off = offsets[n.id];
    return {
      w,
      cx: n.x * cw + (off?.dx ?? 0),
      top: rowY[rows.indexOf(n.row)] + (off?.dy ?? 0),
    };
  };

  const anchors = (n: FlowNode) => {
    const { cx, top } = place(n);
    return {
      top: { x: cx, y: top + (n.kind ? PILL_OFFSET : 0) },
      bottom: { x: cx, y: top + (heights[n.id] ?? 92) },
    };
  };

  const bezier = (edge: { from: string; to: string }) => {
    const fromNode = ARCHITECTURE_NODES.find((n) => n.id === edge.from);
    const toNode = ARCHITECTURE_NODES.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return "";

    const from = anchors(fromNode).bottom;
    const to = anchors(toNode).top;
    const k = Math.min(Math.max(Math.abs(to.y - from.y) * 0.55, 24), 84);
    return `M ${from.x} ${from.y} C ${from.x} ${from.y + k}, ${to.x} ${to.y - k}, ${to.x} ${to.y}`;
  };

  const onPointerDown = (node: FlowNode) => (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("[data-ui]")) return;
    const off = offsets[node.id];
    drag.current = {
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      baseDx: off?.dx ?? 0,
      baseDy: off?.dy ?? 0,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (node: FlowNode) => (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== node.id) return;
    const dx = (d.baseDx + event.clientX - d.startX) / zoom;
    const dy = (d.baseDy + event.clientY - d.startY) / zoom;
    if (!d.moved && Math.hypot(dx - d.baseDx, dy - d.baseDy) < 3) return;
    d.moved = true;

    const { w } = place(node);
    const h = heights[node.id] ?? 92;
    const baseCx = node.x * cw;
    const baseTop = rowY[rows.indexOf(node.row)];
    const cx = Math.min(Math.max(baseCx + dx, w / 2 + 8), cw - w / 2 - 8);
    const top = Math.min(Math.max(baseTop + dy, 8), canvasH - h - 8);
    setOffsets((cur) => ({ ...cur, [node.id]: { dx: cx - baseCx, dy: top - baseTop } }));
  };

  const onPointerUp = (node: FlowNode) => () => {
    const d = drag.current;
    if (d?.id === node.id) {
      if (d.moved) setTimeout(() => (drag.current = null), 0);
      else drag.current = null;
    }
  };

  const wasDragged = () => drag.current?.moved === true;

  const resetLayout = () => {
    setOffsets({});
    setSelected(null);
    setZoom(1);
  };

  const isLit = (edge: { from: string; to: string }) =>
    selected === edge.from || selected === edge.to;

  return (
    <div className="relative w-full rounded-card overflow-hidden bg-page shadow-hairline">
      {/* Top Canvas Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-green animate-pulse" />
          <span className="text-[13px] font-semibold text-ink">
            NETRA Multi-Modal Pipeline Blueprint
          </span>
          <span className="text-[11.5px] text-ink-3 hidden sm:inline-block">
            (12 Pipeline Nodes &bull; Drag to rearrange &bull; Click to trace signal path)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.1))}
            className="p-1.5 rounded-control bg-field hover:bg-hover-2 text-ink-3 hover:text-ink transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[11px] text-ink-3 w-9 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.25, z + 0.1))}
            className="p-1.5 rounded-control bg-field hover:bg-hover-2 text-ink-3 hover:text-ink transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={resetLayout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-control bg-field hover:bg-hover-2 text-[11px] text-ink-3 hover:text-ink transition-colors ml-1"
            title="Reset Diagram"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* The Dotted Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full select-none overflow-x-auto overflow-y-hidden"
        style={{
          height: canvasH * zoom,
          backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1.25px)",
          backgroundSize: "22px 22px",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: cw,
            height: canvasH,
          }}
          className="relative transition-transform duration-100 ease-out"
        >
          {/* Measured SVG Connectors */}
          <svg width={cw} height={canvasH} className="pointer-events-none absolute inset-0">
            {ARCHITECTURE_EDGES.map((edge) => (
              <path
                key={`${edge.from}-${edge.to}`}
                d={bezier(edge)}
                fill="none"
                stroke={isLit(edge) ? "var(--accent)" : "var(--line-strong)"}
                strokeWidth={isLit(edge) ? "2" : "1.25"}
                className="transition-[stroke,stroke-width] duration-150"
              />
            ))}
          </svg>

          {/* Draggable Nodes */}
          {ARCHITECTURE_NODES.map((node) => {
            const { w, cx, top } = place(node);
            const active = selected === node.id;

            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.id, el);
                  else nodeRefs.current.delete(node.id);
                }}
                onPointerDown={onPointerDown(node)}
                onPointerMove={onPointerMove(node)}
                onPointerUp={onPointerUp(node)}
                className="absolute flex -translate-x-1/2 touch-none flex-col items-start gap-1.5"
                style={{
                  left: cx,
                  top,
                  width: w,
                  zIndex: drag.current?.id === node.id ? 20 : active ? 10 : 2,
                }}
              >
                {/* Kind Pill Badge — 1:1 Beautiful UI Formula */}
                {node.kind && (
                  <span
                    className="inline-flex h-6 items-center rounded-[6px] px-2 text-[11.5px] font-medium"
                    style={{
                      background: mix(node.kind.hue, 14, "var(--page)"),
                      color: mix(node.kind.hue, 80, "var(--ink)"),
                    }}
                  >
                    {node.kind.label}
                  </span>
                )}

                {/* Node Card Container — 1:1 Beautiful UI Foundation */}
                {node.condition ? (
                  <div className="w-full rounded-card bg-surface shadow-card transition-shadow duration-150 hover:shadow-raised">
                    <ConditionBody />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (wasDragged()) return;
                      setSelected(active ? null : node.id);
                    }}
                    aria-pressed={active}
                    className={`w-full cursor-pointer rounded-card bg-surface text-left outline-none
                      transition-shadow duration-150 focus-visible:shadow-[0_0_0_1.5px_var(--accent)]
                      ${
                        active
                          ? "shadow-[0_0_0_1.5px_var(--accent),0_2px_10px_rgba(0,0,0,0.045)]"
                          : "shadow-card hover:shadow-raised"
                      }`}
                  >
                    <StepBody node={node} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Information Legend */}
      <div className="px-6 py-2.5 bg-surface border-t border-line flex flex-wrap items-center justify-between gap-4 text-[12px] text-ink-2">
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: PURPLE }} />
            Trigger & Ingestion
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: SKY }} />
            Computer Vision (InsightFace)
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: ROSE }} />
            Deepfake Specialist (SBI)
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: AMBER }} />
            Gated Fusion Arbitrator
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: EMERALD }} />
            Verdict & Radar Delivery
          </span>
        </div>
        <div className="text-ink-3">
          Click cards to highlight signal pathways &bull; Drag anywhere across canvas
        </div>
      </div>
    </div>
  );
}
