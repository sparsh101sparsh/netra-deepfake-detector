// frontend/scripts/test-m2-pdf-verification.js
// Verification harness for Milestone 2: Client-Side Forensic PDF Generator

const path = require("path");
const fs = require("fs");
const jiti = require("jiti")(path.resolve("./index.js"));
const { generateForensicPDF } = jiti("./lib/pdfReportGenerator.ts");

const OUTPUT_DIR = path.resolve("/tmp/netra_m2_test_pdfs");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1x1 transparent PNG base64
const SAMPLE_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
// 1x1 white JPEG base64
const SAMPLE_JPEG_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

async function runTests() {
  console.log("================================================================================");
  console.log("NETRA M2: CLIENT-SIDE FORENSIC PDF GENERATOR EMPIRICAL VERIFICATION SUITE");
  console.log("================================================================================\n");

  const results = [];

  // 1. Audio Voice Clone
  console.log("[TEST 1/5] Testing Audio Voice Clone Modality...");
  const audioData = {
    id: "AUD-2026-TEST-001",
    title: "Audio Deepfake & Voice Clone Verification",
    verdict: "VOICE_CLONE_DETECTED",
    confidence: 94,
    riskLevel: "CRITICAL",
    mediaType: "audio_clone",
    city: "Mumbai",
    state: "Maharashtra",
    locationSource: "TELECOM_NETWORK",
    sha256_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    audioAnalysis: {
      durationSeconds: 6.45,
      sampleRateHz: 16000,
      codec: "Opus/OGG 16kHz",
      sourcePlatform: "WhatsApp Voice Note",
      acousticFlags: [
        "vocoder_synthetic_artifacts",
        "vocoder_spectral_flatness_anomaly",
        "high_frequency_vocoder_cutoff",
        "synthetic_prosody_flatness",
      ],
      acousticMetrics: {
        wienerFlatness: 0.0485,
        hfCutoffRatio: 0.521,
        zcrVariance: 0.0142,
        rmsProsodyVariance: 0.0098,
      },
      scorecard: {
        wav2vec2Score: 0.96,
        spectralScore: 0.92,
      },
    },
    tavilyMatches: [
      {
        title: "Delhi Police Issues Advisory on AI Voice Cloning Extortion",
        snippet: "Scammers using 5-second voice samples to impersonate family members in distress.",
      },
    ],
  };

  const audioDoc = await generateForensicPDF(audioData);
  const audioBuf = Buffer.from(audioDoc.output("arraybuffer"));
  const audioPath = path.join(OUTPUT_DIR, "audio_clone_test.pdf");
  fs.writeFileSync(audioPath, audioBuf);
  console.log(`  ✓ Audio PDF generated: ${audioPath} (${audioBuf.length} bytes, ${audioDoc.getNumberOfPages()} page(s))`);
  results.push({ name: "Audio Voice Clone", path: audioPath, doc: audioDoc, buf: audioBuf });

  // 2. Pure Face Image (Branch A)
  console.log("\n[TEST 2/5] Testing Image Pure Face Modality (Branch A)...");
  const pureFaceData = {
    id: "FACE-2026-TEST-002",
    title: "Facial Deepfake & Photographic Manipulation Evidence Dossier",
    verdict: "CRITICAL_FACIAL_DEEPFAKE",
    confidence: 96,
    riskLevel: "CRITICAL",
    mediaType: "image_pure_face",
    city: "Bengaluru",
    state: "Karnataka",
    locationSource: "EXIF_CONTAINER",
    sha256_hash: "b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef0",
    facialAnalysis: {
      faceCount: 2,
      maxFakeProbability: 0.964,
      compositeVerdict: "DEEPFAKE",
      annotatedPreviewBase64: SAMPLE_JPEG_BASE64,
      faces: [
        {
          face_id: "face_1",
          bbox: [120, 80, 160, 190],
          fake_probability: 0.964,
          verdict: "DEEPFAKE",
          risk_level: "CRITICAL",
          flags: ["sbi_seam_detected", "ocular_reflection_mismatch"],
          anomaly_region: "Ocular Glare / SBI Boundary",
          neural_metrics: {
            sbi_artifact_level: 0.952,
            ocular_reflection_symmetry: 0.894,
            eyewear_specular_score: 0.912,
            lip_sync_laplacian_score: 0.845,
          },
        },
        {
          face_id: "face_2",
          bbox: [410, 110, 140, 170],
          fake_probability: 0.082,
          verdict: "AUTHENTIC",
          risk_level: "SAFE",
          flags: ["natural_skin_locus"],
          anomaly_region: "Natural Facial Locus",
          neural_metrics: {
            sbi_artifact_level: 0.061,
            ocular_reflection_symmetry: 0.045,
            eyewear_specular_score: 0.052,
            lip_sync_laplacian_score: 0.048,
          },
        },
      ],
    },
  };

  const pureFaceDoc = await generateForensicPDF(pureFaceData);
  const pureFaceBuf = Buffer.from(pureFaceDoc.output("arraybuffer"));
  const pureFacePath = path.join(OUTPUT_DIR, "image_pure_face_test.pdf");
  fs.writeFileSync(pureFacePath, pureFaceBuf);
  console.log(`  ✓ Pure Face PDF generated: ${pureFacePath} (${pureFaceBuf.length} bytes, ${pureFaceDoc.getNumberOfPages()} page(s))`);
  results.push({ name: "Image Pure Face", path: pureFacePath, doc: pureFaceDoc, buf: pureFaceBuf });

  // 3. Document OCR Scam (Branch B)
  console.log("\n[TEST 3/5] Testing Image Document OCR Scam Modality (Branch B)...");
  const docScamData = {
    id: "DOC-2026-TEST-003",
    title: "Document Scam & Phishing OCR Evidence Dossier",
    verdict: "MALICIOUS_SCAM_DOCUMENT",
    confidence: 92,
    riskLevel: "CRITICAL",
    mediaType: "image_document",
    city: "New Delhi",
    state: "Delhi",
    locationSource: "RAPID_OCR_SCAN",
    sha256_hash: "c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef0",
    ocrAnalysis: {
      engine: "RapidOCR (PP-OCRv4 ONNX)",
      fullText:
        "DEPARTMENT OF TELECOMMUNICATIONS NOTICE: Your mobile number will be disconnected within 2 hours due to illegal activity. Immediately transfer statutory verification fee of Rs 49,999 to upi dot.telecom@icici or call +91 98765 43210. Download clearing app at http://dot-verification-portal.gov.in/app.apk",
      linesCount: 8,
      processingTimeMs: 142,
    },
    scamAnalysis: {
      isScam: true,
      riskScore: 92,
      riskLevel: "CRITICAL",
      scamType: "Urgent Telecom Disconnection Threat",
      matchedRules: [
        "Urgent Disconnection Threat",
        "Unauthorized Govt Impersonation",
        "Unverified Beneficiary UPI Inducement",
      ],
      analysisReason:
        "High confidence impersonation of Department of Telecommunications with urgent coercive payment demands.",
    },
    iocs: {
      phones: ["+91 98765 43210"],
      upis: ["dot.telecom@icici"],
      urls: ["http://dot-verification-portal.gov.in/app.apk"],
      apks: ["dot_clearance.apk"],
    },
  };

  const docScamDoc = await generateForensicPDF(docScamData);
  const docScamBuf = Buffer.from(docScamDoc.output("arraybuffer"));
  const docScamPath = path.join(OUTPUT_DIR, "image_document_test.pdf");
  fs.writeFileSync(docScamPath, docScamBuf);
  console.log(`  ✓ Document OCR PDF generated: ${docScamPath} (${docScamBuf.length} bytes, ${docScamDoc.getNumberOfPages()} page(s))`);
  results.push({ name: "Document OCR Scam", path: docScamPath, doc: docScamDoc, buf: docScamBuf });

  // 4. Hybrid Composite (Branch C)
  console.log("\n[TEST 4/5] Testing Hybrid Image Modality (Branch C)...");
  const hybridData = {
    id: "HYB-2026-TEST-004",
    title: "Hybrid Multi-Vector Forensic Investigation Dossier",
    verdict: "HYBRID_FACIAL_DEEPFAKE_AND_SCAM",
    confidence: 97,
    riskLevel: "CRITICAL",
    mediaType: "image_hybrid",
    city: "Hyderabad",
    state: "Telangana",
    locationSource: "MULTI_VECTOR_HYBRID",
    sha256_hash: "d4e5f6a1b2c37890123456789abcdef0123456789abcdef0123456789abcdef0",
    facialAnalysis: {
      faceCount: 1,
      maxFakeProbability: 0.972,
      compositeVerdict: "DEEPFAKE",
      annotatedPreviewBase64: SAMPLE_PNG_BASE64,
      faces: [
        {
          face_id: "face_ceo",
          bbox: [100, 90, 150, 180],
          fake_probability: 0.972,
          verdict: "DEEPFAKE",
          risk_level: "CRITICAL",
          anomaly_region: "Lip-Sync & Facial Boundary",
        },
      ],
    },
    ocrAnalysis: {
      engine: "RapidOCR (ONNX)",
      fullText:
        "OFFICIAL COMMUNIQUE: Immediate release of project funds required to overseas escrow upi corp.escrow@axisbank.",
      linesCount: 4,
      processingTimeMs: 112,
    },
    scamAnalysis: {
      isScam: true,
      riskScore: 95,
      riskLevel: "CRITICAL",
      scamType: "CEO Fraud & Executive Impersonation",
    },
    iocs: {
      upis: ["corp.escrow@axisbank"],
      phones: ["+91 91234 56789"],
    },
  };

  const hybridDoc = await generateForensicPDF(hybridData);
  const hybridBuf = Buffer.from(hybridDoc.output("arraybuffer"));
  const hybridPath = path.join(OUTPUT_DIR, "image_hybrid_test.pdf");
  fs.writeFileSync(hybridPath, hybridBuf);
  console.log(`  ✓ Hybrid PDF generated: ${hybridPath} (${hybridBuf.length} bytes, ${hybridDoc.getNumberOfPages()} page(s))`);
  results.push({ name: "Hybrid Composite", path: hybridPath, doc: hybridDoc, buf: hybridBuf });

  // 5. Video Deepfake
  console.log("\n[TEST 5/5] Testing Video Deepfake Modality...");
  const videoData = {
    id: "VID-2026-TEST-005",
    title: "Video Forensic Analysis Dossier",
    verdict: "DEEPFAKE_MANIPULATION_DETECTED",
    confidence: 95,
    riskLevel: "CRITICAL",
    mediaType: "video",
    city: "Chennai",
    state: "Tamil Nadu",
    locationSource: "EXIF_METADATA",
    sha256_hash: "e5f6a1b2c3d47890123456789abcdef0123456789abcdef0123456789abcdef0",
    scores: {
      gendScore: 0.95,
      visualScore: 0.92,
      audioScore: 0.88,
      clipScore: 0.91,
    },
    keyframeSnapshots: [
      {
        frame_number: 142,
        timestamp: "00:04.73",
        anomaly_region: "Eyewear Specular Glare Discontinuity",
        anomaly_score: 0.96,
        detector_subsystem: "GenD Foundation Model ViT-L/14 + Spatial SBI",
        bounding_box: [180, 110, 80, 45],
        image_base64: SAMPLE_JPEG_BASE64,
      },
    ],
    frames: [
      { frame_number: 140, timestamp: "00:04.66", confidence: 91.2 },
      { frame_number: 141, timestamp: "00:04.70", confidence: 93.4 },
      { frame_number: 142, timestamp: "00:04.73", confidence: 96.0 },
      { frame_number: 143, timestamp: "00:04.76", confidence: 94.1 },
    ],
  };

  const videoDoc = await generateForensicPDF(videoData);
  const videoBuf = Buffer.from(videoDoc.output("arraybuffer"));
  const videoPath = path.join(OUTPUT_DIR, "video_deepfake_test.pdf");
  fs.writeFileSync(videoPath, videoBuf);
  console.log(`  ✓ Video PDF generated: ${videoPath} (${videoBuf.length} bytes, ${videoDoc.getNumberOfPages()} page(s))`);
  results.push({ name: "Video Deepfake", path: videoPath, doc: videoDoc, buf: videoBuf });

  console.log("\nAll 5 PDFs successfully written to disk in /tmp/netra_m2_test_pdfs/");
  return results;
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
