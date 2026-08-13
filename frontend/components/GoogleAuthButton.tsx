"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { LogOut, Shield, X, CheckCircle2, User, Palette, Sparkles } from "lucide-react";
import { NetraUserAvatar, NETRA_AVATARS, getAvatarByEmailOrName } from "./NetraUserAvatar";

interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  avatarIndex?: number;
  sub?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const GoogleAuthButton: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "934298152536-ft5qgqj1ouh125jrfckjiup1b3jp04gl.apps.googleusercontent.com";

  // Decode JWT helper
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
        // Assign random avatar index from 0 to 9 if new account
        const randomAvatarIndex = Math.floor(Math.random() * NETRA_AVATARS.length);
        const profile: UserProfile = {
          name: payload.name || payload.given_name || "Google User",
          email: payload.email,
          avatarIndex: randomAvatarIndex,
          sub: payload.sub,
        };
        setUser(profile);
        localStorage.setItem("netra_auth_user", JSON.stringify(profile));
        setShowModal(false);
      }
    }
  };

  // Restore saved session
  useEffect(() => {
    const saved = localStorage.getItem("netra_auth_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.avatarIndex !== "number") {
          parsed.avatarIndex = Math.floor(Math.random() * NETRA_AVATARS.length);
        }
        setUser(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  // Initialize GSI when script is loaded or modal opens
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

        if (showModal && googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_blue",
            size: "large",
            shape: "pill",
            width: 280,
            text: "signin_with",
          });
        }
      } catch (err) {
        console.error("GSI initialize error:", err);
      }
    }
  }, [gsiLoaded, showModal]);

  // Handle ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  const handleTriggerGooglePrompt = () => {
    // Open centered modal directly in the middle of the screen
    setShowModal(true);
  };

  const handleSelectAvatar = (index: number) => {
    if (!user) return;
    const updated = { ...user, avatarIndex: index };
    setUser(updated);
    localStorage.setItem("netra_auth_user", JSON.stringify(updated));
    setShowAvatarPicker(false);
  };

  const handleSignOut = () => {
    if (window.google?.accounts?.id && user?.email) {
      window.google.accounts.id.revoke(user.email, () => {
        console.log("Google session revoked");
      });
    }
    setUser(null);
    localStorage.removeItem("netra_auth_user");
    setShowDropdown(false);
    setShowAvatarPicker(false);
  };

  // Demo / Quick Sign-In fallback
  const handleQuickDemoSignIn = () => {
    const randomAvatarIndex = Math.floor(Math.random() * NETRA_AVATARS.length);
    const demoProfile: UserProfile = {
      name: "Forensic Analyst",
      email: "analyst@cybercell.gov.in",
      avatarIndex: randomAvatarIndex,
      sub: "netra_demo_user_001",
    };
    setUser(demoProfile);
    localStorage.setItem("netra_auth_user", JSON.stringify(demoProfile));
    setShowModal(false);
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGsiLoaded(true)}
      />

      <div className="relative font-mono">
        {user ? (
          /* Signed In State */
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-cyan-500/40 text-xs text-white transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)]"
            >
              <NetraUserAvatar 
                avatarIndex={user.avatarIndex} 
                seed={user.email} 
                size={24} 
              />
              <span className="font-bold hidden sm:inline max-w-[120px] truncate">{user.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {/* Profile Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-72 p-3 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 shadow-2xl z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                
                {/* User Header with Avatar */}
                <div className="flex items-center gap-3 p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-850">
                  <NetraUserAvatar 
                    avatarIndex={user.avatarIndex} 
                    seed={user.email} 
                    size={38} 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{user.email}</div>
                  </div>
                </div>

                {/* 10 Avatar Customizer Section */}
                <div className="p-2.5 bg-neutral-900/50 rounded-xl border border-neutral-850 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-400 font-bold flex items-center gap-1">
                      <Palette className="w-3 h-3 text-cyan-400" />
                      Cyber Avatar ({NETRA_AVATARS[user.avatarIndex ?? 0]?.name})
                    </span>
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="text-cyan-400 hover:text-cyan-300 font-bold"
                    >
                      {showAvatarPicker ? "Close" : "Change"}
                    </button>
                  </div>

                  {/* 10 Avatar Grid */}
                  {showAvatarPicker && (
                    <div className="grid grid-cols-5 gap-2 pt-1 animate-in fade-in duration-200">
                      {NETRA_AVATARS.map((av, idx) => (
                        <button
                          key={av.id}
                          onClick={() => handleSelectAvatar(idx)}
                          className={`p-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                            user.avatarIndex === idx
                              ? "ring-2 ring-cyan-400 bg-neutral-800 scale-105"
                              : "hover:bg-neutral-800/80 opacity-70 hover:opacity-100"
                          }`}
                          title={av.name}
                        >
                          <NetraUserAvatar avatarIndex={idx} size={28} showGlow={false} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation Actions */}
                <div className="space-y-1 pt-1 border-t border-neutral-850">
                  <a
                    href="/developers"
                    className="flex items-center gap-2 p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>My Developer API Keys</span>
                  </a>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        ) : (
          /* Sign In Button */
          <>
            <button
              onClick={handleTriggerGooglePrompt}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
            >
              {/* Google Multi-Color G */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Sign In</span>
            </button>

            {/* Google Authentication Centered Modal */}
            {showModal && (
              <div 
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setShowModal(false)}
              >
                <div 
                  className="bg-neutral-950/95 border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 tracking-widest uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                      NETRA AUTH
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="text-center space-y-2 pt-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Sign In with Google
                    </h3>
                    <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                      Authenticate with your official Google account to unlock institutional multi-modal forensic investigations and developer API keys.
                    </p>
                  </div>

                  {/* Official Google GSI Render Container */}
                  <div className="flex flex-col items-center justify-center py-4 space-y-4">
                    <div ref={googleBtnContainerRef} className="flex justify-center min-h-[44px]"></div>
                  </div>

                  {/* Quick Demo Access Fallback */}
                  <div className="pt-4 border-t border-neutral-850 flex flex-col items-center space-y-2">
                    <button
                      onClick={handleQuickDemoSignIn}
                      className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Instant Demo Access (Skip Google)</span>
                    </button>
                    <span className="text-[10px] text-neutral-500">For security testing and rapid review</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default GoogleAuthButton;
