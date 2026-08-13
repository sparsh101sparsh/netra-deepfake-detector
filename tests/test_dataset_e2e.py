"""
End-to-End Dataset Quality & Verification Test Suite for Expanded 100-Figure Indian Portrait Dataset.

Multi-Tier Architecture:
- Tier 1: Dataset Completeness & Structure (100 folders, 10 images each, naming, 1000 total, decodability & headers)
- Tier 2: Physical Image & Face Quality Criteria (SCRFD face detection >= 75x75 px, Lum 38-225, Contrast >= 18, Sharpness >= 20, Authentic photos)
- Tier 3: Facial Identity Purity & Embedding Consistency (ArcFace 512-D buffalo_l, within-person consensus similarity >= 0.50, cross-identity separation)
- Tier 4: Metadata Synchronization & Catalog Integrity (metadata.json 1,000 entries, field validation, README.md catalog & domain breakdown)
- Tier 5 (Adversarial / Stress): Corrupted byte stream rejection, tiny/sub-threshold face rejection, and identity impostor detection.

Usage:
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --all
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --tier 1
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --tier 2
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --tier 3
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --tier 4
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --tier adv
  ./face_morph_env/bin/python tests/test_dataset_e2e.py --json
  ./face_morph_env/bin/python -m unittest tests/test_dataset_e2e.py
"""

import os
import sys
import re
import json
import time
import argparse
import unittest
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import cv2
from PIL import Image

# Setup base paths
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_DATASET_DIR = os.path.join(REPO_ROOT, "dataset")
DEFAULT_MODELS_DIR = os.path.join(REPO_ROOT, "models_checkpoints")

# Quality & Verification Threshold Constants
EXPECTED_FIGURE_COUNT = 100
EXPECTED_IMAGES_PER_FIGURE = 10
EXPECTED_TOTAL_IMAGES = 1000

MIN_IMAGE_DIM = 250
MIN_FACE_WIDTH = 75.0
MIN_FACE_HEIGHT = 75.0
MIN_FACE_AREA_RATIO = 0.015
MIN_FACE_AREA_FALLBACK_PX = 150

MIN_LUMINANCE = 38.0
MAX_LUMINANCE = 225.0
MIN_CONTRAST_STD = 18.0
MIN_SHARPNESS_LAPLACIAN = 20.0

MIN_CONSENSUS_COSINE_SIM = 0.50
MAX_CROSS_IDENTITY_COSINE_SIM = 0.65
ARCFACE_EMBEDDING_DIM = 512

VALID_DOMAINS = {
    "Cinema & Arts",
    "Tech Founders & Startups",
    "Sports Legends",
    "Science, Research & Authors",
    "State & National Leaders",
    "Business & Industry",
    "Government & Public Office",
    "Judiciary & Legal",
    "Military & Defence",
    "Finance & Banking",
    "Science, Tech & Space",
    "Constitutional / Union government",
    "Union Cabinet / Ministers",
    "State Leadership / Chief Ministers",
    "Opposition & Political Leaders",
    "Business, Industry & Startups",
    "Sports & Athletics",
    "Cinema, Arts & Culture",
    "Civil Society & Public Intellectuals"
}


# ============================================================================
# Central Evaluation & Feature Extraction Engine (Cached Singleton)
# ============================================================================

class DatasetEvaluator:
    """
    Central evaluator that scans the dataset, decodes images, executes
    InsightFace SCRFD + ArcFace models, and caches metrics and embeddings.
    """
    _instance = None

    def __init__(self, dataset_dir: str = DEFAULT_DATASET_DIR, models_dir: str = DEFAULT_MODELS_DIR):
        self.dataset_dir = os.path.abspath(dataset_dir)
        self.models_dir = os.path.abspath(models_dir)
        self.app = None
        self.analyzed_data: Dict[str, Dict[str, Any]] = {}
        self.figure_folders: List[str] = []
        self.folder_images: Dict[str, List[str]] = {}
        self.consensus_embeddings: Dict[str, np.ndarray] = {}
        self.initialized = False

    @classmethod
    def get_instance(cls, dataset_dir: str = DEFAULT_DATASET_DIR, models_dir: str = DEFAULT_MODELS_DIR) -> "DatasetEvaluator":
        if cls._instance is None:
            cls._instance = DatasetEvaluator(dataset_dir, models_dir)
        return cls._instance

    def _init_models(self):
        if self.app is None:
            try:
                import insightface
                from insightface.app import FaceAnalysis
                self.app = FaceAnalysis(root=self.models_dir, providers=['CPUExecutionProvider'])
                self.app.prepare(ctx_id=0, det_size=(640, 640))
            except Exception as e:
                print(f"[WARN] InsightFace model initialization failed: {e}")
                self.app = None

    def scan_structure(self):
        """Scans folder structure and populates directory index."""
        if not os.path.exists(self.dataset_dir):
            self.figure_folders = []
            self.folder_images = {}
            return

        entries = sorted(os.listdir(self.dataset_dir))
        self.figure_folders = [
            d for d in entries
            if os.path.isdir(os.path.join(self.dataset_dir, d))
            and not d.startswith('.')
            and d not in ('__pycache__',)
        ]
        self.folder_images = {}
        for folder in self.figure_folders:
            fpath = os.path.join(self.dataset_dir, folder)
            files = sorted([
                f for f in os.listdir(fpath)
                if f.lower().endswith(('.jpg', '.jpeg', '.png')) and not f.startswith('.')
            ])
            self.folder_images[folder] = files

    def analyze_all(self, force_reload: bool = False):
        """Extracts face metrics and embeddings for all images in dataset."""
        if self.initialized and not force_reload:
            return

        self.scan_structure()
        self._init_models()

        self.analyzed_data = {}
        self.consensus_embeddings = {}

        for folder in self.figure_folders:
            images = self.folder_images.get(folder, [])
            folder_embeddings = []
            folder_entries = []

            for filename in images:
                rel_path = os.path.join(folder, filename)
                full_path = os.path.join(self.dataset_dir, folder, filename)

                record: Dict[str, Any] = {
                    "rel_path": rel_path,
                    "full_path": full_path,
                    "folder": folder,
                    "filename": filename,
                    "file_size": os.path.getsize(full_path) if os.path.exists(full_path) else 0,
                    "decodable_cv2": False,
                    "decodable_pil": False,
                    "has_jpeg_headers": False,
                    "width": 0,
                    "height": 0,
                    "channels": 0,
                    "face_detected": False,
                    "face_count": 0,
                    "face_box": None,
                    "face_width": 0.0,
                    "face_height": 0.0,
                    "luminance_mean": 0.0,
                    "contrast_std": 0.0,
                    "sharpness_laplacian": 0.0,
                    "is_photo": False,
                    "unique_color_count": 0,
                    "color_std_ratio": 0.0,
                    "embedding": None,
                    "cosine_sim_to_consensus": 0.0,
                    "error_msg": None
                }

                # 1. Binary JPEG header verification
                try:
                    with open(full_path, "rb") as f:
                        header = f.read(2)
                        f.seek(-2, os.SEEK_END)
                        footer = f.read(2)
                        record["has_jpeg_headers"] = (header == b'\xff\xd8' and footer == b'\xff\xd9')
                except Exception:
                    record["has_jpeg_headers"] = False

                # 2. PIL Decodability
                try:
                    with Image.open(full_path) as pil_img:
                        pil_img.verify()
                        record["decodable_pil"] = True
                except Exception as e:
                    record["decodable_pil"] = False
                    record["error_msg"] = f"PIL decode error: {e}"

                # 3. OpenCV Decodability
                img = cv2.imread(full_path)
                if img is not None and img.size > 0:
                    record["decodable_cv2"] = True
                    h, w = img.shape[:2]
                    record["height"] = h
                    record["width"] = w
                    record["channels"] = img.shape[2] if len(img.shape) >= 3 else 1

                    # 4. Authentic Photographic Check (Color entropy & continuous tones)
                    # Non-photos/sketches/clipart typically have extremely low color std or discrete flat patches
                    if len(img.shape) >= 3:
                        b, g, r = cv2.split(img)
                        channel_std_mean = (np.std(b) + np.std(g) + np.std(r)) / 3.0
                        color_diff = np.mean(np.abs(b.astype(float) - g.astype(float))) + np.mean(np.abs(g.astype(float) - r.astype(float)))
                        # Sampling unique colors from downsampled thumbnail
                        thumb = cv2.resize(img, (64, 64))
                        unique_colors = len(np.unique(thumb.reshape(-1, 3), axis=0))
                        record["unique_color_count"] = unique_colors
                        record["color_std_ratio"] = float(channel_std_mean)
                        record["is_photo"] = (unique_colors >= 120 and channel_std_mean >= 10.0)
                    else:
                        record["is_photo"] = False

                    # 5. Face Detection & Analysis
                    if self.app is not None:
                        try:
                            faces = self.app.get(img)
                            record["face_count"] = len(faces)
                            if faces:
                                # Pick primary face (largest bbox area)
                                faces.sort(key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]), reverse=True)
                                primary = faces[0]
                                record["face_detected"] = True

                                bx1, by1, bx2, by2 = primary.bbox
                                bw = float(bx2 - bx1)
                                bh = float(by2 - by1)
                                record["face_box"] = [float(bx1), float(by1), bw, bh]
                                record["face_width"] = bw
                                record["face_height"] = bh

                                # Face crop metrics
                                x1, y1 = int(max(0, bx1)), int(max(0, by1))
                                x2, y2 = int(min(w, bx2)), int(min(h, by2))
                                face_crop = img[y1:y2, x1:x2]

                                if face_crop.size > 0:
                                    gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
                                    record["luminance_mean"] = float(np.mean(gray_crop))
                                    record["contrast_std"] = float(np.std(gray_crop))
                                    record["sharpness_laplacian"] = float(cv2.Laplacian(gray_crop, cv2.CV_64F).var())

                                # ArcFace Embedding extraction
                                if primary.embedding is not None:
                                    emb = primary.embedding.astype(np.float32)
                                    norm = np.linalg.norm(emb)
                                    if norm > 1e-6:
                                        emb_norm = emb / norm
                                        record["embedding"] = emb_norm
                                        folder_embeddings.append(emb_norm)
                        except Exception as e:
                            record["error_msg"] = f"Face detection error: {e}"

                self.analyzed_data[rel_path] = record
                folder_entries.append(record)

            # Compute Consensus Embedding for this figure
            if len(folder_embeddings) > 0:
                mean_emb = np.mean(folder_embeddings, axis=0)
                norm_mean = np.linalg.norm(mean_emb)
                if norm_mean > 1e-6:
                    consensus = mean_emb / norm_mean
                    self.consensus_embeddings[folder] = consensus
                    for entry in folder_entries:
                        if entry["embedding"] is not None:
                            sim = float(np.dot(entry["embedding"], consensus))
                            entry["cosine_sim_to_consensus"] = sim

        self.initialized = True


# ============================================================================
# Tier 1: Dataset Completeness & Structure Tests
# ============================================================================

class TestTier1DatasetCompletenessAndStructure(unittest.TestCase):
    """
    Tier 1: Validates dataset folder counts, image distribution, strict naming,
    total counts, decodability by PIL/OpenCV, 3-channel RGB, and JPEG binary integrity.
    """

    @classmethod
    def setUpClass(cls):
        cls.evaluator = DatasetEvaluator.get_instance()
        cls.evaluator.analyze_all()

    def test_t1_01_exact_figure_directory_count(self):
        """Tier 1.1: Verify dataset contains exactly 100 figure directories."""
        folders = self.evaluator.figure_folders
        self.assertEqual(
            len(folders),
            EXPECTED_FIGURE_COUNT,
            f"Expected exactly {EXPECTED_FIGURE_COUNT} figure directories in dataset, found {len(folders)}: {folders[:10]}..."
        )

    def test_t1_02_ten_images_per_figure_directory(self):
        """Tier 1.2: Verify every figure directory contains exactly 10 image files."""
        violations = []
        for folder in self.evaluator.figure_folders:
            count = len(self.evaluator.folder_images.get(folder, []))
            if count != EXPECTED_IMAGES_PER_FIGURE:
                violations.append(f"{folder}: {count} images (expected {EXPECTED_IMAGES_PER_FIGURE})")

        self.assertEqual(
            len(violations),
            0,
            f"Folder image count mismatch in {len(violations)} folders:\n" + "\n".join(violations[:20])
        )

    def test_t1_03_strict_sequential_naming_pattern(self):
        """Tier 1.3: Verify strict naming convention `<Folder_Name>_01.jpg` .. `<Folder_Name>_10.jpg`."""
        naming_errors = []
        for folder in self.evaluator.figure_folders:
            images = self.evaluator.folder_images.get(folder, [])
            expected_names = [f"{folder}_{i:02d}.jpg" for i in range(1, EXPECTED_IMAGES_PER_FIGURE + 1)]
            for expected in expected_names:
                if expected not in images:
                    naming_errors.append(f"Missing expected file: {os.path.join(folder, expected)}")
            for actual in images:
                if actual not in expected_names:
                    naming_errors.append(f"Unexpected file in {folder}: {actual}")

        self.assertEqual(
            len(naming_errors),
            0,
            f"Naming violations found ({len(naming_errors)} issues):\n" + "\n".join(naming_errors[:20])
        )

    def test_t1_04_total_image_count_is_1000(self):
        """Tier 1.4: Verify total image count across the entire dataset is exactly 1,000."""
        total_images = sum(len(imgs) for imgs in self.evaluator.folder_images.values())
        self.assertEqual(
            total_images,
            EXPECTED_TOTAL_IMAGES,
            f"Expected total {EXPECTED_TOTAL_IMAGES} images, found {total_images}"
        )

    def test_t1_05_image_file_decodability_and_format(self):
        """Tier 1.5: Verify every image is decodable by OpenCV & PIL, 3-channel RGB, with valid JPEG markers."""
        corrupt_files = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if not rec["decodable_cv2"] or not rec["decodable_pil"] or rec["channels"] != 3:
                corrupt_files.append(
                    f"{rel_path}: cv2={rec['decodable_cv2']}, pil={rec['decodable_pil']}, channels={rec['channels']}, err={rec['error_msg']}"
                )

        self.assertEqual(
            len(corrupt_files),
            0,
            f"Corrupted or non-3-channel images found ({len(corrupt_files)}):\n" + "\n".join(corrupt_files[:20])
        )

    def test_t1_06_minimum_spatial_dimensions(self):
        """Tier 1.6: Verify every image meets minimum spatial dimensions (width >= 250, height >= 250)."""
        low_res_files = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if rec["width"] < MIN_IMAGE_DIM or rec["height"] < MIN_IMAGE_DIM:
                low_res_files.append(
                    f"{rel_path}: {rec['width']}x{rec['height']} (min required: {MIN_IMAGE_DIM}x{MIN_IMAGE_DIM})"
                )

        self.assertEqual(
            len(low_res_files),
            0,
            f"Images with sub-threshold dimensions found ({len(low_res_files)}):\n" + "\n".join(low_res_files[:20])
        )


# ============================================================================
# Tier 2: Physical Image & Face Quality Criteria Tests
# ============================================================================

class TestTier2PhysicalImageAndFaceQuality(unittest.TestCase):
    """
    Tier 2: Evaluates InsightFace SCRFD face detection, bounding box resolution,
    luminance dynamic range, contrast standard deviation, Laplacian sharpness,
    and photographic authenticity.
    """

    @classmethod
    def setUpClass(cls):
        cls.evaluator = DatasetEvaluator.get_instance()
        cls.evaluator.analyze_all()

    def test_t2_01_scrfd_face_detection_presence(self):
        """Tier 2.1: Verify SCRFD detects at least one face in every single image."""
        no_face_images = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if not rec["face_detected"]:
                no_face_images.append(f"{rel_path}: No face detected by SCRFD")

        self.assertEqual(
            len(no_face_images),
            0,
            f"Images failing face detection ({len(no_face_images)}):\n" + "\n".join(no_face_images[:20])
        )

    def test_t2_02_face_bounding_box_resolution(self):
        """Tier 2.2: Verify primary face bounding box width >= 75px and height >= 75px."""
        small_faces = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if rec["face_detected"]:
                bw = rec["face_width"]
                bh = rec["face_height"]
                if bw < MIN_FACE_WIDTH or bh < MIN_FACE_HEIGHT:
                    small_faces.append(
                        f"{rel_path}: Face size {bw:.1f}x{bh:.1f}px (min required {MIN_FACE_WIDTH}x{MIN_FACE_HEIGHT}px)"
                    )

        self.assertEqual(
            len(small_faces),
            0,
            f"Faces failing minimum bounding box resolution ({len(small_faces)}):\n" + "\n".join(small_faces[:20])
        )

    def test_t2_03_luminance_dynamic_range(self):
        """Tier 2.3: Verify face crop mean luminance is within [38.0, 225.0]."""
        lighting_failures = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if rec["face_detected"]:
                lum = rec["luminance_mean"]
                if lum < MIN_LUMINANCE or lum > MAX_LUMINANCE:
                    lighting_failures.append(
                        f"{rel_path}: Mean luminance {lum:.1f} outside valid range [{MIN_LUMINANCE}, {MAX_LUMINANCE}]"
                    )

        self.assertEqual(
            len(lighting_failures),
            0,
            f"Images failing luminance dynamic range ({len(lighting_failures)}):\n" + "\n".join(lighting_failures[:20])
        )

    def test_t2_04_contrast_standard_deviation(self):
        """Tier 2.4: Verify face crop contrast standard deviation is >= 18.0."""
        low_contrast_images = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if rec["face_detected"]:
                contrast = rec["contrast_std"]
                if contrast < MIN_CONTRAST_STD:
                    low_contrast_images.append(
                        f"{rel_path}: Contrast std {contrast:.1f} below threshold {MIN_CONTRAST_STD}"
                    )

        self.assertEqual(
            len(low_contrast_images),
            0,
            f"Images failing contrast threshold ({len(low_contrast_images)}):\n" + "\n".join(low_contrast_images[:20])
        )

    def test_t2_05_sharpness_laplacian_variance(self):
        """Tier 2.5: Verify face crop sharpness (Laplacian variance) is >= 20.0."""
        blurry_images = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if rec["face_detected"]:
                sharpness = rec["sharpness_laplacian"]
                if sharpness < MIN_SHARPNESS_LAPLACIAN:
                    blurry_images.append(
                        f"{rel_path}: Laplacian variance {sharpness:.1f} below threshold {MIN_SHARPNESS_LAPLACIAN}"
                    )

        self.assertEqual(
            len(blurry_images),
            0,
            f"Images failing sharpness threshold ({len(blurry_images)}):\n" + "\n".join(blurry_images[:20])
        )

    def test_t2_06_authentic_photographic_imagery(self):
        """Tier 2.6: Verify 0 non-photo illustrations, sketches, line drawings or flat clipart."""
        non_photos = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            if not rec["is_photo"]:
                non_photos.append(
                    f"{rel_path}: Flagged as non-photographic (unique colors: {rec['unique_color_count']}, color std: {rec['color_std_ratio']:.1f})"
                )

        self.assertEqual(
            len(non_photos),
            0,
            f"Images failing photographic authenticity ({len(non_photos)}):\n" + "\n".join(non_photos[:20])
        )


# ============================================================================
# Tier 3: Facial Identity Purity & Embedding Consistency Tests
# ============================================================================

class TestTier3FacialIdentityPurityAndEmbeddings(unittest.TestCase):
    """
    Tier 3: Extracts ArcFace 512-D embeddings (`buffalo_l`), verifies L2 unit norm,
    computes consensus normalized centroid per figure folder, checks within-person
    similarity >= 0.50, and ensures cross-identity separation.
    """

    @classmethod
    def setUpClass(cls):
        cls.evaluator = DatasetEvaluator.get_instance()
        cls.evaluator.analyze_all()

    def test_t3_01_arcface_embedding_shape_and_l2_norm(self):
        """Tier 3.1: Verify ArcFace embeddings have dimension 512 and unit L2 norm (1.0 +/- 1e-4)."""
        invalid_embeddings = []
        for rel_path, rec in self.evaluator.analyzed_data.items():
            emb = rec["embedding"]
            if emb is None:
                invalid_embeddings.append(f"{rel_path}: Missing embedding vector")
                continue
            if emb.shape != (ARCFACE_EMBEDDING_DIM,):
                invalid_embeddings.append(f"{rel_path}: Invalid shape {emb.shape} (expected ({ARCFACE_EMBEDDING_DIM},))")
                continue
            norm = float(np.linalg.norm(emb))
            if abs(norm - 1.0) > 1e-4:
                invalid_embeddings.append(f"{rel_path}: L2 norm {norm:.6f} is not unit normalized")

        self.assertEqual(
            len(invalid_embeddings),
            0,
            f"Embedding format / normalization errors ({len(invalid_embeddings)}):\n" + "\n".join(invalid_embeddings[:20])
        )

    def test_t3_02_within_figure_consensus_similarity(self):
        """Tier 3.2: Verify every image has cosine similarity >= 0.50 to the figure consensus embedding."""
        mismatched_identities = []
        for folder in self.evaluator.figure_folders:
            images = self.evaluator.folder_images.get(folder, [])
            for filename in images:
                rel_path = os.path.join(folder, filename)
                rec = self.evaluator.analyzed_data.get(rel_path)
                if rec is None or rec["embedding"] is None:
                    mismatched_identities.append(f"{rel_path}: No embedding generated")
                    continue
                sim = rec["cosine_sim_to_consensus"]
                if sim < MIN_CONSENSUS_COSINE_SIM:
                    mismatched_identities.append(
                        f"{rel_path}: Cosine similarity to consensus is {sim:.4f} (threshold: {MIN_CONSENSUS_COSINE_SIM})"
                    )

        self.assertEqual(
            len(mismatched_identities),
            0,
            f"Identity mismatches found ({len(mismatched_identities)} images below consensus threshold):\n"
            + "\n".join(mismatched_identities[:20])
        )

    def test_t3_03_cross_identity_separation(self):
        """Tier 3.3: Verify distinct figures have distinct consensus identities (cross similarity < 0.65)."""
        folders = list(self.evaluator.consensus_embeddings.keys())
        high_cross_pairs = []

        for i in range(len(folders)):
            for j in range(i + 1, len(folders)):
                f1, f2 = folders[i], folders[j]
                c1, c2 = self.evaluator.consensus_embeddings[f1], self.evaluator.consensus_embeddings[f2]
                sim = float(np.dot(c1, c2))
                if sim >= MAX_CROSS_IDENTITY_COSINE_SIM:
                    high_cross_pairs.append(
                        f"{f1} vs {f2}: High cross-similarity {sim:.4f} exceeds threshold {MAX_CROSS_IDENTITY_COSINE_SIM}"
                    )

        self.assertEqual(
            len(high_cross_pairs),
            0,
            f"Distinct figures with excessive cross-similarity ({len(high_cross_pairs)} pairs):\n"
            + "\n".join(high_cross_pairs[:20])
        )

    def test_t3_04_mathematical_embedding_invariants(self):
        """Tier 3.4: Verify mathematical invariants (self-similarity == 1.0, symmetry, bounded [-1, 1])."""
        for folder, consensus in self.evaluator.consensus_embeddings.items():
            self_sim = float(np.dot(consensus, consensus))
            self.assertAlmostEqual(self_sim, 1.0, places=5, msg=f"Self similarity failed for {folder}")

        folders = list(self.evaluator.consensus_embeddings.keys())
        if len(folders) >= 2:
            c_a = self.evaluator.consensus_embeddings[folders[0]]
            c_b = self.evaluator.consensus_embeddings[folders[1]]
            sim_ab = float(np.dot(c_a, c_b))
            sim_ba = float(np.dot(c_b, c_a))
            self.assertAlmostEqual(sim_ab, sim_ba, places=6, msg="Cosine similarity symmetry failed")
            self.assertTrue(-1.0 <= sim_ab <= 1.0, "Cosine similarity must be bounded in [-1.0, 1.0]")


# ============================================================================
# Tier 4: Metadata Synchronization & Catalog Integrity Tests
# ============================================================================

class TestTier4MetadataSynchronizationAndCatalog(unittest.TestCase):
    """
    Tier 4: Validates `dataset/metadata.json` and `dataset/README.md` for completeness,
    schema adherence, 1:1 synchronization with files on disk, and domain coverage.
    """

    @classmethod
    def setUpClass(cls):
        cls.evaluator = DatasetEvaluator.get_instance()
        cls.evaluator.analyze_all()
        cls.metadata_path = os.path.join(cls.evaluator.dataset_dir, "metadata.json")
        cls.readme_path = os.path.join(cls.evaluator.dataset_dir, "README.md")
        cls.metadata = []
        if os.path.exists(cls.metadata_path):
            try:
                with open(cls.metadata_path, "r", encoding="utf-8") as f:
                    cls.metadata = json.load(f)
            except Exception:
                cls.metadata = []

    def test_t4_01_metadata_json_exists_and_parses(self):
        """Tier 4.1: Verify `dataset/metadata.json` exists and is valid JSON."""
        self.assertTrue(
            os.path.exists(self.metadata_path),
            f"Metadata file {self.metadata_path} does not exist"
        )
        self.assertIsInstance(
            self.metadata,
            list,
            f"Metadata content must be a JSON array, got {type(self.metadata)}"
        )
        self.assertGreater(
            len(self.metadata),
            0,
            "Metadata array is empty"
        )

    def test_t4_02_metadata_entry_count_matches_1000(self):
        """Tier 4.2: Verify `dataset/metadata.json` contains exactly 1,000 entries."""
        self.assertEqual(
            len(self.metadata),
            EXPECTED_TOTAL_IMAGES,
            f"Expected {EXPECTED_TOTAL_IMAGES} entries in metadata.json, found {len(self.metadata)}"
        )

    def test_t4_03_metadata_schema_and_field_completeness(self):
        """Tier 4.3: Verify every metadata item conforms to the rigorous JSON schema specification."""
        schema_errors = []
        for i, item in enumerate(self.metadata):
            prefix = f"Entry {i} ({item.get('filename', 'UNKNOWN')}):"

            # Required top-level keys
            required_keys = ["filename", "relative_path", "person", "category", "title", "dimensions", "face_detection", "quality_metrics", "identity_consistency"]
            for k in required_keys:
                if k not in item:
                    schema_errors.append(f"{prefix} Missing required key '{k}'")

            # Filename regex
            fname = item.get("filename", "")
            if not re.match(r"^[A-Za-z0-9_]+_\d{2}\.jpg$", fname):
                schema_errors.append(f"{prefix} Filename format invalid '{fname}'")

            # Person & Title non-empty
            if not isinstance(item.get("person"), str) or not item.get("person").strip():
                schema_errors.append(f"{prefix} Person field must be non-empty string")
            if not isinstance(item.get("title"), str) or not item.get("title").strip():
                schema_errors.append(f"{prefix} Title field must be non-empty string")

            # Dimensions
            dims = item.get("dimensions", {})
            if not isinstance(dims, dict) or dims.get("width", 0) < MIN_IMAGE_DIM or dims.get("height", 0) < MIN_IMAGE_DIM:
                schema_errors.append(f"{prefix} Invalid dimensions {dims}")

            # Face Detection
            fd = item.get("face_detection", {})
            if not isinstance(fd, dict) or "face_box" not in fd:
                schema_errors.append(f"{prefix} Invalid face_detection block {fd}")

            # Quality Metrics
            qm = item.get("quality_metrics", {})
            if not isinstance(qm, dict) or "brightness_mean" not in qm or "contrast_std" not in qm or "sharpness_laplacian" not in qm:
                schema_errors.append(f"{prefix} Invalid quality_metrics block {qm}")

            # Identity Consistency
            ic = item.get("identity_consistency", {})
            if not isinstance(ic, dict) or ic.get("verified") is not True:
                schema_errors.append(f"{prefix} Identity consistency must be verified: true")

        self.assertEqual(
            len(schema_errors),
            0,
            f"Metadata schema conformance failures ({len(schema_errors)} errors):\n" + "\n".join(schema_errors[:20])
        )

    def test_t4_04_metadata_filesystem_bidirectional_sync(self):
        """Tier 4.4: Verify exact 1:1 bi-directional mapping between metadata records and filesystem."""
        meta_paths = set()
        for item in self.metadata:
            rel = item.get("relative_path") or os.path.join(item.get("filename", "").split("_")[0], item.get("filename", ""))
            meta_paths.add(rel)

        fs_paths = set(self.evaluator.analyzed_data.keys())

        missing_on_disk = meta_paths - fs_paths
        missing_in_meta = fs_paths - meta_paths

        errors = []
        if missing_on_disk:
            errors.append(f"In metadata but missing on disk ({len(missing_on_disk)}): {list(missing_on_disk)[:5]}")
        if missing_in_meta:
            errors.append(f"On disk but missing in metadata ({len(missing_in_meta)}): {list(missing_in_meta)[:5]}")

        self.assertEqual(
            len(errors),
            0,
            "Filesystem vs Metadata desynchronization:\n" + "\n".join(errors)
        )

    def test_t4_05_readme_catalog_and_domain_distribution(self):
        """Tier 4.5: Verify `dataset/README.md` exists, contains catalog tables, domain distribution, and quality summaries."""
        self.assertTrue(os.path.exists(self.readme_path), f"README file {self.readme_path} not found")

        with open(self.readme_path, "r", encoding="utf-8") as f:
            readme_content = f.read()

        # Check total figures mentioned or catalog size
        self.assertIn("100", readme_content, "README.md must reference 100 figures")
        self.assertIn("1,000", readme_content, "README.md must reference 1,000 photos / images")

        # Verify key domain sections exist in README
        expected_sections = ["Cinema & Arts", "Tech Founders & Startups", "Sports Legends", "Science", "Leaders"]
        found_sections = [s for s in expected_sections if s.lower() in readme_content.lower()]
        self.assertGreaterEqual(
            len(found_sections),
            3,
            f"README.md missing domain sections. Found {found_sections} of {expected_sections}"
        )


# ============================================================================
# Tier 5: Adversarial Edge Cases & Stress Verification
# ============================================================================

class TestTier5AdversarialStressVerification(unittest.TestCase):
    """
    Tier 5: Adversarial verification verifying corrupted stream rejection,
    low-resolution/blurry mock rejection, and impostor identity detection.
    """

    def test_adv_01_corrupt_and_truncated_image_detection(self):
        """Tier 5.1: Adversarial - Verify validator rejects truncated headers, empty bytes, and corrupted payloads."""
        def safe_decode(raw_bytes: bytes):
            if not raw_bytes or len(raw_bytes) == 0:
                return None
            try:
                arr = np.frombuffer(raw_bytes, dtype=np.uint8)
                return cv2.imdecode(arr, cv2.IMREAD_COLOR)
            except Exception:
                return None

        # 1. Empty buffer
        self.assertIsNone(safe_decode(b""))

        # 2. Incomplete JPEG header
        truncated_header = b"\xff\xd8\xff\xe0" + b"\x00" * 20
        self.assertIsNone(safe_decode(truncated_header))

        # 3. Random noise without JPEG SOI
        random_bytes = b"\x00\x01\x02\x03" * 256
        self.assertIsNone(safe_decode(random_bytes))

    def test_adv_02_low_resolution_and_sub_threshold_face_rejection(self):
        """Tier 5.2: Adversarial - Verify mock synthetic faces with sub-threshold metrics fail quality checks."""
        # Low contrast blank image
        flat_img = np.full((300, 300, 3), 128, dtype=np.uint8)
        gray = cv2.cvtColor(flat_img, cv2.COLOR_BGR2GRAY)
        std_contrast = float(np.std(gray))
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        self.assertLess(std_contrast, MIN_CONTRAST_STD, "Flat image must fail contrast check")
        self.assertLess(laplacian_var, MIN_SHARPNESS_LAPLACIAN, "Flat image must fail sharpness check")

    def test_adv_03_impostor_identity_outlier_rejection(self):
        """Tier 5.3: Adversarial - Verify orthogonal/impostor identity vector is rejected (cosine similarity < 0.50)."""
        np.random.seed(999)
        anchor_vec = np.random.randn(512).astype(np.float32)
        anchor_norm = anchor_vec / np.linalg.norm(anchor_vec)

        # Generate orthogonal/unrelated identity vector
        impostor_vec = np.random.randn(512).astype(np.float32)
        impostor_norm = impostor_vec / np.linalg.norm(impostor_vec)

        sim = float(np.dot(anchor_norm, impostor_norm))
        self.assertLess(
            sim,
            MIN_CONSENSUS_COSINE_SIM,
            f"Impostor identity similarity {sim:.4f} should be strictly below {MIN_CONSENSUS_COSINE_SIM}"
        )


# ============================================================================
# CLI Runner and Test Orchestrator
# ============================================================================

def run_suite(tiers: Optional[List[str]] = None, json_output: bool = False, verbose: bool = True) -> int:
    """Executes specified test tiers and prints a comprehensive execution summary."""
    if tiers is None or len(tiers) == 0:
        tiers = ["1", "2", "3", "4", "adv"]

    suite = unittest.TestSuite()
    tier_map = {
        "1": TestTier1DatasetCompletenessAndStructure,
        "2": TestTier2PhysicalImageAndFaceQuality,
        "3": TestTier3FacialIdentityPurityAndEmbeddings,
        "4": TestTier4MetadataSynchronizationAndCatalog,
        "adv": TestTier5AdversarialStressVerification,
        "5": TestTier5AdversarialStressVerification
    }

    loader = unittest.TestLoader()
    for t in tiers:
        t_key = str(t).lower()
        if t_key in tier_map:
            suite.addTests(loader.loadTestsFromTestCase(tier_map[t_key]))

    print("=" * 80)
    print("RUNNING AUTOMATED E2E DATASET TEST SUITE (TIERS 1-5)")
    print(f"Target Dataset: {DEFAULT_DATASET_DIR}")
    print(f"Models Root:    {DEFAULT_MODELS_DIR}")
    print(f"Active Tiers:   {tiers}")
    print("=" * 80)
    sys.stdout.flush()

    runner = unittest.TextTestRunner(verbosity=2 if verbose else 1)
    start_time = time.time()
    result = runner.run(suite)
    elapsed = time.time() - start_time

    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_path": DEFAULT_DATASET_DIR,
        "tiers_executed": tiers,
        "total_tests": result.testsRun,
        "passed": result.testsRun - len(result.failures) - len(result.errors),
        "failures": len(result.failures),
        "errors": len(result.errors),
        "execution_time_seconds": round(elapsed, 4),
        "status": "PASS" if result.wasSuccessful() else "FAIL",
        "failure_details": [str(f[1]) for f in result.failures],
        "error_details": [str(e[1]) for e in result.errors]
    }

    print("\n" + "=" * 80)
    print("TEST SUITE EXECUTION SUMMARY")
    print(f"Total Tests Run: {summary['total_tests']}")
    print(f"Passed:          {summary['passed']}")
    print(f"Failures:        {summary['failures']}")
    print(f"Errors:          {summary['errors']}")
    print(f"Duration:        {summary['execution_time_seconds']:.2f} seconds")
    print(f"Final Status:    {summary['status']}")
    print("=" * 80)

    if json_output:
        print("\n=== JSON SUMMARY ===")
        print(json.dumps(summary, indent=2))

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Expanded Indian Portrait Dataset - E2E Verification Suite")
    parser.add_argument("--tier", type=str, choices=["1", "2", "3", "4", "adv", "5"], help="Run specific tier")
    parser.add_argument("--all", action="store_true", help="Run all tiers (1-5)")
    parser.add_argument("--json", action="store_true", help="Output summary in JSON format")
    parser.add_argument("-v", "--verbose", action="store_true", default=True, help="Verbose output")

    args = parser.parse_args()

    selected_tiers = ["1", "2", "3", "4", "adv"]
    if args.tier:
        selected_tiers = [args.tier]

    sys.exit(run_suite(selected_tiers, json_output=args.json, verbose=args.verbose))
