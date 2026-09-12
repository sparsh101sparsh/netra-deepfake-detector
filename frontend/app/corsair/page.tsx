'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Bot,
  Layers,
  Search,
  Activity,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Radio,
  FileCheck2
} from 'lucide-react';

import { ForensicScanner } from '@/components/corsair/ForensicScanner';
import { CorsairAutomations } from '@/components/corsair/CorsairAutomations';
import { MCPAgentChat } from '@/components/corsair/MCPAgentChat';
import { IncidentDashboard } from '@/components/corsair/IncidentDashboard';
import { ThreatKnowledgeBase } from '@/components/corsair/ThreatKnowledgeBase';
import { WhatsAppLiveConsole } from '@/components/corsair/WhatsAppLiveConsole';
import { ForensicResult } from '@/lib/corsair/types';

export default function CorsairPage() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'whatsapp' | 'automations' | 'agent' | 'dashboard' | 'kb'>('scanner');
  const [latestScan, setLatestScan] = useState<ForensicResult | null>(null);
  const [latestWorkflow, setLatestWorkflow] = useState<any>(null);

  const handleScanComplete = (scan: ForensicResult, workflow: any) => {
    setLatestScan(scan);
    setLatestWorkflow(workflow);
  };

  return (
    <div className="min-h-screen bg-[#060910] text-slate-100 font-sans pb-20">
      {/* Top Ticker Banner */}
      <div className="bg-[#0b1322] border-b border-slate-800 text-[11px] font-mono py-2 px-4 flex flex-wrap items-center justify-between text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            CORSAIR FORENSIC ENGINE v2.4
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-300">
            Unified Threat Orchestration • Dual-Branch Neural Architecture • MCP Autonomous Multi-Service Workflows
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://wa.me/15552013457?text=menu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#25D366] hover:text-white font-semibold transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>WhatsApp Bot: +1 555 201 3457</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400 font-semibold">Emergency: 📞 1930</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'scanner'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Forensic Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/40 shadow-sm shadow-[#25D366]/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp Bot Console</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'automations'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/40 shadow-sm shadow-purple-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Multi-Service Automations</span>
          </button>

          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'agent'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>MCP Agent Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Incident Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('kb')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'kb'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Threat Knowledge Base</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div>
          {activeTab === 'scanner' && (
            <ForensicScanner
              onScanComplete={handleScanComplete}
              onNavigateToAutomations={() => setActiveTab('automations')}
            />
          )}

          {activeTab === 'whatsapp' && <WhatsAppLiveConsole />}

          {activeTab === 'automations' && (
            <CorsairAutomations
              workflowData={latestWorkflow}
              scanData={latestScan}
              onTriggerNewScan={() => setActiveTab('scanner')}
            />
          )}

          {activeTab === 'agent' && <MCPAgentChat />}

          {activeTab === 'dashboard' && <IncidentDashboard />}

          {activeTab === 'kb' && <ThreatKnowledgeBase />}
        </div>
      </div>
    </div>
  );
}
