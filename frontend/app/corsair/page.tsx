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
    <div className="min-h-screen bg-page text-ink font-sans pb-20">
      {/* Top Ticker Banner */}
      <div className="bg-canvas border-b border-line text-[11px] font-mono py-2.5 px-4 flex flex-wrap items-center justify-between text-ink-3 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-ink font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            CORSAIR FORENSIC ENGINE v2.4
          </span>
          <span className="hidden sm:inline text-line-strong">|</span>
          <span className="hidden sm:inline text-ink-3">
            Unified Threat Orchestration • Dual-Branch Neural Architecture • MCP Autonomous Multi-Service Workflows
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://wa.me/15552013457?text=menu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-ink-2 hover:text-ink font-medium transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#25D366]" />
            <span>WhatsApp Bot: +1 555 201 3457</span>
            <ExternalLink className="w-3 h-3 text-ink-3" />
          </a>
          <span className="text-line-strong">|</span>
          <span className="text-amber-400 font-semibold">Emergency: 📞 1930</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-inset p-1.5 rounded-2xl border border-line flex flex-wrap items-center gap-1.5 mb-8 shadow-sm">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
              activeTab === 'scanner'
                ? 'bg-surface text-ink shadow-sm border border-line font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent font-medium'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Forensic Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-surface text-ink shadow-sm border border-line font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent font-medium'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp Bot Console</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
              activeTab === 'automations'
                ? 'bg-surface text-ink shadow-sm border border-line font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent font-medium'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Multi-Service Automations</span>
          </button>

          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
              activeTab === 'agent'
                ? 'bg-surface text-ink shadow-sm border border-line font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent font-medium'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>MCP Agent Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
              activeTab === 'dashboard'
                ? 'bg-surface text-ink shadow-sm border border-line font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent font-medium'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Incident Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('kb')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
              activeTab === 'kb'
                ? 'bg-surface text-ink shadow-sm border border-line font-semibold'
                : 'text-ink-2 hover:text-ink hover:bg-hover border border-transparent font-medium'
            }`}
          >
            <Search className="w-4 h-4 text-amber-400" />
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
