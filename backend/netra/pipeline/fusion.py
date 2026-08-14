"""
NETRA Gated Fusion Engine
Rule-based weighted fusion of all detector scores.

Design decision: Rule-based (not MLP).
Rationale: Training a fusion MLP requires FakeAVCeleb labels + training time.
Rule-based fusion achieves equivalent demo quality with zero training overhead.

Audio gate: If audio_score < 0.3 (silent/noisy video), weight audio at 0.1.
"""
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class GatedFusionEngine:
    """
    Rule-based weighted fusion of multi-modal detector outputs.
    Gates are applied to handle edge cases like silent videos.
    """

    def fuse(
        self,
        visual_score: float,
        audio_score: Optional[float],
        clip_score: Optional[float] = None,
        gend_score: Optional[float] = None,
        aux_flags: list = None,
    ) -> Dict:
        """
        Fuse all detector scores into a final verdict.
        Prioritizes GenD WACV 2026 ViT-L/14 Foundation Backbone for cross-dataset generalization.

        Returns:
            verdict: one of FACE_SWAP | FACE_SWAP_WITH_VOICE_CLONE |
                     AI_GENERATED_FACE | VOICE_CLONE_ONLY | EDITED_VIDEO |
                     AUTHENTIC | INCONCLUSIVE
            confidence: 0-100
            final_fake_probability: 0.0-1.0
            risk_level: HIGH | MEDIUM | LOW | NEGLIGIBLE
        """
        aux_flags = aux_flags or []

        # Tier 1: GenD Foundation Visual Fusion
        effective_visual = visual_score
        if gend_score is not None and clip_score is not None:
            # 60% GenD ViT-L/14 Foundation + 25% Spatial SBI + 15% CLIP
            effective_visual = 0.60 * gend_score + 0.25 * visual_score + 0.15 * clip_score
        elif gend_score is not None:
            # 70% GenD ViT-L/14 Foundation + 30% Spatial SBI
            effective_visual = 0.70 * gend_score + 0.30 * visual_score
        elif clip_score is not None:
            effective_visual = 0.70 * visual_score + 0.30 * clip_score

        # Audio gate: if audio unavailable or very low, downweight heavily
        audio_available = audio_score is not None
        if not audio_available or audio_score < 0.1:
            # Silent video or audio not detected
            audio_weight = 0.0
            effective_audio = 0.0
        elif audio_score < 0.3:
            # Very low audio score — noisy/unreliable
            audio_weight = 0.1
            effective_audio = audio_score
        else:
            audio_weight = 0.4
            effective_audio = audio_score

        visual_weight = 1.0 - audio_weight
        combined = visual_weight * effective_visual + audio_weight * effective_audio

        # Auxiliary flag boost
        aux_boost = min(len(aux_flags) * 0.02, 0.1)
        combined = min(1.0, combined + aux_boost)

        # Determine verdict
        verdict = self._determine_verdict(effective_visual, effective_audio, audio_available)
        risk_level = self._determine_risk(combined)

        return {
            "final_fake_probability": round(combined, 4),
            "verdict": verdict,
            "confidence": round(combined * 100, 1),
            "risk_level": risk_level,
            "visual_score": round(effective_visual, 4),
            "audio_score": round(effective_audio, 4) if audio_available else None,
            "clip_score": round(clip_score, 4) if clip_score is not None else None,
            "audio_gated": audio_weight < 0.3,
        }

    def _determine_verdict(self, visual: float, audio: float, audio_available: bool) -> str:
        """Apply decision rules to determine manipulation type."""
        if visual > 0.8 and audio_available and audio > 0.8:
            return "FACE_SWAP_WITH_VOICE_CLONE"
        elif visual > 0.8 and (not audio_available or audio < 0.3):
            return "FACE_SWAP"
        elif visual > 0.8:
            return "AI_GENERATED_FACE"
        elif audio_available and audio > 0.8 and visual < 0.3:
            return "VOICE_CLONE_ONLY"
        elif visual > 0.55 or (audio_available and audio > 0.55):
            return "EDITED_VIDEO"
        elif visual < 0.50 and (not audio_available or audio < 0.50):
            return "AUTHENTIC"
        else:
            return "INCONCLUSIVE"

    def _determine_risk(self, combined: float) -> str:
        if combined >= 0.8:
            return "HIGH"
        elif combined >= 0.6:
            return "MEDIUM"
        elif combined >= 0.3:
            return "LOW"
        else:
            return "NEGLIGIBLE"
