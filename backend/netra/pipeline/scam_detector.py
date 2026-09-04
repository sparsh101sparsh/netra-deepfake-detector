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
            "FINANCIAL_EXTORTION_AND_CARD_THEFT": [
                r"\b(?:give|send|share|tell|provide|input|enter)\s*(?:me\s*)?(?:ur|your)?\s*(?:credit\s*card|debit\s*card|atm\s*card|card\s*number|cvv|cvv2|expiry|atm\s*pin|net\s*banking\s*password|login\s*credentials|otp)\b",
                r"\b(?:credit\s*card|debit\s*card|card\s*details|card\s*number|cvv2?|atm\s*pin|card\s*expiry|3-digit\s*code)\b",
                r"\b(?:send|transfer|wire|pay)\s*(?:me\s*)?(?:urgent\s*)?(?:money|cash|funds|amount|inr|rs\.?|\$)\b",
                r"\b(?:give\s*me\s*money|urgent\s*transfer|need\s*money\s*urgently|send\s*(?:money|cash)\s*fast)\b"
            ],
            "BANKING_UPI_PHISHING": [
                r"\b(kyc\s*(?:expiry|expire|suspended|pending|update|verify|verification)|pan\s*card|aadhaar\s*link|credit\s*card|debit\s*card|card\s*blocked|otp\s*verification|account\s*(?:block|blocked|suspended|frozen|warning))\b",
                r"\b(?:sbi|hdfc|icici|axis|pnb|bank)\s*(?:account|card)?\s*(?:has\s*been|is)?\s*(?:suspended|blocked|frozen|locked)\b",
                r"\b(reward\s*points\s*expire|lottery\s*winner|claim\s*refund|income\s*tax\s*refund|kbc\s*lottery|kbcwinner|won\s*rs)\b",
                r"\bhttps?://[^\s]+(?:kyc|verify|update|bank|sbi|otp)[^\s]*\b",
                r"\b(?:upi\s*[:\s]*|@)[a-zA-Z0-9_\.\-]+@(?:paytm|okaxis|okhdfcbank|upi|ybl|apl)\b"
            ],
            "JOB_SCAM": [
                r"\b(part\s*time\s*job|lik(?:e|ing)\s*(?:youtube|\w+\s*videos?)|telegram\s*(?:\w+\s*)?tasks?|earn\s*(?:rs\.?|inr|\$)?\s*[\d,]+|work\s*from\s*home|youtube\s*like)\b",
                r"\b(prepaid\s*task|rating\s*hotel|google\s*review\s*job)\b"
            ],
            "LOTTERY_PRIZE_FRAUD": [
                r"\b(lucky\s*draw|sim\s*card\s*lucky\s*draw|for\s*all\s*sim\s*cards|lottery|lucky\s*lottery|kbc|kaun\s*banega\s*crorepati|crorepati)\b",
                r"\b(won\s*(?:the|a)?\s*(?:prize|lottery|car|amount|cash)|prize\s*(?:of|money|amount)|collect\s*(?:your)?\s*prize|claim\s*(?:your)?\s*prize)\b",
                r"\b(only\s*whatsapp\s*call|whatsapp\s*call|kbc\s*(?:department|head\s*office|officer|winner|no|number)?|contact\s*only\s*(?:the\s*)?following\s*number)\b",
                r"(25[,\s]*00[,\s]*000|25\s*lakh|50\s*lakh|1\s*crore|cash\s*prize)",
                r"\b(state\s*bank\s*of\s*india|congratulations\s*(?:you)?\s*(?:have|heve|got)?\s*(?:won)?)\b",
                r"(लॉटरी|केबीसी|करोड़पति|बधाई\s*हो|आप\s*जीते\s*हैं|लकी\s*ड्रॉ|லாட்டரி|அதிர்ஷ்ட\s*லாட்டரி|பரிசு|வென்றுள்ளீர்கள்|ஸ்டேட்\s*பேங்க்|வாழ்த்துக்கள்|லாటరీ|లక్కీ\s*డ్రా|బహుమతి|గెలుచుకున్నారు)"
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
        if "FINANCIAL_EXTORTION_AND_CARD_THEFT" in matched_rules:
            rule_score_boost = max(rule_score_boost, 96)
        if "DIGITAL_ARREST" in matched_rules:
            rule_score_boost = max(rule_score_boost, 95)
        if "APK_MALWARE" in matched_rules:
            rule_score_boost = max(rule_score_boost, 94)
        if "LOTTERY_PRIZE_FRAUD" in matched_rules:
            rule_score_boost = max(rule_score_boost, 94)
        if "BANKING_UPI_PHISHING" in matched_rules:
            rule_score_boost = max(rule_score_boost, 92)
        if "ELECTRICITY_KYC" in matched_rules:
            rule_score_boost = max(rule_score_boost, 88)
        if "STOCK_TRADING_FRAUD" in matched_rules:
            rule_score_boost = max(rule_score_boost, 85)
        if "JOB_SCAM" in matched_rules:
            rule_score_boost = max(rule_score_boost, 82)

        final_score = max(score, rule_score_boost)
        is_scam = bool(matched_rules) or (final_score > 65)

        # Normalize confidence for safe messages
        confidence = final_score if is_scam else max(15, 100 - final_score)

        # Statutory legal citations mapping
        legal_mapping = {
            "financial_extortion_and_card_theft": "IT Act 2000 Section 66C (Identity Theft), Section 66D (Cheating by Personation) & BNS 2023 Section 318(4) (Cheating)",
            "digital_arrest": "IT Act 2000 Sec 66D, BNS 2023 Sec 204 (Impersonating Public Servant) & Sec 308(2) (Extortion)",
            "banking_upi_phishing": "IT Act 2000 Section 66D, BNS 2023 Section 318(4) (Financial Phishing)",
            "lottery_prize_fraud": "Lotteries Regulation Act 1998, IT Act Sec 66D, BNS Sec 318(4)",
            "apk_malware": "IT Act 2000 Section 43 & Section 66 (Hacking & Malware)",
            "stock_trading_fraud": "SEBI Act 1992 Section 12A (Fraudulent Practices), IT Act Sec 66D",
            "electricity_kyc": "IT Act 2000 Section 66D, BNS 2023 Section 318(4)",
            "job_scam": "BNS 2023 Section 318(4) & IT Act 2000 Section 66D"
        }

        # Determine primary scam typology and reasoning
        if matched_rules:
            scam_type = matched_rules[0].lower()
            reason = f"Detected high-risk cyber fraud pattern(s): {', '.join(r.replace('_', ' ') for r in matched_rules)}."
            legal_citations = legal_mapping.get(scam_type, "IT Act 2000 Section 66D, BNS 2023 Section 318(4)")
        elif is_scam:
            scam_type = "suspicious_message"
            reason = "Statistical TF-IDF linguistic patterns strongly correlate with known fraudulent communications."
            legal_citations = "IT Act 2000 Section 66D, BNS 2023 Section 318(4)"
        else:
            scam_type = "None"
            reason = "No known scam patterns or deceptive linguistic markers detected."
            legal_citations = None

        return {
            "is_scam": is_scam,
            "confidence": confidence,
            "risk_score": final_score if is_scam else min(25, final_score),
            "scam_type": scam_type,
            "reason": reason,
            "analysis_reason": reason,
            "legal_citations": legal_citations,
            "matched_rules": matched_rules,
            "analysis_method": "random_forest_ml + heuristic_rule_matrix",
        }

# Singleton instance
scam_detector_engine = ScamDetector()
