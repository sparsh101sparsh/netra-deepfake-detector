#!/usr/bin/env python3
"""
Canonical Smoke Test Suite — Indian Hinglish Scam Detector
Validates 3 canonical SCAM and 3 canonical SAFE inputs on Apple Silicon (MPS/CPU).
"""

import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from detector import ScamDetector

SMOKE_TESTS = [
    # ── SCAM EXAMPLES ──
    {
        "text": "Ji namaskar Aapka KYC pending hai. Account 2 ghante mein block ho jayega. OTP share kijiye.",
        "expected": "scam",
        "category": "KYC / OTP phishing"
    },
    {
        "text": "Amazon parcel on hold due to unpaid customs fee of Rs 499. Pay immediately at bit.ly/3xXyZ",
        "expected": "scam",
        "category": "Parcel customs extortion"
    },
    {
        "text": "CBI headquarters se bol raha hoon. Digital arrest order issued against your Aadhaar. Turant verify karo.",
        "expected": "scam",
        "category": "Digital arrest coercion"
    },
    
    # ── SAFE EXAMPLES ──
    {
        "text": "Hello ji Beta ghar aa gaya hoon, darwaza khol do.",
        "expected": "safe",
        "category": "Personal family message"
    },
    {
        "text": "SBI: Your OTP is 482193 for netbanking login. Do NOT share this OTP with anyone.",
        "expected": "safe",
        "category": "Legitimate bank notification"
    },
    {
        "text": "Kal 4 baje project meeting schedule hui hai, please attend on time.",
        "expected": "safe",
        "category": "Normal work schedule"
    }
]

def main():
    print("=" * 65)
    print("  CANONICAL SMOKE TEST SUITE — HINGLISH SCAM DETECTOR")
    print("=" * 65)
    
    detector = ScamDetector()
    print(f"Device: {detector.device}\n")
    
    passed = 0
    total = len(SMOKE_TESTS)
    
    for i, test in enumerate(SMOKE_TESTS, 1):
        res = detector.predict(test["text"])
        is_pass = res["label"] == test["expected"]
        passed += int(is_pass)
        status = "✅ PASS" if is_pass else "❌ FAIL"
        
        print(f"[{i}/{total}] {status} | Expected: {test['expected'].upper():4s} | Pred: {res['label'].upper():4s} | Prob: {res['prob_scam']*100:5.1f}%")
        print(f"      Category : {test['category']}")
        print(f"      Text     : \"{test['text']}\"")
        if res["rule_hits"]:
            print(f"      Rules    : {res['rule_hits']}")
        print(f"      Basis    : {res['decision_basis']}")
        print("-" * 65)
        
    print(f"\nResults: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
    print("=" * 65)
    
    if passed != total:
        sys.exit(1)
        
if __name__ == "__main__":
    main()
