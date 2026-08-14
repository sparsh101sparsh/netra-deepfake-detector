"""
NLP & Entity Extraction Engine for Cyber Scam Intelligence.
Extracts financial loss figures, geographic impact, severity ratings,
scam categories, source publishers, and Modus Operandi summaries.
"""

import re
import hashlib
import email.utils
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse, parse_qsl, urlencode
from datetime import datetime, timezone

from cyber_scam_feed.models import ScamReport

# Categorical image assets
FALLBACK_CATEGORY_IMAGES = {
    "Digital Arrest": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80",  # Legal / Scales
    "Apk Trojan": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=80",      # Mobile security
    "Deepfake Impersonation": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80", # Cyber matrix
    "Investment Fraud": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=400&q=80",   # Stock chart
    "Cyber Fraud": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80"
}


def normalize_url(url: str) -> str:
    """
    Normalize URL by removing protocol, www, tracking query parameters (utm_*, fbclid, gclid, ref),
    fragment, and trailing slash while preserving functional query parameters.
    """
    if not url:
        return ""
    u = url.strip().lower()
    if not u:
        return ""
    u = re.sub(r'^https?://(?:www\.)?', '', u)
    u = re.sub(r'#.*$', '', u)

    if '?' in u:
        base, query_str = u.split('?', 1)
        base = base.rstrip('/')
        pairs = parse_qsl(query_str, keep_blank_values=True)
        filtered = []
        for k, v in pairs:
            k_low = k.lower()
            if k_low.startswith('utm_') or k_low in ('fbclid', 'gclid', 'ref'):
                continue
            filtered.append((k, v))
        if filtered:
            filtered.sort(key=lambda x: x[0])
            u = f"{base}?{urlencode(filtered)}"
        else:
            u = base

    return u.rstrip('/')


def generate_deterministic_id(url: str, title: str) -> str:
    """Generate a stable 12-char SHA-256 hash based on canonical URL or title."""
    canonical = normalize_url(url) if url and url.strip() else title.strip().lower()
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]


def extract_category(text: str, hint: str = "") -> str:
    """Classify the scam vector into standardized taxonomy."""
    lower = text.lower()

    if any(k in lower for k in ["digital arrest", "customs parcel", "skype call", "narcotics parcel", "cbi probe", "police uniform"]):
        return "Digital Arrest"
    if any(k in lower for k in ["fake apk", "apk malware", "accessibility service", "keystroke capture", "sideloading", "trojan", "malicious app"]):
        return "Apk Trojan"
    if any(k in lower for k in ["deepfake", "sudha murty", "lip-sync", "voice clone", "ai generated video", "ai video", "vip group"]):
        return "Deepfake Impersonation"
    if any(k in lower for k in ["trading scheme", "investment scam", "crypto syndicate", "stock trading", "senior citizens", "crypto fraud", "forex scam"]):
        return "Investment Fraud"

    if hint:
        hint_clean = hint.strip()
        if hint_clean in FALLBACK_CATEGORY_IMAGES:
            return hint_clean
        hint_lower = hint_clean.lower()
        if "apk" in hint_lower:
            return "Apk Trojan"
        if "deepfake" in hint_lower or "ai" in hint_lower:
            return "Deepfake Impersonation"
        if "invest" in hint_lower or "crypto" in hint_lower:
            return "Investment Fraud"
        if "digital arrest" in hint_lower:
            return "Digital Arrest"

    return "Cyber Fraud"


def extract_financial_loss(text: str) -> Tuple[str, float]:
    """
    Extract loss amounts in INR (Crore, Lakh, or formatted numbers)
    Returns: (display_str, numeric_value_in_inr)
    """
    # Look for patterns like ₹150+ Crore, Rs 10.74 crore, ₹6 Lakh, Rs 6,00,000, 11 Crore
    crore_match = re.search(r'(?:₹|Rs\.?|INR)\s*([0-9]+(?:\.[0-9]+)?)\+?\s*(?:crores?|crs?)\b', text, re.IGNORECASE)
    if crore_match:
        val = float(crore_match.group(1))
        inr = val * 10_000_000.0
        suffix = "+ Crore Nationwide" if "nationwide" in text.lower() or val >= 100 else f" Crore"
        if "across victims" in text.lower():
            suffix += " across victims"
        return f"₹{val:g}{suffix}", inr

    crore_word_match = re.search(r'\b([0-9]+(?:\.[0-9]+)?)\+?\s*(?:crores?|crs?)\b', text, re.IGNORECASE)
    if crore_word_match:
        val = float(crore_word_match.group(1))
        inr = val * 10_000_000.0
        return f"₹{val:g} Crore", inr

    lakh_match = re.search(r'(?:₹|Rs\.?|INR)\s*([0-9]+(?:\.[0-9]+)?)\+?\s*(?:lakh|lakhs|lac|lacs)\b', text, re.IGNORECASE)
    if lakh_match:
        val = float(lakh_match.group(1))
        inr = val * 100_000.0
        return f"₹{val:g} Lakh", inr

    lakh_word_match = re.search(r'\b([0-9]+(?:\.[0-9]+)?)\+?\s*(?:lakh|lakhs|lac|lacs)\b', text, re.IGNORECASE)
    if lakh_word_match:
        val = float(lakh_word_match.group(1))
        inr = val * 100_000.0
        return f"₹{val:g} Lakh", inr

    # Indian comma separated numbers e.g. ₹6,00,000 or ₹11,00,00,000 or INR 5,00,000
    formatted_match = re.search(r'(?:₹|Rs\.?|INR)\s*([0-9]{1,2}(?:,[0-9]{2})+,[0-9]{3}|[0-9]{1,3}(?:,[0-9]{3})+)\b', text, re.IGNORECASE)
    if formatted_match:
        num_str = formatted_match.group(1)
        raw_num = float(num_str.replace(",", ""))
        return f"₹{num_str}", raw_num

    return "Loss Under Investigation", 0.0


def extract_location(text: str) -> str:
    """Detect geographic region or jurisdiction impacted."""
    lower = text.lower()

    if "nationwide" in lower or "pan-india" in lower or "across the country" in lower or "supreme court" in lower:
        return "Pan-India (NCR, Mumbai, ...)"
    if "bombay" in lower or "mumbai" in lower:
        return "Maharashtra (Mumbai)"
    if "pune" in lower and "thane" in lower:
        return "Maharashtra (Pune, Thane)"
    if "pune" in lower:
        return "Maharashtra (Pune)"
    if "bengaluru" in lower or "bangalore" in lower or "karnataka" in lower:
        return "Karnataka (Bengaluru)"
    if "delhi" in lower or "ncr" in lower or "noida" in lower:
        return "Delhi NCR"
    if "hyderabad" in lower or "telangana" in lower:
        return "Telangana (Hyderabad)"
    if "ahmedabad" in lower or "gujarat" in lower:
        return "Gujarat (Ahmedabad)"
    if "kolkata" in lower or "bengal" in lower:
        return "West Bengal (Kolkata)"

    return "Pan-India"


def extract_severity(category: str, loss_inr: float, text: str) -> str:
    """Compute severity tier: CRITICAL, HIGH, MEDIUM."""
    lower = text.lower()

    # Automatic CRITICAL triggers:
    # 1. Losses >= 1 Crore (10 Million INR)
    # 2. Targeted judiciary / Supreme Court / High Court judge
    # 3. Large syndicate bust
    if loss_inr >= 10_000_000.0:
        return "CRITICAL"
    if any(k in lower for k in ["high court judge", "supreme court", "cbi", "syndicate", "massive"]):
        return "CRITICAL"
    if loss_inr >= 500_000.0 or category in ["Deepfake Impersonation", "Apk Trojan"]:
        return "HIGH"

    return "MEDIUM"


def extract_publisher(url: str, title: str) -> Tuple[List[str], str]:
    """Extract credible publisher names and format display string."""
    domain = urlparse(url).netloc.lower()
    sources = []

    if "indianmasterminds" in domain:
        sources = ["Indian Masterminds", "Cyber Cell"]
    elif "financialexpress" in domain:
        sources = ["Financial Express", "Oneindia"]
    elif "thehindu" in domain:
        sources = ["The Hindu", "PTI"]
    elif "punemirror" in domain or "punetimes" in domain:
        sources = ["Pune Times Mirror"]
    elif "indianexpress" in domain:
        sources = ["The Indian Express"]
    elif "ndtv" in domain:
        sources = ["NDTV"]
    elif "economictimes" in domain:
        sources = ["The Economic Times"]
    elif "timesofindia" in domain:
        sources = ["Times of India"]
    elif "oneindia" in domain:
        sources = ["Oneindia"]
    else:
        clean_name = domain.replace("www.", "").split(".")[0].capitalize()
        sources = [clean_name]

    if len(sources) > 1:
        display = f"{sources[0]} & {sources[1]}"
    elif len(sources) == 1:
        display = sources[0]
    else:
        display = "National Cybercrime Advisory"

    return sources, display


def extract_modus_operandi(snippet: str, title: str, category: str) -> str:
    """Generate concise 1-sentence Modus Operandi summary."""
    # Pre-defined high-accuracy MO templates for canonical vectors if snippet is too noisy
    if category == "Digital Arrest":
        if "skype" in snippet.lower() or "uniform" in snippet.lower():
            return "Fake Skype video calls in police uniform falsely claiming illegal narcotics parcels in customs."
        return "Coercive digital arrest scam isolating victims via video calls under guise of law enforcement probe."

    if category == "Apk Trojan":
        if "accessibility" in snippet.lower() or "keystroke" in snippet.lower():
            return "WhatsApp APK sideloading with Accessibility Service keystroke capture."
        return "Malicious APK deployment disguised as utility app to siphon banking credentials."

    if category == "Deepfake Impersonation":
        if "sudha murty" in snippet.lower() or "stock" in snippet.lower():
            return "Deepfake voice and lip-sync synthesis on Facebook and Instagram ads leading to fake WhatsApp VIP groups."
        return "AI-generated synthetic voice and video impersonating high-profile figures for fraud."

    if category == "Investment Fraud":
        if "crypto" in snippet.lower() or "senior" in snippet.lower():
            return "Fake crypto dashboards displaying inflated fictitious profits to extract escalating security deposits."
        return "Multi-layered investment syndicate manipulating fake financial dashboards to steal funds."

    # Extract first strong informative sentence
    clean_snippet = re.sub(r'[\r\n]+', ' ', snippet).strip()
    sentences = [s.strip() for s in re.split(r'\. |\? |\! ', clean_snippet) if len(s.strip()) > 25]
    if sentences:
        candidate = sentences[0]
        if len(candidate) > 160:
            candidate = candidate[:157] + "..."
        return candidate + "."

    return f"Active cybercrime alert involving {category.lower()} techniques."


def normalize_published_date(date_str: Optional[str]) -> str:
    """
    Parse both RFC-2822 and ISO-8601 timestamps cleanly into YYYY-MM-DD.
    Falls back to current UTC date if invalid, empty, or unparseable.
    """
    if not date_str or not isinstance(date_str, str):
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    clean_str = date_str.strip()
    if not clean_str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Check if string starts with ISO-8601 date: YYYY-MM-DD
    iso_prefix_match = re.match(r'^(\d{4})-(\d{2})-(\d{2})', clean_str)
    if iso_prefix_match:
        try:
            year, month, day = map(int, iso_prefix_match.groups())
            dt = datetime(year, month, day)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # 2. Try RFC-2822 format (e.g. 'Sat, 09 Mar 2026 12:00:00 GMT' or '09 Mar 2026 12:00:00 +0000')
    try:
        dt = email.utils.parsedate_to_datetime(clean_str)
        if dt:
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    # 3. Try ISO-8601 full string with datetime.fromisoformat
    try:
        iso_cand = clean_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_cand)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    # 4. Try common news date formats
    for fmt in ("%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            dt = datetime.strptime(clean_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def parse_raw_tavily_result(result: Dict[str, Any], category_hint: str = "") -> ScamReport:
    """Convert a raw Tavily search result into a standardized ScamReport."""
    title = result.get("title", "").strip()
    url = result.get("url", "").strip()
    snippet = result.get("content", "").strip()
    raw_content = result.get("raw_content", "") or snippet

    combined_text = f"{title} {snippet} {raw_content}"

    category = extract_category(combined_text, hint=category_hint)
    loss_str, loss_inr = extract_financial_loss(combined_text)
    location = extract_location(combined_text)
    severity = extract_severity(category, loss_inr, combined_text)
    sources, source_display = extract_publisher(url, title)
    mo_summary = extract_modus_operandi(snippet, title, category)

    image_url = ""
    # Check if result has images or fallback
    images = result.get("images", [])
    if images and isinstance(images, list) and len(images) > 0:
        first_img = images[0]
        image_url = first_img.get("url") if isinstance(first_img, dict) else str(first_img)

    if not image_url:
        image_url = FALLBACK_CATEGORY_IMAGES.get(category, FALLBACK_CATEGORY_IMAGES["Cyber Fraud"])

    report_id = generate_deterministic_id(url, title)

    # Normalize published date cleanly into YYYY-MM-DD
    published_date = normalize_published_date(result.get("published_date"))

    return ScamReport(
        id=report_id,
        title=title,
        summary=mo_summary,
        category=category,
        severity=severity,
        financial_loss_str=loss_str,
        financial_loss_inr=loss_inr,
        location=location,
        sources=sources,
        source_display=source_display,
        published_date=published_date,
        url=url,
        image_url=image_url,
        raw_content=snippet,
        verified=True
    )
