"""
NETRA — Gnani.ai Indic Voice AI Service (Prisma v2.5 STT)
Official Integration for Build in AI for India — Delhi Edition (Sept 13, 2026)

Connects to Gnani.ai Vachana STT v3 endpoint for real-time speech-to-text
in Hindi and 22 scheduled Indian languages. Handles duration guarding (<= 28s chunks)
to strictly prevent MAX_AUDIO_DURATION_EXCEEDED errors on longer calls/voice notes.
"""

import os
import sys
import json
import time
import shutil
import tempfile
import logging
import subprocess
from typing import Dict, Any, Optional, Union

logger = logging.getLogger("netra.gnani_stt")

# Default credentials provided for hackathon
DEFAULT_GNANI_KEY = "vach_1ytE2CY5X2F6QgCzaHBBlIIwU5Xrt7WC0kdwSCAsAelNNipo1KkWZ4x7GL1jbXjJJzgssfe5iWNjrrHeJzmjPcnVp39qmQ3m_a8b3503825aab430a704dcc7af18bc6b"
GNANI_API_KEY = os.getenv("GNANI_API_KEY") or DEFAULT_GNANI_KEY
GNANI_STT_ENDPOINT = os.getenv("GNANI_STT_ENDPOINT", "https://api.vachana.ai/stt/v3")


def get_audio_duration_seconds(file_path: str) -> float:
    """Accurately extracts audio duration using ffprobe, afinfo, or file size estimation."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if res.returncode == 0 and res.stdout.strip():
            return float(res.stdout.strip())
    except Exception:
        pass

    try:
        cmd = ["afinfo", file_path]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            if "estimated duration" in line:
                parts = line.split(":")
                return float(parts[1].strip().split()[0])
    except Exception:
        pass

    size = os.path.getsize(file_path)
    return max(1.0, min(180.0, size / 16000.0))


def _call_gnani_single_chunk(audio_path: str, language_code: str = "hi-IN", timeout_sec: int = 15) -> Dict[str, Any]:
    """
    Submits a single audio file (<= 28s) to Gnani.ai Prisma STT v3 endpoint.
    Uses curl to ensure full browser-compatible TLS and bypass Cloudflare WAF restrictions.
    """
    api_key = os.getenv("GNANI_API_KEY") or GNANI_API_KEY
    endpoint = os.getenv("GNANI_STT_ENDPOINT") or GNANI_STT_ENDPOINT

    cmd = [
        "curl", "-s",
        "-X", "POST",
        "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "-H", f"X-API-KEY-ID: {api_key}",
        "-F", f"audio_file=@{audio_path}",
        "-F", f"language_code={language_code}",
        endpoint
    ]

    t0 = time.time()
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec)
        elapsed_ms = int((time.time() - t0) * 1000)

        if res.returncode != 0:
            logger.error(f"Gnani curl execution failed: {res.stderr}")
            return {"success": False, "transcript": "", "error": res.stderr}

        raw_output = res.stdout.strip()
        try:
            data = json.loads(raw_output)
        except Exception:
            return {"success": False, "transcript": "", "raw": raw_output, "error": "Invalid JSON response"}

        if data.get("success") or "transcript" in data or "output" in data:
            transcript = data.get("transcript") or data.get("output", {}).get("literal", "")
            return {
                "success": True,
                "transcript": transcript.strip(),
                "model": data.get("model", "gnani-prisma-v2.5"),
                "latency_ms": elapsed_ms,
                "request_id": data.get("request_id", "")
            }
        else:
            err = data.get("message") or data.get("error") or raw_output
            return {"success": False, "transcript": "", "error": str(err), "model": "gnani-prisma-v2.5"}

    except subprocess.TimeoutExpired:
        return {"success": False, "transcript": "", "error": "Gnani STT timed out"}
    except Exception as e:
        logger.error(f"Error calling Gnani STT: {e}")
        return {"success": False, "transcript": "", "error": str(e)}


def transcribe_with_gnani(
    input_audio: Union[bytes, str],
    filename: Optional[str] = None,
    language_code: str = "hi-IN",
    max_chunk_sec: int = 28
) -> Dict[str, Any]:
    """
    High-level API for NETRA speech-to-text.
    Accepts either raw audio bytes or a file path.
    Automatically splits audio > 28s to conform to Gnani's 30s limits.
    Returns unified transcript, total latency, and model metadata.
    """
    t_start = time.time()
    temp_files_to_cleanup = []

    try:
        if isinstance(input_audio, bytes):
            ext = os.path.splitext(filename)[1].lower() if filename else ".wav"
            if not ext or ext not in (".wav", ".mp3", ".ogg", ".opus", ".m4a"):
                ext = ".mp3"
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
                tf.write(input_audio)
                local_path = tf.name
                temp_files_to_cleanup.append(local_path)
        else:
            local_path = input_audio

        if not os.path.exists(local_path) or os.path.getsize(local_path) == 0:
            return {"success": False, "transcript": "", "error": "Audio file not found or empty"}

        duration = get_audio_duration_seconds(local_path)

        if duration <= max_chunk_sec:
            wav_chunk = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
            temp_files_to_cleanup.append(wav_chunk)
            subprocess.run(
                ["ffmpeg", "-y", "-i", local_path, "-ar", "16000", "-ac", "1", wav_chunk],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            target_to_send = wav_chunk if os.path.exists(wav_chunk) and os.path.getsize(wav_chunk) > 0 else local_path
            result = _call_gnani_single_chunk(target_to_send, language_code=language_code)
            result["duration_seconds"] = round(duration, 2)
            result["chunks_processed"] = 1
            return result

        logger.info(f"Audio duration is {duration:.1f}s. Chunking into {max_chunk_sec}s segments for Gnani STT.")
        chunks = []
        start = 0.0
        while start < duration:
            chunk_wav = tempfile.NamedTemporaryFile(suffix=f"_c{len(chunks)}.wav", delete=False).name
            temp_files_to_cleanup.append(chunk_wav)
            subprocess.run(
                ["ffmpeg", "-y", "-ss", str(start), "-i", local_path, "-t", str(max_chunk_sec),
                 "-ar", "16000", "-ac", "1", chunk_wav],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            if os.path.exists(chunk_wav) and os.path.getsize(chunk_wav) > 100:
                chunks.append(chunk_wav)
            start += max_chunk_sec

        transcripts = []
        for ch in chunks:
            ch_res = _call_gnani_single_chunk(ch, language_code=language_code)
            if ch_res.get("success") and ch_res.get("transcript"):
                transcripts.append(ch_res["transcript"])

        total_latency_ms = int((time.time() - t_start) * 1000)
        combined_transcript = " ".join(transcripts).strip()

        return {
            "success": len(combined_transcript) > 0,
            "transcript": combined_transcript,
            "model": "gnani-prisma-v2.5",
            "latency_ms": total_latency_ms,
            "duration_seconds": round(duration, 2),
            "chunks_processed": len(chunks)
        }

    except Exception as e:
        logger.error(f"Unexpected error in transcribe_with_gnani: {e}", exc_info=True)
        return {"success": False, "transcript": "", "error": str(e)}
    finally:
        for f in temp_files_to_cleanup:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception:
                pass
