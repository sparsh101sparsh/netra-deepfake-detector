#!/usr/bin/env python3
"""
Indian Hinglish Scam Detector — Hybrid Inference CLI
Hardware: MacBook Air M4 (Apple Silicon MPS / CPU)
Backbone: bert-base-multilingual-cased + LoRA Adapter
"""

import sys
import json
import re
import argparse
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoConfig
from peft import PeftModel

MODEL_ID = "bert-base-multilingual-cased"
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
ADAPTER_DIR = PROJECT_ROOT / "models" / "lora_best"

MAX_LEN = 128
LABEL2ID = {"safe": 0, "scam": 1}
ID2LABEL = {0: "safe", 1: "scam"}

# ─── Hybrid Rule Engine ───────────────────────────────────────────────────────
RULES = {
    "UPI_ID": (
        re.compile(r"[\w.\-]+@(oksbi|okicici|okhdfcbank|okaxis|ybl|paytm|upi|ibl|axl)", re.I),
        "high",
        "Suspicious direct UPI VPA handle detected"
    ),
    "SHORT_URL": (
        re.compile(r"(bit\.ly|tinyurl\.com|t\.ly|cutt\.ly|is\.gd|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)", re.I),
        "high",
        "Shortened/obfuscated link commonly used in phishing"
    ),
    "DIGITAL_ARREST": (
        re.compile(r"(digital arrest|digitally arrested|cyber arrest)", re.I),
        "high",
        "Digital arrest extortion scam pattern"
    ),
    "AUTHORITY_IMPERSON": (
        re.compile(r"\b(cbi|customs|income tax|enforcement directorate|ed office|cyber cell|mha)\b.{0,50}(arrest|notice|warrant|case|fine|block)", re.I),
        "high",
        "Government authority impersonation with coercive threat"
    ),
    "OTP_SHARE_REQUEST": (
        re.compile(r"(otp|pin|cvv|password)\s*(share|batao|dena|send|bhejo|dijiye|de do|bataiye)", re.I),
        "high",
        "Active solicitation of sensitive OTP/PIN credentials"
    ),
    "LOTTERY_PRIZE_SCAM": (
        re.compile(r"(lucky draw|lottery|jackpot|crorepati|kbc|kaun banega crorepati|all india sim competition|ghar baithe jeeto)", re.I),
        "high",
        "Fake lottery / KBC lucky draw prize scam signature"
    ),
    "ADVANCE_FEE_SCAM": (
        re.compile(r"(paying|pay|deposit|transfer)\s*(all the\s*)?(govt\s*)?(taxes|charges|fee|gst|duty)\s*(to|before|after)?.*(draw|claim|receive|cheque|prize|latter)", re.I),
        "high",
        "Advance-fee fraud: requesting upfront fee/tax to claim fake prize"
    ),
    "UNSOLICITED_WINNER": (
        re.compile(r"(you (are win|have win|have won|are selected)|winner announcement|winning member club).*(rs|inr|lakh|crore|\d{5,})", re.I),
        "high",
        "Unsolicited prize / jackpot winner notification"
    ),
    "PARCEL_SCAM": (
        re.compile(r"(parcel|courier|shipment|fedex|delhivery)\s*(hold|seized|customs|clearance|block|unpaid)", re.I),
        "medium",
        "Fake courier/customs delivery extortion pattern"
    ),
    "ACCOUNT_BLOCK": (
        re.compile(r"(account|khata|sim|credit card|debit card)\s*(block|band|suspend|freeze|deactivate)", re.I),
        "medium",
        "Account blockage urgency lure"
    ),
    "KYC_URGENCY": (
        re.compile(r"kyc\s*(pending|update|verify|expired|karo|dijiye|karna)", re.I),
        "medium",
        "KYC expiration / forced update urgency lure"
    ),
    "SAFE_OTP_ALERT": (
        re.compile(r"(your otp is \d{4,8}.{0,40}do not share|never share this otp|otp valid for \d+ min)", re.I),
        "safe",
        "Legitimate automated bank OTP notification banner"
    ),
    "SAFE_BANK_ALERT": (
        re.compile(r"(sbi|hdfc|icici|axis|kotak)\s*:.*\d{4,6}.*(account|card|upi|netbanking)", re.I),
        "safe",
        "Legitimate automated transactional bank alert"
    ),
}

SEVERITY_PRIORITY = {"high": 3, "medium": 2, "safe": 1, "none": 0}

def apply_rules(text: str):
    hits = []
    max_sev = "none"
    reasons = []
    
    for rule_name, (pat, sev, desc) in RULES.items():
        if pat.search(text):
            hits.append(f"{rule_name}[{sev}]")
            reasons.append(desc)
            if SEVERITY_PRIORITY[sev] > SEVERITY_PRIORITY[max_sev]:
                max_sev = sev
                
    return hits, max_sev, reasons

class ScamDetector:
    def __init__(self, adapter_path: str = None, device_str: str = None):
        if device_str is None:
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = torch.device(device_str)
            
        adapter_dir = Path(adapter_path) if adapter_path else ADAPTER_DIR
        
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        cfg = AutoConfig.from_pretrained(MODEL_ID, num_labels=2, label2id=LABEL2ID, id2label=ID2LABEL)
        cfg.use_cache = False
        
        base_model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_ID, config=cfg, ignore_mismatched_sizes=True, low_cpu_mem_usage=False
        )
        
        if adapter_dir.exists():
            self.model = PeftModel.from_pretrained(base_model, str(adapter_dir))
        else:
            self.model = base_model
            
        self.model.to(self.device)
        self.model.eval()

    def predict(self, text: str) -> dict:
        inputs = self.tokenizer(
            text, return_tensors="pt", max_length=MAX_LEN, truncation=True, padding=True
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
            model_prob_scam = float(probs[1])
            
        rule_hits, severity, rule_reasons = apply_rules(text)
        
        # Arbitration logic: Safe rule overrides naive token bias unless high threat is present
        has_high_threat = severity == "high"
        has_safe_signal = severity == "safe"
        
        if has_safe_signal and not has_high_threat:
            final_label = "safe"
            final_prob = min(model_prob_scam * 0.1, 0.15)
            decision_basis = "Verified legitimate transactional / bank notification pattern (safe rule override)"
        elif has_high_threat:
            final_label = "scam"
            final_prob = max(model_prob_scam, 0.90)
            decision_basis = "High-severity threat signature detected (e.g. digital arrest / OTP solicitation / phishing link)"
        elif model_prob_scam >= 0.65:
            final_label = "scam"
            final_prob = model_prob_scam
            decision_basis = "High model confidence on contextual scam semantics"
        elif severity == "medium" and model_prob_scam > 0.40:
            final_label = "scam"
            final_prob = model_prob_scam
            decision_basis = "Urgency pattern detected + affirmative model score"
        else:
            final_label = "safe"
            final_prob = model_prob_scam
            decision_basis = "No strong scam signals or coercive urgency patterns detected"
            
        return {
            "text": text,
            "label": final_label,
            "prob_scam": round(final_prob, 4),
            "model_prob_scam": round(model_prob_scam, 4),
            "rule_hits": rule_hits,
            "rule_severity": severity,
            "decision_basis": decision_basis,
            "device": str(self.device)
        }

def main():
    parser = argparse.ArgumentParser(description="Indian Hinglish Scam Detector")
    parser.add_argument("text", nargs="?", help="Text message or call transcript to analyze")
    parser.add_argument("--device", default=None, help="Device: 'mps', 'cpu', or 'cuda'")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    if not args.text:
        print("Usage: python 05_predict.py 'Aapka KYC update karna hai, OTP share karo'")
        sys.exit(1)

    detector = ScamDetector(device_str=args.device)
    res = detector.predict(args.text)

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        badge = "🚨 SCAM DETECTED" if res["label"] == "scam" else "✅ SAFE MESSAGE"
        print(f"\n{'='*55}")
        print(f"  {badge}")
        print(f"{'='*55}")
        print(f"Text         : {res['text']}")
        print(f"Prediction   : {res['label'].upper()} (Scam Probability: {res['prob_scam']*100:.1f}%)")
        print(f"Model Score  : {res['model_prob_scam']*100:.1f}%")
        print(f"Rule Matches : {', '.join(res['rule_hits']) if res['rule_hits'] else 'None'}")
        print(f"Decision     : {res['decision_basis']}")
        print(f"Inference On : {res['device']}")
        print(f"{'='*55}\n")

if __name__ == "__main__":
    main()
