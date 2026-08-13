"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, PenLine, Search, X, Sparkles, 
  Filter, Shield, ArrowUpRight, MessageSquare,
  Flame, Clock, TrendingUp, Check
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { GoogleAuthModal, UserProfile } from "@/components/layout/GoogleAuthModal";
import { CommunityCard } from "@/components/community/CommunityCard";
import { CommunityEditorModal } from "@/components/community/CommunityEditorModal";
import { CommunityArticleModal } from "@/components/community/CommunityArticleModal";
import { CommunityPost } from "@/components/community/types";
import { cn } from "@/lib/utils";

const SEED_POSTS: CommunityPost[] = [
  {
    id: "post-001",
    title: "Dissecting the 'Digital Arrest' Extortion Racket: Audio & Face-Swap Breakdown",
    category: "SCAM_ANALYSIS",
    excerpt: "A technical walkthrough of how transnational fraud syndicates use real-time face reenactment, fake police backdrops, and synthesized police warrants on Skype.",
    content: `## Executive Summary

Over the past six months, Indian law enforcement agencies and the National Cybercrime Reporting Portal have reported a surging epidemic of **"Digital Arrest"** scams. Victims receive an urgent call claiming illegal parcels containing narcotics were intercepted at customs, followed by a coerced Skype video call with an impostor dressed in an official Indian Police or CBI uniform.

### How the Fraud Operates

1. **The Initial Robocall**: Victims are contacted by automated IVR stating their telecom connection or FedEx parcel has been seized.
2. **Transfer to Fake Officer**: Fraudsters transfer the victim to a handler operating on Telegram or Skype.
3. **Synthetic Video Session**: Using models like LivePortrait and real-time InSwapper, attackers overlay senior police faces onto an accomplice seated against an authentic-looking state police emblem.
4. **Coerced Fund Transfers**: Victims are threatened with immediate arrest and instructed to liquidate mutual funds or transfer balances into "verification RBI escrow accounts."

\`\`\`
Attack Chain:
[Automated IVR Call] ➔ [Skype Video Reenactment] ➔ [Forged FIR/Notice PDF] ➔ [RTGS Fund Drain]
\`\`\`

### Forensic Indicators Observed

- **Facial Boundary Artifacts**: When the fake officer moves their head laterally, edge blur and hairline warps occur around the 68-point facial landmark grid.
- **Audio Pitch Irregularities**: Low-frequency acoustic jitter (sub-80Hz) indicates ElevenLabs voice-cloning artifacts with zero ambient room reverberation.
- **Forged Letterhead Analysis**: OCR extraction reveals incorrect font kerning on emblem seals and nonexistent FIR case tracking numbers.

### Citizen Safety Advice

> **Important**: No Indian police department, CBI, or court ever conducts arrests or demands financial transfers over Skype, WhatsApp, or video calls. Always disconnect and dial **1930** immediately.`,
    cover_image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
    embed_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    author: {
      name: "Dr. Aarav Sharma",
      email: "aarav.sharma@forensics.org",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80",
      role: "Chief Threat Researcher",
    },
    created_at: "2 hours ago",
    read_time: "4 min read",
    likes: 42,
    views: 380,
    tags: ["Digital Arrest", "Skype Fraud", "Face-Swap", "I4C Alert"],
  },
  {
    id: "post-002",
    title: "Reverse-Engineering WhatsApp 'Police Notice' APKs: Hidden SMS Listeners",
    category: "THREAT_INTEL",
    excerpt: "Analyzing malicious Android APK packages distributed under the guise of official cybercell compliance notices and electricity bill updates.",
    content: `## Threat Overview

We captured and decompiled 5 malicious Android applications circulating via WhatsApp and SMS phishing links in Mumbai, Bengaluru, and Delhi.

### Decompilation Analysis

Upon inspecting the \`AndroidManifest.xml\`, the applications request dangerous elevated permissions immediately upon installation:

- \`android.permission.RECEIVE_SMS\`
- \`android.permission.READ_SMS\`
- \`android.permission.SEND_SMS\`
- \`android.permission.SYSTEM_ALERT_WINDOW\`

\`\`\`xml
<!-- Malicious Permission Request Captured -->
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<service android:name=".SmsListenerService" android:exported="true" />
\`\`\`

### Command & Control Exfiltration

The payload intercepts incoming 2FA OTP codes from banks (SBI, HDFC, ICICI) and silently POSTs them to an encrypted Telegram Bot API endpoint (\`api.telegram.org/bot<TOKEN>/sendMessage\`).

### Recommendations

1. Never install \`.apk\` files received over WhatsApp, Telegram, or SMS.
2. Verify bank messages only through official banking apps installed from the Google Play Store.
3. Report the offending phone numbers to the DoT **Chakshu** portal (\`sancharsaathi.gov.in\`).`,
    cover_image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    embed_url: undefined,
    author: {
      name: "Priya Venkat",
      email: "priya.v@threatgrid.in",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80",
      role: "Mobile Security Analyst",
    },
    created_at: "5 hours ago",
    read_time: "3 min read",
    likes: 29,
    views: 240,
    tags: ["Android Malware", "WhatsApp Phishing", "SMS OTP Theft"],
  },
  {
    id: "post-003",
    title: "Voice Clone Forensics: How We Detect Synthetic Audio in Under 300ms",
    category: "VOICE_CLONE",
    excerpt: "A deep dive into mel-spectrogram residual analysis and vocal tract harmonic consistency to spot ElevenLabs and OpenVoice deepfakes.",
    content: `## How Synthetic Voices Give Themselves Away

Modern neural vocoders (HiFi-GAN, BigVGAN, DiffWave) produce eerily realistic human speech. However, they consistently fail at replicating micro-tremors and natural breathing transitions.

### 1. Mel-Spectrogram Phase Residuals

Natural human vocal cords produce continuous phase transitions driven by pulmonary pressure. Synthetic vocoders piece together discrete spectral chunks, resulting in:

- Abrupt phase discontinuities at 4kHz to 8kHz boundaries.
- Unnatural silence periods with zero ambient acoustic noise.
- Perfect pitch constancy without organic vocal fatigue.

### 2. Multi-Tier Detection Architecture

In NETRA, we pass incoming audio clips through a 2-stage ensemble:

1. **Wav2Vec 2.0 Feature Extraction**: High-dimensional embeddings capturing temporal prosody.
2. **Frequency-Domain Linear Classifier**: Spotting unnatural spectral flatness and vocoder artifacts.

\`\`\`
Incoming Audio (WAV/MP3)
  ➔ Mel-Frequency Cepstral Analysis
  ➔ ResNet-18 Spectral Residual Head
  ➔ Verdict: 98.4% Synthetic Clone Probability
\`\`\``,
    cover_image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
    embed_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    author: {
      name: "Rohan Deshmukh",
      email: "rohan.d@audioforensics.io",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80",
      role: "Audio Forensics Lead",
    },
    created_at: "1 day ago",
    read_time: "5 min read",
    likes: 64,
    views: 510,
    tags: ["Voice Cloning", "Audio Forensics", "Spectrogram", "Deepfake"],
  },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>(SEED_POSTS);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);

  // Load user session from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("netra_auth_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {}
      }

      // Load locally stored user posts if any
      const savedLocalPosts = localStorage.getItem("netra_community_posts");
      let localPosts: CommunityPost[] = [];
      if (savedLocalPosts) {
        try {
          localPosts = JSON.parse(savedLocalPosts);
        } catch {}
      }

      // Fetch from backend API
      fetch("/api/backend/api/v1/community/posts")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.posts && data.posts.length > 0) {
            // Merge with local posts avoiding duplicates
            const backendIds = new Set(data.posts.map((p: any) => p.id));
            const uniqueLocal = localPosts.filter((p) => !backendIds.has(p.id));
            setPosts([...uniqueLocal, ...data.posts]);
          } else if (localPosts.length > 0) {
            setPosts([...localPosts, ...SEED_POSTS]);
          }
        })
        .catch(() => {
          if (localPosts.length > 0) {
            setPosts([...localPosts, ...SEED_POSTS]);
          }
        });
    }
  }, []);

  // Write Post Click handler
  const handleWriteClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsEditorOpen(true);
    }
  };

  // When a new post is published
  const handlePostPublished = (newPost: CommunityPost) => {
    setPosts((prev) => [newPost, ...prev]);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("netra_community_posts");
        const existing: CommunityPost[] = saved ? JSON.parse(saved) : [];
        localStorage.setItem(
          "netra_community_posts",
          JSON.stringify([newPost, ...existing])
        );
      } catch {}
    }
  };

  // Like a post
  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
    // Ping backend if available
    fetch(`/api/backend/api/v1/community/posts/${postId}/like`, {
      method: "POST",
    }).catch(() => {});
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    const isMyPost = Boolean(
      (user?.email && p.author.email?.toLowerCase() === user.email.toLowerCase()) ||
      (user?.sub && p.author.id === user.sub) ||
      ((user as any)?.id && p.author.id === (user as any).id)
    );

    const matchesCategory =
      activeCategory === "ALL"
        ? true
        : activeCategory === "MY_POSTS"
        ? isMyPost
        : p.category === activeCategory;

    const matchesSearch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCategory && matchesSearch;
  });

  const myPostsCount = user 
    ? posts.filter(p => (user.email && p.author.email?.toLowerCase() === user.email.toLowerCase()) || (user.sub && p.author.id === user.sub)).length 
    : 0;

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans select-none">
      <Navbar />

      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-8 flex-1 animate-in fade-in duration-300">
        
        {/* ── SEARCH & CATEGORY FILTER TOOLBAR ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { id: "ALL", label: "All Posts" },
              ...(user ? [{ id: "MY_POSTS", label: `My Posts (${myPostsCount})` }] : []),
              { id: "SCAM_ANALYSIS", label: "Scam Investigations" },
              { id: "DEEPFAKE", label: "Deepfake Videos" },
              { id: "VOICE_CLONE", label: "Voice Clones" },
              { id: "THREAT_INTEL", label: "Threat Intel" },
              { id: "SAFETY_GUIDE", label: "Safety Guides" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 border",
                  activeCategory === tab.id
                    ? "bg-white text-[#0C0C0E] border-white font-semibold shadow-sm"
                    : "bg-[#141416] text-zinc-400 hover:text-white border-white/[0.08]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Actions: Search Box + Write Post Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blogs, authors, tags..."
                className="w-full text-xs text-white bg-[#141416] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Link
              href="/community/write"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-[#0C0C0E] font-semibold text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm shrink-0"
            >
              <PenLine className="size-3.5 text-[#0C0C0E]" />
              <span>Write Post</span>
            </Link>
          </div>
        </div>

        {/* ── 3. POSTS GRID ── */}
        {filteredPosts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#141416] border border-white/[0.08] text-center space-y-3">
            <Users className="size-8 text-zinc-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">No community posts found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No articles match your current search or category filter. Be the first to publish an analysis!
            </p>
            <Link
              href="/community/write"
              className="mt-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-[#0C0C0E] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <PenLine className="size-3.5" />
              <span>Write First Post</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <CommunityCard
                key={post.id}
                post={post}
                onOpen={(p) => setSelectedPost(p)}
                onLike={(id) => handleLikePost(id)}
                currentUserEmail={user?.email}
                currentUserId={user?.sub || (user as any)?.id}
              />
            ))}
          </div>
        )}

      </main>

      {/* ── 4. FOOTER ── */}
      <Footer />

      {/* ── 5. MODALS ── */}
      {/* Article Reader Modal */}
      <CommunityArticleModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onLike={(id) => handleLikePost(id)}
      />

      {/* Write Article Editor Modal */}
      <CommunityEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        user={user}
        onPublished={handlePostPublished}
      />

      {/* Google Auth Modal (if unauthenticated user tries to write post) */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUserChange={(loggedUser) => {
          setUser(loggedUser);
          if (loggedUser) {
            setIsAuthModalOpen(false);
            setIsEditorOpen(true);
          }
        }}
      />

    </div>
  );
}
