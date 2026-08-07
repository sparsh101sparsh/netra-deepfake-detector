"""
NETRA Evidence Bundle Builder
Assembles all detector outputs into a structured JSON that gets sent to Bedrock.
The LLM NEVER sees raw video frames — only this structured evidence.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
import json


@dataclass
class FrameEvidence:
    frame_number: int
    timestamp: str
    spatial_score: float
    clip_score: Optional[float]
    flags: List[str]
    confidence: float


@dataclass
class AudioSegmentEvidence:
    start: float
    end: float
    fake_probability: float
    flags: List[str] = field(default_factory=list)


@dataclass
class EvidenceBundle:
    """
    Complete evidence package for Bedrock forensic report generation.
    Serialized to JSON and sent to Claude 3.5 Sonnet.
    Max size: 8,000 chars (enforced by truncation before Bedrock call).
    """
    job_id: str
    video_duration: float
    global_visual_score: float
    global_audio_score: Optional[float]
    global_clip_score: Optional[float]
    verdict: str
    confidence: float
    risk_level: str
    suspicious_frames: List[FrameEvidence]
    audio_segments: List[AudioSegmentEvidence]
    metadata_flags: List[str]
    auxiliary_flags: List[str]
    audio_available: bool = True

    def to_llm_prompt_json(self, max_frames: int = 10, max_chars: int = 8000) -> str:
        """
        Serialize to structured JSON for Bedrock prompt.
        Caps at max_frames frames and max_chars total characters.
        """
        payload = {
            "job_id": self.job_id,
            "video_duration_seconds": self.video_duration,
            "overall_assessment": {
                "verdict": self.verdict,
                "confidence_percent": self.confidence,
                "risk_level": self.risk_level,
            },
            "detector_scores": {
                "visual_efficientnet_score": self.global_visual_score,
                "audio_wav2vec_score": self.global_audio_score,
                "clip_probe_score": self.global_clip_score,
            },
            "suspicious_frames": [
                {
                    "timestamp": f.timestamp,
                    "frame_number": f.frame_number,
                    "confidence": f.confidence,
                    "flags": f.flags,
                    "visual_score": f.spatial_score,
                }
                for f in self.suspicious_frames[:max_frames]
            ],
            "audio_segments": [
                {
                    "start_time": seg.start,
                    "end_time": seg.end,
                    "fake_probability": seg.fake_probability,
                    "flags": seg.flags,
                }
                for seg in self.audio_segments[:5]
            ],
            "metadata_forensics": self.metadata_flags,
            "auxiliary_signals": self.auxiliary_flags,
            "audio_analysis_available": self.audio_available,
        }

        json_str = json.dumps(payload, indent=2)
        return json_str[:max_chars]  # Hard character cap


def build_evidence_bundle(
    job_id: str,
    frames: List[Dict],
    frame_predictions: List[Dict],
    audio_result: Optional[Dict],
    clip_predictions: Optional[List[Dict]],
    auxiliary_result: Dict,
    fusion_result: Dict,
    video_duration: float,
) -> EvidenceBundle:
    """
    Assemble all detector outputs into a single EvidenceBundle.
    """
    # Build suspicious frame evidence list
    suspicious_frames = []
    for i, (frame_info, pred) in enumerate(zip(frames, frame_predictions)):
        spatial_score = pred.get("fake_probability", 0.0) or 0.0
        clip_score = None
        if clip_predictions and i < len(clip_predictions):
            clip_score = clip_predictions[i].get("fake_probability")

        # Include frame if either detector thinks it's suspicious (>0.5)
        effective_score = max(
            spatial_score,
            clip_score if clip_score is not None else 0
        )
        if effective_score > 0.5:
            suspicious_frames.append(FrameEvidence(
                frame_number=frame_info["frame_number"],
                timestamp=frame_info["timestamp"],
                spatial_score=round(spatial_score, 4),
                clip_score=round(clip_score, 4) if clip_score is not None else None,
                flags=pred.get("flags", []),
                confidence=round(effective_score, 4),
            ))

    # Sort by confidence (most suspicious first)
    suspicious_frames.sort(key=lambda x: x.confidence, reverse=True)

    # Build audio segment evidence
    audio_segments = []
    audio_available = False
    global_audio_score = None

    if audio_result and audio_result.get("available"):
        audio_available = True
        global_audio_score = audio_result.get("fake_probability")
        for seg in audio_result.get("timestamp_segments", []):
            audio_segments.append(AudioSegmentEvidence(
                start=seg.get("start", 0),
                end=seg.get("end", 0),
                fake_probability=seg.get("score", 0),
                flags=audio_result.get("flags", []),
            ))

    # Gather metadata and auxiliary flags
    metadata_flags = auxiliary_result.get("metadata", {}).get("anomalies", [])
    auxiliary_flags = auxiliary_result.get("all_flags", [])

    # Global visual score = mean of all frame spatial scores
    all_spatial = [p.get("fake_probability", 0) or 0 for p in frame_predictions]
    global_visual = sum(all_spatial) / max(len(all_spatial), 1)

    # CLIP global score
    global_clip = None
    if clip_predictions:
        clip_scores = [p.get("fake_probability") for p in clip_predictions if p.get("fake_probability") is not None]
        if clip_scores:
            global_clip = sum(clip_scores) / len(clip_scores)

    return EvidenceBundle(
        job_id=job_id,
        video_duration=video_duration,
        global_visual_score=round(global_visual, 4),
        global_audio_score=round(global_audio_score, 4) if global_audio_score is not None else None,
        global_clip_score=round(global_clip, 4) if global_clip is not None else None,
        verdict=fusion_result.get("verdict", "INCONCLUSIVE"),
        confidence=fusion_result.get("confidence", 0.0),
        risk_level=fusion_result.get("risk_level", "UNKNOWN"),
        suspicious_frames=suspicious_frames,
        audio_segments=audio_segments,
        metadata_flags=metadata_flags,
        auxiliary_flags=auxiliary_flags,
        audio_available=audio_available,
    )
