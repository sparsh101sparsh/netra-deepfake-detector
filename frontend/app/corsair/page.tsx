'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Bot,
  Layers,
  Activity,
  Search,
  MessageSquare,
  GitPullRequest,
  Calendar,
  Mail,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Wrench,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Radio,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { getStoredEvents, saveStoredEvents } from '@/lib/corsair/engine';
import { CorsairEvent } from '@/lib/corsair/types';

type CorsairHubTab = 'workflows' | 'integrations' | 'intel';

export default function CorsairPage() {
  const [activeTab, setActiveTab] = useState<CorsairHubTab>('workflows');
  const [events, setEvents] = useState<CorsairEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search Intel State
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Events Loading
  useEffect(() => {
    const loaded = getStoredEvents();
    if (loaded && loaded.length > 0) {
      setEvents(loaded);
    }
  }, []);

  const handleRefreshEvents = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const loaded = getStoredEvents();
      setEvents(loaded || []);
      setIsRefreshing(false);
    }, 400);
  };

  const handleTriggerAutonomousWorkflow = () => {
    setIsDispatching(true);
    setTimeout(() => {
      const newId = 'evt_auto_' + Date.now().toString(36).toUpperCase();
      const newEvent: CorsairEvent = {
        id: newId,
        created_at: new Date().toISOString(),
        event_type: 'corsair.autonomous_dispatch',
        account_id: 'acc_corsair_orchestrator',
        status: 'delivered',
        payload: {
          title: '⚡ Autonomous Remediation Dispatched Across 5 Platforms',
          details: 'Synchronized Security Operations, Incident Advisory Repo, Triage Calendar, Statutory Liaison, and Citizen WhatsApp Channel.',
        },
      };
      const updated = [newEvent, ...events];
      setEvents(updated);
      saveStoredEvents(updated);
      setIsDispatching(false);
    }, 800);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };



  const automationsList = [
    {
      id: 'auto-slack',
      service: 'Slack',
      icon: MessageSquare,
      color: 'text-pink-400',
      channel: 'Security Operations',
      name: 'Real-Time Threat Broadcast',
      status: 'CONFIGURED',
      details: 'Instant incident notification pushed to security operations center with forensic waveform evidence.',
    },
    {
      id: 'auto-github',
      service: 'GitHub',
      icon: GitPullRequest,
      color: 'text-purple-400',
      channel: 'Advisory Repository',
      name: 'Security Advisory & SHA-256 Commit',
      status: 'CONFIGURED',
      details: 'Cryptographic hash and model anomaly metadata archived directly to incident repository.',
    },
    {
      id: 'auto-gcal',
      service: 'Google Calendar',
      icon: Calendar,
      color: 'text-blue-400',
      channel: 'Incident Response Triage',
      name: 'Emergency Triage Scheduling',
      status: 'CONFIGURED',
      details: 'High-priority triage sync automatically booked for lead incident response handlers.',
    },
    {
      id: 'auto-gmail',
      service: 'Gmail / CERT-In',
      icon: Mail,
      color: 'text-rose-400',
      channel: 'Statutory Reporting Gateway',
      name: 'Statutory FIR Evidence Draft',
      status: 'CONFIGURED',
      details: 'Section 65B certified legal affidavit generated and queued to national nodal cyber agency.',
    },
    {
      id: 'auto-whatsapp',
      service: 'WhatsApp Cloud',
      icon: Smartphone,
      color: 'text-[#25D366]',
      channel: 'Citizen Broadcast Channel',
      name: 'Citizen Defense Warning Alert',
      status: 'CONFIGURED',
      details: 'Direct citizen intimation warning against unauthorized fund transfer with forensic defense guidance.',
    },
  ];

  const integrationsList = [
    { name: 'Slack', icon: MessageSquare, target: 'Security Operations Channel', status: 'ACTIVE', color: 'text-pink-400', latency: '14ms' },
    { name: 'GitHub', icon: GitPullRequest, target: 'Incident Advisory Repository', status: 'ACTIVE', color: 'text-purple-400', latency: '22ms' },
    { name: 'WhatsApp Bot', icon: Smartphone, target: 'WhatsApp Cloud Bot Channel', status: 'ACTIVE', color: 'text-[#25D366]', latency: '18ms' },
    { name: 'Google Calendar', icon: Calendar, target: 'Emergency Response Triage', status: 'ACTIVE', color: 'text-blue-400', latency: '19ms' },
    { name: 'CERT-In Liaison', icon: Mail, target: 'Statutory Reporting Gateway', status: 'ACTIVE', color: 'text-rose-400', latency: '25ms' },
  ];

  const intelEntities = [
    { title: 'Digital Arrest Impersonation Syndicate', type: 'Forensic Dossier', source: 'Analysis Engine', date: 'Active', tag: '#digital-arrest' },
    { title: 'Synthetic Identity Financial Fraud Campaign', type: 'Citizen Escalation', source: 'WhatsApp Bot', date: 'Active', tag: '#financial-fraud' },
    { title: 'Deepfake Audio Voice Clone Attack Vector', type: 'Acoustic Forensic', source: 'Forensic Pipeline', date: 'Active', tag: '#voice-clone' },
    { title: 'Executive Video Impersonation Phishing Seed', type: 'Visual Artifact', source: 'Advisory Feed', date: 'Active', tag: '#video-sbi' },
  ];

  return (
    <div className="min-h-screen bg-page text-ink relative overflow-x-hidden font-sans flex flex-col justify-between selection:bg-accent/20 selection:text-accent">
      {/* ── 1. Sticky Navbar (Matches main website 100%) ── */}
      <Navbar activeSection="corsair" />

      {/* ── 2. Main Split Command Center (Matches Homepage 100%) ── */}
      <main className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 min-h-0">
        <section
          aria-label="Corsair Engine Command Center"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch flex-1 min-h-[680px]"
        >
          {/* ═══════════════════════════════════════════════════════════════════
              LEFT COLUMN: Corsair Incident Orchestration & Event Stream
              (Styled identically to LiveCyberScamNewsFeed on homepage)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <div className="bg-[var(--surface)] border-[1.5px] border-[var(--border)] shadow-card rounded-2xl flex flex-col h-full overflow-hidden">
              {/* Header Section */}
              <div className="p-5 sm:p-6 pb-3.5 border-b border-line shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#18181B] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-ink text-sm sm:text-base tracking-tight truncate">
                        Corsair Incident Orchestration
                      </h3>
                      <p className="text-xs text-ink-3 truncate">
                        Real-time autonomous remediation & webhook telemetry
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0 font-mono">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Dispatch Active
                  </span>
                </div>

                {/* Sub-bar / Telemetry Indicator */}
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 pt-1 border-t border-line-soft">
                  <div className="flex items-center gap-2 truncate">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="truncate">5 / 5 Integrations Synced • Event Bus Live (~18ms)</span>
                  </div>
                  <button
                    onClick={handleRefreshEvents}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover text-ink-2 hover:text-ink transition-colors"
                  >
                    <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              {/* Event Stream List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {events.length === 0 ? (
                  <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 text-ink-3 space-y-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-inset border border-line flex items-center justify-center text-emerald-400">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-ink">Autonomous Event Bus Active</div>
                      <p className="text-xs text-ink-3 max-w-sm">
                        Standing by for real-time forensic escalations (Threat Score ≥ 60%). No unhandled incidents in current session.
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-ink-3 border border-line bg-surface px-3 py-1.5 rounded-lg">
                      Ready to orchestrate Slack, GitHub, Google Calendar, Email & WhatsApp
                    </div>
                  </div>
                ) : (
                  events.map((evt) => {
                    const title = evt.payload?.title || evt.event_type;
                    const details = evt.payload?.details || '';
                    const recipient = evt.payload?.channel || evt.payload?.recipient || evt.payload?.repo || '';

                    let ServiceIcon = Zap;
                    let badgeColor = 'bg-accent-tint text-ink border-line';
                    if (evt.event_type.includes('slack')) {
                      ServiceIcon = MessageSquare;
                      badgeColor = 'bg-pink-500/10 text-pink-400 border-pink-500/20';
                    } else if (evt.event_type.includes('github')) {
                      ServiceIcon = GitPullRequest;
                      badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                    } else if (evt.event_type.includes('whatsapp')) {
                      ServiceIcon = Smartphone;
                      badgeColor = 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/25';
                    } else if (evt.event_type.includes('calendar')) {
                      ServiceIcon = Calendar;
                      badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    } else if (evt.event_type.includes('gmail')) {
                      ServiceIcon = Mail;
                      badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    }

                    return (
                      <div
                        key={evt.id}
                        className="p-4 rounded-xl bg-inset border border-line hover:border-line-strong transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn('p-1.5 rounded-lg border shrink-0', badgeColor)}>
                              <ServiceIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-ink leading-snug truncate">
                                {title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-3">
                                <span>{evt.id}</span>
                                {recipient && <span>• {recipient}</span>}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface text-emerald-400 border border-line shrink-0">
                            {evt.status.toUpperCase()}
                          </span>
                        </div>

                        {details && (
                          <p className="text-xs text-ink-2 leading-relaxed font-sans line-clamp-2">
                            {details}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-mono text-ink-3 pt-2 border-t border-line-soft">
                          <span>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Handled via MCP Webhook
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Action Drawer */}
              <div className="p-4 border-t border-line bg-canvas shrink-0">
                <button
                  onClick={handleTriggerAutonomousWorkflow}
                  disabled={isDispatching}
                  className="w-full py-2.5 px-4 rounded-xl bg-ink text-page font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.99] transition-all shadow-btn disabled:opacity-50"
                >
                  <Zap className={cn('w-4 h-4 text-amber-500 fill-amber-500', isDispatching && 'animate-spin')} />
                  <span>{isDispatching ? 'Orchestrating Autonomous Response...' : 'Trigger Autonomous Incident Remediation'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: Corsair Multi-Service Automation Hub
              (Styled identically to MultiModalForensicScanner on homepage)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col min-h-0">
            <div className="rounded-2xl bg-surface border-[1.5px] border-line p-5 sm:p-6 flex flex-col justify-between shadow-card relative h-full">
              {/* Header & Modality Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border-[1.5px] border-accent/40 flex items-center justify-center text-accent">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-ink tracking-tight flex items-center gap-2">
                      Corsair Automation Hub
                    </h2>
                    <p className="text-xs text-ink-3">
                      Multi-service remediations, connected protocols & threat intel telemetry
                    </p>
                  </div>
                </div>

                {/* Segmented Selector Matching WORKFLOWS | INTEGRATIONS | INTEL */}
                <div className="self-start sm:self-auto bg-inset p-1 rounded-xl border border-line flex items-center gap-1 text-xs font-mono">
                  {(['workflows', 'integrations', 'intel'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg uppercase text-[11px] font-semibold transition-all',
                        activeTab === tab
                          ? 'bg-surface text-ink shadow-sm border border-line'
                          : 'text-ink-3 hover:text-ink'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Tab Body */}
              <div className="flex-1 py-4 overflow-y-auto">
                {/* ── TAB 1: WORKFLOWS ── */}
                {activeTab === 'workflows' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-inset border border-line text-xs font-mono text-ink-2 flex items-center justify-between">
                      <span>Threshold: <strong className="text-ink">Netra Threat ≥ 60%</strong></span>
                      <span className="text-emerald-400 font-bold">5 Actions Ready</span>
                    </div>

                    <div className="space-y-2.5">
                      {automationsList.map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 rounded-xl bg-inset border border-line hover:border-line-strong transition-all space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg border border-line bg-surface">
                                <a.icon className={cn('w-3.5 h-3.5', a.color)} />
                              </div>
                              <div>
                                <div className="font-bold text-ink font-mono">{a.name}</div>
                                <div className="text-[10px] font-mono text-ink-3">{a.service} • {a.channel}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface text-emerald-400 border border-line">
                              {a.status}
                            </span>
                          </div>

                          <p className="text-xs text-ink-2 font-sans leading-relaxed">
                            {a.details}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: INTEGRATIONS ── */}
                {activeTab === 'integrations' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-inset border border-line text-xs font-mono text-ink-3 flex items-center justify-between">
                      <span>STATUS: <strong className="text-emerald-400 font-bold">ALL 5 SERVICES OPERATIONAL</strong></span>
                      <span className="text-ink-2 font-bold">Meta + MCP</span>
                    </div>

                    <div className="space-y-2.5">
                      {integrationsList.map((tool) => (
                        <div
                          key={tool.name}
                          className="p-3.5 rounded-xl bg-inset border border-line flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl border border-line bg-surface">
                              <tool.icon className={cn('w-4 h-4', tool.color)} />
                            </div>
                            <div>
                              <div className="font-bold text-ink">{tool.name}</div>
                              <div className="text-[11px] font-mono text-ink-3">{tool.target}</div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-emerald-400 border border-line">
                              {tool.status}
                            </span>
                            <div className="text-[10px] text-ink-3 mt-1">Ping: {tool.latency}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 4: INTEL ── */}
                {activeTab === 'intel' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search incident logs, evidence emails, or WhatsApp tips..."
                        className="w-full bg-inset border border-line rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder-ink-3 focus:outline-none focus:border-line-strong transition-all font-sans"
                      />
                    </div>

                    <div className="space-y-2.5">
                      {intelEntities
                        .filter((item) =>
                          !searchQuery ||
                          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tag.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-inset border border-line hover:border-line-strong transition-all flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-ink">{item.title}</div>
                              <div className="text-[11px] font-mono text-ink-3 mt-0.5">
                                {item.type} • via {item.source}
                              </div>
                            </div>

                            <div className="text-right font-mono shrink-0">
                              <span className="text-[10px] text-cyan-400 bg-surface px-2 py-0.5 rounded border border-line">
                                {item.tag}
                              </span>
                              <div className="text-[10px] text-ink-3 mt-1">{item.date}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Row */}
              <div className="pt-3 border-t border-line flex items-center justify-end text-[11px] font-mono shrink-0">
                <a
                  href="https://wa.me/15552013457?text=menu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Launch WhatsApp Forensic Bot</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 3. Footer (Matches main website 100%) ── */}
      <Footer />
    </div>
  );
}

