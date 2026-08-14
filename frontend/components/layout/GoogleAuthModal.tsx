"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Script from "next/script";
import { 
  X, LogOut, Shield, KeyRound, Palette, CheckCircle2, 
  ExternalLink, User, Sparkles, Lock, ArrowRight, BookOpen 
} from "lucide-react";
import { NetraUserAvatar, NETRA_AVATARS, AvatarTheme } from "@/components/NetraUserAvatar";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: any;
  }
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  picture?: string;
  avatarIndex?: number;
  sub?: string;
  role?: string;
}

export interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
}

/**
 * GoogleAuthModal — Document.body Portaled Forensic Authentication Modal.
 * Encapsulates Google Identity Services login, 10-avatar customizer,
 * credential decoding, and localStorage persistence.
 */
export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
}) => {
  const [mounted, setMounted] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "avatars" | "keys">("account");
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "934298152536-ft5qgqj1ouh125jrfckjiup1b3jp04gl.apps.googleusercontent.com";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch blogs authored by this user
  useEffect(() => {
    if (isOpen && user) {
      setLoadingPosts(true);
      fetch(`/api/backend/api/v1/community/posts?author_email=${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.posts) {
            setUserPosts(data.posts);
          }
        })
        .catch(() => {
          try {
            const raw = localStorage.getItem("netra_community_posts");
            if (raw) {
              const all = JSON.parse(raw);
              const mine = all.filter(
                (p: any) =>
                  (p.author?.email && p.author.email.toLowerCase() === user.email.toLowerCase()) ||
                  (user.sub && p.author?.id === user.sub)
              );
              setUserPosts(mine);
            }
          } catch {
            // ignore
          }
        })
        .finally(() => setLoadingPosts(false));
    }
  }, [isOpen, user]);

  // Parse JWT token from Google Identity Services
  const parseJwt = (token: string): any => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to parse Google JWT:", e);
      return null;
    }
  };

  const handleCredentialResponse = (response: any) => {
    if (response && response.credential) {
      const payload = parseJwt(response.credential);
      if (payload) {
        const randomAvatarIndex = Math.floor(Math.random() * NETRA_AVATARS.length);
        const profile: UserProfile = {
          id: payload.sub || payload.email,
          name: payload.name || payload.given_name || "Community Member",
          email: payload.email,
          avatarIndex: randomAvatarIndex,
          sub: payload.sub,
        };
        onUserChange(profile);
        localStorage.setItem("netra_auth_user", JSON.stringify(profile));
        onClose();
      }
    }
  };

  // Initialize GSI when modal opens or script loads
  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        setGsiLoaded(true);

        if (isOpen && !user && googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_blue",
            size: "large",
            shape: "pill",
            width: 300,
            text: "signin_with",
          });
        }
      } catch (err) {
        console.error("GSI initialize error:", err);
      }
    }
  }, [gsiLoaded, isOpen, user]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectAvatar = (index: number) => {
    if (!user) return;
    const updated = { ...user, avatarIndex: index };
    onUserChange(updated);
    localStorage.setItem("netra_auth_user", JSON.stringify(updated));
    setIsEditingAvatar(false);
  };

  const handleSignOut = () => {
    if (window.google?.accounts?.id && user?.email) {
      window.google.accounts.id.revoke(user.email, () => {
        console.log("Google session revoked");
      });
    }
    onUserChange(null);
    localStorage.removeItem("netra_auth_user");
    setIsEditingAvatar(false);
    onClose();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiLoaded(true)}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        {/* Modal Window Container */}
        <div
          className={cn(
            "relative w-full max-w-lg bg-[var(--surface)] border-[1.5px] border-[var(--line-strong)]",
            "shadow-overlay rounded-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200",
            "text-[var(--ink)] font-sans select-none overflow-hidden"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-inset border-[1.5px] border-line flex items-center justify-center text-accent">
                <Shield className="size-4.5" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold tracking-wider text-accent uppercase">
                  NETRA IDENTITY GATEWAY
                </div>
                <div className="text-[11px] text-ink-3 font-mono">
                  {user ? "AUTHENTICATED SESSION" : "INSTITUTIONAL ACCESS"}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="size-8 rounded-lg bg-inset hover:bg-hover border-[1.5px] border-line flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
              aria-label="Close authentication modal"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* User Logged In State */}
          {user ? (
            <div className="space-y-6 relative z-10">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-canvas border-[1.5px] border-line shadow-card">
                <div className="relative group">
                  <NetraUserAvatar
                    avatarIndex={user.avatarIndex}
                    seed={user.email}
                    size={48}
                    showGlow={true}
                  />
                  <button
                    onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                    className="absolute -bottom-1 -right-1 size-5 rounded-full bg-surface border-[1.5px] border-line flex items-center justify-center text-accent hover:scale-110 transition-transform shadow-btn"
                    title="Change Cyber Avatar"
                  >
                    <Palette className="size-3" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-base truncate">
                      {user.name}
                    </span>
                    <StatusPill tone="active" size="sm" pulse>
                      ACTIVE
                    </StatusPill>
                  </div>
                  <div className="text-xs text-ink-2 font-mono truncate mt-0.5">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-ink-3 font-mono mt-1 flex items-center gap-1.5">
                    <span>Persona:</span>
                    <span className="text-accent font-medium">
                      {NETRA_AVATARS[user.avatarIndex ?? 0]?.name.split(" ")[0] || "Sentinel"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 10 Cyber Avatar Selector Grid (Collapsible/Toggled) */}
              {isEditingAvatar && (
                <div className="p-4 rounded-xl bg-inset border-[1.5px] border-line space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-ink-2 flex items-center gap-1.5">
                      <Palette className="size-3.5 text-accent" />
                      Select Cyber Operative Persona (10 Avatars)
                    </span>
                    <button
                      onClick={() => setIsEditingAvatar(false)}
                      className="text-xs font-mono text-accent hover:underline"
                    >
                      Done
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-2.5 pt-1">
                    {NETRA_AVATARS.map((av, idx) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => handleSelectAvatar(idx)}
                        className={cn(
                          "p-1.5 rounded-xl flex flex-col items-center justify-center transition-all duration-150 border-[1.5px]",
                          user.avatarIndex === idx
                            ? "border-accent bg-hover shadow-hairline scale-105"
                            : "border-transparent bg-canvas/60 hover:bg-hover opacity-70 hover:opacity-100"
                        )}
                        title={av.name}
                      >
                        <NetraUserAvatar avatarIndex={idx} size={32} showGlow={false} />
                        <span className="text-[9px] font-mono text-ink-3 truncate w-full text-center mt-1">
                          {av.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions & Security Links */}
              <div className="space-y-2">
                {/* My Published Blogs Link & Counter */}
                <a
                  href="/community"
                  className="flex items-center justify-between p-3 rounded-xl bg-canvas hover:bg-hover border-[1.5px] border-line transition-colors text-xs text-ink group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen className="size-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-ink flex items-center gap-2">
                        <span className="truncate">My Published Blogs</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-accent/15 text-accent border border-accent/25 shrink-0">
                          {userPosts.length}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-3 font-mono truncate">
                        {userPosts.length > 0 
                          ? `${userPosts.length} research write-up${userPosts.length > 1 ? "s" : ""} published to community`
                          : "Publish and view your community investigations"}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-ink-3 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>

                {/* Published Blogs Inline List (if user has posted) */}
                {userPosts.length > 0 && (
                  <div className="p-3 rounded-xl bg-inset border border-line space-y-2">
                    <div className="text-[10.5px] font-mono text-ink-3 uppercase tracking-wider font-semibold">
                      Your Articles
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {userPosts.map((p) => (
                        <a
                          key={p.id}
                          href="/community"
                          className="flex items-center justify-between p-2 rounded-lg bg-canvas hover:bg-hover border border-line text-xs transition-colors"
                        >
                          <span className="text-ink font-medium truncate max-w-[240px]">
                            {p.title}
                          </span>
                          <span className="text-[10px] font-mono text-ink-3 shrink-0 flex items-center gap-1.5">
                            <span>{p.views || 0} views</span>
                            <span>•</span>
                            <span>{p.likes || 0} likes</span>
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href="/developers"
                  className="flex items-center justify-between p-3 rounded-xl bg-canvas hover:bg-hover border-[1.5px] border-line transition-colors text-xs text-ink group"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="size-4 text-accent" />
                    <div>
                      <div className="font-medium text-ink">Developer API Keys</div>
                      <div className="text-[11px] text-ink-3 font-mono">
                        Manage authentication tokens for programmatic REST calls
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-ink-3 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </a>

                <a
                  href="/reported"
                  className="flex items-center justify-between p-3 rounded-xl bg-canvas hover:bg-hover border-[1.5px] border-line transition-colors text-xs text-ink group"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="size-4 text-green" />
                    <div>
                      <div className="font-medium text-ink">My Forensic Dossiers</div>
                      <div className="text-[11px] text-ink-3 font-mono">
                        View submitted evidence timelines & verified scam reports
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-ink-3 group-hover:text-green group-hover:translate-x-0.5 transition-all" />
                </a>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2 border-t border-line flex items-center justify-between">
                <div className="text-[11px] font-mono text-ink-3">
                  Sec 65B IT Act Forensic Audit Active
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-red hover:text-red hover:border-red/40"
                  leftIcon={<LogOut className="size-3.5" />}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            /* Logged Out / Sign In View */
            <div className="space-y-6 relative z-10 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-ink">
                  Institutional Authentication
                </h3>
                <p className="text-xs text-ink-2 leading-relaxed max-w-sm mx-auto">
                  Authenticate with your official Google identity to access multi-modal forensic sandboxes, live threat intelligence feeds, and automated API keys.
                </p>
              </div>

              {/* Official Google Button Render Container */}
              <div className="flex flex-col items-center justify-center min-h-[50px] py-2">
                <div ref={googleBtnContainerRef} className="flex justify-center min-h-[44px]"></div>
              </div>

              {/* Institutional Security Notice */}
              <div className="p-3 rounded-xl bg-canvas border-[1.5px] border-line text-[11px] font-mono text-ink-3 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-ink-2 font-medium">
                  <Lock className="size-3 text-accent" />
                  <span>Compliance & Forensic Chain of Custody</span>
                </div>
                <p className="leading-normal">
                  All audit actions and deepfake scans are stamped with cryptographic signatures in compliance with Section 65B of the Indian Evidence Act.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default GoogleAuthModal;
