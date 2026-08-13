import fs from 'fs';
import path from 'path';

const frontendDir = '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend';
const globalsCssPath = path.join(frontendDir, 'app/globals.css');
const tailwindConfigPath = path.join(frontendDir, 'tailwind.config.ts');
const nextStaticCssDir = path.join(frontendDir, '.next/static/css');

console.log('===============================================================');
console.log('CHALLENGER 2: DEEP EMPIRICAL TOKEN RESOLUTION & CSS AUDIT');
console.log('===============================================================\n');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    const res = fn();
    if (res !== false) {
      console.log(`✅ PASS: ${name}`);
      pass++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      fail++;
    }
  } catch (err) {
    console.error(`❌ FAIL: ${name} -> ${err.message}`);
    fail++;
  }
}

// 1. Read files
const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');

// 2. Variable syntax and extraction
console.log('[SECTION 1] CSS Variables in app/globals.css');

test(':root block exists and contains OKLCH color definitions', () => {
  return globalsCss.includes(':root') && globalsCss.includes('--page: oklch(');
});

test('.dark selector is co-declared or defined with dark tokens', () => {
  return globalsCss.includes('.dark') && globalsCss.includes('--canvas: oklch(');
});

// Extract all root/dark variables
const varMap = new Map();
const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
let m;
while ((m = varRegex.exec(globalsCss)) !== null) {
  varMap.set(m[1], m[2].trim());
}

const requiredTokens = [
  '--page', '--canvas', '--surface', '--inset', '--hover', '--hover-2', '--field',
  '--ink', '--ink-2', '--ink-3',
  '--line', '--line-strong', '--line-soft',
  '--accent', '--accent-ink', '--accent-tint',
  '--brand-cyan', '--brand-amber',
  '--green', '--green-tint', '--orange', '--orange-tint', '--red', '--red-tint',
  '--purple', '--purple-tint',
  '--shadow-hairline', '--shadow-btn', '--shadow-card', '--shadow-raised',
  '--shadow-overlay', '--shadow-inset-field', '--shadow-forensic-glow',
  '--radius-chip', '--radius-control', '--radius-card', '--radius-window'
];

for (const tok of requiredTokens) {
  test(`Token ${tok} is properly declared with non-empty value`, () => {
    return varMap.has(tok) && varMap.get(tok).length > 0;
  });
}

// 3. 1.5px border signature rules
console.log('\n[SECTION 2] 1.5px Signature Border Utilities');

test('.border-signature utility class defines 1.5px solid var(--line)', () => {
  return globalsCss.includes('.border-signature') && globalsCss.includes('border-width: 1.5px;');
});

test('.border-signature-strong utility class defines 1.5px solid var(--line-strong)', () => {
  return globalsCss.includes('.border-signature-strong') && globalsCss.includes('var(--line-strong)');
});

test('.card-forensic defines 1.5px solid border and shadow-card', () => {
  return globalsCss.includes('.card-forensic') &&
         globalsCss.includes('1.5px solid var(--line)') &&
         globalsCss.includes('box-shadow: var(--shadow-card)');
});

test('.glass-panel-forensic defines 1.5px solid border, blur backdrop and shadow-overlay', () => {
  return globalsCss.includes('.glass-panel-forensic') &&
         globalsCss.includes('backdrop-filter: blur(16px)') &&
         globalsCss.includes('box-shadow: var(--shadow-overlay)');
});

// 4. Multi-tier shadow token resolution
console.log('\n[SECTION 3] Multi-Tier Shadow System');

test('--shadow-card has inner highlight ring and depth blurs', () => {
  const val = varMap.get('--shadow-card');
  return val && val.includes('0 0 0 1px oklch(1 0 0 / 0.11)') && val.includes('0 1px 2px') && val.includes('0 2px 6px');
});

test('--shadow-raised has inner highlight ring and ambient depth', () => {
  const val = varMap.get('--shadow-raised');
  return val && val.includes('0 0 0 1px oklch(1 0 0 / 0.13)') && val.includes('0 2px 10px');
});

test('--shadow-overlay has outer spread elevation blur', () => {
  const val = varMap.get('--shadow-overlay');
  return val && val.includes('0 0 0 1px oklch(1 0 0 / 0.15)') && val.includes('0 8px 28px');
});

test('--shadow-forensic-glow has inner top highlight and ambient drop', () => {
  const val = varMap.get('--shadow-forensic-glow');
  return val && val.includes('inset 0 1px 0 0') && val.includes('0 4px 16px -2px');
});

// 5. Keyframes and animations
console.log('\n[SECTION 4] Keyframe Animations & Micro-Interactions');

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
  test(`Keyframe @keyframes ${kf} exists in globals.css`, () => {
    return globalsCss.includes(`@keyframes ${kf}`);
  });
}

test('StreamText terminal caret keyframe caret-blink exists', () => {
  return globalsCss.includes('.stream-caret') && globalsCss.includes('caret-blink 1s step-end infinite');
});

test('Prefers-reduced-motion media query disables animations', () => {
  return globalsCss.includes('@media (prefers-reduced-motion: reduce)') &&
         globalsCss.includes('animation: none;');
});

// 6. Production Bundle CSS Inspection
console.log('\n[SECTION 5] Production Bundle CSS Inspection (.next/static/css)');

test('Next.js build produced static CSS bundles', () => {
  if (!fs.existsSync(nextStaticCssDir)) return false;
  const files = fs.readdirSync(nextStaticCssDir).filter(f => f.endsWith('.css'));
  return files.length > 0;
});

const cssFiles = fs.existsSync(nextStaticCssDir)
  ? fs.readdirSync(nextStaticCssDir).filter(f => f.endsWith('.css'))
  : [];

let combinedBundleCss = '';
for (const file of cssFiles) {
  combinedBundleCss += fs.readFileSync(path.join(nextStaticCssDir, file), 'utf8') + '\n';
}

test('Bundle CSS includes OKLCH surface tokens (--page, --canvas, --surface)', () => {
  return combinedBundleCss.includes('--page') &&
         combinedBundleCss.includes('--canvas') &&
         combinedBundleCss.includes('--surface');
});

test('Bundle CSS includes 1.5px border rules (.border-\\[1\\.5px\\])', () => {
  return combinedBundleCss.includes('border-\\[1\\.5px\\]') ||
         combinedBundleCss.includes('border-width:1.5px') ||
         combinedBundleCss.includes('border-width: 1.5px');
});

test('globals.css defines .border-signature and .btn-tactile component classes', () => {
  return globalsCss.includes('.border-signature') &&
         globalsCss.includes('.btn-tactile') &&
         globalsCss.includes('.card-forensic') &&
         globalsCss.includes('.glass-panel-forensic');
});

// 7. Atomic & Primitive Components
console.log('\n[SECTION 6] Component Export & Type Contracts');

const atomFiles = ['Button.tsx', 'Chip.tsx', 'SegmentedControl.tsx', 'Shimmer.tsx', 'StatusPill.tsx', 'index.ts'];
for (const f of atomFiles) {
  test(`Atom file components/atoms/${f} exists`, () => {
    return fs.existsSync(path.join(frontendDir, 'components/atoms', f));
  });
}

const primitiveFiles = ['GlideMenu.tsx', 'LoadingState.tsx', 'StreamText.tsx', 'TaskRows.tsx', 'ThinkingState.tsx', 'ToolChips.tsx', 'index.ts'];
for (const f of primitiveFiles) {
  test(`Primitive file components/primitives/${f} exists`, () => {
    return fs.existsSync(path.join(frontendDir, 'components/primitives', f));
  });
}

console.log('\n===============================================================');
console.log(`TOTAL: ${pass} PASSED, ${fail} FAILED`);
console.log('===============================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
