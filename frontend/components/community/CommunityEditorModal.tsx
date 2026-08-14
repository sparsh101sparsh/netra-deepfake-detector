"use client";

import React, { useState, useRef } from "react";
import { 
  X, Image as ImageIcon, Video, Link2, Bold, 
  Italic, Heading1, Heading2, Quote, List, Code, 
  Eye, Edit3, UploadCloud, Sparkles, Check, AlertCircle,
  HelpCircle, ExternalLink, Loader2
} from "lucide-react";
import { UserProfile } from "../layout/GoogleAuthModal";
import { CommunityPost, Author } from "./types";
import { cn } from "@/lib/utils";

interface CommunityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onPublished: (post: CommunityPost) => void;
}

export const CommunityEditorModal: React.FC<CommunityEditorModalProps> = ({
  isOpen,
  onClose,
  user,
  onPublished,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("SCAM_ANALYSIS");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Insert markdown formatting at cursor position
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selectedText = previousText.substring(start, end);

    const replacement = `${prefix}${selectedText || "text"}${suffix}`;
    const newContent = 
      previousText.substring(0, start) + 
      replacement + 
      previousText.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 10);
  };

  // Handle Cover Image file upload
  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Image size exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCoverImage(reader.result);
          setErrorMsg("");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Inline Image insertion
  const handleInlineImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const imgMarkdown = `\n\n![${file.name.replace(/\.[^/.]+$/, "")}](${reader.result})\n\n`;
          setContent((prev) => prev + imgMarkdown);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit article
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please provide a title for your blog post.");
      return;
    }
    if (content.trim().length < 20) {
      setErrorMsg("Please write at least a few sentences of research content.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const authorData: Author = {
      id: user?.sub || (user as any)?.id || user?.email || "anonymous",
      name: user?.name || "Community Member",
      email: user?.email,
      avatar: user?.picture,
      avatar_index: user?.avatarIndex,
    };

    const payload = {
      title: title.trim(),
      category,
      content: content.trim(),
      cover_image: coverImage || undefined,
      embed_url: embedUrl.trim() || undefined,
      author: authorData,
    };

    try {
      // Attempt backend API
      const res = await fetch("/api/backend/api/v1/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onPublished(data.post);
        onClose();
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setErrorMsg(errData.detail || `Failed to publish research paper (Server status ${res.status}).`);
    } catch (err: any) {
      console.warn("Community post publishing error:", err);
      setErrorMsg(err?.message || "Community server unreachable. Please verify backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl rounded-2xl bg-[#17191A] border border-white/15 shadow-overlay my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0 bg-[#17191A]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-center text-white shrink-0">
              <Edit3 className="size-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Write Community Research Blog
              </h2>
              <p className="text-xs text-zinc-400">
                Publish deepfake breakdowns, scam alerts & incident write-ups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Author Chip */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#18181B] border border-white/10 text-xs text-zinc-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.picture}
                  alt={user.name}
                  className="size-5 rounded-full object-cover border border-white/10"
                />
                <span className="font-medium truncate max-w-[120px]">{user.name}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#18181B] transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Form Content */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Article Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reverse Engineering the New CBI Video Extortion Scam..."
              className="w-full text-base sm:text-lg font-semibold text-white bg-[#18181B] border border-white/10 rounded-xl px-4 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
              required
            />
          </div>

          {/* Category & Media Embed Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs text-white bg-[#18181B] border border-white/10 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
              >
                <option value="SCAM_ANALYSIS">Scam Investigation & Alerts</option>
                <option value="DEEPFAKE">Deepfake Video Forensics</option>
                <option value="VOICE_CLONE">Voice Clone & Audio Analysis</option>
                <option value="SAFETY_GUIDE">Citizen Safety & Prevention</option>
                <option value="THREAT_INTEL">Threat Intelligence & Malware</option>
              </select>
            </div>

            {/* Video / Embed Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
                <span>Embed Media (YouTube / Video URL)</span>
                <span className="text-[10px] text-zinc-500 lowercase">optional</span>
              </label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full text-xs text-white bg-[#18181B] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Cover Image Upload / URL */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-between">
              <span>Cover Image</span>
              <span className="text-[10px] text-zinc-500 lowercase">optional</span>
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <UploadCloud className="size-4 text-zinc-400" />
                <span>Upload Cover Image</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileUpload}
                className="hidden"
              />

              <div className="relative flex-1">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="Or paste an image URL (https://...)"
                  className="w-full text-xs text-white bg-[#18181B] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="px-3 py-2 text-xs text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Cover Image Preview */}
            {coverImage && (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/10 bg-[#18181B] mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white backdrop-blur-sm">
                  Cover Preview
                </span>
              </div>
            )}
          </div>

          {/* Editor Header: Formatting Toolbar & Write/Preview Toggle */}
          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Markdown Quick Toolbar */}
              <div className="flex flex-wrap items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Bold"
                >
                  <Bold className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Italic"
                >
                  <Italic className="size-3.5" />
                </button>
                <span className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  type="button"
                  onClick={() => insertFormatting("## ")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Heading 2"
                >
                  <Heading1 className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("### ")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Heading 3"
                >
                  <Heading2 className="size-3.5" />
                </button>
                <span className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  type="button"
                  onClick={() => insertFormatting("> ")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Quote"
                >
                  <Quote className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("- ")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Bullet List"
                >
                  <List className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("```\n", "\n```")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
                  title="Code Block"
                >
                  <Code className="size-3.5" />
                </button>
                <span className="w-px h-4 bg-white/10 mx-0.5" />
                {/* Insert Inline Image */}
                <button
                  type="button"
                  onClick={() => inlineImageInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272A] transition-colors text-[11px] font-mono flex items-center gap-1"
                  title="Insert Inline Image"
                >
                  <ImageIcon className="size-3 text-zinc-400" />
                  <span>+ Image</span>
                </button>
                <input
                  ref={inlineImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInlineImageUpload}
                  className="hidden"
                />
              </div>

              {/* Write vs Preview Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#18181B] border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all flex items-center gap-1.5",
                    activeTab === "write"
                      ? "bg-[#27272A] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Edit3 className="size-3" />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all flex items-center gap-1.5",
                    activeTab === "preview"
                      ? "bg-[#27272A] text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Eye className="size-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Editor Textarea / Preview Pane */}
            {activeTab === "write" ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your forensic research, breakdown of deepfake artifacts, scam phone numbers, WhatsApp APK findings, or advice here... (Markdown formatted)"
                rows={12}
                className="w-full bg-[#18181B] border border-white/10 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-500 font-mono leading-relaxed focus:outline-none focus:border-white/30 transition-colors custom-scrollbar"
                required
              />
            ) : (
              <div className="w-full min-h-[280px] bg-[#18181B] border border-white/10 rounded-xl p-5 text-sm text-zinc-300 leading-relaxed overflow-y-auto max-h-[380px] custom-scrollbar space-y-3">
                {content ? (
                  <div className="prose prose-invert max-w-none text-xs sm:text-sm">
                    {content.split("\n").map((line, idx) => {
                      if (line.startsWith("### ")) {
                        return <h4 key={idx} className="text-base font-bold text-white mt-3">{line.replace("### ", "")}</h4>;
                      }
                      if (line.startsWith("## ")) {
                        return <h3 key={idx} className="text-lg font-bold text-white mt-4">{line.replace("## ", "")}</h3>;
                      }
                      if (line.startsWith("# ")) {
                        return <h2 key={idx} className="text-xl font-bold text-white mt-4">{line.replace("# ", "")}</h2>;
                      }
                      if (line.startsWith("> ")) {
                        return <blockquote key={idx} className="pl-3 border-l-2 border-amber-400 text-zinc-400 italic my-2">{line.replace("> ", "")}</blockquote>;
                      }
                      if (line.startsWith("```")) {
                        return <div key={idx} className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-zinc-300 my-2">{line}</div>;
                      }
                      if (line.startsWith("- ")) {
                        return <li key={idx} className="ml-4 list-disc text-zinc-300">{line.replace("- ", "")}</li>;
                      }
                      if (line.startsWith("![") && line.includes("](")) {
                        const src = line.match(/\((.*?)\)/)?.[1];
                        return src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={idx} src={src} alt="inline" className="max-h-60 rounded-lg my-3 border border-white/10" />
                        ) : null;
                      }
                      return line.trim() ? <p key={idx} className="text-zinc-300 my-1">{line}</p> : <div key={idx} className="h-2" />;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-zinc-500">
                    Nothing to preview yet. Switch to &quot;Write&quot; to begin your analysis.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Action Buttons */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-zinc-500">
              {content.split(/\s+/).filter(Boolean).length} words • Markdown enabled
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-white/10 text-xs font-medium text-zinc-300 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-[#0C0C0E] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-[#0C0C0E]" />
                    <span>Publish to Community</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
