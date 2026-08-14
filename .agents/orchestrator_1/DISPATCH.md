## 2026-09-03T19:40:02Z
You are the Project Orchestrator for the NETRA project.
Your working directory is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/orchestrator_1
The workspace root is: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra

The authoritative user request is recorded in:
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md

DIRECTIVES TO IMPLEMENT:
1. Database Purge:
- Remove seed dummy items (NETRA-SCAM-0001..0010) and seed community posts from SQLite database (threat_catalog and community_posts).
- Catalog and radar must start clean with real uploads.

2. Catalog UI Overhaul (/reported):
- Change category filter tabs to Media Types: All | Video | Image | Audio | Text
- Add playable media previews: inline HTML5 video player for video deepfakes, audio player for voice clones, image lightbox for image deepfakes, and clean transcript for scam texts.

3. Netra Radar & Navbar Rebranding:
- Update Navbar link from 'Threat Radar' to 'Netra Radar'
- Update LiveThreatRadar page title to 'Netra Cyber Threat Radar'

4. Exportable Forensic PDF Report:
- Implement a 1-click Download Forensic PDF report button on both /analyze/[jobId] and the catalog modal.
- Includes Job ID, SHA-256 hash, verdict, scorecard, metadata, and keyframe anomalies.

5. Auto-Population & EXIF Extraction:
- Auto-insert analyzed media (video, image, audio, text) into threat_catalog with playable media URL and forensic results.
- Extract EXIF GPS coordinates from video/image and populate lat/lng in threat_catalog so they plot onto Netra Radar.
