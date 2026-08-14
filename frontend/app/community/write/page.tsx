"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Image as ImageIcon, Heading2, Sparkles, 
  Eye, Edit3, Send, Check, X, AlertCircle, Loader2,
  List, ListOrdered, Quote, Code, Film, AlertTriangle,
  FileText, CornerDownLeft, Trash2, SlidersHorizontal, UploadCloud
} from "lucide-react";
import { UserProfile, GoogleAuthModal } from "@/components/layout/GoogleAuthModal";
import { NetraUserAvatar } from "@/components/NetraUserAvatar";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "SCAM_ANALYSIS", label: "Scam Investigation" },
  { id: "DEEPFAKE", label: "Deepfake Analysis" },
  { id: "VOICE_CLONE", label: "Voice Synthesis" },
  { id: "THREAT_INTEL", label: "Threat Intelligence" },
  { id: "SAFETY_GUIDE", label: "Safety Guide" },
];

const PRESET_COVERS = [
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
];

interface SlashCommandItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  snippet: string;
  offset?: number;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "h1",
    icon: Heading2,
    label: "Heading 1",
    description: "Large top-level section heading",
    snippet: "\n# Section Heading\n",
  },
  {
    id: "h2",
    icon: Heading2,
    label: "Heading 2",
    description: "Medium subsection heading",
    snippet: "\n## Subsection Heading\n",
  },
  {
    id: "bullet",
    icon: List,
    label: "Bullet List",
    description: "Create an unordered list of items",
    snippet: "\n- Bullet item 1\n- Bullet item 2\n- Bullet item 3\n",
  },
  {
    id: "numbered",
    icon: ListOrdered,
    label: "Numbered List",
    description: "Create a sequential step-by-step list",
    snippet: "\n1. Step one\n2. Step two\n3. Step three\n",
  },
  {
    id: "quote",
    icon: Quote,
    label: "Quote / Callout",
    description: "Highlight a key statement or testimony",
    snippet: "\n> \"Quote or forensic insight here...\"\n",
  },
  {
    id: "code",
    icon: Code,
    label: "Code Snippet",
    description: "Embed code, logs, or network payloads",
    snippet: "\n```json\n{\n  \"status\": \"detected\",\n  \"confidence\": 0.98\n}\n```\n",
  },
  {
    id: "warning",
    icon: AlertTriangle,
    label: "Threat Alert Box",
    description: "Emergency caution or warning advisory",
    snippet: "\n> [!WARNING]\n> High-risk fraud pattern detected. Do not wire funds.\n",
  },
  {
    id: "image",
    icon: ImageIcon,
    label: "Image Embed",
    description: "Insert a visual screenshot or evidentiary photo",
    snippet: "\n![Forensic Evidence Screenshot](https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80)\n",
  },
  {
    id: "video",
    icon: Film,
    label: "Video Embed",
    description: "Embed YouTube or video proof",
    snippet: "\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n",
  },
];

export default function BlogWriterPage() {
  const router = useRouter();

  // User & Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Document State
  const [title, setTitle] = useState("");
  const [hasSubheading, setHasSubheading] = useState(false);
  const [subheading, setSubheading] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("SCAM_ANALYSIS");
  const [tagsInput, setTagsInput] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");

  // Editor UX State
  const [editorMode, setEditorMode] = useState<"rich" | "preview">("rich");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");

  // Slash Command Menu State
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("Cover image must be smaller than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverImage(event.target.result as string);
        setShowCoverPicker(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Load User from Session
  useEffect(() => {
    try {
      const stored = localStorage.getItem("netra_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore Local Draft
  useEffect(() => {
    try {
      const draft = localStorage.getItem("netra_blog_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.subheading) {
          setSubheading(parsed.subheading);
          setHasSubheading(true);
        }
        if (parsed.content) setContent(parsed.content);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.coverImage) setCoverImage(parsed.coverImage);
        if (parsed.tagsInput) setTagsInput(parsed.tagsInput);
        if (parsed.embedUrl) setEmbedUrl(parsed.embedUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (!title && !content) return;
    setSaveStatus("saving");
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          "netra_blog_draft",
          JSON.stringify({
            title,
            subheading,
            content,
            category,
            coverImage,
            tagsInput,
            embedUrl,
            updatedAt: Date.now(),
          })
        );
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 600);

    return () => clearTimeout(t);
  }, [title, subheading, content, category, coverImage, tagsInput, embedUrl]);

  // Handle Slash Command Trigger
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastLine = textBeforeCursor.split("\n").pop() || "";

    if (lastLine.startsWith("/")) {
      setSlashMenuOpen(true);
      setSlashQuery(lastLine.slice(1).toLowerCase());
      setSlashSelectedIndex(0);
    } else {
      setSlashMenuOpen(false);
      setSlashQuery("");
    }
  };

  const filteredSlashCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(slashQuery) ||
    cmd.description.toLowerCase().includes(slashQuery)
  );

  const applySlashCommand = (cmd: SlashCommandItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    
    // Find where the "/" starts on the current line
    const lastSlashIdx = textBeforeCursor.lastIndexOf("/");
    if (lastSlashIdx === -1) return;

    const newContent = textBeforeCursor.slice(0, lastSlashIdx) + cmd.snippet + textAfterCursor;
    setContent(newContent);
    setSlashMenuOpen(false);
    setSlashQuery("");

    setTimeout(() => {
      textarea.focus();
      const newPos = lastSlashIdx + cmd.snippet.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slashMenuOpen || filteredSlashCommands.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashSelectedIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = filteredSlashCommands[slashSelectedIndex];
      if (selected) applySlashCommand(selected);
    } else if (e.key === "Escape") {
      setSlashMenuOpen(false);
    }
  };

  // Publish Blog
  const handlePublish = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!title.trim()) {
      setErrorMsg("Please enter an article title.");
      return;
    }

    if (!content.trim() || content.trim().length < 20) {
      setErrorMsg("Article content must be at least 20 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const finalExcerpt = subheading.trim() || content.slice(0, 160).replace(/[#*`_>]/g, "").trim() + "...";
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        category,
        excerpt: finalExcerpt,
        content: content.trim(),
        cover_image: coverImage.trim() || null,
        embed_url: embedUrl.trim() || null,
        author: {
          id: user.sub || user.id || user.email,
          name: user.name || "Forensic Researcher",
          email: user.email,
          avatar: user.picture,
          avatar_index: user.avatarIndex ?? 0,
        },
      };

      const res = await fetch("/api/backend/api/v1/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to publish article");
      }

      // Clear draft
      localStorage.removeItem("netra_blog_draft");

      // Redirect to community page
      router.push("/community");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish post. Please check backend connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans flex flex-col selection:bg-[#0084ff]/30 selection:text-white">
      {/* ── TOP MINIMALIST CONTROL BAR ── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0A0A0C]/90 backdrop-blur-xl px-4 sm:px-8 py-3 select-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left Action Cluster: Back, Cover, Subheading */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/community"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Return to Community Feed"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Community</span>
            </Link>

            <span className="h-4 w-[1px] bg-white/[0.1] hidden sm:inline-block" />

            {/* [Cover] Toggle */}
            <button
              type="button"
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                coverImage
                  ? "text-[#0084ff] bg-[#0084ff]/10 hover:bg-[#0084ff]/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <ImageIcon className="size-3.5" />
              <span>{coverImage ? "Cover Added" : "Cover"}</span>
            </button>

            {/* [H2 Subheading] Toggle */}
            <button
              type="button"
              onClick={() => setHasSubheading(!hasSubheading)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                hasSubheading
                  ? "text-[#0084ff] bg-[#0084ff]/10 hover:bg-[#0084ff]/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <Heading2 className="size-3.5" />
              <span>Subheading</span>
            </button>

            {/* Category Dropdown */}
            <div className="relative hidden md:block">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs bg-[#17191A] text-zinc-300 border border-white/[0.08] rounded-lg px-2.5 py-1.5 outline-none hover:border-white/20 focus:border-[#0084ff]/60 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Action Cluster: Rich Toggle & Pill Publish Button */}
          <div className="flex items-center gap-3">
            {/* Draft Saved Indicator */}
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-flex items-center gap-1">
              {saveStatus === "saving" && <Loader2 className="size-3 animate-spin text-zinc-400" />}
              {saveStatus === "saved" && <Check className="size-3 text-emerald-400" />}
              <span>{saveStatus === "saving" ? "Saving..." : "Saved locally"}</span>
            </span>

            {/* [Rich] / Preview Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#17191A] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditorMode("rich")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  editorMode === "rich"
                    ? "bg-[#27272A] text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Rich
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("preview")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  editorMode === "preview"
                    ? "bg-[#27272A] text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Preview
              </button>
            </div>

            {/* Vibrant Flat Pill Publish Button */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting}
              className={cn(
                "rounded-full bg-[#0084ff] hover:bg-[#0073e6] px-5 py-2",
                "text-xs font-semibold text-white border-0 shadow-none",
                "flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]",
                isSubmitting && "opacity-75 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>Publish</span>
            </button>

            {/* User Profile Avatar */}
            {user ? (
              <div 
                onClick={() => setAuthModalOpen(true)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                title={user.name}
              >
                <NetraUserAvatar
                  avatarIndex={user.avatarIndex}
                  seed={user.email}
                  size={28}
                  showGlow={false}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="text-xs text-zinc-400 hover:text-white font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Expandable Cover Picker Drawer */}
        {showCoverPicker && (
          <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {/* Upload Image File Input & Button */}
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <UploadCloud className="size-3.5 text-[#0084ff]" />
                <span>Upload Image</span>
              </button>

              <span className="h-4 w-[1px] bg-white/[0.1] shrink-0" />

              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0">Presets:</span>
              {PRESET_COVERS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCoverImage(url);
                    setShowCoverPicker(false);
                  }}
                  className="size-9 rounded-lg overflow-hidden border border-white/10 hover:border-[#0084ff] transition-colors shrink-0 cursor-pointer"
                >
                  <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="url"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                placeholder="Paste image URL..."
                className="text-xs text-white bg-[#17191A] border border-white/10 rounded-lg px-3 py-1.5 w-full sm:w-64 outline-none focus:border-[#0084ff]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customCoverUrl.trim()) {
                    setCoverImage(customCoverUrl.trim());
                    setCustomCoverUrl("");
                    setShowCoverPicker(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
              >
                Apply
              </button>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage("");
                    setShowCoverPicker(false);
                  }}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remove cover"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── ERROR TOAST ── */}
      {errorMsg && (
        <div className="max-w-3xl mx-auto mt-4 w-full px-6">
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg("")} className="hover:text-rose-300">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN DOCUMENT WORKSPACE CANVAS ── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 sm:py-12 space-y-6">
        
        {/* Cover Image Banner Display */}
        {coverImage && (
          <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-white/10 group mb-6 shadow-xl">
            <img src={coverImage} alt="Article Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button
              type="button"
              onClick={() => setCoverImage("")}
              className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 hover:bg-black text-zinc-300 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove Cover"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}

        {/* EDIT MODE */}
        {editorMode === "rich" ? (
          <div className="space-y-4">
            {/* Seamless Large Article Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title..."
              className={cn(
                "w-full bg-transparent border-0 outline-none",
                "text-3xl sm:text-5xl font-bold tracking-tight text-white",
                "placeholder:text-zinc-600 focus:placeholder:text-zinc-700 leading-tight"
              )}
              autoFocus
            />

            {/* Optional H2 Subheading */}
            {hasSubheading && (
              <input
                type="text"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                placeholder="Add a subheading or key finding..."
                className={cn(
                  "w-full bg-transparent border-0 outline-none",
                  "text-lg sm:text-xl font-medium text-zinc-400",
                  "placeholder:text-zinc-600 focus:placeholder:text-zinc-700 leading-normal"
                )}
              />
            )}

            {/* Divider Line */}
            <div className="h-[1px] w-full bg-white/[0.06] my-4" />

            {/* Content Writing Area with '/' Command Trigger */}
            <div className="relative min-h-[420px]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="Type '/' for commands, or begin typing your forensic article..."
                className={cn(
                  "w-full min-h-[420px] bg-transparent border-0 outline-none resize-none",
                  "text-base leading-relaxed text-zinc-300",
                  "placeholder:text-zinc-600 focus:placeholder:text-zinc-700 font-sans"
                )}
                rows={18}
              />

              {/* Slash Command Popup Menu */}
              {slashMenuOpen && (
                <div
                  ref={slashMenuRef}
                  className={cn(
                    "absolute left-0 bottom-12 sm:bottom-auto sm:top-10 z-50",
                    "w-72 max-h-80 overflow-y-auto rounded-2xl bg-[#17191A] border border-white/10 shadow-2xl p-1.5",
                    "backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 custom-scrollbar"
                  )}
                >
                  <div className="px-3 py-1.5 border-b border-white/[0.06] mb-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      Insert Command {slashQuery && `• "${slashQuery}"`}
                    </span>
                  </div>

                  {filteredSlashCommands.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">
                      No matching commands found
                    </div>
                  ) : (
                    filteredSlashCommands.map((cmd, idx) => {
                      const IconComp = cmd.icon;
                      const isSelected = idx === slashSelectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          onClick={() => applySlashCommand(cmd)}
                          className={cn(
                            "w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer",
                            isSelected
                              ? "bg-[#0084ff] text-white"
                              : "hover:bg-white/[0.06] text-zinc-300"
                          )}
                        >
                          <div className={cn(
                            "size-7 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-white/20 text-white" : "bg-[#1E1E24] text-zinc-400"
                          )}>
                            <IconComp className="size-4" />
                          </div>
                          <div className="truncate">
                            <div className={cn("text-xs font-semibold", isSelected ? "text-white" : "text-zinc-200")}>
                              {cmd.label}
                            </div>
                            <div className={cn("text-[10px] truncate", isSelected ? "text-white/80" : "text-zinc-500")}>
                              {cmd.description}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Bottom Metadata Bar: Tags & Embed Link */}
            <div className="pt-8 border-t border-white/[0.06] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. Digital Arrest, Skype, Face-Swap"
                    className="w-full text-xs text-white bg-[#17191A] border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-[#0084ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Optional Video / Proof Embed URL
                  </label>
                  <input
                    type="url"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full text-xs text-white bg-[#17191A] border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-[#0084ff]"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PREVIEW MODE */
          <article className="space-y-6 animate-in fade-in duration-200">
            {/* Category Pill */}
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#17191A] border border-white/10 text-[#0084ff]">
              {CATEGORIES.find((c) => c.id === category)?.label || category}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              {title || "Untitled Article"}
            </h1>

            {/* Subheading */}
            {subheading && (
              <p className="text-xl text-zinc-400 font-medium leading-relaxed">
                {subheading}
              </p>
            )}

            {/* Author Byline */}
            <div className="flex items-center gap-3 py-4 border-y border-white/[0.08]">
              {user && (
                <NetraUserAvatar
                  avatarIndex={user.avatarIndex}
                  seed={user.email}
                  size={36}
                  showGlow={false}
                />
              )}
              <div>
                <div className="text-sm font-semibold text-white">
                  {user ? user.name : "Anonymous Author"}
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  Draft Preview • {Math.max(1, Math.ceil(content.split(" ").length / 180))} min read
                </div>
              </div>
            </div>

            {/* Video Embed in Preview */}
            {embedUrl && (
              <div className="p-4 rounded-xl bg-[#17191A] border border-white/10 flex items-center gap-3 text-xs text-zinc-300">
                <Film className="size-4 text-[#0084ff] shrink-0" />
                <span className="truncate">Attached Media: <a href={embedUrl} target="_blank" rel="noreferrer" className="text-[#0084ff] underline">{embedUrl}</a></span>
              </div>
            )}

            {/* Rendered Body Text */}
            <div className="prose prose-invert max-w-none text-zinc-300 text-base leading-relaxed space-y-4 whitespace-pre-wrap">
              {content || "No content written yet. Switch back to 'Rich' mode to write your article."}
            </div>
          </article>
        )}
      </main>

      {/* Google Auth Modal (if user tries to publish while logged out) */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        user={user}
        onUserChange={(newUser) => setUser(newUser)}
      />
    </div>
  );
}
