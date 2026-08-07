from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class JobStatusEnum(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    ERROR = "error"


class VerdictEnum(str, Enum):
    FACE_SWAP = "FACE_SWAP"
    FACE_SWAP_WITH_VOICE_CLONE = "FACE_SWAP_WITH_VOICE_CLONE"
    AI_GENERATED_FACE = "AI_GENERATED_FACE"
    VOICE_CLONE_ONLY = "VOICE_CLONE_ONLY"
    EDITED_VIDEO = "EDITED_VIDEO"
    AUTHENTIC = "AUTHENTIC"
    INCONCLUSIVE = "INCONCLUSIVE"


class FrameEvidence(BaseModel):
    frame_number: int
    timestamp: str
    spatial_score: float
    clip_score: Optional[float] = None
    flags: List[str]
    confidence: float


class DetectionResult(BaseModel):
    verdict: VerdictEnum
    confidence: float
    visual_score: float
    audio_score: Optional[float] = None
    manipulation_type: Optional[str] = None
    frames: List[FrameEvidence] = []
    audio_flags: List[str] = []
    forensic_report: Optional[str] = None
    executive_summary: Optional[str] = None
    risk_level: str = "UNKNOWN"


class DetectResponse(BaseModel):
    job_id: str
    status: JobStatusEnum
    estimated_duration_seconds: int = 30


class JobStatus(BaseModel):
    job_id: str
    status: JobStatusEnum
    progress: int = 0
    current_stage: str = ""
    result: Optional[DetectionResult] = None
    error: Optional[str] = None
    created_at: Optional[str] = None
