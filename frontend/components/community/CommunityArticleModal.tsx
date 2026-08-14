"use client";

import React, { useState } from "react";
import { 
  X, Heart, Eye, Clock, Share2, Copy, Check, 
  ExternalLink, Video, Shield, User, ArrowLeft 
} from "lucide-react";
import { CommunityPost } from "./types";
import { cn } from "@/lib/utils";
import { NetraUserAvatar } from "@/components/NetraUserAvatar";

interface CommunityArticleModalProps {
  post: CommunityPost | null;
  onClose: () => void;
  onLike?: (postId: string) => void;
}

export const CommunityArticleModal: React.FC<CommunityArticleModalProps> = ({
  post,
  onClose,
  onLike,
}) => {
  const [copied, setCopied] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);

  if (!post) return null;

  const handleShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLikeClick = () => {
    if (!hasLiked) {
      setHasLiked(true);
      setLikeCount((prev) => prev + 1);
      onLike?.(post.id);
    }
  };

  // Convert YouTube URL to embed URL if needed
  const getEmbedIframe = (url?: string) => {
    if (!url) return null;
    let videoId = "";
    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    }

    if (videoId) {
      return (
        <div className="my-6 rounded-2xl overflow-hidden border border-white/10 aspect-video w-full bg-black shadow-card">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="Embedded Video Evidence"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      );
    }

    return (
      <div className="my-4 p-3 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-300 truncate">
          <Video className="size-4 text-white shrink-0" />
          <span className="truncate">Attached Media Reference:</span>
          <span className="text-zinc-500 truncate">{url}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
        >
          <span>Open Link</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl rounded-2xl bg-[#17191A] border border-white/15 shadow-overlay my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Toolbar */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0 bg-[#17191A]/95 backdrop-blur-sm z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Community</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLikeClick}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-all active:scale-[0.98]",
                hasLiked
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-[#18181B] border-white/10 text-zinc-300 hover:text-white"
              )}
            >
              <Heart className={cn("size-3.5", hasLiked ? "fill-rose-400 text-rose-400" : "")} />
              <span>{likeCount}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Share Link"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#18181B] transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Article Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar text-zinc-300">
          
          {/* Category & Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-semibold bg-white/10 border border-white/15 text-white">
              {post.category.replace("_", " ")}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
              <Clock className="size-3" />
              <span>{post.read_time}</span>
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
              <Eye className="size-3" />
              <span>{post.views} views</span>
            </span>
          </div>

          {/* Article Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            {post.title}
          </h1>

          {/* Author Byline */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#18181B] border border-white/10">
            {typeof post.author.avatar_index === "number" ? (
              <NetraUserAvatar avatarIndex={post.author.avatar_index} size={40} showGlow={false} />
            ) : post.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="size-10 rounded-full object-cover border border-white/15 shrink-0"
              />
            ) : (
              <div className="size-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white shrink-0">
                <User className="size-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>{post.author.name}</span>
                <span className="size-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                {post.author.role ? `${post.author.role} • ` : ""}Published {post.created_at}
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {post.cover_image && (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#18181B] max-h-96 w-full shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Embedded Media if any */}
          {post.embed_url && getEmbedIframe(post.embed_url)}

          {/* Rendered Text Body */}
          <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-4 pt-2 border-t border-white/[0.08]">
            {post.content.split("\n").map((line, idx) => {
              if (line.startsWith("### ")) {
                return <h4 key={idx} className="text-lg font-bold text-white mt-6 mb-2 tracking-tight">{line.replace("### ", "")}</h4>;
              }
              if (line.startsWith("## ")) {
                return <h3 key={idx} className="text-xl font-bold text-white mt-8 mb-3 tracking-tight">{line.replace("## ", "")}</h3>;
              }
              if (line.startsWith("# ")) {
                return <h2 key={idx} className="text-2xl font-bold text-white mt-8 mb-3 tracking-tight">{line.replace("# ", "")}</h2>;
              }
              if (line.startsWith("> ")) {
                return (
                  <blockquote key={idx} className="p-3.5 my-3 rounded-xl bg-amber-500/5 border-l-2 border-amber-400 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                    {line.replace("> ", "")}
                  </blockquote>
                );
              }
              if (line.startsWith("```")) {
                return (
                  <pre key={idx} className="p-4 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto my-3">
                    <code>{line.replace(/```[a-z]*/g, "")}</code>
                  </pre>
                );
              }
              if (line.startsWith("- ")) {
                return <li key={idx} className="ml-5 list-disc text-zinc-300 text-sm">{line.replace("- ", "")}</li>;
              }
              if (line.startsWith("![") && line.includes("](")) {
                const src = line.match(/\((.*?)\)/)?.[1];
                const alt = line.match(/\[(.*?)\]/)?.[1] || "figure";
                return src ? (
                  <div key={idx} className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#18181B]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={alt} className="w-full max-h-80 object-cover" />
                    <p className="text-[11px] text-zinc-500 p-2 text-center font-mono">{alt}</p>
                  </div>
                ) : null;
              }
              return line.trim() ? <p key={idx} className="text-zinc-300 leading-relaxed">{line}</p> : <div key={idx} className="h-2" />;
            })}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Tags:</span>
              {post.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#18181B] border border-white/10 text-zinc-300">
                  #{tag}
                </span>
              ))}
            </div>
          )}

        </div>

        {/* 3. Footer Bar with Interaction */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between gap-4 bg-[#17191A]/95 shrink-0">
          <div className="text-xs text-zinc-400 font-mono">
            Published in NETRA Community Forensics
          </div>

          <button
            type="button"
            onClick={handleLikeClick}
            className={cn(
              "px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]",
              hasLiked
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-white hover:bg-zinc-100 text-[#0C0C0E] border-white"
            )}
          >
            <Heart className={cn("size-3.5", hasLiked ? "fill-rose-400 text-rose-400" : "")} />
            <span>{hasLiked ? "Upvoted!" : "Upvote Research"} ({likeCount})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
