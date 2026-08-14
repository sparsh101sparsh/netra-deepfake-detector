import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { transform } = require('sucrase');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const clean = (html) => html.replace(/<!--.*?-->/g, '');

const FRONTEND_ROOT = path.resolve(__dirname, '..');

// Register custom module loader for TypeScript/TSX and @/ alias
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const subPath = request.slice(2);
    const resolvedPath = path.join(FRONTEND_ROOT, subPath);
    return originalResolveFilename.call(this, resolvedPath, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Hook require for .ts and .tsx files
require.extensions['.ts'] = function (module, filename) {
  if (filename.includes('pdfReportGenerator')) {
    // Mock pdfReportGenerator to prevent loading jsPDF in node
    module.exports = {
      generateForensicPDF: async () => ({ success: true })
    };
    return;
  }
  const content = fs.readFileSync(filename, 'utf8');
  const { code } = transform(content, {
    transforms: ['typescript', 'imports'],
    jsxRuntime: 'classic'
  });
  module._compile(code, filename);
};

require.extensions['.tsx'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const { code } = transform(content, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'classic'
  });
  module._compile(code, filename);
};

// Now import target components
const { FacialAnomalyCard } = require(path.join(FRONTEND_ROOT, 'components/sandbox/FacialAnomalyCard.tsx'));
const { OCRDossier } = require(path.join(FRONTEND_ROOT, 'components/sandbox/OCRDossier.tsx'));

console.log('================================================================================');
console.log('  EMPIRICAL CHALLENGER M11-1: ADVERSARIAL EDGE CASE STRESS TEST HARNESS');
console.log('================================================================================\n');

let passed = 0;
let failed = 0;
const results = [];

function assertTest(name, fn) {
  try {
    const res = fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
    results.push({ name, status: 'PASS', details: res });
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
    results.push({ name, status: 'FAIL', error: err.message, stack: err.stack });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: FacialAnomalyCard — Face Count Edge Cases (0, 1, Many)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- SUITE 1: FacialAnomalyCard Face Count Edge Cases ---');

assertTest('1.1 Zero Faces: facial_analysis has face_count === 0 (clean early return null)', () => {
  const payload = {
    analysis_mode: 'pure_face',
    facial_analysis: {
      face_count: 0,
      max_fake_probability: 0,
      composite_face_verdict: 'NO_FACES_DETECTED',
      faces: []
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (html !== '') throw new Error(`Expected empty render for 0 faces, got: ${html}`);
  return 'Clean null render';
});

assertTest('1.2 Undefined facial_analysis payload (clean early return null)', () => {
  const payload = {
    analysis_mode: 'document'
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (html !== '') throw new Error(`Expected empty render for undefined facial_analysis, got: ${html}`);
  return 'Clean null render';
});

assertTest('1.3 Null facial_analysis payload (clean early return null)', () => {
  const payload = {
    analysis_mode: 'document',
    facial_analysis: null
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (html !== '') throw new Error(`Expected empty render for null facial_analysis, got: ${html}`);
  return 'Clean null render';
});

assertTest('1.4 Single Face: Authentic (verify selector pills suppressed and score rendered)', () => {
  const payload = {
    analysis_mode: 'pure_face',
    scan_id: 'SCAN-AUTH-001',
    facial_analysis: {
      face_count: 1,
      max_fake_probability: 0.08,
      composite_face_verdict: 'AUTHENTIC',
      highest_risk_face_id: 'face_1',
      annotated_preview_url: '/media/test.jpg',
      faces: [
        {
          face_id: 'face_1',
          bbox: [100, 120, 80, 80],
          normalized_bbox: [0.1, 0.12, 0.08, 0.08],
          fake_probability: 0.08,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: [],
          neural_metrics: {
            sbi_artifact_level: 0.05,
            ocular_reflection_symmetry: 0.95
          }
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (!clean(html).includes('AUTHENTIC')) throw new Error('Rendered HTML missing AUTHENTIC verdict');
  if (clean(html).includes('Detected Subjects (')) throw new Error('Multi-face selector pills should not be rendered for single face');
  return `Render length: ${html.length} chars`;
});

assertTest('1.5 Single Face: Critical Deepfake (verify DEEPFAKE badge, amber/red risk, and neural gauges)', () => {
  const payload = {
    analysis_mode: 'pure_face',
    scan_id: 'SCAN-DF-001',
    composite_verdict: 'CRITICAL FACIAL DEEPFAKE DETECTED',
    recommendation: 'Do not trust visual claims.',
    facial_analysis: {
      face_count: 1,
      max_fake_probability: 0.96,
      composite_face_verdict: 'DEEPFAKE',
      highest_risk_face_id: 'face_1',
      annotated_preview_url: '/media/df.jpg',
      faces: [
        {
          face_id: 'face_1',
          bbox: [150, 180, 90, 95],
          normalized_bbox: [0.15, 0.18, 0.09, 0.095],
          fake_probability: 0.96,
          verdict: 'DEEPFAKE',
          risk_level: 'CRITICAL',
          flags: ['SBI_BLENDING_ARTIFACT', 'ASYMMETRIC_OCULAR_REFLECTION'],
          evidence_code: 'EVD-SBI-096',
          anomaly_region: 'Ocular / Sclera Zone',
          neural_metrics: {
            sbi_artifact_level: 0.92,
            ocular_reflection_symmetry: 0.15,
            eyewear_specular_score: 84.5,
            lip_sync_laplacian_score: 72.0
          }
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (!clean(html).includes('CRITICAL FACIAL DEEPFAKE DETECTED')) throw new Error('Missing composite verdict in HTML');
  if (!clean(html).includes('96% SYNTHETIC')) throw new Error('Missing 96% SYNTHETIC badge');
  if (!clean(html).includes('SBI Artifact Level')) throw new Error('Missing SBI metric gauge');
  return `Render length: ${html.length} chars`;
});

assertTest('1.6 Many Faces: 20 detected faces with mixed verdicts (stress DOM rendering & selector pills)', () => {
  const faces = Array.from({ length: 20 }, (_, i) => ({
    face_id: `face_${i + 1}`,
    bbox: [50 + i * 20, 100, 60, 60],
    normalized_bbox: [0.05 + i * 0.04, 0.1, 0.05, 0.05],
    fake_probability: i % 3 === 0 ? 0.92 : i % 3 === 1 ? 0.55 : 0.05,
    verdict: i % 3 === 0 ? 'DEEPFAKE' : i % 3 === 1 ? 'SUSPICIOUS' : 'AUTHENTIC',
    risk_level: i % 3 === 0 ? 'CRITICAL' : i % 3 === 1 ? 'HIGH' : 'SAFE',
    flags: i % 3 === 0 ? ['HIGH_ANOMALY'] : []
  }));

  const payload = {
    analysis_mode: 'pure_face',
    scan_id: 'SCAN-MANY-020',
    facial_analysis: {
      face_count: 20,
      max_fake_probability: 0.92,
      composite_face_verdict: 'DEEPFAKE',
      highest_risk_face_id: 'face_1',
      annotated_preview_url: '/media/group.jpg',
      faces
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (!clean(html).includes('Detected Subjects (20 Faces)')) throw new Error('Missing 20 faces header');
  for (let i = 1; i <= 20; i++) {
    if (!clean(html).includes(`Face #${i}`)) throw new Error(`Missing Face #${i} selector pill`);
  }
  return 'Rendered 20 faces flawlessly';
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: FacialAnomalyCard — Bounding Box & Coordinates Robustness
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 2: FacialAnomalyCard Bounding Box & Coordinate Edge Cases ---');

assertTest('2.1 Missing or non-array normalized_bbox (should skip overlay without error)', () => {
  const payload = {
    facial_analysis: {
      face_count: 3,
      max_fake_probability: 0.85,
      composite_face_verdict: 'DEEPFAKE',
      annotated_preview_url: '/media/test.jpg',
      faces: [
        {
          face_id: 'f1',
          bbox: [10, 10, 50, 50],
          normalized_bbox: undefined, // Missing
          fake_probability: 0.85,
          verdict: 'DEEPFAKE',
          risk_level: 'CRITICAL',
          flags: []
        },
        {
          face_id: 'f2',
          bbox: [60, 10, 50, 50],
          normalized_bbox: null, // Null
          fake_probability: 0.2,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        },
        {
          face_id: 'f3',
          bbox: [120, 10, 50, 50],
          normalized_bbox: [0.1, 0.2], // Incomplete (length !== 4)
          fake_probability: 0.2,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  return `Safely skipped malformed overlays. HTML length: ${html.length}`;
});

assertTest('2.2 Extreme normalized coordinates: Negative, Out-of-bounds (>1.0), Zero-size', () => {
  const payload = {
    facial_analysis: {
      face_count: 3,
      max_fake_probability: 0.7,
      composite_face_verdict: 'SUSPICIOUS',
      annotated_preview_url: '/media/test.jpg',
      faces: [
        {
          face_id: 'f_neg',
          bbox: [-20, -30, 100, 100],
          normalized_bbox: [-0.2, -0.3, 0.5, 0.5], // Negative
          fake_probability: 0.7,
          verdict: 'SUSPICIOUS',
          risk_level: 'HIGH',
          flags: []
        },
        {
          face_id: 'f_over',
          bbox: [900, 1100, 300, 300],
          normalized_bbox: [1.2, 1.5, 0.4, 0.4], // > 1.0
          fake_probability: 0.1,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        },
        {
          face_id: 'f_zero',
          bbox: [100, 100, 0, 0],
          normalized_bbox: [0.5, 0.5, 0, 0], // Zero dimensions
          fake_probability: 0.1,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (!clean(html).includes('left:-20%')) throw new Error('Expected style with negative left coordinate');
  if (!clean(html).includes('left:120%')) throw new Error('Expected style with >100% left coordinate');
  return 'Extreme coordinates rendered safely inside overflow-hidden container';
});

assertTest('2.3 NaN and Infinity coordinates in normalized_bbox', () => {
  const payload = {
    facial_analysis: {
      face_count: 1,
      max_fake_probability: 0.5,
      composite_face_verdict: 'SUSPICIOUS',
      annotated_preview_url: '/media/test.jpg',
      faces: [
        {
          face_id: 'f_nan',
          bbox: [0, 0, 10, 10],
          normalized_bbox: [NaN, Infinity, -Infinity, 0],
          fake_probability: 0.5,
          verdict: 'SUSPICIOUS',
          risk_level: 'HIGH',
          flags: []
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  return `NaN/Infinity styles handled without throwing. Length: ${html.length}`;
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: FacialAnomalyCard — Null / Missing / Partial Face Properties
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 3: FacialAnomalyCard Null/Missing Values Stress ---');

assertTest('3.1 Missing neural_metrics, flags, evidence_code, anomaly_region (minimal payload)', () => {
  const payload = {
    facial_analysis: {
      face_count: 1,
      max_fake_probability: 0.4,
      composite_face_verdict: 'AUTHENTIC',
      faces: [
        {
          face_id: 'face_minimal',
          bbox: [10, 20, 30, 40],
          fake_probability: 0.4,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (!clean(html).includes('FACE MINIMAL')) throw new Error('Missing face name');
  return `Rendered cleanly: ${html.length} chars`;
});

assertTest('3.2 Missing or undefined fake_probability (should default to 0%)', () => {
  const payload = {
    facial_analysis: {
      face_count: 1,
      composite_face_verdict: 'AUTHENTIC',
      faces: [
        {
          face_id: 'f1',
          bbox: [10, 20, 30, 40],
          fake_probability: undefined,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  if (!clean(html).includes('0% SYNTHETIC')) throw new Error('Expected 0% SYNTHETIC fallback');
  return 'Defaulted undefined probability to 0%';
});

assertTest('3.3 Unknown / empty verdict string (should map to neutral tone)', () => {
  const payload = {
    facial_analysis: {
      face_count: 1,
      composite_face_verdict: 'UNKNOWN_INSPECTION_MODE',
      faces: [
        {
          face_id: 'f1',
          bbox: [10, 20, 30, 40],
          fake_probability: 0.3,
          verdict: '',
          risk_level: '',
          flags: []
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
  return `Rendered cleanly with unknown verdict: ${html.length} chars`;
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: OCRDossier — Edge Cases (Empty, Null, Tavily, Missing IOCs)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 4: OCRDossier Edge Cases ---');

assertTest('4.1 Completely empty OCR result (data = {})', () => {
  const html = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: {} }));
  if (!clean(html).includes('Image Analysis Complete')) throw new Error('Missing default verdict');
  if (!clean(html).includes('No text extracted from document.')) throw new Error('Missing empty text fallback');
  return `Empty data rendered cleanly: ${html.length} chars`;
});

assertTest('4.2 Missing or null extracted_iocs (no crashes, 0 details found)', () => {
  const payload = {
    ocr_analysis: {
      full_text: 'Sample document text with no IOCs.',
      lines_count: 1
    },
    scam_analysis: {
      is_scam: false,
      risk_score: 10,
      risk_level: 'LOW',
      verdict: 'Clean Document'
    },
    extracted_iocs: null
  };
  const html = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payload }));
  if (!clean(html).includes('Clean Document')) throw new Error('Missing verdict');
  return `Rendered cleanly: ${html.length} chars`;
});

assertTest('4.3 Empty IOC lists (phones: [], upis: [], urls: [], apks: [])', () => {
  const payload = {
    extracted_iocs: {
      phones: [],
      upis: [],
      urls: [],
      apks: []
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payload }));
  if (clean(html).includes('Detected Scam Details')) throw new Error('Should not render IOC section when empty');
  return 'IOC section properly hidden when empty';
});

assertTest('4.4 Populated IOCs with special characters and long URLs', () => {
  const payload = {
    extracted_iocs: {
      phones: ['+91-98765-43210', '9876543211'],
      upis: ['scammer.test.fraud@okaxis', 'paytm-fraud@paytm'],
      urls: ['https://super-long-malicious-domain-name-intended-to-test-truncation.com/path?param=12345'],
      apks: ['malicious_update_v2.apk']
    },
    scam_analysis: {
      is_scam: true,
      risk_score: 95,
      risk_level: 'CRITICAL',
      verdict: 'KBC Lottery Scam Letter',
      matched_rules: ['KBC_IMPERSONATION', 'UPI_ADVANCE_FEE']
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payload }));
  if (!clean(html).includes('+91-98765-43210')) throw new Error('Missing phone IOC');
  if (!clean(html).includes('scammer.test.fraud@okaxis')) throw new Error('Missing UPI IOC');
  if (!clean(html).includes('malicious_update_v2.apk')) throw new Error('Missing APK IOC');
  if (!clean(html).includes('95% Risk • CRITICAL')) throw new Error('Missing 95% Risk pill');
  return 'Rendered full IOC suite and pills cleanly';
});

assertTest('4.5 Tavily threat intel: verified_threat === true with multiple articles', () => {
  const payload = {
    tavily_threat_intel: {
      verified_threat: true,
      matches_count: 2,
      intel_summary: 'Multiple law enforcement advisories confirm active KBC WhatsApp lottery scams.',
      articles: [
        {
          title: 'PIB Fact Check: KBC Lottery Scam Advisory',
          url: 'https://pib.gov.in/factcheck/1',
          snippet: 'Government warns citizens against fake KBC lottery letters circulating on WhatsApp.'
        },
        {
          title: 'Delhi Police Cyber Cell Issues Alert',
          url: 'https://cybercrime.gov.in/alert',
          snippet: 'Fraudulent UPI IDs asking for tax payment before prize release.'
        }
      ]
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payload }));
  if (!clean(html).includes('Tavily Live Threat Cross-Check Advisory')) throw new Error('Missing Tavily advisory header');
  if (!clean(html).includes('PIB Fact Check')) throw new Error('Missing article 1');
  if (!clean(html).includes('Delhi Police Cyber Cell')) throw new Error('Missing article 2');
  return 'Tavily advisory cards rendered cleanly';
});

assertTest('4.6 Tavily threat intel: null or verified_threat === false (section hidden)', () => {
  const payloadNull = { tavily_threat_intel: null };
  const htmlNull = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payloadNull }));
  if (htmlNull.includes('Tavily Live Threat Cross-Check')) throw new Error('Tavily section should be hidden when null');

  const payloadFalse = { tavily_threat_intel: { verified_threat: false } };
  const htmlFalse = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payloadFalse }));
  if (htmlFalse.includes('Tavily Live Threat Cross-Check')) throw new Error('Tavily section should be hidden when verified_threat === false');

  return 'Tavily cleanly suppressed when not verified threat';
});

assertTest('4.7 Extremely large text payload in OCR (10,000 characters stress test)', () => {
  const largeText = 'SCAM ALERT! '.repeat(800);
  const payload = {
    ocr_analysis: {
      full_text: largeText,
      lines_count: 800
    }
  };
  const html = ReactDOMServer.renderToString(React.createElement(OCRDossier, { data: payload }));
  if (!clean(html).includes(`${largeText.length} characters`)) throw new Error('Character counter mismatch');
  return `Handled ${largeText.length} characters without memory/render issues`;
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Adversarial Bug Hunting: FaceScorecard Unsafe Property Access
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- SUITE 5: Adversarial Bug Hunting (Targeting Unsafe Properties) ---');

assertTest('5.1 Unsafe Destructure Check: What happens if face.bbox is undefined in FaceScorecard?', () => {
  const payload = {
    facial_analysis: {
      face_count: 1,
      composite_face_verdict: 'AUTHENTIC',
      faces: [
        {
          face_id: 'face_no_bbox',
          // bbox is missing!
          fake_probability: 0.1,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        }
      ]
    }
  };
  try {
    ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
    return 'Component safely handled missing face.bbox';
  } catch (err) {
    // We expect this error because of `const [x, y, w, h] = face.bbox;`
    throw new Error(`CRITICAL BUG CONFIRMED: Missing face.bbox throws uncaught exception: ${err.message}`);
  }
});

assertTest('5.2 Unsafe Method Call Check: What happens if face.face_id is undefined or null in FaceScorecard?', () => {
  const payload = {
    facial_analysis: {
      face_count: 1,
      composite_face_verdict: 'AUTHENTIC',
      faces: [
        {
          // face_id is missing!
          bbox: [10, 10, 20, 20],
          fake_probability: 0.1,
          verdict: 'AUTHENTIC',
          risk_level: 'SAFE',
          flags: []
        }
      ]
    }
  };
  try {
    ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
    return 'Component safely handled missing face.face_id';
  } catch (err) {
    throw new Error(`CRITICAL BUG CONFIRMED: Missing face.face_id throws uncaught exception: ${err.message}`);
  }
});

assertTest('5.3 Mismatch: face_count > 0 but faces array is empty (activeF undefined)', () => {
  const payload = {
    facial_analysis: {
      face_count: 2,
      max_fake_probability: 0.8,
      composite_face_verdict: 'DEEPFAKE',
      faces: [] // Empty array!
    }
  };
  try {
    const html = ReactDOMServer.renderToString(React.createElement(FacialAnomalyCard, { data: payload }));
    return `Component safely handled empty faces array when face_count > 0. Length: ${html.length}`;
  } catch (err) {
    throw new Error(`CRITICAL BUG: Empty faces array with face_count > 0 throws: ${err.message}`);
  }
});

console.log('\n================================================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

// Write JSON report for handoff reference
fs.writeFileSync(
  path.join(FRONTEND_ROOT, 'scripts/empirical_challenger_results.json'),
  JSON.stringify({ passed, failed, total: passed + failed, results }, null, 2)
);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
