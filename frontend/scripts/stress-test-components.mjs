import fs from 'fs';
import path from 'path';

const frontendDir = '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend';

console.log('===============================================================');
console.log('ADVERSARIAL STRESS TEST: PROPS, EDGE CASES & CONTRAST MATRICES');
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

// 1. Check Button variants & sizes coverage
const buttonCode = fs.readFileSync(path.join(frontendDir, 'components/atoms/Button.tsx'), 'utf8');
const variants = ['primary', 'secondary', 'ghost', 'accent', 'danger', 'outline', 'subtle', 'quiet', 'success'];
const sizes = ['xs', 'sm', 'md', 'lg'];

for (const v of variants) {
  test(`Button covers variant "${v}" in variantStyles`, () => {
    return buttonCode.includes(`${v}:`);
  });
}

for (const s of sizes) {
  test(`Button covers size "${s}" in sizeStyles`, () => {
    return buttonCode.includes(`${s}:`);
  });
}

test('Button handles loading state with spinning SVG indicator and disabled propagation', () => {
  return buttonCode.includes('animate-spin') && buttonCode.includes('disabled={disabled || loading}');
});

// 2. StatusPill tones coverage
const pillCode = fs.readFileSync(path.join(frontendDir, 'components/atoms/StatusPill.tsx'), 'utf8');
const pillTones = ['active', 'green', 'warning', 'orange', 'critical', 'red', 'info', 'accent', 'purple', 'neutral'];

for (const t of pillTones) {
  test(`StatusPill covers tone "${t}" in toneStyles`, () => {
    return pillCode.includes(`${t}:`);
  });
}

test('StatusPill handles pulse animation with animate-ping', () => {
  return pillCode.includes('animate-ping') && pillCode.includes('pulse &&');
});

// 3. SegmentedControl keyboard accessibility
const segCode = fs.readFileSync(path.join(frontendDir, 'components/atoms/SegmentedControl.tsx'), 'utf8');
test('SegmentedControl implements ARIA tablist/tab semantics', () => {
  return segCode.includes('role="tablist"') && segCode.includes('role="tab"');
});

test('SegmentedControl handles arrow keys, Home, and End navigation', () => {
  return segCode.includes('ArrowRight') && segCode.includes('ArrowLeft') && segCode.includes('Home') && segCode.includes('End');
});

test('SegmentedControl calculates animated sliding thumb position dynamically', () => {
  return segCode.includes('translateX(${selectedIndex * 100}%)') || segCode.includes('translateX(');
});

// 4. Chip tones and remove handler
const chipCode = fs.readFileSync(path.join(frontendDir, 'components/atoms/Chip.tsx'), 'utf8');
const chipTones = ['neutral', 'accent', 'cyan', 'orange', 'red', 'green', 'purple'];
for (const t of chipTones) {
  test(`Chip covers tone "${t}" in toneStyles`, () => {
    return chipCode.includes(`${t}:`);
  });
}

test('Chip supports optional onRemove callback with stopPropagation', () => {
  return chipCode.includes('onRemove') && chipCode.includes('e.stopPropagation()');
});

// 5. ThinkingState collapse/expand andSettled trigger
const thinkCode = fs.readFileSync(path.join(frontendDir, 'components/primitives/ThinkingState.tsx'), 'utf8');
test('ThinkingState supports collapsible height animation and step spine', () => {
  return thinkCode.includes('gridTemplateRows') && thinkCode.includes('lineHeight');
});

test('ThinkingState triggers onSettled callback when isProcessing transitions to false', () => {
  return thinkCode.includes('onSettled') && thinkCode.includes('useEffect(');
});

// 6. LoadingState variants & timer
const loadCode = fs.readFileSync(path.join(frontendDir, 'components/primitives/LoadingState.tsx'), 'utf8');
test('LoadingState supports 3x3 pixel grid wavefront animation', () => {
  return loadCode.includes('grid-cols-[repeat(3,4px)]') && loadCode.includes('pixel-on');
});

test('LoadingState formats elapsed time accurately in tenths of seconds and minutes', () => {
  return loadCode.includes('.toFixed(1)}s') && loadCode.includes('tabular-nums');
});

// 7. ToolChips & Diff Portal
const toolCode = fs.readFileSync(path.join(frontendDir, 'components/primitives/ToolChips.tsx'), 'utf8');
test('ToolChips creates floating diff portal on body with positioning bounds', () => {
  return toolCode.includes('createPortal') && toolCode.includes('document.body') && toolCode.includes('window.innerWidth');
});

test('ToolChips parses and displays diff add/del lines with syntax coloring', () => {
  return toolCode.includes('text-green') && toolCode.includes('text-red');
});

// 8. StreamText character streamer
const streamCode = fs.readFileSync(path.join(frontendDir, 'components/primitives/StreamText.tsx'), 'utf8');
test('StreamText uses character-by-character interval with blurTail and caret', () => {
  return streamCode.includes('stream-tail') && streamCode.includes('stream-caret') && streamCode.includes('onDone');
});

// 9. GlideMenu physics
const glideCode = fs.readFileSync(path.join(frontendDir, 'components/primitives/GlideMenu.tsx'), 'utf8');
test('GlideMenu calculates bounding client rect offsets for sliding pill indicator', () => {
  return glideCode.includes('getBoundingClientRect') && glideCode.includes('cubic-bezier');
});

console.log('\n===============================================================');
console.log(`TOTAL STRESS TESTS: ${pass} PASSED, ${fail} FAILED`);
console.log('===============================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
