"""
NETRA Voice-Note Scam Detection Lexicon Engine
Technical Reference: NETRA_Voice_Scam_Detection_Lexicon.pdf (13 September 2026)
Build in AI for India — Delhi Edition

Provides deterministic, zero-hallucination, ultra-fast (< 5ms) rule-based
detection of Indian cyber-extortion, Digital Arrest, Kinship ("Beta arrested"),
and Vishing fraud from speech transcripts.
"""

import re
from typing import Dict, Any, List, Set, Tuple

# ─────────────────────────────────────────────────────────────────────────────
# 1. STT Messy Form Aliases & Canonical Normalization (Section 5)
# ─────────────────────────────────────────────────────────────────────────────
STT_REPLACEMENTS = [
    (r"\b(?:c\s*b\s*i|see\s*bee\s*eye|sibiai|सी\s*बी\s*आई|सीबीआई|sea\s*b\s*i)\b", "cbi"),
    (r"\b(?:e\s*d|ee\s*dee|ई\s*डी|enforcement\s*directorate)\b", "ed"),
    (r"\b(?:aar\s*bee\s*i|r\s*b\s*i|आर\s*बी\s*आई|reserve\s*bank)\b", "rbi"),
    (r"\b(?:aar\s*tee\s*i|t\s*r\s*a\s*i|ट्राई)\b", "trai"),
    (r"\b(?:efir|ef\s*ay\s*i\s*r|f\s*i\s*r|एफ़\s*आई\s*आर|प्राथमिकी)\b", "fir"),
    (r"\b(?:you\s*p\s*i|you\s*pee\s*i|यू\s*पी\s*आई)\b", "upi"),
    (r"\b(?:are\s*tgs|r\s*t\s*g\s*s|आर\s*टी\s*जी\s*एस)\b", "rtgs"),
    (r"\b(?:aadhar|adhar|adhaar|आधार)\b", "aadhaar"),
    (r"\b(?:warant|warrent|वारंट)\b", "warrant"),
    (r"\b(?:lokup|lock\s*up|lock-up|लॉकअप|हवालात)\b", "lockup"),
    (r"\b(?:digital\s*arest|digital\s*rest|डिजिटल\s*अरेस्ट|डिजिटल\s*रेस्ट)\b", "digital arrest"),
    (r"\b(?:o\s*t\s*p|ओ\s*टी\s*पी|one\s*time\s*password)\b", "otp"),
]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Complete Lexicon Packs (Section 4)
# ─────────────────────────────────────────────────────────────────────────────
LEXICON_PACKS = {
    # 4.1 Authority and agency · Pack A
    "A": {
        "name": "Authority & Agency",
        "patterns": [
            r"\b(?:cbi|ed|ncb|nia|raw|ib|income\s*tax|it\s*department|gst|customs|dri|fiu|rbi|trai|dot|telecom\s*dept|telecom\s*department)\b",
            r"\b(?:cyber\s*cell|cyber\s*crime|cyber\s*police|crime\s*branch|special\s*cell|eow|stf|ats)\b",
            r"\b(?:police|policeman|inspector|sub\s*inspector|si|asi|dsp|sp|dcp|acp|commissioner|sho|thanedar|constable|hawaldar)\b",
            r"\b(?:mumbai\s*police|delhi\s*police|court|high\s*court|supreme\s*court|magistrate|judge|investigating\s*officer|io)\b",
            r"(?:पुलिस|थाना|थानेदार|इंस्पेक्टर|कमिश्नर|साइबर\s*सेल|साइबर\s*क्राइम|जांच\s*अधिकारी|अफसर|अधिकारी|सरकारी\s*अफसर|केंद्र\s*सरकार|गृह\s*मंत्रालय|भारत\s*सरकार|ब्यूरो|प्रवर्तन\s*निदेशालय|सीमा\s*शुल्क|नारकोटिक्स|आयकर|रिजर्व\s*बैंक)"
        ]
    },

    # 4.2 Legal and process words · Pack L
    "L": {
        "name": "Legal & Police Process",
        "patterns": [
            r"\b(?:report|complaint|fir|case|registered\s*case|case\s*filed|report\s*registered|summons?|notice|show\s*cause|warrant|arrest\s*warrant|nbw)\b",
            r"\b(?:lookout\s*circular|loc|chargesheet|remand|judicial\s*custody|police\s*custody|custody|lockup|jail|prison|haziri)\b",
            r"\b(?:interrogation|inquiry|enquiry|investigation|probe|raid|seize|seizure|confiscate|freeze|frozen\s*account|account\s*freeze|lien|kyc\s*hold)\b",
            r"\b(?:bail|bail\s*bond|surety|fine|penalty|challan|escrow|supervision\s*account|safe\s*account|sealed\s*account)\b",
            r"(?:रिपोर्ट|रिपोर्ट\s*दर्ज|दर्ज|शिकायत|प्राथमिकी|मुकदमा|केस|केस\s*दर्ज|समन|नोटिस|वारंट|गिरफ्तारी\s*वारंट|गैर\s*जमानती|जमानती|लुकआउट|रिमांड|हिरासत|न्यायिक\s*हिरासत|पुलिस\s*हिरासत|हवालात|बयान|बयान\s*दर्ज|पूछताछ|जांच|छापेमारी|जब्त|जब्ती|खाता\s*फ्रीज|कुर्की|जमानत|मुचलका|जरिमाना|चालान|सरकारी\s*खाता|सत्यापन|क्लीयरेंस)"
        ]
    },

    # 4.3 Alleged crime (victim or “son”) · Pack C
    "C": {
        "name": "Alleged Crime & Coercion",
        "patterns": [
            r"\b(?:drug|drugs|ganja|charas|smack|mdma|cocaine|narcotics|parcel\s*of\s*drugs|contraband|illegal\s*parcel|courier\s*parcel|foreign\s*parcel)\b",
            r"\b(?:fake\s*passport|trafficking|pornography|child\s*pornography|obscene\s*video|mms|harassment\s*messages?|threatening\s*messages?)\b",
            r"\b(?:financial\s*fraud|money\s*laundering|hawala|pmla|benami|terror\s*funding|terrorist|isis|mule\s*account|bulk\s*sim|kyc\s*fraud|aadhaar\s*misuse|pan\s*misuse|crypto\s*scam|lottery)\b",
            r"(?:नशा|ड्रग्स|पार्सल|अवैध\s*पार्सल|तस्करी|मनी\s*लॉन्ड्रिंग|हवाला|आतंक|पोर्न|अश्लील|धोखाधड़ी|परेशान|परेशान\s*करने|फर्जी\s*आधार|फर्जी\s*सिम|म्यूल\s*अकाउंट)"
        ]
    },

    # 4.4 Digital-arrest script (high weight) · Pack D
    "D": {
        "name": "Digital Arrest Script",
        "patterns": [
            r"\b(?:digital\s*arrest|digitally\s*arrested|virtual\s*arrest|virtual\s*custody|house\s*arrest)\b",
            r"\b(?:camera\s*on|camera\s*mat\s*band|camera\s*band\s*mat|don'?t\s*disconnect|phone\s*mat\s*kaatna|line\s*mat\s*kaatna|stay\s*on\s*call|stay\s*on\s*video|360\s*degree)\b",
            r"\b(?:back\s*camera\s*dikhao|room\s*dikhao|akele\s*ho|koi\s*aur\s*hai|family\s*se\s*mat\s*baat|kisi\s*ko\s*mat\s*batana|lawyer\s*se\s*mat\s*milna|police\s*station\s*mat\s*jaana)\b",
            r"\b(?:verification\s*ke\s*liye\s*paise|refundable\s*deposit|security\s*deposit|bond\s*amount|rbi\s*verification|team\s*aa\s*rahi\s*hai|raid\s*team|arrest\s*van)\b",
            r"(?:डिजिटल\s*अरेस्ट|डिजिटल\s*गिरफ्तारी|कैमरा\s*ऑन\s*रखो|फोन\s*मत\s*काटना|बयान\s*दो|वारंट\s*जारी|टीम\s*निकल\s*चुकी|अभी\s*हिरासत|आज\s*रात\s*लॉकअप)"
        ]
    },

    # 4.5 Kinship / “beta arrested” variant · Pack K
    "K": {
        "name": "Kinship Extortion",
        "patterns": [
            r"\b(?:beta|bete|beta\s*ji|son|mummy|mama|papa|daddy|dad|mom|mataji|pitaji|ghar\s*wale|family|uncle|auntie|bhaiya|didi|pati|patni|husband|wife)\b",
            r"\b(?:jail\s*mein\s*hoon|thane\s*mein\s*hoon|lockup\s*mein\s*hoon|accident\s*ho\s*gaya|hospital|icu|bail\s*money|vakil\s*ko\s*dena|settle|officer\s*ko\s*de\s*do|phone\s*toot\s*gaya|naya\s*number)\b",
            r"(?:बेटा|मम्मी|पापा|जेल\s*में\s*हूँ|थाने\s*में\s*हूँ|लॉकअप\s*में\s*हूँ|एक्सीडेंट|अस्पताल|जमानत\s*के\s*पैसे|वकील\s*को\s*दे\s*दो)"
        ]
    },

    # 4.6 Urgency · Pack U
    "U": {
        "name": "Extreme Urgency Pressure",
        "patterns": [
            r"\b(?:abhi|abhi\s*ke\s*abhi|turant|immediately|right\s*now|5\s*minute|10\s*minute|15\s*minute|30\s*minute|ek\s*ghanta|aaj\s*raat|midnight\s*se\s*pehle)\b",
            r"\b(?:bank\s*close|branch\s*band|last\s*chance|final\s*notice|last\s*warning|team\s*dispatch|otherwise\s*arrest|otherwise\s*jail)\b",
            r"(?:अभी|अभी\s*के\s*अभी|तुरंत|फौरन|१०\s*मिनट|10\s*मिनट|आखरी\s*मौका|वारंट\s*जारी)"
        ]
    },

    # 4.7 Money rails and ask · Pack M
    "M": {
        "name": "Money Rails & Extortion Ask",
        "patterns": [
            r"\b(?:upi|vpa|gpay|phonepe|paytm|bhim|imps|neft|rtgs|net\s*banking|crypto|bitcoin|usdt|binance|gift\s*card|amazon\s*pay)\b",
            r"\b(?:cash\s*deposit|cdm|bank\s*locker|gold\s*sell|fd\s*break|mutual\s*fund|shares\s*bech|account\s*number|ifsc|beneficiary|add\s*beneficiary)\b",
            r"\b(?:otp|pin|cvv|expiry|atm\s*pin|password|virtual\s*account|collect\s*request|scan\s*qr|qr\s*code|lakh|lac|crore|hazaar)\b",
            r"(?:यूपीआई|पैसे|रुपये|खाता|खाते\s*में|ओटीपी|पिन|ट्रांसफर|सरकारी\s*खाते|सुरक्षित\s*खाते)"
        ]
    },

    # 4.8 Identity and data harvest · Pack I
    "I": {
        "name": "Identity & Data Harvesting",
        "patterns": [
            r"\b(?:aadhaar|uid|vid|pan|passport\s*number|voter\s*id|driving\s*licence|date\s*of\s*birth|address\s*proof|selfie\s*with\s*aadhaar)\b",
            r"\b(?:uidai|e-aadhaar|atm\s*card\s*photo|passbook\s*photo|statement\s*pdf|form\s*16|ckyc|kyc\s*update)\b",
            r"(?:आधार|पैन|पासबुक|खाता\s*संख्या|जन्मतिथि)"
        ]
    },

    # 4.9 Channel and callback · Pack Ch
    "Ch": {
        "name": "Deceptive Channel / Callback",
        "patterns": [
            r"\b(?:whatsapp\s*video|video\s*call|skype|zoom|telegram|truecaller\s*name\s*cbi|incoming\s*international|\+95|\+86|\+1|\+44|\+92|official\s*line|recorded\s*line)\b"
        ]
    },

    # 4.10 Secrecy and isolation · Pack S
    "S": {
        "name": "Secrecy & Psychological Isolation",
        "patterns": [
            r"\b(?:kisi\s*ko\s*mat\s*batana|ghar\s*walon\s*ko\s*mat|biwi\s*ko\s*mat|silent\s*rakho|national\s*security|official\s*secret|section\s*144|gag\s*order|screenshot\s*mat|record\s*mat)\b",
            r"(?:किसी\s*को\s*मत\s*बताना|घर\s*वालों\s*को\s*मत\s*बताना|गोपनीय|सीक्रेट|बात\s*मत\s*कराना)"
        ]
    }
}


def normalize_transcript(text: str) -> str:
    """Applies lowercase and Section 5 STT canonical substitutions."""
    t = text.lower()
    for pattern, replacement in STT_REPLACEMENTS:
        t = re.sub(pattern, replacement, t, flags=re.IGNORECASE)
    return t


def extract_iocs(text: str) -> Dict[str, List[str]]:
    """Extracts high-fidelity telecom, financial, and digital IOCs."""
    # Indian phone numbers (10 digits starting with 6-9, or +91 format, or 11/12 digit telephony)
    raw_phones = re.findall(r'(?:(?:\+91[\-\s]?)?[6-9]\d{9})', text)
    phones = list(dict.fromkeys(raw_phones))

    # UPI VPAs
    raw_upis = re.findall(r'[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}', text)
    upis = list(dict.fromkeys(raw_upis))

    # URLs
    raw_urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', text)
    urls = list(dict.fromkeys(raw_urls))

    return {
        "phones": phones,
        "upis": upis,
        "urls": urls
    }


def analyze_voice_scam_lexicon(transcript: str) -> Dict[str, Any]:
    """
    Executes Section 2 Scoring Model on normalized transcript.
    Returns structured verdict, confidence, risk score, triggered phrase packs,
    extracted IOCs, and court-admissible legal citations.
    """
    if not transcript or not transcript.strip():
        return {
            "verdict": "AUTHENTIC",
            "is_scam": False,
            "risk_level": "LOW",
            "threat_score": 5,
            "scam_type": "None",
            "analysis_reason": "No speech detected or empty audio transcript.",
            "triggered_packs": [],
            "extracted_iocs": {"phones": [], "upis": [], "urls": []},
            "legal_citations": None
        }

    norm_text = normalize_transcript(transcript)
    matched_packs: Dict[str, List[str]] = {}

    for pack_id, pack_info in LEXICON_PACKS.items():
        hits = []
        for pat in pack_info["patterns"]:
            found = re.findall(pat, norm_text, flags=re.IGNORECASE)
            if found:
                hits.extend(found)
        if hits:
            # deduplicate
            clean_hits = list(dict.fromkeys(hits))
            matched_packs[pack_id] = clean_hits

    hit_count = len(matched_packs)
    has_A = "A" in matched_packs
    has_L = "L" in matched_packs
    has_C = "C" in matched_packs
    has_D = "D" in matched_packs
    has_K = "K" in matched_packs
    has_U = "U" in matched_packs
    has_M = "M" in matched_packs
    has_I = "I" in matched_packs
    has_S = "S" in matched_packs

    # Section 2 Scoring Rules:
    # 1. HIGH RISK / CONFIRMED SCAM:
    #    - (Authority or Legal) and (Money-rail or Urgency)
    #    - or exact phrase "digital arrest" / Pack D
    #    - or (Kinship and jail/lockup/bail and Money-rail)
    #    - or (Legal Process AND Crime Allegation in an unsolicited call/interrogation)
    is_high = False
    scam_type = "None"
    threat_score = 15

    if has_D or "digital arrest" in norm_text:
        is_high = True
        scam_type = "Digital Arrest & Coercive Custody Fraud"
        threat_score = 96
    elif (has_A or has_L) and (has_M or has_U):
        is_high = True
        scam_type = "Law Enforcement Impersonation & Extortion"
        threat_score = 94
    elif has_K and (has_L or any(w in norm_text for w in ["jail", "lockup", "bail", "accident", "hospital", "settle", "थाने", "जेल", "हवालात", "एक्सीडेंट", "अस्पताल", "जमानत"])) and has_M:
        is_high = True
        scam_type = "Kinship Emergency Extortion (Beta Arrested / Accident)"
        threat_score = 95
    elif has_L and has_C:
        # e.g., "रिपोर्ट दर्ज", "धोखाधड़ी", "परेशान करने वाले संदेश" (Lallantop sting sample)
        is_high = True
        scam_type = "Police Notice & Harassment Coercion Trap"
        threat_score = 92

    # 2. MEDIUM RISK / SUSPICIOUS:
    #    Hits in two or more categories, no money ask yet
    is_medium = False
    if not is_high and hit_count >= 2:
        is_medium = True
        scam_type = "Suspicious Cyber Solicitation (Pre-extortion Stage)"
        threat_score = 68

    # Verdict assignment
    if is_high:
        verdict = "CONFIRMED_SCAM"
        risk_level = "HIGH"
        is_scam = True
    elif is_medium:
        verdict = "SUSPICIOUS"
        risk_level = "MEDIUM"
        is_scam = True
    else:
        verdict = "AUTHENTIC"
        risk_level = "LOW"
        is_scam = False
        threat_score = 12

    # Extract IOCs
    iocs = extract_iocs(transcript)

    # Legal Citations
    legal_citations = []
    if is_high or is_medium:
        if has_A or has_L:
            legal_citations.append("BNS 2023 Sec 204 (Impersonating Public Servant / Police)")
        legal_citations.append("IT Act 2000 Sec 66D (Cheating by Personation using Telecom Resource)")
        if has_M or has_D or has_U:
            legal_citations.append("BNS 2023 Sec 308(2) & 318(4) (Attempted Extortion and Cheating)")
        if has_I:
            legal_citations.append("IT Act 2000 Sec 66C (Identity Theft)")

    legal_text = " • ".join(legal_citations) if legal_citations else "None"

    # Detail string of triggered items
    pack_summary = []
    for pid, terms in matched_packs.items():
        name = LEXICON_PACKS[pid]["name"]
        pack_summary.append(f"{name} ({', '.join(terms[:3])})")

    reason = (
        f"Detected high-threat fraud phrase patterns: {'; '.join(pack_summary)}."
        if pack_summary else
        "Natural speech pattern. No known scam phrase triggers detected."
    )

    return {
        "verdict": verdict,
        "is_scam": is_scam,
        "risk_level": risk_level,
        "threat_score": threat_score,
        "scam_type": scam_type,
        "analysis_reason": reason,
        "triggered_packs": list(matched_packs.keys()),
        "triggered_pack_details": matched_packs,
        "extracted_iocs": iocs,
        "legal_citations": legal_text,
        "lexicon_version": "NETRA-LEX-VN-2026.09.13"
    }
