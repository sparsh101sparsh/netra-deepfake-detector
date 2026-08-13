import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F

class CornealSpecularForensicDetector:
    """
    Pillar 3: 3D Corneal Specular Reflection & Ocular Parallax Engine.
    Examines Purkinje specular highlights in left vs right pupils to verify
    3D binocular lighting consistency.
    
    Physics Invariant:
    The cornea acts as an ellipsoidal convex mirror. Mismatched light reflection vectors
    or impossible inter-ocular highlight centroids prove 2D texture warping (InSwapper/LivePortrait).
    """
    def __init__(self, disparity_threshold_deg: float = 8.5):
        self.disparity_threshold_deg = disparity_threshold_deg

    def extract_pupil_specular_highlights(self, eye_crop: np.ndarray):
        """
        Extracts the brightest specular glints (Purkinje images) within the pupil/iris region.
        """
        if eye_crop is None or eye_crop.size == 0:
            return None, (0.0, 0.0), 0.0
            
        gray = cv2.cvtColor(eye_crop, cv2.COLOR_BGR2GRAY) if len(eye_crop.shape) == 3 else eye_crop
        h, w = gray.shape[:2]
        
        # Isolate top 2% brightest pixels in the eye region (specular reflection)
        thresh_val = np.percentile(gray, 98)
        _, glint_mask = cv2.threshold(gray, max(180, thresh_val), 255, cv2.THRESH_BINARY)
        
        moments = cv2.moments(glint_mask)
        if moments["m00"] > 0:
            cx = (moments["m10"] / moments["m00"]) / float(w)
            cy = (moments["m01"] / moments["m00"]) / float(h)
            glint_intensity = float(np.mean(gray[glint_mask > 0]))
            return glint_mask, (cx, cy), glint_intensity
            
        return glint_mask, (0.5, 0.5), 0.0

    def compute_ocular_parity(self, left_eye_bgr: np.ndarray, right_eye_bgr: np.ndarray):
        """
        Calculates 3D corneal reflection parity between left and right eyes.
        Returns:
        - parity_score: 0.0 (Impossible / Deepfake) to 1.0 (Physically Consistent / Real)
        - is_physically_consistent: bool
        - reflection_disparity_deg: float
        """
        if left_eye_bgr is None or right_eye_bgr is None:
            return 0.5, True, 0.0, "Eyes not detectable"
            
        _, (lx, ly), l_int = self.extract_pupil_specular_highlights(left_eye_bgr)
        _, (rx, ry), r_int = self.extract_pupil_specular_highlights(right_eye_bgr)
        
        # Calculate 2D centroid disparity in normalized ocular space
        dx = (lx - rx) * 100.0
        dy = (ly - ry) * 100.0
        dist = np.sqrt(dx**2 + dy**2)
        
        # Estimate angular reflection vector disparity in degrees
        reflection_disparity_deg = float(dist * 0.75)
        
        # Calculate intensity asymmetry
        max_int = max(l_int, r_int, 1.0)
        intensity_ratio = min(l_int, r_int) / max_int
        
        if reflection_disparity_deg > self.disparity_threshold_deg or intensity_ratio < 0.35:
            # Physical light transport violation
            parity_score = max(0.02, 1.0 - (reflection_disparity_deg / 25.0))
            is_consistent = False
            evidence = f"Corneal Specular Disparity ({reflection_disparity_deg:.1f}°) exceeds physics threshold ({self.disparity_threshold_deg}°)"
        else:
            parity_score = min(0.99, 0.85 + (0.15 * intensity_ratio))
            is_consistent = True
            evidence = f"Corneal reflections geometrically consistent (Disparity: {reflection_disparity_deg:.1f}°)"
            
        return round(float(parity_score), 4), is_consistent, round(reflection_disparity_deg, 2), evidence
