# DISPATCH: Milestone 1 — Database Purge & Storage Foundation Worker

## Mission
Implement Milestone 1 as defined in `PROJECT.md` and informed by the survey handoffs:
1. **Database Purge (Directive 1)**:
   - In `backend/api/netra.db`: Execute purge of `threat_catalog` and `community_posts`:
     `DELETE FROM threat_catalog; DELETE FROM community_posts; VACUUM;`
   - Preserve `api_keys`.
   - Remove root stale file `threat_catalog.db`.
   - Verify 0 dummy items (`NETRA-SCAM-0001..0010`) remain.
2. **Media Storage Mounting (Directive 5 Foundation)**:
   - In `backend/api/server.py`:
     Create and mount `backend/media` directory at `/api/v1/media` using FastAPI `StaticFiles`. Ensure subdirectories `videos/`, `images/`, `audio/` exist.
   - In `backend/api/routes/threat_intel.py`:
     Update `ReportThreatRequest` Pydantic model to include `media_url: Optional[str] = None` and `thumbnail_url: Optional[str] = None`.
3. **Media Type Query Normalization (Directive 2 Foundation)**:
   - In `backend/api/db.py`:
     In `get_threat_catalog(..., media_type=...)`:
     Normalize `media_type`:
     - If `media_type.lower() == "video"`: match `type IN ('video', 'video_deepfake')`
     - If `media_type.lower() == "image"`: match `type IN ('image', 'image_deepfake')`
     - If `media_type.lower() == "audio"`: match `type IN ('audio', 'audio_clone')`
     - If `media_type.lower() == "text"`: match `type IN ('text', 'scam_text')`
     - Otherwise: match `type = ?` (preserves compatibility with existing tests that query exact `video_deepfake`).
4. **Build & Test Verification**:
   - Run backend tests: `PYTHONPATH=. ./venv/bin/pytest tests/test_isolated_audit.py -v` and `PYTHONPATH=. ./venv/bin/pytest tests/test_dynamic_endpoints_adversarial.py -v`.
   - Verify catalog and radar endpoints respond cleanly with 0 rows on empty DB.

## File Write Ownership
You own and may modify ONLY these files:
- `backend/api/netra.db` (database file)
- `threat_catalog.db` (deletion)
- `backend/api/server.py`
- `backend/api/routes/threat_intel.py`
- `backend/api/db.py`

## Mandatory Rules & Warnings
- Read: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md`
- Read: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md`
- Read: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_1/handoff.md`
- Read: `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/explorer_survey_2/handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
Write your detailed report to:
`/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/worker_m1/handoff.md`
Maintain your `progress.md` with your liveness heartbeat.
Send a message when done.

## 2026-09-03T19:48:46Z
<USER_REQUEST>
You are Worker 1 implementing Milestone 1 (Database Purge & Storage Foundation).
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/worker_m1
Your task is defined in: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/worker_m1/DISPATCH.md
Read /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md, /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/PROJECT.md, and your DISPATCH.md.
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
Implement Directive 1 database purge, media static mount in server.py, ReportThreatRequest model expansion, and media type query normalization in db.py.
Run the tests and document commands and output in your handoff.
Maintain progress.md with your liveness heartbeat.
Write handoff.md and send a message when done.
</USER_REQUEST>
