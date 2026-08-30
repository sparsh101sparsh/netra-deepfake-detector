"use client";

import React, { useState, useEffect } from "react";
import { 
  Key, Terminal, Copy, Check, Plus, Trash2, 
  Play, Sparkles, Code, RefreshCw, Send, CheckCircle2, AlertCircle,
  Activity, ShieldAlert, Zap, Clock, BookOpen, Layers, Phone, CreditCard, Link as LinkIcon, Download
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { GlideMenu } from "@/components/atoms/GlideMenu";
import { AuthRequiredGate } from "@/components/auth/AuthRequiredGate";
import { GoogleAuthModal, UserProfile } from "@/components/layout/GoogleAuthModal";

interface ApiKeyItem {
  key_id: string;
  key_prefix: string;
  name: string;
  tier: string;
  monthly_quota: number;
  used_requests: number;
  created_at: string;
  last_used_at?: string;
  raw_key?: string;
}

const RAW_KEYS_STORAGE_KEY = "netra_dev_raw_keys";

function getSavedRawKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RAW_KEYS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRawKeyToStorage(keyId: string, rawKey: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedRawKeys();
    current[keyId] = rawKey;
    localStorage.setItem(RAW_KEYS_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

const SAMPLE_PAYLOADS = [
  {
    name: "Digital Arrest",
    city: "Mumbai",
    text: "Mumbai Police Cyber Cell notice: Illegal narcotic parcel intercepted in your name. Connect on video call for digital arrest clearance.",
  },
  {
    name: "Electricity Bill",
    city: "New Delhi",
    text: "Dear user your power will be disconnected at 9:30 PM tonight due to unpaid bill. Pay immediately at bses.billpay@paytm or call officer.",
  },
  {
    name: "Job Task",
    city: "Bengaluru",
    text: "Earn ₹5,000 daily with part time YouTube video like task. Join VIP Telegram group @Global_Marketing_VIP and start instant payout.",
  },
  {
    name: "Banking KYC",
    city: "Hyderabad",
    text: "Urgent: Your HDFC Bank account will be blocked within 24 hours. Update PAN & KYC immediately at https://hdfc-kyc-verify.apk",
  },
  {
    name: "Crypto Syndicate",
    city: "Ahmedabad",
    text: "Guaranteed 500% return with SEBI registered VIP institutional tips. Deposit USDT to start trading immediately with account manager.",
  },
];

export default function DevelopersPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [keyNameInput, setKeyNameInput] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "python" | "javascript">("curl");

  // Playground state
  const [playgroundText, setPlaygroundText] = useState("");
  const [playgroundCity, setPlaygroundCity] = useState("New Delhi");
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/backend/api/v1/developers/keys");
      if (res.ok) {
        const data = await res.json();
        const savedMap = getSavedRawKeys();
        const loadedKeys: ApiKeyItem[] = (data.keys || []).map((k: ApiKeyItem) => ({
          ...k,
          raw_key: savedMap[k.key_id] || k.raw_key,
        }));
        setKeys(loadedKeys);
        if (loadedKeys.length > 0) {
          const defaultKey = loadedKeys[0];
          setSelectedKeyId((prev) => prev || defaultKey.key_id);
          setActiveKey((prev) => prev || defaultKey.raw_key || defaultKey.key_prefix);
        }
      }
    } catch (err) {
      console.error("Failed to load keys", err);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = localStorage.getItem("netra_auth_user") || localStorage.getItem("netra_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchKeys();
    }
  }, [user]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyNameInput.trim()) return;

    try {
      const res = await fetch("/api/backend/api/v1/developers/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyNameInput, tier: "developer" }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.key;
        setKeyNameInput("");
        setIsCreatingKey(false);
        if (created?.raw_key) {
          saveRawKeyToStorage(created.key_id, created.raw_key);
          setNewlyCreatedKey(created.raw_key);
          setActiveKey(created.raw_key);
          setSelectedKeyId(created.key_id);
        }
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to create key", err);
    }
  };

  const handleDeleteKey = async (keyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/backend/api/v1/developers/keys/${keyId}`, { method: "DELETE" });
      fetchKeys();
    } catch (err) {
      console.error("Failed to delete key", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const selectKey = (item: ApiKeyItem) => {
    setSelectedKeyId(item.key_id);
    setActiveKey(item.raw_key || item.key_prefix);
  };

  const runPlaygroundTest = async () => {
    if (!activeKey) {
      setPlaygroundResponse({ error: "Please select or generate an API key to execute sandbox queries." });
      return;
    }
    setIsRunningPlayground(true);
    setPlaygroundResponse(null);
    setResponseTimeMs(null);
    const startTime = performance.now();

    const sanitizedHeaderKey = activeKey.replace(/[^a-zA-Z0-9_-]/g, "");

    try {
      const res = await fetch("/api/backend/api/v1/public/detect/scam-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": sanitizedHeaderKey,
        },
        body: JSON.stringify({
          message: playgroundText,
          city: playgroundCity || "New Delhi",
        }),
      });
      const data = await res.json();
      const duration = Math.round(performance.now() - startTime);
      setResponseTimeMs(duration);
      setPlaygroundResponse(data);
      fetchKeys();
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setResponseTimeMs(duration);
      setPlaygroundResponse({ error: err.message || "Failed to execute API call" });
    } finally {
      setIsRunningPlayground(false);
    }
  };

  const selectedKeyData = keys.find((k) => k.key_id === selectedKeyId) || keys[0] || null;

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-white/20 selection:text-white">
      <Navbar />

      {/* Main Content (Wide Layout) */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-10 space-y-8 animate-in fade-in duration-500 font-sans flex-1">
        {!isCheckingAuth && !user ? (
          <AuthRequiredGate
            title="Developer Console & API Keys"
            subtitle="Generate API credentials, monitor request quotas, and run live inference in the REST playground. Sign in to access your keys."
            badge="SIGN IN REQUIRED"
            icon={Key}
            onSignInClick={() => setIsAuthModalOpen(true)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-line pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-ink-2 uppercase tracking-widest mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Developer Platform
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                  API Access & Console
                </h1>
                <p className="text-ink-2 text-sm sm:text-base mt-1.5 max-w-2xl font-sans">
                  Integrate NETRA’s real-time detection, threat intelligence lookup, and scam triage into your applications.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-surface border border-line text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  API v5.1 • Operational
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column (5 Cols): API Keys & Quota */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* API Keys Card */}
                <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-bold text-sm text-ink">Your API Keys</h2>
                        <span className="text-[10px] text-ink-3">Encrypted SHA-256 vault</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsCreatingKey(!isCreatingKey)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Key
                    </button>
                  </div>

                  {/* Create Key Form */}
                  {isCreatingKey && (
                    <form onSubmit={handleCreateKey} className="bg-inset p-4 rounded-xl border border-line space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink font-semibold">Generate New API Key</span>
                        <span className="text-[10px] font-mono text-ink-3">Developer Tier</span>
                      </div>
                      <input
                        type="text"
                        value={keyNameInput}
                        onChange={(e) => setKeyNameInput(e.target.value)}
                        placeholder="e.g. Production Mobile App"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-line text-ink placeholder-ink-3 focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none"
                        required
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCreatingKey(false)}
                          className="px-3 py-1.5 text-xs text-ink-3 hover:text-ink font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          Create Key
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Newly Created Key Alert Banner */}
                  {newlyCreatedKey && (
                    <div className="p-4 rounded-xl bg-green-500/10 border-[1.5px] border-green-500/30 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          Key Created Successfully
                        </span>
                        <button
                          onClick={() => setNewlyCreatedKey(null)}
                          className="text-[11px] text-ink-3 hover:text-ink font-semibold"
                        >
                          Dismiss
                        </button>
                      </div>
                      <p className="text-[11px] text-ink-2 leading-relaxed">
                        Copy your API key now. For your security, this key won&apos;t be shown again in full after this session.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          readOnly
                          value={newlyCreatedKey}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-line font-mono text-xs text-ink select-all outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(newlyCreatedKey)}
                          className="px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95"
                        >
                          {copiedKey === newlyCreatedKey ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Keys List */}
                  <div className="space-y-2.5">
                    {keys.length === 0 ? (
                      <div className="bg-inset p-5 rounded-xl border border-line text-center text-xs text-ink-3 space-y-1">
                        <Key className="w-6 h-6 mx-auto opacity-40 mb-2" />
                        <p className="font-semibold text-ink-2">No API keys found</p>
                        <p className="text-[11px]">Click &ldquo;New Key&rdquo; above to generate your first credentials.</p>
                      </div>
                    ) : (
                      <GlideMenu
                        className="flex flex-col gap-2.5"
                        highlightClassName="inset-0 bg-white/[0.04] rounded-xl border border-white/10"
                        rowSelector="[data-menu-row]"
                      >
                        {keys.map((k) => {
                          const isSelected = selectedKeyId === k.key_id;
                          return (
                            <div
                              key={k.key_id}
                              data-menu-row
                              onClick={() => selectKey(k)}
                              className={`relative z-10 p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-white/[0.07] border-white/30 shadow-sm"
                                  : "bg-surface border-line hover:border-line-strong"
                              }`}
                            >
                              <div className="space-y-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-ink truncate">{k.name}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    k.tier === "enterprise"
                                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                                      : "bg-inset text-ink-2"
                                  }`}>
                                    {k.tier}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] font-mono text-green-400 font-semibold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-ink-3 font-mono">
                                  <span>{k.raw_key ? `${k.raw_key.slice(0, 16)}••••` : k.key_prefix}</span>
                                  <span className="text-ink-3 font-sans text-[10px]">
                                    {k.used_requests} / {k.monthly_quota > 0 ? k.monthly_quota.toLocaleString() : "Unlimited"} reqs
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => copyToClipboard(k.raw_key || k.key_prefix)}
                                  className="p-1.5 text-ink-3 hover:text-ink rounded-lg hover:bg-inset transition-colors"
                                  title="Copy Key"
                                >
                                  {copiedKey === (k.raw_key || k.key_prefix) ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => handleDeleteKey(k.key_id, e)}
                                  className="p-1.5 text-ink-3 hover:text-red-400 rounded-lg hover:bg-inset transition-colors"
                                  title="Revoke Key"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </GlideMenu>
                    )}
                  </div>
                </div>

                {/* API Quota & Limits Card */}
                {selectedKeyData && (
                  <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-ink-2" />
                        <h2 className="font-bold text-sm text-ink">Usage & Quota</h2>
                      </div>
                      <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">
                        Current Period
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-ink-2 font-medium">Monthly Requests</span>
                          <span className="font-mono text-ink font-semibold">
                            {selectedKeyData.used_requests.toLocaleString()} /{" "}
                            {selectedKeyData.monthly_quota > 0
                              ? selectedKeyData.monthly_quota.toLocaleString()
                              : "Unlimited"}
                          </span>
                        </div>
                        {selectedKeyData.monthly_quota > 0 ? (
                          <div className="w-full bg-inset h-2 rounded-full overflow-hidden border border-line">
                            <div
                              className="bg-white h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((selectedKeyData.used_requests / selectedKeyData.monthly_quota) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full bg-inset h-2 rounded-full overflow-hidden border border-line">
                            <div className="bg-green-500/80 h-full w-full rounded-full" />
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-ink-3 mt-1 font-mono">
                          <span>
                            {selectedKeyData.monthly_quota > 0
                              ? `${Math.round((selectedKeyData.used_requests / selectedKeyData.monthly_quota) * 100)}% used`
                              : "0% consumption"}
                          </span>
                          <span>
                            {selectedKeyData.monthly_quota > 0
                              ? `${(selectedKeyData.monthly_quota - selectedKeyData.used_requests).toLocaleString()} remaining`
                              : "Unlimited access"}
                          </span>
                        </div>
                      </div>

                      {/* Performance Specs Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-inset p-3 rounded-xl border border-line space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-ink-3 uppercase font-mono">
                            <Zap className="w-3 h-3 text-amber-400" /> Rate Limit
                          </div>
                          <div className="text-xs font-bold text-ink">60 req / minute</div>
                        </div>

                        <div className="bg-inset p-3 rounded-xl border border-line space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-ink-3 uppercase font-mono">
                            <Clock className="w-3 h-3 text-green-400" /> Latency SLA
                          </div>
                          <div className="text-xs font-bold text-ink">&lt; 150 ms</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column (7 Cols): Interactive API Tester & Code Examples */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Interactive API Tester */}
                <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-white" />
                      <h2 className="font-bold text-sm text-ink">API Tester</h2>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-mono font-bold uppercase tracking-wider">
                      Interactive Sandbox
                    </span>
                  </div>

                  {/* Active Key Indicator */}
                  <div className="flex items-center justify-between bg-inset px-3 py-2 rounded-xl border border-line text-xs font-mono">
                    <div className="flex items-center gap-2 text-ink-3">
                      <Key className="w-3.5 h-3.5 text-ink-2" />
                      <span>Key:</span>
                      <span className="text-ink font-semibold truncate max-w-[240px]">
                        {activeKey || "No key selected"}
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-3 font-sans">
                      Header: <strong className="text-ink font-mono">X-API-Key</strong>
                    </span>
                  </div>

                  {/* Tester Form */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-ink-2 font-medium">Test Message Payload</label>
                        <span className="text-[10px] text-ink-3 font-mono">{playgroundText.length} characters</span>
                      </div>
                      <textarea
                        rows={3}
                        value={playgroundText}
                        onChange={(e) => setPlaygroundText(e.target.value)}
                        placeholder="Enter or select a sample payload to test API response..."
                        className="w-full px-3 py-2.5 rounded-xl bg-surface border border-line focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none text-xs text-ink placeholder-ink-3 transition-all font-mono leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-ink-3 text-[11px]">Location:</span>
                        <input
                          type="text"
                          value={playgroundCity}
                          onChange={(e) => setPlaygroundCity(e.target.value)}
                          placeholder="e.g. New Delhi"
                          className="px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none text-xs text-ink w-32 placeholder:text-ink-3"
                        />
                      </div>

                      {/* Execute Button — High Contrast & Clear State */}
                      <button
                        onClick={runPlaygroundTest}
                        disabled={isRunningPlayground || !playgroundText.trim() || !activeKey}
                        className="px-5 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
                      >
                        {isRunningPlayground ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Execute
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick Sample Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] text-ink-3 self-center font-medium">Quick Samples:</span>
                      {SAMPLE_PAYLOADS.map((sample) => (
                        <button
                          key={sample.name}
                          type="button"
                          onClick={() => {
                            setPlaygroundText(sample.text);
                            setPlaygroundCity(sample.city);
                          }}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-inset border border-line text-ink-2 hover:text-ink hover:border-line-strong transition-all font-medium active:scale-95"
                        >
                          {sample.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Response Viewer */}
                  {playgroundResponse && (
                    <div className="mt-4 pt-4 border-t border-line space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 font-semibold border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            Status: 200 OK
                          </span>
                          {responseTimeMs !== null && (
                            <span className="font-mono text-[10px] text-ink-3">
                              {responseTimeMs} ms
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => copyToClipboard(JSON.stringify(playgroundResponse, null, 2))}
                          className="text-[11px] text-ink-3 hover:text-ink flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-inset transition-colors font-medium"
                        >
                          {copiedKey === JSON.stringify(playgroundResponse, null, 2) ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Output
                            </>
                          )}
                        </button>
                      </div>

                      {/* Threat Summary Pills */}
                      {playgroundResponse.scam_detected !== undefined && (
                        <div className="p-3.5 rounded-xl bg-inset border border-line space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                playgroundResponse.scam_detected
                                  ? "bg-red-500/10 border border-red-500/30 text-red-400"
                                  : "bg-green-500/10 border border-green-500/30 text-green-400"
                              }`}>
                                {playgroundResponse.scam_detected ? "SCAM DETECTED" : "BENIGN / CLEAN"}
                              </span>
                              {playgroundResponse.threat_category && (
                                <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-mono text-ink font-semibold">
                                  {playgroundResponse.threat_category}
                                </span>
                              )}
                            </div>

                            {playgroundResponse.confidence && (
                              <span className="text-[11px] font-mono text-ink-2">
                                Confidence: <strong className="text-ink">{Math.round(playgroundResponse.confidence * 100)}%</strong>
                              </span>
                            )}
                          </div>

                          {playgroundResponse.explanation && (
                            <p className="text-xs text-ink-2 leading-relaxed">
                              {playgroundResponse.explanation}
                            </p>
                          )}

                          {/* Extracted IOCs */}
                          {playgroundResponse.extracted_iocs && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-line/60">
                              {playgroundResponse.extracted_iocs.phones?.map((ph: string) => (
                                <span key={ph} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-line text-amber-300">
                                  <Phone className="w-2.5 h-2.5" /> {ph}
                                </span>
                              ))}
                              {playgroundResponse.extracted_iocs.upis?.map((upi: string) => (
                                <span key={upi} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-line text-blue-300">
                                  <CreditCard className="w-2.5 h-2.5" /> {upi}
                                </span>
                              ))}
                              {playgroundResponse.extracted_iocs.urls?.map((url: string) => (
                                <span key={url} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-line text-purple-300 truncate max-w-[200px]">
                                  <LinkIcon className="w-2.5 h-2.5 shrink-0" /> {url}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Raw JSON viewer */}
                      <pre className="bg-inset border border-line rounded-xl p-4 font-mono text-xs text-ink-2 overflow-x-auto max-h-56 leading-relaxed select-all">
                        {JSON.stringify(playgroundResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Code Snippets Card */}
                <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-white" />
                      <h2 className="font-bold text-sm text-ink">Code Examples</h2>
                    </div>

                    <SegmentedControl
                      options={["curl", "python", "javascript"] as const}
                      value={activeSnippetTab}
                      onChange={setActiveSnippetTab}
                      size="sm"
                      renderOption={(tab) => <span className="uppercase font-bold text-[11px]">{tab}</span>}
                    />
                  </div>

                  {/* Snippet Code View */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        const code = activeSnippetTab === "curl" 
                          ? `curl -X POST "https://api.netra.ai/api/v1/public/detect/scam-text" \\\n  -H "X-API-Key: ${activeKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Dear customer, your electricity bill is unpaid..."}'`
                          : activeSnippetTab === "python"
                          ? `import requests\n\nurl = "https://api.netra.ai/api/v1/public/detect/scam-text"\nheaders = {"X-API-Key": "${activeKey}", "Content-Type": "application/json"}\npayload = {"message": "Dear customer, your electricity bill is unpaid..."}\n\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.json())`
                          : `const response = await fetch("https://api.netra.ai/api/v1/public/detect/scam-text", {\n  method: "POST",\n  headers: {\n    "X-API-Key": "${activeKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ message: "Dear customer, your electricity bill is unpaid..." })\n});\nconst result = await response.json();\nconsole.log(result);`;
                        navigator.clipboard.writeText(code);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface text-ink-3 hover:text-ink text-xs flex items-center gap-1 shadow-sm border border-line transition-colors"
                      title="Copy Code"
                    >
                      {copiedSnippet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[10px] text-green-500 font-semibold">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <pre className="bg-inset border border-line rounded-xl p-4 font-mono text-xs text-ink-2 overflow-x-auto leading-relaxed">
                      {activeSnippetTab === "curl" && (
                        `curl -X POST "https://api.netra.ai/api/v1/public/detect/scam-text" \\
  -H "X-API-Key: ${activeKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Dear customer, your electricity bill is unpaid..."}'`
                      )}
                      {activeSnippetTab === "python" && (
                        `import requests

url = "https://api.netra.ai/api/v1/public/detect/scam-text"
headers = {
    "X-API-Key": "${activeKey}",
    "Content-Type": "application/json"
}
payload = {
    "message": "Dear customer, your electricity bill is unpaid..."
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`
                      )}
                      {activeSnippetTab === "javascript" && (
                        `const response = await fetch("https://api.netra.ai/api/v1/public/detect/scam-text", {
  method: "POST",
  headers: {
    "X-API-Key": "${activeKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "Dear customer, your electricity bill is unpaid..."
  })
});
const result = await response.json();
console.log(result);`
                      )}
                    </pre>
                  </div>

                </div>

              </div>

            </div>

            {/* REST API Reference Section (Full Width) */}
            <div className="border-[1.5px] border-line bg-surface rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-ink">REST API Reference</h2>
                    <p className="text-xs text-ink-3">Available endpoints, parameters, and authentication specifications</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-ink-3 px-3 py-1 rounded-lg bg-inset border border-line">
                  Base URL: https://api.netra.ai
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Endpoint 1 */}
                <div className="bg-inset p-4 rounded-xl border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                      POST
                    </span>
                    <span className="text-[10px] font-mono text-ink-3">Auth: X-API-Key</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-ink truncate">
                    /api/v1/public/detect/scam-text
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    Synchronous NLP scam detection. Classifies threat type, calculates confidence, and extracts IOCs (phones, UPIs, APKs).
                  </p>
                </div>

                {/* Endpoint 2 */}
                <div className="bg-inset p-4 rounded-xl border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                      POST
                    </span>
                    <span className="text-[10px] font-mono text-ink-3">Auth: X-API-Key</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-ink truncate">
                    /api/v1/public/detect/image
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    Visual deepfake inspection powered by GenD ViT-L/14 foundation model and forensic EXIF metadata analysis.
                  </p>
                </div>

                {/* Endpoint 3 */}
                <div className="bg-inset p-4 rounded-xl border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      GET
                    </span>
                    <span className="text-[10px] font-mono text-ink-3">Public / Open</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-ink truncate">
                    /api/v1/threat-intelligence/catalog
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    Query active threat intelligence catalog by keyword, phone, UPI ID, or location with pagination and category filtering.
                  </p>
                </div>

              </div>
            </div>

          </>
        )}

      </main>

      <Footer />

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUserChange={(loggedUser) => {
          setUser(loggedUser);
          if (loggedUser) {
            localStorage.setItem("netra_auth_user", JSON.stringify(loggedUser));
            setIsAuthModalOpen(false);
            fetchKeys();
          }
        }}
      />
    </div>
  );
}
