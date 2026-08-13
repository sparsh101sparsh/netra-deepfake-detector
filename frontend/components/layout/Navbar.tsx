"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Scan, Globe, Database, Cpu, Terminal, Users,
  Menu, X, Shield, Activity, Sparkles, ChevronDown 
} from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { NetraUserAvatar, NETRA_AVATARS } from "@/components/NetraUserAvatar";
import { GoogleAuthModal, UserProfile } from "./GoogleAuthModal";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Live Scanner", icon: Scan, id: "scanner" },
  { href: "/reported", label: "Catalog", icon: Database, id: "reported" },
  { href: "/radar", label: "Threat Radar", icon: Globe, id: "radar" },
  { href: "/community", label: "Community", icon: Users, id: "community" },
  { href: "/developers", label: "API Docs", icon: Terminal, id: "developers" },
  { href: "/technology", label: "Technology", icon: Cpu, id: "technology" },
];

export interface NavbarProps {
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
  className?: string;
}

/**
 * Navbar — Sticky Glassmorphic Forensic Navigation Header.
 * Features NETRA glowing eye mark, sliding pill segmented menu,
 * live telemetry pill, and Google Auth modal trigger with avatar preview.
 */
export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigateSection,
  className = "",
}) => {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Restore authenticated session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("netra_auth_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch (err) {
        console.error("Failed to restore auth session:", err);
      }
    }
  }, []);

  // Track scroll position for subtle glass opacity intensification
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isNavActive = (item: NavItem) => {
    if (activeSection) {
      return activeSection === item.id || (item.id === "scanner" && activeSection === "analyzer");
    }
    if (pathname === item.href) return true;
    if (item.href !== "/" && pathname?.startsWith(item.href)) return true;
    return false;
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-200 select-none",
          "border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-md",
          scrolled && "bg-[var(--surface)]/95 shadow-overlay",
          className
        )}
      >
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-18 flex items-center justify-between gap-4">
          
          {/* Brand Identity & Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href="/" 
              className="flex items-center gap-3 group focus-visible:outline-none"
              aria-label="NETRA Home"
            >
              <div className="relative">
                <NetraBrandLogo size={36} />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-accent animate-ping" />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-accent" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans transition-colors">
                    NETRA
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 -mt-0.5 uppercase tracking-wider">
                  Eyes that see through
                </span>
              </div>
            </Link>
          </div>

          {/* Center Segmented Navigation Menu (Desktop) */}
          <nav 
            className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#141416] border border-white/10 shadow-card"
            aria-label="Main Navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const IconComp = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (pathname === "/" && item.href === "/" && onNavigateSection) {
                      e.preventDefault();
                      onNavigateSection("analyzer");
                    }
                  }}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold font-sans transition-colors duration-150 truncate cursor-pointer",
                    active
                      ? "bg-[#0084ff] text-white hover:bg-[#0073e6] border-0 shadow-none"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  {active && (
                    <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  )}
                  <IconComp className={cn("size-3.5", active ? "text-white" : "text-zinc-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Cluster: Auth */}
          <div className="flex items-center gap-2.5">
            {/* Google Auth Button / User Avatar Trigger */}
            {user ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className={cn(
                  "flex items-center gap-2.5 h-9 px-3.5 rounded-full",
                  "bg-[#18181B] hover:bg-[#222226] border border-[#0084ff]/40 hover:border-[#0084ff]/80",
                  "shadow-card text-xs font-semibold text-white transition-all duration-150 cursor-pointer",
                  "focus-visible:ring-2 focus-visible:ring-[#0084ff]/50 active:scale-[0.98]"
                )}
                aria-label="User Profile and Settings"
              >
                <NetraUserAvatar
                  avatarIndex={user.avatarIndex}
                  seed={user.email}
                  size={22}
                  showGlow={false}
                />
                <span className="font-semibold max-w-[120px] sm:max-w-[150px] truncate hidden sm:inline text-white">
                  {user.name}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className={cn(
                  "flex items-center gap-2 h-9 px-5 rounded-full",
                  "bg-[#0084ff] hover:bg-[#0073e6] border-0",
                  "text-xs font-semibold text-white shadow-none transition-colors duration-150 cursor-pointer active:scale-[0.98]"
                )}
              >
                {/* Clean Google Icon */}
                <div className="size-4 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
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
                </div>
                <span className="leading-none">Sign In</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden size-9 rounded-lg bg-inset hover:bg-hover border-[1.5px] border-line flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-line bg-surface/98 backdrop-blur-xl px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Navigation
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {NAV_ITEMS.map((item) => {
                const active = isNavActive(item);
                const IconComp = item.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-sans font-medium transition-colors border-0",
                      active
                        ? "bg-[#0084ff] text-white font-semibold shadow-none"
                        : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    <IconComp className={cn("size-4", active ? "text-white" : "text-zinc-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal Portal */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        user={user}
        onUserChange={setUser}
      />
    </>
  );
};

export default Navbar;
