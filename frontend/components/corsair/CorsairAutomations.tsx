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
      target: 'WhatsApp (+1 555 201 3457)',
      status: 'DELIVERED',
      details: 'Dispatched real-time scam alert and FIR filing assistance directly to citizen WhatsApp ledger.',
      eventId: 'evt_wa_live_905'
    }
  ];

  const actions = workflowData?.actionsExecuted || defaultActions;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">CORSAIR CROSS-SERVICE WORKFLOW ENGINE</h2>
          </div>
          <p className="text-xs text-ink-3 mt-1.5 leading-relaxed font-sans">
            Event-driven incident automation: When Netra flags an anomaly (exceeding 60% threat), Corsair orchestrates simultaneous actions across your communication & developer stack.
          </p>
        </div>

        <button
          onClick={onTriggerNewScan}
          className="text-xs font-mono font-semibold bg-ink text-page hover:bg-white/90 active:scale-[0.99] px-4 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap shadow-btn"
        >
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Trigger New Incident Scan
        </button>
      </div>

      {/* Active Trigger Metadata */}
      {scanData && (
        <div className="bg-surface border-[1.5px] border-line rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-card">
          <div className="flex items-center gap-3">
            <span className="text-ink-3">TRIGGER INCIDENT:</span>
            <span className="font-bold text-ink">{scanData.jobId}</span>
            <span className="text-line-strong">|</span>
            <span className="text-ink-2 truncate max-w-[200px]">{scanData.filename}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-ink-3">THREAT INDEX:</span>
            <span className={`font-bold ${scanData.riskScore >= 75 ? 'text-rose-400' : 'text-amber-400'}`}>
              {scanData.riskScore}% ({scanData.verdict})
            </span>
          </div>

          <div>
            <span className="text-ink-3">WORKFLOW ID: </span>
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
              className="bg-surface border-[1.5px] border-line rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-card hover:border-line-strong transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl border border-line bg-inset text-ink">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-ink uppercase">{act.name || act.action}</div>
                      <div className="text-[11px] font-mono text-ink-3">{serviceName} PLUGIN</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-inset text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {act.status}
                  </span>
                </div>

                <p className="text-xs text-ink-2 leading-relaxed font-sans">{act.details}</p>

                <div className="bg-inset rounded-xl p-3.5 border border-line space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-ink-3 text-[11px]">
                    <span>TARGET DESTINATION:</span>
                    <span className="text-ink font-semibold">{act.target}</span>
                  </div>
                  <div className="flex justify-between items-center text-ink-3 text-[11px] pt-1.5 border-t border-line-soft">
                    <span>CORSAIR EVENT ID:</span>
                    <div className="flex items-center gap-1.5 text-ink font-semibold">
                      <span>{eventId}</span>
                      <button
                        onClick={() => handleCopy(eventId, eventId)}
                        className="text-ink-3 hover:text-ink transition-colors"
                        title="Copy Event ID"
                      >
                        {copiedId === eventId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 flex items-center justify-between text-[11px] font-mono text-ink-3 border-t border-line-soft">
                <span>Latency: ~18ms</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
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
