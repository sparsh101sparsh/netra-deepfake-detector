"""
NETRA Frequency-Domain & Spectral Boundary Discriminator
Analyzes high-frequency residual energy and Discrete Cosine Transform (DCT)
power spectrum to distinguish synthetic mask seams from genuine glasses/lighting.
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple


class SpectralBoundaryAnalyzer:
    """
    Evaluates frequency domain consistency and boundary gradient ratio.
    """
    def __init__(self):
        # High pass Laplacian kernel
        self.laplacian_kernel = np.array([
            [0,  1, 0],
            [1, -4, 1],
            [0,  1, 0]
        ], dtype=np.float32)

    def analyze_spectral_consistency(self, face_crop_bgr: np.ndarray) -> Dict:
        """
        Analyzes 224x224 aligned face crop.
        Returns: {
            "frequency_fake_score": float (0.0 to 1.0),
            "inner_to_outer_ratio": float,
            "spectral_flags": List[str]
        }
        """
        if face_crop_bgr is None or face_crop_bgr.size == 0:
            return {"frequency_fake_score": 0.0, "inner_to_outer_ratio": 1.0, "spectral_flags": []}

        h, w = face_crop_bgr.shape[:2]
        gray = cv2.cvtColor(face_crop_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        
        # 1. High frequency residual via Laplacian
        high_freq = cv2.filter2D(gray, -1, self.laplacian_kernel)
        abs_hf = np.abs(high_freq)
        
        # Define inner face core (eyes, nose, mouth) vs boundary ring (jaw, forehead seam)
        cy, cx = h // 2, w // 2
        r_inner = int(min(h, w) * 0.28)
        r_outer = int(min(h, w) * 0.44)
        
        y, x = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        
        inner_mask = dist_from_center <= r_inner
        boundary_ring_mask = (dist_from_center > r_inner) & (dist_from_center <= r_outer)
        
        inner_energy = np.mean(abs_hf[inner_mask]) if np.any(inner_mask) else 1e-5
        boundary_energy = np.mean(abs_hf[boundary_ring_mask]) if np.any(boundary_ring_mask) else 1e-5
        
        # In face swaps, inner face is often smoothed/interpolated, while boundary has sharp blending gradient
        # Ratio of boundary seam energy to inner face energy
        seam_ratio = boundary_energy / max(1e-5, inner_energy)
        
        # 2. 2D DCT Log Spectrum
        dct = cv2.dct(gray)
        dct_log = np.log1p(np.abs(dct))
        
        # High frequency quadrant
        hf_quadrant = dct_log[h // 2:, w // 2:]
        hf_power = float(np.mean(hf_quadrant))
        
        flags = []
        # Synthetically blended faces show high seam ratio (> 1.65)
        # Real faces with glasses have high inner energy (glasses rims) and balanced ratio (0.8 - 1.4)
        if seam_ratio > 1.85:
            fake_prob = 0.90
            flags.append("high_frequency_boundary_seam")
        elif seam_ratio > 1.55:
            fake_prob = 0.70
            flags.append("moderate_blending_gradient")
        elif seam_ratio < 1.30 and inner_energy > 0.045:
            # High inner energy (e.g. sharp glasses rims) without boundary seam -> Natural camera optics
            fake_prob = 0.05
            flags.append("coherent_natural_optics")
        else:
            fake_prob = 0.25
            
        return {
            "frequency_fake_score": round(float(fake_prob), 4),
            "seam_ratio": round(float(seam_ratio), 3),
            "inner_energy": round(float(inner_energy), 4),
            "boundary_energy": round(float(boundary_energy), 4),
            "spectral_flags": flags
        }
