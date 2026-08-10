import React from "react";
import { Terminal, Key, Shield, Code, ChevronRight, Copy } from "lucide-react";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-slate-300 font-sans p-8 pt-24 selection:bg-blue-900 selection:text-blue-100">
      
      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight mb-4">
          Developer API <span className="text-blue-500">Access</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl font-light">
          Integrate the NETRA multi-modal deepfake detection engine directly into your own applications. Built for high-throughput, enterprise-scale verification.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: API Keys */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Key className="text-blue-500 w-5 h-5" />
              <h2 className="text-xl font-medium text-white">Your API Keys</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Test Key</p>
                  <p className="font-mono text-sm text-slate-300">sk_test_••••••••</p>
                </div>
                <button className="p-2 hover:bg-[#27272a] rounded-md transition-colors">
                  <Copy className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="bg-[#09090b] border border-blue-900/30 rounded-lg p-4 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div>
                  <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">Production Key</p>
                  <p className="font-mono text-sm text-white">sk_live_1234abcd5678</p>
                </div>
                <button className="p-2 hover:bg-blue-900/30 rounded-md transition-colors">
                  <Copy className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            </div>

            <button className="w-full mt-6 bg-white hover:bg-slate-200 text-black text-sm font-medium py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2">
              Generate New Key <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl">
             <div className="flex items-center gap-3 mb-4">
              <Shield className="text-emerald-500 w-5 h-5" />
              <h2 className="text-xl font-medium text-white">Usage & Quotas</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current Plan</span>
                <span className="text-emerald-400 font-medium">Free Tier</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Requests this month</span>
                <span className="text-white">42 / 100</span>
              </div>
              <div className="w-full bg-[#09090b] h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full w-[42%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Docs & Snippets */}
        <div className="lg:col-span-2">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl h-full">
            <div className="flex items-center gap-3 mb-6">
              <Code className="text-blue-500 w-5 h-5" />
              <h2 className="text-xl font-medium text-white">Quickstart Integration</h2>
            </div>

            <p className="text-sm text-slate-400 mb-6">
              Submit media for analysis using the <code className="text-blue-400 bg-blue-900/20 px-1 py-0.5 rounded">/api/v1/public/analyze</code> endpoint. 
              Remember to include your API key in the <code className="text-emerald-400 bg-emerald-900/20 px-1 py-0.5 rounded">X-API-Key</code> header.
            </p>

            <div className="bg-[#09090b] border border-[#27272a] rounded-lg overflow-hidden">
              <div className="flex items-center gap-4 bg-[#18181b] border-b border-[#27272a] px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                </div>
                <div className="flex gap-6 text-sm">
                  <button className="text-blue-400 border-b border-blue-400 pb-1">cURL</button>
                  <button className="text-slate-500 hover:text-slate-300 pb-1 transition-colors">Python</button>
                  <button className="text-slate-500 hover:text-slate-300 pb-1 transition-colors">Node.js</button>
                </div>
              </div>
              
              <div className="p-4 overflow-x-auto relative group">
                <pre className="text-sm font-mono text-slate-300">
                  <code>
<span className="text-blue-400">curl</span> -X POST https://api.netra.example.com/v1/public/analyze \<br/>
  -H <span className="text-emerald-400">"X-API-Key: sk_live_1234abcd5678"</span> \<br/>
  -H <span className="text-emerald-400">"Content-Type: multipart/form-data"</span> \<br/>
  -F <span className="text-amber-400">"file=@/path/to/suspicious_video.mp4"</span>
                  </code>
                </pre>
                <button className="absolute top-4 right-4 p-2 bg-[#27272a] hover:bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                  <Copy className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" /> Expected Response
              </h3>
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-slate-300">
                  <code>
&#123;<br/>
  <span className="text-blue-400">"job_id"</span>: <span className="text-emerald-400">"f47ac10b-58cc-4372-a567-0e02b2c3d479"</span>,<br/>
  <span className="text-blue-400">"status"</span>: <span className="text-emerald-400">"queued"</span>,<br/>
  <span className="text-blue-400">"message"</span>: <span className="text-emerald-400">"Media successfully submitted for analysis."</span><br/>
&#125;
                  </code>
                </pre>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Use the returned <code className="text-slate-300">job_id</code> to poll the <code className="text-slate-300">/jobs/&#123;job_id&#125;</code> endpoint for the final Moonshot Kimi forensic report.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
