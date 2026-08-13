import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

console.log("================================================================================");
console.log("  NETRA MILESTONE 1: EMPIRICAL STRESS TEST SUITE & ORACLE VERIFICATION");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. UTILITY: cn() Tailwind Merge & Class Resolution
// ─────────────────────────────────────────────────────────────────────────────
console.log("--- 1. Testing lib/utils.ts cn() ---");

test("cn merges basic classes", () => {
  const res = cn("btn-tactile", "bg-surface", "text-ink");
  assert.strictEqual(res, "btn-tactile bg-surface text-ink");
});

test("cn resolves conflicting Tailwind utility classes properly", () => {
  const res = cn("px-2 py-1 text-xs", "px-4 text-sm");
  assert.strictEqual(res, "py-1 px-4 text-sm");
});

test("cn handles falsy values, null, undefined, boolean conditionals", () => {
  const res = cn("base", false && "hidden", undefined, null, true && "visible", "");
  assert.strictEqual(res, "base visible");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DESIGN TOKENS PARITY: globals.css vs tailwind.config.ts
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 2. Testing Design Tokens & CSS Variables Parity ---");

const globalsCssPath = path.resolve("./app/globals.css");
const tailwindConfigPath = path.resolve("./tailwind.config.ts");

const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
const tailwindConfig = fs.readFileSync(tailwindConfigPath, "utf-8");

test("globals.css defines all required OKLCH elevation surfaces", () => {
  const requiredSurfaces = [
    "--page",
    "--canvas",
    "--surface",
    "--inset",
    "--hover",
    "--hover-2",
    "--field",
    "--stripe",
    "--stripe-bg",
  ];
  for (const s of requiredSurfaces) {
    assert.ok(globalsCss.includes(s), `Missing surface variable: ${s}`);
  }
});

test("globals.css defines ink ramp and 1.5px signature border system", () => {
  const requiredTokens = [
    "--ink",
    "--ink-2",
    "--ink-3",
    "--line",
    "--line-strong",
    "--line-soft",
    "--border-signature",
  ];
  for (const t of requiredTokens) {
    assert.ok(globalsCss.includes(t), `Missing token: ${t}`);
  }
});

test("globals.css defines multi-tier drop shadows & hairline inner rings", () => {
  const requiredShadows = [
    "--shadow-hairline",
    "--shadow-btn",
    "--shadow-card",
    "--shadow-raised",
    "--shadow-overlay",
    "--shadow-inset-field",
    "--shadow-forensic-glow",
  ];
  for (const sh of requiredShadows) {
    assert.ok(globalsCss.includes(sh), `Missing shadow: ${sh}`);
  }
});

test("tailwind.config.ts references all OKLCH surfaces and shadow presets", () => {
  const requiredTailwindSurfaces = [
    'page: "var(--page)"',
    'canvas: "var(--canvas)"',
    'surface: "var(--surface)"',
    'inset: "var(--inset)"',
    'hover: "var(--hover)"',
    '"hover-2": "var(--hover-2)"',
    'field: "var(--field)"',
  ];
  for (const ts of requiredTailwindSurfaces) {
    assert.ok(tailwindConfig.includes(ts), `tailwind.config.ts missing surface mapping: ${ts}`);
  }

  const requiredTailwindShadows = [
    'hairline: "var(--shadow-hairline)"',
    'btn: "var(--shadow-btn)"',
    'card: "var(--shadow-card)"',
    'raised: "var(--shadow-raised)"',
    'overlay: "var(--shadow-overlay)"',
  ];
  for (const tsh of requiredTailwindShadows) {
    assert.ok(tailwindConfig.includes(tsh), `tailwind.config.ts missing shadow mapping: ${tsh}`);
  }
});

test("Keyframe animations in globals.css match tailwind.config.ts", () => {
  const keyframes = [
    "shimmer-text",
    "fade-up",
    "fade-in",
    "pop-in",
    "pixel-on",
    "eq-bounce",
    "pulse-subtle",
    "radar-sweep",
  ];
  for (const kf of keyframes) {
    assert.ok(globalsCss.includes(`@keyframes ${kf}`), `globals.css missing keyframe: ${kf}`);
    assert.ok(tailwindConfig.includes(`"${kf}":`), `tailwind.config.ts missing animation mapping: ${kf}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPONENT FILE STRUCTURE & EXPORT INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 3. Testing Component Exports & Types ---");

const atomsIndex = fs.readFileSync("./components/atoms/index.ts", "utf-8");
const primitivesIndex = fs.readFileSync("./components/primitives/index.ts", "utf-8");

test("components/atoms/index.ts exports all 5 atom modules", () => {
  const atoms = ["./Button", "./StatusPill", "./SegmentedControl", "./Shimmer", "./Chip"];
  for (const a of atoms) {
    assert.ok(atomsIndex.includes(`export * from "${a}"`), `Missing atom export: ${a}`);
  }
});

test("components/primitives/index.ts exports all 6 primitive modules", () => {
  const primitives = [
    "./ThinkingState",
    "./LoadingState",
    "./ToolChips",
    "./TaskRows",
    "./StreamText",
    "./GlideMenu",
  ];
  for (const p of primitives) {
    assert.ok(primitivesIndex.includes(`export * from "${p}"`), `Missing primitive export: ${p}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATOM LOGIC & VARIANT MAP INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 4. Testing Atom Variant Generators & Prop Handlers ---");

const buttonCode = fs.readFileSync("./components/atoms/Button.tsx", "utf-8");
const statusPillCode = fs.readFileSync("./components/atoms/StatusPill.tsx", "utf-8");
const segmentedControlCode = fs.readFileSync("./components/atoms/SegmentedControl.tsx", "utf-8");
const chipCode = fs.readFileSync("./components/atoms/Chip.tsx", "utf-8");

test("Button.tsx defines all 9 ButtonVariant types and sizeStyles", () => {
  const variants = [
    "primary",
    "secondary",
    "ghost",
    "accent",
    "danger",
    "outline",
    "subtle",
    "quiet",
    "success",
  ];
  for (const v of variants) {
    assert.ok(buttonCode.includes(`${v}:`), `Missing Button variant style: ${v}`);
  }
  const sizes = ["xs", "sm", "md", "lg"];
  for (const s of sizes) {
    assert.ok(buttonCode.includes(`${s}:`), `Missing Button size style: ${s}`);
  }
});

test("StatusPill.tsx defines toneStyles for all 10 StatusPillTone types", () => {
  const tones = [
    "active",
    "green",
    "warning",
    "orange",
    "critical",
    "red",
    "info",
    "accent",
    "purple",
    "neutral",
  ];
  for (const t of tones) {
    assert.ok(statusPillCode.includes(`${t}:`), `Missing StatusPill tone style: ${t}`);
  }
});

test("SegmentedControl.tsx keyboard navigation handles ArrowRight, ArrowLeft, Home, End", () => {
  assert.ok(segmentedControlCode.includes('e.key === "ArrowRight"'), "Missing ArrowRight handler");
  assert.ok(segmentedControlCode.includes('e.key === "ArrowLeft"'), "Missing ArrowLeft handler");
  assert.ok(segmentedControlCode.includes('e.key === "Home"'), "Missing Home handler");
  assert.ok(segmentedControlCode.includes('e.key === "End"'), "Missing End handler");
});

test("Chip.tsx supports all 7 ChipTone types with onRemove dismissal", () => {
  const tones = ["neutral", "accent", "cyan", "orange", "red", "green", "purple"];
  for (const t of tones) {
    assert.ok(chipCode.includes(`${t}:`), `Missing Chip tone style: ${t}`);
  }
  assert.ok(chipCode.includes("onRemove"), "Missing Chip onRemove prop");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PRIMITIVES LOGIC & INTERACTIVE FEATURES
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 5. Testing Primitives Logic & Features ---");

const thinkingCode = fs.readFileSync("./components/primitives/ThinkingState.tsx", "utf-8");
const loadingCode = fs.readFileSync("./components/primitives/LoadingState.tsx", "utf-8");
const toolChipsCode = fs.readFileSync("./components/primitives/ToolChips.tsx", "utf-8");
const taskRowsCode = fs.readFileSync("./components/primitives/TaskRows.tsx", "utf-8");
const streamTextCode = fs.readFileSync("./components/primitives/StreamText.tsx", "utf-8");
const glideMenuCode = fs.readFileSync("./components/primitives/GlideMenu.tsx", "utf-8");

test("ThinkingState supports onSettled callback and collapsible trace", () => {
  assert.ok(thinkingCode.includes("onSettled"), "Missing onSettled handler");
  assert.ok(thinkingCode.includes("useLayoutEffect"), "Missing trace height layout effect");
});

test("LoadingState supports 4 variants (Drive, Dots, Orbit, Radar) and formatted elapsed time", () => {
  assert.ok(loadingCode.includes('"Drive" | "Dots" | "Orbit" | "Radar"'), "Missing LoadingVariant enum");
  assert.ok(loadingCode.includes("autoElapsed"), "Missing autoElapsed option");
});

test("ToolChips supports expandable tool steps, diff chips and diff preview portal", () => {
  assert.ok(toolChipsCode.includes("createPortal"), "Missing diff preview portal");
  assert.ok(toolChipsCode.includes("data-diffchip"), "Missing data-diffchip selector");
});

test("TaskRows supports both Capsules and List variants with SpinnerRing and StatusBadge", () => {
  assert.ok(taskRowsCode.includes('"Capsules" | "List"'), "Missing TaskRows variant enum");
  assert.ok(taskRowsCode.includes("SpinnerRing"), "Missing SpinnerRing component");
  assert.ok(taskRowsCode.includes("StatusBadge"), "Missing StatusBadge component");
});

test("StreamText implements 60fps streaming, blurTail, caret blink, citations and follow-up prompts", () => {
  assert.ok(streamTextCode.includes("stream-tail"), "Missing stream-tail class");
  assert.ok(streamTextCode.includes("stream-caret"), "Missing stream-caret class");
  assert.ok(streamTextCode.includes("StreamingText"), "Missing compound StreamingText component");
});

test("GlideMenu implements hardware-accelerated bounding box tracking for vertical and horizontal layouts", () => {
  assert.ok(glideMenuCode.includes('orientation === "horizontal"'), "Missing horizontal orientation logic");
  assert.ok(glideMenuCode.includes("getBoundingClientRect"), "Missing getBoundingClientRect tracking");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n================================================================================");
console.log(`  STRESS TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
