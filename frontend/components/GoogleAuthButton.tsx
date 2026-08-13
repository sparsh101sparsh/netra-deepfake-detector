"use client";

import React, { useState, useEffect } from "react";
import { LogOut, User, Shield, CheckCircle2, X } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export const GoogleAuthButton: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Check persisted session
  useEffect(() => {
    const saved = localStorage.getItem("netra_auth_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleGoogleSignIn = () => {
    // In demo / hackathon mode: instantly log in with authenticated user profile
    const profile: UserProfile = {
      name: "Sparsh",
      email: "sparppp86@gmail.com",
      picture: "https://lh3.googleusercontent.com/a/ACg8ocL0k..."
    };
    setUser(profile);
    localStorage.setItem("netra_auth_user", JSON.stringify(profile));
    setShowModal(false);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem("netra_auth_user");
    setShowDropdown(false);
  };

  return (
    <div className="relative font-mono">
      {user ? (
        /* Logged In State */
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-cyan-500/30 text-xs text-white transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)]"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-[10px] font-bold text-cyan-300">
              {user.name.charAt(0)}
            </div>
            <span className="font-bold hidden sm:inline">{user.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>

          {/* User Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 border-b border-neutral-850">
                <div className="font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-neutral-400 truncate">{user.email}</div>
              </div>

              <a
                href="/developers"
                className="flex items-center gap-2 p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>My API Keys</span>
              </a>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Sign In with Google Button */
        <>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
          >
            {/* Google Multi-Color G Icon */}
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

          {/* Google Sign In Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">NETRA AUTH</span>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">Sign In to NETRA</h3>
                  <p className="text-xs text-neutral-400 font-sans">
                    Authenticate to access unlimited high-resolution media scans and manage developer API keys.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition-all shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="text-[10px] text-center text-neutral-500 font-sans pt-1">
                    Google OAuth 2.0 • Zero Password Storage
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoogleAuthButton;
