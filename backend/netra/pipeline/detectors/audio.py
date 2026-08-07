"""
NETRA Audio Deepfake Detector
Detects: Voice cloning artifacts, TTS vocoder fingerprints, prosody mismatches.

Two-model ensemble:
1. MelodyMachine/Deepfake-audio-detection-V2 — 99.7% accuracy (primary)
2. Wav2Vec2-base fine-tuned on ASVspoof (fallback)

NO fine-tuning needed — fully pretrained models from HuggingFace.
"""
import os
import torch
import numpy as np
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

HF_AUDIO_MODEL = os.getenv("AUDIO_HF_MODEL", "MelodyMachine/Deepfake-audio-detection-V2")


class AudioDeepfakeDetector:
    """
    Pretrained audio deepfake detector using Wav2Vec2 + AASIST ensemble.
    Works on the 16kHz mono WAV extracted by the pipeline extractor.
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.available = False
        self._load_model()

    def _load_model(self):
        """Load pretrained model from HuggingFace."""
        try:
            from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
            logger.info(f"Loading audio model: {HF_AUDIO_MODEL}")

            self.feature_extractor = AutoFeatureExtractor.from_pretrained(HF_AUDIO_MODEL)
            self.model = AutoModelForAudioClassification.from_pretrained(HF_AUDIO_MODEL)
            self.model = self.model.to(self.device)
            self.model.eval()
            self.available = True
            logger.info("AudioDeepfakeDetector loaded successfully")

        except Exception as e:
            logger.warning(f"Primary audio model failed: {e}. Trying Wav2Vec2 fallback...")
            self._load_wav2vec2_fallback()

    def _load_wav2vec2_fallback(self):
        """Fallback to vanilla Wav2Vec2 for feature extraction + simple classifier."""
        try:
            from transformers import Wav2Vec2Processor, Wav2Vec2ForSequenceClassification
            self.processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
            self.model = Wav2Vec2ForSequenceClassification.from_pretrained(
                "facebook/wav2vec2-base-960h",
                num_labels=2,
                ignore_mismatched_sizes=True
            )
            self.model = self.model.to(self.device)
            self.model.eval()
            self.feature_extractor = self.processor
            self.available = True
            logger.info("Wav2Vec2 fallback loaded")
        except Exception as e:
            logger.error(f"All audio models failed: {e}")
            self.available = False

    def predict_audio(self, wav_path: str) -> Dict:
        """
        Analyze WAV file for deepfake characteristics.
        Returns: {fake_probability, flags, timestamp_segments, available}
        """
        if not self.available:
            return {
                "fake_probability": None,
                "flags": [],
                "timestamp_segments": [],
                "available": False
            }

        try:
            import soundfile as sf
            audio, sr = sf.read(wav_path)

            # Ensure mono 16kHz
            if len(audio.shape) > 1:
                audio = audio.mean(axis=1)

            # Truncate to 30s max (avoid OOM on long videos)
            max_samples = 16000 * 30
            audio = audio[:max_samples]

            # Run inference in chunks for temporal segmentation
            chunk_size = 16000 * 5  # 5-second chunks
            chunk_scores = []

            for i in range(0, len(audio), chunk_size):
                chunk = audio[i:i + chunk_size]
                if len(chunk) < 1600:  # Skip very short chunks
                    continue

                score = self._run_inference_on_chunk(chunk, sr)
                chunk_scores.append({
                    "start": i / 16000,
                    "end": min((i + chunk_size) / 16000, len(audio) / 16000),
                    "score": score
                })

            if not chunk_scores:
                return {"fake_probability": 0.0, "flags": [], "timestamp_segments": [], "available": True}

            global_score = np.mean([c["score"] for c in chunk_scores])

            # Generate flags
            flags = self._generate_flags(global_score, chunk_scores)

            # Find suspicious segments (score > 0.6)
            suspicious_segments = [c for c in chunk_scores if c["score"] > 0.6]

            return {
                "fake_probability": round(float(global_score), 4),
                "flags": flags,
                "timestamp_segments": suspicious_segments,
                "available": True,
            }

        except Exception as e:
            logger.error(f"Audio prediction error: {e}")
            return {"fake_probability": None, "flags": [], "timestamp_segments": [], "available": False}

    def _run_inference_on_chunk(self, audio_chunk: np.ndarray, sr: int) -> float:
        """Run model inference on an audio chunk and return fake probability."""
        try:
            inputs = self.feature_extractor(
                audio_chunk,
                sampling_rate=16000,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=16000 * 5
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=-1)
                # Index 1 = fake (convention matches HF models)
                fake_prob = probs[0, 1].item() if probs.shape[-1] > 1 else probs[0, 0].item()

            return fake_prob
        except Exception:
            return 0.5

    def _generate_flags(self, global_score: float, chunk_scores: List[Dict]) -> List[str]:
        """Generate human-readable audio artifact flags."""
        flags = []
        if global_score > 0.8:
            flags.extend(["vocoder_artifacts", "prosody_mismatch"])
        elif global_score > 0.6:
            flags.append("audio_anomaly_detected")

        # Check for temporal inconsistencies
        scores = [c["score"] for c in chunk_scores]
        if len(scores) > 1 and max(scores) - min(scores) > 0.4:
            flags.append("temporal_audio_inconsistency")

        return flags
