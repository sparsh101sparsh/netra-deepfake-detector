"""
NETRA Image OCR & Scam Detection Pipeline
Extracts text from suspect images / screenshots using PaddleOCR/EasyOCR/Tesseract
and runs the extracted text through the NETRA Threat & Scam Intelligence Engine.
"""

import re
import io
import os
import time
import logging
from typing import Dict, Any, List, Optional
from PIL import Image

logger = logging.getLogger("netra.ocr_scam_pipeline")

# Lazy-loaded OCR engines
_rapid_ocr = None
_easyocr_reader = None
_paddle_ocr = None

def get_rapid_ocr():
    global _rapid_ocr
    if _rapid_ocr is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _rapid_ocr = RapidOCR()
        except Exception as e:
            logger.warning(f"RapidOCR initialization failed: {e}")
            _rapid_ocr = False
    return _rapid_ocr if _rapid_ocr is not False else None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            # Initialize for English (and Hindi if needed), lightweight CPU mode
            _easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception as e:
            logger.warning(f"EasyOCR initialization failed: {e}")
            _easyocr_reader = False
    return _easyocr_reader if _easyocr_reader is not False else None

def get_paddle_ocr():
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            from paddleocr import PaddleOCR
            _paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        except Exception as e:
            _paddle_ocr = False
    return _paddle_ocr if _paddle_ocr is not False else None

def extract_iocs_from_text(text: str) -> Dict[str, List[str]]:
    """Extract actionable Indicators of Compromise (IOCs) from text."""
    phones = list(set(re.findall(r'(?:(?:\+91[\-\s]?)?[6-9]\d{9})', text)))
    upis = list(set(re.findall(r'[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}', text)))
    urls = list(set(re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text)))
    apks = list(set(re.findall(r'[\w\-]+\.apk', text, re.IGNORECASE)))
    
    return {
        "phones": phones,
        "upis": upis,
        "urls": urls,
        "apks": apks
    }

def extract_text_from_image(image_input) -> Dict[str, Any]:
    """
    Extracts text from an image (bytes, PIL Image, or filepath)
    using available OCR engines (PaddleOCR -> EasyOCR -> Tesseract).
    """
    t0 = time.time()
    
    # 1. Load PIL image
    if isinstance(image_input, bytes):
        pil_img = Image.open(io.BytesIO(image_input)).convert('RGB')
    elif isinstance(image_input, str):
        pil_img = Image.open(image_input).convert('RGB')
    elif isinstance(image_input, Image.Image):
        pil_img = image_input.convert('RGB')
    else:
        raise ValueError("Unsupported image input format")

    extracted_lines = []
    engine_used = "none"

    # 1. Primary Engine: RapidOCR (Lightweight ONNX Runtime, fast CPU inference)
    rapid = get_rapid_ocr()
    if rapid:
        try:
            import numpy as np
            np_img = np.array(pil_img)
            ocr_res, _ = rapid(np_img)
            if ocr_res:
                for line in ocr_res:
                    txt = line[1]
                    if txt and str(txt).strip():
                        extracted_lines.append(str(txt).strip())
                engine_used = "RapidOCR (ONNX Engine)"
        except Exception as e:
            logger.warning(f"RapidOCR execution error: {e}")

    # 2. Fallback to PaddleOCR
    if not extracted_lines:
        paddle = get_paddle_ocr()
        if paddle:
            try:
                import numpy as np
                np_img = np.array(pil_img)
                result = paddle.ocr(np_img, cls=True)
                if result and result[0]:
                    for line in result[0]:
                        txt = line[1][0]
                        if txt.strip():
                            extracted_lines.append(txt.strip())
                    engine_used = "PaddleOCR v2.7"
            except Exception as e:
                logger.warning(f"PaddleOCR execution error: {e}")

    # 3. Fallback to EasyOCR
    if not extracted_lines:
        easy = get_easyocr_reader()
        if easy:
            try:
                import numpy as np
                np_img = np.array(pil_img)
                results = easy.readtext(np_img)
                for res in results:
                    txt = res[1]
                    if txt.strip():
                        extracted_lines.append(txt.strip())
                engine_used = "EasyOCR (PyTorch)"
            except Exception as e:
                logger.warning(f"EasyOCR execution error: {e}")

    # 4. Fallback to PyTesseract
    if not extracted_lines:
        try:
            import pytesseract
            raw_text = pytesseract.image_to_string(pil_img)
            lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
            if lines:
                extracted_lines = lines
                engine_used = "PyTesseract (Tesseract OCR)"
        except Exception as e:
            logger.warning(f"PyTesseract error: {e}")

    full_text = " ".join(extracted_lines).strip()
    elapsed_ms = int((time.time() - t0) * 1000)

    return {
        "engine_used": engine_used,
        "extracted_lines": extracted_lines,
        "full_text": full_text,
        "char_count": len(full_text),
        "word_count": len(full_text.split()),
        "processing_time_ms": elapsed_ms
    }

def run_image_ocr_and_scam_detection(image_bytes: bytes, filename: str = "uploaded_image.png") -> Dict[str, Any]:
    """
    Complete end-to-end multi-modal image analysis:
    1. Extract OCR text via RapidOCR / PaddleOCR / EasyOCR.
    2. Extract IOCs (Phone, UPI, APK, URL).
    3. Run text through NETRA Scam Detector Engine.
    4. Synthesize multi-modal risk assessment.
    """
    # 1. OCR Extraction
    ocr_result = extract_text_from_image(image_bytes)
    extracted_text = ocr_result["full_text"]

    # 2. Extract IOCs
    iocs = extract_iocs_from_text(extracted_text)

    # 3. Scam Detection on OCR Text
    from netra.pipeline.scam_detector import scam_detector_engine
    
    if extracted_text:
        scam_verdict = scam_detector_engine.detect(extracted_text)
    else:
        scam_verdict = {
            "is_scam": False,
            "risk_score": 10,
            "confidence": 35,
            "matched_rules": [],
            "scam_type": "UNVERIFIED_IMAGE",
            "reason": "No legible text detected in image. Please ensure image contains clear, legible text."
        }

    # 4. Synthesize Multi-Modal Verdict
    is_scam = scam_verdict.get("is_scam", False)
    risk_score = scam_verdict.get("risk_score", 0)
    matched_rules = scam_verdict.get("matched_rules", [])
    scam_type = scam_verdict.get("scam_type") or "SUSPICIOUS_MEDIA"

    # Check for critical keywords in IOCs
    if iocs["apks"]:
        risk_score = max(risk_score, 92)
        is_scam = True
        matched_rules.append(f"Malicious APK detected: {', '.join(iocs['apks'])}")
    if iocs["upis"] and ("pay" in extracted_text.lower() or "bill" in extracted_text.lower() or "urgent" in extracted_text.lower()):
        risk_score = max(risk_score, 88)
        is_scam = True
        matched_rules.append(f"Fraudulent UPI extraction: {', '.join(iocs['upis'])}")

    if not extracted_text:
        risk_level = "LOW"
        verdict_label = "NO MACHINE-READABLE TEXT DETECTED"
        recommendation_text = "Document contains no extractable text. Manual verification recommended."
    elif risk_score >= 75:
        risk_level = "CRITICAL"
        verdict_label = "CRITICAL SCAM / FORGED MEDIA DETECTED"
        recommendation_text = "Do NOT send money or call the contact number. Report to cybercrime.gov.in."
    elif risk_score >= 40:
        risk_level = "HIGH"
        verdict_label = "HIGH RISK FRAUDULENT SCREENSHOT"
        recommendation_text = "Suspected fraud. Verify authenticity directly with the organization."
    elif risk_score >= 20:
        risk_level = "MEDIUM"
        verdict_label = "CAUTION — SUSPICIOUS PATTERNS"
        recommendation_text = "Contains cautionary elements. Proceed with caution."
    else:
        risk_level = "LOW"
        verdict_label = "AUTHENTIC / LOW RISK MEDIA"
        recommendation_text = "Standard legitimate document signature."

    return {
        "status": "success",
        "filename": filename,
        "ocr_analysis": {
            "engine": ocr_result["engine_used"],
            "full_text": extracted_text,
            "lines_count": len(ocr_result["extracted_lines"]),
            "processing_time_ms": ocr_result["processing_time_ms"]
        },
        "scam_analysis": {
            "is_scam": is_scam,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "verdict": verdict_label,
            "scam_type": scam_type,
            "matched_rules": list(set(matched_rules)),
            "analysis_reason": scam_verdict.get("reason") or scam_verdict.get("llm_reason") or "OCR pattern analysis completed."
        },
        "extracted_iocs": iocs,
        "recommendation": recommendation_text
    }

