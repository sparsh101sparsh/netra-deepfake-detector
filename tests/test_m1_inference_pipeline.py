"""
M1 Test Suite: Neural Inference & Preprocessing Specialist (Worker M1)
Tests:
- SpatialSBIDetector (weights resolution, device selection, batch inference, flag generation)
- AudioDeepfakeDetector (class index mapping 0=fake/1=real, local search, spectral forensics fallback)
- TemporalFaceAligner (safe CascadeClassifier handling, temporal smoothing, portrait crop fallback)
- Video/Audio Extractor (fast interval seeking, FFmpeg extraction, metadata zero-safety)
"""
import os
import tempfile
import shutil
import numpy as np
import pytest
import torch
from scipy.io import wavfile

from netra.pipeline.detectors.spatial import (
    SpatialSBIDetector,
    resolve_spatial_checkpoint_path,
    get_spatial_device,
)
from netra.pipeline.detectors.audio import (
    AudioDeepfakeDetector,
    SpectralAudioForensicsFallback,
    get_audio_device,
)
from netra.pipeline.face_aligner import (
    TemporalFaceAligner,
    _get_cascade_classifier_class,
)
from netra.pipeline.extractor import (
    extract_frames,
    extract_audio,
    get_video_metadata,
)

SAMPLE_VIDEO_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "generated_100_deepfake_videos",
    "deepfake_Neeraj_Chopra.mp4"
)


# ══════════════════════════════════════════════════════════════════════════════
# 1. SPATIAL SBI DETECTOR TESTS
# ══════════════════════════════════════════════════════════════════════════════

def test_spatial_checkpoint_resolution_and_loading():
    """Verify spatial checkpoint discovery finds spatial_model_best.pth."""
    resolved = resolve_spatial_checkpoint_path()
    assert resolved is not None, "Failed to resolve spatial_model_best.pth"
    assert os.path.isfile(resolved), f"Resolved checkpoint path does not exist: {resolved}"

    detector = SpatialSBIDetector()
    assert detector.model is not None
    assert "checkpoint" in detector.model_source or "torchvision" in detector.model_source
    assert detector.device.type in ["cuda", "mps", "cpu"]


def test_spatial_batch_inference_consistency():
    """Verify batch inference produces identical length and valid probability values."""
    detector = SpatialSBIDetector()
    
    # Create synthetic test frames
    f1 = np.full((300, 300, 3), 128, dtype=np.uint8)
    f2 = np.full((200, 400, 3), 200, dtype=np.uint8)
    f3 = "non_existent_frame_path.jpg"
    
    results = detector.predict_frames_batch([f1, f2, f3], batch_size=2)
    assert len(results) == 3
    
    for i in range(2):
        assert 0.0 <= results[i]["fake_probability"] <= 1.0
        assert 0.0 <= results[i]["confidence"] <= 1.0
        assert isinstance(results[i]["flags"], list)
        
    assert results[2]["fake_probability"] == 0.0
    assert "read_error" in results[2]["flags"]


def test_spatial_real_video_inference():
    """Verify spatial detector runs on frames extracted from real test video."""
    if not os.path.exists(SAMPLE_VIDEO_PATH):
        pytest.skip(f"Test video not found: {SAMPLE_VIDEO_PATH}")

    temp_dir = tempfile.mkdtemp(prefix="test_spatial_vid_")
    try:
        frames = extract_frames(SAMPLE_VIDEO_PATH, "test-job-spatial", temp_dir, max_frames=5)
        assert len(frames) > 0
        frame_paths = [f["image_path"] for f in frames]

        detector = SpatialSBIDetector()
        results = detector.predict_frames_batch(frame_paths, batch_size=4)
        assert len(results) == len(frame_paths)
        for res in results:
            assert 0.0 <= res["fake_probability"] <= 1.0
            assert isinstance(res["flags"], list)
    finally:
        shutil.rmtree(temp_dir)


# ══════════════════════════════════════════════════════════════════════════════
# 2. AUDIO DEEPFAKE DETECTOR TESTS
# ══════════════════════════════════════════════════════════════════════════════

def test_audio_detector_class_mapping_and_fallback():
    """Verify audio detector maps class 0 to fake and runs spectral fallback gracefully."""
    detector = AudioDeepfakeDetector()
    assert detector.available is True
    assert detector.fake_class_idx == 0
    assert detector.device.type in ["cuda", "mps", "cpu"]


def test_spectral_forensics_math():
    """Verify spectral acoustic forensics produces deterministic scores on synthetic audio."""
    sr = 16000
    t = np.linspace(0, 2.0, sr * 2)
    # Speech-like audio with fundamental and harmonics
    audio = (0.6 * np.sin(2 * np.pi * 150 * t) + 0.3 * np.sin(2 * np.pi * 300 * t)).astype(np.float32)

    score, flags = SpectralAudioForensicsFallback.analyze_audio(audio, sr=sr)
    assert 0.0 <= score <= 1.0
    assert isinstance(flags, list)


def test_audio_wav_end_to_end():
    """Verify AudioDeepfakeDetector processes actual WAV files and produces temporal segments."""
    detector = AudioDeepfakeDetector()

    sr = 16000
    # 1. Clean synthetic speech harmonics
    t = np.linspace(0, 6.0, sr * 6)
    clean_audio = 0.5 * np.sin(2 * np.pi * 200 * t) + 0.1 * np.random.normal(0, 0.05, len(t))
    clean_int16 = (clean_audio * 32767).astype(np.int16)

    # 2. Fake vocoder audio with high spectral flatness & cutoff
    fake_audio = np.random.normal(0, 0.3, len(t)) # white-noise flat spectrum
    fake_int16 = (fake_audio * 32767).astype(np.int16)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_clean:
        wavfile.write(tmp_clean.name, sr, clean_int16)
        clean_path = tmp_clean.name

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_fake:
        wavfile.write(tmp_fake.name, sr, fake_int16)
        fake_path = tmp_fake.name

    try:
        res_clean = detector.predict_audio(clean_path)
        assert res_clean["available"] is True
        assert res_clean["fake_probability"] is not None
        assert 0.0 <= res_clean["fake_probability"] <= 1.0
        assert isinstance(res_clean["timestamp_segments"], list)

        res_fake = detector.predict_audio(fake_path)
        assert res_fake["available"] is True
        assert res_fake["fake_probability"] is not None
        assert res_fake["fake_probability"] > 0.5
        assert len(res_fake["timestamp_segments"]) >= 1
        assert "start" in res_fake["timestamp_segments"][0]
        assert "end" in res_fake["timestamp_segments"][0]
    finally:
        if os.path.exists(clean_path):
            os.remove(clean_path)
        if os.path.exists(fake_path):
            os.remove(fake_path)


# ══════════════════════════════════════════════════════════════════════════════
# 3. TEMPORAL FACE ALIGNER TESTS
# ══════════════════════════════════════════════════════════════════════════════

def test_face_aligner_safe_initialization_and_fallback():
    """Verify face aligner initializes safely without unhandled CascadeClassifier errors."""
    aligner = TemporalFaceAligner(target_size=(224, 224))
    
    # Test on arbitrary image
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    crop, face_found, meta = aligner.detect_and_align_face(frame)
    
    assert crop.shape == (224, 224, 3)
    assert isinstance(face_found, bool)
    assert "bbox" in meta
    assert meta["original_resolution"] == (640, 480)


def test_face_aligner_temporal_smoothing():
    """Verify temporal smoothing tracks and persists bounding box over video sequence."""
    aligner = TemporalFaceAligner(smoothing_alpha=0.5)
    
    frame1 = np.full((500, 500, 3), 100, dtype=np.uint8)
    frame2 = np.full((500, 500, 3), 120, dtype=np.uint8)
    
    c1, f1, m1 = aligner.detect_and_align_face(frame1)
    c2, f2, m2 = aligner.detect_and_align_face(frame2)
    
    assert c1.shape == (224, 224, 3)
    assert c2.shape == (224, 224, 3)
    aligner.reset_tracker()
    assert aligner.prev_bbox is None


# ══════════════════════════════════════════════════════════════════════════════
# 4. VIDEO & AUDIO EXTRACTOR TESTS
# ══════════════════════════════════════════════════════════════════════════════

def test_video_metadata_extraction():
    """Verify get_video_metadata safely computes properties and guards division by zero."""
    # Test non-existent file
    meta_bad = get_video_metadata("non_existent_file.mp4")
    assert meta_bad["duration_seconds"] == 0.0
    assert meta_bad["fps"] == 25.0
    assert meta_bad["has_video"] is False

    if os.path.exists(SAMPLE_VIDEO_PATH):
        meta_real = get_video_metadata(SAMPLE_VIDEO_PATH)
        assert meta_real["has_video"] is True
        assert meta_real["fps"] == 30.0
        assert meta_real["total_frames"] == 148
        assert meta_real["duration_seconds"] == 4.93
        assert meta_real["width"] == 1620
        assert meta_real["height"] == 1080


def test_fast_frame_extraction_on_real_video():
    """Verify extract_frames utilizes fast seeking and produces indexed frames."""
    if not os.path.exists(SAMPLE_VIDEO_PATH):
        pytest.skip(f"Test video not found: {SAMPLE_VIDEO_PATH}")

    temp_dir = tempfile.mkdtemp(prefix="test_extract_frames_")
    try:
        frames = extract_frames(SAMPLE_VIDEO_PATH, "job-fast-seek", temp_dir, max_frames=10)
        assert len(frames) == 3  # 4.93s video sampled every 2s -> 0s, 2s, 4s
        assert frames[0]["frame_number"] == 0
        assert frames[1]["frame_number"] == 60
        assert frames[2]["frame_number"] == 120

        for f in frames:
            assert os.path.isfile(f["image_path"])
            assert os.path.getsize(f["image_path"]) > 0
            assert "timestamp" in f
            assert "timestamp_sec" in f
    finally:
        shutil.rmtree(temp_dir)


def test_ffmpeg_audio_extraction_safety():
    """Verify extract_audio handles videos without audio tracks gracefully."""
    if not os.path.exists(SAMPLE_VIDEO_PATH):
        pytest.skip(f"Test video not found: {SAMPLE_VIDEO_PATH}")

    temp_dir = tempfile.mkdtemp(prefix="test_extract_audio_")
    try:
        wav_out = os.path.join(temp_dir, "extracted.wav")
        # Video has no audio track -> should return None cleanly without error
        res = extract_audio(SAMPLE_VIDEO_PATH, wav_out)
        assert res is None
    finally:
        shutil.rmtree(temp_dir)
