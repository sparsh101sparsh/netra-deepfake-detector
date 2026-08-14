# Challenger M11-1 Empirical Handoff Report

**Verdict**: `REQUEST_CHANGES`

---

## 1. Observation

Direct empirical observations from executing the test suite and build pipeline:

### Observation 1.1: Unsafe Destructuring Throws Uncaught Exception on Missing `face.bbox`
- **File**: `frontend/components/sandbox/FacialAnomalyCard.tsx`
- **Line Number**: 249
- **Code**:
  ```tsx
  248: const metrics = face.neural_metrics || {};
  249: const [x, y, w, h] = face.bbox;
  ```
- **Test Command**: `node frontend/scripts/test-challenger-m11-empirical.mjs` (Suite 5, Test 5.1)
- **Verbatim Error**:
  ```
  TypeError: undefined is not iterable (cannot read property Symbol(Symbol.iterator))
      at FaceScorecard (/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend/components/sandbox/FacialAnomalyCard.tsx:249:29)
  ```
- **Impact**: When an image scan payload or mock contains a face without a `bbox` field (or `bbox: undefined`/`null`), the component immediately crashes the React render tree with an unhandled runtime `TypeError`.

### Observation 1.2: Unsafe `.replace()` Call Throws Uncaught Exception on Missing `face.face_id`
- **File**: `frontend/components/sandbox/FacialAnomalyCard.tsx`
- **Line Number**: 261
- **Code**:
  ```tsx
  261: {face.face_id.replace("_", " ").toUpperCase()}
  ```
- **Test Command**: `node frontend/scripts/test-challenger-m11-empirical.mjs` (Suite 5, Test 5.2)
- **Verbatim Error**:
  ```
  TypeError: Cannot read properties of undefined (reading 'replace')
      at FaceScorecard (/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend/components/sandbox/FacialAnomalyCard.tsx:261:25)
  ```
- **Impact**: If `face.face_id` is omitted or null, the component crashes with `TypeError: Cannot read properties of undefined (reading 'replace')`.

### Observation 1.3: `npm run build` Fails During Build Trace Collection
- **Command**: `npm run build` in `frontend/`
- **Verbatim Output**:
  ```
  > netra-frontend@5.0.0 build
  > next build

    ▲ Next.js 14.2.3
    - Environments: .env.local

     Creating an optimized production build ...
   ✓ Compiled successfully
     Linting and checking validity of types ...
     Collecting page data ...
     Generating static pages (0/16) ...
     Generating static pages (4/16) 
     Generating static pages (8/16) 
     Generating static pages (12/16) 
   ✓ Generating static pages (16/16)
     Finalizing page optimization ...
     Collecting build traces ...
  Error: ENOENT: no such file or directory, open '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend/.next/server/pages/_error.js.nft.json'
      at async open (node:internal/fs/promises:640:25)
      at async Object.readFile (node:internal/fs/promises:1287:14)
      at async /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend/node_modules/next/dist/build/collect-build-traces.js:429:50
  ```
- **Context**: `next.config.js` sets `output: 'standalone'`. In Next.js 14.2.3 with App Router only (no `pages/` directory), `collect-build-traces.js` attempts to trace `pages/_error.js.nft.json` which does not exist, aborting the build with exit code 1. Note that TypeScript checking (`npx tsc --noEmit`) passes with 0 errors.

### Observation 1.4: Verified Resilient Behaviors (Passes)
Executing `frontend/scripts/test-challenger-m11-empirical.mjs` verified that 20 out of 22 edge cases pass with full resilience:
1. **Zero Faces (`face_count === 0` / null / undefined)**: Safely returns `null` early without broken DOM (Tests 1.1, 1.2, 1.3).
2. **Single Face (`face_count === 1`)**: Multi-face selector pill bar is suppressed (`{faces.length > 1 && ...}`) and individual face scorecard renders cleanly (Test 1.4).
3. **Many Faces (20+ faces)**: Bounding box overlays, 20 selector pills, and chevron controls render without layout explosion (Test 1.6).
4. **Malformed / Missing `normalized_bbox`**: Line 183 (`if (!face.normalized_bbox || face.normalized_bbox.length !== 4) return null;`) successfully suppresses malformed boxes (missing, null, length 2, length 5) without throwing NaN or crashing (Test 2.1).
5. **Extreme Coordinates**: Negative values (`[-0.2, -0.3, ...]`), out-of-bounds (`[1.2, 1.5, ...]`), zero dimensions, and NaN/Infinity coordinates render within `overflow-hidden` containers without breaking page layout (Tests 2.2, 2.3).
6. **OCRDossier Edge Cases**: Empty payload (`{}`), null/missing `extracted_iocs`, empty lists, verified/unverified Tavily advisories, and 10,000 character document text render cleanly with 1-click copy actions and no exceptions (Tests 4.1 - 4.7).

---

## 2. Logic Chain

1. **Premise**: Per the Milestone 11 dispatch instructions:
   - "2. Ensure components do not throw null pointer exceptions or render broken DOM when fields are null or undefined."
   - "3. Verify `npm run build` and run stress checks or write a test script to validate resilience."
   - "4. Give a clear verdict: `APPROVE` or `REQUEST_CHANGES`."
2. **Inference from Obs 1.1 & 1.2**:
   - `FaceScorecard` in `FacialAnomalyCard.tsx` unconditionally executes `const [x, y, w, h] = face.bbox;` and `face.face_id.replace("_", " ")`.
   - When an external API payload returns a face entry where `bbox` is undefined (e.g. partial classification failure) or `face_id` is missing, the component triggers an unhandled `TypeError` that halts UI rendering.
   - The fix requires defensive fallbacks:
     - `const [x, y, w, h] = face.bbox ?? [0, 0, 0, 0];`
     - `{(face.face_id ?? "face").replace(/_/g, " ").toUpperCase()}`
3. **Inference from Obs 1.3**:
   - `npm run build` must succeed cleanly with exit code 0 per Milestone 11 acceptance criteria.
   - Currently, Next.js build terminates with code 1 due to `collect-build-traces` seeking `pages/_error.js.nft.json` under `output: 'standalone'`.
4. **Synthesis**:
   - Because runtime crashes occur on missing fields and `npm run build` fails, an `APPROVE` verdict cannot be granted.
   - Changes must be requested with precise mitigations.

---

## 3. Caveats

- **Scope**: Testing was conducted using Node.js SSR (`ReactDOMServer.renderToString`) and TypeScript static compilation checks (`tsc --noEmit`). Client-side interactive events (e.g. click state updates) were verified via the state machine simulation harness in `test-challenger-m11-stress.ts`.
- **InsightFace Pretrained Weights**: Backend live inference depends on ONNX models; this review focused strictly on frontend boundary conditions and build pipeline resilience as requested in the dispatch.

---

## 4. Conclusion

**Verdict**: `REQUEST_CHANGES`

The Milestone 11 UI implementation is well-structured, implements OKLCH design tokens, and handles 20 out of 22 boundary edge cases cleanly. However, changes are required to address two unhandled runtime exceptions and the production build failure:

### Required Changes:
1. **Fix Unsafe Destructure in `FacialAnomalyCard.tsx` Line 249**:
   ```tsx
   // Replace:
   const [x, y, w, h] = face.bbox;
   // With:
   const [x, y, w, h] = face.bbox ?? [0, 0, 0, 0];
   ```
2. **Fix Unsafe String Call in `FacialAnomalyCard.tsx` Line 261**:
   ```tsx
   // Replace:
   {face.face_id.replace("_", " ").toUpperCase()}
   // With:
   {(face.face_id ?? "face").replace(/_/g, " ").toUpperCase()}
   ```
3. **Resolve Next.js Build Trace Error (`npm run build`)**:
   - In `frontend/next.config.js`, either evaluate if `output: 'standalone'` is strictly needed for local builds, or add an empty `frontend/pages/_error.js` so Next.js NFT trace collector satisfies its lookup.

---

## 5. Verification Method

To independently verify these findings:

1. **Run the Empirical Challenger Stress Test Suite**:
   ```bash
   node frontend/scripts/test-challenger-m11-empirical.mjs
   ```
   Inspect failures on Tests 5.1 and 5.2 demonstrating the uncaught `TypeError` exceptions.
2. **Run Production Build**:
   ```bash
   cd frontend && npm run build
   ```
   Observe the build trace failure: `ENOENT: no such file or directory, open '.../.next/server/pages/_error.js.nft.json'`.
3. **Verify Static TypeScript Types**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
   Confirms that static typing passes (exit code 0).
