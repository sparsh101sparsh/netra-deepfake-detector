"""
Resilient News Article Thumbnail & Media Extractor.
Extracts authentic editorial images directly from news publication URLs:
- OpenGraph metadata (og:image, og:image:secure_url)
- Twitter Card metadata (twitter:image, twitter:image:src)
- Schema.org JSON-LD (NewsArticle.image, ImageObject)
- Article lead image elements
- Intelligent filtering of tracking beacons, icons, and low-res logos
"""

from __future__ import annotations

import re
import json
import urllib.request
import urllib.parse
from typing import Optional, List, Any
import logging

logger = logging.getLogger("cyber_scam_feed.image_scraper")

# Domains or substrings that represent tracking beacons or generic icons, not article photos
BLACKLIST_IMAGE_PATTERNS = [
    "scorecardresearch.com",
    "flipcoin",
    "artshare",
    "e-paper",
    "menu-close",
    "account-page",
    "google-preferred",
    "google-signin",
    "favicon",
    "avatar",
    "share-icon",
    "1x1",
    ".svg",
    "placeholder",
    "blank.gif",
    "pixel.gif",
    "site-logo",
    "brand-logo",
    "header_logo",
    "th-online",
    "advertisement",
    "ad-banner"
]

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Twitterbot/1.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
]


def is_valid_article_image(img_url: Optional[str]) -> bool:
    """Checks if an extracted image URL is a real photo rather than a tracking pixel or icon."""
    if not img_url or not isinstance(img_url, str):
        return False
    u = img_url.strip()
    if not (u.startswith("http://") or u.startswith("https://")):
        return False
    u_lower = u.lower()
    for bad in BLACKLIST_IMAGE_PATTERNS:
        if bad in u_lower:
            return False
    return True


def clean_image_url(base_url: str, img_url: str) -> str:
    """Normalizes relative or escaped image URLs."""
    img_url = img_url.strip().replace("&amp;", "&")
    if img_url.startswith("//"):
        return f"https:{img_url}"
    elif img_url.startswith("/"):
        parsed = urllib.parse.urlparse(base_url)
        return f"{parsed.scheme}://{parsed.netloc}{img_url}"
    return img_url


def scrape_article_thumbnail(article_url: str, timeout_sec: float = 4.0) -> Optional[str]:
    """
    Scrapes the target article web page and extracts the lead editorial thumbnail.
    Inspects <head> metadata within the first 128KB of HTML.
    """
    if not article_url:
        return None

    for ua in USER_AGENTS:
        headers = {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        try:
            req = urllib.request.Request(article_url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                chunk = resp.read(131072).decode("utf-8", errors="ignore")

                # 1. Look for OpenGraph og:image
                og_matches = re.findall(
                    r'<meta[^>]+(?:property|name)=[\'"](?:og:image|og:image:secure_url)[\'"][^>]+content=[\'"]([^\'"]+)[\'"]',
                    chunk,
                    re.IGNORECASE
                )
                if not og_matches:
                    og_matches = re.findall(
                        r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+(?:property|name)=[\'"](?:og:image|og:image:secure_url)[\'"]',
                        chunk,
                        re.IGNORECASE
                    )
                for m in og_matches:
                    candidate = clean_image_url(article_url, m)
                    if is_valid_article_image(candidate):
                        return candidate

                # 2. Look for Twitter Card twitter:image
                tw_matches = re.findall(
                    r'<meta[^>]+(?:property|name)=[\'"](?:twitter:image|twitter:image:src)[\'"][^>]+content=[\'"]([^\'"]+)[\'"]',
                    chunk,
                    re.IGNORECASE
                )
                if not tw_matches:
                    tw_matches = re.findall(
                        r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+(?:property|name)=[\'"](?:twitter:image|twitter:image:src)[\'"]',
                        chunk,
                        re.IGNORECASE
                    )
                for m in tw_matches:
                    candidate = clean_image_url(article_url, m)
                    if is_valid_article_image(candidate):
                        return candidate

                # 3. Look for JSON-LD Structured Data
                json_lds = re.findall(
                    r'<script[^>]+type=[\'"]application/ld\+json[\'"][^>]*>(.*?)</script>',
                    chunk,
                    re.IGNORECASE | re.DOTALL
                )
                for j in json_lds:
                    try:
                        data = json.loads(j.strip())
                        if isinstance(data, list):
                            data = data[0] if data else {}
                        if isinstance(data, dict):
                            img = data.get("image")
                            if isinstance(img, str) and is_valid_article_image(img):
                                return clean_image_url(article_url, img)
                            elif isinstance(img, dict) and "url" in img and is_valid_article_image(img["url"]):
                                return clean_image_url(article_url, img["url"])
                            elif isinstance(img, list) and len(img) > 0 and isinstance(img[0], str) and is_valid_article_image(img[0]):
                                return clean_image_url(article_url, img[0])
                            thumb = data.get("thumbnailUrl")
                            if isinstance(thumb, str) and is_valid_article_image(thumb):
                                return clean_image_url(article_url, thumb)
                    except Exception:
                        continue
            # If 200 was received but no image, don't keep hammering with other UAs
            break
        except Exception:
            continue
    return None


def resolve_best_thumbnail(
    article_url: str,
    tavily_images: Optional[List[Any]] = None,
    fallback_category_image: str = ""
) -> str:
    """
    Comprehensive thumbnail resolver:
    1. Attempts direct high-res page scraping of OpenGraph / Twitter Cards.
    2. If page blocks scraper or has no meta image, evaluates Tavily images list.
    3. Falls back to category image only if both return zero valid photos.
    """
    # 1. Try direct page extraction
    scraped = scrape_article_thumbnail(article_url)
    if scraped:
        return scraped

    # 2. Check Tavily image results
    if tavily_images and isinstance(tavily_images, list):
        for img in tavily_images:
            u = img.get("url") if isinstance(img, dict) else str(img)
            if is_valid_article_image(u):
                return u

    # 3. Fallback
    return fallback_category_image
