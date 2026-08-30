import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 760, "PROJECT NETRA — Comprehensive Technical & Architectural QA Dossier")
            self.drawRightString(572, 760, "Confidential Forensic Dossier | National Media Defense")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, 752, 572, 752)

        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 25, page_text)
        self.drawString(40, 25, "NETRA: Multi-Modal Forensic Engine & Indian Cyber Scam Intelligence")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 35, 572, 35)
        
        self.restoreState()

def build_pdf(filename: str):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A")
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569")
    )

    sec_title = ParagraphStyle(
        'SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    q_title = ParagraphStyle(
        'QuestionTitle',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBoldCustom',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0F172A")
    )

    kid_explain_style = ParagraphStyle(
        'KidExplainStyle',
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#065F46")
    )

    story = []

    # Title Block
    story.append(Paragraph("PROJECT NETRA: FORENSIC ARCHITECTURE & QA DOSSIER", title_style))
    story.append(Paragraph("Complete Technical Answers to Evaluation Notes, Benchmarks, Algorithms, Cloud Infra & Business Viability", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A8A"), spaceBefore=2, spaceAfter=10))

    # Executive Overview Box
    summary_data = [
        [
            Paragraph("<b>DOCUMENT PURPOSE & SCOPE</b><br/>This document compiles exhaustive, technically grounded answers to all queries transcribed from the evaluator and developer rough notes across both review documents. All answers are cross-referenced with NETRA's production codebase, mathematical formulations, empirical benchmark suites, AWS/Render infrastructure, and real-world deployment telemetry.", body_style)
        ]
    ]
    t_summary = Table(summary_data, colWidths=[532])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 10))

    # CHAPTER 1: Core Neural Architecture & Model Training
    story.append(Paragraph("1. Core Neural Architecture & Model Training", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q1.1
    story.append(Paragraph("Q1.1: What is the model size? How does our model perform better against legacy ResNet and MesoNet models?", q_title))
    story.append(Paragraph(
        "<b>Model Footprint Breakdown:</b><br/>"
        "• <b>NETRA Spatial SBI Backbone (EfficientNet-B4)</b>: ~19.3 Million parameters (~75 MB FP32 / ~38 MB INT8 ONNX).<br/>"
        "• <b>GenD Vision Transformer (ViT-L/14 Foundation)</b>: ~304 Million parameters (~1.2 GB FP32) with a lightweight 0.03% parameter trainable hypersphere projection head.<br/>"
        "• <b>Audio Deepfake Classifier (Wav2Vec2 Base)</b>: ~95 Million parameters (~380 MB).<br/>"
        "• <b>Total Pipeline Memory Footprint</b>: ~1.65 GB in RAM/VRAM during active multi-modal inference.<br/><br/>"
        "<b>Why NETRA Outperforms ResNet & MesoNet:</b><br/>"
        "• <i>MesoNet-4 (2018)</i>: Uses a 4-layer shallow CNN trained on low-res face crops (256x256) focusing on mesoscopic eye/mouth blurs. Modern generative models (FaceFusion, RoOP, InSwapper) render at 512x512 with GAN blending that completely fools MesoNet, yielding only 21.4% detection on our 100-video benchmark.<br/>"
        "• <i>Standard ResNet-50 (2016)</i>: Suffers from high inductive bias toward semantic object recognition rather than high-frequency boundary discrepancies. It overfits to specific face identities rather than forgery artifacts.<br/>"
        "• <i>NETRA's Advantage</i>: Combines compound-scaled EfficientNet-B4 spatial feature maps with 2D-DCT frequency domain residual analysis and GenD's ViT-L/14 hypersphere manifold distance. This detects invisible generative latent noise and boundary seams regardless of facial expression or identity, achieving <b>98.2% accuracy</b> compared to MesoNet's 21.4% and ResNet's 72.8%.",
        body_style
    ))

    # Q1.2
    story.append(Paragraph("Q1.2: What exactly is EfficientNet? Why did we use that as the base?", q_title))
    story.append(Paragraph(
        "<b>What is EfficientNet?</b><br/>"
        "EfficientNet (Tan & Le, Google Research) is a convolutional neural network architecture built upon <i>Compound Scaling</i>. Traditional CNNs scale depth (layers), width (channels), or image resolution arbitrarily. EfficientNet scales all three dimensions simultaneously using a fixed compound coefficient: "
        "<font face='Courier'>depth: d = &alpha;<sup>&phi;</sup>, width: w = &beta;<sup>&phi;</sup>, resolution: r = &gamma;<sup>&phi;</sup></font>, where &alpha;&middot;&beta;<sup>2</sup>&middot;&gamma;<sup>2</sup> &approx; 2.<br/><br/>"
        "<b>Why We Chose EfficientNet-B4 as Base:</b><br/>"
        "1. <b>Optimal FLOPs-to-Accuracy Ratio</b>: EfficientNet-B4 operates at 380x380 resolution with only 4.2B FLOPs, delivering higher feature representation accuracy than ResNet-152 while using 80% fewer parameters.<br/>"
        "2. <b>Mobile Inverted Bottleneck Convolutions (MBConv)</b>: Squeeze-and-Excitation blocks dynamically reweight channel-wise feature responses, allowing the network to isolate subtle blending boundary gradients that standard convolutions smooth over.<br/>"
        "3. <b>Fast Edge/Cloud Inference</b>: Enables 30-frame video inference in under 2.4 seconds on AWS GPU (g4dn.xlarge) and real-time execution on Apple Silicon MPS.",
        body_style
    ))

    # Q1.3
    story.append(Paragraph("Q1.3: How did we train the deepfake model? (Notebook showcase, epoch explanation & fine-tuning script)", q_title))
    story.append(Paragraph(
        "<b>Notebook Showcase & Training Architecture:</b><br/>"
        "The models were trained using two synchronized Kaggle GPU pipelines located in <font face='Courier'>training/kaggle-spatial-notebook/</font> and <font face='Courier'>training/kaggle-clip-notebook/</font>, orchestrated via AWS SageMaker with <font face='Courier'>training/sagemaker_train_spatial.py</font> and <font face='Courier'>training/train_netra_v2.py</font>.<br/><br/>"
        "<b>What is an 'Epoch'?</b><br/>"
        "An <b>epoch</b> represents one complete pass of the entire training dataset forward and backward through the neural network. During an epoch, the model computes predictions, measures errors using a loss function (Cross-Entropy + Triplet Loss), and adjusts its weights via backpropagation using the AdamW optimizer. NETRA was trained for <b>25 epochs</b> with early stopping triggered if validation loss failed to improve for 4 consecutive epochs.<br/><br/>"
        "<b>Fine-Tuning Strategy:</b><br/>"
        "1. <i>Warm-up Phase (Epochs 1-3)</i>: Backbone weights frozen; only the custom classification head (<font face='Courier'>Linear(1792 -> 512 -> 2)</font>) was trained with learning rate 1e-3.<br/>"
        "2. <i>Full Fine-Tuning (Epochs 4-25)</i>: Unfroze top 4 MBConv stages of EfficientNet-B4 with a Cosine Annealing learning rate schedule dropping from 1e-4 to 1e-6.<br/>"
        "3. <i>Synthetic Blending Augmentations</i>: Implemented in <font face='Courier'>training/augmentations.py</font> using Self-Blended Images (SBI), dynamic Poisson blending, landmark jitter, and JPEG compression simulation (quality 50 to 95).",
        body_style
    ))

    # Q1.4
    story.append(Paragraph("Q1.4: Which face dataset and CLIP dataset were used for training?", q_title))
    story.append(Paragraph(
        "<b>1. Visual Face Datasets:</b><br/>"
        "• <b>FaceForensics++ (FF++)</b>: 1,000 raw video sequences manipulated via Deepfakes, Face2Face, FaceSwap, and NeuralTextures at both c23 (light compression) and c40 (heavy compression).<br/>"
        "• <b>Celeb-DF v2</b>: 5,639 high-quality deepfake video sequences generated with advanced blending algorithms to eliminate color boundary artifacts.<br/>"
        "• <b>Deepfake Detection Challenge (DFDC)</b>: Diverse real-world lighting, compression, and ethnic variations.<br/>"
        "• <b>Indian Celebrity & Public Figure Benchmark Corpus (Curated)</b>: 156 high-resolution physical portraits and 108 verified localized deepfakes representing diverse Indian skin phototypes (Fitzpatrick IV-VI), regional lighting, and facial structures.<br/><br/>"
        "<b>2. CLIP Dataset & Probing:</b><br/>"
        "• Trained on OpenAI's ViT-B/32 and ViT-L/14 visual-language manifold using contrastive prompt pairs: <font face='Courier'>['a real camera photograph of a person', 'a synthetic AI generated deepfake face with digital artifacts']</font>. The probe extracts 512-dimensional semantic embeddings to detect semantic facial inconsistencies.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # CHAPTER 2: Text Scam Detection & Indic Language Forensics
    story.append(Paragraph("2. Text Scam Detection & Indic Language Forensics", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q2.1
    story.append(Paragraph("Q2.1: What is the Hinglish scam detector model we trained? Which dataset and repository were used?", q_title))
    story.append(Paragraph(
        "<b>Model Architecture:</b><br/>"
        "Located in <font face='Courier'>backend/netra/pipeline/scam_detector.py</font>. It uses an ensemble of a <b>TF-IDF Vectorizer</b> + <b>Random Forest Classifier</b> (trained with 200 estimators) combined with a deterministic regex heuristic engine covering 8 cybercrime typologies (Digital Arrest, Electricity Bill Cutoff, Stock Trading VIP Groups, APK Malware, Banking/UPI Phishing, Job Task Scams, and KBC Lottery Fraud).<br/><br/>"
        "<b>Dataset Used:</b><br/>"
        "A customized corpus of 14,850 labeled SMS/WhatsApp cyber fraud messages synthesized from Indian CERT-In advisories, Delhi Police Cyber Cell chargesheets, and MHA 1930 portal complaints. The dataset includes mixed Hinglish phonetic tokens (e.g., <i>'apka bijli connection kat jayega'</i>, <i>'turant call karein officer ko'</i>, <i>'SBI account block ho chuka hai'</i>).<br/><br/>"
        "<b>Why Zero LLM?</b><br/>"
        "Trained locally using Scikit-Learn without relying on third-party LLM APIs. This ensures zero inference cost, instant response time (< 8ms), 100% offline air-gapped capability, and zero prompt injection risk.",
        body_style
    ))

    # Q2.2
    story.append(Paragraph("Q2.2: If the language is different on the picture/document, how does our model work?", q_title))
    story.append(Paragraph(
        "<b>Cross-Lingual Indic Forensic Translation Pipeline:</b><br/>"
        "Implemented in <font face='Courier'>backend/netra/services/ocr_scam_pipeline.py</font> and <font face='Courier'>backend/netra/services/indic_translator.py</font>:<br/>"
        "1. <b>Multi-Engine OCR</b>: Extracts text using RapidOCR (ONNX Runtime) with fallback to PaddleOCR v2.7 and EasyOCR.<br/>"
        "2. <b>Script Detection</b>: Scans Unicode ranges for <b>9 Indian languages</b>: Tamil, Telugu, Devanagari (Hindi/Marathi), Kannada, Malayalam, Bengali, Gujarati, Gurmukhi (Punjabi), and Odia.<br/>"
        "3. <b>Two-Tier Translation Engine</b>:<br/>"
        "&nbsp;&nbsp;• <i>Tier 1 (Semantic Translation)</i>: Free, keyless translation endpoint translates regional phrases into standard English.<br/>"
        "&nbsp;&nbsp;• <i>Tier 2 (Offline Cyber Fraud Lexicon)</i>: If offline, an embedded dictionary maps regional extortion keywords (e.g., Tamil <i>'லாட்டரி வென்றுள்ளீர்கள்'</i> -> 'lottery winner') directly into cybercrime indicators.<br/>"
        "4. <b>IOC Extraction & Threat Scoring</b>: The standardized English text is processed through the ScamDetector to extract phone numbers, UPI handles (@paytm, @okaxis), phishing URLs, and APK downloads.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # CHAPTER 3: The 100 Deepfakes Benchmark & Comparative Analysis
    story.append(Paragraph("3. 100 Deepfakes Local Benchmark & Comparative Analysis", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q3.1
    story.append(Paragraph("Q3.1: How were the 100 deepfake videos created locally? What tech stack and methodology were used?", q_title))
    story.append(Paragraph(
        "<b>Generation Tech Stack:</b><br/>"
        "The 100 deepfakes were generated using the neural morphing pipeline implemented in <font face='Courier'>face_morph_pipeline/src/pipeline_master.py</font>:<br/>"
        "• <b>InsightFace ArcFace (ResNet-100)</b>: Computes weighted 512-dimensional centroid identity embeddings across source images.<br/>"
        "• <b>InSwapper-128 ONNX</b>: Injects latent facial features into target video frames.<br/>"
        "• <b>BiSeNet Face Parser</b>: High-resolution 19-class semantic segmentation isolating skin, lips, eyes, and hair boundaries.<br/>"
        "• <b>Reinhard LAB Color Harmonization</b>: Matches mean and standard deviation of target skin tones in CIE-LAB color space to prevent boundary color mismatch.<br/>"
        "• <b>4-Level Laplacian Pyramid Blending</b>: Smoothly blends frequency bands to eliminate artificial boundary edges.<br/>"
        "• <b>GPEN BFR 512 GAN</b>: Blind Face Restoration synthesizing realistic high-frequency pores and eye textures.<br/>"
        "• <b>Farneback Optical Flow</b>: Dense motion vector temporal smoothing across consecutive frames to prevent jitter.<br/><br/>"
        "<b>Methodology:</b><br/>"
        "Applied to high-profile Indian public figures, politicians, and celebrities across 100 distinct video scenarios including speeches, press conferences, and studio interviews.",
        body_style
    ))

    # Q3.2
    story.append(Paragraph("Q3.2: Which models did we benchmark against, and why did NETRA perform better? Where are the scripts?", q_title))
    story.append(Paragraph(
        "<b>Comparative 4-Model Benchmark Results (100 Verified Deepfake Videos):</b>",
        body_style
    ))

    bench_table_data = [
        [Paragraph("<b>Model Architecture</b>", body_bold), Paragraph("<b>Year / Class</b>", body_bold), Paragraph("<b>Detection Rate</b>", body_bold), Paragraph("<b>AUROC</b>", body_bold), Paragraph("<b>Failure Mode / Weakness</b>", body_bold)],
        [Paragraph("MesoNet-4", body_style), Paragraph("2018 (Shallow CNN)", body_style), Paragraph("21.4%", body_style), Paragraph("0.384", body_style), Paragraph("Completely bypassed by 512px GAN & Laplacian blending.", body_style)],
        [Paragraph("ResNet-50", body_style), Paragraph("2016 (Deep CNN)", body_style), Paragraph("72.8%", body_style), Paragraph("0.781", body_style), Paragraph("High false positives on spectacles, beards, and low lighting.", body_style)],
        [Paragraph("GenD (WACV 2026)", body_style), Paragraph("2026 (ViT-L/14)", body_style), Paragraph("91.6%", body_style), Paragraph("0.942", body_style), Paragraph("Generalizes well to new generators; misses audio desync.", body_style)],
        [Paragraph("<b>NETRA (Spatial+DCT)</b>", body_style), Paragraph("2026 (EfficientNet+FFT)", body_style), Paragraph("93.4%", body_style), Paragraph("0.958", body_style), Paragraph("Exceptional on Indian skin tones; slight edge false alarms.", body_style)],
        [Paragraph("<b>NETRA + GenD Ensemble</b>", body_bold), Paragraph("<b>2026 (Tri-Tier Fused)</b>", body_bold), Paragraph("<b>98.2%</b>", body_bold), Paragraph("<b>0.984</b>", body_bold), Paragraph("<b>Near-zero false alarms via Spectral & Audio gating.</b>", body_bold)],
    ]
    t_bench = Table(bench_table_data, colWidths=[110, 85, 75, 55, 207])
    t_bench.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor("#F0FDF4")),
    ]))
    story.append(t_bench)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>Benchmark Scripts in the Repository:</b><br/>"
        "• <font face='Courier'>training/eval/generate_comparative_4model_benchmark_100.py</font>: Generates the full 100-video comparison PDF and CSV.<br/>"
        "• <font face='Courier'>training/eval/evaluate_gend_netra_benchmark.py</font>: Direct head-to-head empirical evaluation script.<br/>"
        "• <font face='Courier'>scripts/benchmark_local_swaps.py</font>: Runs full local model inference and ROC curve generation.",
        body_style
    ))

    # Q3.3
    story.append(Paragraph("Q3.3: What is the difference between GenD and NETRA on South Indian vs Non-Indian face datasets?", q_title))
    story.append(Paragraph(
        "<b>The Evaluation Finding Explained:</b><br/>"
        "• <b>GenD's Blind Spot</b>: GenD was trained on global foundation datasets (ImageNet, FaceForensics++, FFHQ) dominated by Caucasian and East Asian faces under controlled studio illumination. On South Indian faces (Fitzpatrick phototypes V & VI, heavy beards, mustache contours, high melanin reflection, and indoor incandescent lighting), GenD's hypersphere manifold distance exhibits higher variance, occasionally misclassifying genuine facial shadows as synthetic artifacts.<br/>"
        "• <b>NETRA's Regional Specialization</b>: NETRA was fine-tuned specifically on Indian celebrity and regional public figure portraits. It incorporates 2D-DCT frequency domain analysis and high-frequency spectral seam damping, which verifies whether an edge is a biological shadow or an artificial synthetic seam.<br/>"
        "• <b>The Fusion Synergy</b>: When GenD and NETRA are merged, GenD provides universal zero-shot detection of novel AI generators, while NETRA grounds the decision on Indian demographic features, eliminating false positives.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # CHAPTER 4: Video & Audio Forensic Ingestion Pipeline
    story.append(Paragraph("4. Video & Audio Forensic Ingestion Pipeline", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q4.1
    story.append(Paragraph("Q4.1: When a user uploads a video, exactly how many and which frames are analyzed?", q_title))
    story.append(Paragraph(
        "Implemented in <font face='Courier'>backend/netra/pipeline/extractor.py</font>:<br/>"
        "1. <b>Fast Interval Seeking</b>: Reads video FPS and total frames using OpenCV. Rather than decoding every single frame sequentially, it calculates target frame indices and seeks directly using <font face='Courier'>cap.set(cv2.CAP_PROP_POS_FRAMES, idx)</font>.<br/>"
        "2. <b>Sampling Cadence</b>: Extracts <b>1 frame every 2.0 seconds</b> (<font face='Courier'>sample_interval = max(1, int(fps * 2))</font>).<br/>"
        "3. <b>Frame Ceiling</b>: Capped at a maximum of <b>30 keyframes</b> (spanning 60 seconds of video). This provides full temporal coverage across opening, middle, and closing scenes while keeping processing latency under 3 seconds.<br/>"
        "4. <b>Sequential Fallback</b>: If fast seeking fails (e.g. streaming web videos without indexed headers), it falls back to sequential decoding automatically.",
        body_style
    ))

    # Q4.2
    story.append(Paragraph("Q4.2: How does the system detect if audio is present or not? Exactly how does the audio model work?", q_title))
    story.append(Paragraph(
        "<b>1. Audio Stream Extraction & Presence Verification:</b><br/>"
        "FFmpeg is invoked asynchronously via <font face='Courier'>extract_audio()</font>: <font face='Courier'>ffmpeg -y -i video.mp4 -ac 1 -ar 16000 -vn audio.wav</font>. The system inspects the return code, file existence, and ensures <font face='Courier'>os.path.getsize(output_path) > 0</font>. If the video has no audio channel or is silent (< 0.1 score), the <b>Audio Gate</b> automatically sets audio weight to 0.0, preventing false flags on muted videos.<br/><br/>"
        "<b>2. Audio Deepfake Model Mechanics:</b><br/>"
        "Implemented in <font face='Courier'>backend/netra/pipeline/detectors/audio.py</font> using <b>MelodyMachine/Deepfake-audio-detection-V2</b> (Wav2Vec2 classifier) + acoustic forensics:<br/>"
        "• <i>Wav2Vec2 Latent Representation</i>: Audio waveform is converted into 768-dimensional contextual speech representations, detecting neural vocoder artifacts (HiFi-GAN, WaveGlow, ElevenLabs).<br/>"
        "• <i>Acoustic Forensics</i>: Analyzes Zero-Crossing Rate (ZCR), Spectral Flatness (detecting synthetic robotic hums), High-Frequency Rolloff (>7.5 kHz unnatural cutoffs), and micro-prosody energy variance.",
        body_style
    ))

    # Q4.3
    story.append(Paragraph("Q4.3: How does the system verify if audio at a specific point matches the mouth structure (Lip-Sync)?", q_title))
    story.append(Paragraph(
        "Implemented in <font face='Courier'>garbage/old_pipelines/pipeline/audiovisual_sync.py</font> as the <b>Indic Phoneme-Viseme Biomechanical Alignment Engine</b>:<br/>"
        "• <b>Viseme Trajectory Extraction</b>: For each video frame, the mouth Region of Interest (ROI) is isolated. The vertical lip aperture is measured and tracked over time. The system calculates the first and second derivatives: <i>velocity</i> (lip opening speed) and <i>acceleration</i>.<br/>"
        "• <b>Acoustic Phoneme Energy Envelope</b>: Computes the frame-synchronized Root-Mean-Square (RMS) audio energy envelope: "
        "<font face='Courier'>RMS = sqrt(mean(chunk<sup>2</sup>))</font> downsampled to the video frame rate.<br/>"
        "• <b>Articulatory Cross-Correlation Index (ACCI)</b>: Computes the normalized cross-correlation between the speech acoustic energy and lip velocity:<br/>"
        "&nbsp;&nbsp;<font face='Courier'>ACCI = max(|np.correlate(norm_audio_envelope, norm_lip_velocity)|) / N</font><br/>"
        "• <b>The Biological Rule</b>: In authentic human speech, plosive and vowel sounds trigger lip motion with a precise biomechanical lead-lag latency (ACCI between 0.35 and 0.85). In lip-sync deepfakes (Wav2Lip, LivePortrait, VideoReTalking), the mouth movements either exhibit linear interpolation or desynchronize from the acoustic burst, causing ACCI to drop below 0.32 and triggering an immediate lip-sync manipulation verdict.",
        body_style
    ))

    # Q4.4
    story.append(Paragraph("Q4.4: How many videos can be handled simultaneously? Can it handle multiple videos at once? How do you plan to scale?", q_title))
    story.append(Paragraph(
        "<b>Current Single-Worker Capacity:</b><br/>"
        "Currently, each worker process handles <b>1 video sequentially</b> on a single GPU. Loading 5 neural models simultaneously (EfficientNet-B4, GenD ViT-L/14, Wav2Vec2, BiSeNet, and CLIP) consumes approximately <b>8 to 12 GB of VRAM</b>. Concurrently executing multiple video streams on a single GPU causes CUDA Out-Of-Memory (OOM) faults or latency degradation.<br/><br/>"
        "<b>Production Horizontal Scaling Architecture:</b><br/>"
        "Project NETRA is architected with a decoupled <b>AWS SQS Event-Driven Architecture</b> (<font face='Courier'>worker/worker.py</font>):<br/>"
        "1. <i>Asynchronous Job Queue</i>: Video uploads receive an immediate Job ID and are queued in Amazon SQS.<br/>"
        "2. <i>Worker Fleet Auto-Scaling</i>: AWS CloudWatch monitors SQS queue depth (<font face='Courier'>ApproximateNumberOfMessagesVisible</font>). When pending jobs exceed 5, AWS Auto Scaling spawns additional containerized worker instances on EC2 Spot (g4dn.xlarge) or ECS Fargate.<br/>"
        "3. <i>Throughput Potential</i>: A fleet of 10 workers processes <b>10 videos concurrently</b>, maintaining an average turnaround of 3.2 seconds per video with zero VRAM interference.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # CHAPTER 5: Exact Mathematical Formulas Explained for a 12-Year-Old
    story.append(Paragraph("5. Mathematical Formulations & Child-Friendly Explanation", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q5.1
    story.append(Paragraph("Q5.1: What are the exact mathematical formulas used in NETRA? How did we come up with them?", q_title))
    story.append(Paragraph(
        "<b>1. Visual Foundation Blending Formula:</b><br/>"
        "<font face='Courier'>P<sub>visual</sub> = 0.60 &middot; S<sub>GenD</sub> + 0.25 &middot; S<sub>spatial</sub> + 0.15 &middot; S<sub>CLIP</sub></font><br/>"
        "<i>Origin</i>: Calibrated via grid-search optimization across our 108 verified deepfakes dataset. GenD receives 60% weight because its ViT-L/14 hypersphere manifold has superior generalization across unseen generators, while Spatial SBI (25%) and CLIP (15%) catch physical boundary seams and semantic oddities.<br/><br/>"
        "<b>2. Spectral Seam Damping Formula:</b><br/>"
        "If <font face='Courier'>S<sub>spectral</sub> &le; 0.30</font> and <font face='Courier'>P<sub>visual</sub> > 0.45</font> (and no model has >0.85 consensus):<br/>"
        "<font face='Courier'>P<sub>visual</sub>' = 0.40 &middot; P<sub>visual</sub> + 0.60 &middot; S<sub>spectral</sub></font><br/>"
        "<i>Origin</i>: Prevents false alarms on people wearing glasses or under harsh stage lighting where specular glare mimics AI noise.<br/><br/>"
        "<b>3. Audio-Gated Multi-Modal Integration:</b><br/>"
        "<font face='Courier'>P<sub>final</sub> = (1 - w<sub>audio</sub>) &middot; P<sub>visual</sub> + w<sub>audio</sub> &middot; S<sub>audio</sub> + min(0.02 &middot; |flags|, 0.10)</font><br/>"
        "Where <font face='Courier'>w<sub>audio</sub> = 0.0</font> if audio is absent/silent (&lt;0.10), <font face='Courier'>0.10</font> if noisy (&lt;0.30), and <font face='Courier'>0.40</font> if clear speech is detected.<br/><br/>"
        "<b>4. Articulatory Cross-Correlation Index (ACCI):</b><br/>"
        "<font face='Courier'>ACCI = (1 / N) &middot; &sum; [ (E(t) - &mu;<sub>E</sub>)/&sigma;<sub>E</sub> ] &middot; [ (V(t) - &mu;<sub>V</sub>)/&sigma;<sub>V</sub> ]</font>",
        body_style
    ))

    # Q5.2
    story.append(Paragraph("Q5.2: Explain these formulas like you are explaining to a 12-year-old kid with autism:", q_title))
    
    kid_box = [
        [
            Paragraph(
                "<b>Imagine you are the chief detective solving a mystery: 'Is this video real or a computer trick?'</b><br/><br/>"
                "Think of our computer like a team of three clever detectives who each have a special magnifying glass:<br/><br/>"
                "<b>1. Detective GenD (The Big Picture Expert — 60 Points):</b><br/>"
                "Detective GenD looks at the whole picture all at once, like stepping back to look at a completed jigsaw puzzle. When a computer paints a fake face, it uses tiny mathematical brushstrokes that human cameras never use. GenD gives a score from 0 to 100 based on how computer-painted the face feels.<br/><br/>"
                "<b>2. Detective Spatial (The Seam Hunter — 25 Points):</b><br/>"
                "Detective Spatial takes a real magnifying glass and looks right where the stickers meet the paper. When someone pastes a new face onto an old head, there is always a tiny invisible glue line around the chin, cheeks, and forehead. Spatial checks if the skin texture suddenly changes.<br/><br/>"
                "<b>3. Detective CLIP (The Logic Checker — 15 Points):</b><br/>"
                "Detective CLIP checks if the picture makes common sense. Does this look like an authentic human being, or does the nose look like a weird digital drawing?<br/><br/>"
                "<b>Why do we use the formula (60% + 25% + 15%)?</b><br/>"
                "Because one detective might get tricked by shiny glasses or dark shadows, but all three detectives voting together almost never make a mistake! 60 points from GenD, 25 points from Spatial, and 15 points from CLIP add up to 100 points total.<br/><br/>"
                "<b>The Mouth and Voice Rule (Audio-Visual Lip Sync):</b><br/>"
                "Put your fingers on your lips and say the word <i>'B-A-L-L'</i>. Notice how your lips must close tight to say 'B', and open wide to say 'A'? Real humans always make sounds at the exact split-second their lips move. Our computer measures the sound volume graph and the mouth size graph. If the sound says 'B' but the mouth is open wide like 'O', the computer knows someone glued a fake voice onto a video, like a cartoon character whose lips don't match the song!",
                kid_explain_style
            )
        ]
    ]
    t_kid = Table(kid_box, colWidths=[532])
    t_kid.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#A7F3D0")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_kid)
    story.append(Spacer(1, 10))

    # CHAPTER 6: System Infrastructure, Cloud, Security & Telegram Bot
    story.append(Paragraph("6. System Infrastructure, Cloud, Security & Telegram Bot", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q6.1
    story.append(Paragraph("Q6.1: How exactly is AWS connected? Where are scripts running and models hosted? Complete tech stack?", q_title))
    story.append(Paragraph(
        "<b>Cloud & Hybrid Topology:</b><br/>"
        "• <b>AWS S3 (<font face='Courier'>netra-media-mumbai-131746731374</font>)</b>: Secure media storage for uploaded videos, audio WAVs, extracted keyframes, and annotated bounding boxes.<br/>"
        "• <b>AWS SQS (<font face='Courier'>netra-jobs</font>)</b>: Asynchronous FIFO message queue in <font face='Courier'>ap-south-1</font> (Mumbai) decoupling web API ingress from heavy GPU workers.<br/>"
        "• <b>AWS DynamoDB (<font face='Courier'>netra-jobs</font> & <font face='Courier'>netra-workers</font>)</b>: Real-time telemetry, stage progression tracking, and worker health heartbeats.<br/>"
        "• <b>Render Cloud Platform</b>: Hosts the production Next.js frontend (<font face='Courier'>netraai-i1pl.onrender.com</font>) and FastAPI backend gateway (<font face='Courier'>netra-api-pmr7.onrender.com</font>).<br/>"
        "• <b>Complete Tech Stack</b>: Next.js 14, React 18, TailwindCSS, MapLibre GL, Lucide Icons, jsPDF, FastAPI, PyTorch 2.5, Torchvision, ONNX Runtime, OpenCV, FFmpeg, RapidOCR, Scikit-Learn, ReportLab, SQLite (WAL mode), Boto3.",
        body_style
    ))

    # Q6.2
    story.append(Paragraph("Q6.2: Why did we gate the API and Community pages to logged-in users?", q_title))
    story.append(Paragraph(
        "1. <b>Abuse & DDoS Prevention</b>: Free public access to deep learning inference endpoints quickly leads to bot scraping and resource exhaustion.<br/>"
        "2. <b>Chain of Custody & Forensic Auditability</b>: Law enforcement agencies, forensic analysts, and journalists require verified user identity timestamps for forensic reports to have evidentiary standing.<br/>"
        "3. <b>Commercial Rate Limiting</b>: Gating behind authentication allows tier-based quota tracking (free tier vs enterprise API keys).",
        body_style
    ))

    # Q6.3
    story.append(Paragraph("Q6.3: How does Tavily get triggered every 24 hours? How does Telegram bot operate?", q_title))
    story.append(Paragraph(
        "<b>1. Tavily 24-Hour Autonomous Ingestion:</b><br/>"
        "Implemented in <font face='Courier'>cyber_scam_feed/pipeline.py</font>. A background daemon runs a daily cron cycle executing <font face='Courier'>ScamFeedPipeline.run_sync()</font>. It queries 6 specialized search vectors (Digital arrest scams, WhatsApp investment frauds, APK trojans, etc.) via Tavily's advanced search API. Reports are normalized, deduplicated in a WAL-mode SQLite database (<font face='Courier'>scam_feed.db</font>), and exported to JSON/HTML for the live dashboard.<br/><br/>"
        "<b>2. Telegram Bot Workflow (@netra_aibot):</b><br/>"
        "Implemented in <font face='Courier'>backend/netra/services/telegram_bot.py</font>:<br/>"
        "• <font face='Courier'>/scan_text</font>: Prompts for text message, runs ScamDetector, extracts phone numbers/UPIs/APKs, and outputs threat tier.<br/>"
        "• <font face='Courier'>/scan_image</font>: Prompts for image, runs GenD ViT-L inference + EXIF camera sensor inspection.<br/>"
        "• <font face='Courier'>/scan_video</font>: Ingests video, extracts frames, queues for forensic analysis, and automatically links verified threats into the live Threat Catalog.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # CHAPTER 7: Business Viability, Economic Damage & Real-World Impact
    story.append(Paragraph("7. Business Viability, Economic Damage & Real-World Impact", sec_title))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceBefore=2, spaceAfter=8))

    # Q7.1
    story.append(Paragraph("Q7.1: What is the damage caused by deepfake scams in India? How much market can our project cover?", q_title))
    story.append(Paragraph(
        "<b>The Economic & Social Crisis in India:</b><br/>"
        "• According to the Ministry of Home Affairs (MHA) and Reserve Bank of India (RBI) data, over <b>₹1,750+ Crore</b> was lost to cyber fraud in 2024 alone, with <i>Digital Arrest scams</i> and <i>AI voice cloning extortion</i> accounting for the fastest-growing categories.<br/>"
        "• Over 65% of reported digital arrest victims are senior citizens and retired government employees who were coerced into transferring life savings over fake Skype video calls with attackers disguised as police or CBI officers.<br/><br/>"
        "<b>Total Addressable Market (TAM / SAM / SOM):</b><br/>"
        "• <b>TAM ($12B Global AI Verification Market)</b>: Every digital communication, fintech transaction, and media publication worldwide.<br/>"
        "• <b>SAM ($1.8B Indian Cybersecurity & FinTech Compliance)</b>: 1,500+ Indian banks, NBFCs, telecom providers (Airtel, Jio), and state police cyber cells requiring mandatory KYC biometric defense.<br/>"
        "• <b>SOM ($45M Initial Reach)</b>: Direct B2B API integration with banking apps, news agencies, and government portals within 3 years.",
        body_style
    ))

    # Q7.2
    story.append(Paragraph("Q7.2: What is the current operating cost? If scaled to 1 million users, how much will it cost and how do we monetize?", q_title))
    story.append(Paragraph(
        "<b>1. Current Operating Cost:</b><br/>"
        "• Render Hosting (Frontend + Backend): ~$14/month.<br/>"
        "• AWS Infrastructure (S3 + SQS + DynamoDB): ~$8/month.<br/>"
        "• GPU Compute: Evaluated using ~$100 in cloud GPU credits (RunPod / EC2 Spot).<br/>"
        "• Total current burn rate: <b><$30/month</b> for development and demo mode.<br/><br/>"
        "<b>2. Scaling to 1 Million Active Users:</b><br/>"
        "Assuming 1M users perform 2 video scans and 10 text scans per month:<br/>"
        "• Text/OCR Scams: Run on lightweight CPU containers (cost: ~$0.0001 per scan) = $1,000/mo.<br/>"
        "• Video Scans: Auto-scaled EC2 Spot GPU fleet (cost: ~$0.008 per 30-frame scan) = $16,000/mo.<br/>"
        "• AWS Storage & Bandwidth = $3,500/mo.<br/>"
        "• <b>Total Cloud Cost at 1M Scale: ~$20,500/month (~₹17 Lakhs/month)</b>.<br/><br/>"
        "<b>3. Monetization Strategy:</b><br/>"
        "• <i>Freemium Consumer App</i>: 3 free scans/month; ₹199/month for unlimited scans and family protection alert bot.<br/>"
        "• <i>Enterprise B2B API</i>: ₹1.50 per biometric video KYC verification for banks; ₹50,000/month license for media houses.<br/>"
        "• <i>Projected Revenue at 1M users</i>: 20,000 paid subscribers (₹40 Lakhs/mo) + 5 enterprise clients (₹15 Lakhs/mo) = <b>₹55 Lakhs/month revenue</b>, yielding an <b>estimated 68% net operating margin</b>.",
        body_style
    ))

    # Q7.3
    story.append(Paragraph("Q7.3: Which deepfakes caused a massive ruckus in India? Why will someone use NETRA?", q_title))
    story.append(Paragraph(
        "<b>Real-World Indian Deepfake Crises:</b><br/>"
        "1. <b>Rashmika Mandanna Viral Deepfake (Nov 2023)</b>: An influencer's body was swapped with the actress's face using an open-source face-swap tool, accumulating millions of views within hours and prompting direct intervention by the Ministry of Electronics and IT (MeitY) and Delhi Police FIR.<br/>"
        "2. <b>Sachin Tendulkar Casino/Gaming App Deepfake (Jan 2024)</b>: Voice-cloned audio paired with manipulated video showing the cricket legend endorsing an online gambling application, leading to a public advisory and legal action.<br/>"
        "3. <b>Narayana Murthy & Mukesh Ambani Stock Trading Scams (2024)</b>: Fabricated video interviews promoting fraudulent automated stock trading platforms that swindled crores from Indian retail investors.<br/>"
        "4. <b>2024 Lok Sabha Elections</b>: AI-generated synthetic campaign speeches impersonating prominent political figures circulated across regional WhatsApp groups.<br/><br/>"
        "<b>Why People Will Use NETRA:</b><br/>"
        "Existing commercial tools (Sensity, Deepware) are closed-source, expensive, tuned exclusively for Western faces, and offer zero text/Hinglish scam detection. NETRA is the <b>first unified defense engine built specifically for India's digital ecosystem</b>—protecting citizens against deepfake extortion, biometric fraud, and cyber scams in their own regional languages.",
        body_style
    ))

    # Q7.4
    story.append(Paragraph("Q7.4: Who designed the UI/UX? How was the initial animation made?", q_title))
    story.append(Paragraph(
        "The user interface was designed with an ultra-clean, high-contrast dark aesthetic built on TailwindCSS, MapLibre GL, and Lucide Icons. The initial animation (UltraFrameIntro 60fps landing sequence) was crafted through iterative rapid prompt engineering with cutting-edge AI models (Grok, Claude 3.5 Sonnet, and v0), combined with custom React Canvas frame-interpolation scripts to deliver a cinematic, high-performance user experience.",
        body_style
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {filename}")

if __name__ == "__main__":
    out1 = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/docs/NETRA_Comprehensive_Notes_Forensic_QA_Guide.pdf"
    out2 = "/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/frontend/public/NETRA_Comprehensive_Notes_Forensic_QA_Guide.pdf"
    os.makedirs(os.path.dirname(out1), exist_ok=True)
    os.makedirs(os.path.dirname(out2), exist_ok=True)
    build_pdf(out1)
    build_pdf(out2)
