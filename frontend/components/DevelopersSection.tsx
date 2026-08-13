"use client";

import React, { useState, useEffect } from "react";
import { 
  Key, Terminal, Shield, Copy, Check, Plus, Trash2, 
  Play, Sparkles, Code, RefreshCw, Send, CheckCircle2, AlertCircle 
} from "lucide-react";

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

export function DevelopersSection() {
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
      const res = await fetch("/api/backend/api/v1/threat-intelligence/triage", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": activeKey || "netra_live_demo"
        },
        body: JSON.stringify({
          raw_text: playgroundText,
          city: playgroundCity,
          platform: "API_PLAYGROUND",
        }),
      });

      const data = await res.json();
      setPlaygroundResponse(data);
    } catch (err) {
      setPlaygroundResponse({ error: "Failed to execute API triage request" });
    } finally {
      setIsRunningPlayground(false);
    }
  };

  const snippetCurl = `curl -X POST "https://netraai-i1pl.onrender.com/api/v1/detect/full" \\
  -H "X-API-Key: ${activeKey || "YOUR_API_KEY"}" \\
  -F "file=@suspect_video.mp4"`;

  const snippetPython = `import requests

url = "https://netraai-i1pl.onrender.com/api/v1/detect/full"
headers = {"X-API-Key": "${activeKey || "YOUR_API_KEY"}"}
files = {"file": open("suspect_video.mp4", "rb")}

response = requests.post(url, headers=headers, files=files)
print(response.json())`;

  const snippetJS = `const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('https://netraai-i1pl.onrender.com/api/v1/detect/full', {
  method: 'POST',
  headers: {
    'X-API-Key': '${activeKey || "YOUR_API_KEY"}'
  },
  body: formData
});
const data = await response.json();
console.log(data);`;

  return (
    <div className="space-y-12 font-mono">
      {/* Page Hero */}
      <div className="space-y-4 border-b border-neutral-800 pb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          Institutional Developer Platform
        </div>
        <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal tracking-tight">
          High-Throughput Deepfake & Threat APIs
        </h2>
        <p className="text-neutral-300 text-sm sm:text-base font-sans max-w-3xl leading-relaxed">
          Integrate synchronous multi-modal deepfake detection, voice clone verification, and scam IOC extraction into your apps, fintech KYC workflows, and enterprise communication channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: API Keys Management */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              API Key Management
            </h3>
            <button
              onClick={() => setIsCreatingKey(!isCreatingKey)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Generate Key
            </button>
          </div>

          {/* New Key Form */}
          {isCreatingKey && (
            <form onSubmit={handleCreateKey} className="p-4 rounded-2xl bg-neutral-950/80 border border-cyan-500/40 space-y-3">
              <span className="text-xs font-bold text-white">Create New Key</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key name (e.g. Production Backend)"
                  value={keyNameInput}
                  onChange={(e) => setKeyNameInput(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
                />
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs">
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Active Key Display Banner */}
          <div className="p-5 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Selected Active Key</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Ready for requests
              </span>
            </div>
            <div className="flex items-center gap-2 bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
              <code className="text-xs text-cyan-300 truncate flex-1">{activeKey}</code>
              <button
                onClick={() => copyToClipboard(activeKey)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Copy Key"
              >
                {copiedKey === activeKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Code Integration Tabs */}
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Quick Integration</span>
              <div className="flex gap-1 bg-neutral-900 p-1 rounded-xl">
                {(["curl", "python", "javascript"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      activeSnippetTab === tab ? "bg-neutral-800 text-cyan-400" : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-850 text-neutral-300 text-xs overflow-x-auto font-mono">
                {activeSnippetTab === "curl" && snippetCurl}
                {activeSnippetTab === "python" && snippetPython}
                {activeSnippetTab === "javascript" && snippetJS}
              </pre>
              <button
                onClick={() => {
                  const code = activeSnippetTab === "curl" ? snippetCurl : activeSnippetTab === "python" ? snippetPython : snippetJS;
                  copyToClipboard(code);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive API Playground */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Interactive API Sandbox
            </h3>
            <span className="text-[10px] text-neutral-500 uppercase">Live Sandbox</span>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-neutral-400">Simulate Message / Scam Text Payload</label>
              <textarea
                rows={3}
                value={playgroundText}
                onChange={(e) => setPlaygroundText(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Incident City</label>
                <input
                  type="text"
                  value={playgroundCity}
                  onChange={(e) => setPlaygroundCity(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={runPlaygroundTest}
                  disabled={isRunningPlayground}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {isRunningPlayground ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Execute API Call
                </button>
              </div>
            </div>

            {/* Sandbox Response Viewer */}
            <div className="space-y-2 pt-2 border-t border-neutral-850">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-neutral-400 uppercase font-bold">Synchronous Response (JSON)</span>
                {playgroundResponse && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 200 OK • 12ms
                  </span>
                )}
              </div>

              <pre className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-850 text-neutral-300 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                {playgroundResponse
                  ? JSON.stringify(playgroundResponse, null, 2)
                  : `// Click "Execute API Call" above to test synchronous forensic threat triage live.`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
