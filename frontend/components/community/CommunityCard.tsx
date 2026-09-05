"use client";

import React from "react";
import Image from "next/image";
import { 
  Heart, Eye, Clock, ArrowUpRight, Video, 
  FileText, Shield, Sparkles, User, ExternalLink, Trash2 
} from "lucide-react";
import { CommunityPost } from "./types";
import { cn } from "@/lib/utils";
import { NetraUserAvatar } from "@/components/NetraUserAvatar";

interface CommunityCardProps {
  post: CommunityPost;
  onOpen: (post: CommunityPost) => void;
  onLike?: (postId: string, e: React.MouseEvent) => void;
  onDelete?: (postId: string, e: React.MouseEvent) => void;
  currentUserEmail?: string;
  currentUserId?: string;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  post,
  onOpen,
  onLike,
  onDelete,
  currentUserEmail,
  currentUserId,
}) => {
  const isCurrentUser = Boolean(
    (currentUserEmail && post.author.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
    (currentUserId && post.author.id === currentUserId)
  );
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "DEEPFAKE": return "Deepfake Video";
      case "SCAM_ANALYSIS": return "Scam Investigation";
      case "VOICE_CLONE": return "Voice Clone";
      case "SAFETY_GUIDE": return "Safety Guide";
      case "THREAT_INTEL": return "Threat Intel";
      default: return cat.replace("_", " ");
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "DEEPFAKE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "SCAM_ANALYSIS":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "VOICE_CLONE":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "THREAT_INTEL":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-800 text-zinc-300 border-white/10";
    }
  };

  return (
    <article
      onClick={() => onOpen(post)}
      className="group relative flex flex-col rounded-2xl bg-[#17191A] border border-white/[0.08] hover:border-white/20 transition-all duration-200 overflow-hidden cursor-pointer shadow-card hover:shadow-overlay flex-1"
    >
      {/* 1. Cover Image Header */}
      {post.cover_image && (
        <div className="relative w-full h-44 sm:h-48 bg-[#18181B] overflow-hidden border-b border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17191A] via-transparent to-black/30" />

          {/* Category Pill on Image */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium border backdrop-blur-md shadow-sm",
                getCategoryBadgeClass(post.category)
              )}
            >
              {getCategoryLabel(post.category)}
            </span>

            {post.embed_url && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 text-zinc-300 border border-white/10 backdrop-blur-md flex items-center gap-1">
                <Video className="size-3 text-white" />
                <span>Media</span>
              </span>
            )}
          </div>

          {/* Read Time on Image Top Right */}
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-zinc-300 border border-white/10 backdrop-blur-md flex items-center gap-1">
              <Clock className="size-3" />
              <span>{post.read_time}</span>
            </span>
          </div>
        </div>
      )}

      {/* 2. Body Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {!post.cover_image && (
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium border",
                  getCategoryBadgeClass(post.category)
                )}
              >
                {getCategoryLabel(post.category)}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <Clock className="size-3" />
                <span>{post.read_time}</span>
              </span>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight group-hover:text-zinc-200 transition-colors line-clamp-2">
            {post.title}
          </h3>

          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
        </div>

        {/* 3. Footer: Author info + Like & View Counters */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          {/* Author */}
          <div className="flex items-center gap-2 min-w-0">
            {typeof post.author.avatar_index === "number" ? (
              <NetraUserAvatar avatarIndex={post.author.avatar_index} size={28} showGlow={false} />
            ) : post.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="size-7 rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="size-7 rounded-full bg-[#18181B] border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                <User className="size-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                <span className="truncate">{post.author.name}</span>
                {isCurrentUser && (
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-semibold rounded bg-white/15 text-white border border-white/20 shrink-0">
                    You
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono -mt-0.5">
                {post.created_at}
              </div>
            </div>
          </div>

          {/* Social Stats */}
          <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1 text-[11px] hover:text-white transition-colors">
              <Eye className="size-3.5" />
              <span>{post.views}</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(post.id, e);
              }}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400 transition-colors group/like"
            >
              <Heart className="size-3.5 group-hover/like:fill-rose-400 group-hover/like:text-rose-400 transition-colors" />
              <span>{post.likes}</span>
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(post.id, e);
                }}
                className="flex items-center text-[11px] text-zinc-500 hover:text-rose-400 transition-colors p-1 rounded-md hover:bg-rose-500/10"
                title="Remove post"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
