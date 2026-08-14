import os
import re
import joblib
from typing import Dict, Any, List

class ScamDetector:
    """
    Deterministic Scam Detector for Project NETRA.
    Uses TF-IDF + Random Forest ML classifier combined with rule-based
    heuristic pattern matching (Digital Arrest, Phishing, KYC, UPI/Payment Extortion).
    Completely self-contained; does NOT use any LLMs or external AI APIs.
    """
    def __init__(self):
        models_dir = os.path.join(os.path.dirname(__file__), "models")
        rf_path = os.path.join(models_dir, "scam_rf_model.pkl")
        tfidf_path = os.path.join(models_dir, "tfidf_vectorizer.pkl")
        
        try:
            self.vectorizer = joblib.load(tfidf_path)
            self.rf_model = joblib.load(rf_path)
            self.rf_loaded = True
            print("Successfully loaded Random Forest Scam Detector models.")
        except Exception as e:
            self.rf_loaded = False
            print(f"Failed to load RF models: {e}")

        # Comprehensive pattern rules for Indian cyber crime typologies
        self.rules = {
            "DIGITAL_ARREST": [
                r"\b(digital\s*arrest|cbi|ed\s*officer|police\s*hq|supreme\s*court|warrant\s*issued|cyber\s*cell|customs\s*parcel|narcotics\s*control)\b",
                r"\b(skype\s*call|video\s*hearing|do\s*not\s*disconnect|house\s*arrest|stay\s*on\s*video|mumbai\s*customs)\b"
            ],
            "ELECTRICITY_KYC": [
                r"\b(electricity\s*(?:bill|power|office)?\s*(?:will\s*be\s*)?disconnect\w*|power\s*cut|update\s*(?:your\s*)?(?:bill|kyc)|contact\s*officer)\b",
                r"\b(unpaid\s*bill|previous\s*month\s*bill|consumer\s*number|electricity\s*office|power\s*officer)\b"
            ],
            "STOCK_TRADING_FRAUD": [
                r"\b(guaranteed\s*returns|vip\s*trading\s*group|institutional\s*account|upper\s*circuit|1000%\s*profit|sebi\s*registered\s*tip|guaranteed\s*profit)\b",
                r"\b(crypto\s*arbitrage|insider\s*tips|join\s*whatsapp\s*group|exclusive\s*allotment|stock\s*tips)\b"
            ],
            "APK_MALWARE": [
                r"\.(apk|exe|dmg|bat|scr|vbs)\b",
                r"\b(download\s*app|install\s*support\s*apk|quicksupport|anydesk|teamviewer|rustdesk)\b"
            ],
            "BANKING_UPI_PHISHING": [
                r"\b(kyc\s*(?:expiry|expire|suspended|pending|update|verify|verification)|pan\s*card|aadhaar\s*link|debit\s*card\s*blocked|otp\s*verification|account\s*(?:block|blocked|suspended|frozen|warning))\b",
                r"\b(?:sbi|hdfc|icici|axis|pnb|bank)\s*(?:account|card)?\s*(?:has\s*been|is)?\s*(?:suspended|blocked|frozen|locked)\b",
                r"\b(reward\s*points\s*expire|lottery\s*winner|claim\s*refund|income\s*tax\s*refund|kbc\s*lottery|kbcwinner|won\s*rs)\b",
                r"\bhttps?://[^\s]+(?:kyc|verify|update|bank|sbi|otp)[^\s]*\b",
                r"\b(?:upi\s*[:\s]*|@)[a-zA-Z0-9_\.\-]+@(?:paytm|okaxis|okhdfcbank|upi|ybl|apl)\b"
            ],
            "JOB_SCAM": [
                r"\b(part\s*time\s*job|lik(?:e|ing)\s*(?:youtube|\w+\s*videos?)|telegram\s*(?:\w+\s*)?tasks?|earn\s*(?:rs\.?|inr|\$)?\s*[\d,]+|work\s*from\s*home|youtube\s*like)\b",
                r"\b(prepaid\s*task|rating\s*hotel|google\s*review\s*job)\b"
            ]
        }

    def _extract_matched_rules(self, text_lower: str) -> List[str]:
        matched = []
        for category, patterns in self.rules.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    matched.append(category)
                    break
        return matched

    def detect(self, text: str) -> Dict[str, Any]:
        text_clean = text.strip()
        text_lower = text_clean.lower()
        score = 0
        
        # 1. Random Forest Inference
        if self.rf_loaded:
            try:
                X = self.vectorizer.transform([text_lower])
                proba = self.rf_model.predict_proba(X)[0]
                score = int(proba[1] * 100)
            except Exception as e:
                print(f"RF Inference error: {e}")

        # 2. Rule-based heuristic pattern matching
        matched_rules = self._extract_matched_rules(text_lower)

        # Rule score elevation: if strong heuristic patterns trigger, escalate score
        rule_score_boost = 0
        if "DIGITAL_ARREST" in matched_rules:
            rule_score_boost = max(rule_score_boost, 88)
        if "APK_MALWARE" in matched_rules:
            rule_score_boost = max(rule_score_boost, 92)
        if "ELECTRICITY_KYC" in matched_rules:
            rule_score_boost = max(rule_score_boost, 82)
        if "STOCK_TRADING_FRAUD" in matched_rules:
            rule_score_boost = max(rule_score_boost, 80)
        if "BANKING_UPI_PHISHING" in matched_rules:
            rule_score_boost = max(rule_score_boost, 85)
        if "JOB_SCAM" in matched_rules:
            rule_score_boost = max(rule_score_boost, 78)

        final_score = max(score, rule_score_boost)
        is_scam = bool(matched_rules) or (final_score > 65)

        # Normalize confidence for safe messages
        confidence = final_score if is_scam else max(15, 100 - final_score)

        # Determine primary scam typology and reasoning
        if matched_rules:
            scam_type = matched_rules[0].lower()
            reason = f"Detected high-risk cyber fraud pattern(s): {', '.join(r.replace('_', ' ') for r in matched_rules)}."
        elif is_scam:
            scam_type = "suspicious_message"
            reason = "Statistical TF-IDF linguistic patterns strongly correlate with known fraudulent communications."
        else:
            scam_type = "None"
            reason = "No known scam patterns or deceptive linguistic markers detected."

        return {
            "is_scam": is_scam,
            "confidence": confidence,
            "risk_score": final_score if is_scam else min(25, final_score),
            "scam_type": scam_type,
            "reason": reason,
            "analysis_reason": reason,
            "matched_rules": matched_rules,
            "analysis_method": "random_forest_ml + heuristic_rule_matrix",
        }

# Singleton instance
scam_detector_engine = ScamDetector()
