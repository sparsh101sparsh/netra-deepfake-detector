# Forensic Audit Report: Milestone 6 / Requirement R1

**Target Work Product**: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/backend/netra/pipeline/visual_localizer.py`  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md` ## 2026-09-03T20:47:27Z)  
**Profile**: General Project  
**Forensic Auditor**: `teamwork_preview_auditor` (Auditor M6)  
**Audit Verdict**: **CLEAN**

---

## 1. Observation

Direct empirical observations and verification data gathered during audit execution:

### 1.1 Color Value & Palette Verification
- **Amber Border**: Defined as `AMBER_BGR = (11, 158, 245)` in `visual_localizer.py:36`.
  - Hex `#f59e0b` corresponds to RGB `(245, 158, 11)` -> OpenCV BGR `(11, 158, 245)`. Verified exact match.
  - Rendered image output confirmed physical presence of amber border pixels `[11, 158, 245]` on all 4 bounding box edges (top, bottom, left, right).
- **Dark Badge Background**: Defined as `DARK_BG_BGR = (42, 23, 15)` in `visual_localizer.py:38`.
  - Hex `#0f172a` corresponds to RGB `(15, 23, 42)` -> OpenCV BGR `(42, 23, 15)`. Verified exact match.
  - Rendered output confirmed physical presence of badge background pixels `[42, 23, 15]`.
- **Forensic Badge Text**: Institutional badge string `"ANOMALY DETECTED HERE"` drawn with `cv2.FONT_HERSHEY_SIMPLEX`, anti-aliased, in pure white `(255, 255, 255)`.

### 1.2 Static Code & AST Analysis
- Evaluated the Abstract Syntax Tree (AST) of `backend/netra/pipeline/visual_localizer.py` (464 lines):
  - **Zero mock dependencies**: Neither `unittest.mock`, `pytest_mock`, nor mock objects are imported or referenced.
  - **Zero hardcoded benchmark tokens**: No video filenames (e.g., `Ajit_Doval`, `deepfake_`), person names, or test fixture identifiers exist in string literals or code paths.
  - **Zero dummy facades**: All functions (`estimate_face_roi`, `isolate_regions`, `evaluate_primary_anomaly`, `filter_high_anomaly_keyframes`, `localize_and_annotate`) contain genuine computational logic without placeholder `return <constant>` or empty stubs.

### 1.3 Dynamic Runtime Execution & Sensitivity
- **Skin Segmentation Tracking**:
  - Test frame with skin locus on left (`x: 80..220`) yielded `estimate_face_roi = (80, 100, 141, 201)`.
  - Test frame with skin locus shifted to right (`x: 420..560`) yielded `estimate_face_roi = (420, 100, 141, 201)`.
  - Confirms dynamic 2D tracking based on YCrCb skin chrominance (`cr in [133, 173], cb in [77, 127]`).
- **Feature-Specific Metric Responsiveness**:
  - Saturated ocular glare test frame produced `chosen_type = eyewear_specular_glare` (`eyewear_specular` score: 57.57 vs iris: 0.0, lip: 0.0).
  - Asymmetrical iris reflection test frame produced `chosen_type = iris_pupil_reflection` (`iris_discontinuity` score: 191.03 vs eyewear: 41.06).
  - High perioral Laplacian gradient test frame produced `chosen_type = lip_sync_blending` (`lip_sync_laplacian` score: 20242.2 vs eyewear: 0.0).
- **Real Benchmark Deepfake Video Workload**:
  - Tested across benchmark deepfake videos in `garbage/kaggle_and_scratch/benchmark_datasets/generated_100_deepfake_videos/`:
    - `deepfake_Amartya_Sen.mp4`: `face_roi=(588, 302, 443, 592)`, `box=(650, 444, 318, 112)`, scores: `{'eyewear_specular': 24.97, 'iris_discontinuity': 71.81, 'lip_sync_laplacian': 8.47}`
    - `deepfake_Gautam_Adani.mp4`: `face_roi=(588, 304, 393, 590)`, `box=(643, 445, 282, 112)`, scores: `{'eyewear_specular': 4.0, 'iris_discontinuity': 11.77, 'lip_sync_laplacian': 8.72}`
    - `deepfake_MK_Stalin.mp4`: `face_roi=(586, 305, 487, 590)`, `box=(654, 446, 350, 112)`, scores: `{'eyewear_specular': 46.35, 'iris_discontinuity': 107.2, 'lip_sync_laplacian': 9.82}`
  - Proves that distinct facial structures and synthetic reenactment artifacts generate genuine, diverse bounding boxes and metrics.

### 1.4 Test Suite & Performance SLAs
- Executed `PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py`:
  - **48 of 48 tests passed** (including all Tier 1, Tier 2, Tier 3, and Tier 4 tests).
  - Per-frame localization latency across all 20 benchmark deepfake videos:
    - Minimum latency: 3.99 ms
    - Mean latency: 5.68 ms
    - Maximum latency: 18.97 ms
    - All measurements strictly adhere to the `<200 ms` SLA requirement (< 10% of maximum allowance).

---

## 2. Logic Chain

1. **Premise 1 (Ground Truth Specification)**: `ORIGINAL_REQUEST.md` (## 2026-09-03T20:47:27Z) and `PROJECT.md` specify that `backend/netra/pipeline/visual_localizer.py` must extract keyframes exceeding 75% anomaly, isolate 3 facial landmark zones (eyewear specular glare, iris reflection, lip-sync blending), assign semantic descriptors, and render amber (`#f59e0b`) bounding boxes with forensic badges in <200ms.
2. **Premise 2 (Static Authenticity)**: AST analysis verified the module contains zero mocks, zero test-specific branches, zero hardcoded benchmark filenames or person identities, and zero constant-returning facades.
3. **Premise 3 (Dynamic Behavior)**: Physical runtime execution with varying synthetic inputs and real deepfake video frames showed that bounding boxes, anomaly zone classifications, and quantitative scores vary authentically with the input pixels.
4. **Premise 4 (Styling & Visual Fidelity)**: Color constants `AMBER_BGR = (11, 158, 245)` and `DARK_BG_BGR = (42, 23, 15)` represent true BGR values for `#f59e0b` and `#0f172a`. The rendered output was verified at the pixel level to contain the specified border colors and badge overlay.
5. **Premise 5 (SLA Compliance)**: All 48 E2E test cases passed, and benchmark video execution demonstrated latencies < 20ms per frame against the 200ms threshold.
6. **Deductive Conclusion**: The work product in `backend/netra/pipeline/visual_localizer.py` fulfills all requirements authentically without circumvention or integrity violations.

---

## 3. Caveats

- Benchmark videos in `generated_100_deepfake_videos` share a common underlying base video source at frame 0 with minimal neutral differences, but develop distinct deepfake facial deformations and metrics at speech keyframes (e.g. frame 45).
- In accordance with the Forensic Auditor protocol, no implementation code was modified during this audit.

---

## 4. Conclusion

**Verdict**: **CLEAN**

`backend/netra/pipeline/visual_localizer.py` is fully genuine, dynamically computes all bounding boxes and anomaly metrics, adheres strictly to color and forensic badge specifications, and satisfies all performance SLAs without any hardcoding, mocks, or facades.

---

## 5. Verification Method

To independently reproduce and verify this audit:

```bash
cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra

# 1. Run the dedicated forensic audit script
PYTHONPATH=. ./venv/bin/python .agents/teamwork_preview_auditor_m6_1/forensic_verification_script.py

# 2. Run the complete end-to-end visual forensics test suite
PYTHONPATH=. ./venv/bin/pytest tests/test_visual_forensics_e2e.py -v
```
