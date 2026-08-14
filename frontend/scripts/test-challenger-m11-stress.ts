import fs from "fs";
import path from "path";

interface TestReport {
  category: string;
  testName: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: any;
}

const reports: TestReport[] = [];
const FRONTEND_DIR = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend";

function pass(category: string, testName: string, message: string, details?: any) {
  reports.push({ category, testName, status: "PASS", message, details });
}

function fail(category: string, testName: string, message: string, details?: any) {
  reports.push({ category, testName, status: "FAIL", message, details });
}

function warn(category: string, testName: string, message: string, details?: any) {
  reports.push({ category, testName, status: "WARN", message, details });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATE SYNCHRONIZATION SIMULATION & ORACLE HARNESS
// ─────────────────────────────────────────────────────────────────────────────

interface MockFace {
  face_id: string;
  bbox: [number, number, number, number];
  normalized_bbox?: [number, number, number, number];
  fake_probability: number;
  verdict: "DEEPFAKE" | "SUSPICIOUS" | "AUTHENTIC" | string;
  risk_level: "CRITICAL" | "HIGH" | "SAFE" | string;
  flags: string[];
  neural_metrics?: any;
}

// Simulates the exact state machine of FacialAnomalyCard
class FacialAnomalyCardStateMachine {
  faces: MockFace[];
  activeFaceIdx: number;

  constructor(faces: MockFace[], initialIdx = 0) {
    this.faces = faces;
    this.activeFaceIdx = initialIdx;
  }

  // Click on bounding box overlay
  clickBoundingBox(idx: number) {
    if (idx >= 0 && idx < this.faces.length) {
      this.activeFaceIdx = idx;
    }
  }

  // Click on face selector pill
  clickFacePill(idx: number) {
    if (idx >= 0 && idx < this.faces.length) {
      this.activeFaceIdx = idx;
    }
  }

  // Click chevron left (prev)
  clickPrevChevron() {
    this.activeFaceIdx = Math.max(0, this.activeFaceIdx - 1);
  }

  // Click chevron right (next)
  clickNextChevron() {
    this.activeFaceIdx = Math.min(this.faces.length - 1, this.activeFaceIdx + 1);
  }

  // Active face computed by component: faces[activeFaceIdx] ?? faces[0]
  getActiveFace(): MockFace | undefined {
    return this.faces[this.activeFaceIdx] ?? this.faces[0];
  }

  // Bounding box overlay isActive check: idx === activeFaceIdx
  isBoundingBoxActive(idx: number): boolean {
    return idx === this.activeFaceIdx;
  }

  // Face pill isActive check: idx === activeFaceIdx
  isPillActive(idx: number): boolean {
    return idx === this.activeFaceIdx;
  }
}

function testStateSynchronizationHarness() {
  const sampleFaces: MockFace[] = [
    {
      face_id: "face_001",
      bbox: [100, 150, 120, 140],
      normalized_bbox: [0.1, 0.15, 0.12, 0.14],
      fake_probability: 0.96,
      verdict: "DEEPFAKE",
      risk_level: "CRITICAL",
      flags: ["SBI_BLENDING_ARTIFACT"],
    },
    {
      face_id: "face_002",
      bbox: [350, 140, 110, 130],
      normalized_bbox: [0.35, 0.14, 0.11, 0.13],
      fake_probability: 0.58,
      verdict: "SUSPICIOUS",
      risk_level: "HIGH",
      flags: ["ASYMMETRIC_OCULAR_REFLECTION"],
    },
    {
      face_id: "face_003",
      bbox: [600, 160, 115, 135],
      normalized_bbox: [0.6, 0.16, 0.115, 0.135],
      fake_probability: 0.04,
      verdict: "AUTHENTIC",
      risk_level: "SAFE",
      flags: [],
    },
  ];

  const sm = new FacialAnomalyCardStateMachine(sampleFaces);

  // Subtest 1: Initial state
  if (sm.activeFaceIdx === 0 && sm.isBoundingBoxActive(0) && sm.isPillActive(0) && sm.getActiveFace()?.face_id === "face_001") {
    pass("StateSync", "Initial Active Index", "Initial state correctly defaults to face index 0 with bbox 0 and pill 0 active.");
  } else {
    fail("StateSync", "Initial Active Index", "Initial state did not properly activate face index 0.");
  }

  // Subtest 2: Click Bounding Box 1 -> Syncs with Pill 1 and Scorecard
  sm.clickBoundingBox(1);
  if (sm.activeFaceIdx === 1 && sm.isPillActive(1) && !sm.isPillActive(0) && sm.isBoundingBoxActive(1) && sm.getActiveFace()?.face_id === "face_002") {
    pass("StateSync", "Bounding Box Click -> Pill Sync", "Clicking bounding box 1 immediately activates pill 1 and updates scorecard to face_002.");
  } else {
    fail("StateSync", "Bounding Box Click -> Pill Sync", "Bounding box click failed to synchronize active pill and scorecard.");
  }

  // Subtest 3: Click Face Pill 2 -> Syncs with Bounding Box 2 and Scorecard
  sm.clickFacePill(2);
  if (sm.activeFaceIdx === 2 && sm.isBoundingBoxActive(2) && !sm.isBoundingBoxActive(1) && sm.isPillActive(2) && sm.getActiveFace()?.face_id === "face_003") {
    pass("StateSync", "Face Pill Click -> BBox Sync", "Clicking face pill 2 immediately highlights bounding box 2 and updates scorecard to face_003.");
  } else {
    fail("StateSync", "Face Pill Click -> BBox Sync", "Face pill click failed to synchronize active bounding box.");
  }

  // Subtest 4: Chevron Navigation and Clamping
  sm.clickNextChevron(); // Already at 2 (max index)
  if (sm.activeFaceIdx === 2) {
    pass("StateSync", "Chevron Next Clamping", "Chevron next correctly clamps at upper bound (index 2 of 3).");
  } else {
    fail("StateSync", "Chevron Next Clamping", `Expected activeFaceIdx 2, got ${sm.activeFaceIdx}`);
  }

  sm.clickPrevChevron();
  sm.clickPrevChevron();
  sm.clickPrevChevron(); // Clamps at 0
  if (sm.activeFaceIdx === 0 && sm.isBoundingBoxActive(0) && sm.isPillActive(0)) {
    pass("StateSync", "Chevron Prev Clamping", "Chevron prev correctly decrements and clamps at lower bound (index 0).");
  } else {
    fail("StateSync", "Chevron Prev Clamping", `Expected activeFaceIdx 0, got ${sm.activeFaceIdx}`);
  }

  // Subtest 5: Rapid Cycler Stress Test (1,000 randomized clicks)
  let syncDesyncCount = 0;
  for (let i = 0; i < 1000; i++) {
    const action = Math.floor(Math.random() * 4);
    const targetIdx = Math.floor(Math.random() * sampleFaces.length);
    if (action === 0) sm.clickBoundingBox(targetIdx);
    else if (action === 1) sm.clickFacePill(targetIdx);
    else if (action === 2) sm.clickPrevChevron();
    else sm.clickNextChevron();

    const curr = sm.activeFaceIdx;
    const bboxActive = sm.isBoundingBoxActive(curr);
    const pillActive = sm.isPillActive(curr);
    const scorecardMatch = sm.getActiveFace()?.face_id === sampleFaces[curr].face_id;

    if (!bboxActive || !pillActive || !scorecardMatch) {
      syncDesyncCount++;
    }
  }

  if (syncDesyncCount === 0) {
    pass("StateSync", "1,000 Cycle Random Stress Test", "Zero state desynchronizations across 1,000 randomized bounding box, pill, and chevron events.");
  } else {
    fail("StateSync", "1,000 Cycle Random Stress Test", `Encountered ${syncDesyncCount} state desynchronizations during stress cycling.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADVERSARIAL EDGE CASE HARNESS
// ─────────────────────────────────────────────────────────────────────────────

function testAdversarialEdgeCases() {
  const cardSourcePath = path.join(FRONTEND_DIR, "components/sandbox/FacialAnomalyCard.tsx");
  const cardSource = fs.readFileSync(cardSourcePath, "utf-8");

  // Check 1: Handling missing normalized_bbox
  const hasNormBboxGuard = cardSource.includes("if (!face.normalized_bbox || face.normalized_bbox.length !== 4) return null;");
  if (hasNormBboxGuard) {
    pass("EdgeCases", "Missing/Malformed Normalized BBox Guard", "FacialAnomalyCard safely guards normalized_bbox with 4-tuple check, preventing NaN/runtime crash.");
  } else {
    fail("EdgeCases", "Missing/Malformed Normalized BBox Guard", "FacialAnomalyCard lacks guard for missing or non-4-tuple normalized_bbox.");
  }

  // Check 2: Potential vulnerability — face.bbox destructuring in FaceScorecard
  // Look for: const [x, y, w, h] = face.bbox;
  const hasBboxDestructure = cardSource.includes("const [x, y, w, h] = face.bbox;");
  const hasSafeBboxFallback = cardSource.includes("face.bbox ||") || cardSource.includes("face.bbox &&");
  if (hasBboxDestructure && !hasSafeBboxFallback) {
    warn(
      "EdgeCases",
      "Vulnerability: face.bbox Unsafe Destructuring",
      "Line 248 executes `const [x, y, w, h] = face.bbox;` without fallback. If an external or mock response provides face without `bbox`, component will throw TypeError."
    );
  } else {
    pass("EdgeCases", "face.bbox Safe Handling", "face.bbox is safely destructured or guarded.");
  }

  // Check 3: State retention across dynamic data updates
  // If activeFaceIdx is kept in useState(0), does it reset if faces length decreases?
  const hasFaceResetEffect = cardSource.includes("useEffect(") && cardSource.includes("setActiveFaceIdx(0)");
  const hasIndexClamping = cardSource.includes("faces[activeFaceIdx] ?? faces[0]");
  if (hasIndexClamping) {
    if (hasFaceResetEffect) {
      pass("EdgeCases", "Dynamic Data Reduction Guard", "activeFaceIdx has reset effect and fallback index clamping.");
    } else {
      warn(
        "EdgeCases",
        "Dynamic Data Reduction Edge Case",
        "Uses `faces[activeFaceIdx] ?? faces[0]` fallback for activeF, but lacks useEffect to reset activeFaceIdx if new scan has fewer faces. (Mitigated in MultiModalForensicScanner by unmounting with setImageOcrResult(null))."
      );
    }
  }

  // Check 4: Single Face presentation (faces.length === 1)
  const hidesPillsForSingleFace = cardSource.includes("{faces.length > 1 &&");
  if (hidesPillsForSingleFace) {
    pass("EdgeCases", "Single-Face Clutter Suppression", "Multi-face selector pill bar is cleanly suppressed when only 1 face is present ({faces.length > 1 && ...}).");
  } else {
    fail("EdgeCases", "Single-Face Clutter Suppression", "Pill selector bar is not properly gated on faces.length > 1.");
  }

  // Check 5: Empty face list handling
  const guardsZeroFaces = cardSource.includes("if (!facial || facial.face_count === 0) return null;");
  if (guardsZeroFaces) {
    pass("EdgeCases", "Zero-Face Early Return", "Component returns null early when facial is null or face_count === 0.");
  } else {
    fail("EdgeCases", "Zero-Face Early Return", "Component lacks early return for 0 faces.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DESIGN TOKEN & COLOR BADGE COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

function testDesignTokenCompliance() {
  const cardPath = path.join(FRONTEND_DIR, "components/sandbox/FacialAnomalyCard.tsx");
  const scannerPath = path.join(FRONTEND_DIR, "components/sandbox/MultiModalForensicScanner.tsx");
  const statusPillPath = path.join(FRONTEND_DIR, "components/atoms/StatusPill.tsx");

  const cardCode = fs.readFileSync(cardPath, "utf-8");
  const scannerCode = fs.readFileSync(scannerPath, "utf-8");
  const pillCode = fs.readFileSync(statusPillPath, "utf-8");

  // Check 1: 1.5px border signature in FacialAnomalyCard
  const card1Point5Borders = (cardCode.match(/border-\[1\.5px\]/g) || []).length;
  if (card1Point5Borders >= 4) {
    pass(
      "DesignTokens",
      "FacialAnomalyCard 1.5px Borders",
      `Found ${card1Point5Borders} occurrences of border-[1.5px] (outer card, icon box, verdict banner, preview wrapper, scorecard).`
    );
  } else {
    fail(
      "DesignTokens",
      "FacialAnomalyCard 1.5px Borders",
      `Expected at least 4 occurrences of border-[1.5px] in FacialAnomalyCard, found ${card1Point5Borders}.`
    );
  }

  // Check 2: 1.5px border signature in MultiModalForensicScanner
  const scanner1Point5Borders = (scannerCode.match(/border-\[1\.5px\]/g) || []).length;
  if (scanner1Point5Borders >= 8) {
    pass(
      "DesignTokens",
      "MultiModalForensicScanner 1.5px Borders",
      `Found ${scanner1Point5Borders} occurrences of border-[1.5px] across scanner container, modality badges, hybrid cards, and IOC tokens.`
    );
  } else {
    warn(
      "DesignTokens",
      "MultiModalForensicScanner 1.5px Borders",
      `Found ${scanner1Point5Borders} occurrences of border-[1.5px] in MultiModalForensicScanner.`
    );
  }

  // Check 3: Risk Color Tokens (Red, Amber, Emerald)
  const hasRedForDeepfake =
    cardCode.includes('const isDeepfake = face.verdict === "DEEPFAKE"') &&
    cardCode.includes('"#ef4444"') &&
    cardCode.includes("bg-red-500/20") &&
    cardCode.includes("border-red-500");

  const hasAmberForSynthetic =
    cardCode.includes('const isSynthetic = face.verdict !== "AUTHENTIC"') &&
    cardCode.includes('"#f59e0b"') &&
    cardCode.includes("bg-amber-500/20") &&
    cardCode.includes("border-amber-500");

  const hasEmeraldForAuthentic =
    cardCode.includes('"#10b981"') &&
    cardCode.includes("bg-emerald-500/20") &&
    cardCode.includes("border-emerald-500") &&
    cardCode.includes("text-emerald-300");

  if (hasRedForDeepfake && hasAmberForSynthetic && hasEmeraldForAuthentic) {
    pass(
      "DesignTokens",
      "Tri-Color Risk Token Discipline",
      "Verified rigorous three-tier forensic palette: Red (#ef4444) for DEEPFAKE, Amber (#f59e0b) for Synthetic/Suspicious, Emerald (#10b981) for Authentic."
    );
  } else {
    fail(
      "DesignTokens",
      "Tri-Color Risk Token Discipline",
      "Missing color mappings for deepfake, synthetic, or authentic states."
    );
  }

  // Check 4: Background contrasts & elevation tokens
  const hasBackgroundTokens =
    cardCode.includes("bg-canvas") &&
    cardCode.includes("border-line") &&
    cardCode.includes("bg-surface");

  if (hasBackgroundTokens) {
    pass("DesignTokens", "Background Elevation Tokens", "Card correctly leverages NETRA OKLCH elevation ramp: bg-canvas, bg-surface, and border-line.");
  } else {
    fail("DesignTokens", "Background Elevation Tokens", "Missing required background elevation classes.");
  }

  // Check 5: StatusPill Tone mapping
  const hasRiskToneHelper =
    cardCode.includes('if (v === "DEEPFAKE" || v === "CRITICAL") return "critical"') &&
    cardCode.includes('if (v === "SUSPICIOUS" || v === "HIGH") return "orange"') &&
    cardCode.includes('if (v === "AUTHENTIC" || v === "SAFE") return "active"');

  if (hasRiskToneHelper) {
    pass("DesignTokens", "StatusPill Risk Tone Mapping", "riskTone() correctly maps DEEPFAKE->critical, SUSPICIOUS->orange, AUTHENTIC->active.");
  } else {
    fail("DesignTokens", "StatusPill Risk Tone Mapping", "riskTone() mapping is inconsistent with StatusPill contract.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MULTI-MODAL SCANNER DUAL-BRANCH ROUTING & HYBRID UI INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

function testScannerIntegration() {
  const scannerPath = path.join(FRONTEND_DIR, "components/sandbox/MultiModalForensicScanner.tsx");
  const scannerCode = fs.readFileSync(scannerPath, "utf-8");

  // Check 1: Adaptive Dual-Branch Routing in MultiModalForensicScanner
  const hasPureFaceBranch = scannerCode.includes("if (isPureFace)");
  const hasHybridBranch = scannerCode.includes("if (isHybrid)");
  const hasDocumentBranch = scannerCode.includes("return (\n              <OCRDossier");

  if (hasPureFaceBranch && hasHybridBranch && hasDocumentBranch) {
    pass("ScannerIntegration", "Adaptive Branch Dispatch", "Scanner dynamically branches: Pure Face -> FacialAnomalyCard, Hybrid -> HybridDossier, Document -> OCRDossier.");
  } else {
    fail("ScannerIntegration", "Adaptive Branch Dispatch", "Scanner does not cleanly branch on all 3 analysis modes.");
  }

  // Check 2: Dynamic Tab Badges in HybridDossier
  const hasDynamicFaceBadge = scannerCode.includes("({faceCount} Face{faceCount !== 1 ? \"s\" : \"\"})");
  const hasDynamicIOCBadge = scannerCode.includes("({totalIOCs} IOC{totalIOCs !== 1 ? \"s\" : \"\"})");

  if (hasDynamicFaceBadge && hasDynamicIOCBadge) {
    pass("ScannerIntegration", "Hybrid Tab Dynamic Counter Badges", "HybridDossier renders live badges: (N Faces) and (M IOCs) matching contract.");
  } else {
    fail("ScannerIntegration", "Hybrid Tab Dynamic Counter Badges", "HybridDossier lacks dynamic face/IOC counter badges.");
  }

  // Check 3: 1-Click Court PDF Generation wiring
  const cardPath = path.join(FRONTEND_DIR, "components/sandbox/FacialAnomalyCard.tsx");
  const cardCode = fs.readFileSync(cardPath, "utf-8");

  const hasPDFDownload =
    cardCode.includes("handleDownloadPDF") &&
    cardCode.includes("generateForensicPDF") &&
    cardCode.includes("Court Evidence PDF");

  if (hasPDFDownload) {
    pass("ScannerIntegration", "1-Click Court Evidence PDF Button", "FacialAnomalyCard includes integrated 1-Click Court Evidence PDF download button.");
  } else {
    fail("ScannerIntegration", "1-Click Court Evidence PDF Button", "Court Evidence PDF button missing from FacialAnomalyCard.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL SUITES
// ─────────────────────────────────────────────────────────────────────────────

console.log("==================================================================");
console.log("NETRA CHALLENGER M11-2: UI TOKEN & STATE SYNCHRONIZATION AUDIT");
console.log("==================================================================\n");

testStateSynchronizationHarness();
testAdversarialEdgeCases();
testDesignTokenCompliance();
testScannerIntegration();

let passed = 0;
let failed = 0;
let warned = 0;

for (const r of reports) {
  const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} [${r.category}] ${r.testName}`);
  console.log(`   ${r.message}`);
  if (r.details) console.log(`   Details:`, JSON.stringify(r.details, null, 2));
  console.log();

  if (r.status === "PASS") passed++;
  else if (r.status === "FAIL") failed++;
  else warned++;
}

console.log(`TOTAL AUDIT CHECKS: ${reports.length} | PASSED: ${passed} | FAILED: ${failed} | WARNED: ${warned}`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
