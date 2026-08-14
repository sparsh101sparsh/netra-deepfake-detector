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
import { GlidingFilterTabs } from "@/components/atoms/GlidingFilterTabs";
import { cn } from "@/lib/utils";

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user session from localStorage and fetch posts from backend
  const fetchCommunityPosts = () => {
    setIsLoading(true);
    setError(null);
    let localPosts: CommunityPost[] = [];
    if (typeof window !== "undefined") {
      const savedLocalPosts = localStorage.getItem("netra_community_posts");
      if (savedLocalPosts) {
        try {
          localPosts = JSON.parse(savedLocalPosts);
        } catch {}
      }
    }

    fetch("/api/backend/api/v1/community/posts")
      .then((res) => {
        if (!res.ok) throw new Error(`Community API returned status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const backendPosts = data?.posts || [];
        const backendIds = new Set(backendPosts.map((p: any) => p.id));
        const uniqueLocal = localPosts.filter((p) => !backendIds.has(p.id));
        setPosts([...uniqueLocal, ...backendPosts]);
      })
      .catch((err) => {
        console.warn("Community fetch error:", err);
        setError("Community forensic cluster unreachable. Local articles displayed if available.");
        setPosts(localPosts);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("netra_auth_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {}
      }
    }
    fetchCommunityPosts();
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
          <GlidingFilterTabs
            tabs={[
              { id: "ALL", label: "All Posts" },
              ...(user ? [{ id: "MY_POSTS", label: `My Posts (${myPostsCount})` }] : []),
              { id: "SCAM_ANALYSIS", label: "Scam Investigations" },
              { id: "DEEPFAKE", label: "Deepfake Videos" },
              { id: "VOICE_CLONE", label: "Voice Clones" },
              { id: "THREAT_INTEL", label: "Threat Intel" },
              { id: "SAFETY_GUIDE", label: "Safety Guides" },
            ]}
            activeId={activeCategory}
            onChange={setActiveCategory}
            pillVariant="rounded-xl"
          />

          {/* Right Actions: Search Box + Write Post Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blogs, authors, tags..."
                className="w-full text-xs text-white bg-[#17191A] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl bg-[#17191A] border border-white/[0.08] p-5 space-y-4 animate-pulse">
                <div className="h-40 w-full bg-white/5 rounded-xl" />
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-white/10 rounded-full" />
                  <div className="h-3 w-16 bg-white/5 rounded" />
                </div>
                <div className="h-5 w-4/5 bg-white/10 rounded" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-3/4 bg-white/5 rounded" />
                </div>
                <div className="pt-3 flex items-center justify-between border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-white/10" />
                    <div className="h-3 w-20 bg-white/10 rounded" />
                  </div>
                  <div className="h-3 w-12 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#17191A] border border-white/[0.08] text-center space-y-3">
            <Users className="size-8 text-zinc-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">No community forensic analyses published yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {error || "No community forensic analyses published yet. Be the first investigator to publish an analysis."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/community/write"
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-[#0C0C0E] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <PenLine className="size-3.5" />
                <span>Publish Research Paper</span>
              </Link>
              {error && (
                <button
                  type="button"
                  onClick={fetchCommunityPosts}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Retry Connection</span>
                </button>
              )}
            </div>
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
