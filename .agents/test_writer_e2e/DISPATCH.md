# DISPATCH: E2E Testing Track — Opaque-Box Test Suite Creation

## Mission
Design and implement a comprehensive opaque-box E2E test suite covering all 5 directives in `ORIGINAL_REQUEST.md` and recorded in `PROJECT.md`.
Follow the 4-Tier Test Case Design Methodology:
- Tier 1: Feature Coverage (Directives 1-5 happy path tests)
  - Directive 1: Clean database state verification (0 dummy items NETRA-SCAM-0001..0010, 0 seed community posts).
  - Directive 2: Catalog UI & backend query filtering by media types (`video`, `image`, `audio`, `text`).
  - Directive 3: Rebranding strings and radar telemetry endpoint.
  - Directive 4: Forensic PDF report download endpoint returns 200 and valid PDF header `%PDF-`.
  - Directive 5: Auto-population of threat_catalog with media_url, and EXIF GPS extraction.
- Tier 2: Boundary & Corner Cases (empty catalog handling, media types with no items, coordinates at boundary 0/0, missing EXIF GPS resulting in honest NULL lat/lng, invalid job IDs).
- Tier 3: Cross-Feature Combinations (analyzed media auto-inserted into catalog -> plots onto radar -> downloadable PDF report with identical SHA-256 and coordinates).
- Tier 4: Real-World Scenarios (multi-modal threats: video deepfake with ISO6709 GPS, JPEG scam with EXIF GPS, voice clone audio, scam text smishing).

## Scope & Constraints
- You are an opaque-box test writer. Derive tests strictly from user requirements, not internal code details.
- DO NOT modify application source code.
- Write tests to: `tests/test_e2e_directives.py`.
- Run your tests using: `PYTHONPATH=. ./venv/bin/pytest tests/test_e2e_directives.py -v`.
- Create `TEST_INFRA.md` at project root `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/TEST_INFRA.md` detailing the test suite architecture and coverage.
- When the test suite is ready and verified against the specs, publish `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/TEST_READY.md`.

## Mandatory Paths
- Read: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md`
- Read: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md`
- Output handoff report to: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/test_writer_e2e/handoff.md`

## 2026-09-03T19:48:46Z
User prompt:
Design the opaque-box test suite for all 5 directives following the 4-tier methodology (Feature Coverage, Boundary & Corner, Combinatorial, Real-World Scenarios).
Create tests/test_e2e_directives.py and publish TEST_INFRA.md and TEST_READY.md.
Maintain progress.md with your liveness heartbeat.
Write handoff.md and send a message when done.
