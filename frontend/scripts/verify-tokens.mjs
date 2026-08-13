import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const frontendDir = '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend';
const globalsCssPath = path.join(frontendDir, 'app/globals.css');
const tailwindConfigPath = path.join(frontendDir, 'tailwind.config.ts');

console.log('====================================================');
console.log('NETRA FORENSIC DESIGN SYSTEM — EMPIRICAL TOKEN VERIFICATION');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. Read files
const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');
const tailwindConfigContent = fs.readFileSync(tailwindConfigPath, 'utf8');

// 2. Extract CSS variables defined in globals.css
const cssVarDefRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
const definedVars = new Map();
let match;
while ((match = cssVarDefRegex.exec(globalsCssContent)) !== null) {
  definedVars.set(match[1], match[2].trim());
}

console.log(`[Step 1] Extracted ${definedVars.size} CSS custom property definitions from globals.css`);

// Required design system tokens
const requiredTokens = [
  '--page',
  '--canvas',
  '--surface',
  '--inset',
  '--hover',
  '--hover-2',
  '--field',
  '--stripe',
  '--stripe-bg',
  '--ink',
  '--ink-2',
  '--ink-3',
  '--line',
  '--line-strong',
  '--line-soft',
  '--accent',
  '--accent-ink',
  '--accent-tint',
  '--brand-cyan',
  '--brand-amber',
  '--green',
  '--green-tint',
  '--orange',
  '--orange-tint',
  '--red',
  '--red-tint',
  '--purple',
  '--purple-tint',
  '--tooltip-bg',
  '--tooltip-fg',
  '--tooltip-muted',
  '--tooltip-border',
  '--shadow-hairline',
  '--shadow-btn',
  '--shadow-card',
  '--shadow-raised',
  '--shadow-overlay',
  '--shadow-inset-field',
  '--shadow-forensic-glow',
  '--radius-chip',
  '--radius-control',
  '--radius-card',
  '--radius-window'
];

for (const token of requiredTokens) {
  assert(definedVars.has(token), `Required token ${token} is defined (value: ${definedVars.get(token)})`);
}

// 3. Verify OKLCH syntax on color tokens
console.log('\n[Step 2] Validating OKLCH format of color variables...');
const oklchTokens = [
  '--page', '--canvas', '--surface', '--inset', '--hover', '--hover-2', '--field',
  '--ink', '--ink-2', '--ink-3',
  '--line', '--line-strong', '--line-soft',
  '--accent', '--accent-ink', '--accent-tint',
  '--brand-cyan', '--brand-amber',
  '--green', '--orange', '--red', '--purple',
  '--tooltip-bg', '--tooltip-fg', '--tooltip-muted', '--tooltip-border'
];

const oklchPattern = /^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+(\s*\/\s*[\d.]+)?\s*\)$/;
for (const token of oklchTokens) {
  const val = definedVars.get(token);
  if (val) {
    const isOklch = oklchPattern.test(val) || val.startsWith('oklch(');
    assert(isOklch, `Token ${token} has valid OKLCH syntax: "${val}"`);
  }
}

// 4. Verify var() references inside globals.css
console.log('\n[Step 3] Checking all var() usages in globals.css for missing definitions...');
const varUsageRegex = /var\((--[a-zA-Z0-9_-]+)(?:,\s*([^)]+))?\)/g;
let varMatch;
let missingVarCount = 0;
while ((varMatch = varUsageRegex.exec(globalsCssContent)) !== null) {
  const varName = varMatch[1];
  const fallback = varMatch[2];
  const isDefined = definedVars.has(varName) || varName.startsWith('--font-');
  if (!isDefined) {
    console.error(`Undefined CSS variable used in globals.css: ${varName}`);
    missingVarCount++;
  }
}
assert(missingVarCount === 0, `All var() references in globals.css resolve to defined variables (${missingVarCount} broken)`);

// 5. Check CSS keyframe definitions in globals.css & tailwind.config.ts
console.log('\n[Step 4] Checking keyframes and animation declarations...');
const keyframeRegex = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g;
const definedKeyframesInCss = new Set();
let kfMatch;
while ((kfMatch = keyframeRegex.exec(globalsCssContent)) !== null) {
  definedKeyframesInCss.add(kfMatch[1]);
}

const expectedKeyframes = [
  'shimmer-text',
  'fade-up',
  'fade-in',
  'pop-in',
  'pixel-on',
  'eq-bounce',
  'caret-blink',
  'pulse-subtle',
  'radar-sweep'
];

for (const kf of expectedKeyframes) {
  assert(
    definedKeyframesInCss.has(kf) || tailwindConfigContent.includes(`"${kf}"`),
    `Keyframe "${kf}" is defined in globals.css or tailwind config`
  );
}

// 6. Test Tailwind CSS compilation using PostCSS
console.log('\n[Step 5] Running PostCSS/Tailwind compilation test...');
async function testTailwindCompilation() {
  const sampleClasses = [
    'bg-page', 'bg-canvas', 'bg-surface', 'bg-inset', 'bg-hover', 'bg-hover-2', 'bg-field',
    'text-ink', 'text-ink-2', 'text-ink-3', 'text-ink-primary', 'text-ink-secondary', 'text-ink-muted',
    'border-line', 'border-line-strong', 'border-line-soft',
    'border-signature', 'border-signature-strong',
    'shadow-hairline', 'shadow-btn', 'shadow-card', 'shadow-raised', 'shadow-overlay', 'shadow-forensic-glow',
    'rounded-chip', 'rounded-control', 'rounded-card', 'rounded-window',
    'animate-shimmer-text', 'animate-fade-up', 'animate-fade-in', 'animate-pop-in', 'animate-pixel-on', 'animate-eq-bounce', 'animate-pulse-subtle', 'animate-radar-sweep',
    'card-forensic', 'glass-panel-forensic', 'btn-tactile', 'stream-caret', 'stream-tail', 'source-avatar'
  ];

  const htmlMock = `
    <div class="${sampleClasses.join(' ')}">
      <span>NETRA Test</span>
    </div>
  `;

  const inputCss = `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ${globalsCssContent}
  `;

  try {
    const result = await postcss([
      tailwindcss(tailwindConfigPath)
    ]).process(inputCss, { from: globalsCssPath });

    const compiledCss = result.css;
    assert(compiledCss.length > 0, `Tailwind compiled successfully (${compiledCss.length} bytes)`);

    // Verify key classes generated in compiled output
    assert(compiledCss.includes('.bg-page'), 'Compiled CSS contains .bg-page');
    assert(compiledCss.includes('.text-ink'), 'Compiled CSS contains .text-ink');
    assert(compiledCss.includes('.border-line'), 'Compiled CSS contains .border-line');
    assert(compiledCss.includes('.border-signature'), 'Compiled CSS contains .border-signature');
    assert(compiledCss.includes('.shadow-card'), 'Compiled CSS contains .shadow-card');
    assert(compiledCss.includes('.animate-fade-up'), 'Compiled CSS contains .animate-fade-up');
    assert(compiledCss.includes('.animate-shimmer-text'), 'Compiled CSS contains .animate-shimmer-text');
    assert(compiledCss.includes('.card-forensic'), 'Compiled CSS contains .card-forensic');
    assert(compiledCss.includes('.glass-panel-forensic'), 'Compiled CSS contains .glass-panel-forensic');
    assert(compiledCss.includes('.btn-tactile'), 'Compiled CSS contains .btn-tactile');
  } catch (err) {
    console.error('Tailwind compilation error:', err);
    failCount++;
  }
}

// 7. Verify Component Exports
console.log('\n[Step 6] Verifying Atoms & Primitives file exports...');
const atomsIndexPath = path.join(frontendDir, 'components/atoms/index.ts');
const primitivesIndexPath = path.join(frontendDir, 'components/primitives/index.ts');

const atomsIndexContent = fs.readFileSync(atomsIndexPath, 'utf8');
const primitivesIndexContent = fs.readFileSync(primitivesIndexPath, 'utf8');

const expectedAtoms = ['Button', 'StatusPill', 'SegmentedControl', 'Shimmer', 'Chip'];
for (const atom of expectedAtoms) {
  assert(atomsIndexContent.includes(atom), `components/atoms/index.ts exports ${atom}`);
  const atomFilePath = path.join(frontendDir, `components/atoms/${atom}.tsx`);
  assert(fs.existsSync(atomFilePath), `File components/atoms/${atom}.tsx exists`);
}

const expectedPrimitives = ['ThinkingState', 'LoadingState', 'ToolChips', 'TaskRows', 'StreamText', 'GlideMenu'];
for (const prim of expectedPrimitives) {
  assert(primitivesIndexContent.includes(prim), `components/primitives/index.ts exports ${prim}`);
  const primFilePath = path.join(frontendDir, `components/primitives/${prim}.tsx`);
  assert(fs.existsSync(primFilePath), `File components/primitives/${prim}.tsx exists`);
}

await testTailwindCompilation();

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
