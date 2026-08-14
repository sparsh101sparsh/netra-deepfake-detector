# Handoff Report: Survey of Directives 2 & 3 (UI Catalog, Media Previews & Netra Radar)

**Agent**: Explorer 2 (Survey Phase)  
**Date**: 2026-09-03T19:50:00Z  
**Target Directives**: Directive 2 (Catalog UI Overhaul & Playable Previews) & Directive 3 (Netra Radar & Navbar Rebranding & Plotting)

---

## 1. Observation

### 1.1 Directive 2: Threat Intelligence Catalog UI (`/reported`)
- **Page File**: `frontend/app/reported/page.tsx` (Total lines: 347)
  - **Component**: `ThreatCatalogPage()`
  - **Current Filter Tabs State** (lines 46–47):
    ```typescript
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [selectedType, setSelectedType] = useState("ALL");
    ```
  - **Current Filter Tabs Definition** (lines 96–105):
    ```typescript
    const categories = [
      { id: "ALL", label: "All" },
      { id: "IMPERSONATION", label: "Impersonation" },
      { id: "DIGITAL_ARREST", label: "Digital Arrest" },
      { id: "ELECTRICITY_KYC", label: "Electricity & KYC" },
      { id: "STOCK_FRAUD", label: "Stock Fraud" },
      { id: "JOB_SCAM", label: "Job Scam" },
      { id: "VOICE_CLONE", label: "Voice Clone" },
      { id: "BANKING_PHISHING", label: "Phishing" },
    ];
    ```
  - **Tabs Rendering** (lines 117–122):
    ```typescript
    <GlidingFilterTabs
      tabs={categories}
      activeId={selectedCategory}
      onChange={setSelectedCategory}
      pillVariant="rounded-xl"
    />
    ```
  - **Current Data Fetch Call** (lines 55–60):
    ```typescript
    let url = `/api/backend/api/v1/threat-intelligence/catalog?limit=50`;
    if (selectedCategory !== "ALL") url += `&category=${selectedCategory}`;
    if (selectedType !== "ALL") url += `&media_type=${selectedType}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    ```
    *Observation*: `selectedType` is currently dead code in the UI; only `selectedCategory` is bound to the tab bar.
  - **Interface Definition** (lines 14–41):
    `ThreatItem` currently contains `id`, `title`, `type`, `threat_category`, `source_platform`, `fake_probability`, `verdict`, `risk_level`, `city`, `state`, `location_source`, `device_model`, `software_used`, `extracted_iocs`, `fir_dossier`, `upvotes_count`, `created_at`.
    *Observation*: Neither `media_url` nor `thumbnail_url` is declared on `ThreatItem` in `page.tsx`, even though both columns exist in the backend database.
  - **Card Rendering** (lines 197–283):
    Cards only render category tags, severity pill, title, `incident_summary` text snippet, location, conviction %, IOC tags (phone/upi), and upvote button.
    *Observation*: There is **zero playable media rendering** (no HTML5 `<video>`, `<audio>`, lightbox image preview, or transcript box).
  - **Modal / Slide-Over Rendering** (lines 290–338):
    Detail slide-over only displays ID, title, summary, applicable laws, and an `<a>` tag linking to `/api/backend/api/v1/threat-intelligence/${activeItem.id}/fir-pdf`.
    *Observation*: No media player exists in the modal.

### 1.2 Backend Catalog API & DB Query Filtering
- **Route File**: `backend/api/routes/threat_intel.py` (lines 40–56):
  ```python
  @router.get("/threat-intelligence/catalog")
  async def fetch_threat_catalog(
      search: Optional[str] = Query(None, description="Search keyword, phone number, UPI ID, or city"),
      category: Optional[str] = Query(None, description="Filter by scam category"),
      media_type: Optional[str] = Query(None, alias="type", description="Filter by media type"),
      limit: int = Query(50, ge=1, le=200),
      offset: int = Query(0, ge=0)
  ):
      items = get_threat_catalog(search=search, category=category, media_type=media_type, limit=limit, offset=offset)
  ```
- **Database File**: `backend/api/db.py` (lines 44–68 & 243–282):
  - Schema defines:
    `type TEXT NOT NULL, -- video_deepfake, image_deepfake, scam_text, audio_clone`
    `thumbnail_url TEXT, media_url TEXT`
  - Query filtering lines 258–261:
    ```python
    if media_type and media_type.lower() != "all":
        query += " AND type = ?"
        params.append(media_type)
    ```
    *Observation*: `get_threat_catalog` performs an exact match `type = ?`. If the frontend queries `media_type=video`, but records in SQLite have `type='video_deepfake'`, the query matches 0 items. Furthermore, existing tests (`tests/test_isolated_audit.py:31` and `tests/test_dynamic_endpoints_adversarial.py:61`) explicitly test `?type=video_deepfake`.

### 1.3 Directive 3: Navbar Rebranding
- **Navbar File**: `frontend/components/layout/Navbar.tsx` (lines 24–31):
  ```typescript
  export const NAV_ITEMS: NavItem[] = [
    { href: "/", label: "Live Scanner", icon: Scan, id: "scanner" },
    { href: "/reported", label: "Catalog", icon: Database, id: "reported" },
    { href: "/radar", label: "Netra Radar", icon: Globe, id: "radar" },
    { href: "/community", label: "Community", icon: Users, id: "community" },
    { href: "/developers", label: "API Docs", icon: Terminal, id: "developers" },
    { href: "/technology", label: "Technology", icon: Cpu, id: "technology" },
  ];
  ```
  *Observation*: In `NAV_ITEMS`, line 27 already has `label: "Netra Radar"`.
- **Other Radar References in UI**:
  - `frontend/components/layout/Footer.tsx` line 30:
    `{ label: "Live Threat Radar (Map)", href: "/radar", badge: "Geospatial", external: false },`
  - `frontend/components/layout/NewInstitutionalIntro.tsx` line 35:
    `{ label: "NET.RADAR", text: "SYNCHRONIZING 360° THREAT RADAR NODES..." },`

### 1.4 Directive 3: LiveThreatRadar Title & Radar Plotting
- **Radar Component File**: `frontend/components/LiveThreatRadar.tsx` (516 lines)
  - Header Title (line 223):
    ```tsx
    <h3 className="font-bold text-white tracking-tight text-sm sm:text-base">
      Netra Cyber Threat Radar
    </h3>
    ```
    *Observation*: The in-component header title is already `Netra Cyber Threat Radar`.
- **Radar Page File**: `frontend/app/radar/page.tsx` (lines 1–21):
  - Client component importing `Navbar` and `LiveThreatRadar`.
  - *Observation*: The page has no document title or metadata export. The browser window tab defaults to the root title from `app/layout.tsx` (`NETRA — Eyes That See Through | Multi-Modal Forensic AI`).
- **Plotting Telemetry Endpoint**: `backend/api/routes/threat_intel.py:fetch_threat_radar` (lines 57–86):
  ```python
  @router.get("/threat-intelligence/radar")
  async def fetch_threat_radar():
      items = get_threat_catalog(limit=100)
      markers = []
      for item in items:
          if item.get("lat") is not None and item.get("lng") is not None:
              markers.append({
                  "id": item["id"], "title": item["title"], "type": item["type"],
                  "category": item["threat_category"], "lat": item["lat"], "lng": item["lng"],
                  "city": item["city"], "state": item["state"], "location_source": item["location_source"],
                  "confidence_pct": round(item["fake_probability"] * 100, 1),
                  "risk_level": item["risk_level"], "software_used": item["software_used"],
                  "device_model": item["device_model"], "upvotes": item["upvotes_count"],
                  "created_at": item["created_at"]
              })
      return {"status": "success", "total_markers": len(markers), "markers": markers}
  ```
- **Leaflet Map Rendering** (`LiveThreatRadar.tsx` lines 88–122 & 141–191):
  - Leaflet map initialized with ArcGIS World Imagery satellite tiles.
  - Centered at `[22.3511148, 78.6677428]` (geographic center of India), zoom level 5.
  - Plots markers at `[m.lat, m.lng]` using `L.divIcon` with CSS pulsing rings (Rose `#f43f5e` for CRITICAL, Amber `#f59e0b` for HIGH/MEDIUM).
  - Clicking a marker opens the floating detail card overlay; clicking an item in the right-side feed invokes `mapInstanceRef.current.flyTo([marker.lat, marker.lng], 9, { duration: 1.2 })`.
- **Crucial Category Filter Bug in `LiveThreatRadar.tsx`**:
  - Filter Tabs (lines 239–244):
    `{ id: "ALL", label: "All Incidents" }, { id: "DEEPFAKE", label: "Deepfakes" }, { id: "DIGITAL_ARREST", label: "Digital Arrest" }, { id: "STOCK_FRAUD", label: "Trading Scams" }`
  - Filter Predicate (lines 132–139):
    ```typescript
    const matchesFilter = activeFilter === "ALL" || m.category === activeFilter;
    ```
    *Observation*: In `fetch_threat_radar`, `m.category` comes from `item["threat_category"]` (e.g. `IMPERSONATION`, `VOICE_CLONE`), NOT `"DEEPFAKE"`. Items with `type: "video_deepfake"` or `type: "image_deepfake"` have `threat_category` set to incident types like `IMPERSONATION`. As a result, selecting the "Deepfakes" tab returns 0 markers even when deepfake entries are present.

---

## 2. Logic Chain

### 2.1 Directive 2: Category Filter Tabs Overhaul
1. User directive states: "Change category filter tabs to Media Types: All | Video | Image | Audio | Text".
2. Observation 1.1 shows `frontend/app/reported/page.tsx` defines `categories` array with 8 scam categories and binds it to `GlidingFilterTabs`.
3. To implement Directive 2, `categories` must be replaced with `MEDIA_TYPE_TABS`:
   ```typescript
   const MEDIA_TYPE_TABS = [
     { id: "ALL", label: "All" },
     { id: "video", label: "Video" },
     { id: "image", label: "Image" },
     { id: "audio", label: "Audio" },
     { id: "text", label: "Text" },
   ] as const;
   ```
4. Observation 1.2 reveals that the SQLite database stores `type` as `video_deepfake`, `image_deepfake`, `audio_clone`, and `scam_text`, and `get_threat_catalog` executes `WHERE type = ?`.
5. If the frontend requests `media_type=video`, but the database contains `video_deepfake`, zero rows match. Furthermore, existing tests in `tests/test_isolated_audit.py` query `?type=video_deepfake`.
6. Therefore, the backend `backend/api/db.py:get_threat_catalog` must normalize media types:
   - `video` → matches `type IN ('video', 'video_deepfake')` or `type LIKE '%video%'`
   - `image` → matches `type IN ('image', 'image_deepfake')` or `type LIKE '%image%'`
   - `audio` → matches `type IN ('audio', 'audio_clone')` or `type LIKE '%audio%'`
   - `text` → matches `type IN ('text', 'scam_text')` or `type LIKE '%text%'`
   - Fallback: exact match `type = ?` for specific type strings.
7. This ensures backwards compatibility with automated tests while fulfilling the user's media filter overhaul.

### 2.2 Directive 2: Playable Media Previews
1. Directive 2 requires: "playable media previews: inline HTML5 video player for video deepfakes, audio player for voice clones, image lightbox for image deepfakes, and clean transcript for scam texts."
2. In `frontend/app/reported/page.tsx`, `ThreatItem` interface must be updated to include `media_url?: string | null` and `thumbnail_url?: string | null`.
3. For catalog grid cards (`<article>` elements):
   - **Video Deepfakes**:
     Render inline HTML5 video player with `controls`, `playsInline`, and `preload="metadata"`. Critical detail: controls must include `onClick={(e) => e.stopPropagation()}` to prevent the card's slide-over modal trigger when clicking play/pause/seek.
   - **Audio Clones**:
     Render inline HTML5 `<audio controls>` player wrapped in an audio forensic container with waveform icon and metadata. Must also include `onClick={(e) => e.stopPropagation()}`.
   - **Image Deepfakes**:
     Render thumbnail image with an expand hover overlay (`Maximize2`). Clicking sets `lightboxUrl` state and calls `e.stopPropagation()`. An image lightbox modal overlays the screen when `lightboxUrl` is active.
   - **Scam Texts**:
     Render a clean transcript callout block with monospace font, quotation styling, left colored border (`border-l-rose-500`), and a 1-click copy button (`navigator.clipboard.writeText`).
4. In the detail modal slide-over:
   - Render the media preview in high fidelity at the top of the modal body.
   - Include 1-click "Download Forensic PDF" using `generateForensicPDF` from `@/lib/pdfReportGenerator.ts`.

### 2.3 Directive 3: Rebranding & Radar Plotting
1. Observation 1.3 shows `Navbar.tsx` line 27 is already `Netra Radar`. However, `Footer.tsx` line 30 still has `Live Threat Radar (Map)`, and `NewInstitutionalIntro.tsx` has `360° THREAT RADAR NODES`.
2. Observation 1.4 shows `LiveThreatRadar.tsx` line 223 already has header `Netra Cyber Threat Radar`. However, `app/radar/page.tsx` lacks page title/metadata. Setting `document.title = "Netra Cyber Threat Radar | NETRA"` in `LiveThreatRadar.tsx` or adding `app/radar/layout.tsx` guarantees browser tab alignment.
3. Observation 1.4 reveals a functional bug in `LiveThreatRadar.tsx`: filtering by "DEEPFAKE" tab fails because `m.category` contains `threat_category` (`IMPERSONATION`) rather than checking `m.type`. Fixing the condition:
   ```typescript
   const matchesFilter =
     activeFilter === "ALL" ||
     m.category === activeFilter ||
     (activeFilter === "DEEPFAKE" && (m.type?.includes("deepfake") || m.category === "DEEPFAKE"));
   ```
   restores full radar plotting when filtering for deepfake incidents.

---

## 3. Caveats
1. **Local Media File Serving**: In `frontend/next.config.js`, only `/api/backend/:path*` is proxied to `http://127.0.0.1:8000`. If `media_url` points to `/media/...` on FastAPI, FastAPI needs `app.mount("/media", ...)` or Next.js needs a rewrite rule for `/media/:path*`, or URLs should be `/api/backend/media/...`.
2. **Database Clean Start**: Explorer 1 is investigating Directive 1 (Database purge of dummy items) and Directive 5 (Auto-population & EXIF extraction). When the DB is purged, the catalog and radar will start empty until real uploads occur; UI components must handle 0 items gracefully (both already have zero-state placeholders).
3. **No Direct Code Modifications**: Per the Teamwork explorer persona, this investigation is strictly read-only. Proposed code snippets and patch architecture are provided for the subsequent implementation agent.

---

## 4. Conclusion
1. **Catalog UI Overhaul (`/reported`)**:
   - `frontend/app/reported/page.tsx` needs:
     - `categories` array replaced with `MEDIA_TYPE_TABS`: All (`ALL`), Video (`video`), Image (`image`), Audio (`audio`), Text (`text`).
     - `selectedCategory` state replaced by `selectedMediaType`.
     - `ThreatItem` interface expanded with `media_url` and `thumbnail_url`.
     - 4 distinct media preview renderers added to catalog cards: inline HTML5 `<video controls>`, inline HTML5 `<audio controls>`, Image thumbnail with Lightbox trigger, and Clean Scam Transcript block with copy button.
     - Image Lightbox overlay component implemented for full-screen inspection.
     - Detail slide-over enhanced with top media preview and 1-click Forensic PDF button.
   - `backend/api/db.py:get_threat_catalog`:
     - Normalizes `media_type` filter parameter to match both simple names (`video`, `image`, `audio`, `text`) and database composite types (`video_deepfake`, `image_deepfake`, `audio_clone`, `scam_text`).
2. **Netra Radar & Navbar Rebranding**:
   - `Navbar.tsx` is already branded `Netra Radar`; `Footer.tsx` line 30 should be updated from `Live Threat Radar (Map)` to `Netra Radar`.
   - `LiveThreatRadar.tsx` already has header `Netra Cyber Threat Radar`; browser document title should be set in `app/radar/page.tsx` or `LiveThreatRadar.tsx`.
   - `LiveThreatRadar.tsx` tab filtering bug resolved by checking `m.type?.includes("deepfake")` when `activeFilter === "DEEPFAKE"`.

---

## 5. Verification Method

### 5.1 Commands to Verify Current State & Future Changes
1. **TypeScript Build & Type Safety**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend
   npx tsc --noEmit
   ```
   *Expected*: Exits with code 0, 0 type errors.

2. **Backend Threat Intelligence & Catalog Test**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
   PYTHONPATH=. ./venv/bin/python tests/test_isolated_audit.py
   ```
   *Expected*: Passes all 4 suites: `/api/v1/threat-intelligence/catalog`, `/api/v1/threat-intelligence/radar`, public detect endpoints, and scam classifier.

3. **Adversarial Endpoints Validation**:
   ```bash
   cd /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra
   PYTHONPATH=. ./venv/bin/pytest tests/test_dynamic_endpoints_adversarial.py -v
   ```

### 5.2 Specific Files to Inspect
- `frontend/app/reported/page.tsx`
- `frontend/components/LiveThreatRadar.tsx`
- `frontend/components/layout/Navbar.tsx`
- `frontend/components/layout/Footer.tsx`
- `backend/api/db.py` (lines 243–282)
- `backend/api/routes/threat_intel.py` (lines 40–86)

### 5.3 Invalidation Conditions
- If the database schema in `backend/api/db.py` changes column names (`type`, `media_url`, `thumbnail_url`).
- If Next.js `rewrites()` config in `frontend/next.config.js` alters the `/api/backend/` proxy destination.
