import React from "react";
import { Terminal, Key, Shield, Code, ChevronRight, Copy } from "lucide-react";

export default function DevelopersPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="max-w-5xl mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Developer API Access
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Integrate the NETRA multi-modal deepfake detection engine directly into your own applications. Built for high-throughput, enterprise-scale verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: API Keys */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card-premium p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Key className="text-blue-500 w-5 h-5" />
              <h2 className="font-semibold text-foreground">Your API Keys</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-background border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-semibold">Test Key</p>
                  <p className="font-mono text-sm text-foreground">sk_test_••••••••</p>
                </div>
                <button className="p-2 hover:bg-secondary rounded-md transition-colors">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="bg-background border border-blue-500/30 rounded-lg p-4 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div>
                  <p className="text-[10px] text-blue-500 uppercase tracking-widest mb-1 font-semibold">Production Key</p>
                  <p className="font-mono text-sm text-foreground">sk_live_1234abcd5678</p>
                </div>
                <button className="p-2 hover:bg-blue-500/10 rounded-md transition-colors">
                  <Copy className="w-4 h-4 text-blue-500" />
                </button>
              </div>
            </div>

            <button className="btn-primary w-full mt-6 py-2.5">
              Generate New Key
            </button>
          </div>

          <div className="card-premium p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
              <Shield className="text-emerald-500 w-5 h-5" />
              <h2 className="font-semibold text-foreground">Usage & Quotas</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="text-emerald-500 font-medium">Free Tier</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requests this month</span>
                <span className="text-foreground">42 / 100</span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden border border-border">
                <div className="bg-emerald-500 h-full w-[42%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Docs & Snippets */}
        <div className="lg:col-span-2">
          <div className="card-premium p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Code className="text-blue-500 w-5 h-5" />
              <h2 className="font-semibold text-foreground">Quickstart Integration</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Submit media for analysis using the <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-xs">/api/v1/public/analyze</code> endpoint. 
              Remember to include your API key in the <code className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-xs">X-API-Key</code> header.
            </p>

            <div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="flex items-center gap-4 bg-secondary/50 border-b border-border px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></div>
                </div>
                <div className="flex gap-6 text-xs font-semibold">
                  <button className="text-foreground border-b border-foreground pb-1 -mb-3">cURL</button>
                  <button className="text-muted-foreground hover:text-foreground pb-1 -mb-3 transition-colors">Python</button>
                  <button className="text-muted-foreground hover:text-foreground pb-1 -mb-3 transition-colors">Node.js</button>
                </div>
              </div>
              
              <div className="p-5 overflow-x-auto relative group">
                <pre className="text-xs font-mono text-foreground leading-relaxed">
                  <code>
<span className="text-blue-400">curl</span> -X POST https://api.netra.example.com/v1/public/analyze \<br/>
  -H <span className="text-emerald-500">"X-API-Key: sk_live_1234abcd5678"</span> \<br/>
  -H <span className="text-emerald-500">"Content-Type: multipart/form-data"</span> \<br/>
  -F <span className="text-amber-500">"file=@/path/to/suspicious_video.mp4"</span>
                  </code>
                </pre>
                <button className="absolute top-4 right-4 p-2 bg-secondary hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-all border border-border shadow-sm">
                  <Copy className="w-3.5 h-3.5 text-foreground" />
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" /> Expected Response
              </h3>
              <div className="bg-background border border-border rounded-lg p-5 overflow-x-auto shadow-sm">
                <pre className="text-xs font-mono text-foreground leading-relaxed">
                  <code>
&#123;<br/>
  <span className="text-blue-400">"job_id"</span>: <span className="text-emerald-500">"f47ac10b-58cc-4372-a567-0e02b2c3d479"</span>,<br/>
  <span className="text-blue-400">"status"</span>: <span className="text-emerald-500">"queued"</span>,<br/>
  <span className="text-blue-400">"message"</span>: <span className="text-emerald-500">"Media successfully submitted for analysis."</span><br/>
&#125;
                  </code>
                </pre>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
