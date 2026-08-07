"use client";
// components/DetectorScorecard.tsx
// Shows detector-by-detector breakdown with animated progress bars

interface ScorecardItem {
  name: string;
  score: number | null;
  icon: string;
  description: string;
  available: boolean;
}

interface DetectorScorecardProps {
  visualScore: number | null;
  audioScore: number | null;
  clipScore: number | null;
  verdict: string;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${Math.round(score * 100)}%`,
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}60`,
        }}
      />
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score > 0.8) return "#ef4444";
  if (score > 0.6) return "#f97316";
  if (score > 0.3) return "#f59e0b";
  return "#10b981";
}

export default function DetectorScorecard({
  visualScore,
  audioScore,
  clipScore,
  verdict,
}: DetectorScorecardProps) {
  const items: ScorecardItem[] = [
    {
      name: "Spatial (EfficientNet-B4)",
      score: visualScore,
      icon: "👁️",
      description: "Face swap boundary & texture artifacts",
      available: visualScore !== null,
    },
    {
      name: "CLIP Probe",
      score: clipScore,
      icon: "🔍",
      description: "AI-generated face generalisation detector",
      available: clipScore !== null,
    },
    {
      name: "Audio (Wav2Vec2)",
      score: audioScore,
      icon: "🎤",
      description: "Voice clone & vocoder fingerprints",
      available: audioScore !== null,
    },
    {
      name: "Auxiliary Signals",
      score: null,
      icon: "📊",
      description: "Blink, landmarks, metadata forensics",
      available: true,
    },
  ];

  const verdictColors: Record<string, string> = {
    FACE_SWAP: "#ef4444",
    FACE_SWAP_WITH_VOICE_CLONE: "#dc2626",
    AI_GENERATED_FACE: "#f97316",
    VOICE_CLONE_ONLY: "#f59e0b",
    EDITED_VIDEO: "#eab308",
    AUTHENTIC: "#10b981",
    INCONCLUSIVE: "#6b7280",
  };
  const verdictColor = verdictColors[verdict] || "#6b7280";

  return (
    <div className="space-y-3">
      {/* Verdict banner */}
      <div
        className="rounded-lg p-3 text-center"
        style={{
          backgroundColor: `${verdictColor}15`,
          border: `1px solid ${verdictColor}40`,
        }}
      >
        <p className="text-xs text-gray-400 mb-1">NETRA VERDICT</p>
        <p className="text-lg font-bold" style={{ color: verdictColor }}>
          {verdict.replace(/_/g, " ")}
        </p>
      </div>

      {/* Detector cards */}
      <div className="grid grid-cols-1 gap-2">
        {items.map((item) => (
          <div
            key={item.name}
            className={`rounded-lg p-3 border ${
              item.available ? "border-gray-700 bg-gray-900/50" : "border-gray-800 bg-gray-900/20 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <p className="text-[11px] text-gray-500">{item.description}</p>
                </div>
              </div>
              <div className="text-right">
                {item.score !== null ? (
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: getScoreColor(item.score) }}
                  >
                    {(item.score * 100).toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">
                    {item.available ? "computed" : "N/A"}
                  </span>
                )}
              </div>
            </div>
            {item.score !== null && (
              <ScoreBar score={item.score} color={getScoreColor(item.score)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
