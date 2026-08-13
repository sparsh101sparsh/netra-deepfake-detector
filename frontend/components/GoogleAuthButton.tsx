"use client";

import React, { useState, useEffect } from "react";
import { GoogleAuthModal, UserProfile } from "./layout/GoogleAuthModal";
import { NetraUserAvatar } from "./NetraUserAvatar";
import { cn } from "@/lib/utils";

export interface GoogleAuthButtonProps {
  className?: string;
}

/**
 * GoogleAuthButton — Subtle Dark Google Auth Component.
 * Integrates with GoogleAuthModal and handles avatar display and session persistence.
 */
export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ className = "" }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Restore authenticated session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("netra_auth_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch (err) {
        console.error("Failed to restore auth session in GoogleAuthButton:", err);
      }
    }
  }, []);

  return (
    <>
      <div className={cn("relative font-mono", className)}>
        {user ? (
          /* Authenticated User Button */
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-1.5 rounded-full",
              "bg-[var(--canvas)] hover:bg-[var(--hover)] border-[1.5px] border-[var(--border)]",
              "shadow-hairline text-xs font-medium text-ink transition-all duration-150",
              "focus-visible:ring-1 focus-visible:ring-accent"
            )}
            title={`Signed in as ${user.name} (${user.email})`}
          >
            <NetraUserAvatar
              avatarIndex={user.avatarIndex}
              seed={user.email}
              size={22}
              showGlow={false}
            />
            <span className="font-semibold hidden sm:inline max-w-[120px] truncate text-ink">
              {user.name}
            </span>
            <span className="size-2 rounded-full bg-green animate-pulse" />
          </button>
        ) : (
          /* Sign In Trigger */
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full",
              "bg-[var(--canvas)] hover:bg-[var(--hover)] border-[1.5px] border-[var(--border)]",
              "shadow-hairline text-xs font-medium text-ink transition-all duration-150",
              "hover:border-line-strong focus-visible:ring-1 focus-visible:ring-accent hover:scale-[1.02]"
            )}
          >
            {/* Google Multi-Color G */}
            <svg className="size-3.5 shrink-0" viewBox="0 0 24 24">
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
        )}
      </div>

      {/* Auth Modal Portal */}
      <GoogleAuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={user}
        onUserChange={setUser}
      />
    </>
  );
};

export default GoogleAuthButton;
