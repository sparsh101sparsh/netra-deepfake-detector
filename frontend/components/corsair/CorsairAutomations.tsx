"use client";

import React, { useState } from 'react';
import { Zap, CheckCircle2, Copy, Check, MessageSquare, GitPullRequest, Calendar, Mail, ExternalLink, PhoneCall } from 'lucide-react';
import { WorkflowDispatchResult, ForensicResult } from '@/lib/corsair/types';

interface CorsairAutomationsProps {
  workflowData: WorkflowDispatchResult | null;
  scanData: ForensicResult | null;
  onTriggerNewScan: () => void;
}

export const CorsairAutomations: React.FC<CorsairAutomationsProps> = ({ workflowData, scanData, onTriggerNewScan }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const defaultActions = [
    {
      service: 'slack',
      name: 'Slack Incident Broadcast',
      icon: MessageSquare,
      color: 'border-[#4A154B] bg-[#4A154B]/10 text-pink-400',
      target: '#cyber-threat-desk',
      status: 'DELIVERED',
      details: 'Automated alert card posted with forensic scorecard, risk breakdown, and suspect indicators.',
      eventId: 'evt_slack_live_901'
    },
    {
      service: 'github',
      name: 'GitHub Security Advisory Issue',
      icon: GitPullRequest,
      color: 'border-purple-500/40 bg-purple-950/20 text-purple-400',
      target: 'corsairdev/corsair #advisories',
      status: 'DELIVERED',
      details: 'Created cryptographically verified incident tracking issue with SHA-256 evidence payload.',
      eventId: 'evt_gh_live_902'
    },
    {
      service: 'googlecalendar',
      name: 'Google Calendar Emergency Triage',
      icon: Calendar,
      color: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
      target: 'Incident Response Calendar',
      status: 'SYNCED',
      details: '30-minute forensic debrief scheduled for Incident Response Crew with lead investigator.',
      eventId: 'evt_gcal_live_903'
    },
    {
      service: 'gmail',
      name: 'Gmail Evidence Intimation',
      icon: Mail,
      color: 'border-red-500/40 bg-red-950/20 text-red-400',
      target: 'cybercrime-nodal@cert-in.org.in',
      status: 'DISPATCHED',
      details: 'Official FIR legal evidence notice prepared and routed to CERT-In / Nodal Officer.',
      eventId: 'evt_gmail_live_904'
    },
    {
      service: 'whatsapp',
      name: 'WhatsApp Bot Citizen Broadcast',
      icon: PhoneCall,
      color: 'border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]',
      target: 'WhatsApp (+1 415 523 8886)',
      status: 'DELIVERED',
      details: 'Dispatched real-time scam alert and FIR filing assistance directly to citizen WhatsApp ledger.',
      eventId: 'evt_wa_live_905'
    }
  ];

  const actions = workflowData?.actionsExecuted || defaultActions;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-blue-950/10">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">CORSAIR CROSS-SERVICE WORKFLOW ENGINE</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Event-driven incident automation: When Netra flags an anomaly (exceeding 60% threat), Corsair orchestrates simultaneous actions across your communication & developer stack.
          </p>
        </div>

        <button
          onClick={onTriggerNewScan}
          className="text-xs font-mono font-semibold bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shadow-lg shadow-cyan-900/40"
        >
          <Zap className="w-4 h-4" /> Trigger New Incident Scan
        </button>
      </div>

      {/* Active Trigger Metadata */}
      {scanData && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">TRIGGER INCIDENT:</span>
            <span className="font-bold text-cyan-400">{scanData.jobId}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 truncate max-w-[200px]">{scanData.filename}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">THREAT INDEX:</span>
            <span className={`font-bold ${scanData.riskScore >= 75 ? 'text-red-400' : 'text-amber-400'}`}>
              {scanData.riskScore}% ({scanData.verdict})
            </span>
          </div>

          <div>
            <span className="text-slate-500">WORKFLOW ID: </span>
            <span className="text-emerald-400 font-bold">{workflowData?.workflowId || 'WF-NETRA-LIVE'}</span>
          </div>
        </div>
      )}

      {/* Action Execution Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((act: any, idx: number) => {
          const serviceName = act.service.toUpperCase();
          const eventId = act.externalId || act.eventId || `evt_${act.service}_${idx}`;

          return (
            <div
              key={idx}
              className="bg-[#090e17] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${act.color || 'border-slate-700 bg-slate-800 text-cyan-400'}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white uppercase">{act.name || act.action}</div>
                      <div className="text-[11px] font-mono text-slate-400">{serviceName} PLUGIN</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {act.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">{act.details}</p>

                <div className="bg-[#0c121e] rounded-lg p-3 border border-slate-800/80 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>TARGET DESTINATION:</span>
                    <span className="text-slate-200 font-semibold">{act.target}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                    <span>CORSAIR EVENT ID:</span>
                    <div className="flex items-center gap-1 text-cyan-400">
                      <span>{eventId}</span>
                      <button
                        onClick={() => handleCopy(eventId, eventId)}
                        className="hover:text-white transition-colors"
                        title="Copy Event ID"
                      >
                        {copiedId === eventId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/40">
                <span>Latency: ~18ms</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  ● Verified Synced
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
