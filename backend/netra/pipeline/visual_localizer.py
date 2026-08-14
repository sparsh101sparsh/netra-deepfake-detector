"""
NETRA — Spatial Visual Anomaly Localization Engine (R1)
Localizes facial deepfake artifacts across three distinct landmark zones:
  1. Eyewear Specular Glare Plane (EVD-EYE-SPECULAR-GLARE)
  2. Iris/Pupil Corneal Reflection Discontinuity (EVD-IRIS-CORNEAL-DISCONTINUITY)
  3. Lip-Sync Blending Boundary Artifact (EVD-LIP-SYNC-BOUNDARY-SEAM)

Computes exact pixel [x, y, w, h] and normalized bounding box coordinates.
Renders amber (#f59e0b) 3px tamper-evident border and institutional forensic badge.
100% offline classical computer vision with zero external network dependencies.
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple


class AnomalyRegionType:
    """Standardized identifiers for spatial anomaly regions."""
    EYEWEAR = "eyewear_specular_glare"
    IRIS = "iris_pupil_reflection"
    LIP_SYNC = "lip_sync_blending"
    FACIAL_SEAM = "facial_seam_boundary"


class VisualAnomalyLocalizer:
    """
    Analyzes visual video keyframes to pinpoint exact spatial manipulation zones.
    Operates 100% offline using classical CV (skin segmentation, bilateral ocular
    symmetry, perioral Laplacian seams, and golden-ratio projections).
    """

    # Exact OpenCV BGR color definitions (OpenCV uses BGR channel order)
    # Hex #f59e0b -> RGB(245, 158, 11) -> BGR(11, 158, 245)
    AMBER_BGR: Tuple[int, int, int] = (11, 158, 245)
    # Hex #10b981 -> RGB(16, 185, 129) -> BGR(129, 185, 16) Emerald Green
    GREEN_BGR: Tuple[int, int, int] = (129, 185, 16)
    # Hex #0f172a -> RGB(15, 23, 42) -> BGR(42, 23, 15)
    DARK_BG_BGR: Tuple[int, int, int] = (42, 23, 15)
    # Hex #1e3a5f -> RGB(30, 58, 95) -> BGR(95, 58, 30)
    CARD_BORDER_BGR: Tuple[int, int, int] = (95, 58, 30)
    # White text BGR
    TEXT_WHITE_BGR: Tuple[int, int, int] = (255, 255, 255)

    ANOMALY_THRESHOLD: float = 0.75

    # Evidence Codes
    EVD_EYE_SPECULAR = "EVD-EYE-SPECULAR-GLARE"
    EVD_IRIS_CORNEAL = "EVD-IRIS-CORNEAL-DISCONTINUITY"
    EVD_LIP_SYNC_SEAM = "EVD-LIP-SYNC-BOUNDARY-SEAM"

    @classmethod
    def estimate_face_roi(cls, frame_bgr: np.ndarray) -> Tuple[int, int, int, int]:
        """
        Estimates the primary facial region of interest (ROI) using 100% offline
        YCrCb skin-color segmentation with morphological filtering, falling back
        gracefully to a golden-ratio portrait center crop.
        """
        img_h, img_w = frame_bgr.shape[:2]
        try:
            ycrcb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2YCrCb)
            cr = ycrcb[:, :, 1]
            cb = ycrcb[:, :, 2]
            # Standard human skin locus in YCrCb color space
            skin = (cr >= 133) & (cr <= 173) & (cb >= 77) & (cb <= 127)

            # Morphological closing to coalesce facial features into a unified mask
            kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
            skin_morph = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_CLOSE, kernel_close)

            # Morphological opening to strip small stray background noise
            kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            skin_morph = cv2.morphologyEx(skin_morph, cv2.MORPH_OPEN, kernel_open)

            contours, _ = cv2.findContours(skin_morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            best_box = None
            best_score = -1.0
            for c in contours:
                x, y, bw, bh = cv2.boundingRect(c)
                # Face candidate must occupy a reasonable fraction of the frame
                if bw >= img_w * 0.12 and bh >= img_h * 0.12:
                    aspect = float(bh) / max(1.0, float(bw))
                    if 0.65 <= aspect <= 2.2:
                        cx, cy = x + bw / 2.0, y + bh / 2.0
                        # Bias towards center of upper-middle frame
                        dist = np.hypot(cx - img_w * 0.50, cy - img_h * 0.40)
                        score = float(bw * bh) - (dist * 80.0)
                        if score > best_score:
                            best_score = score
                            best_box = (int(x), int(y), int(bw), int(bh))

            if best_box is not None:
                bx, by, bw, bh = best_box
                # Clamp within frame limits
                bx = max(0, min(img_w - 20, bx))
                by = max(0, min(img_h - 20, by))
                bw = max(20, min(img_w - bx, bw))
                bh = max(20, min(img_h - by, bh))
                return (bx, by, bw, bh)
        except Exception:
            pass

        # Golden ratio portrait fallback (center upper-middle crop)
        fw = max(40, int(img_w * 0.44))
        fh = max(40, int(img_h * 0.52))
        fx = max(0, int((img_w - fw) / 2))
        fy = max(0, int(img_h * 0.18))
        return (fx, fy, fw, fh)

    @classmethod
    def isolate_regions(
        cls,
        frame_bgr: np.ndarray,
        face_bbox: Optional[Tuple[int, int, int, int]] = None
    ) -> Dict[str, Tuple[int, int, int, int]]:
        """
        Isolates exact 2D pixel bounding boxes for all 3 facial landmark zones:
          1. Eyewear Specular Glare Plane
          2. Iris / Pupil Corneal Reflection Discontinuity
          3. Lip-Sync Blending Boundary
        """
        img_h, img_w = frame_bgr.shape[:2]
        if face_bbox is None or len(face_bbox) != 4 or face_bbox[2] < 20 or face_bbox[3] < 20:
            face_bbox = cls.estimate_face_roi(frame_bgr)
        fx, fy, fw, fh = face_bbox

        # 1. Eyewear Specular Glare Plane: upper ocular band covering spectacle bridge and lenses
        ew_x = max(0, min(img_w - 20, fx + int(fw * 0.08)))
        ew_y = max(0, min(img_h - 20, fy + int(fh * 0.20)))
        ew_w = max(20, min(img_w - ew_x, int(fw * 0.84)))
        ew_h = max(20, min(img_h - ew_y, int(fh * 0.28)))

        # 2. Iris / Pupil Corneal Reflection Discontinuity: focused ocular socket band
        iris_x = max(0, min(img_w - 20, fx + int(fw * 0.14)))
        iris_y = max(0, min(img_h - 20, fy + int(fh * 0.24)))
        iris_w = max(20, min(img_w - iris_x, int(fw * 0.72)))
        iris_h = max(20, min(img_h - iris_y, int(fh * 0.19)))

        # 3. Lip-Sync Blending Boundary: perioral mouth boundary seam
        lip_x = max(0, min(img_w - 20, fx + int(fw * 0.20)))
        lip_y = max(0, min(img_h - 20, fy + int(fh * 0.64)))
        lip_w = max(20, min(img_w - lip_x, int(fw * 0.60)))
        lip_h = max(20, min(img_h - lip_y, int(fh * 0.25)))

        return {
            AnomalyRegionType.EYEWEAR: (int(ew_x), int(ew_y), int(ew_w), int(ew_h)),
            AnomalyRegionType.IRIS: (int(iris_x), int(iris_y), int(iris_w), int(iris_h)),
            AnomalyRegionType.LIP_SYNC: (int(lip_x), int(lip_y), int(lip_w), int(lip_h)),
            AnomalyRegionType.FACIAL_SEAM: (int(lip_x), int(lip_y), int(lip_w), int(lip_h)),
        }

    @classmethod
    def evaluate_primary_anomaly(
        cls,
        frame_bgr: np.ndarray,
        face_bbox: Optional[Tuple[int, int, int, int]] = None
    ) -> Tuple[str, Tuple[int, int, int, int], Dict[str, Any]]:
        """
        Evaluates candidate facial landmark regions using classical CV forensic metrics:
          - Eyewear specular glare: high-frequency variance + specular highlight ratio (>215)
          - Iris corneal reflection: bilateral ocular asymmetry (left vs right glints and mean gradient)
          - Lip-sync blending: perioral Laplacian variance and Sobel boundary seam gradients
        Returns (chosen_region_type, bounding_box, metadata).
        """
        regions = cls.isolate_regions(frame_bgr, face_bbox)
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

        # 1. Eyewear Specular Glare metric
        ew_box = regions[AnomalyRegionType.EYEWEAR]
        ew_crop = gray[ew_box[1]:ew_box[1]+ew_box[3], ew_box[0]:ew_box[0]+ew_box[2]]
        if ew_crop.size > 0:
            ew_std = float(np.std(ew_crop))
            specular_ratio = float(np.mean(ew_crop > 215))
            ew_score = ew_std * (specular_ratio * 3.5 + 0.12)
        else:
            ew_score = 0.0

        # 2. Iris Corneal Reflection metric (bilateral ocular asymmetry)
        iris_box = regions[AnomalyRegionType.IRIS]
        iris_crop = gray[iris_box[1]:iris_box[1]+iris_box[3], iris_box[0]:iris_box[0]+iris_box[2]]
        if iris_crop.size > 0:
            mid = iris_box[2] // 2
            left_eye = iris_crop[:, :mid]
            right_eye = iris_crop[:, mid:]
            mean_diff = abs(float(np.mean(left_eye)) - float(np.mean(right_eye)))
            glints_l = float(np.sum(left_eye > 220))
            glints_r = float(np.sum(right_eye > 220))
            glint_asym = abs(glints_l - glints_r) / max(glints_l + glints_r, 10.0)
            iris_score = (mean_diff * 1.6) + (glint_asym * 35.0)
        else:
            iris_score = 0.0

        # 3. Lip-Sync Blending Boundary metric (perioral Laplacian seams)
        lip_box = regions[AnomalyRegionType.LIP_SYNC]
        lip_crop = gray[lip_box[1]:lip_box[1]+lip_box[3], lip_box[0]:lip_box[0]+lip_box[2]]
        if lip_crop.size > 0:
            lap_var = float(cv2.Laplacian(lip_crop, cv2.CV_64F).var())
            sobel_y = cv2.Sobel(lip_crop, cv2.CV_64F, 0, 1, ksize=3)
            seam_grad = float(np.mean(np.abs(sobel_y)))
            lip_score = (lap_var * 0.35) + (seam_grad * 0.85)
        else:
            lip_score = 0.0

        # Dynamic selection based on anomaly prominence
        if iris_score > ew_score and iris_score > lip_score:
            chosen_type = AnomalyRegionType.IRIS
            chosen_box = iris_box
            semantic_label = "Iris/Pupil Corneal Reflection Discontinuity"
            evidence_code = cls.EVD_IRIS_CORNEAL
            region_name = "Iris / Pupil Ocular Region"
            statutory_act = "Section 66D IT Act 2000"
        elif lip_score > ew_score and lip_score > 35.0:
            chosen_type = AnomalyRegionType.LIP_SYNC
            chosen_box = lip_box
            semantic_label = "Lip-Sync Blending Boundary Artifact"
            evidence_code = cls.EVD_LIP_SYNC_SEAM
            region_name = "Perioral / Mouth Blending Boundary"
            statutory_act = "Section 318(4) BNS 2023"
        else:
            chosen_type = AnomalyRegionType.EYEWEAR
            chosen_box = ew_box
            semantic_label = "Eyewear Specular Glare & Feature Discontinuity"
            evidence_code = cls.EVD_EYE_SPECULAR
            region_name = "Eyewear / Specular Glare Plane"
            statutory_act = "Section 66D IT Act 2000"

        meta = {
            "chosen_type": chosen_type,
            "semantic_label": semantic_label,
            "evidence_code": evidence_code,
            "region_name": region_name,
            "statutory_act": statutory_act,
            "regional_scores": {
                "eyewear_specular": round(ew_score, 2),
                "iris_discontinuity": round(iris_score, 2),
                "lip_sync_laplacian": round(lip_score, 2),
            }
        }
        return chosen_type, chosen_box, meta

    @classmethod
    def _normalize_region_type(cls, region_str: Optional[str]) -> Optional[str]:
        """Normalizes user or upstream region keywords into an AnomalyRegionType."""
        if not region_str:
            return None
        r = region_str.lower().strip()
        if any(k in r for k in ("eye", "spectacle", "glare", "glass", "evd-eye-specular-glare")):
            return AnomalyRegionType.EYEWEAR
        if any(k in r for k in ("iris", "pupil", "corneal", "ocular", "evd-iris-corneal-discontinuity")):
            return AnomalyRegionType.IRIS
        if any(k in r for k in ("lip", "mouth", "seam", "sync", "perioral", "evd-lip-sync-boundary-seam")):
            return AnomalyRegionType.LIP_SYNC
        return None

    @classmethod
    def filter_high_anomaly_keyframes(
        cls,
        frames: List[Dict[str, Any]],
        threshold: float = 0.75,
        min_frame_gap: int = 10,
        max_keyframes: int = 3,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Extracts keyframes flagged with high generative anomaly (>75% or threshold),
        sorted descending by anomaly score and enforcing temporal diversity.

        Keyword Arguments:
          top_k: Alias for max_keyframes.
          min_temporal_gap: Alias for min_frame_gap.
          fallback_if_empty: If True (default), gracefully falls back to the top
            suspicious frame(s) if no frame exceeds threshold.
        """
        if not frames:
            return []

        # Resolve aliases
        top_k = kwargs.get("top_k", max_keyframes)
        gap = kwargs.get("min_temporal_gap", min_frame_gap)
        fallback_if_empty = kwargs.get("fallback_if_empty", True)

        def extract_score(f: Dict[str, Any]) -> float:
            for key in ("confidence", "spatial_score", "anomaly_score", "fake_probability", "score"):
                if key in f and f[key] is not None:
                    try:
                        return float(f[key])
                    except (ValueError, TypeError):
                        pass
            return 0.0

        def extract_frame_num(f: Dict[str, Any], default_idx: int) -> int:
            for key in ("frame_number", "frame_idx", "index", "frame"):
                if key in f and f[key] is not None:
                    try:
                        return int(f[key])
                    except (ValueError, TypeError):
                        pass
            return default_idx

        # Extract frames exceeding threshold
        qualified = [f for f in frames if extract_score(f) > threshold]
        qualified.sort(key=extract_score, reverse=True)

        selected: List[Dict[str, Any]] = []
        selected_numbers: List[int] = []

        for idx, f in enumerate(qualified):
            f_num = extract_frame_num(f, idx)
            if any(abs(f_num - prev) < gap for prev in selected_numbers):
                continue
            selected.append(f)
            selected_numbers.append(f_num)
            if len(selected) >= top_k:
                break

        # Graceful fallback: if no frames exceeded threshold, provide top suspicious frames
        if not selected and fallback_if_empty and frames:
            all_sorted = sorted(frames, key=extract_score, reverse=True)
            top_score = extract_score(all_sorted[0])
            # Only provide fallback if there is at least moderate suspicion (>0.40)
            if top_score >= 0.40:
                for idx, f in enumerate(all_sorted):
                    f_num = extract_frame_num(f, idx)
                    if any(abs(f_num - prev) < gap for prev in selected_numbers):
                        continue
                    selected.append(f)
                    selected_numbers.append(f_num)
                    if len(selected) >= min(top_k, 2):
                        break

        return selected

    @classmethod
    def localize_and_annotate(
        cls,
        frame_bgr: np.ndarray,
        anomaly_score: float = 0.95,
        face_bbox: Optional[Tuple[int, int, int, int]] = None,
        prefer_region: Optional[str] = None,
        forced_region: Optional[str] = None,
        detector_subsystem: str = "GenD Foundation Model ViT-L/14 + Spatial SBI",
        is_authentic: bool = False,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Locates the region of highest spatial generative anomaly on the frame,
        draws a signature 3px amber tamper-evident bounding box (#f59e0b)
        and an institutional forensic badge ("ANOMALY DETECTED HERE"),
        and returns the annotated image plus comprehensive bounding box metadata.

        Args:
          frame_bgr: Source OpenCV BGR image (uint8).
          anomaly_score: Upstream anomaly probability (0.0 - 1.0).
          face_bbox: Optional upstream face bounding box (fx, fy, fw, fh).
          prefer_region / forced_region: Specific anomaly region override.
          detector_subsystem: Subsystem attribution string.

        Returns:
          (annotated_frame_bgr, metadata_dict)
        """
        if frame_bgr is None or frame_bgr.size == 0:
            raise ValueError("Invalid image frame provided to visual localizer.")

        img_h, img_w = frame_bgr.shape[:2]
        target_region_str = forced_region or prefer_region
        normalized_target = cls._normalize_region_type(target_region_str)

        if normalized_target is not None:
            regions = cls.isolate_regions(frame_bgr, face_bbox)
            target_box = regions.get(normalized_target, regions[AnomalyRegionType.EYEWEAR])
            if normalized_target == AnomalyRegionType.IRIS:
                semantic_label = "Iris/Pupil Corneal Reflection Discontinuity"
                evidence_code = cls.EVD_IRIS_CORNEAL
                region_name = "Iris / Pupil Ocular Region"
                statutory_act = "Section 66D IT Act 2000"
            elif normalized_target in (AnomalyRegionType.LIP_SYNC, AnomalyRegionType.FACIAL_SEAM):
                semantic_label = "Lip-Sync Blending Boundary Artifact"
                evidence_code = cls.EVD_LIP_SYNC_SEAM
                region_name = "Perioral / Mouth Blending Boundary"
                statutory_act = "Section 318(4) BNS 2023"
            else:
                semantic_label = "Eyewear Specular Glare & Feature Discontinuity"
                evidence_code = cls.EVD_EYE_SPECULAR
                region_name = "Eyewear / Specular Glare Plane"
                statutory_act = "Section 66D IT Act 2000"
            detail_meta: Dict[str, Any] = {"regional_scores": {}}
        else:
            chosen_type, target_box, detail_meta = cls.evaluate_primary_anomaly(frame_bgr, face_bbox)
            semantic_label = detail_meta["semantic_label"]
            evidence_code = detail_meta["evidence_code"]
            region_name = detail_meta["region_name"]
            statutory_act = detail_meta["statutory_act"]

        annotated = frame_bgr.copy()
        bx, by, bw, bh = target_box

        # Ensure box is clamped within image boundaries
        bx = max(0, min(img_w - 20, int(bx)))
        by = max(0, min(img_h - 20, int(by)))
        bw = max(20, min(img_w - bx, int(bw)))
        bh = max(20, min(img_h - by, int(bh)))

        is_clean = is_authentic or (anomaly_score is not None and anomaly_score < 0.45)
        box_color = cls.GREEN_BGR if is_clean else cls.AMBER_BGR
        badge_text = "COHERENCE VERIFIED" if is_clean else "ANOMALY DETECTED HERE"

        # 1. Bounding box outline with 3px stroke (Emerald green for clean, signature amber for anomaly)
        cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), box_color, 3)

        # 2. Institutional Forensic Badge
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.42, min(0.68, img_w / 1400.0))
        thickness = 2
        (tw, th), baseline = cv2.getTextSize(badge_text, font, font_scale, thickness)

        badge_h = th + 14
        badge_w = tw + 18

        # Position badge neatly above bounding box; if too close to frame top, place inside top of box
        if by - badge_h >= 2:
            tag_y1 = by - badge_h
            tag_y2 = by
            tag_x1 = max(0, min(img_w - badge_w, bx))
            tag_x2 = tag_x1 + badge_w
        else:
            tag_y1 = by + 2
            tag_y2 = min(img_h, by + 2 + badge_h)
            tag_x1 = max(0, min(img_w - badge_w, bx + 2))
            tag_x2 = tag_x1 + badge_w

        # Draw dark badge background (#0f172a -> BGR 42, 23, 15)
        cv2.rectangle(annotated, (tag_x1, tag_y1), (tag_x2, tag_y2), cls.DARK_BG_BGR, -1)
        # Draw 1px border on badge (green or amber matching status)
        cv2.rectangle(annotated, (tag_x1, tag_y1), (tag_x2, tag_y2), box_color, 1)
        # Draw crisp high-contrast white text
        text_x = tag_x1 + 8
        text_y = tag_y2 - (baseline + 3)

        cv2.putText(
            annotated,
            badge_text,
            (text_x, text_y),
            font,
            font_scale,
            cls.TEXT_WHITE_BGR,
            thickness,
            cv2.LINE_AA
        )

        metadata: Dict[str, Any] = {
            "bounding_box": [int(bx), int(by), int(bw), int(bh)],
            "normalized_box": [
                round(float(bx) / max(1.0, float(img_w)), 4),
                round(float(by) / max(1.0, float(img_h)), 4),
                round(float(bw) / max(1.0, float(img_w)), 4),
                round(float(bh) / max(1.0, float(img_h)), 4),
            ],
            "semantic_label": semantic_label,
            "anomaly_region": region_name,
            "anomaly_score": round(float(anomaly_score), 4),
            "evidence_code": evidence_code,
            "statutory_act": statutory_act,
            "detector_subsystem": detector_subsystem,
            "forensic_badge": badge_text,
            "border_color_hex": "#f59e0b",
            "diagnostics": detail_meta.get("regional_scores", {})
        }

        return annotated, metadata
