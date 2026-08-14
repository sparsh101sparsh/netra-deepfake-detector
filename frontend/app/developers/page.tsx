"use client";

import React, { useState, useEffect } from "react";
import { 
  Key, Terminal, Shield, Copy, Check, Plus, Trash2, 
  Play, Sparkles, Code, RefreshCw, Send, CheckCircle2, AlertCircle 
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SegmentedControl } from "@/components/atoms/SegmentedControl";
import { GlideMenu } from "@/components/atoms/GlideMenu";

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

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [keyNameInput, setKeyNameInput] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "python" | "javascript">("curl");

  // Playground state
  const [playgroundText, setPlaygroundText] = useState(
    "Dear customer, your electricity power will be disconnected at 9:30 PM tonight due to unpaid bill. Call officer Ramesh at 9876543210 immediately or pay via bses-power.apk"
  );
  const [playgroundCity, setPlaygroundCity] = useState("New Delhi");
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/backend/api/v1/developers/keys");
      if (res.ok) {
        const data = await res.json();
        const loadedKeys = data.keys || [];
        setKeys(loadedKeys);
        if (loadedKeys.length > 0) {
          setActiveKey((prev) => prev || loadedKeys[0].raw_key || loadedKeys[0].key_prefix);
        }
      }
    } catch (err) {
      console.error("Failed to load keys", err);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

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
        setKeyNameInput("");
        setIsCreatingKey(false);
        if (data.key?.raw_key) {
          setActiveKey(data.key.raw_key);
        }
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to create key", err);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
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

  const runPlaygroundTest = async () => {
    if (!activeKey) {
      setPlaygroundResponse({ error: "Please generate an API key to execute sandbox queries." });
      return;
    }
    setIsRunningPlayground(true);
    setPlaygroundResponse(null);
    try {
      const res = await fetch("/api/backend/api/v1/public/detect/scam-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": activeKey,
        },
        body: JSON.stringify({
          message: playgroundText,
          city: playgroundCity,
        }),
      });
      const data = await res.json();
      setPlaygroundResponse(data);
      fetchKeys();
    } catch (err: any) {
      setPlaygroundResponse({ error: err.message || "Failed to execute API call" });
    } finally {
      setIsRunningPlayground(false);
    }
  };

  const activeKeyData = keys.find((k) => k.raw_key === activeKey || k.key_prefix === activeKey) || keys[0] || null;

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans selection:bg-accent/30 selection:text-accent">
      <Navbar />

      {/* Main Content (Wide Layout) */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-10 space-y-8 animate-in fade-in duration-500 font-sans flex-1">
        
        {/* Header */}
        <div className="border-b border-line pb-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-accent uppercase tracking-widest mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            Developer Platform
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            API Access & Console
          </h1>
          <p className="text-ink-2 text-sm sm:text-base mt-1 max-w-2xl font-sans">
            Integrate NETRA’s real-time detection, threat intelligence lookup, and scam triage into your applications.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (5 Cols): API Keys & Quota */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* API Keys Card */}
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-ink">Your API Keys</h2>
                    <span className="text-[10px] text-ink-3">Encrypted storage</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreatingKey(!isCreatingKey)}
                  className="px-2.5 py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Key
                </button>
              </div>

              {/* Create Key Form */}
              {isCreatingKey && (
                <form onSubmit={handleCreateKey} className="bg-inset p-4 rounded-xl border border-line space-y-3">
                  <span className="text-[11px] text-ink-2 font-bold">Generate New Key</span>
                  <input
                    type="text"
                    value={keyNameInput}
                    onChange={(e) => setKeyNameInput(e.target.value)}
                    placeholder="e.g. Production Mobile App"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-line text-ink placeholder-ink-3 focus:border-accent/60 focus:ring-1 focus:ring-accent/40 outline-none"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingKey(false)}
                      className="px-3 py-1.5 text-xs text-ink-3 hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/80 text-xs font-bold transition-all"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Keys List */}
              <div className="space-y-3">
                {keys.length === 0 ? (
                  <div className="bg-inset p-4 rounded-xl border border-line text-center text-xs text-ink-3">
                    No keys found. Generate a new key above.
                  </div>
                ) : (
                  <GlideMenu
                    className="flex flex-col gap-2"
                    highlightClassName="inset-0 bg-accent/5 rounded-xl border border-accent/30"
                    rowSelector="[data-menu-row]"
                  >
                    {keys.map((k) => (
                      <div
                        key={k.key_id}
                        data-menu-row
                        className={`relative z-10 p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                          activeKey === k.raw_key || activeKey === k.key_prefix
                            ? "bg-accent/10 border-accent/40 shadow-sm"
                            : "bg-surface border-line"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink">{k.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-inset text-ink-2 uppercase">
                              {k.tier}
                            </span>
                          </div>
                          <span className="text-[11px] text-ink-3 font-mono">{k.key_prefix}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
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
                            onClick={() => handleDeleteKey(k.key_id)}
                            className="p-1.5 text-ink-3 hover:text-red-500 rounded-lg hover:bg-inset transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </GlideMenu>
                )}
              </div>
            </div>

            {/* Usage Quota Card */}
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-ink">Usage Quota</h2>
                  <span className="text-[10px] text-green-600 dark:text-green-400">
                    {activeKeyData?.tier ? `${activeKeyData.tier.toUpperCase()} TIER` : "No Active Key"}
                  </span>
                </div>
              </div>

              {activeKeyData ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-ink-2 font-mono">
                    <span>API Calls Used</span>
                    <strong>{activeKeyData.used_requests} / {activeKeyData.monthly_quota}</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-inset overflow-hidden border border-line">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.min(
                            100,
                            (activeKeyData.used_requests / (activeKeyData.monthly_quota || 1)) * 100
                          )
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-ink-3 flex justify-between pt-1 font-mono">
                    <span>Rate: 60 req/min</span>
                    <span>Monthly Quota Active</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-ink-3">
                  Generate an API key above to activate and track your quota consumption.
                </div>
              )}
            </div>

          </div>

          {/* Right Column (7 Cols): Interactive API Tester & Docs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Interactive API Tester */}
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-accent" />
                  <h2 className="font-bold text-sm text-ink">API Tester</h2>
                </div>
                <span className="text-[10px] text-ink-3 uppercase tracking-widest font-bold">
                  Try it out
                </span>
              </div>

              {/* Tester Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-ink-2 mb-1 block">Test Message Payload</label>
                  <textarea
                    rows={3}
                    value={playgroundText}
                    onChange={(e) => setPlaygroundText(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-line focus:border-accent/60 focus:ring-1 focus:ring-accent/40 outline-none text-xs text-ink placeholder-ink-3 transition-all font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-ink-3 text-[11px]">Location:</span>
                    <input
                      type="text"
                      value={playgroundCity}
                      onChange={(e) => setPlaygroundCity(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-surface border border-line focus:border-accent/60 focus:ring-1 focus:ring-accent/40 outline-none text-xs text-ink w-28"
                    />
                  </div>

                  <button
                    onClick={runPlaygroundTest}
                    disabled={isRunningPlayground}
                    className="px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {isRunningPlayground ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Execute
                  </button>
                </div>

                {/* Quick Sample Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] text-ink-3 self-center">Samples:</span>
                  <button
                    onClick={() => setPlaygroundText("Mumbai Police Cyber Cell notice: Illegal narcotic parcel intercepted in your name. Connect on video call for digital arrest clearance.")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-inset border border-line text-ink-2 hover:text-ink"
                  >
                    Digital Arrest
                  </button>
                  <button
                    onClick={() => setPlaygroundText("Dear user your power will be disconnected at 9:30 PM tonight due to unpaid bill. Pay immediately at bses.billpay@paytm or call officer.")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-inset border border-line text-ink-2 hover:text-ink"
                  >
                    Electricity Bill
                  </button>
                  <button
                    onClick={() => setPlaygroundText("Earn ₹5,000 daily with part time YouTube video like task. Join VIP Telegram group @Global_Marketing_VIP")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-inset border border-line text-ink-2 hover:text-ink"
                  >
                    Job Task
                  </button>
                </div>
              </div>

              {/* Response Viewer */}
              {playgroundResponse && (
                <div className="mt-4 pt-4 border-t border-line space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-3 font-mono">Status: <strong className="text-green-500">200 OK</strong></span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(playgroundResponse, null, 2))}
                      className="text-[10px] text-ink-3 hover:text-ink flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy Output
                    </button>
                  </div>
                  <pre className="bg-inset border border-line rounded-xl p-4 font-mono text-xs text-ink-2 overflow-x-auto max-h-56 leading-relaxed">
                    {JSON.stringify(playgroundResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Code Snippets Card */}
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-accent" />
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
                    copyToClipboard(code);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface text-ink-3 hover:text-ink text-xs flex items-center gap-1 shadow-sm border border-line"
                >
                  <Copy className="w-3.5 h-3.5" />
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

      </main>

      <Footer />
    </div>
  );
}
