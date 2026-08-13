"use client";

import React, { useState, useEffect } from "react";
import { 
  Key, Terminal, Shield, Copy, Check, Plus, Trash2, 
  Play, Sparkles, Code, RefreshCw, Send, CheckCircle2, AlertCircle 
} from "lucide-react";
import { NetraBrandLogo } from "@/components/NetraBrandLogo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

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
  const [activeKey, setActiveKey] = useState<string>("netra_live_d05ffb1af240c7c4f620d6a42371ccc6");
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
        setKeys(data.keys || []);
        if (data.keys && data.keys.length > 0 && !activeKey) {
          setActiveKey(data.keys[0].raw_key || data.keys[0].key_prefix);
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
    setIsRunningPlayground(true);
    setPlaygroundResponse(null);
    try {
      const res = await fetch("/api/backend/api/v1/public/detect/scam-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": activeKey || "netra_live_demo",
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

  const activeKeyData = keys.find((k) => k.raw_key === activeKey || k.key_prefix === activeKey) || keys[0] || {
    key_prefix: "netra_live_••••••••",
    monthly_quota: 5000,
    used_requests: 12,
    tier: "Developer Access",
  };

  return (
    <div className="min-h-screen bg-[#030712] text-neutral-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-[#030712]/90 backdrop-blur-xl">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-cyan-500/40 bg-cyan-950/60 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <NetraBrandLogo size={30} />
            </div>
            <a href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors">
              NETRA
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-900 border border-neutral-800 text-cyan-400">v5.1</span>
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono font-medium text-neutral-400">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/radar" className="hover:text-white transition-colors">Threat Radar</a>
            <a href="/reported" className="hover:text-white transition-colors">Threat Catalog</a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
            <a href="/developers" className="text-white font-bold transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Developer API
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <GoogleAuthButton />
          </div>
        </div>
      </header>

      {/* Main Content (Wide Layout) */}
      <main className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 py-10 space-y-8 animate-in fade-in duration-500 font-mono">
        
        {/* Header */}
        <div className="border-b border-neutral-800 pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Developer Platform & REST API
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Developer API Access & Console
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1 max-w-2xl font-sans">
            Integrate NETRA’s real-time multi-modal deepfake detection, threat intelligence lookup, and NLP scam triage into your applications with sub-150ms latency.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (5 Cols): API Keys & Quota */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* API Keys Card */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">Your API Keys</h2>
                    <span className="text-[10px] text-neutral-400">SHA-256 Hashed & Encrypted</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreatingKey(!isCreatingKey)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-400 border border-neutral-800 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New Key
                </button>
              </div>

              {/* Create Key Form */}
              {isCreatingKey && (
                <form onSubmit={handleCreateKey} className="bg-neutral-900/80 p-4 rounded-2xl border border-neutral-800 space-y-3">
                  <span className="text-[11px] text-neutral-300 font-bold">Generate New Live Key</span>
                  <input
                    type="text"
                    value={keyNameInput}
                    onChange={(e) => setKeyNameInput(e.target.value)}
                    placeholder="e.g. Production Mobile App"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-cyan-500"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingKey(false)}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Keys List */}
              <div className="space-y-3">
                {keys.length === 0 ? (
                  <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800 text-center text-xs text-neutral-400">
                    No keys found. Generate a new key above.
                  </div>
                ) : (
                  keys.map((k) => (
                    <div
                      key={k.key_id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        activeKey === k.raw_key || activeKey === k.key_prefix
                          ? "bg-cyan-950/20 border-cyan-500/50 shadow-sm"
                          : "bg-neutral-900/50 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{k.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-800 text-neutral-300 uppercase">
                            {k.tier}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">{k.key_prefix}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyToClipboard(k.raw_key || k.key_prefix)}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                          title="Copy Key"
                        >
                          {copiedKey === (k.raw_key || k.key_prefix) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.key_id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Usage Quota Card */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">Monthly Quota & Usage</h2>
                  <span className="text-[10px] text-emerald-400">Tier: {activeKeyData.tier || "Developer Plan"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>API Calls Used</span>
                  <strong>{activeKeyData.used_requests || 12} / {activeKeyData.monthly_quota || 5000}</strong>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
                    style={{
                      width: `${Math.max(
                        3,
                        Math.min(
                          100,
                          ((activeKeyData.used_requests || 12) / (activeKeyData.monthly_quota || 5000)) * 100
                        )
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="text-[10px] text-neutral-500 flex justify-between pt-1">
                  <span>Rate Limit: 60 req/min</span>
                  <span>Resets in 29 days</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (7 Cols): Interactive API Playground & Docs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Interactive API Playground */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h2 className="font-bold text-sm text-white">Interactive API Playground</h2>
                </div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                  POST /api/v1/public/detect/scam-text
                </span>
              </div>

              {/* Playground Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-neutral-400 mb-1 block">Test Message Payload (SMS / WhatsApp text)</label>
                  <textarea
                    rows={3}
                    value={playgroundText}
                    onChange={(e) => setPlaygroundText(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:border-cyan-500 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-400 text-[11px]">Origin City:</span>
                    <input
                      type="text"
                      value={playgroundCity}
                      onChange={(e) => setPlaygroundCity(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white w-28"
                    />
                  </div>

                  <button
                    onClick={runPlaygroundTest}
                    disabled={isRunningPlayground}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center gap-1.5"
                  >
                    {isRunningPlayground ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Execute Request
                  </button>
                </div>

                {/* Quick Sample Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] text-neutral-500 self-center">Presets:</span>
                  <button
                    onClick={() => setPlaygroundText("Mumbai Police Cyber Cell notice: Illegal narcotic parcel intercepted in your name. Connect on video call for digital arrest clearance.")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  >
                    Digital Arrest
                  </button>
                  <button
                    onClick={() => setPlaygroundText("Dear user your power will be disconnected at 9:30 PM tonight due to unpaid bill. Pay immediately at bses.billpay@paytm or call officer.")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  >
                    Electricity Bill
                  </button>
                  <button
                    onClick={() => setPlaygroundText("Earn ₹5,000 daily with part time YouTube video like task. Join VIP Telegram group @Global_Marketing_VIP")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  >
                    Job Task Scam
                  </button>
                </div>
              </div>

              {/* Response Viewer */}
              {playgroundResponse && (
                <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Response Status: <strong className="text-emerald-400">200 OK</strong></span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(playgroundResponse, null, 2))}
                      className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy JSON
                    </button>
                  </div>
                  <pre className="bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800 text-[11px] text-cyan-300 overflow-x-auto max-h-56 leading-relaxed">
                    {JSON.stringify(playgroundResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Code Snippets Card */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <h2 className="font-bold text-sm text-white">Integration Snippets</h2>
                </div>

                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-[11px]">
                  {(["curl", "python", "javascript"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveSnippetTab(tab)}
                      className={`px-3 py-1 rounded-lg uppercase font-bold transition-all ${
                        activeSnippetTab === tab ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
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
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-xs flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <pre className="bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800 text-[11px] text-neutral-300 overflow-x-auto leading-relaxed">
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

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#02050c] py-10 text-xs font-mono text-neutral-400 mt-16">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NetraBrandLogo size={24} />
            <span className="font-bold text-white tracking-wider">NETRA FORENSIC AI</span>
          </div>
          <div>
            Developer REST API & High-Throughput Verification Engine
          </div>
          <div className="flex gap-6">
            <a href="/#analyzer" className="hover:text-white transition-colors">Analyzer</a>
            <a href="/radar" className="hover:text-white transition-colors">Threat Radar</a>
            <a href="/reported" className="hover:text-white transition-colors">Threat Catalog</a>
            <a href="/technology" className="hover:text-white transition-colors">Technology</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
